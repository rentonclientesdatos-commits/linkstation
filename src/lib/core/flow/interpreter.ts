import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { FlowNode, FlowEdge, DatabaseWithFlows, FlowNodeData } from "@/types/flows";
import { whatsappBridge } from "../../integrations/whatsapp";
import axios from "axios";
import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/llm/openai-client";

interface LeadLike {
  [key: string]: unknown;
  metadata?: Record<string, unknown> | null;
}

/**
 * Motor Intérprete de Flujos (FlowInterpreter)
 * Recorre y ejecuta secuencialmente los nodos de un grafo de React Flow.
 */
export class FlowInterpreter {
  private static getAdminSupabase() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
      throw new Error("Missing Supabase configuration (SUPABASE_URL)");
    }
    const key = getAuthServiceRoleKey();

    return createClient<DatabaseWithFlows>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /**
   * Ejecuta el flujo a partir de un lead y nodo inicial (o disparador si no se especifica).
   */
  public static async execute(params: {
    tenantId: string;
    leadId: string;
    flowId: string;
    startNodeId?: string;
  }): Promise<{ status: "COMPLETED" | "PAUSED" | "ERROR"; node_id?: string; error?: string }> {
    const { tenantId, leadId, flowId, startNodeId } = params;
    const db = this.getAdminSupabase() as any;

    // 1. Obtener los nodos del flujo
    const { data: nodesData, error: nodesError } = await db
      .from("flow_nodes")
      .select("*")
      .eq("flow_id", flowId);

    if (nodesError || !nodesData || nodesData.length === 0) {
      return {
        status: "ERROR",
        error: `Failed to load nodes: ${nodesError?.message || "No nodes found"}`,
      };
    }

    // 2. Obtener las aristas/conexiones
    const { data: edgesData, error: edgesError } = await db
      .from("flow_edges")
      .select("*")
      .eq("flow_id", flowId);

    if (edgesError) {
      return { status: "ERROR", error: `Failed to load edges: ${edgesError.message}` };
    }

    // Convertir a estructuras del constructor
    const nodesMap = new Map<string, FlowNode>();
    nodesData.forEach((row: any) => {
      nodesMap.set(row.node_id, {
        id: row.node_id,
        type: row.type,
        data: row.data as unknown as FlowNodeData,
        position: row.position as { x: number; y: number },
      });
    });

    const edges: FlowEdge[] = (edgesData || []).map((row: any) => ({
      id: row.edge_id,
      source: row.source,
      target: row.target,
      sourceHandle: row.source_handle,
      targetHandle: row.target_handle,
    }));

    // Determinar el nodo de inicio
    let currentNodeId = startNodeId;
    if (!currentNodeId) {
      const triggerNode = Array.from(nodesMap.values()).find((n) => n.type === "flow_trigger");
      if (!triggerNode) {
        return { status: "ERROR", error: "No flow_trigger node found to start execution." };
      }
      currentNodeId = triggerNode.id;
    }

    // Estructuras para protección contra ciclos infinitos (Red Team)
    const visited = new Set<string>();
    let depth = 0;
    const maxExecutionDepth = 50;

    // Obtener información del Lead
    const { data: lead, error: leadError } = await db
      .from("lead")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return { status: "ERROR", error: `Failed to load lead: ${leadError?.message}` };
    }

    let currentLead = lead as unknown as LeadLike;

    // Recorrido secuencial del grafo
    while (currentNodeId) {
      if (depth >= maxExecutionDepth) {
        return {
          status: "ERROR",
          node_id: currentNodeId,
          error: `Max execution depth ${maxExecutionDepth} exceeded. Aborted to prevent loop.`,
        };
      }

      const node = nodesMap.get(currentNodeId);
      if (!node) {
        return {
          status: "ERROR",
          node_id: currentNodeId,
          error: `Node ${currentNodeId} not found in graph.`,
        };
      }

      visited.add(currentNodeId);
      depth++;

      console.log(`[FLOW INTERPRETER] Executing node: ${node.id} (${node.type}) at depth ${depth}`);

      let nextSourceHandle: string | null = null;

      try {
        switch (node.type) {
          case "flow_trigger": {
            // Nodo disparador no realiza acción, solo apunta al siguiente
            break;
          }

          case "flow_message": {
            const rawText = node.data.text || "";
            const text = this.interpolateString(rawText, currentLead);

            // Obtener configuración de WhatsApp
            const { data: tenant } = await db
              .from("tenants")
              .select("config")
              .eq("id", tenantId)
              .single();
            const tenantConfig = tenant?.config as {
              whatsapp?: { accessToken?: string; phoneNumberId?: string };
            } | null;
            const waConfig = tenantConfig?.whatsapp;

            if (waConfig?.accessToken && waConfig?.phoneNumberId) {
              await whatsappBridge.sendTextMessage(
                this.ensurePlusPrefix((currentLead.telefono as string) || ""),
                text,
                waConfig as any
              );
            } else {
              console.warn(
                `[FLOW INTERPRETER] WhatsApp credentials missing for tenant ${tenantId}. Message skipped.`
              );
            }

            // Registrar en chat_messages para visibilidad en el panel
            await db.from("chat_messages").insert({
              tenant_id: tenantId,
              lead_id: leadId,
              direction: "OUTBOUND",
              message_type: "TEXT",
              content: text,
              sent_by: "SYSTEM_FLOW",
              status: "SENT",
              created_at: new Date().toISOString(),
            });

            // Actualizar la fecha del último mensaje en la conversación
            await db.from("conversaciones_whatsapp").upsert(
              {
                tenant_id: tenantId,
                id_lead: leadId,
                fecha_ultimo_mensaje: new Date().toISOString(),
              },
              { onConflict: "tenant_id,id_lead" }
            );

            break;
          }

          case "flow_condition": {
            const isTrue = this.evaluateCondition(
              currentLead,
              node.data.condition_variable,
              node.data.condition_operator,
              node.data.condition_value
            );
            nextSourceHandle = isTrue ? "if" : "else";
            break;
          }

          case "flow_wait": {
            const delayValue = node.data.delay_value || 0;
            const delayUnit = node.data.delay_unit || "minutos";

            let multiplier = 60 * 1000; // minutos por defecto
            if (delayUnit === "horas") multiplier = 60 * 60 * 1000;
            else if (delayUnit === "dias") multiplier = 24 * 60 * 60 * 1000;

            const scheduledResumeAt = new Date(Date.now() + delayValue * multiplier);

            // Guardar estado de espera persistente
            await db.from("flow_wait_states").upsert(
              {
                tenant_id: tenantId,
                lead_id: leadId,
                flow_id: flowId,
                current_node_id: node.id,
                scheduled_resume_at: scheduledResumeAt.toISOString(),
              },
              { onConflict: "lead_id,flow_id" }
            );

            console.log(
              `[FLOW INTERPRETER] Lead ${leadId} paused at wait node ${node.id} until ${scheduledResumeAt.toISOString()}`
            );
            return { status: "PAUSED", node_id: node.id };
          }

          case "flow_http": {
            const method = node.data.method || "POST";
            const rawUrl = node.data.url || "";
            const url = this.interpolateString(rawUrl, currentLead);

            const rawHeaders = node.data.headers || "{}";
            const parsedHeaders = JSON.parse(this.interpolateString(rawHeaders, currentLead));

            const rawPayload = node.data.payload || "{}";
            const parsedPayload = JSON.parse(this.interpolateString(rawPayload, currentLead));

            const maxRetries = node.data.max_retries || 1;
            const timeout = node.data.timeout || 5000;

            let responseData = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const response = await axios({
                  method,
                  url,
                  headers: parsedHeaders,
                  data: method !== "GET" ? parsedPayload : undefined,
                  timeout,
                });
                responseData = response.data;
                break;
              } catch (err) {
                if (attempt === maxRetries) throw err;
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }

            // Guardar respuesta en los metadatos si target_variable está definida
            if (node.data.target_variable && responseData) {
              const currentMeta = (currentLead.metadata as Record<string, unknown>) || {};
              const updatedMeta = {
                ...currentMeta,
                [node.data.target_variable]: responseData,
              };

              const { data: updatedLead } = await db
                .from("lead")
                .update({ metadata: updatedMeta })
                .eq("id", leadId)
                .select("*")
                .single();

              if (updatedLead) {
                currentLead = updatedLead as unknown as LeadLike;
              }
            }

            break;
          }

          case "flow_db": {
            const action = node.data.action || "UPDATE_LEAD";
            const metadataKey = node.data.metadata_key;
            const metadataValue = node.data.metadata_value;
            const tagName = node.data.tag_name;

            const currentMeta = (currentLead.metadata as Record<string, unknown>) || {};
            let updatedPayload: Record<string, unknown> = {};

            if (node.data.command_type === "update_metadata" && metadataKey) {
              const interpolatedVal = this.interpolateString(metadataValue || "", currentLead);
              updatedPayload = {
                metadata: {
                  ...currentMeta,
                  [metadataKey]: interpolatedVal,
                },
              };
            } else if (node.data.command_type === "add_tag" && tagName) {
              const tags = Array.isArray(currentMeta.tags)
                ? [...(currentMeta.tags as string[])]
                : [];
              if (!tags.includes(tagName)) {
                tags.push(tagName);
              }
              updatedPayload = {
                segmentacion: tagName,
                metadata: {
                  ...currentMeta,
                  tags,
                },
              };
            } else if (action === "UPDATE_LEAD" && node.data.target) {
              const field = node.data.target as string;
              const value = this.interpolateString((node.data.value as string) || "", currentLead);

              if (
                [
                  "nombre",
                  "apellido",
                  "email",
                  "telefono",
                  "pais",
                  "tipo_lead",
                  "segmentacion",
                ].includes(field)
              ) {
                updatedPayload = { [field]: value };
              } else {
                updatedPayload = {
                  metadata: {
                    ...currentMeta,
                    [field]: value,
                  },
                };
              }
            }

            if (Object.keys(updatedPayload).length > 0) {
              const { data: updatedLead } = await db
                .from("lead")
                .update(updatedPayload as Database["public"]["Tables"]["lead"]["Update"])
                .eq("id", leadId)
                .select("*")
                .single();

              if (updatedLead) {
                currentLead = updatedLead;
              }
            }

            break;
          }

          case "flow_ai": {
            const model = node.data.model || "gpt-4o-mini";
            const instructions = this.interpolateString(node.data.instructions || "", currentLead);
            const targetVariable = node.data.target_variable || "ai_response";

            // Buscar clave de API del tenant o usar variable de entorno
            const { data: variants } = await db
              .from("ai_agent_variants")
              .select("api_key")
              .eq("tenant_id", tenantId)
              .eq("is_active", true)
              .limit(1);

            const apiKey =
              variants && variants[0]?.api_key && variants[0].api_key !== "your_api_key_here"
                ? variants[0].api_key
                : process.env.OPENAI_API_KEY;

            if (!apiKey) {
              throw new Error("Missing OpenAI API Key for flow_ai execution.");
            }

            const openai = getOpenAIClient(apiKey);
            const prompt = `
Contexto del Lead:
- Nombre: ${currentLead.nombre}
- Teléfono: ${currentLead.telefono}
- País: ${currentLead.pais}
- Metadata: ${JSON.stringify(currentLead.metadata)}

Instrucciones de la tarea:
${instructions}
`;
            const completion = await openai.chat.completions.create({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
            });

            const aiResponse = completion.choices[0]?.message?.content || "";

            // Guardar respuesta de IA en los metadatos del lead
            const currentMeta = (currentLead.metadata as Record<string, unknown>) || {};
            const updatedMeta = {
              ...currentMeta,
              [targetVariable]: aiResponse,
            };

            const { data: updatedLead } = await db
              .from("lead")
              .update({ metadata: updatedMeta })
              .eq("id", leadId)
              .select("*")
              .single();

            if (updatedLead) {
              currentLead = updatedLead as unknown as LeadLike;
            }

            break;
          }

          case "flow_ai_agent": {
            const agentId =
              (node.data.agentId as string) ||
              (node.data.agent_id as string) ||
              "";
            const agentName =
              (node.data.agentName as string) ||
              (node.data.agent_name as string) ||
              "";

            if (agentId) {
              const currentMeta = (currentLead.metadata as Record<string, unknown>) || {};
              const updatedPayload = {
                ai_agent_id: agentId,
                inactivity_sent_count: 0,
                metadata: {
                  ...currentMeta,
                  current_agent_id: agentId,
                  current_agent_name: agentName || undefined,
                  last_agent_handoff: {
                    from_agent_id: currentLead.ai_agent_id || null,
                    to_agent_id: agentId,
                    to_agent_name: agentName || null,
                    via_flow_node: node.id,
                    timestamp: new Date().toISOString(),
                  },
                },
              };

              const { data: updatedLead } = await db
                .from("lead")
                .update(updatedPayload)
                .eq("id", leadId)
                .select("*")
                .single();

              if (updatedLead) {
                currentLead = updatedLead as unknown as LeadLike;
              }

              console.log(
                `[FLOW INTERPRETER] Lead ${leadId} assigned to agent ${agentName || agentId} at node ${node.id}`
              );
            }
            break;
          }

          default: {
            console.warn(`[FLOW INTERPRETER] Unsupported node type: ${node.type}`);
            break;
          }
        }
      } catch (err) {
        const error = err as Error;
        console.error(`[FLOW INTERPRETER] Error executing node ${node.id}:`, error);
        return { status: "ERROR", node_id: node.id, error: error.message || String(err) };
      }

      // Buscar siguiente nodo según conexiones
      const outgoingEdges = edges.filter((e) => e.source === currentNodeId);

      if (outgoingEdges.length === 0) {
        currentNodeId = undefined;
      } else if (outgoingEdges.length === 1) {
        currentNodeId = outgoingEdges[0].target;
      } else {
        // Enrutamiento condicional con handles ("if" / "else")
        if (nextSourceHandle) {
          const matchingEdge = outgoingEdges.find((e) => e.sourceHandle === nextSourceHandle);
          currentNodeId = matchingEdge ? matchingEdge.target : undefined;
        } else {
          // Fallback
          currentNodeId = outgoingEdges[0].target;
        }
      }

      // Red Team: Detener si detectamos que visitaremos un nodo ya ejecutado de forma sincrónica e inmediata (ciclo)
      if (currentNodeId && visited.has(currentNodeId)) {
        return {
          status: "ERROR",
          node_id: currentNodeId,
          error: `Infinite synchronous execution loop detected on node: ${currentNodeId}. Aborted.`,
        };
      }
    }

    return { status: "COMPLETED" };
  }

  // Métodos auxiliares privados
  private static getVariableValue(lead: LeadLike, variableName: string): unknown {
    if (!lead) return undefined;
    if (variableName in lead) {
      return lead[variableName];
    }
    if (lead.metadata && typeof lead.metadata === "object" && variableName in lead.metadata) {
      return (lead.metadata as Record<string, unknown>)[variableName];
    }
    return undefined;
  }

  private static evaluateCondition(
    lead: LeadLike,
    conditionVar: string | undefined,
    operator: string | undefined,
    conditionVal: string | undefined
  ): boolean {
    if (!conditionVar) return false;
    const value = this.getVariableValue(lead, conditionVar);

    switch (operator) {
      case "equals":
        return String(value).toLowerCase() === String(conditionVal).toLowerCase();
      case "not_equals":
        return String(value).toLowerCase() !== String(conditionVal).toLowerCase();
      case "contains":
        return String(value).toLowerCase().includes(String(conditionVal).toLowerCase());
      case "is_true":
        return (
          value === true ||
          String(value).toLowerCase() === "true" ||
          value === 1 ||
          String(value) === "1"
        );
      case "is_false":
        return (
          value === false ||
          String(value).toLowerCase() === "false" ||
          value === 0 ||
          String(value) === "0"
        );
      case "exists":
        return value !== undefined && value !== null && value !== "";
      default:
        return false;
    }
  }

  private static interpolateString(str: string, lead: LeadLike): string {
    if (!str) return "";
    return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const val = this.getVariableValue(lead, key.trim());
      return val !== undefined && val !== null ? String(val) : "";
    });
  }

  private static ensurePlusPrefix(phone: string): string {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    return `+${cleaned}`;
  }
}
