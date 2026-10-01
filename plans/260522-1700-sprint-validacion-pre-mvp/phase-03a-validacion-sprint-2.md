# Fase 03a — Validación Sprint 2 (Adapter HubSpot + Zoho v0.2.7)

> Renombrada 24-05-2026: antes `phase-03`, ahora `phase-03a` para separar Sprint 2 de Sprint 2B (research R3 recomendación). Sprint 2B tiene su propia `phase-03b`.

## Context Links

- [plan.md](plan.md) — overview Sprint Validación Pre-MVP
- [Sprint 2 plan](../260524-1330-sprint-2-adapter-hubspot-zoho/plan.md)
- [Sprint 2 execution log](../260524-1330-sprint-2-adapter-hubspot-zoho/execution-log.md)
- [Sprint 2 PR-BODY (bugs F-WG-1/F-API-1/F-API-2)](../260524-1330-sprint-2-adapter-hubspot-zoho/PR-BODY.md)
- [Sprint 2 RELEASE-NOTES v0.2.7 (BUG-2-01 detail)](../260524-1330-sprint-2-adapter-hubspot-zoho/RELEASE-NOTES-v0.2.7.md)
- [RoadMap](../RoadMap.md)
- [Arquitectura CRM adapters](../../docs/architecture/crm-adapters.md)

## Overview

- **Sprint validado**: Sprint 2 — Adapter HubSpot + Zoho (SP-3, **v0.2.7**, no v0.2.0-rc como decía la versión anterior de esta phase).
- **Branch origen**: `feature/sprint-02-adapter-hubspot-zoho` (PR #12 mergeado 24-05-2026 en `a826fd6`).
- **Estado**: 🟡 **Pendiente de validación VPS Renzo** (auto-test + E2C local + 5/5 E2E VPS smoke ya verdes contra `dev.linkstation.ai`).
- **Tester**: Renzo.

## Resumen del Sprint 2 a validar

MVP CRM bidireccional implementado:

- `ICRMProvider` ampliado (capabilities + lifecycle + OAuth + createLead).
- `ZohoCRMProvider` refactorizado con multi-DC (9 DCs), v8, refresh+retry, paginación, módulo configurable.
- `HubSpotCRMProvider` nuevo con Public App OAuth, fetch puro, custom properties auto-provisionadas en init().
- `TokenManager` con dedup in-process + DB writeback de refresh_token rotados.
- `WriteGuard` standalone con append_only + overwrite_with_audit + audit DB-level inmutable.
- UI `IntegrationsManager` ampliada con sección CRM (HubSpot + Zoho cards + write_policy + audit viewer).
- Routes API OAuth start/callback con QUAD-check state (cookie + DB + HMAC + session tenant match).
- **HOTFIX BUG-2-01 v0.2.7**: routes `/api/integrations/[id]/*` → `/api/integrations/manage/[id]/*` por slug conflict Next.js App Router.
- ADR-021 (HubSpot Public App), ADR-022 (write_policy semantics), ADR-023 (TokenManager dedup).
- 170 tests Vitest verdes + 4 skipped.

## 1. Test automático (código)

```bash
npm install
npm run typecheck                 # exit 0
npm run lint                      # 0 errors, 0 warnings (max-warnings=0)
npm run build                     # exit 0, 42 páginas generadas
npm run test                      # 170 passed + 4 skipped
npm run test -- --coverage        # coverage report
```

**Resultados esperados:**

- typecheck: 0 errores.
- build: `✓ Compiled successfully`.
- tests: 170 pass, 4 skipped.
- lint: 0/0 (post-Sprint 2 hotfix `c426bfb` downgrade lint-staged + cleanup).

## 2. Test E2C local (Playwright contra `localhost:8500`)

```bash
npm run dev                       # arranca en :8500
# en otra consola:
PLAYWRIGHT_BASE_URL=http://localhost:8500 npx playwright test tests/e2e/sprint-2-close/smoke-crm-vps.spec.ts
```

**Specs ya creadas en Sprint 2 close** (`tests/e2e/sprint-2-close/smoke-crm-vps.spec.ts`):

- VPS-01: GET `/` sin sesión → redirect `/login`.
- VPS-02: login admin VPS → `/dashboard`.
- VPS-03: `/dashboard/settings` carga.
- VPS-04: `<CRMSection>` con HubSpot+Zoho visible (edit cliente para mostrar).
- VPS-05: GET `/api/integrations` → 401 (endpoint registrado, auth requerida).

**Specs adicionales a añadir en Sprint 3 phase-01 E2E** (no creadas en Sprint 2 porque la UI se valida con Vitest API + smoke manual):

- Empty state "Sin CRM conectado" sin alerts.
- Click "Conectar HubSpot" → redirect a `app.hubspot.com/oauth/authorize?...` (validar URL, no completar flow).
- Callback con `?success=hubspot` → toast verde.
- Callback con `?error=csrf_mismatch` → toast rojo.
- axe-core scan → 0 violations críticas.

## 3. Specs listos para E2E VPS

Mismos specs anteriores con `PLAYWRIGHT_BASE_URL=https://dev.linkstation.ai`. **Ya validado 24-05-2026: 5/5 verdes** contra v0.2.7 desplegado.

Requisitos VPS:

- Env vars en Dokploy: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `OAUTH_STATE_SECRET`, `NEXT_PUBLIC_APP_URL=https://dev.linkstation.ai`.
- Migraciones aplicadas en VPS:
  - `20260524100000_integrations_oauth_and_audit.sql` (ya aplicada en autoexec Phase 01 via pg-meta REST).
  - `20260524110000_help_sections_integrations.sql` (NUEVA, aplicar al VPS si no se ha hecho).
- HubSpot Developer Portal: redirect_uri `https://dev.linkstation.ai/api/integrations/hubspot/auth/callback` añadido a la Public App.
- Cuenta sandbox HubSpot disponible para Renzo aprobar la app durante test E2E.

## 4. Checklist manual derivado de `docs/testeos-manual.md`

### Bloque A — Smoke post-deploy (15 min)

- [ ] **A.1** GET `https://dev.linkstation.ai/` → redirect `/login` (NO 500).
- [ ] **A.2** Login con `LinkStation@gmail.com / BeaOli#AF*2026!` → `/dashboard`.
- [ ] **A.3** Navegar a `/dashboard/settings` → carga sin errores.
- [ ] **A.4** **BUG-2-01 regression check**: GET `https://dev.linkstation.ai/api/integrations` autenticado → debe responder 200 con JSON (NO 500, NO 404). El bug consistía en 500 global por slug conflict. Si vuelve a aparecer 500, REPRODUCIDO bug crítico → escalar a Javi HP.
- [ ] **A.5** GET `https://dev.linkstation.ai/api/integrations/manage/00000000-0000-0000-0000-000000000000/healthcheck` autenticado → debe responder 404 (id no existe) o 401, NO 500. Confirma routes `/manage/` registradas.

### Bloque B — Conectar HubSpot real (30 min)

1. **B.1 Conectar HubSpot**
   - Click "Conectar HubSpot" en `/dashboard/settings` → URL HubSpot auth abre.
   - Aprobar app con cuenta sandbox → callback redirige a `?success=hubspot`.
   - Card muestra "Conectado", portal_id visible, healthcheck disponible.
2. **B.2 Test connection HubSpot**
   - Click "Test" (botón healthcheck) → estado actualizado, `last_healthcheck_at` actualizado.
   - **F-API-1 regression check**: si el session tenantId no coincide con el state, debe rechazar con error 403. Probar con segundo login multi-tenant si disponible.
3. **B.3 Write policy HubSpot**
   - Cambiar a `overwrite_with_audit` con `override_fields=['phone']`.
   - Guardar → persiste a DB.
   - **F-WG-1 regression check**: si `current` está vacío y `allowEmptyCurrent` es false, debe fallar cerrado (write rechazada). Si es true, debe permitirse el write.
   - Forzar updateLead con `phone` distinto (test script seed) → audit row aparece en `crm_write_audit`.
4. **B.4 Disconnect HubSpot**
   - Click "Desconectar" → confirma → card vuelve a estado "Sin conectar".
   - DB: `is_active=false`, `credentials_cipher=null`. Audit histórico se preserva.
   - **F-API-2 regression check**: cookie OAuth state debe borrarse correctamente tras disconnect (verificar DevTools Application → Cookies).

### Bloque C — Conectar Zoho (45 min)

5. **C.1 Conectar Zoho EU**
   - Idem B.1-B.4 con sandbox Zoho EU.
   - Verificar `integrations.metadata` contiene `api_domain`, `accounts_server`, `location='eu'`.
   - Refresh: esperar 1h (o forzar refresh via test) → DB `credentials_cipher` actualizado.
6. **C.2 Multi-DC validation**
   - Repetir con sandbox Zoho US o IN si disponible → verificar `location` cambia correctamente.

### Bloque D — Exclusividad + audit (15 min)

7. **D.1 Exclusividad CRM**
   - Conectar HubSpot + intentar conectar Zoho → card Zoho disabled con tooltip "Desconecta el otro CRM primero".
8. **D.2 Audit viewer**
   - Abrir collapse "Audit log" → muestra rows recientes.
   - Filtrar por lead_id → solo rows de ese lead.

## 5. BUG-XXX detectados y corregidos durante el cierre Sprint 2 (REGRESSION BASELINE)

> ⚠️ **Actualización 24-05-2026** tras research R3: la versión anterior decía "Ninguno bloqueante" — INCORRECTO. Se documentan aquí los 4 bugs cerrados que Renzo debe verificar no resurjan.

| BUG ID       | Severidad       | Descripción                                                                                                                                                          | Fix commit                                                                 | Regression check                                         |
| ------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| **BUG-2-01** | **P0 CRITICAL** | Slug conflict Next.js App Router: `/api/integrations/[id]/*` + `/api/integrations/[provider]/*` provoca 500 en TODAS las rutas. Detectado en VPS post-deploy v0.2.5. | `9ace75f` (v0.2.7) — routes movidos a `/api/integrations/manage/[id]/*`    | Bloque A.4 + A.5 + comprobar `/dashboard` carga (NO 500) |
| **F-WG-1**   | HIGH            | WriteGuard `applyWritePolicy` no fail-closed cuando `current` está vacío. Riesgo de override silencioso.                                                             | `ce166ec` — añadido escape hatch `allowEmptyCurrent: true` (default false) | Bloque B.3 — verificar comportamiento con current vacío  |
| **F-API-1**  | CRITICAL        | OAuth callback: session tenantId check post-HMAC permitía session swap. Atacante con session válida en tenant A podía aprobar OAuth para tenant B.                   | `ce166ec` — añadido QUAD-check (cookie + DB + HMAC + **session match**)    | Bloque B.2 — verificar con multi-tenant si disponible    |
| **F-API-2**  | HIGH            | Cookie OAuth state no se borraba correctamente tras success/error, permitía replay.                                                                                  | `ce166ec` — `cookies.delete()` explícito en ambos paths                    | Bloque B.4 — verificar Cookies en DevTools               |

**Bugs Zoho cerrados en autoexec Sprint 2 (B-01..B-07)** — Renzo NO requiere validación manual porque están cubiertos por 13 tests Vitest + 5 tests dc-detector. Listado para trazabilidad:

- B-01: hardcoded US DC eliminado
- B-02: tokenUrl hardcoded → multi-DC dinámico
- B-03: no 401→refresh→retry → añadido
- B-04: no OAuth init flow → añadido `exchangeCodeForTokens`
- B-05: no paginación → añadida con cursor
- B-06: módulo Leads hardcoded → configurable
- B-07: email "contains" vs exact match → corregido

## 6. Env vars NUEVAS que necesita el VPS

| Var                     | Propósito                                           | Dónde obtener                                                                    |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `OAUTH_STATE_SECRET`    | HMAC del state OAuth (CSRF + replay protection)     | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `HUBSPOT_CLIENT_ID`     | Public App HubSpot multi-tenant                     | developers.hubspot.com → Manage Apps → Auth tab                                  |
| `HUBSPOT_CLIENT_SECRET` | idem                                                | idem                                                                             |
| `HUBSPOT_REDIRECT_URI`  | Callback OAuth (debe coincidir en Developer Portal) | `https://dev.linkstation.ai/api/integrations/hubspot/auth/callback`     |
| `ZOHO_CLIENT_ID`        | App Zoho (DC donde se creó la cuenta)               | api-console.zoho.com → Server-based app                                          |
| `ZOHO_CLIENT_SECRET`    | idem                                                | idem                                                                             |
| `ZOHO_REDIRECT_URI`     | Callback OAuth                                      | `https://dev.linkstation.ai/api/integrations/zoho/auth/callback`        |
| `NEXT_PUBLIC_APP_URL`   | Base pública usada para construir redirect_uri      | URL del VPS                                                                      |

## 7. Notas de despliegue

1. **Migraciones SQL pendientes para VPS:**
   - `20260524110000_help_sections_integrations.sql` (seed help_sections "integrations").
2. **Aplicar via pg-meta REST** (probado en autoexec Phase 01):
   ```bash
   curl -X POST https://dev.linkstation.ai/supabase/pg/query \
     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
     -H "Content-Type: application/json" \
     -d @supabase/migrations/20260524110000_help_sections_integrations.sql
   ```
   O via Dokploy terminal de Supabase con `psql`.
3. **HubSpot Public App** debe registrarse en developers.hubspot.com ANTES del primer connect — sin esto la UI muestra error "server_misconfigured".
4. **Dokploy: Clean Cache obligatorio** al hacer Redeploy. Lección Sprint 2 v0.2.7: sin clean cache, capas Docker se reusan y bundle viejo sigue sirviéndose.
5. **Restart Next.js en Dokploy** tras añadir env vars (no hot-reload de env).

## 8. Status final SP-4B phase-03a

- ⏳ Pendiente de Renzo: ejecutar checklist manual cuando VPS pre-MVP esté listo.
- 🟢 Auto-tests verdes: 170 pass + 4 skipped (post v0.2.7).
- 🟢 Build verde.
- 🟢 5/5 E2E VPS smoke verdes (`tests/e2e/sprint-2-close/smoke-crm-vps.spec.ts`).
- 🟡 Tests Playwright E2C completos con axe: se difieren a Sprint 3 phase-01.
- 🟢 4 bugs cerrados con regression checks documentados.

## 9. Hand-off a phase-03b (Sprint 2B Dashboard KPIs)

Sprint 2B (Dashboard KPIs Overview, `v0.2.8`) tiene su propia validación en **[phase-03b-validacion-sprint-2b.md](phase-03b-validacion-sprint-2b.md)**. Renzo debe completar phase-03a Y phase-03b antes de pasar a phase-04 (Sprint 3).
