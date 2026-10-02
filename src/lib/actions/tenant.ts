"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";
import { requireEnvAny } from "@/lib/env";
import { Tenant } from "@/types/tenant";
import { OverviewKpisArraySchema } from "@/lib/schemas/overview-kpi";

const SUPER_ADMIN_EMAILS = [
  "renzo.calderon.thompson@gmail.com",
  "renzz.cal.thompson@gmail.com",
  "admin@test.com",
  "renton.clientes.datos@gmail.com",
];

async function assertSuperAdminAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return { ok: false, error: "No autenticado. Inicia sesión." };
    }
    const user = data.user;
    const appMeta = user.app_metadata ?? {};
    const isSuperAdmin =
      appMeta.is_super_admin === true ||
      appMeta.is_super_admin === "true" ||
      appMeta.is_admin === true ||
      appMeta.is_admin === "true" ||
      appMeta.admin === true ||
      appMeta.admin === "true" ||
      (!!user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
      user.user_metadata?.username === "renton" ||
      (typeof user.user_metadata?.name === "string" &&
        user.user_metadata.name.toUpperCase().includes("RENTON"));

    if (!isSuperAdmin) {
      return { ok: false, error: "Acción reservada exclusivamente para administradores." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[assertSuperAdminAccess] error:", e);
    return { ok: false, error: "Error verificando permisos de Super Admin." };
  }
}

/**
 * Sprint 0 tarea 1-17: gate de admin general
 */
async function assertAdminAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only en server actions de gating
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return { ok: false, error: "No autenticado. Inicia sesión." };
    }
    const appMeta = data.user.app_metadata ?? {};
    const isAdmin =
      appMeta.is_super_admin === true ||
      appMeta.is_super_admin === "true" ||
      appMeta.is_admin === true ||
      appMeta.is_admin === "true" ||
      appMeta.admin === true ||
      appMeta.admin === "true";
    if (!isAdmin) {
      return { ok: false, error: "Acción requiere rol admin." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[assertAdminAccess] error:", e);
    return { ok: false, error: "Error verificando permisos." };
  }
}

/**
 * Sets the active tenant cookie using tenantId (V2 multi-tenant model).
 * No longer stores supabase URL/key — the central DB handles all tenants.
 */
export async function setTenantCookies(tenantId: string, name: string = "") {
  const cookieStore = await cookies();

  if (tenantId) {
    cookieStore.set("esden-tenant-id", tenantId, { path: "/", maxAge: 30 * 24 * 60 * 60 });
    cookieStore.set("esden-tenant-name", name, { path: "/", maxAge: 30 * 24 * 60 * 60 });
  } else {
    cookieStore.delete("esden-tenant-id");
    cookieStore.delete("esden-tenant-name");
  }
}

async function getAdminSupabase() {
  if (!AUTH_SUPABASE_URL || !AUTH_SUPABASE_ANON_KEY) {
    throw new Error(
      "Configuración de administración (AUTH) incompleta. Verifique las variables de entorno."
    );
  }
  const cookieStore = await cookies();
  return createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Client using SERVICE ROLE KEY to perform administrative tasks
 */
async function getServiceSupabase() {
  // Sprint 0 tarea 1-04: sin fallback hardcoded. Si la env var falta, falla explícitamente.
  const serviceKey = requireEnvAny([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ]);
  const url = requireEnvAny(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);

  return createAdminClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getTenants(): Promise<Tenant[]> {
  try {
    const adminGate = await assertSuperAdminAccess();
    if (!adminGate.ok) return [];

    // Sprint 0 tarea 1-04: sin fallback hardcoded.
    const serviceKey = requireEnvAny([
      "SUPABASE_SERVICE_ROLE_KEY",
      "SERVICE_ROLE_KEY",
      "SUPABASE_SECRET_KEY",
    ]);
    const url = requireEnvAny(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);

    const supabase = createAdminClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.from("tenants").select("*").order("name");

    if (error) {
      console.error("ERROR FETCHING TENANTS:", error);
      return [];
    }

    // Map is_admin, username, api_type and business_type from config/column to top level for UI convenience
    return (data || []).map((t) => ({
      ...t,
      is_admin: !!(t.config as Record<string, unknown>)?.is_admin,
      api_type:
        ((t.config as Record<string, unknown>)?.api_type as "internal" | "client") || "internal",
      username: ((t.config as Record<string, unknown>)?.username as string) || "",
      business_type:
        (t.business_type as string) ||
        ((t.config as Record<string, unknown>)?.business_type as string) ||
        "general",
    }));
  } catch (e) {
    console.error("CRITICAL ERROR IN getTenants:", e);
    return [];
  }
}

export async function getActiveTenantConfig(): Promise<Tenant | null> {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("esden-tenant-id")?.value;
  const supabase = await getAdminSupabase();

  if (tenantId) {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();
    if (data && !error) {
      return {
        ...data,
        is_admin: !!(data.config as Record<string, unknown>)?.is_admin,
        api_type:
          ((data.config as Record<string, unknown>)?.api_type as "internal" | "client") ||
          "internal",
        username: ((data.config as Record<string, unknown>)?.username as string) || "",
        business_type:
          (data.business_type as string) ||
          ((data.config as Record<string, unknown>)?.business_type as string) ||
          "general",
      } as Tenant;
    }
  }

  // Fallback al primer tenant disponible si no hay cookie o la cookie es inválida
  try {
    const { data: fallbackData } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackData) {
      // Intentamos setear la cookie para futuras peticiones
      try {
        cookieStore.set("esden-tenant-id", fallbackData.id, {
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
        cookieStore.set("esden-tenant-name", fallbackData.name, {
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
      } catch {
        // En Server Components de solo lectura cookies().set puede no aplicar; ignoramos
      }

      return {
        ...fallbackData,
        is_admin: !!(fallbackData.config as Record<string, unknown>)?.is_admin,
        api_type:
          ((fallbackData.config as Record<string, unknown>)?.api_type as "internal" | "client") ||
          "internal",
        username: ((fallbackData.config as Record<string, unknown>)?.username as string) || "",
        business_type:
          (fallbackData.business_type as string) ||
          ((fallbackData.config as Record<string, unknown>)?.business_type as string) ||
          "general",
      } as Tenant;
    }
  } catch (err) {
    console.error("[getActiveTenantConfig] Fallback error:", err);
  }

  return null;
}

export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
  const supabase = await getAdminSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("auth_user_id", userId)
    .single();
  if (error || !data) return null;

  return {
    ...data,
    is_admin: !!(data.config as Record<string, unknown>)?.is_admin,
    api_type:
      ((data.config as Record<string, unknown>)?.api_type as "internal" | "client") || "internal",
    username: ((data.config as Record<string, unknown>)?.username as string) || "",
    business_type:
      (data.business_type as string) ||
      ((data.config as Record<string, unknown>)?.business_type as string) ||
      "general",
  } as Tenant;
}

export async function createTenant(tenant: Partial<Tenant> & { password?: string }) {
  try {
    const adminGate = await assertSuperAdminAccess();
    if (!adminGate.ok) return { error: adminGate.error };

    const supabase = await getAdminSupabase();
    const serviceSupabase = await getServiceSupabase();

    let authUserId: string | undefined;

    // 1. If email and password provided, create user in Auth
    if (tenant.client_email && tenant.password) {
      // Sprint 0 tarea 1-16: `is_admin` se escribe en app_metadata (server-controlled).
      // Antes iba en user_metadata, editable por el propio usuario via
      // supabase.auth.updateUser → privilege escalation trivial (DA-2-005).
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: tenant.client_email,
        password: tenant.password,
        email_confirm: true,
        app_metadata: {
          is_admin: !!tenant.is_admin,
        },
        user_metadata: {
          tenant_name: tenant.name,
          username: tenant.username || "",
        },
      });

      if (authError) {
        console.error("AUTH USER CREATION ERROR:", authError.message);
        return { error: `Error en Auth: ${authError.message}` };
      }
      authUserId = authData.user?.id;
    }

    // We move is_admin, username, api_type and business_type into config, then remove them from the top-level insert
    // password is for auth only
    const {
      is_admin,
      username,
      api_type,
      business_type,
      password: _password,
      ...tenantData
    } = tenant;

    const finalBusinessType =
      business_type ||
      ((tenantData.config as Record<string, unknown>)?.business_type as string) ||
      "general";

    const config = {
      ...(tenantData.config || {}),
      is_admin: !!is_admin,
      username: username || "",
      api_type: api_type || "internal",
      business_type: finalBusinessType,
    };

    const { data, error } = await serviceSupabase
      .from("tenants")
      .insert({
        ...tenantData,
        config,
        auth_user_id: authUserId,
      })
      .select()
      .single();

    if (error) {
      console.error("CREATE TENANT ERROR:", error.message);
      return { error: `Error en Base de Datos: ${error.message}` };
    }
    return { success: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("UNEXPECTED CREATE TENANT ERROR:", e);
    return { error: `Error inesperado: ${msg}` };
  }
}

export async function updateTenant(id: string, updates: Partial<Tenant> & { password?: string }) {
  try {
    const adminGate = await assertSuperAdminAccess();
    if (!adminGate.ok) return { error: adminGate.error };

    const supabase = await getAdminSupabase();
    const serviceSupabase = await getServiceSupabase();

    let targetAuthUserId = updates.auth_user_id;

    // 0. Comprobar si ya existe un usuario con el email que se está guardando
    let existingUserWithEmail: { id: string; email?: string } | null = null;
    if (updates.client_email) {
      const { data: userData } = await serviceSupabase.auth.admin.listUsers();
      if (userData?.users) {
        const found = userData.users.find(
          (u) => u.email?.toLowerCase() === updates.client_email?.toLowerCase()
        );
        if (found) {
          existingUserWithEmail = { id: found.id, email: found.email };
        }
      }
    }

    // Si ya existe un usuario con ese email, el tenant debe vincularse a ese usuario existente
    if (existingUserWithEmail) {
      targetAuthUserId = existingUserWithEmail.id;
    } else if (targetAuthUserId) {
      // Verificar si el targetAuthUserId actual existe
      const { data: userCheck } = await serviceSupabase.auth.admin.getUserById(targetAuthUserId);
      if (!userCheck?.user) {
        targetAuthUserId = undefined;
      }
    }

    // Get current user to prevent self-demotion
    const supabaseForAuth = await getAdminSupabase();
    const {
      data: { user: currentUser },
    } = await supabaseForAuth.auth.getUser();

    // 1. Si tenemos un usuario en Auth vinculado (sea el existente por email o el previo)
    if (targetAuthUserId) {
      // Solo proteger la cuenta maestra de Renton Admin de ser degradada:
      const targetIsRenton =
        updates.name?.toUpperCase().includes("RENTON") ||
        updates.username?.toLowerCase() === "renton" ||
        updates.client_email?.toLowerCase() === "renzz.cal.thompson@gmail.com" ||
        updates.client_email?.toLowerCase() === "renzo.calderon.thompson@gmail.com";

      if (targetIsRenton && updates.is_admin === false) {
        return { error: "La cuenta maestra de Renton Admin no puede degradarse a Cliente." };
      }

      const authUpdatePayload: {
        password?: string;
        email?: string;
        email_confirm?: boolean;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      } = {
        app_metadata: {
          is_admin: !!updates.is_admin,
          admin: !!updates.is_admin,
          is_super_admin: targetIsRenton,
        },
        user_metadata: {
          username: updates.username,
        },
      };

      if (updates.password) {
        authUpdatePayload.password = updates.password;
      }
      // Solo actualizamos el email si no era un usuario ya existente con ese email
      if (updates.client_email && (!existingUserWithEmail || existingUserWithEmail.id !== targetAuthUserId)) {
        authUpdatePayload.email = updates.client_email;
        authUpdatePayload.email_confirm = true;
      }

      const { error: authError } = await serviceSupabase.auth.admin.updateUserById(
        targetAuthUserId,
        authUpdatePayload
      );
      if (authError) {
        console.error("AUTH USER UPDATE ERROR:", authError.message);
        return { error: `Error actualizando usuario en Auth: ${authError.message}` };
      }

      updates.auth_user_id = targetAuthUserId;
    }
    // 2. Si NO existe usuario en Auth y se envió password y email, crear nuevo usuario
    else if (updates.password && updates.client_email) {
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: updates.client_email,
        password: updates.password,
        email_confirm: true,
        app_metadata: {
          is_admin: !!updates.is_admin,
        },
        user_metadata: {
          username: updates.username || "",
        },
      });

      if (authError) {
        console.error("AUTH USER CREATION ON UPDATE ERROR:", authError.message);
        return { error: `Error creando usuario en Auth: ${authError.message}` };
      }
      targetAuthUserId = authData.user?.id;
      updates.auth_user_id = targetAuthUserId;
    }

    // We move is_admin, username, api_type and business_type into config to avoid needing a new column in the table
    // password is for auth only
    const {
      is_admin,
      username,
      api_type,
      business_type,
      password: _password,
      ...cleanUpdates
    } = updates;

    const newConfig = { ...((cleanUpdates.config as Record<string, unknown>) || {}) };
    if (is_admin !== undefined) newConfig.is_admin = !!is_admin;
    if (username !== undefined) newConfig.username = username;
    if (api_type !== undefined) newConfig.api_type = api_type;
    if (business_type !== undefined) {
      newConfig.business_type = business_type;
    }

    // Sprint 2B: validar overview_kpis si viene en config (max 8 KPIs hero, shape valido).
    if (newConfig.overview_kpis !== undefined) {
      const parsed = OverviewKpisArraySchema.safeParse(newConfig.overview_kpis);
      if (!parsed.success) {
        return {
          error: `overview_kpis inválido: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        };
      }
    }

    cleanUpdates.config = newConfig;

    const { data, error } = await serviceSupabase
      .from("tenants")
      .update(cleanUpdates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("UPDATE TENANT ERROR:", error.message);
      return { error: `Error en Base de Datos: ${error.message}` };
    }
    return {
      success: true,
      data: {
        ...data,
        is_admin: !!(data.config as Record<string, unknown>)?.is_admin,
        api_type:
          ((data.config as Record<string, unknown>)?.api_type as "internal" | "client") ||
          "internal",
        username: ((data.config as Record<string, unknown>)?.username as string) || "",
        business_type:
          (data.business_type as string) ||
          ((data.config as Record<string, unknown>)?.business_type as string) ||
          "general",
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("UNEXPECTED UPDATE TENANT ERROR:", e);
    return { error: `Error inesperado: ${msg}` };
  }
}

/**
 * Partial update for the config object only.
 * Deep merges the new configuration into the existing one.
 */
export async function updateTenantConfig(id: string, partialConfig: Record<string, unknown>) {
  try {
    const supabase = await getAdminSupabase();
    const serviceSupabase = await getServiceSupabase();

    // 1. Get current config
    const { data: tenant, error: fetchError } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", id)
      .single();

    if (fetchError || !tenant) {
      return {
        success: false,
        error: "No se encontró el cliente para actualizar la configuración.",
      };
    }

    const currentConfig = (tenant.config as Record<string, unknown>) || {};

    // 2. Deep merge and normalization
    const updatedConfig = { ...currentConfig };
    for (const key in partialConfig) {
      const val = partialConfig[key];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        updatedConfig[key] = {
          ...((updatedConfig[key] as Record<string, unknown>) || {}),
          ...(val as Record<string, unknown>),
        };

        // Strict normalization for Retell
        if (key === "retell") {
          const retell = updatedConfig[key] as Record<string, unknown>;
          if (retell.apiKey) {
            retell.api_key = retell.apiKey;
            delete retell.apiKey;
          }
          if (retell.agentId) {
            retell.agent_id = retell.agentId;
            delete retell.agentId;
          }
        }
      } else {
        updatedConfig[key] = val;
      }
    }

    // 2.5 Sprint 2B: validar overview_kpis si viene en config (max 8, shape valido).
    if (updatedConfig.overview_kpis !== undefined) {
      const parsed = OverviewKpisArraySchema.safeParse(updatedConfig.overview_kpis);
      if (!parsed.success) {
        return {
          success: false,
          error: `overview_kpis inválido: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        };
      }
    }

    // 3. Save
    const { data, error } = await serviceSupabase
      .from("tenants")
      .update({ config: updatedConfig })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("UPDATE TENANT CONFIG ERROR:", err);
    return { success: false, error: message };
  }
}

export async function deleteTenant(id: string) {
  const adminGate = await assertSuperAdminAccess();
  if (!adminGate.ok) {
    throw new Error(adminGate.error);
  }

  const supabase = await getAdminSupabase();
  const { data: targetTenant } = await supabase
    .from("tenants")
    .select("name, config")
    .eq("id", id)
    .maybeSingle();

  const isRenton =
    targetTenant?.name?.toUpperCase().includes("RENTON") ||
    (targetTenant?.config as Record<string, unknown>)?.username === "renton";

  if (isRenton) {
    throw new Error("No es posible eliminar la cuenta principal de Renton Admin.");
  }

  const serviceSupabase = await getServiceSupabase();
  const { error } = await serviceSupabase.from("tenants").delete().eq("id", id);
  if (error) {
    console.error("DELETE TENANT ERROR:", error.message);
    throw new Error(error.message);
  }
  return true;
}

export async function setTenantToInternalDatabase(tenantId: string) {
  try {
    const supabase = await getAdminSupabase();

    // 1. Get current config
    const { data: tenant, error: fetchError } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    if (fetchError || !tenant) {
      return { success: false, error: "No se encontró el cliente." };
    }

    const config = (tenant.config as Record<string, unknown>) || {};

    // 2. Set to internal and clear specific supabase credentials
    const updatedConfig = {
      ...config,
      api_type: "internal",
    };

    const serviceSupabase = await getServiceSupabase();

    const { error: updateError } = await serviceSupabase
      .from("tenants")
      .update({
        config: updatedConfig,
        supabase_url: null,
        supabase_key: null,
      })
      .eq("id", tenantId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("SET TENANT TO INTERNAL ERROR:", err);
    return { success: false, error: message };
  }
}
