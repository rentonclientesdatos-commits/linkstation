---
title: "Spec funcional — Doc Admin + Docs Clientes"
audience: equipo de desarrollo (uxui + frontend + database + api)
owner_agent: af-agents:help-docs-keeper
date: 20-05-2026
last_revision: 24-05-2026 — split en dos páginas separadas (Doc Admin + Docs Clientes)
status: spec activa
references:
  - .claude/agents/help-docs-keeper.md
  - docs/dev-team-handover.md sección 16
  - plans/260524-1020-doc-agent-empty-states-full/phase-C-doc-pages-implementation.md
---

# Spec funcional — Doc Admin + Docs Clientes

Especificación de las DOS páginas de documentación del dashboard. Mantenidas proactivamente por el agente [`af-agents:help-docs-keeper`](../../.claude/agents/help-docs-keeper.md).

> **Decisión 24-05-2026 (autoexec plan)**: el spec original proponía UNA página con 3 tabs (SuperAdmin / Organization / My Space). El usuario optó por **DOS páginas separadas** para mayor visibilidad en sidebar y separación clara de audiencias. El layout interno (cards + TOC scroll-spy + estados provisional/completada) se mantiene en cada página.

> **Inspiración visual**: layout tipo "help dev portal" con sidebar TOC + contenido en scroll vertical. Estilo coherente con el dashboard actual de linkstation (dark theme, accent indigo/violet para admin, accent emerald/teal para clientes).

---

## 1. Ubicación en el producto

| Página            | Ruta                       | Audiencia                                                                                    | Acceso                              |
| ----------------- | -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Doc Admin**     | `/dashboard/docs-admin`    | Roles plataforma (Javier HP, equipo Esden) y admins de tenant que necesiten material técnico | Sólo `app_metadata.is_admin = true` |
| **Docs Clientes** | `/dashboard/docs-clientes` | Admin del tenant cliente final + cualquier usuario autenticado del CRM                       | Cualquier sesión autenticada        |

- **Menú lateral**: dos entradas separadas al final del sidebar, debajo de la entrada `Docs` existente (no se quita la actual). `Doc Admin` lleva el icono `ShieldCheck`, `Docs Clientes` lleva `BookOpen`.
- **`Doc Admin` cubre** el scope SuperAdmin original. **`Docs Clientes` cubre** los scopes Organization + My Space del spec antiguo.

---

## 2. Layout general

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ [Sidebar lateral fija]      │   ← Header: "Help — SuperAdmin"                  │
│ - Content Hub               │      "Full platform administration for AutomaticFlow"
│ - Campaigns                 │   ─────────────────────────────────────────────  │
│ - Reports                   │   [Tabs:  SuperAdmin │ Organization │ My Space]   │
│ - Modules                   │                                                   │
│ - Bases de Datos            │   ┌────────────────────────────┬──────────────┐ │
│ - Servidores                │   │ Sección actual seleccionada │  ON THIS PAGE│ │
│ - Configuración             │   │                            │              │ │
│ - Sistema                   │   │ [Card por sección]         │  ▸ Dashboard │ │
│ - ...                       │   │  ┌────────────────────┐    │  ▸ Users     │ │
│ ─────                       │   │  │ 🎯 Dashboard       │    │  ▸ Organiz.. │ │
│ - Help [bottom, último]     │   │  │ Brief description  │    │  ▸ Roles     │ │
│                             │   │  │ [Screenshot grande]│    │  ▸ ...       │ │
│                             │   │  │ Step-by-step + ... │    │              │ │
│                             │   │  └────────────────────┘    │              │ │
│                             │   │  ┌────────────────────┐    │              │ │
│                             │   │  │ 👥 Users           │    │              │ │
│                             │   │  │ ...                │    │              │ │
│                             │   │  └────────────────────┘    │              │ │
│                             │   │  ...                       │              │ │
│                             │   └────────────────────────────┴──────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Tres tabs (scopes) en el header

| Tab              | Audiencia                               | Contenido                                                                                                                             |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **SuperAdmin**   | Roles plataforma (Javier, equipo Esden) | Administración global: tenants, usuarios cross-tenant, app catalog, AI proxy, audit log, sponsors, developers, settings de plataforma |
| **Organization** | Admin del tenant (centro de formación)  | Gestión de su organización: equipo, miembros, configuración tenant, integraciones CRM, agentes IA, knowledge base, campañas           |
| **My Space**     | Cualquier usuario autenticado           | Su propio perfil, preferencias, notificaciones, ayuda personal                                                                        |

Cada tab tiene **su propia lista de secciones** y su propio TOC.

### Sección — estructura interna

Cada sección renderiza como una **card** vertical con:

```
┌──────────────────────────────────────────────────────────┐
│ <Icono> <Título sección>                       🟢/🟡    │  ← Estado: Completada/Provisional
│ <Brief description — 1-2 líneas>                          │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │  [Screenshot principal de la sección — borde       │   │
│ │   verde si quieres destacarlo como en el ejemplo]   │   │
│ └────────────────────────────────────────────────────┘   │
│  <Caption del screenshot>                                  │
│                                                            │
│ ## Qué se hace aquí                                       │
│ <Descripción ampliada>                                    │
│                                                            │
│ ## Campos / datos                                         │
│ │ Campo │ Tipo │ Para qué │ Valores válidos │           │
│ │ ----- │ ---- │ -------- │ --------------- │           │
│                                                            │
│ ## Guía paso a paso                                       │
│ 1. <Paso 1>                                               │
│    [Screenshot intermedio si la pantalla cambia]          │
│ 2. <Paso 2>                                               │
│ ...                                                        │
│                                                            │
│ ## Casos comunes                                          │
│ - <Caso 1>                                                │
│ - <Caso 2>                                                │
└──────────────────────────────────────────────────────────┘
```

### TOC (right sidebar) — "ON THIS PAGE"

- Lista vertical de secciones del tab actual.
- Click sobre item → scroll suave al ancla de esa sección (`<a href="#section-slug">`).
- Item activo se highlightea según scroll position (scroll spy estándar).
- Estilo coherente con el dashboard (dark theme + accent color).

---

## 3. Secciones a documentar — inventario inicial

> Esta lista es **dinámica**. El agente `help-docs-keeper` añade/quita secciones automáticamente cuando se añaden páginas al admin. Estado inicial al cierre de Sprint WCAG será 🟡 Provisional para todas — pasan a 🟢 Completada una a una al cerrar cada sprint que toca esa sección.

### Tab "SuperAdmin"

| #   | Sección       | slug                       | Estado inicial | Notas                      |
| --- | ------------- | -------------------------- | -------------- | -------------------------- |
| 1   | Dashboard     | `superadmin-dashboard`     | 🟡 Provisional | Vista general plataforma   |
| 2   | Users         | `superadmin-users`         | 🟡 Provisional | Gestión global usuarios    |
| 3   | Organizations | `superadmin-organizations` | 🟡 Provisional | Tenants                    |
| 4   | Roles         | `superadmin-roles`         | 🟡 Provisional | RBAC plataforma            |
| 5   | App Templates | `superadmin-app-templates` | 🟡 Provisional |                            |
| 6   | App Catalog   | `superadmin-app-catalog`   | 🟡 Provisional |                            |
| 7   | Developers    | `superadmin-developers`    | 🟡 Provisional | Acceso API                 |
| 8   | Sponsors      | `superadmin-sponsors`      | 🟡 Provisional |                            |
| 9   | Audit Log     | `superadmin-audit-log`     | 🟡 Provisional | Cross-tenant audit         |
| 10  | Menus         | `superadmin-menus`         | 🟡 Provisional | Personalización menú       |
| 11  | AI Proxy      | `superadmin-ai-proxy`      | 🟡 Provisional | Proxy LLM costes           |
| 12  | Settings      | `superadmin-settings`      | 🟡 Provisional | Config plataforma          |
| 13  | Shortcuts     | `superadmin-shortcuts`     | 🟡 Provisional | Atajos teclado             |
| 14  | FAQ           | `superadmin-faq`           | 🟡 Provisional | Preguntas frecuentes admin |

### Tab "Organization"

| #   | Sección                  | slug                   | Estado inicial | Notas                            |
| --- | ------------------------ | ---------------------- | -------------- | -------------------------------- |
| 1   | Dashboard Org            | `org-dashboard`        | 🟡 Provisional | KPIs del tenant                  |
| 2   | Equipo                   | `org-team`             | 🟡 Provisional | Miembros del tenant              |
| 3   | Leads                    | `org-leads`            | 🟡 Provisional | Cualificación + cadencia         |
| 4   | Llamadas                 | `org-calls`            | 🟡 Provisional | Retell + Ultravox                |
| 5   | Agentes IA               | `org-ai-agents`        | 🟡 Provisional | Virginia + variants              |
| 6   | Knowledge Base           | `org-knowledge-base`   | 🟡 Provisional | Contenido para agentes IA        |
| 7   | Integraciones CRM        | `org-integrations-crm` | 🟡 Provisional | HubSpot + Zoho (Fase 2)          |
| 8   | Programas                | `org-programs`         | 🟡 Provisional | Cursos y reglas de cualificación |
| 9   | Configuración del tenant | `org-settings`         | 🟡 Provisional |                                  |

### Tab "My Space"

| #   | Sección          | slug               | Estado inicial | Notas             |
| --- | ---------------- | ------------------ | -------------- | ----------------- |
| 1   | Mi perfil        | `me-profile`       | 🟡 Provisional |                   |
| 2   | Notificaciones   | `me-notifications` | 🟡 Provisional |                   |
| 3   | Preferencias UI  | `me-preferences`   | 🟡 Provisional | Idioma, tema, etc |
| 4   | Sesiones activas | `me-sessions`      | 🟡 Provisional | Seguridad cuenta  |

---

## 4. Modelo de datos (Supabase)

Schema sugerido — a confirmar con `af-agents:database` al planificar implementación.

### Tabla `help_sections`

```sql
CREATE TABLE help_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           TEXT NOT NULL CHECK (scope IN ('superadmin', 'organization', 'my_space')),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  icon            TEXT,                           -- lucide icon name (eg. 'layout-grid')
  brief           TEXT NOT NULL,                  -- 1-2 líneas
  route_in_app    TEXT,                           -- ruta /admin/... que documenta esta sección
  content_md      TEXT NOT NULL,                  -- markdown del cuerpo principal
  order_position  INT NOT NULL DEFAULT 999,       -- orden de aparición en su scope
  status          TEXT NOT NULL DEFAULT 'provisional'
                  CHECK (status IN ('provisional', 'completada')),
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by TEXT,                          -- 'help-docs-keeper' o usuario
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_sections_scope_order ON help_sections(scope, order_position);
CREATE INDEX idx_help_sections_status ON help_sections(status);

-- RLS: lectura libre para autenticados, escritura sólo SUPERADMIN o sistema
-- (help-docs-keeper escribe vía service_role en background job, NO desde el cliente)
ALTER TABLE help_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "help_sections_read_authenticated" ON help_sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "help_sections_write_superadmin" ON help_sections
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'superadmin')
  WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'superadmin');
```

### Tabla `help_screenshots`

```sql
CREATE TABLE help_screenshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES help_sections(id) ON DELETE CASCADE,
  storage_url     TEXT NOT NULL,                  -- Supabase Storage bucket 'help-screenshots/'
  caption         TEXT,
  is_main         BOOLEAN NOT NULL DEFAULT false, -- screenshot principal vs paso intermedio
  step_number     INT,                            -- si es screenshot de un paso de la guía
  order_position  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_screenshots_section ON help_screenshots(section_id, order_position);
```

### Tabla `help_fields` (campos documentados por sección)

```sql
CREATE TABLE help_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES help_sections(id) ON DELETE CASCADE,
  field_name      TEXT NOT NULL,
  field_type      TEXT NOT NULL,                  -- text, number, email, enum, etc
  description     TEXT NOT NULL,
  valid_values    JSONB,                          -- array si enum, rango si number
  required        BOOLEAN NOT NULL DEFAULT false,
  order_position  INT NOT NULL DEFAULT 0
);
```

### Tabla `help_steps` (guía paso a paso)

```sql
CREATE TABLE help_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES help_sections(id) ON DELETE CASCADE,
  step_number     INT NOT NULL,
  description     TEXT NOT NULL,
  screenshot_id   UUID REFERENCES help_screenshots(id) ON DELETE SET NULL,
  expected_result TEXT,
  order_position  INT NOT NULL DEFAULT 0
);
```

---

## 5. Endpoints API (Next.js App Router)

| Método | Endpoint                              | Función                                             | Auth            |
| ------ | ------------------------------------- | --------------------------------------------------- | --------------- |
| GET    | `/api/help/sections?scope=superadmin` | Listar secciones del scope ordenadas                | authenticated   |
| GET    | `/api/help/sections/[slug]`           | Detalle de una sección con screenshots+fields+steps | authenticated   |
| POST   | `/api/help/sections`                  | Crear sección                                       | superadmin only |
| PATCH  | `/api/help/sections/[id]`             | Actualizar sección o cambiar estado                 | superadmin only |
| POST   | `/api/help/screenshots`               | Subir screenshot (multipart, va a Supabase Storage) | superadmin only |
| DELETE | `/api/help/sections/[id]`             | Eliminar sección                                    | superadmin only |

> **El agente `help-docs-keeper` accede vía `service_role` desde un job programado**, no desde el cliente. Esto evita exponer escritura desde el frontend.

---

## 6. Componentes UI (React + Tailwind)

Componentes a crear, delegados a `af-agents:uxui`:

| Componente              | Path sugerido                                 | Función                                       |
| ----------------------- | --------------------------------------------- | --------------------------------------------- |
| `<HelpPage>`            | `src/app/admin/help/page.tsx`                 | Página raíz con tabs                          |
| `<HelpScopeTabs>`       | `src/components/help/HelpScopeTabs.tsx`       | Tabs superiores                               |
| `<HelpSectionList>`     | `src/components/help/HelpSectionList.tsx`     | Lista vertical de secciones del scope activo  |
| `<HelpSectionCard>`     | `src/components/help/HelpSectionCard.tsx`     | Card individual de sección                    |
| `<HelpTableOfContents>` | `src/components/help/HelpTableOfContents.tsx` | TOC lateral derecho con scroll spy            |
| `<HelpStatusBadge>`     | `src/components/help/HelpStatusBadge.tsx`     | Badge 🟡 Provisional / 🟢 Completada          |
| `<HelpScreenshot>`      | `src/components/help/HelpScreenshot.tsx`      | Imagen con caption, lazy load, lightbox click |

Estilo: hereda del design system actual del dashboard (dark theme, accent verde/cyan, bordes redondeados, mismas familias tipográficas y spacing tokens).

---

## 7. Accesibilidad — requisitos WCAG 2.2 AA

Obligatorio antes de cerrar la sección como 🟢:

- TOC navegable por teclado (Tab/Shift+Tab, Enter activa link).
- Secciones con `<section>` semántico + `<h2>` correctos.
- Screenshots con `alt` descriptivo (NO sólo "screenshot").
- Scroll spy con `aria-current="location"` en el item activo.
- Focus ring visible en cualquier elemento interactivo.
- Contraste de texto ≥ 4.5:1 en TODO el contenido.
- Skip link "Saltar a contenido" sobre la página.

---

## 8. Coordinación con agentes — workflow de mantenimiento

```
┌─────────────────────────────────────────────────────────────┐
│ Trigger: cierre sprint sobre sección X                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                 ┌──────────────────┐
                 │ manager invoca   │
                 │ help-docs-keeper │
                 └────────┬─────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Verifica tests   │    │ Verifica bugs    │
    │ via testing      │    │ abiertos = 0     │
    └────────┬─────────┘    └────────┬─────────┘
             │                       │
             └───────────┬───────────┘
                         ▼
              ┌─────────────────────┐
              │ Playwright snapshot │
              │ de la sección       │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Update screenshots  │
              │ + content_md        │
              │ + steps             │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ status: completada  │
              │ last_reviewed_at: . │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Reporta al manager  │
              └─────────────────────┘
```

---

## 9. Tareas pendientes de planificar

| Cuándo                                             | Qué                                                      | Quién              |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------ |
| Sprint 2 o 3 (cuando el equipo de UX tenga ciclos) | Diseño UI definitivo de la página + componentes          | `uxui`             |
| Sprint 2 o 3                                       | Implementación de schema BD + endpoints API              | `database` + `api` |
| Sprint 2 o 3                                       | Implementación de componentes React                      | `uxui` + `code`    |
| Cada cierre de sprint (a partir de Sprint WCAG)    | `help-docs-keeper` corre y actualiza secciones afectadas | `help-docs-keeper` |

---

**Última actualización**: 20-05-2026.
**Mantenedor**: `af-agents:help-docs-keeper`.
