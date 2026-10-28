/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { ultravoxBridge, UltravoxConfig } from "@/lib/integrations/ultravox";
import { TelephonyFactory } from "@/lib/integrations/telephony/factory";
import { createLogger } from "@/lib/utils/logger";
import { normalizeWhatsAppNumber } from "@/lib/utils/phone-helper";

const log = createLogger("api.trigger-call");

/**
 * POST /api/trigger-call
 *
 * Ingestion point for Web Form leads and outbound AI call triggers.
 * Accepts:
 *   - nombre: string (optional)
 *   - telefono / phone: string (required)
 *   - email: string (optional)
 *   - tenant_id: string (optional, defaults to first active tenant)
 *   - agent_id: string (optional, defaults to tenant's configured agent)
 *   - group_link: string (optional, WhatsApp group link to share)
 *   - send_whatsapp: boolean (optional, default true)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const telefono = rawBody.telefono || rawBody.phone || rawBody.lead_phone;
    const nombre = rawBody.nombre || rawBody.name || rawBody.cliente || "Prospecto Web";
    const email = rawBody.email || rawBody.lead_email || null;
    let tenantId = rawBody.tenant_id;
    const groupLink = rawBody.group_link || rawBody.whatsapp_group_link || rawBody.link_grupo;
    const requestedAgentId = rawBody.agent_id || rawBody.agentId;
    const sendWhatsApp = rawBody.send_whatsapp !== false;

    if (!telefono) {
      return NextResponse.json(
        { success: false, error: "El campo 'telefono' o 'phone' es requerido." },
        { status: 400 }
      );
    }

    const supabase = await getAdminSupabaseClient();

    // 1. Resolve Tenant
    if (!tenantId) {
      const { data: firstTenant } = await (supabase as any)
        .from("tenants")
        .select("id")
        .limit(1)
        .maybeSingle();

      tenantId = firstTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "No se encontró ningún tenant configurado." },
        { status: 400 }
      );
    }

    // 2. Fetch Tenant Config
    const { data: tenant, error: tenantError } = await (supabase as any)
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ success: false, error: "Tenant no encontrado." }, { status: 404 });
    }

    const tenantConfig = (tenant.config || {}) as Record<string, any>;
    const ultravoxConfigData = (tenantConfig.ultravox || {}) as Record<string, any>;
    const apiKey =
      (typeof ultravoxConfigData.api_key === "string" ? ultravoxConfigData.api_key : "") ||
      (typeof ultravoxConfigData.apiKey === "string" ? ultravoxConfigData.apiKey : "") ||
      process.env.ULTRAVOX_API_KEY ||
      "";

    const targetAgentId =
      requestedAgentId ||
      ultravoxConfigData.agentId ||
      ultravoxConfigData.agent_id ||
      process.env.ULTRAVOX_AGENT_ID ||
      "";

    const normalizedPhone = normalizeWhatsAppNumber(telefono);

    // 3. Upsert Lead in Supabase
    const idLeadExterno = `web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { data: lead, error: leadError } = await (supabase as any)
      .from("lead")
      .upsert(
        {
          tenant_id: tenantId,
          nombre,
          telefono: normalizedPhone,
          email,
          origen: "Formulario Web",
          current_stage: "NUEVO",
          metadata: {
            source: "web_form_trigger",
            group_link: groupLink,
            send_whatsapp: sendWhatsApp,
            created_via: "/api/trigger-call",
          },
          fecha_actualizacion: new Date().toISOString(),
        },
        { onConflict: "tenant_id, telefono" }
      )
      .select()
      .single();

    if (leadError) {
      log.error("Error upserting lead", { error: leadError.message });
    }

    const effectiveLeadId = lead?.id || `temp_${Date.now()}`;

    // 4. Validate Ultravox Credentials
    if (!apiKey || !targetAgentId) {
      log.warn("Ultravox API Key or Agent ID missing. Lead was saved, but call cannot be placed.", {
        hasApiKey: !!apiKey,
        hasAgentId: !!targetAgentId,
      });

      return NextResponse.json({
        success: true,
        call_initiated: false,
        lead_id: effectiveLeadId,
        warning: "Lead guardado correctamente, pero Ultravox no está configurado (falta apiKey o agentId).",
      });
    }

    const ultravoxConfig: UltravoxConfig = { apiKey };

    // 5. Iniciar llamada en Ultravox inyectando contexto para tools y webhooks
    log.info("Creating Ultravox Agent Call", {
      agentId: targetAgentId,
      leadId: effectiveLeadId,
      phone: normalizedPhone,
    });

    const ultravoxRes = await ultravoxBridge.createAgentCall(
      targetAgentId,
      {
        templateContext: {
          lead_id: effectiveLeadId,
          tenant_id: tenantId,
          nombre,
          telefono: normalizedPhone,
          email,
          group_link: groupLink,
          send_whatsapp: sendWhatsApp,
          source: "trigger_call_endpoint",
        },
        medium: { twilio: {} },
        recordingEnabled: true,
      },
      ultravoxConfig
    );

    let telephonyTriggered = false;
    let telephonyError: string | null = null;

    // 6. Si se obtuvo join_url y hay proveedor de telefonía configurado, realizar la llamada saliente
    if (ultravoxRes?.join_url) {
      try {
        const fromNumber =
          tenantConfig?.telephony?.credentials?.fromNumber ||
          tenantConfig?.telephony?.fromNumber ||
          process.env.TELEPHONY_FROM_NUMBER;

        if (fromNumber) {
          const telephonyProvider = TelephonyFactory.getProvider(tenantConfig);
          const telResult = await telephonyProvider.triggerCall({
            to: normalizedPhone,
            from: fromNumber,
            joinUrl: ultravoxRes.join_url,
            recordingEnabled: true,
          });

          telephonyTriggered = telResult.success;
          if (!telResult.success) {
            telephonyError = telResult.errorMessage || "Error al disparar la llamada telefónica";
          }
        } else {
          log.info("No fromNumber configured; call created in Ultravox with join_url ready for WebRTC/SIP.");
        }
      } catch (telErr) {
        telephonyError = (telErr as Error).message;
        log.warn("Telephony trigger warning", { error: telephonyError });
      }
    }

    return NextResponse.json({
      success: true,
      call_initiated: true,
      telephony_triggered: telephonyTriggered,
      lead_id: effectiveLeadId,
      call_id: ultravoxRes?.call_id,
      join_url: ultravoxRes?.join_url,
      telephony_error: telephonyError,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Fatal error in /api/trigger-call", { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
