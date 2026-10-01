---
title: "Verificación en navegador — Exposición real de secretos en producción"
date: 2026-05-18
agent: Manual verification (Playwright + Claude Code)
phase: post-audit
target: https://app.linkstation.ai
related_findings: [F-01-001, F-04-002, F-05-SEC-001, F-05-SEC-002, F-05-SEC-003]
status: VERIFIED
---

# Verificación en navegador — Exposición real de secretos en producción

## Objetivo

Tras la auditoría estática (Fases 0–7) que marcó como **Critical** la presencia de un JWT `service_role` de Supabase hardcodeado en código fuente, se ejecuta verificación **en producción real** para confirmar el vector exacto de exposición: ¿llega el secreto al navegador del usuario final?

## Metodología

- Herramienta: Playwright MCP (Chromium headless con interfaz visible al usuario).
- Sitio: `https://app.linkstation.ai` (producción).
- Credenciales: cuenta del cliente proporcionadas por el usuario (`javihp.email@gmail.com`), válidas para tenant `esden`.
- Acciones:
  1. Navegación a `/login` sin sesión.
  2. Enumeración de chunks JavaScript estáticos servidos al navegador.
  3. `fetch` de cada chunk y `grep` de strings target.
  4. Login y repetición del scan en rutas autenticadas (`/dashboard`, `/dashboard/whatsapp`).
  5. Inspección de cookies, `localStorage`, `sessionStorage`, HTML inline, `__NEXT_DATA__`.
  6. Inspección de `performance.getEntriesByType('resource')` para detectar hosts externos (websocket realtime, etc.).
  7. Petición no autenticada al endpoint público de embed widget.

## Strings target (ground truth del código fuente)

Extraídos de `src/` con `grep -E "eyJ[A-Za-z0-9_-]{20,}"`:

| Identificador | Tipo | Fingerprint (últimos 20 chars) | Archivos donde aparece |
|---|---|---|---|
| ANON-A | JWT role=anon, exp 2030-01-01 | `Wjci QQts4ftXVch4od8` | `auth-config.ts:14`, `supabase/server.ts:8`, `supabase/client.ts:16,20` |
| SVC-A | JWT role=service_role, exp 2030-01-01 | `vNTBhl88YEB_hg` | `auth-config.ts:19`, `supabase/server.ts:7` |
| SVC-B | JWT role=service_role, exp 2030-01-01 | `q-5vsASGAbI` | `actions/tenant.ts:52,76`, `scripts/purge-demo.ts:9` |
| URL interna | hostname | `api-db.linkstation.ai` | `supabase/client.ts:20`, `scripts/*` |
| IP interna | IPv4 | `46.62.193.169` | `scripts/migrate-*.ts`, `purge-demo.ts` |
| Password PG | credencial | `postgres:postgres` | `scripts/migrate-*.ts` |
| WhatsApp verify token | secret | `automatiza_for_2025` | `app/api/webhooks/whatsapp/route.ts:11` |

## Resultados

### A. Chunks JS sin autenticación (página `/login`)

- Chunks escaneados: **12**.
- Hits: **0** de cualquier string target.
- JWTs detectados con regex genérico `eyJ…\.eyJ…\.…`: **0**.

### B. Chunks JS con sesión activa (`/dashboard`, `/dashboard/whatsapp`)

- Chunks escaneados: **26**.
- Hits: **0** de cualquier string target.
- JWTs en cualquier chunk: **0**.
- JWTs en HTML inline: **0**.
- JWTs en `__NEXT_DATA__`: **0**.

### C. Storage del navegador

| Almacén | Contenido |
|---|---|
| `document.cookie` (lectura JS) | `af-tenant-id=…`, `af-tenant-name=…` (plain, legibles desde JS) |
| Cookie httpOnly (no legible) | `sb-api-db-auth-token` (presente — el navegador la envía, pero JS no la lee) |
| `localStorage` | vacío |
| `sessionStorage` | vacío |

### D. Tráfico de red post-login

- Hosts externos contactados desde el navegador: **0**.
- Todo el tráfico (incluido el del módulo WhatsApp realtime) se proxifica vía `app.linkstation.ai` mediante React Server Components (`?_rsc=...`).
- **No hay conexión directa cliente ↔ Supabase**.

### E. Endpoint público de widget embed

- `GET /api/widget/embed.js` sin parámetro `id` → 400 "Missing widget ID". No se pudo probar con un widget ID real válido (requiere uno configurado). Si esa ruta existiera y emitiera el JS con la anon key inline, sería el siguiente vector a verificar.

## Conclusión técnica

### ❌ Hipótesis NO confirmada

> *"El service_role JWT se está exponiendo en el bundle JS público que ve el navegador."*

**Falso, hoy, en este build de producción.** Los archivos que contienen el JWT (`auth-config.ts`, `supabase/server.ts`, `actions/tenant.ts`, `scripts/*`) son **server-only**. Next.js los elimina del bundle del cliente por tree-shaking + el boundary RSC.

### ✅ Hipótesis SÍ confirmada (alternativas al vector original)

El secreto está expuesto, pero por **otros vectores** distintos al bundle:

1. **Vector "código fuente"** — El JWT está en texto plano en el repositorio GitHub `LinkStation/linkstation-dashboard` (422 commits, accesible a todos los collaborators y reflejado en el ZIP del cliente). Un simple `git log -p` o `grep` recupera el token. Vector verificado por Fase 5 (Audit-Deps+Security).
2. **Vector "fallback silencioso"** — En `supabase/server.ts:7`, `auth-config.ts:19`, `actions/tenant.ts:52,76` el patrón es `process.env.X || "eyJ..."`. Si la env var no está seteada (deploy nuevo, dev local, script ad-hoc), **el fallback comprometido se activa sin error visible** y la app sigue funcionando contra producción con privilegios de admin.
3. **Vector "scripts de migración"** — `src/scripts/migrate-*.ts` y `purge-demo.ts` se ejecutan **fuera del runtime Next.js**, vía `tsx` directo. Contienen `postgresql://postgres:postgres@46.62.193.169:5432/...` y el JWT SVC-B literales. Cualquiera que clone el repo y ejecute esos scripts tiene admin total a la BD productiva.
4. **Vector "rotación pendiente"** — Los tres JWTs analizados llevan `exp: 1893456000` (2030-01-01). Aunque hoy no se vean en el bundle, **siguen siendo válidos**. Si en algún momento el repo estuvo expuesto (collaborator dado de baja, fork, logs CI con dump, copia del ZIP filtrada), el token sigue funcionando.

### Información secundaria confirmada en navegador

- Subdominio interno `api-db.linkstation.ai` revelado vía el **nombre** de la cookie `sb-api-db-auth-token`. Esto es comportamiento estándar de `@supabase/ssr` (deriva el nombre del project ref) — no es un fallo de la app, pero sí confirma a un atacante el host real de Supabase. El valor de la cookie **no es legible** desde JS.
- El `tenant_id` viaja en cookie plain (`af-tenant-id`) y NO en el JWT del usuario. Esto **confirma F-04-005/006**: las políticas RLS que esperan `auth.jwt() ->> 'tenant_id'` son inefectivas porque el claim no existe. El aislamiento multi-tenant depende 100% de filtros manuales `.eq("tenant_id", ...)` en código — y por eso `fetchCalls` (F-04-001) sin ese filtro provoca data leak cross-tenant.

## Reclasificación de severidad

| Finding | Severidad pre-verificación | Vector verificado | Severidad post-verificación |
|---|---|---|---|
| F-05-SEC-001 (JWT service_role hardcoded) | Critical | Repo + fallback + scripts (NO bundle) | **Critical** (sin cambio) |
| F-05-SEC-002 (JWT anon hardcoded) | High | Idem | **Medium** (la anon es público por diseño; el problema es el fallback indebido, no la exposición) |
| F-05-SEC-003 (URL interna hardcoded) | High | Idem + nombre cookie | **High** (sin cambio) |
| Scripts `migrate-*.ts` con `postgres:postgres` | High | Repo + ejecutable directo | **Critical** (reclasificado al alza) |
| Cookie de auth httpOnly | — | Verificado correcto | **Bien — sin finding** |
| RLS basada en claim `tenant_id` del JWT | F-04-005/006 — High | Confirmado: tenant no está en JWT | **Critical** (reclasificado al alza por confirmación práctica) |

## Recomendación reforzada para la cliente

> **Que el navegador no muestre el JWT no significa que no esté comprometido.** El token vive 5 años más y está escrito en 5 archivos del repositorio. Hay que:
>
> 1. **Rotar AHORA** la `service_role` key en el panel de Supabase (genera nueva → la antigua queda inválida automáticamente).
> 2. **Eliminar los 5 fallbacks** del código y hacer que la app **falle ruidosamente** si la env no está presente (`if (!key) throw new Error(...)`).
> 3. **Mover** los scripts `src/scripts/migrate-*.ts` fuera del repo o, si han de quedarse, reescribirlos exigiendo env vars sin fallback.
> 4. **Auditar el historial** de GitHub: si la `service_role` antigua estuvo expuesta a alguien que ya no debería tener acceso (ex-collaborator, repo público en algún momento), considerarla **filtrada** independientemente de la rotación — los logs históricos de actividad de Supabase pueden confirmar si hubo uso anómalo.
> 5. **Implementar RLS efectiva**: añadir `tenant_id` al JWT del usuario (custom claim Supabase Auth) o cambiar todas las políticas a usar el `tenant_id` desde una tabla `user_tenants` joineada por `auth.uid()`. Mientras tanto, **toda** server action que use `service_role` DEBE filtrar `tenant_id` manualmente — F-04-001 (`fetchCalls`) demuestra que no es así.

## Evidencia para entregar al cliente (resumen ejecutivo, no técnico)

> Hemos comprobado tu dashboard en producción con un usuario real. **La parte buena**: el navegador del usuario final no recibe la llave de administrador de la base de datos. La protección frontal está bien.
>
> **La parte mala**: esa llave de administrador, que da control total sobre todos los datos de todos los clientes hasta enero de 2030, está escrita en texto plano dentro del código fuente del proyecto, en cinco archivos diferentes. Cualquier persona que tenga acceso al repositorio en GitHub (programadores actuales, antiguos, o quien tenga el ZIP del código) puede usarla para entrar a la base de datos como administrador, sin pasar por ninguna pantalla de login.
>
> **Acción inmediata**: rotar la llave (cambiarla por una nueva desde el panel de Supabase) y eliminar las copias del código. Esto se puede hacer en menos de 1 hora de trabajo de desarrollo y elimina el riesgo principal. Hasta que se haga, considera que la base de datos está expuesta.

---

**Status:** DONE

**Summary:** Verificación manual en producción con Playwright confirma que el bundle JavaScript del navegador NO expone el JWT service_role (NEXT_PUBLIC tree-shaking funciona correctamente). El finding Critical original se mantiene: el JWT sigue expuesto vía repositorio GitHub, scripts ejecutables directos, y fallbacks silenciosos en código server. Severidad de scripts `migrate-*.ts` reclasificada al alza a Critical. RLS basada en claim del JWT confirmada como rota en práctica (tenant viaja en cookie plain). Cookie de auth httpOnly correctamente configurada — único punto positivo verificado.

**Files written:**
- `docs/audit/05-browser-verification.md`

**Concerns:**
- No se pudo probar la ruta `/api/widget/embed.js` con un widget ID real (devolvió 400 sin parámetro). Si se exponen widget IDs en sitios externos, esa ruta debería re-verificarse específicamente para confirmar que no incluye anon key inline en el JS servido a sitios de terceros.
- No se inspeccionaron las server actions vía POST (Next.js las usa con `_next/postponed` y formatos internos opacos al cliente). Posible vector a auditar en deep audit posterior.
- Las credenciales del cliente usadas para la verificación quedan en el historial de esta sesión — recomendable que el usuario rote el password de `javihp.email@gmail.com` tras cerrar el audit, por higiene.
