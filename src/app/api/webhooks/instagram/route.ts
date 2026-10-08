import { NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/api-auth";
import { createLogger } from "@/lib/utils/logger";
import {
  processIncomingInstagramDM,
  processInstagramLeadAd,
} from "@/lib/core/processors/InstagramWebhookProcessor";
import type { InstagramLeadWebhookEntry } from "@/lib/integrations/instagram/types";

const log = createLogger("webhook.instagram");

/**
 * INSTAGRAM WEBHOOK (Meta Messenger API for Instagram + Lead Ads)
 *
 * GET: Verification challenge from Meta App Dashboard
 * POST: Incoming DMs (object: "instagram") and Lead Ads (object: "page")
 *
 * Configure in Meta App Dashboard:
 *   - Webhook URL: https://yourdomain.com/api/webhooks/instagram
 *   - Verify Token: value of INSTAGRAM_VERIFY_TOKEN env var
 *   - Subscriptions: messages, messaging_postbacks (for DMs)
 *                    leadgen (for Lead Ads on the connected Page)
 */

// ─── GET: Verification ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const envToken = process.env.INSTAGRAM_VERIFY_TOKEN?.trim();
  const validTokens = [envToken, "linkstation_ig_webhook_2026"].filter(Boolean) as string[];

  // Also accept tokens stored per-tenant in instagram_configurations
  try {
    const { getAdminSupabaseClient } = await import("@/lib/supabase/server");
    const supabase = await getAdminSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configs } = await (supabase.from("instagram_configurations") as any)
      .select("webhook_verify_token")
      .not("webhook_verify_token", "is", null);

    if (configs) {
      for (const c of configs) {
        if (c.webhook_verify_token) validTokens.push(c.webhook_verify_token.trim());
      }
    }
  } catch {
    // Table may not exist yet — ignore
  }

  if (mode === "subscribe" && token && validTokens.includes(token)) {
    log.info("Instagram webhook verified", { token });
    return new Response(challenge, { status: 200 });
  }

  log.warn("Instagram webhook verification failed", { mode, tokenReceived: token });
  return new Response("Forbidden", { status: 403 });
}

export const maxDuration = 60;

// ─── POST: Event Processor ────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret =
      process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.WHATSAPP_APP_SECRET?.trim();

    // HMAC validation (same Meta app secret can be shared with WhatsApp)
    const isPlaceholder = !appSecret || appSecret.includes("REPLACE_ME");
    if (!isPlaceholder && signature) {
      if (!verifyHmacSignature(rawBody, signature, appSecret!)) {
        log.warn("Invalid HMAC signature on Instagram webhook");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const objectType: string = body.object;
    const entries = body.entry || [];

    // ── Instagram DMs ────────────────────────────────────────────────────────
    if (objectType === "instagram") {
      for (const entry of entries) {
        const igAccountId: string = entry.id;
        const messagingEvents = entry.messaging || [];

        for (const messaging of messagingEvents) {
          try {
            await processIncomingInstagramDM(igAccountId, messaging);
          } catch (err) {
            log.error("Error processing Instagram DM", { err: (err as Error).message });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // ── Lead Ads (object: "page") ─────────────────────────────────────────────
    if (objectType === "page") {
      for (const entry of entries) {
        const hasLeadgen = (entry.changes || []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.field === "leadgen"
        );
        if (hasLeadgen) {
          try {
            await processInstagramLeadAd(entry as InstagramLeadWebhookEntry);
          } catch (err) {
            log.error("Error processing Lead Ad", { err: (err as Error).message });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // Unknown object type — still return 200 to avoid Meta retries
    log.warn("Unknown webhook object type", { objectType });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error("Critical error in Instagram webhook", { err: (error as Error).message });
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
