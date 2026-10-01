# Research: Decisión de stack — sin ORM nuevo

**Fecha:** 2026-05-19
**Decisión:** Mantener `@supabase/supabase-js` como capa de acceso a datos; no añadir Drizzle, Prisma, Kysely ni otros ORMs.
**Validación con usuario:** Confirmado vía AskUserQuestion.

## Contexto

El proyecto linkstation ya tiene:
- `@supabase/supabase-js` ^2.97.0 (query builder tipado)
- `@supabase/ssr` ^0.8.0 (cliente request-scoped)
- `zod` ^4.3.6 (validación)
- Tipos generados manualmente en `src/types/database.ts`

La pregunta inicial era: ¿añadir Drizzle para reforzar seguridad multi-tenant?

## Análisis

### Lo que un ORM aportaría
- Schema-as-code (vs SQL crudo)
- Type-safety end-to-end (ya cubierto por `supabase gen types`)
- Query builder más expresivo (overlap con cliente Supabase)
- Migraciones programáticas (vs `supabase/migrations/*.sql`)

### Lo que un ORM NO aporta
- **Seguridad multi-tenant**: la da PostgreSQL RLS, no el ORM
- **Validación de inputs**: la da Zod, no el ORM
- **Aislamiento entre tenants**: depende de RLS + cliente correcto

### Coste de añadir Drizzle
- ~20h de migración inicial
- Schema duplicado entre Supabase migrations y `schema.ts` de Drizzle
- Pérdida de integración nativa con Supabase Auth (filtros `auth.uid()` requieren raw SQL)
- Doble fuente de verdad → drift garantizado a medio plazo

### Coste de añadir Kysely (solo para queries complejas)
- ~8h de setup
- Convive con cliente Supabase (sin reemplazar)
- Útil solo si aparecen queries SQL complejas no expresables con el builder de Supabase
- No es necesario hoy para CRUD + sync con CRMs

## Conclusión

**El cliente de Supabase YA es un ORM-lite suficiente** para CRUD + reports del linkstation. Añadir Drizzle/Prisma sería duplicar la capa de acceso a datos sin ganancia de seguridad.

La seguridad multi-tenant requiere:
1. **RLS en PostgreSQL** (cubierto en F1-F3 del plan)
2. **Clientes segregados** (cubierto en F4)
3. **Repository pattern** (cubierto en F5)
4. **Zod en boundaries** (cubierto en F5-F6)
5. **Tests anti-fuga** (cubierto en F7)

Ninguno de estos requiere un ORM nuevo.

## Futuras revisiones

Considerar Kysely SOLO si:
- Aparecen reports con CTEs anidadas, window functions complejas, o subqueries que el cliente Supabase no expresa cómodamente.
- Hay necesidad de portabilidad fuera de Supabase (migración a Neon, RDS, etc.).

Considerar Drizzle SOLO si:
- Se decide abandonar Supabase como BaaS (no es el caso actual).
- Hay equipo grande y el schema-as-code es un cuello de botella.

## Referencias

- [Supabase: Type-safe TypeScript with Database types](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase: RLS deep dive](https://supabase.com/docs/guides/auth/row-level-security)
- [Kysely vs Drizzle vs Prisma 2025 comparison](https://github.com/kysely-org/kysely/discussions)
