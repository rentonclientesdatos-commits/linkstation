# Rebrand esden→af y renumeración de sprints A-E → 0-4

**Fecha:** 20-05-2026  
**Rama:** `auditoria`  
**Ejecutado por:** Claude Code (subagente — sin commit, sin push)

---

## Resumen ejecutivo

Refactoring masivo en dos ejes:
1. **Rebrand esden → af**: todos los identificadores de proyecto (`esden-agents`, `dashboard-esden`, hooks `esden-*.cjs`, etc.) renombrados a equivalentes `af-*`.
2. **Renumeración de sprints**: las fases del plan de proyecto pasaron de nomenclatura letra (A, B, C, D, E) a numérica (0, 1, 2, 3, 4).

---

## 1. Cambios aplicados

### 1.1 Archivos modificados por contenido

**164 archivos modificados** (contenido textual).

Categorías principales:
- `.claude/agents/*.md` (11 archivos) — rebrand de nombres de agente y referencias
- `.claude/hooks/hooks.json`, `.claude/settings.json`, `.claude-plugin/plugin.json`
- `.claude/skills/*.md` (varios)
- `CLAUDE.md`, `MASTER_DOSSIER.md`, `.env.example`
- `docs/audit/*.md` y `docs/audit/deep/*.md` (17 archivos)
- `docs/architecture/*.md` (5 archivos)
- `docs/roadmap/*.md` (2 archivos)
- `docs/security/*.md` (3 archivos)
- `docs/dev-team-handover.md`, `docs/dev-onboarding.md`, `docs/release-process.md`
- `plans/RoadMap.md`
- `plans/20260519-1200-rls-multitenant-hardening/*.md` (9 archivos)
- `plans/260520-1342-*/` (todos los planes de sprint)
- `plans/reports/*.md` (9 archivos)
- `src/` — archivos de código afectados por rebrand (cookies, headers, Docker containers)
- `docker-compose.yml`, `docker-compose.dev.yml`, `package.json`

### 1.2 Archivos renombrados (Rule E + folders)

**57 renombres** vía `git mv`:

#### Archivos de agent-memory (Rule E)
| Origen | Destino |
|--------|---------|
| `.claude/agent-memory/planner/project-sprint-a-plan.md` | `project-sprint-0-plan.md` |
| `.claude/agent-memory/planner/project-sprint-c-plan.md` | `project-sprint-2-plan.md` |
| `.claude/agent-memory/planner/project-sprint-e-plan.md` | `project-sprint-4-plan.md` |

#### Hooks renombrados (Rule A)
| Origen | Destino |
|--------|---------|
| `.claude/hooks/esden-deps-guard.cjs` | `.claude/hooks/af-deps-guard.cjs` |
| `.claude/hooks/esden-roadmap-check.cjs` | `.claude/hooks/af-roadmap-check.cjs` |
| `.claude/hooks/esden-stop-checkpoint.cjs` | `.claude/hooks/af-stop-checkpoint.cjs` |
| `.claude/hooks/esden-task-tracker.cjs` | `.claude/hooks/af-task-tracker.cjs` |

#### Reportes planner (Rule E)
| Origen | Destino |
|--------|---------|
| `plans/reports/planner-sprint-a-operativo-20260520.md` | `planner-sprint-0-operativo-20260520.md` |
| `plans/reports/planner-sprint-a-update-v2-20260520.md` | `planner-sprint-0-update-v2-20260520.md` |
| `plans/reports/planner-sprint-a-update-v3-20260520.md` | `planner-sprint-0-update-v3-20260520.md` |
| `plans/reports/planner-sprint-b-decisiones-residuales-20260520.md` | `planner-sprint-1-decisiones-residuales-20260520.md` |
| `plans/reports/planner-sprint-b-operativo-20260520.md` | `planner-sprint-1-operativo-20260520.md` |
| `plans/reports/planner-sprint-c-operativo-20260520.md` | `planner-sprint-2-operativo-20260520.md` |
| `plans/reports/planner-sprint-d-operativo-20260520.md` | `planner-sprint-3-operativo-20260520.md` |
| `plans/reports/planner-sprint-e-operativo-20260520.md` | `planner-sprint-4-operativo-20260520.md` |

#### Carpetas de sprint (Rule F) — 5 carpetas × ~8-9 fases cada una = ~45 renombres de archivos de plan
| Origen | Destino |
|--------|---------|
| `plans/260520-1342-sprint-1-hotfixes-seguridad/` | `plans/260520-1342-sprint-0-hotfixes-seguridad/` |
| `plans/260520-1342-sprint-2-capa-datos/` | `plans/260520-1342-sprint-1-capa-datos/` |
| `plans/260520-1342-sprint-3-adapter-hubspot-zoho/` | `plans/260520-1342-sprint-2-adapter-hubspot-zoho/` |
| `plans/260520-1342-sprint-4-hardening/` | `plans/260520-1342-sprint-3-hardening/` |
| `plans/260520-1342-sprint-5-post-mvp-crms/` | `plans/260520-1342-sprint-4-post-mvp-crms/` |

---

## 2. Reglas aplicadas

### Rule A — Rebrand esden → af
Sustituciones aplicadas en todos los archivos excepto `docs/Docs-entrega-clienta/` y `*.lock`:

| Antes | Después |
|-------|---------|
| `esden-agents` | `af-agents` |
| `dashboard-esden` | `linkstation` |
| `esden-deps-guard` | `af-deps-guard` |
| `esden-roadmap-check` | `af-roadmap-check` |
| `esden-stop-checkpoint` | `af-stop-checkpoint` |
| `esden-task-tracker` | `af-task-tracker` |
| `Esden Agents` | `AF Agents` |
| `equipo de desarrollo Esden` | `equipo de desarrollo LinkStation` |
| `adaptados a Esden` | `adaptados a AF` |
| `esden-tenant-id` (cookie) | `af-tenant-id` |
| `x-esden-tenant` (header) | `x-af-tenant` |
| `esden-dashboard` (container) | `af-dashboard` |
| `esden:tenant:config:` (Redis key) | `af:tenant:config:` |
| `bienvenida_esden` (placeholder UI) | `bienvenida_af` |
| `@esden-sandbox.test` (test domain) | `@af-sandbox.test` |

### Rule B — Preservados (nunca tocados)
- Campos de BD: `esden_kpi*`, `esden_field`, `_esden_updated_at`, `esden_last_sync_source`, `esden_${...}`, `esden_service_role_*`
- URL GitHub: `https://github.com/renzo1111ia/dashboard-esden.git`
- `Blueprint Maestro de Conversión (Esden v5.0)` en MASTER_DOSSIER.md
- Datos de base de datos: `username: "esden"`, emails `@esden.es` en SQL de restore
- Comentarios de script tipo `// esden` referenciando UUID de tenant real
- Tenant name en auditoría: `tenant \`esden\`` (dato histórico del audit trail)

### Rule C — Renumeración sprints A→0, B→1, C→2, D→3, E→4
Aplicado con técnica de placeholders atómica para evitar cascada:
- `Sprint A` → `Sprint 0`, `Sprint B` → `Sprint 1`, etc.
- `Fase A` → `Fase 0`, `Fase B` → `Fase 1`, etc.
- IDs de dependencia: `B-18` → `1-18`, `C-12` → `2-12`, `D-5` → `3-5`, `E-3` → `4-3`

**Archivos excluidos de Rule C** (preservados con números propios):
- `docs/roadmap/improvement-backlog.md` — Sprint 0-5 son categorías de backlog (sistema diferente)
- `docs/roadmap/deep-improvement-backlog.md` — ídem; además aplica Rule D
- Archivos de auditoría con "Fase N" que referencian etapas del proceso cliente (Ingesta, Timezone, etc.)

### Rule D — Casos especiales WCAG (4 archivos)
En `docs/roadmap/deep-improvement-backlog.md`, `docs/audit/PRESENTATION.html`, `docs/audit/STACK-DECISION-DRIZZLE-MIGRATION.md`, `docs/architecture/help-page-spec.md`:
- `Sprint A — Accesibilidad WCAG 2.1 AA` → `Sprint WCAG — Accesibilidad 2.1 AA`
- `Sprint A` (cuando refiere a accesibilidad) → `Sprint WCAG`
- IDs `DA-A-XXX` → preservados intactos
- `Sprint C o D` (refs de plan) → `Sprint 2 o 3` (solo en `help-page-spec.md`)

### Rule G — Referencias de rutas actualizadas
Tras los renombres de carpeta, actualizadas referencias internas en ~34 archivos:
- `260520-1342-sprint-2-capa-datos` → `260520-1342-sprint-1-capa-datos`
- `260520-1342-sprint-3-adapter-hubspot-zoho` → `260520-1342-sprint-2-adapter-hubspot-zoho`
- etc.
- Branch refs: `feature/sp-1-sprint-1-hotfixes` → `feature/sp-0-sprint-0-hotfixes`
- Planner report refs: `planner-sprint-a-operativo` → `planner-sprint-0-operativo`, etc.

---

## 3. Verificación final — residuos aceptables

Grep final ejecutado:
```
git grep -nE "esden[^_\.@]" (excluido docs/Docs-entrega-clienta/, *.lock, SQL restores)
```

### Residuos aceptables (no requieren acción)

| Archivo | Línea | Valor | Razón |
|---------|-------|-------|-------|
| `supabase/MASTER_RESTORE.sql:188` | `"username": "esden"` | Dato de BD real, no renombrar |
| `supabase/restore_all_data.sql:17-23` | `"username": "esden"`, `@esden.es` | Datos de BD reales |
| `src/scripts/*.ts` (4 archivos) | `// esden` | Comentario identifica UUID de tenant real en BD |
| `docs/audit/05-browser-verification.md:21` | `tenant \`esden\`` | Dato histórico de sesión de auditoría |
| `plans/reports/rename-sprints-*.md:122` | `planner-sprint-a-*` | Documento histórico que describe el proceso de rename |

### Residuos con Sprint letra

```
git grep -nE "\bSprint [A-E]\b|\bFase [A-E]\b" → 0 resultados
```

### Residuos con paths de sprint (numeración antigua 1-5)

```
git grep -nE "sprint-[1-5]-(hotfixes|capa|adapter|hardening|post)" → 0 resultados
```

---

## 4. Casos ambiguos — decisiones tomadas

### `docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md` — Fases CRM tier
Las líneas 270-272 tenían `Fase A — MVP`, `Fase B — Enterprise`, `Fase C — Marketing-first` referenciando tiers de CRM (no el plan de proyecto). Se renombraron a `Fase 0 — MVP` etc. per instrucciones (Rule C aplica a todo el archivo).

### `docs/roadmap/improvement-backlog.md` — Sprint 0-5
Las secciones Sprint 0-5 en este archivo son categorías del backlog de mejoras (sistema anterior al plan A-E). Se preservaron sin renumerar (semánticamente distintos).

### IDs `B-NNN` en `improvement-backlog.md`
Los IDs `B-001` a `B-070` en improvement-backlog.md usan `B` como prefijo de namespace "Backlog", no como letra de sprint. Se preservaron. Los IDs `B-18`, `C-12`, etc. en los archivos de plan de sprint SÍ se renumeraron a `1-18`, `2-12`.

### `src/scratch/debug_esden_kpis.ts`, `src/scripts/fix_esden_kpi_config.ts`, etc.
Nombres de archivo que contienen `esden_kpi` o `esden` como parte del nombre de función/variable protegida (Rule B). Los nombres de archivo se preservan (son scripts de BD específicos del tenant).

---

## 5. Estado git — git status --short final

Total: **221 entradas** = 164 archivos modificados + 57 renombrados (via `git mv`).

Desglose por tipo:
- `RM` (renamed+modified): 57 entradas
- ` M` (modified): 164 entradas

No hay commits pendientes. No se realizó push.

---

## 6. Lo que NO se hizo (por instrucción explícita)

- NO `git commit`
- NO `git push`
- NO `git reset --hard` ni operaciones destructivas
- NO tocar `docs/Docs-entrega-clienta/`
- NO tocar `node_modules/`, `*.lock`, `.git/`
- NO renombrar campos de BD con prefijo `esden_`
