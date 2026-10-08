/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/tenant/instagram-config?tenantId=xxx
 * Retrieves the Instagram configuration for a tenant.
 *
 * POST /api/tenant/instagram-config
 * Saves (upserts) the Instagram configuration.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
  }

  try {
    const supabase = await getAdminSupabaseClient();

    // Try instagram_configurations table first
    const { data: igConfig } = await (supabase.from("instagram_configurations") as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();

    if (igConfig) {
      return NextResponse.json({
        config: {
          pageAccessToken: igConfig.page_access_token || "",
          igAccountId: igConfig.ig_account_id || "",
          pageId: igConfig.page_id || "",
          webhookVerifyToken: igConfig.webhook_verify_token || "linkstation_ig_webhook_2026",
          aiEnabled: igConfig.ai_enabled ?? true,
          leadAdsEnabled: igConfig.lead_ads_enabled ?? true,
          connectedAt: igConfig.created_at,
        },
      });
    }

    // Fallback: read from tenant config JSON
    const { data: tenant } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    const igTenantConfig = (tenant?.config as any)?.instagram;
    if (igTenantConfig) {
      return NextResponse.json({ config: igTenantConfig });
    }

    return NextResponse.json({ config: null });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, config } = await req.json();

    if (!tenantId || !config) {
      return NextResponse.json({ error: "Missing tenantId or config" }, { status: 400 });
    }

    const supabase = await getAdminSupabaseClient();

    // Try upsert into instagram_configurations (if table exists)
    try {
      const upsertPayload = {
        tenant_id: tenantId,
        page_access_token: config.pageAccessToken,
        ig_account_id: config.igAccountId,
        page_id: config.pageId || null,
        webhook_verify_token: config.webhookVerifyToken || "linkstation_ig_webhook_2026",
        ai_enabled: config.aiEnabled ?? true,
        lead_ads_enabled: config.leadAdsEnabled ?? true,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await (supabase.from("instagram_configurations") as any)
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existing?.id) {
        await (supabase.from("instagram_configurations") as any)
          .update(upsertPayload)
          .eq("id", existing.id);
      } else {
        await (supabase.from("instagram_configurations") as any).insert({
          ...upsertPayload,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Table doesn't exist yet — fallback to tenant config JSON
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const existingConfig = (tenant?.config as Record<string, unknown>) || {};
      await supabase
        .from("tenants")
        .update({
          config: {
            ...existingConfig,
            instagram: {
              pageAccessToken: config.pageAccessToken,
              igAccountId: config.igAccountId,
              pageId: config.pageId,
              webhookVerifyToken: config.webhookVerifyToken,
              aiEnabled: config.aiEnabled,
              leadAdsEnabled: config.leadAdsEnabled,
              connectedAt: new Date().toISOString(),
            },
          },
        } as never)
        .eq("id", tenantId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
