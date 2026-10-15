import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";

// Sprint 3 Hardening: renombrado de `middleware` a `proxy` (Next.js 16 convention).
// El archivo `src/middleware.ts` quedó deprecated en Next.js 16.0.0 — la nueva convención
// es `src/proxy.ts` con `export async function proxy(...)`. Runtime por defecto: Node.js
// (vs Edge anterior), compatible con Supabase SSR `createServerClient` + cookies.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith("/login");
  const isProtected = pathname.startsWith("/dashboard");

  const supabaseUrl = AUTH_SUPABASE_URL;
  const supabaseAnonKey = AUTH_SUPABASE_ANON_KEY;

  // Nunca faltarán las vars (auth-config tiene fallback hardcodeado)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("PROXY AUTH ERROR:", error);
    // Si hay error de auth y la ruta es protegida → redirigir al login
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Sin sesión en ruta protegida → login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Sprint 0 tarea 1-16: leer rol admin SOLO de app_metadata (server-controlled).
  // Ahora la fuente de verdad es app_metadata, no escribible desde el cliente.
  const isAdmin =
    user?.app_metadata?.is_super_admin === true ||
    user?.app_metadata?.is_super_admin === "true" ||
    user?.app_metadata?.is_admin === true ||
    user?.app_metadata?.is_admin === "true" ||
    user?.app_metadata?.admin === true ||
    user?.app_metadata?.admin === "true";

  // Super Admin path: /dashboard/super-admin
  if (user && pathname.startsWith("/dashboard/super-admin")) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Integraciones que el cliente debe poder configurar para su negocio:
  // - Google Sheets (/dashboard/settings/integrations/google-sheets)
  // - Zoho CRM (/dashboard/settings/integrations/zoho-pull)
  // - Instagram (/dashboard/settings/integrations/instagram)
  // - WhatsApp WABA (/dashboard/settings/whatsapp)
  const isClientIntegrationPath =
    pathname.startsWith("/dashboard/settings/integrations/") ||
    pathname.startsWith("/dashboard/settings/whatsapp");

  // Rutas exclusivas de administración:
  // - /dashboard/admin, /admin y /dashboard/docs-admin (panel admin)
  // - /dashboard/settings y /settings raíz (gestión, creación y edición de clientes)
  // Los clientes NO pueden acceder a estas rutas administrativas.
  const isAdminOnlyPath =
    pathname.includes("/admin") ||
    pathname.startsWith("/dashboard/docs-admin") ||
    (pathname.includes("/settings") && !isClientIntegrationPath);

  if (user && isAdminOnlyPath) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Con sesión en página de login → redirect al dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
