import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const workflowId = searchParams.get("workflowId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const supabase = await getAdminSupabaseClient();

    let query = (supabase as any)
      .from("orchestration_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (workflowId && workflowId !== "all") {
      query = query.eq("workflow_id", workflowId);
    }

    const { data: logs, error } = await query;

    if (error) {
      // Si la tabla orchestration_logs aún no existe en Supabase (código PGRST205),
      // consultamos la tabla 'lead' como fallback transparente para mostrar las entradas de webhooks en vivo.
      if ((error as any).code === "PGRST205" || String(error.message).includes("does not exist")) {
        console.warn(
          "[ORCHESTRATION_LOGS] orchestration_logs table not found, falling back to lead table"
        );
        const { data: leads } = await supabase
          .from("lead")
          .select("id, nombre, telefono, email, metadata, fecha_creacion, fecha_actualizacion")
          .eq("tenant_id", tenantId)
          .order("fecha_actualizacion", { ascending: false })
          .limit(limit);

        const syntheticLogs: any[] = [];

        // 1. Añadir entradas de los leads y su historial de nodos
        for (const l of leads || []) {
          const meta = (l.metadata || {}) as Record<string, unknown>;
          const history = Array.isArray(meta.workflow_history)
            ? (meta.workflow_history as Array<any>)
            : [];

          // Entrada principal (Paso 0: Webhook)
          syntheticLogs.push({
            id: `lead_log_${l.id}_0`,
            tenant_id: tenantId,
            workflow_id: workflowId || "default",
            lead_id: l.id,
            action_type: "WEBHOOK_TRIGGER",
            step_number: 0,
            result: "SUCCESS",
            metadata: {
              path: meta.webhook_path || "formulario",
              method: "POST",
              node_id: meta.webhook_node_id || "webhookTrigger",
              payload: meta,
              extracted_phone: l.telefono,
              extracted_name: l.nombre,
              lead_name: l.nombre,
              lead_phone: l.telefono,
              received_at: l.fecha_actualizacion || l.fecha_creacion,
            },
            executed_at: l.fecha_actualizacion || l.fecha_creacion,
          });

          // Siguientes pasos registrados en el historial de ejecución del lead
          for (const step of history) {
            syntheticLogs.push({
              id: `lead_step_${l.id}_${step.step}_${step.node_id}`,
              tenant_id: tenantId,
              workflow_id: workflowId || "default",
              lead_id: l.id,
              action_type: step.action_type || "NODE_EXECUTION",
              step_number: step.step || 1,
              result: step.result || "SUCCESS",
              metadata: {
                node_id: step.node_id,
                node_label: step.node_label,
                lead_name: l.nombre,
                lead_phone: l.telefono,
                executed_at: step.executed_at,
              },
              executed_at: step.executed_at,
            });
          }
        }

        // 2. Añadir llamadas registradas de la tabla 'llamadas'
        try {
          const { data: calls } = await supabase
            .from("llamadas")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("fecha_inicio", { ascending: false })
            .limit(20);

          for (const c of calls || []) {
            syntheticLogs.push({
              id: `call_${c.id}`,
              tenant_id: tenantId,
              workflow_id: workflowId || "default",
              lead_id: c.id_lead,
              action_type: "VOICE_CALL",
              step_number: 1,
              result: c.estado_llamada === "FAILED" ? "FAILED" : "SUCCESS",
              metadata: {
                agent_name: c.nombre_agente || "Sofía",
                estado_llamada: c.estado_llamada,
                duracion_segundos: c.duracion_segundos,
                url_grabacion: c.url_grabacion,
                resumen: c.resumen,
                executed_at: c.fecha_inicio || c.fecha_creacion,
              },
              executed_at: c.fecha_inicio || c.fecha_creacion,
            });
          }
        } catch {
          // Ignorar si llamadas no existe
        }

        // Ordenar todos los eventos cronológicamente descendente
        syntheticLogs.sort(
          (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
        );

        return NextResponse.json({
          success: true,
          logs: syntheticLogs,
          count: syntheticLogs.length,
          source: "lead_fallback",
        });
      }

      console.error("[ORCHESTRATION_LOGS] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      count: (logs || []).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
