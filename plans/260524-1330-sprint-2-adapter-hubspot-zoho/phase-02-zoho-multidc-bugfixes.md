# Phase 02 — Zoho multi-DC bugfixes (B-01..B-07) + tests

## Context Links

- [plan.md](./plan.md) — overview
- [researcher-02-zoho-multidc.md](./research/researcher-02-zoho-multidc.md) §9 (bugs B-01..B-08), §1 (DC table), §2 (DC detection), §3 (scopes), §4 (refresh), §6 (search), §9 (patches)
- Existente: `src/lib/integrations/crm/providers/zoho.ts`

## Overview

- **Prioridad:** P1 (Zoho está en el MVP — bug B-01/B-02 impide cualquier tenant no-US)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** corregir los 7 bugs críticos del adapter Zoho actual: hardcoded US DC (B-01), hardcoded tokenUrl (B-02), no 401→refresh→retry (B-03), no OAuth init flow (B-04), no paginación searchLeads (B-05), módulo Leads hardcoded (B-06), email criteria "contains" no exact (B-07). Migrar a Zoho v8 (B-08).
- **Tiempo estimado:** 10h 00min

## Key insights

- `api_domain` viene en el response del token exchange — usar ese, **no** mapa estático para llamadas API (researcher-02 §1, §2).
- `accounts-server` y `location` vienen como query params en el OAuth callback — persistir AMBOS (researcher-02 §2).
- Refresh tokens son DC-bound: refresh_token EU debe refrescarse contra `accounts.zoho.eu`, NO US (researcher-02 §2 "Refresh token is DC-bound").
- `equals` en email es "contains" en Zoho search; usar `?email=...` query param para exact match (researcher-02 §6).
- Scopes granulares: `ZohoCRM.modules.leads.READ,WRITE`, etc. — evitar `ALL` salvo necesidad explícita (researcher-02 §3 "ZohoCRM.modules.ALL vs granular").
- v8 vs v2: v8 es la versión actual. Migrar paths `/crm/v2/` → `/crm/v8/`.
- Refresh rate limit: 10 refreshes/10min por refresh_token. TokenManager dedup ya mitiga (Phase 01).

## Requirements

### Funcionales

- `ZohoCRMProvider` implementa `ICRMProvider` completo (con métodos OAuth añadidos en Phase 01).
- `getAuthorizationUrl(state, redirectUri)` genera URL `accounts.zoho.com/oauth/v2/auth` con scopes granulares + `access_type=offline`.
- `completeOAuth(code, redirectUri)` recibe `code` + `location` + `accounts-server` (vienen como params en el callback del adapter wrapper Phase 05), intercambia por tokens, persiste `api_domain` + `accounts_server` + `location` en `integrations.metadata`.
- `request()` privado: 401 con code `INVALID_OAUTHTOKEN` o `AUTHENTICATION_FAILED` → invalida cache de TokenManager + retry 1 vez. Si retry también 401 → throw `CRMError(AUTH_FAILED)`.
- `searchLeads(criteria, page=1, perPage=200)` con paginación. Soporta hasta 10 páginas (2000 records). Si caller necesita >2000, debe pasar `criteria` que segmente.
- `findLeadByEmail(email)` usa `/Leads/search?email=...` (exact match).
- `apiBase` y `tokenUrl` se construyen desde `metadata.api_domain` y `metadata.accounts_server` cargados por TokenManager. **NUNCA** valores hardcoded.
- Módulo configurable: constructor acepta `moduleName` (default `Leads`), per-tenant from `integrations.metadata.module_name`.
- Migración v8: todos los paths `/crm/v8/`.

### No funcionales

- File `zoho.ts` <200 líneas. Si necesario, split: `zoho.ts` (clase principal) + `zoho-dc-detector.ts` (helpers de DC) + `zoho-types.ts` (types Zoho-specific).
- Sin `any` en API pública.
- 0 logs de tokens. Solo logs de status codes y error codes.

## Architecture

```
ZohoCRMProvider
  ├── constructor(opts: { tokens: CRMTokens, metadata: { api_domain, accounts_server, location, module_name } })
  │     apiBase = `${metadata.api_domain}/crm/v8`
  │     tokenUrl = `${metadata.accounts_server}/oauth/v2/token`
  │     moduleName = metadata.module_name ?? 'Leads'
  │
  ├── getCapabilities() → { hasBlueprints: true, hasDataCenters: true, ... }
  ├── healthcheck() → GET /Leads?per_page=1 → return ok
  ├── disconnect() → POST /oauth/v2/token/revoke (delete refresh)
  │
  ├── getAuthorizationUrl(state, redirectUri) → builds accounts.zoho.com/oauth/v2/auth URL (default US)
  │     Note: para multi-DC el caller debe pasar accountsServer override si lo sabe
  │
  ├── completeOAuth(code, redirectUri, dcContext: { accountsServer, location })
  │     → POST {accountsServer}/oauth/v2/token grant_type=authorization_code
  │     → returns CRMTokens + apiDomain (caller persiste en metadata)
  │
  ├── private request(path, options, retried=false)
  │     → await TokenManager.getValidTokens(integrationId)  // delegado
  │     → fetch with Authorization: Zoho-oauthtoken
  │     → if 401 + code INVALID_OAUTHTOKEN + !retried: invalidate cache + retry
  │     → if 429: respect Retry-After (Zoho no envía → default 60s)
  │     → if 5xx: exponential backoff 250→2000→8000, max 3 retries
  │     → map errors via mapZohoError() → throw CRMError
  │
  ├── createLead/getLead/searchLeads(paginated)/updateLead/addTags/executeAction/createEvent/createTask
  └── findLeadByEmail (uses exact ?email= param)
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/providers/zoho.ts` (refactor completo)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/token-manager.ts` (registrar `callRefreshEndpoint` para `crm_type === 'zoho'`)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/providers/zoho-dc-detector.ts` (helpers + LOCATION_TO_ACCOUNTS table + `extractDCFromCallback`)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/providers/zoho.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/providers/zoho-dc-detector.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/mocks/zoho-handlers.ts`

## Implementation steps

1. **Crear `zoho-dc-detector.ts`**: `LOCATION_TO_ACCOUNTS` map (9 DCs), `extractDCFromCallback(params)`, `exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri, accountsServer })` (researcher-02 §9 Patch 2).
2. **Test `zoho-dc-detector.test.ts`**: parses `?location=eu&accounts-server=...`, fallback US si missing, exchange returns `apiDomain`.
3. **Refactor `zoho.ts`**:
   - Constructor recibe `{ tokens, metadata, integrationId, onTokenRotated }`. Quita defaults hardcoded US.
   - `apiBase = metadata.api_domain + '/crm/v8'`.
   - `tokenUrl = metadata.accounts_server + '/oauth/v2/token'`.
   - `moduleName = metadata.module_name ?? 'Leads'`.
   - `getCapabilities()` retorna objeto literal.
   - `getAuthorizationUrl(state, redirectUri)` (researcher-02 §3, scopes granulares).
   - `completeOAuth(code, redirectUri, dcContext)` llama `exchangeCodeForTokens` y devuelve `CRMTokens + apiDomain` para que caller persista en metadata.
   - `request()` con 401 retry una vez (researcher-02 §9 Patch 3) + 429 con backoff + 5xx exp backoff.
   - `searchLeads(criteria, page=1, perPage=200)` con paginación (Patch 4).
   - `findLeadByEmail(email)` con `?email=` (Patch 5).
   - `healthcheck()` = `GET /${moduleName}?per_page=1` → boolean.
   - `disconnect()` = `POST {accountsServer}/oauth/v2/token/revoke?token=...`.
   - `createLead(data)` = `POST /${moduleName}` con array `[{...}]` (formato Zoho).
   - Mappers de errores: usa `mapZohoError` de Phase 01.
4. **Registrar `callRefreshEndpoint` en `token-manager.ts`** para `crm_type === 'zoho'`: usa `metadata.accounts_server` para tokenUrl + Zoho-specific body. Retorna `{ accessToken, refreshToken?, expiresAt, apiDomain? }`. Si `refresh_token` rotado en response, lo devuelve para persistir.
5. **Crear `tests/mocks/zoho-handlers.ts`** (researcher-03 §8) con handlers para: token exchange, token refresh, GET/POST Leads, search, error 401 INVALID_OAUTHTOKEN, error 429.
6. **Test `zoho.test.ts`** (cubre los 7 bugs):
   - **B-01/B-02 fix:** constructor con `metadata.api_domain = 'https://www.zohoapis.eu'` → llamadas van a EU.
   - **B-03 fix:** mock devuelve 401 INVALID_OAUTHTOKEN una vez, luego 200 → invoke retry, verifica solo 1 retry, segunda 200 OK.
   - **B-03 escalación:** 2 × 401 consecutivos → throw `CRMError(AUTH_FAILED)`.
   - **B-04:** `getAuthorizationUrl` retorna URL válida con state + scopes + redirect_uri encoded.
   - **B-04:** `completeOAuth` con grant code → POST a tokenUrl → returns tokens + apiDomain.
   - **B-05:** mock paginado (page 1 = 200, page 2 = 50) → searchLeads(criteria, 2) retorna 50.
   - **B-06:** moduleName custom = `Deals` → paths van a `/Deals/...`.
   - **B-07:** `findLeadByEmail('foo@bar.com')` → URL incluye `?email=foo%40bar.com` (encoded).
   - 429 backoff: mock devuelve 429 una vez → adapter espera + retry.
   - 5xx: mock 503 → retry 3 veces → throw `CRMError(PROVIDER_ERROR, retryable: true)`.
   - Token rotation: refresh response con nuevo `refresh_token` → callback `onTokenRotated` invocado.
7. **Smoke real (opcional, gated):** `INTEGRATION_TEST_REAL=1 npm run test -- zoho` contra sandbox Zoho de Renzo si disponible. Skipped en CI.
8. **`npm run typecheck` + `npm run lint` + `npm run test -- zoho` verdes.**
9. **Commit** `fix(sprint-2): zoho adapter multi-dc + v8 + refresh-retry + pagination`.

## Todo list

- [ ] Crear `zoho-dc-detector.ts` con helpers + LOCATION_TO_ACCOUNTS
- [ ] Tests dc-detector
- [ ] Refactor `zoho.ts`: constructor sin defaults, paths v8, request con 401 retry
- [ ] Implementar `getAuthorizationUrl/completeOAuth/healthcheck/disconnect/createLead/findLeadByEmail/getCapabilities`
- [ ] Paginación en `searchLeads`
- [ ] Módulo configurable
- [ ] Registrar `callRefreshEndpoint(zoho)` en TokenManager
- [ ] Crear mocks MSW `zoho-handlers.ts`
- [ ] Tests `zoho.test.ts` cubriendo B-01..B-07
- [ ] Smoke contra sandbox real (opcional)
- [ ] typecheck + lint + test verdes
- [ ] Commit

## Success criteria

- Tests `zoho.test.ts` cubren explícitamente los 7 bugs B-01..B-07 con casos verde.
- Coverage `providers/zoho*.ts` ≥85%.
- En logs jamás aparecen valores de tokens (verificar con grep en output de test).
- Constructor lanza error claro si `metadata.api_domain` o `metadata.accounts_server` missing.
- Smoke contra sandbox (si gated) conecta + healthcheck + searchLeads sin error.

## Risk assessment

| Riesgo                                                                    | Likelihood | Impact | Mitigación                                                                                                                       |
| ------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Sandbox Zoho de Renzo no disponible para smoke real                       | Alta       | Bajo   | Tests MSW cubren al 95%. Smoke gated por env, no bloquea CI. Documentar en hand-off SP-4B.                                       |
| `unknown field silently ignored` behavior cambia en v8 (researcher-02 §5) | Baja       | Medio  | Test con `INVALID_DATA` code + log warning. WriteGuard (Phase 04) validará campos antes.                                         |
| Blueprints ID schema cambia entre sandbox y prod                          | Media      | Bajo   | `executeAction('BLUEPRINT', { transitionId })` no se rompe — depende solo de existencia del transitionId. Caller debe gestionar. |
| Refresh rate limit 10/10min en tests                                      | Baja       | Bajo   | TokenManager dedup limita refreshes. Tests usan mocks, no quema rate.                                                            |

## Security considerations

- `disconnect()` debe llamar al revoke endpoint Zoho — no solo borrar local. Si la API revoke falla, devolver error pero igualmente limpiar DB local (los tokens locales son inútiles si el adapter no funciona).
- Validar `state` no se usa aquí (Phase 05 lo valida en el route handler antes de invocar `completeOAuth`).
- Logs: NUNCA imprimir `access_token`, `refresh_token`. Imprimir solo `integrationId`, status code, error code.
- `metadata.accounts_server` viene del CRM (trusted source) — pero validar que es URL https antes de usar como base de fetch (evitar SSRF si DB se corrompe).

## Tests requeridos

- Unit: `zoho.test.ts` (los 7 bugs + 429 + 5xx + rotation), `zoho-dc-detector.test.ts`.
- Integration: factory + TokenManager + Zoho provider (mocked).
- E2E (gated): `INTEGRATION_TEST_REAL=1` contra sandbox real.
- Coverage `providers/zoho*` ≥85%.

## Dependencies

- Phase 01 (interface + TokenManager + crm-error + migración) 🟢 obligatorio.

## Next phase

- Phase 05 (UI) puede arrancar tras 02 y 03 ambos 🟢.
- Paralelo con Phase 03 (HubSpot) y Phase 04 (WriteGuard).
