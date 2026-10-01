---
title: "Arquitectura — Capas y Estructura del Proyecto"
date: 2026-05-18
agent: Audit-Structure (Sonnet)
status: observed (sin ejecutar build/tests)
---

# Arquitectura: Capas y Estructura

## Stack tecnológico

| Capa                    | Tecnología                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Framework               | Next.js 16.1.6 (App Router)                                                        |
| UI                      | React 19.2.3                                                                       |
| Lenguaje                | TypeScript 5, ESM                                                                  |
| Base de datos principal | Supabase (`@supabase/supabase-js ^2.97`)                                           |
| ORM                     | **Ninguno** — acceso directo via Supabase JS client y `pg`/`postgres` en scripts   |
| Cola de trabajos        | BullMQ 5.73 + ioredis / redis                                                      |
| IA conversacional       | LangChain (`@langchain/anthropic`, `@langchain/openai`, `@langchain/google-genai`) |
| Agentes de voz          | Retell (`retell-sdk ^5.12`), Ultravox (custom)                                     |
| Almacenamiento objetos  | MinIO (S3-compatible via `@aws-sdk/client-s3`)                                     |
| Estilos                 | Tailwind CSS 4, shadcn/ui, Radix UI                                                |
| Estado cliente          | Zustand 5                                                                          |
| Gráficos                | Recharts 3                                                                         |
| Flow Builder            | `@xyflow/react` (React Flow 12)                                                    |

---

## Responsive breakpoints (Tailwind v4)

Decisión 26-05-2026 (BUG-3-07 fix, Sprint 3): el dashboard usa **`lg:` (1024px)** como punto de cambio entre layout mobile (drawer + hamburger + bottom nav) y desktop (sidebar fija lateral 256px).

| Tailwind  | min-width  | Uso                                                                             |
| --------- | ---------- | ------------------------------------------------------------------------------- |
| `sm:`     | 640px      | Texto inline junto a iconos (`sm:inline`).                                      |
| `md:`     | 768px      | Tipografía + spacing (`md:h-20`, `md:text-base`, `md:px-6`). **NO** estructura. |
| **`lg:`** | **1024px** | **Estructura layout**: sidebar visible / hamburger oculto / bottom nav oculta.  |
| `xl:`     | 1280px     | Ajustes finos opcionales (más columnas en grids).                               |
| `2xl:`    | 1536px     | Cuidado con `max-w-screen-2xl` en containers.                                   |

**Regla absoluta**: visibilidad del shell (sidebar, hamburger, bottom nav, drawer overlay) usa `lg:hidden` / `lg:flex` / `max-lg:*`. Nunca `md:` para estructura.

**Por qué `lg:1024` y no `xl:1280`**: iPad Pro landscape (1194px) y laptops 13"–14" (1366×768, 1440×900) muestran sidebar nativamente. `xl:1280` dejaría tablets y portátiles pequeños en modo "mobile" — incoherente para B2B.

Detalle ampliado + screenshots de validación: [docs/dev-team-handover.md §4.bis](../dev-team-handover.md#4bis-responsive-breakpoints-tailwind-v4) + [docs/screenshots/sprint-3-close/responsive-fix/](../screenshots/sprint-3-close/responsive-fix/).

---

## Árbol de directorios resumido

```
linkstation-dashboard/   # (renombrado desde `linkstation-main` el 2026-05-20)
├── src/
│   ├── app/                          # Next.js App Router — rutas y API
│   │   ├── layout.tsx                # Root layout (ThemeProvider, Inter font)
│   │   ├── page.tsx                  # Redirect a /dashboard
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── callback/route.ts     # OAuth callback Supabase
│   │   │   └── reset-password/
│   │   ├── login/page.tsx
│   │   ├── dashboard/               # Dashboard principal (autenticado)
│   │   │   ├── layout.tsx            # DashboardShell wrapper
│   │   │   ├── page.tsx              # Dashboard / Métricas generales
│   │   │   ├── agents/page.tsx
│   │   │   ├── admin/page.tsx
│   │   │   ├── calendar/page.tsx     # 1466 líneas — candidato a split
│   │   │   ├── calls/page.tsx
│   │   │   ├── campanas/
│   │   │   │   ├── page.tsx
│   │   │   │   └── nuevo/page.tsx
│   │   │   ├── conversaciones/page.tsx
│   │   │   ├── costs/page.tsx
│   │   │   ├── demo/page.tsx
│   │   │   ├── docs/page.tsx
│   │   │   ├── historial/page.tsx    # Resumen Leads
│   │   │   ├── knowledge/page.tsx
│   │   │   ├── logs/page.tsx
│   │   │   ├── minutos/page.tsx
│   │   │   ├── onboarding/page.tsx   # Flow Builder visual
│   │   │   ├── orchestrator/page.tsx
│   │   │   ├── playground/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── IntegrationsManager.tsx
│   │   │   │   └── KpiBuilder.tsx
│   │   │   ├── simulator/page.tsx
│   │   │   ├── voice-agents/
│   │   │   │   ├── page.tsx
│   │   │   │   └── RetellConfigModal.tsx
│   │   │   ├── web-chatbot/page.tsx
│   │   │   └── whatsapp/page.tsx
│   │   ├── api/
│   │   │   ├── admin/tenants/[id]/client-sql/route.ts
│   │   │   ├── calls/manual/route.ts
│   │   │   ├── cron/appointments/reminders/route.ts
│   │   │   ├── docs/content/route.ts
│   │   │   ├── integrations/google/auth/route.ts
│   │   │   ├── integrations/google/callback/route.ts
│   │   │   ├── leads/ingest/route.ts  # ENTRADA principal de leads
│   │   │   ├── orchestration/
│   │   │   │   ├── deploy/route.ts
│   │   │   │   ├── graph/route.ts
│   │   │   │   ├── publish/route.ts
│   │   │   │   ├── sweep/route.ts
│   │   │   │   └── workflows/route.ts
│   │   │   ├── tenant/migrate/route.ts
│   │   │   ├── test/orchestrator/route.ts
│   │   │   └── webhooks/
│   │   │       ├── crm/route.ts
│   │   │       ├── retell/route.ts        # Post-call analysis
│   │   │       ├── retell/tools/route.ts  # Live tool calls (book_appointment, etc.)
│   │   │       ├── whatsapp/route.ts
│   │   │       └── workflow/[workflowId]/[path]/[nodeId]/route.ts
│   │   └── widget/[id]/page.tsx
│   ├── components/
│   │   ├── agents/                   # AI Inbox, Lead Profile
│   │   ├── campanas/                 # CampaignLeadsTable
│   │   ├── charts/                   # DashboardCharts
│   │   ├── dashboard/                # KPI managers, filters
│   │   ├── docs/                     # MermaidDiagram
│   │   ├── historial/                # Lead table, audio player, dialogs
│   │   ├── layout/                   # Sidebar, DashboardShell, Topbar, TenantSelector
│   │   ├── onboarding/               # Flow Builder nodes/canvas
│   │   ├── orchestrator/             # AgentFlowBuilder, selectors
│   │   ├── ui/                       # shadcn/ui primitivos
│   │   └── theme-provider.tsx
│   ├── lib/
│   │   ├── actions/                  # Server Actions (22 archivos) — capa de negocio UI
│   │   ├── auth-config.ts            # ⚠️ Credenciales hardcodeadas
│   │   ├── cache/tenant-cache.ts
│   │   ├── constants/                # schema.ts, kpi-defaults.ts
│   │   ├── core/                     # Orquestador, cola BullMQ, workers
│   │   │   ├── orchestrator.ts       # 1383 líneas — motor principal
│   │   │   ├── intelligence/qualifier.ts
│   │   │   ├── processors/           # 7 processors (WhatsApp, CRM, Calls, etc.)
│   │   │   ├── queue/lead-sequence-queue.ts
│   │   │   └── workers/RescueWorker.ts
│   │   ├── fix-photos.js             # ⚠️ Script de oneshot (mal ubicado)
│   │   ├── integrations/             # Retell, Ultravox, WhatsApp, MinIO, CRM, Zoho
│   │   ├── normalize-leads.js        # ⚠️ Script de oneshot (mal ubicado)
│   │   ├── services/                 # AI, knowledge base, appointments, post-analysis
│   │   ├── supabase/                 # Clients: client.ts, server.ts, tenant-client.ts
│   │   ├── utils/                    # date-filters, timezones, phone-helper
│   │   ├── utils.ts                  # cn(), formatDuration(), formatDate(), pct()
│   │   └── validations/lead.ts       # Zod schema para ingesta
│   ├── scratch/
│   │   └── check_appts_tables.ts     # ⚠️ Script de debugging (debe eliminarse)
│   ├── scripts/                      # 18 scripts de migration/debug (deberían estar en /scripts raíz)
│   ├── store/
│   │   ├── dateRange.ts
│   │   └── tenant.ts
│   └── types/
│       ├── database.ts               # Interfaces principales: Lead, Llamada, etc.
│       └── tenant.ts
├── scripts/                          # Scripts raíz (existe pero vacío)
├── supabase/
│   └── migrations/                   # SQL de migración + client_supabase_schema.sql
├── worker.js                         # Proceso independiente BullMQ
├── next.config.ts
├── tsconfig.json
├── package.json
└── docker-compose.yml / Dockerfile
```

---

## Capas de la aplicación

### Capa 1 — Routing y presentación (`src/app/`)

- **Server Components** por defecto. Las páginas del dashboard son async components que usan Server Actions directamente.
- **Client Components** marcados con `"use client"` — principalmente componentes interactivos (Sidebar, filtros, modals, Flow Builder).
- **API Routes** en `src/app/api/` — endpoints REST para webhooks externos (Retell, WhatsApp, CRM) y para operaciones del orquestador.
- Convención de naming: `page.tsx` para páginas, `route.ts` para API routes, `layout.tsx` para layouts.

### Capa 2 — Componentes UI (`src/components/`)

- Organizados por dominio funcional: `agents/`, `historial/`, `dashboard/`, `layout/`, `orchestrator/`, `onboarding/`.
- `ui/` contiene los primitivos de shadcn/ui (badge, button, card, input, label, separator, skeleton).
- Algunos componentes son muy grandes: `AIAgentInbox.tsx` (1832 líneas), `SummaryManager.tsx` (1465 líneas), `calendar/page.tsx` (1466 líneas), `NodeConfigSidebar.tsx` (1452 líneas) — exceden el límite recomendado de 200 líneas.

### Capa 3 — Acciones de servidor (`src/lib/actions/`)

- 22 archivos de Server Actions. Cada archivo agrupa operaciones por dominio: `calls.ts`, `campanas.ts`, `analytics.ts`, `inbox.ts`, etc.
- Patrón consistente: importan de `lib/supabase/server` para obtener el cliente Supabase y el `tenantId` activo.
- **Violación de capa**: `lead-events.ts` importa `TraceabilityEvent` desde `components/historial/LeadTraceability.tsx`.

### Capa 4 — Núcleo de negocio (`src/lib/core/`)

- **No cubierto en profundidad** en esta fase (pertenece a Fase 2 — Orchestrator).
- El `orchestrator.ts` (1383 líneas) es el motor principal del flujo de leads.
- `intelligence/qualifier.ts` implementa el árbol de decisión de cualificación.
- Procesadores especializados: `WhatsAppWebhookProcessor.ts`, `CRMExportProcessor.ts`, `QualificationProcessor.ts`, etc.
- Cola BullMQ en `queue/lead-sequence-queue.ts`.

### Capa 5 — Servicios de IA (`src/lib/services/`)

- **No cubierto en profundidad** en esta fase (pertenece a Fase 3 — LLM).
- `fact-extractor.ts`, `ai-analysis.ts`, `post-analysis.ts`, `knowledge-base.ts`, `chat-memory.ts`.

### Capa 6 — Integraciones externas (`src/lib/integrations/`)

- `retell.ts`, `ultravox.ts`, `whatsapp.ts`, `zoho.ts`, `minio.ts`.
- CRM: patrón de provider con interface genérica (`crm/interface.ts`, `crm/factory.ts`). Solo implementación: `crm/providers/zoho.ts`.
- Telefónia: `telephony/factory.ts`, `telephony/types.ts`, `telephony/providers/`.

### Capa 7 — Acceso a datos (`src/lib/supabase/`)

- **No cubierto en profundidad** en esta fase (pertenece a Fase 4 — Data).
- `client.ts` — cliente browser.
- `server.ts` — cliente servidor con `getActiveTenantId()`.
- `tenant-client.ts` — cliente dinámico por tenant (para Supabase externo del cliente).
- `tenant-router.ts` — routing de queries al Supabase correcto.

---

## Configuración de paths y aliases

```json
// tsconfig.json paths
{
  "@/*": ["./src/*"]
}
```

Un único alias `@/` que mapea a `src/`. Sin aliases adicionales. Todos los imports internos usan `@/lib/`, `@/components/`, `@/types/`, `@/store/`.

---

## Convenciones observadas

| Convención                    | Estado                                               |
| ----------------------------- | ---------------------------------------------------- |
| App Router (Next.js 14+)      | Sí — `app/` con `layout.tsx`, `page.tsx`, `route.ts` |
| Server Components por defecto | Sí                                                   |
| Server Actions                | Sí — en `src/lib/actions/`                           |
| kebab-case para directorios   | Sí (voice-agents, web-chatbot, campanas)             |
| PascalCase para componentes   | Sí                                                   |
| camelCase para funciones/vars | Sí                                                   |
| Barrel exports (index.ts)     | No — imports directos a archivos                     |
| Un componente por archivo     | Generalmente sí, con excepciones (helpers inline)    |
| Zod para validación de input  | Sí (`lib/validations/lead.ts`) pero solo en ingesta  |

---

## Proceso autónomo: worker.js

El proyecto tiene **dos procesos de runtime**:

1. **Next.js server** — `next start` (puerto 3000) — sirve UI y API routes.
2. **BullMQ Worker** — `node worker.js` — proceso independiente que consume la cola Redis de secuencias de leads.

`worker.js` importa directamente desde `src/lib/core/` usando imports ESM con extensión `.js`. El `docker-compose.yml` orquesta ambos procesos junto con Redis.

---

## Multi-tenancy: modelo de datos

El sistema implementa un modelo multi-tenant con **Supabase propio por cliente**:

- **Supabase central (ESDEN)**: almacena tenants, auth de usuarios del dashboard, configuración.
- **Supabase por tenant**: cada cliente tiene su propio proyecto Supabase con sus tablas de leads, llamadas, etc.
- `tenant-client.ts` crea un cliente Supabase dinámico por tenant usando credenciales almacenadas en la configuración del tenant.
- `tenant-router.ts` decide qué Supabase usar según el tenant activo en la sesión.

---

**Status:** DONE
**Summary:** Estructura documentada desde observación directa del código fuente. Next.js 16 App Router con separación en 7 capas funcionales. El proyecto tiene deuda técnica estructural relevante: ficheros oversized (4 componentes >1400 líneas), ausencia de tests, scripts de oneshot mal ubicados, y violación de capa de importación en `lib/actions`. La arquitectura multi-tenant con Supabase por cliente es sólida en concepto pero carece de guards de seguridad en las credenciales.
