# linkstation — Plan E2E Full Reutilizable

> Plan maestro de testing E2E exhaustivo y reusable. Diseñado para vivir indefinidamente — versionar en cabecera, no clonar.

## Cabecera

- **Versión plan**: 1.2 (2026-05-27 — split de comandos: `/e2ctotal` para local, `/e2etotal` para VPS/staging/prod. Regla del proyecto: llamar cada cosa por su nombre. Plan v1.1 añadió la sección "Acceso a credenciales en sandbox Claude Code" tras run abortado por bloqueo Read de `.env.local`).
- **Última ejecución**: ver [`e2e-runs-history.md`](./e2e-runs-history.md)
- **Activación**:
  - **`/e2ctotal`** — Ejecuta E2C (E2E **C**lient-side / local) contra `localhost:8500`. Ver [`.claude/commands/e2ctotal.md`](../.claude/commands/e2ctotal.md). Recomendado para cada PR + antes del test manual humano + cierre Sprint CLOSE-2.
  - **`/e2etotal`** — Ejecuta E2E real contra VPS/staging/prod. Ver [`.claude/commands/e2etotal.md`](../.claude/commands/e2etotal.md). Para cierre Sprint CLOSE-5 paso 7 + SP-4B Validación.
  - Lenguaje natural: "ejecuta E2C local", "ejecuta E2E VPS", "haz testing exhaustivo de la app", "audit completo CRUD".
- **Entornos target**:

  | Env       | Comando recomendado                   | URL                                   | Notas                                                                                   |
  | --------- | ------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
  | `local`   | `/e2ctotal`                           | `http://localhost:8500`               | Requiere `npm run dev` + Supabase local (`npm run db:up`) + Redis (`npm run redis:up`). |
  | `vps`     | `/e2etotal`                           | `https://dev.linkstation.ai` | Requiere deploy Dokploy verde + variables Sentry/Sepay/etc. en panel.                   |
  | `staging` | `/e2etotal --env staging`             | TBD                                   | Solo cuando exista rama `staging` promovida.                                            |
  | `prod`    | `/e2etotal --env prod --vps-readonly` | TBD                                   | NO ejecutar destructivos. Read-only + smoke obligatorio (`--vps-readonly`).             |

- **Cuentas test**:
  - **Admin**: `LinkStation@gmail.com` — password en `.env.local` (`NEW_ADMIN_PASSWORD`). VPS creds en `infra/supabase-vps/.vault/` (gitignored).
  - **Tenant user (non-admin)**: derivar con `scripts/create-demo-user.ts` o usar `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` de `.env.local`.
  - Para refresh creds: `npx tsx scripts/show-demo-credentials.ts`.
- **Stack browser**: Playwright (ya instalado, `playwright.config.ts`, chromium only en MVP; firefox/webkit en Sprint 3+).
- **Test runner E2E existente**: `tests/e2e/` (core + sprint-N-close). El comando `/e2etotal` añade specs **NO destructivos** en `tests/e2e/total/` y aprovecha specs ya existentes.

### Acceso a credenciales en sandbox Claude Code (CRÍTICO)

Claude Code corre en sandbox que **bloquea por defecto la lectura de `.env.local`** y otros archivos sensibles. Por eso el operador (Claude) NO puede leer el `NEW_ADMIN_PASSWORD` directamente del disco. Esto es feature, no bug — los secretos no deben filtrarse al contexto del modelo sin consentimiento explícito.

**Tres vías válidas para que `/e2etotal` obtenga las creds (ordenadas de más a menos recomendada):**

1. **Variable de entorno del shell (recomendada)** — antes de abrir Claude Code, exportar en PowerShell:

   ```powershell
   $env:NEW_ADMIN_PASSWORD = "<password real>"
   $env:DEMO_USER_PASSWORD = "<password tenant user>"
   claude
   ```

   Claude lee con `$env:NEW_ADMIN_PASSWORD` desde Bash tool (no toca `.env.local`). El secreto vive en la sesión de shell, no en el contexto del modelo persistente.

2. **Permission allow puntual** — el usuario aprueba un Read de `.env.local` cuando aparezca el prompt. Cred queda en contexto del modelo durante el run. Aceptable para sesiones cortas, no para auto-ejecución.
3. **Paste in-chat** — usuario pega el password en un mensaje. Cred queda en contexto del modelo + transcript. Solo si las otras vías fallan.

**Pre-check 6 del run** debe detectar cuál vía está disponible y abortar pronto si ninguna lo está (mejor que parar en Fase 01).

**Fallback si nada disponible:** el operador propone ejecución parcial — solo fases que NO requieren login (`00 pre-checks`, `05 webhooks HMAC`, `06 widget público`, partes de `07 observability anon`).

## Propósito + Objetivo final

Test de regresión completo, mantenible y reusable que verifica con profundidad TODAS las funcionalidades de linkstation (auth, RBAC, CRUD multi-tenant, integraciones CRM, webhooks, RLS) en un único pase orquestado. Aprende cada run (histórico) y permite detectar regresiones recurrentes.

No reemplaza specs Playwright por sprint (cierre formal). Complementa con barrido transversal periódico (semanal manual o mensual CI).

## Stack del proyecto (inventario auto-derivado)

> Snapshot 26-05-2026. Refrescar con `bash scripts/e2etotal-inventory.sh` (a generar en run-time si falta).

### Páginas dashboard (28 rutas detectadas)

```
/                              landing pública
/login                         auth
/auth/reset-password           recovery
/dashboard                     overview (KPIs)
/dashboard/admin               admin only (gestión tenants)
/dashboard/agents              ai_agents CRUD
/dashboard/calendar            appointments
/dashboard/calls               call history
/dashboard/campanas            campaigns list
/dashboard/campanas/nuevo      campaign create
/dashboard/conversaciones      whatsapp inbox
/dashboard/costs               LLM costs viewer
/dashboard/demo                demo sandbox
/dashboard/docs                user docs viewer
/dashboard/docs-admin          admin docs editor
/dashboard/docs-clientes       client-facing docs
/dashboard/historial           history
/dashboard/knowledge           knowledge_base CRUD
/dashboard/logs                system_logs viewer
/dashboard/minutos             minutes consumption
/dashboard/onboarding          tenant onboarding
/dashboard/orchestrator        workflow builder
/dashboard/playground          AI playground
/dashboard/settings            tenant settings + integrations
/dashboard/simulator           call simulator
/dashboard/voice-agents        voice_agents CRUD
/dashboard/web-chatbot         widget config
/dashboard/whatsapp            WhatsApp config
/widget/[id]                   embed pública (read-only)
```

### Endpoints API (30+ rutas detectadas)

- **Auth**: `/api/auth/*` (Supabase SSR + reset)
- **Integrations**: `/api/integrations`, `/api/integrations/[provider]/auth/{start,callback}`, `/api/integrations/manage/[id]/{audit,disconnect,healthcheck,write-policy}`, `/api/integrations/google/{auth,callback}`
- **Leads / CRM**: `/api/leads/ingest`, `/api/webhooks/crm`
- **Voice / Calls**: `/api/calls/manual`, `/api/webhooks/retell`, `/api/webhooks/retell/tools`
- **WhatsApp**: `/api/webhooks/whatsapp`
- **Widget**: `/api/widget/embed.js`
- **Orchestration**: `/api/orchestration/{deploy,graph,publish,sweep,workflows}`
- **Webhooks workflow**: `/api/webhooks/workflow/[workflowId]/[path]/[nodeId]`
- **Admin**: `/api/admin/tenants/[id]/client-sql`, `/api/admin/queues/[[...slug]]`
- **Cron**: `/api/cron/appointments/reminders` (requiere `CRON_SECRET`)
- **Help / Docs**: `/api/docs/content`, `/api/help-sections/[scope]`
- **Tenant**: `/api/tenant/migrate`
- **Health**: `/api/health`, `/api/version`
- **Test**: `/api/test/orchestrator` (gated por `tenants.config.test_orchestrator_enabled`)

### RBAC

Modelo simple, derivado de `src/lib/api-auth.ts` y `scripts/set-admin-user.ts`:

| Rol              | Cómo se identifica                                                                | Capacidades                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **admin**        | `auth.users.app_metadata.is_admin === true` (server-controlled, NO user_metadata) | Cross-tenant: ve y opera sobre cualquier tenant. Acceso a `/dashboard/admin` y `/api/admin/*`                                     |
| **tenant user**  | `tenants.auth_user_id === user.id`                                                | Single-tenant: solo su propio tenant. RLS lo enforza vía `current_setting('app.current_tenant')`                                  |
| **anon**         | Sin sesión                                                                        | Solo `/`, `/login`, `/auth/*`, `/widget/[id]`, `/api/widget/*`, `/api/webhooks/*` (con firma HMAC), `/api/health`, `/api/version` |
| **service_role** | Bypass RLS, solo scripts/cron                                                     | Nunca accesible desde browser. Solo backend / cron jobs.                                                                          |

**NO existe modelo de roles intermedio** (no hay Member, Viewer, Guest). Si se añade en el futuro, actualizar este plan (v1.X).

### Entidades CRUD (12 entidades gestionables vía UI)

| Entidad            | Tabla                                 | UI principal                          | Create               | Read/List     | Update          | Delete          | Restore | Notas                 |
| ------------------ | ------------------------------------- | ------------------------------------- | -------------------- | ------------- | --------------- | --------------- | ------- | --------------------- |
| Leads              | `lead`                                | `/dashboard` (lista) + drawer/detalle | ✅ via widget/ingest | ✅            | ✅              | ✅ soft         | TBD     | append-only default   |
| Lead Opportunities | `lead_opportunities`                  | `/dashboard` sub-tabla                | ✅                   | ✅            | ✅              | ✅              | ❌      | sprint 2              |
| Tenants            | `tenants`                             | `/dashboard/admin`                    | ✅ admin only        | ✅ admin only | ✅ admin only   | ✅ admin only   | ❌      | crítico RLS           |
| AI Agents          | `ai_agents` + `ai_agent_variants`     | `/dashboard/agents`                   | ✅                   | ✅            | ✅              | ✅              | ❌      | activo/borrador       |
| Voice Agents       | `voice_agents`                        | `/dashboard/voice-agents`             | ✅                   | ✅            | ✅              | ✅              | ❌      | Retell/Ultravox       |
| Appointments       | `appointments` + `availability_slots` | `/dashboard/calendar`                 | ✅                   | ✅            | ✅              | ✅              | ❌      | timezone-aware        |
| Knowledge Base     | `knowledge_base`                      | `/dashboard/knowledge`                | ✅                   | ✅            | ✅              | ✅              | ❌      | RLS hardened sprint 1 |
| Integrations       | `integrations`                        | `/dashboard/settings`                 | ✅ OAuth start       | ✅            | ✅ write-policy | ✅ disconnect   | ❌      | tokens AES-256        |
| Programas          | `programas` + `lead_programas`        | embedded en leads UI                  | ✅                   | ✅            | ✅              | ✅              | ❌      | catálogo              |
| Campañas           | `campanas`                            | `/dashboard/campanas` + `/nuevo`      | ✅                   | ✅            | ✅              | ✅              | ❌      | nuevo sprint 3        |
| Web Widgets        | `web_widgets`                         | `/dashboard/web-chatbot`              | ✅                   | ✅            | ✅              | ✅              | ❌      | allowed_domains       |
| Workflows          | `workflows` + `orchestration_graphs`  | `/dashboard/orchestrator`             | ✅                   | ✅            | ✅              | ✅ deploy/sweep | ❌      | n8n-like              |

### Flujos críticos transversales

- Auth: login email/password, logout, reset-password vía email, sesión SSR persistente.
- OAuth integrations: HubSpot start → callback → token cifrado AES-256 → healthcheck → disconnect. Idem Zoho (multi-DC eu/com).
- Webhooks firmados HMAC: Retell, WhatsApp, CRM. Verificar firma + idempotencia.
- Cron: appointments reminders requiere header `Authorization: Bearer $CRON_SECRET`.
- Widget embed público: `/widget/[id]` + `/api/widget/embed.js` (rate-limit + allowed_domains).
- RLS multi-tenant: usuario A NUNCA puede ver datos de tenant B (validado en cada lista).

### Catálogos dinámicos

- `programas` (catálogo formativo del tenant): crece con el tiempo. **Leer en runtime** vía `GET /api/programas` o query supabase.
- `help_sections` (docs in-app): crece con `af-docs-watcher` hook. **Leer en runtime**.
- No hay marketplace público. No hay catálogo cross-tenant.

## Estructura del test (8 fases en orden de dependencia)

> Cada fase produce un `phase-XX-{slug}.md` en el plan dir del run con resultado + bugs encontrados.

### Fase 00 — Pre-checks (5min, bloqueante)

1. Verificar entorno target accesible (HTTP 200 en `/api/health`).
2. Verificar `npm run dev` corriendo (si local) — sino arrancar.
3. Verificar Supabase up (`npm run db:status` si local; ping URL si VPS).
4. Verificar creds admin disponibles (env var o `.env.local`).
5. Verificar Playwright instalado (`npx playwright --version`).
6. Crear plan dir `plans/YYMMDD-HHmm-e2etotal-run/` con subdir `screenshots/`, `bugs/`, `logs/`.
7. Snapshot pre-run: `git rev-parse HEAD`, `npm ls --depth=0 | head -30`, `curl /api/version`.

- **Output**: `phase-00-prechecks.md` con todos los OK.
- **Bloqueante**: SÍ. Si algo falla, abortar y reportar.

### Fase 01 — Auth + RBAC matrix (10min, bloqueante)

1. Login con admin → verificar redirect a `/dashboard` + cookie sesión + `is_admin=true` visible en UI (`<Admin Badge>` si existe).
2. Login con tenant user → verificar redirect a `/dashboard` + sin acceso a `/dashboard/admin` (403 o redirect).
3. Login con creds inválidas → error visible, no leak información.
4. Logout admin → `/dashboard` redirige a `/login`.
5. Acceso a `/dashboard` sin sesión → redirect a `/login` (smoke ya existente — reusar).
6. Reset password flow: solicitar reset, verificar email recibido (o ignorar email en local, validar API 200).
7. **Matrix endpoints**: para cada endpoint en lista de "endpoints admin only" (extraída runtime de `/api/admin/*`), llamar como tenant user → debe retornar 403.

- **Output**: `phase-01-auth-rbac.md` con matrix completa.
- **Bloqueante**: SÍ. Sin auth no se puede continuar.

### Fase 02 — RLS multi-tenant (15min, bloqueante)

1. Crear tenant B con admin (vía `/api/admin/tenants` POST).
2. Crear datos en tenant A (lead, ai_agent, knowledge_base, integration mock).
3. Loguear como user tenant B → listar leads/agents/kb/integrations → verificar **vacío** (no debe ver datos de tenant A).
4. Llamar API directa con JWT tenant B contra recurso tenant A (ID conocido) → debe ser 404 o 403, NUNCA 200 con datos.
5. Cleanup tenant B al final (admin DELETE).

- **Output**: `phase-02-rls-multitenant.md` con tabla "tenant A data leaked? NO/YES" por entidad.
- **Bloqueante**: SÍ. RLS leak = CRIT.

### Fase 03 — CRUD por entidad (60min, no-bloqueante por entidad)

Por cada entidad en la tabla anterior (12 entidades), ejecutar mini-flujo:

1. **Read/List** — navegar a UI principal → verificar tabla/grid carga sin errores.
2. **Create** — abrir modal/form → rellenar campos válidos → submit → verificar entidad aparece en lista + DB row presente (verificar con admin Supabase si posible).
3. **Read/Detail** — click en entidad recién creada → drawer/página detalle abre → campos coinciden.
4. **Update** — editar campo (nombre, descripción) → guardar → verificar cambio reflejado.
5. **Delete** — borrar → verificar entidad desaparece de lista. Si soft-delete: verificar campo `deleted_at` poblado vía API.
6. **Restore** (si aplica) — restore → verificar reaparece.
7. **Validation** — intentar crear con campos vacíos/inválidos → verificar mensajes Zod.
8. **RBAC sobre entidad** — si admin-only (tenants): verificar tenant user no puede.

Capturar screenshot por paso. Si bug detectado: registrar como `E2E-{YYMMDD}-{NNN}-{severity}-{slug}` en `bugs/`.

- **Output**: `phase-03-crud-entities.md` con tabla `entidad | C | R | U | D | Restore | status`.
- **Bloqueante**: NO por entidad (un fallo en `voice_agents` no debe abortar `leads`).

### Fase 04 — Integraciones CRM OAuth (20min, no-bloqueante)

> Solo si `HUBSPOT_CLIENT_ID` / `ZOHO_CLIENT_ID` configurados (skip silencioso si placeholders).

1. **HubSpot** — Settings → "Conectar HubSpot" → ventana OAuth → callback → verificar `integrations` row con `provider='hubspot'`, `status='connected'`, token cifrado.
2. **HubSpot healthcheck** — `POST /api/integrations/manage/{id}/healthcheck` → 200 + datos cuenta.
3. **HubSpot write-policy** — toggle `append_only` ↔ `overwrite_with_audit` → verificar `crm_write_audit` row.
4. **HubSpot disconnect** — desconectar → verificar token borrado + `status='disconnected'`.
5. Idem **Zoho** (con domain eu).
6. **Negativos**: callback con state inválido → error. Callback con code expirado → error visible no leak.

- **Output**: `phase-04-integrations.md`.

### Fase 05 — Webhooks firmados (10min, no-bloqueante)

1. **Retell** — POST `/api/webhooks/retell` con body + header firma HMAC válida → 200. Mala firma → 401.
2. **WhatsApp** — POST `/api/webhooks/whatsapp` con `X-Hub-Signature-256` válido → 200. Mala → 401.
3. **CRM webhook** — POST `/api/webhooks/crm` con firma → 200 + lead ingested. Mala → 401.
4. **Idempotencia** — POST 2x con mismo body → primera 200, segunda 200 con flag `duplicate=true` (o equivalente).
5. **Workflow webhook** — `/api/webhooks/workflow/[wid]/[path]/[nid]` con workflow existente → trigger ejecución.

- **Output**: `phase-05-webhooks.md`.

### Fase 06 — Widget embed público (10min, no-bloqueante)

1. Crear widget en `/dashboard/web-chatbot` → copiar embed snippet.
2. Navegar a `/widget/[id]` directamente → carga sin auth.
3. `GET /api/widget/embed.js` → JS válido + Content-Type correcto.
4. Rate-limit: 100 requests rápidas → bloqueo tras N (definido en `web_widgets.rate_limit`).
5. `allowed_domains`: simular origin no permitido → bloqueo.
6. Submit lead vía widget → verificar `lead` row creada en tenant correcto.

- **Output**: `phase-06-widget.md`.

### Fase 07 — Observabilidad + Compliance (15min, no-bloqueante)

1. `/dashboard/logs` carga últimos `system_logs` del tenant.
2. `/dashboard/costs` carga LLM costs (si feature activada).
3. `/api/health` → 200 con info DB/Redis.
4. `/api/version` → SemVer string + commit SHA.
5. Sentry: provocar error controlado (ruta debug) → verificar event en Sentry dashboard (manual o via API).
6. WCAG smoke: 3 rutas críticas (`/login`, `/dashboard`, `/dashboard/agents`) → axe-core scan → 0 violations críticas.
7. GDPR: verificar endpoint export datos tenant (si existe) o documentar como TODO.

- **Output**: `phase-07-observability.md`.

### Fase 08 — Cleanup + informe (5min, bloqueante)

1. Borrar todas las entidades creadas durante el run (leads, agents, tenants test, widgets, etc.).
2. Verificar tablas limpias (admin query: `count(*) WHERE created_by = '$RUN_ID'`).
3. Generar `INFORME-FINAL.md` con resumen, métricas, bugs, próximos pasos.
4. Añadir entrada nueva al inicio de `docs/e2e-runs-history.md`.
5. Si hay bugs CRIT/HIGH: crear/actualizar memoria persistente con `name: e2e-bugs-pendientes-{YYMMDD}`.

- **Output**: `INFORME-FINAL.md` en root del plan dir.
- **Bloqueante**: SÍ.

## Reglas durante run

- **Naming de bugs**: `E2E-{YYMMDD}-{NNN}-{severity}-{slug}` (ej: `E2E-260526-001-CRIT-rls-leak-leads`).
- **Severities**:
  - `CRIT` — seguridad, RLS leak, data loss, login broken, pagos rotos.
  - `HIGH` — feature core no funcional, CRUD entidad rota, OAuth roto.
  - `MED` — UX issue serio, validación fallando, error visible al usuario.
  - `LOW` — typo, estilo, copy.
- **Fix inmediato in-session** si:
  - Bug detectado tiene fix obvio (typo, missing field, wrong endpoint URL).
  - El fix está dentro del scope del Sprint actual.
  - No requiere migración SQL ni nueva env var.
  - Si requiere admin-only setting (ej. `tenants.config.X = true`): usar service_role / scripts admin para arreglarlo automáticamente y dejar nota en el bug.
- **Tiempo máximo por fase**: 2x estimado (si Fase 03 estimada 60min → abortar tras 120min y documentar).
- **Console errors + network 5xx**: capturar siempre vía Playwright `page.on('console')` + `page.on('response')`. Adjuntar al bug.
- **Screenshots**: SIEMPRE en `{plan_dir}/screenshots/{phase-XX}-{step}-{state}.png`. NUNCA en raíz.
- **No mocks**: usar BD real. Test contra `npm run dev` real, no fake.
- **No skip silencioso** — si una fase no aplica, documentar por qué en su phase-XX.md.

## Criterios de éxito global

| Métrica                                        | Target | Bloqueante release |
| ---------------------------------------------- | ------ | ------------------ |
| Pass rate Fase 00-02 (pre-checks + auth + RLS) | 100%   | SÍ                 |
| Pass rate Fase 03 (CRUD entidades)             | >= 90% | SÍ (90% mínimo)    |
| Pass rate Fase 04-07                           | >= 80% | NO (warning)       |
| Bugs CRIT abiertos al cierre                   | 0      | SÍ                 |
| Bugs HIGH abiertos al cierre                   | <= 2   | NO                 |
| Tiempo total run                               | <= 3h  | NO                 |
| Screenshots capturados por fase                | >= 1   | NO                 |
| Console errors críticos                        | 0      | NO                 |

## Output del run

```
plans/{YYMMDD-HHmm}-e2etotal-run/
├── phase-00-prechecks.md
├── phase-01-auth-rbac.md
├── phase-02-rls-multitenant.md
├── phase-03-crud-entities.md
├── phase-04-integrations.md
├── phase-05-webhooks.md
├── phase-06-widget.md
├── phase-07-observability.md
├── phase-08-cleanup.md
├── INFORME-FINAL.md
├── screenshots/
│   ├── 00-prechecks-health.png
│   ├── 03-leads-create-ok.png
│   └── ...
├── bugs/
│   ├── E2E-260526-001-CRIT-rls-leak-leads.md
│   └── ...
└── logs/
    ├── console-errors.jsonl
    └── network-5xx.jsonl
```

Y entrada nueva al inicio de [`e2e-runs-history.md`](./e2e-runs-history.md).

## Pre-checks obligatorios (marcar antes de arrancar)

- [ ] Working tree limpio o stash hecho (`git status --porcelain` vacío).
- [ ] Rama actual NO es `main` ni `staging` (run en `developer` / `feature/*`).
- [ ] `npm run dev` corriendo en `localhost:8500` (o VPS accesible).
- [ ] `.env.local` con `NEW_ADMIN_PASSWORD` (o env vars del entorno target).
- [ ] Supabase local up (`npm run db:status` muestra running) — solo local.
- [ ] Redis up (`docker ps | grep redis`) — solo local si test toca queues.
- [ ] Playwright browsers instalados (`npx playwright install chromium`).

## Post-run checklist (marcar al cerrar)

- [ ] `INFORME-FINAL.md` generado y completo.
- [ ] Entrada añadida al inicio de `e2e-runs-history.md`.
- [ ] Bugs CRIT/HIGH documentados con ID estable.
- [ ] Memoria persistente actualizada si bugs CRIT/HIGH abiertos.
- [ ] Cleanup verificado (no entidades test huérfanas en DB).
- [ ] Screenshots organizados en `screenshots/`.
- [ ] Bugs fixeados in-session: commits con prefijo `fix(e2e): ...` + ref al bug ID.
- [ ] Si run sobre VPS: capturar también logs Dokploy del periodo.
- [ ] Branch sin cambios sin commitear (excepto bugs intencionalmente abiertos).

## Cambios al plan (versionado)

- **v1.X**: bumps menores — añadir fase nueva, ajustar entidades, refinar reglas. NO crear `v2`.
- **Política**: el plan vive en el mismo archivo siempre. El histórico de runs vive aparte (`e2e-runs-history.md`).
- Cuando el plan cambie significativamente, anotar en la cabecera (`Versión plan: 1.X` + 1 línea "qué cambió").
- Cambios deben quedar reflejados también en `/e2etotal.md` slash command si afectan ejecución.

## Apps / entidades catalogadas — snapshot 26-05-2026

12 entidades CRUD (ver tabla arriba). 28 páginas dashboard. 30+ endpoints API. 2 roles (admin + tenant user). 2 entornos activos (local, vps preparado pero no desplegado).

**Refresh runtime**: si la app crece, ejecutar el inventario auto antes de cada run:

```powershell
# Páginas
Get-ChildItem -Path src/app -Filter "page.tsx" -Recurse | Select-Object FullName
# Endpoints
Get-ChildItem -Path src/app/api -Filter "route.ts" -Recurse | Select-Object FullName
# Migrations (entidades)
Get-ChildItem -Path supabase/migrations -Filter "*.sql" | Select-Object Name
```

Si delta > 10% respecto al snapshot del plan, actualizar plan (bump v1.X) antes de correr.

## Unresolved questions

1. **Restore endpoints**: no se ha verificado si todas las entidades con soft-delete tienen UI de restore. Auditar en Fase 03 y documentar gaps reales.
2. **Sentry test event**: validar que el DSN VPS apunta al proyecto correcto y que un test event manual es detectable vía Sentry API en <60s.
3. **Cron auth**: confirmar que `/api/cron/appointments/reminders` solo acepta header con `CRON_SECRET` y no fallback a sesión browser.
4. **GDPR export endpoint**: verificar si existe (`/api/tenant/export` o similar). Si no existe, documentar como TODO post-MVP.
5. **Widget rate-limit thresholds**: leer en runtime de `web_widgets.rate_limit_config` — no hardcodear el "N requests / ventana".
6. **Multi-DC Zoho**: probar contra `zohoapis.eu` (default tenant ES). Documentar gap si `.com` / `.in` no se han probado.
7. **Voice agents AB testing**: feature flag `FEATURE_VOICE_PROVIDER_AB` — verificar comportamiento on/off en Fase 03.
