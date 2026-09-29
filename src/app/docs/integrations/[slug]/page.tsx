// Sprint 4 (BUG-4-07) — Renderiza las guías de integración en markdown
// (docs/integrations/<slug>.md) como páginas públicas /docs/integrations/<slug>.
//
// Sprint 5 (08-06-2026) — Rediseño visual: en vez de un `prose` plano (que ni
// siquiera estaba activo, no hay plugin @tailwindcss/typography), mapeamos cada
// elemento markdown a componentes con estilos de marca (tokens globals.css:
// primary, accent, gradientes, dark mode). Así TODAS las guías .md de
// docs/integrations heredan un diseño bonito y claro sin duplicar HTML.
//
// El wizard de Google Sheets y el cliente de Zoho enlazan aquí
// ("Ver guía paso a paso"). Esta ruta es genérica: sirve cualquier .md de
// docs/integrations sin crear una página por guía.

import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GuideMarkdown } from "./guide-markdown";

// El contenido vive en el repo; revalidar no aplica (estático por build/dev).
export const dynamic = "force-static";

// Títulos legibles + subtítulo por guía conocida (para la cabecera con gradiente).
const GUIDE_META: Record<string, { title: string; subtitle: string; badge: string }> = {
  "zoho-webhook-manual": {
    title: "Conectar Zoho CRM",
    subtitle:
      "Recibe tus leads de Zoho en el dashboard, en segundos, mediante un Webhook de Workflow.",
    badge: "Integración · Zoho CRM",
  },
  "google-sheets-setup-tenant": {
    title: "Conectar Google Sheets",
    subtitle:
      "Usa una hoja de cálculo de Google como tu CRM: las filas nuevas se convierten en leads automáticamente.",
    badge: "Integración · Google Sheets",
  },
  "hubspot-app-setup": {
    title: "Conectar HubSpot",
    subtitle: "Guía de configuración de la app de HubSpot para sincronizar leads con el dashboard.",
    badge: "Integración · HubSpot",
  },
};

function resolveGuidePath(slug: string): string | null {
  // Anti path-traversal: solo kebab-case + dígitos.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const candidates = [
    path.join(process.cwd(), "docs", "integrations", `${slug}.md`),
    path.join(
      process.cwd(),
      "Automatiza-Formacion-DashBoard-developer",
      "docs",
      "integrations",
      `${slug}.md`
    ),
    path.resolve(__dirname, "..", "..", "..", "..", "docs", "integrations", `${slug}.md`),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function generateStaticParams() {
  return [
    { slug: "zoho-webhook-manual" },
    { slug: "google-sheets-setup-tenant" },
    { slug: "hubspot-app-setup" },
  ];
}

// Quita el primer "# Título" del markdown: ya lo mostramos en la cabecera grande.
function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+.*(\r?\n)+/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = GUIDE_META[slug];
  return { title: meta ? `${meta.title} · Guía` : "Guía de integración" };
}

export default async function IntegrationGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filePath = resolveGuidePath(slug);
  if (!filePath) notFound();

  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    notFound();
  }
  const content = stripLeadingH1(raw);
  const meta = GUIDE_META[slug] ?? {
    title: "Guía de integración",
    subtitle: "",
    badge: "Integración",
  };

  return (
    <main className="bg-background min-h-screen pb-20">
      {/* ── Cabecera con gradiente de marca ─────────────────────────── */}
      <header className="bg-grad-primary relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25), transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pt-10 pb-12">
          <Link
            href="/dashboard/settings/integrations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Volver a Integraciones
          </Link>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase ring-1 ring-white/25 backdrop-blur ring-inset">
            {meta.badge}
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {meta.title}
          </h1>
          {meta.subtitle && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/90">
              {meta.subtitle}
            </p>
          )}
        </div>
      </header>

      {/* ── Cuerpo de la guía ───────────────────────────────────────── */}
      <article className="mx-auto -mt-6 max-w-3xl px-6">
        <div className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={GuideMarkdown}>
            {content}
          </ReactMarkdown>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          Automatiza Formación · Guía de integración
        </p>
      </article>
    </main>
  );
}
