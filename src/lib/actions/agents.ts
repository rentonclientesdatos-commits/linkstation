"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/actions/session";
import type { AIAgent, AIAgentVariant } from "@/types/database";
import { ModelNameSchema } from "@/lib/schemas/ai-agents";

/**
 * Helper to resolve tenantId from parameter, cookie, or session.
 */
async function resolveTenantId(explicitTenantId?: string): Promise<string | null> {
  if (explicitTenantId && explicitTenantId.trim() !== "") return explicitTenantId;
  const fromCookie = await getActiveTenantId();
  if (fromCookie) return fromCookie;
  try {
    const session = await getSessionContext();
    if (session?.tenantId) return session.tenantId;
  } catch (sessionErr) {
    console.warn("[resolveTenantId] Could not retrieve session tenantId:", sessionErr);
  }
  return null;
}

/**
 * Fetches all AI Agents for the active tenant.
 */
export async function getAIAgents(tenantIdParam?: string) {
  try {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await resolveTenantId(tenantIdParam);

    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    const { data, error } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: JSON.parse(JSON.stringify(data || [])) as AIAgent[] };
  } catch (err) {
    console.error("[getAIAgents] Error:", err);
    return { success: false, error: (err as Error).message || "Error al obtener los agentes" };
  }
}

/**
 * Fetches all variants for a specific agent.
 * Note: Variants are linked via agent_id; RLS should handle tenant isolation.
 */
export async function getAgentVariants(agentId: string) {
  try {
    const supabase = await getAdminSupabaseClient();
    const { data, error } = await supabase
      .from("ai_agent_variants")
      .select("*")
      .eq("agent_id", agentId)
      .order("version_label", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: JSON.parse(JSON.stringify(data || [])) as AIAgentVariant[] };
  } catch (err) {
    console.error("[getAgentVariants] Error:", err);
    return { success: false, error: (err as Error).message || "Error al obtener las variantes" };
  }
}

/**
 * Saves a new or existing agent.
 * Ensures the mandatory tenant_id is injected for proper data isolation.
 */
export async function saveAIAgent(agent: Partial<AIAgent> & { tenant_id?: string }) {
  try {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await resolveTenantId(agent.tenant_id);

    if (!tenantId)
      return {
        success: false,
        error: "No hay una sesión de cliente activa. Selecciona un cliente primero.",
      };

    let createdAgent: AIAgent | null = null;

    if (agent.id) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (agent.name !== undefined) updateData.name = agent.name;
      if (agent.description !== undefined) updateData.description = agent.description;
      if (agent.status !== undefined) updateData.status = agent.status;
      if (agent.type !== undefined) updateData.type = agent.type;
      if (agent.flow_config !== undefined) updateData.flow_config = agent.flow_config;
      if (agent.automation_rules !== undefined)
        updateData.automation_rules = agent.automation_rules;
      if (agent.crm_config !== undefined) updateData.crm_config = agent.crm_config;

      const { data, error } = await supabase
        .from("ai_agents")
        .update(updateData)
        .eq("id", agent.id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) {
        console.error("[saveAIAgent] Supabase update error:", error);
        return { success: false, error: error.message };
      }
      createdAgent = data as unknown as AIAgent;
    } else {
      const insertData = {
        name: agent.name || "Nuevo Maestro",
        description: agent.description || "",
        status: agent.status || "ACTIVE",
        type: agent.type || "QUALIFY",
        tenant_id: tenantId,
      };

      const { data, error } = await supabase
        .from("ai_agents")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("[saveAIAgent] Supabase insert error:", error);
        return { success: false, error: error.message };
      }
      createdAgent = data as unknown as AIAgent;

      // If this is a newly created agent, create its initial default variant A
      if (createdAgent?.id) {
        try {
          const defaultVariant = {
            agent_id: createdAgent.id,
            tenant_id: tenantId,
            is_variant_b: false,
            is_active: true,
            version_label: "v1.0",
            weight: 0.5,
            metrics: {},
            prompt_text: `Eres un asistente virtual de IA diseñado para interactuar con clientes de forma profesional, responder preguntas y cualificar oportunidades. Cuando el usuario te haga una pregunta, responde de manera amable, precisa y profesional.`,
            model_provider: "OPENAI",
            model_name: "gpt-4o",
            knowledge_base_ids: [],
            dynamic_variables: {},
            tracked_variables: [],
            crm_config: {},
            automation_rules: {
              contact_policy: "auto",
              working_hours: { start: "09:00", end: "21:00", days: [1, 2, 3, 4, 5] },
              retry_delay: 15,
              max_retries: 3,
              scheduling_config: { enabled: false, duration: 30, buffer: 15 },
            },
          };
          const { error: variantInsertErr } = await supabase
            .from("ai_agent_variants")
            .insert([defaultVariant]);
          if (variantInsertErr) {
            console.warn("[saveAIAgent] Default variant insert error:", variantInsertErr.message);
          }
        } catch (variantErr) {
          console.warn("[saveAIAgent] Could not create default variant:", variantErr);
          // Non-blocking: agent is created, variant is optional at creation time
        }
      }
    }

    return { success: true, data: JSON.parse(JSON.stringify(createdAgent)) };
  } catch (err) {
    console.error("[saveAIAgent] Unexpected error:", err);
    return {
      success: false,
      error: (err as Error).message || "Error inesperado al guardar el agente",
    };
  }
}

/**
 * Saves a prompt variant.
 */
export async function saveAgentVariant(variant: Partial<AIAgentVariant> & { tenant_id?: string }) {
  try {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await resolveTenantId(variant.tenant_id);

    // 2-35: validar model_name contra whitelist en el boundary (Server Action).
    if (variant.model_name !== undefined && variant.model_name !== null) {
      const parsed = ModelNameSchema.safeParse(variant.model_name);
      if (!parsed.success) {
        return {
          success: false,
          error: `Modelo inválido "${variant.model_name}". Modelos permitidos: ${ModelNameSchema.options.join(", ")}`,
        };
      }
    }

    // Clean up variant data to remove metadata fields that shouldn't be upserted
    // but keep fields like api_key, knowledge_base_id and model info
    const {
      id: _id,
      created_at: _created_at,
      updated_at: _updated_at,
      metrics: _metrics,
      ...cleanVariant
    } = variant;
    void _id;
    void _created_at;
    void _updated_at;
    void _metrics;

    // Ensure tenant_id is always present
    const payload = {
      ...cleanVariant,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    // We explicitly include the ID if it exists, otherwise use onConflict
    const dataToUpsert = variant.id
      ? { id: variant.id, ...(payload as Partial<AIAgentVariant>) }
      : (payload as Partial<AIAgentVariant>);

    const { data, error } = await supabase
      .from("ai_agent_variants")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(dataToUpsert as any, {
        onConflict: "agent_id,is_variant_b",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[ACTIONS] Error saving agent variant:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data: JSON.parse(JSON.stringify(data)) as AIAgentVariant };
  } catch (err) {
    console.error("[saveAgentVariant] Unexpected error:", err);
    return { success: false, error: (err as Error).message || "Error al guardar la variante" };
  }
}

/**
 * Deletes an AI agent.
 */
export async function deleteAIAgent(agentId: string, tenantIdParam?: string) {
  try {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await resolveTenantId(tenantIdParam);

    if (!tenantId) return { success: false, error: "No hay una sesión de cliente activa." };

    const { error } = await supabase
      .from("ai_agents")
      .delete()
      .eq("id", agentId)
      .eq("tenant_id", tenantId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error("[deleteAIAgent] Error:", err);
    return { success: false, error: (err as Error).message || "Error al eliminar el agente" };
  }
}

/**
 * Fetches all advisors for the active tenant.
 */
export async function getAdvisors(tenantIdParam?: string) {
  try {
    const supabase = await getAdminSupabaseClient();
    const tenantId = await resolveTenantId(tenantIdParam);

    if (!tenantId) return { success: false, error: "No hay un cliente seleccionado." };

    const { data, error } = await supabase
      .from("advisors")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    console.error("[getAdvisors] Error:", err);
    return { success: false, error: (err as Error).message || "Error al obtener asesores" };
  }
}
