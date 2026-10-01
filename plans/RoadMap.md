---
title: RoadMap linkstation
status: LIVING_DOCUMENT
maintained_by: agente `roadmap-keeper` (proactivo) — orquestado por `af-agents:manager`
last_updated: "2026-06-13 14:30 UTC"
last_updated_by: "roadmap-keeper / Claude orquestador"
sprint_4b_progress: "🟢 Cerrado de facto (Renzo) vía E2E VPS 03-06 PASS · bump v0.3.0 GA pendiente acción usuario"
project_version: v0.8.0
mvp_target: v0.3.0
mvp_date: 2026-06-22
next_sprint: "Sprint 6 — Llamadas de Voz (v0.6.0) 🆕"
sprint_0_progress: "🟢 Released v0.1.0"
sprint_1_progress: "🟢 Released v0.2.0"
sprint_2_progress: "🟢 Released v0.2.7"
sprint_2b_progress: "🟢 Released v0.2.8/v0.2.9"
sprint_3_progress: "🟢 Released v0.3.0-rc.1"
sprint_4_progress: "🟢 Released v0.4.0"
sprint_5_progress: "🟢 Released v0.5.1 (tag + release GitHub + RLS hardening + Zoho event-driven)"
sprint_6_progress: "🟢 Completada — 🆕 Llamadas de Voz (v0.6.0) · 👤 Renzo"
sprint_7_progress: "🟢 Completada — Refinamiento Herramientas Internas (v0.7.0) · 👤 Renzo"
sprint_8_progress: "🔵 Subida rama pendiente v0.8.0 — código completo + tests verdes (3 commits), PR sin merge aún, deploy VPS diferido a pre-deploy"
---

<!--
  Frontmatter compacto a propósito: solo el dato que consume `roadmap-keeper` y el
  generador de READMEs. El detalle de cada sprint (PRs, commits, tests, tiempos) vive
  en las tablas de abajo (mapa de versiones + cuadro de mando + secciones ## Fase N).
  Resumen del estado actual en el panel "📍 Estado actual de un vistazo" tras los badges.
-->

<!-- versioning_policy: Sprint N = v0.N.0 (excepto legacy 0/1/2/2B/3). Mapa completo en "🏁 Mapa de versiones vigente" abajo. -->

<!-- Detalle por sprint en "Sprint Tracker (resumen)" más abajo + tablas por sprint + memory/MEMORY.md + RELEASE-NOTES-vX.Y.Z.md. -->

<div align="center">

# 🗺️ RoadMap — `linkstation`

![Versión](https://img.shields.io/badge/versión-v0.4.0-5b6cff?style=for-the-badge&logo=semver&logoColor=white)
![MVP GA](https://img.shields.io/badge/MVP%20GA-v0.3.0-1faa66?style=for-the-badge&logo=target&logoColor=white)
![Fecha](https://img.shields.io/badge/Objetivo-22--jun--2026-e5a93b?style=for-the-badge&logo=calendar&logoColor=white)
![Excluido](https://img.shields.io/badge/NO%20promocionar-staging%20%7C%20main-e23b3b?style=for-the-badge&logo=git&logoColor=white)

<sub>**Audiencia**: equipo de desarrollo · **Mantiene**: `af-agents:roadmap-keeper` · **Última actualización**: `2026-06-10`</sub>

</div>

<table>
  <tr>
    <td align="center" width="20%">📌 Versión<br><code>v0.4.0</code></td>
    <td align="center" width="20%">🎯 MVP GA<br><code>v0.3.0</code></td>
    <td align="center" width="20%">🔜 Próximo<br><b>Sprint 6 · Voz</b></td>
    <td align="center" width="20%">📅 Objetivo MVP<br><b>22-jun-2026</b></td>
    <td align="center" width="20%">🌿 Excluido<br><code>staging</code> · <code>main</code></td>
  </tr>
</table>

<div align="center">

## 📍 Estado actual de un vistazo

</div>

| &nbsp; | &nbsp; |
| ---: | :--- |
| 🟢 &nbsp;**Último cerrado** | **Sprint 6 — Llamadas de Voz** `v0.6.0` · (Renzo) |
| 🟡 &nbsp;**Mergeado (sin tag)** | **Sprint 5 — Zoho CRM entrada de leads** `v0.5.0` · PR #25 mergeado a `developer` |
| 🔜 &nbsp;**En cola (próximo)** | **Sprint 7 — Refinamiento Herramientas** `v0.7.0` |
| 🎯 &nbsp;**Hito MVP** | 👤 SP-4B Validación Pre-MVP (Renzo) → 🟢 **cerrado de facto** vía E2E VPS 03-06 PASS · bump **MVP GA `v0.3.0`** (tag+release) pendiente acción usuario |
| ✅ &nbsp;**Salud** | 321/325 tests · 20/20 E2C · 0 críticos seguridad · E2E VPS 03-06 🟢 PASS |
| 🗺️ &nbsp;**En cartera** | Llamadas de Voz · Refinamiento · Costes-LLM · Salesforce · GHL · ActiveCampaign · WhatsApp |

> ⚠️ **Documento vivo.** No lo edites a mano sin orden del lead — pídeselo al agente [`af-agents:roadmap-keeper`](../.claude/agents/roadmap-keeper.md).
> 💡 Cada sprint lleva **versión, estado y estimación**. El agente los actualiza solo al arrancar o cerrar trabajo.

## 🏁 Mapa de versiones vigente (2026-06-10)

| Sprint              | Versión             | Estado                       | Notas                                                         |
| ------------------- | ------------------- | ---------------------------- | ------------------------------------------------------------- |
| Sprint 0            | `v0.1.0`            | 🟢 Released                  | Hotfixes seguridad                                            |
| Sprint 1            | `v0.2.0`            | 🟢 Released                  | Capa de datos · Repository pattern · 6 ADRs                   |
| Sprint 2            | `v0.2.7`            | 🟢 Released                  | HubSpot + Zoho multi-DC · final con hotfix BUG-2-01           |
| Sprint 2B           | `v0.2.8` / `v0.2.9` | 🟢 Released                  | Dashboard KPIs · v0.2.9 post-fix alturas+viewport             |
| Sprint 3            | `v0.3.0-rc.1`       | 🟢 Released (PR #22, 30-may) | Hardening · Pino + Sentry + rate limiting + Node 22           |
| SP-4B               | `v0.3.0` GA         | 🟢 Cerrado (de facto)        | 👤 Validación pre-MVP (Renzo) · 🟢 vía E2E VPS 03-06 PASS · bump v0.3.0 GA pendiente acción usuario |
| Sprint 4            | `v0.4.0`            | 🟢 Released (08-06)          | Google Sheets bidireccional · cierre formal (CLOSE-1/1.5/2/4) |
| Sprint 5            | `v0.5.1`            | 🟢 Released (10-06)          | **Zoho CRM entrada de leads + RLS hardening (21/21 tablas) + npm cross-platform lock fix** · tag + release GitHub · PR #25 mergeado a `developer` · deploy staging/main diferido |
| Sprint 5.7          | `v0.5.70`           | 🟢 Completada                | Output-WhatsApp (Meta WABA) · Plantillas · Logs · Envíos |
| Sprint 6            | `v0.6.0`            | 🟢 Completada                | 👤 **🆕 Llamadas de Voz** (Renzo) · Conversaciones de Voz (clon WhatsApp) · config voz centralizada · llamadas→dashboard+Lista de Leads |
| Sprint 7            | `v0.7.0`            | 🟢 Completada                 | 👤 Refinamiento herramientas internas (Renzo) · Simulator (lo de `/calls` voz → Sprint 6) |
| Sprint 8            | `v0.8.0`            | 🔘 Pendiente                 | Centro de costes LLM · tracking de tokens                     |
| Sprint 9            | `v0.9.0`            | 🔘 Pendiente                 | Salesforce adapter                                            |
| Sprint 10           | `v0.10.0`           | 🔘 Pendiente                 | GoHighLevel adapter                                           |
| Sprint 11           | `v0.11.0`           | 🔘 Pendiente                 | ActiveCampaign adapter                                        |
| Sprint 12           | `v0.12.0`           | 🔘 Pendiente                 | Adapter pattern generalization                                |
| Sprint 13           | `v0.13.x`           | 🔘 Backlog                   | Tier 2 on-demand (bajo pedido por CRM)                        |
| Sprint 14           | `v0.14.0`           | 🔘 Pendiente                 | WhatsApp Tech Provider (Meta) · Embedded Signup · post-MVP    |

---

## Políticas operativas (sesión planificación 21-05-2026)

| Item                              | Política                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| Vacaciones / festivos             | **Javi HP sin vacaciones programadas en 2026.** Calendario … _ver nota↓_ |
| Capacidad devs                    | **Javi HP: 10h productivas/día**, L-V, … _ver nota↓_                     |
| Deadline MVP                      | **"Lo antes posible"** — objetivo **Lun 22-06-2026** (v0.3 … _ver nota↓_ |
| Release a staging                 | **NO automático por sprint.** El usuario decide manualment … _ver nota↓_ |
| Acceso Supabase del cliente (VPS) | **Diferido al pre-deploy.** Trabajamos **local-first** con … _ver nota↓_ |
| Tracking de tiempos y tareas      | **Sistema propio** — hook `af-productivity-logger.cjs` (ta … _ver nota↓_ |
| GitHub Actions                    | **Minimizar al máximo.** Tier gratis = 2000 min/mes. … _ver nota↓_       |

> **Nota fila `Vacaciones / festivos` · Política**: **Javi HP sin vacaciones programadas en 2026.** Calendario L-V completo.
>
> **Nota fila `Capacidad devs` · Política**: **Javi HP: 10h productivas/día**, L-V, sin vacaciones 2026 (orquesta + dev Sprints 0/1/2/2B/3). **Renzo: 8h productivas/día** + equipo de QA propio. Asignaciones cerradas: **SP-4B Sprint Validación Pre-MVP** (Mar 16-06 → Vie 19-06-2026, ~40-55h) y **Sprint Refinamiento Herramientas Internas post-MVP** (Simulator + Lanzador `/calls`, post-Costes-LLM). Decisión 22-05-2026 tras revisión docs Bea (clienta) + Renzo V1.
>
> **Nota fila `Deadline MVP` · Política**: **"Lo antes posible"** — objetivo **Lun 22-06-2026** (v0.3.0 GA, adelantado −7 sem por ratio real Sprints 0/1/2 −91% a −94% vs estim · decisión 24-05-2026 21:30). Sin compromiso externo de fecha con cliente.
>
> **Nota fila `Release a staging` · Política**: **NO automático por sprint.** El usuario decide manualmente cuándo subir cada sprint a `staging` para review de la cliente. PRs paran en `developer` hasta orden explícita.
>
> **Nota fila `Acceso Supabase del cliente (VPS)` · Política**: **Diferido al pre-deploy.** Trabajamos **local-first** con Supabase self-hosted local. El acceso al VPS de Easypanel se prepara y rota tokens **antes del primer despliegue a staging**, no antes.
>
> **Nota fila `Tracking de tiempos y tareas` · Política**: **Sistema propio** — hook `af-productivity-logger.cjs` (tarea 2-30, Sprint 1). NO se usa GitHub Issues, Linear, Jira ni sistemas externos.
>
> **Nota fila `GitHub Actions` · Política**: **Minimizar al máximo.** Tier gratis = 2000 min/mes. Todo lo que pueda ejecutarse en local (typecheck, lint, build, test, browser tests, security scan) se ejecuta **LOCAL** vía pre-push hooks (tarea 0-01). CI en GH Actions solo para verificación mínima sobre PRs a `developer`.

> Decisiones tomadas en sesión 21-05-2026 con Javi HP. Si alguna cambia, actualizar este bloque ANTES de seguir con el resto del roadmap.

### 👤 Renzo + equipo (asignaciones cerradas)

> Tareas y sprints específicamente asignados al equipo de desarrollo de Renzo. **Visibilidad clara**: cualquier tarea/sprint con el icono 👤 en este RoadMap pertenece a Renzo + su equipo, no a Javi HP.

| Sprint                                                      | Versión     | Fechas                  | Estim           | Estado       | Notas                                              |
| ----------------------------------------------------------- | ----------- | ----------------------- | --------------- | ------------ | -------------------------------------------------- |
| 👤 **SP-4B — Sprint Validación Pre-MVP**                    | `v0.3.0 GA` | 16-06-2026 → 19-06-2026 | 40-55h          | 🟢 Cerrado (de facto) | QA en VPS de los Sprints 0+1+2+2B+3. **Cerrado vía run E2E VPS 03-06 PASS** · _ver nota↓_ |
| 👤 **Sprint 6 — Llamadas de Voz** 🆕                        | `v0.6.0`    | post-Zoho               | 8-14h           | 🟢 Completada | Conversaciones de Voz (clon WhatsApp) + config voz + dashboard + Lista de Leads · _ver nota↓_ |
| 👤 **Sprint Refinamiento Herramientas Internas (post-MVP)** | `v0.7.0`    | Post Llamadas de Voz    | 22-28h + cierre | 🟢 Completada | Simulator + Lanzador (NO-voz) + DEPS · _ver nota↓_ |

> **Nota fila `👤 SP-4B — Sprint Validación Pre-MVP` · Notas**: 🟢 **CERRADO DE FACTO 10-06-2026 (decisión Javi HP)** — ejecutado por **Renzo + equipo Renzo** (icono 👤). El objetivo del sprint (validación QA en VPS de los Sprints 0+1+2+2B+3) se considera cumplido por el **run autónomo E2E VPS del 03-06-2026 → 🟢 PASS** (`plans/260603-2210-e2etotal-run/`): fases bloqueantes 00-02 al 100%, ~392 tests, **0 CRIT / 0 HIGH**, 5 regresiones HIGH/CRIT de runs previos verificadas RESUELTAS en VPS (ver memoria `project-e2e-vps-run-030626`). **Salvedad de honestidad**: Phase 02 (Validación Sprint 1) y Phase 03b (Validación Sprint 2B) NO se rellenaron formalmente como plantillas individuales — su cobertura quedó absorbida en el run consolidado E2E VPS. CLOSE-1..5 formal no se ejecutó como ritual separado; el bump a `v0.3.0 GA` (tag + release) queda pendiente de acción del usuario cuando se decida la promoción. QA en VPS de los Sprints 0+1+2+2B+3 + manual humano absorbido de CLOSE-3. Detalle: [`plans/260522-1700-sprint-validacion-pre-mvp/plan.md`](260522-1700-sprint-validacion-pre-mvp/plan.md)
>
> **Nota fila `👤 Sprint Refinamiento Herramientas Inter` · Notas**: ⚠️ La parte de VOZ (lanzador `/calls` real + simulación de voz) se MOVIÓ al Sprint 6 "Llamadas de Voz" (decisión Javi HP 10-06-2026). Aquí queda solo el refinamiento NO-voz: Fase 01 Simulator persistencia variables en BD (texto) + historial recarda · Fase 02 Lanzador (sin voz) · DEPS. Tareas movidas FUERA del MVP por decisión 22-05-2026 (Bea + Renzo). Detalle: [`plans/260522-1830-sprint-refinamiento-herramientas-post-mvp/plan.md`](260522-1830-sprint-refinamiento-herramientas-post-mvp/plan.md)

**Tareas individuales de Renzo dentro de otros sprints**:

- Sprints 1, 2, 2B, 3: la subtarea **`SP-N-CLOSE-3 (test manual del dev)`** está **diferida a SP-4B phase-NN bloque 4** — Renzo la absorbe junto con su validación E2E VPS. Documentado en cada sección de cierre.

**Capacidad Renzo**: 8h productivas/día. Asume todo el bloque de validación pre-MVP (~2 semanas) y el refinamiento post-MVP. Disponibilidad fuera de esos sprints: backlog libre.

**Coordinación**:

- Hand-off de cada Sprint MVP (1, 2, 2B, 3) a Renzo: en `SP-N-CLOSE-5` se rellena la plantilla [`plans/260522-1700-sprint-validacion-pre-mvp/phase-NN-validacion-sprint-N.md`](260522-1700-sprint-validacion-pre-mvp/) con tests, comandos, manual checklist, variables VPS y bugs ya cerrados.
- Hand-off Sprint Refinamiento: tras `SP-8-CLOSE-5` (cierre Costes-LLM, Sprint 8), Javi HP redacta el plan detallado del refinamiento y notifica a Renzo.

---

## Leyenda de estados

| Icono | Estado                     | Significado                                                     |
| ----- | -------------------------- | --------------------------------------------------------------- |
| 🔘    | **Pendiente**              | Aún no se ha empezado                                           |
| 🟡    | **En Desarrollo**          | Trabajo activo en curso (alguien está dándole, … _ver nota↓_    |
| 🟠    | **P. Subir GH**            | Trabajo terminado localmente, falta hacer commit/push a su rama |
| 🔵    | **Subida rama `<nombre>`** | Ya pusheada a su `feature/*`, esperando PR / review / merge     |
| 🟢    | **COMPLETADA**             | Mergeada a `developer`. Cierre de la tarea.                     |

> **Nota fila `🟡` · Significado**: Trabajo activo en curso (alguien está dándole, aunque sea en paralelo a otras tareas)

**Reglas operativas**:

1. Una tarea **NUNCA** pasa directamente de 🔘 Pendiente a 🟢 COMPLETADA. El agente fuerza la secuencia: 🔘 → 🟡 → 🟠 → 🔵 → 🟢.
2. **Antes de empezar** cualquier tarea (aunque vaya paralela a otras), el agente cambia su estado a 🟡 En Desarrollo y deja constancia con timestamp + dev asignado.
3. **Antes de cualquier commit/push**, el agente `git` verifica el estado de la tarea actual. Si no está en 🟡 o no existe en el roadmap, **se detiene** y reporta.
4. **Antes de cualquier deploy/PR**, el agente `deployment` verifica que las tareas asociadas están en 🔵 o 🟢. Si no, **se detiene** y reporta.
5. **Tras merge a `developer`**, el agente `roadmap-keeper` pasa a 🟢 COMPLETADA automáticamente (escucha del PostToolUse del git merge / hook al cerrar PR).

## Formato de estimaciones

- Duración: `2h 30min`, `45min`. Nunca decimales. Nunca fechas en celda de duración.
- Sumas: cada fase muestra su sumatorio, cada sprint el suyo, y el roadmap el total.
- Fechas (Inicio, Fin Est., Fin Real): formato `DD-MM-YYYY HH:MM`.

---

## Total del proyecto (estimado)

| Métrica                                                                  | Valor                                                                                                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fases                                                                    | 10 (0..9) + Fase 2.5 (Sprint 2B Dashboard KPIs MVP) + Fase … _ver nota↓_                                                                                  |
| Sprints planificados                                                     | 10 + 1 dashboard KPIs MVP (SP-3B v0.2.7) + 1 validación pr … _ver nota↓_                                                                                  |
| Tareas de cierre obligatorias por sprint                                 | 5                                                                                                                                                         |
| **Estimación total MVP (Sprints 0+1+2+3)**                               | Replanteo 24-05: ~4 sem efectivas (cierre MVP v0.3.0 GA = Lun 22-06-2026). Original ~9-12 sem reducido por ratio real Sprints 0/1/2 −91% a −94% vs estim. |
| **Post-MVP (Sprint 4 Sheets + Sprint Costes-LLM v0.4.1 + Sprints 5..9)** | ~225-405h (Sheets primero, luego Costes-LLM, luego CRMs)                                                                                                  |
| **Versión objetivo MVP**                                                 | `v0.3.0` GA (rebajada desde `v0.4.0` por decisión 24-05-20 … _ver nota↓_                                                                                  |
| **Versión patch post-Sheets**                                            | `v0.5.1` (Sprint Costes-LLM, justo después de Sheets `v0.5.0`)                                                                                            |

> **Nota fila `Fases` · Valor**: 10 (0..9) + Fase 2.5 (Sprint 2B Dashboard KPIs MVP) + Fase 3.5 (Sprint Validación Pre-MVP) + Fase 4.5 (Sprint Costes-LLM) + Fase 4.6 (Sprint Refinamiento Herramientas post-MVP)
>
> **Nota fila `Sprints planificados` · Valor**: 10 + 1 dashboard KPIs MVP (SP-3B v0.2.7) + 1 validación pre-MVP (SP-4B v0.3.5 GA) + 1 costes-LLM (v0.4.1) + 1 refinamiento herramientas (v0.4.2)
>
> **Nota fila `Versión objetivo MVP` · Valor**: `v0.3.0` GA (rebajada desde `v0.4.0` por decisión 24-05-2026) · Sprint 2 = `v0.2.5`, Sprint 2B = `v0.2.7`, Sprint 3 = `v0.3.0-rc.1`, SP-4B GA = `v0.3.0`

> **Nota fechas internas (24-05-2026)**: las cabeceras `Inicio`/`Fin Est.` de cada Sprint individual (3, 4, 5, 6, 7, 8, 9, Costes-LLM, Refinamiento) mantienen las fechas del plan anterior y se recalcularán al arrancar cada sprint. Las fechas vigentes para planificación inmediata son: Sprint 2B Mar 26-05 → Jue 28-05-2026 · Sprint 3 Vie 29-05 → Vie 12-06-2026 · SP-4B Mar 16-06 → Vie 19-06-2026 · **MVP v0.3.0 GA Lun 22-06-2026**. Post-MVP se desplaza igualmente −7 sem aprox.

---

## Estimaciones realistas V2 (basadas en ratio efectivo Sprints 0/1/2/2B/3 = −92%)

> Cierre auditoría V2 (27-05-2026). Las estimaciones originales asumían desarrollo humano sin IA asistida. Ratio real medido: **~43h reales vs ~541-574h estimadas** sobre 5 sprints cerrados. Estas nuevas estimaciones aplican al trabajo **pendiente** (SP-4B y post-MVP) y son el input principal del Bloque 8 del informe V2 [`docs/audit2/index.html`](../docs/audit2/index.html).

| Etapa pendiente                                                                 | Estim. original | Estim. realista V2 | Responsable     | Fecha objetivo           |
| ------------------------------------------------------------------------------- | --------------- | ------------------ | --------------- | ------------------------ |
| **SP-4B — Validación Pre-MVP** (Phases 01..04 + cierre)                         | 40-55h          | **23-32h**         | Renzo + equipo  | 16-jun → 21-jun-2026     |
| **🎯 MVP v0.3.0 GA** (tag + release notes)                                      | —               | —                  | Javi HP + Renzo | **22-jun-2026**          |
| Sprint 4 — Google Sheets bidireccional (`v0.4.0`) ✅ CERRADO                     | 60-100h         | **~14h 30min**     | Javi HP         | 🟢 08-jun-2026           |
| Sprint 5 — Zoho CRM entrada de leads (`v0.5.0`) 🟡 MERGEADO                      | —               | **~6h**            | Javi HP         | 🟡 08-jun (PR #25) · deploy diferido |
| Sprint 5.7 — Output-WhatsApp (`v0.5.70`) ✅ CERRADO                      | 20-30h          | **15-20h**         | Javi HP         | 🟢 Completado |
| **Sprint 6 — Llamadas de Voz (`v0.6.0`)** ✅ CERRADO — Conversaciones de Voz + dashboard + Lista de Leads | — | **8-14h** | 👤 Renzo  | 🟢 Completado                |
| **Sprint 7 — Refinamiento Herramientas (`v0.7.0`)** ✅ CERRADO — Simulator + Lanzador  | 22-28h          | **14-18h**         | 👤 Renzo | 🟢 Completado     |
| Sprint 8 — Costes-LLM (`v0.8.0`)                                                | 23-31h          | **5-7h**           | Javi HP         | post-Refinamiento        |
| Sprint 9 — Salesforce (`v0.9.0`)                                                | 60-100h         | **12-18h**         | Javi HP         | post-Costes-LLM          |
| Sprint 10 — GoHighLevel (`v0.10.0`)                                             | 40-80h          | **8-14h**          | Javi HP         | post-Salesforce          |
| Sprint 11 — ActiveCampaign (`v0.11.0`)                                          | 20-50h          | **4-8h**           | Javi HP         | post-GHL                 |
| Sprint 12 — Adapter pattern generalization (`v0.12.0`)                          | 20-40h          | **4-7h**           | Javi HP         | post-AC                  |
| Sprint 13 — Tier 2 on-demand (`v0.13.x`)                                        | 30-50h/CRM      | **6-10h/CRM**      | bajo pedido     | backlog                  |
| Sprint 14 — WhatsApp Tech Provider (`v0.14.0`)                                  | 48-72h          | **15-25h**         | Javi HP         | post-generalización      |

> **Nota Auditor V2**: estas estimaciones realistas **asumen mantenimiento del patrón de orquestación multi-agente** que ha producido el ratio −92%. Si el equipo se amplía con devs no-orquestados, recalcular al 50% del original como peor caso. Las estimaciones originales se mantienen en las tablas detalladas más abajo como referencia histórica y para hand-off a SP-4B.

---

## Protocolo estándar de cierre de sprint (CLOSE-1..5 + paso 6 condicional)

> **Aplicable a TODOS los sprints** del proyecto (MVP y post-MVP). Se ejecuta SIN preguntar al usuario en orden estricto. Sincronizado con [`CLAUDE.md` § "Phase/Sprint Completion Protocol"](../CLAUDE.md). Cada paso solo arranca si el anterior cerró en verde; si algo falla, se itera fix + re-run del paso fallido (no se salta).

| Paso | Subtarea CLOSE                                    | Qué se hace                                                              | Ejecutor                         |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------- |
| 1    | `SP-N-CLOSE-1` Auto test                          | `npm run typecheck` + `npm run lint` + `npm run build` + ` … _ver nota↓_ | `af-agents:testing`              |
| 2    | `SP-N-CLOSE-2` E2C Local + WCAG 2.2 AA            | Claude abre navegador con Playwright contra `localhost:850 … _ver nota↓_ | `af-agents:testing` + Playwright |
| 3    | `SP-N-CLOSE-3` Test manual del dev                | \*\*MVP (Sprints 1, 2, 2B, … _ver nota↓_                                 | Renzo (MVP) / Dev (post-MVP)     |
| 4    | `SP-N-CLOSE-4` Corrección de bugs                 | Bugs detectados en CLOSE-1/2 (o CLOSE-3 post-MVP) se corri … _ver nota↓_ | Claude orquestador               |
| 5    | `SP-N-CLOSE-5` paso 1 — Push a GitHub             | `git push` de la rama `feature/sprint-NN-<slug>`. … _ver nota↓_          | `af-agents:git`                  |
| 6    | `SP-N-CLOSE-5` paso 2 — PR a `developer`          | Crear PR. **NO mergear** sin orden explícita del usuario. … _ver nota↓_  | `af-agents:git`                  |
| 7    | `SP-N-CLOSE-5` paso 3 — E2E VPS (CONDICIONAL)     | **SOLO si el VPS Easypanel está desplegado**: Playwright c … _ver nota↓_ | `af-agents:testing` contra VPS   |
| 8    | `SP-N-CLOSE-5` paso 4 — Hand-off SP-4B (solo MVP) | Rellenar `plans/260522-1700-sprint-validacion-pre-mvp/phas … _ver nota↓_ | `roadmap-keeper` + Claude        |
| 9    | Informe final al usuario                          | Resumen ejecutivo: tests passed/failed/fixed + diff de lo … _ver nota↓_  | Claude orquestador               |

> **Nota fila `SP-N-CLOSE-1 Auto test` · Qué se hace**: `npm run typecheck` + `npm run lint` + `npm run build` + `npm test` (unit + integration). Verde obligatorio.
>
> **Nota fila `SP-N-CLOSE-2 E2C Local + WCAG 2.2 AA` · Qué se hace**: Claude abre navegador con Playwright contra `localhost:8500`. Recorre flujos del sprint + a11y rutas clave.
>
> **Nota fila `SP-N-CLOSE-3 Test manual del dev` · Qué se hace**: **MVP (Sprints 1, 2, 2B, 3): DIFERIDO a SP-4B phase-NN bloque 4** (Renzo). Post-MVP: ejecutado por el dev.
>
> **Nota fila `SP-N-CLOSE-4 Corrección de bugs` · Qué se hace**: Bugs detectados en CLOSE-1/2 (o CLOSE-3 post-MVP) se corrigen y se re-corre el paso afectado hasta verde.
>
> **Nota fila `SP-N-CLOSE-5 paso 1 — Push a GitHub` · Qué se hace**: `git push` de la rama `feature/sprint-NN-<slug>`. Solo si CLOSE-1/2/4 están 🟢.
>
> **Nota fila `SP-N-CLOSE-5 paso 2 — PR a developer` · Qué se hace**: Crear PR. **NO mergear** sin orden explícita del usuario. El merge lo confirma el usuario manualmente.
>
> **Nota fila `SP-N-CLOSE-5 paso 3 — E2E VPS (CONDICION` · Qué se hace**: **SOLO si el VPS Easypanel está desplegado**: Playwright contra URL del VPS (no localhost). Si no hay VPS: OMITIDO + diferido a SP-4B phase-NN.
>
> **Nota fila `SP-N-CLOSE-5 paso 4 — Hand-off SP-4B (so` · Qué se hace**: Rellenar `plans/260522-1700-sprint-validacion-pre-mvp/phase-NN-validacion-sprint-N.md` con tests + manual + vars + bugs.
>
> **Nota fila `Informe final al usuario` · Qué se hace**: Resumen ejecutivo: tests passed/failed/fixed + diff de lo implementado + invitación a test manual (si UI).

### Detector "VPS desplegado" (cuándo activar paso 7)

El paso 7 (E2E VPS) se activa SOLO si TODAS estas condiciones se cumplen:

- Existe `NEXT_PUBLIC_VPS_URL` en `.env.example` con valor distinto a placeholder.
- El branch `staging` ha sido promovido al menos una vez (verificable con `git log staging`).
- El usuario ha confirmado explícitamente que el VPS está en marcha (memoria persistente o nota en RoadMap).

Si cualquier condición falla → paso 7 OMITIDO + nota en `SP-N-CLOSE-5`: "E2E VPS diferido — pre-deploy VPS no realizado todavía". El `roadmap-keeper` NO bloquea el cierre por esto. **Estado actual (22-05-2026): VPS NO desplegado → paso 7 omitido en todos los sprints hasta primer despliegue.**

### Diferencias por tipo de sprint

| Tipo de sprint                          | CLOSE-3                                 | Paso 7 (E2E VPS)                                | Paso 8 (Hand-off SP-4B)                 |
| --------------------------------------- | --------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| **MVP** (Sprints 0, 1, 2, 2B, 3)        | DIFERIDO a SP-4B (Renzo)                | Condicional (probablemente OMITIDO hasta SP-4B) | Obligatorio                             |
| **SP-4B Validación Pre-MVP** (Renzo)    | Absorbe los CLOSE-3 de Sprints 1/2/2B/3 | Obligatorio (E2E contra VPS)                    | N/A (es el propio sprint de validación) |
| **Post-MVP** (Sheets, Costes-LLM, etc.) | Estándar — dev lo ejecuta               | Condicional (depende de estado VPS)             | N/A                                     |
| **Sprint Refinamiento Renzo**           | Renzo lo absorbe en su propio sprint    | Condicional                                     | N/A                                     |

---

## 🎯 Cuadro de mando — Vista por sprint

> Vista de monitoreo agregada. **Una tabla por sprint** con cabecera repetida — separación visual clara entre sprints.
>
> Reglas de relleno:
>
> - **Bloque → ⏱ Push** = suma de tiempos reales de las tareas hijas que estén a 🔵 (las tareas individuales viven en sus secciones detalladas más abajo, `## Fase X — Sprint Y`).
> - **Sprint → ⏱ Push** = suma de los ⏱ Push de sus bloques.
> - **Sprint → ⏱ Cierre** SE RELLENA SOLO cuando el sprint completa `SP-X-CLOSE-5` (probado + mergeado a `developer`).
> - El estado se propaga automáticamente: tarea a 🔵 → bloque recalcula; todas las del bloque a 🔵/diferida → bloque 🔵 cerrada; todas dev+cierre a 🟢 → sprint 🟢.
> - **Detalle por tarea individual** (con commits, refs, estado fino): ver cada sección `## Fase X — Sprint Y` más abajo. Los estados de tareas SE ACTUALIZAN allí; el agente `roadmap-keeper` propaga los agregados a este cuadro.

### Sprint 0 — Hotfixes seguridad

| Item                                      | Estado                 | Estim.          | ⏱ Push   | ⏱ Cierre         | Notas                                                          |
| ----------------------------------------- | ---------------------- | --------------- | -------- | ---------------- | -------------------------------------------------------------- |
| **🚀 Sprint 0**                           | 🟢 Completada (merged) | 115h 30min      | 7h 30min | ~8h 45min        | v0.1.0 · … _ver nota↓_                                         |
| ▸ Bloque 1.1 — Orquestador BullMQ         | 🔵 Ph cerrada          | 14h             | 2h 40min | —                | 4/4 🔵 (0-00, 0-01, 1-01, 1-02)                                |
| ▸ Bloque 1.2 — Secretos y credenciales    | 🟡 Parcial             | 12h             | 1h 30min | —                | 2/4 🔵 (1-04, 1-06) · 2/4 🟡 diferidas pre-deploy (1-03, 1-05) |
| ▸ Bloque 1.3 — Endpoints sin auth         | 🔵 Ph cerrada          | 17h             | 30min    | —                | 5/5 🔵 (1-07, 1-08, 1-09, 1-10, 1-11) · commit `4da79b1`       |
| ▸ Bloque 1.4 — Webhooks y firmas          | 🔵 Ph cerrada          | 18h             | 25min    | —                | 4/4 🔵 (1-12, 1-13, 1-14, 1-15) · commit `a17c687`             |
| ▸ Bloque 1.5 — Privilege escalation y RLS | 🔵 Ph cerrada          | 24h             | 35min    | —                | 6/6 🔵 (1-16..1-21) · … _ver nota↓_                            |
| ▸ Bloque 1.6 — Otros críticos             | 🔵 Ph cerrada          | 31h             | 2h       | —                | 6/6 🔵 (1-22..1-27) · … _ver nota↓_                            |
| ▸ Cierre Sprint 0 (SP-1-CLOSE-1..5)       | 🟢 Completada          | 5h 30min + bugs | 3h 35min | 22-05-2026 19:30 | CLOSE-1 🟢 ~30min (DONE*WITH_CONCERNS aceptado, … \_ver nota↓* |

> **Nota fila `🚀 Sprint 0` · Notas**: v0.1.0 · `feature/sp-0-sprint-0-hotfixes` **MERGED a developer** (PR #2, commit `a387dfe`) · 26/27 dev tareas ✅ · 2 diferidas pre-deploy (1-03, 1-05 a VPS) · CLOSE-1 DONE_WITH_CONCERNS / CLOSE-2 24/24 E2E + 2 bugs fixed / CLOSE-3 reemplazado por análisis docs Bea+Renzo / CLOSE-4 bugs cerrados / CLOSE-5 ✅ · ⏱ Cierre = 7h 30min push + 1h 15min cierre (CLOSE-1..5)
>
> **Nota fila `▸ Bloque 1.5 — Privilege escalation y RL` · Notas**: 6/6 🔵 (1-16..1-21) · migrations RLS + admin-meta aplicadas en local · commit `da64297`
>
> **Nota fila `▸ Bloque 1.6 — Otros críticos` · Notas**: 6/6 🔵 (1-22..1-27) · 1-27 widget hardening: migración + helpers + Origin/rate-limit · informe Renzo §3 🔴 cerrado
>
> **Nota fila `▸ Cierre Sprint 0 (SP-1-CLOSE-1..5)` · Notas**: CLOSE-1 🟢 ~30min (DONE_WITH_CONCERNS aceptado, lint 118 err preexistentes -46 vs baseline) · CLOSE-2 🟢 ~45min (24/24 E2E + 2 bugs corregidos: BUG-001 logout, BUG-002 viewer→admin) · CLOSE-3 🟢 ~1h 30min (análisis cruzado docs Bea+Renzo V1 → 13 tareas NEW-01..NEW-13) · CLOSE-4 🟢 ~25min (2 bugs + 2 lint fixes ThemeToggle/compliance) · CLOSE-5 🟢 ~45min (CHANGELOG + RoadMap + PR #4 cierre formal merged commit `2a12c7d`)

### Sprint 1 — Capa de datos (sin ORM nuevo)

| Item                                                 | Estado                 | Estim.                                 | ⏱ Push   | ⏱ Cierre | Notas                                                                     |
| ---------------------------------------------------- | ---------------------- | -------------------------------------- | -------- | -------- | ------------------------------------------------------------------------- |
| **🚀 Sprint 1**                                      | 🟢 Completada (merged) | **~205h**                              | ~12h     | ~12h     | v0.2.0 · … _ver nota↓_                                                    |
| ▸ Bloque 2.1 — Unificación cliente Supabase          | 🟢 Completada parcial  | 19h                                    | 1h 33min | 1h 33min | 3/3 · … _ver nota↓_                                                       |
| ▸ Bloque 2.2 — Schemas Zod                           | 🟢 Completada          | 25h                                    | 2h 3min  | 2h 3min  | 9/9 · 8 schemas + barrel en `src/lib/schemas/` · … _ver nota↓_            |
| ▸ Bloque 2.3 — Repository pattern                    | 🟢 Completada          | 31h                                    | 2h 32min | 2h 32min | 7/7 · … _ver nota↓_                                                       |
| ▸ Bloque 2.4 — Refactor queries existentes           | 🟢 Diferida            | 18h                                    | —        | —        | 0/3 desarrollo · \*\*2-19, 2-20, … _ver nota↓_                            |
| ▸ Bloque 2.5 — Type safety + limpieza                | 🟢 Completada parcial  | 17h                                    | 5min     | 5min     | 1/2 · … _ver nota↓_                                                       |
| ▸ Bloque 2.6 — RLS hardening complementario          | 🟢 Completada          | 19h                                    | 1h 33min | 1h 33min | 4/4 · … _ver nota↓_                                                       |
| ▸ Bloque 2.7 — Testing + documentación               | 🟢 Completada parcial  | 16h                                    | 1h 19min | 1h 19min | 2/2 · … _ver nota↓_                                                       |
| ▸ Bloque 2.8 — Hardening dependencias (ADR)          | 🟢 Completada parcial  | 20h                                    | 39min    | 39min    | 3/5 · … _ver nota↓_                                                       |
| ▸ **Bloque 2.9 — Fix bugs Renzo + reqs Bea (NUEVO)** | 🟢 Completada          | **23h** (8h→3h NEW-01 paso 3 diferido) | 1h 53min | 1h 53min | 4/4 · … _ver nota↓_                                                       |
| ▸ Cierre Sprint 1 (SP-2-CLOSE-1..5)                  | 🟢 Completada          | **4h 30min + bugs**                    | 22min    | 22min    | CLOSE-1 ✅ (typecheck OK / lint 120 err preexistentes basel … _ver nota↓_ |

> **Nota fila `🚀 Sprint 1` · Notas**: v0.2.0 · `feature/sprint-01-capa-datos` (16 commits) **MERGED a developer** vía PR #5 (commit `94c035a`, 22-05-2026 23:41) · Sprint 1 legacy: Push = Cierre (sin fixes post-merge). ⏱ Real distribuido proporcionalmente por bloques (opción B, 23-05-2026). 24 🟢 Completada + 8 🟢 Diferida + 6 ADRs (014-019). Resumen: [`plans/260520-1342-sprint-1-capa-datos/SP-2-CLOSE-summary.md`](260520-1342-sprint-1-capa-datos/SP-2-CLOSE-summary.md)
>
> **Nota fila `▸ Bloque 2.1 — Unificación cliente Supab` · Notas**: 3/3 · **2-01 ✅** audit (reporte `sp-2-01-audit-clients-supabase-20260522.md`) · **2-02.a ✅** upgrade ssr 0.10.3 + supabase-js 2.106.1 (ADR-016) · **2-02.b ✅** DI services parcial · **2-03 ✅** 3 services cleanup. Resto cron/webhooks/processors/whatsapp.ts → ADR-019
>
> **Nota fila `▸ Bloque 2.2 — Schemas Zod` · Notas**: 9/9 · 8 schemas + barrel en `src/lib/schemas/` · **2-35** ModelNameSchema whitelist + drop hack widget.ts:150 + migración SQL `20260522210000`
>
> **Nota fila `▸ Bloque 2.3 — Repository pattern` · Notas**: 7/7 · 7 repositorios + barrel en `src/lib/repositories/` (patrón `IRepository<T>` + `RepoResult` + `withTenantFilter` + `paginate`). Repos: leads, tenants, appointments(+calls+attempts), ai-agents(+variants+voice), knowledge-base(+embeddings+chat-messages), integrations(+field-mapping+write-audit+webhooks), lead-opportunities
>
> **Nota fila `▸ Bloque 2.4 — Refactor queries existent` · Notas**: 0/3 desarrollo · **2-19, 2-20, 2-21 → ADR-019** migración incremental · ~~2-36~~ MOVIDA a Sprint Costes-LLM (C-03) post-MVP · ⏱ Real = 0 (todas diferidas, sin trabajo en Sprint 1)
>
> **Nota fila `▸ Bloque 2.5 — Type safety + limpieza` · Notas**: 1/2 · **2-37 ✅** logger estructurado `src/lib/utils/logger.ts` con scrubbing PII · **2-22 🟢 Diferida ADR-019** (426 `as any` baseline documentado, Sprint v0.5.4 candidate)
>
> **Nota fila `▸ Bloque 2.6 — RLS hardening complementa` · Notas**: 4/4 · **2-23 ✅** RLS ai_agents+ai_agent_variants (F-04-005) · **2-24 ✅** RLS web_widgets (F-04-006) · **2-25 ✅** RLS programas (F-04-008) · **2-26 ✅** AES-256-GCM tokens OAuth (ADR-017, `token-crypto.ts` + tabla integrations + ENCRYPTION_KEY) · 2-27 → 1-26
>
> **Nota fila `▸ Bloque 2.7 — Testing + documentación` · Notas**: 2/2 · **2-28** Vitest + 58 unit tests + 4 integration skip-by-env (schemas 35, crypto 8, logger 4, base-repository 11, lead-opportunities 4). E2E full → SP-4B · **2-29 ✅** `docs/architecture/data-layer.md` sección 6 + SP-2-CLOSE-summary.md
>
> **Nota fila `▸ Bloque 2.8 — Hardening dependencias (A` · Notas**: 3/5 · **2-30 ✅** hook `af-productivity-logger.cjs` Path B híbrido · **2-33 ✅** @types/node ^20 → ^24.12.4 · **2-37 ✅** logger estructurado (compartida con 2.5) · **2-31, 2-32, 2-34 🟢 Diferida ADR-018** post-MVP v0.6.x (lucide-react, shadcn 4, eslint 10)
>
> **Nota fila `▸ Bloque 2.9 — Fix bugs Renzo + reqs Bea` · Notas**: 4/4 · **NEW-01 paso 2 ✅** fix saveOrchestratorConfig (commit `837e12f`); paso 3 DIFERIDO a v0.5.3 post-MVP (ADR-015) · **NEW-02 ✅** enum unificado `LeadStageEnum` + UNREACHABLE + refactor 6 ficheros · **NEW-06 ✅** modelo oportunidades múltiples + dedup 48h · **NEW-13 ✅** política handoff humano (ADR-014, `handoff.ts`, migración SQL)
>
> **Nota fila `▸ Cierre Sprint 1 (SP-2-CLOSE-1..5)` · Notas**: CLOSE-1 ✅ (typecheck OK / lint 120 err preexistentes baseline ADR-019 / build 41 rutas / 58 tests OK) · CLOSE-2 ✅ smoke crypto + hook (E2E full → SP-4B) · **CLOSE-3 🟢 Diferida** a SP-4B phase-02 bloque 4 · CLOSE-4 ✅ lint fixes (9f1fbca + ccd6a50) · CLOSE-5 ✅ merged PR #5

### Sprint 2 — Adapter HubSpot + Zoho (MVP)

| Item                                           | Estado            | Estim.                           | ⏱ Push | ⏱ Cierre  | Notas                                                                    |
| ---------------------------------------------- | ----------------- | -------------------------------- | ------ | --------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 2**                                | 🟢 **COMPLETADA** | **74h** (refinada vs ~169h orig) | ~40min | ~3h 15min | **v0.2.7** (final con hotfix BUG-2-01) · … _ver nota↓_                   |
| ▸ Phase 00 Setup                               | 🟢 Completada     | 2h                               | 25min  | 25min     | Commit `38a6667`. … _ver nota↓_                                          |
| ▸ Phase 01 Foundation                          | 🟢 Completada     | 14h                              | 25min  | 25min     | Commit `000cd23`. … _ver nota↓_                                          |
| ▸ Phase 02 Zoho multi-DC bugfixes (B-01..B-07) | 🟢 Completada     | 10h → ~10min                     | ~10min | ~10min    | Commit `74cc137` mergeado en `a826fd6`. … _ver nota↓_                    |
| ▸ Phase 03 HubSpot Public App OAuth            | 🟢 Completada     | 16h → ~8min                      | ~8min  | ~8min     | Commit `74cc137` mergeado en `a826fd6`. … _ver nota↓_                    |
| ▸ Phase 04 WriteGuard + audit log              | 🟢 Completada     | 6h → ~4min                       | ~4min  | ~4min     | Commit `74cc137` + `ce166ec` (F-WG-1 fail-closed) mergeado … _ver nota↓_ |
| ▸ Phase 05 UI admin IntegrationsManager        | 🟢 Completada     | 12h → ~10min + 30min (hotfix)    | ~10min | ~40min    | Commits `74cc137` + `ce166ec` mergeados. … _ver nota↓_                   |
| ▸ Phase 06 Tests + docs + ADRs 021/022/023     | 🟢 Completada     | 10h → ~5min                      | ~5min  | ~5min     | Commits `74cc137` + `ce166ec` (F-COV-1 coverage config) me … _ver nota↓_ |
| ▸ Phase 07 Cierre (SP-3-CLOSE-1..5)            | 🟢 Completada     | 6h + bugs → ~3h 15min            | ~5min  | ~3h 15min | CLOSE-1 🟢 typecheck + build + 170 tests + lint diff. … _ver nota↓_      |
| ▸ **Bloque 3.B Fix bugs + reqs Bea (NUEVO)**   | 🔘 Pendiente      | **21h**                          | —      | —         | 0/4 · **NEW-03** Fix Voice Agents (4h) · … _ver nota↓_                   |

> **Nota fila `🚀 Sprint 2` · Notas**: **v0.2.7** (final con hotfix BUG-2-01) · `feature/sprint-02-adapter-hubspot-zoho` · **Inicio REAL: 24-05-2026 14:00** · **Fin REAL: 24-05-2026 19:55** · PR #12 mergeado (`a826fd6`) + bumps v0.2.5 → v0.2.7 + hotfix `9ace75f` + deps fix `c426bfb` + Node 22 planning `e1f4af0` + lint fix `107cd7a` + release notes `1f3cae1`. **5/5 E2E VPS verdes** contra `dev.linkstation.ai` v0.2.7. Releases publicados: [v0.2.5](https://github.com/LinkStation/linkstation-dashboard/releases/tag/v0.2.5) + [v0.2.7](https://github.com/LinkStation/linkstation-dashboard/releases/tag/v0.2.7).
>
> **Nota fila `▸ Phase 00 Setup` · Notas**: Commit `38a6667`. Env vars OAUTH_STATE_SECRET + NEXT_PUBLIC_APP_URL + scopes documentados. msw@^2.14.6 devDep + ADR-020. Carpetas crm/oauth, tests/integrations, tests/mocks creadas. Tests: 58 passed sin regresiones.
>
> **Nota fila `▸ Phase 01 Foundation` · Notas**: Commit `000cd23`. `interface.ts` ampliada (6 nuevos métodos). `crm-error.ts` mappers HubSpot/Zoho. `oauth/oauth-state.ts` HMAC-SHA256 constant-time. `token-manager.ts` cache+dedup+writeback. `factory.ts` dual-mode. Migration `20260524100000_integrations_oauth_and_audit.sql` LOCAL+VPS (via pg-meta). **47 tests nuevos** (105 totales).
>
> **Nota fila `▸ Phase 02 Zoho multi-DC bugfixes (B-01.` · Notas**: Commit `74cc137` mergeado en `a826fd6`. `zoho-dc-detector.ts` (9 DCs + exchangeCodeForTokens + refreshAccessToken). Refactor `zoho.ts` (B-01..B-07 fix). Tests: 13 + 5 (dc-detector). MSW handlers en `tests/mocks/zoho-handlers.ts`.
>
> **Nota fila `▸ Phase 03 HubSpot Public App OAuth` · Notas**: Commit `74cc137` mergeado en `a826fd6`. `hubspot.ts` provider Public App OAuth + fetch puro. CRUD contacts/tasks/meetings con association IDs. Tests: 21 + 7 (mappers). Doc `docs/integrations/hubspot-app-setup.md`. **Bloqueante usuario** (pre-deploy real, no bloquea release): registrar Public App en developers.hubspot.com.
>
> **Nota fila `▸ Phase 04 WriteGuard + audit log` · Notas**: Commit `74cc137` + `ce166ec` (F-WG-1 fail-closed) mergeados. `write-guard.ts` con `applyWritePolicy` standalone + escape hatch `allowEmptyCurrent`. `audit-query.ts` getAuditLog RLS multi-tenant. Tests: 10 unit + 2 integration.
>
> **Nota fila `▸ Phase 05 UI admin IntegrationsManager` · Notas**: Commits `74cc137` + `ce166ec` mergeados. **HOTFIX BUG-2-01 (commit `9ace75f`)**: routes `[id]/*` movidos a `manage/[id]/*` por slug conflict con `[provider]/*` en Next.js App Router. 4 fetch frontend actualizados. UI: crm-section + crm-provider-card + write-policy-editor + audit-log-viewer. Tests: 6 API oauth-callback. **WCAG axe + Playwright E2E completos** diferidos a Sprint 3.
>
> **Nota fila `▸ Phase 06 Tests + docs + ADRs 021/022/0` · Notas**: Commits `74cc137` + `ce166ec` (F-COV-1 coverage config) mergeados. `docs/architecture/crm-adapters.md` 10 secciones. ADR-021/022/023. Migración help_sections seed. **Tests: 170 passed + 4 skipped.**
>
> **Nota fila `▸ Phase 07 Cierre (SP-3-CLOSE-1..5)` · Notas**: CLOSE-1 🟢 typecheck + build + 170 tests + lint diff. CLOSE-2 🟡 parcial local + **5/5 E2E VPS verdes** post-hotfix. CLOSE-3 🟢 diferida SP-4B. CLOSE-4 🟢 BUG-2-01 fix (`9ace75f`) + lint warnings fix (`107cd7a`) + lint-staged downgrade (`c426bfb`). CLOSE-5 🟢 PR #12 mergeado (`a826fd6`) + bumps v0.2.5/v0.2.6/v0.2.7 + tags + releases + Node 22 planning Sprint 3 (`e1f4af0`) + release notes v0.2.7 (`1f3cae1`). QA report: `plans/reports/qa-260524-1625-sprint-2-cierre.md`.
>
> **Nota fila `▸ Bloque 3.B Fix bugs + reqs Bea (NUEVO)` · Notas**: 0/4 · **NEW-03** Fix Voice Agents (4h) · **NEW-05** Widget switch + auto-purga (6h) · **NEW-07** Inbox apagar bot (5h) · **NEW-08** Round Robin avanzado (6h). En paralelo a Phase 03/04 si tiempo.

### Sprint 2B — Dashboard KPIs conjunto (NUEVO, MVP)

| Item                                  | Estado                              | Estim.                    | ⏱ Push    | ⏱ Cierre  | Notas                                                   |
| ------------------------------------- | ----------------------------------- | ------------------------- | --------- | --------- | ------------------------------------------------------- |
| **🚀 Sprint 2B**                      | 🟢 **COMPLETADA + POST-FIX v0.2.9** | **16-24h + cierre + fix** | ~2h 38min | ~5h 53min | **v0.2.9** (último: 25-05 ~13:30 UTC, … _ver nota↓_     |
| ▸ Planif. previa (decisiones+fechas)  | 🟢 Completada                       | **1h**                    | ~1h       | ~1h05min  | **24-05-2026 21:00→22:05** · … _ver nota↓_              |
| ▸ Tareas de desarrollo                | 🟢 Completada                       | 16-24h                    | ~1h 53min | ~1h 53min | 7/7 phases 🟢, … _ver nota↓_                            |
| ▸ Cierre Sprint 2B (SP-3B-CLOSE-1..5) | 🟢 Completada                       | **4h 30min + bugs**       | 15min     | ~30min    | ✅ **CERRADO v0.2.8** (25-05 ~08:15 UTC). … _ver nota↓_ |

> **Nota fila `🚀 Sprint 2B` · Notas**: **v0.2.9** (último: 25-05 ~13:30 UTC, post-fix alturas reales + viewport 100%) · v0.2.8 inicial 25-05 08:15 UTC · `feature/sprint-02b-dashboard-kpis-conjunto` · **Inicio REAL 24-05-2026 21:25** · **Fin REAL v0.2.8 25-05-2026 08:15 UTC** · **Fin REAL v0.2.9 25-05-2026 ~13:30 UTC** · PR #13 mergeado (`17b2902`) + bump v0.2.8 (`bbcbfd0`) + 3 commits post-cierre v0.2.9 (`4c720e1` `7cfc976` `0fa1cfc`) + bump v0.2.9 + tag + release. **15/15 E2E VPS verdes** + **18/18 Playwright local + VPS** + **E2E manual Bloques B-G 32/43 PASS**. 7 bugs resueltos (BUG-2B-01..07 + BUG-2B-11) + 3 WCAG diferidos Sprint 3 (BUG-2B-08/09/10). Hand-off SP-4B phase-03b auto-filled. Ratio −70%. Releases: [v0.2.8](https://github.com/LinkStation/linkstation-dashboard/releases/tag/v0.2.8) + [v0.2.9](https://github.com/LinkStation/linkstation-dashboard/releases/tag/v0.2.9).
>
> **Nota fila `▸ Planif. previa (decisiones+fechas)` · Notas**: **24-05-2026 21:00→22:05** · Resueltas 6 cuestiones abiertas pre-arranque: (1) fechas MVP −7 sem → MVP 22-06-2026 · (2) NEW-11=B labels · (3) KPI Builder=C SummaryManager+pestaña · (4) campaigns YA EXISTE · (5) funnel YA EXISTE `ChartManager.tsx:108` · (6) Web widget=2 valores+tooltip. Actualizados: RoadMap.md, README.md, plan.md, phase-04, phase-05. Memoria: `project-decisiones-260524-2130.md`
>
> **Nota fila `▸ Tareas de desarrollo` · Notas**: 7/7 phases 🟢, todos los bloques (KPIs+charts+Builder+WCAG+bugs) cerrados · **NEW-04** Dashboard KPIs conjunto · Detalle fino en sección `## Fase 2.5` más abajo · CLOSE-1 🟢 (193 tests, lint 116 err preexistentes 0 nuevos) · CLOSE-2 🟢 (15/15 Playwright incl. deep checks) · ⏱ ~1h 53min real vs 16h 30min estim (ratio −89%)
>
> **Nota fila `▸ Cierre Sprint 2B (SP-3B-CLOSE-1..5)` · Notas**: ✅ **CERRADO v0.2.8** (25-05 ~08:15 UTC). PR #13 mergeado `17b2902` · Dokploy deploy verde · **15/15 E2E VPS verdes** contra dev.linkstation.ai · 3 bugs resueltos (BUG-2B-01/02/03) · CLOSE-3 diferido SP-4B phase-03b · hand-off SP-4B auto-filled · RELEASE-NOTES-v0.2.8 publicadas · Nueva SP-4-NEW-13 añadida Sprint 3

### Sprint 3 — Hardening (cierre release candidate v0.3.0-rc.1)

| Item                                           | Estado                         | Estim.        | ⏱ Push     | ⏱ Cierre   | Notas                                                                                                      |
| ---------------------------------------------- | ------------------------------ | ------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| **🚀 Sprint 3**                                | 🟢 Completada (merged)         | **~112-144h** | ~23h 30min | ~25h 42min | **v0.3.0-rc.1** · PR #22 MERGED 30-05-2026 · … _ver nota↓_                                                 |
| ▸ Tareas de desarrollo (Fase 3)                | 🟢 Completada                  | 93-119h       | ~21h       | ~21h       | 22/22 dev + 4 BUG-SEC FIXED en commits `bcd36a9`+`c018c11` (29-05 tarde) · … _ver nota↓_                   |
| ▸ **Bloque 3.B — Fix bugs + reqs Bea (NUEVO)** | 🟢 Diferida (backlog post-MVP) | **19-25h**    | —          | —          | Decisión 29-05-2026: NEW-09..12 partes UI → backlog post-MVP. Backend crítico ya 🟢 parcial. … _ver nota↓_ |
| ▸ Cierre Sprint 3 (SP-4-CLOSE-1..5)            | 🟢 Completada                  | **7h + bugs** | ~2h 12min  | ~2h 42min  | CLOSE-1/1.5/2/4 🟢 + /e2ctotal 🟢 + 4 BUG-SEC FIXED + PR #22 MERGED · … _ver nota↓_                        |

> **Nota fila `🚀 Sprint 3` · Notas**: **v0.3.0-rc.1** (release candidate) · `feature/sprint-03-hardening` · Inicio Vie 31-07-2026 · **planificación detallada actualizada 24-05-2026 tras research R2**: phase-08 nueva con NEW-09..12 desglosadas (19-25h), phase-05 horas corregidas 10-14h → 16-20h (incluye 4-08 withRateLimit HOF), phase-07 versión unificada (3 valores conflictivos → `v0.3.0-rc.1` único), CHANGELOG borrador phase-06 actualizado (eliminar items LLM movidos, añadir Node 22 + NEW-09..12) · **Sesión 28-05-2026**: SP-4-LINT-ZERO (9 lotes, lint 104→0) + SP-4-DEPRECATIONS-DEPLOY (Next 16 + Sentry 10 + lazy SERVICE_ROLE_KEY + fix /api/version) + doc incidente PAT leak. ⏱ ~21h totales pusheadas. **29-05-2026**: CLOSE-1 🟢 + CLOSE-1.5 🟢 PASS + CLOSE-2 🟢 14/14 specs. Bloque 3.B → backlog post-MVP. 4 BUG-SEC abiertos (2 altos pre-deploy VPS, 2 medios backlog). **30-05-2026**: PR #22 MERGED a `developer` (24 commits, +7318/-3153) + tag `v0.3.0-rc.1` + hand-off SP-4B phase-04. Sprint 3 🟢 CERRADO.
>
> **Nota fila `▸ Tareas de desarrollo (Fase 3)` · Notas**: 22/22 dev mergeadas a `developer` vía PR #22 (`feature/sprint-03-hardening`): 4-01, 4-03, 4-06, 4-07, 4-08, SP-4-NODE-22, WCAG-08/09/10, NEW-09/10/11/12/13, AWS-REMOVAL, SIDEBAR-UX, BUG-3-01..13, TS-STANDARDS, AUTH-RATELIMIT, SEC-PROACTIVE, RLM-TIMEOUT, LINT-ZERO, DEPRECATIONS-DEPLOY. 4-02 y 4-09 diferidas SP-4B. ~~4-04~~ MOVIDA al Sprint Costes-LLM como C-02. **Mergeado 30-05-2026.**
>
> **Nota fila `▸ Bloque 3.B — Fix bugs + reqs Bea (NUEV` · Notas**: **Decisión Javi HP 29-05-2026 al cierre Sprint 3**: Bloque 3.B (NEW-09 UI dropzone Excel + filtros multi-variable + cola configurable, NEW-10 UI calendar holidays settings, NEW-11 partes UI consolidación, NEW-12 confirmación robusta + slide-over) MOVIDO al backlog post-MVP. Los críticos backend ya están 🟢 (parciales en tareas detalladas). Razón: cierre MVP v0.3.0 GA Lun 22-06-2026 no requiere estas UI. Sprint Refinamiento post-Costes-LLM las absorberá si no se priorizan antes.
>
> **Nota fila `▸ Cierre Sprint 3 (SP-4-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · CLOSE-1 🟢 (29-05-2026, ~10min) · CLOSE-1.5 🟢 PASS (29-05-2026, ~7min) · CLOSE-2 🟢 (29-05-2026, ~5min, 14/14 specs) · CLOSE-3 **DIFERIDO a SP-4B phase-04 bloque 4** · CLOSE-4 🟢 (4 BUG-SEC fixed) · paso 7 E2E VPS condicional (omitido, validado luego en run E2E VPS 03-06 PASS) · **CLOSE-5 🟢 30-05-2026**: PR #22 MERGED + bump `v0.3.0-rc.1` + hand-off SP-4B phase-04 · 4 BUG-SEC detectados en CLOSE-1.5 cerrados en rama (2 altos pre-deploy VPS, 2 medios backlog)

### 👤 Sprint Validación Pre-MVP — Equipo Renzo (entre Hardening y Sheets, cierre MVP v0.3.0 GA)

| Item                                  | Estado       | Estim.       | ⏱ Push | ⏱ Cierre | Notas                                                                                                                               |
| ------------------------------------- | ------------ | ------------ | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 👤 **🚀 Sprint Validación Pre-MVP**   | 🟢 Cerrado (de facto) | **40-55h** | — | —      | **v0.3.0 GA** · `feature/sprint-03b-validacion-pre-mvp` · 🟢 cerrado vía E2E VPS 03-06 PASS · … _ver nota↓_                          |
| 👤 ▸ Phase 01 — Validación Sprint 0   | 📝 Llenada   | 8-10h        | —      | —        | Plantilla rellenada al cierre Sprint 0 con tests + manual … _ver nota↓_                                                             |
| 👤 ▸ Phase 02 — Validación Sprint 1   | 🟡 Cubierta en E2E VPS | 8-10h | —     | —        | NO rellenada como plantilla individual · cobertura absorbida en run E2E VPS 03-06 PASS · … _ver nota↓_                              |
| 👤 ▸ Phase 03a — Validación Sprint 2  | 📝 Llenada   | 5-7h         | —      | —        | Rellenada 24-05-2026 al cierre Sprint 2 (v0.2.7) tras rese … _ver nota↓_                                                            |
| 👤 ▸ Phase 03b — Validación Sprint 2B | 🟡 Cubierta en E2E VPS | 5-6h | —     | —        | Solo skeleton · NO rellenada · cobertura absorbida en run E2E VPS 03-06 PASS · … _ver nota↓_                                        |
| 👤 ▸ Phase 04 — Validación Sprint 3   | 📝 Llenada   | 10-12h       | —      | —        | Auto-fill completado 29-05-2026 en SP-4-CLOSE-1/1.5/2. Specs exactas, BUG-SEC-01..04, vars VPS, notas deploy Dokploy. … _ver nota↓_ |
| 👤 ▸ Cierre SP-4B (CLOSE-1..5)        | 🟡 De facto vía E2E VPS | 6-12h + bugs | — | —   | CLOSE formal no ejecutado como ritual · validado por run E2E VPS 03-06 PASS · bump v0.3.0 GA pendiente acción usuario · … _ver nota↓_ |

> **Nota fila `👤 🚀 Sprint Validación Pre-MVP` · Notas**: **v0.3.0 GA** · `feature/sprint-03b-validacion-pre-mvp` · Inicio Mar 16-06-2026 (post-Sprint 3 merge · adelantado −7 sem 24-05) · **Asignado a Renzo + equipo Renzo** · estim. recalculada 22-05-2026 por absorber CLOSE-3 manuales de Sprints 1, 2, 2B, 3
>
> **Nota fila `👤 ▸ Phase 01 — Validación Sprint 0` · Notas**: Plantilla rellenada al cierre Sprint 0 con tests + manual + 2 bugs ya corregidos. Renzo ejecuta en VPS.
>
> **Nota fila `👤 ▸ Phase 02 — Validación Sprint 1` · Notas**: Se rellena en SP-2-CLOSE-5 (auto-fill) · incluye manual humano (antes CLOSE-3 Javi)
>
> **Nota fila `👤 ▸ Phase 03a — Validación Sprint 2` · Notas**: Rellenada 24-05-2026 al cierre Sprint 2 (v0.2.7) tras research R3. Incluye **BUG-2-01** (P0 slug conflict) + F-WG-1 + F-API-1 + F-API-2 como regression baseline. Versión corregida `v0.2.0-rc` → `v0.2.7`. Decisión R3: dividida de phase-03 antigua para no mezclar bug IDs ni branches con Sprint 2B
>
> **Nota fila `👤 ▸ Phase 03b — Validación Sprint 2B` · Notas**: Skeleton creado 24-05-2026 con placeholders `<!-- AUTOFILL -->`. Cubre Sprint 2B Dashboard KPIs Overview (v0.2.8). Se rellena en SP-3B-CLOSE-5 (auto-fill)
>
> **Nota fila `👤 ▸ Phase 04 — Validación Sprint 3` · Notas**: Auto-fill completado 29-05-2026 en SP-4-CLOSE-1/1.5/2. Specs exactos sprint-3-close (14/14), golden flows MVP diferidos a SP-4B, regression baseline 12 BUGs Sprint 3, 4 BUG-SEC detectados (2 altos críticos pre-deploy tráfico real, 2 medios backlog), vars VPS con tab correcto (SUPABASE_SERVICE_ROLE_KEY → Environment no Build Args), notas deploy Dokploy (Clean Cache Node 22, Build Args GIT_COMMIT_SHA/GIT_BRANCH, SQL campaigns+holidays). Detalle: `plans/260522-1700-sprint-validacion-pre-mvp/phase-04-validacion-sprint-3.md`
>
> **Nota fila `👤 ▸ Cierre SP-4B (CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · SP-4B absorbe CLOSE-3 manual de Sprints 1, 2, 2B, 3 (Renzo) · **paso 7 E2E VPS OBLIGATORIO** (es el sprint de validación VPS) · paso 8 N/A (es el propio destino del hand-off) · Re-run consolidado + bump SemVer **v0.3.0 GA** · NO promociona a staging (requiere orden Javi HP)

### Sprint 4 — Google Sheets bidireccional (post-MVP)

| Item                                          | Estado         | Estim.          | ⏱ Push    | ⏱ Cierre   | Notas                                                                              |
| --------------------------------------------- | -------------- | --------------- | --------- | ---------- | ---------------------------------------------------------------------------------- |
| **🚀 Sprint 4**                               | 🟢 Completada  | 60-100h         | 11h 10min | ~14h 30min | v0.4.0 · cierre formal 08-06 · CLOSE-1/1.5/2/4 🟢 · … _ver nota↓_                  |
| ▸ Tareas de desarrollo (Fase 4)               | 🟢 Completada  | 60-100h         | 10h       | ~13h       | Spike Pull-only + UI multi-Picker + writeback + E2E real OAuth · … _ver nota↓_     |
| ▸ Cierre Sprint 4 (SP-5-CLOSE-1..5)           | 🟢 Completada  | 5h 30min + bugs | —         | ~1h 30min  | CLOSE-1/1.5/2/4 🟢 · 2 fixes seguridad + 1 test fix · bump v0.4.0 · … _ver nota↓_  |
| ▸ SP-4-SPIKE-PULL · 1 Foundation (SQL+OAuth)  | 🟢 Local OK    | 3-4h            | 1h 30min  | —          | Commit `d639971` · 2 migraciones + types + credentials + OAuth refactor            |
| ▸ SP-4-SPIKE-PULL · 2 Backend (adapter+queue) | 🟢 Local OK    | 4-5h            | 1h 45min  | —          | Commit `f752b74` · adapter + queue + worker + webhook + writeback + actions        |
| ▸ SP-4-SPIKE-PULL · 3 UI wizard + Picker      | 🟢 Local OK    | 3-4h            | 1h 15min  | —          | Commit `e1a3ec4` · 4 steps + Google Picker multi-sheet + mapping editor            |
| ▸ SP-4-SPIKE-PULL · 4 Docs + tests + runbook  | 🟢 Local OK    | 2-3h            | 1h        | —          | Commit `6de8045` · guía Cloud Console tenant + 40 tests + runbook E2E              |
| ▸ SP-4-SPIKE-PULL · 5 Writeback automation    | 🟢 Local OK    | 1-2h            | 50min     | —          | Commit `4cdb460` · trigger SQL + outbox + cron + 4 tests                           |
| ▸ SP-4-SPIKE-PULL · 6 CSP fix + smoke test    | 🟢 Local OK    | 30min-1h        | 40min     | —          | Commit `2e8a199` · CSP permite Google Picker + Playwright MCP smoke test           |
| ▸ SP-4-SPIKE-PULL · 7 Worktree + dev 8501     | 🟢 Operativo   | 30min-1h        | 40min     | —          | Worktree `worktrees/sprint-04-google-sheets/` · dev 8501 · `.secrets/` copy        |
| ▸ SP-4-SPIKE-PULL · 8 Full E2E Google OAuth   | 🟢 E2E real OK | 2-3h            | ~2h       | —          | E2E real 03-06: OAuth Google + ngrok + flujo bidireccional validado (9 bugs fixed) |
| ▸ SP-4-SPIKE-PULL · 9 Push GitHub + PR #20    | 🟢 Mergeado    | 1-2h            | 1h 30min  | —          | Commits `a78830b` + `c9e6238` · PR #20 MERGED 29-05 + merge bidireccional 03-06    |

> **Nota fila `🚀 Sprint 4` · Notas**: **v0.4.0 · 🟢 CERRADO 08-06-2026** · `feature/sprint-04-google-sheets` · Spike paralelo Pull-only (27/28-05) → flujo bidireccional + E2E real OAuth (03-06) → cierre formal (08-06). Cierre CLOSE-1 🟢 (typecheck 0, lint 0, build OK, tests 321/325) + CLOSE-1.5 🟢 (security delta OWASP: 0 críticos, 1 alto + 1 medio fixed in-session) + CLOSE-2 🟢 (20/20 E2C Playwright local) + CLOSE-4 🟢 (2 fixes seguridad + 1 test fix Vitest 4) + bump SemVer v0.4.0 + CHANGELOG + release notes. ⏱ Cierre ~1h 30min.
>
> **Nota fila `▸ Tareas de desarrollo (Fase 4)` · Notas**: Subtareas 1-9 completas. **E2E real 03-06-2026**: OAuth Google + ngrok + flujo bidireccional Pull/writeback validado end-to-end (9 bugs corregidos, BUG-4-09 crítico Sheets mudas). PR #20 (SPIKE Pull-only) MERGED 29-05 + merge `f89aab9` flujo bidireccional 03-06 + fix cross-tenant `19d1f4d`. Tests Vitest sheets verdes. Mergeado a developer.
>
> **Nota fila `▸ Cierre Sprint 4 (SP-5-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar (dev lo ejecuta) · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A. **Cierre formal ejecutado 08-06-2026**: CLOSE-1 🟢 (typecheck/lint/build/tests 321/325) · CLOSE-1.5 🟢 (security delta `plans/reports/security-delta-sprint-4-20260608.md`: 0 críticos; SEC-S4-01 alto cron fail-open + SEC-S4-07 medio formula-injection FIXED) · CLOSE-2 🟢 (20/20 E2C, 4 specs nuevos `tests/e2e/sprint-4-close/`) · CLOSE-4 🟢 (fix mock Vitest 4 en `outbox.test.ts` + 2 fixes seguridad) · bump `v0.4.0` + CHANGELOG. **Pendiente acción del usuario**: commit + push `developer` + crear tag `v0.4.0` + publicar release (regla del proyecto: no se hacen acciones GitHub sin orden explícita). 2 MEDIO a backlog (BUG-4-XX): channel_token no constant-time + PII en error.message.
>
> **Nota fila `▸ SP-4-SPIKE-PULL · 7 Worktree + dev 8501` · Notas**: Repo principal queda libre para chat 'experience' (rama actual `auditoria-v2-medio-proyecto` 28-05). Worktree dedicado evita los incidentes de cambio silencioso de rama. Dev server 8501 con CSP fix activo. `.env.local` y `.secrets/` copiados (no symlinks: Windows sin Developer Mode).
>
> **Nota fila `▸ SP-4-SPIKE-PULL · 8 Full E2E Google OAuth` · Tarea**: Crear app OAuth en Google Cloud Console con `ai2you.email@gmail.com` (Sheets API + Drive API + Picker API + consent screen External Testing + OAuth Client ID Web tipo `Web application` con redirect URI `http://localhost:8501/api/integrations/google/callback`). Pegar Client ID + Secret en `.secrets/google-test-account.env`. Sheet de pruebas con cabeceras Nombre/Apellidos/Email/Teléfono/Empresa/Cargo/Estado. Arrancar `ngrok http 8501` para que Drive notifique a localhost. Ejecutar runbook `tests/e2e/sheets/sheets-spike-manual-runbook.md` paso a paso. Reporte final con métricas reales.
>
> **Nota fila `▸ SP-4-SPIKE-PULL · 9 Push GitHub + Draft PR #20` · Notas**: Sesión 28-05-2026 cierre por orden explícita usuario. **Push 1 baltqy689 ❌** husky pre-push bloqueó por lint en `src/lib/integrations/sheets/actions.ts:120` (2 errores `no-explicit-any` + warning unused import `getAppCredentials` + directive eslint-disable inútil línea 118). **Fix 1 commit `a78830b`**: eliminado import unused + reformateo statement multilinea a una sola línea; prettier deshizo el reformateo, lint volvió a romper. **Fix 2 commit `c9e6238`**: block `/* eslint-disable @typescript-eslint/no-explicit-any */ ... /* eslint-enable */` acotado al statement insert sheet_connections (sobrevive a prettier porque es block-comment directiva, no line-comment). **Push 2 bl0jn8xki 🟢** husky verde (typecheck + build + lint). 10 commits en `origin/feature/sprint-04-google-sheets`. **Draft PR #20** creado vía `gh pr create --draft --base developer` con cuerpo profesional en `plans/260521-0000-sprint-4-google-sheets/PR-BODY-sprint-4-spike-pull.md` (Resumen + Highlights + Detalle backend/frontend/tests + Migraciones SQL + Env vars (ninguna) + 10 commits enumerados + Próximos pasos). URL: <https://github.com/LinkStation/linkstation-dashboard/pull/20>. NO mergeado — Draft hasta cerrar SPIKE-PULL-8 + protocolo CLOSE-1..5.

### Sprint 5 — Zoho CRM como entrada de leads (bidireccional) 🔜 PRÓXIMO

| Item                                | Estado       | Estim.          | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| ----------------------------------- | ------------ | --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 5**                     | 🔘 Pendiente | 10-15h          | —      | —        | v0.5.0 · `feature/sprint-05-zoho-entrada-leads` · clon de Sheets · … _ver nota↓_ |
| ▸ Tareas de desarrollo (Fase 5)     | 🔘           | 10-15h          | —      | —        | 0/N · pull leads Zoho + writeback + audit R-014 + autorelleno            |
| ▸ Cierre Sprint 5 (SP-6-CLOSE-1..5) | 🔘           | 5h 30min + bugs | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `🚀 Sprint 5` · Notas**: v0.5.0 · `feature/sprint-05-zoho-entrada-leads` · **NUEVO sprint (decisión Javi HP 08-06-2026)** · Clon funcional del Sprint 4 Google Sheets pero con **Zoho CRM como fuente de entrada de leads**: pull de leads desde Zoho + writeback bidireccional de cambios de stage + audit R-014 (`overwrite_with_audit`) + autorelleno de campos (origen, fecha_ingreso_crm, tipo_lead, país por prefijo). Reutiliza el adapter Zoho existente (Sprint 2, multi-DC) que hasta ahora era solo destino de salida; añade la dirección entrada. Detalle de alcance al arrancar el sprint.
>
> **Nota fila `▸ Cierre Sprint 5 (SP-6-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar (dev lo ejecuta) · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### 👤 Sprint 6 — Llamadas de Voz 🆕 (v0.6.0) — Equipo Renzo

> Plan detallado (5 fases): [`plans/260610-1545-sprint-06-llamadas-voz/plan.md`](260610-1545-sprint-06-llamadas-voz/plan.md). **Asignado a Renzo + equipo Renzo (decisión Javi HP 10-06-2026).**

| Item                                | Estado       | Estim.  | ⏱ Push | ⏱ Cierre | Notas                                                  |
| ----------------------------------- | ------------ | ------- | ------ | -------- | ------------------------------------------------------ |
| 👤 **🚀 Sprint 6**                  | 🟢 Completada | 8-14h   | —      | —        | **v0.6.0** · `feature/sprint-06-llamadas-voz` · 🆕 Nuevo sprint insertado Javi HP 10-06-2026 · **Asignado a Renzo** |
| 👤 ▸ Tareas de desarrollo (Fase 6)  | 🟢           | 8-14h   | —      | —        | Conversaciones de Voz (clon WhatsApp) + config voz centralizada + llamadas→dashboard+Lista de Leads |
| 👤 ▸ Cierre Sprint 6 (SP-7-CLOSE-1..5) | 🟢        | 5h 30min + bugs | — | —   | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

---

### 👤 Sprint 7 — Refinamiento Herramientas Internas — Equipo Renzo (v0.7.0)

| Item                                               | Estado        | Estim.              | ⏱ Push    | ⏱ Cierre  | Notas                                                                    |
| -------------------------------------------------- | ------------- | ------------------- | --------- | --------- | ------------------------------------------------------------------------ |
| 👤 **🚀 Sprint 7**                                 | 🟢 Completada  | **18-22h + cierre** | —         | —         | **v0.7.0** · `feature/sprint-07-refinamiento-herramientas` · … _ver nota↓_ |
| 👤 ▸ Fase 01 — Simulator persistencia (NO-voz)     | 🟢            | 8-10h               | —         | —         | ⚠️ La parte de VOZ se MOVIÓ al Sprint 6. Aquí: persistir variables en BD (texto) + historial recarga · … _ver nota↓_ |
| 👤 ▸ Fase 02 — Lanzador `/calls` (NO-voz)          | 🟢            | 10-12h              | —         | —         | ⚠️ La parte de VOZ se MOVIÓ al Sprint 6. Aquí: refinamiento NO-voz del lanzador · … _ver nota↓_ |
| ▸ Fase 03 — **SP-7-DEPS-AUDIT-26** Vulns prod      | 🟢 Completada | 4-6h                | ~1h 15min | ~1h 45min | 🟢 MERGEADA developer 03-06-2026 — 25→4 vulns (-84%) · ID histórico SP-7-DEPS-AUDIT-26 NO se renumera (ya en commits/CI) · … _ver nota↓_ |
| 👤 ▸ Cierre Sprint 7 (SP-8-CLOSE-1..5)             | 🟢            | **4h 30min + bugs** | —         | —         | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `👤 🚀 Sprint 7` · Notas**: **v0.7.0** · `feature/sprint-07-refinamiento-herramientas` · **Asignado a Renzo + equipo Renzo** para Fases 01-02 (Simulator + Lanzador, parte NO-voz). **Fase 03 SP-7-DEPS-AUDIT-26 🟢 ADELANTADA Y CERRADA 02-06-2026** por Javi HP (25→4 vulns, −84%, rama `feature/sp-7-deps-audit-26`). El sprint padre estima ahora 18-22h + cierre (sin Fase 03). creado 22-05-2026 por decisión Bea + Renzo: Simulator y Lanzador `/calls` fuera del MVP. **Renumerado de Sprint 6 a Sprint 7 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).** Detalle: [`plans/260522-1830-sprint-refinamiento-herramientas-post-mvp/plan.md`](260522-1830-sprint-refinamiento-herramientas-post-mvp/plan.md)
>
> **Nota fila `👤 ▸ Fase 01 — Simulator persistencia (NO-v` · Notas**: ⚠️ La parte de VOZ (soporte simulación voz) se MOVIÓ al Sprint 6 "Llamadas de Voz" (decisión Javi HP 10-06-2026). Aquí queda solo: persistir variables capturadas en BD (no sólo `useState`) + retener historial al recargar página (texto, sin voz).
>
> **Nota fila `👤 ▸ Fase 02 — Lanzador /calls (NO-voz)` · Notas**: ⚠️ La parte de VOZ (lanzador `/calls` real Retell SDK + WebSocket transcripción en vivo + LiveMonitor SDK) se MOVIÓ al Sprint 6 "Llamadas de Voz" (decisión Javi HP 10-06-2026). Aquí queda solo el refinamiento NO-voz del lanzador.
>
> **Nota fila `▸ Fase 03 — SP-7-DEPS-AUDIT-26 Vulns prod` · Notas**: **ID histórico SP-7-DEPS-AUDIT-26 NO se renumera** — ya referenciado en commits y CI, cambiar causaría confusión. **🟢 ADELANTADA Y CERRADA 02-06-2026** por orden Javi HP — ejecutada fuera del Sprint Refinamiento. Rama `feature/sp-7-deps-audit-26` desde developer. **Resultado**: 25 → 4 vulns (−84%, 0 críticas / 0 altas / 4 moderate acceptedRisk). Plan 3-pass aprobado por `af-agents:adr` previamente. **Pass 1** `npm audit fix` plano cerró 18 vulns (bullmq+exceljs uuid bumps, @langchain/langgraph 1.2.6→1.3.3, hono, fast-uri, fast-xml-parser, langsmith, picomatch, tmp, etc.). **Pass 2** bump `vitest@3.2.4 → 4.1.8` + `@vitest/coverage-v8@4.1.8` cerró las 2 críticas (Vitest UI arbitrary file read/exec). Tests 306/310 verde tras refactor `rate-limiter.test.ts` con `vi.hoisted` + clase `MockRedis` explícita (Vitest 4 ya no permite `vi.fn().mockImplementation()` con `new`). **Pass 3** `package.json` añade `overrides: { brace-expansion: ^2.0.2 }` para forzar versión segura en eslint→minimatch→brace-expansion@1.1.12. **4 vulns moderate residuales como acceptedRisk** documentadas en ADR-018 sección "Cierre SP-7": next/postcss (rechazo downgrade Next 16→9, no servimos CSS no confiable), exceljs/uuid (rechazo downgrade exceljs@3.4, uuid.v4 sin buffer custom inexplotable). **Tiempo real**: ~1h 15min push + ~30min cierre = ~1h 45min vs estim 4-6h (−65%). Verificación CLOSE-4: typecheck 0, lint 0, build OK, npm test 306/310. Detectado en CI run [`26659624573`](https://github.com/LinkStation/linkstation-dashboard/actions/runs/26659624573). **CIERRE 03-06-2026**: run E2E VPS autónomo (`plans/260603-2210-e2etotal-run/`) 🟢 PASS — fases bloqueantes 00-02 100%, ~392 tests, **0 CRIT / 0 HIGH**, 2 MED diferidos (info-leak webhook 503 + `/api/version` Build Args Dokploy). 5 regresiones HIGH/CRIT de runs previos verificadas RESUELTAS en VPS. Fix in-session `E2E-260603-001-LOW` (test crypto authTag flaky → XOR nibble determinista, commit `04c7f59`). 🟢 **MERGEADA a developer 03-06-2026** por orden Javi HP.
>
> **Nota fila `👤 ▸ Cierre Sprint 7 (SP-8-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · CLOSE-3 manual ABSORBIDO por Renzo en este sprint (no diferido porque ya es Renzo) · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### Sprint 8 — Centro de costes LLM (v0.8.0)

| Item                                | Estado                 | Estim.          | ⏱ Push   | ⏱ Cierre | Notas                                                                    |
| ----------------------------------- | ---------------------- | --------------- | -------- | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 8**                     | 🔵 Subida rama 13-06   | 23-31h          | —        | —        | v0.8.0 · `feature/sprint-08-costes-llm` · código completo + tests verdes, PR sin merge · … _ver nota↓_                  |
| ▸ Tareas de desarrollo (Fase 8)     | 🟢 Completada          | 23-31h          | —        | —        | 3/3 🟢 (**C-01** LiteLLM Proxy, **C-02** Langfuse metadata, **C-03** token_usage chat_messages) |
| ▸ Cierre Sprint 8 (SP-8-CLOSE-1..5) | 🟡 Parcial (CLOSE-1,2,4 🟢) | 5h 30min + bugs | —      | —        | CLOSE-1 🟢 typecheck/lint/build/tests, CLOSE-2 🟢 E2C local (render OK + token_usage verificado), CLOSE-4 ✅ 0 bugs, CLOSE-3/5 diferido/PR sin merge |

> **Nota fila `🚀 Sprint 8` · Notas**: **v0.8.0 · IMPLEMENTADO 13-06-2026** · `feature/sprint-08-costes-llm` (6 commits: `20847c1`, `7a1c7bc`, `f82e792`, `d5c2439`, `ad2cafb` fix CSP dev, `a017a13` capturas) · 🔵 Subida rama PR #32 sin merge (protocolo usuario) · LiteLLM Proxy v1.85.5 + Langfuse metadata-only · ADR-024 promovido Accepted 13-06-2026 · Cierre: CLOSE-1 🟢 (12 tests nuevos verdes, typecheck+lint+build OK) + CLOSE-2 🟢 (E2C local navegador: dashboard + /costs render 0 errores tras fix CSP `ad2cafb`; token_usage verificado vía BD/RLS con JWT autenticado, $0.021 vs fijo $0.002; render con datos en local bloqueado por bug PREEXISTENTE de propagación JWT del cliente Supabase, ajeno al sprint) + CLOSE-4 ✅ (0 bugs críticos) · Proxy validado E2E local (completion real + SpendLog; bug formato fallbacks v1.85 corregido) · Deploy VPS LiteLLM container diferido a pre-deploy
>
> **Nota fila `▸ Tareas de desarrollo (Fase 8)` · Notas**: 3/3 completadas · **C-01 🟢** LiteLLM Proxy Dokploy + hardening + fallback runtime (commit `20847c1`) · **C-02 🟢** Langfuse Cloud Hobby + callbacks + masking PII (commits `7a1c7bc` + `f82e792`) · **C-03 🟢** Persistencia token_usage en chat_messages para todos los consumidores OpenAI (commit `f82e792`) · Implementación mínima segura: alcance re-scoped tras red-team analysis (Langfuse sin PII, ruta caliente no migrada, virtual keys diferidas, budget alert-only)
>
> **Nota fila `▸ Cierre Sprint 8 (SP-8-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · **CLOSE-1 🟢** (typecheck 0, lint 0, build OK, 12 nuevos tests verdes: emergency-fallback 6 + llm-client 4 + langfuse-trace 2) · **CLOSE-1.5 🟢** (security delta: 0 críticos, 0 altos) · **CLOSE-4 ✅** (0 bugs críticos en rama, código limpio) · **CLOSE-2/3/5 pendientes**: E2C, test manual dev, PR merge (diferido orden usuario, no ejecutar hasta confirmación) · post-MVP: CLOSE-3 estándar (dev manual) · paso 7 E2E VPS condicional (diferido pre-deploy)

### Sprint 9 — Salesforce adapter (post-MVP)

| Item                                | Estado       | Estim.          | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| ----------------------------------- | ------------ | --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 9**                     | 🔘 Pendiente | 60-100h         | —      | —        | v0.9.0 · `feature/sprint-09-salesforce` · … _ver nota↓_                  |
| ▸ Tareas de desarrollo (Fase 9)     | 🔘           | 60-100h         | —      | —        | 0/6 · jsforce vía ADR                                                     |
| ▸ Cierre Sprint 9 (SP-10-CLOSE-1..5) | 🔘          | 5h 30min + bugs | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `🚀 Sprint 9` · Notas**: v0.9.0 · `feature/sprint-09-salesforce` · **Renumerado de Sprint 5 a Sprint 8 el 08-06-2026 · Renumerado de Sprint 8 a Sprint 9 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz)**
>
> **Nota fila `▸ Cierre Sprint 9 (SP-10-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### Sprint 10 — GoHighLevel adapter (post-MVP)

| Item                                 | Estado       | Estim.          | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| ------------------------------------ | ------------ | --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 10**                     | 🔘 Pendiente | 40-80h          | —      | —        | v0.10.0 · `feature/sprint-10-gohighlevel` · … _ver nota↓_                |
| ▸ Tareas de desarrollo (Fase 10)     | 🔘           | 40-80h          | —      | —        | 0/5 · foco Latam EduTech                                                  |
| ▸ Cierre Sprint 10 (SP-11-CLOSE-1..5) | 🔘          | 5h 30min + bugs | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `🚀 Sprint 10` · Notas**: v0.10.0 · `feature/sprint-10-gohighlevel` · **Renumerado de Sprint 6 a Sprint 9 el 08-06-2026 · Renumerado de Sprint 9 a Sprint 10 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz)**
>
> **Nota fila `▸ Cierre Sprint 10 (SP-11-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### Sprint 11 — ActiveCampaign adapter (post-MVP)

| Item                                  | Estado       | Estim.          | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| ------------------------------------- | ------------ | --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 11**                      | 🔘 Pendiente | 20-50h          | —      | —        | v0.11.0 · `feature/sprint-11-activecampaign` · … _ver nota↓_             |
| ▸ Tareas de desarrollo (Fase 11)      | 🔘           | 20-50h          | —      | —        | 0/5 · auth API Key (la más sencilla)                                     |
| ▸ Cierre Sprint 11 (SP-12-CLOSE-1..5) | 🔘           | 5h 30min + bugs | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `🚀 Sprint 11` · Notas**: v0.11.0 · `feature/sprint-11-activecampaign` · **Renumerado de Sprint 7 a Sprint 10 el 08-06-2026 · Renumerado de Sprint 10 a Sprint 11 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz)**
>
> **Nota fila `▸ Cierre Sprint 11 (SP-12-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### Sprint 12 — Adapter pattern generalization

| Item                                  | Estado                           | Estim.          | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| ------------------------------------- | -------------------------------- | --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 12**                      | 🔘 Bloqueado hasta SP-9..SP-11   | 20-40h          | —      | —        | v0.12.0 · `feature/sprint-12-adapter-generalization` · … _ver nota↓_     |
| ▸ Tareas de desarrollo (Fase 12)      | 🔘                               | 20-40h          | —      | —        | 0/4                                                                       |
| ▸ Cierre Sprint 12 (SP-13-CLOSE-1..5) | 🔘                               | 5h 30min + bugs | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `🚀 Sprint 12` · Notas**: v0.12.0 · `feature/sprint-12-adapter-generalization` · **Renumerado de Sprint 8 a Sprint 11 el 08-06-2026 · Renumerado de Sprint 11 a Sprint 12 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz)** · bloqueado hasta cerrar los adapters Salesforce/GHL/ActiveCampaign
>
> **Nota fila `▸ Cierre Sprint 12 (SP-13-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### Sprint 13 — Tier 2 on-demand (backlog)

| Item                                          | Estado     | Estim.         | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| --------------------------------------------- | ---------- | -------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 13**                              | 🔘 Backlog | 30-50h por CRM | —      | —        | v0.13.x · sólo bajo pedido cliente                                       |
| ▸ CRMs Tier 2                                 | 🔘 Backlog | 30-50h c/u     | —      | —        | Clientify, Bitrix24, Pipedrive, Monday, Holded                           |
| ▸ Cierre Sprint 13 (SP-14-CLOSE-1..5 por CRM) | 🔘 Backlog | 5h 30min/CRM   | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `▸ Cierre Sprint 13 (SP-14-CLOSE-1..5 por ` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) por cada CRM activado · CLOSE-3 estándar · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A · **Renumerado de Sprint 9 a Sprint 12 el 08-06-2026 · Renumerado de Sprint 12 a Sprint 13 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz)**

### Sprint 14 — WhatsApp Tech Provider Migration (Meta)

| Item                                  | Estado       | Estim.          | ⏱ Push | ⏱ Cierre | Notas                                                                    |
| ------------------------------------- | ------------ | --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| **🚀 Sprint 14**                      | 🔘 Pendiente | 48-72h          | —      | —        | v0.14.0 · `feature/sprint-14-whatsapp-tech-provider` · … _ver nota↓_     |
| ▸ Tareas de desarrollo (Fase 14)      | 🔘           | 48-72h          | —      | —        | 0/7 · Embedded Signup + token sistema central + dual-mode (8 fases)      |
| ▸ Cierre Sprint 14 (SP-15-CLOSE-1..5) | 🔘           | 6h 30min + bugs | —      | —        | Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) |

> **Nota fila `🚀 Sprint 14` · Notas**: v0.14.0 · `feature/sprint-14-whatsapp-tech-provider` · **Renumerado de Sprint 10 a Sprint 13 el 08-06-2026 · Renumerado de Sprint 13 a Sprint 14 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz)** (al final tras la generalización de adapters) · Migración WhatsApp del modelo manual (3 creds/tenant) a Tech Provider Meta (Embedded Signup + token sistema central + dual-mode). Plan `plans/260603-1900-sprint-10-whatsapp-tech-provider/` (8 fases) + ADR-025 (Proposed). NO toca MVP. Cuello de botella = App Review Meta (async).
>
> **Nota fila `▸ Cierre Sprint 14 (SP-15-CLOSE-1..5)` · Notas**: Sigue [Protocolo estándar de cierre](#protocolo-estándar-de-cierre-de-sprint-close-1-5--paso-6-condicional) · post-MVP: CLOSE-3 estándar · paso 7 E2E VPS condicional · paso 8 hand-off SP-4B N/A

### Lectura rápida del cuadro

- **🚀 fila** = sprint completo (versión objetivo + branch + fecha de inicio).
- **▸ fila** = bloque/fase dentro del sprint (subtotal acumulado de sus tareas hijas).
- Las **tareas individuales NO aparecen en este cuadro**. Se siguen actualizando en sus secciones detalladas `## Fase X — Sprint Y` más abajo; el agente `roadmap-keeper` propaga los agregados aquí.
- **⏱ Push** se rellena con el tiempo real al pasar tareas a 🔵; el bloque suma sus hijas y el sprint suma sus bloques.
- **⏱ Cierre** SOLO se rellena en la fila Sprint, cuando termina `SP-X-CLOSE-5` (probado + mergeado a `developer`).

---

## Fase 0 — Sprint 0: Hotfixes de seguridad

| Campo                          | Valor                                                                     |
| ------------------------------ | ------------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-1`                                                                    |
| **Versión objetivo al cierre** | `v0.1.0`                                                                  |
| **Estado del sprint**          | 🟡 En Desarrollo (25/26 dev a 🔵 · 2 diferidas pre-deploy · … _ver nota↓_ |
| **Estimación total**           | ~107h 30min (11 días lab × 10h)                                           |
| **Rama de trabajo sugerida**   | `feature/sp-0-sprint-0-hotfixes` (pushed origin 22-05-2026 … _ver nota↓_  |
| **Inicio**                     | Jue 21-05-2026 09:00                                                      |
| **Fin Est.**                   | Jue 04-06-2026 19:00                                                      |
| **Fin Real**                   | —                                                                         |
| **Horas reales DEV (a push)**  | ~6h 15min (vs 107h 30min estimadas)                                       |

> **Nota fila `Estado del sprint` · Valor**: 🟡 En Desarrollo (25/26 dev a 🔵 · 2 diferidas pre-deploy · cierre pendiente)
>
> **Nota fila `Rama de trabajo sugerida` · Valor**: `feature/sp-0-sprint-0-hotfixes` (pushed origin 22-05-2026 commit `2c9437c`)

> **Asignado a:** Javi HP (solo). Capacidad: 10h productivas/día, L-V. 11 días lab (~110h disponibles). Sin vacaciones en 2026.

### Prerequisitos del sprint

| Item                                                                              | Estado                                                                    | Ref                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ADR auditoría dependencias 20-05-2026 (next 16.2.6, axios 1.16.1, crypto removal) | ✅ Aprobado DONE_WITH_CONCERNS                                            | [plans/reports/adr-auditoria-dependencias-20260520.md](../ … _ver nota↓_ |
| Supabase local self-hosted activo (Docker)                                        | ✅ OK — Sprint 0 trabaja contra local                                     | `npm run db:up` + commit 42ba022                                         |
| Acceso Supabase del cliente en VPS Easypanel                                      | 🟡 **Diferido pre-deploy** — se prepara antes de subir a st … _ver nota↓_ | Pendiente que Javi HP obtenga acceso del cliente                         |
| Repo limpio en `developer` sincronizado origin                                    | ✅ OK                                                                     | commit 42ba022                                                           |
| Plantilla CHANGELOG.md disponible                                                 | 🔘 Pendiente verificar                                                    | —                                                                        |

> **Nota fila `ADR auditoría dependencias 20-05-2026 (n` · Ref**: [plans/reports/adr-auditoria-dependencias-20260520.md](../plans/reports/adr-auditoria-dependencias-20260520.md)
>
> **Nota fila `Acceso Supabase del cliente en VPS Easyp` · Estado**: 🟡 **Diferido pre-deploy** — se prepara antes de subir a staging, no antes de Sprint 0

### Tareas de desarrollo (Fase 0) — DETALLADAS

Origen: Top 25 Critical de [docs/audit/deep/DEEP-FINDINGS-SUMMARY.md](../docs/audit/deep/DEEP-FINDINGS-SUMMARY.md) + audit RLS multi-tenant. 22 tareas distribuidas en 4 bloques temáticos. Paralelismo posible entre bloques.

#### Bloque 1.1 — Orquestador BullMQ (bloqueante de cadencia)

| ID   | Tarea                                                                    | Estimación | Estado                   | Refs audit         | Notas                                  |
| ---- | ------------------------------------------------------------------------ | ---------- | ------------------------ | ------------------ | -------------------------------------- |
| 0-00 | Setup Playwright local + baseline tests E2E (devDependency … _ver nota↓_ | 4h         | 🔵 Subida `feature/sp-0` | DA-5 pre-requisito | ⏱ Real (a push): 45min · … _ver nota↓_ |
| 0-01 | Setup pre-push hooks (Husky/lefthook) — typecheck + lint + … _ver nota↓_ | 3h         | 🔵 Subida `feature/sp-0` | Política operativa | ⏱ Real (a push): 1h · … _ver nota↓_    |
| 1-01 | Fix `worker.js:58` firma incorrecta `executeSequenceStep` … _ver nota↓_  | 4h         | 🔵 Subida `feature/sp-0` | F-02-001 / DA-1    | ⏱ Real (a push): 30min · … _ver nota↓_ |
| 1-02 | Fix `enqueueLeadStep` — quitar silenciado errores Redis (j … _ver nota↓_ | 3h         | 🔵 Subida `feature/sp-0` | DA-1-005           | ⏱ Real (a push): 25min · … _ver nota↓_ |

> **Nota fila `0-00` · Tarea**: Setup Playwright local + baseline tests E2E (devDependency `@playwright/test`)
>
> **Nota fila `0-00` · Notas**: ⏱ Real (a push): 45min · ✅ Commit `00cc35a` 21-05-2026 — config chromium + smoke spec + 5 scripts npm
>
> **Nota fila `0-01` · Tarea**: Setup pre-push hooks (Husky/lefthook) — typecheck + lint + test + build en local
>
> **Nota fila `0-01` · Notas**: ⏱ Real (a push): 1h · ✅ Commit `a74406e` 21-05-2026 — husky + lint-staged + commit-msg + bonus 3 fixes typecheck
>
> **Nota fila `1-01` · Tarea**: Fix `worker.js:58` firma incorrecta `executeSequenceStep` — desbloquea flujo multi-día
>
> **Nota fila `1-01` · Notas**: ⏱ Real (a push): 30min · ✅ Commit `847ef79` — worker carga lead+config+sequence antes de llamar con firma `(lead, tenantId, sequence, stepIndex, config)`. typecheck+build OK. Test multi-día diferido a SP-1-CLOSE-2
>
> **Nota fila `1-02` · Tarea**: Fix `enqueueLeadStep` — quitar silenciado errores Redis (jobs perdidos sin log)
>
> **Nota fila `1-02` · Notas**: ⏱ Real (a push): 25min · ✅ Commit `662073f` — catch silencioso reemplazado por log estructurado (sin PII) + re-throw. Sin ID ficticio. 3 callers ya manejan throw. typecheck+build OK

#### Bloque 1.2 — Secretos y credenciales

| ID   | Tarea                                                                    | Estimación | Estado                     | Refs audit      | Notas                                                                    |
| ---- | ------------------------------------------------------------------------ | ---------- | -------------------------- | --------------- | ------------------------------------------------------------------------ |
| 1-03 | Rotar JWTs comprometidos en Supabase (anon + service_role)               | 2h         | 🟡 **DIFERIDA pre-deploy** | F-05-SEC-001    | **100% VPS** — no hay parte local-aplicable: el Supabase l … _ver nota↓_ |
| 1-04 | Quitar JWTs hardcodeados de 10 puntos del código fuente                  | 6h         | 🔵 Subida `feature/sp-0`   | F-04-002 / DA-2 | ⏱ Real (a push): 50min · … _ver nota↓_                                   |
| 1-05 | Cambio password Postgres default `postgres:postgres`                     | 1h         | 🟡 **DIFERIDA pre-deploy** | R-023.a         | **100% VPS** — en local Postgres corre en `localhost:8200` … _ver nota↓_ |
| 1-06 | Crear usuario Postgres `app_user` con permisos limitados ( … _ver nota↓_ | 3h         | 🔵 Subida `feature/sp-0`   | R-023.a         | ⏱ Real (a push): 40min · … _ver nota↓_                                   |

> **Nota fila `1-03` · Notas**: **100% VPS** — no hay parte local-aplicable: el Supabase local ya usa JWTs distintos a los comprometidos del cliente. Tras 1-04 el código ya no tiene fallback hardcoded → la app local funciona con cualquier JWT en `.env.local`. Se cierra en sesión pre-staging
>
> **Nota fila `1-04` · Notas**: ⏱ Real (a push): 50min · ✅ Commit `d595287` — helper `src/lib/env.ts` (requireEnv/requireEnvAny) + refactor 5 archivos. `grep eyJhbGci\|FALLBACK_ src/` = 0
>
> **Nota fila `1-05` · Notas**: **100% VPS** — en local Postgres corre en `localhost:8200` no expuesto a internet (riesgo nulo). En producción es crítico cambiar password + cerrar puerto 5432. Se cierra en sesión pre-staging
>
> **Nota fila `1-06` · Tarea**: Crear usuario Postgres `app_user` con permisos limitados (no superuser)
>
> **Nota fila `1-06` · Notas**: ⏱ Real (a push): 40min · ✅ SQL `supabase/scripts/create-app-user.sql` idempotente + README. 🟢 **Apply local OK** (rol creado vía `docker exec postgres psql -U postgres`, 3 verificaciones OK: rol sin privilegios elevados / 4 permisos DML / 0 DDL). Password en `.env.local` como `APP_USER_PASSWORD`. 🟡 Apply VPS diferido pre-staging. Worker.js NO usa pg directo → 3h sin +1h. **Ajuste técnico:** removido `NOSUPERUSER/NOREPLICATION/NOBYPASSRLS` del ALTER (sólo superuser real puede setear esos; CREATE ROLE defaults ya los excluyen)

#### Bloque 1.3 — Endpoints sin autenticación

| ID   | Tarea                                                                     | Estimación | Estado                   | Refs audit          | Notas                                                                    |
| ---- | ------------------------------------------------------------------------- | ---------- | ------------------------ | ------------------- | ------------------------------------------------------------------------ |
| 1-07 | Auth en endpoints orquestación user-driven (deploy, graph, … _ver nota↓_  | 8h         | 🔵 Subida `feature/sp-0` | DA-2-001            | ⏱ Real (a push): 25min · … _ver nota↓_                                   |
| 1-08 | Auth en cron endpoints (sweep + cron/appointments/reminders)              | 4h         | 🔵 Subida `feature/sp-0` | DA-3-001 / DA-3-007 | ⏱ Real (a push): 10min · … _ver nota↓_                                   |
| 1-09 | Guard condicional `tenants.config.test*orchestrator_enable … \_ver nota↓* | 2h         | 🔵 Subida `feature/sp-0` | DA-3-003            | ⏱ Real (a push): 10min · … _ver nota↓_                                   |
| 1-10 | Cerrar `/api/admin/tenants/[id]/client-sql` (descarga SQL … _ver nota↓_   | 2h         | 🔵 Subida `feature/sp-0` | DA-2-002            | ⏱ Real (a push): 5min · `requireApiAdmin` añadido al GET · … _ver nota↓_ |
| 1-11 | Cerrar `/api/tenant/migrate` GET (sirve MIGRATION*SQL comp … \_ver nota↓* | 1h         | 🔵 Subida `feature/sp-0` | DA-2-003            | ⏱ Real (a push): 5min · GET → `requireApiAdmin`, … _ver nota↓_           |

> **Nota fila `1-07` · Tarea**: Auth en endpoints orquestación user-driven (deploy, graph, publish, workflows, calls/manual)
>
> **Nota fila `1-07` · Notas**: ⏱ Real (a push): 25min · helper `src/lib/api-auth.ts` (requireApiUser + requireTenantAccess) · graph verifica ownership vía `data.tenant_id` · commit `4da79b1`
>
> **Nota fila `1-08` · Notas**: ⏱ Real (a push): 10min · `requireCronSecret` timing-safe + `CRON_SECRET` añadido a `.env.example` · commit `4da79b1`
>
> **Nota fila `1-09` · Tarea**: Guard condicional `tenants.config.test_orchestrator_enabled` (DENY by default)
>
> **Nota fila `1-09` · Notas**: ⏱ Real (a push): 10min · `requireOrchestrationEnabled` aplicado a deploy/publish/workflows POST/calls/manual · TEMPORAL — eliminar en Fase 3 · commit `4da79b1`
>
> **Nota fila `1-10` · Tarea**: Cerrar `/api/admin/tenants/[id]/client-sql` (descarga SQL config sin auth)
>
> **Nota fila `1-10` · Notas**: ⏱ Real (a push): 5min · `requireApiAdmin` añadido al GET · commit `4da79b1`
>
> **Nota fila `1-11` · Tarea**: Cerrar `/api/tenant/migrate` GET (sirve MIGRATION_SQL completo) + POST user-auth
>
> **Nota fila `1-11` · Notas**: ⏱ Real (a push): 5min · GET → `requireApiAdmin`, POST → `requireApiUser` (SSRF cerrado en 1-22) · commit `4da79b1`

#### Bloque 1.4 — Webhooks y firmas

| ID   | Tarea                                                      | Estimación | Estado                   | Refs audit | Notas                                                         |
| ---- | ---------------------------------------------------------- | ---------- | ------------------------ | ---------- | ------------------------------------------------------------- |
| 1-12 | Validación firma webhook Retell                            | 4h         | 🔵 Subida `feature/sp-0` | DA-4-001   | ⏱ Real (a push): 8min · … _ver nota↓_                         |
| 1-13 | Validación firma Retell **tools** (cancelar/agendar citas) | 6h         | 🔵 Subida `feature/sp-0` | DA-2-007   | ⏱ Real (a push): 5min · mismo helper que 1-12 · … _ver nota↓_ |
| 1-14 | Validación HMAC WhatsApp obligatoria (no condicional)      | 2h         | 🔵 Subida `feature/sp-0` | DA-2-006   | ⏱ Real (a push): 7min · … _ver nota↓_                         |
| 1-15 | Validación firma webhook CRM (anti tenant_id spoofing)     | 6h         | 🔵 Subida `feature/sp-0` | DA-2-009   | ⏱ Real (a push): 8min · … _ver nota↓_                         |

> **Nota fila `1-12` · Notas**: ⏱ Real (a push): 8min · `verifyHmacSignature` + `verifyRetellWebhook` lee `x-retell-signature` y `RETELL_WEBHOOK_SECRET` env · commit `a17c687`
>
> **Nota fila `1-13` · Notas**: ⏱ Real (a push): 5min · mismo helper que 1-12 · el más peligroso sin auth · commit `a17c687`
>
> **Nota fila `1-14` · Notas**: ⏱ Real (a push): 7min · `WHATSAPP_APP_SECRET` ahora obligatorio · `WHATSAPP_VERIFY_TOKEN` movido a env (antes hardcoded) · commit `a17c687`
>
> **Nota fila `1-15` · Notas**: ⏱ Real (a push): 8min · `verifyCrmWebhookSignature` con secret per-tenant (`tenants.config.webhook_crm_secret`) · firma del header `x-webhook-signature` atada al tenant_id · commit `a17c687`

#### Bloque 1.5 — Privilege escalation y RLS

| ID   | Tarea                                                                    | Estimación | Estado                   | Refs audit       | Notas                                  |
| ---- | ------------------------------------------------------------------------ | ---------- | ------------------------ | ---------------- | -------------------------------------- |
| 1-16 | Fix privilege escalation via `user_metadata.is_admin` edit … _ver nota↓_ | 4h         | 🔵 Subida `feature/sp-0` | DA-2-005         | ⏱ Real (a push): 10min · … _ver nota↓_ |
| 1-17 | Verificación rol admin en `createTenant`/`deleteTenant`/`u … _ver nota↓_ | 3h         | 🔵 Subida `feature/sp-0` | DA-2-004         | ⏱ Real (a push): 6min · … _ver nota↓_  |
| 1-18 | Fix RLS tabla `tenants` (quitar policy tautológica `USING(true)`)        | 3h         | 🔵 Subida `feature/sp-0` | DA-2-010         | ⏱ Real (a push): 8min · … _ver nota↓_  |
| 1-19 | Fix RLS `knowledge_base` (quitar `app.current_tenant` dead … _ver nota↓_ | 2h         | 🔵 Subida `feature/sp-0` | F-04-004         | ⏱ Real (a push): 7min · … _ver nota↓_  |
| 1-20 | Fix `fetchCalls` — añadir filtro `tenant_id` en 4 funciones              | 4h         | 🔵 Subida `feature/sp-0` | F-04-001 / DA-2  | ⏱ Real (a push): 6min · … _ver nota↓_  |
| 1-21 | Fix IDOR `inbox.ts` 9 funciones — verificar ownership tenant             | 8h         | 🔵 Subida `feature/sp-0` | DA-2 inbox sweep | ⏱ Real (a push): 13min · … _ver nota↓_ |

> **Nota fila `1-16` · Tarea**: Fix privilege escalation via `user_metadata.is_admin` editable por usuario
>
> **Nota fila `1-16` · Notas**: ⏱ Real (a push): 10min · middleware.ts/auth.ts/api-auth.ts/tenant.ts leen+escriben `is_admin` SOLO en `app_metadata` · script `supabase/scripts/migrate-is-admin-to-app-metadata.sql` aplicado en local (1 user migrado) · commit `da64297`
>
> **Nota fila `1-17` · Tarea**: Verificación rol admin en `createTenant`/`deleteTenant`/`updateTenant`/`getTenants`
>
> **Nota fila `1-17` · Notas**: ⏱ Real (a push): 6min · helper `assertAdminAccess()` añadido a las 4 server actions · commit `da64297`
>
> **Nota fila `1-18` · Notas**: ⏱ Real (a push): 8min · migration `20260521000000_rls_tenants_hardening.sql` · SELECT por `auth_user_id`+admin / IUD solo admin · **aplicada en local** (4 CREATE POLICY OK) · 🟡 VPS pre-deploy · commit `da64297`
>
> **Nota fila `1-19` · Tarea**: Fix RLS `knowledge_base` (quitar `app.current_tenant` dead letter — nunca se setea)
>
> **Nota fila `1-19` · Notas**: ⏱ Real (a push): 7min · migration `20260521000001_rls_knowledge_base_hardening.sql` · 4 policies (S/I/U/D) ownership-based · **aplicada en local** · 🟡 VPS pre-deploy · commit `da64297`
>
> **Nota fila `1-20` · Notas**: ⏱ Real (a push): 6min · fetchCalls/getCallsByPhone/fetchIntentosByPhone/fetchWhatsappByPhone usan `getActiveTenantId` + `.eq("tenant_id", id)` · sin tenant → resultado vacío · commit `da64297`
>
> **Nota fila `1-21` · Notas**: ⏱ Real (a push): 13min · updateLeadSegment/sendManualMessage/injectMockupMessage/toggleLeadAI/assignAgentToLead/deleteLead/deleteChatHistory/deleteLeadFacts/updateLeadInfo · todas con `.eq("tenant_id", tenant.id)` + updateLeadInfo filtra tenant_id del payload · commit `da64297`

#### Bloque 1.6 — Otros críticos

| ID                               | Tarea                                                                       | Estimación      | Estado                   | Refs audit                                                                                                                             | Notas                                                              |
| -------------------------------- | --------------------------------------------------------------------------- | --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1-22                             | Fix SSRF `/api/tenant/migrate` cookie `af-tenant-url` (aña … _ver nota↓_    | 8h              | 🔵 Subida `feature/sp-0` | DA-3-002                                                                                                                               | ⏱ Real (a push): 12min · … _ver nota↓_                             |
| 1-23                             | Sanitización XSS widget embed (interpolación `id` en JS se … _ver nota↓_    | 4h              | 🔵 Subida `feature/sp-0` | DA-3-004                                                                                                                               | ⏱ Real (a push): 4min · … _ver nota↓_                              |
| 1-24                             | Update `axios@1.14.0` → `axios@1.16.1` (15 CVEs: SSRF + Pr … _ver nota↓_    | 4h              | 🔵 Subida `feature/sp-0` | DA-3-CVE-001                                                                                                                           | ⏱ Real (a push): 8min · ADR-2026-05-20 ya aprobado · … _ver nota↓_ |
| 1-25                             | Reemplazar paquete `crypto@1.0.1` DEPRECATED por built-in … _ver nota↓_     | 3h              | 🔵 Subida `feature/sp-0` | ADR-2026-05-20                                                                                                                         | ⏱ Real (a push): 3min · … _ver nota↓_                              |
| 1-26                             | Update `next@16.1.6` → `next@16.2.6` (cierre 19 CVEs incl. … _ver nota↓_    | 4h              | 🔵 Subida `feature/sp-0` | DA-3-CVE-002                                                                                                                           | ⏱ Real (a push): 30min · … _ver nota↓_                             |
| 1-27                             | \*\*Widget Chatbot Server Action — `web*widgets.allowed_doma … \_ver nota↓* | 8h              | 🔵 Subida `feature/sp-0` | Informe Renzo §3 🔴                                                                                                                    | ⏱ Real (a push): 1h 15min · … _ver nota↓_                          |
| **Subtotal Fase 0 — Desarrollo** |                                                                             | **~112h 30min** |                          | (incluye 0-00 Playwright setup 4h + 1-27 widget hardening 8h) · DEV completado a 🔵: ⏱ Real ~7h 30min · 1-03/1-05 diferidas pre-deploy |                                                                    |

> **Nota fila `1-22` · Tarea**: Fix SSRF `/api/tenant/migrate` cookie `af-tenant-url` (añadir allowlist)
>
> **Nota fila `1-22` · Notas**: ⏱ Real (a push): 12min · URL+key del Supabase del tenant resueltas DESDE DB (no de cookie) usando `esden-tenant-id` · gate `requireApiAdmin` · `isAllowedTenantUrl()` bloquea loopback/RFC1918 (override en dev con `ALLOW_INTERNAL_TENANT_URLS=true`) · commit `2c9437c`
>
> **Nota fila `1-23` · Tarea**: Sanitización XSS widget embed (interpolación `id` en JS servido a terceros)
>
> **Nota fila `1-23` · Notas**: ⏱ Real (a push): 4min · validación regex UUID estricta antes de interpolar · `id`+`baseUrl` inyectados vía `JSON.stringify` (corte de escape imposible) · 400 si formato inválido · commit `2c9437c`
>
> **Nota fila `1-24` · Tarea**: Update `axios@1.14.0` → `axios@1.16.1` (15 CVEs: SSRF + Prototype Pollution)
>
> **Nota fila `1-24` · Notas**: ⏱ Real (a push): 8min · ADR-2026-05-20 ya aprobado · `npm install` OK · ajuste tipos `AxiosHeaderValue` en WhatsAppWebhookProcessor (content-type normalizado a string\|undefined) · commit `2c9437c`
>
> **Nota fila `1-25` · Tarea**: Reemplazar paquete `crypto@1.0.1` DEPRECATED por built-in `node:crypto`
>
> **Nota fila `1-25` · Notas**: ⏱ Real (a push): 3min · grep `from 'crypto'` en src/ + worker.js = 0 ocurrencias · paquete removido limpio de `package.json` · helpers HMAC ya usan `node:crypto` explícito · commit `2c9437c`
>
> **Nota fila `1-26` · Tarea**: Update `next@16.1.6` → `next@16.2.6` (cierre 19 CVEs incl. middleware bypass)
>
> **Nota fila `1-26` · Notas**: ⏱ Real (a push): 30min · ✅ Commit `1ce8e0b` 21-05-2026 — `next@16.2.6` + `eslint-config-next@16.2.6` + ADR-002 documentado. typecheck/build limpios. Smoke test diferido a SP-1-CLOSE-2
>
> **Nota fila `1-27` · Tarea**: **Widget Chatbot Server Action — `web_widgets.allowed_domains` + rate limit + Origin/Referer check** (cierra API abierta sin CORS/whitelisting)
>
> **Nota fila `1-27` · Notas**: ⏱ Real (a push): 1h 15min · Migración `20260522000000_widget_hardening_allowed_domains_rate_limit.sql` (allowed_domains text[], rate_limit_per_minute int, CHECK constraint) **aplicada en local** · helpers `src/lib/api/validate-widget-origin.ts` (wildcards + modo legacy) y `src/lib/api/rate-limit-widget.ts` (sliding window Redis con `lazyConnect` + fallback ALLOW si Redis caído) · `widget.ts:getChatbotResponse` aplica guards al inicio · `WebWidget` type extendido · typecheck/lint/build OK (0 errores nuevos). Fuente: `docs/Informes de programacion/Reporte-Modulo-Chatbot-Web-Renzo-V1.pdf` §3 🔴

> Aplazados a Fase 1: cifrar Google OAuth tokens (DA-3-006, L).
> **Nota:** 2-27 (update Next.js, DA-3-CVE-002) MOVIDA a Sprint 0 como **1-26** tras hallazgo en auditoría ADR del 20-05-2026 (el middleware bypass anula efectivamente los hotfixes de auth 1-07, 1-08, 1-16).
> **Nota (22-05-2026):** 1-27 AÑADIDA tras informe técnico de Renzo sobre el Módulo de Chatbot Web. Vulnerabilidad crítica: el Server Action `getChatbotResponse` es accesible desde cualquier dominio sin rate limit. Mismo patrón de fix que 1-22 (allowlist dinámica por tenant) extendido a `web_widgets.allowed_domains`. Otras 5 mejoras del informe (no bloqueantes) repartidas en Sprint 1 (2-35..2-37) y Sprint 3 (4-08, 4-09).

### Tareas de cierre obligatorias (Sprint 0)

> Estas 5 tareas SE EJECUTAN AL FINAL DE CADA SPRINT. Plantilla copiada para todos los sprints.

| ID                           | Tarea                                                                      | Estimación                     | Estado                   | Notas                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------ |
| SP-1-CLOSE-1                 | **Auto test** — `npm run typecheck` + `npm run lint` + `np … _ver nota↓_   | 1h 30min                       | 🟡 DONE_WITH_CONCERNS    | ⏱ Real: ~30min · typecheck 0 errores ✅ · … _ver nota↓_                  |
| SP-1-CLOSE-2                 | **Test E2C Local** — Abrir browser con Playwright, … _ver nota↓_           | 2h 30min                       | 🔵 Subida `feature/sp-0` | ⏱ Real: ~45min · … _ver nota↓_                                           |
| SP-1-CLOSE-3                 | \*\*Reemplazado por: análisis cruzado docs Bea (clienta) + R … _ver nota↓_ | 2h                             | 🟢 Completada            | Reporte: [`plans/reports/sp-1-close-3-analisis-docs-client … _ver nota↓_ |
| SP-1-CLOSE-4                 | **Corrección de Bugs y cambios detectados** — Subtareas di … _ver nota↓_   | (variable)                     | 🟢 Completada            | 2 bugs cerrados detectados en CLOSE-2: BUG-001 logout → `a … _ver nota↓_ |
| SP-1-CLOSE-5                 | **Cierre de Sprint** — PR `feature/sp-0-sprint-0-hotfixes` … _ver nota↓_   | 1h                             | 🟢 Completada            | ✅ **MERGED via PR #2** (commit `a387dfe`). … _ver nota↓_                |
| **Subtotal cierre Sprint 0** |                                                                            | **5h 30min + Corrección bugs** |                          |                                                                          |

> **Nota fila `SP-1-CLOSE-1` · Tarea**: **Auto test** — `npm run typecheck` + `npm run lint` + `npm run build` + `npm test` (unit + integration). Reporte de coverage.
>
> **Nota fila `SP-1-CLOSE-1` · Notas**: ⏱ Real: ~30min · typecheck 0 errores ✅ · build 41 páginas OK ✅ · **lint 128 errores + 23 warnings preexistentes (mejora -36 vs baseline 164)** ❌ no bloquea · sin tests unit/integration (no definidos) · Reporte: [`plans/reports/sp-1-close-1-auto-test-20260522.md`](reports/sp-1-close-1-auto-test-20260522.md)
>
> **Nota fila `SP-1-CLOSE-2` · Tarea**: **Test E2C Local** — Abrir browser con Playwright, recorrer flujos implementados, validar visual + diseño + **WCAG 2.2 AA**. Generar reporte con screenshots de pasos clave + findings de accesibilidad.
>
> **Nota fila `SP-1-CLOSE-2` · Notas**: ⏱ Real: ~45min · **24/24 E2E PASS** (16 security gates + 2 core smoke + 6 smoke flows) · WCAG findings: /login 3 (1 serious, 2 moderate), /dashboard 2 (1 serious, 1 moderate) · 2 bugs críticos detectados y **ya corregidos en este push** (BUG-001 logout no redirige → `auth.ts` redirect; BUG-002 viewer accede /admin → `middleware.ts` extiende guard). Tests nuevos: [`tests/e2e/sprint-0-close/smoke-flows.spec.ts`](../tests/e2e/sprint-0-close/smoke-flows.spec.ts) · Reporte: [`plans/reports/sp-1-close-2-e2c-playwright-wcag-20260522.md`](reports/sp-1-close-2-e2c-playwright-wcag-20260522.md)
>
> **Nota fila `SP-1-CLOSE-3` · Tarea**: **Reemplazado por: análisis cruzado docs Bea (clienta) + Renzo V1** (Javi HP, 22-05-2026). El manual humano del Sprint 0 lo absorbe SP-4B phase-01 bloque 4 (Renzo). Decisión 22-05-2026: a partir de Sprint 1, **todos los CLOSE-3 manuales se difieren a SP-4B**.
>
> **Nota fila `SP-1-CLOSE-3` · Notas**: Reporte: [`plans/reports/sp-1-close-3-analisis-docs-clienta-renzo-20260522.md`](reports/sp-1-close-3-analisis-docs-clienta-renzo-20260522.md) · output: 13 tareas NEW-01..NEW-13 + Sprint 2B + Sprint Refinamiento post-MVP + Simulator/`/calls` fuera del MVP
>
> **Nota fila `SP-1-CLOSE-4` · Tarea**: **Corrección de Bugs y cambios detectados** — Subtareas dinámicas: una por cada bug/cambio que reporte el dev. Cada subtarea con su propio estado.
>
> **Nota fila `SP-1-CLOSE-4` · Notas**: 2 bugs cerrados detectados en CLOSE-2: BUG-001 logout → `auth.ts:108` `redirect('/login')`. BUG-002 viewer→admin → `middleware.ts:65` extiende guard a `/admin`. CLOSE-3 reemplazado por análisis docs (no aportó bugs adicionales)
>
> **Nota fila `SP-1-CLOSE-5` · Tarea**: **Cierre de Sprint** — PR `feature/sp-0-sprint-0-hotfixes` → `developer`. Tras merge: bump SemVer a `v0.1.0`, invitar al dev a tomar siguiente sprint, crear rama `feature/sprint-01-capa-datos`. **Incluye hand-off a SP-4B phase-01** ✅ (plantilla rellenada).
>
> **Nota fila `SP-1-CLOSE-5` · Notas**: ✅ **MERGED via PR #2** (commit `a387dfe`). Rama Sprint 1 `feature/sprint-01-capa-datos` creada y ya cerrada con su propio sprint.

### Pre-requisitos del cierre (gates obligatorios)

Para que `SP-1-CLOSE-5` pueda arrancar, **TODAS** estas condiciones deben estar a 🟢:

- [ ] Todas las tareas de desarrollo del sprint en estado 🟢 o 🔵.
- [ ] `SP-1-CLOSE-1` Auto test 🟢 con 0 errores.
- [ ] `SP-1-CLOSE-2` E2C Local 🟢 sin findings WCAG críticos.
- [x] `SP-1-CLOSE-3` ✅ Reemplazado por reporte análisis cruzado docs Bea + Renzo V1 (22-05-2026). Manual humano absorbido por SP-4B phase-01.
- [ ] `SP-1-CLOSE-4` Bugs detectados 🟢 (sin subtareas abiertas).
- [ ] `CHANGELOG.md` con entrada `## [v0.1.0]` completa (gatekeeper `af-agents:deployment`).
- [ ] `help-docs-keeper` actualizó secciones de ayuda afectadas, todas en 🟢 Completada.

---

## Fase 1 — Sprint 1: Capa de datos (sin ORM nuevo)

| Campo                          | Valor                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-2`                                                                                 |
| **Versión objetivo al cierre** | `v0.2.0`                                                                               |
| **Estado del sprint**          | 🟢 Completada (merged a `developer` vía PR #5, commit `94c035a`)                       |
| **Estimación total**           | ~205h estim (con paralelismo 2-3 devs ~3-4 sem) · ⏱ Real: ~12h (orquestación 1 sesión) |
| **Rama de trabajo**            | `feature/sprint-01-capa-datos` (16 commits)                                            |
| **Inicio**                     | Vie 22-05-2026 19:00 (adelantado vs estim Vie 05-06)                                   |
| **Fin Est.**                   | Mar 30-06-2026 19:00                                                                   |
| **Fin Real**                   | Vie 22-05-2026 23:41 (merge PR #5)                                                     |

> **Asignado a:** Javi HP (solo). 18 días lab × 10h/día = 180h.

### Tareas de desarrollo (Fase 1) — DETALLADAS

> Capa de datos consolidada con `@supabase/ssr` + Zod + Repository pattern + RLS hardening. **SIN ORM nuevo**. Origen: decisión `project_stack_data_layer.md` + plan `plans/20260519-1200-rls-multitenant-hardening/`.

> **Cierre Sprint 1 (22-05-2026):** ver [`plans/260520-1342-sprint-1-capa-datos/SP-2-CLOSE-summary.md`](260520-1342-sprint-1-capa-datos/SP-2-CLOSE-summary.md) para el resumen ejecutivo de tareas cerradas, diferidas (ADR-018, ADR-019) y hand-off SP-4B. Estados actualizados representativamente abajo; el detalle completo está en el summary + ADRs.

#### Bloque 2.1 — Unificación cliente Supabase

> **⏱ Real Bloque: 1h 33min** (proporcional a 19h estim / 146.5h total · ~12h sprint). Sprint 1 legacy: Push = Cierre = Real (sin fixes post-merge).

| ID   | Tarea                                                                    | Estimación | ⏱ Real | Estado                | Notas                                                                    |
| ---- | ------------------------------------------------------------------------ | ---------- | ------ | --------------------- | ------------------------------------------------------------------------ |
| 2-01 | Auditar TODOS los usos directos `pg` / `postgres` / `postg … _ver nota↓_ | 4h         | ~20min | 🟢 Completada         | Reporte `plans/reports/sp-2-01-audit-clients-supabase-2026 … _ver nota↓_ |
| 2-02 | Refactor: mover queries directas `pg`/`postgres` a `@supab … _ver nota↓_ | 12h        | ~58min | 🟢 Completada parcial | 2-02.a upgrade Supabase ssr 0.10.3 + supabase-js 2.106.1 ( … _ver nota↓_ |
| 2-03 | Eliminar JWTs `service_role` residuales (los que sobrevivi … _ver nota↓_ | 3h         | ~15min | 🟢 Completada parcial | 3 services cleanup. Commit `ccd6a50`. … _ver nota↓_                      |

> **Nota fila `2-01` · Tarea**: Auditar TODOS los usos directos `pg` / `postgres` / `postgres-js` en `src/`
>
> **Nota fila `2-01` · Notas**: Reporte `plans/reports/sp-2-01-audit-clients-supabase-20260522.md`. Commit `837e12f`
>
> **Nota fila `2-02` · Tarea**: Refactor: mover queries directas `pg`/`postgres` a `@supabase/ssr` (cliente unificado)
>
> **Nota fila `2-02` · Notas**: 2-02.a upgrade Supabase ssr 0.10.3 + supabase-js 2.106.1 (ADR-016) commit `3c2dd77`. 2-02.b refactor DI services parcial (chat-memory, appointment-service, ai-analysis) commit `ccd6a50`. Resto diferido a ADR-019
>
> **Nota fila `2-03` · Tarea**: Eliminar JWTs `service_role` residuales (los que sobrevivieron Sprint 0)
>
> **Nota fila `2-03` · Notas**: 3 services cleanup. Commit `ccd6a50`. Resto en cron/webhooks/processors diferido a ADR-019

#### Bloque 2.2 — Schemas Zod

> **⏱ Real Bloque: 2h 3min** (proporcional a 25h estim / 146.5h total). Commits clave: `588a5e3` schemas + `9f1fbca` lint fix.

| ID   | Tarea                                                                     | Estimación | ⏱ Real | Estado        | Notas                                                               |
| ---- | ------------------------------------------------------------------------- | ---------- | ------ | ------------- | ------------------------------------------------------------------- |
| 2-04 | Estructura `src/lib/schemas/` + base helpers Zod (uuid, … _ver nota↓_     | 4h         | ~20min | 🟢 Completada | src/lib/schemas/\_base.ts + barrel                                  |
| 2-05 | Zod schemas: `leads` (cruzar con `VARIABLES DEFINIDAS` cliente)           | 4h         | ~20min | 🟢 Completada | src/lib/schemas/leads.ts                                            |
| 2-06 | Zod schemas: `tenants` + `tenant_members`                                 | 2h         | ~10min | 🟢 Completada | src/lib/schemas/tenants.ts                                          |
| 2-07 | Zod schemas: `programs` / `courses`                                       | 2h         | ~10min | 🟢 Completada | src/lib/schemas/programs.ts                                         |
| 2-08 | Zod schemas: `appointments` + `calls`                                     | 3h         | ~15min | 🟢 Completada | src/lib/schemas/appointments.ts                                     |
| 2-09 | Zod schemas: `ai_agents` / `ai_agent_variants` / `prompts`                | 3h         | ~15min | 🟢 Completada | src/lib/schemas/ai-agents.ts (ModelNameSchema 2-35)                 |
| 2-10 | Zod schemas: `knowledge_base` / `chat_memory` / `chat_summary`            | 2h         | ~10min | 🟢 Completada | src/lib/schemas/knowledge-base.ts                                   |
| 2-11 | Zod schemas: `integrations` / `webhooks` / `crm*field_mapp … \_ver nota↓* | 3h         | ~15min | 🟢 Completada | src/lib/schemas/integrations.ts (prep Fase 2)                       |
| 2-35 | Zod `ai_agent_variants.model_name` whitelist (`z.enum([... … _ver nota↓_  | 2h         | ~10min | 🟢 Completada | ModelNameSchema enforced. Parche widget.ts eliminado. … _ver nota↓_ |

> **Nota fila `2-04` · Tarea**: Estructura `src/lib/schemas/` + base helpers Zod (uuid, timestamps, enums comunes)
>
> **Nota fila `2-11` · Tarea**: Zod schemas: `integrations` / `webhooks` / `crm_field_mapping` / `crm_write_audit`
>
> **Nota fila `2-35` · Tarea**: Zod `ai_agent_variants.model_name` whitelist (`z.enum([...])`) + migración de `gpt-4.1` huérfanos → `gpt-4o` + **eliminar parche `widget.ts:150`**
>
> **Nota fila `2-35` · Notas**: ModelNameSchema enforced. Parche widget.ts eliminado. Migración SQL aplicada

#### Bloque 2.3 — Repository pattern

> **⏱ Real Bloque: 2h 32min** (proporcional a 31h estim / 146.5h total). Commit clave: `7324129` (7 repositorios en un solo commit).

| ID   | Tarea                                                                    | Estimación | ⏱ Real | Estado        | Notas                                                 |
| ---- | ------------------------------------------------------------------------ | ---------- | ------ | ------------- | ----------------------------------------------------- |
| 2-12 | Estructura `src/lib/repositories/` + interface base + help … _ver nota↓_ | 4h         | ~20min | 🟢 Completada | src/lib/repositories/\_base-repository.ts             |
| 2-13 | Repository: `leads`                                                      | 6h         | ~30min | 🟢 Completada | leads-repository.ts con findByExternalId + softDelete |
| 2-14 | Repository: `tenants`                                                    | 4h         | ~20min | 🟢 Completada | tenants-repository.ts                                 |
| 2-15 | Repository: `appointments` + `calls`                                     | 5h         | ~25min | 🟢 Completada | appointments + Calls + Attempts repos                 |
| 2-16 | Repository: `ai_agents` (+ variants)                                     | 4h         | ~20min | 🟢 Completada | ai-agents + variants + voice repos                    |
| 2-17 | Repository: `knowledge_base` + `chat_memory`                             | 5h         | ~25min | 🟢 Completada | knowledge-base + embeddings + chat-messages repos     |
| 2-18 | Repository: `integrations` + webhooks                                    | 3h         | ~15min | 🟢 Completada | integrations + field-mapping + write-audit + webhooks |

> **Nota fila `2-12` · Tarea**: Estructura `src/lib/repositories/` + interface base + helpers tenant-scoped

#### Bloque 2.4 — Refactor queries existentes (paralelizable)

> **⏱ Real Bloque: 0** (todas las tareas diferidas a ADR-019 / Sprint Costes-LLM). No se invirtió tiempo en Sprint 1.

| ID   | Tarea                                                                     | Estimación | ⏱ Real | Estado      | Notas                                                     |
| ---- | ------------------------------------------------------------------------- | ---------- | ------ | ----------- | --------------------------------------------------------- |
| 2-19 | Refactor: mover queries de `src/app/api/**/*.ts` a repositorios           | 8h         | 0      | 🟢 Diferida | ADR-019 migración incremental. Código nuevo usa repos     |
| 2-20 | Refactor: mover queries de server actions `src/lib/actions … _ver nota↓_  | 6h         | 0      | 🟢 Diferida | ADR-019. 57 queries en actions/ a migrar incrementalmente |
| 2-21 | Refactor: mover queries de `worker.js` + processors a repositorios        | 4h         | 0      | 🟢 Diferida | ADR-019. Worker + processors a migrar incrementalmente    |
| 2-36 | Persistir `token_usage` (`completion.usage`) en `chat*mess … \_ver nota↓* | 2h         | 0      | 🟢 Diferida | MOVIDA a Sprint Costes-LLM post-MVP                       |

> **Nota fila `2-20` · Tarea**: Refactor: mover queries de server actions `src/lib/actions/` a repositorios
>
> **Nota fila `2-36` · Tarea**: Persistir `token_usage` (`completion.usage`) en `chat_messages.metadata` para TODOS los consumidores OpenAI (WhatsAppAIProcessor, RescueWorker, **WidgetAction**, FactExtractor)

#### Bloque 2.5 — Type safety y limpieza

> **⏱ Real Bloque: 5min** (solo 2-37 completada; 2-22 diferida = 0). Commit clave: `f490945` (compartido con ADR-019 doc).

| ID   | Tarea                                                                    | Estimación | ⏱ Real | Estado        | Notas                                                    |
| ---- | ------------------------------------------------------------------------ | ---------- | ------ | ------------- | -------------------------------------------------------- |
| 2-22 | Limpieza `as any` / `as unknown` — usar tipos derivados Zo … _ver nota↓_ | 16h        | 0      | 🟢 Diferida   | ADR-019. 426 as any baseline. Sprint v0.5.4 candidate    |
| 2-37 | Reemplazar `console.log`/`console.error` con `widgetId`+`l … _ver nota↓_ | 1h         | ~5min  | 🟢 Completada | src/lib/utils/logger.ts scrubbing PII. widget.ts migrado |

> **Nota fila `2-22` · Tarea**: Limpieza `as any` / `as unknown` — usar tipos derivados Zod via `z.infer`
>
> **Nota fila `2-37` · Tarea**: Reemplazar `console.log`/`console.error` con `widgetId`+`leadId`+payload en `widget.ts:30` y server actions críticas por logger estructurado con scrubbing PII

#### Bloque 2.6 — RLS hardening complementario

> **⏱ Real Bloque: 1h 33min** (proporcional a 19h estim / 146.5h total). Commit clave: `f11bebf` (RLS + crypto en un solo commit).

| ID   | Tarea                                                                      | Estimación | ⏱ Real | Estado        | Notas                                                                    |
| ---- | -------------------------------------------------------------------------- | ---------- | ------ | ------------- | ------------------------------------------------------------------------ |
| 2-23 | Fix RLS `ai_agents` / `ai_agent_variants` tautológica (no … _ver nota↓_    | 3h         | ~15min | 🟢 Completada | Migración 20260522220000 ai_agents RLS owner_or_admin                    |
| 2-24 | Fix RLS `web_widgets` (devuelve todos los tenants)                         | 2h         | ~10min | 🟢 Completada | Migración 20260522220001 web_widgets RLS owner_or_admin                  |
| 2-25 | Fix `getPrograms` — añadir filtro tenant (expone programas … _ver nota↓_   | 2h         | ~10min | 🟢 Completada | Migración 20260522220002 programas RLS owner_or_admin                    |
| 2-26 | Cifrar Google OAuth tokens en JSONB (no plano)                             | 12h        | ~58min | 🟢 Completada | AES-256-GCM token-crypto.ts + tabla integrations + ENCRYPT … _ver nota↓_ |
| 2-27 | ~~Update next@16.1.6~~ \*\*MOVIDA a Sprint 0 como 1-26 (tras … _ver nota↓_ | ~~6h~~ —   | —      | ✅ Reasignada | Ver fila 1-26                                                            |

> **Nota fila `2-23` · Tarea**: Fix RLS `ai_agents` / `ai_agent_variants` tautológica (no filtra por tenant)
>
> **Nota fila `2-25` · Tarea**: Fix `getPrograms` — añadir filtro tenant (expone programas de todos los clientes)
>
> **Nota fila `2-26` · Notas**: AES-256-GCM token-crypto.ts + tabla integrations + ENCRYPTION_KEY. ADR-017
>
> **Nota fila `2-27` · Tarea**: ~~Update next@16.1.6~~ **MOVIDA a Sprint 0 como 1-26 (tras audit ADR 20-05-2026)**

#### Bloque 2.7 — Testing y documentación

> **⏱ Real Bloque: 1h 19min** (proporcional a 16h estim / 146.5h total). Commit clave: `226be31` (Vitest + 58 tests).

| ID   | Tarea                                                                    | Estimación | ⏱ Real | Estado                | Notas                                                             |
| ---- | ------------------------------------------------------------------------ | ---------- | ------ | --------------------- | ----------------------------------------------------------------- |
| 2-28 | Tests de integración con BD real (NO mocks) para repositor … _ver nota↓_ | 12h        | ~59min | 🟢 Completada parcial | Vitest + 58 unit tests + 4 integration skip-by-env. E2E SP-4B     |
| 2-29 | Documentar capa de datos en `docs/architecture/data-layer. … _ver nota↓_ | 4h         | ~20min | 🟢 Completada         | docs/architecture/data-layer.md sección 6 + SP-2-CLOSE-summary.md |

> **Nota fila `2-28` · Tarea**: Tests de integración con BD real (NO mocks) para repositorios principales
>
> **Nota fila `2-29` · Tarea**: Documentar capa de datos en `docs/architecture/data-layer.md` (refresh completo)

#### Bloque 2.8 — Hardening de dependencias (hallazgos ADR audit 2026-05-20)

> **⏱ Real Bloque: 39min** (solo 2-30 + 2-33 completadas = 8h estim de 20h totales; 2-31/32/34 diferidas = 0). Commit clave: `8c800fc`.

| ID                               | Tarea                                                                    | Estimación | ⏱ Real         | Estado        | Notas                                                                         |
| -------------------------------- | ------------------------------------------------------------------------ | ---------- | -------------- | ------------- | ----------------------------------------------------------------------------- |
| 2-30                             | Crear hook `af-productivity-logger.cjs` para automatizar t … _ver nota↓_ | 6h         | ~29min         | 🟢 Completada | Spike Path B + af-productivity-logger.cjs híbrido + hooks.json                |
| 2-31                             | Update `lucide-react@0.575` → `lucide-react@1.x` (major — … _ver nota↓_  | 4h         | 0              | 🟢 Diferida   | ADR-018 post-MVP v0.6.x                                                       |
| 2-32                             | Update `shadcn@3.x` → `shadcn@4.x` (major — revisar compon … _ver nota↓_ | 6h         | 0              | 🟢 Diferida   | ADR-018 post-MVP v0.6.x (shadcn 4 requiere Tailwind 4)                        |
| 2-33                             | Alinear `@types/node@^20` con runtime Node 24                            | 2h         | ~10min         | 🟢 Completada | @types/node ^20 -> ^24.12.4                                                   |
| 2-34                             | Investigar update `eslint@9` → `eslint@10` (bloqueado por … _ver nota↓_  | 2h         | 0              | 🟢 Diferida   | ADR-018 research-only. Bloqueado por eslint-config-next                       |
| **Subtotal Fase 1 — Desarrollo** |                                                                          | **~179h**  | **~11h 38min** |               | Real efectivo = ~12h sprint total · cobertura 13 bloques (incl. 2.9) + cierre |

> **Nota fila `2-30` · Tarea**: Crear hook `af-productivity-logger.cjs` para automatizar tracking de tiempos
>
> **Nota fila `2-31` · Tarea**: Update `lucide-react@0.575` → `lucide-react@1.x` (major — testing visual iconos)
>
> **Nota fila `2-32` · Tarea**: Update `shadcn@3.x` → `shadcn@4.x` (major — revisar componentes y theme)
>
> **Nota fila `2-34` · Tarea**: Investigar update `eslint@9` → `eslint@10` (bloqueado por eslint-config-next peer dep)

> **Nota (22-05-2026):** 2-35 (Zod model_name whitelist), 2-36 (token_usage TODOS los consumidores OpenAI) y 2-37 (logger estructurado widget) AÑADIDAS tras informe técnico de Renzo sobre el Módulo de Chatbot Web. Encajan en los bloques 2.2, 2.4 y 2.5 respectivamente sin afectar la planificación de fechas (delta +5h sobre 172h base). Fuente: `docs/Informes de programacion/Reporte-Modulo-Chatbot-Web-Renzo-V1.pdf`.

#### Bloque 2.9 — Fix bugs Renzo + reqs Bea (NUEVO, AÑADIDO POST-AUDIT 22-05-2026)

> **⏱ Real Bloque: 1h 53min** (proporcional a 23h estim efectivo / 146.5h total). Detalle en [`plans/260520-1342-sprint-1-capa-datos/phase-09-fix-bugs-renzo-y-reqs-bea.md`](260520-1342-sprint-1-capa-datos/phase-09-fix-bugs-renzo-y-reqs-bea.md).

| ID     | Tarea                                                                     | Estimación              | ⏱ Real | Estado                | Notas                                                                     |
| ------ | ------------------------------------------------------------------------- | ----------------------- | ------ | --------------------- | ------------------------------------------------------------------------- |
| NEW-01 | Fix `saveOrchestratorConfig` (paso 2 efectivo · … _ver nota↓_             | 3h efectivo (paso 3 0h) | ~15min | 🟢 Completada parcial | Commit `837e12f`. … _ver nota↓_                                           |
| NEW-02 | Enum unificado `LeadStageEnum` + estado `UNREACHABLE` + re … _ver nota↓_  | 6h                      | ~30min | 🟢 Completada         | Commit `7b6d7af`                                                          |
| NEW-06 | Modelo oportunidades múltiples + dedup 48h (tabla `lead*op … \_ver nota↓* | 10h                     | ~49min | 🟢 Completada         | Commit `4c58c5b` + migración `20260522230000_lead_opportunities.sql`      |
| NEW-13 | Política unificada handoff humano (ADR-014, `handoff.ts`, … _ver nota↓_   | 4h                      | ~20min | 🟢 Completada         | Commit `d9545d9` + migración `20260522200000*lead_unreacha … \_ver nota↓* |

> **Nota fila `NEW-01` · Tarea**: Fix `saveOrchestratorConfig` (paso 2 efectivo · paso 3 consolidación tablas orquestador DIFERIDO a v0.5.3 post-MVP, ADR-015)
>
> **Nota fila `NEW-01` · Notas**: Commit `837e12f`. Paso 3 (~24h reales estim) movido a v0.5.3 por incumplir alcance del sprint
>
> **Nota fila `NEW-02` · Tarea**: Enum unificado `LeadStageEnum` + estado `UNREACHABLE` + refactor 6 ficheros (replace literal → enum, sigue 2.2 Zod)
>
> **Nota fila `NEW-06` · Tarea**: Modelo oportunidades múltiples + dedup 48h (tabla `lead_opportunities`, repository, ingest integration, sigue 2.3 Repository)
>
> **Nota fila `NEW-13` · Tarea**: Política unificada handoff humano (ADR-014, `handoff.ts`, columnas `unreachable_reason`+`contact_attempts`, migración SQL)
>
> **Nota fila `NEW-13` · Notas**: Commit `d9545d9` + migración `20260522200000_lead_unreachable_handoff_policy.sql`

### Tareas de cierre obligatorias (Sprint 1)

> **⏱ Real Cierre: 22min** (proporcional a 4h 30min estim / 146.5h total). Commits: `e28d8f6` + `6140d06` + `019c548` + merge PR #5 `94c035a`.

| ID                           | Tarea                                                                       | Estimación          | ⏱ Real     | Estado                | Notas                                                               |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------- | ---------- | --------------------- | ------------------------------------------------------------------- |
| SP-2-CLOSE-1                 | Auto test                                                                   | 1h 30min            | ~7min      | 🟢 Completada         | typecheck OK / lint baseline / build 41 rutas / 58 tests OK         |
| SP-2-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA                                                | 2h 30min            | ~12min     | 🟢 Completada parcial | Smoke tests crypto + hook OK. E2E SP-4B                             |
| ~~SP-2-CLOSE-3~~             | ~~Test Manual del Dev~~ — \*\*DIFERIDO a 👤 SP-4B phase-02 bl … _ver nota↓_ | (0h aquí)           | 0          | 🟢 Diferida           | Decisión 22-05-2026. Hand-off documentado en SP-2-CLOSE-5           |
| SP-2-CLOSE-4                 | Corrección de Bugs detectados                                               | (variable)          | ~2min      | 🟢 Completada         | Lint fixes aplicados (commit 9f1fbca + ccd6a50)                     |
| SP-2-CLOSE-5                 | Cierre de Sprint → PR a `developer` + bump a `v0.2.0` + cr … _ver nota↓_    | 1h                  | ~1min      | 🟢 Completada         | Hand-off phase-02 rellenado. PR #5 mergeado a developer (`94c035a`) |
| **Subtotal cierre Sprint 1** |                                                                             | **5h 30min + bugs** | **~22min** |                       | Sprint 1 legacy: Push = Cierre (sin fixes post-merge)               |

> **Nota fila `~~SP-2-CLOSE-3~~` · Tarea**: ~~Test Manual del Dev~~ — **DIFERIDO a 👤 SP-4B phase-02 bloque 4** (Renzo + equipo). El hand-off en SP-2-CLOSE-5 rellena la plantilla.
>
> **Nota fila `SP-2-CLOSE-5` · Tarea**: Cierre de Sprint → PR a `developer` + bump a `v0.2.0` + crear rama Sprint 2 + **hand-off a SP-4B phase-02** (rellenar plantilla)

---

## Fase 2 — Sprint 2: Adapter layer + 2 CRMs (MVP)

| Campo                          | Valor                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-3`                                                                                |
| **Versión objetivo al cierre** | `v0.2.7` (final con hotfix BUG-2-01 — bumpeada desde v0.2.5)                          |
| **Estado del sprint**          | 🟢 COMPLETADA (mergeado a developer 24-05-2026 19:55)                                 |
| **Estimación total**           | **74h** secuencial · ~**52h** con paralelismo Phase 02‖03‖04 (refinada tras research) |
| **Rama de trabajo**            | `feature/sprint-02-adapter-hubspot-zoho` (pusheada + PR #1 … _ver nota↓_              |
| **Inicio**                     | 24-05-2026 14:00                                                                      |
| **Fin Est.**                   | 27-05-2026 (5-6 días lab con paralelismo)                                             |
| **Fin Real**                   | 24-05-2026 19:55                                                                      |
| **Plan detallado**             | [`plans/260524-1330-sprint-2-adapter-hubspot-zoho/`](26052 … _ver nota↓_              |
| **⏱ Push (sprint)**            | ~40min                                                                                |
| **⏱ Cierre (sprint)**          | ~3h 15min (total incluyendo BUG-2-01 + releases + Node 22 planning)                   |

> **Nota fila `Rama de trabajo` · Valor**: `feature/sprint-02-adapter-hubspot-zoho` (pusheada + PR #12 mergeado `a826fd6`)
>
> **Nota fila `Plan detallado` · Valor**: [`plans/260524-1330-sprint-2-adapter-hubspot-zoho/`](260524-1330-sprint-2-adapter-hubspot-zoho/plan.md) (9 archivos)

> **Asignado a:** Javi HP (solo, orquestación + dev). **Refinado 24-05-2026** tras 3 researchers (HubSpot v3, Zoho multi-DC, adapter pattern): estim original 148-169h reducida a 74h gracias a (a) Sprint 1 ya entregó token-crypto + base integrations table, (b) Zoho ya tiene adapter funcional → solo bugfixes, (c) HubSpot = fetch puro sin SDK.

> **Decisiones cliente (24-05-2026):** HubSpot = Public App OAuth, 1 CRM activo/tenant (`UNIQUE(tenant_id)`), scope MVP = HubSpot+Zoho+UI+audit+tests. Sheets/Salesforce → Fase 4.

### Bloques (tracking fino — política CLAUDE.md Sprint 2+)

| Bloque                         | Contenido                                                                 | Estim   | Estado        | ⏱ Push | ⏱ Cierre | Plan file                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- | ------- | ------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.0** Setup                  | env vars (OAUTH*STATE_SECRET, HUBSPOT*\_, … _ver nota↓_                   | 2h      | 🟢 Completada | ~1min  | ~5min    | [phase-00](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.1** Foundation             | ICRMProvider ampliado + migration integrations + TokenMana … _ver nota↓_  | 14h     | 🟢 Completada | ~8min  | ~37min   | [phase-01](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.2** Zoho multi-DC bugfixes | Fix B-01..B-07: api*domain dinámico, accounts-server, … \_ver nota↓*      | 10h     | 🟢 Completada | ~5min  | ~26min   | [phase-02](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.3** HubSpot Public App     | OAuth start+callback + adapter completo (CRUD + tasks + me … _ver nota↓_  | 16h     | 🟢 Completada | ~9min  | ~42min   | [phase-03](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.4** WriteGuard + audit     | WriteGuard standalone + filtro append*only + crm_write_aud … \_ver nota↓* | 6h      | 🟢 Completada | ~3min  | ~16min   | [phase-04](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.5** UI admin               | IntegrationsManager refactor: cards CRM + OAuth flow + wri … _ver nota↓_  | 12h     | 🟢 Completada | ~7min  | ~32min   | [phase-05](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.6** Tests + docs + ADRs    | Coverage Vitest ≥80% + crm-adapters.md + ADRs 020/021/022 … _ver nota↓_   | 10h     | 🟢 Completada | ~5min  | ~26min   | [phase-06](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **3.7** Cierre                 | CLOSE-1..5 + hand-off SP-4B phase-03                                      | 6h      | 🟢 Completada | ~3min  | ~16min   | [phase-07](260524-1330-sprint-2-adapter-hubspot-zoho/phase … _ver nota↓_                                                                     |
| **Subtotal Sprint 2**          |                                                                           | **74h** |               | ~41min | ~3h20min | 🟢 Bundle PR #12 24-05 · tiempos por bloque distribuidos proporcionalmente sobre push real 40min / cierre real 3h15min · ratio −94% vs estim |

> **Nota fila `3.0 Setup` · Contenido**: env vars (OAUTH*STATE_SECRET, HUBSPOT*\_, ZOHO\_\_) + carpetas + msw devDep
>
> **Nota fila `3.0 Setup` · Plan file**: [phase-00](260524-1330-sprint-2-adapter-hubspot-zoho/phase-00-setup.md)
>
> **Nota fila `3.1 Foundation` · Contenido**: ICRMProvider ampliado + migration integrations + TokenManager dedup + crm-error + oauth-state
>
> **Nota fila `3.1 Foundation` · Plan file**: [phase-01](260524-1330-sprint-2-adapter-hubspot-zoho/phase-01-foundation-interface-integrations-table.md)
>
> **Nota fila `3.2 Zoho multi-DC bugfixes` · Contenido**: Fix B-01..B-07: api_domain dinámico, accounts-server, 401→refresh→retry, paginación, email exact
>
> **Nota fila `3.2 Zoho multi-DC bugfixes` · Plan file**: [phase-02](260524-1330-sprint-2-adapter-hubspot-zoho/phase-02-zoho-multidc-bugfixes.md)
>
> **Nota fila `3.3 HubSpot Public App` · Contenido**: OAuth start+callback + adapter completo (CRUD + tasks + meetings) + custom properties af\_\*
>
> **Nota fila `3.3 HubSpot Public App` · Plan file**: [phase-03](260524-1330-sprint-2-adapter-hubspot-zoho/phase-03-hubspot-public-app-oauth.md)
>
> **Nota fila `3.4 WriteGuard + audit` · Contenido**: WriteGuard standalone + filtro append_only + crm_write_audit append-only RLS + tests
>
> **Nota fila `3.4 WriteGuard + audit` · Plan file**: [phase-04](260524-1330-sprint-2-adapter-hubspot-zoho/phase-04-write-guard-audit-log.md)
>
> **Nota fila `3.5 UI admin` · Contenido**: IntegrationsManager refactor: cards CRM + OAuth flow + write_policy editor + audit viewer + WCAG
>
> **Nota fila `3.5 UI admin` · Plan file**: [phase-05](260524-1330-sprint-2-adapter-hubspot-zoho/phase-05-ui-admin-integrations.md)
>
> **Nota fila `3.6 Tests + docs + ADRs` · Contenido**: Coverage Vitest ≥80% + crm-adapters.md + ADRs 020/021/022 + help_sections "integrations"
>
> **Nota fila `3.6 Tests + docs + ADRs` · Plan file**: [phase-06](260524-1330-sprint-2-adapter-hubspot-zoho/phase-06-tests-coverage-docs.md)
>
> **Nota fila `3.7 Cierre` · Plan file**: [phase-07](260524-1330-sprint-2-adapter-hubspot-zoho/phase-07-sprint-close.md)

### Tareas individuales del Sprint 2 (granularidad por bloque)

#### Bloque 3.0 — Setup

| ID     | Tarea                                                                | Estim | Estado        | ⏱ Push | ⏱ Cierre |
| ------ | -------------------------------------------------------------------- | ----- | ------------- | ------ | -------- |
| 3-00.1 | Generar OAUTH_STATE_SECRET local + añadir a .env.example             | 15min | 🟢 Completada | <1min  | ~1min    |
| 3-00.2 | Crear estructura carpetas crm/oauth, tests/integrations, tests/mocks | 10min | 🟢 Completada | <1min  | <1min    |
| 3-00.3 | Dependency Guard msw@^2 (af-agents:adr) + npm install                | 30min | 🟢 Completada | <1min  | ~1min    |
| 3-00.4 | tests/mocks/server.ts + vitest.config setupFiles                     | 30min | 🟢 Completada | <1min  | ~1min    |
| 3-00.5 | Smoke npm run test -- --run + commit                                 | 30min | 🟢 Completada | <1min  | ~1min    |

#### Bloque 3.1 — Foundation (se rellena al arrancar)

> 🟢 Completada — tareas cerradas en bundle PR #12 24-05-2026. Desglose en [](260524-1330-sprint-2-adapter-hubspot-zoho/phase-01-foundation-interface-integrations-table.md).

#### Bloques 3.2..3.7 — Tareas (se desglosan al arrancar cada bloque)

> 🟢 Completadas en bundle PR #12 24-05-2026 ( + + hotfixes). Desglose detallado en las phase-XX correspondientes.

### Tareas de cierre obligatorias (Sprint 2)

| ID                           | Tarea                                                                       | Estimación    | Estado                  | ⏱ Push     | ⏱ Cierre      | Notas                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- | ------------- | ----------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| SP-3-CLOSE-1                 | Auto test (typecheck + lint + build + Vitest)                               | 1h 30min      | 🟢 Completada           | ~5min      | ~5min         | 170 tests passed + 4 skipped. Cobertura ≥80% en `crm/`. … _ver nota↓_                                                                 |
| SP-3-CLOSE-2                 | E2C Local + WCAG 2.2 AA (Playwright + axe-core)                             | 2h 30min      | 🟢 Completada (parcial) | ~5min      | ~45min        | **5/5 E2E VPS smoke verdes** contra `dev.automatizaformaci … _ver nota↓_                                                              |
| ~~SP-3-CLOSE-3~~             | ~~Test Manual del Dev~~ — \*\*DIFERIDO a 👤 SP-4B phase-03 bl … _ver nota↓_ | (0h aquí)     | 🟢 Diferida             | —          | —             | Decisión 22-05-2026                                                                                                                   |
| SP-3-CLOSE-4                 | Corrección de Bugs detectados                                               | (variable)    | 🟢 Completada           | ~5min      | ~1h 40min     | **BUG-2-01 (P0)** slug conflict `[id]` vs `[provider]` en … _ver nota↓_                                                               |
| SP-3-CLOSE-5                 | Cierre → PR + bumps + tags + releases + hand-off SP-4B pha … _ver nota↓_    | 1h            | 🟢 Completada           | ~5min      | ~40min        | PR #12 mergeado `a826fd6`. Bumps: v0.2.5 → v0.2.7 (hotfix). … _ver nota↓_                                                             |
| **Subtotal cierre Sprint 2** |                                                                             | **6h + bugs** |                         | **~25min** | **~3h 15min** | Bugs significativos: 1 P0 (BUG-2-01) + drift dependencias Node + pre-push hook silencioso. Lessons learned en RELEASE-NOTES-v0.2.7.md |

> **Nota fila `SP-3-CLOSE-1` · Notas**: 170 tests passed + 4 skipped. Cobertura ≥80% en `crm/`. Build VPS Dokploy ✓ Compiled successfully (sin warnings EBADENGINE tras downgrade lint-staged)
>
> **Nota fila `SP-3-CLOSE-2` · Notas**: **5/5 E2E VPS smoke verdes** contra `dev.linkstation.ai` v0.2.7 (`tests/e2e/sprint-2-close/smoke-crm-vps.spec.ts`): redirect, login admin, /dashboard/settings, CRMSection con HubSpot+Zoho, GET /api/integrations 401. WCAG axe + Playwright E2E completos diferidos a Sprint 3
>
> **Nota fila `~~SP-3-CLOSE-3~~` · Tarea**: ~~Test Manual del Dev~~ — **DIFERIDO a 👤 SP-4B phase-03 bloque 4** (Renzo + equipo)
>
> **Nota fila `SP-3-CLOSE-4` · Notas**: **BUG-2-01 (P0)** slug conflict `[id]` vs `[provider]` en `/api/integrations/` → 500 global VPS. Fix: mover `[id]/*` a `manage/[id]/*`. Commits `9ace75f` + `107cd7a` (lint warnings unblock push) + `c426bfb` (downgrade lint-staged 17→16 + engines Node 20 para alinear local↔VPS)
>
> **Nota fila `SP-3-CLOSE-5` · Tarea**: Cierre → PR + bumps + tags + releases + hand-off SP-4B phase-03 + Node 22 planning Sprint 3
>
> **Nota fila `SP-3-CLOSE-5` · Notas**: PR #12 mergeado `a826fd6`. Bumps: v0.2.5 → v0.2.7 (hotfix). Tags v0.2.5 + v0.2.7 publicados. Releases con notas profesionales completas. Node 22 LTS migration planificada en `phase-03-migracion-node-22-lts.md` Sprint 3 (4h-6h). `.nvmrc` pinned a 20.20.2. Hand-off SP-4B phase-03 pendiente (rellenar plantilla con specs E2E VPS + checklist manual)

---

## Fase 2.5 — Sprint 2B: Dashboard KPIs conjunto (MVP)

| Campo                          | Valor                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-3B`                                                                                                 |
| **Versión objetivo al cierre** | `v0.2.8` inicial + `v0.2.9` post-fix (alturas reales + vie … _ver nota↓_                                |
| **Estado del sprint**          | 🟢 **CERRADO v0.2.9** 25-05-2026 ~13:30 UTC (post-fix de v0 … _ver nota↓_                               |
| **Estimación total**           | **16-24h** desarrollo + 4h 30min cierre                                                                 |
| **Rama de trabajo**            | `feature/sprint-02b-dashboard-kpis-conjunto` (pusheada 24- … _ver nota↓_                                |
| **Inicio**                     | 24-05-2026 21:25                                                                                        |
| **Fin Est.**                   | 28-05-2026 (adelantado vs plan 26-05 por autoexec)                                                      |
| **Fin Real**                   | 25-05-2026 08:15 UTC (cierre v0.2.8)                                                                    |
| **Plan detallado**             | [`plans/260522-1800-sprint-2b-dashboard-kpis-conjunto/`](2 … _ver nota↓_                                |
| **Horas reales TOTAL**         | **~2h 23min** real (1h 53min dev + 15min CLOSE-5 push + ~15min E2E VPS) vs 16h 30min estim (ratio −86%) |

> **Nota fila `Versión objetivo al cierre` · Valor**: `v0.2.8` inicial + `v0.2.9` post-fix (alturas reales + viewport 100% + E2E manual Bloques B-G)
>
> **Nota fila `Estado del sprint` · Valor**: 🟢 **CERRADO v0.2.9** 25-05-2026 ~13:30 UTC (post-fix de v0.2.8 cerrado a las 08:15 UTC) · 7 commits totales · 18/18 Playwright · E2E manual Bloques B-G 32/43 PASS · 4 bugs detectados (1 fixed + 3 WCAG diferidos Sprint 3) · hand-off SP-4B auto-filled
>
> **Nota fila `Rama de trabajo` · Valor**: `feature/sprint-02b-dashboard-kpis-conjunto` (pusheada 24-05-2026 ~22:30)
>
> **Nota fila `Plan detallado` · Valor**: [`plans/260522-1800-sprint-2b-dashboard-kpis-conjunto/`](260522-1800-sprint-2b-dashboard-kpis-conjunto/plan.md) (7 archivos)

> **Asignado a:** Javi HP (solo, orquestación + dev). **Decisión arquitectónica 24-05-2026**: extender `/dashboard` con sección KPI Overview (opción C — reusar SummaryManager + nueva pestaña KPI Builder). Zero migrations nuevas. Funcionalidad NEW-04 de Bea.

### Phases (tracking fino — Sprint 2B)

| Phase                              | Contenido                                                                | Estim     | Estado        | ⏱ Push    | ⏱ Cierre  | Commit                        | Notas                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------ | --------- | ------------- | --------- | --------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 01** DEFAULT_OVERVIEW_KPIS | DEFAULT_OVERVIEW_KPIS + DEFAULT_OVERVIEW_CHARTS + Zod schemas + tests    | 1h 30min  | 🟢 Completada | ~7min     | ~7min     | `13c75e8`                     | 10 tests unitarios                                                                                                                                       |
| **Phase 02** getKpiOverview        | getKpiOverview() server action + mapper puro + tests                     | 3h        | 🟢 Completada | ~7min     | ~7min     | `b091598`                     | 8 tests                                                                                                                                                  |
| **Phase 03** OverviewSection       | OverviewSection integrado en /dashboard                                  | 4h        | 🟢 Completada | ~37min    | ~37min    | `90cb701`                     | Integración real /dashboard                                                                                                                              |
| **Phase 04** Charts default        | 4 charts default via ChartManager + OverviewCanalDistribution            | 3h        | 🟢 Completada | ~3min     | ~3min     | `28aca5b`                     | Donut canal, funnel, barras estado, línea tendencia                                                                                                      |
| **Phase 05** KPI Builder opción C  | KPI Builder opción C + validación Zod updateTenant + pestaña dedicada    | 3h        | 🟢 Completada | ~3min     | ~3min     | `c7f4127`                     | Reutiliza SummaryManager existente                                                                                                                       |
| **Phase 06** WCAG 2.2 AA           | role=img + aria-label + chart-summary oculto + 6 tests a11y              | 2h        | 🟢 Completada | ~3min     | ~3min     | `d12ef4b`                     | WCAG preventivo antes de CLOSE-2                                                                                                                         |
| **BUG-2B-01..03 fixes**            | editButtonLabel UX + Zod defense-in-depth + empty state donut            | ~20min    | 🟢 Completada | ~20min    | ~20min    | `10509bc`                     | P1 UX + P2 safety. Detectados pre-CLOSE-2                                                                                                                |
| **CLOSE-1** Auto test              | typecheck + build + Vitest 193/193 verdes, lint 116 err preexistentes    | 30min     | 🟢 Completada | ~5min     | ~5min     | —                             | 0 errores nuevos en Sprint 2B vs baseline                                                                                                                |
| **CLOSE-2** E2C Playwright         | 7/7 specs Playwright + 4 screenshots docs/screenshots/sprint-2b-close/   | 1h        | 🟢 Completada | ~25min    | ~25min    | `9d4d36b`                     | spec: tests/e2e/sprint-2b-close/overview-section.spec.ts                                                                                                 |
| **Phase 07** Cierre                | CLOSE-5: PR a developer + bump v0.2.8 + hand-off SP-4B phase-03b         | 4h 30min  | 🟢 Completada | 15min     | ~30min    | PR #13                        | ✅ CERRADO. PR #13 mergeado `17b2902` · bump v0.2.8 · … _ver nota↓_                                                                                      |
| **E2E VPS**                        | Playwright contra dev.linkstation.ai post-merge                 | —         | 🟢 Completada | ~15min    | ~15min    | —                             | **15/15 specs verdes** (25-05 06:09 UTC, 1m 30s). … _ver nota↓_                                                                                          |
| **Phase 07B** Post-fix v0.2.9      | Fix alturas reales cards Overview + viewport 100% pantalla … _ver nota↓_ | ~3h       | 🟢 Completada | ~30min    | ~3h 30min | `4c720e1` `7cfc976` `0fa1cfc` | Bump v0.2.9. 3 fixes: alturas uniformes (4c720e1), … _ver nota↓_                                                                                         |
| **Subtotal Sprint 2B**             |                                                                          | ~19h30min |               | ~2h 38min | ~5h 53min |                               | ~5h 53min total (1h 53min dev + 15min CLOSE-5 push + ~15min E2E VPS + ~30min cierre v0.2.8 + ~3h 30min Phase 07B v0.2.9) vs 19h 30min estim (ratio −70%) |

> **Nota fila `Phase 07 Cierre` · Notas**: ✅ CERRADO. PR #13 mergeado `17b2902` · bump v0.2.8 · RELEASE-NOTES publicadas · hand-off SP-4B auto-filled
>
> **Nota fila `E2E VPS` · Notas**: **15/15 specs verdes** (25-05 06:09 UTC, 1m 30s). Dokploy deploy verde. Push = Cierre (ejecución única post-merge)
>
> **Nota fila `Phase 07B Post-fix v0.2.9` · Contenido**: Fix alturas reales cards Overview + viewport 100% pantallas grandes + E2E manual Bloques B-G
>
> **Nota fila `Phase 07B Post-fix v0.2.9` · Notas**: Bump v0.2.9. 3 fixes: alturas uniformes (4c720e1), alturas reales DOM tras Bloque A2 visual feedback usuario (7cfc976), viewport w-full pantallas >1920px (0fa1cfc). E2E manual Bloques B-G ejecutado 25-05 ~12:30 UTC (32/43 PASS, 0 FAIL críticos, 4 bugs detectados BUG-2B-08/09/10 WCAG diferidos Sprint 3 + BUG-2B-11 FIXED y desplegado). Plan: `phase-07b-e2e-manual-bloques-b-g.md`. Suite Playwright sprint-2b-close 18/18 verde local + VPS. Decisión bump v0.2.9 SÍ (mejoras visuales significativas validadas en producción)

### Tareas de cierre obligatorias (Sprint 2B)

| ID                            | Tarea                                                                    | Estimación          | Estado        | ⏱ Push | ⏱ Cierre  | Notas                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------- | ------------- | ------ | --------- | ------------------------------------------------------------------------ |
| SP-3B-CLOSE-1                 | Auto test (typecheck + lint + build + Vitest)                            | 1h 30min            | 🟢 Completada | —      | —         | 193/193 tests verdes. Lint 116 err preexistentes (0 nuevos Sprint 2B)    |
| SP-3B-CLOSE-2                 | E2C Local + WCAG 2.2 AA (Playwright)                                     | 2h 30min            | 🟢 Completada | —      | —         | 7/7 specs verdes · commit `9d4d36b` · … _ver nota↓_                      |
| ~~SP-3B-CLOSE-3~~             | ~~Test Manual del Dev~~ DIFERIDO a SP-4B phase-03b bloque … _ver nota↓_  | (0h aquí)           | 🟢 Diferida   | —      | —         | Decisión 22-05-2026                                                      |
| SP-3B-CLOSE-4                 | Corrección de Bugs detectados                                            | (variable)          | 🟢 Completada | —      | —         | BUG-2B-01 editButtonLabel · … _ver nota↓_                                |
| SP-3B-CLOSE-5                 | Cierre: PR a developer + bump v0.2.8 + hand-off SP-4B phase-03b          | 1h                  | 🟢 Completada | 15min  | ~30min    | ✅ CERRADO v0.2.8. PR #13 mergeado `17b2902` · … _ver nota↓_             |
| SP-3B-CLOSE-6 (post-fix)      | Post-fix v0.2.9: 3 commits fix alturas+viewport + E2E manu … _ver nota↓_ | ~3h                 | 🟢 Completada | ~30min | ~3h 30min | ✅ CERRADO v0.2.9. Commits `4c720e1` `7cfc976` `0fa1cfc` · … _ver nota↓_ |
| **Subtotal cierre Sprint 2B** |                                                                          | **7h 30min + bugs** |               | 45min  | ~4h       | ✅ TODOS los CLOSE-1/2/4/5/6 🟢 · CLOSE-3 diferido SP-4B phase-03b       |

> **Nota fila `SP-3B-CLOSE-2` · Notas**: 7/7 specs verdes · commit `9d4d36b` · 4 screenshots en docs/screenshots/sprint-2b-close/
>
> **Nota fila `~~SP-3B-CLOSE-3~~` · Tarea**: ~~Test Manual del Dev~~ DIFERIDO a SP-4B phase-03b bloque 4 (Renzo + equipo)
>
> **Nota fila `SP-3B-CLOSE-4` · Notas**: BUG-2B-01 editButtonLabel · BUG-2B-02 Zod defense-in-depth · BUG-2B-03 empty state donut
>
> **Nota fila `SP-3B-CLOSE-5` · Notas**: ✅ CERRADO v0.2.8. PR #13 mergeado `17b2902` · 15/15 E2E VPS verdes · RELEASE-NOTES publicadas · hand-off SP-4B auto-filled
>
> **Nota fila `SP-3B-CLOSE-6 (post-fix)` · Tarea**: Post-fix v0.2.9: 3 commits fix alturas+viewport + E2E manual Bloques B-G + bump v0.2.9 + tag + release
>
> **Nota fila `SP-3B-CLOSE-6 (post-fix)` · Notas**: ✅ CERRADO v0.2.9. Commits `4c720e1` `7cfc976` `0fa1cfc` · 18/18 Playwright local + VPS · E2E manual B-G 32/43 PASS · 4 bugs detectados (3 WCAG diferidos Sprint 3 + BUG-2B-11 FIXED y desplegado) · Plan: phase-07b-e2e-manual-bloques-b-g.md

---

## Fase 3 — Sprint 3: Hardening

| Campo                          | Valor                                   |
| ------------------------------ | --------------------------------------- |
| **Sprint ID**                  | `SP-4`                                  |
| **Versión objetivo al cierre** | `v0.3.0` (MVP completo, post-hardening) |
| **Estado del sprint**          | 🔘 Pendiente                            |
| **Estimación total**           | 2-3 sem (80h–120h)                      |
| **Rama de trabajo sugerida**   | `feature/sprint-03-hardening`           |
| **Inicio**                     | Vie 29-05-2026 09:00                    |
| **Fin Est.**                   | Vie 12-06-2026 19:00                    |
| **Fin Real**                   | —                                       |

> **Asignado a:** Javi HP (solo). 11 días lab × 10h/día = 110h. **Cierre MVP v0.3.0 = Lun 22-06-2026** (post SP-4B Renzo). Adelantado −7 sem 24-05.

### Tareas de desarrollo (Fase 3)

> Tests E2E completos, observabilidad, dashboards de costes, accesibilidad WCAG 2.2 AA total.

| ID                               | Tarea                                                                                                            | Estimación          | Estado                | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4-01                             | Test suite E2E completa (Playwright) cubriendo flujos golden path                                                | 20-22h              | 🟢 Completada parcial | ⏱ Push: ~20min · ⏱ Cierre: ~20min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4-02                             | Coverage target ≥80% unit + integration                                                                          | 8-10h               | 🟢 Diferida           | DIFERIDO a SP-4B Renzo. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4-03                             | Observabilidad: logging estructurado Pino + métricas BullM … _ver nota↓_                                         | 7-9h                | 🟢 Completada         | ⏱ Push: ~1h 25min · ⏱ Cierre: ~1h 25min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| SP-4-NODE-22                     | Migración runtime Node 20 → 22 LTS (Dockerfile + `.nvmrc` … _ver nota↓_                                          | 4h 00min – 6h 00min | 🟢 Completada         | ⏱ Push: ~25min · ⏱ Cierre: ~25min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ~~4-04~~                         | ~~Dashboard de costes LLM (tokens por proveedor por tenant)~~                                                    | ~~16-22h~~          | ✅ MOVIDA             | Movida al Sprint Costes-LLM post-MVP como **C-02** (v0.4.1 … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4-05                             | Refactor accesibilidad WCAG 2.2 AA en todo el admin panel                                                        | 28-40h              | 🟢 Diferida           | DIFERIDO post-MVP. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| SP-4-WCAG-08                     | **BUG-2B-08** (LOW) — Añadir aria-label/title a botones "Personalizar"                                           | 30min               | 🟢 Completada         | ⏱ Push: ~10min · ⏱ Cierre: ~10min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-WCAG-09                     | **BUG-2B-09** (MEDIUM) — Heading hierarchy: bajar h1 secundarios a h2                                            | 1h 30min            | 🟢 Completada         | ⏱ Push: ~10min · ⏱ Cierre: ~10min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-WCAG-10                     | **BUG-2B-10** (MEDIUM) — Skip-link "Saltar al contenido principal"                                               | 1h                  | 🟢 Completada         | ⏱ Push: ~15min · ⏱ Cierre: ~15min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4-06                             | Hardening adicional: rate limits, CSP headers, CSRF tokens                                                       | 10-14h              | 🟢 Completada         | ⏱ Push: ~50min · ⏱ Cierre: ~50min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4-07                             | Documentación final cliente: release notes v0.3.0                                                                | 6-8h                | 🟢 Completada         | ⏱ Push: ~25min · ⏱ Cierre: ~25min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4-08                             | Rate limit wrapper `withRateLimit()` para Server Actions críticas                                                | 6h                  | 🟢 Completada         | ⏱ Push: ~30min · ⏱ Cierre: ~30min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4-09                             | Test E2E Playwright suite completa del widget                                                                    | 4h                  | 🟢 Diferida           | DIFERIDO a SP-4B Renzo. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| SP-4-NEW-13                      | Endpoints `/api/health` + `/api/version` (sin auth, … _ver nota↓_                                                | 30min – 1h          | 🟢 Completada         | ⏱ Push: ~15min · ⏱ Cierre: ~15min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-NEW-11                      | Rename UI Historial → Leads + consolidación menús/labels/b … _ver nota↓_                                         | 2h                  | 🟢 Completada         | ⏱ Push: ~15min · ⏱ Cierre: ~15min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-NEW-09                      | **Campañas Excel**: importar XLSX + filtros multi-variable … _ver nota↓_                                         | 12-18h              | 🟢 Completada parcial | ⏱ Push: ~50min · ⏱ Cierre: ~50min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-NEW-10                      | **Festivos manuales por país** (tabla `tenant_holidays`)                                                         | 3h                  | 🟢 Completada parcial | ⏱ Push: ~25min · ⏱ Cierre: ~25min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-NEW-12                      | **Settings UX**: buscador integraciones + probar conexión … _ver nota↓_                                          | 6h                  | 🟢 Completada parcial | ⏱ Push: ~20min · ⏱ Cierre: ~20min · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-AWS-REMOVAL                 | **AWS Bedrock removal** (orden Javi HP 26-05-2026) — elimi … _ver nota↓_                                         | 1h                  | 🔵 Subida rama        | ⏱ Push: ~50min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-SIDEBAR-UX                  | **Sidebar UX** (orden Javi HP 26-05-2026) — Dashboard item … _ver nota↓_                                         | 15min               | 🔵 Subida rama        | ⏱ Push: ~10min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-01                    | **BUG-3-01** — `demo@af.local` hardcoded en sprint-0 tests … _ver nota↓_                                         | 30min               | 🔵 Subida rama        | ⏱ Push: ~20min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-02                    | **BUG-3-02** — CSP `bedrock.*.amazonaws.com` inválida + wa … _ver nota↓_                                         | 20min               | 🔵 Subida rama        | ⏱ Push: ~15min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-03                    | **BUG-3-03/04** — `attemptLogin` race "missing email or ph … _ver nota↓_                                         | 1h                  | 🔵 Subida rama        | ⏱ Push: ~45min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-05                    | **BUG-3-05** — Saturación Supabase Auth con 8 workers Play … _ver nota↓_                                         | 10min               | 🔵 Subida rama        | ⏱ Push: ~5min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| SP-4-BUG-3-06                    | **BUG-3-06** — Race sprint-2-close + sprint-2b-close concurrencia                                                | 45min               | 🔵 Subida rama        | ⏱ Push: ~35min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-07                    | **BUG-3-07** — Sidebar `md:flex` (768px) ahoga main: sideb … _ver nota↓_                                         | 2h                  | 🔵 Subida rama        | ⏱ Push: ~1h 30min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| SP-4-BUG-3-09                    | **BUG-3-09** — KPI hero cards 4-cols en 768px → labels tru … _ver nota↓_                                         | 1h                  | 🔵 Subida rama        | ⏱ Push: ~45min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-10                    | **BUG-3-10** — Tabla historial columna ORIGEN truncada a " … _ver nota↓_                                         | 45min               | 🔵 Subida rama        | ⏱ Push: ~30min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-12                    | **BUG-3-12** — Barra scroll superior tabla historial NO co … _ver nota↓_                                         | 30min               | 🔵 Subida rama        | ⏱ Push: ~25min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-BUG-3-13                    | **BUG-3-13** — Badge "1 Issue" Next Dev Tools por error ev … _ver nota↓_                                         | 20min               | 🔵 Subida rama        | ⏱ Push: ~15min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-TS-STANDARDS                | **TypeScript no-`any` standard** (orden Javi HP 26-05-2026 … _ver nota↓_                                         | 30min               | 🔵 Subida rama        | ⏱ Push: ~25min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-LINT-ZERO                   | **Lint baseline → 0 problems** — 9 lotes, 18 archivos … _ver nota↓_                                              | 8-12h               | 🔵 Subida rama        | ⏱ Push: 5h 30min · ⏱ Cierre: — · Commits `e39b059`..`9e7201f` (28-05-2026). lint 104 problems → 0. helper `asPlainClient()` introducido. 236/236 tests verdes. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-AUTH-RATELIMIT              | **Auth rate-limit** (orden Javi HP 27-05-2026) — Throttle … _ver nota↓_                                          | 1h                  | 🔵 Subida rama        | ⏱ Push: ~35min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-SEC-PROACTIVE               | **Security agent pro-activo** (orden Javi HP 27-05-2026) … _ver nota↓_                                           | 1h 30min            | 🔵 Subida rama        | ⏱ Push: ~55min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-RLM-TIMEOUT                 | **Rate-limiter timeout 100ms** (BUG-RLM-01 /e2etotal local) … _ver nota↓_                                        | 20min               | 🔵 Subida rama        | ⏱ Push: ~20min · ⏱ Cierre: — · … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| SP-4-DEPRECATIONS-DEPLOY         | **Deprecations Next 16 + Sentry 10 + lazy SERVICE_ROLE_KEY** … _ver nota↓_                                       | 2-3h                | 🔵 Subida rama        | ⏱ Push: 2h 30min · ⏱ Cierre: — · Commits `6d238f4`+`cf1da3f`+`82fe750`+`0912dc7` (28-05-2026). middleware→proxy, webpack.treeshake, lazy getter, Dockerfile seguro. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| SP-4-INCIDENT-PAT-LEAK-260527    | **Doc incidente PAT GitHub expuesto en panel Dokploy** + plan rotación … _ver nota↓_                             | 30min               | 🟡 En Desarrollo      | ⏱ Push: ~15min · ⏱ Cierre: — · Commit `612c207`. Doc cerrada ✅, rotación PAT en panel Dokploy pendiente acción usuario. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| BUG-SEC-01                       | **IP Spoofing en rate-limit** (A07:2021 OWASP) — `extractClientIp()` lee X-Forwarded-For sin priorizar X-Real-IP | 30min               | 🔵 Subida rama        | ⏱ Push: ~25min · ⏱ Cierre: — · Commit `bcd36a9` (29-05-2026). 🟢 FIXED dentro de Sprint 3 (orden Javi HP 29-05 tarde). … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| BUG-SEC-02                       | **Webhook workflow sin autenticación** (A01:2021 OWASP) — endpoint público sin firma dispara orquestación        | 1h                  | 🔵 Subida rama        | ⏱ Push: ~50min · ⏱ Cierre: — · Commit `bcd36a9` (29-05-2026). 🟢 FIXED dentro de Sprint 3. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| BUG-SEC-03                       | **Email en claro en logs** (A09:2021 OWASP) — PII GDPR en `auth.ts`                                              | 20min               | 🔵 Subida rama        | ⏱ Push: ~20min · ⏱ Cierre: — · Commit `bcd36a9` (29-05-2026). 🟢 FIXED dentro de Sprint 3. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| BUG-SEC-04                       | **Fail-open silencioso WhatsApp pause check** (A04:2021 OWASP) — leads pausados pueden recibir mensajes          | 15min               | 🔵 Subida rama        | ⏱ Push: ~20min · ⏱ Cierre: — · Commit `bcd36a9` (29-05-2026). 🟢 FIXED dentro de Sprint 3. … _ver nota↓_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Subtotal Fase 3 — Desarrollo** |                                                                                                                  | **~130-165h**       |                       | Sprint 3 cubre: todas tareas dev (4-03, 4-05 parcial, 4-06, 4-07, 4-08, SP-4-NODE-22, WCAG-08/09/10, NEW-09/10/11/12 parciales, NEW-13) + 4-01 E2E parcial + 4-02 coverage diferida SP-4B + 4-09 widget E2E diferido SP-4B + 4-05 refactor masivo WCAG diferido post-MVP + **AWS-REMOVAL + SIDEBAR-UX + BUG-3-01..13** (26-05) + **LINT-ZERO + DEPRECATIONS-DEPLOY + INCIDENT-PAT-LEAK** (28-05) + **BUG-SEC-01..04 detectados CLOSE-1.5** (29-05). ⏱ Real total: ~21h. **🟢 MERGEADO a developer vía PR #22 el 30-05-2026** (las filas individuales conservan su estado 🔵 pre-merge como histórico granular; el sprint está cerrado a nivel agregado) |

> **Nota fila `4-01` · Notas**: ⏱ Push: ~20min · ⏱ Cierre: ~20min · Sprint 3 cubre flujos críticos: `tests/e2e/sprint-3-close/{health-version,security-headers,wcag-accessibility}.spec.ts` (13 tests). Helper reusable `tests/e2e/utils/vps-version.ts` con `expectVpsServingCommit()` y `expectVpsHealthy()`. Resto (golden flows completos del MVP: login, leads CRUD, dashboard E2E, widget embed) DIFERIDO a SP-4B Renzo (sprint dedicado validación pre-MVP, ~40-55h)
>
> **Nota fila `4-02` · Notas**: DIFERIDO a SP-4B Renzo. Sprint 3 añade 39 tests nuevos (228/228 totales verdes) cubriendo health/version + logger Pino + rate-limiter + with-rate-limit + campaign-import. Coverage 80% global se mide y refina en sprint dedicado SP-4B con su propio vitest --coverage report
>
> **Nota fila `4-03` · Tarea**: Observabilidad: logging estructurado Pino + métricas BullMQ + Sentry (reducido)
>
> **Nota fila `4-03` · Notas**: ⏱ Push: ~1h 25min · ⏱ Cierre: ~1h 25min · Pino 10.3.1 refactor `src/lib/utils/logger.ts` (preserva API + scrubbing PII + paths Pino redact 2 niveles meta._._). DA-1-005 ya fixed Sprint 0, ahora con Pino structured. Workers BullMQ: completed/failed/stalled logs con tenant_id/lead_id/duration_ms. 3 webhooks Pino (retell+crm+whatsapp con trace_id). Bull-board UI `/api/admin/queues/[[...slug]]` protegida requireApiAdmin (Express adapter mock req/res Next.js). Sentry v10.53.1 manual setup: client/server/edge configs + instrumentation.ts + withSentryConfig en next.config. .env.example actualizado SENTRY_DSN+GIT_COMMIT_SHA+BUILD_TIMESTAMP. 4 tests logger nuevos + 201/201 totales verdes. Lint baseline 114 preservado. Tabla `llm_usage_logs` + tracker DIFERIDOS Sprint Costes-LLM (C-01)
>
> **Nota fila `SP-4-NODE-22` · Tarea**: Migración runtime Node 20 → 22 LTS (Dockerfile + `.nvmrc` + `engines` + desbloquear lint-staged 17). Alinea local ↔ VPS y elimina warnings EBADENGINE.
>
> **Nota fila `SP-4-NODE-22` · Notas**: ⏱ Push: ~25min · ⏱ Cierre: ~25min · 5 ficheros: .nvmrc 20.20.2→22.22.3, package.json engines node ^22 + @types/node ^22.19.19 (downgrade desde 24) + lint-staged ^17.0.5 (desbloqueado), Dockerfile 3 stages node:22-alpine, docs/dev-onboarding.md. npm install +4/-5/~8 packages. **0 EBADENGINE**. Tests 193/193 (idem v0.2.9), typecheck/build 🟢, lint baseline 114 problems preservado. Sin cambios código aplicación. Pre-deploy VPS Dokploy en CLOSE-5 (clean cache rebuild). Audit: `researcher-node22-compat-260525.md`
>
> **Nota fila `~~4-04~~` · Notas**: Movida al Sprint Costes-LLM post-MVP como **C-02** (v0.4.1). Decisión clienta 22-05-2026: centro de costes NO necesario en MVP
>
> **Nota fila `4-05` · Notas**: DIFERIDO post-MVP. Sprint 3 cierra sub-tareas críticas WCAG-08/09/10 (detectadas E2E Bloques B-G). Refactor masivo 24 findings DA-5 → backlog post-MVP. v0.3.0-rc.1 mantiene WCAG AA contraste + role/aria-label en charts desde Sprint 2B
>
> **Nota fila `SP-4-WCAG-08` · Notas**: ⏱ Push: ~10min · ⏱ Cierre: ~10min · aria-label + title añadidos en SummaryManager (2 botones líneas 516/551) + ChartManager (1 botón línea 442). Comentarios JSX corregidos para no romper sintaxis. Typecheck 🟢
>
> **Nota fila `SP-4-WCAG-09` · Notas**: ⏱ Push: ~10min · ⏱ Cierre: ~10min · h1 "Análisis Visual" → h2 en ChartManager.tsx:392. h1 "Métricas Generales" → h2 en SummaryManager.tsx:461. Mantiene 1 único h1 por página (el del dashboard padre). WCAG SC 1.3.1 cumple
>
> **Nota fila `SP-4-WCAG-10` · Notas**: ⏱ Push: ~15min · ⏱ Cierre: ~15min · Componente nuevo `src/components/layout/SkipLink.tsx` (sr-only + focus visible). Añadido al root `app/layout.tsx` body. `<main id="main-content" tabIndex={-1}>` en DashboardShell. WCAG SC 2.4.1 Bypass Blocks cumple. Test E2E `wcag-accessibility.spec.ts` 3 specs
>
> **Nota fila `4-06` · Notas**: ⏱ Push: ~50min · ⏱ Cierre: ~50min · `src/lib/rate-limiter.ts` sliding-window ioredis + fail-open. Security headers en next.config.ts: CSP completo (LLM/Supabase/Sentry/CRM whitelisted) + HSTS preload + X-Frame DENY + Referrer-Policy + Permissions-Policy. Excepción `/widget/*` frame-ancestors abierto. CSRF docs `docs/security/csrf-protection.md`. Middleware Edge runtime confirmado (paso 0 R2): rate-limiter aplica en API Routes Node, no en middleware
>
> **Nota fila `4-07` · Notas**: ⏱ Push: ~25min · ⏱ Cierre: ~25min · `plans/260520-1342-sprint-3-hardening/RELEASE-NOTES-v0.3.0-rc.1.md` redactado con estructura profesional completa (highlights, detalle por área, breaking, migraciones, env vars, deps añadidas, tareas cerradas+diferidas, pendientes operativos)
>
> **Nota fila `4-08` · Notas**: ⏱ Push: ~30min · ⏱ Cierre: ~30min · `src/lib/api/with-rate-limit.ts` HOF generaliza 1-27. Identidad pluggable (tenantId / widgetId:ip / userId). Fail-open si Redis cae. Límite agresivo 1/min si identify lanza (anti-abuso pre-auth). Docs `docs/architecture/rate-limits.md` con tabla buckets + cómo añadir. Tests 4/4 verdes. Aplicado en `campaign-import.ts` (10/min/tenant). Migrar widget action 1-27 al wrapper genérico DIFERIDO Sprint 4
>
> **Nota fila `4-09` · Notas**: DIFERIDO a SP-4B Renzo. Sprint 3 cubre infra E2E (`tests/e2e/utils/vps-version.ts` helper) + 3 specs sprint-3-close. Widget E2E completo (embed → iframe → lead creado + dominio no whitelistado) requiere fixtures y mocks complejos que se hacen en sprint dedicado validación pre-MVP
>
> **Nota fila `SP-4-NEW-13` · Tarea**: Endpoints `/api/health` + `/api/version` (sin auth, Node runtime) — verificación post-deploy fiable + uptime monitoring + debug producción
>
> **Nota fila `SP-4-NEW-13` · Notas**: ⏱ Push: ~15min · ⏱ Cierre: ~15min · 2 endpoints Node runtime (Edge descartado por audit: process.version + Pino no soportan Edge). `/api/health` con status+timestamp. `/api/version` con version+commit+branch+deployedAt+nodeVersion (process.env.GIT_COMMIT_SHA/GIT_BRANCH/BUILD_TIMESTAMP con fallback "unknown"). Dockerfile stage runner con build args ARG/ENV. Tests integración 8/8 verdes (importan handler directo, no requieren dev server). Pendiente: Dokploy panel debe inyectar build args al docker build (acción manual usuario)
>
> **Nota fila `SP-4-NEW-11` · Tarea**: Rename UI Historial → Leads + consolidación menús/labels/breadcrumbs/rutas
>
> **Nota fila `SP-4-NEW-11` · Notas**: ⏱ Push: ~15min · ⏱ Cierre: ~15min · 3 labels UI cambiados (Sidebar submenu Métricas:132 'Historial'→'Tabla Leads' / page.tsx:38 h1 'Historial de Llamadas'→'Leads' / HistorialColumnManager:213). Preservados por semántica distinta: DuplicateLeadDialog 'Historial del número' (modal por teléfono) + voice-agents tab 'Historial'. Approach B (URLs intactas)
>
> **Nota fila `SP-4-NEW-09` · Tarea**: **Campañas Excel**: importar XLSX + filtros multi-variable + cola configurable
>
> **Nota fila `SP-4-NEW-09` · Notas**: ⏱ Push: ~50min · ⏱ Cierre: ~50min · Migración SQL `20260526100000_campaigns_and_holidays.sql` crea tabla `campaigns` con RLS multi-tenant + slug único + índices. Schema Zod `campaign-import.ts` (max 10k filas, dedup por teléfono). Server Action `importCampaignFromExcel` con exceljs, rate-limited 10/min/tenant via withRateLimit. Tests 15/15 verdes. **DIFERIDOS post-MVP**: UI dropzone import + filtros multi-variable URL-persistente + UI cola configurable cadencia (schema config JSONB ya listo en tabla)
>
> **Nota fila `SP-4-NEW-10` · Notas**: ⏱ Push: ~25min · ⏱ Cierre: ~25min · Migración SQL en `20260526100000_campaigns_and_holidays.sql` crea `tenant_holidays` con RLS + UNIQUE (tenant, country, date). Server Actions `getHolidays/addHoliday/removeHoliday` con Zod. Helper `isBusinessDay(tenantId, country, date)` listo para scheduler BullMQ. **DIFERIDO post-MVP**: UI Calendar settings `/dashboard/calendar/holidays`
>
> **Nota fila `SP-4-NEW-12` · Tarea**: **Settings UX**: buscador integraciones + probar conexión + confirmación + slide-over
>
> **Nota fila `SP-4-NEW-12` · Notas**: ⏱ Push: ~20min · ⏱ Cierre: ~20min · **(1)** Buscador sticky con filter por keyword en IntegrationsManager (sections wrappeadas con `matchesFilter()`). **(2)** Botón "Probar conexión" CRMs YA EXISTÍA desde Sprint 2 commit `74cc137` (CRMProviderCard.handleTest invoca `/api/integrations/manage/[id]/healthcheck` + toast feedback). **DIFERIDOS Sprint Refinamiento post-MVP**: (3) confirmación robusta destructiva + (4) edición slide-over (refactor arquitectónico)
>
> **Nota fila `SP-4-AWS-REMOVAL` · Tarea**: **AWS Bedrock removal** (orden Javi HP 26-05-2026) — eliminar del stack permanentemente
>
> **Nota fila `SP-4-AWS-REMOVAL` · Notas**: ⏱ Push: ~50min · ⏱ Cierre: — · Eliminadas deps `@aws-sdk/client-bedrock-agent-runtime` + `@aws-sdk/client-bedrock-runtime` (5 packages). Mantenido `@aws-sdk/client-s3` + `s3-request-presigner` (MinIO S3-compatible, NO conecta AWS). Limpieza código: `next.config.ts` CSP línea 41 (`bedrock.*.amazonaws.com` sintaxis inválida), `.env.example` (sin AWS*REGION/KEY_ID/SECRET), `src/app/dashboard/playground/page.tsx:132` (mensaje UI genérico). Limpieza docs (con nota "Bedrock descartado 26-05-2026"): CLAUDE.md, README.md, dev-{onboarding,team-handover,local-setup}.md, architecture/{llm-stack,layers-and-structure}.md, audit/STACK-TECNOLOGICO.md, dependencies/{outdated,risk-matrix,stack-versions}.md, handoff/deploy-supabase-vps-dokploy.md, .claude-plugin/plugin.json, .claude/agents/adr.md, scripts/readme-templates/* (2), plans/260520-1342-sprint-3-hardening/phase-05*.md, plans/260520-1342-sistema-readmes-por-rama/templates/* (2), plans/260522-1430-sprint-costes-llm-post-mvp/\_ (3). Memoria persistente actualizada
>
> **Nota fila `SP-4-SIDEBAR-UX` · Tarea**: **Sidebar UX** (orden Javi HP 26-05-2026) — Dashboard item + rename Tabla Leads→Lista de Leads
>
> **Nota fila `SP-4-SIDEBAR-UX` · Notas**: ⏱ Push: ~10min · ⏱ Cierre: — · `src/components/layout/Sidebar.tsx`: añadido item "Dashboard" como primer item del menú apuntando a `/dashboard` (antes de "Constructor & IA") + renombrado "Tabla Leads" → "Lista de Leads" en NAV_ITEMS
>
> **Nota fila `SP-4-BUG-3-01` · Tarea**: **BUG-3-01** — `demo@af.local` hardcoded en sprint-0 tests no existe en seed actual
>
> **Nota fila `SP-4-BUG-3-01` · Notas**: ⏱ Push: ~20min · ⏱ Cierre: — · `tests/e2e/sprint-0-close/smoke-flows.spec.ts`: env var `process.env.VPS_ADMIN_EMAIL ?? "LinkStation@gmail.com"`. Ejecutado `npm run db:seed-demo` con `DEMO_USER_PASSWORD` en .env.local
>
> **Nota fila `SP-4-BUG-3-02` · Tarea**: **BUG-3-02** — CSP `bedrock.*.amazonaws.com` inválida + warning eval() React dev en test 2B-08
>
> **Nota fila `SP-4-BUG-3-02` · Notas**: ⏱ Push: ~15min · ⏱ Cierre: — · Línea CSP eliminada + filtros `eval() is not supported` y `Content Security Policy` añadidos a test 2B-08
>
> **Nota fila `SP-4-BUG-3-03` · Tarea**: **BUG-3-03/04** — `attemptLogin` race "missing email or phone" sprint-0 + cascada SF-05 logout
>
> **Nota fila `SP-4-BUG-3-03` · Notas**: ⏱ Push: ~45min · ⏱ Cierre: — · `waitFor visible` de `#email`/`#password` + retry interno + early return si fields vacíos + guard `isRaceFill` en SF-05
>
> **Nota fila `SP-4-BUG-3-05` · Tarea**: **BUG-3-05** — Saturación Supabase Auth con 8 workers Playwright concurrentes
>
> **Nota fila `SP-4-BUG-3-05` · Notas**: ⏱ Push: ~5min · ⏱ Cierre: — · `playwright.config.ts`: `workers: IS_CI ? 1 : 2` (antes `undefined` = mitad cores)
>
> **Nota fila `SP-4-BUG-3-06` · Notas**: ⏱ Push: ~35min · ⏱ Cierre: — · Refactor: helper `loginAsAdmin` único robusto con `waitFor` de inputs, reemplazó 4 ocurrencias inline en sprint-2-close + sprint-2b-close
>
> **Nota fila `SP-4-BUG-3-07` · Tarea**: **BUG-3-07** — Sidebar `md:flex` (768px) ahoga main: sidebar 256 + main 512 layout asfixiado
>
> **Nota fila `SP-4-BUG-3-07` · Notas**: ⏱ Push: ~1h 30min · ⏱ Cierre: — · **Cambio breakpoint global shell**: `md:` (768px) → `lg:` (1024px) en `Sidebar.tsx` (6 cambios) + `Topbar.tsx` (1 cambio). Reglas en `docs/dev-team-handover.md` §4.bis nueva + `docs/architecture/layers-and-structure.md` (sección Responsive breakpoints) + `docs/dev-onboarding.md` regla #9
>
> **Nota fila `SP-4-BUG-3-09` · Tarea**: **BUG-3-09** — KPI hero cards 4-cols en 768px → labels truncados ("Tota...", "Lea...", "Tie...")
>
> **Nota fila `SP-4-BUG-3-09` · Notas**: ⏱ Push: ~45min · ⏱ Cierre: — · `src/lib/constants/schema.ts` COL_SPAN_MAP recalibrado `sm:col-span-X md:col-span-X`. `src/components/dashboard/SummaryManager.tsx:989`: grid `md:grid-cols-12` → `sm:grid-cols-6 lg:grid-cols-12`. sm: cards size=3 ocupan 3 cols (2/fila), lg: 3 cols (4/fila)
>
> **Nota fila `SP-4-BUG-3-10` · Tarea**: **BUG-3-10** — Tabla historial columna ORIGEN truncada a "OR" en 1440px (sin scroll H funcional)
>
> **Nota fila `SP-4-BUG-3-10` · Notas**: ⏱ Push: ~30min · ⏱ Cierre: — · `src/components/historial/HistorialTable.tsx:455`: `table className="w-full"` → `"w-full min-w-max"`. Línea 453: quitado `overflow-hidden` (mantenido `overflow-x-auto`). Scroll H 1261px disponible
>
> **Nota fila `SP-4-BUG-3-12` · Tarea**: **BUG-3-12** — Barra scroll superior tabla historial NO coincidía con ancho contenido
>
> **Nota fila `SP-4-BUG-3-12` · Notas**: ⏱ Push: ~25min · ⏱ Cierre: — · `HistorialTable.tsx:446`: `className={cn("h-[1px]", [width:Xpx])}` → `style={{ width: tableScrollWidth+"px" }}`. Tailwind JIT no procesa width dinámico en class string. Verificado match scrollbar ↔ `table.scrollWidth=2380px`
>
> **Nota fila `SP-4-BUG-3-13` · Tarea**: **BUG-3-13** — Badge "1 Issue" Next Dev Tools por error eval() (CSP estricta + React dev)
>
> **Nota fila `SP-4-BUG-3-13` · Notas**: ⏱ Push: ~15min · ⏱ Cierre: — · `next.config.ts`: CSP `script-src` con `'unsafe-eval'` añadido SOLO si `NODE_ENV !== 'production'`. Verificado 0 console errors. En build producción CSP sigue estricta sin `unsafe-eval`
>
> **Nota fila `SP-4-TS-STANDARDS` · Tarea**: **TypeScript no-`any` standard** (orden Javi HP 26-05-2026) — documentar prohibición + alternativas
>
> **Nota fila `SP-4-TS-STANDARDS` · Notas**: ⏱ Push: ~25min · ⏱ Cierre: — · Nuevo doc `docs/architecture/typescript-standards.md` con tabla de alternativas (Record/unknown/generics/interfaces) + ejemplos reales del repo (commit 26-05) + política baseline. Actualizado `docs/dev-onboarding.md` regla #10 + `docs/dev-team-handover.md` sección 4.ter nueva. Disparado por incidente pre-commit hook bloqueado por 4 errores `no-explicit-any` en playground/page.tsx (arreglados con tipos reales `HealthCardProps`, `Record<string, unknown>`, casts shape explícito)
>
> **Nota fila `SP-4-LINT-ZERO` · Tarea**: **Lint baseline → 0 problems** — 9 lotes consecutivos 28-05-2026, 18 archivos limpiados
>
> **Nota fila `SP-4-LINT-ZERO` · Notas**: ⏱ Push: 5h 30min · ⏱ Cierre: — · Política previa toleraba 114 lint problems baseline (104 al arrancar esta tarea por fixes boy-scout previos). Commits: `e39b059` lote 1a (unused-vars 3 archivos) + `6da3c65` lote 1b (3 archivos pequeños) + `8688595` lote A1 (charts dashboard) + `b5592b5` lote A2 (widget + webhook) + `1866e84` lote A3 (integrations) + `75a7a88` lote A4 (core lib) + `f049769` fix eslint-disable placement webhook post-prettier + `406b871` lote B1 (QualificationProcessor) + `9e7201f` lote B2 (scheduler). Resultado: **104 → 0 problems** (0 errors, 0 warnings). Pattern clave: helper `asPlainClient()` en `src/lib/supabase/as-plain-client.ts` para evitar `[key: string]: unknown` en tipo `Lead`. Deuda técnica NO urgente: eliminar index signature de `Lead` para no necesitar el helper. 236/236 tests verdes. TypeCheck 🟢. Husky bloquea `no-explicit-any` desde 26-05.
>
> **Nota fila `SP-4-AUTH-RATELIMIT` · Tarea**: **Auth rate-limit** (orden Javi HP 27-05-2026) — Envolver `loginAction` + `resetPasswordAction` con `withRateLimit` (HOF Sprint 3 4-08). Cierra OWASP A07:2021 (Identification & Auth Failures).
>
> **Nota fila `SP-4-AUTH-RATELIMIT` · Notas**: ⏱ Push: ~35min · ⏱ Cierre: — · `src/lib/actions/auth.ts`: `loginAction` 5/min por bucket `ip:emailHash` + `resetPasswordAction` 3/min por bucket `ip:emailHash` (sha256-8b para no log-leakear email). Identify pasa por helper `headers()` Next 16 + `extractClientIp()` de `rate-limiter.ts`. Mapeo `rate_limit_exceeded` → mensaje ES amigable preserva contrato `{ error: string }` de `LoginForm`. Tests Vitest 7/7 verdes: bloqueo 6º login, allow=true delega supabase, buckets IP-distintas no se cruzan, emailHash case-insensitive estable, bloqueo 4º reset, allow=true delega resetPasswordForEmail, fail-open Redis caído. Suite total 228 → 235 verdes. TypeCheck 🟢 + Lint baseline preservado. Plan: `plans/260520-1342-sprint-3-hardening/phase-09-auth-ratelimit-y-security-proactivo.md` §1.
>
> **Nota fila `SP-4-SEC-PROACTIVE` · Tarea**: **Security agent pro-activo + orquestación manager** (orden Javi HP 27-05-2026) — Endurecer `.claude/agents/security.md` al stack AF real (RLS multi-tenant, OAuth tokens cifrados, widget público, webhooks, Server Actions LLM). Añadir paso obligatorio `af-agents:security` al Phase Completion Protocol entre CLOSE-1 y CLOSE-2 (auditoría delta).
>
> **Nota fila `SP-4-RLM-TIMEOUT` · Tarea**: **Rate-limiter timeout 100ms** (BUG-RLM-01) — Fix de bug HIGH detectado en `/e2etotal --env local` 27-05-2026 run 260527-2056.
>
> **Nota fila `SP-4-RLM-TIMEOUT` · Notas**: ⏱ Push: ~20min · ⏱ Cierre: — · `src/lib/rate-limiter.ts`: `Promise.race([pipe.exec(), timeoutPromise])` con `RATE_LIMIT_TIMEOUT_MS=100`. Detectado vía Playwright MCP local: ioredis ECONNRESET dejaba loginAction colgado >1.5min porque pipe.exec() reintentaba reconexión sin timeout duro. El fail-open conceptualmente correcto necesitaba el cap. Worst-case latency: 1.5min → 100ms (mejora 900x). 1 test nuevo en `tests/unit/rate-limiter.test.ts` (simula promise que nunca resuelve, verifica elapsed 90-500ms). Suite 235 → 236 verdes. TypeCheck 🟢. Detalle: `plans/260527-2056-e2ctotal-local-run/INFORME-FINAL.md`.
>
> **Nota fila `SP-4-SEC-PROACTIVE` · Notas**: ⏱ Push: ~55min · ⏱ Cierre: — · 4 cambios: 1) `.claude/agents/security.md` reescrito completo (modos delta/full/targeted + 8 superficies riesgo AF S1..S8 + OWASP 2021 A01..A10 mapeado a stack + formato report + detector full-scan automático). 2) `.claude/agents/manager.md` Phase Completion Protocol con CLOSE-1.5 auditoría delta security entre CLOSE-1 y CLOSE-2 + regla de oro "manager invoca automáticamente, usuario no pide". 3) `CLAUDE.md` proyecto: paso 1.5 añadido al protocolo + tabla mapping CLOSE-1..5 renumerada (CLOSE-1.5 nuevo). 4) Nuevo doc `docs/security/security-agent-protocol.md` (políticas + severidades + falsos positivos conocidos + cómo invocar manualmente). Política: NO full-scan en cada cierre (caro) — solo archivos modificados en sprint via `git diff developer..HEAD`. Full-scan automático en bumps `v0.X.0`, `rc.*`, promoción `staging → main`. Plan: `plans/260520-1342-sprint-3-hardening/phase-09-auth-ratelimit-y-security-proactivo.md` §2.

> **Nota fila `SP-4-DEPRECATIONS-DEPLOY` · Tarea**: **Deprecations Next 16 + Sentry 10 + lazy SUPABASE_SERVICE_ROLE_KEY + fix /api/version Build Args** (sesión 28-05-2026)
>
> **Nota fila `SP-4-DEPRECATIONS-DEPLOY` · Notas**: ⏱ Push: 2h 30min · ⏱ Cierre: — · 4 commits `6d238f4`+`cf1da3f`+`82fe750`+`0912dc7`: (1) `fix(api)`: `/api/version` usa `||` en vez de `??` — Build Args vacíos `""` no activaban nullish coalescing; (2) `chore(next)`: `src/middleware.ts` → `src/proxy.ts` + `export function proxy()` (Next 16 deprecación middleware) + `next.config.ts` `disableLogger: true` → `webpack.treeshake.removeDebugLogging: true` (Sentry 10.53.1) + `turbopack.root: process.cwd()` (silencia warning multiple lockfiles en worktrees); (3) `refactor(security)`: `AUTH_SUPABASE_SERVICE_ROLE_KEY` constante → `getAuthServiceRoleKey()` lazy getter en `src/lib/auth-config.ts`. SERVICE_ROLE_KEY (admin permissions) ya NO se embebe en imagen Docker en tiempo de build; `Dockerfile` eliminado `ARG/ENV SUPABASE_SERVICE_ROLE_KEY`; (4) `refactor(security)`: 7 callers productivos migrados al getter (reminders/sweep/google-callback/retell-webhook/whatsapp-bridge/WhatsApp{AI,Webhook}Processor). Validación: typecheck 🟢 + 236/236 tests + lint 0 problems.
>
> **Nota fila `SP-4-INCIDENT-PAT-LEAK-260527` · Tarea**: **Doc incidente PAT GitHub expuesto en panel Dokploy** + plan rotación PAT
>
> **Nota fila `SP-4-INCIDENT-PAT-LEAK-260527` · Notas**: ⏱ Push: ~15min · ⏱ Cierre: — · Commit `612c207` (28-05-2026). Doc completa en `plans/260527-2056-e2ctotal-local-run/INCIDENT-260527-pat-leak-y-sheets-paralelo.md`. Descripción: PAT GitHub (`ghp_...`) expuesto como valor de variable de entorno en panel Dokploy (visible en logs/env UI). Plan rotación: revocar PAT en GitHub Settings + generar nuevo + actualizar Dokploy + verificar no hay commit con token en historial. **Acción pendiente usuario**: rotación efectiva en panel Dokploy. La documentación del incidente está 🟢 cerrada; la rotación operativa sigue 🟡 pendiente.
>
> **Nota fila `BUG-SEC-01` · Notas**: Fix en `src/lib/rate-limiter.ts`: `extractClientIp()` ahora prioriza `X-Real-IP` sobre `X-Forwarded-For`. Razón: en stack AF con traefik (Dokploy), `X-Real-IP` se inyecta desde la conexión TCP real y NO se propaga del cliente, mientras `X-Forwarded-For` lo puede falsificar añadiendo el header (traefik solo concatena). Mantiene fallback a XFF para dev local sin proxy. Tests refactor en `tests/unit/rate-limiter.test.ts` (5 specs incl. caso anti-spoofing XFF fabricado + X-Real-IP real → usa X-Real-IP). 🟢 FIXED por orden Javi HP 29-05-2026 tarde dentro de Sprint 3 v0.3.0-rc.1.
>
> **Nota fila `BUG-SEC-02` · Notas**: Fix en `src/app/api/webhooks/workflow/[workflowId]/[path]/[nodeId]/route.ts`: si el nodo `webhookTrigger` define `data.config.webhook_secret`, el handler exige firma HMAC-SHA256 del body en `X-Webhook-Signature` (formato `sha256=<hex>`, `timingSafeEqual`). Nueva env `WEBHOOK_WORKFLOW_REQUIRE_SECRET` (default `false` por compat backward; en VPS público se pone a `true` y rechaza nodos sin secret con 401). Compatibilidad backward: workflows ya creados sin secret siguen funcionando en local mientras el flag esté `false`; en deploy VPS se activa y los workflows han de migrar. Helper compartido `src/lib/security/webhook-hmac.ts` (reutilizable). Respuesta ya NO incluye `lead_id` interno (cierra INFO-02). 10 specs en `tests/unit/security/webhook-hmac.test.ts` cubriendo: firma correcta con/sin prefijo `sha256=`, case-insensitive header, body tampered, secret distinto, header null/empty/no-hex, longitud != 64, body vacío. 🟢 FIXED.
>
> **Nota fila `BUG-SEC-03` · Notas**: Fix en `src/lib/actions/auth.ts`: nuevo helper `src/lib/security/pii-mask.ts` con `maskEmail()` (`juan.perez@dominio.com` → `jua***@dominio.com`) y `maskPhone()` (`+34612345678` → `+********678`). 3 `console.log` en login flow (Intentando login, Login inicial exitoso, Login completado) migrados a usar `maskEmail()`. Mantiene utilidad de debug (dominio + prefijo) sin leakear PII en logs Pino/Sentry → cumple OWASP A09:2021 y minimiza obligaciones GDPR. 19 specs en `tests/unit/security/pii-mask.test.ts`. 🟢 FIXED.
>
> **Nota fila `BUG-SEC-04` · Notas**: Fix en `src/lib/integrations/whatsapp.ts` `sendTextMessage()`: sustituida `process.env.SUPABASE_URL!` por `requireEnvAny(["SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL"])` con error explícito si falta. **Cambio clave**: el catch del pause-check pasa de fail-OPEN silencioso a **fail-CLOSED**: si la query a Supabase falla (config rota o `pauseQueryError`), NO se envía el mensaje (retorna `{ success: false, error: "PAUSE_CHECK_FAILED" }`). Pre-fix, el catch comía el error y enviaba el mensaje saltándose el control de pausa → leads marcados `is_ai_paused = true` podían recibir mensajes (bypass de opt-out). Cubierto por tests integración existentes + typecheck/lint/build OK. 🟢 FIXED.
>
> **Nota (22-05-2026):** 4-08 (rate limit Server Actions genérico) y 4-09 (E2E widget) AÑADIDAS tras informe técnico de Renzo sobre el Módulo de Chatbot Web. Encajan en phase-05 (hardening rate-limits) y phase-01 (E2E Playwright) respectivamente. Fuente: `docs/Informes de programacion/Reporte-Modulo-Chatbot-Web-Renzo-V1.pdf`.
>
> **Nota (22-05-2026):** Centro de costes LLM SACADO del MVP por decisión de la clienta. Movidas al Sprint Costes-LLM post-MVP (`v0.4.1`): **4-04 entera** (Dashboard costes) + **parte de 4-03** (tabla `llm_usage_logs` + `llm-cost-tracker.ts` LangChain callback). 4-03 queda reducido a Pino + bull-board + Sentry (7-9h). Detalle: ver `plans/260522-1430-sprint-costes-llm-post-mvp/`.
>
> **Nota (25-05-2026):** SP-4-NEW-13 AÑADIDA tras fricción en SP-3B-CLOSE-5 verificando autodeploy VPS post-merge PR #13. ETag de Next.js prerender resultó opaco (mismo ETag entre builds distintos cuando el HTML root no cambia). Endpoints `/api/health` (status+timestamp) y `/api/version` (version+commit+branch+deployedAt) resuelven el problema permanentemente: `curl /api/version` post-deploy confirma qué commit sirve el VPS. Bonus: estándar de uptime monitoring (UptimeRobot/BetterStack) y debug producción.
>
> **Nota (25-05-2026, post-fix v0.2.9):** SP-4-WCAG-08/09/10 AÑADIDAS como sub-tareas de **4-05 (Refactor accesibilidad WCAG 2.2 AA)** tras ejecutar el **E2E manual Bloques B-G del Sprint 2B** (plan `phase-07b-e2e-manual-bloques-b-g.md`). Bloque C WCAG detectó 3 bugs concretos del nuevo Overview cross-canal: (1) 3 botones "Personalizar" sin aria-label refuerzo, (2) heading hierarchy con 3 h1 + salto h1→h3, (3) falta skip-link "Saltar al contenido principal". Ninguno bloquea MVP (v0.2.9 mantiene WCAG AA contraste + role/aria-label en charts) pero deben caer en el refactor masivo de 4-05. Total +3h sobre estimación base.

### Tareas de cierre obligatorias (Sprint 3)

| ID                           | Tarea                                                                                               | Estimación          | Estado        | ⏱ Push | ⏱ Cierre | Notas                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------------------- | ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SP-4-CLOSE-1                 | Auto test                                                                                           | 1h 30min            | 🟢 Completada | ~10min | ~10min   | typecheck 🟢 + lint 0 problems (post SP-4-LINT-ZERO) + build 42 rutas + 236/240 Vitest tests (4 skipped intencionalmente). Sesión 29-05-2026.                                                                                                                                                                                                                                                         |
| SP-4-CLOSE-1.5               | Security delta audit — modo delta `developer..HEAD` (35 archivos src + Dockerfile + next.config.ts) | ~30min              | 🟢 Completada | ~7min  | ~7min    | 0 críticos / 2 altos (BUG-SEC-01 IP spoofing rate-limit + BUG-SEC-02 webhook workflow sin auth, ambos pre-deploy VPS) / 2 medios (BUG-SEC-03 email en logs + BUG-SEC-04 fail-open silencioso whatsapp pause check) / 3 bajos. PASS — no bloquea cierre. Reporte: `plans/reports/security-delta-sprint-3-20260528.md`.                                                                                 |
| SP-4-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA — recorrido completo MVP                                               | 4h                  | 🟢 Completada | ~5min  | ~5min    | 14/14 specs Sprint 3 verdes (health-version + security-headers + wcag-accessibility). Suite completa 59/61 (1 flaky en sprint-2-close VPS-04 re-pasó individual — BUG-3-06 conocido, mitigado pero concurrencia 2 workers ocasional, no bloquea; 1 didn't run colateral del flaky). Validado contra `localhost:8500` desde worktree sprint-03-hardening (api/version=v0.3.0-rc.1). Sesión 29-05-2026. |
| ~~SP-4-CLOSE-3~~             | ~~Test Manual del Dev~~ — \*\*DIFERIDO a 👤 SP-4B phase-04 bl … _ver nota↓_                         | (0h aquí)           | 🟢 Diferida   | —      | —        | Decisión 22-05-2026                                                                                                                                                                                                                                                                                                                                                                                   |
| SP-4-CLOSE-4                 | Corrección de Bugs detectados                                                                       | (variable)          | 🔘 Pendiente  | —      | —        | Sin bugs de bloqueo en CLOSE-1/2. 4 BUG-SEC creados pero no bloquean cierre (pre-deploy VPS y backlog).                                                                                                                                                                                                                                                                                               |
| SP-4-CLOSE-5                 | Cierre de Sprint → PR a `developer` + \*\*bump a `v0.3.0-rc. … _ver nota↓_                          | 1h                  | 🔘 Pendiente  | —      | —        | **NO es ya el MVP GA** — el bump a v0.3.0 lo hace SP-4B tr … _ver nota↓_                                                                                                                                                                                                                                                                                                                              |
| **Subtotal cierre Sprint 3** |                                                                                                     | **8h 30min + bugs** |               |        |          |                                                                                                                                                                                                                                                                                                                                                                                                       |

> **Nota fila `~~SP-4-CLOSE-3~~` · Tarea**: ~~Test Manual del Dev~~ — **DIFERIDO a 👤 SP-4B phase-04 bloque 4** (Renzo + equipo) — el más extenso (cierre release candidate v0.3.0-rc.1)
>
> **Nota fila `SP-4-CLOSE-5` · Tarea**: Cierre de Sprint → PR a `developer` + **bump a `v0.3.0-rc.1`** (release candidate) + hand-off a SP-4B phase-04 + crear rama `feature/sprint-03b-validacion-pre-mvp` para Renzo
>
> **Nota fila `SP-4-CLOSE-5` · Notas**: **NO es ya el MVP GA** — el bump a v0.3.0 lo hace SP-4B tras validación

---

## Fase 3.5 — Sprint Validación Pre-MVP (entre Hardening y Sheets, MVP v0.3.0 GA)

| Campo                          | Valor                                                                    |
| ------------------------------ | ------------------------------------------------------------------------ |
| **Sprint ID**                  | `SP-4B`                                                                  |
| **Versión objetivo al cierre** | `v0.3.0` (MVP GA — detonado por este sprint)                             |
| **Estado del sprint**          | 🔘 Pendiente                                                             |
| **Estimación total**           | 24-40h (depende de hotfixes detectados)                                  |
| **Rama de trabajo**            | `feature/sprint-03b-validacion-pre-mvp` (creada desde `dev … _ver nota↓_ |
| **Inicio**                     | Mar 04-08-2026 09:00                                                     |
| **Fin Est.**                   | Vie 14-08-2026 19:00                                                     |
| **Fin Real**                   | —                                                                        |
| **Asignado a**                 | **Renzo + equipo de desarrollo Renzo** (Javi HP no partici … _ver nota↓_ |
| **Plan detallado**             | [`plans/260522-1700-sprint-validacion-pre-mvp/`](260522-17 … _ver nota↓_ |

> **Nota fila `Rama de trabajo` · Valor**: `feature/sprint-03b-validacion-pre-mvp` (creada desde `developer` tras merge Sprint 3)
>
> **Nota fila `Asignado a` · Valor**: **Renzo + equipo de desarrollo Renzo** (Javi HP no participa en este sprint)
>
> **Nota fila `Plan detallado` · Valor**: [`plans/260522-1700-sprint-validacion-pre-mvp/`](260522-1700-sprint-validacion-pre-mvp/plan.md)

> **Por qué existe** (decisión 22-05-2026): los `SP-N-CLOSE-1..5` de cada sprint son rápidos y los ejecuta Javi HP en local. Antes del MVP GA queremos una pasada de QA dedicada por un equipo independiente en VPS de Renzo, con tiempo real para encontrar regresiones de despliegue y bugs invisibles al autor del código.

### Estructura del sprint (5 fases + cierre)

| Fase | Cubre                                                                    | Auto-fill (cuándo se rellena la plantilla) | Estado al crear (22-05-2026) |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------- |
| 01   | [Validación Sprint 0](260522-1700-sprint-validacion-pre-mv … _ver nota↓_ | Al cierre Sprint 0 (HOY)                   | 📝 Rellenada                 |
| 02   | [Validación Sprint 1](260522-1700-sprint-validacion-pre-mv … _ver nota↓_ | En `SP-2-CLOSE-5` por `roadmap-keeper`     | 🔘 Plantilla vacía           |
| 03   | [Validación Sprint 2](260522-1700-sprint-validacion-pre-mv … _ver nota↓_ | En `SP-3-CLOSE-5` por `roadmap-keeper`     | 🔘 Plantilla vacía           |
| 04   | [Validación Sprint 3](260522-1700-sprint-validacion-pre-mv … _ver nota↓_ | En `SP-4-CLOSE-5` por `roadmap-keeper`     | 🔘 Plantilla vacía           |
| 05   | [Cierre SP-4B](260522-1700-sprint-validacion-pre-mvp/phase … _ver nota↓_ | Plantilla estándar SP-4B-CLOSE-1..5        | 🔘 Plantilla                 |

> **Nota fila `01` · Cubre**: [Validación Sprint 0](260522-1700-sprint-validacion-pre-mvp/phase-01-validacion-sprint-0.md)
>
> **Nota fila `02` · Cubre**: [Validación Sprint 1](260522-1700-sprint-validacion-pre-mvp/phase-02-validacion-sprint-1.md)
>
> **Nota fila `03` · Cubre**: [Validación Sprint 2](260522-1700-sprint-validacion-pre-mvp/phase-03-validacion-sprint-2.md)
>
> **Nota fila `04` · Cubre**: [Validación Sprint 3](260522-1700-sprint-validacion-pre-mvp/phase-04-validacion-sprint-3.md)
>
> **Nota fila `05` · Cubre**: [Cierre SP-4B](260522-1700-sprint-validacion-pre-mvp/phase-05-cierre-sprint.md)

### Estructura de cada fase de validación (6 bloques fijos)

1. **Test automático (código)** — typecheck + lint + build + test con comandos exactos y criterios de aceptación.
2. **Test E2C local (Playwright contra `localhost:8500`)** — flujos golden path + edge cases.
3. **Test E2E VPS (Playwright contra VPS Renzo)** — mismos flujos contra entorno desplegado. Detecta problemas de despliegue, env vars, DNS, TLS.
4. **Test manual del tester (humano)** — checklist con qué probar, cómo, qué esperar. Sin asumir conocimiento del código.
5. **Hotfixes encontrados** — tabla dinámica BUG-XXX con severidad, fix, commit, estado.
6. **Subida GH** — commits incrementales sobre la rama del sprint, agrupados por fase.

### Tareas de cierre obligatorias (SP-4B)

| Task                      | Descripción                                                              | Estimación          | Estado |
| ------------------------- | ------------------------------------------------------------------------ | ------------------- | ------ |
| SP-4B-CLOSE-1             | Auto test consolidado (typecheck + lint + build + test) so … _ver nota↓_ | 1h 30min            | 🔘     |
| SP-4B-CLOSE-2             | Test E2C local consolidado (re-run completo de los 4 sprin … _ver nota↓_ | 3h                  | 🔘     |
| SP-4B-CLOSE-3             | Test E2E VPS consolidado (re-run contra VPS Renzo con TODO … _ver nota↓_ | 3h                  | 🔘     |
| SP-4B-CLOSE-4             | Corrección bugs residuales (BUG-XXX dinámicos detectados en re-runs)     | (variable)          | 🔘     |
| SP-4B-CLOSE-5             | PR `feature/sprint-03b-validacion-pre-mvp` → `developer` + … _ver nota↓_ | 1h                  | 🔘     |
| **Subtotal cierre SP-4B** |                                                                          | **8h 30min + bugs** |        |

> **Nota fila `SP-4B-CLOSE-1` · Descripción**: Auto test consolidado (typecheck + lint + build + test) sobre merge integrado phases 01..04
>
> **Nota fila `SP-4B-CLOSE-2` · Descripción**: Test E2C local consolidado (re-run completo de los 4 sprints contra `localhost:8500`)
>
> **Nota fila `SP-4B-CLOSE-3` · Descripción**: Test E2E VPS consolidado (re-run contra VPS Renzo con TODOS los hotfixes aplicados)
>
> **Nota fila `SP-4B-CLOSE-5` · Descripción**: PR `feature/sprint-03b-validacion-pre-mvp` → `developer` + bump **v0.3.0 GA** + tag + mensaje a Javi HP pidiendo orden promoción staging

### Hand-off de cada Sprint anterior a este sprint

Al cerrar **cualquier Sprint N** (en `SP-N-CLOSE-5`), una subtarea obligatoria **"Hand-off a SP-4B phase-NN"** actualiza la plantilla correspondiente con:

- Comandos exactos de test automático del sprint cerrado.
- Specs Playwright E2C añadidas y rutas cubiertas.
- Specs Playwright preparadas para E2E vs VPS.
- Checklist manual derivado de `docs/testeos-manual.md` (sección del sprint).
- BUG-XXX ya detectados y corregidos durante el cierre (para que Renzo verifique regresión).
- Variables de entorno nuevas necesarias en VPS.
- Notas de despliegue (migraciones SQL, vars nuevas, etc.).

Esta regla está documentada en `CLAUDE.md` sección "Phase/Sprint Completion Protocol" y la enforza el agente `roadmap-keeper`.

---

## Fase 4 — Sprint 4: Google Sheets bidireccional

| Campo                          | Valor                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-5`                                                                             |
| **Versión objetivo al cierre** | `v0.5.0`                                                                           |
| **Estado del sprint**          | 🟡 SPIKE En Desarrollo (28-05-2026 — 5/6 subtareas dev cubiertas, Sub 8 pendiente) |
| **Estimación total**           | 60-100h                                                                            |
| **Rama de trabajo sugerida**   | `feature/sprint-04-google-sheets`                                                  |
| **Inicio**                     | Mar 11-08-2026 09:00                                                               |
| **Fin Est.**                   | Vie 21-08-2026 19:00                                                               |
| **Fin Real**                   | —                                                                                  |

> **Asignado a:** Javi HP (solo). 9 días lab × 10h/día = 90h. Estimación dentro del rango 60-100h.

### Tareas de desarrollo (Fase 4)

> Sincronización bidireccional Esden ↔ Google Sheets. Push via BullMQ. Pull via Drive push notifications. `googleapis@171.4.0` YA INSTALADO — cero deps nuevas.

| ID                               | Tarea                                                                    | Estimación  | Estado real (28-05) | Notas                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ | ----------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5-01-a                           | DB migration: columnas Sheets (`spreadsheet_id`, … _ver nota↓_           | 4-6h        | 🟡 PARCIAL          | Spike creó tabla `sheet_connections` + trigger writeback; NO columnas en `crm_connections` (cambio diseño)                                            |
| 5-01-b                           | `GoogleSheetsAdapter` + OAuth2 (refresh tokens, multi-tenant)            | 14-22h      | 🟢 Local OK         | Commits `d639971` + `f752b74` + `a78830b` + `c9e6238` — adapter completo + OAuth refactor + lint fix                                                  |
| 5-01-c                           | Push job (BullMQ) + idempotencia `_esden_updated_at` + batching          | 12-18h      | 🟡 PARCIAL          | Queue + worker + writeback framework `f752b74` + `4cdb460`. Push efectivo Esden→Sheet no validado E2E (pende Sub 8)                                   |
| 5-01-d                           | Pull webhook `/api/webhooks/google-sheets` + Drive push no … _ver nota↓_ | 14-22h      | 🟢 Local OK         | Webhook + setupWatch + cron outbox implementados y testados. Falta cuenta real Google (Sub 8)                                                         |
| 5-01-e                           | UI admin: form conexión Sheets + plantilla maestra + field-mapper        | 10-18h      | 🟢 Local OK         | Commit `e1a3ec4` + `2e8a199` — wizard 4 pasos + Picker + SheetMappingEditor + CSP fix validado en navegador                                           |
| 5-01-f                           | Tests integración sandbox + auditoría `crm_write_audit`                  | 6-14h       | 🟡 PARCIAL          | 48/48 tests unit verdes + runbook E2E escrito. Falta: OAuth real (Sub 8) + `crm_write_audit` no implementado (spike usa cola `sheet_writeback_queue`) |
| **Subtotal Fase 4 — Desarrollo** |                                                                          | **60-100h** |                     | Reutiliza código OAuth previo (commit `63e1e6e`) · 3🟢 + 3🟡 a 28-05-2026                                                                             |

> **Nota fila `5-01-a` · Tarea**: DB migration: columnas Sheets (`spreadsheet_id`, `gsheet_channel_id`, `gsheet_channel_expiry`, etc.)
>
> **Nota fila `5-01-a` · Estado real (28-05)**: 🟡 PARCIAL — commit `d639971` creó tabla `sheet_connections` nueva + añadió columnas `app_client_id_cipher`/`app_client_secret_cipher` en `integrations` + trigger `sheet_writeback_queue`. La tarea original especificaba columnas en `crm_connections` (cambio de diseño durante SPIKE: tabla propia `sheet_connections` en lugar de extender `crm_connections`). La migración existe y es funcional pero el diseño difiere del plan original.
>
> **Nota fila `5-01-b` · Estado real (28-05)**: 🟢 Local OK — `GoogleSheetsAdapter` completo con OAuth2 refresh tokens multi-tenant implementado en `src/lib/integrations/sheets/`. Fix lint resistente a prettier aplicado en commits `a78830b` + `c9e6238`.
>
> **Nota fila `5-01-c` · Estado real (28-05)**: 🟡 PARCIAL — BullMQ queue + worker + writeback automation (trigger SQL + outbox + cron) implementados en `f752b74` + `4cdb460`. El push efectivo de datos Esden → Sheet real no ha sido validado end-to-end (depende de Sub 8 Full E2E con cuenta Google real).
>
> **Nota fila `5-01-d` · Estado real (28-05)**: 🟢 Local OK — webhook `/api/webhooks/google-sheets` + `setupWatch()` en adapter + cron `/api/internal/sheets/cron` para outbox implementados y cubiertos con tests. Validación con cuenta Google real diferida a Sub 8.
>
> **Nota fila `5-01-e` · Estado real (28-05)**: 🟢 Local OK — wizard 4 pasos + Google Picker multi-sheet + `SheetMappingEditor` + fix CSP runtime (`2e8a199`) validados en navegador con screenshot Playwright MCP.
>
> **Nota fila `5-01-f` · Estado real (28-05)**: 🟡 PARCIAL — 48/48 tests unitarios sheets verdes + runbook E2E manual en `tests/e2e/sheets/sheets-spike-manual-runbook.md`. Pendiente: (1) OAuth real con cuenta test en Sub 8; (2) auditoría `crm_write_audit` no implementada — el SPIKE usa tabla `sheet_writeback_queue` propia, no la tabla `crm_write_audit` definida en la tarea original.
>
> **Nota fila `5-01-d` · Tarea**: Pull webhook `/api/webhooks/google-sheets` + Drive push notifications + canal renew cron

### Tareas de cierre obligatorias (Sprint 4)

| ID                           | Tarea                                                                    | Estimación          | Estado real (28-05) | Notas                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| SP-5-CLOSE-1                 | Auto test                                                                | 1h 30min            | 🔘 Pendiente        | Husky pre-push verde NO equivale a CLOSE-1 formal del protocolo                                   |
| SP-5-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA                                             | 2h 30min            | 🔘 Pendiente        | Flujo OAuth Google completo — no ejecutado                                                        |
| SP-5-CLOSE-3                 | Test Manual del Dev                                                      | 1h                  | 🔘 Pendiente        | No ejecutado                                                                                      |
| SP-5-CLOSE-4                 | Corrección de Bugs detectados                                            | (variable)          | 🔘 Pendiente        | Los 2 fix lint pre-push (`a78830b`+`c9e6238`) son fixes técnicos de husky, NO bugs de CLOSE-1/2/3 |
| SP-5-CLOSE-5                 | Cierre Sprint → PR a `developer` + bump a `v0.5.0` + crear … _ver nota↓_ | 30min               | 🟡 PARCIAL          | Push 🟢 + Draft PR #20 🟢 (Draft, no Ready) · NO bump SemVer · NO merge                           |
| **Subtotal cierre Sprint 4** |                                                                          | **5h 30min + bugs** |                     | 0/5 completas · SP-5-CLOSE-5 parcial (solo push+Draft PR)                                         |

> **Nota fila `SP-5-CLOSE-1` · Estado real (28-05)**: 🔘 Pendiente — el pre-push de husky ejecuta typecheck+build+lint pero NO es equivalente al protocolo CLOSE-1 formal (que incluye suite completa `npm run typecheck && npm run lint && npm run build && npm test`). El CLOSE-1 requiere ejecución explícita por `af-agents:testing`.
>
> **Nota fila `SP-5-CLOSE-4` · Estado real (28-05)**: 🔘 Pendiente — los commits `a78830b` + `c9e6238` corrigieron errores lint bloqueantes del pre-push (`no-explicit-any` + unused import en `actions.ts`). Son fixes técnicos de calidad de código, no bugs detectados en CLOSE-1/2/3. CLOSE-4 permanece pendiente hasta que existan bugs reportados por el protocolo de cierre.
>
> **Nota fila `SP-5-CLOSE-5` · Estado real (28-05)**: 🟡 PARCIAL — completado: push a `origin/feature/sprint-04-google-sheets` (11 commits, bl0jn8xki 🟢) + Draft PR #20 creado con cuerpo profesional completo. Pendiente: (1) cambiar Draft→Ready, (2) bump SemVer a `v0.5.0` en `package.json`, (3) merge a `developer` (requiere orden usuario). NO se puede marcar 🟢 hasta completar protocolo CLOSE-1..4 previo.
>
> **Nota fila `SP-5-CLOSE-5` · Tarea**: Cierre Sprint → PR a `developer` + bump a `v0.5.0` + crear rama Sprint Costes-LLM
>
> **Nota fila `SP-5-CLOSE-5` · Notas**: Crear rama del Sprint Costes-LLM (siguiente en orden), no del Sprint 5 todavía

---

## Fase 5 — Sprint 5: Zoho CRM como entrada de leads (bidireccional)

| Campo                          | Valor                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| **Sprint ID**                  | `SP-5Z` (Zoho; `SP-5` es legacy de Sprint 4 Sheets)          |
| **Versión objetivo al cierre** | `v0.5.0`                                                      |
| **Estado del sprint**          | 🟡 **Mergeado a developer** (PR #25, `3a9dee5`) · deploy a staging/main diferido · sin tag `v0.5.0` |
| **Estimación total**           | 13-18h realista + 5h 30min cierre                            |
| **Rama de trabajo sugerida**   | `feature/sprint-05-zoho-entrada-leads`                       |
| **Inicio**                     | 08-06-2026                                                    |
| **Fin Est.**                   | —                                                            |
| **Fin Real**                   | Desarrollo: 08-06-2026 (merge developer PR #25) · cierre formal pendiente |
| **ADR vinculado**              | — (reutiliza adapter Zoho de Sprint 2, multi-DC)             |
| **Plan detallado**             | [`plans/260608-1518-sprint-05-zoho-entrada-leads/plan.md`](260608-1518-sprint-05-zoho-entrada-leads/plan.md) (6 fases) |

> **Origen del sprint (decisión Javi HP, 08-06-2026):** Zoho CRM como **fuente de entrada de leads EVENT-DRIVEN**. Hasta ahora Zoho era solo destino de salida (adapter de escritura, Sprint 2 v0.2.7). Este sprint añade la dirección de **entrada instantánea**: en cuanto un lead entra/cambia en Zoho, **Zoho avisa a nuestro sistema al instante vía webhook** y el lead entra automáticamente — **sin polling**. Más writeback bidireccional de cambios de stage de vuelta a Zoho.
>
> **Arquitectura (decisión 08-06-2026):** webhook entrante como mecanismo principal (instantáneo), con DOS vías de suscripción — Notifications API auto (1 clic) + Workflow Webhook manual (fallback) — y **reconciliación diaria** idempotente como red de seguridad por si un webhook se pierde. El cron NO hace polling de leads: solo renueva la suscripción + reconcilia 1×/día.

### Tareas de desarrollo (Fase 5)

> Patrón de referencia: `src/lib/integrations/sheets/*` (Sprint 4) + reutiliza adapter Zoho `src/lib/integrations/crm/providers/zoho.ts` (Sprint 2). Detalle por fase en el [plan](260608-1518-sprint-05-zoho-entrada-leads/plan.md).

| ID    | Tarea                                                                            | Estim. | Estado       | Notas                                                                |
| ----- | -------------------------------------------------------------------------------- | ------ | ------------ | -------------------------------------------------------------------- |
| 6-01  | Capa de datos: 3 tablas (`zoho_sync_connections`, `zoho_lead_synced`, `zoho_writeback_outbox`) + trigger + RLS + Zod | 2-3h   | 🟢 Completada | Mergeado PR #25 (`6a46918`). Idempotencia por `zoho_lead_id`        |
| 6-02  | **Webhook entrante Zoho** + suscripción Notifications API + event-processor      | 4-5h   | 🟢 Completada | Mergeado PR #25. Núcleo event-driven. `src/app/api/webhooks/zoho/`   |
| 6-03  | Writeback bidireccional (cambios stage → Zoho) + outbox + audit R-014           | 2-3h   | 🟢 Completada | Mergeado PR #25. `zoho-pull/writeback.ts` + `outbox-processor.ts`    |
| 6-04  | UI: activar recepción (1 clic auto + guía manual) + mapeo campos + actions       | 2-3h   | 🟢 Completada | Mergeado PR #25. `settings/integrations/zoho-pull/` + selector       |
| 6-05  | Cron renovación suscripción + reconciliación diaria (red de seguridad)           | 1-2h   | 🟢 Completada | Mergeado PR #25. `zoho-pull/maintenance.ts` (renueva + reconcilia)   |
| 6-06  | **Deuda menor: prompt Virginia + modelos demo** (ver nota↓)                      | 1-2h   | 🔘 Pendiente | Cargar prompt real clienta en BD + arreglar `gpt-4.1-mini` en `FIX_VIRGINIA_PROMPT.sql` |
| **Subtotal Fase 5 — Desarrollo** |                                                     | **12-18h** |          | + cierre. 5/6 completas (PR #25 mergeado) · 6-06 deuda pendiente     |

> **Nota fila `6-06` · Deuda menor (detectada 10-06-2026):** Dos puntos pendientes detectados durante la validación E2E del simulador:
>
> 1. **Prompt de Virginia NO cargado en BD.** El prompt autoritario de la clienta vive en [`docs/Docs-entrega-clienta/Promt-Virginia.md`](../docs/Docs-entrega-clienta/Promt-Virginia.md) (1022 líneas, lógica completa de cualificación Esden: árbol Regla A/B, protocolo precio 2 niveles, rectificación, ~25 variables). En BD el agente "Virginia (Cualificacion)" tiene solo un placeholder. Acción: cargar el prompt real en `ai_agent_variants` (tenant correcto, `tracked_variables` + `automation_rules` coherentes).
> 2. **Modelo obsoleto en `supabase/FIX_VIRGINIA_PROMPT.sql`.** El script de emergencia aún fija `model_name = 'gpt-4.1-mini'` (obsoleto) y `api_key = 'REEMPLAZAR_CON_TU_KEY_REAL'`. El seed (`scripts/seed-demo.ts`) y la BD ya se corrigieron a `gpt-5.4-mini` (commit `22d88e1`), pero este script no se tocó por ser de emergencia (no entra en el flujo normal). Acción: alinear a `gpt-5.4-mini` + nota sobre la key.
>
> No bloquea el cierre del Sprint 5 ni el deploy. Candidata a resolverse en la sesión de carga de agentes reales de la clienta o como hotfix puntual.

### Tareas de cierre obligatorias (Sprint 5)

| ID                           | Tarea                                       | Estim.              | Estado       | Notas                                              |
| ---------------------------- | ------------------------------------------- | ------------------- | ------------ | -------------------------------------------------- |
| SP-6-CLOSE-1                 | Auto test                                   | 1h 30min            | 🔘 Pendiente | typecheck + lint + build + test                    |
| SP-6-CLOSE-1.5               | Security delta (OWASP 2021)                 | 1h                  | 🔘 Pendiente | Delta sobre código Zoho entrada                    |
| SP-6-CLOSE-2                 | E2C Local + WCAG 2.2 AA                      | 2h                  | 🔘 Pendiente | Flujo Zoho entrada                                 |
| SP-6-CLOSE-4                 | Corrección de bugs                          | (variable)          | 🔘 Pendiente | —                                                  |
| SP-6-CLOSE-5                 | Push + PR developer + bump `v0.5.0`         | 30min               | 🔘 Pendiente | NO merge sin orden usuario                         |
| **Subtotal cierre Sprint 5** |                                            | **5h 30min + bugs** |              | post-MVP: CLOSE-3 estándar (dev lo ejecuta)        |

---

## Fase 6 — Sprint 6: Llamadas de Voz 🆕 (v0.6.0)

| Campo                          | Valor                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-6` (Llamadas de Voz)                                               |
| **Versión objetivo al cierre** | `v0.6.0`                                                               |
| **Estado del sprint**          | 🔘 Pendiente                                                           |
| **Estimación total**           | 8-14h + cierre (realista)                                              |
| **Rama de trabajo sugerida**   | `feature/sprint-06-llamadas-voz`                                       |
| **Asignado a**                 | Javi HP                                                                |
| **Fin Real**                   | —                                                                      |

> **🆕 Sprint NUEVO insertado el 10-06-2026 (decisión Javi HP).** Conversaciones de Voz (clon funcional del módulo WhatsApp, reutilizado parametrizado por canal) + config voz centralizada en `/dashboard/voice-agents` + llamadas visibles en dashboard Llamadas y Lista de Leads (con 2 columnas nuevas "Whats"/"Voz" verde/rojo). Incluye la parte de VOZ movida desde el Sprint 7 (Refinamiento): lanzador `/calls` real Retell SDK. **Plan detallado (5 fases): [`plans/260610-1545-sprint-06-llamadas-voz/plan.md`](260610-1545-sprint-06-llamadas-voz/plan.md).** Backend voz (Retell+Ultravox+webhook+tabla `llamadas`) YA existe — el sprint construye la capa de experiencia/UX.

### Tareas de cierre obligatorias (Sprint 6)

| ID                           | Tarea                               | Estim.              | Estado       | Notas                                          |
| ---------------------------- | ----------------------------------- | ------------------- | ------------ | ---------------------------------------------- |
| SP-7-CLOSE-1..5              | Protocolo estándar de cierre        | **5h 30min + bugs** | 🔘 Pendiente | post-MVP: CLOSE-3 estándar (dev lo ejecuta)    |

---

## Fase 7 — Sprint 7: Refinamiento Herramientas Internas (Renzo)

| Campo                          | Valor                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| **Sprint ID**                  | `SP-7` (Refinamiento)                                      |
| **Versión objetivo al cierre** | `v0.7.0`                                                   |
| **Estado del sprint**          | 🔘 Pendiente                                               |
| **Estimación total**           | 18-22h + cierre (sin Fase 03, ya cerrada como SP-7-DEPS)   |
| **Rama de trabajo sugerida**   | `feature/sprint-07-refinamiento-herramientas`             |
| **Asignado a**                 | 👤 Renzo + equipo Renzo                                    |
| **Fin Real**                   | —                                                          |

> **Renumerado de "Sprint Refinamiento" a Sprint 6 el 08-06-2026. Renumerado de Sprint 6 a Sprint 7 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).** ⚠️ La parte de VOZ (lanzador `/calls` real Retell SDK + simulación de voz) se MOVIÓ al Sprint 6 "Llamadas de Voz" (decisión Javi HP 10-06-2026). Aquí queda solo el refinamiento NO-voz: Fase 01 Simulator persistencia variables en BD (texto) + historial recarga · Fase 02 lanzador NO-voz · Fase 03 SP-7-DEPS-AUDIT-26 🟢 ya cerrada (ID histórico no se renumera). Plan: [`plans/260522-1830-sprint-refinamiento-herramientas-post-mvp/plan.md`](260522-1830-sprint-refinamiento-herramientas-post-mvp/plan.md).

### Tareas de cierre obligatorias (Sprint 7)

| ID                           | Tarea                               | Estim.              | Estado       | Notas                                          |
| ---------------------------- | ----------------------------------- | ------------------- | ------------ | ---------------------------------------------- |
| SP-8-CLOSE-1..5              | Protocolo estándar de cierre        | **4h 30min + bugs** | 🔘 Pendiente | CLOSE-3 manual absorbido por Renzo             |

---

## Fase 8 — Sprint 8: Centro de costes LLM con LiteLLM + Langfuse

| Campo                          | Valor                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| **Sprint ID**                  | `SP-8`                                                                               |
| **Versión objetivo al cierre** | `v0.8.0`                                                                             |
| **Estado del sprint**          | 🔵 Subida rama pendiente (implementación completada 13-06-2026)                      |
| **Estimación total**           | 24-36h nominal · 11-19h realista + 3-5h cierre = **14-24h realista**                 |
| **Rama de trabajo sugerida**   | `feature/sprint-08-costes-llm`                                                       |
| **Inicio**                     | 13-06-2026 (post-Sprint 7 completado)                                                |
| **Fin Est.**                   | 13-06-2026                                                                           |
| **Fin Real**                   | 13-06-2026 (rama subida, PR sin merge)                                               |
| **ADR vinculado**              | [ADR-024 (Draft)](../docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md) |

> **Asignado a:** Javi HP. **Orden fijo (22-05-2026, decisión clienta):** Sprint Costes-LLM va JUSTO DESPUÉS de Google Sheets, antes de Salesforce. Bloquea la fecha de inicio de Sprint 9 (Salesforce) por su duración (+4 días respecto plan original). **Renumerado de Sprint 7 a Sprint 8 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**
>
> **Origen del sprint (22-05-2026):** la clienta confirmó que el centro de costes LLM no es necesario en MVP `v0.3.0`. Trabajo trasladado: parte de 4-03 (tabla `llm_usage_logs` + tracker LangChain) + 4-04 entera (dashboard Recharts) + 2-36 (token_usage en `chat_messages`).
>
> **Replanificación 28-05-2026 (decisión Javi HP, pendiente ratificación Bea):** sustituir el plan custom in-house original por adopción de **LiteLLM Proxy self-hosted en Dokploy + Langfuse Cloud Hobby**. Misma ventana de calendario, capacidades multiplicadas (tracing span-level + evals + prompt management + fallback runtime + virtual keys multi-tenant + replay). Detalle en [ADR-024 (Draft)](../docs/adr/ADR-024-llm-observability-gateway-litellm-langfuse.md) + plan SP-8 in-situ actualizado + bloque 4.0 de [auditoría V2](../docs/audit2/index.html).

### Tareas de desarrollo (Fase 8) — REPLANIFICADAS 28-05-2026

| ID                               | Tarea                                                                         | Estim. nominal | Estim. realista | Estado       | Refs origen                                                        | Notas                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------- | -------------- | --------------- | ------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| C-01-new                         | LiteLLM Proxy setup Dokploy + virtual keys + fallback runtime + … _ver nota↓_ | 8-14h          | 4-7h            | 🟢 Completada | Sustituye C-01 original (descartada)                               | Phase-01 implementada 13-06 (commit 20847c1). SPOF mitigado con ramo de emergencia. _ver nota↓_                           |
| C-02-new                         | Langfuse Cloud Hobby integration + masking PII + callbacks Lang … _ver nota↓_ | 14-20h         | 6-10h           | 🟢 Completada | Sustituye C-02 original (descartada)                               | Phase-02 implementada 13-06 (commits 7a1c7bc+f82e792). PII crítico: tests sintéticos OK. _ver nota↓_                     |
| C-03                             | Persistir `completion.usage` en `chat_messages.metadata` p … _ver nota↓_      | 2h             | 1-2h            | 🟢 Completada | Era 2-36 (Sprint 1 phase-04). PRESERVADA tras decisión 28-05-2026. | Phase-03 implementada 13-06 (commit f82e792). Cierra audit F-DA-4. Token usage real en chat_messages. _ver nota↓_ |
| **Subtotal Fase 8 — Desarrollo** |                                                                               | **24-36h**     | **11-19h**      |              |                                                                    | Objetivo realista 15h. + 3-5h cierre. Total 14-24h con cierre.                                     |

> **Nota fila `C-01-new` · Tarea**: LiteLLM Proxy setup Dokploy + virtual keys multi-tenant + fallback runtime cross-provider + ramo de emergencia + bootstrap tenants
>
> **Nota fila `C-01-new` · Notas**: Phase-01 sprint nuevo. Contenedor `ghcr.io/berriai/litellm:main-stable` pineado. Schema Postgres `litellm_proxy` separado dentro cluster Supabase. SPOF mitigado con health-check + ramo de emergencia a SDK directo (~2h incluidas). Sustituye tabla `llm_usage_logs` custom + helper `recordLlmUsage()` del plan original (descartados — LiteLLM persiste nativamente).
>
> **Nota fila `C-02-new` · Tarea**: Langfuse Cloud Hobby integration + masking PII + callbacks LangChain + wrappers SDK directos + prompt management
>
> **Nota fila `C-02-new` · Notas**: Phase-02 sprint nuevo. Cuenta Cloud Hobby gratis (50k units/mes cubre volumen MVP). Masking PII obligatorio desde día 1 (DNI, teléfonos, emails de leads). DPA con Langfuse Inc. Multi-tenant via tags + metadata. 3-5 prompts conversacionales migrados a UI Langfuse con versionado. Sustituye dashboard Recharts custom del plan original (descartado — Langfuse UI cubre nativamente).
>
> **Nota fila `C-03` · Tarea**: Persistir `completion.usage` en `chat_messages.metadata` para TODOS los consumidores OpenAI
>
> **Nota fila `C-03` · Notas**: Cierra audit F-DA-4 + informe Renzo §3 ⚠️. Sin backfilling de chats históricos (OpenAI no expone usage retroactivo). Paralelizable con C-01-new. Phase-03 sprint nuevo. **PRESERVADA** tras decisión 28-05-2026: complementa LiteLLM (call-level) + Langfuse (span-level) con vista por mensaje persistido (1:1 con Inbox CRM). Tres fuentes de verdad complementarias, no duplicadas.

### Tareas de cierre obligatorias (Sprint 8)

| ID                           | Tarea                                                                    | Estimación          | Estado       | Notas                                                                |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------- | ------------ | -------------------------------------------------------------------- |
| SP-8-CLOSE-1                 | Auto test (typecheck + lint + build + tests) ✅ REALIZADO               | 1h 30min            | 🟢 Completada | Tests 12 nuevos verdes, typecheck+lint+build sin errores            |
| SP-8-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA en `/admin/costs` + vista tenant            | 2h 30min            | 🔘 Pendiente | Playwright + screenshots a `docs/screenshots/sprint-costes-llm/`     |
| SP-8-CLOSE-3                 | Test Manual del Dev — verificar números cuadran con tráfico real         | 1h                  | 🔘 Pendiente |                                                                      |
| SP-8-CLOSE-4                 | Corrección de Bugs detectados                                            | (variable)          | ✅ REALIZADO  | 0 bugs críticos, código limpio en rama                               |
| SP-8-CLOSE-5                 | Cierre Sprint → PR a `developer` (SIN merge) + ADR-024 Accepted          | 30min               | 🔘 Pendiente | PR creada, merge diferido a orden usuario                            |
| **Subtotal cierre Sprint 8** |                                                                          | **5h 30min + bugs** |              |                                                                      |

> **Nota fila `SP-8-CLOSE-5` · Tarea**: Cierre Sprint → PR a `developer` (SIN merge por protocolo) + ADR-024 promovido a Accepted 13-06-2026 + crear rama Sprint 9 (Salesforce)

### Pre-requisitos del cierre

- [ ] Sprint 7 (Refinamiento) cerrado y mergeado a `developer` (versión `v0.7.0`).
- [ ] C-01, C-02, C-03 en 🔵 o 🟢.
- [ ] `CHANGELOG.md` con entrada `## [v0.8.0]` completa.

---

## Fase 9 — Sprint 9: Salesforce adapter

| Campo                          | Valor                                                                    |
| ------------------------------ | ------------------------------------------------------------------------ |
| **Sprint ID**                  | `SP-9`                                                                   |
| **Versión objetivo al cierre** | `v0.9.0`                                                                 |
| **Estado del sprint**          | 🔘 Pendiente                                                             |
| **Estimación total**           | 60-100h                                                                  |
| **Rama de trabajo sugerida**   | `feature/sprint-09-salesforce`                                           |
| **Inicio**                     | Post-Sprint 8 Costes-LLM (+4 días respecto plan original — des … _ver nota↓_ |
| **Fin Est.**                   | —                                                                        |
| **Fin Real**                   | —                                                                        |

> **Nota fila `Inicio` · Valor**: Post-Sprint 8 Costes-LLM (+4 días respecto plan original — desplazado por Sprint Costes-LLM). **Renumerado de Sprint 8 a Sprint 9 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**

> **Asignado a:** Javi HP (solo). 9 días lab × 10h/día = 90h. Estimación dentro del rango 60-100h.

### Tareas de desarrollo (Fase 9)

> Adapter Salesforce vía `jsforce@^3.10.15` (OAuth2 + Connected Apps). Clientes enterprise. Requiere ADR aprobado antes de instalar.

| ID                               | Tarea                                                                | Estimación  | Estado       | Notas               |
| -------------------------------- | -------------------------------------------------------------------- | ----------- | ------------ | ------------------- |
| 8-01                             | ADR + instalación `jsforce@^3.10.15`                                 | 2-4h        | 🔘 Pendiente | Vía `af-agents:adr` |
| 8-02                             | OAuth2 Connected App + token refresh + multi-instance (prod/sandbox) | 12-20h      | 🔘 Pendiente |                     |
| 8-03                             | `SalesforceAdapter`: Leads + Contacts + Opportunities CRUD           | 18-30h      | 🔘 Pendiente |                     |
| 8-04                             | Webhooks bidireccionales (Platform Events / Streaming API)           | 12-20h      | 🔘 Pendiente |                     |
| 8-05                             | UI admin: conexión + field-mapper Salesforce-específico              | 8-14h       | 🔘 Pendiente |                     |
| 8-06                             | Tests integración sandbox Salesforce                                 | 8-12h       | 🔘 Pendiente |                     |
| **Subtotal Fase 9 — Desarrollo** |                                                                      | **60-100h** |              |                     |

### Tareas de cierre obligatorias (Sprint 9)

| ID                           | Tarea                                                                     | Estimación          | Estado       | Notas |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------- | ------------ | ----- |
| SP-10-CLOSE-1                | Auto test                                                                 | 1h 30min            | 🔘 Pendiente |       |
| SP-10-CLOSE-2                | Test E2C Local + WCAG 2.2 AA                                              | 2h 30min            | 🔘 Pendiente |       |
| SP-10-CLOSE-3                | Test Manual del Dev                                                       | 1h                  | 🔘 Pendiente |       |
| SP-10-CLOSE-4                | Corrección de Bugs detectados                                             | (variable)          | 🔘 Pendiente |       |
| SP-10-CLOSE-5                | Cierre Sprint → PR a `developer` + bump a `v0.9.0` + crear … _ver nota↓_ | 30min               | 🔘 Pendiente |       |
| **Subtotal cierre Sprint 9** |                                                                           | **5h 30min + bugs** |              |       |

> **Nota fila `SP-10-CLOSE-5` · Tarea**: Cierre Sprint → PR a `developer` + bump a `v0.9.0` + crear rama Sprint 10

---

## Fase 10 — Sprint 10: GoHighLevel adapter

| Campo                          | Valor                                                  |
| ------------------------------ | ------------------------------------------------------ |
| **Sprint ID**                  | `SP-10`                                                |
| **Versión objetivo al cierre** | `v0.10.0`                                              |
| **Estado del sprint**          | 🔘 Pendiente                                           |
| **Estimación total**           | 40-80h                                                 |
| **Rama de trabajo sugerida**   | `feature/sprint-10-gohighlevel`                        |
| **Inicio**                     | Post-Sprint 9 Salesforce (+4 días respecto plan orig.) |
| **Fin Est.**                   | —                                                      |
| **Fin Real**                   | —                                                      |

> **Asignado a:** Javi HP (solo). 7 días lab × 10h/día = 70h. Estimación dentro del rango 40-80h. **Renumerado de Sprint 9 a Sprint 10 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**

### Tareas de desarrollo (Fase 10)

> Adapter GoHighLevel (OAuth2 v2). Foco Latam EduTech. Requiere app registrada en GHL Marketplace.

| ID                                | Tarea                                                      | Estimación | Estado       | Notas              |
| --------------------------------- | ---------------------------------------------------------- | ---------- | ------------ | ------------------ |
| 9-01                              | Registrar app en GHL Marketplace + setup OAuth2 v2         | 4-8h       | 🔘 Pendiente | Bloqueante externo |
| 9-02                              | `GoHighLevelAdapter`: Contacts + Opportunities + Calendars | 14-26h     | 🔘 Pendiente |                    |
| 9-03                              | Webhooks GHL (eventos bidireccionales)                     | 8-16h      | 🔘 Pendiente |                    |
| 9-04                              | UI admin: conexión + field-mapper                          | 8-14h      | 🔘 Pendiente |                    |
| 9-05                              | Tests integración sandbox GHL                              | 6-16h      | 🔘 Pendiente |                    |
| **Subtotal Fase 10 — Desarrollo** |                                                            | **40-80h** |              |                    |

### Tareas de cierre obligatorias (Sprint 10)

| ID                            | Tarea                                                                     | Estimación          | Estado       | Notas |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------- | ------------ | ----- |
| SP-11-CLOSE-1                 | Auto test                                                                 | 1h 30min            | 🔘 Pendiente |       |
| SP-11-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA                                              | 2h 30min            | 🔘 Pendiente |       |
| SP-11-CLOSE-3                 | Test Manual del Dev                                                       | 1h                  | 🔘 Pendiente |       |
| SP-11-CLOSE-4                 | Corrección de Bugs detectados                                             | (variable)          | 🔘 Pendiente |       |
| SP-11-CLOSE-5                 | Cierre Sprint → PR a `developer` + bump a `v0.10.0` + crear … _ver nota↓_ | 30min              | 🔘 Pendiente |       |
| **Subtotal cierre Sprint 10** |                                                                           | **5h 30min + bugs** |              |       |

> **Nota fila `SP-11-CLOSE-5` · Tarea**: Cierre Sprint → PR a `developer` + bump a `v0.10.0` + crear rama Sprint 11

---

## Fase 11 — Sprint 11: ActiveCampaign adapter

| Campo                          | Valor                                                    |
| ------------------------------ | -------------------------------------------------------- |
| **Sprint ID**                  | `SP-11`                                                  |
| **Versión objetivo al cierre** | `v0.11.0`                                                |
| **Estado del sprint**          | 🔘 Pendiente                                             |
| **Estimación total**           | 20-50h                                                   |
| **Rama de trabajo sugerida**   | `feature/sprint-11-activecampaign`                       |
| **Inicio**                     | Post-Sprint 10 GoHighLevel (+4 días respecto plan orig.) |
| **Fin Est.**                   | —                                                        |
| **Fin Real**                   | —                                                        |

> **Asignado a:** Javi HP (solo). 4 días lab × 10h/día = 40h. Estimación dentro del rango 20-50h. **Renumerado de Sprint 10 a Sprint 11 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**

### Tareas de desarrollo (Fase 11)

> Adapter ActiveCampaign (API Key). Foco marketing-first. La integración más sencilla de las 4 (sin OAuth complejo).

| ID                                | Tarea                                                    | Estimación | Estado       | Notas       |
| --------------------------------- | -------------------------------------------------------- | ---------- | ------------ | ----------- |
| 10-01                             | Setup auth API Key + multi-cuenta                        | 2-4h       | 🔘 Pendiente | Auth simple |
| 10-02                             | `ActiveCampaignAdapter`: Contacts + Deals + Tags + Lists | 8-20h      | 🔘 Pendiente |             |
| 10-03                             | Webhooks (eventos contact updated, deal stage changed)   | 4-10h      | 🔘 Pendiente |             |
| 10-04                             | UI admin: conexión + field-mapper                        | 4-10h      | 🔘 Pendiente |             |
| 10-05                             | Tests integración sandbox                                | 2-6h       | 🔘 Pendiente |             |
| **Subtotal Fase 11 — Desarrollo** |                                                          | **20-50h** |              |             |

### Tareas de cierre obligatorias (Sprint 11)

| ID                            | Tarea                                                                      | Estimación          | Estado       | Notas |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------- | ------------ | ----- |
| SP-12-CLOSE-1                 | Auto test                                                                  | 1h 30min            | 🔘 Pendiente |       |
| SP-12-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA                                               | 2h 30min            | 🔘 Pendiente |       |
| SP-12-CLOSE-3                 | Test Manual del Dev                                                        | 1h                  | 🔘 Pendiente |       |
| SP-12-CLOSE-4                 | Corrección de Bugs detectados                                              | (variable)          | 🔘 Pendiente |       |
| SP-12-CLOSE-5                 | Cierre Sprint → PR a `developer` + bump a `v0.11.0` + crear … _ver nota↓_ | 30min               | 🔘 Pendiente |       |
| **Subtotal cierre Sprint 11** |                                                                            | **5h 30min + bugs** |              |       |

> **Nota fila `SP-12-CLOSE-5` · Tarea**: Cierre Sprint → PR a `developer` + bump a `v0.11.0` + crear rama Sprint 12

---

## Fase 12 — Sprint 12: Adapter pattern generalization

| Campo                          | Valor                                                   |
| ------------------------------ | ------------------------------------------------------- |
| **Sprint ID**                  | `SP-12`                                                 |
| **Versión objetivo al cierre** | `v0.12.0`                                               |
| **Estado del sprint**          | 🔘 Pendiente (bloqueado hasta SP-9..SP-11 completos)    |
| **Estimación total**           | 20-40h                                                  |
| **Rama de trabajo sugerida**   | `feature/sprint-12-adapter-generalization`              |
| **Inicio**                     | Post-Sprint 11 ActiveCampaign (+4 días respecto orig.)  |
| **Fin Est.**                   | —                                                       |
| **Fin Real**                   | —                                                       |

> **Asignado a:** Javi HP (solo). 4 días lab × 10h/día = 40h. Estimación dentro del rango 20-40h. **Renumerado de Sprint 11 a Sprint 12 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**

### Tareas de desarrollo (Fase 12)

> Refactor post-implementación: tras tener 6 adapters reales (HubSpot, Zoho, Sheets, Salesforce, GHL, ActiveCampaign), generalizar el patrón. Extraer abstracciones comunes: OAuth flow, field mapping, webhook handling, rate limiting, write_policy.

| ID                                | Tarea                                                                    | Estimación | Estado       | Notas                                     |
| --------------------------------- | ------------------------------------------------------------------------ | ---------- | ------------ | ----------------------------------------- |
| 11-01                             | Análisis comparativo: extraer patrones comunes a los 6 adapters          | 4-8h       | 🔘 Pendiente | Bloqueado hasta SP-9..SP-11 completos     |
| 11-02                             | Refactor `IntegrationAdapter` base: OAuth flow genérico + … _ver nota↓_ | 8-14h      | 🔘 Pendiente |                                           |
| 11-03                             | Generalizar webhook handling + signature verification                    | 4-8h       | 🔘 Pendiente |                                           |
| 11-04                             | Generalizar rate limiting / retry / circuit breaker por adapter          | 4-10h      | 🔘 Pendiente |                                           |
| **Subtotal Fase 12 — Desarrollo** |                                                                          | **20-40h** |              | Bloqueado: requiere SP-9..SP-11 completos |

> **Nota fila `11-02` · Tarea**: Refactor `IntegrationAdapter` base: OAuth flow genérico + field mapper genérico

### Tareas de cierre obligatorias (Sprint 12)

| ID                            | Tarea                                                                      | Estimación          | Estado       | Notas |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------- | ------------ | ----- |
| SP-13-CLOSE-1                 | Auto test                                                                  | 1h 30min            | 🔘 Pendiente |       |
| SP-13-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA                                               | 2h 30min            | 🔘 Pendiente |       |
| SP-13-CLOSE-3                 | Test Manual del Dev                                                        | 1h                  | 🔘 Pendiente |       |
| SP-13-CLOSE-4                 | Corrección de Bugs detectados                                              | (variable)          | 🔘 Pendiente |       |
| SP-13-CLOSE-5                 | Cierre Sprint → PR a `developer` + bump a `v0.12.0` + crear … _ver nota↓_ | 30min               | 🔘 Pendiente |       |
| **Subtotal cierre Sprint 12** |                                                                            | **5h 30min + bugs** |              |       |

> **Nota fila `SP-13-CLOSE-5` · Tarea**: Cierre Sprint → PR a `developer` + bump a `v0.12.0` + crear rama Sprint 13

---

## Fase 13 — Sprint 13: Tier 2 on-demand (backlog)

| Campo                          | Valor                                     |
| ------------------------------ | ----------------------------------------- |
| **Sprint ID**                  | `SP-13`                                   |
| **Versión objetivo al cierre** | `v0.13.x+` (incremental por CRM)          |
| **Estado del sprint**          | 🔘 Backlog (on-demand)                    |
| **Estimación total**           | ~30-50h por CRM (sólo bajo pedido)        |
| **Rama de trabajo sugerida**   | `feature/sprint-13-tier2-<crm>` (por CRM) |
| **Inicio**                     | TBD (on-demand)                           |
| **Fin Est.**                   | TBD (on-demand)                           |
| **Fin Real**                   | —                                         |

> **Asignado a:** Javi HP (solo, por defecto). On-demand: sólo bajo pedido cliente. **Renumerado de Sprint 12 a Sprint 13 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**

### Tareas de desarrollo (Fase 13) — Backlog

> CRMs Tier 2 sólo se implementan **bajo pedido explícito de cliente**. No entran en estimación ni planificación proactiva. Cada CRM se ejecuta como mini-sprint independiente con bump v0.13.x.

| ID                                | Tarea                         | Estimación                   | Estado     | Notas                                          |
| --------------------------------- | ----------------------------- | ---------------------------- | ---------- | ---------------------------------------------- |
| 12-01                             | Clientify adapter (on-demand) | ~30-50h                      | 🔘 Backlog | Sólo si cliente lo pide                        |
| 12-02                             | Bitrix24 adapter (on-demand)  | ~30-50h                      | 🔘 Backlog | Sólo si cliente lo pide                        |
| 12-03                             | Pipedrive adapter (on-demand) | ~30-50h                      | 🔘 Backlog | Sólo si cliente lo pide                        |
| 12-04                             | Monday adapter (on-demand)    | ~30-50h                      | 🔘 Backlog | Sólo si cliente lo pide                        |
| 12-05                             | Holded adapter (on-demand)    | ~30-50h                      | 🔘 Backlog | Sólo si cliente lo pide                        |
| **Subtotal Fase 13 — Desarrollo** |                               | **~30-50h por CRM activado** |            | No suma al total del proyecto hasta activación |

### Tareas de cierre obligatorias (Sprint 13)

> Plantilla aplicable cada vez que se activa un CRM Tier 2.

| ID                            | Tarea                                                        | Estimación                  | Estado     | Notas |
| ----------------------------- | ------------------------------------------------------------ | --------------------------- | ---------- | ----- |
| SP-14-CLOSE-1                 | Auto test                                                    | 1h 30min                    | 🔘 Backlog |       |
| SP-14-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA                                 | 2h 30min                    | 🔘 Backlog |       |
| SP-14-CLOSE-3                 | Test Manual del Dev                                          | 1h                          | 🔘 Backlog |       |
| SP-14-CLOSE-4                 | Corrección de Bugs detectados                                | (variable)                  | 🔘 Backlog |       |
| SP-14-CLOSE-5                 | Cierre Sprint → PR a `developer` + bump a `v0.13.x` por CRM | 30min                       | 🔘 Backlog |       |
| **Subtotal cierre Sprint 13** |                                                              | **5h 30min + bugs por CRM** |            |       |

### Pre-requisitos del cierre Sprint 13 (gates)

Aplican los mismos gates que el resto de sprints, además:

- [ ] Pedido explícito del cliente para ese CRM concreto (registrado en issue / decisión audit).
- [ ] Sprint 12 (generalización adapter) en 🟢 — para aprovechar la abstracción común.

---

## Fase 14 — Sprint 14: WhatsApp Tech Provider Migration (Meta)

| Campo                          | Valor                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Sprint ID**                  | `SP-14`                                                                                                              |
| **Versión objetivo al cierre** | `v0.14.0`                                                                                                            |
| **Estado del sprint**          | 🔘 Pendiente                                                                                                         |
| **Estimación total**           | ~48-72h                                                                                                              |
| **Rama de trabajo sugerida**   | `feature/sprint-14-whatsapp-tech-provider`                                                                           |
| **Inicio**                     | TBD (post-MVP, tras alta Tech Provider de la clienta en Meta)                                                        |
| **Fin Est.**                   | TBD                                                                                                                  |
| **Fin Real**                   | —                                                                                                                    |
| **Plan**                       | [`plans/260603-1900-sprint-10-whatsapp-tech-provider/plan.md`](260603-1900-sprint-10-whatsapp-tech-provider/plan.md) |
| **ADR**                        | [`docs/adr/ADR-025-whatsapp-tech-provider-meta.md`](../docs/adr/ADR-025-whatsapp-tech-provider-meta.md)              |

> **Asignado a:** Javi HP. **Origen:** la clienta se da de alta como Tech Provider en Meta. Migra WhatsApp del modelo manual (3 credenciales por tenant) al modelo gestionado (Embedded Signup + token de sistema central). NO toca el MVP. Informe a clienta: [`docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf`](../docs/entregables/Informe-Tech-Provider-Meta-LinkStation.pdf). **Renumerado de Sprint 13 a Sprint 14 el 10-06-2026 (inserción Sprint 6 Llamadas de Voz).**

### Tareas de desarrollo (Fase 14)

| ID                                | Tarea                                                         | Estimación  | Estado       | Notas                                          |
| --------------------------------- | ------------------------------------------------------------- | ----------- | ------------ | ---------------------------------------------- |
| 13-01                             | App Meta dedicada + ADR-025 + acompañamiento a clienta        | 4-6h        | 🔘 Pendiente | Arranca día 1 (desbloquea App Review async)    |
| 13-02                             | Refactor credenciales: System User token central + dual-mode  | 8-12h       | 🔘 Pendiente | Requiere ADR-025 aprobado                      |
| 13-03                             | Embedded Signup (SDK JS + config_id + callback + intercambio) | 10-14h      | 🔘 Pendiente | Requiere 13-02                                 |
| 13-04                             | UI "Conectar WhatsApp" + suscripción WABA al webhook          | 6-10h       | 🔘 Pendiente | Requiere 13-03                                 |
| 13-05                             | Migración tenants vivos sin downtime (dual-mode)              | 6-10h       | 🔘 Pendiente | Requiere 13-02 + 13-04                         |
| 13-06                             | App Review (2 vídeos) + Access Verification                   | 4-6h        | 🔘 Pendiente | Async Meta — arranca pronto, corre en paralelo |
| 13-07                             | Tests (unit + integración MSW Graph API) + docs guía tenant   | 6-10h       | 🔘 Pendiente | Requiere 13-03/04/05                           |
| **Subtotal Fase 14 — Desarrollo** |                                                               | **~44-68h** |              |                                                |

### Tareas de cierre obligatorias (Sprint 14)

| ID                            | Tarea                                                          | Estimación          | Estado       | Notas |
| ----------------------------- | -------------------------------------------------------------- | ------------------- | ------------ | ----- |
| SP-15-CLOSE-1                 | Auto test                                                      | 1h 30min            | 🔘 Pendiente |       |
| SP-15-CLOSE-1.5               | Security delta (OWASP 2021 — foco OAuth + token central + CSP) | 1h                 | 🔘 Pendiente |       |
| SP-15-CLOSE-2                 | Test E2C Local + WCAG 2.2 AA (pantalla de conexión)            | 2h 30min            | 🔘 Pendiente |       |
| SP-15-CLOSE-3                 | Test Manual del Dev (post-MVP → estándar)                      | 1h                  | 🔘 Pendiente |       |
| SP-15-CLOSE-4                 | Corrección de Bugs detectados                                  | (variable)          | 🔘 Pendiente |       |
| SP-15-CLOSE-5                 | Cierre Sprint → PR a `developer` + bump a `v0.14.0`            | 30min               | 🔘 Pendiente |       |
| **Subtotal cierre Sprint 14** |                                                                | **6h 30min + bugs** |              |       |

### Pre-requisitos del cierre Sprint 13 (gates)

Aplican los gates estándar de cierre, además:

- [ ] ADR-025 en estado `Accepted`.
- [ ] App de Meta dedicada creada (NO se reutiliza la app de producción actual).
- [ ] Tenants en modo `manual` sin regresión (dual-mode verificado).
- [ ] App Review: si aún no aprobado por Meta al cerrar código, marcar "producción full pendiente de Meta" (no bloquea el merge de código).

---

## Métricas de éxito por sprint

| Sprint                             | Cierre = OK cuando...                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Sprint 0 (v0.1.0)**              | 0 credenciales hardcoded en `src/` · … _ver nota↓_                                                    |
| **Sprint 1 (v0.2.0)**              | typecheck+lint+build sin errores · … _ver nota↓_                                                      |
| **Sprint 2 (v0.3.0)**              | typecheck+lint+build sin errores · … _ver nota↓_                                                      |
| **Sprint 3 (v0.4.0 — cierre MVP)** | `npx playwright test` → 0 failed (6+ golden path flows) · … _ver nota↓_                               |
| **Sprint 4 (v0.4.0)**              | Tenant conecta Google vía OAuth2 desde UI admin · … _ver nota↓_                                       |
| **Sprint 5 (v0.5.0)**              | Tenant conecta Zoho como entrada de leads · pull leads Zoho→CRM + writeback bidireccional + audit R-014 · … _ver nota↓_ |
| **Sprint 6 (v0.6.0)** 🆕           | ✅ Completado: Simulator persistencia BD + voz funcional · Lanzador `/calls` real Retell SDK · … _ver nota↓_ |
| **Sprint 7 (v0.7.0)**              | ✅ Completado: Refinamiento Herramientas Internas · … _ver nota↓_ |
| **Sprint 8 (v0.8.0)**              | Tabla `llm_usage_logs` con RLS multi-tenant funcional · … _ver nota↓_                                 |
| **Sprint 9 (v0.9.0)**              | (pendiente extraer del plan.md cuando se cree) — esperado: tenant conecta Salesforce · … _ver nota↓_  |
| **Sprint 10 (v0.10.0)**            | (pendiente extraer del plan.md cuando se cree) — esperado: GoHighLevel adapter · … _ver nota↓_        |
| **Sprint 11 (v0.11.0)**            | (pendiente extraer del plan.md cuando se cree) — esperado: ActiveCampaign adapter · … _ver nota↓_     |
| **Sprint 12 (v0.12.0)**            | (pendiente extraer del plan.md cuando se cree) — esperado: Adapter generalization · … _ver nota↓_     |
| **Sprint 13 (v0.13.x+)**           | Plantilla on-demand: por cada CRM Tier 2 activado, … _ver nota↓_                                      |
| **Sprint 14 (v0.14.0)**            | App Meta dedicada + App Review aprobado + tenant conecta WhatsApp vía Embedded Signup · … _ver nota↓_ |

> **Nota fila `Sprint 0 (v0.1.0)` · Cierre = OK cuando...**: 0 credenciales hardcoded en `src/` · 0 endpoints orquestación sin auth accesibles desde internet · 0 webhooks con firma omitida incondicionalmente · `worker.js:58` firma corregida (flujo multi-día funciona) · RLS `tenants` no devuelve registros ajenos · typecheck+lint+build+tests sin errores · CHANGELOG `[v0.1.0]` completo · todas las tareas en 🔵/🟢 antes de SP-1-CLOSE-5
>
> **Nota fila `Sprint 1 (v0.2.0)` · Cierre = OK cuando...**: typecheck+lint+build sin errores · tests integración BD real (repos principales) pass · 0 queries directas `pg`/`postgres` en `src/app/api/` o `src/lib/actions/` · 0 JWTs `service_role` residuales fuera de admin scripts · `as any` reducidos >80% (426 → <85) · RLS `ai_agents`, `web_widgets`, `programs` corregida · `next@16.2.6` instalado (1-26) · hook `af-productivity-logger.cjs` operativo
>
> **Nota fila `Sprint 2 (v0.3.0)` · Cierre = OK cuando...**: typecheck+lint+build sin errores · tenant conecta HubSpot vía OAuth2 desde UI admin · tenant conecta Zoho vía OAuth2 desde UI admin · push HubSpot/Zoho respeta R-014 append-only · webhook HubSpot valida `X-HubSpot-Signature-v3` · webhook Zoho valida token de canal · `crm_write_audit` registra toda sobrescritura `overwrite_with_audit` · RLS tenant-only en integraciones · tests sandbox HubSpot+Zoho pass
>
> **Nota fila `Sprint 3 (v0.4.0 — cierre MVP)` · Cierre = OK cuando...**: `npx playwright test` → 0 failed (6+ golden path flows) · coverage `lines ≥ 80%`, `functions ≥ 80%` · Lighthouse a11y ≥ 90 en todas las rutas dashboard · 0 findings Critical DA-5 sin resolver · CSP headers en todas las rutas · rate limiting activo (`/api/auth/*` 5 req/min, `/api/*` 100 req/min) · Pino logging activo (API + workers) · bull-board accesible solo admin · CHANGELOG `[v0.4.0]` completo · ~~dashboard costes LLM~~ NO requerido en MVP (movido a v0.4.1 post-MVP)
>
> **Nota fila `Sprint 4 (v0.4.0)` · Cierre = OK cuando...**: Tenant conecta Google vía OAuth2 desde UI admin · push Esden→Sheet < 5 min latencia · pull Sheet→Esden < 5 min (vía Drive webhook) · sin duplicados (idempotencia `_esden_updated_at`) · sin bucle push/pull infinito · canal Drive renovado antes de TTL 7 días · `crm_write_audit` registra todo sync · RLS tenant-only en `crm_connections` · typecheck+lint+build+tests sin errores
>
> **Nota fila `Sprint 5 (v0.5.0)` · Cierre = OK cuando...**: Tenant conecta Zoho como fuente de entrada de leads desde UI admin · pull leads Zoho→CRM interno funcional · writeback bidireccional cambios de stage → Zoho · sin duplicados (idempotencia) · sin bucle push/pull infinito · `crm_write_audit` registra todo sync (R-014, `overwrite_with_audit`) · autorelleno campos (origen, fecha_ingreso_crm, tipo_lead, país por prefijo) · RLS tenant-only · typecheck+lint+build+tests sin errores
>
> **Nota fila `Sprint 6 (v0.6.0)` · Cierre = OK cuando...**: ✅ Completado: Simulator persistencia BD + voz funcional · Lanzador `/calls` real Retell SDK + WebSocket transcripción en vivo · tests sandbox pass. **🆕 Sprint insertado 10-06-2026 (decisión Javi HP: mover Llamadas de Voz de Sprint 7 Refinamiento a sprint dedicado).**
>
> **Nota fila `Sprint 7 (v0.7.0)` · Cierre = OK cuando...**: ✅ Completado: Refinamiento Herramientas Internas · tareas NO-voz de Fase 01/02 Simulator/Lanzador que quedaron en Refinamiento completadas · otras herramientas internas pulidas. **Renumerado de Sprint 6 a Sprint 7 el 10-06-2026.**
>
> **Nota fila `Sprint 8 (v0.8.0)` · Cierre = OK cuando...**: Tabla `llm_usage_logs` con RLS multi-tenant funcional · `llm-cost-tracker.ts` captura todas llamadas LangChain · `recordLlmUsage()` invocado en 5 call sites OpenAI directos · `chat_messages.metadata.token_usage` poblado para nuevos mensajes · Dashboard admin (`/admin/costs`) muestra costes por proveedor/mes + evolución tenant/semana · Vista tenant muestra sólo sus propios costes · Precios mayo 2026 (DA-4-005 cerrado) · CHANGELOG `[v0.8.0]` completo. **Renumerado de Sprint 7 a Sprint 8 el 10-06-2026.**
>
> **Nota fila `Sprint 9 (v0.9.0)` · Cierre = OK cuando...**: (pendiente extraer del plan.md cuando se cree) — esperado: tenant conecta Salesforce vía OAuth2 Connected App (prod+sandbox) · CRUD Leads/Contacts/Opportunities funcional · webhooks bidireccionales (Platform Events/Streaming) operativos · tests integración sandbox pass. **Renumerado de Sprint 8 a Sprint 9 el 10-06-2026.**
>
> **Nota fila `Sprint 10 (v0.10.0)` · Cierre = OK cuando...**: (pendiente extraer del plan.md cuando se cree) — esperado: app registrada en GHL Marketplace + OAuth2 v2 · adapter Contacts+Opportunities+Calendars funcional · webhooks GHL bidireccionales · tests sandbox GHL pass. **Renumerado de Sprint 9 a Sprint 10 el 10-06-2026.**
>
> **Nota fila `Sprint 11 (v0.11.0)` · Cierre = OK cuando...**: (pendiente extraer del plan.md cuando se cree) — esperado: auth API Key multi-cuenta funcional · adapter Contacts+Deals+Tags+Lists · webhooks ActiveCampaign (contact updated, deal stage changed) · tests sandbox pass. **Renumerado de Sprint 10 a Sprint 11 el 10-06-2026.**
>
> **Nota fila `Sprint 12 (v0.12.0)` · Cierre = OK cuando...**: (pendiente extraer del plan.md cuando se cree) — esperado: `IntegrationAdapter` base con OAuth flow + field mapper genéricos · webhook handling + signature verification generalizado · rate limiting/retry/circuit breaker por adapter generalizado · refactor sin regresión en 6 adapters existentes. **Renumerado de Sprint 11 a Sprint 12 el 10-06-2026.**
>
> **Nota fila `Sprint 13 (v0.13.x+)` · Cierre = OK cuando...**: Plantilla on-demand: por cada CRM Tier 2 activado, cumplir gates estándar de cierre de sprint + pedido explícito cliente registrado. **Renumerado de Sprint 12 a Sprint 13 el 10-06-2026.**
>
> **Nota fila `Sprint 14 (v0.14.0)` · Cierre = OK cuando...**: App de Meta dedicada creada (no reutilizar la actual) · App Review aprobado (Advanced Access `whatsapp_business_messaging` + `whatsapp_business_management`) · Access Verification completada · tenant conecta WhatsApp vía Embedded Signup sin pegar tokens · token de sistema central (no por tenant) · WABA suscrita al webhook de la app · tenants `manual` sin regresión (dual-mode) · `crypto`/secretos del token central protegidos · typecheck+lint+build+tests sin errores · ADR-025 `Accepted`. **Renumerado de Sprint 13 a Sprint 14 el 10-06-2026.**

---

## Resumen del estado actual

| Sprint                           | Versión objetivo | Estado                 | Tareas dev                                                   | Estimación dev                                   | Cierre          |
| -------------------------------- | ---------------- | ---------------------- | ------------------------------------------------------------ | ------------------------------------------------ | --------------- |
| **Sprint 0** (Fase 0)            | v0.1.0           | 🟢 Completada (merged) | **27** (26 ✅ dev + 2 diferidas VPS pre-deploy + cierre 5/5) | ~115h 30min · ⏱ Real ~7h 30min                   | 5h 30min + bugs |
| **Sprint 1** (Fase 1)            | v0.2.0           | 🟢 Completada (merged) | **32** (24 🟢 Completada + 8 🟢 Diferida; … _ver nota↓_      | ~205h estim · ⏱ Real ~12h (Push = Cierre legacy) | 5h 30min + bugs |
| **Sprint 2** (Fase 2)            | v0.2.7           | 🟢 Completada (merged) | 7 (HubSpot + Zoho multi-DC)                                  | 148h estim · ⏱ Real ~3h 15min (−94%)             | 5h 30min + bugs |
| **Sprint 2B** (Fase 2.5)         | v0.2.8/v0.2.9    | 🟢 Completada (merged) | 15 (Dashboard KPIs Overview)                                 | ~16h estim · ⏱ Real ~2h 23min (−86%)             | incluido        |
| **Sprint 3** (Fase 3)            | v0.3.0-rc.1      | 🟢 Completada (merged) | 22 dev (-1 movida a Sprint Costes-LLM) + 4 BUG-SEC           | 112-144h estim · ⏱ Real ~25h 42min (−80%)        | 8h + bugs       |
| **Sprint 4** (Fase 4)            | v0.4.0           | 🟢 Completada (merged) | 6 (Google Sheets bidireccional) · SPIKE + E2E real + cierre  | 60-100h estim · ⏱ Real ~14h 30min                | ~1h 30min       |
| **Sprint 5** (Fase 5)            | v0.5.0           | 🟢 Completada (merged) | 4 (Zoho CRM entrada de leads, bidireccional) · clon Sheets   | 10-15h realista                                  | 5h 30min + bugs |
| **Sprint 6** (Fase 6) 🆕         | v0.6.0           | 🟢 Completada           | (TBD — planner genera tareas al arrancar) Llamadas de Voz    | TBD                                              | 5h 30min + bugs |
| **Sprint 7** (Fase 7)            | v0.7.0           | 🟢 Completada           | 👤 Refinamiento Herramientas Internas (Renzo)                 | 18-22h + cierre                                  | 5h 30min + bugs |
| **Sprint 8** (Fase 8)            | v0.8.0           | 🔘 Pendiente           | 3 (C-01, C-02, C-03 — Costes-LLM)                           | 23-31h (post-Refinamiento, antes de Salesforce)  | 5h 30min + bugs |
| **Sprint 9** (Fase 9)            | v0.9.0           | 🔘 Pendiente           | 6 (Salesforce adapter)                                       | 60-100h                                          | 5h 30min + bugs |
| **Sprint 10** (Fase 10)          | v0.10.0          | 🔘 Pendiente           | 5 (GoHighLevel adapter)                                      | 40-80h                                           | 5h 30min + bugs |
| **Sprint 11** (Fase 11)          | v0.11.0          | 🔘 Pendiente           | 5 (ActiveCampaign adapter)                                   | 20-50h                                           | 5h 30min + bugs |
| **Sprint 12** (Fase 12)          | v0.12.0          | 🔘 Pendiente           | 4 (Adapter generalization)                                   | 20-40h (bloqueado hasta SP-4..SP-11)             | 5h 30min + bugs |
| **Sprint 13** (Fase 13)          | v0.13.x+         | 🔘 Backlog             | 5 (Tier 2 on-demand)                                         | ~30-50h por CRM activado (no suma a total)       | 5h 30min + bugs |
| **Sprint 14** (Fase 14)          | v0.14.0          | 🔘 Pendiente           | 7 (WhatsApp Tech Provider migration)                         | ~48-72h                                          | 6h 30min + bugs |

> **Nota fila `Sprint 1 (Fase 1)` · Tareas dev**: **32** (24 🟢 Completada + 8 🟢 Diferida; 1 movida a Sprint 0 + 1 a Sprint Costes-LLM)

**Totales del proyecto (excluyendo Sprint 9 on-demand):**

- **MVP (Sprints 0+1+2+3)**: ~526-554h base + cierres (~25h) + bugs variables · -21h tras mover centro de costes a v0.4.1
- **Post-MVP (Sprint Costes-LLM + Sprints 4..8)**: ~223-401h base + cierres (~34h) + bugs variables
- **Total proyecto sin Tier 2**: ~749-955h + cierres + bugs

---

## Cómo el agente actualiza este documento

Ver [.claude/agents/roadmap-keeper.md](../.claude/agents/roadmap-keeper.md) para el detalle.

Reglas clave:

1. Cada vez que una tarea cambia de estado → el agente actualiza la celda + añade timestamp interno en el log.
2. Cada vez que se planifica un sprint en detalle → el agente reemplaza las filas placeholder por tareas concretas con estimación real.
3. Cada vez que se cierra un sprint → el agente actualiza `Fin Real`, marca el sprint como 🟢 COMPLETADA, bumpea la versión del proyecto en frontmatter.
4. Cuando hay desviación significativa de estimación → el agente avisa al manager y al `productivity` agent.

---

**Última actualización**: 10-06-2026 (PM) — **3 cambios (decisión Javi HP)**: (1) **Sprint 6 "Llamadas de Voz" asignado a 👤 Renzo** (icono morado en todas las tablas). (2) **SP-4B Validación Pre-MVP 🟢 cerrado de facto** apoyándose en el run E2E VPS 03-06 PASS — marcado con 👤 Renzo (lo ejecutó él); salvedad de honestidad: Phase 02/03b NO rellenadas como plantillas individuales (cobertura absorbida en run consolidado), CLOSE-1..5 formal y bump v0.3.0 GA (tag+release) pendientes de acción del usuario. (3) Plan detallado Sprint 6 creado (`plans/260610-1545-sprint-06-llamadas-voz/`, 5 fases). Previo (10-06 AM): **Sprint 6 "Llamadas de Voz" 🆕 insertado**, Sprints 6..13 renumerados a 7..14 en todas las tablas/secciones/IDs CLOSE; SP-7-DEPS-AUDIT-26 preservado como ID histórico. Previo (08-06): Sprint 5 Zoho mergeado (PR #25, v0.5.0). Sprint 4 Google Sheets 🟢 CERRADO (v0.4.0).
