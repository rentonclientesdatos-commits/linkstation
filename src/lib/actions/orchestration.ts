"use server";

import { Lead } from "@/types/database";

import { getActiveTenantConfig } from "./tenant";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { whatsappBridge, WhatsAppConfig, WhatsAppTemplate } from "../integrations/whatsapp";
import { orchestrator } from "@/lib/core/orchestrator";

/**
 * Fetches WhatsApp templates for the currently active tenant
 */
export async function getWhatsAppTemplates() {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant) throw new Error("No active tenant selected.");

    interface TenantConfigStructure {
      whatsapp?: {
        templates?: WhatsAppTemplate[];
        accessToken?: string;
        phoneNumberId?: string;
        wabaId?: string;
      };
    }

    const config = (tenant.config || {}) as TenantConfigStructure;

    // 1. Try to return cached templates first (for UI speed)
    if (
      config.whatsapp?.templates &&
      Array.isArray(config.whatsapp.templates) &&
      config.whatsapp.templates.length > 0
    ) {
      console.log(
        `[ACTIONS] Returning ${config.whatsapp.templates.length} cached WhatsApp templates.`
      );
      return { success: true, data: config.whatsapp.templates };
    }

    // 2. Fallback to whatsapp_templates table in database
    const { getAdminSupabaseClient } = await import("@/lib/supabase/server");
    const adminSupabase = await getAdminSupabaseClient();
    const { data: dbTemplates } = await adminSupabase
      .from("whatsapp_templates")
      .select("*")
      .eq("tenant_id", tenant.id);

    if (dbTemplates && dbTemplates.length > 0) {
      const mapped = dbTemplates.map((t) => ({
        id: t.meta_id || t.id,
        name: t.name,
        language: t.language || "es",
        status: t.status,
        category: t.category,
        components: t.components,
      }));
      return { success: true, data: mapped };
    }

    // 3. Fallback: resolve credentials from config or waba_configurations
    let waAccessToken = config.whatsapp?.accessToken;
    let waWabaId = config.whatsapp?.wabaId;
    let waPhoneNumberId = config.whatsapp?.phoneNumberId;

    if (!waAccessToken || !waWabaId || !waPhoneNumberId) {
      const { data: wabaRow } = await adminSupabase
        .from("waba_configurations")
        .select("access_token, waba_id, phone_number_id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (wabaRow) {
        waAccessToken = wabaRow.access_token;
        waWabaId = wabaRow.waba_id;
        waPhoneNumberId = wabaRow.phone_number_id;
      }
    }

    if (!waAccessToken || !waWabaId || !waPhoneNumberId) {
      return {
        error:
          "Configuración de WhatsApp incompleta. Por favor, ingresa tus credenciales en Ajustes → WhatsApp.",
      };
    }

    const waConfig: WhatsAppConfig = {
      accessToken: waAccessToken,
      phoneNumberId: waPhoneNumberId,
      wabaId: waWabaId,
    };

    const templates = await whatsappBridge.getAvailableTemplates(waConfig);
    return { success: true, data: templates };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[ACTIONS] Error fetching WhatsApp templates:", err.message);
    return { error: err.message };
  }
}

/**
 * Returns recent leads for the active tenant (for the playground)
 */
export async function getRecentLeads(limit = 20) {
  try {
    const supabase = await getSupabaseServerClient();
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { error: "No active tenant" };

    const { data, error } = await supabase
      .from("lead")
      .select("id, nombre, apellido, telefono, origen, fecha_creacion")
      .eq("tenant_id", tenant.id)
      .order("fecha_creacion", { ascending: false })
      .limit(limit);

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

/**
 * Returns all workflows for the active tenant
 */
export async function getTenantWorkflows() {
  try {
    const supabase = await getSupabaseServerClient();
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { error: "No active tenant" };

    const { data, error } = await supabase
      .from("workflows")
      .select("id, name, is_primary, is_active")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

/**
 * Gets the rules for a workflow (to preview the steps)
 */
export async function getWorkflowRules(workflowId: string) {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { error: "No active tenant" };

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("orchestration_rules")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("workflow_id", workflowId)
      .eq("is_active", true)
      .order("sequence_order", { ascending: true });

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

/**
 * Triggers the orchestrator for a specific lead + workflow
 */
export async function triggerOrchestratorForLead(leadId: string, workflowId: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { error: "No active tenant" };

    // Fetch lead with tenant validation
    const { data: lead, error: leadError } = await supabase
      .from("lead")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("id", leadId)
      .single();

    if (leadError || !lead) return { error: "Lead no encontrado: " + leadError?.message };

    const logs: string[] = [];
    const originalLog = console.log;

    // Capture logs
    console.log = (...args: unknown[]) => {
      const line = args.map(String).join(" ");
      if (line.includes("[ORCHESTRATOR]")) logs.push(line);
      originalLog(...args);
    };

    await orchestrator.executeWorkflow(workflowId, lead as unknown as Lead, tenant.id, {});

    console.log = originalLog;

    return { success: true, logs, leadId, workflowId };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}

/**
 * Fetches recent system logs for the active tenant
 */
export async function getSystemLogs(limit = 100) {
  try {
    const supabase = await getSupabaseServerClient();
    const tenant = await getActiveTenantConfig();
    if (!tenant) return { error: "No active tenant" };

    const { data, error } = await supabase
      .from("system_logs")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { error: error.message };
    return { success: true, data };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
}
