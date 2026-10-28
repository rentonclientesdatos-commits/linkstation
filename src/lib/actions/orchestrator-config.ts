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
export async function getOrchestratorConfig(targetTenantId?: string): Promise<{
  success: boolean;
  data?: TenantOrchestratorConfig;
  error?: string;
}> {
  try {
    const tenantId = targetTenantId || (await getActiveTenantId());
    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    const supabase = await getAdminSupabaseClient();
     
    // 1. Check central tenants.config first (always exists and persists)
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    const tenantConfig = (tenantData?.config as Record<string, unknown>) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let baseOrch = (tenantConfig.orchestrator as any) || {};

    // 2. Also check tenant_orchestrator_config table if available
    try {
      const { data, error } = await supabase
        .from("tenant_orchestrator_config")
        .select("config, flow_graph")
        .eq("tenant_id", tenantId)
        .single();

      if (!error && data) {
        const dbData = data as unknown as DBConfigResponse;
        baseOrch = deepMerge(baseOrch, dbData.config || {});
        if (dbData.flow_graph) {
          baseOrch.flow_graph = dbData.flow_graph;
        }
      }
    } catch {
      // Table might not exist in schema, fallback to tenants.config
    }

    const merged = deepMerge(DEFAULT_CONFIG, baseOrch);

    // Priority chain for country: orchestrator config > working_hours backup > DEFAULT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workingHours = (tenantConfig.working_hours as any) || {};
    // Always apply working_hours as authoritative if orchestrator doesn't have it explicitly saved
    if (workingHours.country && merged.timezone_rules.country === DEFAULT_CONFIG.timezone_rules.country && !baseOrch.timezone_rules?.country) {
      merged.timezone_rules.country = workingHours.country;
    }
    // Also apply if explicitly in working_hours as the canonical saved value
    if (workingHours.country && baseOrch.timezone_rules?.country === undefined) {
      merged.timezone_rules.country = workingHours.country;
    }
    if (workingHours.start && !baseOrch.timezone_rules?.start) merged.timezone_rules.start = workingHours.start;
    if (workingHours.end && !baseOrch.timezone_rules?.end) merged.timezone_rules.end = workingHours.end;
    if (workingHours.days && !baseOrch.timezone_rules?.working_days?.length) merged.timezone_rules.working_days = workingHours.days;

    return { success: true, data: merged };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg };
  }
}

/**
 * Saves the orchestrator config for the active tenant (upsert).
 * Saves to tenants.config and tenant_orchestrator_config for full persistence.
 */
export async function saveOrchestratorConfig(
  config: Partial<TenantOrchestratorConfig>,
  targetTenantId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = targetTenantId || (await getActiveTenantId());
    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    const supabase = await getAdminSupabaseClient();

    // 1. Cargar config existente del tenant para merge seguro
    const current = await getOrchestratorConfigForTenant(tenantId);
    const { flow_graph: incomingFlowGraph, ...incomingConfig } = config;
    const mergedConfig = deepMerge(current, incomingConfig as Partial<TenantOrchestratorConfig>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (mergedConfig as any).flow_graph;

    const country = config.timezone_rules?.country || mergedConfig.timezone_rules?.country || "España";

    // 2. Persistir siempre en tenants.config (garantiza que nunca se pierda el país ni los horarios)
    const { data: tenantRecord } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    const currentTenantConfig = (tenantRecord?.config as Record<string, unknown>) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentWorkingHours = (currentTenantConfig.working_hours as any) || {};

    const updatedTenantConfig = {
      ...currentTenantConfig,
      orchestrator: mergedConfig,
      working_hours: {
        ...currentWorkingHours,
        country: country,
        start: config.timezone_rules?.start || currentWorkingHours.start || "09:00",
        end: config.timezone_rules?.end || currentWorkingHours.end || "20:00",
        days: config.timezone_rules?.working_days || currentWorkingHours.days || [1, 2, 3, 4, 5],
      },
    };

    const { error: tenantUpdateError } = await supabase
      .from("tenants")
      .update({ config: updatedTenantConfig })
      .eq("id", tenantId);

    if (tenantUpdateError) {
      console.error("[SAVE_CONFIG] tenants.config update error:", tenantUpdateError);
    }

    // 3. Persistir en tenant_orchestrator_config si la tabla existe
    try {
      const flowGraph = incomingFlowGraph ?? current.flow_graph ?? { nodes: [], edges: [] };
      await supabase.from("tenant_orchestrator_config").upsert(
        {
          tenant_id: tenantId,
          config: mergedConfig,
          flow_graph: flowGraph,
        },
        {
          onConflict: "tenant_id",
        }
      );
    } catch (err) {
      console.warn("[SAVE_CONFIG] tenant_orchestrator_config upsert skipped:", err);
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[SAVE_CONFIG] Critical Catch:", msg);
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
     
    // Leer primero de tenants.config
    const { data: tenantRecord } = await supabase
      .from("tenants")
      .select("config")
      .eq("id", tenantId)
      .single();

    const tenantConfig = (tenantRecord?.config as Record<string, unknown>) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orchConfig = (tenantConfig.orchestrator as any) || {};

    try {
      const { data } = await supabase
        .from("tenant_orchestrator_config")
        .select("config")
        .eq("tenant_id", tenantId)
        .single();

      if (data) {
        const dbData = data as unknown as { config: TenantOrchestratorConfig };
        orchConfig = deepMerge(orchConfig, dbData.config || {});
      }
    } catch {
      // Ignorar si la tabla no existe
    }

    const merged = deepMerge(DEFAULT_CONFIG, orchConfig);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workingHours = (tenantConfig.working_hours as any) || {};
    // Apply working_hours.country if orchestrator doesn't have it explicitly
    if (workingHours.country && orchConfig.timezone_rules?.country === undefined) {
      merged.timezone_rules.country = workingHours.country;
    }

    return merged;
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
