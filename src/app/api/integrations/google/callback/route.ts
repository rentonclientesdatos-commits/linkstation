// Sprint 4 - Callback OAuth Google Sheets.
//
// Recibe el authorization code de Google, lo intercambia por tokens y los
// persiste cifrados (AES-256-GCM) en integrations.credentials_cipher para
// el tenant correspondiente. Verifica state HMAC contra el tenant en sesion.

import { google } from "googleapis";
import { NextResponse } from "next/server";
import {
  getAppCredentials,
  getOAuthBaseUrl,
  getSheetsIntegration,
  saveOAuthTokens,
} from "@/lib/integrations/sheets/credentials";
import { requireCurrentTenant } from "@/lib/integrations/sheets/session";
import { verifyOAuthState } from "@/lib/integrations/crm/oauth/oauth-state";

const REDIRECT_PATH = "/api/integrations/google/callback";

function backUrl(query: string): string {
  return `${getOAuthBaseUrl()}/dashboard/settings/integrations/google-sheets?${query}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      return NextResponse.redirect(backUrl(`error=${encodeURIComponent(oauthError)}`));
    }
    if (!code || !state) {
      return NextResponse.redirect(backUrl("error=missing_code_or_state"));
    }

    const { tenantId } = await requireCurrentTenant();
    if (!verifyOAuthState(state, tenantId)) {
      return NextResponse.redirect(backUrl("error=invalid_state"));
    }

    const creds = await getAppCredentials(tenantId);
    const row = await getSheetsIntegration(tenantId);
    if (!row) {
      return NextResponse.redirect(backUrl("error=integration_missing"));
    }

    const redirectUri = `${getOAuthBaseUrl()}${REDIRECT_PATH}`;
    const oauth2Client = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(backUrl("error=token_exchange_failed"));
    }

    // Resolver email del usuario conectado (mostrar en UI "Conectado como: ...")
    oauth2Client.setCredentials(tokens);
    let connectedEmail: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const info = await oauth2.userinfo.get();
      connectedEmail = info.data.email ?? null;
    } catch (e) {
      console.warn("[GOOGLE CALLBACK] no se pudo resolver userinfo.email:", e);
    }

    await saveOAuthTokens(row.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
    });

    // Persistir email en metadata para UI
    if (connectedEmail) {
      const { getAdminSupabaseClient } = await import("@/lib/supabase/server");
      const admin = await getAdminSupabaseClient();
      const newMeta = { ...(row.metadata ?? {}), connected_email: connectedEmail };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("integrations") as any).update({ metadata: newMeta }).eq("id", row.id);
    }

    return NextResponse.redirect(backUrl("connected=1"));
  } catch (err) {
    console.error("[GOOGLE CALLBACK] Error:", err);
    const msg = err instanceof Error ? err.message : "internal_error";
    return NextResponse.redirect(backUrl(`error=${encodeURIComponent(msg)}`));
  }
}
