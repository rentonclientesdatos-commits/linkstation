# Sprint 2B — Dashboard KPIs Overview (vista de conjunto)

## Resumen

Añade la sección Overview del dashboard con KPIs agregados de todos los canales (WhatsApp + Voz + Web) y 4 gráficos por defecto, configurable vía KPI Builder. Cierra todas las decisiones de la clienta del 24-05 (opción C SummaryManager + pestaña, donut 2 valores + tooltip, ratio agente/IA, etc.).

## Highlights

- Nueva sección `<OverviewSection>` en `/dashboard` con KPIs agregados cross-canal en Server Component (Suspense streaming).
- Server action `getKpiOverview()` con mapper puro testeable y validación Zod end-to-end.
- 4 gráficos por defecto en Overview: distribución de canal (donut), evolución conversaciones, ratio agente vs IA, conversaciones por hora.
- KPI Builder opción C: `SummaryManager` reutilizable con prop `editButtonLabel` (Overview / Tablero / Embudo coexisten sin conflictos visuales).
- Persistencia de `overview_kpis` en `tenant.config` con defense-in-depth (validación Zod en `updateTenant` Y `updateTenantConfig`).
- WCAG 2.2 AA preventivo: `role="img"` + `aria-label` resumen en todos los charts del Overview.
- 3 bugs corregidos antes del PR (UX + safety).

## Detalle por área

### Frontend (dashboard)

- `src/components/dashboard/OverviewSection.tsx` — Server Component con Suspense + streaming.
- `src/components/dashboard/OverviewCanalDistribution.tsx` — donut custom con empty state ("Sin datos en el período seleccionado") + tooltip "Web tracking en desarrollo".
- `src/components/dashboard/SummaryManager.tsx` — nueva prop `editButtonLabel` para soportar 3 paneles editables (Overview, Tablero, Embudo).
- `src/components/dashboard/ChartManager.tsx` — wrapper `role="img"` + `aria-label` con resumen del chart (helper `chartSummary`).
- `src/app/dashboard/page.tsx` — integración de `<OverviewSection>` arriba del summary actual.

### Capa de datos / Server actions

- `src/lib/actions/analytics.ts` — nueva `getKpiOverview()` que agrega KPIs cross-canal. Añade campo `total_whatsapp_conversaciones` a `KpiGenerales` (padding=0 en canales que no aplican).
- `src/lib/actions/tenant.ts` — validación Zod `overview_kpis` en `updateTenant` Y `updateTenantConfig` (defense-in-depth, cierra BUG-2B-02).
- `src/lib/schemas/overview-kpi.ts` — schema Zod del array de KPIs Overview.
- `src/lib/schemas/kpi-overview-io.ts` — schemas I/O del server action.
- `src/lib/schemas/index.ts` — exports nuevos.
- `src/lib/mappers/kpi-overview.ts` — mapper puro testeable (sin Supabase, sin React).
- `src/lib/utils/chart-summary.ts` — helper para generar resumen accesible de cualquier chart.
- `src/lib/constants/kpi-defaults.ts` — añade `DEFAULT_OVERVIEW_KPIS` + `DEFAULT_OVERVIEW_CHARTS`.

### WhatsApp page (ajuste menor)

- `src/app/dashboard/whatsapp/page.tsx` — pad `total_whatsapp_conversaciones=0` para mantener tipo `KpiGenerales` consistente tras añadir el campo.

## Breaking changes

NINGUNO. Cambios aditivos:

- Nuevo campo `total_whatsapp_conversaciones` en `KpiGenerales` con default 0.
- Nueva clave opcional `overview_kpis` en `tenant.config` (si falta, se usa `DEFAULT_OVERVIEW_KPIS`).
- `SummaryManager` mantiene comportamiento previo si no se pasa `editButtonLabel` (label por defecto "Personalizar Tablero").

## Migraciones SQL

NINGUNA. Sprint 100% aplicación (no toca esquema Postgres).

## Variables de entorno nuevas

NINGUNA. Reutiliza las del Sprint 2.

## Tareas RoadMap cerradas

15 filas Sprint 2B pasadas a 🟢:

- SP-3B-01 al SP-3B-07 (phases implementación)
- SP-3B-CLOSE-1 (auto test full)
- SP-3B-CLOSE-2 (E2C local Playwright)
- SP-3B-CLOSE-4 (corrección 3 bugs)
- 5 subtareas de tracking/documentación

Subtotal Sprint 2B: **~1h 53min real vs 16h 30min estimado (ratio −89%)**.

Detalle granular en `plans/RoadMap.md` columnas ⏱ Push + ⏱ Cierre.

## Bugs resueltos pre-PR

- **BUG-2B-01** — Conflicto visual: 2 botones "Personalizar Tablero" en la misma página. Fix: prop `editButtonLabel` en `SummaryManager`.
- **BUG-2B-02** — Persistencia de `overview_kpis` fallaba en algún entry point. Fix: validación Zod defense-in-depth en `updateTenant` Y `updateTenantConfig`.
- **BUG-2B-03** — Donut canal con 0 datos mostraba círculo vacío confuso. Fix: empty state explícito + tooltip "Web tracking en desarrollo" + filtra valores 0 si solo 1 canal tiene datos.

## Tareas diferidas

- E2E contra VPS (`dev.linkstation.ai`) — se ejecuta tras merge + autodeploy.
- Bump SemVer a `v0.2.8` + tag + release notes — se hace en CLOSE-5 tras E2E VPS verde.
- Hand-off a `SP-4B phase-03b` — se rellena en CLOSE-5.

## ADRs aprobados

NINGUNO nuevo. Sprint puramente aplicación sobre arquitectura ya decidida.

## Tests

- **Vitest full**: 193/193 verdes (4 skipped por env).
- **Vitest nuevos Sprint 2B**: 24/24 (10 schema overview-kpi + 8 mapper kpi-overview + 6 chart-summary).
- **Playwright Sprint 2B**: 15/15 verdes (7 smoke + 8 deep checks de navegación, filtros, edit mode, regresiones, console errors).
- **Typecheck**: ✅ verde.
- **Build producción**: ✅ verde.
- **Lint**: 116 errores preexistentes (0 nuevos introducidos por Sprint 2B).

## Contribuidores

- @JaviHP (orquestación + implementación)

## Commits incluidos

```
13c75e8 feat(sprint-2b): phase-01 add DEFAULT_OVERVIEW_KPIS + Zod schema
b091598 feat(sprint-2b): phase-02 getKpiOverview() server action + pure mapper
90cb701 feat(sprint-2b): phase-03 add <OverviewSection> to /dashboard
28aca5b feat(sprint-2b): phase-04 add 4 default charts to <OverviewSection>
c7f4127 feat(sprint-2b): phase-05 KPI Builder Overview (opcion C decidida 24-05)
d12ef4b fix(sprint-2b): phase-06 WCAG 2.2 AA preventivo (role=img charts + summary)
10509bc fix(sprint-2b): 3 bugs detectados pre-CLOSE-2 (UX + safety)
9d4d36b test(sprint-2b): CLOSE-2 E2C local Playwright 7/7 verdes
c145491 fix(sprint-2b): remove unused KpiOverviewOutputSchema import in analytics.ts
0ccf6f4 docs(roadmap): sync Sprint 2 CERRADO + Sprint 2B 6/7 phases con tiempos completos
941a42a test(sprint-2b): deep E2C checks pre-PR — 15/15 specs verdes
```

11 commits feature + 1 commit docs (RoadMap sync) = 12 commits totales.

## Próximos pasos tras merge

1. Autodeploy VPS Hetzner (`dev.linkstation.ai`) ~2-3min.
2. Ejecutar specs Playwright Sprint 2B contra `PLAYWRIGHT_BASE_URL=https://dev.linkstation.ai`.
3. Si E2E VPS verde: cerrar Sprint 2B con bump `v0.2.8` + tag + release notes + hand-off a `SP-4B phase-03b`.
4. Arrancar Sprint 3 (Hardening — tests E2E, observabilidad, dashboards de costes infra) según RoadMap.
