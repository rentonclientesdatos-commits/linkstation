---
title: "Plan autónomo — Doc Admin + Docs Clientes + empty-states + bug fixes"
date: 2026-05-24
audience: Claude Code (auto-ejecutar tras /clear sin intervención del usuario)
estimated: 6-9h orquestadas
branch: developer (commits directos, autodeploy a VPS)
status: PENDIENTE EJECUCIÓN
---

# Plan — Doc Admin + Docs Clientes + empty-states + bug fixes

> **CRÍTICO:** Este plan está diseñado para ejecutarse SIN intervención del usuario tras un `/clear`. Todas las decisiones están tomadas. Todas las credenciales están en el vault. Todos los permisos están concedidos en sesiones previas (commit/push a `developer`, editar docs/.md, usar Playwright MCP, usar SDK Supabase con service role).
>
> **Si encuentras ambigüedad NO documentada aquí**: apunta como BLOCKED en execution-log.md y continúa con la siguiente fase. NO interrumpas al usuario.

## Contexto al iniciar

### Estado git

- Branch: `developer`
- Último commit pusheado: `259b7e4 fix(supabase): client.ts must use direct process.env access for browser bake`
- Commits relevantes recientes:
  - `259b7e4` fix client.ts (Edge runtime dynamic env access)
  - `a6a503f` fix docs overflow
  - `0d7e856` fix script app_metadata
  - `702d4a3` fix auth-config Edge runtime
  - `5c3b04e` feat path-prefix Supabase
- Autodeploy activo en VPS Dokploy: cada push a developer dispara rebuild dev.dash.

### Estado VPS (verificado 2026-05-24 10:20)

- `https://dev.linkstation.ai/login` → 200 ✅
- `https://dev.linkstation.ai/supabase/auth/v1/health` → 401 (sin apikey, comportamiento correcto Kong)
- Path-prefix `/supabase/*` via traefik funcionando.
- BD VPS poblada por `seed-demo.ts`: 2 tenants + 55 leads + 20 convos + 86 llamadas + datos relacionados.
- Admin user: `LinkStation@gmail.com / BeaOli#AF*2026!` (mismo local + VPS, `app_metadata.is_admin=true`).
- Viewer user VPS: `viewer@af.local / uI0FTbgdVVwMDg9vBxQ-Aa1!` (distinto del de local — generado en última sesión).

### Credenciales operativas (NO commitear, leer del vault)

- VPS Supabase URL: `https://dev.linkstation.ai/supabase`
- VPS Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Nzk0OTQ1OTEsImV4cCI6MjA5NDg1NDU5MX0.kNk8hf6ptK-9GRnbftZW1mF84X_MJj_-KQ40i-xcp0A`
- VPS Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NDk0NTkxLCJleHAiOjIwOTQ4NTQ1OTF9.HjoQBXmBzIZD9yiP0d7IbY9auI-o-HAUPRRdGU5TDpI`
- Vault file completo: `infra/supabase-vps/.vault/dev-dash-envs.env` (gitignored).

### Decisiones del usuario tomadas (NO re-preguntar)

1. **Empty states**: si una sección no tiene datos, **NUNCA mostrar alert/error popup**. Mostrar estado vacío amistoso ("Aún no hay X. Crear el primero" o similar).
2. **Doc Admin + Docs Clientes**: DOS páginas separadas en sidebar (al final, sin quitar la "Docs" actual). NO una sola página con 3 tabs como decía el spec original.
3. **Agente proactivo**: `help-docs-keeper` debe activarse via hook `PostToolUse(Edit|Write)` agresivo (cada cambio de componente UI regenera la sección de doc afectada). Mantiene docs sincronizadas mientras desarrollamos.
4. **Screenshots automáticos**: el agente regenera screenshots cada vez que cambia el componente correspondiente. Usar Playwright MCP. Guardar en `docs/screenshots/help/<scope>/<slug>/`.
5. **Accesibilidad WCAG 2.2 AA OBLIGATORIA antes de cada screenshot**: invocar `af-agents:uxui` (o subagente equivalente) sobre la página → si hay violaciones, corregir → re-screenshot. NO subir screenshots de páginas no-conformes.
6. **Passwords**: NO crear passwords débiles ni en local ni en VPS. Para admin existing usar las ya creadas. Para cualquier usuario nuevo: `crypto.randomBytes(20).toString('base64url').slice(0, 24) + '-Aa1!'` o equivalente fuerte.
7. **Commits directos a developer**: autorizado para esta línea de trabajo. NO crear PR. NO pedir confirmación para push individual. Commit messages convencionales, sin co-authoring de IA.

## Estructura del plan

Ver fases detalladas en archivos hermanos:

- [phase-A-verify-vps-rebuild.md](phase-A-verify-vps-rebuild.md) — Pre-flight (15 min)
- [phase-B-bug-fixes-empty-states.md](phase-B-bug-fixes-empty-states.md) — Bug fixes + empty states (1.5-2h)
- [phase-C-doc-pages-implementation.md](phase-C-doc-pages-implementation.md) — Doc Admin + Docs Clientes UI + DB (3-4h)
- [phase-D-proactive-agent-screenshots.md](phase-D-proactive-agent-screenshots.md) — Agente + hook + screenshots (2-3h)

## Orden de ejecución obligatorio

1. **Phase A** primero (verificar arranque limpio).
2. **Phase B** segundo (sin esto la UX está rota y los screenshots saldrán mal).
3. **Phase C** tercero (necesitas las routes + DB para que Phase D tenga dónde escribir).
4. **Phase D** último (necesita B+C terminadas para capturar screenshots útiles).

## Acceptance criteria global

Al final de las 4 fases:

- [x] VPS sirve `/dashboard/conversaciones` sin "This page couldn't load" (ya verificado en Phase A)
- [ ] Todas las páginas dashboard muestran empty state amistoso si la BD está vacía (no alerts, no errores)
- [ ] Bug `Orchestration disabled for tenant` resuelto (graceful handling o flag config)
- [ ] Bug schema cache `web_widgets.updated_at` resuelto
- [ ] Nuevas rutas accesibles: `/dashboard/docs-admin`, `/dashboard/docs-clientes`
- [ ] Sidebar muestra al final: `Doc Admin` + `Docs Clientes` (con "Docs" original intacto encima)
- [ ] Tabla `help_sections` aplicada en migrations LOCAL + VPS con RLS por tenant
- [ ] Agente `help-docs-keeper` actualizado para handle 2 scopes
- [ ] Hook `af-docs-watcher.cjs` registrado en `.claude/hooks/hooks.json`
- [ ] Manager `.claude/agents/manager.md` lista a help-docs-keeper en sus coordinaciones
- [ ] Mínimo 5 secciones documentadas en cada página (admin + clientes) con: descripción, screenshot, tabla campos, pasos, casos comunes
- [ ] Todas las screenshots pasan WCAG 2.2 AA (validado por uxui agent)
- [ ] Memoria actualizada con todo lo hecho

## Manejo de errores y fallbacks

- Si Phase A revela que el VPS no está estable: revertir al commit pre-`259b7e4` con `git revert` y reportar.
- Si Phase B descubre bugs no anticipados: documentar en `execution-log.md` y proceder; los bugs no-bloqueantes no detienen el plan.
- Si Phase C: la migration falla en VPS por permisos → caer en backup plan: aplicar SQL via REST API con service role + cuerpo SQL.
- Si Phase D: el agente uxui falla en accesibilidad → documentar las violaciones en `execution-log.md`, intentar fix automatizado, si requiere decisión de diseño: SKIP esa página y dejar nota.
- Si te quedas sin tokens / contexto: actualizar `execution-log.md` con el estado parcial + última cosa hecha + próximo paso EXACTO. La siguiente sesión arranca leyendo execution-log.md primero.

## Log de ejecución

Mantener actualizado [execution-log.md](execution-log.md) en CADA cambio significativo. Es la única fuente de verdad para retomar tras interrupción.
