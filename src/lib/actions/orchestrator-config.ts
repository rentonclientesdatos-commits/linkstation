"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────

export interface OrchestratorSequenceStep {
  step: number;
  action: "call" | "whatsapp" | "ai_agent" | "wait" | "zoho" | "crm" | "retry_sequence";
  agents?: string[]; // Array de agent IDs para A/B
  template?: string; // WhatsApp template name
  delay_hours: number; // Horas de espera antes de este paso
  variableMappings?: Record<string, string>; // Mapeo de variables {{1}} -> lead.field

  // NEW: Retry Sequence Configuration
  channels?: ("call" | "whatsapp")[];
  max_attempts?: number;
  retry_delay_hours?: number;
  final_status?: string; // e.g., "ilocalizable"
}

export interface OrchestratorTimezoneRules {
  start: string; // "09:00"
  end: string; // "20:00"
  working_days: number[]; // [1,2,3,4,5] = Lun-Vie
  phone_prefix_map: Record<string, string>; // "+34" → "Europe/Madrid"
  country?: string; // "España", "México", etc.
}

export interface OrchestratorABConfig {
  enabled: boolean;
  split: number; // 0.0 – 1.0, default 0.5
}

export interface OrchestratorRetellConfig {
  api_key: string;
  from_number: string;
}

export interface OrchestratorEscalationConfig {
  notify_crm: boolean;
  notify_human_whatsapp: string | null; // Teléfono del humano para recibir alertas
  trigger_max_attempts: number; // Intentos fallidos de la IA antes de derivar
  handoff_on_qualified_not_booked: boolean; // Derivar si está cualificado pero no agendó
}

export interface OrchestratorSchedulingConfig {
  reminder_hours: number;
  reminder_template: string;
  slot_pacing_minutes: number;
  messages_per_slot: number;
}

export interface OrchestratorEntryFilters {
  enabled: boolean;
  allowed_campaigns?: string[];
  allowed_origins?: string[];
  allowed_countries?: string[];
}

export interface TenantOrchestratorConfig {
  timezone_rules: OrchestratorTimezoneRules;
  sequence: OrchestratorSequenceStep[];
  ab_testing: OrchestratorABConfig;
  retell: OrchestratorRetellConfig;
  escalation: OrchestratorEscalationConfig;
  scheduling: OrchestratorSchedulingConfig;
  entry_filters: OrchestratorEntryFilters;
  advisors?: string[]; // IDs de los asesores para Round Robin
  flow_graph?: { nodes: unknown[]; edges: unknown[] };
  company_name?: string;
}

const DEFAULT_CONFIG: TenantOrchestratorConfig = {
  timezone_rules: {
    start: "09:00",
    end: "20:00",
    working_days: [1, 2, 3, 4, 5],
    country: "España",
    phone_prefix_map: {
      "+34": "Europe/Madrid",
      "+56": "America/Santiago",
      "+52": "America/Mexico_City",
      "+57": "America/Bogota",
      "+51": "America/Lima",
      "+54": "America/Argentina/Buenos_Aires",
      "+598": "America/Montevideo",
    },
  },
  sequence: [
    { step: 1, action: "call", agents: [], delay_hours: 0 },
    { step: 2, action: "whatsapp", template: "", delay_hours: 0 },
    { step: 3, action: "call", agents: [], delay_hours: 27 },
  ],
  ab_testing: {
    enabled: false,
    split: 0.5,
  },
  retell: {
    api_key: "",
    from_number: "",
  },
  escalation: {
    notify_crm: true,
    notify_human_whatsapp: "",
    trigger_max_attempts: 3,
    handoff_on_qualified_not_booked: true,
  },
  scheduling: {
    reminder_hours: 24,
    reminder_template: "appointment_reminder_es",
    slot_pacing_minutes: 30,
    messages_per_slot: 5,
  },
  entry_filters: {
    enabled: false,
    allowed_campaigns: [],
    allowed_origins: [],
    allowed_countries: [],
  },
  advisors: [],
  flow_graph: { nodes: [], edges: [] },
  company_name: "LinkStation",
};

// ─── Server Actions ───────────────────────────────────────────────

interface DBConfigResponse {
  config: TenantOrchestratorConfig;
  flow_graph: { nodes: unknown[]; edges: unknown[] };
}

/**
 * Fetches the orchestrator config for the active tenant.
 */
export async function getOrchestratorConfig(): Promise<{
  success: boolean;
  data?: TenantOrchestratorConfig;
  error?: string;
}> {
  try {
    const tenantId = await getActiveTenantId();
    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    const supabase = await getAdminSupabaseClient();
     
    const { data, error } = await supabase
      .from("tenant_orchestrator_config")
      .select("config, flow_graph")
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) {
      return { success: true, data: DEFAULT_CONFIG };
    }

    const dbData = data as unknown as DBConfigResponse;
    const merged = deepMerge(DEFAULT_CONFIG, dbData.config);
    merged.flow_graph = dbData.flow_graph || DEFAULT_CONFIG.flow_graph;
    return { success: true, data: merged };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg };
  }
}

/**
 * Saves the orchestrator config for the active tenant (upsert).
 *
 * NEW-01 (Sprint 1 Bloque 2.9) — fix bug crítico Renzo V1:
 *   Antes solo persistía `flow_graph`; el objeto `config` (sequence, timezone_rules,
 *   ab_testing, retell, escalation, scheduling, entry_filters, advisors, company_name)
 *   se descartaba silenciosamente. Esto provocaba que toda configuración hecha por
 *   el usuario en los nodos del orquestador se perdiera al guardar — la UI mostraba
 *   los datos pero la BD nunca los registraba.
 *
 *   Fix: persistir AMBAS columnas (`config` JSONB + `flow_graph` JSONB) en el mismo
 *   upsert, merging con el config existente para que llamadas parciales (solo
 *   `flow_graph` o solo un sub-campo del config) no borren el resto.
 */
export async function saveOrchestratorConfig(
  config: Partial<TenantOrchestratorConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getActiveTenantId();
    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    // Cargar config existente para hacer merge parcial — evita que un save con
    // solo `flow_graph` borre el resto del config (y viceversa).
    const current = await getOrchestratorConfigForTenant(tenantId);

    // Separar flow_graph (columna física propia) del resto del config (columna JSONB).
    const { flow_graph: incomingFlowGraph, ...incomingConfig } = config;
    const mergedConfig = deepMerge(current, incomingConfig as Partial<TenantOrchestratorConfig>);
    // No queremos persistir flow_graph dentro de `config` JSONB (vive en columna propia).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (mergedConfig as any).flow_graph;

    const flowGraph = incomingFlowGraph ?? current.flow_graph ?? { nodes: [], edges: [] };

    const supabase = await getAdminSupabaseClient();
    console.log(
      `[SAVE_FLOW] Saving for tenant ${tenantId}. Graph nodes: ${flowGraph.nodes?.length || 0}. ` +
        `Config keys: ${Object.keys(mergedConfig).join(",")}`
    );

     
    const { error } = await supabase.from("tenant_orchestrator_config").upsert(
      {
        tenant_id: tenantId,
        config: mergedConfig,
        flow_graph: flowGraph,
      },
      {
        onConflict: "tenant_id",
      }
    );

    if (error) {
      console.error("[SAVE_FLOW] Upsert Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[SAVE_FLOW] Critical Catch:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server-side use for orchestrator execution engine.
 */
export async function getOrchestratorConfigForTenant(
  tenantId: string
): Promise<TenantOrchestratorConfig> {
  try {
    const supabase = await getAdminSupabaseClient();
     
    const { data } = await supabase
      .from("tenant_orchestrator_config")
      .select("config")
      .eq("tenant_id", tenantId)
      .single();

    if (!data) return DEFAULT_CONFIG;
    const dbData = data as unknown as { config: TenantOrchestratorConfig };
    return deepMerge(DEFAULT_CONFIG, dbData.config);
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ─── Utility ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key in override) {
    const val = override[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = deepMerge(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        base[key] as Record<string, any>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        val as Record<string, any>
      ) as T[typeof key];
    } else if (val !== undefined) {
      result[key] = val as T[typeof key];
    }
  }
  return result;
}
