/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { whatsappBridge, WhatsAppConfig } from "../integrations/whatsapp";
import { normalizeWhatsAppNumber } from "../utils/phone-helper";
import { createLogger } from "../utils/logger";

const log = createLogger("service.whatsapp-postcall");

export interface PostCallWhatsAppOptions {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  leadId?: string;
  phone?: string;
  recipientName?: string;
  groupLink?: string;
  customMessage?: string;
  templateName?: string;
  templateParams?: string[];
  callId?: string;
}

export interface PostCallWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  dispatchedTo?: string;
}

export class WhatsAppPostCallService {
  /**
   * Resolves WhatsApp credentials for tenant with multi-level fallbacks.
   */
  public static async resolveWhatsAppConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<WhatsAppConfig | null> {
    try {
      // 1. Check canonical waba_configurations table
      const { data: wabaRow } = await (supabase as any)
        .from("waba_configurations")
        .select("access_token, phone_number_id, waba_id, is_active")
        .eq("tenant_id", tenantId)
        .order("is_active", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (wabaRow && wabaRow.access_token && wabaRow.phone_number_id) {
        return {
          accessToken: wabaRow.access_token,
          phoneNumberId: wabaRow.phone_number_id,
          wabaId: wabaRow.waba_id,
        };
      }

      // 2. Check tenants.config JSON
      const { data: tenant } = await (supabase as any)
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const conf = (tenant?.config as any)?.whatsapp;
      if (conf?.accessToken && conf?.phoneNumberId) {
        return {
          accessToken: conf.accessToken,
          phoneNumberId: conf.phoneNumberId,
          wabaId: conf.wabaId,
        };
      }

      // 3. Fallback to environment variables
      const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (envToken && envPhoneId) {
        return {
          accessToken: envToken,
          phoneNumberId: envPhoneId,
          wabaId: process.env.WHATSAPP_WABA_ID,
        };
      }

      return null;
    } catch (err) {
      log.error("Error resolving WhatsApp config", { error: (err as Error).message });
      return null;
    }
  }

  /**
   * Dispatches WhatsApp message with group link or custom info after/during an Ultravox call.
   */
  public static async dispatch({
    supabase,
    tenantId,
    leadId,
    phone,
    recipientName,
    groupLink,
    customMessage,
    templateName,
    templateParams,
    callId,
  }: PostCallWhatsAppOptions): Promise<PostCallWhatsAppResult> {
    try {
      log.info("Starting WhatsApp post-call dispatch", { tenantId, leadId, phone });

      // 1. Resolve WhatsApp credentials
      const waConfig = await this.resolveWhatsAppConfig(supabase, tenantId);
      if (!waConfig) {
        const errorMsg = "WhatsApp credentials not configured for this tenant or environment";
        log.warn(errorMsg, { tenantId });
        return { success: false, error: errorMsg };
      }

      // 2. Resolve Lead & Phone Number if missing
      let targetPhone = phone;
      let targetName = recipientName;
      let existingLead: any = null;

      if ((!targetPhone || !targetName) && leadId) {
        const { data: leadData } = await (supabase as any)
          .from("lead")
          .select("id, nombre, telefono, metadata")
          .eq("id", leadId)
          .single();

        if (leadData) {
          existingLead = leadData;
          targetPhone = targetPhone || leadData.telefono;
          targetName = targetName || leadData.nombre;
        }
      }

      if (!targetPhone) {
        const errorMsg = "No phone number available to dispatch WhatsApp message";
        log.warn(errorMsg, { leadId });
        return { success: false, error: errorMsg };
      }

      // 3. Resolve Target Group Link
      let effectiveGroupLink = groupLink;
      if (!effectiveGroupLink && existingLead?.metadata) {
        effectiveGroupLink =
          existingLead.metadata.group_link ||
          existingLead.metadata.whatsapp_group_link ||
          existingLead.metadata.link_grupo;
      }

      if (!effectiveGroupLink) {
        // Check tenant config for default group link
        const { data: tenant } = await (supabase as any)
          .from("tenants")
          .select("config")
          .eq("id", tenantId)
          .single();

        effectiveGroupLink =
          (tenant?.config as any)?.whatsapp?.default_group_link ||
          process.env.WHATSAPP_DEFAULT_GROUP_LINK ||
          "";
      }

      const clientName = targetName || "Estimado(a)";
      const normalizedPhone = normalizeWhatsAppNumber(targetPhone);

      // 4. Resolve Template vs Text Message Strategy
      // Meta rule: Outbound to a user without active 24h window requires an approved template.
      const configuredTemplate =
        templateName ||
        process.env.WHATSAPP_POSTCALL_TEMPLATE ||
        "";

      let dispatchSuccess = false;
      let sentContent = "";
      let messageId: string | undefined;

      if (configuredTemplate) {
        try {
          const components = [
            {
              type: "body",
              parameters: (templateParams && templateParams.length > 0)
                ? templateParams.map((p) => ({ type: "text", text: p }))
                : [
                    { type: "text", text: clientName },
                    { type: "text", text: effectiveGroupLink || "https://linkstation.ai" },
                  ],
            },
          ];

          log.info("Attempting to send WhatsApp template", {
            phone: normalizedPhone,
            template: configuredTemplate,
          });

          const templateRes = await whatsappBridge.sendTemplateMessage(
            normalizedPhone,
            configuredTemplate,
            "es",
            components,
            waConfig
          );

          dispatchSuccess = true;
          messageId = templateRes?.messages?.[0]?.id;
          sentContent = `[Plantilla: ${configuredTemplate}] Hola ${clientName}, aquí tienes tu link: ${effectiveGroupLink}`;
        } catch (templateErr) {
          log.warn("Template dispatch failed, attempting fallback to text message", {
            error: (templateErr as Error).message,
          });
        }
      }

      // Fallback or Direct Text Message
      if (!dispatchSuccess) {
        const defaultText = customMessage || (
          effectiveGroupLink
            ? `¡Hola ${clientName}! 👋\n\nGracias por comunicarte con nosotros. Aquí tienes el enlace directo para unirte a nuestro grupo:\n\n🔗 ${effectiveGroupLink}\n\n¡Te esperamos dentro!`
            : `¡Hola ${clientName}! 👋\n\nGracias por la llamada. Si necesitas información adicional o deseas consultar algo más, puedes responder directamente a este mensaje.`
        );

        const textRes = await whatsappBridge.sendTextMessage(normalizedPhone, defaultText, waConfig);
        dispatchSuccess = true;
        messageId = textRes?.messages?.[0]?.id;
        sentContent = defaultText;
      }

      // 5. Register in chat_messages for Inbox & Metrics
      if (dispatchSuccess) {
        await (supabase as any).from("chat_messages").insert({
          tenant_id: tenantId,
          lead_id: leadId || null,
          direction: "OUTBOUND",
          message_type: "WHATSAPP",
          content: sentContent,
          sent_by: "Ultravox AI Assistant",
          status: "DELIVERED",
          metadata: {
            phone: normalizedPhone,
            group_link: effectiveGroupLink,
            call_id: callId,
            message_id: messageId,
            dispatched_at: new Date().toISOString(),
          },
        });

        // 6. Update lead metadata if leadId exists
        if (leadId) {
          const currentMeta = existingLead?.metadata || {};
          await (supabase as any)
            .from("lead")
            .update({
              metadata: {
                ...currentMeta,
                whatsapp_group_link_sent: true,
                whatsapp_group_link: effectiveGroupLink,
                whatsapp_sent_at: new Date().toISOString(),
              },
            })
            .eq("id", leadId);
        }

        log.info("WhatsApp post-call successfully dispatched", {
          leadId,
          phone: normalizedPhone,
          messageId,
        });

        return {
          success: true,
          messageId,
          dispatchedTo: normalizedPhone,
        };
      }

      return {
        success: false,
        error: "Failed to dispatch WhatsApp message",
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error("Fatal error in WhatsApp post-call dispatch", { error: msg });
      return { success: false, error: msg };
    }
  }
}
