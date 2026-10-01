# Release Notes — v0.2.5 (Sprint 2 — Adapter HubSpot + Zoho + UI admin)

## Resumen

MVP de la capa de integraciones CRM multi-tenant: HubSpot Public App + Zoho multi-DC, ambos con OAuth 2.0, WriteGuard append-only por defecto, UI admin completa para gestionar conexiones, y audit DB-level inmutable.

## Highlights

- **HubSpot Public App OAuth 2.0** — provider con fetch puro, custom properties (`af_origen`, `af_metadata_extra`) auto-provisionadas en `init()`, CRUD contactos + tasks + meetings con association IDs.
- **Zoho multi-DC bugfixes (B-01..B-07)** — 7 bugs críticos corregidos: hardcoded US DC, tokenUrl hardcoded, no 401→refresh→retry, no OAuth init flow, no paginación, módulo Leads hardcoded, email "contains" vs exact. Soporta 9 DCs (US/EU/IN/AU/JP/CA/SA/UK/CN), v8 API.
- **TokenManager** — cache + dedup in-process + DB writeback de refresh_tokens rotados. Resuelve race condition `invalid_grant` de Sprint 1.
- **WriteGuard** — política `append_only` (default, R-014) + `overwrite_with_audit` con whitelist y audit DB-level inmutable. Fail-closed por defecto (escape hatch `allowEmptyCurrent: true`).
- **UI admin** — sección "CRM" en `/dashboard/settings` con cards HubSpot/Zoho, write_policy editor, audit log viewer.
- **OAuth quad-check del state** — cookie httpOnly + DB column + HMAC verification + session tenant match (defensa contra session swap).

## Detalle por área

### Seguridad

- `OAUTH_STATE_SECRET` validado al boot (>=32 chars) — fail-fast.
- Cookie OAuth httpOnly + Secure (prod) + SameSite=Lax + path=/ + TTL 15min.
- Tokens AES-256-GCM (Sprint 1 ADR-017).
- `crm_write_audit` append-only DB-level (RLS sin policies UPDATE/DELETE).
- Cero logs de tokens en providers (solo status codes + error categories).

### Capa de datos

- Migración `20260524100000_integrations_oauth_and_audit.sql`: columnas `write_policy`, `override_fields`, `oauth_state`, `last_healthcheck_at`, `healthcheck_status`, `portal_id` + UNIQUE index parcial `WHERE is_active = true` (1 CRM activo/tenant).
- Tabla `crm_write_audit` con RLS append-only.
- Migración seed `20260524110000_help_sections_integrations.sql` (idempotente UPSERT).

### Frontend

- Nueva sección `<CRMSection />` integrada en `IntegrationsManager.tsx`.
- 4 componentes nuevos: `crm-section.tsx`, `crm-provider-card.tsx`, `write-policy-editor.tsx`, `audit-log-viewer.tsx`.
- Toasts contextuales por query params del callback OAuth (`?success=`, `?error=`).

### API

- 7 endpoints nuevos:
  - `GET /api/integrations` — listado tenant-scoped.
  - `GET/POST /api/integrations/[provider]/auth/start` — genera state + cookie + redirect.
  - `GET /api/integrations/[provider]/auth/callback` — quad-check + encrypt + persist.
  - `POST /api/integrations/manage/[id]/healthcheck`.
  - `POST /api/integrations/manage/[id]/disconnect` — soft-delete preservando audit.
  - `PATCH /api/integrations/manage/[id]/write-policy` con Zod validation.
  - `GET /api/integrations/manage/[id]/audit` — query con filtros.
- **Nota v0.2.6 hotfix (BUG-2-01)**: las rutas de gestión por ID se movieron de `/api/integrations/[id]/*` a `/api/integrations/manage/[id]/*` para resolver conflicto del App Router de Next.js (dos slugs dinámicos hermanos `[id]` y `[provider]` causaban `Error: You cannot use different slug names for the same dynamic path`). Las URLs OAuth `[provider]/auth/*` se mantienen sin cambios (no afecta a redirect URIs registradas en HubSpot/Zoho).

### Infra

- Build verde (`✓ Compiled successfully` + 42 páginas generadas).
- 170 tests Vitest passed + 4 skipped.
- Coverage: token-manager/write-guard/oauth-state/crm-error ≥92%, mappers/properties 100%, providers 52-77% (gaps documentados, defer Sprint 3).

## Breaking changes

NINGUNO. Callers Sprint 1 de `CRMFactory.getProvider(tenantId, config)` siguen funcionando (modo legacy preservado). El nuevo modo `getProviderForIntegration(integrationId)` se opt-in.

## Migraciones SQL

- `supabase/migrations/20260524100000_integrations_oauth_and_audit.sql` — APPLIED LOCAL+VPS (via pg-meta REST, Phase 01).
- `supabase/migrations/20260524110000_help_sections_integrations.sql` — NUEVA. **Aplicar al VPS pre-deploy.**

## Variables de entorno nuevas

- `OAUTH_STATE_SECRET` — HMAC del state OAuth (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).
- `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` — Public App de developers.hubspot.com.
- `HUBSPOT_REDIRECT_URI` — `https://dev.linkstation.ai/api/integrations/hubspot/auth/callback`.
- `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` — App Zoho de api-console.zoho.com.
- `ZOHO_REDIRECT_URI` — análogo Zoho.
- `NEXT_PUBLIC_APP_URL` — base pública para construir redirect URIs.

Guía completa: [`docs/integrations/hubspot-app-setup.md`](docs/integrations/hubspot-app-setup.md).

## Tareas RoadMap cerradas

- SP-3-00..07 (Sprint 2 phases 00-07).
- SP-3-CLOSE-1 Auto test 🟢, CLOSE-2 🟡 parcial (E2E diferido Sprint 3), CLOSE-3 🟢 diferida SP-4B (regla CLAUDE.md), CLOSE-4 🟢 sin bugs, CLOSE-5 🟢 push + PR + merge.

## Tareas diferidas a Sprint 3 (hardening)

- F-LEGACY-1 (CRITICAL): `ZohoPollingProcessor` migration al nuevo factory mode.
- F-HS-1 (HIGH): paginación `resolveListId` HubSpot (>250 lists).
- F-HS-2/F-HS-4/F-WG-3/F-API-3 (MEDIUM): polish batch.
- Coverage providers ≥85% (gap en tests createEvent/createTask/executeAction).
- Coverage DB helpers (factory/audit-query/server-actions) — integration tests SP-4B.
- Playwright E2E specs + axe WCAG 2.2 AA.
- Sentry / observability para WriteGuard audit fire-and-forget.

## ADRs aprobados

- **ADR-021** — HubSpot Public App + OAuth 2.0 multi-tenant.
- **ADR-022** — `write_policy` semantics (append_only default + overwrite_with_audit + audit DB-level inmutable).
- **ADR-023** — TokenManager con Promise dedup in-process (MVP). Migración Redis post-MVP cuando se escale horizontal.

(ADR-020 MSW v2 fue aprobado en Phase 00 anteriormente.)

## Contribuidores

- Renzo (dev lead Sprint 2).

## Commits incluidos

Ver `git log v0.2.0..v0.2.5 --oneline` (11+ commits, range concretado al taggear).

## Próximos pasos

1. **Pre-deploy VPS — acciones manuales del usuario:**
   - Registrar HubSpot Public App en developers.hubspot.com siguiendo `docs/integrations/hubspot-app-setup.md`.
   - Generar `OAUTH_STATE_SECRET` y poblar `.env.local` + Easypanel.
   - Aplicar migración `20260524110000_help_sections_integrations.sql` al VPS via pg-meta REST.
2. **Sprint 2B Dashboard KPIs (v0.2.7)** — bloque NEW-04 Bea: dashboard KPIs agregado configurable. Inicio estimado Lun 27-07-2026.
3. **Sprint 3 Hardening (v0.3.0-rc.1)** — tests E2E completos + observability + WCAG 2.2 AA total + dashboards costes LLM.
4. **SP-4B Validación pre-MVP (v0.3.0 GA)** — Renzo ejecuta checklist consolidado de Sprints 0+1+2+2B+3 en VPS.
