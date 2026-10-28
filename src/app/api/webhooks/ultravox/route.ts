import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { createLogger } from "@/lib/utils/logger";
import { getAuthServiceRoleKey } from "@/lib/auth-config";

const log = createLogger("webhook.ultravox");

// ── Tipos de resultado de gestión de cobranza ───────────────────────────────
type EstadoGestion =
  | "PROMESA_PAGO"
  | "YA_PAGO"
  | "REQUIERE_SOPORTE"
  | "NO_RECONOCE_DEUDA"
  | "NO_CONTESTA"
  | "VOLVER_A_LLAMAR"
  | "COMPLETADA"
  | "SIN_DATOS";

interface JorklifCallResult {
  estado_gestion: EstadoGestion;
  fecha_promesa_pago?: string;      // YYYY-MM-DD
  monto_comprometido?: number;
  resumen_gestion?: string;
  numero_comprobante?: string;       // Si "ya pagó"
  correo_reenvio?: string;           // Si solicitan factura
  motivo_reclamo?: string;           // Si hay inconformidad
}

// ── Extrae variables estructuradas de cobranza desde el summary/transcript ──
function extractJorklifVariables(call: any, messages: any[]): JorklifCallResult {
  const result: JorklifCallResult = { estado_gestion: "SIN_DATOS" };

  // 1. Variables directas del payload de Ultravox (si el agente usa tool calls)
  const meta = call.metadata || call.systemMetadata || call.templateContext || {};
  if (meta.estado_gestion) {
    result.estado_gestion = meta.estado_gestion as EstadoGestion;
    result.fecha_promesa_pago = meta.fecha_promesa_pago;
    result.monto_comprometido = meta.monto_comprometido ? Number(meta.monto_comprometido) : undefined;
    result.resumen_gestion = meta.resumen_gestion;
    result.numero_comprobante = meta.numero_comprobante;
    result.correo_reenvio = meta.correo_reenvio;
    result.motivo_reclamo = meta.motivo_reclamo;
    return result;
  }

  // 2. Extraer desde el summary del agente con regex
  const textToAnalyze = [
    call.summary || "",
    call.shortSummary || "",
    // Unir mensajes del agente
    ...messages
      .filter((m: any) => m.role === "MESSAGE_ROLE_AGENT" || m.role === "agent")
      .map((m: any) => m.text || m.content || ""),
  ].join(" ").toLowerCase();

  // Detectar estado de gestión
  if (
    textToAnalyze.includes("promesa de pago") ||
    textToAnalyze.includes("pagará el") ||
    textToAnalyze.includes("pagaré el") ||
    textToAnalyze.includes("comprometió a pagar") ||
    textToAnalyze.includes("fecha de pago")
  ) {
    result.estado_gestion = "PROMESA_PAGO";
  } else if (
    textToAnalyze.includes("ya pagué") ||
    textToAnalyze.includes("ya pagamos") ||
    textToAnalyze.includes("ya realizamos el pago") ||
    textToAnalyze.includes("transferencia realizada") ||
    textToAnalyze.includes("comprobante")
  ) {
    result.estado_gestion = "YA_PAGO";
  } else if (
    textToAnalyze.includes("reclamo") ||
    textToAnalyze.includes("inconformidad") ||
    textToAnalyze.includes("no reconoce") ||
    textToAnalyze.includes("problema con el servicio")
  ) {
    result.estado_gestion = "REQUIERE_SOPORTE";
  } else if (
    textToAnalyze.includes("no reconozco") ||
    textToAnalyze.includes("no tenemos esa deuda") ||
    textToAnalyze.includes("no debe")
  ) {
    result.estado_gestion = "NO_RECONOCE_DEUDA";
  } else if (
    textToAnalyze.includes("volver a llamar") ||
    textToAnalyze.includes("llame después") ||
    textToAnalyze.includes("no disponible")
  ) {
    result.estado_gestion = "VOLVER_A_LLAMAR";
  } else if (
    call.endReason === "hangup" ||
    call.endReason === "no-answer" ||
    call.endReason === "failed"
  ) {
    result.estado_gestion = "NO_CONTESTA";
  } else if (call.status === "completed" || call.ended) {
    result.estado_gestion = "COMPLETADA";
  }

  // Extraer fecha de pago (formato DD/MM/YYYY o YYYY-MM-DD)
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];
  for (const pattern of datePatterns) {
    const match = textToAnalyze.match(pattern);
    if (match) {
      // Normalizar a YYYY-MM-DD
      if (match[0].includes("-") && match[1].length === 4) {
        result.fecha_promesa_pago = match[0];
      } else {
        const [, d, m, y] = match;
        result.fecha_promesa_pago = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      break;
    }
  }

  // Extraer monto comprometido
  const montoMatch = textToAnalyze.match(/\$?\s*([\d.,]+)\s*(pesos|cop|clp|usd)?/);
  if (montoMatch) {
    const parsed = parseFloat(montoMatch[1].replace(/[.,]/g, "").replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) {
      result.monto_comprometido = parsed;
    }
  }

  // Extraer número de comprobante si mencionado
  const comprobante = textToAnalyze.match(/comprobante[:\s#]+([A-Z0-9\-]+)/i);
  if (comprobante) {
    result.numero_comprobante = comprobante[1];
  }

  // Resumen de la gestión
  if (call.summary) {
    result.resumen_gestion = call.summary.slice(0, 500);
  } else if (call.shortSummary) {
    result.resumen_gestion = call.shortSummary;
  }

  return result;
}

export async function POST(req: Request) {
  const trace_id = crypto.randomUUID();

  try {
    const rawBody = await req.text();

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      log.warn("Invalid JSON payload", { trace_id });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    log.info("Webhook received", { trace_id, event: body.event, call_id: body.call?.callId });

    if (body.event !== "call.ended" && body.event !== "call.analyzed") {
      return NextResponse.json({ received: true });
    }

    const callData = body.call;
    if (!callData) {
      return NextResponse.json({ error: "No call object in payload" }, { status: 400 });
    }

    const metadata = callData.systemMetadata || callData.templateContext || {};
    let tenantId = metadata.tenant_id;
    let leadId = metadata.lead_id;
    const callerPhone = metadata.telefono || metadata.phone || metadata.lead_phone;
    const tipoGestion = (metadata.tipo_gestion || "GENERAL").toUpperCase();
    const isJorklifCampaign = !!(tenantId && leadId && metadata.campana?.includes("Jorklif"));

    const supabaseAdmin = getAdminSupabase();

    // Fallback: If tenantId or leadId is missing, attempt lookup via phone number
    if ((!tenantId || !leadId) && callerPhone) {
      const cleanPhone = String(callerPhone).replace(/^\+/, "");
      const { data: matchedLead } = await (supabaseAdmin as any)
        .from("lead")
        .select("id, tenant_id")
        .or(`telefono.eq.+${cleanPhone},telefono.eq.${cleanPhone}`)
        .order("fecha_actualizacion", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (matchedLead) {
        leadId = leadId || matchedLead.id;
        tenantId = tenantId || matchedLead.tenant_id;
        log.info("Resolved missing metadata via phone lookup", { leadId, tenantId, callerPhone });
      }
    }

    if (!tenantId || !leadId) {
      log.warn("Missing tenant_id or lead_id in metadata and phone lookup", { call_id: callData.callId });
      return NextResponse.json({ received: true, warning: "Missing metadata" });
    }

    const durationStr = callData.duration;
    const duration = durationStr ? parseInt(String(durationStr).replace("s", ""), 10) : 0;
    const callStatus = callData.status || "ended";
    const recordingUrl = callData.recordingUrl;

    // Obtener mensajes del transcript si vienen en el payload
    const rawMessages = callData.messages || body.messages || [];

    // ── Extracción de variables de Jorklif ───────────────────────────────────
    let jorklifResult: JorklifCallResult | null = null;
    if (isJorklifCampaign || tipoGestion === "COBRANZA" || tipoGestion === "COTIZACION") {
      jorklifResult = extractJorklifVariables(callData, rawMessages);
      log.info("Jorklif call result extracted", {
        trace_id,
        leadId,
        estado: jorklifResult.estado_gestion,
        fecha_promesa: jorklifResult.fecha_promesa_pago,
      });
    }

    const transcript = rawMessages.length > 0
      ? rawMessages
          .map((m: any) => `[${m.role?.replace("MESSAGE_ROLE_", "") || "?"}]: ${m.text || m.content || ""}`)
          .join("\n")
      : "(Transcripción de Ultravox - pendiente de sync API)";

    // ── Insertar en tabla llamadas ────────────────────────────────────────────
    const { error: llamadaError, data: llamadaInsertRaw } = await supabaseAdmin
      .from("llamadas")
      .insert({
        tenant_id: tenantId,
        id_lead: leadId,
        id_llamada_retell: callData.callId,
        tipo_agente: "ULTRAVOX_AI",
        nombre_agente: callData.agentId,
        estado_llamada: callStatus,
        razon_termino: callData.endReason || null,
        duracion_segundos: duration,
        url_grabacion: recordingUrl || null,
        transcripcion: transcript,
      } as any)
      .select("id")
      .single();

    const llamadaInsert = llamadaInsertRaw as any;

    if (llamadaError) {
      log.error("Error saving llamada", { trace_id, error: llamadaError.message });
    }

    // ── Actualizar el lead Jorklif con el resultado de la gestión ─────────────
    if (jorklifResult && leadId) {
      const { data: currentLead } = await supabaseAdmin
        .from("lead" as any)
        .select("metadata")
        .eq("id", leadId)
        .single();

      const prevMeta = (currentLead as any)?.metadata || {};
      const updatedMeta = {
        ...prevMeta,
        estado_llamada: jorklifResult.estado_gestion,
        ultravox_call_id: callData.callId,
        duracion_segundos: duration,
        grabacion_url: recordingUrl || prevMeta.grabacion_url,
        resumen_llamada: jorklifResult.resumen_gestion || prevMeta.resumen_llamada,
        // Variables de cobranza
        ...(jorklifResult.fecha_promesa_pago && {
          fecha_promesa_pago: jorklifResult.fecha_promesa_pago,
        }),
        ...(jorklifResult.monto_comprometido && {
          monto_comprometido: jorklifResult.monto_comprometido,
        }),
        ...(jorklifResult.numero_comprobante && {
          numero_comprobante: jorklifResult.numero_comprobante,
        }),
        ...(jorklifResult.correo_reenvio && {
          correo_reenvio: jorklifResult.correo_reenvio,
        }),
        ...(jorklifResult.motivo_reclamo && {
          motivo_reclamo: jorklifResult.motivo_reclamo,
        }),
        ultima_llamada_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabaseAdmin
        .from("lead" as any)
        .update({
          metadata: updatedMeta,
          last_interaction_at: new Date().toISOString(),
          current_stage:
            jorklifResult.estado_gestion === "PROMESA_PAGO"
              ? "NEGOCIACION"
              : jorklifResult.estado_gestion === "YA_PAGO"
              ? "CERRADO"
              : jorklifResult.estado_gestion === "REQUIERE_SOPORTE"
              ? "ESCALADO"
              : "CONTACTADO",
        })
        .eq("id", leadId);

      if (updateErr) {
        log.error("Error updating Jorklif lead after call", {
          trace_id,
          leadId,
          error: updateErr.message,
        });
      } else {
        log.info("Jorklif lead updated successfully", {
          trace_id,
          leadId,
          estado: jorklifResult.estado_gestion,
        });
      }
    }

    // ── Post-Analysis asíncrono ───────────────────────────────────────────────
    const { PostAnalysisService } = await import("@/lib/services/post-analysis");
    PostAnalysisService.processInteraction({
      leadId,
      tenantId,
      transcript,
      channel: "CALL",
      externalId: callData.callId,
      durationMs: duration * 1000,
      disconnectionReason: callData.endReason || null,
    }).catch((err) => log.error("Post-Analysis Error", { trace_id, error: err.message }));

    // ── Insertar mensaje en inbox ─────────────────────────────────────────────
    let summaryText = `📞 **Llamada de Voz Jorklif (${callStatus})** — Duración: ${duration}s\n\n`;
    if (jorklifResult) {
      const estadoEmoji: Record<EstadoGestion, string> = {
        PROMESA_PAGO: "✅",
        YA_PAGO: "💰",
        REQUIERE_SOPORTE: "⚠️",
        NO_RECONOCE_DEUDA: "❌",
        NO_CONTESTA: "📵",
        VOLVER_A_LLAMAR: "🔄",
        COMPLETADA: "☑️",
        SIN_DATOS: "❓",
      };
      summaryText += `**Estado:** ${estadoEmoji[jorklifResult.estado_gestion]} ${jorklifResult.estado_gestion}\n`;
      if (jorklifResult.fecha_promesa_pago) {
        summaryText += `**Fecha Promesa de Pago:** ${jorklifResult.fecha_promesa_pago}\n`;
      }
      if (jorklifResult.monto_comprometido) {
        summaryText += `**Monto Comprometido:** $${jorklifResult.monto_comprometido.toLocaleString("es-CL")}\n`;
      }
      if (jorklifResult.resumen_gestion) {
        summaryText += `\n**Resumen:** ${jorklifResult.resumen_gestion}`;
      }
    } else {
      summaryText += `*Transcripción disponible en el panel.*`;
    }

    const { error: insertError } = await supabaseAdmin.from("chat_messages").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      direction: "OUTBOUND",
      message_type: "SYSTEM_LOG",
      content: summaryText,
      sent_by: "Ultravox AI – Jorklif",
      status: "DELIVERED",
      metadata: {
        call_id: callData.callId,
        recording_url: recordingUrl,
        llamada_db_id: llamadaInsert?.id,
        jorklif_result: jorklifResult,
      },
    } as any);

    if (insertError) {
      log.error("Failed to insert chat_message", { trace_id, error: insertError.message });
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // ── Enviar WhatsApp Post-Llamada con link del grupo o info necesaria ─────
    let waResult = null;
    const shouldSendWhatsApp =
      metadata.send_whatsapp !== false &&
      metadata.enviar_whatsapp !== false;

    if (shouldSendWhatsApp) {
      try {
        const { WhatsAppPostCallService } = await import("@/lib/services/whatsapp-postcall-service");
        waResult = await WhatsAppPostCallService.dispatch({
          supabase: supabaseAdmin as any,
          tenantId,
          leadId,
          phone: callerPhone,
          recipientName: metadata.nombre || metadata.name,
          groupLink: metadata.group_link || metadata.whatsapp_group_link || metadata.link_grupo,
          templateName: metadata.whatsapp_template || metadata.template_name,
          callId: callData.callId,
        });
        log.info("Post-call WhatsApp dispatch completed", { trace_id, success: waResult.success });
      } catch (waErr) {
        log.warn("Post-call WhatsApp dispatch error", { trace_id, error: (waErr as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Logged to Inbox",
      jorklif_result: jorklifResult,
      whatsapp: waResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Unhandled error in ultravox webhook", { trace_id, error: msg });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing Supabase configuration (SUPABASE_URL)");
  }
  const key = getAuthServiceRoleKey();

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
