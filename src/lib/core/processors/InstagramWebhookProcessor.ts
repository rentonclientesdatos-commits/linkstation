/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * src/lib/core/processors/InstagramWebhookProcessor.ts
 *
 * Instagram Webhook Processor
 * Handles two event types:
 *   1. Instagram DM (Messenger API for Instagram) — routes to InstagramAIProcessor
 *   2. Instagram Lead Ads — extracts lead data and saves to `lead` table
 */

import { createClient } from "@supabase/supabase-js";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { instagramClient } from "@/lib/integrations/instagram/client";
import type {
  InstagramMessaging,
  InstagramLeadWebhookEntry,
} from "@/lib/integrations/instagram/types";

// ─── Admin Supabase ────────────────────────────────────────────────────────────

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  return createClient(url, getAuthServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Tenant Resolution by IG Account ID ───────────────────────────────────────

async function findTenantByIgAccountId(igAccountId: string) {
  const supabase = getAdminSupabase();

  // Look in instagram_configurations table first
  const { data: igConfig } = await supabase
    .from("instagram_configurations" as any)
    .select("tenant_id, page_access_token, ig_account_id, page_id, ai_enabled")
    .eq("ig_account_id", igAccountId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (igConfig) return igConfig;

  // Fallback: scan tenant configs for instagram.igAccountId
  const { data: tenants } = await supabase.from("tenants").select("id, config");

  if (tenants) {
    for (const t of tenants) {
      const cfg = (t.config as any)?.instagram;
      if (cfg?.igAccountId === igAccountId || cfg?.ig_account_id === igAccountId) {
        return {
          tenant_id: t.id,
          page_access_token: cfg.pageAccessToken || cfg.page_access_token,
          ig_account_id: igAccountId,
          page_id: cfg.pageId || cfg.page_id,
          ai_enabled: cfg.aiEnabled ?? true,
        };
      }
    }
  }

  return null;
}

// ─── Find Tenant by Page ID (for Lead Ads) ────────────────────────────────────

async function findTenantByPageId(pageId: string) {
  const supabase = getAdminSupabase();

  const { data: igConfig } = await supabase
    .from("instagram_configurations" as any)
    .select("tenant_id, page_access_token, ig_account_id, page_id, lead_ads_enabled")
    .eq("page_id", pageId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (igConfig) return igConfig;

  // Fallback: scan tenant configs
  const { data: tenants } = await supabase.from("tenants").select("id, config");
  if (tenants) {
    for (const t of tenants) {
      const cfg = (t.config as any)?.instagram;
      const cPageId = cfg?.pageId || cfg?.page_id;
      if (cPageId === pageId) {
        return {
          tenant_id: t.id,
          page_access_token: cfg.pageAccessToken || cfg.page_access_token,
          ig_account_id: cfg.igAccountId || cfg.ig_account_id,
          page_id: pageId,
          lead_ads_enabled: cfg.leadAdsEnabled ?? true,
        };
      }
    }
  }

  return null;
}

// ─── Upsert Instagram Lead (or find existing) ─────────────────────────────────

async function upsertInstagramLead(
  tenantId: string,
  igsid: string,
  displayName: string | null,
  source: "instagram_dm" | "instagram_lead_ad"
): Promise<string | null> {
  const supabase = getAdminSupabase();

  // Check for existing lead by instagram_igsid in metadata
  const { data: existing } = await supabase
    .from("lead")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("canal_origen", "instagram")
    .contains("metadata", { instagram_igsid: igsid })
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create new lead
  const { data: newLead, error } = await (supabase.from("lead") as any)
    .insert({
      tenant_id: tenantId,
      nombre: displayName || `Instagram User (${igsid.slice(-6)})`,
      canal_origen: "instagram",
      tipo_lead: "NUEVO",
      estado: "ACTIVO",
      metadata: {
        instagram_igsid: igsid,
        source,
        connected_at: new Date().toISOString(),
      },
      fecha_actualizacion: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[IG WEBHOOK] Error creating lead:", error);
    return null;
  }

  return newLead?.id || null;
}

// ─── Save Incoming DM to chat_messages ────────────────────────────────────────

async function saveIncomingDM(tenantId: string, leadId: string, text: string, messageId: string) {
  const supabase = getAdminSupabase();

  await (supabase.from("chat_messages") as any).insert({
    tenant_id: tenantId,
    lead_id: leadId,
    direction: "INBOUND",
    message_type: "TEXT",
    content: text,
    sent_by: "LEAD",
    status: "RECEIVED",
    metadata: {
      channel: "instagram",
      meta_message_id: messageId,
    },
  });
}

// ─── Process Instagram DM ─────────────────────────────────────────────────────

export async function processIncomingInstagramDM(
  igAccountId: string,
  messaging: InstagramMessaging
): Promise<void> {
  const senderIgsid = messaging.sender.id;
  const message = messaging.message;

  // Skip echo messages (messages sent by the page itself)
  if (message?.is_echo) return;
  // Skip read/delivery receipts
  if (!message?.text && !message?.attachments) return;

  const text = message?.text || "[Adjunto recibido]";
  const messageId = message?.mid || "";

  console.log(`[IG WEBHOOK] 📥 DM from ${senderIgsid}: "${text}"`);

  // 1. Find tenant by IG account ID
  const tenantConfig = await findTenantByIgAccountId(igAccountId);
  if (!tenantConfig) {
    console.warn(`[IG WEBHOOK] No tenant found for ig_account_id: ${igAccountId}`);
    return;
  }

  const {
    tenant_id: tenantId,
    page_access_token: pageAccessToken,
    ai_enabled: aiEnabled,
  } = tenantConfig;

  // 2. Get user profile for display name
  const profile = await instagramClient.getUserProfile(senderIgsid, {
    pageAccessToken,
    igAccountId,
  });
  const displayName = profile?.name || profile?.username || null;

  // 3. Upsert lead
  const leadId = await upsertInstagramLead(tenantId, senderIgsid, displayName, "instagram_dm");
  if (!leadId) return;

  // 4. Save incoming message
  await saveIncomingDM(tenantId, leadId, text, messageId);

  // 5. Mark as seen + typing indicator
  await instagramClient.markSeen(senderIgsid, { pageAccessToken, igAccountId });

  // 6. Trigger AI response if enabled
  if (aiEnabled !== false) {
    const { generateAIInstagramResponse } = await import("./InstagramAIProcessor");
    generateAIInstagramResponse(
      tenantId,
      leadId,
      senderIgsid,
      text,
      pageAccessToken,
      igAccountId
    ).catch((err) => console.error("[IG WEBHOOK] AI processor error:", err));
  }
}

// ─── Process Instagram Lead Ad ────────────────────────────────────────────────

export async function processInstagramLeadAd(entry: InstagramLeadWebhookEntry): Promise<void> {
  const supabase = getAdminSupabase();

  for (const change of entry.changes) {
    if (change.field !== "leadgen") continue;

    const { leadgen_id, page_id, form_id, ad_name, campaign_name } = change.value;
    console.log(`[IG WEBHOOK] 📋 Lead Ad received: ${leadgen_id} (page: ${page_id})`);

    // 1. Find tenant by page ID
    const tenantConfig = await findTenantByPageId(page_id);
    if (!tenantConfig) {
      console.warn(`[IG WEBHOOK] No tenant found for page_id: ${page_id}`);
      continue;
    }

    const { tenant_id: tenantId, page_access_token: pageAccessToken } = tenantConfig;

    // 2. Fetch full lead data from Meta API
    let leadData;
    try {
      leadData = await instagramClient.getLeadAdData(leadgen_id, pageAccessToken);
    } catch (err) {
      console.error("[IG WEBHOOK] Failed to retrieve lead ad data:", err);
      continue;
    }

    // 3. Parse field_data into key-value
    const fields: Record<string, string> = {};
    for (const field of leadData.field_data || []) {
      fields[field.name] = field.values?.[0] || "";
    }

    const nombre = fields.full_name || fields.name || fields.nombre || "Lead Instagram";
    const email = fields.email || fields.correo || "";
    const telefono = fields.phone_number || fields.phone || fields.telefono || "";

    // 4. Upsert lead in DB
    const { data: existing } = await supabase
      .from("lead")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("canal_origen", "instagram_lead_ad")
      .contains("metadata", { leadgen_id })
      .maybeSingle();

    if (existing?.id) {
      console.log(`[IG WEBHOOK] Lead ad already processed: ${leadgen_id}`);
      continue;
    }

    const { data: newLead, error } = await (supabase.from("lead") as any)
      .insert({
        tenant_id: tenantId,
        nombre,
        email: email || null,
        telefono: telefono || null,
        canal_origen: "instagram_lead_ad",
        tipo_lead: "NUEVO",
        estado: "ACTIVO",
        metadata: {
          leadgen_id,
          form_id,
          ad_name: ad_name || null,
          campaign_name: campaign_name || null,
          raw_fields: fields,
          source: "instagram_lead_ad",
          captured_at: new Date().toISOString(),
        },
        fecha_actualizacion: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[IG WEBHOOK] Error saving lead ad:", error);
      continue;
    }

    console.log(`[IG WEBHOOK] ✅ Lead Ad saved: ${newLead?.id} — ${nombre}`);

    // 5. Log the event
    await (supabase.from("system_logs") as any)
      .insert({
        tenant_id: tenantId,
        level: "INFO",
        message: `Nuevo lead de Instagram Lead Ad: ${nombre}`,
        metadata: { leadId: newLead?.id, leadgen_id, form_id, fields },
      })
      .catch(() => {});
  }
}
