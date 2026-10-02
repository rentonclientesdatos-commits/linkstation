"use server";

/**
 * SPRINT 5.7 — WhatsApp Server Actions
 * src/lib/actions/whatsapp.ts
 *
 * Server actions for WABA management:
 *  - syncWhatsAppTemplatesToDB: Fetch from Meta API → upsert to DB
 *  - getWhatsAppTemplates: Read templates from DB for UI / FlowBuilder
 *  - updateVariableMapping: Save admin-configured param → lead field mapping
 *  - logWhatsAppMessage: Write a log entry manually (e.g. from cron/processor)
 *  - getWhatsAppLogs: Retrieve delivery logs for admin UI
 *  - addToOptOutList / removeFromOptOutList: Manage opt-out blacklist
 *  - getWABAConfig: Read WABA credentials for a tenant
 *  - saveWABAConfig: Save / update WABA credentials
 *  - processOutboxForTenant: Trigger outbox processing (for cron route)
 */

import { createClient } from "@supabase/supabase-js";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { requireEnvAny } from "@/lib/env";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { metaWhatsAppClient } from "@/lib/integrations/whatsapp/client";
import type { WABAConfig, WhatsAppDBTemplate } from "@/lib/integrations/whatsapp/client";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = requireEnvAny(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  return createClient(url, getAuthServiceRoleKey());
}

async function resolveConfig(): Promise<{
  tenantId: string;
  wabaConfig: WABAConfig;
} | null> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return null;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("waba_configurations")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    tenantId: tenant.id,
    wabaConfig: {
      accessToken: data.access_token,
      phoneNumberId: data.phone_number_id,
      wabaId: data.waba_id,
    },
  };
}

// ---------------------------------------------------------------------------
// WABA Config Management
// ---------------------------------------------------------------------------

export async function getWABAConfig(): Promise<{
  success: boolean;
  data?: {
    id: string;
    wabaId: string;
    phoneNumberId: string;
    displayName: string | null;
    isActive: boolean;
    webhookVerifyToken: string | null;
  };
  error?: string;
}> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("waba_configurations")
    .select("id, waba_id, phone_number_id, display_name, is_active, webhook_verify_token")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No WABA configuration found" };

  return {
    success: true,
    data: {
      id: data.id,
      wabaId: data.waba_id,
      phoneNumberId: data.phone_number_id,
      displayName: data.display_name,
      isActive: data.is_active,
      webhookVerifyToken: data.webhook_verify_token,
    },
  };
}

export async function saveWABAConfig(params: {
  wabaId: string;
  phoneNumberId: string;
  accessToken?: string;
  displayName?: string;
  webhookVerifyToken?: string;
}): Promise<{ success: boolean; error?: string }> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };

  const supabase = getServiceClient();

  let finalAccessToken = params.accessToken;

  // Si no se envía accessToken, recuperamos el actual para no sobrescribirlo con null
  if (!finalAccessToken) {
    const { data: existing } = await supabase
      .from("waba_configurations")
      .select("access_token")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (existing?.access_token) {
      finalAccessToken = existing.access_token;
    } else {
      return {
        success: false,
        error: "El Access Token es obligatorio para una nueva configuración.",
      };
    }
  }

  const { error } = await supabase.from("waba_configurations").upsert(
    {
      tenant_id: tenant.id,
      waba_id: params.wabaId,
      phone_number_id: params.phoneNumberId,
      access_token: finalAccessToken,
      display_name: params.displayName ?? null,
      webhook_verify_token: params.webhookVerifyToken ?? null,
      is_active: true,
    },
    { onConflict: "tenant_id" }
  );

  if (error) return { success: false, error: error.message };

  // Sincronizar también en tenant.config.whatsapp
  try {
    const currentConfig = (tenant.config as Record<string, unknown>) || {};
    const existingWhatsApp = (currentConfig.whatsapp as Record<string, unknown>) || {};
    await supabase
      .from("tenants")
      .update({
        config: {
          ...currentConfig,
          whatsapp: {
            ...existingWhatsApp,
            accessToken: finalAccessToken,
            phoneNumberId: params.phoneNumberId,
            wabaId: params.wabaId,
          },
        },
      })
      .eq("id", tenant.id);
  } catch (syncErr) {
    console.warn("[saveWABAConfig] Warning updating tenant.config:", syncErr);
  }

  revalidatePath("/dashboard/settings/whatsapp");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Template Sync
// ---------------------------------------------------------------------------

export async function syncWhatsAppTemplatesToDB(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const cfg = await resolveConfig();
  if (!cfg) {
    return {
      success: false,
      error: "WABA configuration not found. Please configure credentials first.",
    };
  }

  const result = await metaWhatsAppClient.syncTemplates(cfg.tenantId, cfg.wabaConfig);

  if (result.success) {
    try {
      const supabase = getServiceClient();
      const { data: dbTemplates } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("tenant_id", cfg.tenantId);

      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", cfg.tenantId)
        .maybeSingle();

      const currentConfig = (tenantRow?.config as Record<string, unknown>) || {};
      const existingWhatsApp = (currentConfig.whatsapp as Record<string, unknown>) || {};

      await supabase
        .from("tenants")
        .update({
          config: {
            ...currentConfig,
            whatsapp: {
              ...existingWhatsApp,
              accessToken: cfg.wabaConfig.accessToken,
              phoneNumberId: cfg.wabaConfig.phoneNumberId,
              wabaId: cfg.wabaConfig.wabaId,
              templates: (dbTemplates || []).map((t) => ({
                id: t.meta_id || t.id,
                name: t.name,
                language: t.language || "es",
                status: t.status,
                category: t.category,
                components: t.components,
              })),
              lastSync: new Date().toISOString(),
            },
          },
        })
        .eq("id", cfg.tenantId);
    } catch (syncErr) {
      console.warn("[syncWhatsAppTemplatesToDB] Warning updating tenant.config:", syncErr);
    }

    revalidatePath("/dashboard/settings/whatsapp");
  }

  return result;
}

// ---------------------------------------------------------------------------
// Template Read
// ---------------------------------------------------------------------------

export async function getWhatsAppTemplates(
  statusFilter?: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED"
): Promise<{ success: boolean; data?: WhatsAppDBTemplate[]; error?: string }> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };

  return metaWhatsAppClient.getTemplatesFromDB(tenant.id, statusFilter);
}

// ---------------------------------------------------------------------------
// Variable Mapping Update
// ---------------------------------------------------------------------------

export async function updateVariableMapping(
  templateId: string,
  variableMapping: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("whatsapp_templates")
    .update({ variable_mapping: variableMapping })
    .eq("id", templateId)
    .eq("tenant_id", tenant.id); // double-check tenant ownership

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/settings/whatsapp");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Message Logs
// ---------------------------------------------------------------------------

export async function getWhatsAppLogs(params?: {
  leadId?: string;
  status?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    id: string;
    phone_to: string;
    status: string;
    template_id: string | null;
    message_sid: string | null;
    error_message: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    failed_at: string | null;
    created_at: string;
  }[];
  error?: string;
}> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };

  const supabase = getServiceClient();
  let query = supabase
    .from("whatsapp_message_logs")
    .select(
      "id, phone_to, status, template_id, message_sid, error_message, sent_at, delivered_at, read_at, failed_at, created_at"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 50);

  if (params?.leadId) query = query.eq("lead_id", params.leadId);
  if (params?.status) query = query.eq("status", params.status);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { success: true, data: data as any[] };
}

// ---------------------------------------------------------------------------
// Opt-Out Management
// ---------------------------------------------------------------------------

export async function addToOptOutList(
  phone: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };
  return metaWhatsAppClient.addToOptOut(tenant.id, phone, reason);
}

export async function removeFromOptOutList(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };
  return metaWhatsAppClient.removeFromOptOut(tenant.id, phone);
}

export async function getOptOutList(): Promise<{
  success: boolean;
  data?: { id: string; phone: string; reason: string | null; opted_out_at: string }[];
  error?: string;
}> {
  const tenant = await getActiveTenantConfig();
  if (!tenant) return { success: false, error: "No tenant found" };

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("whatsapp_opt_out")
    .select("id, phone, reason, opted_out_at")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("opted_out_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { success: true, data: data as any[] };
}

// ---------------------------------------------------------------------------
// Outbox Processing (for cron route)
// ---------------------------------------------------------------------------

export async function processOutboxForTenant(batchSize?: number): Promise<{
  success: boolean;
  processed?: number;
  failed?: number;
  error?: string;
}> {
  const cfg = await resolveConfig();
  if (!cfg) {
    return { success: false, error: "WABA configuration not found" };
  }

  const result = await metaWhatsAppClient.processOutbox(
    cfg.tenantId,
    cfg.wabaConfig,
    batchSize ?? 5
  );

  return { success: true, ...result };
}
