## Resumen

Post-fix de Sprint 2B (v0.2.8) tras 2 bugs visuales detectados por el usuario en VPS + ejecución completa del E2E manual Bloques B-G. Mejoras visuales significativas en el Overview del dashboard validadas en producción.

## Highlights

- **Alturas reales de las 4 cards del Overview ahora alineadas** a 389px (antes 382/362/362/382). Tres capas de fix: `auto-rows-fr` en grid, `h-full` en wrapper `role="img"` de `ChartManager`, card replicada del `ChartCard` para `OverviewCanalDistribution` con la nota "Web tracking en desarrollo" dentro de la card.
- **Viewport del contenido ocupa 100% del ancho disponible** en pantallas grandes (>1920px, 2K, 4K). Antes `max-w-[1600px]` generaba franja blanca lateral de hasta 704px en pantallas 2560.
- **E2E manual Bloques B-G ejecutado** (~2h 30min) sobre VPS `dev.linkstation.ai`: 32/43 tests PASS, 0 FAIL críticos, 5 N/A justificados (multi-tenant requiere segundo tenant), 2 diferidos a SP-4B (login destructivo).
- **Suite Playwright `sprint-2b-close` 18/18 verde** en local + VPS tras los fixes (smoke + deep checks).
- **4 bugs detectados**: 1 HIGH **FIXED y desplegado** (BUG-2B-11 viewport), 3 WCAG menores diferidos al Sprint 3 Hardening (BUG-2B-08 aria-label, BUG-2B-09 heading hierarchy, BUG-2B-10 skip-link).

## Detalle por área

### Frontend (UI/UX Overview)

- `src/components/dashboard/ChartManager.tsx` — añadido `className="h-full"` al wrapper `role="img"` que envuelve los charts. Sin este `h-full`, el `ChartCard` hijo (que ya tiene `flex h-full flex-col`) no podía estirarse al `auto-rows-fr` del grid 12-col.
- `src/components/dashboard/OverviewSection.tsx` — simplificado el `extraSlot` que envolvía `OverviewCanalDistribution` en una card distinta (`rounded-2xl p-6` sin shadow ni border-border). Generaba doble card anidada con estilos diferentes. Ahora `<div className="h-full">` puro.
- `src/components/dashboard/OverviewCanalDistribution.tsx` — refactor: replicar exactamente las clases del `ChartCard` (`border-border bg-card flex h-full flex-col rounded-3xl border p-7 shadow-sm`), renderizado inline del donut con recharts (PieChart/Pie/Cell/Tooltip/Legend), nota "Web tracking en desarrollo" DENTRO de la card en lugar de fuera. `TooltipPie` extraído al top-level (react-hooks/static-components). Añadido `"use client"`.
- `src/app/dashboard/page.tsx` + `whatsapp/page.tsx` + `minutos/page.tsx` + `campanas/page.tsx` — reemplazar `mx-auto max-w-[1600px] space-y-6 pb-10` por `w-full space-y-6 pb-10`. El `main` con `p-6 = 24px` lateral ya respeta el padding correcto.

### Validación E2E manual Bloques B-G (NUEVO en este release)

- **Bloque B Anti-regresión Sprint 0/1/2**: 6/10 PASS, 2 N/A (1 solo tenant), 2 diferidos a SP-4B (B-02/B-03 destructivos de sesión).
- **Bloque C WCAG 2.2 AA exhaustivo**: 5/8 PASS, 3 bugs detectados.
- **Bloque D Performance / Core Web Vitals / responsive**: 6/6 PASS. TTFB 389ms, FCP 472ms, refresh ×5 estable 325-428ms, bundle 106KB, responsive 1280/768/375 sin overflow, dark mode sin glitches, 0 console errors en navegación.
- **Bloque E DnD KPI/Chart Builder**: 8/8 PASS. Personalizar Overview + Personalizar Overview Gráficos abren edit mode con 4 controles por card (drag, configurar, layout, eye, trash). Sidebar config con 8 inputs.
- **Bloque F Multi-tenant / RLS**: 2/5 PASS, 3 N/A (multi-tenant requiere segundo tenant en VPS + creds viewer). KPIs reflejan filtros FilterBar correctamente.
- **Bloque G Exploración + edge cases**: 5/5 PASS.

### Documentación

- `plans/260522-1800-sprint-2b-dashboard-kpis-conjunto/phase-07b-e2e-manual-bloques-b-g.md` — NUEVO plan formal de los Bloques B-G con 43 tests detallados.
- `plans/RoadMap.md` — fila Sprint 2B actualizada con tracking Phase 07B post-fix, versioning_policy.
- Screenshots E2E + comparativas viewport en `docs/screenshots/sprint-2b-bloques-b-g/`.

## Breaking changes

NINGUNO. Los cambios son visuales (CSS) y NO afectan al API público ni al schema de la base de datos.

## Migraciones SQL

Ninguna.

## Variables de entorno nuevas

Ninguna.

## Tareas RoadMap cerradas

- **SP-3B-CLOSE-6** (post-fix v0.2.9): 3 commits fix + E2E manual Bloques B-G + bump + tag + release. Tiempo real ~3h 30min vs ~3h estim.

## Tareas diferidas

- **BUG-2B-08** Personalizar X sin aria-label/title (LOW) → Sprint 3 Hardening WCAG.
- **BUG-2B-09** Heading hierarchy (3 h1 + salto h1→h3) → Sprint 3.
- **BUG-2B-10** Falta skip-link "Saltar al contenido" → Sprint 3.
- **B-02 + B-03** login destructivo → SP-4B (Renzo, creds frescas).
- **F-01 / F-03 / F-04** multi-tenant + viewer → SP-4B (segundo tenant + creds viewer).

## ADRs aprobados

Ninguno nuevo en v0.2.9.

## Contribuidores

- @javier-hp (Javi HP) — dev + planning + validación E2E manual

## Commits incluidos

```
4c720e1 fix(sprint-2b): alturas uniformes cards/charts por fila (auto-rows-fr + h-full + flex-1)
7cfc976 fix(sprint-2b): alturas reales cards Overview alineadas (h-full + card replicada en canal distribution)
0fa1cfc fix(sprint-2b): BUG-2B-11 viewport no llena 100% en pantallas grandes (max-w-[1600px] → w-full)
```

(Más el commit de bump v0.2.9 + RoadMap update incluido en este release).

## Próximos pasos

1. Sprint 3 Hardening arranca **Vie 29-05-2026**: incluye los 3 bugs WCAG BUG-2B-08/09/10 como tareas dedicadas.
2. SP-4B Validación Pre-MVP (Renzo): hand-off `phase-03b-validacion-sprint-2b.md` ya auto-filled, ampliar con B-02/B-03/F-01/F-03/F-04 al arrancar.
3. **MVP v0.3.0 GA target**: Lun 22-06-2026 (sin cambios desde planificación 24-05).
