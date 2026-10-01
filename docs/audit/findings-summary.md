---
title: "Findings Summary - Consolidado de Auditoria"
date: 2026-05-18
status: final
phase: 6-consolidation
agent: Consolidator+GapAnalyst (Sonnet)
sources:
  - docs/audit/01-structure-findings.md
  - docs/audit/02-orchestrator-findings.md
  - docs/audit/03-llm-findings.md
  - docs/audit/04-data-findings.md
  - docs/security/secrets-and-env.md
  - docs/security/owasp-quick-check.md
  - docs/dependencies/risk-matrix.md
  - docs/dependencies/outdated.md
---

# Findings Summary - Auditoria linkstation

## Resumen ejecutivo

Auditoria completa del proyecto Next.js 16 + React 19 + Supabase + BullMQ + LangChain.
5 fases: estructura, orquestador/worker, LLM stack, data layer, seguridad/dependencias.

| Severidad | Cantidad | Descripcion                                                      |
|-----------|----------|------------------------------------------------------------------|
| Critical  | 16       | Seguridad activa, bugs bloqueantes, violaciones de negocio       |
| High      | 24       | Fallos funcionales, multi-tenancy incorrecto, riesgos seguridad  |
| Medium    | 18       | Deuda tecnica, nomenclatura, observabilidad                      |
| Low       | 7        | Cosmetico, documentacion, mejoras menores                        |
| **Total** | **65**   |                                                                  |

Estado en produccion: El flujo multi-paso de BullMQ esta completamente roto (F-02-001).
El analisis de transcripciones esta roto por modulo faltante (F-02-005/F-03-001). Hay
credenciales de produccion expuestas en git (F-05-SEC-001). El sistema es operativo en
camino feliz (entrada via WhatsApp webhook), pero los flujos secundarios criticos no
funcionan.

---

## Critical - Requiere accion inmediata

| Rank | ID(s) original(es) | Titulo | Archivo:linea | Esfuerzo | Categoria |
|------|---------------------|--------|---------------|----------|-----------|
| 1 | F-05-SEC-001, F-04-002, F-01-001 | JWT service_role hardcodeado en codigo fuente | src/lib/auth-config.ts:19, src/lib/supabase/server.ts:7 | S | Security |
| 2 | F-02-001 | worker.js llama executeSequenceStep con firma incorrecta - flujo multi-dia roto | worker.js:58 | S | Orchestrator |
| 3 | F-04-001 | fetchCalls sin filtro tenant_id - cross-tenant data leak en historial | src/lib/actions/calls.ts:72-128 | S | Multi-tenancy |
| 4 | F-02-005, F-03-001 | llm-factory.ts no existe - QualificationProcessor roto en runtime | src/lib/core/processors/QualificationProcessor.ts:8 | M | LLM/Orchestrator |
| 5 | F-02-004 | AppointmentWatchdog sin filtro por tenant - acceso cross-tenant | src/lib/core/processors/AppointmentWatchdog.ts:19-26 | S | Multi-tenancy |
| 6 | F-04-004 | RLS knowledge_base usa app.current_tenant que nunca se setea | supabase/migrations/20260424_knowledge_and_billing.sql:31 | S | RLS/Security |
| 7 | F-04-003 | Scripts migracion con postgres directo y contrasena hardcodeada a IP produccion | src/scripts/migrate-agents.ts:21 | M | Security |
| 8 | F-01-003, F-03-002, F-04-010 | Campo qualified usa si/no en lugar de apto/no apto - triple schema inconsistente | src/lib/services/ai-analysis.ts:51 | M | LLM/Nomenclatura |
| 9 | F-01-004, F-02-006, F-03-003, F-04-009 | Regla B cualificacion usa >=3 anios en lugar de >=2 anios (spec) | src/lib/core/intelligence/qualifier.ts:80 | S | LLM/Negocio |
| 10 | F-01-005 | Regla C no documentada en spec - cualificacion sin estudios >=5 anios; falta exclusion perfiles manuales | src/lib/core/intelligence/qualifier.ts:97 | S | LLM/Negocio |
| 11 | F-05-OWASP-002 | Secretos criptograficos expuestos - URLs produccion + JWTs en repositorio | src/lib/auth-config.ts, src/lib/supabase/server.ts | S | Security |
| 12 | F-05-SEC-004, F-01-002 | WhatsApp verify token hardcodeado (automatiza_for_2025) | src/app/api/webhooks/whatsapp/route.ts:11 | S | Security |
| 13 | F-05-OWASP-008 | next@16.1.6 con 9 CVEs activos (SSRF CVSS 8.6, middleware bypass CVSS 8.1) | package.json | S | Dependencias |
| 14 | F-02-002 | Sin dead-letter queue - jobs fallidos se pierden tras 3 reintentos | src/lib/core/queue/lead-sequence-queue.ts:78-81 | M | Orchestrator |
| 15 | F-02-003 | Zoho owner ID hardcodeado en codigo - viola multi-tenancy | src/lib/core/orchestrator.ts:36,54 | S | Multi-tenancy |
| 16 | F-04-005 | RLS ai_agents/ai_agent_variants tautologica - no aisla por tenant | supabase/migrations/20260404_ai_agents.sql:33-39 | S | RLS/Security |

---

## High - Resolver en Sprint 1-2

| Rank | ID(s) original(es) | Titulo | Archivo:linea | Esfuerzo | Categoria |
|------|---------------------|--------|---------------|----------|-----------|
| 1 | F-04-008 | getPrograms sin filtro tenant_id | src/lib/actions/calls.ts:441-455 | S | Multi-tenancy |
| 2 | F-04-006 | RLS web_widgets devuelve todos los tenants | supabase/migrations/20260427_web_widgets.sql:20-32 | S | RLS/Security |
| 3 | F-05-SEC-002 | JWT anon hardcodeado como fallback | src/lib/supabase/client.ts:16,20 | S | Security |
| 4 | F-05-SEC-003 | URL Supabase produccion hardcodeada con IP interna | src/lib/auth-config.ts:9, src/lib/supabase/server.ts:6 | S | Security |
| 5 | F-05-SEC-005 | Retell webhook sin validacion de firma HMAC | src/app/api/webhooks/retell/route.ts | M | Security |
| 6 | F-05-OWASP-001 | Cookie af-tenant-id sin validacion server-side de ownership | src/middleware.ts, src/lib/actions/tenant.ts | M | Security |
| 7 | F-05-OWASP-003 | Widget embed script interpola id sin escapar - riesgo XSS/injection | src/app/api/widget/embed.js/route.ts:22 | S | Security |
| 8 | F-05-OWASP-004 | exec_sql en route de migracion de tenant - SQL arbitrario | src/app/api/tenant/migrate/route.ts:263 | M | Security |
| 9 | F-05-OWASP-005 | Redis sin autenticacion y puerto 6379 expuesto | docker-compose.yml:59 | S | Security |
| 10 | F-05-OWASP-011 | SSRF potencial en route de migracion de tenant | src/app/api/tenant/migrate/route.ts | M | Security |
| 11 | F-05-OWASP-008-axios | axios@1.14.0 con 12 CVEs - SSRF, prototype pollution, header injection | package.json | S | Dependencias |
| 12 | F-02-007 | Race condition en retry sequence - doble enqueue posible | src/lib/core/orchestrator.ts:1262-1276 | M | Orchestrator |
| 13 | F-02-008 | triggerDynamicResume usa logs como proxy fragil de posicion de paso | src/lib/core/orchestrator.ts:364-393 | M | Orchestrator |
| 14 | F-02-010 | No hay deduplicacion de secuencia activa en handleNewLead | src/lib/core/orchestrator.ts:114-154 | M | Orchestrator |
| 15 | F-02-011 | QualifyAgent.processConversation es stub sin implementar (TODO) | src/lib/core/multi-agent.ts:66-70 | L | LLM |
| 16 | F-03-004 | Typo book_appointmen en prompt Virginia - riesgo al copiar desde doc | docs/Docs-entrega-clienta/Promt-Virginia.md:135 | S | LLM/Nomenclatura |
| 17 | F-03-005 | user_profesion (sin s) en ai-analysis.ts - inconsistente con spec | src/lib/services/ai-analysis.ts:59 | S | Nomenclatura |
| 18 | F-03-009 | API keys OpenAI en columna ai_agent_variants.api_key sin cifrado | src/lib/services/ai-analysis.ts:30-34 | M | Security |
| 19 | F-01-006 | Campo estado usa tipo_lead en BD - nomenclatura divergente de spec | src/types/database.ts:15,468 | M | Nomenclatura |
| 20 | F-01-007 | curse_name del spec silenciosamente corregido a course_name | src/lib/core/orchestrator.ts:476 | S | Nomenclatura |
| 21 | F-01-008 | Ausencia total de tests automatizados en todo el proyecto | N/A | L | Tests |
| 22 | F-04-007 | Cache Redis sin invalidacion en mutaciones - redis.keys() O(N) bloqueante | src/lib/cache/tenant-cache.ts | M | Performance |
| 23 | F-04-012 | tenant_orchestrator_config RLS USING(true) sin rol - acceso universal | supabase/migrations/20260404_orchestrator_v3.sql:43 | S | RLS |
| 24 | F-04-013 | chat_messages RLS USING(true) sin TO + tenant_id es TEXT no UUID | supabase/migrations/20260404_chat_messages.sql:25 | M | RLS/Schema |

---

## Medium - Top 15

| Rank | ID(s) original(es) | Titulo | Archivo:linea | Esfuerzo | Categoria |
|------|---------------------|--------|---------------|----------|-----------|
| 1 | F-03-006 | Clave YEARS_ EXPERIENCIE con espacio y typo hardcodeada | src/lib/services/ai-analysis.ts:62, post-analysis.ts:76 | S | Nomenclatura |
| 2 | F-03-007 | Token usage no se persiste - costes del dashboard son ficticios | src/lib/core/processors/WhatsAppAIProcessor.ts | S | Observabilidad |
| 3 | F-03-008 | Multiples clientes OpenAI por request - sin pool ni retry 429 | ai-rescue.ts, fact-extractor.ts, ai-analysis.ts | M | Performance |
| 4 | F-03-010 | Estado prematriculado del prompt Virginia no manejado en codigo | src/lib/services/ai-analysis.ts, fact-extractor.ts | S | Nomenclatura |
| 5 | F-03-011 | Latencia menor 800ms no se mide ni garantiza en WhatsAppAIProcessor | src/lib/core/processors/WhatsAppAIProcessor.ts | M | Observabilidad |
| 6 | F-03-012 | master_name vs curse_name - doble nomenclatura para mismo dato | src/lib/core/orchestrator.ts:476 | S | Nomenclatura |
| 7 | F-02-009 | sweepQueue - segunda cola Redis manual no integrada con BullMQ (codigo muerto) | src/lib/core/sweep-queue.ts | M | Orchestrator |
| 8 | F-02-013 | Compliance WhatsApp no verifica zona horaria - solo aplica a llamadas | src/lib/core/orchestrator.ts:257-266 | S | Orchestrator |
| 9 | F-02-014 | executeAIAgentStep no envia mensaje al lead - solo asigna agente | src/lib/core/orchestrator.ts:699-765 | L | Orchestrator |
| 10 | F-02-015 | CRMExportProcessor - agregar no sobrescribir no garantizado | src/lib/core/processors/CRMExportProcessor.ts:75-87 | M | Orchestrator |
| 11 | F-04-011 | motivo_descarte mapeado a motivo_anulacion sin validacion enum | src/lib/services/post-analysis.ts:75 | M | Schema/Nomenclatura |
| 12 | F-01-009 | Scripts de oneshot en src/lib/ en lugar de scripts/ raiz | src/lib/fix-photos.js, normalize-leads.js | S | Estructura |
| 13 | F-01-010 | Import cruzado de lib/actions hacia components/ - violacion de capas | src/lib/actions/lead-events.ts:4 | S | Arquitectura |
| 14 | F-01-012 | Tipado debil masivo - 426 instancias de as any/as unknown | Todo el proyecto | L | Calidad |
| 15 | F-01-013 | Menu sidebar no coincide exactamente con spec de la cliente | src/components/layout/Sidebar.tsx:26-174 | S | Spec |

---

## Low - Lista breve

- F-02-016: A/B split no reproducible - Math.random() sin semilla ni persistencia de asignacion.
- F-02-017: RescueWorker no integrado en cron del worker principal - nunca ejecuta en produccion.
- F-02-018: test-ab.ts llama metodo privado inexistente con as any - codigo muerto.
- F-01-014: /dashboard sirve como Metricas sin pagina indice separada - confusion de routing.
- F-01-015: Scripts oneshot en src/scripts/ sin mecanismo de ejecucion documentado.
- F-05-OWASP-006: Ausencia de security headers HTTP (CSP, X-Frame-Options, HSTS).
- F-05-SEC-007: Falta .env.example - documentacion de variables requeridas ausente.

---

## Findings Duplicados Consolidados

Grupos reportados por multiples agentes apuntando al mismo problema:

| Grupo consolidado | IDs de todas las fases | Descripcion |
|-------------------|------------------------|-------------|
| Credenciales Supabase hardcodeadas | F-01-001, F-04-002, F-05-SEC-001, F-05-SEC-002, F-05-SEC-003, F-05-OWASP-002 | JWT service_role + anon + URLs produccion en codigo. Archivos: auth-config.ts, supabase/client.ts, supabase/server.ts, actions/tenant.ts |
| Qualified enum inconsistente | F-01-003, F-03-002, F-04-010 | 3 schemas distintos: si/no/anulado, SI/NO/PENDIENTE, cualificado/no cualificado. Ninguno coincide con spec apto/no apto |
| Umbral Regla B cualificacion | F-01-004, F-02-006, F-03-003, F-04-009 | >=3 anios en codigo vs >=2 anios en spec. Reportado por Fases 1, 2, 3 y 4 |
| llm-factory.ts faltante | F-02-005, F-03-001 | Mismo archivo faltante detectado por Orchestrator (Fase 2) y LLM (Fase 3). QualificationProcessor roto |
| Cross-tenant data leak | F-02-004, F-04-001, F-04-008, F-05-OWASP-001 | Multiples puntos: fetchCalls, getPrograms, AppointmentWatchdog, cookie sin validacion |
| WhatsApp verify token | F-01-002, F-05-SEC-004 | Mismo token hardcodeado detectado en Fase 1 y Fase 5 |

---

## Distribucion por Area

| Area | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| Security | 6 | 11 | 2 | 1 | 20 |
| Multi-tenancy / RLS | 4 | 5 | 1 | 0 | 10 |
| LLM / Cualificacion | 4 | 3 | 5 | 0 | 12 |
| Nomenclatura / Spec | 2 | 4 | 5 | 0 | 11 |
| Dependencias (CVE) | 2 | 2 | 0 | 0 | 4 |
| Orchestrator / BullMQ | 2 | 4 | 5 | 3 | 14 |
| Arquitectura / Tests | 0 | 2 | 3 | 3 | 8 |
| Observabilidad | 0 | 0 | 2 | 0 | 2 |

---

**Status:** DONE
**Summary:** 65 findings consolidados desde 5 fases de auditoria. 16 Critical, 24 High, 18 Medium, 7 Low.
Los 3 problemas mas urgentes: (1) credenciales en repositorio git - rotar inmediatamente;
(2) worker.js con firma incorrecta - flujo multi-dia completamente roto;
(3) fetchCalls sin filtro tenant_id - todos los usuarios ven leads de todos los tenants.
