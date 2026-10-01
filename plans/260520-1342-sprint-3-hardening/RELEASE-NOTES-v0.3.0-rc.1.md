# Release Notes — v0.3.0-rc.1 (Sprint 3 — Hardening)

## Resumen

Release candidate del MVP. Cierra Sprint 3 Hardening: observabilidad estructurada, security headers + rate limiting, migración a Node 22 LTS, sub-tareas WCAG y features adicionales del Bloque 3.B (campañas Excel + festivos + buscador Settings). Pasa a `developer`. La GA final (`v0.3.0`) saldrá tras validación SP-4B por Renzo.

## Highlights

- **Observabilidad full**: Pino 10 logger estructurado JSON, Sentry v10 manual setup, bull-board UI para colas BullMQ, endpoints `/api/health` + `/api/version`.
- **Hardening seguridad**: CSP completo con dominios LLM/Supabase/Sentry whitelistados, HSTS preload, X-Frame-Options DENY, rate limiter sliding-window con HOF `withRateLimit` para Server Actions, npm audit en CI, Renovate bot.
- **Node 22.22.3 LTS** activo en local + Dockerfile (Active LTS hasta Oct 2027). Desbloqueado lint-staged 17.
- **Sub-tareas WCAG 2.2 AA**: aria-label en botones Personalizar, heading hierarchy h1→h2 corregida, skip-link "Saltar al contenido principal".
- **Bloque 3.B (NEW-09/10/11/12)**: rename UI Historial→Leads, importación Excel campañas, festivos manuales por país, buscador integraciones en Settings.
- **E2E Sprint 3**: specs Playwright para health/version + security headers + WCAG accessibility + helper reutilizable `expectVpsServingCommit`.
- **Testing profundo 26-05-2026 (BUG-3-01..13)**: 13 BUGs resueltos en sesión de testing local — race conditions en tests, breakpoint shell `md:` → `lg:` (1024px), KPI hero responsive, tabla historial scroll horizontal, CSP `unsafe-eval` solo en dev. Vitest 228/228 + TypeCheck 0 + Playwright sprint-3-close 14/14.
- **AWS Bedrock removal**: eliminado permanentemente del stack (orden 26-05-2026). Deps `@aws-sdk/client-bedrock-*` quitadas, MinIO sigue funcionando vía `@aws-sdk/client-s3`. Docs limpiados.
- **Sidebar UX**: nuevo item "Dashboard" como primer item del menú + rename "Tabla Leads" → "Lista de Leads".
- **TypeScript no-`any` policy**: ESLint regla `@typescript-eslint/no-explicit-any` activada como ERROR. Husky pre-commit bloquea cualquier `any` introducido. Doc oficial `docs/architecture/typescript-standards.md` con alternativas.
- **SP-4-LINT-ZERO cerrada (28-05-2026)**: lint baseline 104 problems → **0**. 9 lotes commiteados, 18 archivos limpiados. Patrón `asPlainClient()` helper introducido en QualificationProcessor + scheduler para sortear `[key: string]: unknown` en tipo `Lead`. Sin regresiones (236/240 Vitest verde).
- **SP-4-DEPRECATIONS-DEPLOY (28-05-2026)**: 4 cambios sin bump de deps. (1) `src/middleware.ts` → `src/proxy.ts` + función `proxy()` (Next 16 deprecation, runtime Node.js). (2) `next.config.ts`: `disableLogger: true` → `webpack.treeshake.removeDebugLogging: true` (Sentry 10). (3) `next.config.ts`: `turbopack.root: process.cwd()` (silencia warning multiple lockfiles). (4) `/api/version`: `??` → `||` (Build Args vacíos no activaban nullish coalescing).
- **Service role key fuera de imagen Docker (28-05-2026)**: refactor crítico de seguridad. `AUTH_SUPABASE_SERVICE_ROLE_KEY` constante → `getAuthServiceRoleKey()` lazy getter en `src/lib/auth-config.ts`. Dockerfile elimina `ARG/ENV SUPABASE_SERVICE_ROLE_KEY` — el key admin ya NO queda embebido en capa de imagen. 7 callers productivos migrados (reminders/sweep/google-callback/retell-webhook/whatsapp-bridge/WhatsApp{AI,Webhook}Processor). Cierra OWASP A05:2021 (Security Misconfiguration).
- **Auth rate-limit (SP-4-AUTH-RATELIMIT 27-05)**: `loginAction` 5/min + `resetPasswordAction` 3/min por bucket `ip:emailHash` (sha256-8b para no logear email). Tests Vitest 7/7. Cierra OWASP A07:2021 (Identification & Authentication Failures).
- **Doc incidente PAT GitHub leak Dokploy (27-05-2026)**: registrado en `plans/260527-2056-e2ctotal-local-run/INCIDENT-260527-pat-leak-y-sheets-paralelo.md`. Rotación efectiva del PAT en panel Dokploy pendiente acción usuario.
- **Cierre formal CLOSE-1/1.5/2/4 🟢 PASS (29-05-2026)**: typecheck + lint 0 problems + build 42 rutas + 306/310 Vitest (+26 specs nuevos tras BUG-SEC fixes) + Security delta OWASP 2021 (0 críticos / **4 BUG-SEC TODOS FIXED en CLOSE-4 antes del merge** / 3 informativos cubiertos) + 61/61 Playwright suite completa + /e2ctotal autónomo PASS (352/356, 98.9%).
- **Cierre 4 BUG-SEC en esta RC (29-05-2026 tarde)** (orden Javi HP): X-Real-IP priorizado en rate-limit, HMAC-SHA256 en webhook workflow genérico + flag `WEBHOOK_WORKFLOW_REQUIRE_SECRET`, maskEmail/maskPhone helpers para logs PII, fail-CLOSED en pause check WhatsApp. 2 helpers nuevos en `src/lib/security/` + 29 specs nuevos. Commits `bcd36a9` + `c018c11` + `ecdbe9a`.

## Detalle por área

### Seguridad

- `src/lib/rate-limiter.ts`: helper sliding-window con ioredis (fail-open si Redis cae).
- `src/lib/api/with-rate-limit.ts`: HOF `withRateLimit()` para wrap Server Actions críticas (4-08).
- `next.config.ts`: CSP + HSTS + X-Frame-Options DENY + Referrer-Policy + Permissions-Policy en todas las rutas. Excepción `/widget/*` con frame-ancestors abierto.
- `.github/workflows/security.yml`: npm audit en CI (falla en High/Critical).
- `.github/renovate.json`: Renovate bot con patches auto-PR, majors bloqueados.
- `docs/security/csrf-protection.md`: documenta defensa CSRF built-in Next.js.
- `docs/architecture/rate-limits.md`: tabla de buckets + cómo añadir nuevos.

### Observabilidad

- `src/lib/utils/logger.ts`: refactor a Pino 10 preservando API previa, scrubbing PII multi-nivel.
- `src/lib/core/queue/lead-sequence-queue.ts`: logging structured en Redis events + BullMQ worker lifecycle (completed/failed/stalled).
- 3 webhooks (retell + crm + whatsapp) con trace_id Pino.
- `src/app/api/admin/queues/[[...slug]]/route.ts`: Bull-board UI con guard requireApiAdmin.
- Sentry v10.53.1 setup manual (no wizard): 3 configs runtime-specific + `instrumentation.ts` + `withSentryConfig` en next.config.

### Endpoints públicos verificación VPS (SP-4-NEW-13)

- `GET /api/health` → `{ status: "ok", timestamp }` no-cache.
- `GET /api/version` → `{ version, commit, branch, deployedAt, nodeVersion }` no-cache.
- Dockerfile stage runner con ARG GIT_COMMIT_SHA + GIT_BRANCH + BUILD_TIMESTAMP.
- Helper E2E `tests/e2e/utils/vps-version.ts` con `expectVpsServingCommit(request, sha)` y `expectVpsHealthy(request)`.

### Bloque 3.B — Features Bea (NEW-09..12)

- **NEW-09 Campañas Excel**: schema Zod `campaign-import.ts`, Server Action `importCampaignFromExcel` con exceljs (rate-limited 10/min/tenant, dedup por teléfono), migración `campaigns` table con RLS multi-tenant.
- **NEW-10 Festivos**: migración `tenant_holidays` table con RLS, Server actions `getHolidays/addHoliday/removeHoliday`, helper `isBusinessDay()` para integración con scheduler BullMQ.
- **NEW-11 Rename Historial→Leads**: ya completado pre-Phase 02 (commit `a6fb1d4`). Approach B (URLs intactas, solo labels UI). 3 cambios + 2 preservaciones semánticas (DuplicateLeadDialog "Historial del número" + voice-agents tab "Historial").
- **NEW-12 Settings UX**: buscador integraciones con filter por keyword (sticky input arriba) + verificación de que "Probar conexión" CRMs ya estaba implementado desde Sprint 2 (commit `74cc137`). Mejoras 3+4 (confirmación robusta destructiva + slide-over edición) diferidas al Sprint Refinamiento post-MVP por scope.

### WCAG 2.2 AA sub-tareas

- **SP-4-WCAG-08**: aria-label + title en botones "Personalizar" (SummaryManager 2 botones + ChartManager 1 botón).
- **SP-4-WCAG-09**: heading hierarchy corregida — h1 "Métricas Generales" y h1 "Análisis Visual" bajados a h2 (mantiene 1 h1 único por página).
- **SP-4-WCAG-10**: componente `SkipLink.tsx` añadido al root layout, `<main id="main-content" tabIndex={-1}>` en DashboardShell.

### Node 22 LTS (SP-4-NODE-22)

- `.nvmrc` 22.22.3
- `package.json` engines.node `>=22.0.0`, @types/node downgrade `^24→^22.19.19` (alinear types con runtime)
- `lint-staged` desbloqueado a `^17.0.5`
- Dockerfile 3 stages `node:20-alpine → node:22-alpine`
- `docs/dev-onboarding.md` actualizado con migración marcada completada.

### Testing profundo 26-05-2026 — 13 BUGs Sprint 3 (SP-4-BUG-3-01..13)

- **BUG-3-01**: tests sprint-0 con `demo@af.local` hardcoded → env var `VPS_ADMIN_EMAIL ?? "LinkStation@gmail.com"` + `npm run db:seed-demo`.
- **BUG-3-02**: CSP `bedrock.*.amazonaws.com` (sintaxis inválida) + warning `eval()` React dev → línea CSP eliminada + filtros eval/CSP en test 2B-08.
- **BUG-3-03/04**: `attemptLogin` race "missing email or phone" sprint-0 + cascada SF-05 logout → `waitFor visible` de inputs + retry interno + guard `isRaceFill`.
- **BUG-3-05**: saturación Supabase Auth con 8 workers Playwright → `playwright.config.ts` `workers: IS_CI ? 1 : 2`.
- **BUG-3-06**: race sprint-2-close + 2b-close concurrencia → helper único `loginAsAdmin` con `waitFor` reemplaza 4 ocurrencias inline.
- **BUG-3-07**: Sidebar `md:flex` (768px) ahogaba main en tablets → breakpoint global shell `md:` (768px) → `lg:` (1024px) en `Sidebar.tsx` (6 cambios) + `Topbar.tsx` (1). Docs responsive en `dev-team-handover.md §4.bis` + `layers-and-structure.md` + `dev-onboarding.md` regla #9.
- **BUG-3-09**: KPI hero cards 4-cols en 768px → labels truncados ("Tota...") → `COL_SPAN_MAP` recalibrado en `schema.ts` + grid `sm:6 lg:12` en `SummaryManager.tsx`.
- **BUG-3-10**: tabla historial col ORIGEN truncada a "OR" en 1440px → `HistorialTable.tsx` `min-w-max` + `overflow-x-auto` (scroll H 1261px disponible).
- **BUG-3-12**: scrollbar superior tabla historial NO coincidía con ancho contenido → inline `style={{ width: ... }}` en lugar de class JIT (no procesa width dinámico).
- **BUG-3-13**: badge "1 Issue" Next Dev Tools por error `eval()` (CSP estricta + React dev) → `next.config.ts` CSP `script-src 'unsafe-eval'` SOLO si `NODE_ENV !== 'production'`.

Tests al cerrar sesión: Vitest 228/228 ✅ + TypeCheck 0 errors ✅ + Playwright sprint-3-close 14/14 ✅ + suite completa 41-43/43 ✅.

### AWS Bedrock removal (orden 26-05-2026)

- Eliminadas deps prod: `@aws-sdk/client-bedrock-agent-runtime`, `@aws-sdk/client-bedrock-runtime` (5 packages npm removed).
- Mantenido `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (MinIO S3-compatible, NO conecta con AWS).
- `next.config.ts`: línea CSP `bedrock.*.amazonaws.com` eliminada (era sintaxis inválida).
- `.env.example`: sin `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- `src/app/dashboard/playground/page.tsx`: mensaje UI genérico ("El proveedor de Knowledge Base no está configurado").
- Limpieza docs (con nota "Bedrock descartado 26-05-2026"): CLAUDE.md, README.md, dev-{onboarding,team-handover,local-setup}.md, architecture/{llm-stack,layers-and-structure}.md, audit/STACK-TECNOLOGICO.md, dependencies/{outdated,risk-matrix,stack-versions}.md, handoff/deploy-supabase-vps-dokploy.md, .claude-plugin/plugin.json, .claude/agents/adr.md.

### Sidebar UX (orden 26-05-2026)

- Nuevo item "Dashboard" como primer item del menú de `src/components/layout/Sidebar.tsx` (apunta a `/dashboard`, antes de "Constructor & IA").
- Renombrado "Tabla Leads" → "Lista de Leads" en `NAV_ITEMS`.

### TypeScript no-`any` standard (orden 26-05-2026)

- Nuevo doc `docs/architecture/typescript-standards.md` con tabla de alternativas (`Record<string, unknown>`, `unknown` + type guards, generics, interfaces dedicadas) + ejemplos reales del commit.
- ESLint regla `@typescript-eslint/no-explicit-any` activada como ERROR. Husky pre-commit bloquea cualquier `any` introducido.
- Pre-push hook `max-warnings 0` activa boy scout rule sobre `unused-vars`, `prefer-const`, etc.
- 4 errores `any` en `src/app/dashboard/playground/page.tsx` arreglados con tipos reales (`HealthCardProps` interface + `Record<string, unknown>` para metadata + casts shape explícito).
- 4 imports lucide sin usar quitados (`Check`, `AlertCircle`, `Activity`, `ShieldCheck`).
- Actualizado `docs/dev-onboarding.md` (regla #10) + `docs/dev-team-handover.md` (sección 4.ter nueva).
- Nueva tarea **`SP-4-LINT-ZERO`** (8-12h) abierta en RoadMap Sprint 3 para limpiar los 114 problems baseline → 0 al cierre MVP v0.3.0 GA.

## Breaking changes

NINGUNO para usuarios finales. Para devs:

- `npm install` regenera lockfile (sin cambios funcionales).
- Si tienes Node <22 local: usa `nvm install 22.22.3 && nvm use 22.22.3`.

## Migraciones SQL aplicadas

- `supabase/migrations/20260526100000_campaigns_and_holidays.sql` — crea tablas `campaigns` y `tenant_holidays` con RLS multi-tenant + índices.

> **Acción pendiente**: aplicar esta migración al VPS Dokploy vía pg-meta REST (SSH denegada) — se hace en SP-4B phase-04 bloque pre-deploy.

## Variables de entorno nuevas

- `SENTRY_DSN` — backend Sentry (opcional, sin DSN el SDK no se inicializa).
- `NEXT_PUBLIC_SENTRY_DSN` — frontend Sentry (mismo valor; expuesto al browser).
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — source maps upload (CI/Dokploy build only).
- `GIT_COMMIT_SHA`, `GIT_BRANCH`, `BUILD_TIMESTAMP` — inyectados por Dokploy en build args (no manuales).
- `LOG_LEVEL` — ya existía, ahora documentado en `.env.example` con valores Pino válidos.

## Dependencias añadidas

prod:

- `pino` ^10.3.1 (logger structured JSON)
- `@bull-board/api` ^7.1.5 + `@bull-board/express` ^7.1.5 (UI BullMQ admin)
- `@sentry/nextjs` ^10.53.1 (error tracking)
- `exceljs` ^4 (parser XLSX para NEW-09)
- `express` ^5 (transitive via @bull-board/express)

dev:

- `@types/express` ^5

## Tareas RoadMap cerradas

- SP-4-NODE-22 (Node 22 LTS migration)
- 4-03 (Observabilidad Pino + bull-board + Sentry — versión reducida sin llm_usage_logs)
- 4-06 (Rate limits + CSP headers + CSRF)
- 4-07 (Documentación final cliente: este archivo)
- 4-08 (Rate limit wrapper withRateLimit Server Actions)
- SP-4-NEW-11 (Rename Historial→Leads)
- SP-4-NEW-13 (Endpoints /api/health + /api/version)
- SP-4-WCAG-08/09/10 (sub-tareas accesibilidad)
- NEW-09 (Campañas Excel — scope MVP)
- NEW-10 (Festivos manuales)
- NEW-12 (Settings buscador integraciones — parcial, 1 de 4 mejoras)
- **SP-4-AWS-REMOVAL** (eliminación AWS Bedrock del stack)
- **SP-4-SIDEBAR-UX** (Dashboard item + Lista de Leads)
- **SP-4-BUG-3-01..13** (13 BUGs detectados + resueltos en testing profundo 26-05-2026)
- **SP-4-TS-STANDARDS** (documentación + activación regla `no-explicit-any`)
- **SP-4-LINT-ZERO** (cerrada 28-05-2026 — lint baseline 104 → 0)
- **SP-4-DEPRECATIONS-DEPLOY** (Next 16 middleware→proxy + Sentry 10 + turbopack.root + /api/version)
- **SP-4-AUTH-RATELIMIT** (auth rate-limit login + reset password)
- **SP-4-SEC-PROACTIVE** (security agent endurecido al stack AF + CLOSE-1.5 obligatorio)
- **SP-4-RLM-TIMEOUT** (rate-limiter timeout 100ms BUG-RLM-01)
- **SP-4-CLOSE-1 + SP-4-CLOSE-1.5 + SP-4-CLOSE-2** (cierre formal 29-05-2026, todos 🟢)

## Tareas diferidas

- **4-01 + 4-02 + 4-09 (E2E Playwright full + Coverage 80%)** → SP-4B Validación Pre-MVP (Renzo). El Sprint 3 cubre los specs críticos (health/version, security headers, WCAG accessibility); Renzo amplía cobertura en su sprint dedicado.
- **4-05 refactor masivo WCAG 2.2 AA admin panel (24 findings DA-5)** → diferido a post-MVP. Las 3 sub-tareas críticas (WCAG-08/09/10) sí están en este RC. El resto del refactor no bloquea MVP — WCAG AA contraste y role/aria-label en charts siguen OK desde Sprint 2B.
- **NEW-12 mejoras 3+4** (confirmación robusta destructiva + edición slide-over) → Sprint Refinamiento post-MVP por scope arquitectónico.
- **NEW-09 cola configurable cadencia UI completa** → post-MVP; el schema y la tabla `campaigns.config JSONB` ya existen, solo falta la UI para configurar.
- **CHANGELOG.md backfill Sprint 1/2/2B** → se hace al subir staging.
- ~~**SP-4-LINT-ZERO**~~ ✅ **CERRADA** 28-05-2026 — baseline 104 problems → 0, 9 lotes commiteados.
- **Compactación tablas RoadMap.md** → tarea diferida nocturna documentada, ejecutar en este PR antes del merge (script `scripts/compact-roadmap-tables.py`).
- **Bloque 3.B UI completa (NEW-09/10/11/12 partes UI)** → backlog post-MVP (decisión Javi HP 29-05-2026 al cierre Sprint 3). Críticos backend ya 🟢. Sprint Refinamiento post-Costes-LLM las absorberá si no se priorizan antes. Incluye: UI dropzone Excel + filtros multi-variable + cola configurable (NEW-09 partes UI), UI calendar holidays settings (NEW-10), consolidación adicional Historial→Leads (NEW-11 partes UI), confirmación robusta destructiva + slide-over Settings (NEW-12 mejoras 3+4).
- ~~**BUG-SEC-01 + BUG-SEC-02** → pre-deploy VPS~~ → **🟢 FIXED 29-05-2026 tarde** (orden Javi HP) en commits `bcd36a9` + `c018c11` + `ecdbe9a` antes del merge a `developer`. Ya no son pre-deploy VPS.
- ~~**BUG-SEC-03 + BUG-SEC-04** → backlog post-MVP~~ → **🟢 FIXED 29-05-2026 tarde** en los mismos commits. Ya no son backlog post-MVP.

## Pendientes operativos (acción manual, no bloquean RC)

1. Crear proyecto Sentry en sentry.io + pegar `SENTRY_DSN` en `.env.local` y panel Dokploy.
2. Configurar Dokploy build args (`GIT_COMMIT_SHA`, `GIT_BRANCH`, `BUILD_TIMESTAMP`) en `panel.linkstation.ai`.
3. Habilitar Renovate bot en GitHub repo settings.
4. Aplicar migración `20260526100000_campaigns_and_holidays.sql` al VPS via pg-meta REST.
5. **Rotación PAT GitHub en Dokploy** (incidente 27-05-2026): revocar PAT viejo en GitHub Settings + actualizar Provider URL en panel Dokploy del servicio `dev.dash` con PAT nuevo. Recomendado: migrar a Provider "GitHub OAuth" para eliminar PATs del panel para siempre.
6. **Verificar `SUPABASE_SERVICE_ROLE_KEY` en panel Dokploy** está en tab **Environment** (no Build Args). Tras refactor lazy de SP-4-DEPRECATIONS-DEPLOY el key NO se inyecta en build — debe estar como env runtime para que `getAuthServiceRoleKey()` lo encuentre.

## BUGs de seguridad detectados en CLOSE-1.5 — TODOS FIXED en esta RC (29-05-2026 tarde)

Los 4 hallazgos del security delta inicial (28-05) se cerraron antes del merge a `developer` por orden de Javi HP. Detalle en commit `bcd36a9` + helpers `src/lib/security/{pii-mask,webhook-hmac}.ts` + 29 specs nuevos (pii-mask 19 + webhook-hmac 10).

- **BUG-SEC-01** 🟢 FIXED (🟠 ALTO, A07:2021) — IP Spoofing en rate-limit auth. Fix en `src/lib/rate-limiter.ts`: `extractClientIp()` ahora prioriza `X-Real-IP` sobre `X-Forwarded-For` (traefik inyecta X-Real-IP desde la conexión TCP, no propagable por el cliente). Tests refactor en `tests/unit/rate-limiter.test.ts` incl. spec anti-spoofing.
- **BUG-SEC-02** 🟢 FIXED (🟠 ALTO, A01:2021) — Webhook workflow sin autenticación. Fix en `src/app/api/webhooks/workflow/[workflowId]/[path]/[nodeId]/route.ts`: verificación HMAC-SHA256 (header `X-Webhook-Signature`, formato `sha256=<hex>`, `timingSafeEqual`) cuando el nodo `webhookTrigger` define `data.config.webhook_secret`. Nueva env `WEBHOOK_WORKFLOW_REQUIRE_SECRET` (default `false` compat backward; en VPS público a `true` rechaza nodos sin secret con 401). Respuesta ya NO incluye `lead_id` (cierra INFO-02). Helper compartido en `src/lib/security/webhook-hmac.ts`.
- **BUG-SEC-03** 🟢 FIXED (🟡 MEDIO, A09:2021) — Email en claro en logs `auth.ts`. Fix con helpers `maskEmail()`/`maskPhone()` en `src/lib/security/pii-mask.ts` (`jua***@dominio.com`). Los 3 `console.log` del login flow migrados. Cumple OWASP A09:2021 y minimiza obligaciones GDPR.
- **BUG-SEC-04** 🟢 FIXED (🟡 MEDIO, A05:2021) — Fail-open silencioso en `whatsapp.ts` pause check. Fix doble: (1) `process.env.SUPABASE_URL!` → `requireEnvAny(["SUPABASE_URL","NEXT_PUBLIC_SUPABASE_URL"])`; (2) cambio crítico a **fail-CLOSED** en el catch del pause-check: si la query falla, NO se envía mensaje (retorna `PAUSE_CHECK_FAILED`). Pre-fix, el catch silenciaba el error y enviaba el mensaje saltándose el control de opt-out del lead.

Verificación CLOSE-4 post-fixes: `typecheck 0` + `lint 0` + `npm test` 306/310 (+26 specs nuevos, 4 skip intencionales) + `build` OK + `playwright` 61/61 (zero regresiones).

Reporte completo: `plans/reports/security-delta-sprint-3-20260528.md` (sección "Update 29-05-2026").

## Vulnerabilidades en deps transitivas — planificadas para Sprint Refinamiento (v0.5.2)

El check CI "Security Audit" (`.github/workflows/security.yml`) detecta **25 vulnerabilidades npm audit (14 moderate + 11 high)** en deps transitivas de `langchain`, `bullmq`, `exceljs` que dependen de versiones vulnerables de `uuid`. Diagnóstico:

- **Pre-existentes en `developer`** desde antes de Sprint 3 — no introducidas por esta RC.
- Comunes a múltiples sprints recientes (Sprint 4 SPIKE Sheets, hotfix turbopack, etc.) — ver fallos en runs `gh run list --workflow "Security Audit" --branch developer`.
- Todas son CVE en `uuid` propagadas vía deps transitivas, no en el código del proyecto.
- El check falla pero **no bloquea merge** (status `UNSTABLE`, no `BLOCKED`).

**Planificación**: tarea **SP-7-DEPS-AUDIT-26** añadida al **Sprint Refinamiento Herramientas Internas** (v0.5.2, post-Costes-LLM). Estim 4-6h. Cubre análisis con `npm audit fix --dry-run`, upgrade coordinado langchain/bullmq/exceljs + verificación tests/E2E completos + ADR actualizando ADR-018.

ADR-018 (`docs/adr/ADR-018-hardening-deps-deferred-post-mvp.md`) actualizado con sección nueva referenciando estas 25 vulns y la tarea SP-7-DEPS-AUDIT-26.

## Commits del Sprint 3

(ver `git log a67977f^..HEAD --oneline` en rama `feature/sprint-03-hardening`)

## Próximos pasos

- **SP-4B** (Renzo + equipo, ~40-55h): re-test automático + E2C local + E2E VPS + manual humano absorbido de CLOSE-3 de los Sprints 0/1/2/2B/3. Bump SemVer a `v0.3.0` GA.
- Tras SP-4B: promoción a `staging` con orden explícita del usuario.

## Contribuidores

- Javi HP (orquestador + dev)
