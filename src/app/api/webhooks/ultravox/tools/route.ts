/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { PdfService } from "@/lib/services/pdf-service";
import { GoogleSheetsService } from "@/lib/services/google-sheets-service";

export async function handleToolExecution(
  req: Request,
  explicitToolName?: string,
  explicitTenantId?: string
) {
  try {
    const { searchParams } = new URL(req.url);
    const queryTool =
      searchParams.get("tool") ||
      searchParams.get("toolName") ||
      searchParams.get("name") ||
      searchParams.get("action");

    let payload: Record<string, any> = {};

    if (req.method !== "GET" && req.method !== "HEAD") {
      const rawBody = await req.text().catch(() => "");
      if (rawBody && rawBody.trim().length > 0) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
      }
    } else {
      payload = Object.fromEntries(searchParams.entries());
    }

    // Resolve toolName from explicit parameter, payload, query parameter, or payload keys
    let toolName = explicitToolName || payload.toolName || payload.name || queryTool;

    // Resolve args: if payload has nested parameters/args, use them; otherwise use payload itself
    let args: Record<string, any> = payload.parameters || payload.args || {};
    if (Object.keys(args).length === 0) {
      args = payload;
    }

    // Healthcheck / Browser ping on GET when no arguments are provided
    if (req.method === "GET" && Object.keys(args).length === 0) {
      return NextResponse.json({
        status: "active",
        endpoint: "Ultravox Tools Endpoint",
        tool: toolName || "auto",
        message: "Endpoint activo y listo para recibir llamadas de Ultravox.",
      });
    }

    // Auto-detect toolName if Ultravox HTTP tool called endpoint directly without wrapping
    if (!toolName) {
      if (
        args.Repuesto_solicitado_y_cantidad ||
        args.repuesto_solicitado_y_cantidad ||
        args.Datos_de_la_grua ||
        args.datos_de_la_grua ||
        args.repuestos ||
        args.repuesto
      ) {
        toolName = "capturarDatosCotizacion";
      } else if (args.Nombre_empresa || args.nombre_empresa) {
        toolName = "Arriendo_de_Gruas";
      } else if (
        args.link_grupo ||
        args.group_link ||
        args.enviar_whatsapp ||
        args.send_whatsapp ||
        args.url ||
        args.mensaje ||
        args.message
      ) {
        toolName = "enviar_whatsapp";
      } else {
        // Default general lead & contact capture (without forcing PDF generation)
        toolName = "registrar_datos_llamada";
      }
    }

    const call = payload.call;

    console.log(`[ULTRAVOX TOOLS] Incoming function call: ${toolName}`, {
      args,
      query: Object.fromEntries(searchParams.entries()),
    });

    const supabase = await getAdminSupabaseClient();

    // ── Multi-tenant resolution ───────────────────────────────────────
    // Priority: explicit path param > query param > headers > payload body > call metadata
    let tenantId: string | undefined =
      explicitTenantId ||
      searchParams.get("tenant_id") ||
      searchParams.get("tenantId") ||
      searchParams.get("tenant") ||
      (req.headers.get("x-tenant-id") ?? undefined) ||
      (req.headers.get("tenant-id") ?? undefined) ||
      (req.headers.get("x-tenant") ?? undefined) ||
      payload.tenant_id ||
      payload.tenantId ||
      payload.tenant ||
      args.tenant_id ||
      args.tenantId;

    const metadata = call?.systemMetadata || call?.templateContext || {};
    if (!tenantId) {
      tenantId = metadata.tenant_id;
    }

    let leadId: string | undefined =
      metadata.lead_id || payload.lead_id || payload.leadId || args.lead_id || args.leadId;

    // Smart fallback 1: reverse lookup by caller phone number
    const callerPhone =
      args.WhatsApp ||
      args.whatsapp ||
      args.telefono ||
      args.phone ||
      args.celular ||
      payload.telefono ||
      payload.phone ||
      metadata.telefono ||
      metadata.phone;

    if ((!tenantId || !leadId) && callerPhone) {
      const cleanPhone = String(callerPhone).replace(/[\s\-\(\)]/g, "");
      const digits = cleanPhone.replace(/^\+/, "");
      const { data: matchedLead } = await (supabase as any)
        .from("lead")
        .select("id, tenant_id")
        .or(`telefono.eq.${cleanPhone},telefono.eq.+${digits},telefono.eq.${digits}`)
        .order("fecha_actualizacion", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (matchedLead) {
        leadId = leadId || matchedLead.id;
        tenantId = tenantId || matchedLead.tenant_id;
        console.log(`[ULTRAVOX TOOLS] Resolved tenant via phone reverse lookup:`, {
          tenantId,
          leadId,
          callerPhone,
        });
      }
    }

    // Smart fallback 2: lookup by agent ID in voice_agents table
    if (!tenantId && call?.agentId) {
      const { data: matchedAgent } = await (supabase as any)
        .from("voice_agents")
        .select("tenant_id")
        .or(`id.eq.${call.agentId},provider_agent_id.eq.${call.agentId}`)
        .limit(1)
        .maybeSingle();

      if (matchedAgent?.tenant_id) {
        tenantId = matchedAgent.tenant_id;
        console.log(`[ULTRAVOX TOOLS] Resolved tenant via voice_agents table:`, {
          tenantId,
          agentId: call.agentId,
        });
      }
    }

    // Smart fallback 3: single-tenant database instance
    if (!tenantId) {
      const { data: allTenants, count } = await (supabase as any)
        .from("tenants")
        .select("id", { count: "exact" })
        .limit(2);

      if (count === 1 && allTenants?.[0]?.id) {
        tenantId = allTenants[0].id;
        console.log(`[ULTRAVOX TOOLS] Single-tenant fallback resolved:`, { tenantId });
      }
    }

    if (!tenantId) {
      console.warn(
        `[ULTRAVOX TOOLS] Missing tenant_id for tool call "${toolName}". Request will proceed with default tenant resolution.`
      );
    }

    switch (toolName) {
      case "Arriendo_de_Gruas":
      case "arriendo_de_gruas":
        return await handleArriendoGruas(supabase, tenantId, leadId, args);

      case "Servicio_Tecnico":
      case "servicio_tecnico":
        return await handleServicioTecnico(supabase, tenantId, leadId, args);

      case "capturarDatosCotizacion":
      case "capturar_datos_cotizacion":
      case "cotizacion":
      case "Cotizacion":
      case "enviar_cotizacion":
      case "mandar_pdf":
        return await handleCapturaCotizacion(supabase, tenantId, leadId, args);

      case "guardar_datos_contacto":
      case "guardar_prospecto":
      case "guardar_lead":
      case "save_lead":
      case "save_contact":
      case "registrar_datos_llamada":
        return await handleSaveLead(supabase, tenantId, leadId, args);

      case "book_appointment":
      case "agendar_cita":
        return await handleBookAppointment(supabase, tenantId || "", leadId || "", args);

      case "cancel_appointment":
      case "cancelar_cita":
        return await handleCancelAppointment(supabase, tenantId || "", args);

      case "reschedule_appointment":
      case "reprogramar_cita":
        return await handleRescheduleAppointment(supabase, tenantId || "", args);

      case "check_availability":
      case "consultar_disponibilidad":
        return await handleCheckAvailability(supabase, tenantId || "", args);

      case "get_lead_info":
      case "consultar_datos":
        return await handleGetLeadInfo(supabase, leadId || "");

      // ── Workflow 2: Google Sheets data lookup ──────────────────────
      case "buscar_repuestos":
      case "search_parts":
      case "consultar_repuestos":
        return await handleBuscarRepuestos(supabase, tenantId || "", args);

      case "obtener_precios_cotizacion":
      case "get_quotation_data":
      case "consultar_precios":
        return await handleObtenerPreciosCotizacion(supabase, tenantId || "", args);

      // ── Workflow 3: Agendar visita para arriendo ───────────────────
      case "agendar_visita_arriendo":
      case "schedule_rental_visit":
        return await handleAgendarVisitaArriendo(supabase, tenantId, leadId, args);

      // ── Workflow 4: Enviar WhatsApp / Link de Grupo ────────────────
      case "enviar_whatsapp":
      case "send_whatsapp":
      case "enviar_link_grupo":
      case "enviar_whatsapp_grupo":
      case "compartir_link":
      case "enviar_informacion":
      case "send_group_link":
        return await handleEnviarWhatsApp(supabase, tenantId, leadId, args, call?.callId);

      default:
        console.log(`[ULTRAVOX TOOLS] Generic tool dynamic handler: ${toolName}`);
        return await handleGenericCustomTool(supabase, tenantId, leadId, toolName, args);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ULTRAVOX TOOLS CRITICAL ERROR]:", errorMessage);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

async function handleBookAppointment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  leadId: string,
  args: Record<string, unknown>
) {
  const date = args.date as string;
  const time = args.time as string | undefined;
  const notes = args.notes as string | undefined;

  const { data: lead } = await supabase
    .from("lead")
    .select("*, lead_programas (id_programa, programas (nombre))")
    .eq("id", leadId)
    .single();

  const leadData = lead as any;
  const programId = leadData?.lead_programas?.[0]?.id_programa;
  const programName = leadData?.lead_programas?.[0]?.programas?.nombre;

  let scheduledAt = date;
  if (time) {
    const timeStr = time.includes(":")
      ? time.split(":").length === 2
        ? `${time}:00`
        : time
      : `${time}:00:00`;
    scheduledAt = `${date}T${timeStr}Z`;
  }

  const { data: allAdvisors } = await supabase
    .from("advisors")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  let selectedAdvisor = null;
  if (allAdvisors && allAdvisors.length > 0) {
    selectedAdvisor =
      allAdvisors.find(
        (a) => a.specialties?.includes(programId) || a.specialties?.includes(programName)
      ) || null;
    if (!selectedAdvisor)
      selectedAdvisor =
        allAdvisors.find((a) => a.handled_lead_types?.includes(leadData?.tipo_lead)) || null;
    if (!selectedAdvisor) selectedAdvisor = allAdvisors[0] || null;
  }

  let overlaps = 0;
  if (selectedAdvisor) {
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("advisor_id", selectedAdvisor.id)
      .eq("scheduled_at", scheduledAt)
      .neq("status", "CANCELLED");
    overlaps = count || 0;
  }

  const { AppointmentService } = await import("@/lib/services/appointment-service");

  let appointmentData: any = null;
  try {
    appointmentData = await AppointmentService.bookAppointment(tenantId, leadId, date, time, notes);
  } catch (e) {
    throw e;
  }

  if (appointmentData?.scheduled_at && appointmentData?.id) {
    try {
      const { getOrchestratorConfigForTenant } = await import("@/lib/actions/orchestrator-config");
      const { enqueueLeadStep } = await import("@/lib/core/queue/lead-sequence-queue");

      const config = await getOrchestratorConfigForTenant(tenantId);
      const reminderLeadTimeHours = config.scheduling?.reminder_hours || 24;

      const appointmentTime = new Date(appointmentData.scheduled_at as string).getTime();
      const reminderTime = appointmentTime - reminderLeadTimeHours * 60 * 60 * 1000;
      const now = Date.now();
      const delayMs = Math.max(0, reminderTime - now);

      if (delayMs > 0 || Math.abs(reminderTime - now) < 1000 * 60 * 5) {
        await enqueueLeadStep(
          {
            leadId,
            tenantId,
            action: "APPOINTMENT_REMINDER",
            appointmentId: appointmentData.id as string,
            template: config.scheduling?.reminder_template || "appointment_reminder_es",
          },
          delayMs
        );
      }
    } catch (reminderErr) {
      console.error("Failed to queue reminder:", reminderErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Cita agendada correctamente",
    appointment_id: appointmentData?.id,
    advisor_name: selectedAdvisor?.name || "Sin asignar",
    is_overlap: (overlaps || 0) > 0,
  });
}

async function handleCancelAppointment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  args: Record<string, unknown>
) {
  const { AppointmentService } = await import("@/lib/services/appointment-service");
  const appointmentId = args.appointmentId as string;
  if (!appointmentId)
    return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });

  try {
    const result = await AppointmentService.cancelAppointment(appointmentId, tenantId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handleRescheduleAppointment(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  args: Record<string, unknown>
) {
  const { AppointmentService } = await import("@/lib/services/appointment-service");
  const appointmentId = args.appointmentId as string;
  const newDate = args.newDate as string;
  const newTime = args.newTime as string | undefined;

  if (!appointmentId || !newDate)
    return NextResponse.json({ error: "appointmentId and newDate are required" }, { status: 400 });

  try {
    const result = await AppointmentService.rescheduleAppointment(
      appointmentId,
      tenantId,
      newDate,
      newTime
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handleCheckAvailability(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  args: Record<string, unknown>
) {
  const { AppointmentService } = await import("@/lib/services/appointment-service");
  const date = args.date as string;
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  try {
    const result = await AppointmentService.checkAvailability(tenantId, date);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handleGetLeadInfo(supabase: SupabaseClient<Database>, leadId: string) {
  const { data, error } = await supabase
    .from("lead")
    .select("nombre, apellido, email, pais, lead_programas (id_programa, programas (nombre))")
    .eq("id", leadId)
    .single();

  if (error) throw error;
  const leadData = data as any;
  const programName = leadData.lead_programas?.[0]?.programas?.nombre || "Sin programa definido";

  return NextResponse.json({
    lead_name: leadData.nombre,
    full_name: `${leadData.nombre} ${leadData.apellido || ""}`.trim(),
    email: leadData.email,
    country: leadData.pais,
    program_of_interest: programName,
    status: "INTERESADO_ALTA_PRIORIDAD",
  });
}

async function handleSaveLead(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const rawNombre = (findArgByKeywords(args, ["nombre", "name", "cliente", "usuario"]) || "") as string;
    const telefono = (findArgByKeywords(args, ["telefono", "phone", "whatsapp", "celular", "numero"]) || "") as string;
    const email = (findArgByKeywords(args, ["email", "correo", "mail"]) || "") as string;
    const notas = (findArgByKeywords(args, ["motivacion", "notas", "interes", "notes", "resumen", "motivo"]) || "") as string;

    // Resolver tenant si no viene en metadata
    let effectiveTenantId = tenantId;
    if (!effectiveTenantId) {
      const { data: firstTenant } = await supabase.from("tenants").select("id").limit(1).single();
      effectiveTenantId = (firstTenant as any)?.id;
    }

    // Dividir nombre y apellido si viene completo
    const parts = rawNombre.trim().split(" ");
    const nombre = parts[0] || "Prospecto";
    const apellido = parts.slice(1).join(" ") || "";

    console.log("[ULTRAVOX TOOL] Guardando lead dinámico:", { nombre, apellido, telefono, email, notas, args });

    // 1. Guardar en Supabase (tabla 'lead') - guardando TODOS los campos enviados por Ultravox
    let savedLead: any = null;
    if (leadId) {
      const { data } = await (supabase as any).from("lead").update({
        nombre: nombre || undefined,
        apellido: apellido || undefined,
        telefono: telefono || undefined,
        email: email || undefined,
        metadata: {
          ...args,
          notas,
          capturado_por: "ultravox_ai",
          fecha_actualizacion: new Date().toISOString(),
        },
      }).eq("id", leadId).select().single();
      savedLead = data;
    } else {
      const { data } = await (supabase as any).from("lead").insert({
        tenant_id: effectiveTenantId,
        nombre,
        apellido,
        telefono,
        email: email || null,
        origen: "ultravox",
        status: "nuevo",
        metadata: {
          ...args,
          notas,
          capturado_por: "ultravox_ai",
          fecha_creacion: new Date().toISOString(),
        },
      }).select().single();
      savedLead = data;
    }

    if (savedLead && effectiveTenantId) {
      await triggerUltravoxWorkflows(supabase, effectiveTenantId, savedLead, "guardar_datos_contacto", args);
    }

    // 2. Enviar a Google Sheets si está configurada la URL
    const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (sheetsWebhook) {
      try {
        await fetch(sheetsWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: new Date().toLocaleString("es-CL"),
            nombre: `${nombre} ${apellido}`.trim(),
            telefono,
            email,
            notas,
            origen: "Llamada Ultravox",
          }),
        });
        console.log("[ULTRAVOX -> SHEETS] Fila enviada con éxito a Google Sheets");
      } catch (err) {
        console.error("[ULTRAVOX -> SHEETS ERROR]:", err);
      }
    }

    // 3. Opcional: Enviar WhatsApp si se solicita enlace de grupo o mensaje
    let waSent = false;
    const linkGrupo = args.link_grupo || args.group_link || args.link || args.url;
    if (telefono && (args.enviar_whatsapp !== false || linkGrupo)) {
      try {
        const { WhatsAppPostCallService } = await import("@/lib/services/whatsapp-postcall-service");
        const waRes = await WhatsAppPostCallService.dispatch({
          supabase,
          tenantId: effectiveTenantId || "",
          leadId,
          phone: telefono,
          recipientName: nombre,
          groupLink: linkGrupo as string | undefined,
          customMessage: (args.mensaje || args.message) as string | undefined,
        });
        waSent = waRes.success;
      } catch (waErr) {
        console.warn("[ULTRAVOX SAVE LEAD] Error enviando WhatsApp:", waErr);
      }
    }

    const waText = waSent ? " y te acabo de enviar el enlace a tu WhatsApp" : "";

    return NextResponse.json({
      success: true,
      whatsapp_sent: waSent,
      message: `Listo ${nombre}, tus datos han sido registrados correctamente${waText}. ¿Deseas consultar algo más?`,
    });
  } catch (error) {
    console.error("[ULTRAVOX SAVE LEAD ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function resolveTenant(supabase: SupabaseClient<Database>, tenantId?: string): Promise<string> {
  if (tenantId) return tenantId;
  const { data: allTenants, count } = await (supabase as any)
    .from("tenants")
    .select("id", { count: "exact" })
    .limit(2);
  if (count === 1 && allTenants?.[0]?.id) return allTenants[0].id;
  const { data: first } = await (supabase as any).from("tenants").select("id").limit(1).single();
  return first?.id || "";
}

/**
 * Automatically triggers active orchestration workflows configured with `ultravoxTrigger`
 * for the given tenant and tool.
 */
async function triggerUltravoxWorkflows(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  lead: any,
  toolName: string,
  args: Record<string, unknown>
) {
  if (!tenantId || !lead) return;
  try {
    const { data: graphs, error: graphErr } = await (supabase as any)
      .from("orchestration_graphs")
      .select("workflow_id, graph_data")
      .eq("tenant_id", tenantId);

    if (graphErr || !graphs || graphs.length === 0) {
      console.log(`[ULTRAVOX AUTOMATION] No orchestration graphs found for tenant ${tenantId}`);
      return;
    }

    const { orchestrator } = await import("@/lib/core/orchestrator");

    for (const g of graphs) {
      const nodes = g.graph_data?.nodes || [];
      const triggerNode = nodes.find((n: any) => {
        if (n.type !== "ultravoxTrigger") return false;
        const configTool = n.data?.config?.tool_name;
        if (!configTool || configTool === "all" || configTool === "*") return true;
        return (
          configTool.toLowerCase() === toolName.toLowerCase() ||
          configTool === toolName
        );
      });

      if (triggerNode) {
        console.log(
          `[ULTRAVOX AUTOMATION] 🚀 Disparando workflow ${g.workflow_id} (trigger: ${triggerNode.id}) para lead ${lead.id}`
        );
        orchestrator
          .executeWorkflow(g.workflow_id, lead, tenantId, args, triggerNode.id)
          .catch((err) => {
            console.error(`[ULTRAVOX AUTOMATION] Error en ejecución de workflow ${g.workflow_id}:`, err);
          });
      }
    }
  } catch (err) {
    console.error("[ULTRAVOX AUTOMATION] Error buscando workflows activos:", err);
  }
}

/**
 * Fallback handler for generic or custom tools defined dynamically by the user in Ultravox
 */
async function handleGenericCustomTool(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  toolName: string,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const nombre = (findArgByKeywords(args, ["nombre", "name", "cliente", "usuario"]) || "Prospecto") as string;
    const telefono = (findArgByKeywords(args, ["telefono", "phone", "whatsapp", "celular", "numero"]) || "") as string;
    const email = (findArgByKeywords(args, ["email", "correo", "mail"]) || "") as string;
    const notas = (findArgByKeywords(args, ["notas", "motivo", "resumen", "detalles"]) || "") as string;

    let savedLead: any = null;
    if (leadId) {
      const { data } = await (supabase as any)
        .from("lead")
        .update({
          nombre: nombre !== "Prospecto" ? nombre : undefined,
          telefono: telefono || undefined,
          email: email || undefined,
          metadata: {
            ...args,
            tool_name: toolName,
            notas,
            capturado_por: "ultravox_ai",
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", leadId)
        .select()
        .single();
      savedLead = data;
    } else {
      const { data } = await (supabase as any)
        .from("lead")
        .insert({
          tenant_id: effectiveTenantId,
          nombre,
          telefono,
          email: email || null,
          origen: "ultravox",
          status: "nuevo",
          metadata: {
            ...args,
            tool_name: toolName,
            notas,
            capturado_por: "ultravox_ai",
            captured_at: new Date().toISOString(),
          },
        })
        .select()
        .single();
      savedLead = data;
    }

    if (savedLead && effectiveTenantId) {
      await triggerUltravoxWorkflows(supabase, effectiveTenantId, savedLead, toolName, args);
    }

    return NextResponse.json({
      success: true,
      tool: toolName,
      lead_id: savedLead?.id,
      message: `Tool ${toolName} ejecutada exitosamente. Datos registrados en LinkStation.`,
    });
  } catch (error) {
    console.error(`[ULTRAVOX GENERIC TOOL ERROR: ${toolName}]:`, error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function handleArriendoGruas(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const empresa = String(args.Nombre_empresa || args.nombre_empresa || args.empresa || "Empresa");
    const telefono = String(args.WhatsApp || args.whatsapp || args.telefono || "");

    console.log("[ULTRAVOX TOOL: Arriendo_de_Gruas] Recibido:", args);

    const { data: savedLead } = await (supabase as any).from("lead").insert({
      tenant_id: effectiveTenantId,
      nombre: empresa,
      telefono: telefono,
      tipo_lead: "arriendo_gruas",
      status: "nuevo",
      origen: "ultravox",
      metadata: {
        tool_name: "Arriendo_de_Gruas",
        category: "arriendo_gruas",
        parameters: args,
        captured_at: new Date().toISOString(),
      },
    }).select().single();

    if (savedLead && effectiveTenantId) {
      await triggerUltravoxWorkflows(supabase, effectiveTenantId, savedLead, "Arriendo_de_Gruas", args);
    }

    return NextResponse.json({
      success: true,
      message: `Excelente, he registrado tu solicitud de arriendo de grúa para ${empresa}. Nuestro equipo comercial se comunicará contigo al WhatsApp ${telefono} a la brevedad.`,
    });
  } catch (error) {
    console.error("[ARRIENDO_DE_GRUAS ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function handleServicioTecnico(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const empresa = String(args.Nombre_empresa || args.nombre_empresa || args.empresa || "Empresa");
    const telefono = String(args.WhatsApp || args.whatsapp || args.telefono || "");

    console.log("[ULTRAVOX TOOL: Servicio_Tecnico] Recibido:", args);

    const { data: savedLead } = await (supabase as any).from("lead").insert({
      tenant_id: effectiveTenantId,
      nombre: empresa,
      telefono: telefono,
      tipo_lead: "servicio_tecnico",
      status: "nuevo",
      origen: "ultravox",
      metadata: {
        tool_name: "Servicio_Tecnico",
        category: "servicio_tecnico",
        parameters: args,
        captured_at: new Date().toISOString(),
      },
    }).select().single();

    if (savedLead && effectiveTenantId) {
      await triggerUltravoxWorkflows(supabase, effectiveTenantId, savedLead, "Servicio_Tecnico", args);
    }

    return NextResponse.json({
      success: true,
      message: `Perfecto, he registrado la orden de servicio técnico para ${empresa}. Un técnico especialista coordinará la visita al WhatsApp ${telefono}.`,
    });
  } catch (error) {
    console.error("[SERVICIO_TECNICO ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function handleCapturaCotizacion(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const cliente = String(
      args.Nombre_del_cliente ||
      args.nombre_del_cliente ||
      args.nombre ||
      args.cliente ||
      "Cliente"
    ).trim();

    // Clean phone number from string, float or number
    let rawPhone =
      args.WhatsApp ??
      args.whatsapp ??
      args.telefono ??
      args.celular ??
      args.phone ??
      "";
    const telefono = String(rawPhone || "");

    const email = String(
      args.Correo_electronico ||
      args.correo_electronico ||
      args.email ||
      ""
    ).trim();

    const repuestos = String(
      args.Repuesto_solicitado_y_cantidad ||
      args.repuesto_solicitado_y_cantidad ||
      args.repuestos ||
      args.repuesto ||
      args.items ||
      args.repuestos_solicitados ||
      args.repuesto_solicitado ||
      args.repuesto_a_cotizar ||
      ""
    ).trim();

    const maquinaria = String(
      args.Datos_de_la_grua ||
      args.datos_de_la_grua ||
      args.maquinaria ||
      args.maquina ||
      args.tipo_maquina ||
      args.grua ||
      ""
    ).trim();

    const comuna = String(
      args.Comuna_o_Ciudad ||
      args.comuna_o_ciudad ||
      args.comuna ||
      args.ciudad ||
      args.direccion ||
      ""
    ).trim();

    const modelo = String(
      args.modelo ||
      args.modelo_maquina ||
      args.numero_serie ||
      args.serie ||
      ""
    ).trim();

    const total = args.total || args.precio || args.valor || args.monto || "";
    const notas = String(
      args.detalles || args.observaciones || args.notas || args.descripcion || ""
    ).trim();

    const observacionesCompletas = [
      comuna ? `Despacho / Ciudad: ${comuna}` : "",
      notas,
    ]
      .filter(Boolean)
      .join(" | ");

    console.log("[ULTRAVOX TOOL: capturarDatosCotizacion] Recibido:", {
      cliente,
      telefono,
      email,
      repuestos,
      maquinaria,
      comuna,
      modelo,
      total,
      notas,
    });

    // 1. Ingest / Update Lead in Database
    let activeLeadId = leadId;
    if (activeLeadId) {
      await (supabase as any)
        .from("lead")
        .update({
          nombre: cliente !== "Cliente" ? cliente : undefined,
          telefono: telefono || undefined,
          email: email || undefined,
          tipo_lead: "cotizacion",
          status: "cotizacion_solicitada",
          metadata: {
            tool_name: "capturarDatosCotizacion",
            category: "cotizacion",
            parameters: args,
            repuestos,
            maquinaria,
            comuna,
            modelo,
            total,
            captured_at: new Date().toISOString(),
          },
        })
        .eq("id", activeLeadId);
    } else {
      const { data: newLead } = await (supabase as any)
        .from("lead")
        .insert({
          tenant_id: effectiveTenantId,
          nombre: cliente,
          telefono: telefono,
          email: email || null,
          tipo_lead: "cotizacion",
          status: "cotizacion_solicitada",
          origen: "ultravox",
          metadata: {
            tool_name: "capturarDatosCotizacion",
            category: "cotizacion",
            parameters: args,
            repuestos,
            maquinaria,
            comuna,
            modelo,
            total,
            captured_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();
      activeLeadId = newLead?.id;
    }

    // 1.1 Trigger custom Ultravox workflows if defined in the canvas
    if (activeLeadId && effectiveTenantId) {
      const { data: savedLead } = await (supabase as any)
        .from("lead")
        .select("*")
        .eq("id", activeLeadId)
        .single();
      if (savedLead) {
        await triggerUltravoxWorkflows(supabase, effectiveTenantId, savedLead, "capturarDatosCotizacion", args);
      }
    }

    // 2. Generate PDF and dispatch via WhatsApp (if phone exists) and Email (if email exists)
    const quotationResult = await PdfService.executeQuotationAndWhatsApp({
      supabase,
      tenantId: effectiveTenantId,
      leadId: activeLeadId,
      quotationData: {
        cliente,
        telefono,
        email,
        repuestos: repuestos || "Repuestos y Servicios para Maquinaria",
        maquinaria: maquinaria || "Grúa Horquilla / Maquinaria Pesada",
        modelo,
        total: total ? String(total) : undefined,
        observaciones: observacionesCompletas,
      },
      sendWhatsApp: Boolean(telefono),
    });

    const itemsResumen = repuestos ? `los repuestos "${repuestos}"` : "tu solicitud de cotización";

    let dispatchConfirmation = "y nuestro equipo te enviará la información";
    if (quotationResult.whatsappSent && quotationResult.emailSent) {
      dispatchConfirmation = `y te acabo de enviar la cotización oficial tanto a tu WhatsApp como a tu correo (${email})`;
    } else if (quotationResult.whatsappSent) {
      dispatchConfirmation = `y te acabo de enviar la cotización oficial en PDF directamente a tu WhatsApp`;
    } else if (quotationResult.emailSent) {
      dispatchConfirmation = `y te acabo de enviar la cotización oficial en PDF directamente a tu correo electrónico (${email})`;
    }

    return NextResponse.json({
      success: true,
      lead_id: activeLeadId,
      pdf_url: quotationResult.pdfUrl,
      whatsapp_sent: quotationResult.whatsappSent,
      whatsapp_error: quotationResult.whatsappError || null,
      email_sent: quotationResult.emailSent,
      email_error: quotationResult.emailError || null,
      message: `Listo ${cliente}, he registrado con éxito ${itemsResumen} para tu equipo ${maquinaria || "grúa"}, ${dispatchConfirmation}. ¿Deseas consultar algo más?`,
    });
  } catch (error) {
    console.error("[CAPTURAR_COTIZACION ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2: Google Sheets - Buscar Repuestos y Precios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tool: buscar_repuestos
 * Searches the tenant's Google Sheet (tab "Repuestos") for matching spare parts.
 * Returns part code, description, price, and stock availability.
 */
async function handleBuscarRepuestos(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const query = String(
      args.query ||
      args.repuesto ||
      args.parte ||
      args.busqueda ||
      args.codigo ||
      args.search ||
      ""
    );
    const sheetName = String(args.sheet || args.hoja || "") || undefined;

    if (!query) {
      return NextResponse.json({
        success: false,
        message: "Por favor proporciona el nombre o código del repuesto a buscar.",
        results: [],
      });
    }

    console.log(`[ULTRAVOX TOOL: buscar_repuestos] Buscando: "${query}" en tenant ${effectiveTenantId}`);

    const results = await GoogleSheetsService.searchRepuestos(
      effectiveTenantId,
      query,
      sheetName
    );

    if (!results.length) {
      return NextResponse.json({
        success: true,
        found: false,
        count: 0,
        message: `No encontré el repuesto "${query}" en el catálogo. Puedo verificar con el equipo técnico.`,
        results: [],
      });
    }

    // Format results for the AI to read naturally
    const formatted = results.slice(0, 10).map((row) => ({
      codigo: row.codigo || row.code || row.ref || row.referencia || "—",
      descripcion: row.descripcion || row.nombre || row.item || row.repuesto || row.description || "—",
      precio: row.precio || row.price || row.valor || row.monto || row.costo || "Consultar",
      stock: row.stock || row.disponibilidad || row.cantidad || row.inventory || "Disponible",
      modelo_compatible: row.modelo || row.model || row.modelo_compatible || row.maquina || "",
      marca: row.marca || row.brand || row.fabricante || "",
      unidad: row.unidad || row.unit || row.um || "unidad",
    }));

    const summary = formatted
      .map(
        (r, i) =>
          `${i + 1}. ${r.descripcion} (Cód: ${r.codigo}) - Precio: ${r.precio} - Stock: ${r.stock}${r.modelo_compatible ? ` - Compatible con: ${r.modelo_compatible}` : ""
          }`
      )
      .join("; ");

    return NextResponse.json({
      success: true,
      found: true,
      count: results.length,
      showing: Math.min(results.length, 10),
      results: formatted,
      summary,
      message: `Encontré ${results.length} resultado(s) para "${query}": ${summary}`,
    });
  } catch (error) {
    console.error("[BUSCAR_REPUESTOS ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Tool: obtener_precios_cotizacion
 * Fetches all rows from the quotation/pricing tab in Google Sheets.
 * Used by the AI to have full catalog context for building quotations.
 */
async function handleObtenerPreciosCotizacion(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const sheetName = String(args.sheet || args.hoja || args.tab || "") || undefined;
    const limit = Number(args.limit || args.limite || 50);

    console.log(`[ULTRAVOX TOOL: obtener_precios_cotizacion] Tenant: ${effectiveTenantId}`);

    const rows = await GoogleSheetsService.getCotizacionData(effectiveTenantId, sheetName);

    if (!rows.length) {
      return NextResponse.json({
        success: true,
        found: false,
        count: 0,
        message: "No hay datos de cotización disponibles en el momento. Procederé con precios estándar.",
        rows: [],
      });
    }

    const sliced = rows.slice(0, limit);

    return NextResponse.json({
      success: true,
      found: true,
      count: rows.length,
      showing: sliced.length,
      rows: sliced,
      message: `Catálogo cargado: ${rows.length} ítems disponibles para cotizar.`,
    });
  } catch (error) {
    console.error("[OBTENER_PRECIOS_COTIZACION ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 3: Agendar Visita para Arriendo de Maquinaria
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tool: agendar_visita_arriendo
 * Books a visit appointment for machinery rental (Workflow 3).
 * Saves the appointment in the CRM and sends WhatsApp confirmation.
 */
async function handleAgendarVisitaArriendo(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  args: Record<string, unknown>
) {
  try {
    const effectiveTenantId = await resolveTenant(supabase, tenantId);
    const empresa = String(args.Nombre_empresa || args.nombre_empresa || args.empresa || args.cliente || "Empresa");
    const telefono = String(args.WhatsApp || args.whatsapp || args.telefono || args.celular || "");
    const fecha = String(args.fecha || args.date || args.dia || "");
    const hora = String(args.hora || args.time || args.horario || "") || undefined;
    const tipoMaquinaria = String(args.tipo_maquinaria || args.maquinaria || args.equipo || args.grua || "");
    const lugarVisita = String(args.lugar || args.direccion || args.address || args.ubicacion || "");
    const notas = String(args.notas || args.observaciones || args.detalles || "");

    console.log("[ULTRAVOX TOOL: agendar_visita_arriendo] Recibido:", {
      empresa,
      telefono,
      fecha,
      hora,
      tipoMaquinaria,
      lugarVisita,
    });

    if (!fecha) {
      return NextResponse.json({
        success: false,
        message: "Necesito la fecha para agendar la visita. ¿Qué día te viene mejor?",
      });
    }

    // 1. Create or update lead
    let activeLeadId = leadId;
    if (!activeLeadId) {
      const { data: newLead } = await (supabase as any)
        .from("lead")
        .insert({
          tenant_id: effectiveTenantId,
          nombre: empresa,
          telefono,
          tipo_lead: "arriendo_maquinaria",
          status: "visita_agendada",
          origen: "ultravox",
          metadata: {
            tool_name: "agendar_visita_arriendo",
            tipo_maquinaria: tipoMaquinaria,
            lugar_visita: lugarVisita,
            captured_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();
      activeLeadId = newLead?.id;
    } else {
      await (supabase as any)
        .from("lead")
        .update({
          tipo_lead: "arriendo_maquinaria",
          status: "visita_agendada",
          metadata: {
            tool_name: "agendar_visita_arriendo",
            tipo_maquinaria: tipoMaquinaria,
            lugar_visita: lugarVisita,
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", activeLeadId);
    }

    // 2. Book appointment via AppointmentService
    let appointmentId: string | undefined;
    let scheduledAtFormatted = fecha;
    try {
      const { AppointmentService } = await import("@/lib/services/appointment-service");
      const visitNotes = [
        tipoMaquinaria ? `Maquinaria: ${tipoMaquinaria}` : "",
        lugarVisita ? `Lugar: ${lugarVisita}` : "",
        notas,
      ]
        .filter(Boolean)
        .join(" | ");

      const appointment = await AppointmentService.bookAppointment(
        effectiveTenantId,
        activeLeadId ?? "",
        fecha,
        hora,
        visitNotes || `Visita de arriendo de maquinaria para ${empresa}`
      );
      appointmentId = appointment?.id as string | undefined;
      scheduledAtFormatted = appointment?.scheduled_at
        ? new Date(appointment.scheduled_at as string).toLocaleString("es-CL", {
          timeZone: "America/Santiago",
          dateStyle: "full",
          timeStyle: "short",
        })
        : fecha;
    } catch (apptErr) {
      console.error("[AGENDAR_VISITA] Error al agendar cita:", apptErr);
      // Continue without appointment, we still saved the lead
    }

    // 3. Send WhatsApp confirmation
    if (telefono) {
      try {
        // Load WhatsApp config from tenant settings
        const { data: tenantRow } = await (supabase as any)
          .from("tenants")
          .select("config")
          .eq("id", effectiveTenantId)
          .single();

        const waConfig = tenantRow?.config?.whatsapp;
        if (waConfig?.access_token && waConfig?.phone_number_id) {
          const { WhatsAppBridge } = await import("@/lib/integrations/whatsapp");
          const bridge = new WhatsAppBridge();
          await bridge.sendTextMessage(
            telefono,
            `✅ *Visita Agendada - LinkStation*\n\n` +
            `Hola ${empresa}, confirmamos tu visita técnica:\n\n` +
            `📅 *Fecha:* ${scheduledAtFormatted}\n` +
            (hora ? `🕐 *Hora:* ${hora}\n` : "") +
            (tipoMaquinaria ? `🏗️ *Maquinaria:* ${tipoMaquinaria}\n` : "") +
            (lugarVisita ? `📍 *Lugar:* ${lugarVisita}\n` : "") +
            `\nNuestro equipo comercial te contactará para confirmar los detalles. ¡Hasta pronto!`,
            {
              accessToken: waConfig.access_token,
              phoneNumberId: waConfig.phone_number_id,
              wabaId: waConfig.waba_id,
            }
          );
          console.log(`[AGENDAR_VISITA] ✅ Confirmación WhatsApp enviada a ${telefono}`);
        } else {
          console.warn("[AGENDAR_VISITA] WhatsApp config missing — skipping notification.");
        }
      } catch (waErr) {
        console.error("[AGENDAR_VISITA] Error enviando WhatsApp:", waErr);
      }
    }

    return NextResponse.json({
      success: true,
      lead_id: activeLeadId,
      appointment_id: appointmentId,
      scheduled_at: scheduledAtFormatted,
      message: `Perfecto ${empresa}, tu visita ha sido agendada para el ${scheduledAtFormatted}${hora ? ` a las ${hora}` : ""
        }. Recibirás confirmación en tu WhatsApp (${telefono}). ¿Hay algo más en lo que pueda ayudarte?`,
    });
  } catch (error) {
    console.error("[AGENDAR_VISITA_ARRIENDO ERROR]:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Universal dynamic argument finder for future-proof agent tools
 */
function findArgByKeywords(args: Record<string, any>, keywords: string[]): any {
  for (const kw of keywords) {
    if (args[kw] !== undefined && args[kw] !== null && String(args[kw]).trim() !== "") {
      return args[kw];
    }
  }
  const keys = Object.keys(args);
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    for (const kw of keywords) {
      if (lowerKey.includes(kw.toLowerCase())) {
        const val = args[key];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
    }
  }
  return undefined;
}

/**
 * Tool Handler: Enviar WhatsApp con link del grupo o info
 */
async function handleEnviarWhatsApp(
  supabase: SupabaseClient<Database>,
  tenantId: string | undefined,
  leadId: string | undefined,
  args: Record<string, any>,
  callId?: string
) {
  try {
    // 1. Universal fuzzy resolution: Works with ANY parameter name from ANY agent
    const telefono = findArgByKeywords(args, [
      "whatsapp_usuario",
      "telefono",
      "phone",
      "whatsapp",
      "celular",
      "movil",
      "numero",
      "lead_phone",
    ]);

    const email = findArgByKeywords(args, [
      "email_usuario",
      "email",
      "correo",
      "mail",
      "lead_email",
    ]);

    const nombre =
      findArgByKeywords(args, [
        "nombre_usuario",
        "nombre",
        "name",
        "cliente",
        "usuario",
        "lead_name",
      ]) || "Participante";

    const linkGrupo = findArgByKeywords(args, [
      "link_grupo",
      "group_link",
      "link",
      "url",
      "grupo",
      "enlace",
    ]);

    const motivacion = findArgByKeywords(args, [
      "motivacion_usuario",
      "motivacion",
      "interes",
      "notas",
      "objetivo",
      "consulta",
    ]);

    const customText = findArgByKeywords(args, ["mensaje", "message", "texto"]);
    const mensaje =
      customText ||
      (motivacion
        ? `¡Hola ${nombre}! Vimos que tu objetivo es: "${motivacion}". Te compartimos el enlace oficial del grupo:`
        : undefined);

    const templateName = findArgByKeywords(args, ["template", "template_name", "plantilla"]);

    let effectiveTenantId = tenantId;
    let effectiveLeadId = leadId;

    if (!effectiveTenantId || !effectiveLeadId) {
      if (effectiveLeadId) {
        const { data: lead } = await (supabase as any)
          .from("lead")
          .select("id, tenant_id, telefono, nombre")
          .eq("id", effectiveLeadId)
          .maybeSingle();
        if (lead) {
          effectiveTenantId = effectiveTenantId || lead.tenant_id;
        }
      } else if (telefono) {
        const cleanPhone = String(telefono).replace(/^\+/, "");
        const { data: lead } = await (supabase as any)
          .from("lead")
          .select("id, tenant_id, telefono, nombre")
          .or(`telefono.eq.+${cleanPhone},telefono.eq.${cleanPhone}`)
          .order("fecha_actualizacion", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lead) {
          effectiveLeadId = lead.id;
          effectiveTenantId = effectiveTenantId || lead.tenant_id;
        }
      }
    }

    if (!effectiveTenantId) {
      const { data: firstTenant } = await (supabase as any)
        .from("tenants")
        .select("id")
        .limit(1)
        .maybeSingle();
      effectiveTenantId = firstTenant?.id;
    }

    if (!effectiveTenantId) {
      return NextResponse.json(
        { error: "No se pudo determinar el tenant_id para enviar WhatsApp" },
        { status: 400 }
      );
    }

    const { WhatsAppPostCallService } = await import("@/lib/services/whatsapp-postcall-service");
    const result = await WhatsAppPostCallService.dispatch({
      supabase,
      tenantId: effectiveTenantId,
      leadId: effectiveLeadId,
      phone: telefono,
      recipientName: nombre,
      groupLink: linkGrupo,
      customMessage: mensaje,
      templateName,
      callId,
    });

    if (!result.success) {
      console.warn("[ULTRAVOX TOOL: enviar_whatsapp] Dispatch warning:", result.error);
      return NextResponse.json({
        success: false,
        warning: result.error,
        mensaje: "El mensaje no pudo ser entregado inmediatamente, pero los datos fueron guardados.",
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: `El enlace del grupo de WhatsApp ha sido enviado exitosamente al número ${result.dispatchedTo}.`,
      destinatario: result.dispatchedTo,
    });
  } catch (err) {
    console.error("[ULTRAVOX TOOL: enviar_whatsapp ERROR]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleToolExecution(req);
}

export async function GET(req: Request) {
  return handleToolExecution(req);
}



