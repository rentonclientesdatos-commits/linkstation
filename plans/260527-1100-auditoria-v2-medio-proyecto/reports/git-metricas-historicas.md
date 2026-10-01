# Git Métricas Históricas — linkstation

**Generado:** 2026-05-27  
**Ventana:** 2026-03-02 (primer commit) → 2026-05-27 (hoy)  
**Hito auditoría V1:** 2026-05-20 — merge `auditoria` a `developer` (commit `71e3e7d`,
`merge: integrate origin/main into developer (local auditoria wins on conflict)`).
Las métricas "antes/después" se pueden derivar usando esta fecha como corte.

---

## 1. Commits totales por rama

### Ramas principales

| Rama        | Commits totales (acumulado)   |
| ----------- | ----------------------------- |
| `developer` | 595                           |
| `auditoria` | 5 (rama ancestro, 🔒 cerrada) |

### Feature branches (commits acumulados desde el origen, incluyen histórico heredado)

| Rama                                         | Commits acum. | Nota                          |
| -------------------------------------------- | ------------- | ----------------------------- |
| `feature/sprint-03-hardening`                | 589           | Sprint 3 RC (mergeado PR #14) |
| `chore/remove-sentry-test`                   | 594           | Tiny chore (rama actual)      |
| `docs/e2etotal-v1-1`                         | 594           | Docs /e2etotal plan           |
| `chore/sentry-vps-validation`                | 591           | Sentry VPS setup              |
| `feature/sprint-02b-dashboard-kpis-conjunto` | 565           | Sprint 2B KPIs                |
| `feature/sprint-02-adapter-hubspot-zoho`     | 542           | Sprint 2 CRM adapters         |
| `feature/planning-update-mvp-bea-renzo`      | 488           | Planning docs                 |
| `feature/sp-0-sprint-0-hotfixes`             | 486           | Sprint 0 security hotfixes    |

> Nota: los conteos de commits en ramas feature incluyen todos los commits ancestros
> heredados de `developer`. Los commits **exclusivos** por sprint están en los PRs
> mergeados: PR #2 (Sprint 0), #5 (Sprint 1), #12 (Sprint 2), #13 (Sprint 2B),
> #14 (Sprint 3).

### Top 5 ramas más activas (commits exclusivos por PR)

| Posición | Rama / PR          | Commits exclusivos             | Período       |
| -------- | ------------------ | ------------------------------ | ------------- |
| 1        | Sprint 2 (PR #12)  | ~111 archivos, ver additions   | 24-05-2026    |
| 2        | Sprint 3 (PR #14)  | feat+docs+fix ~50 commits      | 25-26-05-2026 |
| 3        | Sprint 1 (PR #5)   | 16 commits listados en RoadMap | 22-05-2026    |
| 4        | Sprint 2B (PR #13) | ~7 commits de desarrollo       | 24-25-05-2026 |
| 5        | Sprint 0 (PR #2)   | 26/27 tareas dev               | hasta 22-05   |

---

## 2. Commits por día — serie temporal (Chart.js)

```json
[
  { "date": "2026-03-02", "commits": 6 },
  { "date": "2026-03-03", "commits": 14 },
  { "date": "2026-03-04", "commits": 2 },
  { "date": "2026-03-06", "commits": 20 },
  { "date": "2026-03-07", "commits": 20 },
  { "date": "2026-03-08", "commits": 3 },
  { "date": "2026-03-13", "commits": 15 },
  { "date": "2026-03-16", "commits": 3 },
  { "date": "2026-03-19", "commits": 2 },
  { "date": "2026-03-20", "commits": 2 },
  { "date": "2026-03-25", "commits": 4 },
  { "date": "2026-03-26", "commits": 1 },
  { "date": "2026-04-10", "commits": 13 },
  { "date": "2026-04-15", "commits": 42 },
  { "date": "2026-04-16", "commits": 8 },
  { "date": "2026-04-17", "commits": 5 },
  { "date": "2026-04-19", "commits": 13 },
  { "date": "2026-04-20", "commits": 11 },
  { "date": "2026-04-21", "commits": 20 },
  { "date": "2026-04-23", "commits": 8 },
  { "date": "2026-04-24", "commits": 4 },
  { "date": "2026-04-28", "commits": 13 },
  { "date": "2026-04-30", "commits": 13 },
  { "date": "2026-05-04", "commits": 3 },
  { "date": "2026-05-05", "commits": 6 },
  { "date": "2026-05-06", "commits": 41 },
  { "date": "2026-05-07", "commits": 10 },
  { "date": "2026-05-08", "commits": 3 },
  { "date": "2026-05-09", "commits": 6 },
  { "date": "2026-05-10", "commits": 6 },
  { "date": "2026-05-11", "commits": 42 },
  { "date": "2026-05-12", "commits": 7 },
  { "date": "2026-05-13", "commits": 24 },
  { "date": "2026-05-15", "commits": 21 },
  { "date": "2026-05-18", "commits": 19 },
  { "date": "2026-05-19", "commits": 6 },
  { "date": "2026-05-20", "commits": 6 },
  { "date": "2026-05-21", "commits": 38 },
  { "date": "2026-05-22", "commits": 39 },
  { "date": "2026-05-23", "commits": 10 },
  { "date": "2026-05-24", "commits": 40 },
  { "date": "2026-05-25", "commits": 17 },
  { "date": "2026-05-26", "commits": 13 },
  { "date": "2026-05-27", "commits": 3 }
]
```

### Días pico (≥ 30 commits)

| Fecha      | Commits | Evento asociado                                  |
| ---------- | ------- | ------------------------------------------------ |
| 2026-05-11 | **42**  | Desarrollo previo a auditoría (osdopllamadas)    |
| 2026-04-15 | **42**  | Día más activo pre-auditoría V1                  |
| 2026-05-06 | **41**  | Desarrollo pre-auditoría                         |
| 2026-05-24 | **40**  | Sprint 2 cierre (PR #12) + Sprint 2B arranque    |
| 2026-05-22 | **39**  | Sprint 0 cierre formal + Sprint 1 merge (PR #5)  |
| 2026-05-21 | **38**  | Auditoría V1 scaffold + Sprint 0 trabajo intenso |

### Nota de contexto temporal

- **Fase pre-auditoría** (2026-03-02 → 2026-05-19): 36 días activos, desarrollo
  orgánico por `osdopllamadas`. Incluye el codebase original importado.
- **Fase post-auditoría V1** (2026-05-20 → 2026-05-27): 8 días activos, desarrollo
  estructurado por equipo Ai2You/Renzo con sprints formales.

---

## 3. Commits por autor

> Conteo sobre todas las ramas (`git log --all`).

| Autor (git name) | Email                                  | Commits | Rol                                |
| ---------------- | -------------------------------------- | ------- | ---------------------------------- |
| `osdopllamadas`  | osdopllamadas@users.noreply.github.com | **434** | Desarrollador original (pre-audit) |
| `Renzo`          | admin@2you.ai                          | **152** | Dev principal post-auditoría       |
| `Ai2You`         | admin@2you.ai                          | **16**  | Merge commits (PR merges)          |

**Total**: 602 commits en todos los refs.

> **Nota:** `osdopllamadas` y el proyecto original (`dashboard-esden`) son el codebase
> previo a la auditoría V1 del cliente. Los 434 commits de `osdopllamadas` corresponden
> al período 2026-03-02 → 2026-05-19 (antes de la transición Javi HP). `Renzo` y
> `Ai2You` son el mismo equipo (`admin@2you.ai`) a partir del 20-05-2026.
> No se detectan menciones de Claude/Anthropic/IA como autor — correcto.

### Commits en `developer` por autor

| Autor         | Commits |
| ------------- | ------- |
| osdopllamadas | 434     |
| Renzo         | 146     |
| Ai2You        | 15      |
| **Total**     | **595** |

---

## 4. Versiones / Tags SemVer

| Tag      | Fecha      | Mensaje / Descripción                                                                                                                                 |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v0.1.0` | 2026-05-22 | Sprint 0 cierre: hotfixes seguridad + SP-4B planning                                                                                                  |
| `v0.2.0` | 2026-05-22 | Sprint 1 cierre: Capa de datos (Zod + Repository + RLS hardening)                                                                                     |
| `v0.2.5` | 2026-05-24 | Sprint 2 Adapter HubSpot + Zoho + UI admin                                                                                                            |
| `v0.2.7` | 2026-05-24 | Sprint 2 hotfix: BUG-2-01 slug conflict + Node 20 LTS alignment                                                                                       |
| `v0.2.8` | 2026-05-25 | Sprint 2B Dashboard KPIs Overview (vista de conjunto)                                                                                                 |
| `v0.2.9` | 2026-05-25 | Sprint 2B post-fix: alturas reales cards + viewport 100% + E2E manual Bloques B-G (32/43 PASS, 4 bugs: 1 FIXED BUG-2B-11 + 3 WCAG diferidos Sprint 3) |

> **Pendiente:** `v0.3.0-rc.1` — el trabajo está mergeado en `developer` vía PR #14
> (2026-05-26), pero el tag SemVer todavía no está publicado en git. RoadMap lo marca
> como Sprint 3 `🔘 Pendiente` (tabla desactualizada; PR #14 ya está en `developer`).

---

## 5. Sprints cerrados

| Sprint | ID RoadMap | Versión     | PR merge | Fecha cierre | Rama origen                                  | Estado       |
| ------ | ---------- | ----------- | -------- | ------------ | -------------------------------------------- | ------------ |
| 0      | SP-1       | v0.1.0      | PR #2    | 2026-05-22   | `feature/sp-0-sprint-0-hotfixes`             | 🟢 Cerrado   |
| 1      | SP-2       | v0.2.0      | PR #5    | 2026-05-22   | `feature/sprint-01-capa-datos`               | 🟢 Cerrado   |
| 2      | SP-3       | v0.2.7      | PR #12   | 2026-05-24   | `feature/sprint-02-adapter-hubspot-zoho`     | 🟢 Cerrado   |
| 2B     | SP-3B      | v0.2.9      | PR #13   | 2026-05-25   | `feature/sprint-02b-dashboard-kpis-conjunto` | 🟢 Cerrado   |
| 3      | SP-4       | v0.3.0-rc.1 | PR #14   | 2026-05-26   | `feature/sprint-03-hardening`                | 🟢 Mergeado¹ |

> ¹ PR #14 mergeado a `developer` el 2026-05-26. Tag `v0.3.0-rc.1` y Release Notes
> documentados en `plans/sprint-3-hardening/RELEASE-NOTES-v0.3.0-rc.1.md` pero el
> tag git aún no está publicado (acción pendiente).

**Sprints pendientes de arrancar:** SP-4B (Validación Pre-MVP, v0.3.0 GA),
SP-5 (Sheets), SP-5B (Costes-LLM), SP-6..SP-8 (post-MVP).

---

## 6. Líneas de código

### Total `src/**/*.{ts,tsx}` (excluye _.test._ y _.spec._)

| Métrica       | Valor      |
| ------------- | ---------- |
| **Total LOC** | **60 139** |

### Por carpeta top-level de `src/`

| Carpeta          | LOC        | % del total |
| ---------------- | ---------- | ----------- |
| `src/lib`        | 21 260     | 35.4%       |
| `src/app`        | 18 088     | 30.1%       |
| `src/components` | 17 071     | 28.4%       |
| `src/scripts`    | 1 977      | 3.3%        |
| `src/types`      | 967        | 1.6%        |
| `src/scratch`    | 610        | 1.0%        |
| `src/store`      | 79         | 0.1%        |
| **Total**        | **60 139** | 100%        |

> `src/lib` concentra la lógica de negocio (processors, actions, services, repositories).
> `src/app` contiene App Router de Next.js. `src/components` UI. `src/scratch` y
> `src/scripts` son código auxiliar/legacy.

---

## 7. Cobertura de tests

### Archivos de test encontrados: **35**

| Tipo           | Archivos | Directorio            |
| -------------- | -------- | --------------------- |
| Unit tests     | 14       | `tests/unit/`         |
| Integration    | 9        | `tests/integrations/` |
| E2E Playwright | 8        | `tests/e2e/`          |
| **Total**      | **35**   |                       |

### Cobertura (de `coverage/coverage-final.json`)

> Fuente: último run de Vitest (228/228 tests verdes, Sprint 3 sesión 26-05-2026).

| Métrica          | Cubiertos | Total | %         |
| ---------------- | --------- | ----- | --------- |
| **Statements**   | 1 562     | 3 198 | **48.8%** |
| **Branches**     | 288       | 401   | **71.8%** |
| **Functions**    | 88        | 114   | **77.2%** |
| Lines            | —         | —     | n/a²      |
| Files en reporte | 35        | —     | —         |

> ² La cobertura de lines no está en `coverage-final.json` (campo `l` vacío en todos
> los archivos instrumentados — probable config de v8 provider sin línea granular).
> El dato de statements (48.8%) es el indicador principal de cobertura funcional.

> **Contexto:** la cobertura ≥80% fue diferida a SP-4B (tarea 4-02). El target actual
> cubre los módulos críticos (crypto, schemas Zod, write-guard, rate-limiter, kpi-overview).

---

## 8. PRs mergeados a `developer`

| # PR | Título                                                                  | Fecha merge (UTC) | +Adds   | −Dels   |
| ---- | ----------------------------------------------------------------------- | ----------------- | ------- | ------- |
| #16  | chore(sentry): remove temp /api/sentry-test route                       | 2026-05-27 12:07  | +30     | −45     |
| #15  | chore(sentry): add temp /api/sentry-test route for VPS wireup           | 2026-05-26 15:31  | +42     | −0      |
| #14  | feat(sprint-3): Hardening v0.3.0-rc.1 + testing + AWS removal + TS      | 2026-05-26 14:12  | +12 979 | −2 675  |
| #13  | feat(sprint-2b): Dashboard KPIs Overview — 15 tareas, 193+15 tests      | 2026-05-25 05:27  | +3 406  | −1 282  |
| #12  | feat(sprint-2 v0.2.5): adapter hubspot+zoho+ui admin+audit log          | 2026-05-24 15:05  | +27 733 | −12 338 |
| #11  | fix(docker): add SUPABASE_SERVICE_ROLE_KEY as build-time ARG            | 2026-05-23 12:11  | +8      | −0      |
| #10  | fix(supabase-vps): cross-network access para dev.dash                   | 2026-05-23 11:46  | +13     | −4      |
| #9   | fix(supabase-vps): expose METRICS_JWT_SECRET to realtime                | 2026-05-23 00:53  | +1      | −0      |
| #8   | docs: tracking real Sprint 1 + política releases + RELEASE-NOTES v0.1.0 | 2026-05-22 23:45  | +335    | −90     |
| #7   | feat(infra): Supabase self-hosted compose para Dokploy VPS              | 2026-05-22 23:38  | +1 075  | −0      |
| #6   | docs(deploy): handoff deploy v0.2.0 a VPS Dokploy                       | 2026-05-22 22:38  | +608    | −0      |
| #5   | feat(sprint-1): cierre Sprint 1 v0.2.0 — Capa de datos                  | 2026-05-22 21:41  | +11 015 | −3 536  |
| #4   | chore(release): cierre formal Sprint 0 v0.1.0                           | 2026-05-22 17:43  | +465    | −335    |
| #3   | plan: revisar docs Bea+Renzo V1 + Sprint 2B + Sprint Refinamiento       | 2026-05-22 16:25  | +477    | −105    |
| #2   | Sprint 0 — Hotfixes seguridad (v0.1.0) + SP-4B Validación Pre-MVP       | 2026-05-22 15:29  | +13 472 | −5 625  |

**Total PRs mergeados:** 15 (todos a `developer`, ninguno a `staging` ni `main` —
consistente con la política de ramas protegidas).

### Totales de líneas por categoría

| Categoría                  | +Adiciones  | −Eliminaciones | Neto        |
| -------------------------- | ----------- | -------------- | ----------- |
| Sprint PRs (#2,5,12,13,14) | +68 605     | −25 456        | +43 149     |
| Infra/docs (#6,7,8)        | +2 018      | −90            | +1 928      |
| Hotfixes VPS (#9,10,11)    | +22         | −4             | +18         |
| Chores (#3,4,15,16)        | +1 014      | −440           | +574        |
| **Total**                  | **+71 659** | **−25 990**    | **+45 669** |

---

## 9. Días con actividad commit

| Métrica                                                     | Valor     |
| ----------------------------------------------------------- | --------- |
| Días únicos con ≥1 commit (all branches)                    | **44**    |
| Días calendario totales del proyecto                        | **87**    |
| Ratio productividad                                         | **50.6%** |
| Días activos — fase pre-auditoría (hasta 2026-05-19)        | **36**    |
| Días activos — fase post-auditoría (2026-05-20 en adelante) | **8**     |

> El proyecto comenzó el 2026-03-02 con el commit inicial de `osdopllamadas`.
> La auditoría V1 (merge de rama `auditoria` a `developer`) ocurrió el 2026-05-20.
> Desde entonces el equipo Ai2You/Renzo ha estado activo 8 de 8 días (100%).

### JSON para bar chart días activos vs. inactivos por mes

```json
[
  { "month": "2026-03", "activeDays": 9, "calendarDays": 31 },
  { "month": "2026-04", "activeDays": 10, "calendarDays": 30 },
  { "month": "2026-05", "activeDays": 25, "calendarDays": 27 }
]
```

---

## 10. Horas estimadas invertidas (desde RoadMap.md)

> Solo se contabilizan filas 🟢 Completada con ⏱ Cierre registrado.
> Sprint 3 tiene PR #14 mergeado pero RoadMap no actualizado con ⏱ Cierre final.

| Sprint    | ⏱ Estimado    | ⏱ Real (Cierre) | Ratio vs estim. |
| --------- | ------------- | --------------- | --------------- |
| Sprint 0  | ~115h 30min   | **~8h 45min**   | −92%            |
| Sprint 1  | ~205h         | **~12h**        | −94%            |
| Sprint 2  | 74h           | **~3h 15min**   | −96%            |
| Sprint 2B | ~19h 30min    | **~5h 53min**   | −70%            |
| Sprint 3  | ~127-160h     | **~13h**        | −92%            |
| **TOTAL** | **~541-574h** | **~43h**        | **−92% prom.**  |

> **Interpretación del ratio:** el ratio de −92% refleja el modelo de trabajo con IA
> asistida (Claude Code) donde tareas estimadas para humanos sin IA se completan en
> una fracción del tiempo. No indica trabajo incompleto — los sprints están cerrados
> y las tareas diferidas son explícitas (SP-4B, post-MVP).

---

## 11. Hotspots — archivos más cambiados

> `git log --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20`
> (conteo sobre todos los refs de git)

| Cambios | Archivo                                               | Categoría            |
| ------- | ----------------------------------------------------- | -------------------- |
| 61      | `src/app/dashboard/agents/page.tsx`                   | UI/Agentes           |
| 52      | `src/lib/core/processors/WhatsAppAIProcessor.ts`      | Core/AI              |
| 48      | `plans/RoadMap.md`                                    | Docs/Planning        |
| 41      | `src/components/agents/AIAgentInbox.tsx`              | UI/Agentes           |
| 35      | `package.json`                                        | Deps                 |
| 32      | `src/types/database.ts`                               | Types/DB             |
| 32      | `src/components/layout/Sidebar.tsx`                   | UI/Layout            |
| 28      | `src/lib/actions/analytics.ts`                        | Actions              |
| 28      | `src/app/dashboard/settings/page.tsx`                 | UI/Settings          |
| 28      | `package-lock.json`                                   | Deps                 |
| 27      | `src/lib/services/appointment-service.ts`             | Services             |
| 27      | `src/lib/core/processors/WhatsAppWebhookProcessor.ts` | Core/Webhook         |
| 27      | `src/lib/actions/tenant.ts`                           | Actions/Multi-tenant |
| 26      | `src/lib/actions/inbox.ts`                            | Actions/Inbox        |
| 24      | `src/components/historial/HistorialTable.tsx`         | UI/Leads             |
| 23      | `src/lib/services/fact-extractor.ts`                  | Services/AI          |
| 23      | `src/components/dashboard/SummaryManager.tsx`         | UI/Dashboard         |
| 22      | `src/lib/core/orchestrator.ts`                        | Core/Orch.           |
| 22      | `src/lib/actions/scheduling.ts`                       | Actions              |
| 19      | `src/components/orchestrator/AgentFlowBuilder.tsx`    | UI/Orch.             |

**Top 3 por categoría:**

- **Core más cambiado:** `WhatsAppAIProcessor.ts` (52) — indica área de complejidad
  activa en el procesamiento AI.
- **UI más cambiada:** `agents/page.tsx` (61) — página de agentes AI es la más
  iterada del frontend.
- **Docs más cambiado:** `plans/RoadMap.md` (48) — refleja el tracking activo del
  proyecto.

---

## Snapshot final

A 2026-05-27, el proyecto **linkstation** acumula **602 commits** en git (todos los
refs) sobre **44 días productivos** de 87 días calendario (50.6% de ratio).
El equipo comprende 3 identidades: `osdopllamadas` (434 commits, codebase original
pre-auditoría), `Renzo` (152 commits post-auditoría) y `Ai2You` (16 merge commits);
sin menciones de IA como autor — correcto.

La base de código tiene **60 139 LOC** en `src/` (excl. tests), con la lógica de
negocio concentrada en `src/lib` (35.4%). Hay **35 archivos de test** (14 unit, 9
integración, 8 E2E Playwright) con cobertura de statements al **48.8%** (branches
71.8%, functions 77.2%). El target ≥80% está diferido a SP-4B.

Se han cerrado **5 sprints** (Sprint 0 → Sprint 3), publicado **6 tags SemVer**
(v0.1.0 → v0.2.9, con v0.3.0-rc.1 mergeado pero sin tag git publicado), y mergeado
**15 PRs** a `developer` con un neto de +45 669 líneas. El tiempo real invertido suma
**~43 horas** frente a ~541-574 horas estimadas (ratio −92%), consistente con
desarrollo asistido por IA.
