---
title: "Security — Secrets & Environment"
date: 2026-05-18
agent: Audit-Deps+Security (Sonnet)
---

# Security — Secrets & Environment

## Resumen

Se detectaron **secretos hardcodeados de producción en código fuente** comprometiendo la seguridad del sistema. Específicamente, se encontraron 3 JWTs de Supabase con `role: service_role` y `role: anon` hardcodeados como strings literales en archivos `.ts` de producción. Adicionalmente, se encontró un token de verificación de webhook WhatsApp hardcodeado y URLs de instancias internas de Supabase expuestas en código.

---

## Secretos hardcodeados encontrados

### F-05-SEC-001 — JWT de Supabase `service_role` hardcodeado (Critical)

**Archivos y líneas:**
- `src/lib/auth-config.ts:19` — fallback de `AUTH_SUPABASE_SERVICE_ROLE_KEY`
- `src/lib/supabase/server.ts:7` — `FALLBACK_SERVICE_KEY`
- `src/lib/actions/tenant.ts:52` — fallback en `getServiceSupabase()`
- `src/lib/actions/tenant.ts:76` — fallback en `getTenants()`
- `src/scripts/purge-demo.ts:9` — fallback en script de purga

**Token expuesto (fragmento identificativo):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzgzOTI5MzQs...role:service_role...
```
(y una segunda variante con iat:1772491229 en purge-demo.ts y tenant.ts)

**Severidad**: Critical
**Tipo**: Supabase Service Role JWT — acceso completo a base de datos sin restricción de RLS
**Impacto**: Cualquier persona con acceso al repositorio puede acceder a TODA la base de datos Supabase (todos los tenants, todos los leads, datos de producción) sin autenticación.
**Esfuerzo de fix**: Bajo (2h) — eliminar fallbacks hardcodeados, rotar el JWT en Supabase dashboard, exigir env var obligatoria

**Fix textual:**
```typescript
// auth-config.ts — ANTES (inseguro):
export const AUTH_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";  // ← ELIMINAR ESTO

// DESPUÉS (seguro):
export const AUTH_SUPABASE_SERVICE_ROLE_KEY = (() => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required");
    return key;
})();
```

**Acción adicional obligatoria**: Rotar el JWT en el Supabase dashboard (`Settings > API > Service Role Key > Regenerate`). El token actual debe considerarse comprometido si el repo ha sido accesible a terceros.

---

### F-05-SEC-002 — JWT de Supabase `anon` hardcodeado (High)

**Archivos y líneas:**
- `src/lib/auth-config.ts:13-14` — fallback de `AUTH_SUPABASE_ANON_KEY`
- `src/lib/supabase/client.ts:16` — fallback en `getSupabaseClient()`
- `src/lib/supabase/client.ts:20` — fallback en bloque de error
- `src/lib/supabase/server.ts:8` — `FALLBACK_ANON_KEY`

**Severidad**: High
**Tipo**: Supabase Anon JWT — acceso a DB con permisos de anon (sujeto a RLS)
**Impacto**: La anon key es pública por diseño en Supabase (va al browser), pero tenerla hardcodeada en el código de servidor con URL real crea superficie de ataque. Si RLS no está correctamente configurado (ver 3-002), permite lectura de datos entre tenants.
**Esfuerzo de fix**: Bajo (1h) — eliminar fallbacks, usar env var

**Fix textual:**
```typescript
// client.ts — eliminar el fallback hardcodeado:
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    // No fallback — forzar configuración correcta
}
```

---

### F-05-SEC-003 — URL de Supabase de producción hardcodeada (High)

**Archivos y líneas:**
- `src/lib/auth-config.ts:9-10` — `https://api-db.linkstation.ai`
- `src/lib/supabase/client.ts:15,20` — Idem
- `src/lib/supabase/server.ts:6` — Idem
- `src/scripts/purge-demo.ts:8` — URL alternativa interna: `http://interno-supabase-a201be-46-62-193-169.traefik.me`

**Severidad**: High
**Tipo**: Sensitive infrastructure URL — endpoint interno de base de datos de producción
**Impacto**: La URL `http://interno-supabase-a201be-46-62-193-169.traefik.me` revela la arquitectura de red interna (Traefik, hostname de instancia, IP `46.62.193.169`). Combinada con el service_role JWT (F-05-SEC-001), permite acceso directo al servidor de BD.
**Esfuerzo de fix**: Bajo (1h) — mover a env var

**Fix textual:**
```typescript
// Eliminar toda URL hardcodeada; lanzar error si no está configurada:
const FALLBACK_URL = undefined; // No hay fallback — es requerida
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
```

---

### F-05-SEC-004 — WhatsApp Verify Token hardcodeado (High)

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts:11`
```typescript
const VERIFY_TOKEN = "automatiza_for_2025";
```

**Severidad**: High
**Tipo**: Webhook verification token — secreto compartido con Meta
**Impacto**: Cualquier persona que conozca este token puede verificar webhooks fraudulentos como si fueran de Meta. Permite suplantación de mensajes WhatsApp entrantes.
**Esfuerzo de fix**: Mínimo (30min) — mover a env var

**Fix textual:**
```typescript
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
if (!VERIFY_TOKEN) throw new Error("WHATSAPP_VERIFY_TOKEN env var is required");
```

---

### F-05-SEC-005 — Retell webhook sin validación de firma (High)

**Archivo:** `src/app/api/webhooks/retell/route.ts` (todo el archivo)

**Severidad**: High
**Tipo**: Missing webhook signature validation — cualquier POST al endpoint es procesado
**Impacto**: Un atacante puede enviar payloads falsos al endpoint `/api/webhooks/retell` haciendo creer al sistema que hay llamadas completadas, manipulando datos de leads y estados de cualificación.
**Evidencia**: El WhatsApp webhook SÍ valida firma HMAC (cuando `WHATSAPP_APP_SECRET` está configurado), pero el Retell webhook no hace ninguna validación.
**Esfuerzo de fix**: Medio (2-3h) — implementar validación HMAC con secret de Retell

**Fix textual (Retell usa header `x-retell-signature`):**
```typescript
const retellSecret = process.env.RETELL_WEBHOOK_SECRET;
const signature = req.headers.get("x-retell-signature");
if (retellSecret && signature) {
    const expected = crypto.createHmac("sha256", retellSecret)
        .update(rawBody).digest("hex");
    if (signature !== expected) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
}
```

---

### F-05-SEC-006 — WhatsApp webhook: validación de firma condicional, no obligatoria (Medium)

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts:38`
```typescript
if (appSecret && signature) {  // ← Solo valida si AMBOS existen
```

**Severidad**: Medium
**Tipo**: Optional security check — si `WHATSAPP_APP_SECRET` no está en env, el webhook acepta cualquier POST sin verificar
**Impacto**: Si el env var no está configurado en producción, el webhook es abierto.
**Esfuerzo de fix**: Mínimo (15min)

**Fix textual:**
```typescript
// Hacer la validación OBLIGATORIA si el secret está configurado:
const appSecret = process.env.WHATSAPP_APP_SECRET;
if (!appSecret) {
    console.warn("[WHATSAPP WEBHOOK] WARNING: WHATSAPP_APP_SECRET not set — signature validation disabled");
}
if (appSecret) {
    if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    // ... validar firma
}
```

---

## Archivos .env

| Estado | Detalle |
|--------|---------|
| `.env` en repositorio | **NO** — no existe ningún archivo `.env*` en el repo |
| `.env.example` | **NO existe** — ausente (finding de bajo impacto pero gap de documentación) |
| `.gitignore` cubre `.env*` | **SÍ** — línea `.env*` en `.gitignore` |

**Hallazgo F-05-SEC-007 — Falta `.env.example` (Low)**
No hay archivo `.env.example` que documente qué variables de entorno son necesarias. Esto obliga al desarrollador a inferirlas del código fuente o de los fallbacks hardcodeados. Facilita la creación de entornos mal configurados.

**Fix textual**: Crear `env.example` con todas las variables requeridas (sin valores reales):
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=tu-jwt-secret
REDIS_URL=redis://localhost:6379
WHATSAPP_APP_SECRET=tu-meta-app-secret
WHATSAPP_VERIFY_TOKEN=tu-verify-token
RETELL_WEBHOOK_SECRET=tu-retell-secret
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## .gitignore: cobertura

| Recurso | Cubierto | Notas |
|---------|----------|-------|
| `.env*` | SÍ | Línea `.env*` en .gitignore |
| `node_modules/` | SÍ | `/node_modules` |
| `.next/` | SÍ | `/.next/` |
| `/build` | SÍ | Carpeta de build |
| `*.pem` | SÍ | Certificados |
| `/brain/` | SÍ | Datos locales de agente |
| `/scratch/` | SÍ | Carpeta de scratch |
| `.claude/` | SÍ | Config interna Claude |
| `docs/` | SÍ | Docs de audit (rama auditoria) |
| `plans/` | SÍ | Planes de audit |
| `*.tsbuildinfo` | SÍ | TypeScript build info |
| Logs npm/yarn | SÍ | `npm-debug.log*`, etc. |

**Evaluación**: La cobertura de `.gitignore` es correcta y cubre los recursos sensibles más comunes. El punto débil no es el `.gitignore` sino que los secretos están en el código fuente mismo (no en `.env`), por lo que `.gitignore` no los protege.

---

## Findings de gestión de secretos

| ID | Tipo | Archivo(s) | Severidad | Esfuerzo |
|----|------|------------|-----------|----------|
| F-05-SEC-001 | JWT service_role hardcodeado | auth-config.ts, server.ts, tenant.ts, purge-demo.ts | **Critical** | Bajo (2h) |
| F-05-SEC-002 | JWT anon hardcodeado | auth-config.ts, client.ts, server.ts | **High** | Bajo (1h) |
| F-05-SEC-003 | URL BD producción hardcodeada | auth-config.ts, client.ts, server.ts, purge-demo.ts | **High** | Bajo (1h) |
| F-05-SEC-004 | WhatsApp verify token hardcodeado | webhooks/whatsapp/route.ts | **High** | Mínimo (30min) |
| F-05-SEC-005 | Retell webhook sin validación firma | webhooks/retell/route.ts | **High** | Medio (2-3h) |
| F-05-SEC-006 | WhatsApp firma validación condicional | webhooks/whatsapp/route.ts | **Medium** | Mínimo (15min) |
| F-05-SEC-007 | Falta .env.example | (raíz proyecto) | **Low** | Mínimo (30min) |

---

**Status:** DONE
**Summary:** 2 JWTs de Supabase service_role hardcodeados en código de producción (Critical). 4 findings adicionales High. El mayor riesgo inmediato es F-05-SEC-001: el JWT service_role hardcodeado + la URL de producción da acceso completo a la base de datos a cualquiera con acceso al repositorio. Rotar el JWT inmediatamente.
