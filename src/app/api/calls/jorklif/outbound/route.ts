import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("api.calls.jorklif.outbound");

/**
 * POST /api/calls/jorklif/outbound
 *
 * Dispara una llamada outbound de Jorklif via Ultravox para un lead específico.
 *
 * Body: { leadId: string }
 * Returns: { success: boolean; message: string; callId?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId } = body;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { success: false, message: "leadId es requerido." },
        { status: 400 }
      );
    }

    // Verificar que el lead existe y pertenece al tenant activo
    const supabase = await getSupabaseServerClient();
    const { data: lead, error: fetchErr } = await (supabase.from("lead") as any)
      .select("id, tenant_id, nombre, telefono, metadata")
      .eq("id", leadId)
      .single();

    if (fetchErr || !lead) {
      return NextResponse.json({ success: false, message: "Lead no encontrado." }, { status: 404 });
    }

    // Importar y ejecutar la action
    const { triggerJorklifCallAction } = await import("@/lib/actions/jorklif-campaign");
    const result = await triggerJorklifCallAction(leadId);

    log.info("Outbound call triggered via API", {
      leadId,
      success: result.success,
      callId: result.callId,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Error in /api/calls/jorklif/outbound", { error: msg });
    return NextResponse.json({ success: false, message: `Error interno: ${msg}` }, { status: 500 });
  }
}
