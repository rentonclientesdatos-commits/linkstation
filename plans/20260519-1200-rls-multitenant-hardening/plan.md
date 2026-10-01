# Plan: RLS Multi-Tenant Hardening

**Fecha creación:** 2026-05-19 12:00
**Estado:** 📋 PLANIFICADO (pendiente ejecución)
**Owner:** Renzo
**Stack confirmado:** Supabase client + Zod v4 + PostgreSQL RLS + Repository pattern (sin ORM nuevo)

---

## Objetivo

Garantizar aislamiento estricto entre tenants en el linkstation mediante PostgreSQL Row-Level Security, eliminando la dependencia actual del backend en `service_role` y cerrando vulnerabilidades activas detectadas en la auditoría inicial.

## 🚨 Hallazgos críticos de la auditoría (2026-05-19)

Cuatro vulnerabilidades **activas en producción** detectadas durante la revisión del código. Las cuatro se abordan en las **Fases 1-2** (las primeras del plan):

| # | Hallazgo | Severidad | Evidencia | Mitigación en |
|---|---|---|---|---|
| **H1** | Tabla `tenants` con política `USING (true)` para `authenticated` → cualquier user logueado lee/modifica TODOS los tenants | 🔴 Crítica | [supabase/tenants.sql](../../supabase/tenants.sql) políticas `Allow authenticated read/insert/update/delete` | **F1 paso 1** (provisional) + **F2 paso 4** (final con `tenant_members`) |
| **H2** | Backend usa `service_role` global → todas las políticas RLS son bypassed; query sin `WHERE tenant_id` devuelve datos cross-tenant | 🔴 Crítica | [src/lib/supabase/server.ts](../../src/lib/supabase/server.ts) `getSupabaseServerClient()` usa `SERVICE_ROLE_KEY` | **F1 paso 5** (mitigación inmediata: audit logging + flag) + **F3-F4** (fix estructural) |
| **H3** | Credenciales JWT hardcoded en código fuente (service_role y anon key como fallback) → commiteadas a git history público | 🔴 Crítica | [src/lib/supabase/server.ts:6-8](../../src/lib/supabase/server.ts#L6-L8) `FALLBACK_SERVICE_KEY`, `FALLBACK_ANON_KEY` | **F1 paso 2** (eliminar) + **F1 paso 3** (rotar en Supabase) |
| **H4** | Cookie `af-tenant-id` cliente-controlada, sin validación contra membresía real → un user puede cambiar la cookie y "ser" otro tenant | 🟠 Alta | [src/lib/supabase/server.ts:13-16](../../src/lib/supabase/server.ts#L13-L16) `getActiveTenantId()` solo lee cookie | **F1 paso 4** (validar contra `auth_user_id`) + **F2 paso 4** + **F4 paso 5** (validación final con `tenant_members`) |

**Hallazgos adicionales** (no activos pero estructurales):
- **H5**: Sin tests anti-fuga en CI → ningún gate impide que el próximo PR reintroduzca el problema. Mitigación: **F7** completa.
- **H6**: Modelo "tenant con Supabase propio" ([tenant-client.ts](../../src/lib/supabase/tenant-client.ts)) coexiste con modelo centralizado sin documentación clara. Mitigación: **F8** docs.

**Impacto regulatorio:**
- GDPR/LOPD: H1-H2-H4 implican que datos personales de leads de un cliente pueden ser leídos por otro cliente autenticado → incumplimiento art. 32 RGPD (seguridad del tratamiento).
- Riesgo de multa AEPD: hasta 4% facturación o 20M€ por brecha confirmada.
- Single-point-of-failure operacional: dependencia 100% de disciplina del desarrollador para añadir `WHERE tenant_id = ?` en cada query.

## Motivación (resumen ejecutivo)

El sistema actual depende de que **cada developer recuerde** filtrar por tenant en cada query. Esta protección frágil ya falla en cuatro puntos concretos (H1-H4). La solución estructural: aislar tenants en la base de datos (RLS), no en la lógica de aplicación.

## Stack final acordado

| Capa | Herramienta | Notas |
|---|---|---|
| Seguridad multi-tenant | PostgreSQL RLS + `tenant_members` | Aislamiento garantizado por DB |
| Acceso a datos | `@supabase/supabase-js` + `@supabase/ssr` | Ya instalados, no se añade ORM |
| Tipos de DB | `supabase gen types typescript` | Auto-generados |
| Validación I/O | Zod v4 (ya instalado) | Solo en boundaries (API, webhooks, sync CRM) |
| Repository wrapper | `src/lib/repositories/` (nuevo) | Única vía de acceso a la DB |
| Migraciones | `supabase/migrations/*.sql` (existente) | Source-of-truth en SQL |

## Decisiones clave

- **NO se añade Drizzle, Prisma, Kysely ni ningún ORM nuevo.** El cliente Supabase ya cubre query building con tipos.
- **NO se desactiva el modelo "tenant con Supabase propio"** ([tenant-client.ts](../../src/lib/supabase/tenant-client.ts)), pero se documenta como legacy y todas las nuevas integraciones usan el modelo centralizado con RLS.
- **El `tenant_id` ya NO se obtiene de cookie**: se deriva del JWT del usuario autenticado + lookup en `tenant_members`. La cookie solo expresa "tenant activo" entre los permitidos.
- **Service role queda restringido** a: provisioning de tenants, jobs cron de sistema, webhooks externos (con `SET LOCAL app.tenant_id` obligatorio).

## Fases

| # | Fase | Hallazgos cubiertos | Estado | Tiempo Est. | Archivo |
|---|---|---|---|---|---|
| 1 | **Hotfix de los 4 hallazgos críticos** (parche inmediato) | H1✅ H2🟡 H3✅ H4🟡 | ⏳ Pendiente | 2h 30min | [phase-01-hotfix-vulnerabilidades.md](phase-01-hotfix-vulnerabilidades.md) |
| 2 | Esquema `tenant_members` + helpers RLS (cierre estructural H1+H4) | H1✅ H4✅ | ⏳ Pendiente | 3h 0min | [phase-02-esquema-tenant-members.md](phase-02-esquema-tenant-members.md) |
| 3 | Políticas RLS en las 11+ tablas tenant-scoped (cierre H2) | H2🟡 | ⏳ Pendiente | 4h 0min | [phase-03-politicas-rls-tablas-datos.md](phase-03-politicas-rls-tablas-datos.md) |
| 4 | Refactor clientes Supabase user/system/provisioning (cierre H2+H4) | H2✅ H4✅ | ⏳ Pendiente | 6h 0min | [phase-04-refactor-clientes-supabase.md](phase-04-refactor-clientes-supabase.md) |
| 5 | Repository pattern + Zod en boundaries | — | ⏳ Pendiente | 5h 0min | [phase-05-repository-pattern-zod.md](phase-05-repository-pattern-zod.md) |
| 6 | Webhooks y workers BullMQ con tenant_id explícito | — | ⏳ Pendiente | 5h 0min | [phase-06-webhooks-workers.md](phase-06-webhooks-workers.md) |
| 7 | Tests E2E anti-fuga + CI gate (cierre H5) | H5✅ | ⏳ Pendiente | 4h 0min | [phase-07-tests-anti-fuga.md](phase-07-tests-anti-fuga.md) |
| 8 | Performance, docs y rollout (cierre H6) | H6✅ | ⏳ Pendiente | 3h 30min | [phase-08-performance-docs-rollout.md](phase-08-performance-docs-rollout.md) |

**Total estimado:** 33h 0min (≈ 4 días de trabajo focalizado)

**Leyenda hallazgos:** ✅ = cierre completo · 🟡 = mitigación parcial (cierre final en fase posterior)

## Dependencias clave

- F1 puede ejecutarse SOLA en producción (no rompe nada existente, solo cierra fuga).
- F2 → F3 → F4 son secuenciales y deben mergearse juntas en staging.
- F5, F6 pueden paralelizarse tras F4.
- F7 es prerequisito de merge a `main`.
- F8 es post-merge.

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Romper queries existentes al quitar service_role | Alta | Alto | Branch + staging + tests E2E antes de merge |
| Webhooks externos fallan al no setear tenant_id | Media | Medio | Logging permisivo antes de endurecer, alerts en Sentry |
| Performance degradada por subqueries RLS | Baja | Medio | EXPLAIN ANALYZE en queries top-10, índices ya existen |
| Usuarios actuales sin entrada en `tenant_members` | Alta | Alto | Script de migración derivado de `tenants.auth_user_id` |
| Modelo dual (centralizado + tenant-propio) inconsistente | Media | Bajo | Documentar legacy, no migrar tenants existentes |

## Criterios de éxito

- [ ] Cero llamadas a `getAdminSupabaseClient()` desde código de request (solo workers/cron/webhooks).
- [ ] Test E2E: usuario de tenant A no puede leer ni escribir datos de tenant B en NINGUNA tabla.
- [ ] Test E2E: webhook que no setea `tenant_id` falla con 0 filas o error explícito.
- [ ] Cero credenciales hardcoded en código fuente.
- [ ] Tabla `tenants` solo accesible para miembros (read) y owners/admins (update).
- [ ] CI bloquea merge si algún test anti-fuga falla.
- [ ] `docs/system-architecture.md` actualizado con la nueva capa de seguridad.
- [ ] Runbook "cómo añadir tabla tenant-scoped" en docs.

## Siguiente paso

Revisar este plan completo + phase files. Cuando se apruebe, empezar por **F1 (hotfix)** que cierra la vulnerabilidad activa en 1h 30min sin tocar el resto del sistema.
