/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { getActiveTenantConfig } from "./tenant";
import { whatsappBridge, WhatsAppConfig } from "../integrations/whatsapp";
import type { Database, Lead } from "@/types/database";

type LeadRow = Database["public"]["Tables"]["lead"]["Row"];

export interface ChatMessage {
  id: string;
  tenant_id: string;
  lead_id: string;
  direction: "INBOUND" | "OUTBOUND";
  message_type: "TEXT" | "TEMPLATE" | "SYSTEM_LOG" | "IMAGE" | "DOCUMENT";
  content: string;
  sent_by: string | null;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface InboxLead {
  id: string;
  id_lead_externo?: string | null;
  tenant_id: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  email?: string | null;
  foto_url: string | null;
  is_ai_enabled: boolean;
  last_message?: string;
  last_message_time?: string | null;
  unread_count?: number;
  ai_agent_id?: string | null;
  // Fields for detailed view
  tipo_lead?: string | null;
  pais?: string | null;
  origen?: string | null;
  campana?: string | null;
  segmentacion?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function updateLeadSegment(
  leadId: string,
  segment: InboxLead["segmentacion"]
): Promise<{ success: boolean; error?: string }> {
  // Sprint 0 tarea 1-21: IDOR fix — antes cualquier user podía editar leads
  // de OTROS tenants por ID. Ahora filtra siempre por tenant_id activo.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("lead")
    .update({ segmentacion: segment } as never)
    .eq("id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

interface ChatSummaryRow {
  lead_id: string;
  summary: string;
  last_interaction_at: string | null;
}

/**
 * Gets the list of ALL leads for the current tenant, attaching their most recent message if it exists.
 * Upgraded to show leads even if they don't have conversation history yet.
 */
export async function getInboxLeads(
  tenantIdOverride?: string
): Promise<{ success: boolean; data?: InboxLead[]; error?: string }> {
  try {
    const tenant = tenantIdOverride ? { id: tenantIdOverride } : await getActiveTenantConfig();
    if (!tenant) return { success: true, data: [] }; // No tenant, no leads. Return empty instead of error to avoid UI hang.

    const supabase = await getAdminSupabaseClient();

    // 1. Fetch leads for this tenant (ordered by recent activity)
    const { data: leads, error: leadError } = await supabase
      .from("lead")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("fecha_actualizacion", { ascending: false })
      .order("fecha_creacion", { ascending: false })
      .limit(100);

    if (leadError) throw leadError;
    const leadList = (leads as LeadRow[]) || [];
    if (leadList.length === 0) return { success: true, data: [] };

    const leadIds = leadList.map((l) => l.id);

    // 2. Fetch the most recent message for each of these leads (Legacy)
    const { data: messages, error: msgError } = await supabase
      .from("chat_messages")
      .select("lead_id, content, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    if (msgError) throw msgError;

    // 2b. Fetch Consolidated Summaries (New Strategy)
    const { data: summaries } = await supabase
      .from("chat_summaries")
      .select("lead_id, summary, last_interaction_at")
      .in("lead_id", leadIds);

    // 3. Map latest messages to their leads
    const latestMsgByLead = new Map<string, { content: string; time: string }>();

    // 3a. Start with summaries as a base (good for bulk)
    (summaries || []).forEach((s: unknown) => {
      const summaryRow = s as unknown as ChatSummaryRow;
      const summaryStr = summaryRow.summary;
      if (!summaryStr) return;

      const lines = summaryStr.split("\n").filter((line: string) => line.trim());
      if (lines.length === 0) return;

      const lastLine = lines[lines.length - 1];
      const match = lastLine?.match(/^\[(.*?)\] (.*?): (.*)$/);

      const leadId = summaryRow.lead_id;
      if (match && leadId) {
        const [, , , content] = match;
        latestMsgByLead.set(leadId, {
          content: content,
          time: summaryRow.last_interaction_at || new Date(0).toISOString(),
        });
      }
    });

    // 3b. OVERRIDE with real messages if they are newer
    const msgList = (messages || []) as unknown as Array<{
      lead_id: string;
      content: string;
      created_at: string;
    }>;
    msgList.forEach((m) => {
      if (m.lead_id) {
        const existing = latestMsgByLead.get(m.lead_id);
        if (!existing || new Date(m.created_at) > new Date(existing.time)) {
          latestMsgByLead.set(m.lead_id, { content: m.content, time: m.created_at });
        }
      }
    });

    // 4. Transform into InboxLead objects
    const results: InboxLead[] = leadList.map((l: LeadRow) => {
      const msg = latestMsgByLead.get(l.id);

      // Normalize phone for UI (always show +)
      let phone = l.telefono || null;
      if (phone && !phone.startsWith("+")) {
        phone = "+" + phone;
      }

      return {
        id: l.id,
        tenant_id: l.tenant_id,
        nombre: l.nombre || null,
        apellido: l.apellido || null,
        telefono: phone,
        foto_url: (l as any).photo_url || (l as any).foto_url || null,
        is_ai_enabled: l.is_ai_enabled ?? true,
        ai_agent_id: (l as any).metadata?.ai_agent_id || (l as any).ai_agent_id || null,
        last_message: msg?.content || "Nueva conversación (sin mensajes)",
        last_message_time: msg?.time || l.fecha_actualizacion || l.fecha_creacion || null,
        created_at: l.fecha_creacion || null,
        tipo_lead: l.tipo_lead || "SIN CALIFICAR",
        pais: l.pais || "Identificando...",
        origen: l.origen || "Manual / CRM",
        campana: l.campana || "General",
        segmentacion:
          (l as LeadRow & { segmentacion?: InboxLead["segmentacion"] }).segmentacion || null,
        metadata: (l as unknown as Lead).metadata || {},
        unread_count: 0,
      };
    });

    // 5. Final Sort: By message time (or creation time if new) descending
    results.sort(
      (a, b) =>
        new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
    );

    return { success: true, data: results };
  } catch (e: unknown) {
    const error = e as Error;
    console.error("[INBOX_LEADS] Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Loads the full chat history for a specific lead.
 */
export async function getChatHistory(
  leadId: string,
  tenantIdOverride?: string
): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
  const tenant = tenantIdOverride ? { id: tenantIdOverride } : await getActiveTenantConfig();
  const supabase = await getAdminSupabaseClient();

  let messages: ChatMessage[] = [];

  // 1. Fetch REAL messages directly from DB (Priority for accuracy)
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true }) // Order for UI
    .limit(200);

  if (tenant?.id) {
    query = query.eq("tenant_id", tenant.id);
  }

  const { data: realMsgs, error: msgError } = await query;

  if (msgError) return { success: false, error: msgError.message };
  messages = (realMsgs as ChatMessage[]) || [];

  // 2. If NO messages found, check for a summary as a fallback
  if (messages.length === 0) {
    const { ChatSummaryService } = await import("@/lib/services/knowledge-base");
    const summary = await ChatSummaryService.getSummary(leadId);

    if (summary) {
      const lines = summary.split("\n").filter((l) => l.trim());
      messages = lines
        .map((line, idx) => {
          const match = line.match(/^\[(.*?)\] (.*?): (.*)$/);
          if (match) {
            const [, time, role, content] = match;
            return {
              id: `sum-${leadId}-${idx}`,
              tenant_id: tenant?.id || "",
              lead_id: leadId,
              direction: role === "Usuario" ? "INBOUND" : "OUTBOUND",
              message_type: "TEXT",
              content: content,
              sent_by: role === "Usuario" ? null : "AI_AGENT",
              status: "READ",
              created_at: new Date().toISOString(),
              metadata: { time_label: time },
            } as ChatMessage;
          }
          return null;
        })
        .filter((m) => m !== null) as ChatMessage[];
    }
  }

  // Fetch Calls to show in timeline
  const { data: calls } = await supabase
    .from("llamadas")
    .select("id, estado_llamada, fecha_inicio, duracion_segundos")
    .eq("id_lead", leadId)
    .order("fecha_inicio", { ascending: false });

  // Combine and sort
  const chronological: ChatMessage[] = ((messages as ChatMessage[]) || []).map((m) => ({ ...m }));

  interface CallTimelineItem {
    id: string;
    estado_llamada: string | null;
    fecha_inicio: string | null;
    duracion_segundos: number | null;
  }

  if (calls && calls.length > 0) {
    (calls as unknown as CallTimelineItem[]).forEach((call) => {
      chronological.push({
        id: `call-${call.id}`,
        tenant_id: tenant?.id || "",
        lead_id: leadId,
        direction: "OUTBOUND",
        message_type: "SYSTEM_LOG",
        content: `Llamada ${call.estado_llamada === "completed" ? "Realizada" : "Intento"}: ${call.duracion_segundos ? Math.floor(call.duracion_segundos / 60) + "m " + (call.duracion_segundos % 60) + "s" : "Sin respuesta"}`,
        sent_by: "Voice AI Agent",
        status: "READ",
        created_at: call.fecha_inicio || new Date().toISOString(),
        metadata: { call_id: call.id },
      });
    });
  }

  // Sort all by date
  chronological.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return { success: true, data: chronological };
}

/**
 * Sends a manual text message or a predefined template to a lead.
 * This function handles real WhatsApp delivery and AI handover.
 */
export async function sendManualMessage(
  leadId: string,
  content: string,
  type: "TEXT" | "TEMPLATE" = "TEXT",
  languageCode: string = "es",
   
  templateComponents?: any[],
  fullMappedText?: string
): Promise<{ success: boolean; data?: ChatMessage; error?: string }> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();

  // 1. Fetch Lead data (for phone and name)
  // Sprint 0 tarea 1-21: IDOR fix — filtro tenant_id obligatorio.
  const { data: leadRaw, error: leadError } = await supabase
    .from("lead")
    .select("telefono, nombre, is_ai_enabled")
    .eq("id", leadId)
    .eq("tenant_id", tenant.id)
    .single();

  if (leadError || !leadRaw) return { success: false, error: "Lead no encontrado" };
   
  const lead = leadRaw as any;

  // 2. Resolve WhatsApp Config
   
  const conf = tenant.config as any;
  const waConfig: WhatsAppConfig = {
    accessToken: conf?.whatsapp?.accessToken,
    phoneNumberId: conf?.whatsapp?.phoneNumberId,
    wabaId: conf?.whatsapp?.wabaId,
  };

  // 3. Real WhatsApp Send (only if credentials exist)
  if (waConfig.accessToken && waConfig.phoneNumberId) {
    try {
      if (type === "TEXT") {
        await whatsappBridge.sendTextMessage(lead.telefono || "", content, waConfig);
      } else {
        // If templateComponents is provided from frontend, use it.
        // Otherwise, try to auto-resolve {{1}} to name as fallback.
        const finalComponents =
          templateComponents ||
          (lead.nombre
            ? [
                {
                  type: "body",
                  parameters: [{ type: "text", text: lead.nombre }],
                },
              ]
            : []);

        await whatsappBridge.sendTemplateMessage(
          lead.telefono || "",
          content,
          languageCode,
          finalComponents,
          waConfig
        );
      }
    } catch (waError) {
      const err = waError as { message: string; response?: { data: Record<string, unknown> } };
      const errorMsg = err.response?.data?.error
        ? (err.response.data.error as { message: string }).message
        : err.message;
      console.error("[INBOX] WhatsApp Send Error:", errorMsg);

      // Log to system_logs for the user to see
       
      await supabase.from("system_logs").insert({
        tenant_id: tenant.id,
        event_type: "WHATSAPP_SEND_ERROR",
        message: `Error enviando ${type}: ${errorMsg}`,
        metadata: { leadId, error: err.response?.data || err.message },
      });

      return { success: false, error: `Error de Meta: ${errorMsg}` };
    }
  } else {
    console.warn("[INBOX] No WhatsApp credentials - Persisting as MOCK message locally.");
  }

  // 4. HANDOVER: Disable AI for this lead since a human intervened
  // Sprint 0 tarea 1-21: filtro tenant_id obligatorio.
  if (lead.is_ai_enabled) {
    await supabase
      .from("lead")
      .update({ is_ai_enabled: false } as never)
      .eq("id", leadId)
      .eq("tenant_id", tenant.id);
  }

  // 5. Persist message in DB
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      tenant_id: tenant.id,
      lead_id: leadId,
      direction: "OUTBOUND",
      message_type: type,
      content: fullMappedText || content,
      sent_by: "Asesor Humano",
      status: "SENT",
    } as never)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, data: data as ChatMessage };
}

/**
 * Injects a mockup message (Use only for demonstration/development).
 */
export async function injectMockupMessage(
  leadId: string,
  direction: "INBOUND" | "OUTBOUND",
  content: string,
  sentBy?: string,
  messageType: "TEXT" | "TEMPLATE" | "SYSTEM_LOG" = "TEXT"
) {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return;

  const supabase = await getAdminSupabaseClient();

  // Sprint 0 tarea 1-21: IDOR fix — verifica que el lead pertenece al tenant
  // activo antes de inyectar un mock message.
  const { data: leadOwner } = await supabase
    .from("lead")
    .select("tenant_id")
    .eq("id", leadId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!leadOwner) return;
  await supabase.from("chat_messages").insert({
    tenant_id: tenant.id,
    lead_id: leadId,
    direction,
    message_type: messageType,
    content,
    sent_by: sentBy,
    status: "DELIVERED",
  } as never);
}

/**
 * Toggles the AI agent status for a specific lead.
 */
export async function toggleLeadAI(
  leadId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  // Sprint 0 tarea 1-21: IDOR fix — filtro tenant_id obligatorio.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();
  const { error } = await (
    supabase
      .from("lead")
       
      .update({ is_ai_enabled: enabled } as never) as any
  )
    .eq("id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) {
    if (error.message.includes("column")) {
      console.error("[INBOX] Cannot toggle AI: column 'is_ai_enabled' missing in DB.");
      return {
        success: false,
        error:
          "La base de datos aún no tiene habilitada la función de pausa. Por favor, ejecuta la migración SQL.",
      };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Assigns a specific agent to a lead.
 */
export async function assignAgentToLead(leadId: string, agentId: string | null) {
  // Sprint 0 tarea 1-21: IDOR fix — filtro tenant_id obligatorio.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();
  const { error } = await (
    supabase
       
      .from("lead" as any) as any
  )
    .update({ ai_agent_id: agentId } as never)
    .eq("id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) {
    if (error.message.includes("column")) {
      return {
        success: false,
        error: "Columna 'ai_agent_id' no encontrada. Por favor, ejecuta la migración SQL.",
      };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Deletes a lead and all associated data (cascading).
 */
export async function deleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  // Sprint 0 tarea 1-21: IDOR fix — solo borra si el lead pertenece al tenant activo.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();

  // 1. Delete associated chat messages first (manual cascading if not in DB)
   
  await supabase.from("chat_messages").delete().eq("lead_id", leadId).eq("tenant_id", tenant.id);

  // 2. Delete the lead
   
  const { error } = await supabase
    .from("lead")
    .delete()
    .eq("id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Clears the chat history for a specific lead without deleting the lead itself.
 */
export async function deleteChatHistory(
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  // Sprint 0 tarea 1-21: IDOR fix.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();
   
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("lead_id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Clears the agent memory (facts/captured variables) for a specific lead.
 */
export async function deleteLeadFacts(
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  // Sprint 0 tarea 1-21: IDOR fix.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const supabase = await getAdminSupabaseClient();
   
  const { error } = await supabase
    .from("lead")
    .update({ metadata: {} } as never)
    .eq("id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Updates a lead's basic info.
 */
export async function updateLeadInfo(
  leadId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Sprint 0 tarea 1-21: IDOR fix. Además, no permitimos que el caller
  // sobrescriba `tenant_id` en el payload de updates.
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  const { tenant_id: _ignoredTenantId, ...safeUpdates } = updates;

  const supabase = await getAdminSupabaseClient();
  const { error } = await (
    supabase
       
      .from("lead" as any) as any
  )
    .update(safeUpdates)
    .eq("id", leadId)
    .eq("tenant_id", tenant.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Gets the tracked_variables configured in the active variant of a given agent.
 * If agentId is null, returns variables from the first active variant of the tenant.
 */
export async function getAgentTrackedVariables(
  agentId: string | null
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  const supabase = await getAdminSupabaseClient();
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  try {
     
    let query = supabase
      .from("ai_agent_variants")
      .select("tracked_variables")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (agentId) {
      query = query.eq("agent_id", agentId);
    } else {
      // Fallback: find any agent for this tenant
       
      const { data: agents } = await supabase
        .from("ai_agents")
        .select("id")
        .eq("tenant_id", tenant.id);
      const ids = (agents || []).map((a: { id: string }) => a.id);
      if (ids.length === 0) return { success: true, data: [] };
      query = query.in("agent_id", ids);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) return { success: false, error: error.message };

    const vars = (data?.tracked_variables as string[]) || [];
    return { success: true, data: vars };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Gets all unique tracked_variables across all active variants for the tenant.
 */
export async function getAllTrackedVariables(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  const supabase = await getAdminSupabaseClient();
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant" };

  try {
    // 1. Get all agents for tenant
    const { data: agents } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("tenant_id", tenant.id);
    const ids = (agents || []).map((a: { id: string }) => a.id);
    if (ids.length === 0) return { success: true, data: [] };

    // 2. Get tracked_variables from all active variants of these agents
    const { data: variants } = await supabase
      .from("ai_agent_variants")
      .select("tracked_variables")
      .in("agent_id", ids)
      .eq("is_active", true);

    const allVars = new Set<string>();
    (variants || []).forEach((v: any) => {
      if (v.tracked_variables && Array.isArray(v.tracked_variables)) {
        v.tracked_variables.forEach((tv: string) => allVars.add(tv));
      }
    });

    return { success: true, data: Array.from(allVars) };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}
