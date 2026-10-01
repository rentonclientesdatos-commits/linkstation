---
title: "Stack Decision — Migración a Drizzle ORM (SUPERSEDED)"
date: 2026-05-19
type: architecture-decision
audience: programadores
status: SUPERSEDED
superseded_by: plans/20260519-1200-rls-multitenant-hardening/research/stack-decision-no-orm.md
superseded_date: 20-05-2026
related:
  - audit/deep/DA-2-auth-rls-deep.md
  - audit/deep/DEEP-FINDINGS-SUMMARY.md
  - roadmap/deep-improvement-backlog.md
---

# Stack Decision — Migración a Drizzle ORM (⚠️ SUPERSEDED)

> ⚠️ **DECISIÓN ANULADA (20-05-2026)**. El Auditor decidió **NO migrar a Drizzle** ni introducir ningún ORM nuevo. La capa de datos se mantiene con `@supabase/ssr` + `@supabase/supabase-js` + **Zod** (validaciones) + **Repository pattern** + RLS multi-tenant hardening.
>
> **Decisión vigente**: ver [`plans/20260519-1200-rls-multitenant-hardening/research/stack-decision-no-orm.md`](../../plans/20260519-1200-rls-multitenant-hardening/research/stack-decision-no-orm.md) y la memoria `project_stack_data_layer.md`.
>
> **Por qué se anuló**: la migración a Drizzle añadía 3-4 semanas de scope sin resolver los problemas críticos de seguridad (que NO dependen del ORM). Los problemas de RLS, tokens expuestos, fallbacks de `service_role`, etc. se resuelven directamente sobre el cliente Supabase actual sin necesidad de un ORM intermedio. Zod cubre la necesidad de type-safety en runtime + compile-time.
>
> **Este documento se mantiene como histórico** para preservar el análisis del trade-off.

---

## TL;DR (histórico — DECISIÓN ANULADA)

**Propuesta original (anulada):** migrar la capa de acceso a datos de `@supabase/supabase-js` a **Drizzle ORM** sobre la misma base de datos Supabase Postgres.

**Estimación:** 3-4 semanas de desarrollo (15-20 días/dev) ejecutadas **DESPUÉS** del Sprint 0 de hotfixes de seguridad.

**Lo que conservamos sin migración:**
- Supabase Auth (sesiones, JWTs, `auth.users`).
- Supabase Realtime (subscripciones websocket del inbox/dashboards).
- Supabase Storage (PDFs del Knowledge Base).
- La misma base de datos Postgres en producción (sin migración de datos).

**Lo que reemplazamos:**
- `@supabase/supabase-js` para queries CRUD → Drizzle.
- 9 fallbacks de `service_role` JWT hardcodeados → cliente Drizzle con env vars obligatorias.
- 426 `as any`/`as unknown` → tipos generados desde el schema.
- RLS policies SQL sueltas → RLS declarada en TypeScript junto a las tablas.

**Lo que NO resuelve por sí solo** (sigue requiriendo Sprint 0):
- Rotación de JWTs.
- Cierre de 7 endpoints públicos.
- Privilege escalation via `user_metadata.is_admin`.
- Firmas en webhooks.
- Bug `worker.js:58`.
- WCAG accesibilidad.

> ⚠️ **Esta migración NO sustituye al Sprint 0 del backlog.** El Sprint 0 (hotfixes de seguridad) sigue siendo bloqueante y debe ejecutarse PRIMERO. Drizzle aporta valor estructural a medio plazo, no es un parche de seguridad inmediato.

---

## 1. Por qué Drizzle (no Prisma, no quedarse con supabase-js)

### Comparativa rápida

| Criterio | Supabase-js (actual) | Prisma | **Drizzle** |
|---|---|---|---|
| **Type safety** | Manual, 426 `as any` actuales | Generada | **Generada** |
| **Conserva Supabase Auth** | Sí | No (hay que migrar) | **Sí** |
| **Conserva Supabase Realtime** | Sí | No | **Sí** |
| **Conserva Supabase Storage** | Sí | No | **Sí** |
| **RLS declarada junto al schema** | No (SQL suelto) | No soporta RLS | **Sí, `pgPolicy()` en TS** |
| **Soporte serverless / edge** | Bueno | Problemas pooling (Accelerate $) | **Excelente con `postgres-js` + Transaction pool** |
| **Tamaño bundle cliente** | ~150 KB | ~5-10 MB (pesado en cold start) | **~50 KB** |
| **Curva de aprendizaje** | Conocido | Alto (motor propio) | **Bajo (SQL-like)** |
| **Migración del schema actual (50 migrations)** | N/A | Reinventar | **`drizzle-kit introspect` lee el schema existente** |
| **Mantenimiento de migrations** | SQL puro | `prisma migrate` | **`drizzle-kit generate` desde diff TS** |
| **Tiempo de migración** | 0 | 4-6 semanas | **3-4 semanas** |

### Conclusión

Drizzle es **el único que conserva la integración Supabase completa** (Auth + Realtime + Storage), tiene **mejor type safety que supabase-js**, permite **declarar RLS en TypeScript** (lo cual resuelve la categoría de findings F-04-004/F-04-005/F-04-006 de RLS rotas) y tiene un **bundle 100× más ligero que Prisma**.

---

## 2. Lo que Drizzle resuelve del audit (con findings concretos)

| Finding | Severidad actual | Cómo lo resuelve Drizzle | Esfuerzo |
|---|---|---|---|
| **426 `as any` en código** | Tech debt High | Tipos inferidos automáticamente desde el schema TS | Resuelto al migrar cada query |
| **D-001 `USER_ESTUDIES` vs `USER_STUDIES`** | Alto | Si la columna existe en BD, Drizzle la tipa. Si no, el código no compila. **Imposible que coexistan 2 nombres para la misma cosa.** | Resuelto en Fase 2 |
| **D-002 — 4 variantes de `YEARS_EXPERIENCE` (incluida una con espacio)** | Alto | El typo `"YEARS_ EXPERIENCIE"` (con espacio) se vuelve **error de compilación** porque no existe en el schema | Resuelto en Fase 2 |
| **D-005 — schema `qualified` triplicado** | Critical | Un único `pgEnum('qualified', ['apto','no apto'])` declarado en un solo sitio. Cualquier código que use otro valor → error de compilación | Resuelto en Fase 3 |
| **F-04-001 `fetchCalls` sin filtro `tenant_id`** | Critical | Helper `tenantDb()` que **fuerza** el `where(eq(tenant_id, ctx.tenantId))` en cada query. Imposible olvidarlo. | Resuelto en Fase 2 |
| **F-04-005/006/008 — RLS tautológicas (`USING(true)`)** | Critical | Las policies se declaran en TS junto a la tabla; `drizzle-kit` las aplica como migration. Code review las ve. | Resuelto en Fase 3 |
| **F-04-004 — RLS de `knowledge_base` usa `app.current_tenant` que nunca se setea** | High | Cliente Drizzle con middleware que setea `app.current_tenant` en cada conexión transactional usando `set_config()` | Resuelto en Fase 4 |
| **F-05-SEC-001 — 9 fallbacks de `service_role` JWT hardcoded** | Critical | Cliente Drizzle exige `DATABASE_URL` env var sin fallback. Sin env → falla al arrancar (fail fast, no silent) | Resuelto en Fase 1 |
| **F-04-013 — `chat_messages.tenant_id` es TEXT no UUID** | High | Al introspect, el typo del tipo se detecta. Se corrige con migration generada por `drizzle-kit` | Resuelto en Fase 3 |
| **F-04-X — `appointments` y `agendamientos` duplicadas** | Medium | El schema TS deja ver la duplicación en un solo archivo. Se decide cuál mantener. | Resuelto en Fase 3 |
| **DA-1-002 — `getSupabaseServerClient()` llamado 6+ veces por job** | High | Singleton de cliente Drizzle + connection pool por defecto | Resuelto en Fase 1 |
| **DA-2-008 — service_key de tenant externo en `Map` en memoria sin cifrar** | High | Migrable a una estrategia con KMS/Vault; Drizzle no lo resuelve directamente pero el refactor se incluye | Parcial |
| **Schemas BD divergentes entre code y migrations** | Medium | `drizzle-kit check` detecta divergencias entre el schema TS y la BD real | Resuelto en Fase 1 |

**Total findings resueltos directamente por Drizzle:** ~15 (incluidos 4 Critical y 6 High).

---

## 3. Lo que Drizzle NO resuelve

Para evitar generar expectativas falsas, lista explícita de findings que **NO** se tocan con esta migración:

| Finding | Por qué Drizzle no ayuda | Quién resuelve |
|---|---|---|
| F-02-001 — Bug firma `worker.js:58` | Bug en función TypeScript, no en BD | Sprint 0 |
| F-02-005 — `llm-factory.ts` no existe | Archivo faltante en capa LLM | Sprint 0 |
| DA-2-001 — 7 endpoints sin autenticación | Auth en routes, no en BD | Sprint 0 |
| DA-2-005 — Privilege escalation `is_admin` | `user_metadata` editable, capa Auth | Sprint 0 |
| DA-3-001 — Crons públicos sin auth | Capa de routes | Sprint 0 |
| DA-3-002 — SSRF en `/api/tenant/migrate` | Capa de routes | Sprint 0 |
| DA-4-001 — Webhook Retell sin firma HMAC | Capa de webhooks | Sprint 0 |
| 24 findings WCAG accesibilidad | Capa frontend | Sprint WCAG |
| DA-3-CVE-* — CVEs Next/axios | Bump de deps | Sprint 0 |
| Costes LLM ficticios en dashboard | Falta persistir `completion.usage` | Sprint 3 |
| 0% cobertura tests | Falta framework | Sprint 4 |

---

## 4. Setup técnico para este proyecto

### 4.1 Stack final

```
@supabase/ssr             ← se mantiene (Auth + sesiones server-side)
@supabase/supabase-js     ← se mantiene SOLO para Realtime + Storage + Auth client
drizzle-orm@latest        ← NUEVO (queries CRUD tipadas)
drizzle-kit@latest        ← NUEVO (introspect, migrate, studio)
postgres@^3.4.9           ← ya está, lo usamos como driver
```

> ✅ **Importante:** no quitamos `@supabase/supabase-js`. Se queda para Auth + Realtime + Storage. Drizzle solo reemplaza la parte CRUD/queries.

### 4.2 Conexión: Transaction pool mode (recomendado para Next.js serverless)

Supabase ofrece tres modos de pooler:
- **Session mode** (puerto `5432`): conexión persistente, ideal para apps tradicionales.
- **Transaction mode** (puerto `6543`): pool agresivo, **recomendado para serverless** (Vercel, Cloudflare).
- **Statement mode**: prohíbe prepared statements.

Para Next.js 16 server actions y route handlers, usar **Transaction mode** con `prepare: false`:

```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required (no fallback)');
}

// Transaction pool: prepare false, max 1 (Vercel serverless), idle_timeout 20s
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle({ client, schema, logger: process.env.NODE_ENV === 'development' });
```

> ⚠️ **No usar `DATABASE_URL` con superuser (`postgres:postgres`).** El connection string debe ser **el del pooler** con un usuario con permisos restringidos al schema `public` (y los que correspondan), nunca `postgres` superuser. Este es el momento de **cerrar el F-04-003** (scripts `migrate-*.ts` con `postgres:postgres`) creando un usuario dedicado.

### 4.3 Variables de entorno

```env
# .env.local (NO commitear)

# Drizzle: pooler Supabase transaction mode (puerto 6543)
DATABASE_URL=postgresql://<user>:<password>@<project>.pooler.supabase.com:6543/postgres

# Solo para migrations (drizzle-kit): sesión directa (puerto 5432)
DIRECT_URL=postgresql://<user>:<password>@<project>.pooler.supabase.com:5432/postgres

# Supabase (se mantiene para Auth + Realtime + Storage)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role>  # SOLO para Auth admin operations, NO para queries

# Nuevo principio: este servicekey ya NO se usa para queries.
# Las queries van por DATABASE_URL con un user no-superuser.
```

### 4.4 Estructura de carpetas

```
src/lib/db/
├── client.ts              ← cliente Drizzle singleton
├── schema/
│   ├── index.ts           ← re-export de todos los schemas
│   ├── auth.ts            ← FK al auth.users de Supabase (referencia, no se modifica)
│   ├── tenant.ts          ← tenants, tenant_orchestrator_config, members
│   ├── lead.ts            ← lead, lead_cualificacion, lead_programas, lead_events
│   ├── conversation.ts    ← chat_messages, chat_summaries
│   ├── call.ts            ← llamadas, intentos_llamadas, agendamientos
│   ├── orchestration.ts   ← workflows, orchestration_graphs, orchestration_rules
│   ├── ai.ts              ← ai_agents, ai_agent_variants, voice_agents
│   ├── knowledge.ts       ← knowledge_base, knowledge_base_embeddings
│   ├── widget.ts          ← web_widgets
│   ├── billing.ts         ← llm_usage, billing_events (NUEVAS para Sprint 3)
│   └── enums.ts           ← pgEnum centralizados (qualified, estado, tipo_lead)
├── helpers/
│   ├── tenant-db.ts       ← wrapper que fuerza filtro tenant_id
│   ├── ownership.ts       ← verificación ownership de leads/agentes
│   └── jsonb-schemas.ts   ← zod schemas para campos metadata JSONB
├── repositories/
│   ├── lead.repo.ts       ← funciones de alto nivel (replace server actions)
│   ├── call.repo.ts
│   ├── tenant.repo.ts
│   └── ...
└── migrations/            ← generadas por drizzle-kit
    ├── 0000_initial.sql   ← introspect del estado actual
    ├── 0001_*.sql
    └── meta/
        └── _journal.json

drizzle.config.ts          ← configuración drizzle-kit (en raíz)
```

### 4.5 `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  verbose: true,
  strict: true,
  // Filtrar schemas auth/storage/realtime de Supabase (no los modificamos nosotros)
  schemaFilter: ['public'],
  // entitiesFilter para no recrear las tablas de extensions
  extensionsFilters: ['postgis'],
});
```

---

## 5. Plan de migración (5 fases, 15-20 días/dev)

### Fase 0 — Setup y introspección (1 día)

**Objetivo:** tener el schema actual reproducido en TypeScript sin tocar la BD.

1. `npm install drizzle-orm drizzle-kit`
2. Crear `drizzle.config.ts` apuntando a `DIRECT_URL`.
3. Ejecutar `drizzle-kit introspect` → genera el schema TS desde la BD real.
4. Reorganizar el schema generado en los archivos modulares de `src/lib/db/schema/*` (lead, conversation, etc.).
5. Crear cliente singleton en `src/lib/db/client.ts`.
6. **Verificar**: `drizzle-kit check` debe reportar **0 diferencias** entre el schema TS y la BD.
7. **NO se toca código existente todavía.** Solo se añade la capa nueva en paralelo.

**Entregable:** `src/lib/db/` con schema completo tipado y cliente operativo. El proyecto sigue funcionando 100% con `supabase-js`.

### Fase 1 — Helpers críticos y migración del cliente seguro (2-3 días)

**Objetivo:** infraestructura para forzar filtros tenant + eliminar JWT hardcodeados.

1. **Crear usuario Postgres dedicado** (no `postgres` superuser) con permisos al schema `public`:
   ```sql
   CREATE ROLE app_user WITH LOGIN PASSWORD '<random-strong>';
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
   -- NO superuser, NO bypass RLS
   ```
2. Cerrar los 11 connection strings de `scripts/migrate-*.ts` (D-007.A item 12) y migrarlos a env vars.
3. Eliminar los 9 fallbacks de `service_role` JWT en código (D-007.A item 1) y reemplazar por `throw` si falta env.
4. **Helper `tenantDb(ctx)`** — wrapper que añade automáticamente filtro `tenant_id`:

```typescript
// src/lib/db/helpers/tenant-db.ts
import { db } from '../client';
import { eq, and, SQL } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export type TenantContext = { tenantId: string; userId: string; isAdmin: boolean };

/** Forza el filtro tenant_id en cada SELECT/UPDATE/DELETE */
export function tenantDb(ctx: TenantContext) {
  return {
    async findMany<T extends PgTable & { tenant_id: any }>(
      table: T,
      where?: SQL
    ) {
      const tenantFilter = eq(table.tenant_id, ctx.tenantId);
      const finalWhere = where ? and(tenantFilter, where) : tenantFilter;
      return db.select().from(table).where(finalWhere);
    },

    async findById<T extends PgTable & { id: any; tenant_id: any }>(
      table: T,
      id: string
    ) {
      const rows = await db
        .select()
        .from(table)
        .where(and(eq(table.id, id), eq(table.tenant_id, ctx.tenantId)))
        .limit(1);
      if (rows.length === 0) throw new NotFoundError(`${table._.name}/${id}`);
      return rows[0];
    },

    async update<T extends PgTable & { tenant_id: any }>(
      table: T,
      values: Partial<T['$inferInsert']>,
      where: SQL
    ) {
      return db
        .update(table)
        .set(values)
        .where(and(eq(table.tenant_id, ctx.tenantId), where));
    },

    async delete<T extends PgTable & { tenant_id: any }>(
      table: T,
      id: string
    ) {
      const result = await db
        .delete(table)
        .where(and(eq(table.id, id), eq(table.tenant_id, ctx.tenantId)));
      if (result.length === 0) throw new NotFoundError(`${table._.name}/${id}`);
      return result;
    },

    raw: db, // escape hatch para queries cross-tenant (ej. dashboards admin) — con linter que avise
  };
}
```

5. **Helper `getRequestContext()`** que extrae `tenantId` desde la **sesión Supabase** (no la cookie plain `af-tenant-id`):

```typescript
// src/lib/db/helpers/context.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getRequestContext(): Promise<TenantContext> {
  const supabase = await createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  // Lee el tenant_id desde una tabla user_tenants (con FK a auth.users.id)
  // NO desde una cookie plain — eso es lo que rompe el multi-tenant ahora
  const userTenants = await db
    .select()
    .from(schema.userTenants)
    .where(eq(schema.userTenants.user_id, user.id));

  if (userTenants.length === 0) throw new ForbiddenError('No tenant assigned');

  // Si el usuario es member de 1 tenant: ese. Si es member de varios: el header `x-tenant-id` validado contra membership.
  const requestedTenant = (await cookies()).get('af-tenant-id')?.value;
  const tenant = userTenants.find(t => t.tenant_id === requestedTenant) ?? userTenants[0];

  return {
    tenantId: tenant.tenant_id,
    userId: user.id,
    isAdmin: tenant.role === 'admin', // ← rol leído de tabla, NO de user_metadata
  };
}
```

**Esto cierra:**
- DA-2-005 (privilege escalation via `user_metadata` editable) → el `isAdmin` se lee de `user_tenants.role`, no de `user_metadata`.
- D-007.A item 4 (cross-tenant via cookie tampering) → la cookie se valida contra la tabla `user_tenants`.

**Entregable:** infraestructura lista. Cero changes en routes/actions todavía. Tests unitarios de los helpers.

### Fase 2 — Migración de server actions críticas (5-7 días)

**Objetivo:** reescribir las server actions con IDOR usando `tenantDb` y eliminar la posibilidad de cross-tenant.

Prioridad de migración (alineada con findings Critical):

| Orden | Archivo | Findings que cierra |
|---|---|---|
| 1 | `src/lib/actions/calls.ts` | F-04-001 (fetchCalls) |
| 2 | `src/lib/actions/inbox.ts` (9 funciones) | DA-2 IDOR sweep |
| 3 | `src/lib/actions/tenant.ts` | DA-2-004 |
| 4 | `src/lib/actions/orchestrator-config.ts` | F-04-X |
| 5 | `src/lib/actions/lead-events.ts` | F-01-010 |
| 6 | Resto de actions (~15 archivos) | varios |

**Patrón estándar** — toda action queda así:

```typescript
// ANTES (vulnerable, F-04-001)
'use server';
export async function fetchCalls(filters: CallFilters) {
  const supabase = createServiceClient(); // ← service_role, bypassa RLS
  const { data } = await supabase
    .from('lead')
    .select('*')
    .order('updated_at', { ascending: false });
  // ❌ No filtra tenant_id
  return data;
}

// DESPUÉS (seguro)
'use server';
import { getRequestContext, tenantDb } from '@/lib/db/helpers';
import { lead } from '@/lib/db/schema';

export async function fetchCalls(filters: CallFilters) {
  const ctx = await getRequestContext(); // ← sesión Supabase + tenant validado
  const db = tenantDb(ctx);              // ← wrapper con filtro automático

  return db.findMany(lead, /* extra filters */);
  // ✅ tenant_id filtrado por imposición del helper, imposible olvidarlo
}
```

**Entregable:** Critical de IDOR cerrados, F-04-001/F-04-008 cerrados, code review puede verificar visualmente que cada action llama a `getRequestContext` + `tenantDb`.

### Fase 3 — Schema unificado y JSONB tipado (3-4 días)

**Objetivo:** resolver las divergencias de nomenclatura del informe v3.5.

1. **Enums centralizados** en `src/lib/db/schema/enums.ts`:

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const qualifiedEnum = pgEnum('qualified', ['apto', 'no apto', '']);
export const estadoEnum = pgEnum('estado', [
  'cualificado', 'agendado', 'descartado', 'pendiente'
]);
export const tipoLeadEnum = pgEnum('tipo_lead', [
  'CUALIFICADO', 'DESCARTADO', 'PENDIENTE'
]);
```

Migration generada por drizzle-kit reemplaza columnas `text` por `enum` con check constraints. **Imposible insertar `"si"` cuando el enum permite solo `"apto"`.**

2. **Schemas Zod para campos JSONB** en `src/lib/db/helpers/jsonb-schemas.ts`:

```typescript
import { z } from 'zod';

export const leadMetadataSchema = z.object({
  USER_NAME: z.string().optional(),
  USER_STUDIES: z.string().optional(), // ← SOLO esta grafía. USER_ESTUDIES rechazado.
  YEARS_EXPERIENCE: z.number().int().nonnegative().optional(), // ← SOLO esta. Las 4 variantes legacy rechazadas.
  USER_PROFESSION: z.string().optional(), // ← pendiente decisión cliente: profession o profesion
  USER_COUNTRY: z.string().optional(),
  USER_PHONE: z.string().regex(/^\+/).optional(),
  CURSE_NAME: z.string().optional(),
  // ...
}).strict(); // ← strict: rechaza claves desconocidas
```

3. **Migration de datos legacy** — script de una sola ejecución que limpia datos sucios:

```typescript
// scripts/migrate-legacy-metadata.ts (DRY-RUN primero)
for await (const row of allLeads()) {
  const meta = row.metadata as any;
  const cleaned = {
    ...meta,
    USER_STUDIES: meta.USER_STUDIES ?? meta.USER_ESTUDIES,
    YEARS_EXPERIENCE: parseInt(
      meta.YEARS_EXPERIENCE ?? meta.YEARS_EXPERIENCIE ?? meta['YEARS_ EXPERIENCIE'] ?? meta.years_experience ?? '0'
    ),
  };
  delete cleaned.USER_ESTUDIES;
  delete cleaned.YEARS_EXPERIENCIE;
  delete cleaned['YEARS_ EXPERIENCIE'];
  delete cleaned.years_experience;
  await db.update(lead).set({ metadata: cleaned }).where(eq(lead.id, row.id));
}
```

4. **Consolidar `appointments` / `agendamientos`** — decisión: mantener `agendamientos` (es la que usa el orquestador), `DROP TABLE appointments` con migration.

**Entregable:** D-001, D-002, D-005, F-04-013, F-04-X tablas duplicadas — todos cerrados.

### Fase 4 — RLS en TypeScript (3-4 días)

**Objetivo:** declarar las RLS policies junto al schema, en TS, y aplicarlas como migration. Sustituir las RLS tautológicas (`USING(true)`) por filtros reales.

Drizzle 0.30+ soporta `pgPolicy` declarado en TypeScript:

```typescript
import { pgTable, uuid, text, timestamp, pgPolicy } from 'drizzle-orm/pg-core';
import { authUid, authenticatedRole } from 'drizzle-orm/supabase';
import { sql } from 'drizzle-orm';

export const lead = pgTable('lead', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  // ... más columnas
}, (table) => [
  // RLS policy declarada junto a la tabla
  pgPolicy('lead_tenant_isolation', {
    for: 'all',
    to: authenticatedRole,
    using: sql`tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = ${authUid}
    )`,
    withCheck: sql`tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = ${authUid}
    )`,
  }),
]);
```

`drizzle-kit generate` produce el SQL de la migration que:
1. Drop de las policies tautológicas anteriores.
2. Create de las nuevas policies basadas en `user_tenants`.
3. Setea defaults seguros.

**Important:** ahora cuando el frontend usa el **anon key** (Realtime, suscripciones del inbox), RLS realmente filtra. Y cuando el backend usa Drizzle con el `app_user` no-superuser, RLS también aplica. Service_role solo se usa para Auth admin operations puntuales.

**Cierra:** F-04-004, F-04-005, F-04-006, F-04-008, DA-2-010.

**Entregable:** RLS efectiva. Pentest manual: cookie tampering ya no funciona.

### Fase 5 — Tests + observabilidad + cleanup (3-4 días)

1. Setup Vitest + tests de integración con BD efímera (Supabase local o testcontainers).
2. Tests por cada repository (`lead.repo.test.ts`, `call.repo.test.ts`, ...).
3. Test de RLS: crear 2 tenants ficticios, intentar acceso cruzado, debe fallar.
4. Logging estructurado de queries lentas con `drizzle({ logger })`.
5. Eliminar `@supabase/supabase-js` de los archivos que ya solo hacen queries CRUD (queda en Auth, Realtime, Storage).
6. **Borrar definitivamente** `scripts/migrate-*.ts` legacy con `postgres:postgres` (D-007.A item 12).
7. Documentar en `docs/architecture/data-layer.md` el nuevo flujo.

**Entregable:** capa de datos production-ready con tests, observabilidad y RLS efectiva.

---

## 6. Ejemplo concreto end-to-end: `fetchCalls` (F-04-001)

### Antes (vulnerable, hoy en producción)

```typescript
// src/lib/actions/calls.ts:56
'use server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← admin, bypassa RLS
);

export async function fetchCalls() {
  const { data } = await supabase
    .from('lead')
    .select('*, lead_cualificacion(*), llamadas(*)')
    .order('updated_at', { ascending: false });
  // ❌ No hay filtro tenant_id
  // ❌ Cualquier user autenticado con cookie tamper ve leads de todos los tenants
  return data;
}
```

### Después (seguro)

```typescript
// src/lib/actions/calls.ts (Fase 2)
'use server';
import { getRequestContext, tenantDb } from '@/lib/db/helpers';
import { lead, leadCualificacion, llamadas } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function fetchCalls() {
  const ctx = await getRequestContext();
  // ctx.tenantId está validado contra user_tenants (no es la cookie plain)
  // ctx.isAdmin se lee de user_tenants.role (no de user_metadata editable)

  return db
    .select()
    .from(lead)
    .leftJoin(leadCualificacion, eq(leadCualificacion.lead_id, lead.id))
    .leftJoin(llamadas, eq(llamadas.lead_id, lead.id))
    .where(eq(lead.tenant_id, ctx.tenantId)) // ← filtro forzado
    .orderBy(desc(lead.updated_at));
  // ✅ Tipos inferidos: data: { lead: {...}, lead_cualificacion: {...} | null, llamadas: {...} | null }[]
  // ✅ Si alguien olvida el .where(), el tenantDb helper lo añade
  // ✅ Si la RLS de Fase 4 está activa, incluso con bug, no hay leak
}
```

Beneficios concretos:
- **Tipos completos** sin `as any`.
- **Tenant siempre filtrado** (defensa en profundidad: query manual + helper + RLS).
- **Service role NO se usa** en esta query — usa `DATABASE_URL` con `app_user`.

---

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Connection pool saturado en serverless | Media | Alto | Transaction pool mode + `max: 1` + `idle_timeout: 20s` |
| Regresiones funcionales durante migración | Media | Medio | Migración por archivos pequeños, tests E2E mínimos antes de cada PR |
| Realtime subscriptions rompen con nuevas RLS | Baja | Medio | Las policies declaradas en Fase 4 incluyen explícitamente `to: anonRole` con check de `auth.uid()`. Test manual del inbox antes de merge |
| Schema introspect de Fase 0 genera tipos imperfectos | Baja | Bajo | `drizzle-kit check` + revisión humana del schema TS |
| `drizzle-kit` migration borra datos sin querer | Baja | Crítico | **Siempre** `drizzle-kit generate` → revisar SQL → `drizzle-kit push` solo en local primero → migration formal en producción con backup previo |
| El equipo no conoce Drizzle | Media | Bajo | Curva 1-2 días para SQL-like API. Documentación oficial muy buena. Sesión inicial de pair programming |
| Vendor lock-in adicional | Baja | Bajo | Drizzle es OSS y agnóstico (Postgres puro). Salir de Drizzle = volver a SQL plano, no requiere migración de datos |

---

## 8. Orden de ejecución recomendado

```
TIMELINE PROPUESTO
══════════════════

Semana 1     │ Sprint 0 - Hotfixes seguridad           │ 5-8 d/dev
             │ (rotar JWTs, cerrar endpoints, etc.)    │
─────────────┼──────────────────────────────────────────┼─────────────
Semana 2     │ Fase 0 - Setup Drizzle + introspect     │ 1 d/dev
             │ Fase 1 - Helpers + cliente seguro       │ 2-3 d/dev
─────────────┼──────────────────────────────────────────┼─────────────
Semana 3     │ Fase 2 - Server actions críticas        │ 5-7 d/dev
             │ (calls, inbox, tenant)                  │
─────────────┼──────────────────────────────────────────┼─────────────
Semana 4     │ Fase 3 - Schema unificado + JSONB       │ 3-4 d/dev
             │ Fase 4 - RLS en TypeScript              │ 3-4 d/dev
─────────────┼──────────────────────────────────────────┼─────────────
Semana 5     │ Fase 5 - Tests + observabilidad         │ 3-4 d/dev
             │ Validación + QA                          │
═════════════╧══════════════════════════════════════════╧═════════════
   TOTAL:     Sprint 0 (5-8d) + Drizzle (15-20d) = 20-28 d/dev
```

**Con 2 devs trabajando en paralelo:** ~3 semanas calendar time.

---

## 9. Acceptance criteria (cómo sabemos que terminó bien)

Al finalizar la Fase 5, debe cumplirse:

- [ ] `grep -rn "USER_ESTUDIES" src/` devuelve **0 resultados** (D-001 cerrado).
- [ ] `grep -rE "YEARS_?\s?EXPERIENCI?E?" src/` devuelve solo `YEARS_EXPERIENCE` (D-002 cerrado).
- [ ] `grep -rn "eyJhbGciOiJIUzI1NiIs" src/` devuelve **0 resultados** (JWTs eliminados).
- [ ] `grep -rn "postgres:postgres" src/` devuelve **0 resultados** (D-007.A item 12 cerrado).
- [ ] `grep -rn "as any" src/lib/actions/ src/lib/db/` devuelve **<10** resultados (vs 426 actuales).
- [ ] Test E2E: usuario del Tenant A NO puede leer leads del Tenant B ni con cookie tampering, ni con SQL inyectado, ni invocando server actions con UUIDs arbitrarios.
- [ ] Test E2E: usuario normal NO puede llamar a `updateUser({data:{is_admin:true}})` y obtener acceso admin (porque `isAdmin` se lee de `user_tenants.role`, no de `user_metadata`).
- [ ] `drizzle-kit check` reporta **0 diferencias** entre schema TS y BD.
- [ ] Bundle del browser **no contiene** la `service_role` key (verificable con el mismo script de Playwright que usamos en `05-browser-verification.md`).
- [ ] Tests Vitest de los repositories pasan en CI.
- [ ] Documentación `docs/architecture/data-layer.md` actualizada al nuevo flujo.

---

## 10. Lo que sigue después de Drizzle

Una vez completada esta migración, el camino natural es:

1. **Sprint 3 — Observabilidad y costes LLM** (Drizzle facilita esto enormemente — tablas `llm_usage` con tipos):
   - Persistir `completion.usage` en cada llamada.
   - Dashboard `/dashboard/minutos` con datos reales.
   - Alertas por umbral de coste.

2. **Sprint 4 — Tests y refactor**:
   - Cobertura > 60% en repositories.
   - Migración de prompts hardcodeados (G-04 del gap analysis) a tablas tipadas.
   - Eliminar últimos `as any`.

3. **Sprint WCAG — Accesibilidad WCAG**:
   - Quick wins (shadcn Dialog + sonner toasts).
   - Independiente de la capa de BD.

---

## 11. Decisiones que requieren confirmación

Antes de empezar la Fase 0, conviene confirmar:

1. **¿Usuario Postgres dedicado tiene permisos para crear?** Requiere acceso al panel Supabase o `psql` con superuser. (Self-hosted en Coolify según vimos en el audit.)
2. **`USER_PROFESION` vs `USER_PROFESSION`** — decisión final que la cliente debe tomar (pregunta D-004 pendiente desde el gap analysis).
3. **¿Mantener `agendamientos` o `appointments`?** Recomendado: `agendamientos` (más datos históricos según el grep del audit). Confirmar con el equipo.
4. **Connection string del pooler** — necesitamos el host correcto del pooler (suele ser `<project>.pooler.supabase.com:6543` para Supabase Cloud o el equivalente self-hosted).

---

**Status:** APPROVED — listo para ejecutar tras Sprint 0.
**Owner:** equipo de desarrollo linkstation.
**Next step:** completar Sprint 0 (hotfixes seguridad) y luego empezar Fase 0 de esta migración.
