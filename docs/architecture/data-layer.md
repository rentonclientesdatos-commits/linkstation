# Data Layer Architecture

**Versión:** 1.0.0 — 2026-05-18 (Audit-Data, análisis estático)
**Proyecto:** linkstation (Next.js 16 + Supabase + BullMQ)

---

## 1. Visión general

El sistema usa **Supabase** como único backend de base de datos, expuesto a través de `@supabase/supabase-js`. No hay ORM (sin Prisma). Las queries son directas al cliente de Supabase usando su SDK de tipo TypeScript generado a partir del schema (`src/types/database.ts`).

Existe una arquitectura de **dual-mode tenancy** que enruta datos a dos destinos:

```
Dashboard usuario
        ↓
  middleware.ts (auth check)
        ↓
  Server Action / API Route
        ↓
  getTenantDataClient() ←─────────────────────────────────────┐
        ├── mode: "central" → getSupabaseServerClient()       │
        │       (Supabase compartido, filtro tenant_id)       │
        └── mode: "external" → getTenantExternalClient()      │
                (Supabase propio del cliente)                  │
                                                              │
  tenant-router.ts resuelve el modo leyendo "tenants" table──┘
  (cacheado 5min en Map en memoria)
```

---

## 2. Clientes de base de datos

### 2.1 `src/lib/supabase/client.ts` — Browser client

- Usa `createClient<Database>(url, anonKey)`
- Directive `"use client"` — solo en componentes React del browser
- Limitado a operaciones públicas (no debe acceder a datos sensibles)
- Tiene fallback de anon key hardcodeada (riesgo, ver audit F-04-002)

### 2.2 `src/lib/supabase/server.ts` — Servidor

Expone tres funciones:

| Función                     | Key usada                        | Uso                         |
| --------------------------- | -------------------------------- | --------------------------- |
| `getActiveTenantId()`       | —                                | Lee cookie `af-tenant-id`   |
| `getSupabaseServerClient()` | `service_role` (o anon fallback) | Server actions generales    |
| `getAdminSupabaseClient()`  | `service_role` explícito         | Operaciones administrativas |

Ambos clientes crean instancias con `persistSession: false, autoRefreshToken: false` — son clientes sin sesión propia, requieren filtros manuales de tenant.

### 2.3 `src/lib/supabase/tenant-client.ts` — Clientes externos

Para tenants con su propio Supabase (mode "external"):

- Cache en Map en memoria con TTL 5min por `tenantId`
- Crea cliente con service_role del Supabase del cliente
- Header custom `x-af-tenant` para trazabilidad

### 2.4 `src/lib/supabase/tenant-router.ts` — Router de datos

Punto de entrada unificado para acceso multi-tenant:

```typescript
const { client, mode, applyTenantFilter } = await getTenantDataClient(tenantId);
// En mode "central": applyTenantFilter añade .eq("tenant_id", tenantId)
// En mode "external": applyTenantFilter no añade nada (BD ya aislada)
```

Cache en memoria (5min) del modo de cada tenant. Resolución inicial consultando tabla `tenants`.

### 2.5 `src/middleware.ts` — Auth middleware

Usa `@supabase/ssr` (`createServerClient`) con anon key para validar sesión en SSR:

- Verifica `supabase.auth.getUser()` en cada request
- Redirige `/login` si no hay sesión en rutas `/dashboard`
- Restricción admin en `/dashboard/settings` via `user_metadata.is_admin`
- No propaga `tenant_id` como claim JWT — el tenant se lee de cookie `af-tenant-id`

---

## 3. Schema de base de datos real

### 3.1 Módulo de identidad (tenants)

```
tenants
├── id: UUID PK
├── name: TEXT
├── supabase_url: TEXT (nullable — para mode "external")
├── supabase_anon_key: TEXT (nullable)
├── client_email: TEXT
├── auth_user_id: UUID
└── config: JSONB {
    whatsapp: {...},
    retell: { api_key, from_number, agent_id },
    ultravox: { api_key },
    telephony: { provider, credentials },
    company_name,
    supabase_service_key  ← service key del cliente en config (no columna)
    }

tenant_orchestrator_config
├── tenant_id: UUID FK → tenants (UNIQUE)
└── config: JSONB {
    timezone_rules: { start, end, working_days, phone_prefix_map },
    sequence: [ {step, action, agents, delay_hours} ],
    ab_testing: { enabled, split }
    }

client_configs
├── tenant_id: UUID FK → tenants (UNIQUE)
├── routing_rules: JSONB
├── rescue_config: JSONB
└── timezone_config: JSONB
```

### 3.2 Módulo de leads (núcleo del negocio)

```
lead
├── id: UUID PK
├── tenant_id: UUID FK → tenants
├── id_lead_externo: TEXT (ID en CRM externo)
├── nombre, apellido, telefono, email, pais
├── tipo_lead, origen, campana
├── fecha_ingreso_crm, fecha_primer_contacto, fecha_actualizacion
├── is_ai_enabled: BOOLEAN
├── current_stage: TEXT
├── metadata: JSONB  ← datos dinámicos del agente IA
├── last_interaction_at: TIMESTAMPTZ
└── is_ai_paused: BOOLEAN

lead_cualificacion (1:N con lead — 1 por interacción)
├── id_lead: UUID FK → lead
├── id_llamada: UUID FK → llamadas (nullable)
├── cualificacion: TEXT  ← "si"/"no"/"anulado" (no coincide con spec "apto"/"no apto")
├── motivo_anulacion: TEXT
├── anios_experiencia: INTEGER
├── nivel_estudios: TEXT
└── tenant_id: UUID FK → tenants

lead_programas (N:M)
├── id_lead: UUID FK → lead
└── id_programa: UUID FK → programas

programas
├── tenant_id: UUID FK → tenants
├── nombre, id_producto
├── presentacion, objetivos, precio, becas_financiacion
├── metodologia, beneficios, practicas
├── fechas_inicio, requisitos_cualificacion
```

### 3.3 Módulo de IA

```
ai_agents
├── tenant_id: UUID FK → tenants
├── name, description
├── type: TEXT (QUALIFY/REMINDER/CLOSER)
└── status: TEXT (ACTIVE/PAUSED)

ai_agent_variants (M:1 con ai_agents)
├── agent_id: UUID FK → ai_agents
├── prompt_text: TEXT
├── is_active: BOOLEAN, is_variant_b: BOOLEAN
├── weight: FLOAT (A/B testing)
├── model_name: TEXT (gpt-4o-mini, gpt-4o...)
├── api_key: TEXT  ← OpenAI key del tenant
├── tracked_variables: JSONB  ← lista de vars a extraer
├── dynamic_variables: JSONB
├── automation_rules, crm_config: JSONB
├── knowledge_base_ids: UUID[]
└── scheduling_config: JSONB

voice_agents + voice_agent_variants (análogo a ai_agents)

web_widgets
├── tenant_id, agent_id
├── welcome_message, required_variables
└── bubble_color, bubble_icon, status
```

### 3.4 Módulo de comunicación y logs

```
llamadas
├── tenant_id: UUID FK → tenants
├── id_lead: UUID FK → lead
├── id_llamada_retell: TEXT
├── estado_llamada, razon_termino
├── fecha_inicio, duracion_segundos
├── url_grabacion, transcripcion, resumen

intentos_llamadas (tabla actual)
├── tenant_id, id_lead, id_llamada
├── tipo_intento, numero_intento
├── fecha_reintento, estado, fecha_ejecucion

intentos (tabla LEGACY — duplicada)
├── misma estructura que intentos_llamadas
└── ← pendiente deprecar

conversaciones_whatsapp
├── tenant_id, id_lead
├── id_conversacion_chatwoot
├── acepta_whatsapp, opt_in_whatsapp
├── estado, fecha_ultimo_mensaje

chat_messages (mensajes individuales WhatsApp)
├── tenant_id: TEXT (!)  ← no UUID, no FK
├── lead_id: UUID FK → lead
├── direction: INBOUND/OUTBOUND
├── message_type, content, sent_by, status
└── metadata: JSONB

chat_summaries (memoria consolidada)
├── tenant_id: UUID FK → tenants
├── lead_id: UUID FK → lead (UNIQUE)
└── summary: TEXT  ← historial completo en 1 fila

notificaciones, system_logs, ai_agent_logs, lead_events
```

### 3.5 Módulo de citas (duplicado)

Existen **dos tablas de citas** en producción:

| Tabla           | Migration              | Campo fecha                                     | Estado        |
| --------------- | ---------------------- | ----------------------------------------------- | ------------- |
| `agendamientos` | multitenant_schema.sql | `fecha_agendada_cliente`, `fecha_agendada_lead` | Schema legacy |
| `appointments`  | orchestrator_v3.sql    | `scheduled_at`                                  | Schema activo |

El código usa `appointments` en la mayoría de casos (calendar.ts, orchestrator.ts) pero `agendamientos` sigue presente y algunos server actions la referencian. Requiere consolidación.

### 3.6 Módulo de orquestación

```
workflows
├── tenant_id, name, description
└── is_active, is_primary

orchestration_graphs (estado visual ReactFlow)
├── workflow_id: UUID FK → workflows
└── graph_data: JSONB

orchestration_rules (secuencias de ejecución)
├── workflow_id: UUID FK → workflows
├── step_name, action_type, sequence_order
└── config: JSONB

tenant_orchestrator_config (config BullMQ por tenant)
```

### 3.7 Módulo de knowledge base

```
knowledge_base
├── tenant_id: UUID FK → tenants
├── name, description, file_key (MinIO/S3)
├── content_hash, is_active
└── metadata: JSONB

knowledge_base_embeddings
├── tenant_id: UUID FK → tenants
├── file_id, content: TEXT
├── embedding: vector(1536)  ← pgvector/ivfflat
└── metadata: JSONB

Función: match_knowledge_base(query_embedding, match_threshold, match_count, tenant_id)
```

---

## 4. Capa de cache

### 4.1 Redis (src/lib/cache/tenant-cache.ts)

- **TTL:** 5 minutos
- **Prefijo:** `af:tenant:config:`
- **Patrón de clave:** `af:tenant:config:{tenantId}:{key}`
- **Librería:** `redis` npm (con soporte TLS para Upstash)
- **Fallback:** Si Redis no está disponible, se va a BD sin cache (silencioso)
- **Invalidación:** `invalidateTenantConfigCache(tenantId)` usa `redis.keys(pattern)` + `redis.del`

### 4.2 Map en memoria (tenant-router.ts, tenant-client.ts)

- `metaCache: Map<tenantId, TenantMeta>` — 5min TTL — modo de conexión por tenant
- `clientCache: Map<tenantId, SupabaseClient>` — 5min TTL — cliente externo por tenant

---

## 5. Flujo de datos: lead → BD

```
CRM externo (webhook/polling)
        ↓
POST /api/webhooks/crm o /api/leads/ingest
        ↓
Upsert en lead con { onConflict: "tenant_id, id_lead_externo" }
        ↓
Orchestrator.processLead(leadId, tenantId)
        ↓
┌─────────────────────────────────────────┐
│ 1. Verificar zona horaria               │
│ 2. Determinar canal (call/whatsapp)     │
│ 3. Llamar a Retell/Ultravox             │
│    → dynamicVariables: {               │
│        id_lead, user_name, user_phone,  │
│        user_country, master_name,       │
│        course_info, etc.               │
│      }                                  │
└─────────────────────────────────────────┘
        ↓
POST /api/webhooks/retell (fin de llamada)
        ↓
PostAnalysisService.processInteraction()
        ├── analyzeConversation(transcript) → LLM extraction
        ├── Upsert lead_cualificacion
        ├── FactExtractionService (tracked_variables)
        │   └── UPDATE lead.metadata (JSONB merge)
        ├── Update chat_summaries (1 fila por lead)
        └── Si cualificado → Orchestrator.handleLeadQualification()
                └── calendar.bookAppointment() → INSERT appointments
```

---

## 6. Migraciones aplicadas (orden cronológico)

| Archivo                                         | Descripción                                                           | Notas                                        |
| ----------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `20260403200000_orchestration_system.sql`       | workflows, graphs, rules                                              | RLS con auth.jwt() tenant_id                 |
| `20260404_ai_agents.sql`                        | ai_agents, ai_agent_variants                                          | RLS tautológica                              |
| `20260404_chat_messages.sql`                    | chat_messages                                                         | tenant_id como TEXT                          |
| `20260404_create_multitenant_schema.sql`        | lead y tablas centrales                                               | 12 tablas + RLS service_role                 |
| `20260404_multitenant_v2.sql`                   | Añade tenant_id a tablas existentes                                   | Migración retrocompatible                    |
| `20260404_orchestrator_v3.sql`                  | advisors, availability_slots, appointments                            | RLS `USING(true)` genérico                   |
| `20260406_add_flow_config.sql`                  | config de flujos                                                      | —                                            |
| `20260410_scaling_and_deduplication.sql`        | índices deduplicación lead                                            | idx_lead_tenant_phone, idx_lead_tenant_email |
| `20260410_worker_specialization.sql`            | status a appointments                                                 | —                                            |
| `20260413_*` (múltiples)                        | lead photo, segmentation, model, retell config, flow graph, ai toggle | —                                            |
| `20260417_dynamic_inactivity_fields.sql`        | campos de inactividad                                                 | —                                            |
| `20260417_orchestrator_v2_schema.sql`           | current_stage, metadata en lead; client_configs                       | —                                            |
| `20260417_system_logs_table.sql`                | system_logs                                                           | RLS service_role correcto                    |
| `20260421_*`                                    | fix variants upsert, rename columns                                   | —                                            |
| `20260423_*`                                    | tracked_variables, agent variables, model_name                        | —                                            |
| `20260424_knowledge_and_billing.sql`            | knowledge_base, spend limits                                          | RLS con app.current_tenant (roto)            |
| `20260427_web_widgets.sql`                      | web_widgets                                                           | RLS sin aislamiento real                     |
| `20260429_appointment_reminders_and_pacing.sql` | advisors, appointments reminders                                      | —                                            |
| `20260504_add_advisor_filters.sql`              | advisors filtros                                                      | —                                            |
| `20260512_fix_appointments_schema.sql`          | columnas faltantes en appointments                                    | —                                            |
| `20260513_add_metadata_to_lead.sql`             | lead.metadata JSONB                                                   | Duplica lo de orchestrator_v2                |

**Archivos SQL sueltos no en migrations/:**

- `tenants.sql` — schema inicial de tenants
- `knowledge_base.sql` — schema KB con funciones pgvector
- `schema.sql` — stub vacío (legacy)
- `MASTER_RESTORE.sql` — script de recuperación con datos de tenant hardcodeados
- `repair_and_setup.sql`, `restore_all_data.sql`, etc. — scripts de mantenimiento ad-hoc

---

## 6. Sprint 1 (v0.2.0) — Capa Zod + Repository pattern

> **Refresh 22-05-2026** — Sprint 1 introduce la capa de validación Zod + abstracción Repository sobre `@supabase/ssr`. Sin ORM nuevo (R-019). Las secciones anteriores describen el estado **antes** del Sprint 1 (audit).

### 6.1 `src/lib/schemas/` — Zod schemas

Single source of truth para validar + tipar entidades. Tipos via `z.infer<typeof Schema>`. Nomenclatura validada contra `docs/Docs-entrega-clienta/Estructura/VARIABLES DEFINIDAS- TODO EL PROCESO ok.docx`.

```
src/lib/schemas/
├── _base.ts              # uuid/email/phone helpers + enums comunes (LeadStage, HandoffReason, AppointmentStatus, etc.)
├── leads.ts              # LeadSchema + CreateLeadSchema + UpdateLeadSchema + LeadWebhookSchema + LeadCualificacionSchema
├── tenants.ts            # TenantSchema + TenantOrchestratorConfig + ClientConfigSchema
├── programs.ts           # ProgramaSchema + LeadProgramaSchema + AdvisorProgramaSchema + CampanaSchema
├── appointments.ts       # AppointmentSchema + AgendamientoSchema + LlamadaSchema + IntentoLlamadaSchema + AvailabilitySlotSchema
├── ai-agents.ts          # AiAgentSchema + AiAgentVariantSchema + VoiceAgentSchema + ModelNameSchema (whitelist 2-35)
├── knowledge-base.ts     # KnowledgeItem + KnowledgeEmbedding + ChatMessage
├── integrations.ts       # IntegrationSchema (con credentials_cipher AES-256) + WebhookSchema + CrmFieldMappingSchema + CrmWriteAuditSchema
├── opportunities.ts      # LeadOpportunitySchema + OpportunityStatusEnum (NEW-06)
└── index.ts              # barrel
```

**Enums centralizados** (`_base.ts`):

- `LeadStageEnum`: `QUALIFICATION | SCHEDULING | COMPLETED | DROPPED | UNREACHABLE`
- `HandoffReasonEnum`: `invalid_phone | max_attempts_exceeded | user_requested_stop` (ADR-014)
- `CallStatusEnum`, `AppointmentStatusEnum`, `CampaignStatusEnum`, `LlmProviderEnum`, etc.

**Whitelist modelos LLM** (`ai-agents.ts ModelNameSchema`):

- 15 modelos: OpenAI gpt-4o/4o-mini/4-turbo/4.1/4.1-mini/4.5-preview, Anthropic claude-3-5-sonnet/haiku, claude-3-haiku/opus, Google gemini-1.5-pro/flash/2.0-flash.
- Enforced en `saveAgentVariant` Server Action.

### 6.2 `src/lib/repositories/` — Repository pattern

Abstracción tenant-scoped sobre `@supabase/ssr`. Sin ORM. Patrón `IRepository<T,Create,Update>`. Todas las queries tenant-scoped via `withTenantFilter`.

```
src/lib/repositories/
├── _base-repository.ts            # IRepository, RepoResult, paginate, handleSupabaseError, withTenantFilter
├── leads-repository.ts            # findByTenant(filters), findByExternalId, softDelete -> DROPPED
├── tenants-repository.ts          # findByApiKey, findByAuthUserId
├── appointments-repository.ts     # AppointmentsRepository + CallsRepository + AttemptsRepository
├── ai-agents-repository.ts        # AiAgentsRepository + AiAgentVariantsRepository (con upsert+findActiveVariant) + VoiceAgentsRepository
├── knowledge-base-repository.ts   # KnowledgeBaseRepository + KnowledgeEmbeddingsRepository + ChatMessagesRepository
├── integrations-repository.ts     # IntegrationsRepository (findByCrmType prep Fase 2) + CrmFieldMappingRepository + CrmWriteAuditRepository (append-only R-014) + WebhooksRepository
├── lead-opportunities-repository.ts # createWithDedup ventana 48h (NEW-06)
└── index.ts
```

**Patrón estándar** de método:

```ts
async findByTenant(tenantId: string, params?: PaginationParams): Promise<RepoListResult<T>> {
  const supabase = await getAdminSupabaseClient();
  const { from, to } = paginate(params);
  const { data, error, count } = await supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .range(from, to);
  if (error) return { data: [], error: handleSupabaseError(error) };
  return { data: data as T[], error: null, count };
}
```

### 6.3 RLS hardening (Sprint 1 Bloque 2.6)

Cerradas 3 vulnerabilidades del audit (F-04-005/006/008) — patrón `owner_or_admin`:

```sql
USING (
  tenant_id IN (SELECT id FROM public.tenants WHERE auth_user_id = auth.uid())
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
)
```

Aplicado a: `ai_agents`, `ai_agent_variants` (via subquery agent_id), `web_widgets`, `programas`, `integrations` (nueva), `lead_opportunities` (nueva).

`service_role` mantiene bypass para webhooks / cron / workers.

### 6.4 Cifrado AES-256-GCM tokens OAuth (Sprint 1 tarea 2-26 + ADR-017)

`src/lib/crypto/token-crypto.ts` — wrappers `encryptToken/decryptToken/encryptJson/decryptJson`. Clave 32 bytes hex en `ENCRYPTION_KEY` env. Formato persistido: `iv_hex:ciphertext_hex:authTag_hex`. Aplicado a `integrations.credentials_cipher`.

### 6.5 Nuevas tablas Sprint 1

- `public.integrations` (Sprint 1 2-26) — credenciales OAuth cifradas. RLS owner_or_admin.
- `public.lead_opportunities` (Sprint 1 NEW-06) — un lead puede tener N solicitudes; dedup 48h por lead+programa.

### 6.6 Política de migración incremental (ADR-019)

- TODO código nuevo: usa repos + schemas. Prohibido `supabase.from()` directo y `as any` salvo justificación.
- Código existente migra cuando se toca por bug fix / feature adyacente.
- Sprint v0.5.4 candidate si la migración orgánica no completa antes de MVP.
- Métricas auditoría documentadas en ADR-019.

### 6.7 Tests Sprint 1 (Vitest)

- 58 unit tests pasando (`tests/unit/schemas/`, `tests/unit/crypto/`, `tests/unit/utils/`, `tests/unit/repositories/`).
- 4 integration tests skip-by-env (`lead-opportunities.integration.test.ts`).
- Comandos: `npm test` (run), `npm run test:watch`, `npm run test:coverage`.
- Coverage incluye `src/lib/schemas/**`, `src/lib/repositories/**`, `src/lib/crypto/**`, `src/lib/utils/logger.ts`.

### 6.8 ADRs Sprint 1

| ADR | Tema                                                                             |
| --- | -------------------------------------------------------------------------------- |
| 014 | Política unificada handoff humano                                                |
| 015 | Orquestador doble personalidad + consolidación diferida (NEW-01 paso 3 → v0.5.3) |
| 016 | Upgrade Supabase ssr 0.10.3 + supabase-js 2.106.1                                |
| 017 | Cifrado AES-256-GCM tokens OAuth                                                 |
| 018 | Hardening deps deferred post-MVP (lucide-react/shadcn/eslint)                    |
| 019 | Refactor queries + as any migración incremental                                  |
