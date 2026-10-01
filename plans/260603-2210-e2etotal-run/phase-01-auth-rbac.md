# Fase 01 — Auth + RBAC matrix

- **Env**: vps (`https://dev.linkstation.ai`)
- **Método**: Playwright CLI (browser MCP ocupado por chat paralelo) + curl probes
- **Estado**: 🟢 PASS

## Playwright specs (7/7 verde, 38.2s)

| Spec                                             | Resultado | Detalle                                                            |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| smoke @core · login page renders                 | 🟢        | `/login` renderiza                                                 |
| smoke @core · unauthenticated /dashboard no leak | 🟢        | sin sesión no expone contenido                                     |
| VPS-01 · GET / sin sesión → /login               | 🟢        | redirect correcto                                                  |
| VPS-02 · Login admin VPS → /dashboard            | 🟢        | `LinkStation@gmail.com` autentica OK                       |
| VPS-03 · /dashboard/settings carga               | 🟢        | admin accede a settings                                            |
| VPS-04 · settings → CRMSection HubSpot+Zoho      | 🟢        | CRM=true HubSpot=true Zoho=true Integraciones=true, 2 edit buttons |
| VPS-05 · GET /api/integrations (auth)            | 🟢        | 401 sin sesión (auth-gated)                                        |

## RBAC matrix curl (anon, sin sesión)

| HTTP           | Path                                 | Esperado       | Resultado              |
| -------------- | ------------------------------------ | -------------- | ---------------------- |
| 401            | `/api/admin/tenants/{id}/client-sql` | 401/403        | 🟢                     |
| 401            | `/api/integrations`                  | 401/403        | 🟢                     |
| 401            | `/api/orchestration/workflows`       | 401/403        | 🟢                     |
| 307            | `/dashboard`                         | redirect login | 🟢 → /dashboard→/login |
| 307            | `/dashboard/admin`                   | redirect login | 🟢                     |
| 200            | `/login`                             | 200            | 🟢                     |
| 200            | `/api/health`                        | 200            | 🟢                     |
| 200            | `/api/version`                       | 200            | 🟢                     |
| 307→/dashboard | `/`                                  | redirect       | 🟢                     |

## Security headers (`/login`)

🟢 CSP completo (`frame-ancestors 'none'`, `connect-src 'self'` + APIs externas allowlisted), HSTS `max-age=63072000; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

## Regresiones verificadas

- `E2E-260527-003-CRIT` (CSP bloquea Supabase): **NO aplica a VPS**. VPS usa Supabase self-hosted path-prefix `/supabase` (mismo origen → cubierto por `connect-src 'self'`). Login + dashboard cargan (VPS-02/03/04 verde) → CSP no bloquea. ✅

## Resultado

🟢 **PASS** — 7/7 specs + 9/9 RBAC probes + 5/5 security headers. 0 bugs. Auth y RBAC sólidos en VPS.
