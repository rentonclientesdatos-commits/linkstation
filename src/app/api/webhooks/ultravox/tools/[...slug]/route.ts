import { handleToolExecution } from "../route";

/**
 * ULTRAVOX TOOLS DYNAMIC ROUTE (SUPPORTS BOTH TOOL AND TENANT/TOOL)
 * Handles:
 * - /api/webhooks/ultravox/tools/[toolName] (e.g. /api/webhooks/ultravox/tools/enviar_whatsapp)
 * - /api/webhooks/ultravox/tools/[tenantId]/[toolName] (e.g. /api/webhooks/ultravox/tools/123/enviar_whatsapp)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const tenantId = slug.length >= 2 ? slug[0] : undefined;
  const toolName = slug.length >= 2 ? slug[1] : slug[0];

  return handleToolExecution(req, toolName, tenantId);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const tenantId = slug.length >= 2 ? slug[0] : undefined;
  const toolName = slug.length >= 2 ? slug[1] : slug[0];

  return handleToolExecution(req, toolName, tenantId);
}
