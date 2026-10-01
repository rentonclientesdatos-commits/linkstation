---
title: "Sprint 3 — Phase 03 — Migración Node 20 → 22 LTS"
status: pending
priority: P1
effort: 4h 00min – 6h 00min
sprint_id: SP-4
task_ids: [SP-4-NODE-22]
created: 2026-05-24
last_updated: 2026-05-24
---

# Phase 03 — Migración Node 20 → 22 LTS

## Context Links

- `.nvmrc` actual: pin a `20.20.2` (creado 24-05-2026 tras Sprint 2 hotfix v0.2.7).
- `Dockerfile`: 3 stages con `FROM node:20-alpine`.
- `package.json`: campo `engines.node = ">=20.17.0"` (añadido junto con downgrade lint-staged 17→16).
- Decisión: [feedback Javi HP 24-05-2026] tras detectar warnings `EBADENGINE` en build VPS y mismatch local (Node 24) ↔ VPS (Node 20). Pinned a 20 LTS hasta Sprint 3.
- Sprint 2 v0.2.7 commit `c426bfb`: downgrade lint-staged + engines + bump.

## Overview

**Priority:** P1 (infra hardening pre-MVP).
**Current status:** Pendiente.
**Brief:** Migrar runtime de Node 20 LTS a Node 22 LTS en todos los entornos (local, VPS Dokploy, CI cuando exista). Subir lint-staged 16 → 17 (queda libre tras unblock) y validar transitive deps que asumen APIs Node 22+.

## Key Insights

- Node 22 es LTS desde octubre 2024, Active LTS hasta octubre 2027. Es la elección correcta para el MVP que sale a producción ~agosto 2026.
- Node 24 NO es LTS hasta octubre 2026 — descartado para servidor.
- Subir local sin subir VPS reintroduce el drift que estamos quitando. Esta fase mueve los DOS a la vez.
- El cambio en Dockerfile es 1 línea x 3 stages. El riesgo real está en dependencias con native bindings (sharp, bcrypt, ioredis, @libsql/client si entra).

## Requirements

**Funcionales:**

- Local: cualquier dev del equipo (Javi HP, Renzo, futuros) puede `nvm use` y todo funciona idéntico.
- VPS Dokploy: build + runtime sobre `node:22-alpine` sin warnings EBADENGINE.
- `npm ci` reproducible local ↔ VPS (hash de `package-lock.json` debe ser idéntico tras la migración).

**No-funcionales:**

- 0 regresiones en tests (Vitest + Playwright). Coverage no debe bajar.
- 0 cambios de comportamiento en runtime (mismos endpoints, mismos response bodies).
- Performance: build prod NO debe ser >10% más lento.

## Architecture

Cambios atómicos en 3 superficies:

1. **`Dockerfile`** — 3 stages cambian `node:20-alpine` → `node:22-alpine`.
2. **`.nvmrc`** — `20.20.2` → `22.13.0` (o la última 22 LTS estable al momento de la migración).
3. **`package.json`** — `engines.node` y `engines.npm` actualizados. `lint-staged` desbloqueado a `^17.0.5`.
4. **`docs/dev-onboarding.md`** — quitar nota "Migración planificada Sprint 3", actualizar comandos.

Sin cambios de código de aplicación.

## Related Code Files

**Modificar:**

- `Dockerfile` (3 stages)
- `.nvmrc`
- `package.json` (engines + lint-staged)
- `package-lock.json` (regenerado por `npm install`)
- `docs/dev-onboarding.md` (sección 2.1 Requisitos)
- `CLAUDE.md` (si menciona versión Node en algún sitio — auditar)

**Validar sin modificar:**

- `docker-compose.yml` (si referencia node image, alinear)
- `.github/workflows/*.yml` si entran en Sprint 3
- `worker.js` (BullMQ — debería ser compatible Node 22 sin tocar)

## Implementation Steps

1. **Crear feature branch desde `developer`**

   ```powershell
   git checkout developer && git pull
   git checkout -b feature/sprint-03-node-22-upgrade
   ```

2. **Cambiar `.nvmrc`** a `22.13.0` (o última LTS 22 estable al momento).

3. **Editar `package.json`:**

   ```json
   "engines": {
     "node": ">=22.13.0",
     "npm": ">=10.0.0"
   },
   "devDependencies": {
     "lint-staged": "^17.0.5",
     ...
   }
   ```

4. **Editar `Dockerfile`** (3 stages):

   ```diff
   - FROM node:20-alpine AS deps
   + FROM node:22-alpine AS deps
   - FROM node:20-alpine AS builder
   + FROM node:22-alpine AS builder
   - FROM node:20-alpine AS runner
   + FROM node:22-alpine AS runner
   ```

5. **Instalar local con Node 22:**

   ```powershell
   nvm install 22.13.0
   nvm use 22.13.0
   rm -rf node_modules .next
   npm install
   ```

6. **Validar local:**
   - `npm run typecheck` → 0 errores.
   - `npm run lint` → 0 errores.
   - `npm run build` → ✓ Compiled successfully + sin EBADENGINE.
   - `npm test` → todos verdes (Vitest).
   - `npm run dev` → arranca y responde en `http://localhost:8500`.
   - `npx playwright test tests/e2e/sprint-2-close/smoke-crm-vps.spec.ts` (contra localhost) → smoke ok.

7. **Auditar transitive deps con native bindings:**

   ```powershell
   npm ls --depth=0
   # comprobar que bcrypt, sharp, ioredis, msw, @next/swc no rompen
   ```

   Si alguna falla por prebuilt binary inexistente para Node 22 → forzar rebuild con `npm rebuild <pkg>`.

8. **Commit + push:**

   ```powershell
   git add Dockerfile .nvmrc package.json package-lock.json docs/dev-onboarding.md
   git commit -m "chore(infra): migrate Node 20 → 22 LTS (Active LTS until Oct 2027)"
   git push origin feature/sprint-03-node-22-upgrade
   ```

9. **PR a `developer`** + Dokploy redeploy con clean cache.

10. **E2C local + E2E VPS:**
    - Smoke en localhost:8500 (recorrido principal).
    - Smoke en `dev.linkstation.ai` (spec `tests/e2e/sprint-2-close/smoke-crm-vps.spec.ts`).
    - Inspección de logs Dokploy: NO debe haber warnings EBADENGINE.

11. **Actualizar memoria** del proyecto (memory/project-stack-runtime.md o equivalente): "Node 22 LTS desde Sprint 3".

12. **Actualizar onboarding** (`docs/dev-onboarding.md`): cambiar versiones a Node 22, quitar nota de migración planificada.

## Todo List

- [ ] Crear feature branch `feature/sprint-03-node-22-upgrade`.
- [ ] Actualizar `.nvmrc` a `22.13.0`.
- [ ] Actualizar `package.json` engines + lint-staged 17.
- [ ] Actualizar `Dockerfile` 3 stages a `node:22-alpine`.
- [ ] `nvm install 22.13.0 && nvm use 22.13.0` en local.
- [ ] `rm -rf node_modules .next && npm install`.
- [ ] `npm run typecheck` + `lint` + `build` + `test` → todo verde.
- [ ] Validar dev server `npm run dev` arranca en localhost:8500.
- [ ] `npx playwright test smoke-crm-vps.spec.ts` (local).
- [ ] Auditar deps con native bindings (`npm ls --depth=0`).
- [ ] Commit + push + PR.
- [ ] Dokploy redeploy con clean cache.
- [ ] Smoke VPS post-deploy (4 specs E2E).
- [ ] Inspeccionar logs Dokploy build (0 warnings EBADENGINE).
- [ ] Actualizar `docs/dev-onboarding.md`.
- [ ] Actualizar memoria del proyecto.

## Success Criteria

- `node --version` en local devuelve `v22.13.x` (o superior 22 LTS).
- Logs Dokploy build NO contienen `npm warn EBADENGINE`.
- VPS `dev.linkstation.ai` sirve correctamente todas las rutas (smoke E2E verde).
- `lint-staged@17` activo, pre-commit hook funciona sin warnings.
- `.nvmrc` selecciona automáticamente la versión correcta para devs con auto-switch.

## Risk Assessment

| Riesgo                                                                           | Prob  | Impacto | Mitigación                                                                                                                         |
| -------------------------------------------------------------------------------- | ----- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Dependencia con prebuilt binary Node 20 no disponible para Node 22               | Media | Medio   | `npm rebuild <pkg>` o subir a versión que sí tenga prebuilt 22. Específicamente vigilar `bcrypt`, `sharp`, `ioredis`, `@next/swc`. |
| Cambio en comportamiento de fetch global (Node 22 usa undici nuevo)              | Baja  | Alto    | Tests de integración cubren fetch a Supabase. Si peta, downgrade temporal `globalThis.fetch` a node-fetch en módulo afectado.      |
| Alpine 22 cambia versión de glibc/musl y rompe nativos                           | Baja  | Alto    | Probar build Docker en local antes de pushear. Si rompe → cambiar a `node:22-bookworm-slim` (Debian).                              |
| Lint-staged 17 cambia API y rompe pre-commit hook                                | Baja  | Bajo    | Smoke test del hook con `git commit` de prueba antes de push.                                                                      |
| Drift de transitive deps regenerado por `npm install` introduce vulnerabilidades | Baja  | Bajo    | `npm audit` post-install, comparar con baseline pre-migración.                                                                     |

## Security Considerations

- Node 22 LTS recibe security patches hasta Oct 2027. Node 20 hasta Apr 2026 (entra en Maintenance) — esto **YA es razón suficiente** para migrar antes del MVP de Agosto 2026.
- Alpine vs Debian base image: mantener alpine si funciona (más pequeña, menos surface). Solo bajar a Debian si hay incompatibilidad real.

## Next Steps

- Una vez completada esta phase, las phases 4-7 del Sprint 3 ejecutan ya sobre Node 22.
- Documentar la migración como ADR (`docs/adr/ADR-NNN-node-22-lts.md`) para audit trail.

## Notas para `roadmap-keeper`

- Esta phase añade tarea `SP-4-NODE-22` al RoadMap dentro del bloque Sprint 3.
- Estimación: 4h 00min – 6h 00min (en horas reales, no decimales).
- Bloquea phases 4-7 del Sprint 3 si se elige paralelizar.
