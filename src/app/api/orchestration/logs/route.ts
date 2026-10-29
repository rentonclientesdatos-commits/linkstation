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
