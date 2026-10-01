---
title: "6-01 — OAuth2 v2 setup + Marketplace app registry"
status: pending
priority: P2
estimation: 6-12h
phase_id: 6-01
sprint_id: SP-6
branch: feature/sprint-06-ghl-adapter
created: 2026-05-21
---

# Phase 01 — OAuth2 v2 setup + Marketplace (6-01)

## Context Links

- [plan.md](plan.md) — overview Sprint 6
- Source phase legacy: `../260520-1342-sprint-4-post-mvp-crms/phase-03-gohighlevel-adapter.md`
- Sprint 2 OAuth patterns: `../260520-1342-sprint-2-adapter-hubspot-zoho/phase-02-adapter-hubspot.md`

## Overview

- **Prioridad:** P2
- **Estado:** Pendiente — primer entregable Sprint 6
- **Descripción:** Registrar la app en GHL Marketplace (proceso manual externo) y construir flow OAuth2 v2 con `chooselocation` consent screen. Persistencia de tokens + `location_id`.

## Key Insights

- GHL Marketplace requires app review (2-5 días hábiles) → iniciar ANTES del sprint
- Consent endpoint: `https://marketplace.gohighlevel.com/oauth/chooselocation`
- Token endpoint: `https://services.leadconnectorhq.com/oauth/token`
- `location_id` viene en token response → guardar en BD
- Scopes: `contacts.write`, `contacts.readonly`, `opportunities.write`, `opportunities.readonly`

## Requirements

**Funcionales:**

- App registrada en GHL Marketplace (doc paso a paso)
- Endpoint `GET /api/oauth/ghl/start` redirige a chooselocation
- Endpoint `GET /api/oauth/ghl/callback` intercambia code → tokens
- Persistencia: `access_token`, `refresh_token`, `ghl_location_id`, `expiry_date` cifrados

**No funcionales:**

- State CSRF
- Tokens cifrados
- RLS multi-tenant

## Architecture

```
Manual (Marketplace):
  1. marketplace.leadconnectorhq.com > Apps > New app
  2. Configurar OAuth scopes
  3. Callback URL: https://app.linkstation.ai/api/oauth/ghl/callback
  4. Guardar client_id + client_secret

Código:
src/lib/integrations/ghl/ghl-oauth.ts
  - getAuthorizationUrl(tenantId): string
  - exchangeCodeForTokens(code): { access, refresh, locationId, expiry }
  - persistTokens(tenantId, data): void

src/app/api/oauth/ghl/
├── start/route.ts
└── callback/route.ts
```

## Related Code Files

**Crear:**

- `src/lib/integrations/ghl/ghl-oauth.ts`
- `src/app/api/oauth/ghl/start/route.ts`
- `src/app/api/oauth/ghl/callback/route.ts`
- `docs/integrations/ghl-marketplace-app.md`

**Modificar:**

- `.env.example` (`GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`)

## Implementation Steps

1. Iniciar registro app GHL Marketplace (proceso manual externo)
2. Doc paso a paso `docs/integrations/ghl-marketplace-app.md`
3. Implementar `ghl-oauth.ts` con axios
4. Implementar `getAuthorizationUrl()` con state CSRF y scopes
5. Implementar `exchangeCodeForTokens()` con axios POST
6. Persistir tokens + `ghl_location_id` cifrados
7. Route `/start` con redirect
8. Route `/callback` con exchange + persist
9. Auto-refresh helper para llamadas futuras
10. Smoke test contra sandbox account GHL

## Todo List

- [ ] Iniciar registro app GHL Marketplace
- [ ] Doc setup app
- [ ] `.env.example` con `GHL_*`
- [ ] `ghl-oauth.ts` con axios
- [ ] `getAuthorizationUrl()` con scopes
- [ ] `exchangeCodeForTokens()`
- [ ] Persistir tokens + `ghl_location_id`
- [ ] Route `/start`
- [ ] Route `/callback`
- [ ] Refresh helper
- [ ] Smoke test sandbox

## Success Criteria

- App aprobada en GHL Marketplace
- OAuth completo flow contra sandbox GHL exitoso
- `ghl_location_id` persistido en `crm_connections`
- Refresh automático funcional

## Risk Assessment

| Riesgo                             | Prob  | Impacto | Mitigación                                                            |
| ---------------------------------- | ----- | ------- | --------------------------------------------------------------------- |
| Marketplace rechaza app            | Media | Alto    | Cumplir docs GHL al detalle; tener plan B con app "private" si existe |
| Tiempo de review > 5 días          | Alta  | Medio   | Iniciar antes del sprint                                              |
| `location_id` no devuelto en token | Baja  | Alto    | Test sandbox primero; fallback API GET `/locations/me`                |

## Security Considerations

- Tokens cifrados AES-256-GCM
- State CSRF firmado
- No exponer client_secret
- RLS en `crm_connections`

## Next Steps

- Habilita 6-02 (Contacts + Opportunities) y 6-03 (Webhooks)
