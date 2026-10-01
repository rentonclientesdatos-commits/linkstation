---
title: "Improvement Backlog - Hoja de Ruta de Mejoras"
date: 2026-05-18
status: final
phase: 6-consolidation
agent: Consolidator+GapAnalyst (Sonnet)
---

# Improvement Backlog - linkstation

Backlog agrupado por sprints. Sin fechas - solo orden y dependencias.
Cada item: B-XXX: titulo - Esfuerzo S/M/L - IDs findings

S = dias, M = 1-2 semanas, L = sprint completo o mas.

---

## Sprint 0 - Hotfix de Seguridad (URGENTE - antes de cualquier otra cosa)

Accion inmediata requerida. El sistema tiene secretos de produccion en git.

| ID     | Titulo                                                                                                                                | Esfuerzo | Findings                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| B-001  | Rotar JWT service_role de Supabase - token comprometido desde acceso al repo                                                          | S        | F-05-SEC-001, F-04-002, F-01-001         |
| B-002  | Eliminar fallbacks hardcodeados de JWT/URL de produccion en auth-config.ts, supabase/client.ts, supabase/server.ts, actions/tenant.ts | S        | F-05-SEC-001, F-05-SEC-002, F-05-SEC-003 |
| B-003  | Mover WhatsApp verify token a variable de entorno WHATSAPP_VERIFY_TOKEN; cambiar valor en Meta Dashboard                              | S        | F-05-SEC-004, F-01-002                   |
| B-004  | Actualizar next@16.2.6 y eslint-config-next@16.2.6 (9 CVEs incluyendo SSRF CVSS 8.6)                                                  | S        | F-05-OWASP-008                           |
| B-005  | Actualizar axios@1.16.1 (12 CVEs incluyendo SSRF y prototype pollution)                                                               | S        | F-05-OWASP-008-axios                     |
| B-006  | Implementar validacion HMAC de firma en webhook Retell (header x-retell-signature)                                                    | M        | F-05-SEC-005                             |
| B-007  | Agregar autenticacion a Redis en docker-compose (--requirepass) y no exponer puerto 6379 externamente                                 | S        | F-05-OWASP-005                           |
| B-008  | Eliminar scripts con postgres directo y contrasenas hardcodeadas a IP produccion o moverlos fuera del repo                            | S        | F-04-003                                 |
| B-009  | Crear .env.example con todas las variables requeridas                                                                                 | S        | F-05-SEC-007                             |
| B-010  | Fix fetchCalls - anadir getActiveTenantId() y .eq(tenant_id) en query principal                                                       | S        | F-04-001                                 |
| B-011  | Fix getPrograms - anadir filtro tenant_id                                                                                             | S        | F-04-008                                 |
| B-012  | Fix AppointmentWatchdog - anadir filtro tenant_id en query de appointments                                                            | S        | F-02-004                                 |
| B-012b | Fix Orchestrator IDOR en actions - anadir filtro tenant_id                                                                            | S        | Audit Orchestrator                       |
| B-012c | Secure test/orchestrator API - anadir requireApiAdmin                                                                                 | S        | Audit Orchestrator                       |
| B-012d | Fix Orchestrator Race Condition (Single-Active Flow) en deploy/route.ts                                                               | S        | Audit Orchestrator                       |
| B-012e | Reparacion DB: Anadir is_primary e is_active a tabla workflows                                                                        | S        | Audit Orchestrator                       |

Dependencias Sprint 0: ninguna - todos son fixes independientes. Ejecutar en paralelo si es posible.
Precondicion para Sprint 1: B-001 (rotar JWT) es critico para la seguridad del resto del trabajo.

---

## Sprint 1 - Alineacion con Spec Cliente

Corregir divergencias entre el codigo y los requisitos del negocio.
Requiere aclaracion de nomenclatura con la cliente antes de algunos items (ver preguntas G-03 en gap-analysis).

| ID    | Titulo                                                                                                            | Esfuerzo | Findings                               |
| ----- | ----------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------- |
| B-013 | Fix worker.js firma executeSequenceStep - recuperar lead completo de BD antes de llamar                           | S        | F-02-001                               |
| B-014 | Crear llm-factory.ts con createLLM() usando AgentFactory existente                                                | S        | F-02-005, F-03-001                     |
| B-015 | Corregir umbral Regla B: cambiar qualifier.ts linea 80 de expYears >= 3 a expYears >= 2                           | S        | F-01-004, F-02-006, F-03-003, F-04-009 |
| B-016 | Revisar Regla C (sin estudios >= 5 anios): confirmar con cliente si existe o eliminar                             | S        | F-01-005                               |
| B-017 | Implementar exclusion de perfiles manuales (fontanero, camarero, albanil) en qualifier.ts                         | S        | F-01-005                               |
| B-018 | Unificar schema qualified: adoptar apto/no apto en ai-analysis.ts, fact-extractor.ts, qualifier.ts y columna BD   | M        | F-01-003, F-03-002, F-04-010           |
| B-019 | Unificar nomenclatura years*experience: eliminar variantes YEARS_EXPERIENCIE y YEARS* EXPERIENCIE                 | S        | F-03-006, D-005                        |
| B-020 | Aclarar con cliente y alinear: user_profession vs user_profesion                                                  | S        | F-03-005, D-004                        |
| B-021 | Aclarar con cliente y alinear: curse_name vs course_name - anadir alias en codigo si se mantiene typo oficial     | S        | F-01-007, D-004                        |
| B-022 | Renombrar tipo_lead a estado o clarificar mapeo hacia variable {estado} de spec                                   | M        | F-01-006                               |
| B-023 | Anadir manejo de estado prematriculado en extractores y definir accion que dispara                                | S        | F-03-010, D-007                        |
| B-024 | Corregir typo book_appointmen en Promt-Virginia.md y verificar contenido en BD ai_agent_variants                  | S        | F-03-004, D-006                        |
| B-025 | Actualizar menu sidebar para coincidir con spec: Campanas como subitem de Leads, Docs como subitem de Admin Panel | S        | F-01-013                               |

Dependencias: B-013 requiere B-014 o puede ejecutarse independientemente. B-018 requiere decision
sobre nomenclatura (B-020, B-021). B-015, B-016, B-017 deben coordinarse (mismo archivo qualifier.ts).

---

## Sprint 2 - Multi-tenancy y RLS Efectivo

Asegurar el aislamiento real de datos entre tenants.

| ID    | Titulo                                                                                                    | Esfuerzo | Findings                                |
| ----- | --------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| B-026 | Corregir RLS knowledge_base: cambiar current_setting(app.current_tenant) a auth.jwt() ->> tenant_id       | S        | F-04-004                                |
| B-027 | Corregir RLS ai_agents: politica tautologica - cambiar a USING(tenant_id = auth.jwt() ->> tenant_id)      | S        | F-04-005                                |
| B-028 | Corregir RLS ai_agent_variants: politica devuelve todos los agents - anadir join filtrado por tenant      | S        | F-04-005                                |
| B-029 | Corregir RLS web_widgets: cambiar IN(SELECT id FROM tenants) a = auth.jwt() ->> tenant_id                 | S        | F-04-006                                |
| B-030 | Corregir RLS tenant_orchestrator_config: anadir TO service_role                                           | S        | F-04-012                                |
| B-031 | Corregir RLS chat_messages: anadir TO service_role; migrar tenant_id de TEXT a UUID FK                    | M        | F-04-013                                |
| B-032 | Validar server-side ownership de cookie af-tenant-id - verificar que tenant pertenece al usuario          | M        | F-05-OWASP-001                          |
| B-033 | Mover Zoho owner IDs de hardcoded a tenant_orchestrator_config                                            | S        | F-02-003                                |
| B-034 | Implementar JWT claim tenant_id en Auth Hook de Supabase para que RLS sea efectivo con JWT                | M        | docs/security/auth-and-rls.md seccion 5 |
| B-035 | Sanitizar parametro id en widget embed script - validar UUID/alphanumerico, escapar caracteres            | S        | F-05-OWASP-003                          |
| B-036 | Auditar y restringir route exec_sql en tenant/migrate - solo operaciones especificas                      | M        | F-05-OWASP-004                          |
| B-037 | Anadir validacion de dominio allowlist para tenantUrl en tenant/migrate (mitigar SSRF)                    | S        | F-05-OWASP-011                          |
| B-038 | Implementar deduplicacion de secuencia en handleNewLead - verificar job activo en BullMQ antes de encolar | M        | F-02-010                                |

Dependencias: B-034 (JWT claim) desbloquea B-026 a B-031 para que RLS sea efectivo con authenticated role.
B-030 y B-031 son independientes y pueden ejecutarse antes.

---

## Sprint 3 - Observabilidad y Costes LLM

Sin visibilidad de costes reales ni latencia, el sistema opera a ciegas.

| ID    | Titulo                                                                                         | Esfuerzo | Findings       |
| ----- | ---------------------------------------------------------------------------------------------- | -------- | -------------- |
| B-039 | Persistir completion.usage en chat_messages al guardar respuestas de WhatsApp AI               | S        | F-03-007       |
| B-040 | Actualizar precios hardcodeados en dashboard de costes (gpt-4o-mini es mas barato)             | S        | F-03-007       |
| B-041 | Implementar dead-letter queue en BullMQ - persistir jobs fallidos en BD y notificar            | M        | F-02-002       |
| B-042 | Implementar persistencia de current_step_index en tabla lead - no inferir desde logs           | M        | F-02-008       |
| B-043 | Instrumentar latencia real en WhatsAppAIProcessor y loggear si supera umbral                   | S        | F-03-011       |
| B-044 | Implementar retry con backoff exponencial para errores 429 de OpenAI                           | M        | F-03-008       |
| B-045 | Centralizar instanciacion de cliente OpenAI - singleton lazy como en ai-rescue.ts              | S        | F-03-008       |
| B-046 | Anadir security headers HTTP en next.config.ts (X-Frame-Options, X-Content-Type-Options, etc.) | S        | F-05-OWASP-006 |
| B-047 | Implementar alertas de umbral de coste por tenant (notificacion si supera limite)              | M        | F-03-007       |
| B-048 | Integrar Sentry o equivalente para error tracking y audit log de operaciones admin             | M        | F-05-OWASP-010 |
| B-049 | Fix race condition retry sequence - usar jobId unico por intento o lock optimista en BD        | M        | F-02-007       |
| B-050 | Integrar RescueWorker en cron BullMQ del worker.js                                             | S        | F-02-017       |

Dependencias: B-039 antes de B-040 (los datos deben existir para que el dashboard los muestre).
B-041 (DLQ) es independiente y prioritario para observabilidad de produccion.

---

## Sprint 4 - Deuda Tecnica y Tests

Mejorar la calidad del codigo y agregar cobertura de tests para reglas de negocio criticas.

| ID    | Titulo                                                                                          | Esfuerzo | Findings                         |
| ----- | ----------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| B-051 | Instalar vitest - configurar para Next.js/ESM                                                   | S        | F-01-008                         |
| B-052 | Tests unitarios para qualifier.ts (arbol de decision Reglas A/B) - cobertura >= 80%             | M        | F-01-008                         |
| B-053 | Tests unitarios para fact-extractor.ts (parsing de variables del agente)                        | M        | F-01-008                         |
| B-054 | Tests de integracion para flujo completo de cualificacion WhatsApp                              | L        | F-01-008                         |
| B-055 | Resolver 426 instancias de as any/as unknown - comenzar por modulos criticos                    | L        | F-01-012                         |
| B-056 | Extraer tipo TraceabilityEvent a src/types/ - eliminar import cruzado lib/actions -> components | S        | F-01-010                         |
| B-057 | Mover scripts oneshot de src/lib/ y src/scripts/ a scripts/ raiz con documentacion              | S        | F-01-009, F-01-015               |
| B-058 | Consolidar tablas duplicadas: appointments vs agendamientos; intentos vs intentos_llamadas      | M        | docs/audit/04-data-findings.md   |
| B-059 | Eliminar SweepQueue o conectar al worker BullMQ - no mantener conexion Redis muerta             | S        | F-02-009                         |
| B-060 | Implementar QualifyAgent.processConversation con cadena LangChain real                          | L        | F-02-011                         |
| B-061 | Cifrar campo api_key en ai_agent_variants - usar Supabase Vault o cifrado a nivel aplicacion    | M        | F-03-009                         |
| B-062 | Actualizar supabase-js@2.106.0 y supabase/ssr@0.10.3 (bugfixes auth, breaking changes leves)    | M        | docs/dependencies/outdated.md    |
| B-063 | Actualizar langchain@1.4.0 (CVE langsmith transitiva) y aws-sdk/\*@3.1048.0                     | S        | docs/dependencies/risk-matrix.md |
| B-064 | Implementar webhook post-llamada para Ultravox (equivalente al de Retell)                       | M        | docs/architecture/llm-stack.md   |
| B-065 | Implementar fallback automatico Retell -> Ultravox si proveedor principal falla                 | L        | docs/architecture/llm-stack.md   |

Dependencias: B-051 antes de B-052, B-053, B-054. B-058 requiere decision con cliente sobre que tabla mantener.

---

## Sprint 5 - Mejoras Opcionales

Items de baja prioridad o que requieren decision de negocio.

| ID    | Titulo                                                                                                       | Esfuerzo | Findings                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------- |
| B-066 | Implementar A/B split determinista - persistir ab_variant en metadata del lead al primer paso                | S        | F-02-016                                                 |
| B-067 | Documentar proposito de rewrite /dashboardadmin en next.config.ts o eliminarlo                               | S        | F-01-011                                                 |
| B-068 | Migrar TypeScript a version 6.x - sprint dedicado con breaking changes                                       | L        | docs/dependencies/outdated.md                            |
| B-069 | Actualizar lucide-react a 1.x - renombrado de iconos, sprint dedicado                                        | L        | docs/dependencies/outdated.md                            |
| B-070 | Mover makeCheck de cookie a httpOnly y secure en setTenantCookies                                            | S        | F-05-OWASP-009                                           |
| B-071 | Splittear componentes grandes (>1400 lineas): AIAgentInbox, SummaryManager, calendar/page, NodeConfigSidebar | L        | docs/architecture/layers-and-structure.md                |
| B-072 | Eliminar @anthropic-ai/claude-code de devDependencies del proyecto de cliente                                | S        | docs/dependencies/risk-matrix.md                         |
| B-073 | Eliminar paquete npm crypto@1.0.1 (stub deprecated) - usar node:crypto nativo                                | S        | docs/dependencies/stack-versions.md                      |
| B-074 | Documentar variables de agenda y RAG con la cliente y anadir a spec oficial                                  | M        | docs/audit/00-client-spec-extraction.md seccion 10 Q1-Q2 |
| B-075 | Ejecutar npm prune para eliminar paquetes extraneous                                                         | S        | docs/dependencies/stack-versions.md                      |

---

## Dependencias entre Sprints

Sprint 0 -> Sprint 1: Sprint 0 es prerequisito de seguridad. No iniciar Sprint 1 sin completar B-001 a B-012.

Sprint 1 -> Sprint 2: Sprint 1 (B-013, B-014) desbloquea funcionalidad de BullMQ.
Sprint 1 y Sprint 2 pueden ejecutarse en paralelo en distintos dominios (Sprint 1 = logica negocio, Sprint 2 = seguridad/BD).

Sprint 2 -> Sprint 3: Sprint 2 asegura aislamiento de datos antes de agregar observabilidad.
B-041 (DLQ) de Sprint 3 puede adelantarse si Sprint 2 se bloquea.

Sprint 3 -> Sprint 4: Tests (Sprint 4) deben ejecutarse sobre codigo ya corregido de Sprints 0-2.
Sin los fixes de Sprints 0-2, los tests validan comportamiento incorrecto.

Sprint 5: Sin dependencias criticas. Puede intercalarse con otros sprints segun prioridades.

---

**Status:** DONE
**Summary:** 75 items de backlog distribuidos en 5 sprints. Sprint 0 (hotfix seguridad) es prerequisito
urgente: credenciales expuestas + flujo multi-dia roto + cross-tenant data leak. Los 3 items mas
criticos del Sprint 0: B-001 (rotar JWT), B-013 (fix worker.js), B-010 (fix fetchCalls).
