/* eslint-disable @typescript-eslint/no-explicit-any -- casts legacy Supabase + flattenGraph, refactor pendiente en Sprint 1 tarea 2-22 */
import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Node, Edge } from "@xyflow/react";
import { requireApiUser, requireTenantAccess, requireOrchestrationEnabled } from "@/lib/api-auth";

const publishSchema = z.object({
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  graphData: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
    viewport: z.unknown().optional(),
  }),
});

/**
 * API: PUBLISH ORCHESTRATION SEQUENCE (v2.0 - Workflow Aware)
 * Saves the visual graph and flattens it for the execution engine.
 */

interface VisualNodeData {
  label?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  console.log("[DEBUG] PUBLISH ENDPOINT HIT");
  try {
    const ctx = await requireApiUser();
    if (ctx instanceof NextResponse) return ctx;

    const body = await req.json();
    console.log("[DEBUG] PUBLISH BODY KEYS:", Object.keys(body || {}));
    const { tenantId, workflowId, graphData } = publishSchema.parse(body);

    const tenantGuard = await requireTenantAccess(ctx, tenantId);
    if (tenantGuard) return tenantGuard;

    const orchGuard = await requireOrchestrationEnabled(tenantId);
    if (orchGuard) return orchGuard;

    const supabase = await getAdminSupabaseClient();

    // 1. Save the visual graph state

    const { error: graphError } = await (supabase as any).from("orchestration_graphs").upsert(
      {
        tenant_id: tenantId,
        workflow_id: workflowId,
        graph_data: graphData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workflow_id" }
    );
    if (graphError) {
      console.error("[PUBLISH] Graph Error:", graphError);
      throw graphError;
    }

    // 2. Flatten the graph into execution rules
    const executionSteps = flattenGraph(graphData.nodes as Node[], graphData.edges as Edge[]);

    // 3. Clear existing rules for THIS workflow and insert new ones

    const { error: deleteError } = await (supabase as any)
      .from("orchestration_rules")
      .delete()
      .eq("workflow_id", workflowId);

    if (deleteError) {
      console.warn("[PUBLISH] Rule cleanup warning (non-fatal):", deleteError);
    }

    if (executionSteps.length > 0) {
      const { error: rulesError } = await (supabase as any).from("orchestration_rules").insert(
        executionSteps.map((step, index) => ({
          tenant_id: tenantId,
          workflow_id: workflowId,
          step_name: step.label,
          action_type: step.type,
          sequence_order: step.sequence_order || index,
          config: step.config as Record<string, unknown>,
          trigger_node_id: (step.config as any)?.trigger_node_id || null,
          is_active: true,
        }))
      );

      if (rulesError) {
        console.error("[PUBLISH] Rules Insertion Error:", rulesError);
        throw rulesError;
      }
    }

    return NextResponse.json({ success: true, stepsCount: executionSteps.length });
  } catch (error: unknown) {
    const err = error as { message: string; stack?: string };
    console.error("CRITICAL PUBLISH API ERROR:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * HELPER: FLATTEN GRAPH (v5.0 - True Branching & Pointer-based Execution)
 */
function flattenGraph(nodes: Node[], edges: Edge[]) {
  const triggerTypes = ["leadTrigger", "webhookTrigger", "flow_trigger", "ultravoxTrigger", "inboundWhatsApp"];
  const triggerNodes = nodes.filter((n) => triggerTypes.includes(n.type || ""));
  if (triggerNodes.length === 0) return [];

  const allSteps: any[] = [];
  const nodeIdToOrder = new Map<string, number>();

  // First pass: Assign unique sequence_order to each non-trigger node
  let currentOrder = 1;
  nodes.forEach((node) => {
    if (![...triggerTypes, "end"].includes(node.type || "")) {
      nodeIdToOrder.set(node.id, currentOrder++);
    }
  });

  // Second pass: Map each node to an execution rule
  nodes.forEach((node) => {
    const type = node.type || "unknown";
    if ([...triggerTypes, "end"].includes(type)) return;

    const data = (node.data || {}) as VisualNodeData;
    let actionType = "UNKNOWN";

    if (["voiceCall", "flow_call"].includes(type)) actionType = "VOICE_CALL";
    else if (["whatsapp", "flow_meta_template"].includes(type)) actionType = "WHATSAPP_TEMPLATE";
    else if (["textAgent", "flow_ai_agent"].includes(type)) actionType = "AI_AGENT";
    else if (["timeCondition", "flow_condition"].includes(type)) actionType = "CONDITION";
    else if (["delay", "flow_wait"].includes(type)) actionType = "WAIT";
    else if (["api", "flow_http"].includes(type)) actionType = "HTTP";
    else if (["llm", "flow_ai"].includes(type)) actionType = "LLM";
    else if (["crm", "flow_crm"].includes(type)) actionType = "CRM";
    else if (["retrySequence", "flow_retry"].includes(type)) actionType = "RETRY_SEQUENCE";
    else if (["pdfGenerator", "flow_pdf_generator"].includes(type)) actionType = "PDF_GENERATOR";

    // Find outgoing edges and map to handles
    const outgoing = edges.filter((e) => e.source === node.id);
    const branches: Record<string, number | null> = {};

    outgoing.forEach((edge) => {
      const targetOrder = nodeIdToOrder.get(edge.target);
      if (targetOrder) {
        const handle = edge.sourceHandle || "default";
        branches[handle] = targetOrder;
      }
    });

    allSteps.push({
      label: data.label || type,
      type: actionType,
      sequence_order: nodeIdToOrder.get(node.id),
      config: {
        ...(data.config || {}),
        ...data,
        branches,
        // Default next if no branches defined (backward compat)
        next_step_order: outgoing.length === 1 ? nodeIdToOrder.get(outgoing[0].target) : null,
      },
    });
  });

  // For triggers, we need to know where they start
  triggerNodes.forEach((trigger) => {
    const outgoing = edges.filter((e) => e.source === trigger.id);
    if (outgoing.length > 0) {
      const firstStepOrder = nodeIdToOrder.get(outgoing[0].target);
      allSteps.push({
        label: `Trigger: ${trigger.id}`,
        type: "TRIGGER_LINK",
        sequence_order: 0, // Triggers always at 0
        config: {
          trigger_node_id: trigger.id,
          next_step_order: firstStepOrder,
        },
      });
    }
  });

  return allSteps;
}
