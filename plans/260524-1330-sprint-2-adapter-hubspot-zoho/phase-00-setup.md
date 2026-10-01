# Phase 00 — Setup, env vars y estructura de carpetas

## Context Links

- [plan.md](./plan.md) — overview
- [researcher-03-adapter-pattern.md](./research/researcher-03-adapter-pattern.md) §5 (TokenManager, requiere `OAUTH_STATE_SECRET`)

## Overview

- **Prioridad:** P1 (blocker para todas las demás fases)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** preparar terreno: nuevas env vars en `.env.example`, estructura de carpetas, dependencia `msw` con paso por Dependency Guard (`af-agents:adr`), bump de scripts npm si hace falta.
- **Tiempo estimado:** 2h 00min

## Key insights

- `OAUTH_STATE_SECRET` debe generarse con `crypto.randomBytes(32).toString('base64url')` (≥40 chars). Documentar comando en `.env.example` para Renzo.
- `HUBSPOT_CLIENT_ID` + `HUBSPOT_CLIENT_SECRET` no se pueden generar localmente — vienen del HubSpot Developer Portal tras registrar la app (acción manual del usuario en Phase 03).
- `NEXT_PUBLIC_APP_URL` ya existe; verificar que tiene `http://localhost:8500` en local y dominio VPS en prod.
- `msw` v2 es la única dependencia npm nueva del Sprint 2 (devDep). Pasa por `af-agents:adr` por convención, aunque no es prod.

## Requirements

### Funcionales

- `.env.example` documenta TODAS las env vars nuevas con comentarios + cómo generar.
- Estructura carpetas `src/lib/integrations/crm/oauth/`, `src/lib/integrations/crm/providers/`, `tests/integrations/crm/`, `tests/mocks/` creada (con `.gitkeep` si vacías).
- `msw` instalado como devDep + setup en `vitest.config.ts` (`setupFiles`).

### No funcionales

- Sin secretos reales en repo. `.env.example` solo placeholders.
- Setup compatible con Windows/PowerShell + WSL/Linux (CI).

## Architecture

```
.env.example (root)
  ├── OAUTH_STATE_SECRET=<base64url-32bytes>     # NEW
  ├── HUBSPOT_CLIENT_ID=<from-hubspot-developer-portal>  # NEW
  ├── HUBSPOT_CLIENT_SECRET=<from-hubspot-developer-portal>  # NEW
  ├── ZOHO_CLIENT_ID=<from-zoho-api-console>     # NEW
  ├── ZOHO_CLIENT_SECRET=<from-zoho-api-console> # NEW
  └── NEXT_PUBLIC_APP_URL=http://localhost:8500  # existente, verificar

src/lib/integrations/crm/
  ├── interface.ts          # existente, se amplía Phase 01
  ├── factory.ts            # existente, se refactoriza Phase 01
  ├── providers/            # existente
  ├── oauth/                # NEW carpeta
  │   ├── .gitkeep
  └── ...

tests/
  ├── integrations/crm/     # NEW
  ├── mocks/                # NEW
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/.env.example`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/package.json` (devDep `msw`)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/vitest.config.ts` (setupFiles)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/src/lib/integrations/crm/oauth/.gitkeep`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/integrations/crm/.gitkeep`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/mocks/.gitkeep`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/tests/mocks/server.ts` (MSW setup)

## Implementation steps

1. **Generar `OAUTH_STATE_SECRET` localmente** con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Guardar en `.env.local` (gitignored).
2. **Editar `.env.example`** añadiendo bloque comentado con las 5 vars nuevas + instrucciones de generación/origen.
3. **Crear carpetas vacías** con `.gitkeep`: `src/lib/integrations/crm/oauth/`, `tests/integrations/crm/`, `tests/mocks/`.
4. **Pasar `msw@^2` por `af-agents:adr`** Dependency Guard. Si aprobado: `npm i -D msw@^2`. Si bloqueado: escalar.
5. **Crear `tests/mocks/server.ts`** con `setupServer()` vacío (handlers se añaden en Phase 02/03).
6. **Editar `vitest.config.ts`** añadiendo `setupFiles: ['./tests/mocks/server.ts']` y `globals: true` si no estaba.
7. **Smoke test:** `npm run test -- --run` debe pasar sin errores (0 tests OK).
8. **Verificar `NEXT_PUBLIC_APP_URL`** está como `http://localhost:8500` en `.env.example` y `.env.local`.
9. **Commit** `chore(sprint-2): setup env vars + carpetas + msw devDep` a `feature/sprint-02-adapter-hubspot-zoho`.

## Todo list

- [x] Generar OAUTH_STATE_SECRET local + añadir a `.env.local`
- [x] Editar `.env.example` con 5 vars nuevas comentadas
- [x] Crear estructura carpetas + `.gitkeep`
- [x] Dependency Guard `msw@^2` → instalar
- [x] Crear `tests/mocks/server.ts` con setupServer vacío
- [x] Editar `vitest.config.ts` setupFiles
- [x] Smoke `npm run test -- --run`
- [x] Verificar `NEXT_PUBLIC_APP_URL=http://localhost:8500`
- [x] Commit a feature branch

## Success criteria

- `.env.example` contiene `OAUTH_STATE_SECRET`, `HUBSPOT_CLIENT_ID/SECRET`, `ZOHO_CLIENT_ID/SECRET` con comentarios.
- `npm i -D msw@^2` instalado sin warnings críticos.
- `npm run test -- --run` exit 0.
- Estructura carpetas presente en git (verifiable con `git status`).

## Risk assessment

| Riesgo                                    | Likelihood | Impact | Mitigación                                                                                                                            |
| ----------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency Guard bloquea `msw`            | Baja       | Media  | `msw` es estándar de facto para mocking HTTP en Vitest. Documentar en justificación ADR si pide. Alternativa: `nock` (menos moderno). |
| `vitest.config.ts` rompe tests existentes | Media      | Media  | Probar setupFiles solo si tests pasan antes/después. Rollback editando el config si rompe.                                            |

## Security considerations

- `OAUTH_STATE_SECRET` NUNCA en `.env.example` con valor real. Solo placeholder + comando de generación.
- `.env.local` ya está en `.gitignore` (Sprint 0). Verificar antes de generar secret.
- Documentar en `.env.example`: "Generar con `node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"`. NUNCA commitear el valor real."

## Tests requeridos

- Smoke test: `npm run test -- --run` exit 0 tras instalar msw + setup.

## Dependencies

- Ninguna (es el primer paso del sprint).

## Next phase

- Phase 01 (Foundation: interface + tabla integrations + TokenManager).
