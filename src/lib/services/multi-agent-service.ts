import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { getLLMClient } from "@/lib/llm/llm-client";
import { KnowledgeBaseService } from "@/lib/services/knowledge-base";
import { createLogger } from "@/lib/utils/logger";
import OpenAI from "openai";

const log = createLogger("multi-agent.service");

export interface AvailableAgentInfo {
  id: string;
  name: string;
  description: string;
  specialization: string;
  modelName: string;
}

export interface AgentTransferParams {
  tenantId: string;
  leadId: string;
  currentAgentId?: string;
  targetAgentId: string;
  reason: string;
  handoffMessage?: string;
}

export interface AgentTransferResult {
  success: boolean;
  targetAgentId: string;
  targetAgentName: string;
  handoffMessage?: string;
  error?: string;
}

export interface SpecialistConsultationParams {
  tenantId: string;
  leadId: string;
  currentAgentId?: string;
  targetAgentId: string;
  query: string;
  userContext?: string;
}

export interface SpecialistConsultationResult {
  success: boolean;
  specialistName: string;
  response: string;
  error?: string;
}

/**
 * Service for autonomous multi-agent coordination, handoffs, and inter-agent consultations.
 */
export class MultiAgentService {
  /**
   * Fetches all other available AI agents for the tenant with their specializations.
   */
  public static async getAvailableAgents(
    tenantId: string,
    excludeAgentId?: string
  ): Promise<AvailableAgentInfo[]> {
    try {
      const supabase = await getAdminSupabaseClient();

      let query = supabase
        .from("ai_agents")
        .select("id, name, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (excludeAgentId) {
        query = query.neq("id", excludeAgentId);
      }

      const { data: agents, error } = await query;
      if (error || !agents) {
        log.warn("Error fetching tenant agents for multi-agent network", { error });
        return [];
      }

      const agentIds = agents.map((a: { id: string }) => a.id);
      if (agentIds.length === 0) return [];

      // Fetch active variants to extract prompt/specialization snippets
      const { data: variants } = await supabase
        .from("ai_agent_variants")
        .select("agent_id, prompt_text, model_name, is_active")
        .in("agent_id", agentIds)
        .eq("is_active", true);

      const variantMap = new Map<string, { prompt_text?: string; model_name?: string }>();
      (variants || []).forEach((v: { agent_id: string; prompt_text?: string; model_name?: string }) => {
        if (!variantMap.has(v.agent_id)) {
          variantMap.set(v.agent_id, v);
        }
      });

      return agents.map((a: { id: string; name: string }) => {
        const v = variantMap.get(a.id);
        const promptSnippet = (v?.prompt_text || "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("#"))
          .slice(0, 3)
          .join(" ")
          .substring(0, 180);

        return {
          id: a.id,
          name: a.name || "Agente Especialista",
          description: promptSnippet || `Especialista en ${a.name}`,
          specialization: promptSnippet || a.name,
          modelName: v?.model_name || "gpt-4o",
        };
      });
    } catch (err) {
      log.error("Failed to get available agents", { err });
      return [];
    }
  }

  /**
   * Transfers the active lead from current agent to target agent.
   * Updates lead.ai_agent_id and records handoff metadata and activity history.
   */
  public static async transferLeadToAgent(
    params: AgentTransferParams
  ): Promise<AgentTransferResult> {
    const { tenantId, leadId, currentAgentId, targetAgentId, reason, handoffMessage } = params;

    try {
      const supabase = await getAdminSupabaseClient();

      // 1. Verify target agent belongs to same tenant
      const { data: targetAgent, error: targetError } = await supabase
        .from("ai_agents")
        .select("id, name")
        .eq("id", targetAgentId)
        .eq("tenant_id", tenantId)
        .single();

      if (targetError || !targetAgent) {
        return {
          success: false,
          targetAgentId,
          targetAgentName: "",
          error: `Target agent ${targetAgentId} not found or does not belong to tenant ${tenantId}`,
        };
      }

      // 2. Fetch current lead metadata
      const { data: leadData } = await supabase
        .from("lead")
        .select("metadata")
        .eq("id", leadId)
        .single();

      const existingMetadata = ((leadData as { metadata?: Record<string, unknown> } | null)?.metadata ||
        {}) as Record<string, unknown>;

      const handoffHistory = Array.isArray(existingMetadata.agent_handoffs)
        ? [...(existingMetadata.agent_handoffs as Record<string, unknown>[])]
        : [];

      const handoffRecord = {
        from_agent_id: currentAgentId || null,
        to_agent_id: targetAgentId,
        to_agent_name: targetAgent.name,
        reason,
        handoff_message: handoffMessage || null,
        timestamp: new Date().toISOString(),
      };

      handoffHistory.push(handoffRecord);

      // 3. Update lead with new agent and reset inactivity counters
      const updatedMetadata = {
        ...existingMetadata,
        last_agent_handoff: handoffRecord,
        agent_handoffs: handoffHistory,
        transferred_at: new Date().toISOString(),
      };

      const { error: updateError } = await (supabase.from("lead" as any) as any)
        .update({
          ai_agent_id: targetAgentId,
          inactivity_sent_count: 0,
          metadata: updatedMetadata,
        })
        .eq("id", leadId);

      if (updateError) {
        return {
          success: false,
          targetAgentId,
          targetAgentName: targetAgent.name,
          error: updateError.message,
        };
      }

      log.info(`[MULTI-AGENT] Successfully transferred lead ${leadId} to agent ${targetAgent.name} (${targetAgentId})`, {
        reason,
      });

      return {
        success: true,
        targetAgentId,
        targetAgentName: targetAgent.name,
        handoffMessage,
      };
    } catch (err) {
      log.error("Exception during agent transfer", { err });
      return {
        success: false,
        targetAgentId,
        targetAgentName: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Consults a specialist agent internally without transferring the lead.
   * Runs a focused sub-turn using the target agent's persona, system prompt, and RAG knowledge base.
   */
  public static async consultSpecialistAgent(
    params: SpecialistConsultationParams
  ): Promise<SpecialistConsultationResult> {
    const { tenantId, leadId, targetAgentId, query, userContext } = params;

    try {
      const supabase = await getAdminSupabaseClient();

      // 1. Fetch target agent and its active variant
      const { data: agent, error: agentErr } = await supabase
        .from("ai_agents")
        .select("id, name")
        .eq("id", targetAgentId)
        .eq("tenant_id", tenantId)
        .single();

      if (agentErr || !agent) {
        return {
          success: false,
          specialistName: "",
          response: "",
          error: `Especialista ${targetAgentId} no encontrado.`,
        };
      }

      const { data: variants } = await supabase
        .from("ai_agent_variants")
        .select("prompt_text, api_key, model_name, knowledge_base_ids")
        .eq("agent_id", targetAgentId)
        .eq("is_active", true)
        .limit(1);

      const variant = variants && variants[0] ? variants[0] : null;
      const specialistPrompt = variant?.prompt_text || `Eres un asistente experto de ${agent.name}.`;
      const modelName = variant?.model_name || "gpt-4o-mini";
      const apiKey =
        variant?.api_key && variant.api_key !== "your_api_key_here"
          ? variant.api_key
          : process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          specialistName: agent.name,
          response: "",
          error: "Falta API Key configurada para consultar al especialista.",
        };
      }

      // 2. Fetch relevant knowledge if agent has knowledge bases
      let kbContext = "";
      const kbIds = (variant?.knowledge_base_ids as string[]) || [];
      if (kbIds.length > 0) {
        try {
          const openai = new OpenAI({ apiKey });
          const embedRes = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
          });
          const embedding = embedRes.data[0].embedding;
          const searchResults = await KnowledgeBaseService.search(tenantId, embedding, 0.25, 3, kbIds);
          if (searchResults.length > 0) {
            kbContext = `\nDOCUMENTOS DE CONOCIMIENTO DEL ESPECIALISTA:\n${searchResults.map((r) => `- ${r.content}`).join("\n")}\n`;
          }
        } catch (kbErr) {
          log.warn("Knowledge base lookup for specialist consultation skipped", { kbErr });
        }
      }

      // 3. Run LLM consultation
      const client = getLLMClient(apiKey);
      const systemInstruction = `
ERES: ${agent.name} (Agente Especialista Interno)
TU MISIÓN Y CONOCIMIENTO:
${specialistPrompt}
${kbContext}

INSTRUCCIÓN CRÍTICA DE COMUNICACIÓN INTER-AGENTES:
Estás siendo consultado por un agente colega de tu equipo sobre un cliente en curso (Lead ID: ${leadId}).
Responde con los datos técnicos, precios, políticas o detalles exactos solicitados para que tu colega pueda responderle al cliente.
Sé directo, preciso, conciso y profesional. No saludes al cliente final, solo habla directamente a tu colega.
`;

      const userPrompt = `CONSULTA INTERNA DE TU COLEGA:
"${query}"
${userContext ? `\nCONTEXTO RELEVANTE DEL CLIENTE:\n${userContext}` : ""}
`;

      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 450,
      });

      const responseText = completion.choices[0]?.message?.content || "";

      log.info(`[MULTI-AGENT] Specialist ${agent.name} answered internal consultation query`, {
        queryLength: query.length,
        responseLength: responseText.length,
      });

      return {
        success: true,
        specialistName: agent.name,
        response: responseText,
      };
    } catch (err) {
      log.error("Exception during specialist consultation", { err });
      return {
        success: false,
        specialistName: "",
        response: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
