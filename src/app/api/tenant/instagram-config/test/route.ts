import { NextResponse } from "next/server";
import axios from "axios";

/**
 * POST /api/tenant/instagram-config/test
 * Tests a Page Access Token against Meta Graph API.
 * Returns page name, id, and the linked Instagram Business Account ID.
 */
export async function POST(req: Request) {
  try {
    const { pageAccessToken } = await req.json();

    if (!pageAccessToken) {
      return NextResponse.json({ ok: false, error: "Missing pageAccessToken" }, { status: 400 });
    }

    const response = await axios.get("https://graph.facebook.com/v20.0/me", {
      params: {
        access_token: pageAccessToken,
        fields: "id,name,instagram_business_account",
      },
    });

    const data = response.data as {
      id: string;
      name: string;
      instagram_business_account?: { id: string };
    };

    return NextResponse.json({
      ok: true,
      pageId: data.id,
      name: data.name,
      igAccountId: data.instagram_business_account?.id || null,
    });
  } catch (err: unknown) {
    const errorData = (err as { response?: { data?: { error?: { message?: string } } } })?.response
      ?.data;
    const message =
      errorData?.error?.message || (err as Error).message || "Token inválido o expirado";
    return NextResponse.json({ ok: false, error: message });
  }
}
