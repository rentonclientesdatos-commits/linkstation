# CSRF protection — linkstation

> Sprint 3 phase-05 Hardening (4-06). Documenta cómo el proyecto se protege de Cross-Site Request Forgery.

## TL;DR

- **Server Actions de Next.js 16 App Router**: protección CSRF **built-in**. No necesitamos librería adicional ni token explícito.
- **API Routes `POST /api/*`** (que no son webhooks ni Server Actions): protegidos por **Origin check** + autenticación Supabase cookie SameSite=Lax.
- **Webhooks `/api/webhooks/*`**: protegidos por **HMAC signature** del proveedor (Sprint 0 1-12/1-14/1-15). No requieren CSRF check porque el cliente legítimo es el proveedor externo, no el browser del usuario.

## Mecanismo built-in de Server Actions

Next.js 16 App Router protege Server Actions automáticamente con 3 capas:

1. **Content-Type check** — solo acepta `multipart/form-data` o `application/x-www-form-urlencoded` (cualquier otro Content-Type es rechazado).
2. **Origin header validation** — compara `Origin` con `Host` automáticamente. Si difieren, el framework rechaza la request con 403.
3. **Header `Next-Action`** — Next.js incluye un hash determinista en el cliente que solo existe si el bundle fue renderizado por el servidor. Un atacante externo no puede generarlo sin ejecutar el bundle real.

Referencia oficial: <https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security>

## Cookies de Supabase Auth

Las cookies de sesión Supabase (`sb-*-auth-token`) tienen `SameSite=Lax` por defecto. Esto impide que un sitio malicioso pueda usar la sesión del usuario en requests cross-origin no-GET — defensa adicional contra CSRF.

## API Routes `POST /api/*` (sin Server Actions)

Para los pocos endpoints que NO son Server Actions ni webhooks (ej: `/api/admin/tenants/[id]/client-sql`), Next.js NO añade CSRF check automático. Validamos `Origin` header manualmente con el helper `requireApiAdmin`/`requireApiUser` (ver `src/lib/api-auth.ts`):

- Si `Origin` no coincide con `Host`, devolvemos 403.
- Si `Origin` viene vacío (curl, llamadas server-to-server), exigimos que la request lleve un **token de admin** o auth header. Sin ambos, 403.

Este check es defensivo: el rate limit Edge ya impide ataques de volumen, y RLS bloquea acceso a datos sin sesión válida.

## Webhooks externos

Los webhooks (`/api/webhooks/retell`, `/api/webhooks/crm`, `/api/webhooks/whatsapp`) NO usan CSRF porque:

- El cliente legítimo es un servidor externo (no un browser con cookies de usuario).
- En su lugar usamos **HMAC signature** sobre el body crudo, con secret per-tenant cuando aplica.
- Si la firma no coincide, devolvemos 401 — implementado en Sprint 0 tareas 1-12, 1-14, 1-15.

## Próximos pasos (Sprint 4+)

- Considerar CSP `script-src 'self' 'strict-dynamic'` con nonces — eliminaría `unsafe-inline` y haría más difícil cualquier vector XSS-as-CSRF.
- Audit periódico con `node scripts/audit-csrf.js` (no existe aún) que enumere todas las Server Actions y verifique que ninguna se exporta con runtime erróneo.

## Referencias

- [Sprint 3 phase-05 plan](../../plans/260520-1342-sprint-3-hardening/phase-05-hardening-headers-rate-limits.md)
- [Sprint 0 webhooks signatures](../../plans/260520-1342-sprint-0-hotfixes-seguridad/plan.md)
- `src/lib/api-auth.ts` — implementación de los checks Origin + admin
- `src/middleware.ts` — auth check global (no CSRF check porque corre en Edge runtime)
