/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tenant } from "./tenant";
export type { Tenant };

// ─── LEAD ────────────────────────────────────────────────────────────────────

export type Lead = {
  id: string;
  tenant_id: string;
  id_lead_externo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  telefono?: string | null;
  email?: string | null;
  pais?: string | null;
  tipo_lead?: string | null;
  origen?: string | null;
  campana?: string | null;
  foto_url?: string | null;
  is_ai_enabled?: boolean;
  fecha_ingreso_crm?: string | null;
  fecha_creacion?: string | null;
  fecha_actualizacion?: string | null;

  // v2.0 Memory Fields — NEW-02: enum unificado (ver src/lib/schemas/_base.ts LeadStageEnum).
  // UNREACHABLE añadido en NEW-13 (ADR-014). Tipo origen de verdad: `import type { LeadStage } from "@/lib/schemas/_base"`.
  current_stage?:
    | "QUALIFICATION"
    | "SCHEDULING"
    | "COMPLETED"
    | "DROPPED"
    | "UNREACHABLE"
    | string
    | null;
  metadata?: Record<string, unknown> | null;
  last_interaction_at?: string | null;
  is_ai_paused?: boolean;
  ai_agent_id?: string | null;
  inactivity_sent_count?: number;

  [key: string]: any;
};

// ─── LLAMADA (resumen de una llamada individual) ──────────────────────────────

export type Llamada = {
  id: string;
  tenant_id: string;
  id_lead: string;
  id_llamada_retell?: string | null;
  tipo_agente?: string | null;
  nombre_agente?: string | null;
  estado_llamada?: string | null;
  razon_termino?: string | null;
  fecha_inicio?: string | null;
  duracion_segundos?: number | null;
  url_grabacion?: string | null;
  transcripcion?: string | null;
  resumen?: string | null;
  fecha_creacion?: string | null;
  // Joined from `lead`
  lead?: Lead;
  [key: string]: any;
};

export type LlamadaConLead = Llamada & { lead: Lead };

/**
 * Resumen de una llamada individual dentro del timeline de un lead.
 * Se usa en HistorialRow.llamadas[].
 */
export type LlamadaResumen = {
  id: string;
  estado_llamada?: string | null;
  razon_termino?: string | null;
  fecha_inicio?: string | null;
  duracion_segundos?: number | null;
  url_grabacion?: string | null;
  resumen?: string | null;
  tipo_agente?: string | null;
  numero_intento?: number | null; // si existe en intentos_llamadas
  [key: string]: any;
};

// ─── INTENTOS LLAMADAS ────────────────────────────────────────────────────────

export type IntentoLlamada = {
  id: string;
  tenant_id: string;
  id_lead: string;
  id_llamada?: string | null;
  tipo_intento?: string | null; // "LLAMADA" | "WHATSAPP"
  numero_intento?: number | null;
  fecha_reintento?: string | null;
  estado?: string | null;
  fecha_ejecucion?: string | null;
  fecha_creacion?: string | null;
  // Joined
  lead?: Lead;
  llamada?: Llamada;
  [key: string]: any;
};

// ─── CONVERSACIONES WHATSAPP ──────────────────────────────────────────────────

export type ConversacionWhatsapp = {
  id: string;
  tenant_id: string;
  id_lead: string;
  id_conversacion_chatwoot?: string | null;
  opt_in_whatsapp?: boolean | null;
  estado?: string | null;
  fecha_ultimo_mensaje?: string | null;
  fecha_creacion?: string | null;
  // Joined
  lead?: Lead;
  [key: string]: any;
};

// ─── AGENDAMIENTOS ────────────────────────────────────────────────────────────

export type Agendamiento = {
  id: string;
  tenant_id: string;
  id_lead: string;
  fecha_agendada_cliente?: string | null;
  fecha_agendada_lead?: string | null;
  confirmado?: boolean;
  fecha_creacion?: string | null;
  // Joined
  lead?: Lead;
  [key: string]: any;
};

// ─── LEAD CUALIFICACION ───────────────────────────────────────────────────────

export type LeadCualificacion = {
  id: string;
  tenant_id: string;
  id_lead: string;
  id_llamada?: string | null;
  motivo_anulacion?: string | null;
  cualificacion?: string | null;
  calificacion_score?: number | null;
  objeciones?: string | null;
  analisis_profundo?: Record<string, unknown> | null;
  anios_experiencia?: number | null;
  nivel_estudios?: string | null;
  fecha_creacion?: string | null;
  // Joined
  lead?: Lead;
  llamada?: Llamada;
  [key: string]: any;
};

// ─── PROGRAMAS ────────────────────────────────────────────────────────────────

export type Programa = {
  id: string;
  tenant_id: string;
  nombre: string;
  id_producto?: string | null;
  presentacion?: string | null;
  objetivos?: string | null;
  precio?: string | null;
  becas_financiacion?: string | null;
  metodologia?: string | null;
  beneficios?: string | null;
  practicas?: string | null;
  fechas_inicio?: string | null;
  requisitos_cualificacion?: string | null;
  fecha_creacion?: string | null;
  [key: string]: any;
};

export type LeadPrograma = {
  id: string;
  id_lead: string;
  id_programa: string;
  fecha_creacion?: string | null;
  // Joined
  lead?: Lead;
  programa?: Programa;
  [key: string]: any;
};

export type AdvisorPrograma = {
  id: string;
  advisor_id: string;
  programa_id: string;
  created_at?: string;
  [key: string]: any;
};

// ─── NOTIFICACIONES ───────────────────────────────────────────────────────────

export type Notificacion = {
  id: string;
  tenant_id: string;
  id_lead: string;
  tipo: string;
  fecha_envio?: string | null;
  metadatos?: Record<string, unknown> | null;
  fecha_creacion?: string | null;
  // Joined
  lead?: Lead;
  [key: string]: any;
};

// ─── CAMPANAS ────────────────────────────────────────────────────────────────

export type Campana = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string | null;
  estado?: string | null; // "ACTIVA", "PAUSADA", "FINALIZADA"
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  agente_texto_id?: string | null;
  agente_llamada_id?: string | null;
  fecha_creacion?: string | null;
  [key: string]: any;
};

// ─── NEW V2.0 TABLES ─────────────────────────────────────────────────────────

export type OrchestrationRule = {
  id: string;
  tenant_id: string;
  workflow_id: string;
  step_name: string;
  action_type: string;
  sequence_order: number;
  config?: Record<string, unknown> | null;
  trigger_node_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  [key: string]: any;
};

export type Workflow = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type OrchestrationGraph = {
  id: string;
  tenant_id: string;
  workflow_id: string;
  graph_data: unknown;
  updated_at?: string;
  [key: string]: any;
};

export type PlannedAction = {
  id: string;
  tenant_id: string;
  lead_id: string;
  workflow_id: string;
  action_type: string;
  config: Record<string, unknown> | null;
  scheduled_for: string;
  status: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type AIAgent = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  type: "QUALIFY" | "REMINDER" | "CLOSER" | "SUPPORT";
  status: "ACTIVE" | "PAUSED";
  flow_config: {
    nodes: unknown[];
    edges: unknown[];
    automation_rules?: Record<string, unknown>;
    crm_config?: Record<string, unknown>;
  } | null;
  automation_rules?: Record<string, unknown>;
  crm_config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

export type AIAgentVariant = {
  id: string;
  agent_id: string;
  version_label: string;
  prompt_text: string;
  model_provider?: "OPENAI" | "ANTHROPIC" | "GEMINI";
  model_name?: string;
  api_key?: string;
  knowledge_base_id?: string | null;
  is_active: boolean;
  is_variant_b: boolean;
  weight: number;
  metrics: Record<string, unknown> | null;
  dynamic_variables?: Record<string, string> | string[]; // Support for both KV and keys list
  tracked_variables?: string[]; // Keys to extract autonomously
  automation_rules?: Record<string, unknown>;
  crm_config?: Record<string, unknown>;
  knowledge_base_ids?: string[];
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

export type WebWidget = {
  id: string;
  tenant_id: string;
  name: string;
  agent_id: string | null;
  welcome_message: string | null;
  required_variables: string[];
  bubble_color: string | null;
  bubble_icon: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
  // Sprint 0 1-27: hardening — allowed_domains vacío = legacy ALLOW; poblado = enforce.
  allowed_domains: string[];
  rate_limit_per_minute: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

export type FeatureFlag = {
  id: string;
  tenant_id?: string | null;
  flag_key: string;
  is_enabled: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  [key: string]: any;
};

export type KnowledgeItem = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  file_key: string;
  file_url: string | null;
  content_hash: string | null;
  created_at: string;
  [key: string]: any;
};

export type Advisor = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  specialties?: string[];
  handled_lead_types?: string[];
  created_at: string;
  [key: string]: any;
};

export type Appointment = {
  id: string;
  tenant_id: string;
  advisor_id: string | null;
  lead_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  agent_used: string | null;
  ab_variant: string | null;
  reminder_sent_at?: string | null;
  reminder_scheduled_at?: string | null;
  watchdog_processed: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  lead?: Lead;
  [key: string]: any;
};

export type KnowledgeEmbedding = {
  id: string;
  tenant_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
  [key: string]: any;
};

// ─── RETELL TYPES ─────────────────────────────────────────────────────────────

export type RetellTool = {
  type: string;
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  url?: string; // for webhooks
  [key: string]: any;
};

export type RetellEdge = {
  destination_state_name: string;
  description: string;
  conditions?: unknown[];
  [key: string]: any;
};

export type RetellState = {
  name: string;
  state_prompt: string;
  edges?: RetellEdge[];
  tools?: RetellTool[];
  [key: string]: any;
};

export type RetellLLMConfig = {
  model: string;
  general_prompt: string;
  states?: RetellState[];
  tools?: RetellTool[];
  begin_message?: string;
  [key: string]: any;
};

export type VoiceAgent = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "PAUSED";
  provider: "RETELL" | "ULTRAVOX" | "INTERNAL";
  provider_agent_id: string | null;
  voice_id: string | null;
  from_number: string | null;
  retell_llm_id: string | null;
  prompt_text_retell: string | null;
  retell_llm_config: RetellLLMConfig | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

export type VoiceAgentVariant = {
  id: string;
  agent_id: string;
  version_label: string;
  prompt_text: string;
  is_active: boolean;
  is_variant_b: boolean;
  weight: number;
  metrics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

// ─── CLIENT CONFIG (v2.0) ────────────────────────────────────────────────────────

export type ClientConfig = {
  id: string;
  tenant_id: string;
  routing_rules: {
    allowed_campaigns: string[];
    allowed_origins: string[];
    drop_invalid_leads: boolean;
    contact_sequence: ("whatsapp" | "call")[];
  };
  rescue_config: {
    enabled: boolean;
    wait_minutes: number;
    template_id: string;
  };
  timezone_config: {
    default_timezone: string;
    compliance_start: string; // e.g., "09:00"
    compliance_end: string; // e.g., "21:00"
  };
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

// ─── COMBINED / VIEW TYPES ────────────────────────────────────────────────────

/**
 * Una fila del Historial = UN LEAD con toda su actividad consolidada.
 */
export type HistorialRow = {
  // ── Identidad del lead ──
  id: string; // lead.id (clave única, sin duplicados)
  nombre?: string | null;
  apellido?: string | null;
  telefono?: string | null;
  email?: string | null;
  pais?: string | null;
  tipo_lead?: string | null; // string libre: "nuevo", "ilocalizable", "localizable", ...
  origen?: string | null;
  campana?: string | null;
  fecha_ingreso_crm?: string | null;

  // ── Resumen de la ÚLTIMA llamada (o la más relevante) ──
  estado_llamada?: string | null;
  razon_termino?: string | null;
  fecha_inicio?: string | null; // fecha de la última llamada
  duracion_segundos?: number | null;
  url_grabacion?: string | null;
  resumen?: string | null;
  tipo_agente?: string | null;

  // ── Cualificación (la más reciente) ──
  cualificacion?: string | null;
  motivo_anulacion?: string | null;
  anios_experiencia?: number | null;
  nivel_estudios?: string | null;

  // ── Agendamiento confirmado (el más próximo) ──
  fecha_agendada_cliente?: string | null;
  confirmado?: boolean | null;

  // ── Related Module Data (New) ──
  programa_nombre?: string | null;
  intentos_count: number;
  whatsapp_status?: string | null;
  opt_in_whatsapp?: boolean | null;
  notificaciones_status?: string | null;

  // v2.0 Memory Fields
  current_stage?: string | null;
  metadata?: Record<string, unknown> | null;

  // ── Computed ──
  tiempo_respuesta_minutos?: number | null; // primera llamada - fecha_ingreso_crm
  fecha_primer_contacto?: string | null; // MIN(llamada, whatsapp)

  // ── Historial completo de llamadas/reintentos de este lead ──
  llamadas: LlamadaResumen[]; // todas las llamadas, orden desc
  total_llamadas: number; // = llamadas.length

  // ── Dynamic / Extra Fields ──
  [key: string]: any;
};

/** Supabase database shape (for createClient generic) */
export type Database = any;
