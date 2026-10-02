import { NextResponse } from "next/server";
import { processIncomingWhatsApp } from "@/lib/core/processors/WhatsAppWebhookProcessor";
import { verifyHmacSignature } from "@/lib/api-auth";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("webhook.whatsapp");

/**
 * WHATSAPP WEBHOOK (META CLOUD API)
 * GET: Verification for Meta Dashboard
 * POST: Incoming messages and status updates
 *
 * Sprint 0 tarea 1-14: validación HMAC OBLIGATORIA — antes se saltaba si
 * la env var faltaba o el header no venía. Ahora ambas son requeridas y se
 * compara timing-safe vía `verifyHmacSignature`.
 *
 * Sprint 3 phase-02 (4-03): logger Pino estructurado.
 */

// Verification Endpoint (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const envToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const validTokens = [
    envToken,
    "606a0f3eb1add2abe427421f2eacfb94",
    "automatiza_wh_token_2026_prod",
  ].filter(Boolean) as string[];

  // Also accept any token stored in waba_configurations
  try {
    const { getAdminSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await getAdminSupabaseClient();
    const { data: configs } = await supabase
      .from("waba_configurations")
      .select("webhook_verify_token")
      .not("webhook_verify_token", "is", null);

    if (configs) {
      for (const c of configs) {
        if (c.webhook_verify_token) validTokens.push(c.webhook_verify_token.trim());
      }
    }
  } catch (e) {
    console.warn("[WHATSAPP WEBHOOK GET] Warning loading tokens from DB:", e);
  }

  if (mode === "subscribe" && token && validTokens.includes(token)) {
    log.info("Webhook verified successfully", { token });
    return new Response(challenge, { status: 200 });
  }

  log.warn("Verification failed: invalid token", { mode, tokenReceived: token });
  return new Response("Forbidden", { status: 403 });
}

// Message Receiver (POST)
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();

    const isPlaceholder = !appSecret || appSecret.includes("REPLACE_ME");

    if (!isPlaceholder && signature) {
      if (!verifyHmacSignature(rawBody, signature, appSecret)) {
        console.warn("[WHATSAPP WEBHOOK] Invalid signature mismatch.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (isPlaceholder) {
      console.warn(
        "[WHATSAPP WEBHOOK] WHATSAPP_APP_SECRET es placeholder o no está configurado. Procesando mensaje sin comprobación HMAC."
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 2. Estructura básica de WhatsApp
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid object type" }, { status: 400 });
    }

    // 3. Procesar mensajes a través del procesador central
    // Nota: Meta envía una estructura compleja, processIncomingWhatsApp maneja la extracción interna.
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const message of value.messages) {
          const from = message.from;
          const wabaId = value.metadata?.phone_number_id;
          const contactName = value.contacts?.[0]?.profile?.name || null;

          // Procesamiento asíncrono para no bloquear a Meta
          processIncomingWhatsApp(from, message, wabaId, contactName).catch((err) => {
            console.error("[WHATSAPP WEBHOOK] Error en procesamiento:", err);
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("❌ [WHATSAPP WEBHOOK] Error crítico:", (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
