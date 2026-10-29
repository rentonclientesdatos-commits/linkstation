import { handleToolExecution } from "../../route";

/**
 * PATH-BASED ULTRAVOX TOOL ENDPOINT WITH TENANT ID
 * Allows specifying both tenantId and toolName in the URL path:
 * e.g. /api/webhooks/ultravox/tools/<tenantId>/enviar_whatsapp
 *      /api/webhooks/ultravox/tools/<tenantId>/guardar_datos_contacto
 *      /api/webhooks/ultravox/tools/<tenantId>/capturarDatosCotizacion
 *
 * This ensures that Ultravox agents belonging to any client/tenant
 * always route their data directly to the correct organization without
 * depending on query strings (which some voice providers reject).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; toolName: string }> }
) {
  const { tenantId, toolName } = await params;
  return handleToolExecution(req, toolName, tenantId);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; toolName: string }> }
) {
  const { tenantId, toolName } = await params;
  return handleToolExecution(req, toolName, tenantId);
}
