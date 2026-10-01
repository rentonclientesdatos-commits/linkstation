# Phase 03 — HubSpot Public App OAuth 2.0 + ICRMProvider impl + tests

## Context Links

- [plan.md](./plan.md) — overview
- [researcher-01-hubspot.md](./research/researcher-01-hubspot.md) §1 (OAuth), §2 (endpoints v3), §3 (rate limits), §5 (field mapping), §7 (fetch puro), §unknowns
- [researcher-03-adapter-pattern.md](./research/researcher-03-adapter-pattern.md) §1 (interface), §6 (CRMError), §8 (tests)

## Overview

- **Prioridad:** P1 (HubSpot es el segundo CRM del MVP)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** crear `HubSpotCRMProvider` desde cero implementando `ICRMProvider`. Public App + OAuth 2.0 (full flow start → callback → tokens cifrados). CRUD contactos via API v3, tasks + meetings con associations, custom properties `af_origen` + `af_metadata_extra` auto-provisionadas en `init()`. Fetch puro (sin SDK).
- **Tiempo estimado:** 16h 00min

## Key insights

- **Public App obligatoria** para multi-tenant (researcher-01 §1 "App type decision"). 1 app registrada en HubSpot Developer Portal → `HUBSPOT_CLIENT_ID` + `HUBSPOT_CLIENT_SECRET` en `.env`.
- **`portal_id` (hub_id)** viene en el token exchange response — clave para identificar el portal HubSpot del tenant. Persistir en `integrations.portal_id`.
- **Fetch puro**: rechazar `@hubspot/api-client` (~40MB, node-fetch, no tree-shake, no Edge Runtime). Replicar patrón Zoho con wrapper `request()` privado (researcher-01 §7).
- **Token TTL 30min** (más corto que Zoho 60min). Refresh 5min antes de expirar — TokenManager ya gestiona.
- **Refresh token puede rotar**: si response trae nuevo `refresh_token`, persistir inmediato (researcher-01 §1 "Token lifetimes").
- **Search API rate limit duro: 4 req/s** (binding constraint). Para MVP no implementar rate limiter in-process — confiar en backoff 429.
- **Meeting timestamps en epoch ms** (no ISO 8601). Tasks usa ISO 8601. El adapter normaliza ambos (researcher-01 §2).
- **No hay "tags"** — usar Lists API v3 (researcher-01 §2 "Tags → HubSpot Lists"). `addTags()` resuelve list IDs.
- **No hay enroll workflow API directo** — convención: `executeAction(leadId, 'WORKFLOW_ENROLL', { propertyName, value })` hace PATCH de la property trigger (researcher-01 §2 "Workflows").
- **Custom properties `af_origen` + `af_metadata_extra`** se auto-provisionan en `init()` (idempotente: check si existen, sino POST).

## Requirements

### Funcionales

- `HubSpotCRMProvider` implementa `ICRMProvider` completo.
- `getCapabilities()` → `{ hasBlueprints: false, hasDataCenters: false, hasTags: false /* lists */, oauthFlow: 'authorization_code', ... }`.
- `getAuthorizationUrl(state, redirectUri)` → URL `app.hubspot.com/oauth/authorize` con scopes obligatorios (researcher-01 §1).
- `completeOAuth(code, redirectUri)` → POST `api.hubapi.com/oauth/v1/token` grant_type=authorization_code → returns `CRMTokens + portalId`.
- `init()` (método nuevo opcional, no en interface, llamado por UI post-connect): provisiona `af_origen` + `af_metadata_extra` custom properties si no existen.
- `healthcheck()` → `GET /crm/v3/objects/contacts?limit=1` → boolean.
- `disconnect()` → no hay endpoint revoke público de HubSpot — clear local + return ok. Documentar limitation.
- `searchLeads(criteria)` → POST `/crm/v3/objects/contacts/search` con `filterGroups`. Cursor pagination via `after`.
- `findLeadByEmail(email)` → search con `filters: [{ propertyName: 'email', operator: 'EQ', value: email }]`.
- `getLead(id)` → GET `/crm/v3/objects/contacts/{id}?properties=...`.
- `createLead(data)` → POST `/crm/v3/objects/contacts`. Mapea `nombre → firstname`, `apellido → lastname`, `email → email`, `telefono → phone`, `pais → country`, `origen → af_origen`. Metadata jsonb extra → `af_metadata_extra` JSON-stringified.
- `updateLead(id, data)` → PATCH con mismo mapeo.
- `addTags(leadId, tagNames)` → resuelve list IDs (cache in-memory por instance) + POST `/crm/v3/lists/{listId}/memberships/add-from-ids`.
- `createTask(leadId, taskData)` → POST `/crm/v3/objects/tasks` con association al contact (associationTypeId 204).
- `createEvent(leadId, eventData)` → POST `/crm/v3/objects/meetings`. Convierte `startTime` ISO → epoch ms para `hs_meeting_start_time`. Association 212.
- `executeAction(leadId, 'WORKFLOW_ENROLL', { propertyName, value })` → PATCH contact property → trigger workflow.
- `request()` privado: 401 → invalidate TokenManager cache + retry 1 vez. 429 → respect `Retry-After` header (cap 60s). 5xx → exp backoff 250→2000→8000, max 3.

### No funcionales

- File `hubspot.ts` <200 líneas. Si necesario, split: `hubspot.ts` (clase principal) + `hubspot-mappers.ts` (mapToLead, mapFromLead) + `hubspot-properties.ts` (auto-provisioning custom props).
- Sin `any` en API pública.
- 0 logs de tokens. Logs de status codes + error categories.

## Architecture

```
HubSpotCRMProvider
  ├── constructor(opts: { tokens, metadata: { portal_id, custom_field_map? }, integrationId, onTokenRotated })
  │     apiBase = 'https://api.hubapi.com'
  │     tokenUrl = 'https://api.hubapi.com/oauth/v1/token'
  │     portalId = metadata.portal_id
  │
  ├── getCapabilities() → static caps object
  ├── healthcheck() → GET contacts?limit=1
  ├── disconnect() → clear local; no remote revoke (limitation documented)
  ├── init() → ensureCustomProperties(['af_origen', 'af_metadata_extra'])
  │
  ├── getAuthorizationUrl(state, redirectUri)
  │     → app.hubspot.com/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=...
  │
  ├── completeOAuth(code, redirectUri)
  │     → POST api.hubapi.com/oauth/v1/token grant_type=authorization_code
  │     → introspect token to extract hub_id (or comes in response: data.hub_id)
  │     → returns { accessToken, refreshToken, expiresAt, portalId }
  │
  ├── private request(path, options, retried=false)
  │     → TokenManager.getValidTokens(integrationId)
  │     → fetch with Authorization: Bearer
  │     → 401 + !retried: invalidate + retry once
  │     → 429: Retry-After header → wait → retry
  │     → 5xx: exp backoff max 3
  │     → map via mapHubSpotError() → throw CRMError
  │
  ├── createLead / getLead / searchLeads (cursor) / updateLead / addTags / executeAction / createEvent / createTask / findLeadByEmail
  │
  ├── private ensureCustomProperties(names: string[])
  │     → GET /crm/v3/properties/contacts → list existing
  │     → for each missing: POST /crm/v3/properties/contacts with type=string, fieldType=text (or textarea for af_metadata_extra)
  │
  └── private resolveListId(name: string) (cached Map<string, listId>)
        → GET /crm/v3/lists/?objectTypeId=0-1 → cache name→id
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/token-manager.ts` (registrar `callRefreshEndpoint` para `crm_type === 'hubspot'`)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/factory.ts` (registrar HubSpot provider)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/providers/hubspot.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/providers/hubspot-mappers.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/providers/hubspot-properties.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/providers/hubspot.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/providers/hubspot-mappers.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/mocks/hubspot-handlers.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/integrations/hubspot-app-setup.md` (instrucciones manuales para registrar la app en HubSpot Developer Portal — para el usuario)

## Implementation steps

1. **Acción manual del usuario (documentada, no la hace Claude):** registrar Public App en HubSpot Developer Portal. Copiar `Client ID` + `Client Secret` a `.env.local`. Configurar redirect_uri `http://localhost:8500/api/integrations/hubspot/auth/callback` y (futuro) URL VPS. Scopes: `crm.objects.contacts.read crm.objects.contacts.write crm.schemas.contacts.read crm.objects.deals.read crm.objects.tasks.write crm.objects.notes.write crm.lists.write crm.lists.read`. Documentar todo esto en `docs/integrations/hubspot-app-setup.md`.
2. **Crear `hubspot-mappers.ts`**: `mapHubSpotContactToLead(raw)` y `mapLeadToHubSpotProperties(fields)` (researcher-01 §5 field mapping). Maneja `af_origen` y `af_metadata_extra` (JSON-stringified si object).
3. **Test `hubspot-mappers.test.ts`**: golden cases para todas las nomenclaturas (VARIABLES DEFINIDAS — `docs/Docs-entrega-clienta/Estructura/VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`).
4. **Crear `hubspot-properties.ts`**: `ensureCustomProperties(client, names)` lee `/crm/v3/properties/contacts`, POSTea missing. Idempotente. Types: `af_origen` = string/text, `af_metadata_extra` = string/textarea (65k chars).
5. **Crear `hubspot.ts`**: clase `HubSpotCRMProvider`. Constructor (sin SDK). Implementar todos los métodos de `ICRMProvider` + `init()` + helpers privados `ensureCustomProperties` + `resolveListId`.
6. **Registrar `callRefreshEndpoint(hubspot)` en `token-manager.ts`**: POST `api.hubapi.com/oauth/v1/token` grant_type=refresh_token. Si response trae nuevo `refresh_token` → marcarlo en retorno para re-persistir.
7. **Registrar HubSpot en `factory.ts`**: switch case `'hubspot'` instancia `HubSpotCRMProvider`.
8. **Crear `tests/mocks/hubspot-handlers.ts`** (researcher-03 §8): handlers MSW para token endpoint, GET/POST contacts, search, tasks, meetings, properties list/create, lists, 401, 429.
9. **Test `hubspot.test.ts`**:
   - OAuth: `getAuthorizationUrl` URL bien construida con state + scopes URL-encoded.
   - `completeOAuth` POST a `/oauth/v1/token` → returns tokens + portalId.
   - 401 retry: mock 401 once → retry → 200.
   - 429 con `Retry-After: 5` → adapter espera 5s (fake timer Vitest) → retry → 200.
   - Refresh rotation: response con nuevo `refresh_token` → `onTokenRotated` invoked.
   - `searchLeads('email:test@x.com')`: parsea criteria → POST con filterGroups EQ → returns mapped leads.
   - `findLeadByEmail` igual con exact match.
   - `createLead({ nombre, apellido, email, ...})` → POST `/crm/v3/objects/contacts` con properties mapeadas.
   - `addTags(leadId, ['vip'])`: resuelve list ID via cache miss → GET lists → cache → POST add-from-ids.
   - `createTask`: POST `/crm/v3/objects/tasks` con association 204 al contact.
   - `createEvent` startTime ISO `2026-06-01T10:00:00Z` → body tiene `hs_meeting_start_time` epoch ms string.
   - `executeAction(leadId, 'WORKFLOW_ENROLL', { propertyName: 'af_workflow_trigger', value: 'X' })` → PATCH property.
   - `init()` mock: 0 props existen → 2 POSTs. 1 existe → 1 POST. 2 existen → 0 POSTs (idempotent).
10. **Smoke real (opcional, gated):** `INTEGRATION_TEST_REAL=1 HUBSPOT_TEST_PORTAL_ID=... npm run test -- hubspot` contra sandbox HubSpot del usuario.
11. **`npm run typecheck` + `npm run lint` + `npm run test -- hubspot` verdes.**
12. **Commit** `feat(sprint-2): hubspot public-app adapter + oauth + custom properties auto-provision`.

## Todo list

- [ ] Doc `hubspot-app-setup.md` con instrucciones manuales
- [ ] Crear `hubspot-mappers.ts` con field mapping VARIABLES DEFINIDAS
- [ ] Tests mappers
- [ ] Crear `hubspot-properties.ts` con ensureCustomProperties idempotente
- [ ] Crear `hubspot.ts` clase completa (≤200 líneas, splittear si necesario)
- [ ] Registrar `callRefreshEndpoint(hubspot)` en TokenManager
- [ ] Registrar provider en factory
- [ ] Mocks MSW hubspot-handlers
- [ ] Tests hubspot.test cubriendo OAuth + CRUD + tasks + meetings + addTags + executeAction + init
- [ ] Smoke real opcional
- [ ] typecheck + lint + test verdes
- [ ] Commit

## Success criteria

- Tests `hubspot.test.ts` ≥85% coverage de `hubspot*.ts`.
- `init()` idempotente verificado por test (corre 2 veces, 2ª no hace POSTs).
- Meeting timestamps en epoch ms confirmado por snapshot del body.
- En logs jamás aparecen tokens.
- Doc `hubspot-app-setup.md` permite a Renzo registrar la app sin intervención de Claude.
- Smoke (si gated) conecta + healthcheck + searchLeads sin errores contra sandbox real.

## Risk assessment

| Riesgo                                                                                  | Likelihood | Impact | Mitigación                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope `crm.objects.tasks.write` no existe / nombre cambia                               | Baja       | Alto   | Verificación manual durante registro app (paso 1). Si falla, usar scope `tickets` o `crm.objects.notes.write` como fallback documentado. Doc explícita.      |
| Refresh token rotation no documentada formalmente — comportamiento varía                | Media      | Medio  | TokenManager ya maneja rotation. Test cubre ambos casos (rota / no rota). En prod: monitorear logs `[TokenManager] rotated refresh_token for integration X`. |
| `hub_id` (portal_id) no presente en response del token exchange (varía por versión API) | Baja       | Medio  | Fallback: llamar `GET /oauth/v1/access-tokens/{token}` introspect → devuelve `hub_id`. Implementar como try/catch en `completeOAuth`.                        |
| Search 4 req/s puede romper tests si paralelos                                          | Baja       | Bajo   | MSW siempre responde 200 — no rate limit en mock. En prod, TokenManager + un sleep mínimo 250ms entre searches (futuro Sprint 3).                            |
| List name→ID cache stale si tenant crea/borra lists                                     | Media      | Bajo   | Cache invalidation: TTL 15min in-memory. Documentar.                                                                                                         |

## Security considerations

- `HUBSPOT_CLIENT_SECRET` solo en `.env.local` y env vars Easypanel. JAMÁS en repo.
- `state` no se valida aquí (Phase 05 lo hace en el route handler).
- `completeOAuth` NUNCA loguea `code` ni tokens.
- `disconnect()` borra local pero NO revoca remoto (limitación HubSpot). Documentar que el usuario debe desinstalar la app desde HubSpot UI si quiere revocación efectiva.
- Custom properties `af_origen`/`af_metadata_extra` no son sensibles per se, pero su contenido SÍ puede tener PII — caller debe sanitizar antes de pasar a `createLead/updateLead`.
- `af_metadata_extra` con JSON-stringified content: limitar a 60k chars (HubSpot máx 65k) y truncar con warning si excede.

## Tests requeridos

- Unit: `hubspot.test.ts` (OAuth + CRUD + tasks + meetings + tags + init + retries), `hubspot-mappers.test.ts`.
- Integration: factory + TokenManager + HubSpot provider (mocked end-to-end).
- E2E (gated): contra sandbox HubSpot.
- Coverage `providers/hubspot*` ≥85%.

## Dependencies

- Phase 01 (interface + TokenManager + crm-error + migración + `OAUTH_STATE_SECRET`) 🟢 obligatorio.
- Acción manual del usuario: registrar app en HubSpot Developer Portal y poblar `HUBSPOT_CLIENT_ID/SECRET` en `.env.local`. Se puede mockear con valores fake para tests pero E2E real requiere credenciales reales.

## Next phase

- Phase 05 (UI) tras 02 + 03 + 04 🟢.
- Paralelo con Phase 02 (Zoho) y Phase 04 (WriteGuard).
