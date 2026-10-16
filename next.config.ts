import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "node:path";

/**
 * Path-prefix proxy a Supabase Kong para evitar subdominios dedicados.
 *
 * - Browser hace fetch a `${NEXT_PUBLIC_APP_URL}/supabase/...`
 * - Next.js reescribe a la URL real del Kong (interno en VPS, localhost:8100 en local)
 * - Beneficio: same-origin (cero CORS), cookies compartidas SSR↔client, una sola DNS + cert
 *
 * En VPS la reescritura la hace traefik via labels (no este rewrite — este es solo para LOCAL).
 * En LOCAL Next.js es el único proxy posible, así que aquí lo definimos.
 */
const SUPABASE_KONG_INTERNAL = process.env.SUPABASE_KONG_INTERNAL_URL ?? "http://127.0.0.1:8100";

/**
 * Security headers — Sprint 3 phase-05 Hardening (4-06).
 *
 * CSP `unsafe-inline` styles aceptado por Tailwind v4 en MVP (alternativa hash-based
 * en Sprint 4). `connect-src` enumera explícitamente todos los endpoints LLM/Supabase/Sentry
 * que el cliente puede contactar — bloquea exfiltration accidental.
 *
 * HSTS preload requiere HTTPS funcional en Dokploy ANTES de activarlo.
 * `frame-ancestors 'none'` previene clickjacking en todas las rutas EXCEPTO `/widget/*`
 * que se sobrescribe abajo (los clientes embeben el widget en sus sitios).
 */
// Sprint 3 BUG-3-13 fix (26-05-2026): React dev mode usa eval() para
// debugging (reconstrucción de callstacks). CSP estricta sin 'unsafe-eval'
// rompe esta funcionalidad y genera badge "1 Issue" del Next Dev Tools.
// Solo añadimos 'unsafe-eval' a script-src en NODE_ENV !== 'production'.
// En prod build se mantiene la CSP estricta original.
const IS_DEV = process.env.NODE_ENV !== "production";
// Sprint 4: Google Picker requires loading apis.google.com (gapi loader) y
// embedding docs.google.com iframe del Picker UI.
const GOOGLE_PICKER_SCRIPT = "https://apis.google.com";
const SCRIPT_SRC = IS_DEV
  ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GOOGLE_PICKER_SCRIPT}`
  : `script-src 'self' 'unsafe-inline' ${GOOGLE_PICKER_SCRIPT}`;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      SCRIPT_SRC, // Next.js inyecta inline scripts (hidratación). 'unsafe-eval' solo en dev. strict-dynamic en Sprint 4.
      "img-src 'self' data: blob: https:",
      [
        "connect-src 'self'",
        "https://*.supabase.co wss://*.supabase.co",
        // Solo en dev: el cliente del navegador hace fetch directo al Supabase
        // local (Kong en 127.0.0.1:8100 / localhost:8100). En prod la URL de
        // Supabase es same-origin (path-prefix) y cae bajo 'self'.
        ...(IS_DEV
          ? ["http://127.0.0.1:8100 http://localhost:8100 ws://127.0.0.1:8100 ws://localhost:8100"]
          : []),
        "https://api.anthropic.com",
        "https://api.openai.com",
        "https://generativelanguage.googleapis.com",
        "https://*.ingest.sentry.io",
        "https://*.ingest.us.sentry.io",
        "https://api.retellai.com",
        "https://api.ultravox.ai",
        "https://api.hubapi.com",
        "https://accounts.zoho.com https://*.zohoapis.com https://*.zohoapis.eu",
        "https://graph.facebook.com",
        "https://api.sepay.vn",
        // Sprint 4: Google Sheets / Drive / Picker / OAuth userinfo
        "https://sheets.googleapis.com https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com",
        "https://content.googleapis.com",
      ].join(" "),
      "font-src 'self' data:",
      // Sprint 4: el Google Picker carga su UI en un iframe servido por docs.google.com.
      "frame-src https://docs.google.com https://accounts.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Skip TypeScript errors during production builds.
  // The 'never' type errors are caused by Supabase tables not present in the
  // auto-generated types file. They are safe to ignore at build time.
  typescript: {
    ignoreBuildErrors: true,
  },
  output: process.env.VERCEL ? undefined : "standalone",
  // Incluir en la imagen `output: standalone` los ficheros que algunas rutas leen
  // en runtime con `fs` desde process.cwd(). Sin esto, la imagen Docker NO copia
  // estas carpetas (solo el bundle traced) → 404/500 en VPS aunque funcione en local.
  // Detectado 03-06-2026: /docs/integrations/[slug] daba 404 en VPS (BUG-4-07 revivido
  // en prod) porque docs/ no estaba en el contenedor standalone.
  outputFileTracingIncludes: {
    "/docs/integrations/[slug]": ["./docs/integrations/**/*.md"],
    "/api/docs/content": ["./MASTER_DOSSIER.md"],
    "/api/admin/tenants/[id]/client-sql": ["./supabase/migrations/client_supabase_schema.sql"],
  },
  // Pino y su transitive `thread-stream` usan worker_threads / process.stdout: deben quedar
  // como external en server bundles (no pasar por webpack chunking) para evitar runtime errors.
  // Sprint 3 phase-02 Observabilidad (4-03).
  serverExternalPackages: ["pino", "pino-pretty"],
  // Sprint 3 Hardening + PR #21 hotfix: fijar workspace root para Turbopack.
  // Sin esto, Next 16 detecta ambiguamente el workspace y resuelve `tailwindcss`
  // desde el parent (donde no hay node_modules), provocando crash OOM en dev
  // (29-05-2026) + silencia warning "multiple lockfiles" en worktrees git.
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Widget embed: los clientes embeben en sus dominios -> frame-ancestors permisivo
      // pero seguimos validando el origin en server-side (1-27 Sprint 0).
      {
        source: "/widget/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/dashboardadmin/:path*",
        destination: "/dashboard/:path*",
      },
      {
        source: "/supabase/:path*",
        destination: `${SUPABASE_KONG_INTERNAL}/:path*`,
      },
    ];
  },
};

// Sentry wrap: solo aplica integración real si SENTRY_DSN está configurado.
// Si no, withSentryConfig pasa la config por defecto sin overhead.
// Sprint 3 phase-02 Observabilidad (4-03).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Source maps: solo upload si SENTRY_AUTH_TOKEN presente (CI/Dokploy build).
  // Sin token: source maps se generan pero no se suben (errores Sentry mostrarán código minificado).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
  // Sprint 3 Hardening: reemplazo de `disableLogger: true` (deprecated en @sentry/nextjs 10.54.0+).
  // Sentry recomienda mover la opción al árbol webpack.treeshake.
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
