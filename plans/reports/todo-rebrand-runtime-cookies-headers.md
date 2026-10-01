---
type: todo
status: pending
priority: P2
date: 2026-05-20
owner: tbd
sprint: post-rebrand (futuro, requiere planificacion)
---

# TODO — Rebrand runtime: cookies, headers HTTP, filenames de descarga

## Contexto

Durante el rebrand masivo `esden → af` (2026-05-20), se identificaron **identificadores en codigo de producción** que NO se renombraron en esa pasada porque romperian sesiones activas y compatibilidad con clientes/scripts externos. Necesitan plan de migracion dedicado.

## Identificadores afectados

### Cookies (afecta sesiones de usuarios)
- `esden-tenant-url` (cookie del tenant)
- `esden-tenant-key`
- `esden-tenant-name`
- `esden-tenant-id` (si existe)

Si se renombran de golpe, los usuarios pierden sesion activa al desplegar. Necesario:
- Estrategia de lectura dual durante periodo de gracia (ej: 30 dias)
- Codigo lee primero `af-*` y si no existe lee `esden-*`
- Despues de gracia, se elimina lectura del antiguo

Archivos afectados (lista identificada por subagente, ahora REVERTIDA):
- `src/app/api/admin/tenants/[id]/client-sql/route.ts`
- `src/lib/actions/auth.ts`
- `src/lib/actions/tenant.ts`
- `src/lib/cache/tenant-cache.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/tenant-client.ts`

### Headers HTTP
- `x-esden-tenant` (header custom multi-tenant)

Si APIs externas/clientes envian este header con el nombre antiguo, dejan de funcionar. Mismo enfoque: lectura dual con deprecacion.

### Filenames de descarga (afecta clientes existentes que esperan estos nombres)
- `esden_setup_${tenant}.sql` (export de setup)
- `citas_esden_${date}.csv` (export de citas)
- `bienvenida_esden` (placeholder UI)

Si scripts/usuarios procesan estos archivos por nombre, se rompen. Decidir:
- Mantener nombres antiguos indefinidamente (compatibilidad eterna)
- Renombrar en una fecha de corte con comunicacion previa a clientes

### Strings en docker-compose labels
- `com.esden.service=redis-dev` (label local)
- `com.esden.environment=development`

Estos son labels Docker locales — renombrar es seguro PERO si hay scripts ops/monitoring que filtran por estos labels, se rompen. Decidir caso a caso.

## Acciones propuestas (no ejecutar sin sprint dedicado)

1. **Sprint dedicado** o tarea de Sprint 3 (Hardening) para migracion controlada.
2. Implementar **lectura dual** en codigo para cookies/headers durante 30-60 dias.
3. Decidir politica de filenames con cliente (LinkStation).
4. Anadir tests E2E que verifiquen ambos nombres durante periodo de gracia.
5. Documentar fecha de corte en `docs/release-process.md`.

## Por que NO se incluyo en el rebrand masivo

El rebrand de 2026-05-20 fue mecanico (sed + git mv) sobre docs/agentes/hooks/plans. Tocar runtime sin plan de migracion provoca:
- Sesiones perdidas tras deploy
- Integraciones rotas con scripts externos
- Inconsistencia entre cookie name nuevo y BD que aun guarda referencias al antiguo

Decision: aplazar a sprint dedicado con plan de migracion completo.
