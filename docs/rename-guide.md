---
title: "Rename Guide — linkstation → LinkStation Dashboard"
audience: Auditor (Javier HP) + lead del equipo
date: 20-05-2026
status: pendiente ejecución coordinada
---

# Guía de rename del proyecto

Estás cambiando el nombre del proyecto. Esta guía te dice **qué nombre usar dónde**, **el orden de pasos**, **qué hace cada quien** (tú vs yo), y **una lista exhaustiva de archivos a actualizar**.

---

## 1. Convenciones de naming propuestas

GitHub no permite espacios en el nombre del repo. Por consistencia, propongo este mapeo:

| Contexto | Nombre propuesto | Razón |
| --- | --- | --- |
| **Repo GitHub (slug oficial)** | `linkstation-dashboard` | kebab-case, sin espacios, sin acentos (limitación GitHub) |
| **Carpeta local Windows** | `LinkStation DashBoard` | Lo que pediste literal. Las comillas funcionan en PowerShell |
| **Nombre humano / display** | "LinkStation Dashboard" | Con tilde correcta, capitalización natural — para docs, READMEs, headers |
| **`package.json` name** | `linkstation-dashboard` | npm exige kebab-case sin acentos |
| **`.claude-plugin/plugin.json` name** | `linkstation-agents` | Reemplaza `af-agents`. kebab-case sin acentos |
| **Namespace de subagentes** | `linkstation-agents:manager`, etc | Reemplaza `af-agents:*` |
| **Display interno en docs (markdown)** | "LinkStation Dashboard" | Texto humano |
| **Identificador corto en código** | `af-dashboard` o `LinkStation-dashboard` | Opcional, para logs |

> ⚠️ **Pregunta abierta**: ¿prefieres mantener el namespace `af-agents:*` por ahorrar 57 reemplazos en docs y código, o lo cambiamos a `linkstation-agents:*` para ser totalmente coherentes? Te recomiendo cambiarlo — son edits mecánicos y mejor tenerlo limpio desde el principio.

**Te pregunto antes de ejecutar el cambio de namespace** porque toca ~24 archivos (agentes, hooks, docs, settings).

---

## 2. Orden de pasos

### Paso 1 — Decisiones que necesito de ti

Antes de tocar nada:

- [ ] ¿Carpeta local con espacios `LinkStation DashBoard` o kebab-case `linkstation-dashboard`?
- [ ] ¿Cambio el namespace de subagentes de `af-agents:*` a `linkstation-agents:*`? (recomendado)
- [ ] ¿Tilde en "Formación" en los textos humanos? (recomendado sí)
- [ ] ¿El nombre del proyecto en Antigravity lo cambias tú directamente o necesitas que te diga dónde está la config?

### Paso 2 — Tú ejecutas (yo te aviso cuándo)

A. **Cerrar todas las sesiones de Claude Code / VS Code / Antigravity abiertas en esta carpeta** (libera locks).

B. **Renombrar la carpeta local** (PowerShell):

```powershell
cd e:\ClaudeCode\LinkStation
# Verifica primero que no queda nada con lock:
Get-ChildItem -Path "linkstation-main" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer -eq $false } | Select-Object -First 5
# Renombrar:
Rename-Item -Path "linkstation-main" -NewName "LinkStation DashBoard"
# (o si prefieres kebab-case)
# Rename-Item -Path "linkstation-main" -NewName "linkstation-dashboard"
```

C. **Renombrar el proyecto en Antigravity**:

Si Antigravity guarda nombre en algún `.json` propio: abrirlo y editar. Si pregunta al abrir la carpeta nueva qué nombre dar al proyecto, ponerle "LinkStation Dashboard". Yo no tengo visibilidad sobre dónde guarda Antigravity esa config — confirmamelo cuando lo hagas.

D. **Cuando termines, abre Claude Code apuntando a la nueva ruta** y dime: "carpeta renombrada, dale".

### Paso 3 — Yo ejecuto (tras tu OK)

Hago todos los edits internos del repo en una sola tanda:

1. Actualizar `package.json` → `"name": "linkstation-dashboard"`
2. Actualizar `.claude-plugin/plugin.json` → nuevo manifest
3. Renombrar el namespace de subagentes (si confirmas): `af-agents:*` → `linkstation-agents:*` en ~24 archivos
4. Actualizar TODOS los textos humanos: "linkstation" → "LinkStation Dashboard"
5. Actualizar `CLAUDE.md` raíz + docs/dev-onboarding.md + docs/dev-team-handover.md + docs/release-process.md + plans/RoadMap.md + docs/audit/* + hooks `.cjs`
6. Actualizar `.env.example` si tiene refs
7. Actualizar scripts `promote.ps1` + `promote.sh` si referencian nombre antiguo
8. Sweep final con grep para verificar 0 residuos

### Paso 4 — Verificación conjunta

```powershell
# Tú lanzas para confirmar 0 residuos:
cd <nueva-ruta>
git status --short      # debería mostrar todos los archivos editados
npm run dev              # debe arrancar sin errores con el nuevo nombre
```

---

## 3. Inventario completo de cambios

### 3.1 Archivos de configuración del proyecto (5)

| Archivo | Qué cambia |
| --- | --- |
| `package.json` | `"name": "af-dashboard"` → `"name": "linkstation-dashboard"` |
| `.claude-plugin/plugin.json` | `"name": "af-agents"` → `"name": "linkstation-agents"` + descripción + email author si quieres |
| `.claude/settings.json` | Limpiar refs (si hubiera) al nombre antiguo |
| `.env.example` | Refs en comentarios |
| `package-lock.json` | Regenerar con `npm install` tras cambio de name |

### 3.2 Documentación raíz (3)

| Archivo | Qué cambia |
| --- | --- |
| `CLAUDE.md` | Header del proyecto + frase identidad + refs |
| `docs/dev-onboarding.md` | Sección "Identidad" + git clone command |
| `docs/dev-team-handover.md` | Sección 1 "Identidad del proyecto" + glosario |

### 3.3 Documentación audit + roadmap (10+)

| Archivo | Qué cambia |
| --- | --- |
| `docs/audit/DECISIONES-AUDITOR-JAVIER-HP.md` | Refs en cabecera y entradas |
| `docs/audit/PREGUNTAS-PARA-LA-CLIENTE.md` | Refs |
| `docs/audit/RESPUESTAS-CLIENTA-JAVIER-HP.md` | Refs |
| `docs/audit/STACK-TECNOLOGICO.md` | Refs |
| `docs/audit/findings-summary.md` | Refs |
| `docs/audit/05-browser-verification.md` | Refs |
| `docs/audit/05-tokens-exposed.md` | Refs |
| `docs/audit/deep/EXECUTIVE-SUMMARY-FOR-CLIENT.md` | Refs |
| `docs/audit/PRESENTATION.html` | Refs en HTML title y body |
| `docs/architecture/*.md` (overview, layers-and-structure, data-layer) | Refs en cabecera |
| `docs/roadmap/*.md` | Refs |
| `docs/release-process.md` | Refs (si los hubiera) |
| `docs/rename-guide.md` (este archivo) | Se queda como histórico tras renombrar |

### 3.4 Plans (2+)

| Archivo | Qué cambia |
| --- | --- |
| `plans/RoadMap.md` | Header + identidad |
| `plans/20260518-brainstorm-audit-and-documentation/brainstorm-summary.md` | Refs |
| `plans/20260519-1200-rls-multitenant-hardening/plan.md` | Refs |

### 3.5 Agentes y hooks (.claude/) (~24 archivos)

Si confirmas cambio de namespace `af-agents` → `linkstation-agents`:

| Archivo | Cambios principales |
| --- | --- |
| `.claude/agents/manager.md` | Tabla subagentes namespace + ejemplos de Task |
| `.claude/agents/database.md` | Refs proyecto |
| `.claude/agents/adr.md` | Refs proyecto + lista stack |
| `.claude/agents/deployment.md` | Refs + URLs |
| `.claude/agents/git.md` | Refs |
| `.claude/agents/team-knowledge-keeper.md` | Refs + ejemplos |
| `.claude/agents/help-docs-keeper.md` | Refs + Task examples |
| `.claude/agents/roadmap-keeper.md` | Refs |
| `.claude/agents/*.md` (resto) | Refs si existen |
| `.claude/hooks/af-roadmap-check.cjs` | Stack reminder + nombre |
| `.claude/hooks/af-task-tracker.cjs` | Mensajes |
| `.claude/hooks/af-deps-guard.cjs` | Mensaje del block + stack |
| `.claude/hooks/af-stop-checkpoint.cjs` | Refs |
| `.claude/hooks/hooks.json` | (no refs, sólo paths) |
| `.claude/commands/staging.md` | Refs |
| `.claude/commands/staging-main.md` | Refs |

Los ficheros hook fueron renombrados (`af-*.cjs`):

- `.claude/hooks/af-roadmap-check.cjs` → `af-roadmap-check.cjs`
- `.claude/hooks/af-task-tracker.cjs` → `af-task-tracker.cjs`
- `.claude/hooks/af-deps-guard.cjs` → `af-deps-guard.cjs`
- `.claude/hooks/af-stop-checkpoint.cjs` → `af-stop-checkpoint.cjs`
- Actualizar `hooks.json` con nuevos paths.

Te recomiendo SÍ renombrar los hooks (coherencia total). Confirmar.

### 3.6 Scripts (2)

| Archivo | Cambios |
| --- | --- |
| `scripts/promote.ps1` | Refs en comentarios + mensajes |
| `scripts/promote.sh` | Refs en comentarios + mensajes |

### 3.7 GitHub workflows (1)

| Archivo | Cambios |
| --- | --- |
| `.github/workflows/staging-main-purity-check.yml` | Mensaje del CI |

### 3.8 Memoria persistente Claude Code

| Archivo | Cambios |
| --- | --- |
| `~/.claude/projects/e--ClaudeCode-LinkStation-linkstation-main/memory/MEMORY.md` | La carpeta `projects/` de Claude Code está nombrada según la ruta. Cuando renombres la carpeta del repo, Claude Code creará una nueva entrada `projects/...linkstation-DashBoard/`. **Hay que mover los `.md` de memoria a esa nueva ubicación** para no perderlos. Yo te lo hago. |

### 3.9 GitHub repo (cuando lo crees)

| Acción | Cómo |
| --- | --- |
| Crear repo nuevo en GitHub | Nombre `linkstation-dashboard`. Visibilidad **privada**. |
| Añadir remote local | `git remote add origin https://github.com/<tu-org>/linkstation-dashboard.git` |
| Push inicial de `auditoria` | `git push -u origin auditoria` (la rama actual) |
| Crear `developer`, `staging`, `main` | Como ramas de `auditoria` o vacías |
| Configurar branch protection | Settings → Branches (según `docs/release-process.md` §5) |

> ⚠️ **NUNCA** añadas remote al GitHub del cliente `LinkStation/linkstation-dashboard`. Repo separado del equipo.

---

## 4. Contador estimado de cambios

| Categoría | Archivos | Línea/edit aprox |
| --- | --- | --- |
| Configs | 5 | ~15 |
| Docs raíz | 3 | ~30 |
| Docs audit | 10+ | ~40 |
| Docs roadmap/plans | 5+ | ~25 |
| Agentes `.claude/` | ~24 | ~80 (incluye namespace) |
| Hooks `.cjs` | 4-5 | ~10 (incluyendo rename si aplica) |
| Scripts | 2 | ~10 |
| GitHub workflows | 1 | ~5 |
| **TOTAL** | **~55 archivos** | **~215 edits** |

Tiempo estimado mío para hacer todo: **~45 min** una vez tenga tu confirmación + carpeta renombrada.

---

## 5. Memoria de Claude Code — caso especial

Cuando renombres la carpeta local, Claude Code creará una nueva entrada en `~/.claude/projects/` con el path nuevo. Los archivos de memoria (`project_mvp_crm_scope.md`, `project_stack_data_layer.md`, `project_rls_multitenant_audit.md`, `MEMORY.md`) están en la entrada vieja.

**Cuándo hago la migración**: justo después de que renombres la carpeta y antes de empezar a trabajar, hago `cp` de los `.md` de memoria de la ubicación vieja a la nueva. Si me lo dices, lo hago automáticamente al recibir tu OK.

---

## 6. Reversibilidad

- El rename es **totalmente reversible** mientras no hayas pusheado a GitHub.
- Si algo sale mal: renombras la carpeta de vuelta a `linkstation-main`, revertimos los edits con `git checkout -- .` (en caso de que hayamos commiteado, `git revert`).
- Por seguridad: **NO commitees nada durante el proceso de rename**. Hacemos todo el sweep + 1 commit final cuando esté limpio.

---

**Última actualización**: 20-05-2026.
**Mantenedor**: Javier HP (Auditor).
