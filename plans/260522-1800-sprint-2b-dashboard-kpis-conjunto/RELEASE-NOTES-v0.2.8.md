# v0.2.8 — Sprint 2B Dashboard KPIs Overview (vista de conjunto)

## Resumen

Añade la sección Overview del dashboard con KPIs agregados de todos los canales (WhatsApp + Voz + Web) y 4 gráficos por defecto, configurable vía KPI Builder. Valida end-to-end en el VPS de desarrollo (`https://dev.linkstation.ai`) con 15/15 specs Playwright verdes.

## Highlights

- Nueva sección `<OverviewSection>` en `/dashboard` con KPIs agregados cross-canal en Server Component (Suspense streaming).
- Server action `getKpiOverview()` con mapper puro testeable y validación Zod end-to-end.
- 4 gráficos por defecto en Overview: distribución de canal (donut), evolución conversaciones, ratio agente vs IA, conversaciones por hora.
- KPI Builder opción C: `SummaryManager` reutilizable con prop `editButtonLabel` (Overview / Tablero / Embudo coexisten sin conflictos visuales).
- Persistencia de `overview_kpis` en `tenant.config` con defense-in-depth (validación Zod en `updateTenant` Y `updateTenantConfig`).
- WCAG 2.2 AA preventivo: `role="img"` + `aria-label` resumen en todos los charts del Overview.
- **15/15 specs Playwright verdes contra VPS** (`dev.linkstation.ai`) — primer sprint del MVP con cobertura E2E completa contra entorno desplegado.

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

15 filas Sprint 2B:

- Phase 01 — DEFAULT_OVERVIEW_KPIS + Zod schema
- Phase 02 — `getKpiOverview()` server action + mapper puro
- Phase 03 — Integración `<OverviewSection>` en `/dashboard`
- Phase 04 — 4 charts por defecto en Overview
- Phase 05 — KPI Builder opción C (SummaryManager + pestaña)
- Phase 06 — WCAG 2.2 AA preventivo (role=img + aria-label)
- Phase 07 — Cierre Sprint 2B (CLOSE-1..5)
- SP-3B-CLOSE-1 — Auto test (typecheck + lint + build + Vitest 193/193)
- SP-3B-CLOSE-2 — E2C Local Playwright (15/15 specs)
- SP-3B-CLOSE-3 — DIFERIDO a SP-4B phase-03b bloque 4 (Renzo + equipo)
- SP-3B-CLOSE-4 — 3 bugs resueltos (BUG-2B-01, -02, -03)
- SP-3B-CLOSE-5 — PR #13 + bump v0.2.8 + tag + release notes + hand-off SP-4B
- E2E VPS — 15/15 specs verdes contra `dev.linkstation.ai`

Subtotal Sprint 2B: **~2h 23min real vs 16h 30min estimado (ratio −86%)**.

Detalle granular en `plans/RoadMap.md` columnas ⏱ Push + ⏱ Cierre.

## Bugs resueltos

- **BUG-2B-01** — Conflicto visual: 2 botones "Personalizar Tablero" en la misma página. Fix: prop `editButtonLabel` en `SummaryManager`.
- **BUG-2B-02** — Persistencia de `overview_kpis` fallaba en algún entry point. Fix: validación Zod defense-in-depth en `updateTenant` Y `updateTenantConfig`.
- **BUG-2B-03** — Donut canal con 0 datos mostraba círculo vacío confuso. Fix: empty state explícito + tooltip "Web tracking en desarrollo" + filtra valores 0 si solo 1 canal tiene datos.

## Tareas diferidas

- **SP-3B-CLOSE-3** (test manual del dev) → DIFERIDO a SP-4B phase-03b bloque 4 (decisión 22-05-2026, Renzo + equipo absorben CLOSE-3 manuales de Sprints 1, 2, 2B, 3 en el sprint de validación pre-MVP).

## ADRs aprobados

NINGUNO nuevo. Sprint puramente aplicación sobre arquitectura ya decidida.

## Tests

- **Vitest full local**: 193/193 verdes (4 skipped por env).
- **Vitest nuevos Sprint 2B**: 24/24 (10 schema overview-kpi + 8 mapper kpi-overview + 6 chart-summary).
- **Playwright E2C local Sprint 2B**: 15/15 verdes (7 smoke + 8 deep checks).
- **Playwright E2E VPS Sprint 2B**: **15/15 verdes** contra `https://dev.linkstation.ai` (1m 30s total).
- **Typecheck**: ✅ verde.
- **Build producción local**: ✅ verde.
- **Build producción VPS (Dokploy)**: ✅ verde — `app-linkstation-devdash-zwr4mz:latest` desplegado.
- **Lint**: 116 errores preexistentes (0 nuevos introducidos por Sprint 2B).

## Contribuidores

- @JaviHP (orquestación + implementación + validación VPS)

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
d97ee44 docs(sprint-2b): PR #13 abierto a developer + RoadMap SP-3B-CLOSE-5 🔵 Subida rama
b6c49b2 docs(sprint-2b): PR #13 abierto a developer + RoadMap SP-3B-CLOSE-5 a Subida rama
17b2902 Merge pull request #13 from LinkStation/feature/sprint-02b-dashboard-kpis-conjunto
a8e9aa5 docs(sprint-2b): sync RoadMap tras merge PR #13 — Sprint 2B 🔵 Subida rama + E2E VPS en curso
```

Y commits de cierre v0.2.8 (este release):

- `chore(release): bump v0.2.8 + RELEASE-NOTES + hand-off SP-4B phase-03b + SP-4-NEW-13 endpoints health/version`

## Lessons learned

- **ETag opaco de Next.js prerender** dificultó la verificación post-deploy. Mismo ETag (`778yfwjt2f6lb`) entre builds distintos cuando el HTML root no cambia. Detectado durante CLOSE-5. **Acción correctiva**: nueva tarea SP-4-NEW-13 en Sprint 3 (Hardening) para crear endpoints `/api/health` + `/api/version` y resolver el problema permanentemente. Documentación: `plans/260520-1342-sprint-3-hardening/phase-02-observabilidad-endpoints-health-version.md`.
- **Dokploy autodeploy funciona correctamente** — clone + build + swap container completados en ~6min. El "deploy stuck" inicial fue una mala interpretación del ETag, no un fallo real de Dokploy.
- **Sprint 2B es el primer sprint del MVP con E2E completo contra VPS** (Sprint 2 cerró con smoke 5/5 acotado). Cobertura ascendiendo gradualmente sprint a sprint.

## Próximos pasos

1. Hand-off completo a SP-4B phase-03b (`plans/260522-1700-sprint-validacion-pre-mvp/phase-03b-validacion-sprint-2b.md`).
2. Arrancar **Sprint 3 (Hardening)** según RoadMap (Vie 29-05 → Vie 12-06-2026, ~112-144h).
3. SP-4-NEW-13 endpoints `/api/health` + `/api/version` en phase-02 Sprint 3 (30min-1h) para resolver la fricción de verificación post-deploy detectada en este sprint.
