---
title: "Inventario de tokens, claves y secretos expuestos en el repositorio"
date: 2026-05-18
classification: SENSITIVE — uso interno del audit / cliente
agent: Manual extraction (grep + decode) + Claude Code
target: e:\ClaudeCode\linkstation-dashboard\linkstation-dashboard (repo cliente, renombrado desde `linkstation-main` el 2026-05-20)
related_findings: [F-01-001, F-01-002, F-04-002, F-04-003, F-05-SEC-001, F-05-SEC-002, F-05-SEC-003, F-05-SEC-004]
status: READY_FOR_ROTATION
---

# Inventario de tokens, claves y secretos expuestos

> ⚠️ **Documento sensible.** Contiene los valores **completos** de credenciales reales actualmente vigentes en producción. Solo para uso del equipo de desarrollo de la cliente durante la rotación. **No compartir externamente, no committear, no subir a ningún servicio de IA salvo este flujo de audit autorizado.**
>
> Una vez rotadas las credenciales, este archivo debería:
> 1. Confirmarse contra los nuevos valores (que ningún viejo siga siendo válido).
> 2. Mantenerse en el repo de auditoría local (rama `auditoria`, sin remote al cliente) como **evidencia histórica** para justificar la severidad ante la cliente.
> 3. **No** subirse a GitHub.

## Resumen

| Tipo | Cantidad única | Vencimiento | Acción |
|---|---|---|---|
| JWT Supabase `service_role` | **2** (sí, dos distintos coexisten) | 2030-01-01 | 🔴 Rotar AMBOS YA |
| JWT Supabase `anon` | 1 | 2030-01-01 | 🟡 Rotar (low impact, pero conveniente) |
| Password Postgres superuser | 1 (`postgres:postgres`) | Sin vencimiento | 🔴 Cambiar password DB |
| Token verificación webhook WhatsApp | 1 (`automatiza_for_2025`) | Sin vencimiento | 🟠 Rotar y configurar en Meta |
| Host interno + IP de la BD | `api-db.linkstation.ai`, `46.62.193.169`, `interno-supabase-a201be-46-62-193-169` | — | 🟡 Mantener pero no exponer en código |

---

## 1. JWT Supabase — SERVICE_ROLE A

**Nivel de privilegio:** Administrador completo de la base de datos. Bypassa Row Level Security. Lee y modifica datos de TODOS los tenants. Puede ejecutar SQL arbitrario.

### Valor completo

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzgzOTI5MzQsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.dc0tXGNDPsriOwj6qR9dbJm-GffhvoNTBhl88YEB_hg
```

### Payload decodificado

```json
{
  "iat": 1778392934,
  "exp": 1893456000,
  "role": "service_role",
  "iss": "supabase"
}
```

- **Emitido (iat):** 2026-05-10 06:02:14 UTC
- **Expira (exp):** 2030-01-01 00:00:00 UTC (~3 años 7 meses de validez restante)
- **Fingerprint (últimos 14 chars):** `vNTBhl88YEB_hg`

### Ubicaciones en código

| Archivo | Línea | Contexto |
|---|---|---|
| `src/lib/auth-config.ts` | 19 | Fallback de `AUTH_SUPABASE_SERVICE_ROLE_KEY` cuando faltan envs `SUPABASE_SERVICE_ROLE_KEY` y `SERVICE_ROLE_KEY` |
| `src/lib/supabase/server.ts` | 7 | Constante `FALLBACK_SERVICE_KEY` |

### Pista temporal

Coincide con `iat = 2026-05-10`, dentro del Sprint S-04 ("Crisis", según `docs/timeline/sprints-done.md`). Probablemente añadido en la rotación de mayo y el fallback NO se actualizó/eliminó.

---

## 2. JWT Supabase — SERVICE_ROLE B

**Nivel de privilegio:** Idéntico al anterior — admin total a la BD.

### Valor completo

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzI0OTEyMjksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.5VpQVwUhqDkHgplZiPE4iGjduuB2NfGNq-5vsASGAbI
```

### Payload decodificado

```json
{
  "iat": 1772491229,
  "exp": 1893456000,
  "role": "service_role",
  "iss": "supabase"
}
```

- **Emitido (iat):** 2026-03-02 22:40:29 UTC (**inicio del proyecto** — primer commit fue el 2026-03-02)
- **Expira (exp):** 2030-01-01 00:00:00 UTC
- **Fingerprint:** `q-5vsASGAbI`

### Ubicaciones en código

| Archivo | Línea | Contexto |
|---|---|---|
| `src/lib/actions/tenant.ts` | 52 | Fallback de `serviceKey` en flujo de migración de tenant |
| `src/lib/actions/tenant.ts` | 76 | Idem, segundo punto del mismo fichero |
| `src/scripts/purge-demo.ts` | 9 | Hardcoded en script de purga de datos demo |

### ⚠️ Alerta crítica

**Hay dos service_role keys distintas válidas simultáneamente.** Si Supabase permite múltiples claves activas (proyecto self-hosted lo permite vía rotación incremental), ambas funcionan. **Rotar solo la "actual" del panel no es suficiente** — hay que asegurar que el JWT secret de Supabase se regenere y que ninguna de las dos sigan firmadas con la clave antigua válida.

---

## 3. JWT Supabase — ANON

**Nivel de privilegio:** Anon (público por diseño). Solo expone lo que las políticas RLS permitan. **El problema NO es la exposición de este token** (es la clave pública estándar de cualquier app Supabase). El problema es **que esté hardcodeada como fallback** — fuerza una identidad concreta del proyecto Supabase que debería poder cambiar vía env.

### Valor completo

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzgzOTI5MzQsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.ZzJZGBn42ZpSlp3q42X4O48wWjciQQts4ftXVch4od8
```

### Payload decodificado

```json
{
  "iat": 1778392934,
  "exp": 1893456000,
  "role": "anon",
  "iss": "supabase"
}
```

- **Emitido (iat):** 2026-05-10 06:02:14 UTC (misma fecha que SERVICE_ROLE A)
- **Expira (exp):** 2030-01-01 00:00:00 UTC
- **Fingerprint:** `Wjci QQts4ftXVch4od8`

### Ubicaciones en código

| Archivo | Línea | Contexto |
|---|---|---|
| `src/lib/auth-config.ts` | 14 | Fallback `AUTH_SUPABASE_ANON_KEY` |
| `src/lib/supabase/server.ts` | 8 | `FALLBACK_ANON_KEY` |
| `src/lib/supabase/client.ts` | 16 | Fallback `key` |
| `src/lib/supabase/client.ts` | 20 | Hardcoded en `createClient<Database>(...)` (segunda ocurrencia en el mismo archivo) |

---

## 4. Password Postgres — superusuario

**Nivel de privilegio:** Superuser de Postgres. Acceso directo al motor de BD por puerto 5432/6432, fuera de cualquier control de Supabase Auth o RLS.

### Valor

`postgres:postgres` (usuario:password — el password por defecto de la imagen `postgres` oficial)

### Ubicaciones en código

| Archivo | Línea | Connection string |
|---|---|---|
| `src/scripts/migrate-scheduling.ts` | 18 | `postgresql://postgres:postgres@46.62.193.169:5432/postgres` |
| `src/scripts/migrate-scheduling.ts` | 19 | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `src/scripts/migrate-scheduling.ts` | 20 | `postgresql://postgres:postgres@db:5432/postgres` |
| `src/scripts/migrate-agents.ts` | 22 | `postgresql://postgres:postgres@46.62.193.169:5432/postgres` |
| `src/scripts/migrate-agents.ts` | 23 | `postgresql://postgres:postgres@46.62.193.169:6432/postgres` (pgbouncer) |
| `src/scripts/migrate-agents.ts` | 24 | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `src/scripts/migrate-agents.ts` | 25 | `postgresql://postgres:postgres@db:5432/postgres` |
| `src/scripts/run-migration.ts` | 27 | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `src/scripts/run-migration.ts` | 28 | `postgresql://postgres:postgres@db:5432/postgres` |
| `src/scripts/run-migration.ts` | 29 | `postgresql://postgres:postgres@127.0.0.1:5432/postgres` |
| `src/scripts/run-migration.ts` | 31 | `postgresql://postgres:postgres@interno-supabase-a201be-46-62-193-169:5432/postgres` |

### Riesgo

Si el puerto 5432 está expuesto desde la IP pública `46.62.193.169` (verificar con `nmap`), cualquiera con esta cadena de conexión es superuser de Postgres. Vector independiente de Supabase y de Next.js — bypasea TODO.

---

## 5. Token de verificación Webhook WhatsApp (Meta Cloud API)

**Función:** Validar que las peticiones GET de verificación a `/api/webhooks/whatsapp` provienen de Meta. Si un atacante lo conoce, puede engañar a Meta para registrar URLs maliciosas en su cuenta (limitado, pero molesto).

### Valor

```
automatiza_for_2025
```

### Ubicaciones

| Archivo | Línea | Contexto |
|---|---|---|
| `src/app/api/webhooks/whatsapp/route.ts` | 11 | Constante `VERIFY_TOKEN`, comparada literalmente contra el parámetro `hub.verify_token` |
| `src/app/dashboard/settings/IntegrationsManager.tsx` | 375 | Mostrado como `placeholder` en input del UI de admin (visible a cualquier admin loggeado) |

### Nota

Adicionalmente, el endpoint de Retell (`F-05-SEC-005`) **no valida firma alguna**, por lo que cualquier POST al webhook de Retell es aceptado. Eso no es un secreto sino una ausencia — pero conviene mencionarlo aquí porque está en la misma familia de vulnerabilidades.

---

## 6. URLs y hosts internos revelados

No son secretos por sí mismos pero divulgan arquitectura interna:

| Valor | Tipo | Apariciones |
|---|---|---|
| `https://api-db.linkstation.ai` | Subdominio HTTPS de Supabase | `auth-config.ts:9,10`, `supabase/server.ts:6`, `supabase/client.ts:15,20` |
| `46.62.193.169` | IP pública (Hetzner según rango) | `scripts/migrate-*.ts` (varias líneas) |
| `interno-supabase-a201be-46-62-193-169` | Hostname interno Traefik | `scripts/run-migration.ts:31`, `scripts/purge-demo.ts:8` |
| `http://interno-supabase-a201be-46-62-193-169.traefik.me` | URL Traefik resuelta vía DNS público | `scripts/purge-demo.ts:8` (⚠️ **HTTP plano**, no HTTPS) |

El uso de `traefik.me` es una técnica de "magic DNS" donde `*.traefik.me` resuelve al IP indicado en el subdominio. Funcional pero **revela públicamente la IP** del Supabase a cualquiera que vea el código.

---

## Plan de rotación (orden crítico)

### Paso 0 — Pre-rotación (5 min)
- Hacer backup completo de la BD (Supabase Studio o `pg_dump`).
- Confirmar acceso al panel de Supabase como owner (no se puede rotar JWT secret como miembro sin permisos).

### Paso 1 — Rotar JWT secret de Supabase (10 min) 🔴 PRIORIDAD MÁXIMA
1. Panel Supabase → Settings → API → **JWT Secret → Generate new secret**.
2. **Esto invalida TODOS los JWTs actuales** (incluido los service_role A y B). Tras este paso, ambas claves del repo dejan de funcionar.
3. Copiar las **nuevas** `anon` y `service_role` keys que Supabase genera tras la rotación.

### Paso 2 — Actualizar env vars en producción (10 min)
- Vercel / Coolify / sistema de deploy → variables de entorno:
  - `SUPABASE_SERVICE_ROLE_KEY` = nueva service_role key
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = nueva anon key
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://api-db.linkstation.ai` (o el dominio que prefieras)
  - `SUPABASE_URL` = idem
- **Redesplegar** la app y el worker.

### Paso 3 — Eliminar fallbacks del código (30 min) 🔴 OBLIGATORIO
Hacer FALLAR la app si las envs no están presentes — no usar fallbacks. Editar:

```ts
// src/lib/auth-config.ts — reemplazar las 3 constantes por:
export const AUTH_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? throwMissing("NEXT_PUBLIC_SUPABASE_URL");
export const AUTH_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? throwMissing("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const AUTH_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? throwMissing("SUPABASE_SERVICE_ROLE_KEY");
function throwMissing(name: string): never { throw new Error(`Missing env var: ${name}`); }
```

Mismo patrón en `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/actions/tenant.ts`.

### Paso 4 — Reescribir scripts de migración (1 h)
- `src/scripts/migrate-scheduling.ts`, `migrate-agents.ts`, `run-migration.ts`, `purge-demo.ts`:
  - Eliminar arrays hardcoded de connection strings.
  - Exigir `DATABASE_URL` env var sin fallback.
  - Sustituir password `postgres:postgres` por env (la nueva password fuerte que vas a crear en el Paso 5).

### Paso 5 — Cambiar password Postgres superuser (15 min)
- Acceder al servidor (SSH al host `46.62.193.169`) o panel de gestión.
- `ALTER USER postgres WITH PASSWORD '<nueva password fuerte>';`
- Actualizar la env var `DATABASE_URL` o equivalente en el deploy de Supabase.
- Verificar que Supabase sigue arrancando (la app del cliente seguirá viva si Supabase está self-hosted en Coolify/Docker, hay que reiniciar el contenedor con la nueva password).
- **Asegurar que el puerto 5432 NO esté expuesto a internet** (firewall, security group, `ufw deny 5432`).

### Paso 6 — Rotar WhatsApp verify token (5 min)
- Generar un token nuevo: `openssl rand -hex 32` (64 hex chars).
- Actualizar Meta Business → WhatsApp → Webhook → Verify Token con el nuevo valor.
- Actualizar env var `WHATSAPP_VERIFY_TOKEN` en producción.
- Modificar `src/app/api/webhooks/whatsapp/route.ts:11`:
  ```ts
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? throwMissing("WHATSAPP_VERIFY_TOKEN");
  ```
- Actualizar también el placeholder del UI en `src/app/dashboard/settings/IntegrationsManager.tsx:375` para que no muestre el valor antiguo.

### Paso 7 — Verificación post-rotación (30 min)
- Buscar que no quede ningún resto:
  ```bash
  grep -rE "eyJhbGciOiJIUzI1NiIs" src/  # 0 hits esperado
  grep -rE "automatiza_for_2025" src/   # solo placeholder UI o 0
  grep -rE "postgres:postgres@" src/    # 0 hits esperado
  grep -rE "46\.62\.193\.169" src/      # 0 hits esperado
  ```
- Probar login en producción.
- Probar webhook de WhatsApp (enviar mensaje de prueba desde un número real).
- Confirmar que la app falla limpiamente si arrancas en local SIN env vars (no debe usar fallback silencioso).
- Revisar logs de Supabase de los últimos 30 días buscando IPs/User-Agents anómalos que hubieran usado las claves antiguas.

### Paso 8 — Higiene del repositorio
- Las claves antiguas **siguen en el historial git** del repo `LinkStation/linkstation-dashboard` (422 commits). Aunque ya estén invalidadas, considerar:
  - Si el repo fue público en algún momento: las claves están públicas en cachés de GitHub, Shodan, etc. Tras la rotación están **inútiles** pero conviene saberlo.
  - Reescribir historia con `git filter-repo` para eliminar las strings concretas — solo necesario si por alguna razón las claves antiguas siguieran teniendo valor (no es el caso tras Paso 1).

---

## Apéndice — Comandos de extracción usados

Para que el cliente o un auditor externo pueda replicar este inventario:

```bash
# Buscar JWTs (cualquier formato HS256)
grep -rE "eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}" src/

# Buscar connection strings Postgres
grep -rE "postgres(ql)?://" src/

# Buscar tokens de webhook típicos
grep -rE "(verify[_-]?token|webhook[_-]?secret|hub\.verify_token)" src/

# Buscar IPs y hosts internos
grep -rE "([0-9]{1,3}\.){3}[0-9]{1,3}|api-db|interno-supabase" src/

# Decodificar payload de un JWT (en bash)
echo "<jwt>" | cut -d'.' -f2 | tr '_-' '/+' | base64 -d 2>/dev/null
```

---

**Status:** DONE — inventario completo y verificado.

**Summary:** Documentados 4 categorías de credenciales vigentes en el repositorio:
- 2 JWT `service_role` distintos (Supabase admin total, ambos válidos hasta 2030).
- 1 JWT `anon` (público por diseño, pero hardcoded indebidamente).
- 1 password Postgres superuser (`postgres:postgres`, default de la imagen oficial).
- 1 token de verificación de webhook WhatsApp (`automatiza_for_2025`).

Incluido plan de rotación en 7 pasos con orden crítico y comandos de verificación post-rotación. Tiempo estimado total de rotación: **~2-3 horas** de trabajo de desarrollo + deploy.

**Concerns:**
- La coexistencia de dos service_role keys diferentes sugiere que ya hubo una rotación previa donde se olvidaron de retirar la antigua del código. La rotación que se haga ahora debe verificar explícitamente que TODAS las claves antiguas quedan invalidadas (rotar el JWT secret de Supabase, no solo regenerar la "key actual" del panel).
- El endpoint Retell sin validación de firma (F-05-SEC-005) NO es un secreto expuesto sino una ausencia de validación. Conviene tratarlo en el mismo Sprint 0 de hotfix.
- Las credenciales actuales tienen `iss: "supabase"` pero no `ref` ni `iss` de proyecto concreto (típico de Supabase self-hosted). Si la instancia está alojada en infraestructura propia (Hetzner según IP), confirmar que el JWT secret se regenera a nivel de **GoTrue/Auth + PostgREST + Realtime** simultáneamente — en self-hosted estos tres servicios pueden tener configs separadas.
