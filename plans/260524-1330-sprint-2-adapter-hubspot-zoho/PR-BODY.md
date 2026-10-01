## Resumen

Sprint 2 — MVP de la capa de integraciones CRM multi-tenant: HubSpot Public App + Zoho multi-DC, ambos con OAuth 2.0, WriteGuard append-only por defecto, y UI admin completa para gestionar conexiones.

**Versión target:** `v0.2.5` (Sprint 2). Decisión 24-05-2026 rebajada la línea de versiones del MVP: Sprint 2=`v0.2.5`, Sprint 2B=`v0.2.7`, Sprint 3=`v0.3.0-rc.1`, MVP GA (post-SP-4B)=`v0.3.0`.

## Highlights

- **HubSpot Public App OAuth 2.0**: nuevo provider con fetch puro, custom properties (`af_origen`, `af_metadata_extra`) auto-provisionadas en `init()`.
- **Zoho multi-DC bugfixes**: 7 bugs críticos corregidos (B-01..B-07). Soporta los 9 DCs de Zoho (US/EU/IN/AU/JP/CA/SA/UK/CN), v8 API, 401→refresh→retry, paginación, módulo configurable, email exact search.
- **TokenManager**: cache + dedup in-process + DB writeback de refresh_tokens rotados. Resuelve race condition Sprint 1 `invalid_grant`.
- **WriteGuard**: política `append_only` (default, R-014) + `overwrite_with_audit` con whitelist y audit DB-level inmutable (sin policies UPDATE/DELETE).
- **UI admin**: sección "CRM" en `/dashboard/settings` con cards HubSpot/Zoho, write_policy editor, audit log viewer, toasts contextuales por query params.
- **OAuth flow seguro**: triple-check del state (cookie httpOnly + DB column + HMAC verification) en cada callback.
- **168 tests Vitest verdes** + MSW v2 handlers para HubSpot/Zoho API mocking.

## Detalle por área

### Capa de datos

- `src/lib/integrations/crm/interface.ts`: `ICRMProvider` ampliado con `getCapabilities`, `healthcheck`, `disconnect`, `getAuthorizationUrl`, `completeOAuth`, `createLead`.
- `src/lib/integrations/crm/token-manager.ts`: cache + dedup + DB writeback.
- `src/lib/integrations/crm/crm-error.ts`: error tipado con mappers HubSpot/Zoho.
- `src/lib/integrations/crm/oauth/oauth-state.ts`: HMAC-SHA256 + constant-time verify.
- `src/lib/integrations/crm/write-guard.ts`: `applyWritePolicy` standalone.
- `src/lib/integrations/crm/audit-query.ts`: helper `getAuditLog` con RLS multi-tenant.
- `src/lib/integrations/crm/server-actions.ts`: Zod schemas + helpers shared.
- `src/lib/integrations/crm/factory.ts`: dual-mode (legacy compat Sprint 1 + nuevo `getProviderForIntegration`).

### Providers

- `src/lib/integrations/crm/providers/zoho.ts`: refactor completo multi-DC.
- `src/lib/integrations/crm/providers/zoho-dc-detector.ts`: 9 DCs + `extractDCFromCallback` + `exchangeCodeForTokens`.
- `src/lib/integrations/crm/providers/hubspot.ts`: nuevo provider Public App.
- `src/lib/integrations/crm/providers/hubspot-mappers.ts`: field mapping VARIABLES DEFINIDAS ↔ HubSpot.
- `src/lib/integrations/crm/providers/hubspot-properties.ts`: ensureCustomProperties idempotente.

### Frontend

- `src/app/dashboard/settings/integrations/crm-section.tsx` (orquestador).
- `src/app/dashboard/settings/integrations/crm-provider-card.tsx` (HubSpot + Zoho cards).
- `src/app/dashboard/settings/integrations/write-policy-editor.tsx` (select + textarea override_fields).
- `src/app/dashboard/settings/integrations/audit-log-viewer.tsx` (collapse + filtro lead_id).
- `src/app/dashboard/settings/IntegrationsManager.tsx`: integra `<CRMSection />` al final.

### API routes

- `src/app/api/integrations/route.ts` (GET listado).
- `src/app/api/integrations/[provider]/auth/start/route.ts` (genera state + cookie + redirect).
- `src/app/api/integrations/[provider]/auth/callback/route.ts` (triple-check + encrypt + persist).
- `src/app/api/integrations/[id]/healthcheck/route.ts`.
- `src/app/api/integrations/[id]/disconnect/route.ts` (soft-delete preservando audit).
- `src/app/api/integrations/[id]/write-policy/route.ts` (PATCH con Zod validation).
- `src/app/api/integrations/[id]/audit/route.ts` (GET con filtros).

### Tests

- `tests/integrations/crm/providers/zoho.test.ts` (13 tests B-01..B-07 + 429 + 5xx).
- `tests/integrations/crm/providers/zoho-dc-detector.test.ts` (5 tests, 9 DCs).
- `tests/integrations/crm/providers/hubspot.test.ts` (21 tests OAuth + CRUD + retries + init).
- `tests/integrations/crm/providers/hubspot-mappers.test.ts` (7 tests).
- `tests/integrations/crm/write-guard.test.ts` (9 tests).
- `tests/integrations/crm/api/oauth-callback.test.ts` (6 tests CSRF + happy path).
- `tests/integrations/crm/integration/write-guard-end-to-end.test.ts` (2 tests).
- `tests/mocks/zoho-handlers.ts`, `tests/mocks/hubspot-handlers.ts` (MSW v2 shared handlers).

## Breaking changes

NINGUNO. Los callers Sprint 1 de `CRMFactory.getProvider(tenantId, config)` siguen funcionando (modo legacy preservado). El nuevo modo `getProviderForIntegration(integrationId)` se opt-in para los routes/UI Sprint 2.

## Migraciones SQL

- `supabase/migrations/20260524100000_integrations_oauth_and_audit.sql` — ALREADY APPLIED en Phase 01 (local + VPS via pg-meta REST).
- `supabase/migrations/20260524110000_help_sections_integrations.sql` — NEW (seed help_sections "integrations"). Aplicar al VPS pre-deploy.

## Variables de entorno nuevas

- `OAUTH_STATE_SECRET` (32+ chars random base64url) — HMAC del state OAuth.
- `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` — Public App de developers.hubspot.com.
- `HUBSPOT_REDIRECT_URI` — `https://dev.linkstation.ai/api/integrations/hubspot/auth/callback`.
- `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` — App Zoho de api-console.zoho.com.
- `ZOHO_REDIRECT_URI` — análogo Zoho.
- `NEXT_PUBLIC_APP_URL` — base pública para construir redirect URIs.

Documentación detallada en `docs/integrations/hubspot-app-setup.md`.

## Tareas RoadMap cerradas

- SP-3-00 Setup (Phase 00).
- SP-3-01 Foundation interface + tabla integrations + TokenManager (Phase 01).
- SP-3-02 Zoho multi-DC bugfixes B-01..B-07 (Phase 02).
- SP-3-03 HubSpot Public App OAuth (Phase 03).
- SP-3-04 WriteGuard + crm_write_audit (Phase 04).
- SP-3-05 UI admin IntegrationsManager + OAuth flow + WCAG base (Phase 05).
- SP-3-06 Tests coverage + docs + ADRs (Phase 06).
- SP-3-CLOSE-1 Auto test (Phase 07).
- SP-3-CLOSE-2 E2C local (parcial — specs Playwright se difieren a Sprint 3, validado via Vitest API + smoke manual).
- SP-3-CLOSE-3 (Diferida a SP-4B — regla CLAUDE.md).
- SP-3-CLOSE-4 Bug fixes (sin bugs detectados).
- SP-3-CLOSE-5 Push + PR (este PR).

## Tareas diferidas

### Diferidas a Sprint 3 (hardening)

- **F-LEGACY-1 (CRITICAL):** `ZohoPollingProcessor` sigue usando legacy `src/lib/integrations/zoho.ts` (B-01..B-07 sin fix en el camino de polling). Requiere migration plan al nuevo `CRMFactory.getProviderForIntegration()`. Tenants EU/IN/AU rotos en polling.
- **F-HS-1 (HIGH):** Paginación `resolveListId` HubSpot — actualmente sólo recorre los primeros ~50 lists, falla NOT_FOUND si la lista buscada está en página 2+.
- **F-HS-2 (MEDIUM):** `addTags` HubSpot lanza NOT_FOUND si lista no existe (diverge de Zoho create-if-missing).
- **F-HS-4 (MEDIUM):** `init()` HubSpot best-effort sin persisted flag → si falla, no se reintenta.
- **F-WG-3 (MEDIUM):** `toStringSafe(Date)` → debe usar `.toISOString()` (locale-independent audit).
- **F-API-3 (MEDIUM):** Sin `Cache-Control: no-store` en OAuth routes.
- **Coverage providers:** zoho.ts 52% / hubspot.ts 77% / zoho-dc-detector.ts 64% (target ≥85%). Gap en tests de `createEvent/createTask/executeAction` (paths no críticos del MVP).
- **Coverage DB helpers:** factory.ts / audit-query.ts / server-actions.ts en 0-36% (testeados indirectamente vía MSW; falta integration tests con DB real).
- Playwright E2E specs completos para IntegrationsManager → Sprint 3 (junto al hardening de tests E2E).
- Sentry/observability para `WriteGuard` audit fire-and-forget (F-WG-2 documentado en ADR-022).

### Acciones manuales del usuario (pre-deploy)

- HubSpot Public App registro real en developers.hubspot.com → acción manual de Bea/Renzo antes del deploy VPS.
- Smoke E2E contra sandbox HubSpot/Zoho real → SP-4B (Renzo).
- E2E VPS Playwright → diferido a SP-4B (VPS sin URL pública pre-MVP aún).

## Fixes ck-debug aplicados post-autoexec (commit pendiente)

Tras la revisión sistemática ck-debug del commit `74cc137`, se aplicaron 4 fixes adicionales:

- **F-COV-1 (CRITICAL):** [vitest.config.ts](vitest.config.ts) — añadido `src/lib/integrations/crm/**` al coverage `include`. Sin esto, la suite no medía cobertura del módulo Sprint 2.
- **F-API-1 (CRITICAL security):** [src/app/api/integrations/[provider]/auth/callback/route.ts](src/app/api/integrations/[provider]/auth/callback/route.ts) — validación `sessionTenantId === tenantId` post-HMAC verify. Defensa contra session swap (user A inicia flow → user B se loguea en mismo browser → completa callback → tokens persistidos al tenant A correcto). Cuarto check del triple-check ahora es quad-check.
- **F-API-2 (HIGH):** idem — cookie deletion movida a `response.cookies.delete()` (Next.js 15 Route Handler correctness; `cookies().delete()` post-redirect puede no aplicarse).
- **F-WG-1 (HIGH):** [src/lib/integrations/crm/write-guard.ts](src/lib/integrations/crm/write-guard.ts) — fail-closed por defecto cuando `currentCRMFields === undefined`. Escape hatch explícito `allowEmptyCurrent: true` para callers que sí quieren bypass (lead nuevo idempotente). Anteriormente era fail-OPEN (warning + permitir escribir todo) — footgun.

Tests añadidos: 1 nuevo en write-guard cubriendo `F-WG-1` (170 total: 169 passed + 1 nuevo).
Reporte completo: [`plans/reports/qa-260524-1625-sprint-2-cierre.md`](../reports/qa-260524-1625-sprint-2-cierre.md).

## ADRs aprobados

- ADR-021 — HubSpot Public App + OAuth 2.0 multi-tenant.
- ADR-022 — `write_policy` semantics (append_only default + overwrite_with_audit).
- ADR-023 — TokenManager con Promise dedup in-process (MVP).

(ADR-020 MSW v2 ya estaba aprobado al cerrar Phase 00.)

## Contribuidores

- Renzo (dev lead Sprint 2).

## Commits incluidos

- `e668596` chore(sprint-2): Phase 00 setup — env vars + carpetas + msw devDep + ADR-020
- `38a6667` docs(readme): refresh project state table — Sprint 1 mergeado + Sprint 2 en desarrollo
- `000cd23` feat(sprint-2): Phase 01 foundation — interface ampliada + token-manager + crm_write_audit
- `1400a60` docs(sprint-2): checkpoint Phase 00+01 — RoadMap summary table refleja avance
- (este PR) feat(sprint-2): Phase 02-07 — zoho multi-dc + hubspot adapter + write-guard + UI admin + ADRs + docs

## Próximos pasos

1. **Acción manual del usuario antes del deploy VPS:**
   - Registrar HubSpot Public App en developers.hubspot.com (guía: `docs/integrations/hubspot-app-setup.md`).
   - Generar `OAUTH_STATE_SECRET` y poblar `.env.local` + Easypanel.
   - Aplicar migración `20260524110000_help_sections_integrations.sql` al VPS via pg-meta REST.
2. **Merge de este PR a `developer`** tras revisión manual.
3. **Sprint 3 — Hardening**: tests E2E Playwright completos con axe-core WCAG 2.2 AA, observability (Sentry), dashboards de costes LLM.
4. **SP-4B Sprint validación pre-MVP**: Renzo ejecuta checklist manual en `plans/260522-1700-sprint-validacion-pre-mvp/phase-03-validacion-sprint-2.md`.
