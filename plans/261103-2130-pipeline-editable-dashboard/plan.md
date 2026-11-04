---
title: "Pipeline de Leads Editable y en Tiempo Real para el Dashboard"
sprint_id: SP-PIPELINE-DASHBOARD
version_target: v0.5.2
assigned_to: Team LinkStation
created: 03-11-2026 21:30
status: 🔘 Planificación Completa
effort: 8-12h dev
---

# Plan de Implementación: Pipeline Editable y Dinámico de Leads

## 1. Visión y Objetivos
Implementar una sección interactiva de **Pipeline Kanban Editable** en `/dashboard` que:
1. Permita visualizar y editar las etapas (columnas) del embudo de ventas.
2. Refleje en **tiempo real y de forma automática** cómo los leads cambian de columna a medida que la IA (o el equipo) avanza su cualificación y segmentación (`lead.segmentacion`).
3. Permita mover leads entre etapas mediante **Drag-and-Drop** (`@dnd-kit`) o selector rápido.
4. Mantenga sincronización bidireccional inmediata con `tenant.config.segmentations` para que el extractor de IA (`FactExtractionService`) reconozca las nuevas etapas sin fricción.

---

## 2. Arquitectura de Conexión y Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Interacción del Lead                                                     │
│ WhatsApp / Instagram / Llamada SIP / Web Chatbot                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Extracción y Orquestación                                                │
│ FactExtractionService / WhatsAppAIProcessor / FlowInterpreter               │
│ - Detecta cualificación o agenda cita                                       │
│ - Ejecuta: UPDATE lead SET segmentacion = 'CUALIFICADO'                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Base de Datos PostgreSQL (Supabase)                                       │
│ - Tabla 'lead': columna 'segmentacion' actualizada                          │
│ - Dispara evento Realtime (postgres_changes)                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
            【 Supabase Realtime 】        【 Polling Sync (10s) 】
                         │                           │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Dashboard: <PipelineSection /> & <PipelineManager />                     │
│ - Recibe el evento y mueve la tarjeta del lead automáticamente              │
│ - Animación visual de transición de etapa                                   │
│ - Contadores y tasas de conversión por columna actualizados                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos y Configuración (Zero-Migration)

### A. Estructura de Etapas en `tenants.config.pipeline_stages`
```typescript
export interface PipelineStage {
  id: string;          // ej: "stage-puesto-1"
  name: string;        // ej: "Prospectos Nuevos"
  segmentKey: string;  // ej: "PUESTO 1" (valor exacto en lead.segmentacion)
  color: "blue" | "indigo" | "purple" | "emerald" | "amber" | "rose" | "teal";
  order: number;
}
```

### B. Etapas por Defecto (Fallback Inteligente):
1. **Entrada / Puesto 1** (`PUESTO 1` / `NUEVO`): Color Azul
2. **Revisado / En Conversación** (`REVISADO` / `CONTACTADO`): Color Índigo
3. **Cualificado** (`CUALIFICADO` / `INTERESADO`): Color Ámbar
4. **Cita Agendada / Cierre** (`AGENDADO` / `RESERVA`): Color Esmeralda
5. **No Califica / Descartado** (`SIN INTERÉS` / `DESCARTADO`): Color Rosa/Gris

---

## 4. Tareas del Plan de Implementación

- [ ] **Fase 1: Server Actions y Capa de Datos (`src/lib/actions/pipeline.ts`)**
  - Implementar `getPipelineData(tenantId, filters)`: Carga etapas del tenant y leads agrupados.
  - Implementar `updateLeadStage(leadId, newSegment, stageId)`: Mueve el lead de etapa en BD.
  - Implementar `savePipelineStages(tenantId, stages)`: Guarda etapas en `tenant.config.pipeline_stages` y sincroniza `tenant.config.segmentations`.

- [ ] **Fase 2: Componentes de UI del Pipeline (`src/components/dashboard/`)**
  - `PipelineCard.tsx`: Tarjeta de lead con avatar, nombre, teléfono, canal (WhatsApp, IG, etc.), última interacción y selector rápido.
  - `PipelineColumn.tsx`: Columna Droppable con header, contador, % sobre total y scroll suave.
  - `PipelineManager.tsx`: Tablero Kanban con `@dnd-kit`, búsqueda por texto, filtros y canal de Realtime.
  - `PipelineStageEditorModal.tsx`: Modal para añadir, renombrar, reordenar y cambiar colores de etapas.
  - `PipelineSection.tsx`: Wrapper para `/dashboard/page.tsx` con Suspense y skeletons.

- [ ] **Fase 3: Integración en la Página `/dashboard/page.tsx`**
  - Integrar `<PipelineSection />` con soporte de filtros globales (fecha, campaña).
  - Incluir botón de edición para administradores.

- [ ] **Fase 4: Testing y Verificación**
  - Tests unitarios en `tests/unit/pipeline-service.test.ts`.
  - Validación con `npx tsc --noEmit` y `npx vitest run`.
