/**
 * Pipeline types and constants — no "use server" here so they can be
 * safely imported from both server and client components.
 */

export interface PipelineStage {
  id: string;
  name: string;
  segmentKey: string;
  color:
    | "blue"
    | "indigo"
    | "purple"
    | "emerald"
    | "amber"
    | "rose"
    | "teal"
    | "cyan"
    | "slate";
  order: number;
}

export interface PipelineLead {
  id: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  segmentacion: string | null;
  tipo_lead: string | null;
  origen: string | null;
  campana: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  last_interaction_at: string | null;
  is_ai_enabled: boolean;
  is_ai_paused: boolean;
  metadata?: Record<string, unknown> | null;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "stage-puesto-1",
    name: "Entrada / Nuevo",
    segmentKey: "PUESTO 1",
    color: "blue",
    order: 0,
  },
  {
    id: "stage-revisado",
    name: "En Conversación",
    segmentKey: "REVISADO",
    color: "indigo",
    order: 1,
  },
  {
    id: "stage-cualificado",
    name: "Cualificado",
    segmentKey: "CUALIFICADO",
    color: "amber",
    order: 2,
  },
  {
    id: "stage-agendado",
    name: "Cita Agendada",
    segmentKey: "AGENDADO",
    color: "emerald",
    order: 3,
  },
  {
    id: "stage-descartado",
    name: "Sin Interés",
    segmentKey: "SIN INTERÉS",
    color: "rose",
    order: 4,
  },
];
