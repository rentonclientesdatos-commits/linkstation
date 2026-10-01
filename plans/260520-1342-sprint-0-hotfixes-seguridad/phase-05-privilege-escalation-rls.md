# Phase 05 — Privilege escalation y RLS

## Context Links
- [plan.md](plan.md) — overview Sprint 0
- [RoadMap Bloque 1.5](../RoadMap.md) — tareas 1-16, 1-17, 1-18, 1-19, 1-20, 1-21
- [DEEP-FINDINGS-SUMMARY.md](../../docs/audit/deep/DEEP-FINDINGS-SUMMARY.md) — DA-2-005, DA-2-004, DA-2-010, F-04-004, F-04-001, DA-2 inbox sweep
- [Plan RLS — phase-01-hotfix-vulnerabilidades.md](../20260519-1200-rls-multitenant-hardening/phase-01-hotfix-vulnerabilidades.md) — Paso 1 (SOLAPE 1-18)
- [Plan RLS — plan.md](../20260519-1200-rls-multitenant-hardening/plan.md) — H1, H2, H4

## Overview

**Prioridad:** P1 — Crítico. Privilege escalation activo (cualquier usuario puede hacerse admin) + aislamiento multi-tenant roto en 4 puntos distintos.
**Estado:** 🔘 Pendiente
**Estimación:** 24h (1-16: 4h + 1-17: 3h + 1-18: 3h + 1-19: 2h + 1-20: 4h + 1-21: 8h)
**Agentes:** `af-agents:database` (migraciones SQL RLS) + `af-agents:security` (verificación IDOR + privilege escalation)

> **Pre-requisito bloqueante: 1-26 (Ph6) DEBE completarse antes de iniciar 1-16 y 1-17.**
> El CVE GHSA-492v-c6pp-mqqv (middleware bypass CVSS 8.1) en `next@16.1.6` permite eludir el middleware de Next.js. 1-16 mueve la verificación de `is_admin` al middleware (`src/middleware.ts`) — si el middleware es bypasseable, 1-16 no cierra el vector de privilege escalation. 1-17 añade verificación de rol admin en server actions, menos expuesto al bypass pero igualmente dependiente del middleware correcto.

Esta es la fase más voluminosa del Sprint 0. Combina:
- Privilege escalation (1-16, 1-17): usuarios que se escalan a admin tocando campos que no deberían poder tocar.
- RLS roto (1-18, 1-19): políticas SQL que no filtran por tenant.
- IDOR (1-20, 1-21): funciones de código que no verifican ownership antes de devolver/modificar datos.

## Key Insights

- **DA-2-005**: `src/middleware.ts:62-68` — el middleware lee `user_metadata.is_admin` para decidir si el usuario es admin. El problema: `user_metadata` es editable por el propio usuario (es la parte del JWT que el user puede modificar vía `supabase.auth.updateUser()`). Un usuario puede poner `is_admin: true` en sus metadatos y obtener acceso admin. Fix: mover `is_admin` a `app_metadata` (solo modificable por el servidor).
- **DA-2-004**: `src/lib/actions/tenant.ts:140-197` — `createTenant`, `deleteTenant`, `updateTenant` no verifican que el caller sea admin. Cualquier usuario autenticado puede crear tenants, borrar tenants ajenos, etc.
- **DA-2-010**: Tabla `tenants` tiene política `USING(true)` para `authenticated` — cualquier usuario logueado ve y modifica TODOS los tenants. **SOLAPE**: este hallazgo ya está cubierto en el plan RLS `phase-01-hotfix-vulnerabilidades.md` Paso 1. Ver referencia.
- **F-04-004**: `migrations/20260424_knowledge_and_billing.sql:28` — la política RLS de `knowledge_base` usa `app.current_tenant` como variable de sesión, pero esa variable nunca se setea en ningún punto del código. La política es una "dead letter" — nunca se evalúa correctamente, la RLS de `knowledge_base` es inefectiva.
- **F-04-001**: `src/lib/actions/calls.ts:56-371` — 4 funciones de `fetchCalls` hacen queries a la tabla `calls` sin filtro `tenant_id`. Devuelven llamadas de todos los tenants mezcladas.
- **F-04-001b** (verificado en browser 2026-05-21 con seed demo dual-tenant): `/dashboard/historial` devuelve los leads de TODOS los tenants en lugar de filtrar por el tenant activo. Con seed `seed-demo.ts` (15 organizaciones B2B en tenant "LinkStation" + 40 personas B2C en tenant "Demo - Academia AF") el historial muestra los 55 mezclados. El bug está en el query del historial que hace JOIN `lead` + `llamadas` sin pasar `.eq("tenant_id", activeTenantId)`. Las **métricas del Panel General SÍ filtran correctamente** (mostraron 11 llamadas = solo AF, no las ~70 totales) — el bug es específico de la ruta del historial. Adicional al fix de 1-20 (que cubre `calls.ts`), revisar las queries de `src/app/dashboard/historial/page.tsx` o donde resida el `fetchHistorial`/`fetchLeads` que alimente esa vista.
- **DA-2 inbox sweep**: `inbox.ts:448-501` — 9 funciones aceptan UUIDs arbitrarios en parámetros sin verificar que el tenant del usuario tenga ownership sobre ese recurso. Es el IDOR más extenso del sistema.

## Requirements

### Funcionales
- 1-16: Mover la verificación de `is_admin` desde `user_metadata` a `app_metadata` en el middleware. Añadir función de servidor para setear `is_admin` en `app_metadata` (solo `service_role` puede modificar `app_metadata`).
- 1-17: Añadir verificación de rol admin en `createTenant`, `deleteTenant`, `updateTenant` antes de ejecutar ninguna acción.
- 1-18: Fix RLS tabla `tenants` — quitar `USING(true)`. **Ver plan RLS Paso 1**.
- 1-19: Fix RLS `knowledge_base` — reemplazar política `app.current_tenant` por política funcional con `auth.uid()` y lookup real.
- 1-20: Añadir filtro `tenant_id` en las 4 funciones de `fetchCalls` en `calls.ts:56-371` **+ también revisar y arreglar las queries que alimentan `/dashboard/historial` (finding F-04-001b verificado en browser con seed dual-tenant 2026-05-21).**
- 1-21: Añadir verificación de ownership en las 9 funciones de `inbox.ts:448-501`.

### No funcionales
- 1-16: La migración de `user_metadata` → `app_metadata` requiere un script de backfill para usuarios existentes que ya tengan `is_admin: true` en `user_metadata`.
- 1-18: Pre-check SQL obligatorio antes de aplicar la migración (ver plan RLS Paso 1).
- 1-19: Nueva migration SQL — no editar la existente.
- 1-20, 1-21: Los filtros deben usar el `tenant_id` obtenido de sesión autenticada, no de parámetros de la request.

## Architecture

### 1-16 — Privilege escalation (middleware.ts)

```
ANTES:
  middleware.ts:62-68 → session.user.user_metadata.is_admin  ← editable por user

DESPUÉS:
  middleware.ts:62-68 → session.user.app_metadata.is_admin   ← solo modificable por server

Función de servidor (solo service_role):
  setUserAdminRole(userId: string, isAdmin: boolean)
  → supabase.auth.admin.updateUserById(userId, { app_metadata: { is_admin: isAdmin } })
```

### 1-17 — Server actions tenant (actions/tenant.ts)

```
ANTES:
  createTenant() → ejecuta sin verificar quién llama

DESPUÉS:
  createTenant() → requireAdminUser() → ejecuta
  deleteTenant() → requireAdminUser() + verificar tenant propio → ejecuta
  updateTenant() → requireAdminUser() + verificar tenant propio → ejecuta
```

### 1-18 — RLS tenants (migration SQL)

> **SOLAPE con plan RLS**: Esta tarea corresponde al **Paso 1** de [phase-01-hotfix-vulnerabilidades.md](../20260519-1200-rls-multitenant-hardening/phase-01-hotfix-vulnerabilidades.md#paso-1--migración-sql-hotfix-de-tenants-h1-30-min).
> Seguir ese plan exactamente. No duplicar el SQL aquí.
>
> Pre-check obligatorio: `SELECT count(*) FROM tenants WHERE auth_user_id IS NULL` debe ser 0.

### 1-19 — RLS knowledge_base (migration SQL)

```sql
-- Nueva migration: fix policy dead letter knowledge_base
-- Eliminar política que usa app.current_tenant (nunca seteado)
-- Reemplazar por política funcional

DROP POLICY IF EXISTS "knowledge_base_tenant_policy" ON public.knowledge_base;

CREATE POLICY "knowledge_base_read_own_tenant" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "knowledge_base_write_own_tenant" ON public.knowledge_base
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE auth_user_id = auth.uid()
    )
  );
```

(Provisional hasta F2 del plan RLS introduce `tenant_members`.)

### 1-20 / 1-21 — Filtros tenant en calls.ts e inbox.ts

```
ANTES:
  fetchCalls() → SELECT * FROM calls (sin WHERE tenant_id)
  inboxFunction() → SELECT * FROM inbox WHERE id = $param (sin verify tenant ownership)

DESPUÉS:
  fetchCalls() → const tenantId = await getActiveTenantId() → SELECT WHERE tenant_id = tenantId
  inboxFunction() → const tenantId = await getActiveTenantId() → SELECT WHERE id = $param AND tenant_id = tenantId
```

## Related Code Files

**Modificar:**
- `src/middleware.ts:62-68` — cambiar `user_metadata` por `app_metadata` (1-16)
- `src/lib/supabase/admin-actions.ts` o crear `src/lib/auth/set-admin-role.ts` — función server-only (1-16)
- `src/lib/actions/tenant.ts:140-197` — añadir verificación admin (1-17)
- `src/lib/actions/calls.ts:56-371` — añadir filtro tenant_id en 4 funciones (1-20)
- `src/lib/inbox.ts:448-501` — añadir verificación ownership en 9 funciones (1-21)

**Crear:**
- `supabase/migrations/YYYYMMDD_fix_knowledge_base_rls.sql` (1-19)

**Referir (no duplicar):**
- `supabase/migrations/20260519_hotfix_tenants_rls.sql` — ya definido en plan RLS (1-18)

## Implementation Steps

### 1-16 — Fix is_admin user_metadata → app_metadata (4h)

1. En `src/middleware.ts:62-68`: cambiar `user.user_metadata.is_admin` por `user.app_metadata.is_admin`.
2. Crear función `setUserAdminRole(userId, isAdmin)` que use `supabase.auth.admin.updateUserById` (requiere `service_role`). Guardar en `src/lib/auth/set-admin-role.ts`.
3. Backfill: script o función one-shot que migre usuarios existentes con `user_metadata.is_admin === true` a `app_metadata.is_admin = true`. Ejecutar antes del deploy.
4. Verificar: un usuario no puede llamar a `supabase.auth.updateUser({ data: { is_admin: true } })` y obtener acceso admin (la key `app_metadata` es ignorada en `updateUser` con anon key).
5. Test: usuario con `user_metadata.is_admin: true` → acceso denegado. Usuario con `app_metadata.is_admin: true` (seteado vía server) → acceso concedido.

### 1-17 — Verificación rol admin en server actions tenant (3h)

1. Crear helper `requireAdminServerAction()` en `src/lib/auth/require-admin-server-action.ts`:
   - Lee sesión actual.
   - Verifica `app_metadata.is_admin === true`.
   - Si no → throw `UnauthorizedError` (que el caller convierte en 403).
2. En `src/lib/actions/tenant.ts:140-197`:
   - Añadir `await requireAdminServerAction()` al inicio de `createTenant`, `deleteTenant`, `updateTenant`.
   - Para `deleteTenant`/`updateTenant`: verificar además que el tenant a modificar pertenece al usuario actual.
3. Tests: llamar `createTenant` como usuario no-admin → error. Como admin → éxito.

### 1-18 — Fix RLS tabla tenants (3h)

> Ver [plan RLS phase-01 Paso 1](../20260519-1200-rls-multitenant-hardening/phase-01-hotfix-vulnerabilidades.md#paso-1--migración-sql-hotfix-de-tenants-h1-30-min) para el SQL completo.

1. Pre-check: `SELECT count(*) FROM tenants WHERE auth_user_id IS NULL` → debe ser 0.
2. Crear y aplicar `supabase/migrations/20260519_hotfix_tenants_rls.sql` (SQL ya definido en plan RLS).
3. Verificar en SQL editor: usuario normal solo ve su propio tenant.

### 1-19 — Fix RLS knowledge_base dead letter (2h)

1. Crear `supabase/migrations/YYYYMMDD_fix_knowledge_base_rls.sql` con el SQL del bloque Architecture.
2. Aplicar en staging → verificar con SQL editor que un usuario no puede leer knowledge_base de otro tenant.
3. Verificar que la app sigue funcionando (el lookup de knowledge_base para el agente IA no está roto).

### 1-20 — Fix fetchCalls sin filtro tenant (4h)

1. Leer `src/lib/actions/calls.ts:56-371` — identificar las 4 funciones sin filtro `tenant_id`.
2. Para cada función:
   - Añadir `const tenantId = await getActiveTenantId()` al inicio.
   - Si `tenantId` es null → devolver array vacío o error 401.
   - Añadir `.eq('tenant_id', tenantId)` en la query de Supabase.
3. Verificar que el tipo de retorno sigue siendo compatible con los callers.
4. Test: crear llamadas de 2 tenants distintos → verificar que `fetchCalls` del tenant A no devuelve llamadas del tenant B.

### 1-21 — Fix IDOR inbox.ts 9 funciones (8h)

1. Leer `src/lib/inbox.ts:448-501` — listar las 9 funciones con IDOR.
2. Para cada función:
   - Identificar el parámetro UUID (leadId, chatId, etc.) que se usa sin verificar ownership.
   - Añadir `const tenantId = await getActiveTenantId()` al inicio.
   - Añadir `.eq('tenant_id', tenantId)` en la query (o un JOIN que verifique ownership).
   - Si el recurso no pertenece al tenant → devolver 404 (no 403 — no confirmar existencia del recurso).
3. Casos especiales: funciones que aceptan múltiples UUIDs → verificar ownership para cada uno.
4. Tests (mínimo 1 por función): usuario del tenant A pide recurso del tenant B → 404.

## Todo List

- [ ] 1-16: Cambiar `user_metadata.is_admin` → `app_metadata.is_admin` en `middleware.ts:62-68`
- [ ] 1-16: Crear `src/lib/auth/set-admin-role.ts`
- [ ] 1-16: Ejecutar backfill de usuarios existentes
- [ ] 1-16: Test: user no puede auto-escalar via user_metadata
- [ ] 1-17: Crear `src/lib/auth/require-admin-server-action.ts`
- [ ] 1-17: Añadir guard en `createTenant`, `deleteTenant`, `updateTenant`
- [ ] 1-17: Tests acceso denegado / concedido
- [ ] 1-18: Pre-check `auth_user_id IS NULL` → 0
- [ ] 1-18: Aplicar migration del plan RLS (no duplicar SQL)
- [ ] 1-18: Verificar en SQL editor usuario ve solo su tenant
- [ ] 1-19: Crear migration `fix_knowledge_base_rls.sql`
- [ ] 1-19: Aplicar y verificar en staging
- [ ] 1-19: Verificar app sigue funcionando (agente IA consulta KB)
- [ ] 1-20: Leer calls.ts:56-371 — identificar 4 funciones sin filtro
- [ ] 1-20: Añadir filtro `tenant_id` en las 4 funciones
- [ ] 1-20: Test cross-tenant isolation
- [ ] 1-21: Leer inbox.ts:448-501 — listar 9 funciones con IDOR
- [ ] 1-21: Añadir verificación ownership en las 9 funciones
- [ ] 1-21: Tests IDOR → 404 (mínimo 1 por función)
- [ ] Typecheck: `npm run typecheck` → 0 errores nuevos

## Success Criteria

- Usuario con `user_metadata.is_admin: true` no obtiene acceso admin (1-16).
- `createTenant` sin ser admin → error 403 (1-17).
- Usuario A no puede ver tenants de usuario B (SQL editor test) (1-18).
- Usuario A no puede leer knowledge_base de tenant B (1-19).
- `fetchCalls` del tenant A no devuelve llamadas del tenant B (1-20).
- Las 9 funciones de inbox con UUID ajeno devuelven 404 (1-21).

## Risk Assessment

| Riesgo | Likelihood | Impact | Mitigación |
|--------|-----------|--------|------------|
| Backfill 1-16 no migra todos los admins existentes → acceso admin perdido | Media | Alto | Verificar en staging con usuarios reales antes de producción; script reversible |
| Migration 1-18 bloquea usuarios sin auth_user_id linkeado | Alta | Alto | Pre-check obligatorio; script de backfill si > 0 filas afectadas |
| Filtros tenant_id en 1-20/1-21 rompen funcionalidades que funcionaban con datos cross-tenant | Baja | Medio | Los datos cross-tenant eran una fuga, no una feature — documentar |
| 1-21: 8h es optimista para 9 funciones con patrones complejos | Media | Bajo | Si supera 10h → reportar blocker, priorizar las más graves (las que modifican datos) |

## Security Considerations

- 1-16: `app_metadata` en Supabase Auth solo puede ser modificado con `service_role`. Un usuario con el anon key o el JWT propio NUNCA puede modificar su `app_metadata`. Esto es la garantía de seguridad.
- 1-18/1-19: Las políticas RLS provisionales (basadas en `auth_user_id`) son suficientes para Sprint 0. En Sprint 1, la Fase 1 del plan RLS introduce `tenant_members` para el modelo N:M completo.
- 1-21: Devolver 404 (no 403) para recursos de otros tenants es intencional — no confirmar la existencia del recurso.
- Las migraciones SQL deben aplicarse primero en staging, verificadas, y luego en producción. Nunca aplicar directamente en producción sin test previo.

## Next Steps

→ [Phase 06 — Otros críticos](phase-06-otros-criticos.md)
