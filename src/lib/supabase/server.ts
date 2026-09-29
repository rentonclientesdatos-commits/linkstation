import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { requireEnvAny } from "@/lib/env";

/**
 * Server-side Supabase client helpers.
 */
export async function getActiveTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get("esden-tenant-id")?.value;
    if (cookieVal) return cookieVal;
  } catch {
    // cookies() unavailable or out of request scope
  }

  try {
    const supabase = await getAdminSupabaseClient();
    const { data } = (await supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()) as { data: { id: string } | null };

    if (data?.id) return data.id;
  } catch (err) {
    console.error("[getActiveTenantId] Error falling back to default tenant:", err);
  }
  return null;
}

/**
 * Server-side Supabase client (anon key — RLS aplica).
 */
export async function getSupabaseServerClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    requireEnvAny(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) ||
    "https://placeholder.supabase.co";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    requireEnvAny(["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) ||
    "placeholder-key";

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Admin Supabase client (service_role — bypasses RLS).
 */
export async function getAdminSupabaseClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    requireEnvAny(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) ||
    "https://placeholder.supabase.co";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    requireEnvAny(["SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) ||
    "placeholder-key";

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
