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

        const syntheticLogs = (leads || []).map((l: any, idx: number) => {
          const meta = l.metadata || {};
          return {
            id: `lead_log_${l.id}_${idx}`,
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
          };
        });

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
