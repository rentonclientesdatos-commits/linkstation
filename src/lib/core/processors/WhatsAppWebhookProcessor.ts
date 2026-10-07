import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { uploadToMinio } from "@/lib/integrations/minio";
import axios from "axios";
import { getLeadLocationData } from "@/lib/core/compliance";
import { normalizeWhatsAppNumber, ensurePlusPrefix } from "@/lib/utils/phone-helper";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { resolveLeadCountry } from "@/lib/integrations/sheets/phone-country";

/**
 * WHATSAPP WEBHOOK PROCESSOR
 * Handles the logic of identifying leads, logging messages, and triggering AI responses.
 */

interface WebhookMessage {
  id: string;
  type: string;
  from: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: {
    button_reply?: { title: string };
    list_reply?: { title: string };
  };
  image?: { id: string };
  audio?: { id: string };
  document?: { id: string };
  [key: string]: unknown;
}

export async function processIncomingWhatsApp(
  fromNumber: string,
  message: WebhookMessage,
  wabaId: string,
  contactName?: string | null
) {
  console.log(
    `[WHATSAPP PROCESSOR] Processing message from ${fromNumber} (WABA ID: ${wabaId}, Name: ${contactName})`
  );

  try {
    const supabase = getAdminSupabase();

    // 0. Deduplication check (Skip if we already processed this Meta ID)
    if (message.id) {
      const { data: existing } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("message_type", "TEXT")
        .filter("metadata->meta_id", "eq", `"${message.id}"`)
        .maybeSingle();

      if (existing) {
        console.log(`[WHATSAPP PROCESSOR] ⏭️ Skipping duplicate Meta ID: ${message.id}`);
        return;
      }
    }

    // 1. Identify Tenant by WABA ID (phone_number_id)
    // Strategy: first check waba_configurations (canonical), then fallback to tenants.config JSON
    let tenantId: string | null = null;

    // 1a. Check waba_configurations table first (most reliable source of truth)
    const { data: wabaConfigs } = await supabase
      .from("waba_configurations")
      .select("tenant_id")
      .eq("phone_number_id", wabaId)
      .eq("is_active", true)
      .limit(1);

    if (wabaConfigs && wabaConfigs.length > 0) {
      tenantId = wabaConfigs[0].tenant_id;
      console.log(`[WHATSAPP PROCESSOR] Tenant found via waba_configurations: ${tenantId}`);
    } else {
      // 1b. Fallback: search in tenants.config JSON (legacy support)
      const { data: tenants, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .filter("config->whatsapp->>phoneNumberId", "eq", wabaId);

      if (!tenantError && tenants && tenants.length > 0) {
        tenantId = tenants[0].id;
        console.log(`[WHATSAPP PROCESSOR] Tenant found via tenants.config (legacy): ${tenantId}`);
      }
    }

    if (!tenantId) {
      console.warn(`[WHATSAPP PROCESSOR] No tenant found for phone_number_id: ${wabaId}`);
      try {
        const { data: anyTenant } = await supabase.from("tenants").select("id").limit(1).maybeSingle();
        if (anyTenant?.id) {
          await supabase.from("system_logs").insert({
            tenant_id: anyTenant.id,
            level: "WARNING",
            message: `WHATSAPP_WEBHOOK: No tenant found for phone_number_id: ${wabaId}. Verify waba_configurations has this phone_number_id with is_active=true.`,
            metadata: { wabaId, fromNumber },
          });
        }
      } catch { /* ignore logging errors */ }
      return;
    }


    // 2. Normalize Phone Number
    const searchPhone = normalizeWhatsAppNumber(fromNumber);

    // 3. Find or Create Lead
    // Try multiple phone formats to prevent duplicate lead creation
    const phoneVariants = [
      searchPhone,
      searchPhone.startsWith("+") ? searchPhone.slice(1) : `+${searchPhone}`,
    ];

    let leadFound = null;
    let leadError = null;

    for (const phoneVariant of phoneVariants) {
      const { data, error } = await supabase
        .from("lead")
        .select("*")
        .eq("tenant_id", tenantId)
        .ilike("telefono", `%${phoneVariant}%`)
        .maybeSingle();

      if (!error && data) {
        leadFound = data;
        break;
      }
      if (error) leadError = error;
    }

    let lead = leadFound;

    if (leadError || !lead) {
      console.log(
        `[WHATSAPP PROCESSOR] Lead not found for ${fromNumber}. Creating lead: ${contactName || "Anonymous"}`
      );

      const fullName = contactName || "Prospecto WhatsApp";
      const parts = fullName.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || (contactName ? "" : "WhatsApp");

      const location = getLeadLocationData(fromNumber);

      const { data: defaultAgent } = await supabase
        .from("ai_agents")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=128`;

      const payload = {
        tenant_id: tenantId,
        telefono: ensurePlusPrefix(fromNumber),
        nombre: firstName,
        apellido: lastName,
        photo_url: avatarUrl,
        origen: "WHATSAPP_INBOUND",
        is_ai_enabled: true,
        metadata: {
          ai_agent_id: defaultAgent?.id || null,
        },
        pais: resolveLeadCountry(
          (location as { countryName?: string })?.countryName || "",
          ensurePlusPrefix(fromNumber)
        ),
        fecha_ingreso_crm: new Date().toISOString(),
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      };

      const response = await supabase
        .from("lead")
        .insert(payload as never)
        .select()
        .single();

      const newLead = response.data as unknown as Database["public"]["Tables"]["lead"]["Row"];
      const createError = response.error;

      if (createError) throw createError;
      lead = newLead;
    } else {
      const updates: Record<string, unknown> = {
        fecha_actualizacion: new Date().toISOString(),
      };

      if (!(lead as any).photo_url && !(lead as any).foto_url) {
        const fullName =
          `${lead.nombre || ""} ${lead.apellido || ""}`.trim() || "Prospecto WhatsApp";
        updates.photo_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=128`;
      }

      if (!lead.pais) {
        const location = getLeadLocationData(fromNumber);
        updates.pais = resolveLeadCountry(location.countryName, ensurePlusPrefix(fromNumber));
      }

      await supabase
        .from("lead")
        .update(updates as never)
        .eq("id", lead.id);
      Object.assign(lead, updates);
    }

    if (!lead) return;

    // 4. Extract content
    let content = "";
    let mediaUrl: string | null = null;

    if (message.type === "text") {
      content = message.text?.body || "";
    } else if (message.type === "button") {
      content = message.button?.text || "";
    } else if (message.type === "interactive") {
      content =
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        "Interacción Botón";
    } else if (
      message.type === "image" ||
      message.type === "audio" ||
      message.type === "document"
    ) {
      const mediaObj = message[message.type] as { id: string } | undefined;
      const mediaId = mediaObj?.id;
      content = `[Archivo ${message.type} recibido]`;

      if (mediaId) {
        try {
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("config")
            .eq("id", tenantId)
            .single();
          const config = tenantData?.config as { whatsapp?: { accessToken?: string } } | null;
          const token = config?.whatsapp?.accessToken;

          if (token) {
            console.log(`[WHATSAPP PROCESSOR] Downloading media ${mediaId} from Meta...`);
            const metaRes = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const downloadUrl = metaRes.data.url;
            const fileRes = await axios.get(downloadUrl, {
              headers: { Authorization: `Bearer ${token}` },
              responseType: "arraybuffer",
            });

            const fileName = `whatsapp/${tenantId}/${message.id}.${message.type === "audio" ? "ogg" : "jpg"}`;
            const rawCt = fileRes.headers["content-type"];
            const contentTypeHeader = typeof rawCt === "string" ? rawCt : undefined;
            const fileBuf = Buffer.from(fileRes.data);

            try {
              const { data: storageData, error: storageErr } = await supabase.storage
                .from("knowledge_base")
                .upload(fileName, fileBuf, {
                  contentType: contentTypeHeader || "application/octet-stream",
                  upsert: true,
                });

              if (!storageErr && storageData) {
                const { data: publicUrlData } = supabase.storage
                  .from("knowledge_base")
                  .getPublicUrl(fileName);
                mediaUrl = publicUrlData?.publicUrl || `/storage/${fileName}`;
              } else {
                mediaUrl = await uploadToMinio(fileName, fileBuf, contentTypeHeader).catch(() => `/storage/${fileName}`);
              }
            } catch {
              mediaUrl = await uploadToMinio(fileName, fileBuf, contentTypeHeader).catch(() => `/storage/${fileName}`);
            }

            content = `[${message.type.toUpperCase()}]: ${mediaUrl}`;
            console.log(`[WHATSAPP PROCESSOR] Media processed and saved: ${mediaUrl}`);
          }
        } catch (mediaErr) {
          console.error("[WHATSAPP PROCESSOR] Failed to process media:", mediaErr);
          content = `[Error al procesar ${message.type}]`;
        }
      }
    } else {
      content = `[Mensaje tipo: ${message.type}]`;
    }

    // 5. Log Message in consolidated chat_summaries
    try {
      const { ChatSummaryService } = await import("@/lib/services/knowledge-base");
      await ChatSummaryService.appendMessage(tenantId, lead.id, "Usuario", content);
    } catch (summaryErr) {
      console.warn("[WHATSAPP PROCESSOR] ChatSummaryService.appendMessage skipped/error:", summaryErr);
    }

    // 5b. Individual message logging
    try {
      const chatPayload = {
        tenant_id: tenantId,
        lead_id: lead.id,
        direction: "INBOUND",
        message_type: "TEXT",
        content: content,
        sent_by: "CLIENT",
        status: "READ",
        metadata: {
          meta_id: message.id,
          raw: message,
          media_url: mediaUrl,
        },
      };

      const { error: logError } = await supabase.from("chat_messages").insert(chatPayload as never);

      if (logError) {
        console.error("[WHATSAPP PROCESSOR] Failed to log message in Supabase:", logError);
      } else {
        console.log(`[WHATSAPP PROCESSOR] Message logged successfully for lead ${lead.id}`);
      }

      // 5c. Ensure conversation entry exists for Dashboard/WhatsApp (Safe find then update or insert)
      try {
        const { data: existingConv } = await supabase
          .from("conversaciones_whatsapp")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("id_lead", lead.id)
          .maybeSingle();

        if (existingConv?.id) {
          await supabase
            .from("conversaciones_whatsapp")
            .update({
              fecha_ultimo_mensaje: new Date().toISOString(),
              estado: "ACTIVA",
            })
            .eq("id", existingConv.id);
        } else {
          await supabase
            .from("conversaciones_whatsapp")
            .insert({
              tenant_id: tenantId,
              id_lead: lead.id,
              fecha_ultimo_mensaje: new Date().toISOString(),
              estado: "ACTIVA",
            });
        }
      } catch (convErr) {
        console.warn("[WHATSAPP PROCESSOR] Error updating conversaciones_whatsapp:", convErr);
      }

      const { GlobalLogger } = await import("../logger");
      await GlobalLogger.info(tenantId, "WHATSAPP", `WhatsApp Inbound: ${fromNumber}`, {
        lead_id: lead.id,
        content: content.substring(0, 100),
        is_ai_enabled: lead.is_ai_enabled,
      });
    } catch (logEx) {
      console.error("[WHATSAPP PROCESSOR] Exception logging message:", logEx);
    }

    // 6. Trigger AI Response
    if ((lead as unknown as { is_ai_enabled: boolean }).is_ai_enabled) {
      const { GlobalLogger } = await import("../logger");
      await GlobalLogger.info(tenantId, "WHATSAPP", `🤖 Calling AI Processor for lead ${lead.id}`);
      const { generateAIWhatsAppResponse } = await import("./WhatsAppAIProcessor");
      await generateAIWhatsAppResponse(
        tenantId,
        (lead as unknown as { id: string }).id,
        content,
        message.id
      );
    } else {
      const { GlobalLogger } = await import("../logger");
      await GlobalLogger.warn(
        tenantId,
        "WHATSAPP",
        `AI is DISABLED for lead ${lead.id}. Skipping.`
      );
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[WHATSAPP PROCESSOR] Error:", error.message);
  }
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing Supabase configuration (SUPABASE_URL)");
  }
  const key = getAuthServiceRoleKey();

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
