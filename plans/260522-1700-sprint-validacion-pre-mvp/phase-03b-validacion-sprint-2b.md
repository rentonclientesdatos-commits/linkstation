# Fase 03b — Validación Sprint 2B (Dashboard KPIs Overview v0.2.8)

> **Plantilla skeleton creada 24-05-2026** tras research R3. Se rellena en SP-3B-CLOSE-5 (auto-fill por el agente que cierre Sprint 2B). Hasta entonces tiene estructura genérica para guiar el llenado correcto.

## Context Links

- [plan.md](plan.md) — overview Sprint Validación Pre-MVP
- [Sprint 2B plan](../260522-1800-sprint-2b-dashboard-kpis-conjunto/plan.md)
- [Sprint 2B phase-07 Cierre](../260522-1800-sprint-2b-dashboard-kpis-conjunto/phase-07-cierre-sprint.md)
- [Research base Sprint 2B](../reports/researcher-sprint-2b-kpis-dashboard-260524.md)
- [RoadMap](../RoadMap.md)

## Overview

- **Sprint validado**: Sprint 2B — Dashboard KPIs Overview conjunto (SP-3B, **v0.2.8**).
- **Branch origen**: `feature/sprint-02b-dashboard-kpis-conjunto`.
- **Estado al crear skeleton**: 🔘 Pendiente (Sprint 2B aún no ejecutado, planificado Lun 27-07-2026).
- **Tester**: Renzo.

## Resumen del Sprint 2B a validar (auto-fill al cierre)

<!-- AUTOFILL-START: Resumen Sprint 2B (auto-fill 25-05-2026 SP-3B-CLOSE-5) -->

**Versión release**: `v0.2.8` (tag publicado 25-05-2026).
**PR mergeado**: [#13](https://github.com/LinkStation/linkstation-dashboard/pull/13) → merge commit `17b2902`.
**Dokploy deploy**: `app-linkstation-devdash-zwr4mz:latest` con build args + ENV vars del Sprint 2 (zero-migration, zero-env-nuevas).
**E2E VPS pre-validación**: 15/15 specs Playwright verdes desde Claude orquestador (25-05-2026 06:09 UTC, 1m 30s).

**Nuevas features:**

- `<OverviewSection>` Server Component con Suspense streaming arriba de SummarySection en `/dashboard`.
- 4 KPIs hero default (DEFAULT_OVERVIEW_KPIS): Total Leads, Leads Contactados, Leads Cualificados, Tiempo Ahorrado.
- 4 charts default (DEFAULT_OVERVIEW_CHARTS): Distribución por canal (donut custom), Evolución conversaciones, Ratio agente vs IA, Conversaciones por hora.
- KPI Builder opción C: `SummaryManager` reutilizable con prop `editButtonLabel` ("Personalizar Overview" / "Personalizar Tablero" / "Personalizar Embudo") en `/dashboard/settings`.
- WCAG 2.2 AA preventivo: `role="img"` + `aria-label` resumen automático en todos los charts vía helper `chartSummary`.

**Server actions:**

- `getKpiOverview()` en `src/lib/actions/analytics.ts` — agrega KPIs cross-canal (WhatsApp + Voz + Web). Validación Zod I/O end-to-end.
- `updateTenant` + `updateTenantConfig` en `src/lib/actions/tenant.ts` — defense-in-depth Zod para `overview_kpis` (cierra BUG-2B-02).

**Cambios en `tenants.config` JSONB:**

- Nueva clave opcional `overview_kpis` (array). Si falta → usa `DEFAULT_OVERVIEW_KPIS`.
- Nuevo campo `total_whatsapp_conversaciones` en `KpiGenerales` (padding=0 en canales que no aplican).

**Tests añadidos (24/24 nuevos Vitest):**

- `tests/unit/schemas/overview-kpi.test.ts` — 10 tests schema Zod.
- `tests/unit/mappers/kpi-overview.test.ts` — 8 tests mapper puro.
- `tests/unit/utils/chart-summary.test.ts` — 6 tests helper accesibilidad.
- Total local: **193/193 Vitest verdes** (4 skipped por env).

**Specs Playwright añadidos (15 specs):**

- `tests/e2e/sprint-2b-close/overview-section.spec.ts` — 7 smoke (2B-01..07) + 8 deep checks (2B-08..15).
<!-- AUTOFILL-END -->

## 1. Test automático (código)

```bash
npm install
npm run typecheck                 # exit 0
npm run lint                      # 0 errors, 0 warnings
npm run build                     # exit 0
npm run test                      # ~180-185 passed (170 Sprint 2 + ~10-15 Sprint 2B)
npm run test -- --coverage        # coverage report
```

**Resultados esperados:**

- typecheck: 0 errores.
- build: `✓ Compiled successfully` + nueva ruta `/dashboard` extendida visible.
- tests: 180+ pass.
- Coverage: ≥80% en `src/lib/actions/analytics.ts` (función `getKpiOverview` nueva).

## 2. Test E2C local (Playwright contra `localhost:8500`)

```bash
npm run dev
PLAYWRIGHT_BASE_URL=http://localhost:8500 npx playwright test tests/e2e/sprint-2b-close/
```

**Specs creados en Sprint 2B CLOSE-2** (`tests/e2e/sprint-2b-close/smoke-overview-local.spec.ts`):

- OVR-01: `/dashboard` renderiza `<OverviewSection>` con 4 KPIs hero.
- OVR-02: 4 gráficos overview visibles con `role="img"` + aria-label.
- OVR-03: KPI Builder en `/settings` persiste cambios y se reflejan al refrescar.

**Lighthouse a11y:**

- Score ≥ 90 en `/dashboard`.
- 0 critical issues en axe DevTools.

## 3. Specs listos para E2E VPS

Mismos specs con `PLAYWRIGHT_BASE_URL=https://dev.linkstation.ai`. Pre-requisitos:

- Sprint 2B mergeado a `developer`.
- Dokploy redeploy con Clean Cache (lección Sprint 2).
- Tenant Bea con al menos algunos leads/llamadas/whatsapp para que el overview muestre datos reales.

## 4. Checklist manual humano (40 min)

### Bloque A — Smoke /dashboard (10 min)

- [ ] **A.1** Login admin VPS → `/dashboard`.
- [ ] **A.2** **Sección Overview visible ARRIBA** del resto del dashboard, con 4 KPI cards hero.
- [ ] **A.3** Los 4 KPIs default muestran valores reales (no "0" si tenant tiene datos): Total Leads, Contactados, Cualificados, Tiempo Ahorrado.
- [ ] **A.4** Los 4 gráficos visibles en grid responsive (2x2 desktop, 1 col mobile).
- [ ] **A.5** FilterBar arriba afecta valores del overview (cambiar rango fechas).

### Bloque B — Personalización por tenant (15 min)

- [ ] **B.1** Ir a `/dashboard/settings` → sección "KPIs Overview" visible.
- [ ] **B.2** Añadir un KPI nuevo al overview (ej. "Leads Web").
- [ ] **B.3** Reordenar KPIs (drag & drop si Opción A/C de phase-05).
- [ ] **B.4** Toggle visibility de un KPI → debe ocultarse sin borrarse.
- [ ] **B.5** Guardar config → volver a `/dashboard` → cambios visibles.
- [ ] **B.6** Persistencia: refresh page → cambios persisten (no se pierden).
- [ ] **B.7** Multi-tenant: cambiar a tenant secundario → config independiente.

### Bloque C — WCAG manual (10 min)

- [ ] **C.1** Navegación por teclado: Tab recorre todos los KPI cards y charts en orden.
- [ ] **C.2** Screen reader (NVDA/VoiceOver) lee títulos de sección como headings.
- [ ] **C.3** Screen reader lee charts con descripción textual ("Gráfico: Leads por día. 12 puntos de datos...").
- [ ] **C.4** Trend badges (si existen) tienen aria-label descriptivo, no solo color.
- [ ] **C.5** Contraste ≥ 4.5:1 en todos los KPI values (medir con axe DevTools).

### Bloque D — Performance (5 min)

- [ ] **D.1** Tiempo carga `/dashboard` < 3s (con datos reales tenant Bea).
- [ ] **D.2** No bloquea otras secciones del dashboard (Suspense independiente).

## 5. BUG-2B-XXX detectados y corregidos durante el cierre Sprint 2B (REGRESSION BASELINE)

<!-- AUTOFILL-START: Bugs Sprint 2B (auto-fill 25-05-2026 SP-3B-CLOSE-5) -->

3 bugs detectados durante CLOSE-2 (pre-PR) y corregidos antes del merge. **Regression checks obligatorios** en el manual humano:

| BUG ID        | Severidad   | Descripción                                                                                                  | Fix commit | Regression check                                                                                                                                             |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BUG-2B-01** | UX (MEDIUM) | Conflicto visual: 2 botones "Personalizar Tablero" en la misma página confundían al usuario                  | `10509bc`  | Bloque A.2 + B.1 — verificar labels distintos: "Personalizar Overview" / "Personalizar Tablero" / "Personalizar Embudo"                                      |
| **BUG-2B-02** | Safety (P1) | Persistencia de `overview_kpis` fallaba si se llamaba `updateTenantConfig` directo (entry point alternativo) | `10509bc`  | Bloque B.5 + B.6 — guardar config desde KPI Builder Y verificar persistencia tras refresh                                                                    |
| **BUG-2B-03** | UX (LOW)    | Donut canal con 0 datos mostraba círculo vacío confuso (sin texto explicativo)                               | `10509bc`  | Bloque A.4 — si tenant secundario sin tráfico, verificar empty state explícito "Sin datos en el período seleccionado" + tooltip "Web tracking en desarrollo" |

**Validación pre-PR vía Playwright deep checks (2B-08..15)**: ya cubierta automatizada. Manual humano verifica que los fixes siguen aplicando con datos reales del tenant Bea (no datos sintéticos de fixtures).

<!-- AUTOFILL-END -->

## 6. Env vars NUEVAS que necesita el VPS

<!-- AUTOFILL-START: Env vars Sprint 2B (auto-fill 25-05-2026 SP-3B-CLOSE-5) -->

**Confirmado zero-env-vars-nuevas** tras implementación completa.

| Var | Propósito                                                                                 | Dónde obtener |
| --- | ----------------------------------------------------------------------------------------- | ------------- |
| —   | Sprint 2B no requiere env vars nuevas (todo persiste en `tenants.config` JSONB existente) | —             |

Reutiliza 100% el set de vars del Sprint 2 (ya configuradas en Dokploy panel `dev-dash`).

<!-- AUTOFILL-END -->

## 7. Notas de despliegue

<!-- AUTOFILL-START: Notas despliegue Sprint 2B (auto-fill 25-05-2026 SP-3B-CLOSE-5) -->

1. ✅ Sprint 2B confirmado **zero-migration** (no toca esquema Postgres).
2. ✅ Sprint 2B confirmado **zero-env-vars-nuevas**.
3. ✅ Dokploy autodeploy funcionó correctamente sin Clean Cache manual — clone + `npm ci` + `npm run build` + swap container completaron en ~6min tras merge PR #13.
4. ⚠️ Verificar en VPS validación que `tenants.config` JSONB persiste correctamente la clave nueva `overview_kpis` tras editar desde UI (Bloque B.5/B.6).
5. ℹ️ **Fricción detectada**: ETag opaco de Next.js prerender dificultó verificación post-deploy (mismo ETag `778yfwjt2f6lb` entre builds distintos cuando HTML root no cambia). **Acción correctiva**: nueva tarea SP-4-NEW-13 en Sprint 3 phase-02 para crear endpoints `/api/health` + `/api/version`. Detalle: `plans/260520-1342-sprint-3-hardening/phase-02-observabilidad-endpoints-health-version.md`.
<!-- AUTOFILL-END -->

## 8. Status final SP-4B phase-03b

<!-- AUTOFILL-START: Status final (auto-fill 25-05-2026 SP-3B-CLOSE-5) -->

**Estado al cierre Sprint 2B (25-05-2026 ~06:15 UTC):**

- 🟢 **Auto-tests verdes**: 193/193 Vitest local (4 skipped por env).
- 🟢 **Build verde**: typecheck + build production local + build production Dokploy todos OK.
- 🟢 **E2E VPS pre-validación**: **15/15 specs Playwright verdes** contra `https://dev.linkstation.ai` (Claude orquestador, 25-05-2026 06:09 UTC). Cubre: redirect login, OverviewSection visible, 4 KPI hero, BUG-2B-01 fix (2 labels), donut canal empty state, WCAG role=img, console errors, FilterBar, no regresión Summary/Funnel, BUG-2B-03 fix, edit mode DnD, navegación cross-page, API /api/integrations.
- 🟢 **3 bugs cerrados** con regression checks documentados (BUG-2B-01/02/03).
- 🟢 **Lighthouse a11y**: PENDIENTE de medición manual por Renzo (target ≥90).
- ⏳ **Pendiente Renzo + equipo**: ejecutar Bloques A/B/C/D del checklist manual (40 min) cuando ventana SP-4B abra (Mar 16-06-2026).
<!-- AUTOFILL-END -->

## 9. Hand-off a phase-04 (Sprint 3 Hardening)

Tras completar phase-03a + phase-03b, Renzo continúa con **[phase-04-validacion-sprint-3.md](phase-04-validacion-sprint-3.md)** que valida Sprint 3 Hardening (release candidate v0.3.0-rc.1).
