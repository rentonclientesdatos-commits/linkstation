# E2E-260527-003-CRIT — CSP `connect-src` bloquea Supabase local (`http://127.0.0.1:8100`)

**Severity**: CRIT
**Fase**: 03 sweep dashboard
**Detección**: 22+ errores console al navegar `/dashboard/conversaciones`, `/dashboard/costs`, `/dashboard/logs`.

## Esperado

Las llamadas fetch a `http://127.0.0.1:8100/rest/v1/*` (Supabase local) deben pasar.

## Observado

CSP `connect-src 'self' https://*.supabase.co wss://*.supabase.co ...` NO incluye `http://127.0.0.1:8100`. Resultado: el browser bloquea TODAS las llamadas REST a Supabase local desde el client-side.

Tablas afectadas detectadas: `chat_messages`, `llamadas`, `orchestration_logs`. Probablemente afecta a TODAS las queries client-side en dev local.

## Mensaje exacto

```
Connecting to 'http://127.0.0.1:8100/rest/v1/chat_messages?...' violates the following
Content Security Policy directive: "connect-src 'self' https://*.supabase.co wss://*.supabase.co
https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com
https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://api.retellai.com
https://api.ultravox.ai https://api.hubapi.com https://accounts.zoho.com https://*.zohoapis.com
https://*.zohoapis.eu https://graph.facebook.com https://api.sepay.vn".
```

## Impacto

- **Dev local DEGRADADO**: cualquier feature que dependa de queries client-side a Supabase no funciona. Páginas cargan el shell pero las tablas/listas vienen vacías.
- En producción VPS usa `dev.linkstation.ai/supabase` (path-prefix), sin el problema directo, pero la CSP probablemente tampoco incluye esa URL → verificar.
- Bug oculta otros bugs (no podemos verificar lógica de UI sin datos).

## Fix sugerido (no ejecutado)

En `next.config.ts` o middleware Sentry/CSP: añadir `http://localhost:8100 http://127.0.0.1:8100` a `connect-src` cuando `NODE_ENV=development`. Y `https://dev.linkstation.ai` para VPS.

Buscar: `connect-src` en `src/middleware.ts`, `src/lib/security/csp.ts`, `next.config.*`, `sentry.*.config.ts`.

## Status

ABIERTO — sin fix por instrucción de barrido detección único.
