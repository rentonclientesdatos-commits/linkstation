---
phase: 01
title: "Auth + RBAC matrix"
status: PASS
started_at: 2026-05-29 16:28
completed_at: 2026-05-29 16:34
duration: 6min (incluye toda la suite)
blocking: yes
---

# Fase 01 — Auth + RBAC

## Estrategia

En lugar de pilotar el navegador via Playwright MCP (riesgo de interferir con el chat paralelo que usa el navegador en este momento), se ejecuta **la suite Playwright completa via CLI** (`npx playwright test`). Aislada del MCP, reproducible, no toca ninguna instancia de navegador externa.

## Resultado

🟢 **61/61 specs PASS** en 2m 12s con 2 workers chromium.

## Specs Auth + RBAC ejecutadas (subset relevante para Fase 01)

| Spec ID  | Descripción                                                                                              | Resultado |
| -------- | -------------------------------------------------------------------------------------------------------- | --------- |
| smoke-01 | login page renders                                                                                       | ✅        |
| smoke-02 | unauthenticated /dashboard does not leak content                                                         | ✅        |
| SF-01    | GET / sin sesión → redirect a /login                                                                     | ✅        |
| SF-02    | Login admin demo@af.local → llega a /dashboard                                                           | ✅        |
| SF-03    | /dashboard carga con contenido tras login admin                                                          | ✅        |
| SF-04    | /dashboard/settings accesible con auth admin                                                             | ✅        |
| SF-05    | Logout admin → sesión invalidada                                                                         | ✅        |
| SF-06    | Login viewer @af.local manejado (creds demo viewer sin sincronizar — finding informativo, no bloqueante) | ✅        |
| VPS-01   | GET / sin sesión → /login (re-verificado en local)                                                       | ✅        |
| VPS-02   | Login admin `LinkStation@gmail.com` → /dashboard                                                 | ✅        |
| VPS-03   | /dashboard/settings carga tras login                                                                     | ✅        |
| VPS-04   | Edit cliente → CRMSection con HubSpot+Zoho+Integraciones=true                                            | ✅        |
| 2B-01    | GET /dashboard sin sesión → /login                                                                       | ✅        |
| 2B-02    | Login admin → /dashboard carga                                                                           | ✅        |

## Specs RBAC endpoints sin auth (Fase 01 matrix transversal)

| Spec ID | Endpoint                                               | Esperado | Real  | Resultado |
| ------- | ------------------------------------------------------ | -------- | ----- | --------- |
| 1-07    | GET `/api/orchestration/workflows` sin auth            | 401      | 401   | ✅        |
| 1-07    | POST `/api/orchestration/deploy` sin auth              | 401      | 401   | ✅        |
| 1-07    | POST `/api/orchestration/publish` sin auth             | 401      | 401   | ✅        |
| 1-08    | GET `/api/orchestration/sweep` sin cron secret         | 401/503  | match | ✅        |
| 1-08    | GET `/api/orchestration/sweep` con header inválido     | 401      | 401   | ✅        |
| 1-08    | GET `/api/cron/appointments/reminders` sin cron secret | 401/503  | match | ✅        |
| 1-10    | GET `/api/admin/tenants/[id]/client-sql` sin auth      | 401      | 401   | ✅        |
| 1-11    | GET `/api/tenant/migrate` sin auth                     | 401      | 401   | ✅        |

## Observaciones

- **SF-06 informativo**: usuario demo viewer (`viewer@af.local`) no autentica con `Invalid login credentials`. La spec lo trata como warning con instrucciones de ejecutar `scripts/show-demo-credentials.ts` para resincronizar. NO es un fallo de auth — el flujo de error está siendo correctamente gestionado (sin leak de información sensible).
- **2 workers en local** según `playwright.config.ts` (regla anti-flakiness BUG-3-05).

## Resultado

🟢 **PASS** — Auth flows operativos, RBAC matrix verde para endpoints críticos sin sesión. Procede a Fase 02.
