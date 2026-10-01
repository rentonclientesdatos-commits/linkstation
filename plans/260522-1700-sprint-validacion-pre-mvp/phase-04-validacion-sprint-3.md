# Fase 04 — Validación Sprint 3 (Hardening — release candidate v0.3.0-rc.1)

> **Auto-fill completado 29-05-2026** en SP-4-CLOSE-1/1.5/2 por `roadmap-keeper`. Specs exactas, BUG-SEC detectados, vars VPS y notas deploy actualizados desde los resultados reales del cierre.

## Context Links

- [plan.md](plan.md) — overview Sprint Validación Pre-MVP
- [Sprint 3 plan](../260520-1342-sprint-3-hardening/plan.md)
- [Sprint 3 phase-01 E2E](../260520-1342-sprint-3-hardening/phase-01-e2e-tests-playwright.md)
- [Sprint 3 phase-02 Observabilidad](../260520-1342-sprint-3-hardening/phase-02-observabilidad-logging-metricas.md)
- [Sprint 3 phase-03 Node 22 LTS](../260520-1342-sprint-3-hardening/phase-03-migracion-node-22-lts.md)
- [Sprint 3 phase-04 WCAG](../260520-1342-sprint-3-hardening/phase-04-wcag-22-aa.md)
- [Sprint 3 phase-05 Headers + Rate limits](../260520-1342-sprint-3-hardening/phase-05-hardening-headers-rate-limits.md)
- [Sprint 3 phase-08 Features Bloque 3.B NEW-09..12](../260520-1342-sprint-3-hardening/phase-08-features-bloque-3b.md)
- [Security delta report](../reports/security-delta-sprint-3-20260528.md)
- [RoadMap Sprint 3](../RoadMap.md)

## Overview

- **Sprint validado**: Sprint 3 — Hardening (SP-4, **v0.3.0-rc.1** release candidate).
- **Branch origen**: `feature/sprint-03-hardening` (mergeado a `developer` al cierre Sprint 3).
- **Estado**: 📝 **Auto-fill completado 29-05-2026** en SP-4-CLOSE-1/1.5/2.
- **Tester**: Renzo + equipo Renzo.
- **Importancia especial**: esta fase cierra el camino al MVP GA (v0.3.0). El cierre de SP-4B (phase-05) detona el bump v0.3.0-rc.1 → v0.3.0.

## Resumen del Sprint 3 a validar

Sprint 3 Hardening entregó (real, no estimado):

1. **E2E Playwright Sprint 3** — 3 specs de cierre: `health-version`, `security-headers`, `wcag-accessibility`. Suite completa 59/61 (1 flaky BUG-3-06 conocido en concurrencia 2 workers, 1 didn't-run colateral). Golden flows completos MVP DIFERIDOS a SP-4B.
2. **Observabilidad** — Pino 10.3.1 + bull-board admin UI + Sentry v10.53.1. `llm_usage_logs` DIFERIDO a Sprint Costes-LLM.
3. **Node 22 LTS** — `.nvmrc`, Dockerfile 3 stages, `engines: node ^22`, lint-staged 17 desbloqueado.
4. **WCAG 2.2 AA** — BUG-2B-08/09/10 resueltos (aria-label, heading hierarchy, skip-link). Refactor masivo 24 findings DA-5 DIFERIDO post-MVP.
5. **Security headers + Rate limits** — CSP completo, HSTS preload, X-Frame DENY, rate-limiter sliding-window Redis, `withRateLimit` HOF, auth rate-limit login/reset.
6. **Bloque 3.B backend** — NEW-09 backend (campaigns tabla + Zod + Server Action + RLS), NEW-10 backend (tenant_holidays + helpers). UI partes DIFERIDAS backlog post-MVP (decisión Javi HP 29-05-2026).
7. **Otros** — Lint 0 problems, AWS Bedrock removal, Sidebar UX, BUG-3-01..13, TS no-any standards, deprecations Next 16/Sentry 10, lazy SERVICE_ROLE_KEY, /api/health + /api/version, SP-4-INCIDENT-PAT-LEAK doc.
8. **BUG-SEC detectados en CLOSE-1.5** — 2 altos (resolver pre-deploy VPS) + 2 medios (backlog). Ver sección 6b.

Total Sprint 3: ~21h reales vs 112-144h estimadas.

## 1. Test automático (código)

### 1.1 Node 22 LTS migration

```bash
node --version   # debe devolver v22.x.x (no v20.x)
nvm use          # selecciona automáticamente versión .nvmrc (22.22.3)
npm ci           # 0 warnings EBADENGINE
```

### 1.2 Build + tests

```bash
npm run typecheck                 # exit 0 — 0 errores
npm run lint                      # 0 errors, 0 warnings (lint baseline = 0 desde SP-4-LINT-ZERO)
npm run build                     # exit 0 — 42 rutas estáticas
npm run test                      # 236/240 pass (4 skipped intencionalmente — integración VPS)
npm run test -- --coverage        # coverage report — meta: lines >= 80%
```

**Resultados reales CLOSE-1 (29-05-2026):**

- typecheck: 🟢 0 errores
- lint: 🟢 0 problems (post SP-4-LINT-ZERO — baseline histórico 114 → 0)
- build: 🟢 42 rutas compiladas
- Vitest: 🟢 236/240 (4 skipped intencionalmente — tests de integración VPS que requieren credenciales reales)

## 2. Test E2C local (Playwright contra `localhost:8500`)

### 2.1 Specs Sprint 3 (cierre)

Specs creados en Sprint 3 que Renzo debe ejecutar en local y en VPS:

```bash
npm run dev   # http://localhost:8500

# Specs Sprint 3 close (los 3 nuevos de este sprint)
npx playwright test tests/e2e/sprint-3-close/health-version.spec.ts
npx playwright test tests/e2e/sprint-3-close/security-headers.spec.ts
npx playwright test tests/e2e/sprint-3-close/wcag-accessibility.spec.ts

# Suite completa (todos los sprints)
npx playwright test
```

**Specs exactos añadidos en Sprint 3:**

| Archivo                                               | Descripción                                                                | Tests    |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| `tests/e2e/sprint-3-close/health-version.spec.ts`     | `/api/health` 200 + `/api/version` campos version/commit/branch/deployedAt | ~4 specs |
| `tests/e2e/sprint-3-close/security-headers.spec.ts`   | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy presentes  | ~5 specs |
| `tests/e2e/sprint-3-close/wcag-accessibility.spec.ts` | Skip-link, aria-labels, heading hierarchy en rutas MVP                     | ~5 specs |

**Helper reusable:**

- `tests/e2e/utils/vps-version.ts` — `expectVpsServingCommit()` y `expectVpsHealthy()` para verificar deploy VPS post-merge.

**Resultados reales CLOSE-2 (29-05-2026):**

- Sprint-3-close specs: 🟢 14/14 verdes
- Suite completa: 59/61 (1 flaky BUG-3-06 en sprint-2-close VPS-04 — race concurrencia 2 workers, re-pasa ejecutado individualmente; 1 didn't-run colateral del flaky)

### 2.2 Golden flows MVP (DIFERIDOS a SP-4B — ejecutar aquí)

Estos specs NO existen todavía en el repo (diferidos de 4-01 y 4-09). Renzo debe crearlos o ejecutar manualmente:

- Login → dashboard → leads CRUD
- Widget embed → iframe → lead creado + dominio no whitelistado
- Conversación WhatsApp → inbox → bot pausado/reanudado
- Agendamiento → calendario → festivos NEW-10
- CRM integration → HubSpot/Zoho connect + sync

### 2.3 WCAG axe-core

```bash
npx playwright test tests/e2e/a11y/   # si existe directorio a11y
```

Esperado: 0 violations critical. Los 3 bugs WCAG (BUG-2B-08/09/10) están resueltos en Sprint 3.

## 3. Test E2E VPS (Playwright contra `dev.linkstation.ai`)

```bash
PLAYWRIGHT_BASE_URL=https://dev.linkstation.ai npx playwright test
```

### 3.1 Headers de seguridad (phase-05 Sprint 3)

Validar con `curl -I https://dev.linkstation.ai`:

- [ ] `Content-Security-Policy` presente (CSP completo con LLM/Supabase/Sentry/CRM whitelisted)
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [ ] `X-Frame-Options: DENY`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` configurado

### 3.2 Rate limits

- [ ] `POST /api/auth/login` — 6 requests en 1 min → 6º devuelve 429 "Demasiados intentos"
- [ ] `POST /api/auth/login` — buckets IP distintas NO se cruzan
- [ ] `POST /api/auth/reset-password` — 4 requests en 1 min → 4º devuelve 429
- [ ] Servidor `/api/*` normales sin afectar (no rate-limited en 100 req/min normales)

### 3.3 Endpoints /api/health + /api/version (SP-4-NEW-13)

```bash
curl https://dev.linkstation.ai/api/health
# {"status":"ok","timestamp":"..."}

curl https://dev.linkstation.ai/api/version
# {"version":"v0.3.0-rc.1","commit":"<sha>","branch":"feature/sprint-03-hardening","deployedAt":"...","nodeVersion":"v22.x.x"}
```

- [ ] `/api/health` devuelve 200 con `status: "ok"`
- [ ] `/api/version` devuelve `version: "v0.3.0-rc.1"` (o mayor si ya bumpeado)
- [ ] `nodeVersion` empieza con `v22.` (no `v20.`)
- [ ] `commit` no es `"unknown"` — confirma que Dokploy inyecta build args

### 3.4 Observabilidad

- [ ] Logs Pino estructurados visibles en Dokploy con `tenant_id`, `request_id`, `severity`
- [ ] bull-board UI accesible en `/api/admin/queues` (solo admin, basic auth `BULL_BOARD_USERNAME/PASSWORD`)
- [ ] Sentry recibe eventos: forzar error 500 → ver event en Sentry dashboard

## 4. Test manual del tester (humano)

> Más extenso: cubre EXPERIENCIA COMPLETA MVP + features backend Sprint 3 + WCAG.

### Bloque A — Flujo completo MVP (1h)

- [ ] Landing → onboarding → crear tenant → conectar CRM → crear lead manual → simulator → ver dashboard → conversación whatsapp → agendamiento → leer audit log

### Bloque B — Features Sprint 3 visibles (1h)

- [ ] **NEW-09 backend**: verificar que la Server Action `importCampaignFromExcel` existe y funciona (puede probarse desde consola o test de integración si no hay UI)
- [ ] **NEW-10 backend**: verificar que `getHolidays/addHoliday/removeHoliday` funcionan y `isBusinessDay()` respeta festivos añadidos
- [ ] **NEW-11**: verificar UI dice "Leads" (no "Historial") en: sidebar submenu, page h1, breadcrumb tabla leads
- [ ] **NEW-12 buscador**: buscador integraciones filtra por keyword; "Probar conexión" muestra ✅/❌ (YA EXISTÍA desde Sprint 2 — validar no-regresión)
- [ ] **Sidebar Dashboard**: primer item del menú apunta correctamente a `/dashboard`
- [ ] **WCAG skip-link**: Tab en cualquier ruta → aparece "Saltar al contenido principal" visible al recibir foco

### Bloque C — WCAG manual (30 min)

- [ ] Recorrido por teclado (Tab + Shift+Tab + Enter + Space + Esc) en `/dashboard`
- [ ] aria-labels en botones "Personalizar" de SummaryManager y ChartManager
- [ ] Heading hierarchy: una sola h1 por página, no saltos h1→h3
- [ ] Contraste con axe DevTools en componentes críticos (DA-5-010)

### Bloque D — Performance + observabilidad (30 min)

- [ ] Lighthouse en `/dashboard`: Performance ≥ 70, A11y ≥ 90, Best Practices ≥ 90
- [ ] Sentry dashboard tiene evento reciente del VPS
- [ ] bull-board: cola activa con jobs visibles

## 5. Hotfixes encontrados durante la validación

| BUG-ID   | Severidad | Descripción                                    | Fix aplicado | Commit | Estado |
| -------- | --------- | ---------------------------------------------- | ------------ | ------ | ------ |
| BUG-3-XX | —         | — (rellenar durante SP-4B ejecución por Renzo) | —            | —      | 🔘     |

## 6. Bug regression baseline Sprint 3

Bugs cerrados durante Sprint 3 — verificar no-regresión en VPS:

| BUG-ID      | Descripción                                      | Fix commit                                  | Verificación VPS                   |
| ----------- | ------------------------------------------------ | ------------------------------------------- | ---------------------------------- |
| BUG-3-01    | `demo@af.local` hardcoded en tests → usa env var | Sprint 3 commits                            | N/A (solo test local)              |
| BUG-3-02    | CSP `bedrock.*.amazonaws.com` inválida           | Sprint 3 commits                            | `curl -I` CSP header sin bedrock   |
| BUG-3-03/04 | `attemptLogin` race + cascada logout             | Sprint 3 commits                            | Login fluido sin errores race      |
| BUG-3-05    | Saturación Supabase Auth con 8 workers           | `playwright.config.ts workers: 2`           | N/A (config local)                 |
| BUG-3-06    | Race sprint-2-close concurrencia                 | Helper `loginAsAdmin` unificado             | Playwright suite VPS < 2 failures  |
| BUG-3-07    | Sidebar md:flex ahoga layout 768px               | Breakpoint `lg:` global                     | Sidebar responsive en 1024px       |
| BUG-3-09    | KPI cards truncadas en 768px                     | COL_SPAN_MAP recalibrado                    | Cards visibles sin truncado        |
| BUG-3-10    | Columna ORIGEN truncada tabla historial          | `min-w-max` + sin `overflow-hidden`         | Columna ORIGEN visible en 1440px   |
| BUG-3-12    | Scroll superior tabla no coincide                | `style={{ width: scrollWidth }}`            | Scroll H alineado                  |
| BUG-3-13    | Badge "1 Issue" Next Dev Tools                   | `unsafe-eval` solo en dev                   | 0 badge en prod                    |
| BUG-2B-08   | Botones "Personalizar" sin aria-label            | aria-label + title añadidos                 | Axe 0 violations en SummaryManager |
| BUG-2B-09   | h1 secundarios → bajar a h2                      | h1→h2 en ChartManager+SummaryManager        | 1 único h1 por página              |
| BUG-2B-10   | Skip-link faltante                               | `SkipLink.tsx` + `<main id="main-content">` | Tab → skip-link visible            |

### 6b. BUG-SEC detectados en CLOSE-1.5 (29-05-2026) — requieren atención

> Detectados por el security agent delta (`developer..HEAD`, 35 archivos). Reporte completo: `plans/reports/security-delta-sprint-3-20260528.md`.

| BUG-ID     | Severidad        | Descripción                                                                                                                  | Acción requerida                                                                                                 |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| BUG-SEC-01 | ALTO (A07:2021)  | IP Spoofing rate-limit — `extractClientIp()` prioriza X-Forwarded-For sin validar X-Real-IP                                  | **Resolver ANTES del primer deploy VPS con tráfico real.** Fix: priorizar X-Real-IP en `src/lib/rate-limiter.ts` |
| BUG-SEC-02 | ALTO (A01:2021)  | Webhook workflow sin auth — `src/app/api/webhooks/workflow/[workflowId]/[path]/[nodeId]/route.ts` endpoint público sin firma | **Resolver ANTES del primer deploy VPS con tráfico real.** Fix: HMAC signature como webhooks Retell/CRM          |
| BUG-SEC-03 | MEDIO (A09:2021) | Email en claro en logs — `src/lib/actions/auth.ts` líneas 65/86/105                                                          | Backlog post-MVP. Fix: hash sha256-8b                                                                            |
| BUG-SEC-04 | MEDIO (A04:2021) | Fail-open WhatsApp pause check — `src/lib/integrations/whatsapp.ts:87` try-catch silencia error                              | Backlog post-MVP. Fix: fail-closed                                                                               |

**Acción para Renzo en VPS**: verificar en prod que BUG-SEC-01 y BUG-SEC-02 están resueltos ANTES de abrir tráfico real de clientes. Si no están resueltos antes del hand-off → escalar a Javi HP.

## 7. Env vars NUEVAS que necesita el VPS

Confirmar que todas estén configuradas en el panel Dokploy tab **Environment** (NO Build Args, excepto las de build):

| Var                    | Propósito                                         | Dónde obtener                             | Tab Dokploy |
| ---------------------- | ------------------------------------------------- | ----------------------------------------- | ----------- |
| `SENTRY_DSN`           | Sentry SDK init error tracking                    | Sentry project → Settings → Client Keys   | Environment |
| `SENTRY_ORG`           | source-maps upload (opcional)                     | Sentry org slug                           | Environment |
| `SENTRY_PROJECT`       | source-maps upload (opcional)                     | Sentry project slug                       | Environment |
| `PINO_LOG_LEVEL`       | Logging level (debug/info/warn/error)             | Default: `info`                           | Environment |
| `BULL_BOARD_USERNAME`  | Basic auth bull-board admin UI                    | Generado por Javi HP                      | Environment |
| `BULL_BOARD_PASSWORD`  | idem                                              | Generado por Javi HP                      | Environment |
| `RATE_LIMIT_REDIS_URL` | Redis para rate limiter distribuido               | Reusa `REDIS_URL` o instancia dedicada    | Environment |
| `GIT_COMMIT_SHA`       | Commit SHA para `/api/version`                    | **Build Arg** en Dokploy (no Environment) | Build Args  |
| `GIT_BRANCH`           | Branch para `/api/version`                        | **Build Arg** en Dokploy                  | Build Args  |
| `BUILD_TIMESTAMP`      | Timestamp deploy para `/api/version`              | **Build Arg** en Dokploy                  | Build Args  |
| `CSP_REPORT_URI`       | Endpoint donde reportar violations CSP (opcional) | Sentry recibe report-uri                  | Environment |

> **NOTA CRÍTICA**: `SUPABASE_SERVICE_ROLE_KEY` debe estar en tab **Environment** (NO Build Args). Desde Sprint 3 SP-4-DEPRECATIONS-DEPLOY el `Dockerfile` ya NO lo acepta como ARG — si estaba en Build Args en Dokploy, moverlo a Environment o se perderá en runtime.

> **PAT GitHub**: el PAT que estaba expuesto en panel Dokploy (incidente 27-05-2026, doc en `plans/260527-2056-e2ctotal-local-run/INCIDENT-260527-pat-leak-y-sheets-paralelo.md`) debe haber sido rotado por Javi HP antes del hand-off. Si no está rotado → escalar antes de desplegar.

## 8. Notas de despliegue (Dokploy)

1. **Dockerfile cambia a `node:22-alpine`** (3 stages). Dokploy debe hacer **Clean Cache OBLIGATORIO** en el próximo deploy para que Node 22 se instale correctamente (native deps precompilados para Node 20 son incompatibles).
2. **Migración SQL campaigns + holidays**: `supabase/migrations/20260526100000_campaigns_and_holidays.sql` — aplicar al VPS vía pg-meta REST (`POST https://dev.linkstation.ai/supabase/pg/query`) antes del primer acceso a esas tablas.
3. **Build Args en Dokploy**: añadir `GIT_COMMIT_SHA`, `GIT_BRANCH`, `BUILD_TIMESTAMP` como Build Args para que `/api/version` devuelva valores reales (no `"unknown"`).
4. **SUPABASE_SERVICE_ROLE_KEY**: verificar que está en tab Environment (no Build Args) — cambio de Sprint 3 SP-4-DEPRECATIONS-DEPLOY.
5. **Sentry setup**: si no está configurado, crear proyecto en Sentry.io, obtener DSN, añadir `SENTRY_DSN` en Environment. Sin DSN Sentry funciona silenciosamente (no lanza errores).
6. **bull-board access**: protegido con basic auth. Añadir `BULL_BOARD_USERNAME` + `BULL_BOARD_PASSWORD` antes de acceder a `/api/admin/queues`.
7. **Rate limiter Redis**: depende de `RATE_LIMIT_REDIS_URL` o `REDIS_URL`. Sin Redis la app funciona (fail-open) pero sin rate limiting activo en prod.
8. **Restart Next.js en Dokploy** tras añadir/cambiar env vars (las vars de runtime las lee al arrancar el proceso).
9. **PAT GitHub**: verificar que el PAT rotado está correctamente configurado en Dokploy (incidente 27-05-2026).
10. **middleware.ts renombrado a proxy.ts**: si hay conflicto de rutas en Dokploy/traefik, verificar que Next 16 detecta correctamente `src/proxy.ts` como middleware proxy.

## 9. Status final SP-4B phase-04

| Bloque                           | Estado al arrancar SP-4B                                                    |
| -------------------------------- | --------------------------------------------------------------------------- |
| 1. Test automático               | 🟢 CLOSE-1 verde: typecheck 0 + lint 0 + build 42 rutas + 236/240 Vitest    |
| 2. Test E2C local Sprint-3-close | 🟢 CLOSE-2 verde: 14/14 specs                                               |
| 3. Test E2E VPS                  | 🔘 Pendiente Renzo — ejecutar specs contra `dev.linkstation.ai`    |
| 4. Test manual                   | 🔘 Pendiente Renzo — checklist Bloques A-D                                  |
| 5. Hotfixes validación           | 🔘 Plantilla — rellenar durante SP-4B                                       |
| 6. Bugs regression               | 🟢 Baseline documentado (12 bugs Sprint 3 + 4 BUG-SEC)                      |
| 7. Env vars                      | 📝 Lista completa documentada — verificar en Dokploy                        |
| 8. Notas deploy                  | 📝 Completadas — Clean Cache + SQL migrations + Build Args                  |
| 9. BUG-SEC-01/02                 | 🔴 **CRÍTICO pre-deploy tráfico real** — resolver antes de abrir a clientes |

## 10. Hand-off a phase-05 (Cierre SP-4B → MVP GA v0.3.0)

Tras completar phases 01 + 02 + 03a + 03b + 04 con TODO verde y BUG-SEC-01/02 resueltos, Renzo ejecuta **[phase-05-cierre-sprint.md](phase-05-cierre-sprint.md)** que detona el bump v0.3.0-rc.1 → v0.3.0 GA (MVP completo).
