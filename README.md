# LinkStation

> **Versión:** v0.8.0 &nbsp;·&nbsp; **Actualizado:** 2026-06-13 14:30 UTC

AI CRM + Workflow Orchestrator SaaS multi-tenant. Plataforma integral de gestión de llamadas IA, agendamiento y contactabilidad para cualquier tipo de negocio.

---

## Stack tecnológico

| Capa                         | Tecnología                                    |
| ---------------------------- | --------------------------------------------- |
| Frontend / SSR               | Next.js 16 + React 19 + Tailwind CSS          |
| Base de datos                | PostgreSQL vía Supabase self-hosted (Dokploy) |
| Autenticación + multi-tenant | `@supabase/ssr` + RLS por tenant              |
| Validaciones                 | Zod + Repository pattern                      |
| Colas / workers              | BullMQ + Redis                                |
| IA conversacional            | LangChain (Anthropic + OpenAI + Google Genai) |
| Voz                          | Retell + Ultravox                             |
| CRMs MVP                     | HubSpot + Zoho CRM                            |

---

## Quick Start (desarrollo local)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url> linkstation
cd linkstation
git checkout developer

# 2. Variables de entorno
cp .env.example .env.local
# Edita .env.local con valores reales (pedir al lead por canal seguro)

# 3. Instalar dependencias
npm install

# 4. Arrancar servidor de desarrollo
npm run dev
```

> Requisitos: Node.js 22.x LTS · npm 10.x · Git 2.40+ · Docker Desktop (PostgreSQL local)
>
> Lee [`docs/dev-onboarding.md`](docs/dev-onboarding.md) para setup completo, acceso a secretos y flujo de ramas.

---

## Estructura del proyecto (resumida)

```
linkstation/
├── src/                    # Código fuente (Next.js App Router)
│   ├── app/                # Rutas y API routes
│   ├── lib/                # Lógica de negocio, repositories, schemas Zod
│   └── components/         # Componentes React reutilizables
├── supabase/               # Migraciones SQL y seeds
│   └── migrations/
├── scripts/                # Scripts de utilidad (promote, generate-readmes)
│   └── readme-templates/   # Plantillas para los 3 README.md por rama
├── public/                 # Assets estáticos
├── .env.example            # Template de variables de entorno
└── package.json
```

---

## RoadMap

> Fuente: `plans/RoadMap.md` · Actualizado: 2026-06-13 14:30 UTC

### Fase 0 — Sprint 0: Hotfixes de seguridad

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-1 |
| Versión objetivo | v0.1.0 |
| Estado | 🟡 En Desarrollo (25/26 dev a 🔵 · 2 diferidas pre-deploy · … _ver nota↓_ |
| Estimación total | ~107h 30min (11 días lab × 10h) |
| Rama sugerida | feature/sp-0-sprint-0-hotfixes (pushed origin 22-05-2026 … _ver nota↓_ |

#### Bloque 1.1 — Orquestador BullMQ (bloqueante de cadencia)

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 0-00 | Setup Playwright local + baseline tests E2E (devDependency … _ver nota↓_ | 4h | 🔵 Subida rama |
| 0-01 | Setup pre-push hooks (Husky/lefthook) — typecheck + lint + … _ver nota↓_ | 3h | 🔵 Subida rama |
| 1-01 | Fix `worker.js:58` firma incorrecta `executeSequenceStep` … _ver nota↓_ | 4h | 🔵 Subida rama |
| 1-02 | Fix `enqueueLeadStep` — quitar silenciado errores Redis (j … _ver nota↓_ | 3h | 🔵 Subida rama |

#### Bloque 1.2 — Secretos y credenciales

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 1-03 | Rotar JWTs comprometidos en Supabase (anon + service_role) | 2h | 🟡 En Desarrollo |
| 1-04 | Quitar JWTs hardcodeados de 10 puntos del código fuente | 6h | 🔵 Subida rama |
| 1-05 | Cambio password Postgres default `postgres:postgres` | 1h | 🟡 En Desarrollo |
| 1-06 | Crear usuario Postgres `app_user` con permisos limitados ( … _ver nota↓_ | 3h | 🔵 Subida rama |

#### Bloque 1.3 — Endpoints sin autenticación

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 1-07 | Auth en endpoints orquestación user-driven (deploy, graph, … _ver nota↓_ | 8h | 🔵 Subida rama |
| 1-08 | Auth en cron endpoints (sweep + cron/appointments/reminders) | 4h | 🔵 Subida rama |
| 1-09 | Guard condicional `tenants.config.test*orchestrator_enable … \_ver nota↓* | 2h | 🔵 Subida rama |
| 1-10 | Cerrar `/api/admin/tenants/[id]/client-sql` (descarga SQL … _ver nota↓_ | 2h | 🔵 Subida rama |
| 1-11 | Cerrar `/api/tenant/migrate` GET (sirve MIGRATION*SQL comp … \_ver nota↓* | 1h | 🔵 Subida rama |

#### Bloque 1.4 — Webhooks y firmas

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 1-12 | Validación firma webhook Retell | 4h | 🔵 Subida rama |
| 1-13 | Validación firma Retell **tools** (cancelar/agendar citas) | 6h | 🔵 Subida rama |
| 1-14 | Validación HMAC WhatsApp obligatoria (no condicional) | 2h | 🔵 Subida rama |
| 1-15 | Validación firma webhook CRM (anti tenant_id spoofing) | 6h | 🔵 Subida rama |

#### Bloque 1.5 — Privilege escalation y RLS

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 1-16 | Fix privilege escalation via `user_metadata.is_admin` edit … _ver nota↓_ | 4h | 🔵 Subida rama |
| 1-17 | Verificación rol admin en `createTenant`/`deleteTenant`/`u … _ver nota↓_ | 3h | 🔵 Subida rama |
| 1-18 | Fix RLS tabla `tenants` (quitar policy tautológica `USING(true)`) | 3h | 🔵 Subida rama |
| 1-19 | Fix RLS `knowledge_base` (quitar `app.current_tenant` dead … _ver nota↓_ | 2h | 🔵 Subida rama |
| 1-20 | Fix `fetchCalls` — añadir filtro `tenant_id` en 4 funciones | 4h | 🔵 Subida rama |
| 1-21 | Fix IDOR `inbox.ts` 9 funciones — verificar ownership tenant | 8h | 🔵 Subida rama |

#### Bloque 1.6 — Otros críticos

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 1-22 | Fix SSRF `/api/tenant/migrate` cookie `af-tenant-url` (aña … _ver nota↓_ | 8h | 🔵 Subida rama |
| 1-23 | Sanitización XSS widget embed (interpolación `id` en JS se … _ver nota↓_ | 4h | 🔵 Subida rama |
| 1-24 | Update `axios@1.14.0` → `axios@1.16.1` (15 CVEs: SSRF + Pr … _ver nota↓_ | 4h | 🔵 Subida rama |
| 1-25 | Reemplazar paquete `crypto@1.0.1` DEPRECATED por built-in … _ver nota↓_ | 3h | 🔵 Subida rama |
| 1-26 | Update `next@16.1.6` → `next@16.2.6` (cierre 19 CVEs incl. … _ver nota↓_ | 4h | 🔵 Subida rama |
| 1-27 | \*\*Widget Chatbot Server Action — `web*widgets.allowed_doma … \_ver nota↓* | 8h | 🔵 Subida rama |

##### Tareas de cierre — Sprint 0

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-1-CLOSE-1 | **Auto test** — `npm run typecheck` + `npm run lint` + `np … _ver nota↓_ | 1h 30min | 🟡 En Desarrollo |
| SP-1-CLOSE-2 | **Test E2C Local** — Abrir browser con Playwright, … _ver nota↓_ | 2h 30min | 🔵 Subida rama |
| SP-1-CLOSE-3 | \*\*Reemplazado por: análisis cruzado docs Bea (clienta) + R … _ver nota↓_ | 2h | 🟢 COMPLETADA |
| SP-1-CLOSE-4 | **Corrección de Bugs y cambios detectados** — Subtareas di … _ver nota↓_ | (variable) | 🟢 COMPLETADA |
| SP-1-CLOSE-5 | **Cierre de Sprint** — PR `feature/sp-0-sprint-0-hotfixes` … _ver nota↓_ | 1h | 🟢 COMPLETADA |

### Fase 1 — Sprint 1: Capa de datos (sin ORM nuevo)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-2 |
| Versión objetivo | v0.2.0 |
| Estado | 🟢 Completada (merged a developer vía PR #5, commit 94c035a) |
| Estimación total | ~205h estim (con paralelismo 2-3 devs ~3-4 sem) · ⏱ Real: ~12h (orquestación 1 sesión) |
| Rama sugerida | — |

#### Bloque 2.1 — Unificación cliente Supabase

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-01 | Auditar TODOS los usos directos `pg` / `postgres` / `postg … _ver nota↓_ | 4h |  ~20min |
| 2-02 | Refactor: mover queries directas `pg`/`postgres` a `@supab … _ver nota↓_ | 12h |  ~58min |
| 2-03 | Eliminar JWTs `service_role` residuales (los que sobrevivi … _ver nota↓_ | 3h |  ~15min |

#### Bloque 2.2 — Schemas Zod

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-04 | Estructura `src/lib/schemas/` + base helpers Zod (uuid, … _ver nota↓_ | 4h |  ~20min |
| 2-05 | Zod schemas: `leads` (cruzar con `VARIABLES DEFINIDAS` cliente) | 4h |  ~20min |
| 2-06 | Zod schemas: `tenants` + `tenant_members` | 2h |  ~10min |
| 2-07 | Zod schemas: `programs` / `courses` | 2h |  ~10min |
| 2-08 | Zod schemas: `appointments` + `calls` | 3h |  ~15min |
| 2-09 | Zod schemas: `ai_agents` / `ai_agent_variants` / `prompts` | 3h |  ~15min |
| 2-10 | Zod schemas: `knowledge_base` / `chat_memory` / `chat_summary` | 2h |  ~10min |
| 2-11 | Zod schemas: `integrations` / `webhooks` / `crm*field_mapp … \_ver nota↓* | 3h |  ~15min |
| 2-35 | Zod `ai_agent_variants.model_name` whitelist (`z.enum([... … _ver nota↓_ | 2h |  ~10min |

#### Bloque 2.3 — Repository pattern

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-12 | Estructura `src/lib/repositories/` + interface base + help … _ver nota↓_ | 4h |  ~20min |
| 2-13 | Repository: `leads` | 6h |  ~30min |
| 2-14 | Repository: `tenants` | 4h |  ~20min |
| 2-15 | Repository: `appointments` + `calls` | 5h |  ~25min |
| 2-16 | Repository: `ai_agents` (+ variants) | 4h |  ~20min |
| 2-17 | Repository: `knowledge_base` + `chat_memory` | 5h |  ~25min |
| 2-18 | Repository: `integrations` + webhooks | 3h |  ~15min |

#### Bloque 2.4 — Refactor queries existentes (paralelizable)

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-19 | Refactor: mover queries de `src/app/api/**/*.ts` a repositorios | 8h |  0 |
| 2-20 | Refactor: mover queries de server actions `src/lib/actions … _ver nota↓_ | 6h |  0 |
| 2-21 | Refactor: mover queries de `worker.js` + processors a repositorios | 4h |  0 |
| 2-36 | Persistir `token_usage` (`completion.usage`) en `chat*mess … \_ver nota↓* | 2h |  0 |

#### Bloque 2.5 — Type safety y limpieza

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-22 | Limpieza `as any` / `as unknown` — usar tipos derivados Zo … _ver nota↓_ | 16h |  0 |
| 2-37 | Reemplazar `console.log`/`console.error` con `widgetId`+`l … _ver nota↓_ | 1h |  ~5min |

#### Bloque 2.6 — RLS hardening complementario

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-23 | Fix RLS `ai_agents` / `ai_agent_variants` tautológica (no … _ver nota↓_ | 3h |  ~15min |
| 2-24 | Fix RLS `web_widgets` (devuelve todos los tenants) | 2h |  ~10min |
| 2-25 | Fix `getPrograms` — añadir filtro tenant (expone programas … _ver nota↓_ | 2h |  ~10min |
| 2-26 | Cifrar Google OAuth tokens en JSONB (no plano) | 12h |  ~58min |
| 2-27 | Update next@16.1.6~~ \*\*MOVIDA a Sprint 0 como 1-26 (tras … _ver nota↓_ | 6h — |  — |

#### Bloque 2.7 — Testing y documentación

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-28 | Tests de integración con BD real (NO mocks) para repositor … _ver nota↓_ | 12h |  ~59min |
| 2-29 | Documentar capa de datos en `docs/architecture/data-layer. … _ver nota↓_ | 4h |  ~20min |

#### Bloque 2.8 — Hardening de dependencias (hallazgos ADR audit 2026-05-20)

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 2-30 | Crear hook `af-productivity-logger.cjs` para automatizar t … _ver nota↓_ | 6h |  ~29min |
| 2-31 | Update `lucide-react@0.575` → `lucide-react@1.x` (major — … _ver nota↓_ | 4h |  0 |
| 2-32 | Update `shadcn@3.x` → `shadcn@4.x` (major — revisar compon … _ver nota↓_ | 6h |  0 |
| 2-33 | Alinear `@types/node@^20` con runtime Node 24 | 2h |  ~10min |
| 2-34 | Investigar update `eslint@9` → `eslint@10` (bloqueado por … _ver nota↓_ | 2h |  0 |

#### Bloque 2.9 — Fix bugs Renzo + reqs Bea (NUEVO, AÑADIDO POST-AUDIT 22-05-2026)

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|

##### Tareas de cierre — Sprint 1

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-2-CLOSE-1 | Auto test | 1h 30min |  ~7min |
| SP-2-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min |  ~12min |
| SP-2-CLOSE-4 | Corrección de Bugs detectados | (variable) |  ~2min |
| SP-2-CLOSE-5 | Cierre de Sprint → PR a `developer` + bump a `v0.2.0` + cr … _ver nota↓_ | 1h |  ~1min |

### Fase 2 — Sprint 2: Adapter layer + 2 CRMs (MVP)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-3 |
| Versión objetivo | v0.2.7 (final con hotfix BUG-2-01 — bumpeada desde v0.2.5) |
| Estado | 🟢 COMPLETADA (mergeado a developer 24-05-2026 19:55) |
| Estimación total | **74h** secuencial · ~**52h** con paralelismo Phase 02‖03‖04 (refinada tras research) |
| Rama sugerida | — |

##### Tareas de cierre — Sprint 2

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-3-CLOSE-1 | Auto test (typecheck + lint + build + Vitest) | 1h 30min | 🟢 COMPLETADA |
| SP-3-CLOSE-2 | E2C Local + WCAG 2.2 AA (Playwright + axe-core) | 2h 30min | 🟢 COMPLETADA |
| SP-3-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🟢 COMPLETADA |
| SP-3-CLOSE-5 | Cierre → PR + bumps + tags + releases + hand-off SP-4B pha … _ver nota↓_ | 1h | 🟢 COMPLETADA |

### Fase 3 — Sprint 3: Hardening

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-4 |
| Versión objetivo | v0.3.0 (MVP completo, post-hardening) |
| Estado | 🔘 Pendiente |
| Estimación total | 2-3 sem (80h–120h) |
| Rama sugerida | feature/sprint-03-hardening |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 4-01 | Test suite E2E completa (Playwright) cubriendo flujos golden path | 20-22h | 🟢 COMPLETADA |
| 4-02 | Coverage target ≥80% unit + integration | 8-10h | 🟢 COMPLETADA |
| 4-03 | Observabilidad: logging estructurado Pino + métricas BullM … _ver nota↓_ | 7-9h | 🟢 COMPLETADA |
| 4-05 | Refactor accesibilidad WCAG 2.2 AA en todo el admin panel | 28-40h | 🟢 COMPLETADA |
| 4-06 | Hardening adicional: rate limits, CSP headers, CSRF tokens | 10-14h | 🟢 COMPLETADA |
| 4-07 | Documentación final cliente: release notes v0.3.0 | 6-8h | 🟢 COMPLETADA |
| 4-08 | Rate limit wrapper `withRateLimit()` para Server Actions críticas | 6h | 🟢 COMPLETADA |
| 4-09 | Test E2E Playwright suite completa del widget | 4h | 🟢 COMPLETADA |

##### Tareas de cierre — Sprint 3

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-4-CLOSE-1 | Auto test | 1h 30min | 🟢 COMPLETADA |
| SP-4-CLOSE-2 | Test E2C Local + WCAG 2.2 AA — recorrido completo MVP | 4h | 🟢 COMPLETADA |
| SP-4-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-4-CLOSE-5 | Cierre de Sprint → PR a `developer` + \*\*bump a `v0.3.0-rc. … _ver nota↓_ | 1h | 🔘 Pendiente |

### Fase 4 — Sprint 4: Google Sheets bidireccional

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-5 |
| Versión objetivo | v0.5.0 |
| Estado | 🟡 SPIKE En Desarrollo (28-05-2026 — 5/6 subtareas dev cubiertas, Sub 8 pendiente) |
| Estimación total | 60-100h |
| Rama sugerida | feature/sprint-04-google-sheets |

##### Tareas de cierre — Sprint 4

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-5-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-5-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min | 🔘 Pendiente |
| SP-5-CLOSE-3 | Test Manual del Dev | 1h | 🔘 Pendiente |
| SP-5-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-5-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.5.0` + crear … _ver nota↓_ | 30min | 🟡 En Desarrollo |

### Fase 5 — Sprint 5: Zoho CRM como entrada de leads (bidireccional)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-5Z (Zoho; SP-5 es legacy de Sprint 4 Sheets) |
| Versión objetivo | v0.5.0 |
| Estado | 🟡 **Mergeado a developer** (PR #25, 3a9dee5) · deploy a staging/main diferido · sin tag v0.5.0 |
| Estimación total | 13-18h realista + 5h 30min cierre |
| Rama sugerida | feature/sprint-05-zoho-entrada-leads |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 6-01 | Capa de datos: 3 tablas (`zoho_sync_connections`, `zoho_lead_synced`, `zoho_writeback_outbox`) + trigger + RLS + Zod | 2-3h | 🟢 COMPLETADA |
| 6-02 | **Webhook entrante Zoho** + suscripción Notifications API + event-processor | 4-5h | 🟢 COMPLETADA |
| 6-03 | Writeback bidireccional (cambios stage → Zoho) + outbox + audit R-014 | 2-3h | 🟢 COMPLETADA |
| 6-04 | UI: activar recepción (1 clic auto + guía manual) + mapeo campos + actions | 2-3h | 🟢 COMPLETADA |
| 6-05 | Cron renovación suscripción + reconciliación diaria (red de seguridad) | 1-2h | 🟢 COMPLETADA |
| 6-06 | **Deuda menor: prompt Virginia + modelos demo** (ver nota↓) | 1-2h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 5

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-6-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-6-CLOSE-2 | E2C Local + WCAG 2.2 AA | 2h | 🔘 Pendiente |
| SP-6-CLOSE-4 | Corrección de bugs | (variable) | 🔘 Pendiente |
| SP-6-CLOSE-5 | Push + PR developer + bump `v0.5.0` | 30min | 🔘 Pendiente |

### Fase 6 — Sprint 6: Llamadas de Voz 🆕 (v0.6.0)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-6 (Llamadas de Voz) |
| Versión objetivo | v0.6.0 |
| Estado | 🔘 Pendiente |
| Estimación total | 8-14h + cierre (realista) |
| Rama sugerida | feature/sprint-06-llamadas-voz |

##### Tareas de cierre — Sprint 6

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-7-CLOSE-1..5 | Protocolo estándar de cierre | 5h 30min + bugs | 🔘 Pendiente |

### Fase 7 — Sprint 7: Refinamiento Herramientas Internas (Renzo)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-7 (Refinamiento) |
| Versión objetivo | v0.7.0 |
| Estado | 🔘 Pendiente |
| Estimación total | 18-22h + cierre (sin Fase 03, ya cerrada como SP-7-DEPS) |
| Rama sugerida | feature/sprint-07-refinamiento-herramientas |

##### Tareas de cierre — Sprint 7

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-8-CLOSE-1..5 | Protocolo estándar de cierre | 4h 30min + bugs | 🔘 Pendiente |

### Fase 8 — Sprint 8: Centro de costes LLM con LiteLLM + Langfuse

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-8 |
| Versión objetivo | v0.8.0 |
| Estado | 🔵 Subida rama pendiente (implementación completada 13-06-2026) |
| Estimación total | 24-36h nominal · 11-19h realista + 3-5h cierre = **14-24h realista** |
| Rama sugerida | feature/sprint-08-costes-llm |

##### Tareas de cierre — Sprint 8

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-8-CLOSE-1 | Auto test (typecheck + lint + build + tests) ✅ REALIZADO | 1h 30min | 🟢 COMPLETADA |
| SP-8-CLOSE-2 | Test E2C Local + WCAG 2.2 AA en `/admin/costs` + vista tenant | 2h 30min | 🔘 Pendiente |
| SP-8-CLOSE-3 | Test Manual del Dev — verificar números cuadran con tráfico real | 1h | 🔘 Pendiente |
| SP-8-CLOSE-4 | Corrección de Bugs detectados | (variable) | ✅ Reasignada |
| SP-8-CLOSE-5 | Cierre Sprint → PR a `developer` (SIN merge) + ADR-024 Accepted | 30min | 🔘 Pendiente |

### Fase 9 — Sprint 9: Salesforce adapter

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-9 |
| Versión objetivo | v0.9.0 |
| Estado | 🔘 Pendiente |
| Estimación total | 60-100h |
| Rama sugerida | feature/sprint-09-salesforce |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 8-01 | ADR + instalación `jsforce@^3.10.15` | 2-4h | 🔘 Pendiente |
| 8-02 | OAuth2 Connected App + token refresh + multi-instance (prod/sandbox) | 12-20h | 🔘 Pendiente |
| 8-03 | `SalesforceAdapter`: Leads + Contacts + Opportunities CRUD | 18-30h | 🔘 Pendiente |
| 8-04 | Webhooks bidireccionales (Platform Events / Streaming API) | 12-20h | 🔘 Pendiente |
| 8-05 | UI admin: conexión + field-mapper Salesforce-específico | 8-14h | 🔘 Pendiente |
| 8-06 | Tests integración sandbox Salesforce | 8-12h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 9

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-10-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-10-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min | 🔘 Pendiente |
| SP-10-CLOSE-3 | Test Manual del Dev | 1h | 🔘 Pendiente |
| SP-10-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-10-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.9.0` + crear … _ver nota↓_ | 30min | 🔘 Pendiente |

### Fase 10 — Sprint 10: GoHighLevel adapter

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-10 |
| Versión objetivo | v0.10.0 |
| Estado | 🔘 Pendiente |
| Estimación total | 40-80h |
| Rama sugerida | feature/sprint-10-gohighlevel |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 9-01 | Registrar app en GHL Marketplace + setup OAuth2 v2 | 4-8h | 🔘 Pendiente |
| 9-02 | `GoHighLevelAdapter`: Contacts + Opportunities + Calendars | 14-26h | 🔘 Pendiente |
| 9-03 | Webhooks GHL (eventos bidireccionales) | 8-16h | 🔘 Pendiente |
| 9-04 | UI admin: conexión + field-mapper | 8-14h | 🔘 Pendiente |
| 9-05 | Tests integración sandbox GHL | 6-16h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 10

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-11-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-11-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min | 🔘 Pendiente |
| SP-11-CLOSE-3 | Test Manual del Dev | 1h | 🔘 Pendiente |
| SP-11-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-11-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.10.0` + crear … _ver nota↓_ | 30min | 🔘 Pendiente |

### Fase 11 — Sprint 11: ActiveCampaign adapter

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-11 |
| Versión objetivo | v0.11.0 |
| Estado | 🔘 Pendiente |
| Estimación total | 20-50h |
| Rama sugerida | feature/sprint-11-activecampaign |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 10-01 | Setup auth API Key + multi-cuenta | 2-4h | 🔘 Pendiente |
| 10-02 | `ActiveCampaignAdapter`: Contacts + Deals + Tags + Lists | 8-20h | 🔘 Pendiente |
| 10-03 | Webhooks (eventos contact updated, deal stage changed) | 4-10h | 🔘 Pendiente |
| 10-04 | UI admin: conexión + field-mapper | 4-10h | 🔘 Pendiente |
| 10-05 | Tests integración sandbox | 2-6h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 11

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-12-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-12-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min | 🔘 Pendiente |
| SP-12-CLOSE-3 | Test Manual del Dev | 1h | 🔘 Pendiente |
| SP-12-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-12-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.11.0` + crear … _ver nota↓_ | 30min | 🔘 Pendiente |

### Fase 12 — Sprint 12: Adapter pattern generalization

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-12 |
| Versión objetivo | v0.12.0 |
| Estado | 🔘 Pendiente (bloqueado hasta SP-9..SP-11 completos) |
| Estimación total | 20-40h |
| Rama sugerida | feature/sprint-12-adapter-generalization |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 11-01 | Análisis comparativo: extraer patrones comunes a los 6 adapters | 4-8h | 🔘 Pendiente |
| 11-02 | Refactor `IntegrationAdapter` base: OAuth flow genérico + … _ver nota↓_ | 8-14h | 🔘 Pendiente |
| 11-03 | Generalizar webhook handling + signature verification | 4-8h | 🔘 Pendiente |
| 11-04 | Generalizar rate limiting / retry / circuit breaker por adapter | 4-10h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 12

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-13-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-13-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min | 🔘 Pendiente |
| SP-13-CLOSE-3 | Test Manual del Dev | 1h | 🔘 Pendiente |
| SP-13-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-13-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.12.0` + crear … _ver nota↓_ | 30min | 🔘 Pendiente |

### Fase 13 — Sprint 13: Tier 2 on-demand (backlog)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-13 |
| Versión objetivo | v0.13.x+ (incremental por CRM) |
| Estado | 🔘 Backlog (on-demand) |
| Estimación total | ~30-50h por CRM (sólo bajo pedido) |
| Rama sugerida | feature/sprint-13-tier2-<crm> (por CRM) |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 12-01 | Clientify adapter (on-demand) | ~30-50h | 🔘 Pendiente |
| 12-02 | Bitrix24 adapter (on-demand) | ~30-50h | 🔘 Pendiente |
| 12-03 | Pipedrive adapter (on-demand) | ~30-50h | 🔘 Pendiente |
| 12-04 | Monday adapter (on-demand) | ~30-50h | 🔘 Pendiente |
| 12-05 | Holded adapter (on-demand) | ~30-50h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 13

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-14-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-14-CLOSE-2 | Test E2C Local + WCAG 2.2 AA | 2h 30min | 🔘 Pendiente |
| SP-14-CLOSE-3 | Test Manual del Dev | 1h | 🔘 Pendiente |
| SP-14-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-14-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.13.x` por CRM | 30min | 🔘 Pendiente |

### Fase 14 — Sprint 14: WhatsApp Tech Provider Migration (Meta)

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-14 |
| Versión objetivo | v0.14.0 |
| Estado | 🔘 Pendiente |
| Estimación total | ~48-72h |
| Rama sugerida | feature/sprint-14-whatsapp-tech-provider |

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 13-01 | App Meta dedicada + ADR-025 + acompañamiento a clienta | 4-6h | 🔘 Pendiente |
| 13-02 | Refactor credenciales: System User token central + dual-mode | 8-12h | 🔘 Pendiente |
| 13-03 | Embedded Signup (SDK JS + config_id + callback + intercambio) | 10-14h | 🔘 Pendiente |
| 13-04 | UI "Conectar WhatsApp" + suscripción WABA al webhook | 6-10h | 🔘 Pendiente |
| 13-05 | Migración tenants vivos sin downtime (dual-mode) | 6-10h | 🔘 Pendiente |
| 13-06 | App Review (2 vídeos) + Access Verification | 4-6h | 🔘 Pendiente |
| 13-07 | Tests (unit + integración MSW Graph API) + docs guía tenant | 6-10h | 🔘 Pendiente |

##### Tareas de cierre — Sprint 14

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| SP-15-CLOSE-1 | Auto test | 1h 30min | 🔘 Pendiente |
| SP-15-CLOSE-2 | Test E2C Local + WCAG 2.2 AA (pantalla de conexión) | 2h 30min | 🔘 Pendiente |
| SP-15-CLOSE-3 | Test Manual del Dev (post-MVP → estándar) | 1h | 🔘 Pendiente |
| SP-15-CLOSE-4 | Corrección de Bugs detectados | (variable) | 🔘 Pendiente |
| SP-15-CLOSE-5 | Cierre Sprint → PR a `developer` + bump a `v0.14.0` | 30min | 🔘 Pendiente |

### Resumen por sprint

| Sprint | Versión | Estado | Tareas dev | % Completado | Est. dev |
|--------|---------|--------|-----------|-------------|---------|
| 0 | v0.1.0 | 🟡 En Desarrollo (25/26 dev a 🔵 · 2 diferidas pre-deploy · … _ver nota↓_ | 29 | 0% | ~107h 30min (11 días lab × 10h) |
| 1 | v0.2.0 | 🟢 Completada (merged a developer vía PR #5, commit 94c035a) | 37 | 0% | ~205h estim (con paralelismo 2-3 devs ~3-4 sem) · ⏱ Real: ~12h (orquestación 1 sesión) |
| 2 | v0.2.7 (final con hotfix BUG-2-01 — bumpeada desde v0.2.5) | 🟢 COMPLETADA (mergeado a developer 24-05-2026 19:55) | 0 | 0% | **74h** secuencial · ~**52h** con paralelismo Phase 02‖03‖04 (refinada tras research) |
| 3 | v0.3.0 (MVP completo, post-hardening) | 🔘 Pendiente | 8 | 100% | 2-3 sem (80h–120h) |
| 4 | v0.5.0 | 🟡 SPIKE En Desarrollo (28-05-2026 — 5/6 subtareas dev cubiertas, Sub 8 pendiente) | 0 | 0% | 60-100h |
| 5 | v0.5.0 | 🟡 **Mergeado a developer** (PR #25, 3a9dee5) · deploy a staging/main diferido · sin tag v0.5.0 | 6 | 83% | 13-18h realista + 5h 30min cierre |
| 6 | v0.6.0 | 🔘 Pendiente | 0 | 0% | 8-14h + cierre (realista) |
| 7 | v0.7.0 | 🔘 Pendiente | 0 | 0% | 18-22h + cierre (sin Fase 03, ya cerrada como SP-7-DEPS) |
| 8 | v0.8.0 | 🔵 Subida rama pendiente (implementación completada 13-06-2026) | 0 | 0% | 24-36h nominal · 11-19h realista + 3-5h cierre = **14-24h realista** |
| 9 | v0.9.0 | 🔘 Pendiente | 6 | 0% | 60-100h |
| 10 | v0.10.0 | 🔘 Pendiente | 5 | 0% | 40-80h |
| 11 | v0.11.0 | 🔘 Pendiente | 5 | 0% | 20-50h |
| 12 | v0.12.0 | 🔘 Pendiente (bloqueado hasta SP-9..SP-11 completos) | 4 | 0% | 20-40h |
| 13 | v0.13.x+ (incremental por CRM) | 🔘 Backlog (on-demand) | 5 | 0% | ~30-50h por CRM (sólo bajo pedido) |
| 14 | v0.14.0 | 🔘 Pendiente | 7 | 0% | ~48-72h |


---

## Versión actual

**v0.8.0** — En desarrollo. Ver RoadMap para estado de cada sprint.

---

## Contribuir

Lee [`docs/dev-onboarding.md`](docs/dev-onboarding.md) antes de empezar.

Flujo de trabajo:

1. Crea rama `feature/<descripcion>` desde `developer`
2. Trabaja localmente, mantén el RoadMap actualizado (`plans/RoadMap.md`)
3. Abre PR a `developer` (nunca directamente a `staging` o `main`)
4. Después del merge, el agente `roadmap-keeper` actualiza estados y READMEs automáticamente

Convenciones: commits en formato convencional (`feat:`, `fix:`, `chore:`). Sin referencias a IA en mensajes de commit.

---

## Licencia

MIT
