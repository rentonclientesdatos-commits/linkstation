---
title: "DA-3 — Security Deep Audit"
date: 2026-05-18
agent: DA-3 Security Deep (Sonnet)
methodology: Análisis estático profundo — sin runtime
scope: src/app/api/**/route.ts · webhooks · next.config.ts · docker-compose.yml · Dockerfile · npm audit
phase: deep-second-pass
related_quick_scan:
  - docs/security/secrets-and-env.md
  - docs/security/owasp-quick-check.md
  - docs/audit/05-browser-verification.md
  - docs/audit/05-tokens-exposed.md
  - docs/audit/findings-summary.md
status: DONE
---

# DA-3 — Security Deep Audit

> Análisis estático de segunda vuelta. Sin modificaciones de código. Sin runtime.
> Profundización de findings F-05-XXX + nuevos findings DA-3-XXX.

---

## Perímetro analizado

| Componente | Archivos revisados |
|---|---|
| API Routes | 20 archivos `src/app/api/**/route.ts` |
| Webhooks | 5 endpoints (`whatsapp`, `retell`, `retell/tools`, `crm`, `workflow/[...]`) |
| Infraestructura | `next.config.ts`, `docker-compose.yml`, `Dockerfile` |
| Crypto / Auth | `src/lib/supabase/server.ts`, `src/lib/auth-config.ts` |
| Scripts | `src/scripts/*.ts` (migration scripts) |
| Dependencias | `npm audit --json` — análisis completo |
| XSS | Búsqueda global de `dangerouslySetInnerHTML`, widget embed |
| SSRF | Todos los `fetch()` con URLs dinámicas |
| SQL Injection | Búsqueda de `sql.unsafe(`, `exec_sql`, template strings en SQL |
| File I/O en API | Búsqueda de `readFileSync`, `path.join` en routes |

---

## Resumen ejecutivo — Top vectors

| Prioridad | Vector | Severidad | Finding(s) |
|---|---|---|---|
| 1 | **Cron/sweep endpoints públicos sin autenticación** — cualquier actor puede disparar el orquestador | Critical | DA-3-001 |
| 2 | **exec_sql vía SSRF en tenant/migrate** — cookie controlable ejecuta SQL en Supabase remoto | Critical | DA-3-002 (profundiza F-05-OWASP-004/011) |
| 3 | **Test endpoint que crea datos en producción sin auth** — `/api/test/orchestrator` completamente abierto | Critical | DA-3-003 |
| 4 | **Widget embed: XSS blind por `id` sin sanitizar** — JS inyectable en sitios de terceros | High | DA-3-004 (profundiza F-05-OWASP-003) |
| 5 | **Todos los webhooks de Retell sin firma** — manipulación de leads, citas y transcripciones | High | DA-3-005 (profundiza F-05-SEC-005) |
| 6 | **Google OAuth: tokens almacenados en JSONB del tenant sin cifrado** | High | DA-3-006 |
| 7 | **CRON appointments reminder abierto sin auth** — enumeración y manipulación de datos PII | High | DA-3-007 |
| 8 | **axios 1.14.0: 15 CVEs (SSRF + Prototype Pollution + Header Injection)** | High | DA-3-CVE-001 |
| 9 | **next 16.1.6: 19 CVEs (SSRF CVSS 8.6, middleware bypass CVSS 8.1, DoS, XSS)** | High | DA-3-CVE-002 |
| 10 | **Math.random() para A/B split en orquestador** — no criptográfico, sesgable | Medium | DA-3-008 |

---

## Tabla maestra de Webhooks — Signature validation

| Endpoint | Path | Método | Valida firma | Tipo validación | Secreto en env | Notas |
|---|---|---|---|---|---|---|
| WhatsApp (GET) | `/api/webhooks/whatsapp` | GET | Parcial | Token literal comparación `===` | ❌ hardcodeado en código | Timing attack posible; `===` no es `timingSafeEqual` |
| WhatsApp (POST) | `/api/webhooks/whatsapp` | POST | Condicional | HMAC-SHA256 (`x-hub-signature-256`) | ⚠️ solo si `WHATSAPP_APP_SECRET` presente | Si env no está → validación omitida |
| Retell (eventos) | `/api/webhooks/retell` | POST | ❌ NO | — | — | Acepta cualquier POST sin verificación |
| Retell (tools) | `/api/webhooks/retell/tools` | POST | ❌ NO | — | — | Acepta cualquier POST; puede agendar citas, cancelar, reschedule |
| CRM | `/api/webhooks/crm` | POST | ❌ Parcial | Solo valida `x-tenant-id` header | N/A | Sin firma; cualquiera que sepa el tenant_id puede ingestar leads |
| Workflow dinámico | `/api/webhooks/workflow/[workflowId]/[path]/[nodeId]` | ANY | ❌ NO | Valida workflowId en DB | N/A | Acepta GET/POST/PUT/PATCH/DELETE/HEAD sin auth |

**Estado global webhooks: 0/6 con validación completa de firma.** Solo WhatsApp tiene HMAC condicional.

---

## Tabla maestra de API Routes — Input validation

| Route | Auth check | Body validado | Zod/Yup | Observaciones de seguridad |
|---|---|---|---|---|
| `POST /api/leads/ingest` | API Key via `x-api-key` header | ✅ Parcial | No — validación manual | `metadata: { ...payload.extra, raw_payload: payload }` — spread de payload completo sin sanitizar |
| `POST /api/webhooks/crm` | `x-tenant-id` header | ✅ Zod `LeadWebhookSchema` | Sí | Buena validación; sin firma |
| `POST /api/calls/manual` | `getSupabaseServerClient()` session | ✅ Zod `callSchema` | Sí | Bien protegido |
| `POST /api/tenant/migrate` | Cookie `af-tenant-url` + `af-tenant-key` | ❌ Sin schema | No | Cookie controlable → SSRF; `exec_sql` con SQL estático (MIGRATION_SQL constante, no user input) |
| `GET /api/tenant/migrate` | ❌ Sin auth | ❌ Sin schema | No | **Devuelve MIGRATION_SQL completo sin autenticación** |
| `POST /api/orchestration/deploy` | `getSupabaseServerClient()` | Parcial | No | Confía en `tenantId`/`workflowId` del body |
| `POST /api/orchestration/publish` | `getAdminSupabaseClient()` | ✅ Zod `publishSchema` | Sí | Bien estructurado |
| `GET /api/orchestration/graph` | `getAdminSupabaseClient()` | N/A | N/A | Sin validación adicional de ownership del workflow |
| `GET /api/orchestration/sweep` | ❌ Sin auth ninguna | N/A | N/A | **Endpoint público que ejecuta el orquestador** |
| `GET /api/cron/appointments/reminders` | ❌ Sin auth ninguna | N/A | N/A | **Endpoint público que envía WhatsApp a leads PII** |
| `GET /api/test/orchestrator` | ❌ Sin auth ninguna | N/A | N/A | **Endpoint de test abierto que crea leads/workflows en producción** |
| `POST /api/webhooks/retell` | ❌ Sin auth | Sin schema Zod | No | Sin firma; SQL via Supabase client (parametrizado) |
| `POST /api/webhooks/retell/tools` | ❌ Sin auth | Sin schema Zod | No | Permite agendar/cancelar citas sin verificación |
| `POST /api/webhooks/workflow/[...]` | ❌ Sin auth de usuario | Parcial | No | Valida workflowId en DB; sin firma de origen |
| `GET /api/admin/tenants/[id]/client-sql` | `getSupabaseServerClient()` session | Valida tenantId | No | Usa `path.join(process.cwd(), ...)` — path fijo, seguro |
| `GET /api/integrations/google/auth` | ❌ Solo valida `tenantId` en query | No | No | `tenantId` viene de query param sin autenticación previa |
| `GET /api/integrations/google/callback` | N/A (OAuth callback) | `code`, `state` | No | `state=tenantId` no se verifica criptográficamente |
| `GET /api/widget/embed.js` | ❌ Sin auth | `id` query param | No | `id` interpola directo en JS: `var widgetId = "${id}"` |
| `GET /api/docs/content` | ❌ Sin auth | N/A | N/A | **Sirve `MASTER_DOSSIER.md` sin auth alguna** |

---

## SSRF Analysis

### DA-3-002 — SSRF confirmado en `/api/tenant/migrate` (profundiza F-05-OWASP-011)

**Archivo**: `src/app/api/tenant/migrate/route.ts:247-263`
**Severidad**: Critical
**Esfuerzo**: Medio (3-4h)

**Código vulnerable:**
```typescript
// route.ts:247-263
const tenantUrl = cookieStore.get("af-tenant-url")?.value;
const tenantKey = cookieStore.get("af-tenant-key")?.value;
// ...
const response = await fetch(`${tenantUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
        "apikey": tenantKey,
        "Authorization": `Bearer ${tenantKey}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: MIGRATION_SQL }),
});
```

**Vector de explotación reproducible:**

La cookie `af-tenant-url` se establece en el cliente cuando un admin selecciona un tenant. Si un atacante puede modificar la cookie (JavaScript accesible, XSS previo, o con acceso a cookies del browser del admin), puede redirigir el fetch a cualquier servidor interno:

```
POST /api/tenant/migrate HTTP/1.1
Cookie: af-tenant-url=http://169.254.169.254/latest/meta-data; af-tenant-key=fake

→ Server ejecuta fetch("http://169.254.169.254/latest/meta-data/rest/v1/rpc/exec_sql", POST)
→ AWS/GCP metadata service responde
→ El body de respuesta es devuelto en la respuesta de la API (en el fallback de error)
```

**Escenarios SSRF:**
1. **Cloud metadata** — si el host es AWS/GCP, `http://169.254.169.254` devuelve credenciales temporales
2. **Redis** — `http://redis:6379` (en docker-compose, el servicio redis es accesible por nombre)
3. **Supabase interno** — otras instancias de Supabase en la red del VPS
4. **localhost** — servicios locales del servidor (admin panels, prometheus, etc.)

**Fix textual:**
```typescript
const ALLOWED_SUPABASE_DOMAINS = ['supabase.co', 'linkstation.ai', 'supabase.in'];

function validateTenantUrl(url: string): void {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error("Invalid tenant URL"); }
    
    const hostname = parsed.hostname;
    const isAllowed = ALLOWED_SUPABASE_DOMAINS.some(d => hostname.endsWith(d));
    if (!isAllowed || parsed.protocol !== 'https:') {
        throw new Error(`Tenant URL not in allowlist: ${hostname}`);
    }
}
// Llamar antes del fetch:
validateTenantUrl(tenantUrl);
```

**Nota adicional:** El `GET /api/tenant/migrate` devuelve `MIGRATION_SQL` completo sin autenticación. Aunque el SQL es estático (no user input), expone el schema completo de la BD a cualquiera que haga GET.

---

### Otros vectores SSRF

| Ubicación | URL dinámica | Controlable por usuario | Severidad |
|---|---|---|---|
| `src/lib/integrations/zoho.ts:51-64` | `path.startsWith("http") ? path : base + path` | Solo si el código llama con path externo | Low — depende del caller |
| `src/lib/integrations/crm/providers/zoho.ts:51-52` | Igual | Igual | Low |
| `next` GHSA-c4j6-fc7j-m34r (CVSS 8.6) | WebSocket upgrade | Via request headers | High (CVE en framework) |
| `axios` múltiples SSRF CVEs | `NO_PROXY` bypass | Via proxy config | High (ver CVE section) |

---

## XSS Analysis

### DA-3-004 — XSS en widget embed (profundiza F-05-OWASP-003)

**Archivo**: `src/app/api/widget/embed.js/route.ts:16`
**Severidad**: High
**Esfuerzo**: Bajo (1h)

**Código vulnerable:**
```typescript
const id = searchParams.get("id");
// ...
const script = `
(function() {
    var widgetId = "${id}";    // ← id SIN sanitizar
    var baseUrl = "${baseUrl}"; // ← baseUrl también de env
```

**Vector de explotación reproducible:**

Un atacante embebe el script en su sitio con un `id` malicioso:
```html
<script src="https://app.linkstation.ai/api/widget/embed.js?id=%22%3B%20alert(document.cookie)%3B%20var%20x%3D%22"></script>
```

Que se decodifica como `id = "; alert(document.cookie); var x="`, resultando en:
```javascript
var widgetId = ""; alert(document.cookie); var x="";
```

El código JavaScript se ejecuta en el contexto del sitio web de la empresa cliente que ha embebido el widget. Impacto: robo de cookies de usuarios del sitio cliente, defacement, redirección, keylogging.

**Fix textual:**
```typescript
// Validar que id sea un UUID válido antes de usarlo:
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!id || !UUID_REGEX.test(id)) {
    return new NextResponse("Invalid widget ID format", { status: 400 });
}
// Ahora id solo puede ser un UUID seguro; la interpolación no puede inyectar código.
```

**Nota:** La segunda interpolación `var baseUrl = "${baseUrl}"` usa `process.env.NEXT_PUBLIC_APP_URL` o el host derivado de la request — no user input. Seguro en condiciones normales, pero si `NEXT_PUBLIC_APP_URL` contiene caracteres especiales (misconfiguration), también sería explotable.

---

### `dangerouslySetInnerHTML` — Inventario completo

| Archivo | Línea | Contenido del HTML | Origen del dato | ¿Seguro? |
|---|---|---|---|---|
| `src/app/layout.tsx:24` | 24 | Script de detección de tema (`localStorage.getItem('ui-theme')`) | Estático en código | ✅ Sí — sin interpolación de user input |

**Conclusión:** Solo existe un uso de `dangerouslySetInnerHTML` y es un script completamente estático. No hay riesgo de XSS por esta vía.

---

## SQL Injection Deep

### Inventario de `sql.unsafe()` — scripts de migración

| Archivo | Línea | Contexto | SQL controlado por user? |
|---|---|---|---|
| `src/scripts/run-migration.ts:14` | 14 | `sql.unsafe(migrationSql)` donde `migrationSql` es `fs.readFileSync(...)` de un archivo local | NO — archivo del repo |
| `src/scripts/migrate-scheduling.ts:26` | 26 | `sql.unsafe(query)` donde `query` es un string literal definido en el script | NO — hardcodeado |
| `src/scripts/migrate-agents.ts:32` | 32 | `sql.unsafe(query)` idem | NO — hardcodeado |

**Conclusión:** Los tres usos de `sql.unsafe()` ejecutan SQL estático definido en el código, no input del usuario. No son vulnerabilidades de SQL injection en sentido estricto — pero son vulnerabilidades de infraestructura (hardcoded credentials + SQL sin parametrizar sobre producción).

### `exec_sql` en `/api/tenant/migrate` — Análisis completo

**Archivo**: `src/app/api/tenant/migrate/route.ts:263-271`

El body enviado a `exec_sql` es `{ sql: MIGRATION_SQL }` donde `MIGRATION_SQL` es una constante definida en el propio archivo (líneas 12-241). **No hay interpolación de user input en el SQL.** El SQL es completamente estático.

**Sin embargo, el vector de riesgo es SSRF (ver DA-3-002), no SQL injection** — el atacante no controla el SQL sino el destino de la request.

### Template strings con user input en SQL

Búsqueda global: no se encontraron interpolaciones `${variable}` dentro de strings SQL en código de aplicación (rutas API). Las queries van via Supabase JS query builder (parametrizado automáticamente).

---

## Security Headers Audit

**Archivo**: `next.config.ts` (lines 1-20)

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',  // ← Generoso; facilita data exfiltration
    },
  },
  async rewrites() { ... }
  // ← Sin headers() con CSP, HSTS, X-Frame-Options, etc.
};
```

| Header | Estado | Riesgo |
|---|---|---|
| `Content-Security-Policy` | ❌ Ausente | XSS en el dashboard admin |
| `Strict-Transport-Security` (HSTS) | ❌ Ausente | Downgrade a HTTP posible |
| `X-Frame-Options` | ❌ Ausente | Clickjacking del dashboard |
| `X-Content-Type-Options` | ❌ Ausente | MIME sniffing attacks |
| `Referrer-Policy` | ❌ Ausente | URLs internas en referrer headers |
| `Permissions-Policy` | ❌ Ausente | Acceso no restringido a cámara/mic/geo |
| `Cross-Origin-Opener-Policy` | ❌ Ausente | Cross-origin JS access posible |
| `Cross-Origin-Resource-Policy` | ❌ Ausente | Cross-origin embedding sin restricción |

**Profundización F-05-OWASP-006**: La ausencia de CSP es especialmente relevante porque:
1. El widget embed genera JS que se ejecuta en sitios de terceros — sin `frame-ancestors` ningún sitio puede embeber el iframe del widget sin restricción
2. El dashboard procesa datos PII sin X-Frame-Options — susceptible a clickjacking
3. La ruta `/api/widget/embed.js` tiene `Cache-Control: public, max-age=3600` sin `Content-Type-Options: nosniff`

**Fix textual completo para `next.config.ts`:**
```typescript
async headers() {
    return [
        {
            source: '/(.*)',
            headers: [
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                {
                    key: 'Content-Security-Policy',
                    value: [
                        "default-src 'self'",
                        "script-src 'self' 'unsafe-inline'",  // unsafe-inline needed for dangerouslySetInnerHTML
                        "style-src 'self' 'unsafe-inline'",
                        "img-src 'self' data: https:",
                        "connect-src 'self' https://api-db.linkstation.ai wss://api-db.linkstation.ai",
                        "frame-ancestors 'none'",
                    ].join('; ')
                },
            ],
        },
    ];
}
```

---

## CORS Audit

**Búsqueda global de `Access-Control-Allow-Origin`**: 0 resultados en `src/`.

Next.js App Router no configura CORS por defecto. Las API routes no tienen CORS headers explícitos, lo que significa:

- Las API routes solo son accesibles desde el mismo origen (comportamiento por defecto del browser)
- No hay `Access-Control-Allow-Origin: *` — correcto
- No hay `credentials: true` con wildcard — correcto

**Única preocupación**: `/api/widget/embed.js` devuelve JavaScript servido a sitios de terceros. No necesita CORS headers porque es un `<script src>` (cross-origin script load), no un fetch con credentials. Funcionamiento correcto.

**Estado CORS: Sin findings críticos.** El comportamiento por defecto de Next.js es restrictivo.

---

## Crypto Audit

### `Math.random()` — uso para decisiones de seguridad

| Ubicación | Uso | ¿Impacto de seguridad? |
|---|---|---|
| `src/lib/core/orchestrator.ts:840` | A/B split de agentes | Medium — A/B no es reproducible ni seguro |
| `src/lib/core/processors/QualificationProcessor.ts:138` | Selección de variante A/B | Medium — idem |
| `src/lib/actions/demo.ts:29,55` | Sufijo de campaña demo + teléfono fake | Low — solo datos demo |
| `src/components/orchestrator/AgentFlowBuilder.tsx:439,453,578` | IDs de UI (frontend) | Low — frontend solo |
| `src/app/dashboard/settings/KpiBuilder.tsx:16` | ID de KPI local | Low — UI local |
| `src/components/onboarding/SequenceCanvas.tsx:227` | Posición de nodo en canvas | Low — UI local |

**DA-3-008**: El uso de `Math.random()` en `orchestrator.ts:840` para A/B split de agentes significa que la asignación de variantes no es reproducible, no puede auditarse, y en teoría podría sesgarse si se conoce el seed del engine V8. Para propósitos de negocio (reproductibilidad, auditoría de campañas) debería usarse `crypto.randomUUID()` y persistir la asignación en BD.

### Comparación de secrets con `===` — Timing Attack

**Archivo**: `src/app/api/webhooks/whatsapp/route.ts:20`
```typescript
if (mode === "subscribe" && token === VERIFY_TOKEN) {
```

El verify token se compara con `===` (string equality). JavaScript string comparison hace short-circuit cuando los caracteres difieren — esto crea una vulnerabilidad de timing attack. Con suficientes peticiones y medición precisa, un atacante puede inferir el token carácter a carácter.

**Fix textual:**
```typescript
import { timingSafeEqual } from 'crypto';
const tokenBuffer = Buffer.from(token || '');
const verifyBuffer = Buffer.from(VERIFY_TOKEN);
const isValid = tokenBuffer.length === verifyBuffer.length && 
                timingSafeEqual(tokenBuffer, verifyBuffer);
if (mode === "subscribe" && isValid) { ... }
```

**Severidad**: Low-Medium — el timing attack en redes remotas es difícil de ejecutar, pero la comparación segura es trivial de implementar.

### bcrypt / argon2 para passwords

La autenticación de usuarios es delegada completamente a Supabase Auth (GoTrue). No hay gestión propia de passwords en el código de la aplicación. **Correcto — sin finding.**

### `crypto.randomUUID()` para tokens seguros

No se detectó uso de `crypto.randomUUID()` para generación de tokens de sesión o API keys. La generación de `api_key` para tenants no se encontró en el código auditado (presumiblemente se gestiona desde el panel de admin directamente en Supabase).

---

## File Uploads Audit

**Búsqueda exhaustiva de upload endpoints**: No se encontraron endpoints de carga de archivos en `src/app/api/`. No existe funcionalidad de file upload en el proyecto actualmente.

La única operación con archivos es en `src/app/api/admin/tenants/[id]/client-sql/route.ts` que lee un archivo del servidor (`fs.readFileSync`) con ruta fija basada en `process.cwd()` — no hay path traversal posible aquí.

**Estado File Uploads: Sin findings** — funcionalidad no implementada.

---

## Docker / Compose Audit

### Dockerfile (profundidad)

| Check | Estado | Detalle |
|---|---|---|
| USER root en runner stage | ✅ NO | `USER nextjs` (UID 1001) en stage final |
| USER no-root en builder/deps | ⚠️ Root | Stages `deps` y `builder` corren como root — aceptable para build |
| EXPOSE sano | ✅ | Solo 3000 expuesto |
| CMD seguro | ✅ | `node server.js` — sin shell expansion |
| `--max-old-space-size=4096` | ⚠️ | 4GB RAM para build en VPS pequeño; puede ser causa de OOM en deployments |
| Secrets en ARG | ⚠️ | `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_ANON_KEY` como ARG — se incrustan en imagen; `docker history` los revela |
| Multi-stage clean | ✅ | Solo se copia `.next/standalone` al runner — sin node_modules ni source |

**DA-3-009 — Secrets en `docker history` (nuevo finding)**:
Los `ARG` de build-time (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) quedan visibles en el historial de la imagen Docker:
```
docker history af-dashboard --no-trunc
```
Cualquiera con acceso a la imagen (registry, `docker save`) puede recuperar estos valores. Aunque `NEXT_PUBLIC_*` son públicos por diseño, esto confirma que la URL y anon key de Supabase son accesibles a nivel de imagen.

### docker-compose.yml (profundidad)

| Check | Estado | Finding |
|---|---|---|
| Redis sin `--requirepass` | ❌ Sin password | `redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru` — sin autenticación |
| Redis port `6379:6379` | ❌ Expuesto a host | Cualquier proceso del host (o red si el firewall lo permite) puede conectarse a Redis |
| Redis `bind` no restringido | ❌ Escucha en 0.0.0.0 | Sin `bind 127.0.0.1` explícito |
| Volumen redis_data | ✅ Local | Sin montaje de secretos |
| Env vars en `environment:` | ⚠️ Parcial | Los valores vienen de `${VAR}` del shell/env file — correcto, pero si `.env` está ausente, valores vacíos |
| `SERVICE_ROLE_KEY` redundante | ⚠️ | `dashboard` service tiene tanto `SUPABASE_SERVICE_ROLE_KEY` como `SERVICE_ROLE_KEY` — el código usa ambos como fallback |

**Profundización F-05-OWASP-005 (Redis)**:
Vector de explotación con Redis sin auth:
1. Si el host tiene otros tenants o servicios, cualquier proceso puede conectarse vía `redis-cli -h localhost`
2. Un atacante con RCE en otro container del mismo host puede leer todas las colas BullMQ
3. BullMQ encola jobs con `leadId`, `tenantId`, `action` — un atacante puede insertar jobs maliciosos o cancelar jobs existentes
4. Si Redis está accesible desde internet (puerto 6379 sin firewall), es explotable directamente

**Fix textual docker-compose.yml:**
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass "${REDIS_PASSWORD}" --bind 127.0.0.1
  ports: []  # Eliminar binding de host en producción
```

---

## CVEs Deep — Análisis completo `npm audit`

### Resultado del audit (2026-05-18)

```
npm audit summary: 0 critical, 14 high, 9 moderate = 23 total
```

*(Nota: el quick scan anterior reportó 20 — ha aumentado a 23 con nuevos CVEs publicados)*

### HIGH — Paquetes directos

#### DA-3-CVE-001 — `axios@1.14.0` (Directo) — 15 CVEs

| CVE/Advisory | CVSS | CWE | Título | Vector |
|---|---|---|---|---|
| GHSA-pmwg-cvhr-8vh7 | 7.2 | CWE-918 | NO_PROXY bypass via 127.0.0.0/8 → **SSRF** | AV:N/AC:L/PR:N/UI:N |
| GHSA-62hf-57xw-28j9 | 7.5 | CWE-674 | unbounded recursion `toFormData` → **DoS** | AV:N/AC:L/PR:N/UI:N |
| GHSA-pf86-5x62-jrwf | 7.4 | CWE-1321 | Prototype Pollution → Response Tampering, Data Exfiltration | AV:N |
| GHSA-6chq-wfr3-2hj9 | 7.4 | CWE-113/1321 | Header Injection via Prototype Pollution | AV:N |
| GHSA-q8qp-cvcw-x6jj | 7.4 | CWE-1321 | Prototype Pollution → credential injection, request hijacking | AV:N |
| GHSA-3w6x-2g7m-8v23 | 6.5 | CWE-915/1321 | Invisible JSON Response Tampering via `parseReviver` | AV:N/AC:H |
| GHSA-m7pr-hjqh-92cm | 6.8 | CWE-918 | no_proxy bypass via IP alias → **SSRF** | AV:N/AC:H |
| GHSA-3p68-rc4w-qgx5 | 4.8 | CWE-918 | NO_PROXY Hostname Normalization Bypass → SSRF | AV:N/AC:H |
| GHSA-fvcv-3m26-pcqx | 4.8 | CWE-918 | Unrestricted Cloud Metadata Exfiltration via Header Injection | AV:N |
| GHSA-w9j2-pvgh-6h63 | 4.8 | CWE-287/1321 | Auth Bypass via Prototype Pollution in `validateStatus` | AV:N |
| GHSA-xx6v-rp6x-q39c | 5.4 | CWE-1321 | XSRF Token Cross-Origin Leakage | AV:N |
| GHSA-445q-vr5w-6q77 | 5.3 | CWE-93 | CRLF Injection in multipart/form-data | AV:N |
| GHSA-5c9x-8gcm-mpgx | 5.3 | CWE-770 | Upload bypass maxBodyLength | AV:N |
| GHSA-vf2m-468p-8v99 | 5.3 | CWE-770 | Response bypass maxContentLength | AV:N |
| GHSA-xhjh-pmcv-23jw | 3.7 | CWE-116 | Null Byte Injection | AV:N |

**Fix**: `npm install axios@1.15.2` o superior.

---

#### DA-3-CVE-002 — `next@16.1.6` (Directo) — 19 CVEs

| CVE/Advisory | CVSS | Título | Impacto |
|---|---|---|---|
| GHSA-c4j6-fc7j-m34r | 8.6 | SSRF via WebSocket upgrades | **Critical** para esta app |
| GHSA-492v-c6pp-mqqv | 8.1 | Middleware bypass via dynamic route parameter injection | **Critical** — auth bypass |
| GHSA-q4gf-8mx6-v5v3 | 7.5 | DoS con Server Components | High |
| GHSA-8h8q-6873-q5fj | 7.5 | DoS con Server Components | High |
| GHSA-26hh-7cqf-hhc6 | 7.5 | Middleware bypass (incomplete fix) | High |
| GHSA-267c-6grr-h53f | 7.5 | Middleware bypass via segment-prefetch | High |
| GHSA-36qx-fr4f-26g5 | 7.5 | Middleware bypass in Pages Router i18n | High |
| GHSA-mg66-mrh9-m8jx | 7.5 | DoS via Cache Components connection exhaustion | High |
| GHSA-ggv3-7p47-pfv8 | 0* | HTTP request smuggling in rewrites | High conceptual |
| GHSA-gx5p-jg67-6x7h | 6.1 | XSS in `beforeInteractive` scripts | Medium |
| GHSA-ffhc-5mcf-pf4q | 4.7 | XSS via CSP nonces in App Router | Medium |
| Resto | 3.7-5.9 | Cache poisoning, DoS variados | Low-Medium |

**Fix**: `npm install next@latest` (actualmente 15.x estable o 16.3.x si ya estable). Verificar breaking changes antes de actualizar.

---

### HIGH — Paquetes transitivos críticos

| Paquete | Transitivo de | CVSS max | Advisory | Impacto |
|---|---|---|---|---|
| `langsmith@<=0.5.26` | `@langchain/core` | 7.1 | GHSA-3644-q5cj-c5c7 | Deserialization de prompts públicos sin trust boundary — si la app usa LangSmith Hub, prompts pueden ser manipulados |
| `langsmith@<=0.5.26` | idem | 5.6 | GHSA-fw9q-39r9-c252 | Prototype Pollution via lodash `set()` |
| `langsmith@<=0.5.26` | idem | 5.3 | GHSA-rr7j-v2q5-chgv | Streaming token events bypass output redaction |
| `fast-uri@<=3.1.1` | multiple | 7.5 | GHSA-q3j6-qgpj-74h6 | Path traversal via percent-encoded dots |
| `fast-uri@<=3.1.1` | multiple | 7.5 | GHSA-v39h-62p7-jpjc | Host confusion via encoded authority delimiters |
| `minimatch@<=3.1.3` | multiple | 7.5 | GHSA-7r86-cg39-jmmj | ReDoS via GLOBSTAR segments |
| `hono@<=4.12.17` | `@anthropic-ai/claude-code` | 7.5 | GHSA-q5qw-h33p-qvwr | Arbitrary file access via serveStatic |
| `@hono/node-server@<=1.19.12` | `@anthropic-ai/claude-code` | 7.5 | GHSA-wc8c-qw6v-h7f6 | Auth bypass via encoded slashes |
| `express-rate-limit@8.0.1-8.5.0` | multiple | 7.5 | GHSA-46wh-pxpv-q5gq | IPv4-mapped IPv6 bypass rate limiting |
| `picomatch@<=2.3.1` | multiple | 7.5 | GHSA-c2c7-rcm5-vvqj | ReDoS via extglob quantifiers |
| `flatted@<=3.4.1` | multiple | 7.5 | GHSA-25h7-pfq9-p65f | DoS via unbounded recursion in parse() |
| `flatted@<=3.4.1` | multiple | — | GHSA-rf6f-7fwh-wjgh | Prototype Pollution via parse() |
| `path-to-regexp@8.0.0-8.3.0` | multiple | 7.5 | GHSA-j3q9-mxjg-w52f | ReDoS via sequential optional groups |

**Nota sobre `@anthropic-ai/claude-code`**: Este paquete de devDependencies arrastra `hono` y `@hono/node-server` con CVEs High. Aunque es devDependency, si queda en el `node_modules` del build de producción (depende de la configuración de Dockerfile), aporta superficie de ataque innecesaria.

### MODERATE — Relevantes

| Paquete | Advisory | Impacto | Nota |
|---|---|---|---|
| `bullmq` (directo) | Sin CVE propio — afectado transitivamente | N/A | Marcado como moderate — revisar |
| `uuid@<11` | GHSA: Missing buffer bounds check | Low-Medium | Transitivo |
| `postcss` | XSS via `</style>` unescaped | Low | Build-time, no runtime |
| `follow-redirects` | Auth headers leaked en cross-domain redirect | Medium | Usado por axios |
| `ws` | Uninitialized memory disclosure | Medium | WebSocket — usado por Supabase realtime |

---

## Profundización de Findings del Quick Scan

### F-05-OWASP-003 profundizado → DA-3-004 (Widget XSS)
Ver sección XSS Analysis. Confirmado y vector detallado.

### F-05-OWASP-004 profundizado → DA-3-002 (exec_sql)
**SQL injection: NO confirmado** — el SQL enviado a `exec_sql` es el constante `MIGRATION_SQL`. Sin user input.
**SSRF: SÍ confirmado y elevado** — la URL y key vienen de cookies, no validadas contra allowlist.

### F-05-OWASP-005 profundizado (Redis sin auth)
Vector adicional: BullMQ workers leen de Redis — si Redis es comprometido, se pueden insertar jobs fraudulentos con cualquier `tenantId`/`leadId` y `action`. El worker ejecutará el job sin validar el origen.

### F-05-OWASP-006 profundizado (Security Headers)
Inventario completo en sección Security Headers Audit — 8 headers ausentes, todos con fix en la misma llamada a `next.config.ts`.

### F-05-OWASP-011 profundizado → DA-3-002
Elevado de "High (análisis pendiente)" a **Critical (confirmado)** con vector reproducible.

### F-05-SEC-005 profundizado (Retell sin firma)
**NOTA NUEVA**: Se confirmó que hay DOS endpoints de Retell sin validación:
1. `/api/webhooks/retell` — manipula llamadas, transcripciones, estado de leads
2. `/api/webhooks/retell/tools` — permite agendar/cancelar/reprogramar CITAS directamente

El endpoint de tools es especialmente crítico: un atacante puede POST a `/api/webhooks/retell/tools` con `{"name": "cancel_appointment", "args": {"appointmentId": "uuid"}, "call": {"metadata": {}}}` y cancelar cualquier cita del sistema sin autenticación.

---

## Nuevos Findings DA-3-XXX

### DA-3-001 — Cron/Sweep endpoints públicos sin autenticación (Critical)

**Archivos:**
- `src/app/api/orchestration/sweep/route.ts:14` — `export async function GET()`
- `src/app/api/cron/appointments/reminders/route.ts:47` — `export async function GET()`

**Severidad**: Critical
**Esfuerzo**: Bajo (1-2h)

**Impacto:**
- `/api/orchestration/sweep`: Cualquier actor puede disparar el orquestador de todos los tenants, ejecutando planned_actions pendientes antes de tiempo o múltiples veces (idempotencia no garantizada).
- `/api/cron/appointments/reminders`: Cualquier actor puede forzar el envío de recordatorios WhatsApp a TODOS los leads con citas pendientes, enviando spam de mensajes y revelando números de teléfono en los logs. La respuesta de la API incluye `lead_name` y status de envío.

**Vector de explotación:**
```bash
# Sin credenciales, desde internet:
curl https://app.linkstation.ai/api/orchestration/sweep
# → Responde con lista de leads procesados, acciones ejecutadas
curl https://app.linkstation.ai/api/cron/appointments/reminders
# → Envía WhatsApp a todos los leads; responde con nombres, estados
```

**Fix textual:**
```typescript
// Opción A: Secret de cron compartido
export async function GET(req: Request) {
    const cronSecret = req.headers.get('x-cron-secret') || 
                       new URL(req.url).searchParams.get('secret');
    if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... resto del handler
}

// Opción B: Vercel Cron authorization header (si se usa Vercel)
// Vercel inyecta automáticamente Authorization: Bearer CRON_SECRET
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }
```

---

### DA-3-002 — SSRF en `/api/tenant/migrate` via cookie sin validar (Critical)

Ver sección SSRF Analysis.

---

### DA-3-003 — Test endpoint de orquestador abierto en producción (Critical)

**Archivo**: `src/app/api/test/orchestrator/route.ts`
**Severidad**: Critical
**Esfuerzo**: Mínimo (30min)

**Impacto:**
El endpoint `GET /api/test/orchestrator` **no tiene ninguna autenticación**. Ejecuta:
1. Consulta workflows del tenant `"test-tenant-123"` (hardcodeado)
2. Si no existe, **crea un workflow y una regla en la base de datos de producción**
3. **Crea un lead real** con datos hardcodeados (`telefono: "+34123456789"`, `email: "test@play.com"`)
4. Ejecuta el orquestador sobre ese lead

Cualquier actor puede hacer `GET /api/test/orchestrator` y llenar la base de datos con leads y workflows de prueba. El orquestador puede intentar llamar al `+34123456789` real.

**Fix textual:**
```typescript
// Opción A: Eliminar el endpoint completamente en producción
// Opción B: Proteger con autenticación admin + solo en desarrollo
export async function GET(req: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }
    // ... resto
}
```

---

### DA-3-004 — XSS en widget embed via `id` sin sanitizar (High)

Ver sección XSS Analysis.

---

### DA-3-005 — Retell tools webhook sin firma — agendar/cancelar citas sin auth (High)

**Archivo**: `src/app/api/webhooks/retell/tools/route.ts:11`
**Severidad**: High
**Esfuerzo**: Medio (2-3h)

Profundización de F-05-SEC-005. El endpoint de tools es más crítico que el de eventos: permite manipulación directa de citas de negocio.

**Fix textual:**
```typescript
// Retell usa header 'x-retell-signature' con HMAC-SHA256
export async function POST(req: Request) {
    const rawBody = await req.text();
    const secret = process.env.RETELL_WEBHOOK_SECRET;
    const sig = req.headers.get('x-retell-signature');
    
    if (!secret) throw new Error("RETELL_WEBHOOK_SECRET not configured");
    if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const payload = JSON.parse(rawBody);
    // ... resto del handler
}
```

---

### DA-3-006 — Google OAuth tokens almacenados en JSONB sin cifrado (High)

**Archivo**: `src/app/api/integrations/google/callback/route.ts:35-43`
**Severidad**: High
**Esfuerzo**: Alto (4-6h)

```typescript
const updatedConfig = {
    ...currentConfig,
    google: {
        connected: true,
        tokens: tokens,  // ← access_token + refresh_token en JSONB plano
        connectedAt: new Date().toISOString()
    }
};
await supabase.from('tenants').update({ config: updatedConfig }).eq('id', tenantId);
```

Los tokens de Google (access_token + refresh_token) se almacenan en texto plano en la columna `config` JSONB de la tabla `tenants`. Esto significa:
1. Cualquier query con service_role a `tenants` expone los tokens de Google
2. Los tokens de Google permiten acceso a Google Sheets y Drive del cliente
3. Si la base de datos se filtra, todos los tokens de Google de todos los tenants quedan expuestos

**Fix textual:**
```typescript
// Cifrar tokens antes de guardar usando AES-256-GCM con GOOGLE_TOKEN_ENCRYPTION_KEY
import { createCipheriv, randomBytes } from 'crypto';

function encryptToken(token: string, key: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
```

---

### DA-3-007 — Cron reminder: datos PII expuestos en respuesta API (High)

**Archivo**: `src/app/api/cron/appointments/reminders/route.ts:154,163`
**Severidad**: High (combinado con DA-3-001)
**Esfuerzo**: Bajo (si se arregla DA-3-001)

La respuesta del endpoint incluye:
```json
{ "processed": 5, "results": [
    { "id": "uuid", "status": "SENT", "lead": "Juan García", "mode": "manual" },
    { "id": "uuid", "status": "FAILED", "error": "Lead has no phone." }
]}
```

Los nombres de leads PII (`lead.nombre`) y estados de envío son accesibles sin autenticación. Fix primario: autenticar el endpoint (DA-3-001). Fix secundario: no devolver nombres en la respuesta.

---

### DA-3-008 — `Math.random()` para A/B split en orquestador (Medium)

**Archivo**: `src/lib/core/orchestrator.ts:840`
**Severidad**: Medium
**Esfuerzo**: Bajo (1h)

Ver sección Crypto Audit. No es un problema de seguridad inmediato, pero afecta la auditabilidad de campañas y la reproducibilidad del sistema.

**Fix textual:**
```typescript
// Persistir la asignación A/B en BD al crear el lead en la secuencia:
const abVariant = await supabase.from('orchestration_logs')
    .select('ab_variant').eq('lead_id', leadId).limit(1).single();

if (abVariant.data?.ab_variant) {
    return abVariant.data.ab_variant; // Usar asignación persistida
} else {
    // Primera vez: asignar y persistir
    const variant = (await crypto.randomUUID()).charCodeAt(0) % 2 === 0 ? 'A' : 'B';
    // ... guardar en BD
}
```

---

### DA-3-009 — Secrets en `docker history` de la imagen (Low-Medium)

**Archivo**: `Dockerfile:18-22`
**Severidad**: Low-Medium
**Esfuerzo**: Bajo (30min)

Ver sección Docker/Compose Audit. Los `ARG` de build-time quedan en el historial de capas Docker.

**Fix textual:**
```dockerfile
# Usar --secret de Docker BuildKit en lugar de ARG:
# docker build --secret id=supabase_url,src=./secrets/supabase_url .
RUN --mount=type=secret,id=supabase_url \
    NEXT_PUBLIC_SUPABASE_URL=$(cat /run/secrets/supabase_url) npm run build
```

---

### DA-3-010 — `/api/docs/content` sirve `MASTER_DOSSIER.md` sin autenticación (Medium)

**Archivo**: `src/app/api/docs/content/route.ts`
**Severidad**: Medium
**Esfuerzo**: Mínimo (15min)

```typescript
export async function GET() {
    const filePath = path.join(process.cwd(), 'MASTER_DOSSIER.md');
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ content });
}
```

`MASTER_DOSSIER.md` es un documento de especificaciones de negocio (prompt, reglas de cualificación, configuración del sistema). Accesible sin autenticación desde internet:
```
curl https://app.linkstation.ai/api/docs/content
```

Expone reglas de negocio confidenciales, lógica de cualificación de leads y detalles del sistema que podrían ser usados por competidores o para ingeniería social.

**Fix textual:**
```typescript
export async function GET(req: Request) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // ... resto
}
```

---

### DA-3-011 — Timing attack en verificación de WhatsApp verify token (Low)

**Archivo**: `src/app/api/webhooks/whatsapp/route.ts:20`
**Severidad**: Low
**Esfuerzo**: Mínimo (15min)

Ver sección Crypto Audit. Comparación con `===` en lugar de `timingSafeEqual`.

---

## Status Final

| Área | Estado | Findings nuevos | Findings profundizados |
|---|---|---|---|
| Input Validation / Injection | Parcialmente seguro | — | F-05-OWASP-003/004 |
| SQL Injection | Sin finding directo en API | — | F-05-OWASP-004 (no SQLi, sí SSRF) |
| SSRF | **At Risk (confirmado)** | DA-3-002 | F-05-OWASP-011 |
| Webhooks / Firmas | **At Risk crítico** | DA-3-005 | F-05-SEC-005 |
| XSS | **At Risk** | DA-3-004 | F-05-OWASP-003 |
| CSP / Security Headers | **Ninguno configurado** | — | F-05-OWASP-006 |
| CORS | OK | — | — |
| Secrets Management | **Critical (previo)** | — | F-05-SEC-001/002/003/004 |
| Crypto | Medium | DA-3-008, DA-3-011 | — |
| File Uploads | N/A — no implementado | — | — |
| Docker / Compose | **At Risk** | DA-3-009 | F-05-OWASP-005 |
| CVEs | **High** | DA-3-CVE-001/002 | F-05-OWASP-008 |
| Auth en endpoints | **Critical (nuevos)** | DA-3-001, DA-3-003, DA-3-007, DA-3-010 | — |
| OAuth Token Storage | **High** | DA-3-006 | — |

### Tabla consolidada de nuevos findings DA-3

| ID | Título | Archivo:línea | Severidad | Esfuerzo | Categoría |
|---|---|---|---|---|---|
| DA-3-001 | Cron/sweep endpoints públicos sin autenticación | `api/orchestration/sweep/route.ts`, `api/cron/appointments/reminders/route.ts` | **Critical** | Bajo (1-2h) | Auth |
| DA-3-002 | SSRF via cookie `af-tenant-url` sin allowlist en `/api/tenant/migrate` | `api/tenant/migrate/route.ts:247-263` | **Critical** | Medio (3-4h) | SSRF |
| DA-3-003 | Test endpoint de orquestador abierto en producción | `api/test/orchestrator/route.ts` | **Critical** | Mínimo (30min) | Auth |
| DA-3-004 | XSS en widget embed via `id` sin sanitizar | `api/widget/embed.js/route.ts:16` | **High** | Bajo (1h) | XSS |
| DA-3-005 | Retell tools webhook sin firma: agendar/cancelar citas sin auth | `api/webhooks/retell/tools/route.ts` | **High** | Medio (2-3h) | Webhook |
| DA-3-006 | Google OAuth tokens en JSONB plano sin cifrado | `api/integrations/google/callback/route.ts:35-43` | **High** | Alto (4-6h) | Crypto |
| DA-3-007 | Cron reminder expone PII en respuesta sin auth | `api/cron/appointments/reminders/route.ts:154` | **High** | Bajo (si DA-3-001 resuelto) | Auth/PII |
| DA-3-008 | `Math.random()` para A/B split — no auditadle | `lib/core/orchestrator.ts:840` | **Medium** | Bajo (1h) | Crypto |
| DA-3-009 | Secrets en `docker history` vía ARG build-time | `Dockerfile:18-22` | **Low-Medium** | Bajo (30min) | Docker |
| DA-3-010 | `/api/docs/content` sirve especificaciones de negocio sin auth | `api/docs/content/route.ts` | **Medium** | Mínimo (15min) | Auth |
| DA-3-011 | Timing attack en WhatsApp verify token comparison `===` | `api/webhooks/whatsapp/route.ts:20` | **Low** | Mínimo (15min) | Crypto |
| DA-3-CVE-001 | axios@1.14.0: 15 CVEs (SSRF CVSS 7.2, Prototype Pollution CVSS 7.4) | `package.json` | **High** | Bajo (npm update) | CVE |
| DA-3-CVE-002 | next@16.1.6: 19 CVEs (SSRF CVSS 8.6, middleware bypass CVSS 8.1) | `package.json` | **High** | Medio (upgrade+test) | CVE |

---

**Status:** DONE
**Summary:** Análisis estático profundo completado. 13 nuevos findings (3 Critical, 5 High, 3 Medium, 2 Low). Los tres más urgentes: (1) endpoints de cron/sweep/test abiertos sin auth permiten ejecución arbitraria del orquestador y creación de datos en producción; (2) SSRF confirmado en `/api/tenant/migrate` via cookie; (3) Widget embed XSS explotable en sitios de terceros. Los findings previos del quick scan se han profundizado con vectores reproducibles. La superficie de ataque total es significativamente mayor de lo estimado en el quick scan.
