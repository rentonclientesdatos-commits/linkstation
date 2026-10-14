/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getAdminSupabaseClient, getActiveTenantId } from "@/lib/supabase/server";
import { VoiceAgent, VoiceAgentVariant } from "@/types/database";
import { revalidatePath } from "next/cache";

/**
 * Los agentes de voz tienen su aislamiento garantizado por el tenant_id.
 * Este módulo gestiona CRUD de agentes y sus variantes A/B.
 * Usa el cliente servidor con SERVICE_ROLE_KEY — no requiere sesión de usuario.
 */

export async function getVoiceAgents(tenantId?: string) {
  try {
    const supabase = await getAdminSupabaseClient();

    let targetTenantId = tenantId;
    if (!targetTenantId) {
      targetTenantId = (await getActiveTenantId()) || undefined;
    }

    if (!targetTenantId) {
      return { success: false, error: "No target tenant specified" };
    }

    const { data, error } = await (supabase.from("voice_agents" as any) as any)
      .select("*")
      .eq("tenant_id", targetTenantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data as VoiceAgent[] };
  } catch (error: unknown) {
    console.error("Error getVoiceAgents:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getVoiceAgentVariants(agentId: string) {
  try {
    const supabase = await getAdminSupabaseClient();
    
    // 1. Try querying voice_agent_variants if table exists
    try {
      const { data, error } = await (supabase.from("voice_agent_variants" as any) as any)
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return { success: true, data: data as VoiceAgentVariant[] };
      }
    } catch {
      // Table may not exist, fallback to voice_agents table
    }

    // 2. Fallback: read prompt directly from voice_agents table
    const { data: agentData } = await (supabase.from("voice_agents" as any) as any)
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentData) {
      const fallbackVariant: VoiceAgentVariant = {
        id: `v-fallback-${agentData.id}`,
        agent_id: agentData.id,
        version_label: "v1.0",
        prompt_text: agentData.prompt_text_retell || "",
        is_active: true,
        is_variant_b: false,
        weight: 0.5,
        metrics: null,
        created_at: agentData.created_at,
        updated_at: agentData.updated_at,
      };
      return { success: true, data: [fallbackVariant] };
    }

    return { success: true, data: [] };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function saveVoiceAgent(agent: Partial<VoiceAgent>, tenantId: string) {
  try {
    const supabase = await getAdminSupabaseClient();

    if (agent.id) {
      const { data, error } = await (supabase.from("voice_agents" as any) as any)
        .update({ ...agent, updated_at: new Date().toISOString() })
        .eq("id", agent.id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data: data as VoiceAgent };
    } else {
      const { data, error } = await (supabase.from("voice_agents" as any) as any)
        .insert([{ ...agent, tenant_id: tenantId }])
        .select()
        .single();
      if (error) throw error;

      // Try creating initial variants if table exists
      try {
        await (supabase.from("voice_agent_variants") as any).insert([
          {
            agent_id: data.id,
            is_variant_b: false,
            version_label: "v1.0",
            prompt_text: agent.prompt_text_retell || "Instrucciones iniciales...",
            weight: 0.5,
          },
          {
            agent_id: (data as any).id,
            is_variant_b: true,
            version_label: "v1.0",
            prompt_text: agent.prompt_text_retell || "Instrucciones iniciales...",
            weight: 0.5,
          },
        ]);
      } catch {
        // Table may not exist, non-blocking
      }

      return { success: true, data: data as VoiceAgent };
    }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function saveVoiceVariant(variant: Partial<VoiceAgentVariant>) {
  try {
    const supabase = await getAdminSupabaseClient();

    // 1. Always persist prompt in voice_agents table (guaranteed storage)
    if (variant.agent_id && variant.prompt_text !== undefined) {
      await (supabase.from("voice_agents" as any) as any)
        .update({
          prompt_text_retell: variant.prompt_text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", variant.agent_id);
    }

    // 2. Also try persisting to voice_agent_variants if table exists
    try {
      if (variant.id && !variant.id.startsWith("v-fallback-")) {
        await (supabase.from("voice_agent_variants" as any) as any)
          .update({ ...variant, updated_at: new Date().toISOString() })
          .eq("id", variant.id);
      } else if (variant.agent_id) {
        await (supabase.from("voice_agent_variants" as any) as any).insert([variant]);
      }
    } catch {
      // Non-blocking if table does not exist
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Bulk-imports Retell agents into the local voice_agents table.
 */
export async function importUltravoxAgents(
  tenantId: string,
  ultravoxAgents: {
    id: string;
    name: string;
    systemPrompt: string;
    model: string;
    voice: string;
  }[],
  ultravoxApiKey: string
) {
  try {
    const supabase = await getAdminSupabaseClient();

    console.log(`[importUltravoxAgents] Syncing ${ultravoxAgents.length} agents...`);

    const records: any[] = [];
    
    for (let i = 0; i < ultravoxAgents.length; i++) {
      const a = ultravoxAgents[i];

      records.push({
        tenant_id: tenantId,
        name: a.name || a.id,
        provider: "ULTRAVOX",
        provider_agent_id: a.id,
        voice_id: a.voice || null,
        prompt_text_retell: a.systemPrompt || "", // Usamos esta columna como almacenamiento del prompt base temporalmente
        retell_llm_id: a.model || null, // Usamos esta para el modelo temporalmente
        status: "ACTIVE",
      });
    }

    const inserted: any[] = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const { data: chunkInserted, error: upsertError } = await (
        supabase.from("voice_agents" as any) as any
      )
        .upsert(record, {
          onConflict: "tenant_id,provider_agent_id",
          ignoreDuplicates: false,
        })
        .select("id, provider_agent_id");

      if (upsertError) throw upsertError;
      if (chunkInserted) inserted.push(...chunkInserted);
    }

    const variantRows = (inserted || []).flatMap((row: any) => {
      const agentInfo = records.find((r) => r.provider_agent_id === row.provider_agent_id);
      const prompt = agentInfo?.prompt_text_retell || "";
      return [
        {
          agent_id: row.id,
          is_variant_b: false,
          version_label: "v1.0",
          prompt_text: prompt,
          weight: 0.5,
        },
        {
          agent_id: row.id,
          is_variant_b: true,
          version_label: "v1.0",
          prompt_text: prompt,
          weight: 0.5,
        },
      ];
    });

    if (variantRows.length > 0) {
      await (supabase
        .from("voice_agent_variants") as any)
        .upsert(variantRows, { onConflict: "agent_id,version_label,is_variant_b" });
    }

    revalidatePath("/dashboard/voice-agents");
    return { success: true, imported: ultravoxAgents.length };
  } catch (error: unknown) {
    console.error("Error importUltravoxAgents:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
