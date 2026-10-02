"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";
import { withRateLimit, type RateLimitedError } from "@/lib/api/with-rate-limit";
import { extractClientIp } from "@/lib/rate-limiter";
import { maskEmail } from "@/lib/security/pii-mask";
import { getTenantByUserId, setTenantCookies } from "./tenant";

/**
 * Bucket identity para rate-limit de auth actions (SP-4-AUTH-RATELIMIT).
 *
 * Devuelve `ip:emailHash` para que ataques brute-force por mismo IP a distintos
 * emails NO compartan bucket (mitiga username-enumeration y permite que múltiples
 * usuarios detrás de NAT compartido no se bloqueen entre sí).
 *
 * El emailHash es sha256 truncado a 16 hex chars (8 bytes, suficiente entropía
 * para no colisionar en el bucket y NO log-leakea el email en claro.
 */
async function identifyAuthBucket(email: string): Promise<string> {
  const h = await headers();
  // Reconstruimos un Request sintético solo para reutilizar extractClientIp,
  // que prioriza x-forwarded-for → x-real-ip → "unknown".
  const headersInit: Record<string, string> = {};
  for (const [k, v] of h.entries()) headersInit[k] = v;
  const ip = extractClientIp(new Request("http://internal", { headers: headersInit }));
  const emailHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
  return `${ip}:${emailHash}`;
}

/**
 * Normaliza la respuesta `rate_limit_exceeded` del HOF `withRateLimit` al
 * contrato `{ error: string }` que consume `LoginForm` y otros callers.
 */
function isRateLimitError(value: unknown): value is RateLimitedError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { error?: string }).error === "rate_limit_exceeded"
  );
}

async function _loginAction(email: string, password: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
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

  const emailTag = maskEmail(email);

  try {
    console.log(`[AUTH] Intentando login para ${emailTag} en ${AUTH_SUPABASE_URL}`);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`[AUTH] Error de Supabase: ${error.message}`);

      // Si el error es de red (fetch failed), intentamos dar un mensaje más útil
      if (error.message.includes("fetch") || error.message.includes("Network")) {
        return {
          error: `ERROR DE RED: El servidor no pudo contactar con Supabase. Verifica la variable SUPABASE_URL (${AUTH_SUPABASE_URL}). Asegúrate de que el puerto 8000 esté abierto en Hostinger.`,
        };
      }

      return { error: error.message };
    }

    if (authData?.user) {
      console.log(`[AUTH] Login inicial exitoso para ${emailTag}, procesando perfil...`);

      // Sprint 0 tarea 1-16: leer rol admin SOLO de app_metadata.
      const user = authData.user;
      const isAdmin =
        user.app_metadata?.is_super_admin === true ||
        user.app_metadata?.is_super_admin === "true" ||
        user.app_metadata?.is_admin === true ||
        user.app_metadata?.is_admin === "true" ||
        user.app_metadata?.admin === true ||
        user.app_metadata?.admin === "true";

      // ⚡ AUTO-CONFIG TENANT COOKIE
      const currentTenantCookie = cookieStore.get("esden-tenant-id")?.value;
      if (!isAdmin) {
        const tenant = await getTenantByUserId(user.id);
        if (tenant) {
          await setTenantCookies(tenant.id, tenant.name);
        }
      } else if (!currentTenantCookie) {
        // Para admin sin cookie previa, inicializamos con el primer tenant disponible
        const { data: firstTenant } = await (await import("@/lib/supabase/server"))
          .getAdminSupabaseClient()
          .then((client) =>
            client
              .from("tenants")
              .select("id, name")
              .order("created_at", { ascending: true })
              .maybeSingle()
          );
        const t = firstTenant as { id?: string; name?: string } | null;
        if (t?.id) {
          await setTenantCookies(t.id, t.name || "");
        }
      }

      console.log(`[AUTH] Login completado para ${emailTag}. Redirigiendo...`);
      if (isAdmin) {
        redirect("/dashboard/super-admin");
      } else {
        redirect("/dashboard");
      }
    }
  } catch (e: unknown) {
    const error = e as { message?: string; cause?: { message?: string } };
    if (error.message === "NEXT_REDIRECT") throw e;

    console.error(`[AUTH] Error inesperado en loginAction:`, e);

    // PARCHE DE EMERGENCIA: Si es un error de fetch, damos una pista clara
    if (error.message?.includes("fetch") || error.cause?.message?.includes("Timeout")) {
      return {
        error: `ERROR DE CONEXIÓN: El servidor Dashboard no llega a Supabase en ${AUTH_SUPABASE_URL}. Revisa el Firewall de Hostinger (Puerto 8000).`,
      };
    }

    return { error: error.message || "Ocurrió un error inesperado" };
  }

  return { success: true };
}

/**
 * `loginAction` envuelto con rate-limit (SP-4-AUTH-RATELIMIT):
 * 5 intentos / minuto por bucket `ip:emailHash`. Cierra OWASP A07:2021
 * (Identification & Authentication Failures — brute-force / credential stuffing).
 *
 * Fail-open si Redis cae (decisión heredada de `rate-limiter.ts`): preferimos
 * servicio degradado a DoS total. El fallo queda en Pino logs.
 */
const _loginActionRateLimited = withRateLimit(_loginAction, {
  key: "auth-login",
  perMinute: 5,
  identify: (email) => identifyAuthBucket(email),
});

export async function loginAction(email: string, password: string) {
  const result = await _loginActionRateLimited(email, password);
  if (isRateLimitError(result)) {
    return {
      error: `Demasiados intentos. Inténtalo de nuevo en ${result.resetSec}s.`,
    };
  }
  return result;
}

export async function logoutAction() {
  const cookieStore = await cookies();

  const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, { ...options, maxAge: 0 }); // forcefully expire
        });
      },
    },
  });

  await supabase.auth.signOut();

  // Clear our custom tenant logic cookies as well
  cookieStore.delete("esden-tenant-url");
  cookieStore.delete("esden-tenant-key");
  cookieStore.delete("esden-tenant-name");

  redirect("/login");
}

export async function getAdminStatus(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  // Sprint 0 tarea 1-16: leer rol admin SOLO de app_metadata (server-controlled).
  const isAdm =
    user?.app_metadata?.is_super_admin === true ||
    user?.app_metadata?.is_super_admin === "true" ||
    user?.app_metadata?.is_admin === true ||
    user?.app_metadata?.is_admin === "true" ||
    user?.app_metadata?.admin === true ||
    user?.app_metadata?.admin === "true";
  return !!isAdm;
}

export async function getSuperAdminStatus(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return false;

  const SUPER_ADMIN_EMAILS = [
    "renzo.calderon.thompson@gmail.com",
    "renzz.cal.thompson@gmail.com",
    "admin@test.com",
    "renton.clientes.datos@gmail.com",
  ];

  const isSuper =
    user.app_metadata?.is_super_admin === true ||
    user.app_metadata?.is_super_admin === "true" ||
    (!!user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    user.user_metadata?.username === "renton" ||
    (typeof user.user_metadata?.name === "string" &&
      user.user_metadata.name.toUpperCase().includes("RENTON"));

  return !!isSuper;
}

async function _resetPasswordAction(email: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
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

  // We use the origin from the request if possible, or a default
  // In server actions we can get headers
  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = h.get("origin") || h.get("host") || "http://localhost:8500";
  const protocol = origin.startsWith("http") ? "" : "https://";
  const redirectTo = `${protocol}${origin}/auth/callback`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("RESET PASSWORD ERROR:", error.message);
    return { error: "No se pudo enviar el correo de recuperación. Intentá de nuevo." };
  }

  return { success: true };
}

/**
 * `resetPasswordAction` envuelto con rate-limit (SP-4-AUTH-RATELIMIT):
 * 3 intentos / minuto por bucket `ip:emailHash`. Anti email-bomb +
 * mitiga username-enumeration via timing/feedback en el endpoint público.
 */
const _resetPasswordActionRateLimited = withRateLimit(_resetPasswordAction, {
  key: "auth-reset",
  perMinute: 3,
  identify: (email) => identifyAuthBucket(email),
});

export async function resetPasswordAction(email: string) {
  const result = await _resetPasswordActionRateLimited(email);
  if (isRateLimitError(result)) {
    return {
      error: `Demasiados intentos. Inténtalo de nuevo en ${result.resetSec}s.`,
    };
  }
  return result;
}
