# Phase 01 — Foundation: interface, migración integrations, TokenManager

## Context Links

- [plan.md](./plan.md) — overview
- [researcher-03-adapter-pattern.md](./research/researcher-03-adapter-pattern.md) §1 (interface), §3 (SQL), §5 (TokenManager), §6 (CRMError)
- Existente: `src/lib/integrations/crm/interface.ts`, `src/lib/integrations/crm/factory.ts`, `src/lib/crypto/token-crypto.ts`, `supabase/migrations/20260522220003_integrations_table.sql`

## Overview

- **Prioridad:** P1 (blocker para Phase 02, 03, 04)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** sentar la base del Sprint: ampliar `ICRMProvider` con OAuth + lifecycle + capabilities, migrar tabla `integrations` con columnas nuevas + `UNIQUE(tenant_id)`, crear `crm_write_audit`, implementar `TokenManager` con dedup de refresh concurrentes, crear `CRMError` tipado, refactorizar `factory.ts` para usar `TokenManager`.
- **Tiempo estimado:** 14h 00min

## Key insights

- La interfaz actual cubre 80% — sólo faltan `healthcheck/disconnect/getAuthorizationUrl/completeOAuth/createLead/getCapabilities` (researcher-03 §1).
- **Promise dedup** en TokenManager es crítico: si llegan 5 requests concurrentes con token expirado, sin lock las 5 llaman a refresh y la 1ª invalida las otras 4 con `invalid_grant` (researcher-03 §5).
- **DB write-back**: cuando refresca tokens en memoria, debe persistir el nuevo `refresh_token` cifrado a DB inmediato. Si no, en cold start lee el viejo y muere.
- **append-only DB-level**: `crm_write_audit` sin policies UPDATE/DELETE = no se puede modificar audit ni con bug en código (researcher-03 §3b).
- `UNIQUE(tenant_id)` en `integrations` enforza la decisión cliente "1 CRM activo por tenant".

## Requirements

### Funcionales

- `ICRMProvider` ampliado con métodos: `getCapabilities()`, `healthcheck()`, `disconnect()`, `getAuthorizationUrl(state, redirectUri)`, `completeOAuth(code, redirectUri)`, `createLead(data)`. Mantiene compatibilidad con métodos existentes (`getLead/searchLeads/updateLead/addTags/executeAction/createEvent/createTask`).
- `CRMTokens` y `CRMCapabilities` exportados desde `interface.ts`.
- `CRMError` clase + `mapHubSpotError` + `mapZohoError` helpers.
- `TokenManager` con `getValidTokens(integrationId)` que: lee DB cifrada → decrypta → si expira en <5min llama refresh → re-cifra → persiste a DB → cachea in-memory.
- `tokenCache` + `refreshInFlight` Map module-level (singleton in-process).
- Migración SQL: añade columnas a `integrations` + crea `crm_write_audit` + cambia constraint a `UNIQUE(tenant_id)` (drop UNIQUE(tenant_id, crm_type) si existía).
- `factory.ts` refactorizado: cache por `integrationId` (no por `tenant_id`), TTL 30min, integra `TokenManager`.

### No funcionales

- Files <200 líneas (split `token-manager.ts` de `oauth-state.ts` de `crm-error.ts`).
- TypeScript strict — sin `any` en API pública.
- Migración idempotente (`IF NOT EXISTS`, `IF EXISTS` en drops).
- `EXPLAIN ANALYZE` en migración no añade indices innecesarios (solo los citados en researcher-03 §3b).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  src/lib/integrations/crm/                                       │
│  ┌──────────────────┐   ┌──────────────────┐                    │
│  │  interface.ts    │   │  crm-error.ts    │                    │
│  │  (ICRMProvider,  │   │  (CRMError +     │                    │
│  │   CRMCapabilities│   │   map helpers)   │                    │
│  │   CRMTokens)     │   └──────────────────┘                    │
│  └──────────────────┘                                            │
│           ▲                                                       │
│           │ implements                                            │
│  ┌────────┴─────────┐   ┌──────────────────┐                    │
│  │  providers/      │   │  token-manager.ts│                    │
│  │   zoho.ts        │◄──┤  (getValidTokens │                    │
│  │   hubspot.ts     │   │   + dedup lock)  │                    │
│  └──────────────────┘   └──────────────────┘                    │
│           ▲                       │                              │
│           │ creates                │ read/write cipher            │
│  ┌────────┴─────────┐              ▼                              │
│  │  factory.ts      │   ┌──────────────────────────┐             │
│  │  (cache TTL,     │   │  Supabase admin client   │             │
│  │   instance per   │   │  integrations table      │             │
│  │   integrationId) │   │  + crm_write_audit       │             │
│  └──────────────────┘   └──────────────────────────┘             │
│           ▲                                                       │
│           │                                                       │
│  ┌────────┴─────────┐                                            │
│  │  oauth/          │                                            │
│  │   oauth-state.ts │  (HMAC sign/verify state)                 │
│  └──────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘

Flujo de un request al CRM:
  caller → factory.getProvider(integrationId)
        → factory cache miss → TokenManager.getValidTokens(integrationId)
        → if refresh needed: refreshInFlight check → doRefresh() → DB writeback
        → return TokenState → factory instantiates provider with tokens
        → caller calls provider.searchLeads(...) → provider uses cached accessToken
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/interface.ts` (ampliar)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/factory.ts` (refactor cache + TokenManager)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/providers/zoho.ts` (constructor recibe tokens del TokenManager, ya no maneja refresh propio — fase 02 termina la integración)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/token-manager.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/crm-error.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/oauth/oauth-state.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/supabase/migrations/20260524100000_integrations_oauth_and_audit.sql`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/token-manager.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/oauth-state.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/crm-error.test.ts`

### Borrar

- Ninguno (solo additive + refactor).

## Implementation steps

1. **Editar `interface.ts`**: añadir `CRMCapabilities`, `CRMTokens`, `WriteContext` types. Ampliar `ICRMProvider` con los 6 nuevos métodos. Marcar contract con JSDoc.
2. **Crear `crm-error.ts`** con `CRMError` clase + `mapHubSpotError` + `mapZohoError` (copy literal del researcher-03 §6).
3. **Crear `oauth/oauth-state.ts`** con `generateOAuthState(tenantId)` + `verifyOAuthState(state, expectedTenantId)`. Lectura de `OAUTH_STATE_SECRET` con check de presencia (throw al boot si falta).
4. **Test `oauth-state.test.ts`**: golden cases (valid → true), tampering (cambiar nonce → false), timing attack (constant-time via Buffer.equals), missing env → throws.
5. **Test `crm-error.test.ts`**: mapHubSpot 401→AUTH_FAILED, 429→RATE_LIMITED con retryAfterMs, 422→VALIDATION con originalError. Idem mapZoho con `INVALID_TOKEN`, `OAUTH_SCOPE_MISMATCH`, `RECORD_NOT_FOUND`.
6. **Crear migración SQL `20260524100000_integrations_oauth_and_audit.sql`**:
   - `ALTER TABLE integrations ADD COLUMN IF NOT EXISTS access_token_encrypted bytea`
   - `ADD COLUMN IF NOT EXISTS refresh_token_encrypted bytea`
   - `ADD COLUMN IF NOT EXISTS expires_at timestamptz`
   - `ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb`
   - `ADD COLUMN IF NOT EXISTS write_policy text NOT NULL DEFAULT 'append_only' CHECK (...)`
   - `ADD COLUMN IF NOT EXISTS override_fields text[] DEFAULT '{}'`
   - `ADD COLUMN IF NOT EXISTS oauth_state text`
   - `ADD COLUMN IF NOT EXISTS last_healthcheck_at timestamptz`
   - `ADD COLUMN IF NOT EXISTS healthcheck_status text CHECK (...)`
   - `ADD COLUMN IF NOT EXISTS portal_id text` (HubSpot hub_id)
   - Drop UNIQUE (tenant_id, crm_type) si existía + `ADD CONSTRAINT integrations_tenant_unique UNIQUE (tenant_id)`
   - `CREATE TABLE crm_write_audit (...)` con RLS append-only (sólo `service_role` INSERT, `authenticated` SELECT propio tenant o `is_admin`).
   - 2 índices: `(tenant_id, lead_id, created_at DESC)` y `(integration_id, created_at DESC)`.
   - COMMENT ON COLUMN para `write_policy`, `override_fields`, `oauth_state`, `portal_id`.
7. **Aplicar migración local**: `npx supabase migration up` (Supabase local). Validar con `psql` que columnas existen y RLS está habilitada.
8. **Crear `token-manager.ts`** (researcher-03 §5): `getValidTokens`, `doRefresh`, `tokenCache`, `refreshInFlight`. **No** incluye `callRefreshEndpoint` aquí — declara firma y delega a función provider-specific importada de `providers/zoho.ts` y `providers/hubspot.ts` (Phase 02/03). Mock temporal con `throw new Error('NOT_IMPLEMENTED')` para `crm_type === 'hubspot'`.
9. **Test `token-manager.test.ts`**:
   - Happy path: token válido → returns cached, no DB hit.
   - Expirado: refresh in-flight = null → dispatches doRefresh → cache updated.
   - Concurrent: 5 promises simultáneas → solo 1 doRefresh ejecutado (spy).
   - DB writeback: encrypted cipher cambia + `expires_at` actualizado.
10. **Refactor `factory.ts`**: cache key = `integrationId` (no `tenant_id:provider`). TTL 30min (timer cleanup). Constructor del provider recibe `TokenState` del TokenManager + `metadata` + helpers `onTokenRotated` callback (notifica al TokenManager re-escribir DB).
11. **Smoke test factory**: `factory.getProvider('fake-id')` con DB seed mínimo retorna instancia válida.
12. **TypeScript check**: `npm run typecheck` exit 0.
13. **Build check**: `npm run build` exit 0 (incluso si zoho.ts no compila por refactor pendiente, marcar `// @ts-expect-error PHASE-02-FIX` temporal — limpiar en Phase 02).
14. **Commit** `feat(sprint-2): foundation interface + integrations migration + token-manager` con mensaje detallado.

## Todo list

- [x] Ampliar `interface.ts` con OAuth + capabilities + lifecycle
- [x] Crear `crm-error.ts` con mappers
- [x] Crear `oauth/oauth-state.ts` HMAC sign/verify
- [x] Tests `oauth-state.test.ts` + `crm-error.test.ts`
- [x] Crear migración SQL `20260524100000_integrations_oauth_and_audit.sql`
- [x] Aplicar migración local + validar con psql
- [x] Crear `token-manager.ts` con dedup lock
- [x] Test `token-manager.test.ts` (concurrent dedup case)
- [x] Refactor `factory.ts` cache por integrationId + TTL
- [x] Smoke factory.getProvider
- [x] `npm run typecheck` + `npm run build` verdes
- [x] Commit a feature branch

## Success criteria

- `npm run typecheck` exit 0.
- Migración aplica idempotente: 2 ejecuciones consecutivas no fallan.
- `psql` confirma: `crm_write_audit` existe con RLS; `integrations.write_policy` default `append_only`; `UNIQUE(tenant_id)` constraint activa.
- Test `token-manager.test.ts` "concurrent dedup" pasa: 5 promises in-flight → 1 doRefresh call.
- Coverage de `crm/` (excluyendo providers/) ≥80%.

## Risk assessment

| Riesgo                                                                                        | Likelihood                    | Impact | Mitigación                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Migración rompe datos seed de Sprint 1                                                        | Media                         | Alto   | Backup local antes (`pg_dump`). Migración `IF NOT EXISTS`. Test contra schema vacío + schema con datos.                                      |
| Cambio `UNIQUE(tenant_id, crm_type) → UNIQUE(tenant_id)` falla si hay rows con múltiples CRMs | Baja (sin uso productivo aún) | Alto   | Pre-migración: query `SELECT tenant_id, count(*) FROM integrations GROUP BY tenant_id HAVING count(*)>1`. Si 0 rows → safe. Si >0 → escalar. |
| TokenManager Map memory leak en dev con HMR                                                   | Media                         | Bajo   | Documentar en JSDoc: en dev con HMR la cache se rehidrata por módulo. No es bug productivo.                                                  |
| `OAUTH_STATE_SECRET` no presente en runtime → boot crash                                      | Media                         | Medio  | Validación temprana en `oauth-state.ts` con mensaje claro `"OAUTH_STATE_SECRET missing — see .env.example"`.                                 |

## Security considerations

- `OAUTH_STATE_SECRET` validado al boot — fail-fast si missing.
- `crm_write_audit` RLS: solo `service_role` INSERT (server actions) y `authenticated` SELECT del propio tenant. Verificar con test SQL que `anon` no ve nada.
- `integrations.oauth_state` se limpia en callback exitoso (Phase 03/02).
- `access_token_encrypted`/`refresh_token_encrypted` jamás expuestos vía REST. Tipados como `bytea`, nunca seleccionados desde rutas API públicas.
- TokenManager nunca loguea valores de tokens. Solo `integrationId` + estado (`hit/miss/refresh`).
- `CRMError.originalError` puede contener mensajes del CRM con datos sensibles. Documentar: NO loguear `originalError` en producción salvo en debug mode.

## Tests requeridos

- Unit: `oauth-state.test.ts` (sign/verify/tampering/timing), `crm-error.test.ts` (mappers), `token-manager.test.ts` (cache/refresh/dedup/DB writeback).
- Integration (Phase 06): factory + TokenManager + mock provider.
- SQL test: rls-test-suite valida que `authenticated` no INSERT en `crm_write_audit` y solo SELECT su tenant.
- Coverage target ≥80%.

## Dependencies

- Phase 00 (env + msw setup) 🟢 obligatorio.

## Next phase

- Phase 02 (Zoho multi-DC bugfixes) y/o Phase 03 (HubSpot) y/o Phase 04 (WriteGuard) — pueden ejecutarse en paralelo.
