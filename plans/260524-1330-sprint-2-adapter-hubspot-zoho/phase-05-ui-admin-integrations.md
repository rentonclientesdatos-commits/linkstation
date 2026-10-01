# Phase 05 — UI admin IntegrationsManager (CRM section) + OAuth flow + WCAG

## Context Links

- [plan.md](./plan.md) — overview
- [researcher-03-adapter-pattern.md](./research/researcher-03-adapter-pattern.md) §4 (OAuth flow diagram), §9 (UI pattern)
- Existente: `src/app/dashboard/settings/IntegrationsManager.tsx`
- Project memory: AUTOEXEC plan 24-05-2026 — empty states sin alerts, WCAG 2.2 AA obligatorio antes screenshots.

## Overview

- **Prioridad:** P1 (sin UI no hay cómo conectar tenants → MVP no demo-able)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** ampliar `IntegrationsManager.tsx` con sección CRM (HubSpot + Zoho). Cards con estado disconnected/connected/error. Botones `Conectar`/`Test connection`/`Disconnect`/`Reconnect`. Toggle `write_policy` (append_only ↔ overwrite_with_audit). Viewer básico de `crm_write_audit`. Implementar rutas API `/api/integrations/{provider}/auth/start` y `/auth/callback` con OAuth full-page redirect + state HMAC + cookie httpOnly. WCAG 2.2 AA. Empty states sin alerts.
- **Tiempo estimado:** 12h 00min

## Key insights

- Full-page redirect, no popup (researcher-03 §4) — simpler, mobile-friendly, no postMessage cross-origin issues.
- State HMAC + cookie + DB column triple check (researcher-03 §4): cookie (CSRF), DB `integrations.oauth_state` (replay protection), HMAC sig (tamper).
- `IntegrationsManager` ya gestiona Retell/Ultravox/WhatsApp/Sheets — añadir CRM como sección nueva al final, sin tocar las existentes.
- Empty state CRM: card "Sin CRM conectado. Conecta HubSpot o Zoho para sincronizar leads." con CTAs. NO alert toast en empty state (project memory AUTOEXEC).
- WCAG 2.2 AA obligatorio ANTES de tomar screenshots (project memory). axe-core en specs Playwright.
- Las callbacks OAuth devuelven errores en query string (`?error=csrf_mismatch`, `?error=oauth_failed&provider=hubspot`) que el componente lee y muestra como toast (researcher-03 §4 "ERROR PATHS").

## Requirements

### Funcionales

#### Server actions / API routes

- `POST /api/integrations/[provider]/auth/start` (server action):
  - Validar `provider in ['hubspot', 'zoho']`.
  - Validar `auth.uid()` presente y pertenece a tenant.
  - `generateOAuthState(tenantId)` → state token HMAC.
  - Set httpOnly cookie `oauth_state_{provider}` con state, TTL 15min, SameSite=Lax.
  - UPSERT en `integrations` row (tenant_id, crm_type=provider) con `oauth_state = state`, `is_active = false`.
  - Build redirect URL via `provider.getAuthorizationUrl(state, redirectUri)`.
  - Return 302 redirect.

- `GET /api/integrations/[provider]/auth/callback`:
  - Lee `code`, `state`, error params del query.
  - Si `error` query: redirect a `/dashboard/settings?section=integrations&error=oauth_cancelled`.
  - Validar state: cookie === query state, DB `integrations.oauth_state` === query state, `verifyOAuthState(state, tenantId)` true. Si cualquier check falla → redirect `?error=csrf_mismatch`.
  - Si Zoho: `extractDCFromCallback(query params)` → obtiene `accountsServer` + `location`.
  - `provider.completeOAuth(code, redirectUri[, dcContext])` → tokens + extras.
  - `encryptJson({ access, refresh })` → persiste a `integrations`.
  - UPDATE row: `access_token_encrypted`, `refresh_token_encrypted`, `expires_at`, `metadata = { portal_id | api_domain + accounts_server + location }`, `oauth_state = NULL`, `is_active = true`, `scopes = [...]`.
  - Si HubSpot: invocar `provider.init()` post-completeOAuth (custom properties).
  - Clear cookie.
  - Redirect `/dashboard/settings?section=integrations&success={provider}`.

- `POST /api/integrations/[id]/healthcheck` (server action):
  - Carga integration via repo (tenant scoped).
  - Factory → provider.healthcheck() → returns `{ ok: boolean, latencyMs, error?: string }`.
  - UPDATE `integrations.last_healthcheck_at` + `healthcheck_status`.

- `POST /api/integrations/[id]/disconnect` (server action):
  - Provider.disconnect() (revoke remoto si soportado).
  - DELETE row de `integrations` (cascade audit rows mantienen integridad referencial — pero CASCADE eliminaría audit. Decisión: NO CASCADE en `crm_write_audit.integration_id`, hacer SET NULL para preservar audit histórico. Ajustar migración Phase 01 si necesario).
  - **Ajuste pre-implementación:** revisar migración Phase 01 — cambiar `ON DELETE CASCADE` a `ON DELETE SET NULL` para `crm_write_audit.integration_id`.

- `PATCH /api/integrations/[id]/write-policy` (server action):
  - Body Zod-validated: `{ write_policy: 'append_only' | 'overwrite_with_audit', override_fields: string[] }`.
  - Tenant-scoped UPDATE.

- `GET /api/integrations/[id]/audit?lead_id=...&limit=50` (server action o route):
  - Wraps `audit-query.getAuditLog`. Returns rows.

#### UI Component `IntegrationsManager.tsx` (CRM section)

- **Section header:** "CRM" + tooltip "Solo puedes tener 1 CRM activo a la vez".
- **Cards HubSpot + Zoho** en grid:
  - Disconnected: icon + nombre + "Sin conectar" + CTA "Conectar con {provider} →" (full-page anchor o form POST a `/auth/start`).
  - Connected: badge "Conectado", `portal_id`/`api_domain` info, `last_healthcheck_at` relative ("hace 3 min"), botones `Test connection` (sync), `Reconnect`, `Disconnect`.
  - Error (healthcheck_status='error'): badge rojo + mensaje + CTA `Reconectar`.
- **Si otro CRM conectado:** card del segundo provider muestra "Desconecta {otro} primero" (disabled CTA) + tooltip explicativo.
- **Write policy toggle** (solo si connected): Select con 2 opciones + descripción inline:
  - `append_only` — "Solo escribir campos vacíos en el CRM"
  - `overwrite_with_audit` — "Sobrescribir campos permitidos con audit trail"
  - Si `overwrite_with_audit` seleccionado: textarea "Campos permitidos para sobrescribir (uno por línea)" → JSON array `override_fields`.
- **Audit log viewer** (collapse panel): tabla con `created_at`, `field_name`, `old_value`, `new_value`, `actor_id`. Limit 50 rows más recientes. Filtro por `lead_id` (input opcional).
- **Empty state:** si ningún CRM conectado, card grande "Sin CRM conectado" con 2 botones (HubSpot + Zoho) y texto explicativo. SIN alert toast.
- **Toasts** SOLO para resultados de acciones explícitas:
  - Success: "HubSpot conectado correctamente" (al volver de callback con `?success=hubspot`).
  - Error: "Error CSRF en OAuth" / "Conexión cancelada" / "Falló la conexión: {message}".

### No funcionales

- WCAG 2.2 AA: focus visible, contraste 4.5:1, labels asociados, role/aria-\* correctos, navegación por teclado, target size 24×24 mínimo.
- Cards <200 líneas cada uno (componentes extraídos: `CRMProviderCard.tsx`, `WritePolicyEditor.tsx`, `AuditLogViewer.tsx`).
- Server actions con Zod input validation.
- Sin client-side fetch de secretos. Tokens NUNCA en client bundle.
- Empty states sin alerts (project memory).

## Architecture

```
/dashboard/settings (page.tsx server component)
  └── IntegrationsManager (client component)
        ├── ExistingSections (Retell, Ultravox, WhatsApp, Sheets) — UNCHANGED
        └── CRMSection (NEW)
              ├── empty state OR
              ├── CRMProviderCard hubspot
              │     ├── status badge (disconnected/connected/error)
              │     ├── action buttons → form POST to /api/integrations/hubspot/auth/start
              │     ├── WritePolicyEditor (if connected)
              │     └── AuditLogViewer collapse (if connected)
              └── CRMProviderCard zoho (idem)

/api/integrations/[provider]/
  ├── auth/start  → POST → 302 redirect a CRM authorize URL
  └── auth/callback → GET → validate state → completeOAuth → encrypt → persist → redirect /settings

/api/integrations/[id]/
  ├── healthcheck     → POST → factory.getProvider → healthcheck → return JSON
  ├── disconnect      → POST → provider.disconnect + DELETE row
  ├── write-policy    → PATCH → Zod validate + UPDATE
  └── audit           → GET  → audit-query.getAuditLog → JSON
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/dashboard/settings/IntegrationsManager.tsx` (añadir CRMSection)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/supabase/migrations/20260524100000_integrations_oauth_and_audit.sql` (ajuste `crm_write_audit.integration_id ON DELETE SET NULL`)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/dashboard/settings/integrations/crm-section.tsx`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/dashboard/settings/integrations/crm-provider-card.tsx`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/dashboard/settings/integrations/write-policy-editor.tsx`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/dashboard/settings/integrations/audit-log-viewer.tsx`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/api/integrations/[provider]/auth/start/route.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/api/integrations/[provider]/auth/callback/route.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/api/integrations/[id]/healthcheck/route.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/api/integrations/[id]/disconnect/route.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/api/integrations/[id]/write-policy/route.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/app/api/integrations/[id]/audit/route.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/server-actions.ts` (helpers shared)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/api/oauth-callback.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/api/healthcheck.test.ts`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/e2e/integrations-manager.spec.ts` (Playwright)

## Implementation steps

1. **Ajustar migración Phase 01** SQL: `crm_write_audit.integration_id ON DELETE SET NULL` (preserva audit histórico). Aplicar migración nueva incremental si Phase 01 ya pushada, sino editar in-place.
2. **Crear `server-actions.ts`** con helpers: `getActiveTenantId()`, `getIntegrationByProvider(tenantId, provider)`, `getIntegrationById(id, tenantId)`. Zod schemas.
3. **Implementar `/auth/start` route**: validate session → generateOAuthState → set cookie → upsert integration row con `oauth_state` → build authorize URL via provider class (sin TokenManager — no hay tokens aún) → 302.
4. **Implementar `/auth/callback` route**: validate cookie + DB state + HMAC → completeOAuth → encrypt tokens → UPDATE row → invoke `init()` if HubSpot → clear cookie → 302.
5. **Implementar `/healthcheck`, `/disconnect`, `/write-policy`, `/audit` routes** (cortas, ≤80 líneas cada una).
6. **Crear `crm-provider-card.tsx`** componente con 3 estados (disconnected/connected/error). Props: `{ provider: 'hubspot'|'zoho', integration: Integration | null, otherConnected: boolean }`.
7. **Crear `write-policy-editor.tsx`** con Select + Textarea (override_fields) + Save button → llama PATCH route.
8. **Crear `audit-log-viewer.tsx`** con tabla + filtro lead_id + paginación simple (Load more).
9. **Crear `crm-section.tsx`** que orquesta los cards + maneja toasts según `?success=` / `?error=` query params (lee con `useSearchParams`).
10. **Editar `IntegrationsManager.tsx`** para incluir `<CRMSection integrations={...} />` al final.
11. **Tests Vitest API** (`oauth-callback.test.ts`, `healthcheck.test.ts`): mock supabase + provider, casos happy + CSRF mismatch + replay + cookie missing.
12. **Tests Playwright E2C** (`integrations-manager.spec.ts`):
    - render empty state sin alerts.
    - click "Conectar HubSpot" → 302 a `app.hubspot.com/oauth/authorize?...` (mock con MSW si necesario o stub redirect).
    - callback con `?success=hubspot` → toast verde.
    - callback con `?error=csrf_mismatch` → toast rojo.
    - WCAG axe-core scan → 0 violations críticas.
13. **Screenshots a `docs/screenshots/`** (project rule): empty, connected hubspot, connected zoho + error, audit log viewer.
14. **`npm run typecheck` + `npm run lint` + `npm run test -- integrations` + `npm run test:e2e -- integrations-manager` verdes.**
15. **Smoke manual local:** arrancar `npm run dev` (puerto 8500), conectar HubSpot sandbox real → callback → ver card "Conectado" → click Test connection → verde.
16. **Commit** `feat(sprint-2): ui integrations manager + oauth full-flow + write-policy editor + audit viewer`.

## Todo list

- [ ] Ajustar migración: `crm_write_audit.integration_id ON DELETE SET NULL`
- [ ] Helpers server-actions con Zod
- [ ] Route `/auth/start` + cookie + DB state
- [ ] Route `/auth/callback` triple-check state + completeOAuth + init()
- [ ] Routes healthcheck/disconnect/write-policy/audit
- [ ] Component CRMProviderCard con 3 estados
- [ ] Component WritePolicyEditor
- [ ] Component AuditLogViewer
- [ ] Component CRMSection orquestador + toasts query params
- [ ] Editar IntegrationsManager.tsx
- [ ] Tests API oauth-callback + healthcheck
- [ ] Spec Playwright + axe WCAG 2.2 AA
- [ ] Screenshots a docs/screenshots/
- [ ] typecheck + lint + test + e2e verdes
- [ ] Smoke manual local HubSpot sandbox
- [ ] Commit

## Success criteria

- Test E2C `integrations-manager.spec.ts` pasa con 0 WCAG violations críticas.
- Test API `oauth-callback.test.ts`: 5+ casos (happy, csrf cookie mismatch, csrf DB mismatch, HMAC tamper, code missing, provider error) — todos verdes.
- Smoke manual: callback OAuth completo HubSpot sandbox → integration row con `is_active=true`, `access_token_encrypted` no-null, `portal_id` poblado.
- `last_healthcheck_at` se actualiza al pulsar "Test connection".
- Toggle write_policy persiste a DB y se refleja en próximo render.
- Audit log viewer muestra rows insertados por test seed (Phase 06 generará seed).
- Empty state NO muestra ningún toast.

## Risk assessment

| Riesgo                                                                                                            | Likelihood | Impact | Mitigación                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cookie SameSite=Lax fallar en redirect cross-site OAuth (algunos browsers)                                        | Media      | Medio  | Usar `SameSite=Lax` (no Strict). HubSpot/Zoho redirect = top-level navigation, Lax permite cookies. Test en Chromium + Firefox. Si falla en Safari mobile: doc workaround Sprint 3. |
| HubSpot sandbox no disponible al hacer smoke                                                                      | Media      | Bajo   | El test API y E2C cubren con mocks. Smoke manual se difiere a Renzo en SP-4B si bloqueado.                                                                                          |
| `init()` HubSpot al callback bloquea redirect demasiado (POST custom properties tarda)                            | Media      | Bajo   | Timeout 5s en `init()`. Si tarda, retornar 302 igualmente y reintentar `init()` en próximo healthcheck. Documentar.                                                                 |
| `crm_write_audit.integration_id` rows huérfanas tras disconnect (SET NULL) — UI no sabe a qué provider pertenecen | Baja       | Bajo   | Audit row guarda `provider` text (no FK) — preserva info aunque integration borrada. Verificar columna `provider` se está populando en Phase 04 ✅.                                 |

## Security considerations

- Cookie `oauth_state_*` httpOnly + Secure (en prod) + SameSite=Lax + path=/.
- `OAUTH_STATE_SECRET` jamás expuesto al cliente. State se valida server-side.
- Triple validación state: cookie + DB + HMAC (defensa en profundidad).
- `service_role` solo en API routes server-side. Verificar bundle no incluye.
- Tokens encryptados nunca devueltos al cliente (ni en respuesta API ni en HTML). UI solo ve `is_active`, `last_healthcheck_at`, `portal_id` (no sensible), `metadata` (sin tokens).
- Audit viewer: RLS limita por tenant. Verify con test multi-tenant.
- Disconnect HubSpot: documentar limitación (no revoke remoto). Sugerir al usuario desinstalar app desde UI HubSpot.
- WCAG: no-aria-hidden-focus, color-contrast, button-name, label rules cubiertos.

## Tests requeridos

- Unit/API Vitest: `oauth-callback.test.ts`, `healthcheck.test.ts`, `disconnect.test.ts`, `write-policy.test.ts`, `audit.test.ts`.
- E2C Playwright local: `integrations-manager.spec.ts` con axe-core scan WCAG 2.2 AA.
- E2E sandbox real: smoke manual local — `INTEGRATION_TEST_REAL=1 npm run test:e2e:real` (opcional, no en CI).
- Coverage UI components Vitest opcional pero recomendado ≥70%.

## Dependencies

- Phase 01 (migración + interface + TokenManager) 🟢.
- Phase 02 (Zoho impl) 🟢.
- Phase 03 (HubSpot impl) 🟢.
- Phase 04 (WriteGuard + audit-query) 🟢.

## Next phase

- Phase 06 (tests cobertura + docs + ADRs).
