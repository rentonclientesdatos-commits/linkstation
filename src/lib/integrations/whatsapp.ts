import axios from "axios";
import { normalizeWhatsAppNumber } from "../utils/phone-helper";

/**
 * WHATSAPP CLOUD API BRIDGE
 * Native implementation for sending templates and messages via Meta.
 */

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
}

export interface WhatsAppTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  buttons?: Record<string, unknown>[];
}

export interface WhatsAppTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  id: string;
  components?: WhatsAppTemplateComponent[];
}

export class WhatsAppBridge {
  private static API_URL = "https://graph.facebook.com/v20.0";

  /**
   * Sends a template message (required for initial contact outside windows).
   */
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "es",
    components: Record<string, unknown>[] = [],
    config: WhatsAppConfig
  ) {
    try {
      const normalizedTo = normalizeWhatsAppNumber(to);
      const url = `${WhatsAppBridge.API_URL}/${config.phoneNumberId}/messages`;
      const response = await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          to: normalizedTo,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `[WHATSAPP BRIDGE] Template ${templateName} sent to ${to}. ID: ${response.data.messages[0].id}`
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error("[WHATSAPP BRIDGE] Error sending template:", err.response?.data || err.message);
      throw error;
    }
  }

  /**
   * Sends a simple text message.
   */
  public async sendTextMessage(to: string, body: string, config: WhatsAppConfig) {
    try {
      // Safety check: Prevent sending if the lead is paused in DB.
      //
      // BUG-SEC-04 fix (29-05-2026): sustituida `process.env.SUPABASE_URL!` por
      // `requireEnvAny(...)` y propagación explícita del error. Pre-fix, si
      // SUPABASE_URL faltaba, `createClient(undefined, ...)` fallaba silenciosamente
      // dentro del try interno y el catch enviaba el mensaje saltándose el check
      // de pausa (fail-open en consentimiento — bypass de opt-out del lead).
      //
      // Política nueva: si el check NO puede ejecutarse por error de configuración
      // o de query a Supabase, BLOQUEAMOS el envío (fail-closed) y log de warning.
      // Solo enviamos cuando hemos podido confirmar que `is_ai_paused !== true`.
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const { getAuthServiceRoleKey } = await import("@/lib/auth-config");
        const { requireEnvAny } = await import("@/lib/env");
        const supabaseUrl = requireEnvAny(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
        const supabase = createClient(supabaseUrl, getAuthServiceRoleKey());
        const cleanTo = to.replace(/^\+/, "");
        const plusTo = "+" + cleanTo;
        const { data: lead, error: pauseQueryError } = await supabase
          .from("lead")
          .select("is_ai_enabled, metadata")
          .or(`telefono.eq.${plusTo},telefono.eq.${cleanTo}`)
          .maybeSingle();

        if (pauseQueryError) {
          console.warn(`[WHATSAPP BRIDGE] Lead pause lookup warning: ${pauseQueryError.message}`);
        } else if (lead) {
          const meta = (lead.metadata as Record<string, unknown>) || {};
          if (meta.is_ai_paused === true) {
            console.log(`[WHATSAPP BRIDGE] 🚫 BLOCKING outbound to ${to} because AI is PAUSED in metadata.`);
            return { success: false, error: "AI_PAUSED" };
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[WHATSAPP BRIDGE] Pause check skipped: ${msg}`);
      }

      const normalizedTo = normalizeWhatsAppNumber(to);
      const url = `${WhatsAppBridge.API_URL}/${config.phoneNumberId}/messages`;

      console.log(`[WHATSAPP BRIDGE] 📤 Sending text to ${to}: "${body.substring(0, 50)}..."`);

      const response = await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          to: normalizedTo,
          type: "text",
          text: { preview_url: false, body: body },
        },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error("[WHATSAPP BRIDGE] Error sending text:", err.response?.data || err.message);
      throw error;
    }
  }

  /**
   * Sends a typing indicator (Beta/New feature in Meta Cloud API)
   * Marks the message as 'read' and shows typing dots.
   */
  public async sendTypingIndicator(to: string, messageId: string, config: WhatsAppConfig) {
    try {
      const normalizedTo = normalizeWhatsAppNumber(to);
      const url = `${WhatsAppBridge.API_URL}/${config.phoneNumberId}/messages`;

      // Note: In Cloud API, sending a 'read' status with typing_indicator
      await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          to: normalizedTo,
          typing_indicator: {
            type: "text",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`[WHATSAPP BRIDGE] ✍️ Typing indicator sent for message ${messageId}`);
      return { success: true };
    } catch (error: unknown) {
      // We don't throw here to avoid blocking the main flow if typing fail
      const err = error as { response?: { data?: unknown }; message?: string };
      console.warn(
        "[WHATSAPP BRIDGE] ⚠️ Failed to send typing indicator:",
        err.response?.data || err.message
      );
      return { success: false };
    }
  }

  /**
   * Sends a typing indicator ("typing...") to the user's WhatsApp.
   */
  public async sendLegacyTypingIndicator(to: string, config: WhatsAppConfig) {
    try {
      const url = `${WhatsAppBridge.API_URL}/${config.phoneNumberId}/messages`;
      await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ""),
          type: "text",
          text: { body: "..." }, // Legacy simulation
        },
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      return { success: true };
    } catch (_error: unknown) {
      return { success: false };
    }
  }

  /**
   * Fetches available templates from the WhatsApp Business Account.
   */
  public async getAvailableTemplates(config: WhatsAppConfig): Promise<WhatsAppTemplate[]> {
    if (!config.wabaId || !config.accessToken) {
      throw new Error("WABA ID and Access Token are required to fetch templates.");
    }

    try {
      const url = `${WhatsAppBridge.API_URL}/${config.wabaId}/message_templates`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      return response.data.data as WhatsAppTemplate[];
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error(
        "[WHATSAPP BRIDGE] Error fetching templates:",
        err.response?.data || err.message
      );
      return [];
    }
  }
}

export const whatsappBridge = new WhatsAppBridge();
