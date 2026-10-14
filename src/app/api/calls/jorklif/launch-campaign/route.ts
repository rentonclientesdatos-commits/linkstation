import { NextResponse } from "next/server";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("api.calls.jorklif.launch-campaign");

/**
 * POST /api/calls/jorklif/launch-campaign
 *
 * Lanza la campaña masiva de llamadas Jorklif para todos los leads PENDIENTES.
 *
 * Body (opcional): {
 *   tipoGestion?: "COBRANZA" | "COTIZACION" | "TODOS";
 *   delayBetweenCallsMs?: number;
 * }
 *
 * Returns: { success: boolean; total: number; dispatched: number; failed: number; message: string }
 */
export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // body es opcional
    }

    const tipoGestion = body?.tipoGestion || "TODOS";
    const delayBetweenCallsMs = typeof body?.delayBetweenCallsMs === "number"
      ? body.delayBetweenCallsMs
      : 3000;

    const { launchJorklifCampaignAction } = await import("@/lib/actions/jorklif-campaign");
    const result = await launchJorklifCampaignAction({ tipoGestion, delayBetweenCallsMs });

    log.info("Campaign launched via API", result);

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Error in /api/calls/jorklif/launch-campaign", { error: msg });
    return NextResponse.json({ success: false, total: 0, dispatched: 0, failed: 0, message: `Error interno: ${msg}` }, { status: 500 });
  }
}
