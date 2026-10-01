# Phase 07 — Sprint Close: CLOSE-1..5 + hand-off SP-4B

## Context Links

- [plan.md](./plan.md) — overview
- Protocolo CLOSE definido en `CLAUDE.md` → sección "Phase/Sprint Completion Protocol".
- Hand-off destino: `plans/260522-1700-sprint-validacion-pre-mvp/phase-03-validacion-sprint-2.md`.

## Overview

- **Prioridad:** P1 (cierre formal del sprint)
- **Status inicial:** 🔘 Pendiente
- **Descripción:** ejecutar las 5 subtareas obligatorias del cierre (CLOSE-1 auto test, CLOSE-2 E2C local + WCAG, CLOSE-3 diferido SP-4B, CLOSE-4 fix bugs, CLOSE-5 push + PR a developer + hand-off). NO mergear PR sin orden explícita del usuario.
- **Tiempo estimado:** 6h 00min

## Key insights

- CLOSE-3 (test manual) está **diferido a SP-4B** por regla del proyecto (CLAUDE.md). No se ejecuta aquí.
- CLOSE-5 paso 3 (E2E VPS) se **omite** si `NEXT_PUBLIC_VPS_URL` está como placeholder o VPS no listo. Documentar omisión.
- Hand-off a SP-4B/phase-03 es obligatorio antes de cerrar el sprint.
- PR a `developer` se crea pero **NO se mergea** — regla absoluta del proyecto.

## Requirements

### Funcionales

- **CLOSE-1 Auto test** (Sonnet via `af-agents:testing`):
  - `npm run typecheck` → 0 errores.
  - `npm run lint` → 0 errores críticos.
  - `npm run build` → exit 0.
  - `npm run test -- --coverage` → todos los tests pasan + coverage ≥80% módulo crm.
  - Si falla algo: pasar a CLOSE-4.

- **CLOSE-2 E2C local + WCAG 2.2 AA**:
  - Arrancar `npm run dev` (puerto 8500).
  - Playwright spec `integrations-manager.spec.ts` (creado Phase 05) corre contra localhost.
  - Flujos cubiertos: empty state, click conectar HubSpot/Zoho (mock callback con MSW si no hay cuentas reales), card connected, toggle write_policy, audit viewer collapse.
  - axe-core scan en cada pantalla → 0 violations críticas.
  - Screenshots guardados en `docs/screenshots/sprint-2/`.
  - Si falla algo: pasar a CLOSE-4.

- **CLOSE-3 diferido**: marcar 🟢 Diferida en RoadMap con razón "Diferido a SP-4B según regla CLAUDE.md sección 'SP-N-CLOSE-3 DIFERIDO a SP-4B'".

- **CLOSE-4 Corrección de bugs**: cualquier bug encontrado en CLOSE-1/2 → fix + commit individual con prefijo `fix(sprint-2): <bug>` → re-run paso afectado hasta 🟢. Repetir hasta verde.

- **CLOSE-5 Push + PR + Hand-off**:
  1. `git push origin feature/sprint-02-adapter-hubspot-zoho`.
  2. **NO merge** sin orden del usuario.
  3. Crear PR vía `gh pr create --base developer --head feature/sprint-02-adapter-hubspot-zoho --title "feat(sprint-2): adapter hubspot + zoho + ui admin + audit log" --body-file plans/260524-1330-sprint-2-adapter-hubspot-zoho/PR-BODY.md`. Body cubre: highlights, breaking changes, migraciones aplicadas, env vars nuevas, tareas RoadMap cerradas, ADRs aprobados, commits incluidos.
  4. **E2E VPS condicional**: si `NEXT_PUBLIC_VPS_URL` placeholder o VPS no listo → omitir + nota.
  5. **Hand-off a SP-4B**: actualizar `plans/260522-1700-sprint-validacion-pre-mvp/phase-03-validacion-sprint-2.md` con:
     - Comandos de test del sprint (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test -- --coverage`).
     - Spec Playwright creado (`tests/e2e/integrations-manager.spec.ts`) + ruta cubre `/dashboard/settings`.
     - Spec listo para E2E VPS: mismo spec con `BASE_URL=https://dev.linkstation.ai`.
     - Checklist manual derivado de `docs/testeos-manual.md` sección Sprint 2 (si existe; crear seed si no): "1. Click Conectar HubSpot → URL HubSpot Developer auth abre. 2. Aprobar app → callback completa → card muestra Conectado. 3. Test connection → verde. 4. Toggle write_policy a overwrite_with_audit + override_fields=['phone']. 5. Forzar updateLead desde server action de test → audit row aparece en viewer. 6. Disconnect → card vuelve a empty state. 7. Idem para Zoho EU sandbox."
     - BUG-XXX detectados/corregidos en este sprint (lista commits `fix(sprint-2): ...`).
     - **Env vars nuevas para VPS:** `OAUTH_STATE_SECRET` (generar fresco), `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`. Documentar dónde añadirlas (Easypanel env).
     - Notas de despliegue: aplicar migraciones `20260524100000_integrations_oauth_and_audit.sql` y `20260524110000_help_sections_integrations.sql`. Verificar `ENCRYPTION_KEY` (Sprint 1) presente. Verificar `NEXT_PUBLIC_APP_URL` apunta al dominio VPS.

- **Informe final al usuario** (Step 7 del protocolo):
  - Resumen tests passed/failed/fixed.
  - Diff implementado (líneas + archivos cambiados).
  - Estado PR (URL + checks).
  - Hand-off SP-4B confirmado.
  - Tareas RoadMap actualizar (delegar a `roadmap-keeper`).
  - Invitación a probar local: "Arranca `npm run dev` y ve a `/dashboard/settings` → sección Integraciones CRM."

### No funcionales

- Commit mensajes conventional, sin co-authoring AI.
- PR body usa formato profesional definido en CLAUDE.md sección "GitHub Releases y tags".
- Coordinación con `roadmap-keeper` para marcar tareas SP-3-XX correspondientes como 🟢.

## Architecture

```
CLOSE-1 → CLOSE-2 → (if bugs) CLOSE-4 → re-run failed → CLOSE-5 push → PR draft → hand-off SP-4B/phase-03 → user informe
                                                            ↓
                                                    (NO merge sin orden)
```

## Related Code Files

### Modificar

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/development-roadmap.md` (vía `roadmap-keeper`)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/plans/260522-1700-sprint-validacion-pre-mvp/phase-03-validacion-sprint-2.md` (rellenar plantilla)
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/docs/testeos-manual.md` (añadir sección Sprint 2 si missing)

### Crear

- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/plans/260524-1330-sprint-2-adapter-hubspot-zoho/PR-BODY.md`
- `e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard/plans/260524-1330-sprint-2-adapter-hubspot-zoho/SP-3-CLOSE-summary.md` (resumen tracking tiempos)

## Implementation steps

1. **CLOSE-1 Auto test**: delegar a `af-agents:testing` con prompt explícito + reports path. Recoger resultado.
2. **CLOSE-2 E2C local**: arrancar dev server (background), correr Playwright spec, capturar screenshots a `docs/screenshots/sprint-2/`, axe scan. Recoger resultado.
3. **CLOSE-4 (si bugs)**: fix individual + commit + re-run paso afectado. Loop hasta verde. Max 3 ciclos antes de escalar al usuario.
4. **Marcar CLOSE-3 diferido** en RoadMap con razón.
5. **Redactar `PR-BODY.md`** con formato profesional (highlights, breaking, migraciones, env vars, ADRs, commits, próximos pasos).
6. **Generar `SP-3-CLOSE-summary.md`** con tabla resumen tiempos `⏱ Push` por bloque (vía `af-productivity-logger` hook).
7. **Push branch**: `git push origin feature/sprint-02-adapter-hubspot-zoho`.
8. **Crear PR**: `gh pr create --base developer --title ... --body-file PR-BODY.md`. **NO merge**.
9. **E2E VPS conditional**: chequear `NEXT_PUBLIC_VPS_URL`. Si placeholder → omitir + nota en SP-3-CLOSE-summary "E2E VPS diferido — pre-deploy VPS no realizado todavía". Si listo → correr spec contra VPS.
10. **Hand-off SP-4B/phase-03**: editar archivo con plantilla rellena (comandos, specs, checklist, BUGs, env vars).
11. **Delegar `roadmap-keeper`** para marcar SP-3-XX tareas como 🟢 / 🔵 + actualizar `⏱ Push` y `⏱ Cierre` por bloque y tarea.
12. **Informe al usuario**: resumen visual de lo cerrado + URL del PR + próximos pasos.

## Todo list

- [ ] CLOSE-1 (typecheck/lint/build/test+coverage) — verde
- [ ] CLOSE-2 (Playwright E2C local + axe WCAG) — verde
- [ ] CLOSE-3 marcar diferida en RoadMap
- [ ] CLOSE-4 fix any bugs hasta verde
- [ ] Redactar PR-BODY.md profesional
- [ ] SP-3-CLOSE-summary.md con tiempos
- [ ] `git push` branch
- [ ] `gh pr create` (NO merge)
- [ ] E2E VPS conditional check
- [ ] Hand-off SP-4B/phase-03 con plantilla rellena
- [ ] `roadmap-keeper` marca tareas + tiempos
- [ ] Informe final al usuario

## Success criteria

- CLOSE-1 + CLOSE-2 ambos 🟢.
- PR creado en GitHub, status open, sin merge.
- `phase-03-validacion-sprint-2.md` SP-4B ya no marcado como 🔘 Plantilla vacía.
- RoadMap actualizado con tiempos reales por bloque y tarea (granularidad Sprint 2+).
- Usuario recibe informe claro con próximos pasos.

## Risk assessment

| Riesgo                                                                                           | Likelihood | Impact | Mitigación                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Bug crítico en CLOSE-2 que requiere refactor grande                                              | Baja       | Alto   | Loop CLOSE-4 max 3 ciclos. Si excede, escalar a usuario con propuesta de hotfix mini-sprint.                 |
| Sin cuentas HubSpot/Zoho sandbox para Playwright E2C → flujo OAuth no se puede testear realmente | Alta       | Medio  | Spec usa MSW para mockar OAuth en localhost. Smoke con cuentas reales se difiere a SP-4B (Renzo).            |
| `gh pr create` falla por permisos o branch protection                                            | Baja       | Bajo   | Verificar `gh auth status` antes. Si falla, crear PR manual via UI y avisar usuario.                         |
| roadmap-keeper marca mal los tiempos (campos sin push real)                                      | Media      | Bajo   | Verificar manualmente que `⏱ Push` se llenó tras push real. Hook `af-productivity-logger` debe estar activo. |

## Security considerations

- `gh pr create --body-file` — verificar PR body NO contiene secretos accidentales (revisar diff antes).
- Screenshots en `docs/screenshots/sprint-2/` NO deben contener tokens, IDs sensibles, ni datos reales del cliente.
- Hand-off SP-4B doc no incluye valores reales de env vars (solo nombres + dónde configurarlos).

## Tests requeridos

- CLOSE-1 ejecuta toda la suite.
- CLOSE-2 ejecuta E2C Playwright con axe-core WCAG scan.
- E2E VPS omitido por default (pre-deploy no realizado).

## Dependencies

- Phase 06 (tests + docs + ADRs) 🟢.
- Hook `af-productivity-logger.cjs` activo (Sprint 2 tarea 2-30 ya cerrada según RoadMap).
- `gh` CLI autenticado.

## Next phase

- Sprint 3 (Hardening: tests E2E, observabilidad, dashboards costes) — fuera del scope de este plan.
- Sprint 4 (post-MVP: Sheets, Salesforce, GoHighLevel, ActiveCampaign).
- SP-4B (validación pre-MVP, ejecutado por Renzo).
