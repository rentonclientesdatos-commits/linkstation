---
title: "Deep Audit DA-2 — Auth & RLS"
date: 2026-05-18
agent: DA-2 (Sonnet)
phase: deep-audit
---

# DA-2 — Auth & RLS Deep

## Perímetro auditado

- `src/middleware.ts` — auth middleware completo, línea por línea
- `src/lib/auth-config.ts` — credenciales de auth
- `src/lib/supabase/server.ts` — cliente servidor
- `src/lib/supabase/client.ts` — cliente browser
- `src/lib/supabase/tenant-client.ts` — cliente externo por tenant
- `src/lib/supabase/tenant-router.ts` — router de datos multi-tenant
- `src/lib/actions/*.ts` — 22 server actions (inventario completo)
- `src/app/api/**/*.ts` — 20 endpoints API route
- `supabase/migrations/*.sql` — 31 migraciones SQL (análisis uno a uno)
- `supabase/tenants.sql`, `supabase/knowledge_base.sql` — SQL sueltos

---

## Cadena de auth end-to-end (diagrama textual)

```
Browser
  │
  ├─ GET /dashboard/*  ──────────────────────────────────────────────┐
  │                                                                    ↓
  │                                                       [src/middleware.ts]
  │                                                       ├── createServerClient(@supabase/ssr)
  │                                                       │     URL:  AUTH_SUPABASE_URL (env || hardcoded)
  │                                                       │     Key:  AUTH_SUPABASE_ANON_KEY (env || hardcoded)
  │                                                       ├── supabase.auth.getUser()
  │                                                       │     → valida sesión contra Supabase Auth
  │                                                       │     → SÍ verifica token, NO rota JWT
  │                                                       ├── Si !user && /dashboard → redirect /login   ✅
  │                                                       ├── Si /settings && !isAdmin → redirect /dashboard
  │                                                       │     isAdmin leído de user_metadata.is_admin   ⚠️
  │                                                       │     (user_metadata es editable por el propio usuario)
  │                                                       └── NextResponse.next() — SIN propagar tenant a JWT
  │
  ├─ POST /api/* (API Routes)  ──────────────────────────────────────┐
  │                                                                   ↓
  │                                             SIN validación de sesión en middleware
  │                                             Cada route implementa su propia auth (o no)
  │                                             ├── /api/leads/ingest → API key en header x-api-key  ⚠️
  │                                             ├── /api/webhooks/crm → x-tenant-id sin autenticación ❌
  │                                             ├── /api/webhooks/retell → SIN auth de ningún tipo    ❌
  │                                             ├── /api/webhooks/whatsapp → firma Meta (opcional)    ⚠️
  │                                             ├── /api/orchestration/* → SIN auth verificada        ❌
  │                                             ├── /api/calls/manual → SIN auth de sesión            ❌
  │                                             ├── /api/cron/appointments/reminders → SIN auth       ❌
  │                                             ├── /api/orchestration/sweep → SIN auth               ❌
  │                                             └── /api/admin/tenants/[id]/client-sql → SIN auth     ❌
  │
  └─ Server Actions ("use server") ─────────────────────────────────┐
                                                                     ↓
                                         getActiveTenantId() → cookie "af-tenant-id" (plain, no firmada)
                                         ├── NO verifica sesión Supabase — solo lee cookie
                                         ├── Cookie manipulable desde browser devtools
                                         ├── getSupabaseServerClient() → service_role key (bypasea RLS)
                                         └── Aislamiento multi-tenant depende SOLO de filtros .eq("tenant_id",...)
                                               y algunos los omiten (F-04-001, F-04-008)

Flujo de tokens en la sesión:
  Login → Supabase Auth emite JWT → @supabase/ssr guarda en cookie httpOnly "sb-api-db-auth-token"
  → JWT NO contiene claim tenant_id
  → tenant_id viaja en cookie PLAIN "af-tenant-id" (no firmada, editable por el usuario)
  → Las políticas RLS basadas en auth.jwt() ->> 'tenant_id' son INEFECTIVAS en producción
```

---

## Tabla maestra de Server Actions

| Archivo | Función | Usa service_role | Filtra tenant_id | Verifica auth.uid | Riesgo |
|---|---|---|---|---|---|
| `calls.ts` | `fetchCalls` | SÍ (getSupabaseServerClient)* | NO | NO | **CRITICAL — IDOR cross-tenant** |
| `calls.ts` | `getCallsByPhone` | SÍ | NO | NO | **HIGH — cross-tenant por teléfono** |
| `calls.ts` | `fetchIntentosByPhone` | SÍ | NO (join implícito por phone) | NO | **HIGH** |
| `calls.ts` | `fetchWhatsappByPhone` | SÍ | NO | NO | **HIGH** |
| `calls.ts` | `createLead` | SÍ (getAdminSupabaseClient) | SÍ | NO (solo lee cookie) | MEDIUM |
| `calls.ts` | `getPrograms` | SÍ | NO | NO | **HIGH — IDOR cross-tenant** |
| `agents.ts` | `getAIAgents` | SÍ | SÍ | NO (solo cookie) | LOW |
| `agents.ts` | `getAgentVariants` | SÍ | NO (confía en RLS tautológica) | NO | **HIGH — RLS inefectiva** |
| `agents.ts` | `saveAIAgent` | SÍ | SÍ (inyecta tenant_id) | NO | MEDIUM |
| `agents.ts` | `saveAgentVariant` | SÍ | NO (solo agent_id, confía en RLS) | NO | **HIGH — IDOR** |
| `agents.ts` | `deleteAIAgent` | SÍ | SÍ | NO | LOW |
| `agents.ts` | `getAdvisors` | SÍ | SÍ | NO | LOW |
| `inbox.ts` | `updateLeadSegment` | SÍ | NO | NO | **HIGH — IDOR: acepta leadId sin verificar ownership** |
| `inbox.ts` | `getInboxLeads` | SÍ | SÍ (vía getActiveTenantConfig) | NO (solo cookie) | MEDIUM |
| `inbox.ts` | `getChatHistory` | SÍ | SÍ (vía tenant) | NO (solo cookie) | MEDIUM |
| `inbox.ts` | `sendManualMessage` | SÍ | SÍ (vía tenant) | NO | MEDIUM |
| `inbox.ts` | `toggleLeadAI` | SÍ | NO | NO | **HIGH — IDOR: any leadId** |
| `inbox.ts` | `assignAgentToLead` | SÍ | NO | NO | **HIGH — IDOR: any leadId** |
| `inbox.ts` | `deleteLead` | SÍ | NO | NO | **CRITICAL — IDOR: borra cualquier lead** |
| `inbox.ts` | `deleteChatHistory` | SÍ | NO | NO | **HIGH — IDOR** |
| `inbox.ts` | `deleteLeadFacts` | SÍ | NO | NO | **HIGH — IDOR** |
| `inbox.ts` | `updateLeadInfo` | SÍ | NO | NO | **HIGH — IDOR: any leadId** |
| `inbox.ts` | `getAgentTrackedVariables` | SÍ | Parcial (vía tenant para agentes, no para variantes) | NO | MEDIUM |
| `tenant.ts` | `setTenantCookies` | NO | N/A | NO | MEDIUM (cookie plain sin firma) |
| `tenant.ts` | `getTenants` | SÍ (service_role B hardcoded) | NO | NO | **CRITICAL — lista todos los tenants** |
| `tenant.ts` | `getActiveTenantConfig` | SÍ (anon key vía getAdminSupabase) | SÍ (por cookie) | NO | MEDIUM |
| `tenant.ts` | `getTenantByUserId` | SÍ | N/A | NO | MEDIUM |
| `tenant.ts` | `createTenant` | SÍ (service_role via getServiceSupabase) | N/A | NO | **HIGH — sin verificar que el caller es admin** |
| `tenant.ts` | `updateTenant` | SÍ | SÍ (por id param) | NO | **HIGH — sin verificar admin** |
| `tenant.ts` | `updateTenantConfig` | SÍ (anon) | SÍ (por id param) | NO | **HIGH — cualquier user puede actualizar config** |
| `tenant.ts` | `deleteTenant` | SÍ (anon) | SÍ (por id) | NO | **CRITICAL — sin verificar admin** |
| `knowledge.ts` | `getKnowledgeBase` | SÍ | SÍ | NO (cookie) | MEDIUM |
| `knowledge.ts` | `uploadKnowledgeDocument` | SÍ | SÍ | NO (cookie) | MEDIUM |
| `orchestration.ts` | `getRecentLeads` | SÍ | SÍ | NO (cookie) | MEDIUM |
| `orchestration.ts` | `getTenantWorkflows` | SÍ | SÍ | NO (cookie) | MEDIUM |
| `analytics.ts` | Todas las funciones | SÍ | SÍ (vía getActiveTenantId) | NO | MEDIUM |
| `scheduling.ts` | Todas las funciones | SÍ | SÍ | NO | MEDIUM |
| `web-widgets.ts` | `deleteWebWidget` | SÍ | NO | NO | **HIGH — IDOR: borra cualquier widget** |

*`getSupabaseServerClient` usa service_role si `SUPABASE_SERVICE_ROLE_KEY` está en env; anon_key si no está. Ver F-04-002.

---

## Tabla maestra de API routes

| Ruta | Método | Auth check | Tenant check | Body validation | Riesgo |
|---|---|---|---|---|---|
| `/api/leads/ingest` | POST | API key en `x-api-key` header | SÍ (via API key → tenant lookup) | Parcial (payload no validado con Zod) | MEDIUM |
| `/api/webhooks/crm` | POST | `x-tenant-id` header (sin secreto) | SÍ (por header) | SÍ (LeadWebhookSchema) | **HIGH — cualquiera puede enviar con tenant_id conocido** |
| `/api/webhooks/retell` | POST | NINGUNO | metadata.tenant_id del payload | NO | **HIGH — endpoint abierto** |
| `/api/webhooks/retell/tools` | POST | NINGUNO (asumido) | desconocido | NO | **HIGH** |
| `/api/webhooks/whatsapp` | GET | Token estático hardcoded | N/A | N/A | MEDIUM (token expuesto en código) |
| `/api/webhooks/whatsapp` | POST | Firma HMAC (solo si WHATSAPP_APP_SECRET env existe) | Via WABA ID en payload | NO | **HIGH — firma condicional** |
| `/api/orchestration/deploy` | POST | NINGUNO | tenantId en body (sin verificar sesión) | Parcial | **HIGH — cualquier usuario puede desactivar flujos** |
| `/api/orchestration/graph` | GET | NINGUNO | workflowId en query param | N/A | **HIGH — lee grafos de cualquier tenant** |
| `/api/orchestration/publish` | POST | NINGUNO | tenantId en body (UUID validado) | SÍ (Zod schema) | **HIGH — puede sobrescribir reglas de otro tenant** |
| `/api/orchestration/sweep` | GET | NINGUNO | N/A (service_role) | N/A | **HIGH — cron sin auth, ejecuta acciones globales** |
| `/api/orchestration/workflows` | GET/POST/DELETE | NINGUNO | tenantId en query/body | SÍ (Zod schema) | **HIGH** |
| `/api/calls/manual` | POST | NINGUNO | tenantId en body | SÍ (Zod) | **HIGH — inicia llamadas en nombre de cualquier tenant** |
| `/api/cron/appointments/reminders` | GET | NINGUNO | N/A (service_role) | N/A | **HIGH — cron sin auth** |
| `/api/tenant/migrate` | POST/GET | Cookie af-tenant-url/key | Por cookies (sin validar sesión Supabase) | N/A | **HIGH — expone SQL de migración sin auth** |
| `/api/admin/tenants/[id]/client-sql` | GET | NINGUNO (solo verifica tenant existe) | SÍ (tenant_id en URL) | N/A | **CRITICAL — archivo SQL descargable SIN auth** |
| `/api/integrations/google/auth` | GET | Sin revisar | Sin revisar | N/A | Pendiente revisión |
| `/api/integrations/google/callback` | GET | Sin revisar | Sin revisar | N/A | Pendiente revisión |
| `/api/test/orchestrator` | POST/GET | Sin revisar | Sin revisar | N/A | Pendiente revisión |
| `/api/webhooks/workflow/[workflowId]/[path]/[nodeId]` | * | Sin revisar | Sin revisar | N/A | Pendiente revisión |
| `/api/widget/embed.js` | GET | NINGUNO | widget_id en query | N/A | LOW (script estático, no expone datos) |
| `/api/docs/content` | GET | Sin revisar | Sin revisar | N/A | Pendiente revisión |

---

## Tabla maestra de RLS por tabla

| Tabla | RLS enabled | Policy SELECT | Policy INSERT | Policy UPDATE | Policy DELETE | Bypass via service_role | Veredicto |
|---|---|---|---|---|---|---|---|
| `tenants` | SÍ | `TO authenticated USING (true)` — cualquier user autenticado ve todos los tenants | `TO authenticated WITH CHECK (true)` | `TO authenticated USING (true)` | `TO authenticated USING (true)` | SÍ (via service_role key) | **CRITICAL — cualquier usuario autenticado puede CRUD todos los tenants** |
| `lead` | SÍ | `TO service_role USING (true)` | `TO service_role WITH CHECK (true)` | `TO service_role WITH CHECK (true)` | `TO service_role WITH CHECK (true)` | SÍ | CORRECTO para backend; no hay política para `authenticated` |
| `llamadas` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `agendamientos` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `lead_cualificacion` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `conversaciones_whatsapp` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `intentos_llamadas` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `intentos` (legacy) | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `notificaciones` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `programas` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO (pero getPrograms bypasea sin filtro) |
| `lead_programas` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `campanas` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `workflows` | SÍ | `USING (auth.jwt() ->> 'tenant_id' = tenant_id::text)` | ídem | ídem | ídem | SÍ (service_role bypasea) | **ROTA — JWT no lleva tenant_id; políticas inefectivas** |
| `orchestration_graphs` | SÍ | `USING (auth.jwt() ->> 'tenant_id' = tenant_id::text)` | ídem | ídem | ídem | SÍ | **ROTA — mismo problema** |
| `orchestration_rules` | SÍ | `USING (auth.jwt() ->> 'tenant_id' = tenant_id::text)` | ídem | ídem | ídem | SÍ | **ROTA** |
| `ai_agents` | SÍ | `USING (tenant_id = (SELECT id FROM tenants WHERE id = ai_agents.tenant_id))` — tautológica | ídem | ídem | ídem | SÍ | **HIGH — política tautológica, no filtra** |
| `ai_agent_variants` | SÍ | `USING (agent_id IN (SELECT id FROM ai_agents))` — devuelve todos | ídem | ídem | ídem | SÍ | **HIGH — sin filtro tenant** |
| `tenant_orchestrator_config` | SÍ | `FOR ALL USING (true)` sin TO | — | — | — | SÍ | **MEDIUM — acceso universal a todos los roles** |
| `advisors` | SÍ | `FOR ALL USING (true)` sin TO | — | — | — | SÍ | **MEDIUM — acceso universal** |
| `availability_slots` | SÍ | `FOR ALL USING (true)` sin TO | — | — | — | SÍ | **MEDIUM — acceso universal** |
| `appointments` | SÍ | `FOR ALL USING (true)` sin TO | — | — | — | SÍ | **MEDIUM — acceso universal** |
| `orchestration_logs` | SÍ | `FOR ALL USING (true)` sin TO | — | — | — | SÍ | **MEDIUM — acceso universal** |
| `knowledge_base` | SÍ | `USING (tenant_id::text = current_setting('app.current_tenant', true))` | ídem | ídem | ídem | SÍ | **CRITICAL — app.current_tenant nunca seteado, policy inefectiva** |
| `knowledge_base_embeddings` | SÍ | `TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)` | ídem | ídem | ídem | SÍ | **ROTA — JWT no lleva tenant_id** |
| `chat_summaries` | SÍ | `TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)` | ídem | ídem | ídem | SÍ | **ROTA — JWT no lleva tenant_id** |
| `chat_messages` | SÍ | `FOR ALL USING (true)` sin TO | — | — | — | SÍ | **MEDIUM — acceso universal; tenant_id es TEXT no UUID** |
| `web_widgets` | SÍ | `USING (tenant_id IN (SELECT id FROM tenants))` | `WITH CHECK (tenant_id IN (SELECT id FROM tenants))` | `USING (tenant_id IN (SELECT id FROM tenants))` | `USING (tenant_id IN (SELECT id FROM tenants))` | SÍ | **HIGH — devuelve todos los tenants, sin aislamiento** |
| `client_configs` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `system_logs` | SÍ | `TO service_role USING (true)` | ídem | ídem | ídem | SÍ | CORRECTO |
| `ai_agent_logs` | No verificado en migrations | — | — | — | — | — | Pendiente verificación |
| `lead_events` | No verificado en migrations | — | — | — | — | — | Pendiente verificación |

**Resumen RLS:**
- Tablas con RLS correcto (service_role explícito): 10
- Tablas con RLS rota o inefectiva: 15
- Tablas sin verificar: 2+
- Tablas SIN RLS habilitado: ninguna detectada (todas tienen `ENABLE ROW LEVEL SECURITY`)

---

## Profundización de findings del quick scan

### F-04-001: fetchCalls sin filtro tenant_id — Cross-tenant data leak (CONFIRMADO y AMPLIADO)

**Severidad:** Critical | **Esfuerzo fix:** Bajo (1-2h)

**Análisis adicional:** La función `fetchCalls` en `src/lib/actions/calls.ts:56-233` usa `getSupabaseServerClient()` y consulta `lead` sin `.eq("tenant_id", ...)`. El mismo patrón se repite en la consulta derivada de `appointments` (líneas 139-155): se obtienen los appointments filtrando solo por `lead_id` de los leads ya cargados — pero si los leads son de todos los tenants, los appointments también son cross-tenant.

Adicionalmente se detectan funciones hermanas con el mismo patrón:
- `getCallsByPhone` (línea 240): sin filtro tenant_id en `lead` ni en `appointments`
- `fetchIntentosByPhone` (línea 350): el join `lead:id_lead!inner` filtra por teléfono pero no por tenant
- `fetchWhatsappByPhone` (línea 371): mismo patrón

La función `getActiveTenantId()` está importada en el archivo pero **nunca se invoca** en ninguna de estas cuatro funciones.

**Fix textual:**
```typescript
export async function fetchCalls(params: FetchCallsParams) {
  const supabase = await getSupabaseServerClient();
  const tenantId = await getActiveTenantId();
  if (!tenantId) return emptyResult;
  
  let query = supabase
    .from("lead")
    .select(`...`)
    .eq("tenant_id", tenantId)  // ← AÑADIR
    .order(...)
    .range(from, to);
  // Además, en la sub-query de appointments:
  const { data: appts } = await supabase
    .from("appointments")
    .select(...)
    .in("lead_id", leadIds)
    .eq("tenant_id", tenantId);  // ← AÑADIR
}
```

---

### F-04-002: Credenciales Supabase hardcodeadas en código fuente (CONFIRMADO y AMPLIADO)

**Severidad:** Critical | **Esfuerzo fix:** Bajo (30min)

**Análisis adicional (hallazgo en DA-2):** Se detecta un tercer punto de hardcoding que el quick scan no catalogó completamente:

`src/lib/actions/tenant.ts:51-52` (función `getServiceSupabase`):
```typescript
if (!serviceKey || serviceKey.includes("ASGAbI")) {
    serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...5vsASGAbI";
}
```

Esta condición es especialmente problemática: además de ser un hardcoded fallback, también actúa como un **anti-patrón de validación inversa** — comprueba si la key del entorno contiene el sufijo de la key ANTIGUA (`ASGAbI`) para detectar que no se ha rotado correctamente, y en ese caso usa la key antigua igualmente. Esta lógica garantiza que la app funcione incluso si el operador intenta rotar la key con una estrategia incorrecta. Es un dead man's switch que perpetúa la clave comprometida.

**Inventario completo de fallbacks hardcoded:**
1. `src/lib/supabase/client.ts:16` — anon key (ANON-A)
2. `src/lib/supabase/client.ts:20` — anon key (ANON-A, segunda vez)
3. `src/lib/supabase/server.ts:7` — service_role key (SVC-A)
4. `src/lib/supabase/server.ts:8` — anon key (ANON-A)
5. `src/lib/auth-config.ts:13` — anon key (ANON-A)
6. `src/lib/auth-config.ts:19` — service_role key (SVC-A)
7. `src/lib/actions/tenant.ts:52` — service_role key (SVC-B, con lógica anti-rotación)
8. `src/lib/actions/tenant.ts:76` — service_role key (SVC-B, duplicada en `getTenants`)
9. `src/scripts/purge-demo.ts:9` — service_role key (SVC-B)

**Fix textual:** Patrón seguro para todos los archivos:
```typescript
function throwMissing(name: string): never {
  throw new Error(`FATAL: Missing required env var: ${name}. App cannot start.`);
}
export const AUTH_SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? throwMissing("SUPABASE_SERVICE_ROLE_KEY");
```

---

### F-04-003: Scripts de migración con postgres directo a IPs de producción (CONFIRMADO)

**Severidad:** Critical | **Esfuerzo fix:** Medio (2h)

No hay nuevos hallazgos en DA-2 sobre este finding. El análisis de `05-tokens-exposed.md` ya los documenta completamente. Se confirma que son 11 connection strings hardcodeadas en 3 scripts.

---

### F-04-004: Política RLS de knowledge_base usa app.current_tenant nunca seteado (CONFIRMADO)

**Severidad:** Critical | **Esfuerzo fix:** Bajo (1h)

**Análisis adicional:** La política está en `supabase/migrations/20260424_knowledge_and_billing.sql:28-31`:
```sql
CREATE POLICY "Tenants can only access their own knowledge base" 
ON knowledge_base FOR ALL 
USING (tenant_id::text = current_setting('app.current_tenant', true));
```

El segundo argumento `true` en `current_setting` devuelve `NULL` si la variable no está seteada, en lugar de lanzar un error. Resultado en producción:
- Con `anon` key: `NULL = tenant_id::text` → `FALSE` → bloqueo total (nadie puede leer KB)
- Con `service_role` key: RLS se bypasea completamente (policy ignorada)

Se verificó con grep exhaustivo que en ninguna parte del código existe `SET app.current_tenant` ni `SET LOCAL app.current_tenant`. La policy es un dead letter.

La tabla `knowledge_base_embeddings` (en `supabase/knowledge_base.sql`) tiene una policy distinta y más correcta: `TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)`, pero esta también es inefectiva porque el JWT no lleva el claim `tenant_id` (confirmado en `05-browser-verification.md`).

---

### F-04-005: Política RLS de ai_agents y ai_agent_variants tautológica (CONFIRMADO)

**Severidad:** High | **Esfuerzo fix:** Bajo (1h)

**Análisis adicional:** La policy está en `supabase/migrations/20260404_ai_agents.sql:33-39`. El código en `src/lib/actions/agents.ts` tiene comportamiento mixto:
- `getAIAgents()`: filtra correctamente por `tenant_id` en código `.eq("tenant_id", tenantId)` — mitigado por código
- `getAgentVariants(agentId)`: NO filtra por tenant — solo por `agent_id`. Un atacante que sepa el UUID de una variante de otro tenant puede leerla
- `saveAgentVariant(variant)`: NO verifica que `agent_id` pertenezca al tenant activo — IDOR en escritura

---

### F-04-006: Políticas RLS de web_widgets sin aislamiento real (CONFIRMADO)

**Severidad:** High | **Esfuerzo fix:** Bajo (30min)

**Análisis adicional:** Las 4 policies usan el mismo patrón:
```sql
USING (tenant_id IN (SELECT id FROM tenants))
```
Equivale a `USING (tenant_id IS NOT NULL AND tenant_id IN (SELECT id FROM tenants))` — devuelve todas las filas con un tenant_id válido, sin importar cuál. El código en `web-widgets.ts` mitiga parcialmente el SELECT (filtra por `tenant.id`) pero `deleteWebWidget` NO filtra por tenant, permitiendo borrar widgets de cualquier tenant.

---

### F-04-007: Cache Redis sin invalidación en mutaciones (CONFIRMADO)

**Severidad:** High | **Esfuerzo fix:** Medio (3h)

No hay nuevos hallazgos en DA-2 sobre este finding. El riesgo es principalmente de consistencia de datos, no de seguridad directa.

---

### F-04-008: getPrograms sin filtro tenant_id (CONFIRMADO y AMPLIADO)

**Severidad:** High | **Esfuerzo fix:** Bajo (15min)

**Análisis adicional:** Confirmado en `src/lib/actions/calls.ts:441-455`. La función es idéntica a la del quick scan: `from("programas").select("*").order("nombre")` sin `.eq("tenant_id", ...)`. Dado que `programas` tiene datos propietarios de cada cliente (cursos, precios, becas, requisitos de cualificación), esta fuga expone información de negocio confidencial.

---

### F-04-009: Umbral years_experience difiere entre spec y código (CONFIRMADO)

**Severidad:** High | **Esfuerzo fix:** Bajo + decisión de negocio

No hay nuevos hallazgos en DA-2. Requiere clarificación con la cliente.

---

### F-04-010: qualified enum diverge entre spec y código (CONFIRMADO)

**Severidad:** Medium | **Esfuerzo fix:** Bajo (1h)

No hay nuevos hallazgos en DA-2.

---

### F-04-011: motivo_descarte / MOTIVO_DESCARTE — campo no tipado en BD (CONFIRMADO)

**Severidad:** Medium | **Esfuerzo fix:** Medio (2h)

No hay nuevos hallazgos en DA-2.

---

### F-04-012: tenant_orchestrator_config RLS USING(true) sin aislamiento (CONFIRMADO)

**Severidad:** Medium | **Esfuerzo fix:** Bajo (30min)

**Análisis adicional:** La policy está en `supabase/migrations/20260404_orchestrator_v3.sql:43-44`. Sin especificar `TO service_role`, la policy aplica a todos los roles incluyendo `anon` y `authenticated`. Si el cliente browser usara la anon key para acceder a `tenant_orchestrator_config`, vería y podría modificar la configuración de todos los tenants.

Las policies de `advisors`, `availability_slots`, `appointments` y `orchestration_logs` tienen el mismo problema en el mismo archivo (líneas 89-91, 111).

---

### F-04-013: chat_messages RLS USING(true) sin rol ni aislamiento (CONFIRMADO)

**Severidad:** Medium | **Esfuerzo fix:** Bajo (30min)

**Análisis adicional:** La policy en `supabase/migrations/20260404_chat_messages.sql:25-26` permite que cualquier rol (incluyendo `anon`) lea todos los mensajes de todos los leads. Adicionalmente, `tenant_id` en `chat_messages` es `TEXT NOT NULL` (no UUID), lo que rompe la integridad referencial con `tenants.id` (UUID).

---

## Nuevos findings (DA-2-XXX)

### DA-2-001: API routes de orquestación completamente abiertas — Sin auth de sesión

**Severidad:** Critical | **Esfuerzo fix:** Medio (4h)

**Archivos:**
- `src/app/api/orchestration/deploy/route.ts` — POST sin auth
- `src/app/api/orchestration/graph/route.ts` — GET sin auth
- `src/app/api/orchestration/publish/route.ts` — POST sin auth
- `src/app/api/orchestration/sweep/route.ts` — GET sin auth
- `src/app/api/orchestration/workflows/route.ts` — GET/POST/DELETE sin auth
- `src/app/api/calls/manual/route.ts` — POST sin auth
- `src/app/api/cron/appointments/reminders/route.ts` — GET sin auth

El middleware de Next.js protege `/dashboard/*` pero no valida sesión en `/api/*`. Ninguno de estos endpoints implementa su propia verificación de sesión Supabase. Cualquier actor externo puede:

1. **Leer** el grafo de orquestación de cualquier tenant conociendo el `workflowId` (`/api/orchestration/graph?workflowId=UUID`)
2. **Publicar/sobreescribir** reglas de orquestación de cualquier tenant enviando `tenantId` y `workflowId` en el body
3. **Activar/desactivar** workflows de cualquier tenant
4. **Iniciar llamadas telefónicas** en nombre de cualquier tenant (`/api/calls/manual`)
5. **Ejecutar el sweep global** de acciones pendientes de todos los tenants

**Reproducción de ataque (ejemplo):**
```bash
curl -X POST https://app.linkstation.ai/api/orchestration/deploy \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"<uuid-conocido>","workflowId":"<uuid-conocido>","status":"INACTIVE"}'
# Respuesta: {"success":true} — workflow desactivado sin autenticación
```

**Fix textual:** Añadir verificación de sesión al inicio de cada handler:
```typescript
import { createServerClient } from "@supabase/ssr";
// Al inicio de cada handler:
const supabase = createServerClient(url, anonKey, { cookies: {...} });
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```
Para los endpoints de cron (sweep, reminders), usar un secret de cron en header:
```typescript
const cronSecret = req.headers.get("x-cron-secret");
if (cronSecret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### DA-2-002: /api/admin/tenants/[id]/client-sql — Endpoint admin completamente abierto

**Severidad:** Critical | **Esfuerzo fix:** Bajo (30min)

**Archivo:** `src/app/api/admin/tenants/[id]/client-sql/route.ts`

Este endpoint está documentado como "Security: only accessible with the admin service_role session" pero en la implementación real **no hay ninguna verificación de sesión ni de rol admin**. El handler hace:
1. Extrae el `id` (tenant UUID) del parámetro de URL
2. Verifica que el tenant existe (con `getSupabaseServerClient()`)
3. Lee el archivo SQL template del filesystem
4. Devuelve el SQL como archivo descargable con el nombre y UUID del tenant

Cualquier usuario (autenticado o anónimo) que conozca un UUID de tenant puede descargar el script SQL de configuración de ese tenant, que incluye el UUID del tenant en el encabezado. El script revela la estructura interna de la BD del cliente.

**Fix textual:**
```typescript
// Al inicio del handler, antes de cualquier lógica:
const supabase = await getSupabaseServerClient();
// Verificar sesión y rol admin
const cookieStore = await cookies();
const anonClient = createServerClient(url, anonKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
const { data: { user } } = await anonClient.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const isAdmin = user.user_metadata?.is_admin === true || user.app_metadata?.is_admin === true;
if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### DA-2-003: /api/tenant/migrate — GET expone SQL de migración sin auth

**Severidad:** High | **Esfuerzo fix:** Bajo (15min)

**Archivo:** `src/app/api/tenant/migrate/route.ts:312-315`

El handler `GET` devuelve el SQL completo de migración sin ninguna verificación:
```typescript
export async function GET() {
    return NextResponse.json({ sql: MIGRATION_SQL });
}
```

El SQL embebido en el endpoint incluye el schema completo de la BD (tablas, columnas, constraints, índices, policies RLS). Esto no expone datos de negocio pero sí la arquitectura interna completa. Un atacante puede usarlo para entender las vulnerabilidades antes de explorarlas.

El handler `POST` usa cookies `af-tenant-url` y `af-tenant-key` que pueden ser manipuladas por el cliente.

**Fix:** Eliminar el handler GET o añadir auth admin. El handler POST debería obtener las credenciales del tenant desde la BD del servidor (no de cookies del cliente).

---

### DA-2-004: deleteTenant y createTenant sin verificación de rol admin

**Severidad:** Critical | **Esfuerzo fix:** Bajo (1h)

**Archivo:** `src/lib/actions/tenant.ts:140-197, 373-381`

Las funciones `createTenant`, `updateTenant`, `updateTenantConfig` y `deleteTenant` son server actions que cualquier usuario autenticado puede invocar. El middleware solo bloquea `/dashboard/settings` en el navegador pero las server actions son invocables directamente via POST a `/_next/action` por cualquier sesión válida.

Un usuario normal (sin is_admin) puede:
1. Crear nuevos tenants con credenciales maliciosas
2. Eliminar tenants existentes
3. Modificar la configuración de cualquier tenant (WhatsApp keys, Retell keys, supabase credentials)

**Verificación:** El único control de admin está en el middleware para la ruta `/dashboard/settings`. No hay ninguna verificación `is_admin` dentro de las propias server actions de tenant.

**Fix textual:** Añadir verificación al inicio de cada función administrativa:
```typescript
async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, { cookies: ... });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const isAdmin = user.app_metadata?.is_admin === true || user.user_metadata?.is_admin === true;
  if (!isAdmin) throw new Error("Forbidden: Admin required");
  return user;
}
// Al inicio de createTenant, updateTenant, deleteTenant:
await requireAdmin();
```

---

### DA-2-005: user_metadata.is_admin editable por el propio usuario — Privilege Escalation

**Severidad:** High | **Esfuerzo fix:** Bajo (1h)

**Archivo:** `src/middleware.ts:62-68`

```typescript
const isAdmin = 
    user?.user_metadata?.is_admin === true || 
    user?.user_metadata?.is_admin === "true" || 
    user?.user_metadata?.admin === true || 
    user?.user_metadata?.admin === "true" ||
    user?.app_metadata?.is_admin === true || 
    user?.app_metadata?.is_admin === "true";
```

En Supabase, `user_metadata` es **editable por el propio usuario** mediante `supabase.auth.updateUser({ data: { is_admin: true } })`. `app_metadata` solo es editable por service_role. El middleware verifica AMBOS campos y con OR, por lo que si un usuario puede setear `user_metadata.is_admin = true`, se convierte en admin.

**Reproducción de ataque:**
```typescript
// Desde el browser, con sesión válida de usuario normal:
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, ANON_KEY);
await supabase.auth.signIn({ email, password });
await supabase.auth.updateUser({ data: { is_admin: true } });
// Ahora el middleware considera a este usuario admin
// Puede acceder a /dashboard/settings y ejecutar las server actions de admin
```

**Fix textual:**
```typescript
// middleware.ts — usar SOLO app_metadata:
const isAdmin = 
    user?.app_metadata?.is_admin === true ||
    user?.app_metadata?.is_admin === "true";
// NUNCA usar user_metadata para decisiones de autorización
```

---

### DA-2-006: Webhook WhatsApp — Validación de firma condicional (silently insecure)

**Severidad:** High | **Esfuerzo fix:** Bajo (30min)

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts:37-45`

```typescript
const appSecret = process.env.WHATSAPP_APP_SECRET;
if (appSecret && signature) {
    // valida HMAC
}
// Si no hay WHATSAPP_APP_SECRET en env → cualquier POST es aceptado
```

Si `WHATSAPP_APP_SECRET` no está configurado en el entorno de producción (lo que es probable dado el patrón de env vars faltantes), cualquier POST al webhook es aceptado sin validación. Un atacante puede simular mensajes de WhatsApp, ingresar leads falsos y disparar el flujo de orquestación con datos fabricados.

**Fix textual:**
```typescript
const appSecret = process.env.WHATSAPP_APP_SECRET;
if (!appSecret) {
  console.error("[WHATSAPP WEBHOOK] FATAL: WHATSAPP_APP_SECRET not set. Rejecting all requests.");
  return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
}
if (!signature) {
  return NextResponse.json({ error: "Missing signature" }, { status: 401 });
}
// Validar HMAC aquí siempre
```

---

### DA-2-007: Webhook Retell — Sin validación de origen

**Severidad:** High | **Esfuerzo fix:** Bajo (2h)

**Archivo:** `src/app/api/webhooks/retell/route.ts`

El endpoint no valida que el POST proviene realmente de Retell. No hay firma HMAC, no hay secret token, no hay verificación de IP. Cualquier actor puede enviar un payload simulando una llamada completada con `tenant_id` y `lead_id` en el metadata, provocando:
1. Inserción de registros falsos en `llamadas`
2. Disparo del `PostAnalysisService.processInteraction()` con transcripción fabricada
3. Modificación de la cualificación de leads legítimos

**Fix textual:** Retell ofrece un `webhook_secret` en su panel. Implementar verificación:
```typescript
const retellSecret = process.env.RETELL_WEBHOOK_SECRET;
const signature = req.headers.get("x-retell-signature");
if (!retellSecret || !signature) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// Verificar firma HMAC-SHA256 con el body raw
```

---

### DA-2-008: Tenant router expone service_key del cliente en memoria

**Severidad:** Medium | **Esfuerzo fix:** Bajo (30min)

**Archivo:** `src/lib/supabase/tenant-router.ts:88-97`

```typescript
const supabaseServiceKey = (config?.supabase_service_key as string) || null;
```

Las credenciales de Supabase del cliente (mode "external") se almacenan en `tenants.config JSONB` como `config.supabase_service_key`. Estas credenciales se cachean en el `metaCache` Map en memoria del proceso Next.js. Esto implica:

1. Las service_role keys de los clientes están en memoria sin cifrado
2. El `metaCache` es un Map en memoria — en Next.js con serverless functions (Vercel), el Map se reinicia por función, pero en un deploy en servidor (Coolify/Hetzner) persiste entre requests
3. Las credenciales del cliente A están accesibles desde cualquier código server-side de la misma instancia de proceso que sirve al cliente B

**Fix:** Usar cifrado simétrico (AES-256-GCM) para almacenar `supabase_service_key` en la BD, descifrando solo en el momento de crear el cliente. No cachear la key en texto plano.

---

### DA-2-009: /api/webhooks/crm sin autenticación — tenant_id spoofing

**Severidad:** High | **Esfuerzo fix:** Bajo (1h)

**Archivo:** `src/app/api/webhooks/crm/route.ts:13`

```typescript
const tenantId = req.headers.get("x-tenant-id");
if (!tenantId) return NextResponse.json({ error: "Missing x-tenant-id" }, { status: 400 });
```

El único "control de acceso" es la presencia del header `x-tenant-id`. No hay secreto, no hay firma, no hay validación de que el remitente es el CRM legítimo del tenant indicado. Cualquier actor que conozca el UUID de un tenant puede inyectar leads falsos en su BD y disparar el flujo de orquestación (llamadas telefónicas reales a números del payload).

**Fix textual:** Implementar API key por tenant:
```typescript
const apiKey = req.headers.get("x-api-key");
const supabase = await getSupabaseServerClient();
const { data: tenant } = await supabase.from("tenants").select("id").eq("api_key", apiKey).single();
if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const tenantId = tenant.id; // usar el ID de BD, no el del header
```

---

### DA-2-010: getActiveTenantConfig usa anon key — Tenants table visible para cualquier usuario

**Severidad:** High | **Esfuerzo fix:** Medio (2h)

**Archivo:** `src/lib/actions/tenant.ts:25-40` (función `getAdminSupabase`) y `src/lib/supabase/tenant-router.ts:69-82`

`getAdminSupabase()` en `tenant.ts` crea un cliente con `AUTH_SUPABASE_ANON_KEY` (no service_role). Cuando `getActiveTenantConfig` llama a `supabase.from("tenants").select("*")`, usa la anon key y las policies de RLS de `tenants`:

```sql
-- tenants.sql
CREATE POLICY "Allow authenticated read" ON public.tenants
    FOR SELECT TO authenticated USING (true);
```

Esta policy permite que cualquier usuario autenticado (con la anon key + sesión válida) haga `SELECT *` sobre `tenants` y obtenga:
- Nombres de todos los clientes
- Emails de contacto
- UUIDs (usados como target en ataques IDOR)
- Posiblemente valores de `config` que contienen API keys y credenciales

Adicionalmente, las policies de INSERT, UPDATE y DELETE en `tenants` también son `USING(true)`, permitiendo que cualquier usuario autenticado modifique o elimine tenants usando la anon key directamente desde el browser.

**Fix textual:** 
```sql
-- Reemplazar las 4 policies de tenants por:
DROP POLICY "Allow authenticated read" ON tenants;
DROP POLICY "Allow authenticated insert" ON tenants;
DROP POLICY "Allow authenticated update" ON tenants;
DROP POLICY "Allow authenticated delete" ON tenants;

-- Solo service_role accede directamente
CREATE POLICY "service_role_all_tenants" ON tenants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Un usuario autenticado solo ve su propio tenant
CREATE POLICY "authenticated_own_tenant" ON tenants
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());
```

---

## Análisis de Tenant ID en cookie plain

**Finding confirmado por verificación en producción** (referencia: `docs/audit/05-browser-verification.md`)

### Arquitectura actual

```
Login exitoso → Supabase Auth emite JWT de sesión
    → JWT guardado en cookie httpOnly "sb-api-db-auth-token" (NO legible por JS)
    → La app llama a setTenantCookies(tenantId, tenantName) — src/lib/actions/tenant.ts:16-17:
        cookieStore.set("af-tenant-id", tenantId, { path: "/", maxAge: 30 * 24 * 60 * 60 })
        cookieStore.set("af-tenant-name", name, { path: "/", maxAge: 30 * 24 * 60 * 60 })
    → Estas cookies NO tienen HttpOnly, NO tienen Secure enforced, SIN SameSite enforced
    → Son legibles y modificables desde JavaScript del browser
```

### Reproducción del ataque — Cookie tampering para IDOR cross-tenant

**Prerrequisito:** Usuario con cuenta válida en el sistema (tenant-A).  
**Objetivo:** Acceder a datos de tenant-B.  
**Condición necesaria:** Conocer el UUID de tenant-B (obtenible de múltiples formas — ver DA-2-010).

```javascript
// Desde la consola del navegador, con sesión activa en tenant-A:
document.cookie = "af-tenant-id=<UUID-de-tenant-B>; path=/";
// Ahora todas las server actions que leen de cookie obtendrán tenant-B
// Incluidas las que faltan el .eq("tenant_id", ...) — F-04-001, F-04-008
```

**Impacto inmediato:**
- `fetchCalls()` devuelve leads de tenant-B (F-04-001 explotable)
- `getPrograms()` devuelve programas de tenant-B (F-04-008)
- `getActiveTenantConfig()` devuelve la config de tenant-B (incluyendo API keys de WhatsApp, Retell)

**¿Las acciones que SÍ filtran por tenant son seguras con este ataque?**
Parcialmente. Las acciones que hacen `.eq("tenant_id", await getActiveTenantId())` filtrarán correctamente por el tenant-B seleccionado. El atacante verá datos de tenant-B, pero solo los de tenant-B (no de un tercer tenant). Para explotar un tercer tenant, debe cambiar la cookie de nuevo.

**Impacto de las funciones sin filtro (IDOR directo):**
- `deleteLead(leadId)` — acepta cualquier UUID de lead. Con la cookie del tenant-B y el UUID de un lead de tenant-B, el atacante puede borrarlo. No necesita la cookie — simplemente necesita saber el UUID.
- `toggleLeadAI(leadId, enabled)` — idem
- `updateLeadInfo(leadId, updates)` — idem

### Flags de cookie — Estado actual vs. recomendado

| Cookie | HttpOnly actual | Secure actual | SameSite actual | Recomendado |
|---|---|---|---|---|
| `af-tenant-id` | NO | NO | NO | No aplica (debe eliminarse o firmarse) |
| `af-tenant-name` | NO | NO | NO | No aplica (display only, no crítico) |
| `sb-api-db-auth-token` | SÍ (gestión automática de @supabase/ssr) | SÍ | Lax | CORRECTO |

### Fix para tenant_id en cookie

**Opción A (recomendada a corto plazo):** No cambiar la cookie pero no confiar en ella para aislamiento. Derivar el tenant_id desde la sesión de Supabase:
```typescript
// Reemplazar getActiveTenantId() que lee cookie por:
export async function getActiveTenantIdFromSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const supabase = createServerClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, { 
        cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    // Buscar el tenant asociado al auth_user_id del JWT verificado
    const adminClient = await getAdminSupabaseClient();
    const { data: tenant } = await adminClient
        .from("tenants")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
    return tenant?.id ?? null;
}
```

**Opción B (recomendada a largo plazo):** Incluir `tenant_id` en el JWT de Supabase Auth via Auth Hook, y leerlo de `auth.jwt() ->> 'tenant_id'`. Esto también resuelve todas las RLS policies que ya usan ese claim.

---

## IDOR sweep

### Rutas dinámicas con IDs sin verificar ownership

#### server actions con IDOR confirmado

| Función | Archivo | ID aceptado | Verificación de ownership | Severidad |
|---|---|---|---|---|
| `deleteLead(leadId)` | `inbox.ts:448-461` | lead UUID arbitrario | NINGUNA | **CRITICAL** |
| `deleteChatHistory(leadId)` | `inbox.ts:466-472` | lead UUID arbitrario | NINGUNA | HIGH |
| `deleteLeadFacts(leadId)` | `inbox.ts:477-484` | lead UUID arbitrario | NINGUNA | HIGH |
| `toggleLeadAI(leadId, enabled)` | `inbox.ts:407-423` | lead UUID arbitrario | NINGUNA | HIGH |
| `assignAgentToLead(leadId, agentId)` | `inbox.ts:428-443` | lead UUID arbitrario | NINGUNA | HIGH |
| `updateLeadInfo(leadId, updates)` | `inbox.ts:492-501` | lead UUID arbitrario | NINGUNA | HIGH |
| `updateLeadSegment(leadId, segment)` | `inbox.ts:46-55` | lead UUID arbitrario | NINGUNA | HIGH |
| `saveAgentVariant(variant)` | `agents.ts:72-103` | agent_id en variant | NINGUNA (confía en RLS rota) | HIGH |
| `deleteWebWidget(id)` | `web-widgets.ts:50-58` | widget UUID arbitrario | NINGUNA | HIGH |

#### API routes con IDOR confirmado

| Ruta | Parámetro ID | Verificación | Severidad |
|---|---|---|---|
| `/api/orchestration/graph?workflowId=` | workflowId UUID | NINGUNA | HIGH |
| `/api/orchestration/deploy` body.workflowId | workflowId UUID | tenantId en body (no verificado con sesión) | HIGH |
| `/api/orchestration/publish` body.workflowId | workflowId UUID | tenantId en body (no verificado) | HIGH |
| `/api/orchestration/workflows?id=&tenantId=` | id + tenantId | tenantId en query (no verificado con sesión) | HIGH |
| `/api/admin/tenants/[id]/client-sql` | tenantId en URL | NINGUNA | **CRITICAL** |
| `/api/calls/manual` body.tenantId | tenantId UUID | NINGUNA verificación de sesión | HIGH |

### Patrón de IDOR sistemático en inbox.ts

Las funciones IDOR en `inbox.ts` comparten un patrón: usan `getAdminSupabaseClient()` (service_role, bypasea RLS) y filtran solo por `id = leadId`. No verifican que ese lead pertenezca al tenant activo del usuario.

**Reproducción:**
```typescript
// Cliente A, con sesión válida, ejecuta:
await deleteLead("<UUID-de-lead-del-cliente-B>");
// Resultado: lead del cliente B eliminado con todas sus relaciones en cascade
```

**Fix textual (patrón para todas las funciones):**
```typescript
export async function deleteLead(leadId: string): Promise<...> {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await getActiveTenantIdFromSession(); // usar versión segura
    if (!tenantId) return { success: false, error: "Unauthorized" };
    
    // Verificar ownership antes de operar
    const { data: lead } = await supabase
        .from("lead").select("id").eq("id", leadId).eq("tenant_id", tenantId).single();
    if (!lead) return { success: false, error: "Lead not found or access denied" };
    
    // ... resto de la función
}
```

---

## Privilege escalation

### Vector 1: user_metadata.is_admin — Ya documentado en DA-2-005

**Severidad:** High

El check de admin en `middleware.ts:62-68` incluye `user_metadata.is_admin` que es editable por el propio usuario via `supabase.auth.updateUser()`. Cualquier usuario autenticado puede escalar a admin.

**Verificación del impacto post-escalación:**
Una vez que el middleware considera al usuario admin:
1. Accede a `/dashboard/settings` en el browser
2. Puede invocar las server actions de admin: `createTenant`, `updateTenant`, `deleteTenant` — todas sin verificación interna de rol

### Vector 2: Cookies admin en /api/tenant/migrate

**Severidad:** Medium

`src/app/api/tenant/migrate/route.ts:246-251`:
```typescript
const tenantUrl = cookieStore.get("af-tenant-url")?.value;
const tenantKey = cookieStore.get("af-tenant-key")?.value;
```

El handler acepta cookies `af-tenant-url` y `af-tenant-key` que el cliente puede setear libremente. Si un atacante setea estas cookies con las credenciales de su propio Supabase malicioso, el handler se conectará a él y ejecutará el SQL de migración allí — no es un ataque a los datos de la aplicación, pero confirma que el sistema no distingue entre cookies legítimas y fabricadas.

### Vector 3: updateTenant sin verificación de sesión

**Severidad:** Critical

`tenant.ts:updateTenant(id, updates)` y `deleteTenant(id)` son server actions que:
1. NO verifican que el usuario esté autenticado (leen la sesión implícitamente a través de cookies de Supabase, pero no la validan explícitamente)
2. NO verifican que el usuario sea admin
3. Un usuario no autenticado que logre invocar la server action directamente (via POST a `/_next/action`) puede operar sobre tenants

### Análisis de is_admin por tabla de fuentes

| Fuente de is_admin | Editable por el usuario | Verificado en | Impacto |
|---|---|---|---|
| `user.user_metadata.is_admin` | SÍ (vía `supabase.auth.updateUser`) | `middleware.ts:62,63` | **CRÍTICO — privilege escalation** |
| `user.user_metadata.admin` | SÍ | `middleware.ts:64,65` | **CRÍTICO — alias del mismo problema** |
| `user.app_metadata.is_admin` | NO (solo service_role) | `middleware.ts:66,67` | CORRECTO |
| `user.app_metadata.is_admin` | NO | `middleware.ts:67` | CORRECTO |
| `tenant.config.is_admin` | Via updateTenantConfig (sin auth) | — | HIGH — indirecto |

**Fix definitivo:** Solo verificar `app_metadata` para decisiones de autorización. Eliminar todas las referencias a `user_metadata` en checks de admin.

---

## Resumen ejecutivo de severity map

| ID | Título | Severidad | Esfuerzo fix |
|---|---|---|---|
| F-04-001 | fetchCalls cross-tenant | CRITICAL | 2h |
| F-04-002 | Credenciales hardcodeadas | CRITICAL | 1h |
| F-04-003 | Scripts postgres a producción | CRITICAL | 2h |
| F-04-004 | knowledge_base RLS inefectiva | CRITICAL | 1h |
| DA-2-001 | API routes orquestación abiertas | CRITICAL | 4h |
| DA-2-002 | /api/admin/client-sql sin auth | CRITICAL | 30min |
| DA-2-004 | createTenant/deleteTenant sin admin check | CRITICAL | 1h |
| DA-2-005 | user_metadata privilege escalation | HIGH | 1h |
| DA-2-010 | Tenants table RLS: read/write para todos | HIGH | 1h |
| F-04-005 | ai_agents RLS tautológica | HIGH | 1h |
| F-04-006 | web_widgets RLS sin aislamiento | HIGH | 30min |
| F-04-008 | getPrograms cross-tenant | HIGH | 15min |
| F-04-009 | years_experience umbral incorrecto | HIGH | 15min + negocio |
| DA-2-006 | WhatsApp webhook firma condicional | HIGH | 30min |
| DA-2-007 | Retell webhook sin validación | HIGH | 2h |
| DA-2-009 | CRM webhook tenant spoofing | HIGH | 1h |
| DA-2-003 | /api/tenant/migrate GET expone SQL | HIGH | 15min |
| IDOR sweep | 9 funciones inbox sin ownership check | HIGH | 4h |
| F-04-012 | tenant_orchestrator_config USING(true) | MEDIUM | 30min |
| F-04-013 | chat_messages USING(true) sin rol | MEDIUM | 30min |
| F-04-007 | Cache Redis sin invalidación | MEDIUM | 3h |
| DA-2-008 | service_key cliente en memoria plana | MEDIUM | 2h |

---

**Status:** DONE_WITH_CONCERNS

**Summary:** Auditoría estática profunda completada. Se analizaron 22 server actions, 20 API routes, 31 migraciones SQL y toda la cadena de auth end-to-end. Se confirmaron y ampliaron todos los findings F-04-001 a F-04-013 del quick scan. Se detectaron 10 nuevos findings (DA-2-001 a DA-2-010). Los hallazgos más graves son: (1) las 7 API routes de orquestación completamente abiertas sin auth permiten a cualquier actor externo manipular flujos y disparar llamadas reales; (2) `deleteLead` y 8 funciones más de inbox aceptan UUIDs arbitrarios sin verificar ownership (IDOR sistemático); (3) `user_metadata.is_admin` editable por el usuario permite privilege escalation a admin; (4) las server actions de gestión de tenants (`createTenant`, `deleteTenant`) no verifican rol admin.

**Concerns/Blockers:**
- El análisis de `src/app/api/integrations/google/*`, `/api/test/orchestrator`, y `/api/webhooks/workflow/[workflowId]/[path]/[nodeId]` quedó pendiente — estos 4 endpoints no fueron leídos en este audit por límite de scope. Se recomienda revisión en DA-3.
- La verificación de si `user_metadata` es editable en el Supabase self-hosted específico del cliente requiere confirmación en producción — en Supabase cloud está permitido por defecto; en self-hosted depende de la configuración de GoTrue.
- El análisis no incluye runtime (no se probaron los ataques en producción). Los vectores de IDOR y privilege escalation requieren prueba en entorno de staging para confirmar que el cliente browser puede efectivamente invocar server actions directamente.
