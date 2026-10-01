# Release Notes — v0.2.7 (Sprint 2 — Hotfix post-deploy)

## Resumen

Hotfix release tras detectar 1 bug crítico (BUG-2-01) durante el E2E VPS de v0.2.5 que provocaba 500 Internal Server Error en TODAS las rutas del dashboard. Incluye también ajustes de compatibilidad de runtime (Node 20 LTS alignment) y planificación de migración a Node 22 LTS para Sprint 3.

## Highlights

- **BUG-2-01 FIX (P0)** — Resuelto slug conflict del Next.js App Router. Las rutas `/api/integrations/[id]/*` y `/api/integrations/[provider]/*` no pueden coexistir como slugs dinámicos hermanos. Rotaba 500 en runtime sin que build/test/typecheck lo detectaran.
- **Routes reorganizadas** — `[id]` movido bajo segmento literal `manage/` para resolver el conflicto sin afectar a las URLs OAuth (redirect URIs HubSpot/Zoho intactas).
- **lint-staged downgrade 17→16.1.0** — elimina warnings EBADENGINE en build VPS (Node 20-alpine). Node 22 requirement diferido a Sprint 3.
- **Pin Node 20.20.2** via `.nvmrc` — alinea local con VPS Dockerfile para evitar drift.
- **Phase Sprint 3 — Migración Node 22 LTS** documentada (`plans/260520-1342-sprint-3-hardening/phase-03-migracion-node-22-lts.md`).

## Detalle por área

### Bug fix crítico (BUG-2-01)

- **Síntoma**: 500 Internal Server Error en todas las rutas tras desplegar v0.2.5 en `dev.linkstation.ai`.
- **Root cause**: `Error: You cannot use different slug names for the same dynamic path ('id' !== 'provider')` — Next.js App Router prohíbe dos slugs dinámicos hermanos en el mismo nivel del filesystem.
- **Detectado por**: logs runtime Dokploy tras E2E VPS smoke. NO detectado por `npm run build`, `npx tsc --noEmit`, ni `vitest` (es error de runtime puro).
- **Fix**: mover 4 routes `/api/integrations/[id]/*` → `/api/integrations/manage/[id]/*`.
- **Frontend actualizado** (4 fetch calls):
  - `src/app/dashboard/settings/integrations/audit-log-viewer.tsx`
  - `src/app/dashboard/settings/integrations/write-policy-editor.tsx`
  - `src/app/dashboard/settings/integrations/crm-provider-card.tsx` (x2)

### Compatibilidad de runtime

- `package.json`: añadido campo `engines: { node: ">=20.17.0", npm: ">=10.0.0" }`.
- `package.json`: downgrade `lint-staged@^17.0.5` → `^16.1.0` (requiere Node ≥20.17.0 — cumple con VPS Node 20.20.2).
- `.nvmrc` nuevo: pin `20.20.2`.
- `docs/dev-onboarding.md` §2.1: actualizado a Node 20.20.2 LTS con instrucciones nvm.

### Validación

- **E2E VPS smoke 5/5 verdes** contra `https://dev.linkstation.ai`:
  - VPS-01: redirect raíz → /login ✅
  - VPS-02: login admin → /dashboard ✅
  - VPS-03: /dashboard/settings carga ✅
  - VPS-04: CRMSection con HubSpot + Zoho visible ✅
  - VPS-05: GET /api/integrations → 401 (endpoint registrado, auth required) ✅
- Build VPS Dokploy: ✓ Compiled successfully (sin warnings EBADENGINE).
- `npx tsc --noEmit` local: 0 errores.
- 170 tests Vitest passed + 4 skipped (sin cambios desde v0.2.5).

### Planning Sprint 3

- Nueva phase `plans/260520-1342-sprint-3-hardening/phase-03-migracion-node-22-lts.md` (4h–6h).
- RoadMap Fase 3: nueva tarea `SP-4-NODE-22`.
- Subtotal Sprint 3: 89-117h → 93-123h.

## Breaking changes

**MINOR — afecta solo a integraciones internas** (Sprint 2 aún no usado por terceros):

Las URLs de gestión por ID cambian (4 endpoints):

| Antes (v0.2.5 — defectuosa)                 | Ahora (v0.2.7)                                     |
| ------------------------------------------- | -------------------------------------------------- |
| `POST /api/integrations/[id]/healthcheck`   | `POST /api/integrations/manage/[id]/healthcheck`   |
| `POST /api/integrations/[id]/disconnect`    | `POST /api/integrations/manage/[id]/disconnect`    |
| `PATCH /api/integrations/[id]/write-policy` | `PATCH /api/integrations/manage/[id]/write-policy` |
| `GET /api/integrations/[id]/audit`          | `GET /api/integrations/manage/[id]/audit`          |

URLs OAuth (`[provider]/auth/start` y `[provider]/auth/callback`) **NO han cambiado** → redirect URIs registradas en developers.hubspot.com y api-console.zoho.com siguen siendo correctas.

Frontend actualizado automáticamente. Si tienes scripts/curl propios apuntando a las URLs antiguas, actualízalos.

## Migraciones SQL

Sin migraciones nuevas (mantiene las de v0.2.5).

## Variables de entorno nuevas

Sin variables nuevas (mantiene las de v0.2.5: `OAUTH_STATE_SECRET`, `HUBSPOT_CLIENT_*`, `ZOHO_CLIENT_*`, `NEXT_PUBLIC_APP_URL`).

## Tareas RoadMap cerradas

- SP-3-CLOSE-4 — Bug fixing post-deploy (BUG-2-01).
- SP-3-CLOSE-5 — Cierre Sprint 2 con bump v0.2.7 + tag + release + E2E VPS.

## Tareas diferidas

Sin cambios respecto a v0.2.5 (ya documentadas allí).

**Nueva tarea para Sprint 3:**

- `SP-4-NODE-22` (4h–6h) — Migración runtime Node 20 → 22 LTS.

## ADRs aprobados

Sin ADRs nuevos en este hotfix (mantiene ADR-021/022/023 de v0.2.5).

## Contribuidores

- Renzo (dev lead Sprint 2 original).
- Javi HP (hotfix BUG-2-01 + Node 22 planning).

## Commits incluidos (v0.2.5..v0.2.7)

```
107cd7a fix(lint): remove unused 'context' and 'request' params from smoke-crm-vps spec
e1f4af0 chore(infra): pin Node 20.20.2 LTS via .nvmrc + plan migración a Node 22 en Sprint 3
c426bfb chore(deps): downgrade lint-staged 17→16.1.0 + add engines (Node 20 LTS compat)
9ace75f fix(sprint-2): BUG-2-01 slug conflict [id] vs [provider] → manage/[id]
```

## Próximos pasos

1. **Sprint 2B Dashboard KPIs (v0.2.8)** — bloque NEW-04 Bea: dashboard KPIs agregado configurable.
2. **Sprint 3 Hardening (v0.3.0-rc.1)** — incluye nueva phase-03 Migración Node 22 LTS además de E2E + observability + WCAG + costes.
3. **SP-4B Validación pre-MVP (v0.3.0 GA)** — Renzo ejecuta checklist consolidado.

## Lessons learned

1. **Pre-push hook silencioso**: el wrapper de background tasks reportó exit code 0 incluso cuando `husky pre-push` falló por warnings ESLint. Validar siempre con `git log origin/<branch>` post-push background. Mitigation: añadir hook que escriba a `.git/last-push-status` para verificación.
2. **Build success ≠ runtime success**: Next.js App Router slug conflicts pasan build, typecheck, y vitest, pero rompen en arranque del server. Considerar añadir a Sprint 3 un `next build && next start && curl /api/integrations` como smoke gate en pre-push.
3. **Local Node version drift**: dev local con Node 24 perdona warnings que VPS Node 20 protesta. `.nvmrc` + check en CI (Sprint 3) lo previene.
