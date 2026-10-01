# Phase C — Doc Admin + Docs Clientes implementation

**Tiempo:** 3-4h
**Bloquea:** Phase D (necesitas las routes y la DB schema para que el agente pueda escribir).
**Dependencias:** Phase B DONE (no crashes en dashboard).

## Objetivo

Implementar DOS páginas nuevas en el dashboard, accesibles desde el sidebar (al final, sin tocar la "Docs" existente):

1. **Doc Admin** (`/dashboard/docs-admin`) — Documentación técnica para administradores de plataforma (Javier, equipo Esden). Cubre: gestión de tenants, deploys, RLS multi-tenant, troubleshooting técnico, debugging, mantenimiento Supabase, etc.
2. **Docs Clientes** (`/dashboard/docs-clientes`) — Documentación para el cliente final (admin de academia). Cubre: cómo usar el CRM día a día — leads, conversaciones, llamadas, campañas, agentes IA — con screenshots y guías paso a paso.

Ambas comparten:

- Shell visual del `/dashboard/docs` actual (sidebar interno + área de contenido + markdown)
- API para servir contenido desde DB
- Schema `help_sections` para almacenar y versionar

Pero tienen contenido y audiencia distintos.

## Decisión arquitectónica: TWO PAGES vs spec original

El spec original [docs/architecture/help-page-spec.md](docs/architecture/help-page-spec.md) propone UNA página con 3 tabs (SuperAdmin / Organization / My Space).

**Decisión del usuario (24-05-2026)**: DOS páginas separadas. Esto:

- Aparece como 2 entradas distintas en sidebar (más visible)
- Permite scope distinto por audiencia
- Mapeo: `Doc Admin` ≈ SuperAdmin scope · `Docs Clientes` ≈ Organization + My Space scope

**Acción**: actualizar el spec para reflejar 2 páginas, mantener el resto del diseño (cards, TOC scroll-spy, status provisional/completada).

## C.1 — Actualizar spec funcional

Editar [docs/architecture/help-page-spec.md](docs/architecture/help-page-spec.md):

- Sección "Ubicación en el producto": cambiar de una ruta a dos:
  - `/dashboard/docs-admin` (Doc Admin) → menú último-1
  - `/dashboard/docs-clientes` (Docs Clientes) → menú último
- Sección "Layout general": mantener el card-based con TOC, pero quitar el bloque de tabs (cada página ya es un scope).
- Sección "Estructura de datos backend": añadir columna `scope` (`admin` | `clientes`) en `help_sections` para distinguir.
- Renombrar las secciones del inventario inicial para que mapeen a las nuevas páginas (mover SuperAdmin→admin, Organization+MySpace→clientes).

## C.2 — Migration BD para `help_sections`

Crear `supabase/migrations/<ts>_create_help_sections.sql`:

```sql
-- Tabla help_sections para Doc Admin + Docs Clientes
CREATE TABLE help_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('admin', 'clientes')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  route_in_app TEXT,                          -- la ruta que documenta, ej. '/dashboard/leads'
  status TEXT NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional', 'completada')),
  brief TEXT,                                  -- 1-2 líneas resumen
  content_markdown TEXT,
  screenshots JSONB DEFAULT '[]'::jsonb,       -- [{url, caption, order}]
  fields_table JSONB DEFAULT '[]'::jsonb,      -- [{name, type, description, valid_values}]
  steps JSONB DEFAULT '[]'::jsonb,             -- [{order, description, screenshot_url}]
  common_cases JSONB DEFAULT '[]'::jsonb,      -- [{title, description}]
  display_order INTEGER DEFAULT 0,
  icon TEXT,                                   -- lucide-react icon name
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by TEXT,                       -- 'help-docs-keeper' u otro autor
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scope, slug)
);

CREATE INDEX idx_help_sections_scope ON help_sections (scope, display_order);
CREATE INDEX idx_help_sections_status ON help_sections (status);
CREATE INDEX idx_help_sections_route ON help_sections (route_in_app);

-- Trigger updated_at
CREATE TRIGGER trg_help_sections_updated_at
  BEFORE UPDATE ON help_sections
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE help_sections ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier user autenticado lee admin O clientes según rol
CREATE POLICY help_sections_select_clientes ON help_sections
  FOR SELECT TO authenticated
  USING (scope = 'clientes');

CREATE POLICY help_sections_select_admin ON help_sections
  FOR SELECT TO authenticated
  USING (
    scope = 'admin' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        (auth.users.app_metadata->>'is_admin')::boolean = true
        OR (auth.users.app_metadata->>'admin')::boolean = true
      )
    )
  );

-- Escritura: solo service_role (el agente help-docs-keeper)
-- (no policy = solo service_role bypassa RLS por defecto)

COMMENT ON TABLE help_sections IS
'Contenido de las páginas /dashboard/docs-admin y /dashboard/docs-clientes. Mantenido por agente help-docs-keeper.';
```

Aplicar en LOCAL:

```bash
npx supabase migration up
```

Aplicar en VPS via REST API (porque no tenemos SSH directo a VPS Postgres):

```bash
SRK="<service_role_key>"
SQL="$(cat supabase/migrations/<ts>_create_help_sections.sql)"
curl -X POST "https://dev.linkstation.ai/supabase/rest/v1/rpc/exec_sql" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(echo "$SQL" | jq -Rs .)}"
```

Si la función `exec_sql` no existe en VPS (esperable), alternativa: ejecutar el SQL via Dokploy Docker terminal (`docker exec supabase-db psql -U supabase_admin -d postgres -f /tmp/m.sql`) — requiere intervención humana en panel Dokploy. Para evitar bloqueo:

- Documentar en `execution-log.md` el SQL exacto a aplicar.
- Continuar con el resto del plan asumiendo que se aplicará al final.
- Al cierre, generar instrucciones claras para el usuario.

## C.3 — API routes

Crear `src/app/api/help-sections/[scope]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ scope: string }> }) {
  const { scope } = await params;
  if (!["admin", "clientes"].includes(scope)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("help_sections")
    .select("*")
    .eq("scope", scope)
    .order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sections: data ?? [] });
}
```

Y `src/app/api/help-sections/[scope]/[slug]/route.ts` para single section.

## C.4 — UI routes

Estrategia: extraer la lógica del actual `/dashboard/docs/page.tsx` en un componente compartido `src/components/docs/HelpPageShell.tsx` que reciba props (`scope`, `apiEndpoint`, etc.) y lo reutilizan las 3 páginas (docs, docs-admin, docs-clientes).

Si extraer es muy invasivo (mucho cambio en el actual), alternativa: clonar el page.tsx 2 veces y vivir con la duplicación temporal (acepta deuda técnica documentada).

**Recomendada**: extraer en shell compartido.

```
src/components/docs/
├── HelpPageShell.tsx          ← nuevo, genérico
├── HelpSectionCard.tsx        ← componente card por sección
├── HelpTOC.tsx                ← TOC sidebar
└── MermaidDiagram.tsx         ← (ya existe)

src/app/dashboard/
├── docs/page.tsx              ← usa HelpPageShell con su DOC_STRUCTURE estática actual
├── docs-admin/page.tsx        ← nuevo: usa HelpPageShell con scope="admin" + apiEndpoint
└── docs-clientes/page.tsx     ← nuevo: usa HelpPageShell con scope="clientes" + apiEndpoint
```

## C.5 — Sidebar entries

Editar [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx). Localizar la entrada "Docs" actual (línea ~169) y añadir DESPUÉS las 2 nuevas:

```typescript
{
  label: "Docs",
  href: "/dashboard/docs",
  icon: <Book className="h-4 w-4" />,
  // ... (existente)
},
{
  label: "Doc Admin",
  href: "/dashboard/docs-admin",
  icon: <ShieldCheck className="h-4 w-4" />,
  adminOnly: true,
},
{
  label: "Docs Clientes",
  href: "/dashboard/docs-clientes",
  icon: <BookOpen className="h-4 w-4" />,
},
```

Si el sidebar lee de un array central, añadir ahí. Si tiene logica `adminOnly`, usar para Doc Admin (sólo admin la ve). Docs Clientes la ve cualquier user autenticado.

## C.6 — Seed contenido inicial mínimo

Crear `scripts/seed-help-sections.ts` que INSERTa contenido placeholder en `help_sections` para LOCAL + VPS:

```typescript
const ADMIN_SECTIONS = [
  {
    scope: "admin",
    slug: "intro",
    title: "Introducción",
    display_order: 1,
    icon: "BookOpen",
    content_markdown: "# Doc Admin\n\nDocumentación técnica para administradores...",
  },
  {
    scope: "admin",
    slug: "tenants",
    title: "Gestión de Tenants",
    display_order: 2,
    icon: "Layers",
    content_markdown: "...",
  },
  {
    scope: "admin",
    slug: "deploy",
    title: "Deploys y CI/CD",
    display_order: 3,
    icon: "Rocket",
    content_markdown: "...",
  },
  {
    scope: "admin",
    slug: "rls",
    title: "RLS Multi-tenant",
    display_order: 4,
    icon: "ShieldCheck",
    content_markdown: "...",
  },
  {
    scope: "admin",
    slug: "troubleshooting",
    title: "Troubleshooting",
    display_order: 5,
    icon: "Activity",
    content_markdown: "...",
  },
];

const CLIENTES_SECTIONS = [
  {
    scope: "clientes",
    slug: "intro",
    title: "Bienvenido",
    display_order: 1,
    icon: "Home",
    content_markdown: "# Hola\n\nEste es tu CRM...",
  },
  {
    scope: "clientes",
    slug: "leads",
    title: "Gestionar Leads",
    display_order: 2,
    icon: "Users",
    content_markdown: "...",
  },
  {
    scope: "clientes",
    slug: "conversaciones",
    title: "Conversaciones WhatsApp",
    display_order: 3,
    icon: "MessageSquare",
    content_markdown: "...",
  },
  {
    scope: "clientes",
    slug: "llamadas",
    title: "Llamadas con IA",
    display_order: 4,
    icon: "Phone",
    content_markdown: "...",
  },
  {
    scope: "clientes",
    slug: "campanas",
    title: "Crear Campañas",
    display_order: 5,
    icon: "Megaphone",
    content_markdown: "...",
  },
  {
    scope: "clientes",
    slug: "metricas",
    title: "Métricas del Negocio",
    display_order: 6,
    icon: "BarChart",
    content_markdown: "...",
  },
];
```

Contenido inicial: que el agente help-docs-keeper amplíe y enriquezca en Phase D. Aquí solo placeholders 1-2 párrafos por sección.

Aplicar LOCAL + VPS.

## Acceptance criteria Phase C

- [ ] Spec actualizado a 2 páginas
- [ ] Migration help_sections aplicada LOCAL + VPS (RLS funcionando: viewer no ve admin sections, admin sí)
- [ ] API routes responden 200 con array de sections
- [ ] Páginas `/dashboard/docs-admin` y `/dashboard/docs-clientes` cargan sin crashes
- [ ] Sidebar muestra ambas entradas (Doc Admin solo para is_admin)
- [ ] Páginas existente `/dashboard/docs` sigue funcionando exactamente igual
- [ ] HelpPageShell reutilizado por las 3 páginas (o duplicación documentada como deuda)
- [ ] Mínimo 5 sections en admin + 6 sections en clientes, con contenido placeholder
- [ ] Tests Playwright smoke: navegar a las 3 docs URLs como admin, ver contenido renderizado
- [ ] Tests Playwright smoke como viewer: ver Docs Clientes OK, redirige al ir a Doc Admin (RLS o middleware)
- [ ] WCAG 2.2 AA: headings jerárquicos correctos (h1→h2→h3), focus visible en navegación TOC, contraste suficiente, `aria-current="page"` en item activo TOC
- [ ] Commit + push: `feat(docs): Doc Admin + Docs Clientes pages with help_sections table`

## Plan de ataque

1. (10 min) Update spec md (C.1)
2. (30 min) Crear migration + aplicar LOCAL + intentar VPS (C.2)
3. (20 min) API routes (C.3)
4. (60-90 min) Extraer HelpPageShell + nuevas page.tsx (C.4)
5. (15 min) Sidebar entries (C.5)
6. (45 min) seed-help-sections.ts + aplicar (C.6)
7. (20 min) Tests + commit + push

## Output

Actualizar `execution-log.md` por cada paso C.X.
