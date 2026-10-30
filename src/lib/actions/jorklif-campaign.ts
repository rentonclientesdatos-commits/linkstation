"use server";

import ExcelJS from "exceljs";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { createLogger } from "@/lib/utils/logger";
import {
  JorklifLeadRowSchema,
  type JorklifLeadRow,
  type JorklifImportResult,
  type JorklifImportError,
  type JorklifCampaignLeadItem,
} from "@/lib/schemas/jorklif-campaign";

const log = createLogger("jorklif-campaign");

/**
 * Normaliza encabezados flexibles de Excel/CSV a nombres canónicos.
 */
function normalizeHeader(raw: string): string {
  const clean = raw.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (["cliente", "cliente_nombre", "empresa", "razon_social", "nombre", "nombre_cliente"].some((k) => clean.includes(k))) {
    return "cliente_nombre";
  }
  if (["contacto", "contacto_nombre", "persona", "persona_contacto", "atencion"].some((k) => clean.includes(k))) {
    return "contacto_nombre";
  }
  if (["telefono", "celular", "movil", "fono", "phone", "whatsapp"].some((k) => clean.includes(k))) {
    return "telefono";
  }
  if (["tipo", "tipo_gestion", "gestion", "servicio"].some((k) => clean.includes(k))) {
    return "tipo_gestion";
  }
  if (["documento", "numero_documento", "factura", "cotizacion", "nro_doc", "n_doc", "doc"].some((k) => clean.includes(k))) {
    return "numero_documento";
  }
  if (["monto", "monto_total", "saldo", "total", "valor", "deuda"].some((k) => clean.includes(k))) {
    return "monto_total";
  }
  if (["mora", "dias_mora", "dias", "antiguedad", "dias_vencido"].some((k) => clean.includes(k))) {
    return "dias_mora";
  }
  if (["descripcion", "detalle", "items", "observacion", "observaciones", "servicio_detalle"].some((k) => clean.includes(k))) {
    return "descripcion";
  }
  if (["vendedor", "vendedor_responsable", "asesor", "ejecutivo", "responsable"].some((k) => clean.includes(k))) {
    return "vendedor_responsable";
  }
  if (["email", "correo", "mail"].some((k) => clean.includes(k))) {
    return "email";
  }

  return clean;
}

/**
 * Limpia y normaliza números de teléfono.
 */
function cleanPhoneNumber(raw: unknown): string {
  if (!raw) return "";
  let str = String(raw).trim();
  // Quita espacios, paréntesis y guiones
  str = str.replace(/[\s\(\)\-]/g, "");
  // Si no empieza con +, pero tiene formato internacional o estándar, se asegura formato
  if (!str.startsWith("+")) {
    // Si tiene 9 dígitos ej. Chile 9XXXXXXXX o Colombia 3XXXXXXXXX
    if (str.length === 9) {
      str = `+56${str}`; // default o sugerido
    } else if (str.length === 10 && str.startsWith("3")) {
      str = `+57${str}`;
    }
  }
  return str;
}

/**
 * Importa clientes de Jorklif desde un archivo Excel / CSV vía FormData.
 */
export async function importJorklifCampaignAction(formData: FormData): Promise<JorklifImportResult> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant) {
      return {
        success: false,
        totalRows: 0,
        inserted: 0,
        skipped: 0,
        errors: [],
        campaignName: "",
        error: "No se encontró el tenant activo. Por favor vuelve a iniciar sesión.",
      };
    }

    const file = formData.get("file") as File | null;
    const campaignName = (formData.get("campaignName") as string) || "Campaña Jorklif - Cartera y Cotizaciones";

    if (!file) {
      return {
        success: false,
        totalRows: 0,
        inserted: 0,
        skipped: 0,
        errors: [],
        campaignName,
        error: "No se proporcionó ningún archivo.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return {
        success: false,
        totalRows: 0,
        inserted: 0,
        skipped: 0,
        errors: [],
        campaignName,
        error: "El archivo Excel no contiene hojas de cálculo.",
      };
    }

    // 1. Mapear encabezados
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = normalizeHeader(String(cell.value ?? ""));
    });

    if (!headers.includes("cliente_nombre") || !headers.includes("telefono")) {
      return {
        success: false,
        totalRows: 0,
        inserted: 0,
        skipped: 0,
        errors: [],
        campaignName,
        error: 'El archivo debe contener al menos las columnas "cliente_nombre" (o Cliente/Empresa) y "telefono" (o Celular).',
      };
    }

    const errors: JorklifImportError[] = [];
    const validRows: JorklifLeadRow[] = [];

    // 2. Parsear filas
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar cabecera

      const raw: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = headers[colNumber - 1];
        if (key) {
          raw[key] = cell.value;
        }
      });

      // Normalizar montos y días
      let rawMonto = raw["monto_total"];
      if (typeof rawMonto === "string") {
        rawMonto = parseFloat(rawMonto.replace(/[^0-9.-]/g, "")) || 0;
      }

      let rawDias = raw["dias_mora"];
      if (typeof rawDias === "string") {
        rawDias = parseInt(rawDias.replace(/[^0-9]/g, ""), 10) || 0;
      }

      let tipoGestion = String(raw["tipo_gestion"] || "COBRANZA").toUpperCase();
      if (tipoGestion.includes("COTI")) tipoGestion = "COTIZACION";
      else if (tipoGestion.includes("SERVI") || tipoGestion.includes("TECNI")) tipoGestion = "SERVICIO_TECNICO";
      else if (tipoGestion.includes("ARRIEN") || tipoGestion.includes("GRUA")) tipoGestion = "ARRIENDO_GRUAS";
      else tipoGestion = "COBRANZA";

      const candidate = {
        cliente_nombre: String(raw["cliente_nombre"] ?? "").trim(),
        contacto_nombre: String(raw["contacto_nombre"] ?? "").trim(),
        telefono: cleanPhoneNumber(raw["telefono"]),
        tipo_gestion: tipoGestion as any,
        numero_documento: String(raw["numero_documento"] ?? "").trim(),
        monto_total: typeof rawMonto === "number" ? rawMonto : 0,
        dias_mora: typeof rawDias === "number" ? rawDias : 0,
        descripcion: String(raw["descripcion"] ?? "").trim(),
        vendedor_responsable: String(raw["vendedor_responsable"] ?? "").trim(),
        email: raw["email"] ? String(raw["email"]).trim() : "",
      };

      const parsed = JorklifLeadRowSchema.safeParse(candidate);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            row: rowNumber,
            field: issue.path.join("."),
            message: issue.message,
            value: candidate[issue.path[0] as keyof typeof candidate],
          });
        }
      } else {
        validRows.push(parsed.data);
      }
    });

    if (validRows.length === 0) {
      return {
        success: false,
        totalRows: sheet.rowCount - 1,
        inserted: 0,
        skipped: 0,
        errors,
        campaignName,
        error: "No se encontraron filas válidas en el archivo.",
      };
    }

    // 3. Guardar en Supabase (tabla `lead`)
    const supabase = await getSupabaseServerClient();
    let inserted = 0;

    for (const lead of validRows) {
      const metadata = {
        cliente_nombre: lead.cliente_nombre,
        contacto_nombre: lead.contacto_nombre,
        numero_documento: lead.numero_documento,
        monto_total: lead.monto_total,
        dias_mora: lead.dias_mora,
        descripcion: lead.descripcion,
        vendedor_responsable: lead.vendedor_responsable,
        tipo_gestion: lead.tipo_gestion,
        estado_llamada: "PENDIENTE",
      };

      const { error: insertError } = await (supabase.from("lead") as any).upsert(
        {
          tenant_id: tenant.id,
          nombre: lead.cliente_nombre,
          apellido: lead.contacto_nombre || null,
          telefono: lead.telefono,
          email: lead.email || null,
          origen: "jorklif_campaign",
          campana: campaignName,
          tipo_lead: lead.tipo_gestion.toLowerCase(),
          current_stage: "NUEVO",
          metadata,
          fecha_actualizacion: new Date().toISOString(),
        },
        { onConflict: "tenant_id,telefono" }
      );

      if (!insertError) {
        inserted++;
      } else {
        log.warn("Error inserting lead:", { error: insertError.message, phone: lead.telefono });
      }
    }

    return {
      success: true,
      totalRows: sheet.rowCount - 1,
      inserted,
      skipped: validRows.length - inserted,
      errors,
      campaignName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("Unhandled error in importJorklifCampaignAction:", { error: msg });
    return {
      success: false,
      totalRows: 0,
      inserted: 0,
      skipped: 0,
      errors: [],
      campaignName: "",
      error: `Error procesando importación: ${msg}`,
    };
  }
}

/**
 * Obtiene los leads cargados en la campaña Jorklif con sus métricas.
 */
export async function getJorklifCampaignDataAction(): Promise<{
  success: boolean;
  leads: JorklifCampaignLeadItem[];
  stats: {
    totalLeads: number;
    totalCarteraMonto: number;
    totalCotizacionesMonto: number;
    llamadasRealizadas: number;
    promesasPago: number;
    pendientes: number;
  };
  error?: string;
}> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant) {
      return {
        success: false,
        leads: [],
        stats: { totalLeads: 0, totalCarteraMonto: 0, totalCotizacionesMonto: 0, llamadasRealizadas: 0, promesasPago: 0, pendientes: 0 },
        error: "Tenant no encontrado",
      };
    }

    const supabase = await getSupabaseServerClient();
    const { data: rawLeads, error } = await (supabase.from("lead") as any)
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("origen", "jorklif_campaign")
      .order("fecha_actualizacion", { ascending: false });

    if (error) {
      return {
        success: false,
        leads: [],
        stats: { totalLeads: 0, totalCarteraMonto: 0, totalCotizacionesMonto: 0, llamadasRealizadas: 0, promesasPago: 0, pendientes: 0 },
        error: error.message,
      };
    }

    const leads: JorklifCampaignLeadItem[] = (rawLeads || []).map((l: any) => {
      const meta = l.metadata || {};
      return {
        id: l.id,
        tenant_id: l.tenant_id,
        cliente_nombre: meta.cliente_nombre || l.nombre || "Sin nombre",
        contacto_nombre: meta.contacto_nombre || l.apellido || "",
        telefono: l.telefono || "",
        email: l.email || undefined,
        tipo_gestion: (meta.tipo_gestion || l.tipo_lead?.toUpperCase() || "COBRANZA") as any,
        numero_documento: meta.numero_documento || "",
        monto_total: typeof meta.monto_total === "number" ? meta.monto_total : 0,
        dias_mora: typeof meta.dias_mora === "number" ? meta.dias_mora : 0,
        descripcion: meta.descripcion || "",
        vendedor_responsable: meta.vendedor_responsable || "",
        campana: l.campana || "Campaña Jorklif",
        current_stage: l.current_stage || "NUEVO",
        estado_llamada: meta.estado_llamada || "PENDIENTE",
        fecha_promesa_pago: meta.fecha_promesa_pago || undefined,
        duracion_segundos: meta.duracion_segundos || undefined,
        resumen_llamada: meta.resumen_llamada || undefined,
        grabacion_url: meta.grabacion_url || undefined,
        fecha_creacion: l.fecha_creacion || new Date().toISOString(),
        last_interaction_at: l.last_interaction_at || undefined,
      };
    });

    let totalCarteraMonto = 0;
    let totalCotizacionesMonto = 0;
    let llamadasRealizadas = 0;
    let promesasPago = 0;
    let pendientes = 0;

    for (const lead of leads) {
      if (lead.tipo_gestion === "COBRANZA") {
        totalCarteraMonto += lead.monto_total;
      } else if (lead.tipo_gestion === "COTIZACION") {
        totalCotizacionesMonto += lead.monto_total;
      }

      if (lead.estado_llamada === "COMPLETADA" || lead.estado_llamada === "PROMESA_PAGO") {
        llamadasRealizadas++;
      }
      if (lead.estado_llamada === "PROMESA_PAGO") {
        promesasPago++;
      }
      if (lead.estado_llamada === "PENDIENTE") {
        pendientes++;
      }
    }

    return {
      success: true,
      leads,
      stats: {
        totalLeads: leads.length,
        totalCarteraMonto,
        totalCotizacionesMonto,
        llamadasRealizadas,
        promesasPago,
        pendientes,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      leads: [],
      stats: { totalLeads: 0, totalCarteraMonto: 0, totalCotizacionesMonto: 0, llamadasRealizadas: 0, promesasPago: 0, pendientes: 0 },
      error: msg,
    };
  }
}

/**
 * Genera la plantilla oficial Excel de Jorklif descargable con datos de ejemplo.
 */
export async function downloadJorklifTemplateBase64(): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Clientes Jorklif");

  // Definir columnas
  sheet.columns = [
    { header: "cliente_nombre", key: "cliente_nombre", width: 30 },
    { header: "contacto_nombre", key: "contacto_nombre", width: 25 },
    { header: "telefono", key: "telefono", width: 18 },
    { header: "tipo_gestion", key: "tipo_gestion", width: 16 },
    { header: "numero_documento", key: "numero_documento", width: 18 },
    { header: "monto_total", key: "monto_total", width: 16 },
    { header: "dias_mora", key: "dias_mora", width: 12 },
    { header: "descripcion", key: "descripcion", width: 35 },
    { header: "vendedor_responsable", key: "vendedor_responsable", width: 22 },
    { header: "email", key: "email", width: 25 },
  ];

  // Estilo para cabecera
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate-800
    };
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 28;

  // Filas de ejemplo reales para Jorklif
  sheet.addRow({
    cliente_nombre: "Logística Andina SpA",
    contacto_nombre: "Mauricio Morales (Tesorería)",
    telefono: "+56987654321",
    tipo_gestion: "COBRANZA",
    numero_documento: "FAC-10492",
    monto_total: 2450000,
    dias_mora: 18,
    descripcion: "Mantención preventiva y repuestos grúa horquilla Toyota 3T",
    vendedor_responsable: "Carlos Ibáñez",
    email: "finanzas@logisticaandina.cl",
  });

  sheet.addRow({
    cliente_nombre: "Distribuidora del Pacífico Ltda.",
    contacto_nombre: "Andrea Rojas (Pagos)",
    telefono: "+56912345678",
    tipo_gestion: "COBRANZA",
    numero_documento: "FAC-10515",
    monto_total: 1890000,
    dias_mora: 32,
    descripcion: "Cambio de batería y rodillos montacargas eléctrico",
    vendedor_responsable: "Roberto Gómez",
    email: "cuentasporpagar@dispacifico.cl",
  });

  sheet.addRow({
    cliente_nombre: "Constructora Cordillera S.A.",
    contacto_nombre: "Juan Pablo Soto (Jefe de Operaciones)",
    telefono: "+56998761234",
    tipo_gestion: "COTIZACION",
    numero_documento: "COT-4810",
    monto_total: 4200000,
    dias_mora: 5,
    descripcion: "Arriendo grúa horquilla 5 toneladas por 3 meses con operador",
    vendedor_responsable: "Patricia Muñoz",
    email: "operaciones@cordillerasa.cl",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * Dispara una llamada outbound real de Jorklif via Ultravox + Conectabit SIP.
 *
 * Flujo:
 * 1. Carga el lead de Supabase.
 * 2. Resuelve la API Key de Ultravox (tenant config → env var).
 * 3. Construye el templateContext con las variables del lead (nombre, monto, documento, etc.)
 *    e incluye tenant_id + lead_id en systemMetadata para que el webhook pueda vincular la respuesta.
 * 4. Llama a Ultravox via createAgentCall usando medium.sip.outgoing (troncal Conectabit).
 * 5. Actualiza el estado del lead a "EN_LLAMADA" con el call_id retornado.
 *
 * Variables de entorno requeridas:
 *   ULTRAVOX_API_KEY                      — API Key de Ultravox
 *   ULTRAVOX_JORKLIF_COBRANZA_AGENT_ID    — ID del agente de cobranza en Ultravox
 *   CONECTABIT_SIP_DOMAIN                 — Servidor SIP de Conectabit (ej: sip.conectabit.com)
 *   CONECTABIT_SIP_USERNAME               — Usuario SIP de Conectabit
 *   CONECTABIT_SIP_PASSWORD               — Contraseña SIP de Conectabit
 *   JORKLIF_CALLER_ID                     — Número emisor (ej: +56229XXXXXX o +569XXXXXXXX)
 */
export async function triggerJorklifCallAction(leadId: string): Promise<{ success: boolean; message: string; callId?: string }> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant) {
      return { success: false, message: "No se encontró el tenant activo." };
    }

    const supabase = await getSupabaseServerClient();
    const { data: lead, error: fetchErr } = await (supabase.from("lead") as any)
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchErr || !lead) {
      return { success: false, message: "Lead no encontrado" };
    }

    const meta = lead.metadata || {};

    // ── 1. Resolver API Key de Ultravox ──────────────────────────────────────
    const tenantConfig = (tenant.config as any) || {};
    const ultravoxApiKey =
      tenantConfig?.ultravox?.api_key ||
      process.env.ULTRAVOX_API_KEY;

    if (!ultravoxApiKey) {
      return { success: false, message: "API Key de Ultravox no configurada. Agrega ULTRAVOX_API_KEY al entorno." };
    }

    // ── 2. Resolver Agent ID de cobranza ──────────────────────────────────────
    const agentId =
      tenantConfig?.ultravox?.jorklif_cobranza_agent_id ||
      tenantConfig?.ultravox?.agent_id ||
      process.env.ULTRAVOX_JORKLIF_COBRANZA_AGENT_ID ||
      process.env.ULTRAVOX_AGENT_ID;

    if (!agentId) {
      return {
        success: false,
        message: "Agent ID de Ultravox no configurado. Agrega ULTRAVOX_JORKLIF_COBRANZA_AGENT_ID (o configúralo en el tenant).",
      };
    }

    // ── 3. Resolver credenciales SIP de Conectabit ───────────────────────────
    const sipDomain =
      tenantConfig?.telephony?.sip?.domain ||
      process.env.CONECTABIT_SIP_DOMAIN;

    const rawSipUsername =
      tenantConfig?.telephony?.sip?.username ||
      process.env.CONECTABIT_SIP_USERNAME ||
      "";
    const sipUsername = String(rawSipUsername).trim();

    const rawSipPassword =
      tenantConfig?.telephony?.sip?.password ||
      process.env.CONECTABIT_SIP_PASSWORD ||
      "";
    const sipPassword = String(rawSipPassword).trim();

    console.log(`[JORKLIF_SIP] Credenciales → username: "${sipUsername}" | password length: ${sipPassword.length}`);

    const fromNumber =
      tenantConfig?.telephony?.fromNumber ||
      tenantConfig?.jorklif?.caller_id ||
      process.env.JORKLIF_CALLER_ID;

    if (!fromNumber) {
      return { success: false, message: "Número emisor no configurado. Agrega JORKLIF_CALLER_ID al entorno." };
    }

    if (!sipDomain) {
      return { success: false, message: "Dominio SIP de Conectabit no configurado. Agrega CONECTABIT_SIP_DOMAIN al entorno." };
    }

    const toNumber = lead.telefono;
    if (!toNumber) {
      return { success: false, message: "El lead no tiene número de teléfono." };
    }

    // ── 4. Construir templateContext con variables del lead ───────────────────
    const tipoGestion: string = (meta.tipo_gestion || lead.tipo_lead || "COBRANZA").toUpperCase();
    const isCobranza = tipoGestion === "COBRANZA";

    const templateContext: Record<string, unknown> = {
      // Variables universales
      nombre_cliente: meta.cliente_nombre || lead.nombre || "Cliente",
      contacto_nombre: meta.contacto_nombre || lead.apellido || "",
      telefono: toNumber,
      tipo_gestion: tipoGestion,
      numero_documento: meta.numero_documento || "",
      monto_total: meta.monto_total || 0,
      vendedor_responsable: meta.vendedor_responsable || "",
      descripcion: meta.descripcion || "",
      // Específicas de cobranza
      ...(isCobranza && {
        monto_pendiente: meta.monto_total || 0,
        dias_mora: meta.dias_mora || 0,
        fecha_vencimiento: meta.fecha_vencimiento || "",
        numero_factura: meta.numero_documento || "",
        datos_bancarios: tenantConfig?.jorklif?.datos_bancarios || "Consultar con administración",
      }),
    };

    // systemMetadata para que el webhook de Ultravox vincule lead y tenant
    const systemMetadata: Record<string, unknown> = {
      tenant_id: tenant.id,
      lead_id: leadId,
      tipo_gestion: tipoGestion,
      campana: lead.campana || "Campaña Jorklif",
    };

    // ── 5. Llamar a Ultravox ──────────────────────────────────────────────────
    log.info("Disparando llamada Ultravox para lead Jorklif", {
      leadId,
      agentId,
      toNumber,
      tipoGestion,
    });

    const { ultravoxBridge } = await import("@/lib/integrations/ultravox");

    const callResult = await ultravoxBridge.createAgentCall(
      agentId,
      {
        templateContext: {
          ...templateContext,
          ...systemMetadata,
        },
        medium: {
          sip: {
            outgoing: {
              // SIP URI destino: sip:+56912345678@sip.conectabit.com
              to: `sip:${toNumber}@${sipDomain}`,
              // Caller ID que verá el cliente (número oficial Jorklif)
              from: fromNumber,
              // Credenciales de autenticación de la troncal Conectabit
              ...(sipUsername ? { username: sipUsername } : {}),
              ...(sipPassword ? { password: sipPassword } : {}),
            },
          },
        },
        // El agente ESPERA a que el destinatario conteste y diga "Hola"
        // antes de hablar (estándar para llamadas salientes SIP)
        firstSpeakerSettings: { user: {} },
        maxDuration: "600s", // 10 minutos máximo
        recordingEnabled: true,
      },
      { apiKey: ultravoxApiKey }
    );

    // ── 6. Actualizar lead con el call_id y estado EN_LLAMADA ─────────────────
    const updatedMeta = {
      ...meta,
      estado_llamada: "EN_LLAMADA",
      ultravox_call_id: callResult.call_id,
      ultima_llamada_at: new Date().toISOString(),
    };

    await (supabase.from("lead") as any)
      .update({
        metadata: updatedMeta,
        last_interaction_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    log.info("Llamada Ultravox iniciada exitosamente", {
      leadId,
      callId: callResult.call_id,
    });

    return {
      success: true,
      message: `✅ Llamada iniciada para ${meta.cliente_nombre || lead.nombre} (${toNumber}). Call ID: ${callResult.call_id}`,
      callId: callResult.call_id,
    };
  } catch (e: any) {
    log.error("Error al disparar llamada Jorklif:", { error: e.message });
    return { success: false, message: e.message || "Error al disparar llamada" };
  }
}

/**
 * Lanza una campaña masiva de llamadas Jorklif para todos los leads PENDIENTES.
 * Respeta una cadencia de máximo 1 llamada simultánea con pausa entre disparos.
 */
export async function launchJorklifCampaignAction(params?: {
  tipoGestion?: "COBRANZA" | "COTIZACION" | "TODOS";
  delayBetweenCallsMs?: number;
}): Promise<{ success: boolean; total: number; dispatched: number; failed: number; message: string }> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant) {
      return { success: false, total: 0, dispatched: 0, failed: 0, message: "Tenant no encontrado." };
    }

    const supabase = await getSupabaseServerClient();
    let query = (supabase.from("lead") as any)
      .select("id, nombre, telefono, metadata")
      .eq("tenant_id", tenant.id)
      .eq("origen", "jorklif_campaign");

    const { data: leads, error } = await query;

    if (error) {
      return { success: false, total: 0, dispatched: 0, failed: 0, message: error.message };
    }

    const pending = (leads || []).filter((l: any) => {
      const estado = l.metadata?.estado_llamada || "PENDIENTE";
      const tipo = (l.metadata?.tipo_gestion || "COBRANZA").toUpperCase();
      const tipoOk =
        !params?.tipoGestion ||
        params.tipoGestion === "TODOS" ||
        tipo === params.tipoGestion;
      return estado === "PENDIENTE" && tipoOk;
    });

    const delayMs = params?.delayBetweenCallsMs ?? 3000; // 3s entre llamadas por defecto
    let dispatched = 0;
    let failed = 0;

    for (const lead of pending) {
      const result = await triggerJorklifCallAction(lead.id);
      if (result.success) {
        dispatched++;
      } else {
        failed++;
        log.warn("Error en llamada campaña masiva:", { leadId: lead.id, msg: result.message });
      }
      // Pausa entre llamadas para no saturar la troncal
      if (delayMs > 0 && pending.indexOf(lead) < pending.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return {
      success: true,
      total: pending.length,
      dispatched,
      failed,
      message: `Campaña lanzada: ${dispatched} llamadas iniciadas, ${failed} fallidas de ${pending.length} leads pendientes.`,
    };
  } catch (e: any) {
    log.error("Error en launchJorklifCampaignAction:", { error: e.message });
    return { success: false, total: 0, dispatched: 0, failed: 0, message: e.message || "Error al lanzar la campaña." };
  }
}
