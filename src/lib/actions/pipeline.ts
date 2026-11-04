"use server";

import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { getActiveTenantConfig } from "./tenant";
import { createLogger } from "@/lib/utils/logger";
import {
  DEFAULT_PIPELINE_STAGES,
  type PipelineStage,
  type PipelineLead,
} from "./pipeline.types";

// Re-export types so existing imports keep working
export type { PipelineStage, PipelineLead } from "./pipeline.types";

const log = createLogger("pipeline.action");

/**
 * Resolves stages from tenant configuration, building from custom segmentations or defaults.
 */
export async function getPipelineStages(
  tenantConfig?: Record<string, unknown>
): Promise<PipelineStage[]> {
  const config = tenantConfig || {};
  const savedStages = config.pipeline_stages as PipelineStage[] | undefined;

  if (Array.isArray(savedStages) && savedStages.length > 0) {
    return savedStages.sort((a, b) => a.order - b.order);
  }

  // Check if tenant has custom segmentations array
  const customSegmentations = config.segmentations as string[] | undefined;
  if (Array.isArray(customSegmentations) && customSegmentations.length > 0) {
    const palette: PipelineStage["color"][] = [
      "blue",
      "indigo",
      "amber",
      "emerald",
      "purple",
      "teal",
      "rose",
    ];
    return customSegmentations.map((seg, idx) => ({
      id: `stage-${idx}-${seg.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      name: seg,
      segmentKey: seg,
      color: palette[idx % palette.length],
      order: idx,
    }));
  }

  return DEFAULT_PIPELINE_STAGES;
}

/**
 * Fetches pipeline stages and all active leads for the current tenant.
 */
export async function getPipelineData(options?: {
  from?: string;
  to?: string;
  campaign?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  tenantId?: string;
  stages: PipelineStage[];
  leads: PipelineLead[];
  error?: string;
}> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant?.id) {
      return {
        success: false,
        stages: DEFAULT_PIPELINE_STAGES,
        leads: [],
        error: "No hay tenant activo",
      };
    }

    const tenantConfig = (tenant.config as Record<string, unknown>) || {};
    const stages = await getPipelineStages(tenantConfig);

    const supabase = await getAdminSupabaseClient();
    let query = supabase
      .from("lead")
      .select(
        "id, nombre, apellido, telefono, email, segmentacion, tipo_lead, origen, campana, fecha_creacion, fecha_actualizacion, last_interaction_at, is_ai_enabled, is_ai_paused, metadata"
      )
      .eq("tenant_id", tenant.id)
      .order("fecha_actualizacion", { ascending: false })
      .limit(options?.limit || 200);

    if (options?.campaign && options.campaign !== "all") {
      query = query.eq("campana", options.campaign);
    }
    if (options?.from) {
      query = query.gte("fecha_ingreso_crm", options.from);
    }
    if (options?.to) {
      query = query.lte("fecha_ingreso_crm", options.to);
    }

    const { data: leads, error } = await query;
    if (error) {
      log.error("Error fetching pipeline leads", { error });
      return {
        success: false,
        tenantId: tenant.id,
        stages,
        leads: [],
        error: error.message,
      };
    }

    return {
      success: true,
      tenantId: tenant.id,
      stages,
      leads: (leads || []) as PipelineLead[],
    };
  } catch (err) {
    log.error("Exception in getPipelineData", { err });
    return {
      success: false,
      stages: DEFAULT_PIPELINE_STAGES,
      leads: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Updates a lead's stage/segmentation.
 */
export async function updateLeadStage(
  leadId: string,
  newSegmentKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant?.id) {
      return { success: false, error: "No hay cliente activo seleccionado" };
    }

    const supabase = await getAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    const { error } = await (supabase.from("lead" as any) as any)
      .update({
        segmentacion: newSegmentKey,
        fecha_actualizacion: nowIso,
      })
      .eq("id", leadId)
      .eq("tenant_id", tenant.id);

    if (error) {
      log.error("Failed to update lead stage", { error, leadId, newSegmentKey });
      return { success: false, error: error.message };
    }

    log.info(`[PIPELINE] Lead ${leadId} moved to stage '${newSegmentKey}'`);
    return { success: true };
  } catch (err) {
    log.error("Exception in updateLeadStage", { err });
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Saves custom pipeline stages and synchronizes tenant.config.segmentations.
 */
export async function savePipelineStages(
  stages: PipelineStage[]
): Promise<{ success: boolean; stages?: PipelineStage[]; error?: string }> {
  try {
    const tenant = await getActiveTenantConfig();
    if (!tenant?.id) {
      return { success: false, error: "No hay cliente activo seleccionado" };
    }

    const supabase = await getAdminSupabaseClient();

    // Fetch current tenant config to preserve other keys
    const { data: currentTenant, error: fetchErr } = await (
      supabase.from("tenants" as any) as any
    )
      .select("config")
      .eq("id", tenant.id)
      .single();

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    const currentConfig =
      (currentTenant?.config as Record<string, unknown>) || {};

    // Sort stages by order
    const sortedStages = [...stages].map((s, idx) => ({
      ...s,
      order: idx,
      segmentKey: s.segmentKey.trim().toUpperCase(),
    }));

    // Synchronize segmentations array for FactExtractionService / AI models
    const updatedSegmentations = sortedStages.map((s) => s.segmentKey);

    const updatedConfig = {
      ...currentConfig,
      pipeline_stages: sortedStages,
      segmentations: updatedSegmentations,
    };

    const { error: updateErr } = await (supabase.from("tenants" as any) as any)
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenant.id);

    if (updateErr) {
      log.error("Failed to update pipeline stages config", { updateErr });
      return { success: false, error: updateErr.message };
    }

    log.info(
      `[PIPELINE] Saved ${sortedStages.length} stages for tenant ${tenant.id}`
    );
    return { success: true, stages: sortedStages };
  } catch (err) {
    log.error("Exception in savePipelineStages", { err });
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
