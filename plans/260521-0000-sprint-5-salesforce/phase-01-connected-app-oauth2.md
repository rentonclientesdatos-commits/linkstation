---
title: "5-01 — Connected App + ADR jsforce + OAuth2 flow"
status: pending
priority: P2
estimation: 10-14h
phase_id: 5-01
sprint_id: SP-5
branch: feature/sprint-05-salesforce-adapter
created: 2026-05-21
---

# Phase 01 — Connected App + ADR jsforce + OAuth2 (5-01)

## Context Links

- [plan.md](plan.md) — overview Sprint 5
- Source phase legacy: `../260520-1342-sprint-4-post-mvp-crms/phase-02-salesforce-adapter.md`
- ADR deps: `plans/reports/adr-auditoria-dependencias-20260520.md`
- Sprint 2 OAuth patterns: `../260520-1342-sprint-2-adapter-hubspot-zoho/phase-02-adapter-hubspot.md`

## Overview

- **Prioridad:** P2
- **Estado:** Pendiente — primer entregable del Sprint 5
- **Descripción:** Aprobar ADR de `jsforce@^3.10.15`, documentar setup de Connected App ISV en Salesforce y construir flow OAuth2 completo (sandbox + prod) con persistencia de tokens cifrados.

## Key Insights

- Connected App ISV: una sola app maneja N tenants vs Connected App por tenant
- Decisión recomendada: ISV Connected App (más mantenible) — confirmar en ADR
- OAuth2 endpoints difieren entre sandbox (`test.salesforce.com`) y prod (`login.salesforce.com`)
- `instanceUrl` viene en la respuesta del token exchange — guardar en BD
- Refresh tokens en Salesforce no expiran por defecto (a menos que admin lo configure)

## Requirements

**Funcionales:**

- ADR documentado para `jsforce@^3.10.15` con verificación peer deps (Node 24, Next 16)
- Connected App ISV creada (proceso manual documentado paso a paso)
- Endpoint `GET /api/oauth/salesforce/start` con parámetro `?env=sandbox|prod`
- Endpoint `GET /api/oauth/salesforce/callback` que intercambia code → tokens
- Persistencia: `access_token`, `refresh_token`, `instance_url`, `sf_environment` cifrados

**No funcionales:**

- State CSRF obligatorio
- Tokens cifrados AES-256-GCM
- RLS multi-tenant en `crm_connections`

## Architecture

```
Manual setup (documentado, no código):
  1. Salesforce > Setup > App Manager > New Connected App
  2. Configurar OAuth scopes: api, refresh_token, offline_access
  3. Callback URL: https://app.linkstation.ai/api/oauth/salesforce/callback
  4. Guardar consumer_key + consumer_secret en env

Código:
src/lib/integrations/salesforce/salesforce-oauth.ts
  - getAuthorizationUrl(tenantId, env): string
  - exchangeCodeForTokens(code, env): { access, refresh, instanceUrl }
  - persistTokens(tenantId, env, tokens): void

src/app/api/oauth/salesforce/
├── start/route.ts         (?env=sandbox|prod)
└── callback/route.ts
```

## Related Code Files

**Crear:**

- `src/lib/integrations/salesforce/salesforce-oauth.ts`
- `src/app/api/oauth/salesforce/start/route.ts`
- `src/app/api/oauth/salesforce/callback/route.ts`
- `plans/reports/adr-jsforce-20260521.md` (ADR formal)

**Modificar:**

- `.env.example` (`SALESFORCE_CONSUMER_KEY`, `SALESFORCE_CONSUMER_SECRET`)

## Implementation Steps

1. Ejecutar `af-agents:adr` para jsforce@3.10.15 → generar ADR
2. Documentar setup Connected App ISV paso a paso en `docs/integrations/salesforce-connected-app.md`
3. Configurar consumer_key/secret en `.env.example`
4. Implementar `salesforce-oauth.ts` con dual endpoint (sandbox/prod)
5. Implementar route `/start` con `?env` param + state CSRF
6. Implementar route `/callback` con exchange + persist cifrado
7. Smoke test manual contra Developer Edition free
8. Documentar troubleshooting común (callback URL mismatch, etc.)

## Todo List

- [ ] ADR jsforce aprobado y documentado
- [ ] Connected App ISV creada (manual)
- [ ] Doc `docs/integrations/salesforce-connected-app.md`
- [ ] `.env.example` con `SALESFORCE_*` placeholders
- [ ] `salesforce-oauth.ts` esqueleto
- [ ] `getAuthorizationUrl()` con env param
- [ ] `exchangeCodeForTokens()` implementado
- [ ] Persistencia cifrada con `instance_url`
- [ ] Route `/start` con state CSRF
- [ ] Route `/callback`
- [ ] Manejo error: callback URL mismatch
- [ ] Smoke test sandbox

## Success Criteria

- ADR jsforce mergeado en `developer`
- Tenant completa OAuth en sandbox y prod sin error
- Tokens persisten cifrados con `instance_url` por tenant
- State CSRF previene CSRF attacks

## Risk Assessment

| Riesgo                               | Prob  | Impacto | Mitigación                                          |
| ------------------------------------ | ----- | ------- | --------------------------------------------------- |
| Connected App ISV requiere review SF | Media | Alto    | Iniciar review ANTES del sprint (puede tardar días) |
| Callback URL mismatch                | Alta  | Bajo    | Doc clara + error UI explícito                      |
| jsforce peer dep conflicto           | Baja  | Alto    | Verificar en ADR antes de instalar                  |

## Security Considerations

- Consumer secret en server-only env, nunca cliente
- Tokens cifrados AES-256-GCM
- State CSRF firmado HMAC
- RLS en `crm_connections`

## Next Steps

- Habilita 5-02 (jsforce + migration)
