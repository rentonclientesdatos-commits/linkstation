---
title: "Dev Team Handover — linkstation"
audience: equipo de desarrollo interno (Esden + Auditor)
status: LIVING_DOCUMENT
maintained_by: agente `team-knowledge-keeper` (proactivo) + manager (orquestador)
date: 20-05-2026
excluded_from: [staging, main]
---

# Dev Team Handover — linkstation

> ⚠️ **Documento vivo**. Lo mantiene el agente `team-knowledge-keeper` proactivamente cada vez que el equipo necesita saber algo nuevo. NO editar directamente sin orden del lead — pide al agente que lo haga.
>
> **Este documento NUNCA llega a `staging` ni `main`** — sólo vive en `developer` y ramas feature.

Todo lo que el equipo de desarrollo necesita saber para trabajar en este proyecto vive en este documento (o enlazado desde aquí).

---

## Índice

1. [Identidad del proyecto](#1-identidad-del-proyecto)
2. [Onboarding del primer día](#2-onboarding-del-primer-día)
3. [Modelo de ramas y release](#3-modelo-de-ramas-y-release)
4. [Stack técnico confirmado](#4-stack-técnico-confirmado)
5. [Plan rearmado (5 fases)](#5-plan-rearmado-5-fases)
6. [Decisiones cerradas del Auditor](#6-decisiones-cerradas-del-auditor)
7. [Infraestructura de Claude Code en el repo](#7-infraestructura-de-claude-code-en-el-repo)
8. [Jerarquía de agentes](#8-jerarquía-de-agentes)
9. [Catálogo de subagentes](#9-catálogo-de-subagentes)
10. [Catálogo de skills](#10-catálogo-de-skills)
11. [Catálogo de hooks](#11-catálogo-de-hooks)
12. [Reglas del proyecto](#12-reglas-del-proyecto)
13. [Comandos slash del proyecto](#13-comandos-slash-del-proyecto)
14. [MCP servers activos](#14-mcp-servers-activos)
15. [Manejo de secretos](#15-manejo-de-secretos)
16. [Páginas de ayuda al admin](#16-páginas-de-ayuda-al-admin)
    16.bis. [RoadMap y máquina de estados de tareas](#16bis-roadmap-y-máquina-de-estados-de-tareas)
17. [Glosario](#17-glosario)

---

## 1. Identidad del proyecto

**linkstation** — AI CRM + Workflow Orchestrator multi-tenant para academias formativas (ES + Latam).

- Versión actual: **v0.0.0**.
- Repositorio: `<configurar remote propio del equipo>` (NUNCA conectar a `LinkStation/linkstation-dashboard`).
- Rama de trabajo activa: `developer`.
- Audiencia interna: equipo AF + Auditor (Javier HP).

---

## 2. Onboarding del primer día

Ver [docs/dev-onboarding.md](dev-onboarding.md) para el setup completo paso a paso. Resumen mínimo:

```powershell
git clone <repo-url> linkstation
cd linkstation
git checkout developer
cp .env.example .env.local                # rellena con secretos del vault
npm install
npm run dev                                # frontend
node worker.js                             # worker BullMQ en paralelo
```

Plugins Claude Code:

```
/plugin install context7@claude-plugins-official
/plugin install playwright@claude-plugins-official
```

---

## 3. Modelo de ramas y release

Ver [docs/release-process.md](release-process.md) para el detalle. Resumen:

```
feature/* → PR → developer → /staging X.Y.Z → staging → /staging-main X.Y.Z → main
```

| Rama        | Qué versiona                                                             | Quién mueve                                                                    |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `feature/*` | Todo lo del repo                                                         | Cualquier dev                                                                  |
| `developer` | TODO el scaffold (`.claude/`, `docs/`, `plans/`, código, `.env.example`) | Vía PR aprobado por lead                                                       |
| `staging`   | **SÓLO código** + `.env.example` + `.github/`                            | Sólo con `/staging X.Y.Z` o promote.ps1, orden explícita del usuario           |
| `main`      | **SÓLO código** + `.env.example` + `.github/`                            | Sólo con `/staging-main X.Y.Z`, validación previa del cliente, orden explícita |

Versionado SemVer:

- `v0.0.x` patches dentro de sprint.
- `v0.x.0` cierre de sprint.
- `v1.0.0` MVP completo (post Fase 3, pre Fase 4).

---

## 4. Stack técnico confirmado

Documento autoritativo: [docs/audit/STACK-TECNOLOGICO.md](audit/STACK-TECNOLOGICO.md).

| Capa                 | Tecnología                                                                                                                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**         | Next.js 16, React 19, Tailwind, shadcn/ui (probable)                                                                                                                                                                                                                                                      |
| **Backend**          | Next.js App Router, BullMQ, `worker.js` separado                                                                                                                                                                                                                                                          |
| **BD**               | PostgreSQL via **Supabase self-hosted** en **Easypanel** (R-023). `@supabase/ssr` + **Zod** + **Repository pattern** + RLS multi-tenant. **SIN ORM nuevo** (decisión confirmada — ver `project_stack_data_layer.md` + `plans/20260519-1200-rls-multitenant-hardening/research/stack-decision-no-orm.md`). |
| **LLM**              | LangChain + Anthropic + OpenAI + Google Genai. **AWS Bedrock descartado del stack** (26-05-2026, orden del usuario — no se trabajará con AWS)                                                                                                                                                             |
| **Voz**              | Retell + Ultravox (abstracción `VoiceProvider` — R-016)                                                                                                                                                                                                                                                   |
| **CRM MVP (Fase 2)** | HubSpot + Zoho                                                                                                                                                                                                                                                                                            |
| **CRM Fase 4**       | Google Sheets bidireccional + Salesforce + GoHighLevel + ActiveCampaign                                                                                                                                                                                                                                   |
| **Tests**            | Vitest (unit) + Playwright (E2E)                                                                                                                                                                                                                                                                          |
| **Deploy**           | Easypanel self-hosted                                                                                                                                                                                                                                                                                     |

**Excluido del stack** (no introducir): Prisma, Dokploy, Airtable, AWS Bedrock, AWS SDK Bedrock (`@aws-sdk/client-bedrock-*`).

> Nota: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` se mantienen únicamente para hablar con MinIO via protocolo S3-compatible — no se conecta a AWS. Migración futura a Supabase Storage en evaluación post-MVP.

---

## 4.bis Responsive breakpoints (Tailwind v4)

Decisión 26-05-2026 (BUG-3-07 fix, Sprint 3 phase-08): el dashboard usa **breakpoint `lg:` (1024px)** como punto de cambio entre layout mobile (hamburger + bottom nav + drawer) y desktop (sidebar fija lateral). El breakpoint `md:` (768px) está reservado para ajustes tipográficos/spacing, no para estructura del layout.

### Tabla autoritativa

| Tailwind  | Ancho min  | Uso en este proyecto                                                                                                               |
| --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `sm:`     | 640px      | Ajustes mínimos en componentes inline (ej. `sm:inline` para revelar texto junto a icono).                                          |
| `md:`     | 768px      | Tipografía + spacing (header height, padding). **NO** usar para mostrar/ocultar sidebar.                                           |
| **`lg:`** | **1024px** | **Estructura del layout**: sidebar fija visible, hamburger oculto, bottom nav oculta. Por debajo: drawer + hamburger + bottom nav. |
| `xl:`     | 1280px     | Disponible para ajustes finos en desktops anchos (ej. más columnas en grids).                                                      |
| `2xl:`    | 1536px     | Disponible. Cuidado con `max-w-screen-2xl` en containers.                                                                          |

### Reglas que el equipo debe seguir

1. **Sidebar visible / hamburger oculto = `lg:`**. Cualquier control de visibilidad del shell del dashboard usa `lg:hidden` / `lg:flex` (y su variante `max-lg:` para drawer mobile).
2. **`md:` solo tipografía + spacing**: ejemplos válidos `md:h-20`, `md:text-base`, `md:px-6`. Ejemplos prohibidos `md:flex` para mostrar sidebar, `md:hidden` para ocultar hamburger.
3. **Mobile-first siempre**: componentes nuevos parten de móvil (sin prefijo) y se amplían con `lg:` cuando aplique. Evitar `max-*:` salvo casos justificados (drawer, overlay).
4. **No introducir breakpoints nuevos** sin actualizar esta tabla y el archivo `tailwind.config` si aplica.
5. **Probar siempre 4 viewports antes de PR**: 375 (móvil), 768 (tablet vertical), 1024 (laptop pequeño), 1440 (desktop). Si rompe en alguno, fix antes de merge.

### Por qué `lg:1024` y no `xl:1280`

- iPad Pro landscape (1180–1194px) muestra sidebar en `lg:` — sensación nativa desktop al hacer demos.
- Laptops 13"–14" (1366×768, 1440×900) muy comunes en clienta — `lg:` les da `1024-256 = 768px` de main, suficiente para 4 KPI cards en grid 2×2.
- `xl:1280` dejaría sidebar oculta hasta laptops grandes; tabletas y portátiles pequeños quedarían en modo "mobile" lo que no es coherente con una app B2B.

### Histórico breakpoint

- **Antes 26-05-2026 (BUG-3-07)**: sidebar usaba `md:flex` (768px). Síntoma: en 768px exactos el main quedaba con solo 512px, KPI hero cards colapsaban (width=0).
- **Desde 26-05-2026**: sidebar usa `lg:flex` (1024px). Fix en `src/components/layout/Sidebar.tsx` (6 cambios) + `src/components/layout/Topbar.tsx` (1 cambio).

Screenshots de validación: [docs/screenshots/sprint-3-close/responsive-fix/](../docs/screenshots/sprint-3-close/responsive-fix/) (login + dashboard en 768/1024/1280/1440).

---

## 4.ter TypeScript: prohibido `any`

> Decidido 26-05-2026. ESLint marca `@typescript-eslint/no-explicit-any` como `error` y husky bloquea cualquier commit que introduzca un `any`. Esta sección resume el porqué; la guía operativa con alternativas y ejemplos vive en [`docs/architecture/typescript-standards.md`](architecture/typescript-standards.md).

### Regla absoluta

Ningún `.ts` / `.tsx` del repo puede contener `any` explícito (ni como type annotation, ni como `as any`). Las únicas excepciones permitidas son:

1. **Tests** (`tests/**/*.spec.ts`) con un mock puntual y `// eslint-disable-next-line` justificado en comentario.
2. **Workaround de bug upstream** documentado con link al issue.

Cualquier otro uso se rechaza en code review.

### Por qué

`any` desactiva el sistema de tipos. Hemos perdido tiempo de debug por:

- Campos renombrados en el backend que no rompían en compilación.
- Refactors de schemas Zod sin saber qué clientes dependían del tipo.
- Bugs runtime de `cannot read property X of undefined` que `unknown` + type guard habrían detectado en build.

### Cómo cumplirla

| En lugar de                           | Usa                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `metadata: any`                       | `metadata: Record<string, unknown>` o interface dedicada                                       |
| `(config as any).whatsapp`            | `(config.whatsapp ?? {}) as { accessToken?: string; phoneNumberId?: string }`                  |
| `function Card({ icon, title }: any)` | `interface CardProps { icon: React.ComponentType; title: string } function Card(p: CardProps)` |
| Callback con shape variable           | `unknown` + type guard al inicio (`if (typeof x !== 'object') throw …`)                        |

Ver tabla completa con ejemplos del repo en [typescript-standards.md](architecture/typescript-standards.md).

### Lint baseline — política

Hasta 25-05-2026 toleramos **114 problems baseline** (mezcla `any`, `unused-vars`, `prefer-const`). **Esa tolerancia se acaba**. Desde Sprint 3:

- ❌ Ningún PR nuevo introduce `any`. Bloqueado por husky.
- ✅ Tarea `SP-4-LINT-ZERO` abierta en RoadMap para limpiar los 114 baseline en lotes.
- ✅ Boy scout rule: si tocas un fichero por otra razón, arregla también sus warnings.
- 🎯 Objetivo: lint baseline = 0 al cierre del MVP (v0.3.0 GA).

Si husky bloquea tu commit por `no-explicit-any`: **NO uses `--no-verify`**. Lee el error, aplica una alternativa de la tabla, `npm run typecheck` para verificar, re-commit.

---

## 5. Plan rearmado (5 fases)

Decisión vigente: [R-020-refinement-v2](audit/DECISIONES-AUDITOR-JAVIER-HP.md#r-020-refinement-v2).

| Fase                                 | Contenido                                                                         | Semanas | Status    |
| ------------------------------------ | --------------------------------------------------------------------------------- | ------- | --------- |
| **0 — Sprint 0**                     | Hotfixes seguridad (4 vulnerabilidades RLS + tokens OAuth + Kong EOL)             | 1-2 sem | Pendiente |
| **1 — Capa de datos**                | Consolidación Supabase + Zod + Repository pattern + RLS hardening (sin ORM nuevo) | 3-4 sem | Pendiente |
| **2 — Adapter layer + 2 CRMs (MVP)** | HubSpot + Zoho adapters + UI admin de conexión                                    | 2-3 sem | Pendiente |
| **3 — Hardening**                    | Tests E2E, observabilidad, dashboards costes                                      | 2-3 sem | Pendiente |
| **4 — Post-release**                 | Sheets bidireccional + Salesforce + GHL + ActiveCampaign                          | 4-7 sem | Futuro    |

---

## 6. Decisiones cerradas del Auditor

Documento autoritativo (todas firmadas y fechadas): [docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md](audit/DECISIONES-AUDITOR-JAVIER-HP.md).

Resumen de las más críticas:

| ID         | Decisión                                                                         | Implicación                                |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| R-013      | Cadencia 09-21h hora lead + 3 días + festivos país lead                          | Timezone-aware scheduler obligatorio       |
| R-014      | **Sync CRM = append-only por defecto**, sobrescritura sólo con `crm_write_audit` | Tabla `crm_field_mapping.write_policy`     |
| R-016      | Ultravox equiparado a Retell (análisis transcripción post-llamada)               | Interfaz común `VoiceProvider`             |
| R-020 + v2 | Top 5 CRMs identificados. **MVP Fase 2 = HubSpot + Zoho. Sheets a Fase 4.**      | Adapter pattern desde Fase 2               |
| R-021      | Migrar Airtable → Supabase                                                       | Sub-proyecto en Sprint 2-3                 |
| R-022      | Equipo dev mantiene KB                                                           | Panel admin + carga operativa              |
| R-023      | **Supabase self-hosted en Easypanel** (NO Coolify)                               | Plan deploy + Kong EOL                     |
| R-024      | Mismo equipo + 3 condiciones método                                              | Tests + revisión externa + greps pre-merge |
| R-025      | Pausa de ventas 6-8 semanas                                                      | Sprint 0+1+2 sin clientes nuevos           |

---

## 7. Infraestructura de Claude Code en el repo

```
<repo>/
├── CLAUDE.md                          ← instrucciones específicas AF (additive al global del dev)
├── .env.example                       ← placeholders (.env real va por canal seguro)
├── .gitignore                         ← excluye .env real + docs/Docs-entrega-clienta/ + dist/ + .playwright-mcp/
├── .gitattributes                     ← (opcional, sin uso por ahora)
├── .claude-plugin/
│   └── plugin.json                    ← manifest del plugin af-agents v0.0.0
├── .claude/
│   ├── settings.json                  ← permissions + enabledPlugins (context7 + playwright)
│   ├── rules/                         ← 5 normas (development, documentation, orchestration, primary-workflow, team-coordination)
│   ├── agents/                        ← 23 subagentes (ver §9)
│   ├── skills/                        ← 28 skills (ver §10)
│   ├── hooks/                         ← 19 hooks .cjs + lib/ + hooks.json (ver §11)
│   └── commands/                      ← slash commands del proyecto (/staging, /staging-main)
├── .github/
│   └── workflows/
│       └── staging-main-purity-check.yml   ← CI guard ramas protegidas
├── scripts/
│   ├── promote.ps1                    ← script PowerShell promoción ramas
│   └── promote.sh                     ← equivalente Bash
├── docs/                              ← este directorio (TODO esto NO sube a staging/main)
│   ├── dev-onboarding.md
│   ├── dev-team-handover.md           ← ESTE archivo
│   ├── release-process.md
│   ├── audit/                         ← informes auditoría
│   ├── architecture/                  ← documentación arquitectura
│   ├── security/, dependencies/, timeline/, roadmap/
│   └── Docs-entrega-clienta/          ← gitignored (originales cliente, no se versionan)
├── plans/                             ← plans de fases (NO sube a staging/main)
└── src/, app/, lib/, components/, supabase/migrations/, worker.js, ...
```

---

## 8. Jerarquía de agentes

```
                                ┌────────────────────────────┐
                                │   af-agents:manager     │  ← Opus
                                │   (Orquestador único)      │
                                └────────────┬───────────────┘
                                             │ delegates via Task tool
            ┌────────────┬─────────────┬─────┴──────┬──────────────┬───────────────┐
            │            │             │            │              │               │
       Planificación   Implementación  Calidad     Operaciones   Documentación   Meta/Soporte
            │            │             │            │              │               │
   ┌────────┴─────┐ ┌────┴──────┐ ┌────┴──────┐ ┌──┴───────┐ ┌────┴──────┐ ┌──────┴────────┐
   │ planning     │ │ code      │ │ testing   │ │ git      │ │ documenta-│ │ debugger      │
   │ adr          │ │ api       │ │ review    │ │ deployment│ │ tion      │ │ journal-writer│
   │ researcher   │ │ uxui      │ │ security  │ │ producti- │ │ help-docs-│ │ mcp-manager   │
   │ brainstormer │ │ database  │ │ performan-│ │ vity     │ │ keeper    │ │ code-simplif. │
   │              │ │           │ │ ce        │ │          │ │ team-     │ │               │
   │              │ │           │ │           │ │          │ │ knowledge-│ │               │
   │              │ │           │ │           │ │          │ │ keeper    │ │               │
   └──────────────┘ └───────────┘ └───────────┘ └──────────┘ └───────────┘ └───────────────┘
```

**Reglas top-level**:

- El manager **nunca** implementa código directamente. Sólo delega vía `Task`.
- El manager puede paralelizar agentes independientes (ej: `database` + `api` simultáneos).
- Cada subagente reporta status (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`).
- Los **agentes proactivos** (`team-knowledge-keeper`, `help-docs-keeper`, `journal-writer`) los activa el manager automáticamente en eventos del ciclo: cierre de sprint, bug fix completado, cambio significativo, etc.

---

## 9. Catálogo de subagentes

Todos viven en [.claude/agents/](../.claude/agents/). Namespace `af-agents:*` para los del plugin del proyecto; los demás se invocan por nombre directo.

### Orquestador

| Subagente           | Modelo | Función                                                                         |
| ------------------- | ------ | ------------------------------------------------------------------------------- |
| `af-agents:manager` | Opus   | Único orquestador. Delega todo el trabajo, valida resultados, coordina sprints. |

### Especialistas de desarrollo

| Subagente            | Modelo | Función                                                                              |
| -------------------- | ------ | ------------------------------------------------------------------------------------ |
| `af-agents:planning` | Sonnet | Desglose de fases en tareas + arquitectura + estimaciones                            |
| `af-agents:adr`      | Sonnet | ADRs + Dependency Guard (bloqueo install sin autorización)                           |
| `af-agents:database` | Sonnet | SQL migrations Supabase, schemas Zod, Repository pattern, RLS multi-tenant (sin ORM) |
| `af-agents:api`      | Sonnet | Endpoints REST, middleware, validación Zod                                           |
| `af-agents:code`     | Sonnet | Implementación de features y fixes                                                   |
| `af-agents:uxui`     | Sonnet | Componentes React, accesibilidad, responsive                                         |

### Especialistas de calidad

| Subagente               | Modelo | Función                                             |
| ----------------------- | ------ | --------------------------------------------------- |
| `af-agents:testing`     | Sonnet | Vitest unit + integration, Playwright E2E, coverage |
| `af-agents:review`      | Sonnet | Code review pre-merge, pattern adherence            |
| `af-agents:security`    | Sonnet | RLS verify, OWASP, auth review, secrets scan        |
| `af-agents:performance` | Sonnet | Lighthouse, bundle size, query optimization         |

### Especialistas de operaciones

| Subagente                | Modelo | Función                                                                                            |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------- |
| `af-agents:git`          | Sonnet | Branches, commits, PRs, tags. **Obliga a changelog completo por commit/PR**                        |
| `af-agents:deployment`   | Sonnet | Easypanel deploys, CI/CD, env vars. **No autoriza release sin documentación profesional completa** |
| `af-agents:productivity` | Sonnet | Time tracking, sprint reports, deviation analysis                                                  |

### Especialistas de documentación

| Subagente                         | Modelo | Función                                                                                                                                               |
| --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `af-agents:documentation`         | Sonnet | README, API docs, CONTRIBUTING, release notes                                                                                                         |
| `af-agents:team-knowledge-keeper` | Sonnet | **PROACTIVO**. Mantiene este `dev-team-handover.md` cada vez que hay info nueva relevante para el equipo                                              |
| `af-agents:help-docs-keeper`      | Sonnet | **PROACTIVO**. Crea y mantiene la página "Ayuda al admin" del producto. Auto-trigger al cierre de sprint y tras bug fix                               |
| `af-agents:roadmap-keeper`        | Sonnet | **PROACTIVO**. Mantiene `plans/RoadMap.md`. Enforza la máquina de estados 🔘→🟡→🟠→🔵→🟢 de cada tarea. Recalcula estimaciones y reporta desviaciones |

### Meta / soporte (heredados de la config global)

| Subagente         | Modelo    | Función                                                        |
| ----------------- | --------- | -------------------------------------------------------------- |
| `debugger`        | Sonnet    | Root cause analysis de incidentes                              |
| `journal-writer`  | Haiku     | Registra lecciones aprendidas e incidentes críticos            |
| `mcp-manager`     | Haiku     | Discovery/uso de MCP servers sin polucionar contexto principal |
| `code-simplifier` | Sonnet    | Refactor post-edit para clarity                                |
| `researcher`      | Haiku     | Research estructurado con ranking de opciones                  |
| `brainstormer`    | (inherit) | Brainstorm y debate técnico cuando hay trade-offs              |

---

## 10. Catálogo de skills

Total: **28 skills** en [.claude/skills/](../.claude/skills/).

### Gestión de sprint (8 — heredadas del patrón saas-agents)

| Skill        | Función                                     |
| ------------ | ------------------------------------------- |
| `blocker`    | Registrar bloqueo con impacto y soluciones  |
| `checkpoint` | Guardar progreso parcial sin completar fase |
| `delegate`   | Delegar tareas a agentes especializados     |
| `estimate`   | Re-estimar tarea/fase con nuevo tiempo      |
| `init-phase` | Inicializar nueva fase con setup automático |
| `sprint`     | Iniciar/revisar/completar fases             |
| `status`     | Estado general del proyecto                 |
| `sync`       | Verificar coherencia entre docs de tracking |

### Workflow (5)

| Skill         | Función                             |
| ------------- | ----------------------------------- |
| `ck-plan`     | Planning con fases + tareas         |
| `ck-debug`    | Debug sistemático con root cause    |
| `ck-security` | Security audit STRIDE + OWASP       |
| `code-review` | Review con red-team analysis        |
| `fix`         | Fix bugs sistemático con root cause |

### Release / quality (3)

| Skill    | Función                                |
| -------- | -------------------------------------- |
| `ship`   | Pipeline ship: merge, test, review, PR |
| `watzup` | Wrap up de session                     |
| `retro`  | Retrospectiva data-driven              |

### Desarrollo (4)

| Skill                  | Función                               |
| ---------------------- | ------------------------------------- |
| `backend-development`  | Node/TS, APIs, DB, security           |
| `frontend-development` | React/TS, MUI v7 (o shadcn), Suspense |
| `databases`            | MongoDB + PostgreSQL, queries, RLS    |
| `web-testing`          | Playwright + Vitest + k6              |

### Knowledge / docs (4)

| Skill         | Función                                                         |
| ------------- | --------------------------------------------------------------- |
| `docs`        | Manage project documentation                                    |
| `docs-seeker` | Search docs vía context7 (Next/React/Supabase/Zod/HubSpot/Zoho) |
| `research`    | Research técnico estructurado                                   |
| `brainstorm`  | Brainstorming con trade-offs                                    |

### Meta (4)

| Skill            | Función                               |
| ---------------- | ------------------------------------- |
| `find-skills`    | Descubrir skills relevantes           |
| `mcp-management` | Gestión MCP servers                   |
| `skill-creator`  | Crear/actualizar skills (eval-driven) |
| `security-scan`  | Scan seguridad codebase               |

**Skills excluidas del proyecto** (por decisión del Auditor): `payment-integration`, `pinokio`, `gepeto`.

---

## 11. Catálogo de hooks

Total: **19 hooks `.cjs`** + helpers en [.claude/hooks/lib/](../.claude/hooks/lib/). Registro en [.claude/hooks/hooks.json](../.claude/hooks/hooks.json).

### Heredados de ClaudeKit Engineer (14)

| Hook                              | Evento           | Función                                          |
| --------------------------------- | ---------------- | ------------------------------------------------ |
| `session-init.cjs`                | SessionStart     | Carga config + project detect + escribe env vars |
| `subagent-init.cjs`               | SubagentStart    | Inicializa contexto subagente                    |
| `team-context-inject.cjs`         | SessionStart     | Inyecta contexto del team config                 |
| `dev-rules-reminder.cjs`          | UserPromptSubmit | Recordatorio reglas desarrollo                   |
| `usage-context-awareness.cjs`     | UserPromptSubmit | Inyecta `Usage Limits 5h/7d` (Quota Fallback)    |
| `descriptive-name.cjs`            | UserPromptSubmit | Nombres descriptivos en plans/files              |
| `cook-after-plan-reminder.cjs`    | UserPromptSubmit | Recuerda skill `cook` post-plan                  |
| `scout-block.cjs`                 | PreToolUse       | Bloquea scout en contextos donde no aplica       |
| `privacy-block.cjs`               | PreToolUse       | Bloquea datos sensibles                          |
| `post-edit-simplify-reminder.cjs` | PostToolUse      | Sugiere `simplify` tras edits                    |
| `task-completed-handler.cjs`      | TaskCompleted    | Manejo task completed                            |
| `teammate-idle-handler.cjs`       | SubagentStop     | Notifica idle teammates                          |
| `session-state.cjs`               | Stop             | Persiste session state                           |
| `plan-format-kanban.cjs`          | (manual)         | Render plans estilo kanban                       |

### Específicos AF (4)

| Hook                     | Evento                   | Función                                                    |
| ------------------------ | ------------------------ | ---------------------------------------------------------- |
| `af-roadmap-check.cjs`   | SessionStart             | Inyecta resumen audit + decisiones + plan vigente          |
| `af-stop-checkpoint.cjs` | Stop                     | Avisa de uncommitted + bloquea sugerencias en staging/main |
| `af-task-tracker.cjs`    | PostToolUse (Edit/Write) | Sugiere actualizar plans + RLS/voice/deps reminders        |
| `af-deps-guard.cjs`      | PreToolUse (Bash)        | **Bloquea `npm install <pkg>` sin pasar por @adr**         |

### Soporte (1)

| Hook              | Evento    | Función                               |
| ----------------- | --------- | ------------------------------------- |
| `skill-dedup.cjs` | (interno) | Evita duplicar invocaciones de skills |

---

## 12. Reglas del proyecto

5 ficheros en [.claude/rules/](../.claude/rules/):

| Regla                         | Resumen                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `development-rules.md`        | YAGNI/KISS/DRY, kebab-case, archivos <200 líneas, no mocks, code-reviewer post implementación |
| `documentation-management.md` | Roadmap + changelog + system-architecture en `docs/`, plans en `plans/YYMMDD-HHmm-slug/`      |
| `orchestration-protocol.md`   | Delegation context obligatorio, Subagent Status Protocol, context isolation                   |
| `primary-workflow.md`         | planner → research paralelo → code → simplify → test → review → docs                          |
| `team-coordination-rules.md`  | File ownership en teams, worktrees, SendMessage protocols                                     |

Adicionalmente, [CLAUDE.md](../CLAUDE.md) del repo raíz tiene las reglas top-level específicas AF (co-authorship, branch protection, no Prisma/Dokploy/Airtable, RLS obligatorio, append-only CRM, tests con BD real, etc).

---

## 13. Comandos slash del proyecto

| Comando               | Función                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/staging X.Y.Z`      | Promociona `developer → staging` ejecutando `promote.ps1`. Limpia automáticamente docs/plans/.claude. Requiere confirmación "YES". |
| `/staging-main X.Y.Z` | Promociona `staging → main` (producción) + tag SemVer. Requiere validación cliente previa + confirmación "YES".                    |

Definidos en [.claude/commands/](../.claude/commands/). Sólo disponibles en este proyecto (no globales).

---

## 14. MCP servers activos

| MCP                            | Origen                                              | Uso                                                                    |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `plugin:context7:context7`     | Plugin oficial `context7@claude-plugins-official`   | Docs de Next/React/Supabase/Zod/HubSpot/Zoho — vía skill `docs-seeker` |
| `plugin:playwright:playwright` | Plugin oficial `playwright@claude-plugins-official` | Browser tests Fase 3, screenshots para `help-docs-keeper`              |

**MCPs NO incluidos** (decisión del Auditor): Gmail, Calendar, Drive, Gamma, pencil — son MCPs personales del Auditor, no del proyecto.

**Para Fase 4**: añadir MCP/skill custom de Google Sheets cuando se llegue a esa fase.

---

## 15. Manejo de secretos

| Cosa                                             | Dónde                                                         |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `.env.example` (placeholders)                    | ✅ Commiteado en repo, llega a `developer`, `staging`, `main` |
| `.env`, `.env.local`, `.env.production` (reales) | ❌ Gitignored. Compartir por canal seguro                     |
| Canal seguro recomendado                         | 1Password / Bitwarden / Vault / Easypanel env vars directas   |

**Variables críticas** (ver [.env.example](../.env.example) para la lista completa):

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- LLM: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENAI_API_KEY`, AWS (autorización explícita)
- Voice: `RETELL_API_KEY`, `ULTRAVOX_API_KEY` + webhook secrets
- CRM MVP: `HUBSPOT_CLIENT_ID/SECRET`, `ZOHO_CLIENT_ID/SECRET`
- Queue: `REDIS_URL`
- Auth: `NEXTAUTH_SECRET`

---

## 16. Páginas de ayuda al admin

Gestionadas por el agente `af-agents:help-docs-keeper`. La página "Ayuda al admin" se renderiza en el producto en **la última posición del menú lateral del admin**.

Cada subsección de la ayuda tiene un **estado**:

| Estado             | Significado                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| 🟡 **Provisional** | Sección en desarrollo, en pruebas o con tareas pendientes. Contenido puede estar incompleto.          |
| 🟢 **Completada**  | Sprint cerrado sobre la sección + tests pasados + revisión visual + screenshots finales actualizados. |

Cuando el equipo cierre una sección con éxito, el agente `help-docs-keeper` se activa automáticamente para hacer la revisión final + último screenshot + cambiar estado a Completada. Igual tras un bug fix en una sección ya Completada (re-evalúa y mantiene o degrada a Provisional según el alcance).

Para más detalle ver [.claude/agents/help-docs-keeper.md](../.claude/agents/help-docs-keeper.md).

---

## 16.bis. RoadMap y máquina de estados de tareas

Documento autoritativo: [`plans/RoadMap.md`](../plans/RoadMap.md). Mantenido proactivamente por el agente `af-agents:roadmap-keeper`.

### Máquina de estados (ley)

Toda tarea/fase/sprint transita SECUENCIALMENTE:

| Icono | Estado                     | Cuándo                                                            |
| ----- | -------------------------- | ----------------------------------------------------------------- |
| 🔘    | **Pendiente**              | Estado inicial                                                    |
| 🟡    | **En Desarrollo**          | Un dev arrancó el trabajo (aunque sea en paralelo a otras tareas) |
| 🟠    | **P. Subir GH**            | Trabajo local terminado, sin push aún                             |
| 🔵    | **Subida rama `<nombre>`** | Pusheada a su `feature/*`, esperando PR / review / merge          |
| 🟢    | **COMPLETADA**             | Mergeada a `developer`                                            |

**Prohibido saltarse pasos.** El agente `roadmap-keeper` bloquea cualquier transición ilegal.

### Reglas que el equipo DEBE conocer

1. **NUNCA empezar una tarea sin revisar/actualizar su estado**. Avisa al manager o usa skill `delegate` para que el agente actualice 🔘 → 🟡.
2. **`git` agent NO commitea ni pushea** si la tarea no está en estado 🟡. Si está en 🔘: para y avisa al roadmap-keeper.
3. **`deployment` agent NO promueve a staging/main** si todas las tareas del sprint no están en 🟢.
4. **Tras merge a `developer`**, el roadmap-keeper cierra automáticamente las tareas afectadas (🔵 → 🟢) y, si es el último item de un sprint, bumpea la versión del proyecto.
5. **Desviaciones de tiempo**: si una tarea tarda > 130% de lo estimado, se marca ⚠️ y el manager se entera. Si > 200%, escalación inmediata.

### Tareas obligatorias al cierre de CADA sprint

Todo sprint termina con estas 5 tareas en orden (no se pueden saltar):

| #   | Tarea                                                                                                                                                                                                                           | Quién                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Auto test** — typecheck + lint + build + tests (unit + integration). Coverage report.                                                                                                                                         | `af-agents:testing`                                                                                                             |
| 2   | **Test E2C Local** — Playwright en browser: recorrer flujos implementados + visual + diseño + **WCAG 2.2 AA**. Reporte con screenshots de pasos clave + findings accesibilidad.                                                 | `af-agents:testing` + `af-agents:uxui`                                                                                          |
| 3   | **Test Manual del Dev** — Abrir browser para el dev. Proveer credenciales si necesario. Guía paso-a-paso clara: qué probar, cómo, qué esperar. Esperar feedback.                                                                | `af-agents:manager` (interactúa con humano)                                                                                     |
| 4   | **Corrección de Bugs detectados** — Por cada bug que reporte el dev, crear subtarea con su propio estado. La tarea padre queda 🟡 hasta que TODAS las subtareas estén 🟢.                                                       | `af-agents:code` + `af-agents:debugger`                                                                                         |
| 5   | **Cierre de Sprint** — PR `feature/sprint-NN-*` → `developer` (Sprint 0 mantiene `feature/sp-0-sprint-0-hotfixes` legacy). Tras merge: bump SemVer + invitar al dev a tomar siguiente sprint + crear rama del siguiente sprint. | `af-agents:git` (verifica estados) + `af-agents:deployment` (gatekeeper changelog) + `af-agents:productivity` (cierre tracking) |

Pre-requisitos del cierre — gates obligatorios:

- ✅ Todas las tareas dev del sprint en 🟢 o 🔵.
- ✅ CLOSE-1 Auto test 🟢 con 0 errores.
- ✅ CLOSE-2 E2C Local 🟢 sin findings WCAG críticos.
- ✅ CLOSE-3 Test Manual 🟢 (dev firma OK).
- ✅ CLOSE-4 Bugs 🟢 sin subtareas abiertas.
- ✅ `CHANGELOG.md` con entrada de la versión target completa.
- ✅ `help-docs-keeper` cerró todas las secciones afectadas en 🟢 Completada.

### Cómo consultar el estado del proyecto

```powershell
# Abrir el RoadMap
code plans/RoadMap.md

# O preguntar al manager
@manager status
```

El manager te resume el estado actual sin necesidad de leer el doc entero.

---

## 17. Glosario

| Término                   | Significado                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Auditor                   | Javier HP — responsable del audit técnico inicial y mantenimiento del scaffold         |
| Cliente                   | La empresa contratante del SaaS (Esden)                                                |
| Cliente final / Tenant    | Cada academia formativa que usa el SaaS                                                |
| MVP                       | Producto en estado mínimo viable: Fase 0 + 1 + 2 + 3 completadas, antes de 4           |
| RLS                       | Row Level Security en PostgreSQL/Supabase para isolation multi-tenant                  |
| ADR                       | Architecture Decision Record                                                           |
| Phase Completion Protocol | typecheck + lint + build + tests + browser tests + informe — automático al cerrar fase |
| Quota Fallback            | Política de cambio de modelo (Opus↔Sonnet) cuando una cuota se acerca al 80%           |
| `developer` purity        | Que `developer` puede tener todo (.claude, docs, plans).                               |
| `staging`/`main` purity   | Que SOLO tengan código, validado por CI guard                                          |

---

**Última actualización**: 20-05-2026 por agente `team-knowledge-keeper` (inicial — creación).
**Mantenedor proactivo**: `af-agents:team-knowledge-keeper`.
**Lead**: Javier HP (admin@2you.ai).
