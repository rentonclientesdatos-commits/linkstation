import { handleToolExecution } from "../route";

/**
 * PATH-BASED ULTRAVOX TOOL ENDPOINT
 * Ultravox HTTP tools reject query strings (e.g. ?tool=...).
 * This dynamic route allows specifying the tool in the path:
 * e.g. /api/webhooks/ultravox/tools/enviar_whatsapp
 *      /api/webhooks/ultravox/tools/guardar_datos_contacto
 *      /api/webhooks/ultravox/tools/capturarDatosCotizacion
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ toolName: string }> }
) {
  const { toolName } = await params;
  return handleToolExecution(req, toolName);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ toolName: string }> }
) {
  const { toolName } = await params;
  return handleToolExecution(req, toolName);
}
