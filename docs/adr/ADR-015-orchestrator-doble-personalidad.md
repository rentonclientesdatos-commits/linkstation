# ADR-015 — Orquestador: "doble personalidad" (legacy + multi-workflow) — decisión sobre consolidación

| Campo  | Valor                                                                    |
| ------ | ------------------------------------------------------------------------ |
| Fecha  | 22-05-2026                                                               |
| Autor  | Javi HP                                                                  |
| Sprint | Sprint 1 — Bloque 2.9 (tarea NEW-01 paso 3)                              |
| Estado | ✅ Aceptado — consolidación **diferida** a sprint dedicado post-MVP      |
| Origen | Renzo V1 §"Módulo del Orquestador" + investigación durante NEW-01 paso 2 |

## Contexto

Tras cerrar el bug crítico de `saveOrchestratorConfig` (NEW-01 paso 2, commit `837e12f`), la investigación del paso 3 (consolidación de tablas que Renzo apuntó como deuda técnica) revela que el sistema tiene **dos motores de orquestación coexistiendo**, no una "tabla vieja vs tabla nueva" como se asumió inicialmente.

### Motor 1 — Legacy "single-config"

- **Storage**: `tenant_orchestrator_config.config` (JSONB único por tenant) + `.flow_graph` (dibujo UI).
- **Entry point**: `Orchestrator.handleNewLead(leadId, tenantId)` — disparado automáticamente por webhooks de ingesta de leads (Retell, WhatsApp, formularios web).
- **Lectura**: `getOrchestratorConfigForTenant(tenantId)` lee `.config` y devuelve `TenantOrchestratorConfig` con `sequence[]`.
- **Ejecución**: `executeSequenceStep(lead, tenantId, sequence, stepIndex, config)` itera el `sequence[]` del config.
- **Limitación**: solo un `sequence` por tenant. No permite múltiples workflows según origen del lead.

### Motor 2 — Multi-workflow (más nuevo)

- **Storage**: `workflows` (1 row por workflow + tenant) + `orchestration_rules` (N rows por workflow, cada row = step).
- **Entry point**: `triggerOrchestratorForLead(leadId, workflowId)` — disparado explícitamente desde el Playground o API `/orchestration/deploy`.
- **Ejecución**: `orchestrator.executeWorkflow(workflowId, lead, tenantId)` lee del `workflows`/`orchestration_rules` y ejecuta paso a paso.
- **Capacidad**: múltiples workflows por tenant. Cada workflow tiene su `flow_graph` propio.

### Lo que dijo Renzo (matiz importante)

> "El sistema intenta leer de una tabla nueva (workflows), pero el lienzo visual guarda en una tabla vieja (tenant_orchestrator_config). Hasta que no se unifiquen, el orquestador visual y el motor real de llamadas no van a coincidir."

Lo que Renzo identificó como "doble personalidad" es: **el UI builder visual** (drag&drop de nodos en `/dashboard/onboarding`) **guarda en `tenant_orchestrator_config.flow_graph` (legacy)** pero el modelo nuevo (`workflows.flow_graph`) ya existe en schema y se usa cuando el dev despliega un workflow vía API.

## Decisión

**Consolidación completa diferida a sprint dedicado post-MVP**. Razones:

### 1. Es refactor arquitectónico mayor, no un fix puntual

Consolidar requiere:

- Decidir qué motor es el "ganador" (probablemente Motor 2 multi-workflow, porque permite multi-flow por tenant).
- Migrar datos: por cada `tenant_orchestrator_config.config.sequence` → generar `workflow` "default" + `orchestration_rules` correspondientes.
- Refactor: TODOS los callers de `handleNewLead` deben elegir un `workflowId` (o usar el "default" del tenant). Esto toca webhooks Retell, WhatsApp, Zoho, HubSpot.
- Refactor UI builder: dejar de guardar en `tenant_orchestrator_config.flow_graph`; guardar en `workflow.flow_graph` (necesita `workflowId` activo seleccionado en UI).
- Migración SQL irreversible (drop columnas legacy tras período de doble escritura).

Estimación realista: 16-24h dedicadas, NO las 4h estim originales del paso 3.

### 2. El bug crítico ya está cerrado (paso 2)

`saveOrchestratorConfig` ya persiste el `config` completo (commit `837e12f`). El síntoma reportado por Renzo ("usuario configura nodo, guarda, la UI muestra success, al recargar los datos desaparecen") ya no ocurre. Los clientes pueden trabajar con el Motor 1 sin pérdida de datos.

### 3. Modelo 2 (multi-workflow) lo veremos crecer en Sprint 2

Sprint 2 (Adapter HubSpot+Zoho) probablemente expandirá el uso del Motor 2 (cada CRM puede tener su propio workflow de sync). Esto dará claridad sobre si Motor 2 es de verdad el "ganador" o si necesita ajustes adicionales antes de matar Motor 1.

### 4. Riesgo de regresión alto en MVP

Tocar `handleNewLead` durante el MVP es alto riesgo: es la entry point de toda la orquestación. Una regresión rompería el flujo completo lead → llamada → whatsapp → cita. Mejor consolidar tras el MVP, cuando el equipo Renzo (SP-4B Validación) ya esté probando en VPS y podemos detectar regresiones con confianza.

## Plan diferido (Sprint a crear post-MVP)

### Sprint "Orchestrator Unification" — propuesta para post-MVP

**Ubicación tentativa**: tras Sprint Refinamiento Herramientas Internas (v0.5.2), antes de Sprint 5 Salesforce. Versión `v0.5.3`.

**Fases**:

1. **Phase 01 — Análisis + migración datos** (4h):
   - Script SQL que para cada `tenant_orchestrator_config`, crea un `workflow` "default" + sus `orchestration_rules` derivados del `config.sequence[]`. DRY-RUN primero.
   - Verificación: cada tenant tiene exactamente un workflow "default" activo.
2. **Phase 02 — Doble escritura transición** (6h):
   - `saveOrchestratorConfig` escribe en AMBOS sitios (legacy + workflow default del tenant).
   - Lectores de `tenant_orchestrator_config.config` siguen funcionando, sin cambios todavía.
3. **Phase 03 — Switch lectores** (8h):
   - `getOrchestratorConfigForTenant` lee del workflow default en lugar de `tenant_orchestrator_config.config`.
   - `handleNewLead` decide el workflow a usar (por defecto el "default" del tenant, configurable por `lead.workflow_id` opcional).
4. **Phase 04 — UI builder** (4h):
   - Builder guarda en `workflow.flow_graph` (necesita `workflowId` activo en UI).
   - Selector de workflow en el sidebar del builder.
5. **Phase 05 — Cleanup legacy** (2h):
   - Drop columnas legacy `tenant_orchestrator_config.config` y `.flow_graph` (mantener tabla como historial si tiene otros campos).

**Total**: ~24h + cierre estándar.

## Consecuencias

### Positivas

- ✅ MVP no se infla con refactor arquitectónico de 24h.
- ✅ Bug crítico de "config perdida" ya cerrado en NEW-01 paso 2.
- ✅ La decisión queda documentada con plan claro para el sprint dedicado.

### Negativas / aceptadas

- ⚠️ La "doble personalidad" sigue existiendo en MVP — los devs deben saber que `handleNewLead` usa Motor 1 y `triggerOrchestratorForLead` usa Motor 2.
- ⚠️ El UI builder visual sigue siendo "single-config" por tenant en el MVP (no multi-workflow).
- ⚠️ Hand-off a Renzo (SP-4B Validación): documentar que esta deuda técnica existe pero no es bloqueante.

## Referencias

- Renzo V1: `docs/Informes de programacion/documentacion sistema  LinkStation V1.pdf` §"Módulo del Orquestador"
- Bug fix paso 2: commit `837e12f`
- Phase plan original: `plans/260520-1342-sprint-1-capa-datos/phase-09-fix-bugs-renzo-y-reqs-bea.md` §NEW-01
- Tabla legacy: `supabase/migrations-historical/20260404040000_orchestrator_v3.sql` (`tenant_orchestrator_config`)
- Tabla nueva: `supabase/migrations-historical/20260413010000_add_flow_graph.sql` + esquema de `workflows`/`orchestration_rules`
- Motor 1: `src/lib/core/orchestrator.ts::Orchestrator.handleNewLead`, `executeSequenceStep`
- Motor 2: `src/lib/core/orchestrator.ts::Orchestrator.executeWorkflow`, `src/lib/actions/orchestration.ts::triggerOrchestratorForLead`
