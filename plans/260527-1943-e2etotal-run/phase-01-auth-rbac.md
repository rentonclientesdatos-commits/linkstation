# Fase 01 — Auth + RBAC matrix VPS

**Inicio:** 2026-05-27 19:55 UTC
**Cierre:** 2026-05-27 20:13 UTC
**Duración:** ~18min
**Estado:** 🟡 PASS con warnings (RBAC matrix 🟢, rate-limit deploy 🟡 pendiente)

## Resultados

### 01.A — Verificación funcional deploy `41d429c` vía rate-limit (CRÍTICO)

Test: 6 logins consecutivos con email `ratelimit-probe-260527@example.com` + passwords `wrongpass-attempt-{1..6}`.

| Intento | Esperado si `41d429c` desplegado            | Observado VPS                      |
| ------- | ------------------------------------------- | ---------------------------------- |
| 1       | "Invalid login credentials"                 | "Invalid login credentials" ✅     |
| 2       | "Invalid login credentials"                 | "Invalid login credentials" ✅     |
| 3       | "Invalid login credentials"                 | "Invalid login credentials" ✅     |
| 4       | "Invalid login credentials"                 | "Invalid login credentials" ✅     |
| 5       | "Invalid login credentials"                 | "Invalid login credentials" ✅     |
| 6       | **"Demasiados intentos. Inténtalo en Xs."** | **"Invalid login credentials"** ❌ |

**Conclusión:** VPS NO sirve el commit `41d429c` todavía. Sigue corriendo `v0.3.0-rc.1` original sin rate-limit en `loginAction`. El push de Dokploy autodeploy parece NO haberse disparado o aún está construyendo. Coherente con que `/api/version` devuelve `commit:""` (sin Build Args inyectados).

**Acción usuario:** verificar panel Dokploy (`panel.linkstation.ai`) si autodeploy se disparó. Si no, lanzar build manual del servicio `dev.dash`.

### 01.B — Login admin válido + RBAC admin paths

Credenciales: `LinkStation@gmail.com` / `BeaOli#AF*2026!` (vault local, NO commiteables).

| Acción                                 | Resultado                                                          |
| -------------------------------------- | ------------------------------------------------------------------ |
| POST login admin                       | 🟢 Redirige `/dashboard`                                           |
| GET `/dashboard`                       | 🟢 Renderiza overview (KPIs cross-canal, 3 leads, 6 llamadas)      |
| GET `/dashboard/admin` (admin-only)    | 🟢 Renderiza tabla gestión clientes — 2 tenants visibles           |
| GET `/dashboard/settings` (admin-only) | 🟢 Renderiza settings tenant                                       |
| Header user                            | 🟢 "LinkStation — CRM" + botón Cerrar sesión presente     |
| Console errors                         | 🟢 0 errors, 24 warnings (Tailwind v4 + Next dev tools — normales) |

**Tenants detectados (para Fase 02 RLS):**

1. `LinkStation` — `LinkStation@gmail.com` — Cliente
2. `Demo - Academia AF` — `demo@af.local` — Cliente

### 01.C — Logout + acceso anon a rutas protegidas

| Ruta                             | Esperado          | Observado |
| -------------------------------- | ----------------- | --------- |
| Logout button                    | Redirige `/login` | 🟢 OK     |
| GET `/dashboard` (anon)          | Redirige `/login` | 🟢 OK     |
| GET `/dashboard/admin` (anon)    | Redirige `/login` | 🟢 OK     |
| GET `/dashboard/settings` (anon) | Redirige `/login` | 🟢 OK     |

### 01.D — RBAC API matrix (curl directo)

| Endpoint            | Acceso esperado anon | Observado VPS                                       |
| ------------------- | -------------------- | --------------------------------------------------- |
| `/api/health`       | 🟢 200 público       | 🟢 200                                              |
| `/api/version`      | 🟢 200 público       | 🟢 200                                              |
| `/api/integrations` | 🔒 401 Unauthorized  | 🟢 401                                              |
| `/api/admin/queues` | 🔒 401 Unauthorized  | 🟢 401 (body coherente: `{"error":"Unauthorized"}`) |

## Bugs detectados

### `E2E-260527-002-HIGH-vps-deploy-41d429c-pendiente`

- **Severity:** HIGH
- **OWASP:** A07 (Identification & Authentication Failures — el fix de A07 todavía NO está en producción)
- **Surface:** Infra Dokploy / Auth
- **Descripción:** Tras push de `41d429c` con rate-limit en `loginAction`+`resetPasswordAction`, el VPS sigue sirviendo código sin rate-limit. Verificado funcionalmente: 6º login wrong-pass devuelve "Invalid login credentials" en vez del esperado "Demasiados intentos. Inténtalo en Xs.".
- **Evidencia:** snapshot `01-B-dashboard-admin-as-admin.png` + tabla 01.A.
- **Recomendación:** acción usuario en panel Dokploy `panel.linkstation.ai` — login con `hola@linkstation.ai` + verificar autodeploy. Lanzar build manual si no se disparó. Re-correr Fase 01.A tras deploy confirmado.
- **NO bloquea** el resto del run (RBAC matrix actual funciona — el bug es ausencia de mejora, no regresión).

## Screenshots capturadas

- `screenshots/01-B-dashboard-admin-as-admin.png` — admin renderizando `/dashboard/admin` con 2 tenants

## Status

**Status:** DONE_WITH_CONCERNS
**Summary:** RBAC matrix 🟢 4/4 admin + 3/3 anon redirect + 4/4 API. Rate-limit deploy 🟡 pendiente Dokploy.
**Concerns:** `41d429c` no desplegado todavía en VPS — bug `E2E-260527-002-HIGH` requiere acción manual usuario panel Dokploy.
