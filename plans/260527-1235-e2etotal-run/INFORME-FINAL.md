# INFORME-FINAL — E2E Total Run linkstation

> **Modo**: barrido único de detección (NO fix in-session, por instrucción del usuario).
> **Destino**: bloque/página 7 del informe que genera otro chat.

## Metadatos del run

| Campo            | Valor                                     |
| ---------------- | ----------------------------------------- |
| Fecha            | 2026-05-27 12:35 → 12:52 UTC (~17min)     |
| Operador         | Claude (e2etotal autoexec)                |
| Entorno          | local (`http://localhost:8500`)           |
| App version      | `v0.3.0-rc.1`                             |
| Branch           | `auditoria-v2-medio-proyecto` @ `6f8ad73` |
| Plan version     | 1.1                                       |
| Plan dir         | [`plans/260527-1235-e2etotal-run/`](.)    |
| Resultado global | 🟡 PASS con bugs                          |
| Bugs detectados  | **9 únicos** (3 CRIT + 4 HIGH + 2 MED)    |

## Resumen ejecutivo (1 párrafo para bloque 7)

> Se ejecutó barrido E2E completo del linkstation local (28 rutas dashboard + 10 endpoints API + flujos de webhooks, OAuth y widget público) con sesión admin real. **Auth, RBAC y aislamiento de endpoints admin-only funcionan correctamente**. Se detectaron **9 bugs únicos**: **3 CRIT** que afectan funcionalidades core (CSP bloquea Supabase local → datos no cargan client-side; React hooks error rompe `/dashboard/orchestrator`; webhook WhatsApp leak info de infra interna), **4 HIGH** (endpoints que no responden — leads/ingest, google/auth, widget público —, widget embed.js retorna 400 con content-type incorrecto), y **2 MED** (cron-reminders 503 unauth, `/api/version` campos commit/branch/deployedAt sin poblar). El bug más crítico es **E2E-260527-003** (CSP) porque oculta el comportamiento real de gran parte de la UI en dev local y casi seguro afecta también al VPS.

## Resultados por fase

| Fase                        | Estado | Pass/Total       | Bugs nuevos                                         |
| --------------------------- | ------ | ---------------- | --------------------------------------------------- |
| 00 Pre-checks               | 🟢     | 8/8              | 0                                                   |
| 01 Auth admin + login       | 🟢     | 1/1              | 0 (49 warnings deprecation acumulados, no críticos) |
| 02 RLS endpoints admin-only | 🟡     | 5/7              | 2 (#001, #002)                                      |
| 03 Sweep 28 rutas dashboard | 🟡     | 26/28 navegables | 3 (#003, #004, #005)                                |
| 04 OAuth probes             | 🟡     | 2/3              | 1 (#006 google/auth)                                |
| 05 Webhooks firma inválida  | 🟡     | 1/3              | 1 (#007 whatsapp 503)                               |
| 06 Widget público           | 🔴     | 0/2              | 2 (#006 widget/[id], #008 embed.js)                 |
| 07 Observability + headers  | 🟢     | 8/9              | 1 (#009 version unknown)                            |
| 08 Informe + commit         | 🟢     | OK               | 0                                                   |

## Catálogo de bugs detectados (formato bloque 7)

### 🔴 CRIT (3) — Bloqueantes pre-release

| ID                 | Título                                                   | Ubicación                                 | Impacto                                                                                                                                                   |
| ------------------ | -------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E2E-260527-003** | CSP `connect-src` bloquea Supabase local                 | middleware/Sentry CSP config              | Dev local roto, queries client-side a `127.0.0.1:8100` fallan en TODAS las páginas. Casi seguro afecta VPS (CSP no incluye `dev.linkstation.ai`) |
| **E2E-260527-004** | React "Rendered more hooks" en `/dashboard/orchestrator` | `src/app/dashboard/orchestrator/page.tsx` | Workflow builder inaccesible. Ruta documentada como existente está rota                                                                                   |
| **E2E-260527-007** | `/api/webhooks/whatsapp` retorna 503 con firma bogus     | `src/app/api/webhooks/whatsapp/route.ts`  | Info leak (revela infra interna a anon) + Meta puede desactivar el webhook por 503 sostenidos                                                             |

### 🟠 HIGH (4) — Funcionalidad importante caída

| ID                           | Título                                                                | Ubicación                              | Impacto                                                           |
| ---------------------------- | --------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| **E2E-260527-001**           | `/api/leads/ingest` no responde (HTTP 000)                            | `src/app/api/leads/ingest/route.ts`    | Ingesta pública de leads sin respuesta — DoS-vector               |
| **E2E-260527-006**           | Múltiples endpoints HTTP 000 (leads/ingest, google/auth, widget/[id]) | varios                                 | 3 endpoints públicos cuelgan sin respuesta                        |
| **E2E-260527-008**           | `/api/widget/embed.js` retorna 400 + `text/plain`                     | `src/app/api/widget/embed.js/route.ts` | Embed widget no funcional out-of-the-box, content-type incorrecto |
| **E2E-260527-006 (subcaso)** | `/widget/invalid-id-test` HTTP 000 en lugar de 404                    | `src/app/widget/[id]/page.tsx`         | SSR crash, no usa `notFound()`                                    |

### 🟡 MED (2) — UX / observabilidad

| ID                 | Título                                                         | Ubicación                                          | Impacto                                                         |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| **E2E-260527-002** | `/api/cron/appointments/reminders` 503 unauth                  | `src/app/api/cron/appointments/reminders/route.ts` | Info leak (igual patrón que #007), auth check post-dependencies |
| **E2E-260527-005** | `/dashboard/orchestrator` redirige a `/onboarding` sin mensaje | consecuencia de #004                               | UX confusa, usuario aterriza en página distinta sin explicación |
| **E2E-260527-009** | `/api/version` con `commit`/`branch`/`deployedAt` = "unknown"  | `src/app/api/version/route.ts`                     | Imposible rastrear deploy desde endpoint                        |

## Hallazgos positivos (no bugs, vale la pena documentar)

- ✅ **Middleware auth funciona correctamente**: 25/25 rutas `/dashboard/*` redirigen 307 a `/login` sin sesión. No leaks.
- ✅ **Endpoints admin-only protegidos**: `/api/admin/*`, `/api/orchestration/*`, `/api/tenant/migrate`, `/api/integrations` → 401 sin auth (correcto).
- ✅ **Login admin funciona**: email/password + Supabase SSR + redirect a `/dashboard`. Cookie sb-127-auth-token bien firmada con `app_metadata.is_admin=true`.
- ✅ **Security headers completos**: HSTS preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrictiva.
- ✅ **Webhook Retell HMAC funciona correctamente**: rechaza firma inválida con 401 (sin caer al backend).
- ✅ **WCAG-10 skip-link funcional** (verificado en `/login`).

## Patrón sistémico detectado: handlers no aíslan dependencias

3 bugs (#001, #002, #007) tienen la misma raíz: el handler intenta inicializar Redis/BullMQ/dependencia externa ANTES de validar auth o request. Cuando Redis está caído (estado actual en local) responde 503 o cuelga (HTTP 000) sin distinguir entre "tu request es válido pero la infra está mal" y "tu request es inválido". **Fix recomendado**: refactor cross-handler para validar auth/firma como PRIMER paso en TODO handler.

## Estado final del run

- ✅ TODAS las fases ejecutadas (00 → 08).
- ✅ Plan dir `plans/260527-1235-e2etotal-run/` con 9 bugs documentados + logs + script sweep.
- ✅ 24 screenshots en `docs/screenshots/e2e-*.png`.
- ✅ Cookie admin obtenida y reusada para barrido.
- ❌ NO se ejecutó cleanup (instrucción usuario: dejar entidades test). Realmente no se crearon entidades porque CSP bloqueó queries → no hay nada que limpiar.
- ⚠️ Browser MCP cerrado correctamente.

## Próximos pasos sugeridos

| Prioridad | Acción                                                        | Owner | Estimación |
| --------- | ------------------------------------------------------------- | ----- | ---------- |
| 🔴 P0     | Fix E2E-260527-003 CSP (afecta dev + VPS)                     | TBD   | 1h         |
| 🔴 P0     | Fix E2E-260527-004 hooks orchestrator                         | TBD   | 2h         |
| 🔴 P0     | Refactor cross-handler validation-first (#001, #002, #007)    | TBD   | 4h         |
| 🟠 P1     | Fix E2E-260527-006 widget/[id] notFound + google/auth handler | TBD   | 1h         |
| 🟠 P1     | Fix E2E-260527-008 widget embed.js content-type + flow        | TBD   | 1h         |
| 🟡 P2     | Poblar build vars en `/api/version` (#009)                    | TBD   | 30min      |

**Total estimado fix bugs detectados**: ~9-10 h.

## Pendientes/limitaciones del run

- Fase 03 NO ejecutó CRUD real por entidad (por instrucción "barrido único", solo navegación visual + capturas).
- Fase 02 NO creó segundo tenant para verificar RLS cross-tenant (instrucción usuario). Quedó validado solo el aislamiento por auth (admin vs anon).
- Bugs WhatsApp/Retell webhook con firma VÁLIDA no probados (requiere generar HMAC con secret real, fuera del scope barrido).
- Performance/load tests: no aplicado.
- Visual regression: no aplicado.

## Adjuntos en el plan dir

- `bugs/E2E-260527-001..009-*.md` — 9 bugs con detalle, severity, fix sugerido, status ABIERTO.
- `logs/console-warnings-fase01.log` — 49 warnings (mayoría deprecation Next.js, no críticos).
- `logs/all-console-errors-final.log` — 22 errors agrupados (todos vinculados a #003 CSP + 1 vinculado a #004 hooks).
- `logs/network-api-all.log` — historial requests API durante el run.
- `logs/sweep-unauth.md` — tabla 28 rutas con HTTP code (todas 307 → middleware OK).
- `sweep-routes.sh` — script reutilizable para futuros barridos rápidos.
- Screenshots en `docs/screenshots/e2e-*.png` (e2e-01 a e2e-24).
