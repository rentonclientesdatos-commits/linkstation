# Auth & RLS Security

**Versión:** 1.0.0 — 2026-05-18 (Audit-Data, análisis estático)
**Proyecto:** linkstation (Next.js 16 + Supabase)

---

## 1. Cadena de autenticación

```
Browser
  │
  ├─ GET /dashboard/* ──────────────────────────────────────────────┐
  │                                                                   ↓
  │                                                        middleware.ts
  │                                                        ├── createServerClient(@supabase/ssr)
  │                                                        │       URL: AUTH_SUPABASE_URL (env/hardcoded)
  │                                                        │       Key: AUTH_SUPABASE_ANON_KEY (env/hardcoded)
  │                                                        ├── supabase.auth.getUser()
  │                                                        ├── Si no user → redirect /login
  │                                                        ├── Si /settings y no is_admin → redirect /dashboard
  │                                                        └── Si OK → NextResponse.next()
  │
  ├─ POST /api/* (API Routes) ────────────────────────────────────────┐
  │                                                                    ↓
  │                                                       SIN middleware de auth
  │                                                       Cada route valida tenantId desde body/params
  │                                                       NO validación de sesión consistente en todas las rutas
  │
  └─ Server Actions ──────────────────────────────────────────────────┐
                                                                       ↓
                                                          getActiveTenantId() → cookie "af-tenant-id"
                                                          (NO verifica sesión Supabase — solo lee cookie)
```

---

## 2. Sesiones y cookies

| Cookie | Valor | Origen |
|--------|-------|--------|
| `af-tenant-id` | UUID del tenant activo | Seteada en login o al seleccionar tenant |
| `sb-*` (Supabase auth) | JWT de sesión Supabase | Gestionadas por `@supabase/ssr` en middleware |

**Observación crítica:** El middleware lee y valida la sesión Supabase (`auth.getUser()`), pero los **Server Actions** no validan la sesión — solo leen la cookie `af-tenant-id`. Un atacante que conozca el UUID de un tenant podría manipular esta cookie desde el browser y acceder a datos de otro tenant (si bypasea el middleware). Las Server Actions deberían validar sesión independientemente del middleware.

---

## 3. Admin detection

```typescript
// middleware.ts:62-68
const isAdmin =
    user?.user_metadata?.is_admin === true ||
    user?.user_metadata?.is_admin === "true" ||
    user?.user_metadata?.admin === true ||
    user?.user_metadata?.admin === "true" ||
    user?.app_metadata?.is_admin === true ||
    user?.app_metadata?.is_admin === "true";
```

El rol admin se verifica en `user_metadata` Y `app_metadata`, incluyendo versiones string `"true"`. La flexibilidad string/boolean indica que el campo no tiene tipo enforced en Supabase. `app_metadata` solo debería ser modificable por service_role — si esto se cumple, es seguro. `user_metadata` es editable por el propio usuario, lo que sería un vector de escalada de privilegios.

**Riesgo:** Si `is_admin` se verifica desde `user_metadata` (editable por el usuario), cualquier usuario podría otorgarse permisos de admin editando su propio perfil.

---

## 4. Row Level Security (RLS) — estado por tabla

### 4.1 Tablas con RLS correcto (service_role full access)

Patrón: `FOR ALL TO service_role USING (true) WITH CHECK (true)`

| Tabla | Migration | Estado |
|-------|-----------|--------|
| `lead` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `llamadas` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `agendamientos` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `lead_cualificacion` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `conversaciones_whatsapp` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `intentos_llamadas` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `intentos` (legacy) | 20260404_create_multitenant_schema.sql | CORRECTO |
| `notificaciones` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `programas` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `lead_programas` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `campanas` | 20260404_create_multitenant_schema.sql | CORRECTO |
| `system_logs` | 20260417_system_logs_table.sql | CORRECTO |
| `client_configs` | 20260417_orchestrator_v2_schema.sql | CORRECTO |

### 4.2 Tablas con RLS habilitado pero políticas deficientes

| Tabla | Política actual | Problema | Severidad | Fix recomendado |
|-------|----------------|----------|-----------|-----------------|
| `knowledge_base` | `USING (tenant_id::text = current_setting('app.current_tenant', true))` | `app.current_tenant` nunca seteado por el backend → policy siempre evalúa NULL → bloqueo total para anon | Critical | Cambiar a `auth.jwt() ->> 'tenant_id'` o `service_role_all` + filtro en código |
| `ai_agents` | `USING (tenant_id = (SELECT id FROM tenants WHERE id = ai_agents.tenant_id))` | Tautológica — siempre TRUE | High | `USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)` |
| `ai_agent_variants` | `USING (agent_id IN (SELECT id FROM ai_agents))` | Sin filtro por tenant — devuelve todos | High | Añadir join con ai_agents filtrado por tenant |
| `web_widgets` SELECT | `USING (tenant_id IN (SELECT id FROM tenants))` | Devuelve todos los tenants — sin filtro | High | `USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)` |
| `tenant_orchestrator_config` | `FOR ALL USING (true)` sin TO | Acceso universal a todos los roles | Medium | `FOR ALL TO service_role USING (true)` |
| `chat_messages` | `FOR ALL USING (true)` sin TO | Acceso universal; además tenant_id es TEXT, no UUID | Medium | Añadir TO service_role; migrar tenant_id a UUID FK |

### 4.3 Tablas con RLS basado en JWT tenant_id claim

| Tabla | Política | Dependencia |
|-------|----------|-------------|
| `orchestration_graphs` | `USING (auth.jwt() ->> 'tenant_id' = tenant_id::text)` | JWT debe contener claim `tenant_id` |
| `orchestration_rules` | `USING (auth.jwt() ->> 'tenant_id' = tenant_id::text)` | ídem |
| `workflows` | `USING (auth.jwt() ->> 'tenant_id' = tenant_id::text)` | ídem |
| `knowledge_base_embeddings` | `USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)` | ídem |
| `chat_summaries` | `USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)` | ídem |

**Observación:** Estas políticas solo funcionan si el JWT del usuario contiene el claim `tenant_id`. El middleware actual no inyecta este claim — el tenant se propaga via cookie `af-tenant-id`, no via JWT. Si el JWT no tiene `tenant_id`, `auth.jwt() ->> 'tenant_id'` devuelve NULL y la política bloquea todo acceso para usuarios autenticados normales. Como el backend siempre usa service_role (que bypasea RLS), esto no afecta al funcionamiento actual, pero las políticas son inefectivas para uso con JWT de usuario.

### 4.4 Tenants tabla — RLS permisivo

```sql
-- tenants.sql
CREATE POLICY "Allow authenticated read" ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.tenants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON public.tenants FOR DELETE TO authenticated USING (true);
```

Cualquier usuario autenticado puede leer, insertar, actualizar y eliminar cualquier tenant. Esto incluye modificar configuraciones de otros tenants (whatsapp keys, retell keys, etc.). Esta política es extremadamente permisiva y representa un riesgo de seguridad significativo si hay múltiples usuarios autenticados en el sistema.

---

## 5. Arquitectura de aislamiento multi-tenant

### Diseño actual (basado en código)

```
┌─────────────────────────────────────────────────────────────┐
│ ESTRATEGIA REAL DE AISLAMIENTO (código, no RLS)             │
│                                                             │
│ 1. Server Action recibe request                             │
│ 2. Lee tenant_id de cookie "af-tenant-id"               │
│ 3. Llama getSupabaseServerClient() con service_role        │
│ 4. Añade .eq("tenant_id", tenantId) manualmente           │
│ 5. RLS no aporta aislamiento real (service_role bypasea)   │
└─────────────────────────────────────────────────────────────┘
```

**Problemas de este patrón:**
- Si un developer olvida el filtro `.eq("tenant_id", ...)` en cualquier query, hay data leak (como en F-04-001 y F-04-008).
- No hay garantía de aislamiento enforced por la BD — depende de disciplina en el código.
- RLS con `service_role` es efectivamente DESACTIVADO — el backend tiene acceso total a todos los datos de todos los tenants sin restricciones de BD.

### Alternativa recomendada

Implementar RLS real con JWT claims por tenant:
1. En el login, incluir `tenant_id` en el JWT de Supabase via Auth Hook.
2. Usar `authenticated` role en el cliente con el JWT del usuario.
3. Políticas RLS usan `auth.jwt() ->> 'tenant_id'` — BD enforza el aislamiento.
4. Eliminar `service_role` del cliente de server actions (solo para operaciones admin reales).

---

## 6. Riesgos de bypass RLS identificados

| Vector | Ubicación | Riesgo | Estado |
|--------|-----------|--------|--------|
| `getSupabaseServerClient()` sin filtro tenant | `calls.ts:fetchCalls`, `calls.ts:getPrograms` | Cross-tenant data leak en historial principal | ACTIVO — Critical |
| Scripts `postgres` directo | `src/scripts/migrate-*.ts` | Acceso directo PostgreSQL con `sql.unsafe()` | Solo en scripts manuales — no en runtime |
| `MASTER_RESTORE.sql` con tenant IDs hardcodeados | `supabase/MASTER_RESTORE.sql:186-188` | Datos de tenants reales en código fuente | Git history exposure |
| `user_metadata.is_admin` editable por usuario | `middleware.ts:62-65` | Posible escalada de privilegios admin | Pendiente verificar en Supabase config |

---

## 7. Credenciales y secrets en código

| Secret | Archivo | Tipo | Riesgo |
|--------|---------|------|--------|
| Supabase anon JWT | `src/lib/supabase/client.ts:16,20` | Fallback hardcodeado | Expuesto en código fuente (git) |
| Supabase service_role JWT | `src/lib/supabase/server.ts:7` | Fallback hardcodeado | **Critical** — da acceso admin a BD |
| Supabase anon JWT | `src/lib/supabase/server.ts:8` | Fallback hardcodeado | Expuesto en código fuente (git) |
| AUTH_SUPABASE_ANON_KEY | `src/lib/auth-config.ts:13` | Hardcodeado como default | Expuesto en código fuente (git) |
| AUTH_SUPABASE_SERVICE_ROLE_KEY | `src/lib/auth-config.ts:16-19` | Hardcodeado como default | **Critical** — da acceso admin a BD |
| PostgreSQL password `postgres` | `src/scripts/migrate-*.ts` | Hardcodeado | Password por defecto de PostgreSQL a IP producción |
| IP producción `46.62.193.169` | `src/scripts/migrate-*.ts` | Hardcodeado | IP de servidor expuesta en código fuente |
| Tenant IDs reales | `supabase/MASTER_RESTORE.sql:186-188` | Datos reales en SQL | UUIDs de tenants de producción en repositorio |

**Acción inmediata requerida:** Rotar la service_role key de Supabase. Todos los tokens tienen `"exp": 1893456000` (año 2030) — estarán activos durante años si no se rotan.

---

## 8. Análisis de middleware

El middleware en `src/middleware.ts` tiene cobertura correcta para rutas HTML (`/dashboard`, `/login`) pero no valida rutas de API (`/api/*`). Las rutas API son accesibles sin autenticación desde el middleware:

```typescript
// matcher en middleware.ts — excluye static assets pero incluye /api/*
matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
```

Las rutas API deben implementar su propia validación de autenticación (revisar cada `route.ts` en `/api/` para confirmar).
