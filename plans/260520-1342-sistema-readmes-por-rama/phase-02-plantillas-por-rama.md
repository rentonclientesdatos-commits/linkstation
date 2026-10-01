# Phase 02 — Plantillas por rama (3 templates)

**Contexto:** [plan.md](plan.md) · [phase-01](phase-01-script-generador.md) · [CLAUDE.md](../../CLAUDE.md)

**last_updated:** 2026-05-20

## Overview

- **Prioridad:** P1 — paralela a phase-01, bloqueante de phase-06
- **Estado:** Pendiente
- **Estimación:** 1h
- **Archivos destino:** `scripts/readme-templates/` (3 archivos)
- **Dependencias:** Ninguna (paralela a phase-01)

## Key Insights

- Las plantillas se guardan en `scripts/readme-templates/` (no en `plans/`) porque los promote scripts sí se eliminan de staging/main, pero las plantillas en `scripts/` también se limpian al promover. Solo importa que estén en `developer` disponibles para el script.
- Los marcadores usan doble llave `{{MARKER}}` — compatible con template literals JS sin librerías.
- La info de "Quick Start" y "Stack" se hardcodea en las plantillas (no viene del RoadMap) — estos datos cambian rarísimo y requieren edición intencional.
- `{{LAST_UPDATED}}` viene del frontmatter del RoadMap (no de `Date.now()`) — así el timestamp refleja cuándo se actualizó el roadmap, no cuándo se generó el README.

## Marcadores definidos

### Marcadores comunes (los 3 templates)

| Marcador | Fuente | Ejemplo de output |
|----------|--------|-------------------|
| `{{PROJECT_VERSION}}` | RoadMap frontmatter `project_version` | `v0.0.0` |
| `{{LAST_UPDATED}}` | RoadMap frontmatter `last_updated` | `20-05-2026 14:00` |
| `{{STACK_TABLE}}` | Hardcoded en template | (tabla markdown de stack) |
| `{{QUICK_START}}` | Hardcoded en template | (bloque bash de comandos) |
| `{{FOLDER_STRUCTURE}}` | Hardcoded en template | (árbol de carpetas resumido) |

### Marcadores específicos por template

| Marcador | Template | Fuente |
|----------|---------|--------|
| `{{ROADMAP_FULL}}` | developer | `buildRoadmapFull()` — todas las fases + sprints + tareas |
| `{{CONTRIBUTING_SECTION}}` | developer | Hardcoded en template |
| `{{ROADMAP_BY_PHASE_AND_SPRINT}}` | staging | `buildRoadmapByPhaseAndSprint()` — fases + sprints, sin tareas |
| `{{ROADMAP_BY_SPRINT}}` | main | `buildRoadmapBySprint()` — solo sprints en tabla corta |

## Output esperado por bloque

### `{{ROADMAP_FULL}}` (developer) — ejemplo

```markdown
## RoadMap completo

> Fuente: `plans/RoadMap.md` · Actualizado: 20-05-2026 14:00

### Fase 0 — Sprint 0: Hotfixes de seguridad

| Campo | Valor |
|-------|-------|
| Sprint ID | SP-1 |
| Versión objetivo | v0.1.0 |
| Estado | 🔘 Pendiente |
| Estimación | 1-2 sem (40h–80h) |

#### Bloque 1.1 — Orquestador BullMQ

| ID | Tarea | Est. | Estado |
|----|-------|------|--------|
| 1-01 | Fix `worker.js:58` firma incorrecta... | 4h | 🔘 Pendiente |
| 1-02 | Fix `enqueueLeadStep` — quitar silenciado... | 3h | 🔘 Pendiente |

[... todas las tareas 1, 2, 3, 4, 5 ...]

### Resumen por sprint

| Sprint | Versión | Estado | Tareas dev | Est. dev |
|--------|---------|--------|-----------|---------|
| 1 | v0.1.0 | 🔘 Pendiente | 26 | ~100h 30min |
| 2 | v0.2.0 | 🔘 Pendiente | 33 | ~172h |
| 3 | v0.3.0 | 🔘 Pendiente | 7 (placeholder) | 2-3 sem |
| 4 | v0.4.0 | 🔘 Pendiente | 7 (placeholder) | 2-3 sem |
| 5 | v0.5.0+ | 🔘 Pendiente | 6 (placeholder) | 4-7 sem |
```

### `{{ROADMAP_BY_PHASE_AND_SPRINT}}` (staging) — ejemplo

```markdown
## RoadMap por fases

> Actualizado: 20-05-2026 14:00

| Sprint | Fase | Versión | Estado | % Completado | Est. total | Inicio | Fin Est. |
|--------|------|---------|--------|-------------|-----------|--------|---------|
| SP-1 | Hotfixes seguridad | v0.1.0 | 🔘 Pendiente | 0% | 1-2 sem | — | — |
| SP-2 | Capa de datos | v0.2.0 | 🔘 Pendiente | 0% | 3-4 sem | — | — |
| SP-3 | Adapter layer + CRMs | v0.3.0 | 🔘 Pendiente | 0% | 2-3 sem | — | — |
| SP-4 | Hardening (MVP) | v0.4.0 | 🔘 Pendiente | 0% | 2-3 sem | — | — |
| SP-5 | Post-release | v0.5.0+ | 🔘 Pendiente | 0% | 4-7 sem | — | — |
```

### `{{ROADMAP_BY_SPRINT}}` (main) — ejemplo

```markdown
## Releases

| Sprint | Versión | Estado | Release date |
|--------|---------|--------|-------------|
| SP-1 | v0.1.0 | 🔘 Pendiente | — |
| SP-2 | v0.2.0 | 🔘 Pendiente | — |
| SP-3 | v0.3.0 | 🔘 Pendiente | — |
| SP-4 | v0.4.0 — MVP | 🔘 Pendiente | — |
| SP-5 | v0.5.0+ | 🔘 Pendiente | — |
```

> Nota: "Release date" se rellena cuando el sprint pasa a 🟢 COMPLETADA (el `Fin Real` del RoadMap).

## Estructura de cada template

### developer (README.developer.template.md)

```
# linkstation

{{PROJECT_VERSION}} · {{LAST_UPDATED}}

[descripción breve]

## Stack

{{STACK_TABLE}}

## Quick Start

{{QUICK_START}}

## Estructura del proyecto

{{FOLDER_STRUCTURE}}

## RoadMap

{{ROADMAP_FULL}}

## Versión actual

Versión: **{{PROJECT_VERSION}}**

## Contribuir

{{CONTRIBUTING_SECTION}}

## Licencia

MIT
```

### staging (README.staging.template.md)

```
# linkstation · Staging

{{PROJECT_VERSION}} · {{LAST_UPDATED}}

[descripción breve — misma que developer]

## Stack

{{STACK_TABLE}}

## Quick Start

{{QUICK_START}}

## Estructura del proyecto

{{FOLDER_STRUCTURE}}

## Estado del proyecto

{{ROADMAP_BY_PHASE_AND_SPRINT}}

## Versión actual

Versión: **{{PROJECT_VERSION}}**

## Licencia

MIT
```

### main (README.main.template.md)

```
# linkstation

{{PROJECT_VERSION}} · {{LAST_UPDATED}}

[descripción breve — enfocada en el usuario final, sin referencias internas]

## Stack

{{STACK_TABLE}}

## Quick Start

{{QUICK_START}}

## Releases

{{ROADMAP_BY_SPRINT}}

## Versión actual

Versión: **{{PROJECT_VERSION}}**

## Licencia

MIT
```

## Reglas de contenido

- **Stack table** (hardcoded): Next.js 16, React 19, Tailwind, PostgreSQL (Supabase), BullMQ, LangChain, Retell/Ultravox. Máximo 7 filas.
- **Quick Start**: Bash/PowerShell. `git clone` + `npm install` + `cp .env.example .env.local` + `npm run dev`. No más de 15 líneas.
- **Folder structure**: Sólo carpetas top-level (`src/`, `supabase/`, `scripts/`, `public/`). Máximo 10 entradas.
- **Contributing** (solo developer): enlaza a `docs/dev-onboarding.md`, menciona ramas y flujo de PRs.
- **Descripción breve**: 2-3 oraciones. Developer = técnico, main = orientado al cliente/deploy.

## Ubicación final de templates (3-3 — Decisión confirmada)

**Path definitivo de producción: `scripts/readme-templates/`** — único path que usa el script.

Las 3 plantillas ya existen en su ubicación definitiva:

- `scripts/readme-templates/README.developer.template.md`
- `scripts/readme-templates/README.staging.template.md`
- `scripts/readme-templates/README.main.template.md`

La carpeta `plans/260520-1342-sistema-readmes-por-rama/templates/` queda como copia de referencia histórica del plan — NO es la fuente que usa el script en producción. Si se edita una plantilla, editar siempre `scripts/readme-templates/`, no la copia de `plans/`.

**Rationale:** Las plantillas en `scripts/` sobreviven al promote (promote solo elimina `plans/`, `docs/`, `.claude/`). Las plantillas son parte del tooling del script, no de la documentación de planificación.

## Todo list

- [ ] Escribir `README.developer.template.md` (templates/ del plan)
- [ ] Escribir `README.staging.template.md`
- [ ] Escribir `README.main.template.md`
- [ ] Verificar que todos los marcadores `{{...}}` están definidos en phase-01
- [ ] Verificar que no hay marcadores sin correspondencia en el script

## Success criteria

- Los 3 templates tienen exactamente los marcadores que el script sabe reemplazar — 0 marcadores huérfanos
- El output del template developer es más largo que staging, que es más largo que main
- `validateNoMarkers()` del script no detecta residuos en ninguno de los 3 outputs

## Risk Assessment

| Riesgo | Likelihood | Impact | Mitigación |
|--------|-----------|--------|-----------|
| Marcador renombrado en script sin actualizar template | Media | Medio | Lista de marcadores definida aquí (source of truth de markers) |
| Template main demasiado escueto para ser útil | Baja | Bajo | Añadir tabla de releases con fecha — suficiente para deploy público |

## Next Steps

Tras esta fase: implementar phase-01 (script) con los marcadores exactos aquí definidos.
