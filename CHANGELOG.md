# Changelog

Todos los cambios notables de `linkstation` se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

Estados oficiales de un release:

- 🟢 **Released**: tag git creado y mergeado a `developer` (o `staging`/`main` según promoción).
- 🟡 **In progress**: sprint en desarrollo activo.
- 🔘 **Backlog**: planificado, sin trabajo aún.

---

## [0.8.0] — 2026-06-13 🟡 In progress

**Sprint 8 — Costes-LLM (LiteLLM Proxy + Langfuse)** · rama: `feature/sprint-08-costes-llm` → PR a `developer` (sin merge aún) · tag `v0.8.0` pendiente · [ADR-024](docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md) (Accepted).

### Resumen

Observabilidad y control de costes de las llamadas LLM. Implementado con alcance **re-scopeado por un análisis red-team**: se entrega el valor (persistencia de coste + observabilidad) sin introducir el punto único de fallo del gateway en la ruta caliente.

### Highlights

- 💰 **`token_usage` real en el dashboard de costes**: `/dashboard/costs` dejaba de calcular coste IA porque el campo `chat_messages.metadata.token_usage` nunca se escribía (caía a un fijo `$0.002/msg`). Ahora WhatsApp (sumando las hasta 3 llamadas de tool calls) y el widget lo persisten.
- 🔀 **LiteLLM Proxy opcional para flujos async**: `fact-extractor`, `ai-analysis` y `ai-rescue` pueden enrutarse por el gateway (cost tracking + fallback cross-provider). La ruta caliente (WhatsApp/widget) NO se migra → sin SPOF.
- 📊 **Langfuse metadata-only**: traces de uso/coste (tokens, modelo, latencia, tenant) SIN enviar inputs/outputs — la PII de leads no sale del sistema.
- 🛡️ **Hardening del andamiaje previo**: eliminado el default inseguro `sk-1234`, fallback de emergencia que ahora preserva `tools`/`response_format`, imagen LiteLLM pineada a `v1.85.5`, Postgres del proxy aislado del cluster de producción.

### Detalle por área

#### Capa de datos / Costes

- `WhatsAppAIProcessor` y `widget`: persisten `metadata.token_usage = {prompt, completion, total}` + `model`. WhatsApp suma el usage de todas las rondas de tool calls del turno.
- Fuente canónica de coste €: `LiteLLM_SpendLogs` (validada en local). `chat_messages.token_usage` = vista aproximada por mensaje (solo tokens).

#### LLM Gateway

- Nuevo helper `getLLMClient()` ([src/lib/llm/llm-client.ts](src/lib/llm/llm-client.ts)): cliente OpenAI con `baseURL` al proxy si está configurado, directo si no. Flag `LITELLM_FORCE_DOWN` para el caos test.
- `config.yaml`: formato `fallbacks` corregido al de LiteLLM v1.85 (lista-de-dicts).
- `docker-compose.dokploy.yml`: Postgres propio aislado (`litellm-db`), imagen `v1.85.5`, healthcheck con `start_period: 60s`.
- `emergency-fallback`: propaga `tools`/`tool_choice`/`response_format`/`messages`; fallback por provider.

#### Observabilidad

- `traceLLMUsage()` ([src/lib/observability/langfuse-client.ts](src/lib/observability/langfuse-client.ts)): emite trace de metadata, best-effort (no rompe la cadena si Langfuse cae).

### Breaking changes

- NINGUNO. El proxy y Langfuse son opcionales (sin env vars → comportamiento previo: SDK directo, sin tracing).

### Variables de entorno nuevas

- `LITELLM_FORCE_DOWN` — (opcional) `true` simula el proxy caído para el caos test.
- Internas del stack Dokploy (no las lee el app): `LITELLM_MASTER_KEY`, `LITELLM_DB_USER`, `LITELLM_DB_PASSWORD`.

### Diferido a sprint posterior

- Migración de WhatsApp/embeddings al proxy, virtual keys per-tenant, budget enforce (Sprint 8: alert-only), Langfuse con payload PII (requiere self-host + masking validado), prompt management, evals.

### Notas de despliegue

- Levantar el stack `infra/litellm-proxy/docker-compose.dokploy.yml` en Dokploy (con su Postgres propio) queda para la sesión pre-deploy VPS. El contenedor `v1.85.5` se validó E2E en local (completion real + SpendLog).

### Tests

- 12 tests nuevos verdes: `emergency-fallback` (6), `llm-client` (4), `langfuse-trace` (2).

---

## [0.5.0] — 2026-06-08 🟡 In progress

**Sprint 5 — Zoho CRM como entrada de leads (event-driven)** · rama: `feature/sprint-05-zoho-entrada-leads` → PR a `developer` (sin merge aún) · tag `v0.5.0` pendiente.

### Resumen

Zoho CRM pasa de ser solo destino de salida (push, Sprint 2) a ser **fuente de entrada instantánea de leads**: en cuanto un lead entra o cambia en Zoho, Zoho avisa al sistema vía webhook y el lead entra en segundos — **sin polling**. Más writeback bidireccional de cambios de stage de vuelta a Zoho, con audit R-014.

### Highlights

- ⚡ **Entrada event-driven** (no polling): lead en Zoho → `POST /api/webhooks/zoho` → lead en el sistema en segundos.
- 🔌 **Dos vías de suscripción**: Notifications API v8 (auto, 1 clic, caduca 7d con renovación por cron) + Workflow Webhook manual (lo crea el tenant en su Zoho, no caduca).
- 🛡️ **Red de seguridad**: reconciliación diaria idempotente que recupera leads que el webhook pierda (Zoho caído / reinicio).
- 🔁 **Writeback bidireccional** de cambios de stage → Zoho vía `updateLead` + outbox + audit R-014.
- ♻️ **Idempotencia** por `zoho_lead_id` + guard anti-bucle pull↔writeback en 3 capas (trigger SQL `app.zoho_pull_in_progress` + RPC `zoho_pull_update_lead` + comparación `Modified_Time`).
- 🖥️ **UI admin** `/dashboard/settings/integrations/zoho-pull`: activación 1 clic, guía manual con URL del webhook, editor de mapeo de campos, toggles, "Sincronizar ahora".

### Detalle por área

#### Capa de datos

- Tablas nuevas `zoho_sync_connections`, `zoho_lead_synced`, `zoho_writeback_outbox` con RLS multi-tenant.
- Trigger `tr_lead_changes_to_zoho_writeback()` + RPC `zoho_pull_update_lead()` con guard anti-bucle. Funciones `SECURITY DEFINER` con `search_path` fijado.

#### Integraciones

- `src/lib/integrations/zoho-pull/*`: subscription, lead-mapper, queue (BullMQ `zoho_lead_queue`), event-processor, writeback, outbox-processor, maintenance.
- Reutiliza el adapter Zoho de Sprint 2 (`crm/providers/zoho.ts`, OAuth multi-DC) + `deriveCountryFromPhone` de Sprint 4.
- Scope nuevo `ZohoCRM.notifications.ALL` añadido a `REQUIRED_SCOPES`.

#### Seguridad

- Webhook con validación de token por tenant (`timingSafeEqual`, 403 si inválido).
- Cron `/api/internal/zoho-pull/cron` fail-closed en producción (`CRON_SECRET` + `timingSafeEqual`).
- Security delta OWASP 2021: 0 críticos, 0 altos. Fixes BAJO/MEDIO aplicados (search_path, error genérico en cron). 3 medios al backlog Sprint 6.

### Fixes en validación E2E real (cuenta Zoho de Javi HP, DC `.eu`, org `20115313796`)

- **BUG-5-01** — Workflow Webhook de Zoho envía el id del registro en el **header `Entity_id`** (body vacío, form-urlencoded), no en el body JSON. Sin leerlo, la vía manual quedaba rota en silencio (Zoho marcaba "1 correcto"). `extractWebhook` ahora lee header + query + body (form/json) y soporta **campos inline** del lead (entra completo sin OAuth).
- **BUG-5-02** — El webhook se colgaba si Redis tardaba (await enqueue infinito). Timeout duro de 2s + responde 200 igual; la reconciliación recupera lo que falte.
- **BUG-5-03** — `Lead_Source` de Zoho pisaba `origen`. Ahora mapea a `campana`; `origen` lo fija el processor a `zoho_crm`.
- **BUG-5-04** — `deriveCountryFromPhone` fallaba en runtime. Reescrito robusto: España por defecto sin prefijo (`+34`/`0034` cubiertos), fallback por prefijo (ES + Latam), `<7` dígitos → null.
- **BUG-5-05** — `channel_id` de la Notifications API se generaba fuera del rango de `crypto.randomInt`. Fix: `timestamp + 6 dígitos` (numérico, dentro de BIGINT).
- **BUG-5-06** — Faltaba el constraint `UNIQUE(tenant_id, crm_type)` en `integrations` (bug preexistente Sprint 2): el `upsert ... onConflict` del OAuth start fallaba. Nueva migración idempotente.
- **BUG-5-07** — `auth/start` no seteaba `display_name` (NOT NULL).

### UI / Documentación

- **Selector "una u otra"** de vía de activación (automática / manual) con banner de estado + badge "Activa" + botones desactivar; botón **"Desconectar Zoho"**.
- **Guías de integración rediseñadas a HTML claro**: la plantilla genérica `/docs/integrations/[slug]` ahora renderiza el markdown con estilos de marca (cabecera con gradiente, callouts con icono, tablas con cabecera + zebra, dark mode). Aplica a las guías de Zoho (webhook manual) y Google Sheets sin duplicar contenido.

### Migraciones SQL

- `supabase/migrations/20260608153000_zoho_sync_connections.sql`
- `supabase/migrations/20260608153100_zoho_writeback_trigger.sql`
- `supabase/migrations/20260608153200_zoho_pull_guarded_update.sql`
- `supabase/migrations/20260608153300_integrations_unique_tenant_crm.sql` (BUG-5-06)

### Variables de entorno nuevas

- Ninguna nueva obligatoria. Reutiliza `ZOHO_CLIENT_ID/SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`/`NGROK_URL` (ya existentes).

### Breaking changes

- NINGUNO.

### Tests

- Tests unitarios nuevos (lead-mapper, webhook + header `Entity_id` + inline_leads, outbox, event-processor, subscription `channel_id`, `deriveCountryFromPhone` `+34`/`0034`/`<7`) + spec E2C de control de acceso. Suite total: **410 passed | 4 skipped**.

### Validado E2E real (cuenta Zoho de Javi HP, DC `.eu`)

- **Vía A webhook** (id en header `Entity_id`, con y sin campos inline) → leads entraron. ✅
- **Vía B OAuth + getLead** → lead real "Javi HP" traído de Zoho `.eu` e insertado. ✅
- OAuth real conectado, tokens cifrados, país derivado del prefijo. ✅
- Suscripción automática (Notifications API): código completo + `channel_id` corregido; E2E 100% pendiente por limitación del worker standalone en el entorno de prueba (en producción, worker dentro de Next, funciona).

---

## [0.4.0] — 2026-06-08 🟢 Released

**Sprint 4 — Google Sheets bidireccional (post-MVP)** · rama: `feature/sprint-04-google-sheets` → mergeada en `developer` (PR #20 SPIKE Pull-only `29-05` + merge flujo bidireccional `f89aab9` `03-06`) · tag `v0.4.0`.

### Resumen

Integración bidireccional con Google Sheets por tenant: un lead originado en una Sheet se sincroniza al CRM (pull vía webhook ~15s) y los cambios de stage del lead se reflejan de vuelta en la Sheet (writeback con audit R-014). Conexión OAuth Google por tenant activo, wizard de 4 pasos con Google Picker multi-sheet y mapeo de columnas.

### Highlights

- 🔄 **Flujo bidireccional completo** Sheet ↔ CRM validado end-to-end con OAuth real + ngrok (03-06-2026).
- 🔐 **OAuth Google por tenant** con tokens cifrados AES-256-GCM + state HMAC-SHA256 verificado en tiempo constante.
- 🧙 **Wizard 4 pasos** + Google Picker multi-sheet + editor de mapeo de columnas.
- 📝 **Writeback automático** vía outbox + cron, con audit R-014 append-only (`overwrite_with_audit`).
- 🧩 **Autorelleno de campos**: origen, fecha_ingreso_crm, tipo_lead, país por prefijo telefónico; semáforo de columna AF.
- 🛡️ **Endurecimiento de seguridad en el cierre** (CLOSE-4): endpoint cron fail-closed en producción + writeback `RAW` (anti formula injection).

### Detalle por área

#### Capa de datos / Backend

- Adapter Sheets API, queue + worker, webhook de pull, processor de pull, outbox-processor de writeback, row-mapper, credentials por tenant, sesión y tipos. (`src/lib/integrations/sheets/*`).
- Trigger SQL que encola en `sheets_writeback_outbox` cuando un lead originado de Sheet cambia campos relevantes.

#### Frontend

- Página `/dashboard/settings/integrations/google-sheets` con wizard, `GooglePickerButton`, `SheetMappingEditor`, `SheetsWizardClient`.
- Ajuste CSP para permitir Google Picker.

#### Seguridad (security delta CLOSE-1.5 — OWASP 2021)

- Auditados 21 archivos: 0 CRÍTICO, 1 ALTO, 4 MEDIO, 4 BAJO, 3 INFO.
- **SEC-S4-01 (ALTO) FIXED**: `authorize()` del cron Sheets ahora fail-closed en producción + `timingSafeEqual`.
- **SEC-S4-07 (MEDIO) FIXED**: `writeCells` usa `valueInputOption: RAW` en lugar de `USER_ENTERED`.
- Report: `plans/reports/security-delta-sprint-4-20260608.md`.

### Tiempos reales del sprint

| Bloque                                  | Estimado        | Real           |
| --------------------------------------- | --------------- | -------------- |
| Desarrollo (SPIKE 1-9 + E2E real OAuth) | 60-100h         | **~13h**       |
| Cierre formal (CLOSE-1..5)              | 5h 30min + bugs | **~1h 30min**  |
| **Total Sprint 4**                      | **65-105h**     | **~14h 30min** |

### Breaking changes

- NINGUNO.

### Migraciones SQL

- `supabase/migrations/20260527000000_sheet_connections.sql`
- `supabase/migrations/20260527000002_sheets_writeback_trigger.sql`
- `supabase/migrations/20260603100000_*` (campos autogenerados leads — aplicada local; pendiente VPS pre-deploy).

### Variables de entorno

- `CRON_SECRET` — **obligatoria en producción** (el endpoint `/api/internal/sheets/cron` es fail-closed sin ella). Generar con `openssl rand -base64 48`.
- Credenciales OAuth Google por tenant (Client ID/Secret) — almacenadas cifradas en BD, no en env.

### Bugs corregidos en el cierre (CLOSE-4)

- **Test fix**: `tests/unit/sheets/outbox.test.ts` — mock de repositorios adaptado a Vitest 4 (clases reales en vez de `vi.fn().mockImplementation` con `new`).
- **SEC-S4-01** + **SEC-S4-07** (ver Seguridad).

### Tareas diferidas a backlog (BUG-4-XX, no bloquean)

- channel_token de webhook con comparación no constant-time (MEDIO).
- PII de leads (email/teléfono) en `error.message` propagados a UI / `last_sync_error` / warnings de coerción (MEDIO).

### Validación

- CLOSE-1 🟢: typecheck 0 · lint 0 · build OK · tests 321/325 (4 skip, 0 fail).
- CLOSE-1.5 🟢: security delta sin críticos; 2 findings fixed in-session.
- CLOSE-2 🟢: 20/20 specs E2C Playwright local (4 nuevos Sprint 4 + smoke + regresión Sprint 3).
- Flujo funcional completo validado manualmente E2E con OAuth real (03-06-2026, 14 leads en BD).

---

## [0.1.0] — 2026-05-22 🟢 Released

**Sprint 0 — Hotfixes de seguridad** · rama: `feature/sp-0-sprint-0-hotfixes` → mergeada en `developer` vía PR #2 (commit `a387dfe`) · tag `v0.1.0` (commit `a387dfe`, tagger Renzo).

### Tiempos reales del sprint

| Bloque                                     | Estimado        | Real          |
| ------------------------------------------ | --------------- | ------------- |
| Desarrollo (1-01..1-27, 26 tareas locales) | 112h 30min      | **~7h 30min** |
| Cierre (CLOSE-1..5)                        | 5h 30min + bugs | **~3h 35min** |
| **Total Sprint 0**                         | **118h**        | **~11h 5min** |

Detalle CLOSE-1..5:

- CLOSE-1 auto-test (typecheck+lint+build): **~30min** · DONE_WITH_CONCERNS (lint 128→118 errores preexistentes, no regresión).
- CLOSE-2 E2C Playwright + WCAG: **~45min** · 24/24 E2E PASS + 5 WCAG findings (1 serious + 4 moderate).
- CLOSE-3 análisis cruzado docs Bea+Renzo V1: **~1h 30min** (reemplazó al manual humano del dev, absorbido por SP-4B phase-01).
- CLOSE-4 corrección bugs detectados: **~25min** (BUG-001 logout redirect + BUG-002 viewer→/admin guard + 2 lint fixes en cierre formal).
- CLOSE-5 cierre formal (CHANGELOG + RoadMap update + PR): **~25min**.

Dos tareas (1-03 rotar JWTs Supabase VPS, 1-05 password Postgres VPS) quedan 🟡 **diferidas pre-deploy** — se ejecutan antes de promoción a `staging`, no bloquean `v0.1.0` en `developer`.

### Security (hotfixes que motivan el sprint)

- **RLS multi-tenant hardening**: eliminada policy tautológica `USING(true)` en `tenants` (`20260521000000_rls_tenants_hardening.sql`) y dead-letter `app.current_tenant` en `knowledge_base` (`20260521000001_rls_knowledge_base_hardening.sql`). 4 policies S/I/U/D ownership-based en cada tabla. Tareas 1-18, 1-19. Commit `da64297`.
- **Privilege escalation cerrada**: `is_admin` movido de `user_metadata` (editable por usuario) a `app_metadata` (sólo service_role). Script `migrate-is-admin-to-app-metadata.sql` aplicado. Tarea 1-16. Commit `da64297`.
- **Auth en endpoints orquestación**: `requireApiUser` + `requireTenantAccess` en deploy/graph/publish/workflows/calls/manual. Tarea 1-07. Commit `4da79b1`.
- **Auth en endpoints cron**: `requireCronSecret` timing-safe en sweep + cron/appointments/reminders. Tarea 1-08. Commit `4da79b1`.
- **Guard orquestación user-driven**: `requireOrchestrationEnabled` (DENY by default vía `tenants.config.test_orchestrator_enabled`). Tarea 1-09. Commit `4da79b1`.
- **Validación HMAC webhooks**: Retell (`x-retell-signature` + `RETELL_WEBHOOK_SECRET`), WhatsApp (`WHATSAPP_APP_SECRET` obligatorio), CRM (firma per-tenant atada a `tenant_id`). Tareas 1-12, 1-13, 1-14, 1-15. Commit `a17c687`.
- **JWTs hardcoded eliminados**: 10 ocurrencias en código fuente reemplazadas por `requireEnv()`/`requireEnvAny()` desde `src/lib/env.ts`. `grep eyJhbGci|FALLBACK_ src/` = 0. Tarea 1-04. Commit `d595287`.
- **IDOR en inbox**: 9 funciones (`updateLeadSegment`, `sendManualMessage`, `injectMockupMessage`, `toggleLeadAI`, `assignAgentToLead`, `deleteLead`, `deleteChatHistory`, `deleteLeadFacts`, `updateLeadInfo`) verifican ownership tenant vía `.eq("tenant_id", tenant.id)`. Tarea 1-21. Commit `da64297`.
- **SSRF cerrado en `/api/tenant/migrate`**: URL+key del Supabase del tenant resueltas desde DB (no de cookie `af-tenant-url`). `isAllowedTenantUrl()` bloquea loopback/RFC1918. Tarea 1-22. Commit `2c9437c`.
- **XSS widget embed sanitizado**: validación regex UUID estricta + `JSON.stringify` para `id`/`baseUrl` antes de interpolar en JS servido a terceros. Tarea 1-23. Commit `2c9437c`.
- **Widget chatbot hardening (nuevo en Sprint 0)**: `web_widgets.allowed_domains` + `rate_limit_per_minute` + verificación `Origin`/`Referer` + sliding-window Redis rate-limit (fallback ALLOW si Redis caído). Migración `20260522000000_widget_hardening_allowed_domains_rate_limit.sql`. Tarea 1-27. Commit `ff0583c`.
- **`crypto@1.0.1` DEPRECATED removido**: helpers HMAC ahora usan `node:crypto` built-in. Tarea 1-25. Commit `2c9437c`.
- **`axios` 1.14.0 → 1.16.1** (15 CVEs SSRF + Prototype Pollution). Tarea 1-24. Commit `2c9437c`.
- **`next` 16.1.6 → 16.2.6** (19 CVEs incl. middleware bypass — invalidaba auth hotfixes 1-07/1-08/1-16). Tarea 1-26 (movida desde Sprint 1 tras audit ADR 20-05-2026). Commit `1ce8e0b`.

### Fixed (post-cierre, detectados en E2C CLOSE-2)

- **BUG-001 logout redirect**: `auth.ts:108` ahora hace `redirect('/login')` tras `signOut()`. Commit `8beeddd`.
- **BUG-002 admin guard `/admin`**: `middleware.ts:65` extiende guard a `/admin` (viewer no accede). Commit `8beeddd`.
- **Lint react-hooks ThemeToggle**: `eslint-disable-next-line react-hooks/set-state-in-effect` justificado en hydration-safe mount flag.
- **Lint prefer-const compliance**: `let startH` → `const startH` en `isWithinLegalWindow()`.

### Changed

- **Orchestrator worker firma corregida**: `worker.js:58` carga `lead+config+sequence` antes de llamar `executeSequenceStep(lead, tenantId, sequence, stepIndex, config)`. Desbloquea flujo multi-día. Tarea 1-01. Commit `847ef79`.
- **Redis errors propagados**: `enqueueLeadStep` ya no silencia errores Redis (catch silencioso → log estructurado + re-throw). 3 callers gestionan throw. Tarea 1-02. Commit `662073f`.
- **Postgres `app_user` least-privilege**: SQL idempotente `supabase/scripts/create-app-user.sql` + apply local OK. 4 permisos DML, 0 DDL. Tarea 1-06. Commit `67b53c8` + `1fc4992`.
- **Tenant verification en CRUD admin**: `assertAdminAccess()` en `createTenant`/`deleteTenant`/`updateTenant`/`getTenants`. Tarea 1-17. Commit `da64297`.
- **`fetchCalls` con filtro tenant**: 4 funciones (`fetchCalls`, `getCallsByPhone`, `fetchIntentosByPhone`, `fetchWhatsappByPhone`) usan `getActiveTenantId()` + `.eq("tenant_id", id)`. Tarea 1-20. Commit `da64297`.

### Added

- **Playwright setup local + 24 E2E tests Sprint 0**: 16 security gates + 2 core smoke + 6 smoke flows en `tests/e2e/sprint-0-close/`. Tarea 0-00 + 163f5d5. Commit `00cc35a` + `163f5d5`.
- **Pre-push hooks** (Husky + lint-staged + commit-msg + 3 typecheck fixes). Tarea 0-01. Commit `a74406e`.
- **Helpers de seguridad reutilizables**: `src/lib/api-auth.ts` (`requireApiUser`, `requireTenantAccess`, `requireCronSecret`, `requireOrchestrationEnabled`, `requireApiAdmin`, `assertAdminAccess`), `src/lib/env.ts` (`requireEnv`, `requireEnvAny`), `src/lib/api/validate-widget-origin.ts`, `src/lib/api/rate-limit-widget.ts`.
- **Script handoff BD para VPS**: `scripts/db-export-snapshot.sh` + `docs/handoff/db-snapshot-to-vps-renzo.md` (instrucciones Dokploy). Commit `1886785`.
- **Reports de cierre**:
  - [`plans/reports/sp-1-close-1-auto-test-20260522.md`](plans/reports/sp-1-close-1-auto-test-20260522.md)
  - [`plans/reports/sp-1-close-2-e2c-playwright-wcag-20260522.md`](plans/reports/sp-1-close-2-e2c-playwright-wcag-20260522.md)
  - [`plans/reports/sp-1-close-3-analisis-docs-clienta-renzo-20260522.md`](plans/reports/sp-1-close-3-analisis-docs-clienta-renzo-20260522.md)
- **Checklist manual `docs/testeos-manual.md`** con quick checks clickables.
- **Naming convention Sprint 1+**: `feature/sprint-NN-<slug>` con 2 dígitos. Commit `7c9bb46`.
- **Dev port fijo `localhost:8500`**. Commit `95d470a`.
- **Política screenshots**: `docs/screenshots/` único, excepciones `playwright-report/`, `test-results/`, `public/`. Commit `141fa72`.

### Deferred to pre-deploy `staging`

- **1-03**: Rotar JWTs Supabase del VPS (anon + service_role). 100% acceso VPS.
- **1-05**: Password Postgres del VPS rotada. 100% acceso VPS.

### Known issues / debt aceptada

- **Lint 118 errores + 23 warnings preexistentes** del baseline `dashboard-esden` (bajada -46 desde el baseline original de 164 errores). Decisión Javi HP 22-05-2026: diferir limpieza a Sprint 1. No bloquea `v0.1.0` porque typecheck y build pasan en verde.
- **WCAG 2.2 AA**: 5 findings (`/login`: 1 serious + 2 moderate, `/dashboard`: 1 serious + 1 moderate) absorbidos por SP-4B phase-01 (validación Renzo).
- **Sin tests unit/integration**: no definidos en `package.json` aún. Cobertura cubierta vía E2E + smoke flows en Sprint 0.

### References

- Plan: [`plans/260520-1342-sprint-0-hotfixes-seguridad/plan.md`](plans/260520-1342-sprint-0-hotfixes-seguridad/plan.md)
- Decisiones cerradas: [`docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md`](docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md)
- Gap analysis spec vs code: [`docs/audit/gap-analysis-spec-vs-code.md`](docs/audit/gap-analysis-spec-vs-code.md)
- Documentación cliente: `docs/Docs-entrega-clienta/` + análisis Bea+Renzo V1 en CLOSE-3 report.

---

## [Unreleased] — Sprint 1

**Sprint 1 — Capa de datos** · rama: `feature/sprint-01-capa-datos` · objetivo: consolidar `@supabase/ssr` + Zod + Repository pattern + RLS hardening sin ORM nuevo. Tag previsto: `v0.2.0`.

Estado: 🟡 In progress (kickoff `4b43b78`, NEW-01 fix `837e12f`, lint fix `98b2c70`).
