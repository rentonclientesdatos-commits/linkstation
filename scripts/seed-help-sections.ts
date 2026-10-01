/**
 * Seed help_sections — Doc Admin + Docs Clientes
 *
 * Carga contenido placeholder inicial en las dos páginas de documentación
 * (`/dashboard/docs-admin` y `/dashboard/docs-clientes`). El agente
 * help-docs-keeper enriquecerá cada sección posteriormente.
 *
 * Uso:
 *   npx tsx scripts/seed-help-sections.ts
 *
 * Variables opcionales:
 *   SEED_HELP_TARGET=local|vps  (default: local)
 *     - local: usa NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de .env.local
 *     - vps:   usa SEED_VPS_SUPABASE_URL / SEED_VPS_SERVICE_ROLE_KEY (export antes de correr)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const TARGET = (process.env.SEED_HELP_TARGET ?? "local").toLowerCase();

const SUPABASE_URL =
  TARGET === "vps" ? process.env.SEED_VPS_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_KEY =
  TARGET === "vps" ? process.env.SEED_VPS_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    `[seed-help-sections] Faltan credenciales (target=${TARGET}). ` +
      `Para local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. ` +
      `Para vps: SEED_VPS_SUPABASE_URL + SEED_VPS_SERVICE_ROLE_KEY.`
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface HelpSectionSeed {
  scope: "admin" | "clientes";
  slug: string;
  title: string;
  display_order: number;
  icon: string;
  route_in_app: string | null;
  brief: string;
  content_markdown: string;
}

const ADMIN_SECTIONS: HelpSectionSeed[] = [
  {
    scope: "admin",
    slug: "intro",
    title: "Introducción",
    display_order: 1,
    icon: "BookOpen",
    route_in_app: "/dashboard",
    brief: "Bienvenida y mapa de la documentación técnica.",
    content_markdown:
      "# Doc Admin\n\nDocumentación técnica para administradores de plataforma del dashboard de LinkStation.\n\nAquí encontrarás cómo gestionar tenants, deploys, RLS multi-tenant, troubleshooting y mantenimiento general.",
  },
  {
    scope: "admin",
    slug: "tenants",
    title: "Gestión de Tenants",
    display_order: 2,
    icon: "Layers",
    route_in_app: "/dashboard/admin",
    brief: "Alta, baja y administración de organizaciones cliente.",
    content_markdown:
      "## Gestión de Tenants\n\nCada academia es un tenant independiente con RLS aplicada a todas sus tablas.\n\nDesde el panel admin puedes:\n\n- Crear nuevos tenants.\n- Vincular usuarios admin a su tenant.\n- Configurar flags por tenant (orquestador, integraciones, límites).",
  },
  {
    scope: "admin",
    slug: "deploy",
    title: "Deploys y CI/CD",
    display_order: 3,
    icon: "Rocket",
    route_in_app: null,
    brief: "Pipeline de despliegue de developer → staging → main.",
    content_markdown:
      "## Deploys\n\nEl flujo es `feature/* → developer (autodeploy dev.dash) → staging → main (producción)`. Cada push a `developer` dispara rebuild Dokploy en el VPS.\n\nLas migraciones SQL se aplican manualmente vía `npx supabase migration up` (local) o `docker exec -i supabase-db psql -U postgres -d postgres < migration.sql` (VPS).",
  },
  {
    scope: "admin",
    slug: "rls",
    title: "RLS Multi-tenant",
    display_order: 4,
    icon: "ShieldCheck",
    route_in_app: null,
    brief: "Aislamiento de datos por tenant: políticas RLS activas.",
    content_markdown:
      "## RLS Multi-tenant\n\nTodas las tablas con `tenant_id` tienen RLS habilitada. Los policies filtran por `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` para usuarios autenticados.\n\nEl `service_role` bypassa RLS — sólo lo usan endpoints server-side y jobs.\n\nVer migraciones `supabase/migrations/*rls*`.",
  },
  {
    scope: "admin",
    slug: "troubleshooting",
    title: "Troubleshooting",
    display_order: 5,
    icon: "Activity",
    route_in_app: "/dashboard/logs",
    brief: "Diagnóstico de incidencias frecuentes.",
    content_markdown:
      "## Troubleshooting\n\nIncidencias frecuentes:\n\n- **Login no funciona**: revisar `auth.users.app_metadata` (debe tener `is_admin: true` para usuarios admin).\n- **Schema cache stale**: ejecutar `NOTIFY pgrst, 'reload schema';` en Postgres.\n- **Build VPS falla**: revisar logs Dokploy y env vars NEXT_PUBLIC_*.\n- **Orchestrator 403**: setear `tenants.config.test_orchestrator_enabled = true` para ese tenant.",
  },
];

const CLIENTES_SECTIONS: HelpSectionSeed[] = [
  {
    scope: "clientes",
    slug: "intro",
    title: "Bienvenido",
    display_order: 1,
    icon: "Home",
    route_in_app: "/dashboard",
    brief: "Cómo empezar a usar tu CRM.",
    content_markdown:
      "# Bienvenido a tu CRM\n\nEste es tu panel de control unificado para gestionar leads, conversaciones, llamadas, campañas y métricas.\n\nUsa el menú lateral para navegar entre secciones. Esta documentación se actualiza automáticamente con cada cambio en la plataforma.",
  },
  {
    scope: "clientes",
    slug: "leads",
    title: "Gestionar Leads",
    display_order: 2,
    icon: "Users",
    route_in_app: "/dashboard/historial",
    brief: "Cómo crear, segmentar y trabajar con tus leads.",
    content_markdown:
      "## Gestionar Leads\n\nUn lead representa una persona interesada en uno de tus programas formativos.\n\nDesde **Resumen Leads** puedes:\n\n- Ver el listado con filtros por segmentación, estado y origen.\n- Crear leads manualmente.\n- Asignar un agente IA.\n- Cambiar la segmentación (PUESTO 1, REVISADO, CUALIFICADO, SIN INTERÉS).",
  },
  {
    scope: "clientes",
    slug: "conversaciones",
    title: "Conversaciones WhatsApp",
    display_order: 3,
    icon: "MessageSquare",
    route_in_app: "/dashboard/conversaciones",
    brief: "Bandeja unificada de chats con leads.",
    content_markdown:
      "## Conversaciones\n\nLa bandeja muestra todos los chats activos. Puedes:\n\n- Pausar o reactivar la IA por lead.\n- Enviar mensajes manuales o templates de WhatsApp.\n- Ver el historial completo y las variables capturadas.\n- Vaciar el historial o borrar el lead si es necesario.",
  },
  {
    scope: "clientes",
    slug: "llamadas",
    title: "Llamadas con IA",
    display_order: 4,
    icon: "Phone",
    route_in_app: "/dashboard/calls",
    brief: "Llamadas automatizadas y supervisión.",
    content_markdown:
      "## Llamadas con IA\n\nLas llamadas se ejecutan vía agentes Retell o Ultravox.\n\nDesde la sección Llamadas verás:\n\n- Histórico de llamadas con duración, resultado y transcripción.\n- Métricas de tasa de respuesta y conversión.\n- Acceso a la grabación cuando esté disponible.",
  },
  {
    scope: "clientes",
    slug: "campanas",
    title: "Crear Campañas",
    display_order: 5,
    icon: "Megaphone",
    route_in_app: "/dashboard/campanas/nuevo",
    brief: "Diseña secuencias multi-canal para captar leads.",
    content_markdown:
      "## Campañas\n\nUna campaña agrupa una secuencia de pasos automatizados (llamada → WhatsApp → recordatorio → re-intento).\n\nDesde el Constructor puedes:\n\n- Crear una campaña nueva.\n- Configurar la audiencia (orígenes y segmentos).\n- Editar el flujo paso a paso.\n- Activar / pausar la campaña.",
  },
  {
    scope: "clientes",
    slug: "metricas",
    title: "Métricas del Negocio",
    display_order: 6,
    icon: "BarChart3",
    route_in_app: "/dashboard",
    brief: "Indicadores clave de conversión y volumen.",
    content_markdown:
      "## Métricas\n\nEl dashboard agrega los datos en cards y gráficos:\n\n- **Llamadas**: minutos consumidos, ratio contactado, conversión.\n- **WhatsApp**: tasa de respuesta, plantillas más usadas.\n- **Histórico**: evolución día/semana/mes.\n\nUsa los filtros de fecha para acotar el rango.",
  },
];

async function upsertSection(s: HelpSectionSeed): Promise<"created" | "updated" | "skipped"> {
  const { data: existing } = await admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("help_sections" as any)
    .select("id, status")
    .eq("scope", s.scope)
    .eq("slug", s.slug)
    .maybeSingle();

  if (existing) {
    // Sólo actualizamos placeholders provisionales; respetamos contenido humanizado.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = existing as any;
    if (row.status === "completada") return "skipped";
    const { error } = await admin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("help_sections" as any)
      .update({
        title: s.title,
        display_order: s.display_order,
        icon: s.icon,
        route_in_app: s.route_in_app,
        brief: s.brief,
        content_markdown: s.content_markdown,
        last_reviewed_by: "seed-help-sections",
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      console.error(`  fail update ${s.scope}/${s.slug}: ${error.message}`);
      return "skipped";
    }
    return "updated";
  }

  const { error } = await admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("help_sections" as any)
    .insert({
      scope: s.scope,
      slug: s.slug,
      title: s.title,
      display_order: s.display_order,
      icon: s.icon,
      route_in_app: s.route_in_app,
      brief: s.brief,
      content_markdown: s.content_markdown,
      status: "provisional",
      last_reviewed_by: "seed-help-sections",
      last_reviewed_at: new Date().toISOString(),
    });
  if (error) {
    console.error(`  fail insert ${s.scope}/${s.slug}: ${error.message}`);
    return "skipped";
  }
  return "created";
}

async function main() {
  console.log(`\n[seed-help-sections] target=${TARGET} url=${SUPABASE_URL}\n`);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const s of [...ADMIN_SECTIONS, ...CLIENTES_SECTIONS]) {
    const result = await upsertSection(s);
    const tag =
      result === "created" ? "✚ created" : result === "updated" ? "↻ updated" : "✕ skipped";
    console.log(`  ${tag.padEnd(11)} ${s.scope}/${s.slug} — ${s.title}`);
    if (result === "created") created++;
    if (result === "updated") updated++;
    if (result === "skipped") skipped++;
  }
  console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
