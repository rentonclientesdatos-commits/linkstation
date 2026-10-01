---
title: "Sprint 2B — Phase 07 — Cierre SP-3B-CLOSE-1..5"
status: pending
priority: P1
effort: 4h 30min
sprint_id: SP-3B
task_ids: [SP-3B-CLOSE-1, SP-3B-CLOSE-2, SP-3B-CLOSE-4, SP-3B-CLOSE-5]
created: 24-05-2026
last_updated: 24-05-2026
---

# Phase 07 — Cierre Sprint 2B (SP-3B-CLOSE-1..5)

## Context Links

- Protocolo estándar de cierre: `CLAUDE.md` § "Phase/Sprint Completion Protocol"
- Hand-off destino: `plans/260522-1700-sprint-validacion-pre-mvp/phase-03b-validacion-sprint-2b.md` (a crear como skeleton al arrancar Sprint 2B; si SP-4B se reorganiza en phase-03a + 03b según research R3)
- Lecciones Sprint 2 cierre: `plans/260524-1330-sprint-2-adapter-hubspot-zoho/phase-07-sprint-close.md`

## Overview

**Priority:** P1 (cierre formal Sprint 2B).
**Brief:** Ejecutar protocolo CLOSE-1..5 estándar + bump v0.2.8 + hand-off a SP-4B phase-03b.

## Tareas de cierre

| ID                | Tarea                                                                        | Estim    | Estado      |
| ----------------- | ---------------------------------------------------------------------------- | -------- | ----------- |
| SP-3B-CLOSE-1     | Auto test (typecheck + lint + build + Vitest)                                | 1h 30min | 🔘          |
| SP-3B-CLOSE-2     | E2C Local Playwright + Lighthouse a11y `/dashboard`                          | 2h       | 🔘          |
| ~~SP-3B-CLOSE-3~~ | ~~Test Manual del Dev~~ — **DIFERIDO a 👤 SP-4B phase-03b bloque 4** (Renzo) | (0h)     | 🟢 Diferida |
| SP-3B-CLOSE-4     | Corrección de bugs detectados                                                | variable | 🔘          |
| SP-3B-CLOSE-5     | PR a `developer` + bump v0.2.8 + tag + release + hand-off SP-4B phase-03b    | 1h       | 🔘          |

**Subtotal:** 4h 30min + bugs.

## Implementation Steps

### SP-3B-CLOSE-1 — Auto test

1. **Ejecutar suite completa**:

   ```powershell
   npm run typecheck
   npm run lint
   npm run build
   npm test
   ```

2. **Esperado:**
   - typecheck: 0 errores.
   - lint: 0 errors, 0 warnings (max-warnings=0 hook).
   - build: ✓ Compiled successfully.
   - vitest: 100% verdes (~180-185 tests, +10 nuevos del Sprint 2B).

3. **Si falla cualquiera:** fix iterativo hasta verde antes de pasar a CLOSE-2.

### SP-3B-CLOSE-2 — E2C Local + Lighthouse

1. **Crear spec smoke Sprint 2B**:

   ```typescript
   // tests/e2e/sprint-2b-close/smoke-overview-local.spec.ts
   import { test, expect } from "@playwright/test";

   test.describe("Sprint 2B Overview smoke @smoke", () => {
     test("OVR-01: /dashboard renderiza OverviewSection con 4 KPIs hero", async ({ page }) => {
       await page.goto("/login");
       // ... login admin
       await page.goto("/dashboard");
       const overview = page.locator('section[aria-labelledby="overview-heading"]');
       await expect(overview).toBeVisible({ timeout: 10_000 });
       const kpiCards = overview.locator('[data-testid="kpi-card"]');
       await expect(kpiCards).toHaveCount(4);
     });

     test("OVR-02: 4 gráficos overview visibles", async ({ page }) => {
       // login + navegar
       const charts = page.locator('[role="img"][aria-label*="Gráfico"]');
       await expect(charts).toHaveCount(4);
     });

     test("OVR-03: KPI Builder en /settings persiste cambios", async ({ page }) => {
       // login + ir a settings, añadir KPI, volver a /dashboard, verificar
     });
   });
   ```

2. **Ejecutar contra localhost**:

   ```powershell
   PLAYWRIGHT_BASE_URL=http://localhost:8500 npx playwright test tests/e2e/sprint-2b-close/ --reporter=list
   ```

3. **Esperado:** 3/3 verdes.

4. **Lighthouse a11y**:

   ```powershell
   # Chrome DevTools → Lighthouse → Accessibility on /dashboard
   # Esperado: ≥ 90
   ```

5. **Capturar screenshots** finales para hand-off:

   ```
   docs/screenshots/sprint-2b/final-overview-default.png
   docs/screenshots/sprint-2b/final-overview-custom-config.png
   docs/screenshots/sprint-2b/final-settings-kpi-builder.png
   ```

### SP-3B-CLOSE-4 — Corrección de bugs

1. Bugs detectados en CLOSE-1 o CLOSE-2 se corrigen aquí.
2. Re-correr el paso fallado hasta verde.
3. Documentar cada BUG-2B-XX con commit ref + severidad.

### SP-3B-CLOSE-5 — Cierre

1. **Bump versión** `package.json` → `0.2.8`:

   ```diff
   - "version": "0.2.7",
   + "version": "0.2.8",
   ```

2. **Commit + push branch**:

   ```powershell
   git add package.json
   git commit -m "chore(release): bump v0.2.8 — Sprint 2B Dashboard KPIs Overview"
   git push origin feature/sprint-02b-dashboard-kpis-conjunto
   ```

3. **Crear PR a `developer`** vía `gh pr create`:
   - Título: `feat(sprint-2b v0.2.8): Dashboard KPIs Overview conjunto`
   - Body completo con highlights + screenshots + tests verdes + hand-off SP-4B.

4. **NO mergear** sin orden explícita del usuario (regla CLAUDE.md).

5. **Esperar merge → orden del usuario**.

6. **Tras merge**:
   - Tag SemVer `v0.2.8` en commit merge.
   - GitHub release con notas completas siguiendo plantilla CLAUDE.md "GitHub Releases".
   - Verificar Dokploy autodeploy (clean cache si necesario).
   - Smoke E2E VPS contra `dev.linkstation.ai`.

7. **Hand-off SP-4B phase-03b**:
   - Crear/rellenar `plans/260522-1700-sprint-validacion-pre-mvp/phase-03b-validacion-sprint-2b.md` con:
     - Comandos test automáticos.
     - Specs Playwright añadidos.
     - Checklist manual humano (recorrido overview + builder).
     - Variables entorno nuevas (probablemente ninguna).
     - Bugs cerrados (BUG-2B-XX) para regresión.
     - Notas de despliegue.

8. **Actualizar RoadMap.md** con Sprint 2B 🟢 COMPLETADA + tracking real.

9. **Memoria del proyecto**:
   - `memory/project-sprint-2b-closed.md` con resumen.

## Todo List

- [ ] CLOSE-1: typecheck + lint + build + vitest verdes.
- [ ] CLOSE-2: 3 specs Playwright smoke verdes + Lighthouse a11y ≥ 90 + 3 screenshots.
- [ ] CLOSE-4: 0 bugs sin resolver.
- [ ] CLOSE-5 paso 1: bump v0.2.8 en package.json.
- [ ] CLOSE-5 paso 2: commit + push feature branch.
- [ ] CLOSE-5 paso 3: PR a developer con body profesional.
- [ ] CLOSE-5 paso 4: ESPERAR orden usuario → merge.
- [ ] CLOSE-5 paso 5: tag v0.2.8 + release notes.
- [ ] CLOSE-5 paso 6: smoke E2E VPS post-deploy.
- [ ] CLOSE-5 paso 7: hand-off SP-4B phase-03b completo.
- [ ] CLOSE-5 paso 8: actualizar RoadMap.md.
- [ ] CLOSE-5 paso 9: crear memoria proyecto.

## Success Criteria

- Todos los CLOSE-1/2/4/5 🟢.
- PR mergeado a developer.
- Tag v0.2.8 + release publicado.
- VPS sirve Sprint 2B operativo.
- SP-4B phase-03b auto-fill completo (verificable por Renzo).
- RoadMap Sprint 2B → 🟢 con ⏱ Push + ⏱ Cierre reales.

## Risk Assessment

| Riesgo                                            | Prob  | Impacto | Mitigación                                                        |
| ------------------------------------------------- | ----- | ------- | ----------------------------------------------------------------- |
| Bug post-merge en VPS análogo a BUG-2-01 Sprint 2 | Baja  | Alto    | Smoke E2E VPS obligatorio post-deploy; rollback v0.2.7 si crítico |
| Dokploy cache aplicada y build viejo desplegado   | Media | Medio   | Lección Sprint 2: forzar Clean Cache en redeploy manual           |
| Hand-off SP-4B phase-03b incompleto               | Media | Bajo    | Plantilla con placeholders en SP-4B phase-03b nuevo               |

## Next Steps

→ Sprint 3 Hardening (v0.3.0-rc.1) — incluye phase-03 Node 22 + WCAG + observability + tests E2E + NEW-09..12 (phase-08 nueva).
