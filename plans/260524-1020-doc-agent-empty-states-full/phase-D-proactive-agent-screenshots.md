# Phase D — Proactive agent + screenshots + WCAG audit

**Tiempo:** 2-3h
**Bloquea:** Cierre del plan completo.
**Dependencias:** Phase B + Phase C DONE.

## Objetivo

Activar `help-docs-keeper` agent proactivo:

1. Cada vez que un componente UI cambia (PostToolUse Edit/Write), el hook invoca al manager → el manager delega a `help-docs-keeper` que:
   - Identifica qué sección de help_sections corresponde al componente cambiado
   - Re-genera contenido: descripción, tabla campos, pasos, casos
   - **Antes de screenshot**: invoca `af-agents:uxui` para validar WCAG 2.2 AA → corrige si hay violaciones
   - Toma screenshot con Playwright MCP de la página actualizada
   - Actualiza row en `help_sections` (BD)
   - Marca como `provisional` si fue cambio reciente, `completada` si sprint cerrado

## D.1 — Update agent `help-docs-keeper.md`

Editar [.claude/agents/help-docs-keeper.md](.claude/agents/help-docs-keeper.md):

Cambios principales:

- Cambiar mención de "Ayuda al admin" (singular) a "Doc Admin + Docs Clientes" (dos páginas).
- Añadir mapping section_slug ↔ ruta UI ↔ scope.
- Añadir paso obligatorio en workflow: "Antes de screenshot, invoca uxui para auditar WCAG 2.2 AA y aplicar fixes".
- Cambiar `route_in_app` para reflejar las 2 nuevas rutas.
- Coordinación con uxui agent: añadir entrada en tabla "Necesitas → Llama a".

## D.2 — Update manager `.claude/agents/manager.md`

Añadir a la lista de subagentes coordinados:

- `help-docs-keeper` — invocado on-demand y proactivamente via hook af-docs-watcher
- Reglas: si recibe broadcast del hook con `changed_files = ["src/app/dashboard/leads/page.tsx", ...]`, delegar a help-docs-keeper con `section_slug = "leads"`.

## D.3 — Hook `.claude/hooks/af-docs-watcher.cjs`

Crear hook PostToolUse(Edit|Write) que dispara cuando se edita un componente del dashboard:

```javascript
#!/usr/bin/env node
// .claude/hooks/af-docs-watcher.cjs
// Hook PostToolUse(Edit|Write): detecta cambios en src/app/dashboard/** o src/components/**
// y notifica al manager para que delegue a help-docs-keeper.

const fs = require("fs");
const path = require("path");

const input = JSON.parse(fs.readFileSync(0, "utf-8"));
const filePath = input?.tool_input?.file_path || "";

// Solo dispara para cambios en UI del dashboard
const isUIChange = /src[\\/](app[\\/]dashboard|components)[\\/].*\.(tsx?|jsx?)$/.test(filePath);
if (!isUIChange) {
  process.exit(0); // Silencioso, no es un cambio relevante
}

// Mapear el path a una section slug
// Ej: src/app/dashboard/leads/page.tsx -> section_slug = "leads"
const dashMatch = filePath.match(/src[\\/]app[\\/]dashboard[\\/]([^\\/]+)/);
const sectionSlug = dashMatch ? dashMatch[1] : null;
if (!sectionSlug) process.exit(0);

// Emitir mensaje para que el manager lo recoja
console.log(
  JSON.stringify({
    type: "docs_update_needed",
    section_slug: sectionSlug,
    changed_file: filePath,
    timestamp: new Date().toISOString(),
    instruction: `Help-docs-keeper: re-genera la sección '${sectionSlug}' en help_sections (scopes admin Y clientes si aplica). Antes de screenshot, audita WCAG 2.2 AA. Marca como provisional.`,
  })
);

// Append a log para audit
const logDir = path.resolve(process.cwd(), ".claude", "logs");
fs.mkdirSync(logDir, { recursive: true });
fs.appendFileSync(
  path.join(logDir, "af-docs-watcher.log"),
  `${new Date().toISOString()} [docs_update_needed] section=${sectionSlug} file=${filePath}\n`
);
```

Registrar en `.claude/hooks/hooks.json`:

```json
{
  "hooks": [
    {
      "matcher": "PostToolUse(Edit|Write)",
      "command": "node .claude/hooks/af-docs-watcher.cjs",
      "type": "command"
    }
  ]
}
```

**OJO**: si `hooks.json` ya tiene otros hooks, MERGE, no sobreescribir. Leer el archivo primero.

## D.4 — Initial content generation

Delegar a `help-docs-keeper` para que rellene contenido INICIAL de las 11 sections (5 admin + 6 clientes) creadas en Phase C:

```
Task(subagent_type="help-docs-keeper", model="sonnet", prompt="""
Tarea: Generar contenido inicial completo para TODAS las secciones en help_sections (scope admin y clientes).

Para cada sección:
1. Revisa la ruta route_in_app correspondiente (leer src/app/dashboard/<section_slug>/page.tsx)
2. Genera content_markdown descriptivo con: qué hace, audiencia, principales acciones disponibles
3. Genera fields_table inspeccionando los principales props/state del componente
4. Genera steps numerados de la flow más común
5. Genera common_cases (3 ejemplos típicos)
6. ANTES de screenshot: invoca Task(subagent_type="uxui", model="sonnet", prompt="Audita WCAG 2.2 AA de /dashboard/<section_slug>. Lista violaciones. Aplica fixes si son triviales (alt text, aria-label, contraste, focus). Reporta.")
7. Toma screenshot con Playwright MCP (logged in como admin), guarda en docs/screenshots/help/<scope>/<slug>/main.png
8. UPDATE row en help_sections vía REST API service_role

Coordinación: usar credenciales del vault. URL Supabase = path-prefix VPS o LOCAL según target.
Tiempo límite: 90 min total. Si una sección bloquea: SKIP y documentar.
Reportar al final con tabla: section | status (DONE|SKIPPED|BLOCKED) | screenshot_path | wcag_violations_fixed.

Work context: e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard
Reports: plans/260524-1020-doc-agent-empty-states-full/reports/
""")
```

## D.5 — Validación end-to-end

Tras agente terminado:

1. Navegar a `/dashboard/docs-admin` como admin → ver las 5 sections con contenido + screenshots.
2. Navegar a `/dashboard/docs-clientes` como admin Y como viewer → ver las 6 sections.
3. Verificar que screenshots están servidos correctamente (rutas en `docs/screenshots/help/...`).
4. Editar un componente cualquiera (ej. añadir un comentario inocuo a `src/app/dashboard/leads/page.tsx`) → verificar que hook `af-docs-watcher.cjs` se dispara y aparece en `.claude/logs/af-docs-watcher.log`. Si el manager está activo, debería re-invocar help-docs-keeper.

## D.6 — Validación WCAG 2.2 AA final

Lanzar `af-agents:uxui` con scope amplio:

```
Task(subagent_type="uxui", model="sonnet", prompt="""
Audita WCAG 2.2 AA de las 3 páginas de documentación:
- /dashboard/docs
- /dashboard/docs-admin
- /dashboard/docs-clientes

Para cada una en LOCAL y VPS:
1. Captura snapshot accesibilidad
2. Lista violaciones (level A, AA)
3. Para cada violación: aplica fix automático si trivial (alt text, aria-*, contrast adjustment, focus styles)
4. Re-captura para verificar
5. Reporta resultado: pages_audited × violations_found × violations_fixed × violations_remaining

Si quedan violaciones AA no fixeables: documentar en plans/260524-1020-.../reports/wcag-final-audit.md con explicación + propuesta.

Work context: e:/ClaudeCode/linkstation-dashboard/linkstation-dashboard
""")
```

## Acceptance criteria Phase D

- [ ] Hook `af-docs-watcher.cjs` registrado y funcional (verificado con cambio dummy)
- [ ] Agent `help-docs-keeper.md` actualizado a 2 scopes
- [ ] Agent `manager.md` actualizado con help-docs-keeper en su roster
- [ ] Las 11 sections (5+6) en `help_sections` tienen contenido + screenshot + fields + steps + cases
- [ ] WCAG 2.2 AA audit pasado en las 3 páginas docs (sin violaciones AA bloqueantes)
- [ ] `.claude/logs/af-docs-watcher.log` muestra al menos 1 entrada de prueba
- [ ] Tests Playwright: las 3 páginas docs accesibles, screenshots visibles, contenido coherente
- [ ] Commit + push: `feat(docs): activate help-docs-keeper proactive agent + WCAG 2.2 AA validation`

## Plan de ataque

1. (15 min) D.1 + D.2 (updates agentes)
2. (15 min) D.3 (hook + register)
3. (60-90 min) D.4 (initial content generation via help-docs-keeper)
4. (20 min) D.5 (validación E2E)
5. (30 min) D.6 (WCAG audit final)
6. (10 min) Commit + push

## Output

Actualizar `execution-log.md` por cada paso + crear `reports/wcag-final-audit.md` con resultados.
