---
title: "Arquitectura Global - Vista de Pajaro"
date: 2026-05-18
status: final
agent: Consolidator+GapAnalyst (Sonnet)
sources:
  - docs/architecture/layers-and-structure.md
  - docs/architecture/orchestrator-and-worker.md
  - docs/architecture/llm-stack.md
  - docs/architecture/data-layer.md
---

# Arquitectura Global - Dashboard Esden

## Stack Tecnologico

linkstation es un AI CRM + Workflow Orchestrator para LinkStation. Implementado
como aplicacion Next.js 16 (App Router) con React 19 y TypeScript 5. La base de datos es
Supabase (PostgreSQL + pgvector). La cola de trabajos usa BullMQ sobre Redis. Los agentes
conversacionales de texto usan OpenAI GPT-4o via SDK directo; el stack multi-provider
(Anthropic, Google, OpenAI via LangChain) existe pero solo es activo en el modulo de
cualificacion post-llamada (actualmente roto por modulo faltante). Los agentes de voz usan
Retell (con SDK oficial) o Ultravox (via REST custom). El almacenamiento de media usa MinIO
(S3-compatible via AWS SDK).

---

## Capas de la Aplicacion

El sistema se organiza en 7 capas funcionales:

| Capa | Componente | Descripcion |
|------|-----------|-------------|
| 1 | src/app/ | Routing y presentacion (Next.js App Router, Server Components, API Routes, webhooks) |
| 2 | src/components/ | Componentes UI (agents, historial, layout, orchestrator, flow builder) |
| 3 | src/lib/actions/ | Server Actions (22 archivos por dominio: calls, campanas, analytics, inbox) |
| 4 | src/lib/core/ | Nucleo de negocio (orchestrator, BullMQ queue, processors, qualifier) |
| 5 | src/lib/services/ | Servicios de IA (fact-extractor, ai-analysis, knowledge-base, chat-memory) |
| 6 | src/lib/integrations/ | Integraciones externas (retell, ultravox, whatsapp, zoho, minio) |
| 7 | src/lib/supabase/ | Acceso a datos (clients: client.ts, server.ts, tenant-client.ts, tenant-router.ts) |

El proyecto tiene dos procesos de runtime: el servidor Next.js (puerto 3000, UI + API Routes)
y el worker BullMQ standalone (worker.js, proceso Node.js independiente que consume la cola Redis).

Multi-tenancy: cada tenant puede tener su propio Supabase externo (mode external) o compartir
el Supabase central de Esden (mode central). El router (tenant-router.ts) decide dinamicamente.

Docs detallados: docs/architecture/layers-and-structure.md

---

## Orchestrator y Worker BullMQ

El componente central es la clase Orchestrator (src/lib/core/orchestrator.ts, 1383 lineas).
Coordina el ciclo de vida completo del lead: llamadas de voz, mensajes WhatsApp, cualificacion,
agendamiento, y sincronizacion con CRM externo.

Flujo de un lead:
1. Entra al sistema via ZohoPollingProcessor (cron 10min), CRMPollingProcessor o WhatsApp webhook.
2. handleNewLead() verifica feature flags, entry filters, circuit breaker de gasto, compliance.
3. executeSequenceStep() ejecuta el paso segun accion (call, whatsapp, ai_agent, crm, retry).
4. Encola el siguiente paso en BullMQ con delay configurable.
5. worker.js (proceso standalone) consume la cola y ejecuta los pasos diferidos.

Processors especializados:
- WhatsAppAIProcessor: procesador de conversacion WhatsApp con OpenAI (ruta caliente).
- QualificationProcessor: analisis LLM de transcripcion post-llamada (actualmente roto - F-02-005).
- AppointmentWatchdog: vigilante de citas vencidas (cron BullMQ cada 15min).
- CRMExportProcessor: exportacion de datos al CRM externo del cliente (Zoho).
- ZohoPollingProcessor: ingesta de nuevos leads desde Zoho CRM (cron 10min).

BUG CRITICO activo: worker.js linea 58 llama executeSequenceStep con firma incorrecta.
Todos los pasos encolados por BullMQ fallan silenciosamente (F-02-001). El flujo multi-dia
(protocolo de contacto configurable) esta completamente roto en produccion.

Docs detallados: docs/architecture/orchestrator-and-worker.md

---

## LLM Stack

Proveedor dominante en produccion: OpenAI (via SDK directo). La abstraccion multi-provider
(LangChain + AgentFactory para OpenAI, Anthropic, Google) existe pero no se usa en la ruta caliente.

Flujos de IA por canal:
- WhatsApp (ruta caliente): WhatsAppAIProcessor usa OpenAI GPT-4o directamente. Hace 7 operaciones
  paralelas (fetch lead + agente + memory + summary + RAG embeddings + appointments + programas)
  antes de llamar al modelo. Implementa tools: book_appointment, cancel_appointment,
  reschedule_appointment, check_availability.
- Voz Retell: Retell gestiona el LLM de voz internamente. Post-llamada: webhook -> PostAnalysisService
  -> analyzeConversation (OpenAI gpt-4o-mini) -> FactExtractionService.
- Voz Ultravox: Ultravox gestiona el LLM internamente. SIN webhook post-llamada - gap conocido.
- Cualificacion profunda (QualificationProcessor): usa LangChain + StructuredOutputParser pero
  esta roto por modulo faltante llm-factory.ts (F-03-001).
- Rescue/Re-engagement: AIRescueService usa OpenAI gpt-4o para mensajes personalizados.

RAG: PGVector en Supabase (tabla knowledge_base_embeddings). Embedding model: text-embedding-3-small.
Solo activo en WhatsApp AI - las llamadas de voz no tienen RAG dinamico.

El prompt de Virginia (agente) se carga desde BD (ai_agent_variants.prompt_text) - no hardcodeado.
Sin embargo, los prompts de analisis (ai-analysis.ts, fact-extractor.ts) SI estan hardcodeados.

Docs detallados: docs/architecture/llm-stack.md

---

## Data Layer

Base de datos: Supabase exclusivamente via @supabase/supabase-js. Sin ORM (no Prisma).

Arquitectura dual-mode tenancy:
- mode central: queries al Supabase compartido de Esden con filtro manual tenant_id.
- mode external: queries al Supabase propio del cliente (credenciales en tabla tenants.config).
- tenant-router.ts decide el modo por tenant (cache 5min en memoria).

Tablas principales: tenants, tenant_orchestrator_config, lead, lead_cualificacion, lead_programas,
ai_agents, ai_agent_variants, voice_agents, llamadas, intentos_llamadas, conversaciones_whatsapp,
chat_messages, chat_summaries, appointments (+ tabla legacy agendamientos duplicada),
availability_slots, orchestration_graphs, orchestration_rules, workflows, knowledge_base,
knowledge_base_embeddings, programas.

Estado de RLS: Las tablas core del negocio tienen politica service_role USING(true) correcta.
El aislamiento real depende del codigo (filtros .eq(tenant_id)) no de RLS (service_role bypasea RLS).
Varias tablas tienen politicas deficientes: knowledge_base (app.current_tenant nunca seteado),
ai_agents (politica tautologica), web_widgets (devuelve todos los tenants), chat_messages (USING true
sin TO service_role, tenant_id es TEXT no UUID).

Cache: Redis (TTL 5min, prefijo af:tenant:config:) para config de tenant.
Map en memoria (TTL 5min) para modo y cliente de cada tenant.

Docs detallados: docs/architecture/data-layer.md

---

## Diagrama ASCII de Arquitectura Global

```
                        +-----------------+
                        |   LEADS INGEST  |
                        |   (entry points)|
                        +-----------------+
                        | ZohoPolling     |
                        | CRMPolling      |
                        | WhatsApp WH     |
                        | /api/leads/ingest|
                        +-------+---------+
                                |
                                v
+-------------------------------+-------------------------------+
|              ORCHESTRATOR (src/lib/core/orchestrator.ts)      |
|                                                               |
|  Feature flags -> Entry filters -> Circuit breaker            |
|  -> Compliance (timezone) -> Execute step                     |
|                                                               |
|  call | whatsapp | ai_agent | crm | retry_sequence            |
+--+------------+----------+----------------+------------------+
   |            |          |                |
   v            v          v                v
Retell/     WhatsApp    Assign         CRMExport
Ultravox    Bridge      Agent          (Zoho update)
(voice)     (text)      only
   |            |
   v            v
 BullMQ Queue (Redis)
   lead_sequence_queue
      |
      v
 worker.js (standalone Node process)
      |
      +-- call/whatsapp steps -> orchestrator.executeSequenceStep [BUG F-02-001]
      +-- WATCHDOG_SCAN -> AppointmentWatchdog
      +-- ZOHO_POLLING -> ZohoPollingProcessor
      +-- QUALIFY_ANALYSIS -> QualificationProcessor [BROKEN - llm-factory missing]
      +-- CRM_SYNC -> CRMExportProcessor

WHATSAPP AI (ruta caliente - independiente del orchestrator de secuencia):
  WhatsApp msg -> WhatsAppWebhookProcessor -> BullMQ
  -> WhatsAppAIProcessor
       |-- Supabase: lead + agent + memory + summary + RAG + appointments [paralelo]
       |-- OpenAI GPT-4o (tools: book_appointment, check_availability, ...)
       |-- WhatsApp send + save chat_messages
       +-- FactExtractionService [async fire-and-forget]
            +-- OpenAI GPT-4o-mini -> variables -> lead.metadata -> CRM_SYNC

RETELL VOICE POST-CALL:
  /api/webhooks/retell -> llamadas table
  -> PostAnalysisService -> analyzeConversation (OpenAI)
  -> lead_cualificacion upsert -> FactExtractionService

DATA LAYER:
  +-- Supabase Central (shared) [service_role + manual tenant_id filters]
  +-- Supabase per Tenant (external mode) [tenant-client.ts]
  +-- Redis (BullMQ queues + tenant config cache)
  +-- MinIO/S3 (media storage)

NEXT.JS SERVER (port 3000):
  +-- Dashboard UI (React 19, Tailwind, shadcn/ui)
  +-- API Routes (/api/webhooks/*, /api/leads/ingest, /api/orchestration/*)
  +-- Server Actions (src/lib/actions/)
```

---

## Links a Documentacion Detallada

- Capas y estructura del proyecto: docs/architecture/layers-and-structure.md
- Orchestrator y Worker BullMQ: docs/architecture/orchestrator-and-worker.md
- Stack LLM (providers, flujos, RAG): docs/architecture/llm-stack.md
- Data Layer (schema BD, RLS, cache): docs/architecture/data-layer.md

---

**Status:** DONE
**Summary:** Vista de pajaro de la arquitectura global sintetizada desde los 4 docs de arquitectura
detallados. El sistema es un AI CRM con 2 procesos de runtime (Next.js + BullMQ worker), flujo
de leads via orquestador, LLM stack dominado por OpenAI, y BD Supabase con modelo dual-mode tenancy.
Hay 2 bugs criticos activos que bloquean el flujo multi-dia (F-02-001) y el analisis post-llamada (F-03-001).
