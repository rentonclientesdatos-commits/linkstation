import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { orchestrator } from "@/lib/core/orchestrator";
import { verifyHmacSignature } from "@/lib/security/webhook-hmac";
import type { Lead } from "@/types/database";

/**
 * DYNAMIC WEBHOOK HANDLER (v1.1 — BUG-SEC-02 fix 29-05-2026)
 * Pattern: /api/webhooks/workflow/[workflowId]/[path]/[nodeId]
 *
 * Seguridad:
 *   - Si el nodo `webhookTrigger` define `data.config.webhook_secret`, el handler
 *     EXIGE firma HMAC-SHA256 del raw body en el header `X-Webhook-Signature`
 *     (formato `sha256=<hex>`). Sin firma válida → 401.
 *   - Si el secret NO está definido en el nodo:
 *       · Cuando `process.env.WEBHOOK_WORKFLOW_REQUIRE_SECRET === "true"`
 *         (recomendado en VPS público) → rechazo 401 explícito.
 *       · En otro caso (dev local sin tráfico real) → permitido con WARN log.
 *   - La respuesta NO devuelve `lead_id` (cierra INFO-02 del security delta).
 *
 * Compatibilidad backward: workflows ya creados sin `webhook_secret` siguen
 * funcionando en local mientras `WEBHOOK_WORKFLOW_REQUIRE_SECRET` no esté a `true`.
 * En el deploy VPS se activa el flag y los workflows han de migrar a secret.
 */

interface WorkflowRecord {
  tenant_id: string;
  graph_data: {
    nodes?: Array<{
      id: string;
      type: string;
      data?: {
        config?: {
          method?: string;
          webhook_secret?: string;
        };
      };
    }>;
  };
}

async function handleWebhook(
  req: Request,
  { params }: { params: Promise<{ workflowId: string; nodeId: string; path: string }> }
) {
  const { workflowId, nodeId, path } = await params;

  try {
    const supabase = await getAdminSupabaseClient();

    // 1. Validate Workflow & Get Tenant
    // orchestration_graphs uses workflow_id PK not in generated DB types; cast required.
     
    const { data: workflow, error: wfError } = (await supabase
      .from("orchestration_graphs")
      .select("tenant_id, graph_data")
      .eq("workflow_id", workflowId)
      .single()) as { data: WorkflowRecord | null; error: unknown };
     

    if (wfError || !workflow) {
      console.error(`[WEBHOOK] Workflow ${workflowId} not found in graphs`);
      return NextResponse.json({ error: "Workflow graph not found" }, { status: 404 });
    }

    // 2. Validate Node in Graph
    const graphData = workflow.graph_data;
    const node = graphData?.nodes?.find((n) => n.id === nodeId);

    if (!node || node.type !== "webhookTrigger") {
      console.error(`[WEBHOOK] Node ${nodeId} is not a valid webhookTrigger`);
      return NextResponse.json(
        { error: "Webhook node not found or invalid type" },
        { status: 400 }
      );
    }

    // 3. Method Validation (Strict if configured)
    const config = node.data?.config ?? {};
    if (config.method && config.method !== req.method && req.method !== "HEAD") {
      return NextResponse.json(
        { error: `Method ${req.method} not allowed. Expected ${config.method}` },
        { status: 405 }
      );
    }

    // 4. Extract Payload + HMAC verification (BUG-SEC-02 fix)
    //
    // Para verificar HMAC necesitamos el RAW body exacto que el cliente firmó.
    // `req.json()` consume el stream, así que leemos `req.text()` una sola vez
    // y luego parseamos a JSON si procede. Si NO hay body (GET/HEAD/DELETE), el
    // raw es "" y la firma se calcula sobre cadena vacía.
    const rawBody = ["POST", "PUT", "PATCH"].includes(req.method)
      ? await req.text().catch(() => "")
      : "";

    const nodeSecret = config.webhook_secret;
    if (nodeSecret) {
      const sigHeader =
        req.headers.get("x-webhook-signature") ?? req.headers.get("X-Webhook-Signature");
      if (!verifyHmacSignature(rawBody, nodeSecret, sigHeader)) {
        console.warn(
          `[WEBHOOK] HMAC signature invalid or missing for workflow ${workflowId} node ${nodeId}`
        );
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.WEBHOOK_WORKFLOW_REQUIRE_SECRET === "true") {
      console.warn(
        `[WEBHOOK] Rejecting unsigned call: workflow ${workflowId} node ${nodeId} has no webhook_secret and WEBHOOK_WORKFLOW_REQUIRE_SECRET=true`
      );
      return NextResponse.json(
        { error: "Webhook secret not configured for this node" },
        { status: 401 }
      );
    } else {
      console.warn(
        `[WEBHOOK] Unauthenticated call accepted (dev mode): workflow ${workflowId} node ${nodeId}. Set webhook_secret in node config or WEBHOOK_WORKFLOW_REQUIRE_SECRET=true to enforce.`
      );
    }

    let payload: Record<string, unknown> = {};
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          payload = {};
        }
      }
    } else {
      const { searchParams } = new URL(req.url);
      payload = Object.fromEntries(searchParams.entries());
    }

    // 5. Ingest/Identify Lead with flexible parsing (Tally Forms, Typeform, Native)
    let telefono: string | undefined;
    let nombre: string | undefined;
    let email: string | undefined;
    const extractedVariables: Record<string, unknown> = { ...payload };

    // A) Support Tally Forms format: payload.data.fields = [ { label, type, value }, ... ]
    const tallyData = (payload.data as Record<string, unknown>) || {};
    if (Array.isArray(tallyData.fields)) {
      const fields = tallyData.fields as Array<{ label?: string; type?: string; value?: unknown; key?: string }>;
      for (const f of fields) {
        const label = String(f.label || "").toLowerCase();
        const val = f.value;
        if (val === undefined || val === null) continue;

        const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
        extractedVariables[f.label || f.key || "field"] = val;

        if (
          !telefono &&
          (f.type === "INPUT_PHONE_NUMBER" ||
            label.includes("tel") ||
            label.includes("phone") ||
            label.includes("celular") ||
            label.includes("whatsapp") ||
            label.includes("móvil") ||
            label.includes("movil"))
        ) {
          telefono = valStr.trim();
        } else if (
          !nombre &&
          (label.includes("nombre") ||
            label.includes("name") ||
            label.includes("apellido") ||
            label.includes("cliente"))
        ) {
          nombre = valStr.trim();
        } else if (
          !email &&
          (f.type === "INPUT_EMAIL" ||
            label.includes("email") ||
            label.includes("correo") ||
            label.includes("mail"))
        ) {
          email = valStr.trim();
        }
      }
    }

    // B) Support Typeform format: payload.form_response.answers = [ ... ]
    const tfResponse = (payload.form_response as Record<string, unknown>) || {};
    if (Array.isArray(tfResponse.answers)) {
      const answers = tfResponse.answers as Array<Record<string, unknown>>;
      for (const a of answers) {
        if (a.type === "phone_number" && a.phone_number) telefono = String(a.phone_number).trim();
        if (a.type === "email" && a.email) email = String(a.email).trim();
        if (a.type === "text" && !nombre && a.text) nombre = String(a.text).trim();
      }
    }

    // C) Standard JSON body fields
    if (!telefono) {
      const rawPhone =
        payload.telefono ??
        payload.phone ??
        payload.lead_phone ??
        payload.celular ??
        payload.whatsapp ??
        payload.numero ??
        payload.phone_number ??
        payload.mobile;
      if (rawPhone) telefono = String(rawPhone).trim();
    }

    if (!nombre) {
      const rawName =
        payload.nombre ??
        payload.name ??
        payload.lead_name ??
        payload.full_name ??
        payload.cliente;
      if (rawName) nombre = String(rawName).trim();
    }

    if (!email) {
      const rawEmail =
        payload.email ??
        payload.lead_email ??
        payload.correo ??
        payload.mail;
      if (rawEmail) email = String(rawEmail).trim();
    }

    // D) Handle Tally / Platform connection ping (no real lead data yet)
    const isVerificationPing =
      payload.eventType === "PING" ||
      payload.type === "PING" ||
      payload.test === true ||
      req.method === "GET" ||
      req.method === "HEAD" ||
      (payload.eventId && !telefono && !nombre);

    if (isVerificationPing && !telefono) {
      // Registrar log de verificación exitosa en orchestration_logs
      await (supabase as any).from("orchestration_logs").insert({
        tenant_id: workflow.tenant_id,
        workflow_id: workflowId,
        step_number: 0,
        action_type: "WEBHOOK_TRIGGER",
        result: "SUCCESS",
        metadata: {
          path,
          method: req.method,
          node_id: nodeId,
          payload,
          verification: true,
          info: "Test o Ping de verificación de Tally / Webhook validado exitosamente",
          received_at: new Date().toISOString(),
        },
        executed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        status: "active",
        message: "Webhook verificado correctamente. LinkStation está listo para recibir respuestas de este formulario.",
        node: nodeId,
      });
    }

    const idLeadExterno =
      (payload.id_lead_externo as string | undefined) ??
      (tallyData.responseId as string | undefined) ??
      `wh_${nodeId}_${Date.now()}`;

    // Standard Lead Upsert
    const { data: lead, error: leadError } = (await supabase
      .from("lead")
      .upsert(
        {
          tenant_id: workflow.tenant_id,
          nombre: nombre ?? "Referido Webhook",
          telefono: telefono || "N/A",
          email,
          id_lead_externo: idLeadExterno,
          metadata: {
            ...extractedVariables,
            webhook_path: path,
            webhook_node_id: nodeId,
            received_at: new Date().toISOString(),
          },
          fecha_actualizacion: new Date().toISOString(),
        },
        { onConflict: "tenant_id, id_lead_externo" }
      )
      .select()
      .single()) as { data: Lead | null; error: unknown };

    if (leadError || !lead) {
      console.error("[WEBHOOK] Lead ingestion error:", leadError);
      throw leadError ?? new Error("Lead upsert returned null");
    }

    // Registrar log de éxito de entrada en orchestration_logs
    await (supabase as any).from("orchestration_logs").insert({
      tenant_id: workflow.tenant_id,
      workflow_id: workflowId,
      step_number: 0,
      action_type: "WEBHOOK_TRIGGER",
      result: "SUCCESS",
      lead_id: lead.id,
      metadata: {
        path,
        method: req.method,
        node_id: nodeId,
        payload,
        extracted_phone: telefono,
        extracted_name: nombre,
        lead_name: lead.nombre,
        lead_phone: lead.telefono,
        received_at: new Date().toISOString(),
      },
      executed_at: new Date().toISOString(),
    });

    // 6. Trigger Orchestration specifically from this Webhook Node (if phone is present)
    if (telefono && telefono !== "N/A") {
      orchestrator
        .executeWorkflow(workflowId, lead, workflow.tenant_id, extractedVariables, nodeId)
        .catch((err) => {
          console.error("[WEBHOOK] Orchestration trigger failed:", err);
        });
    } else {
      console.log("[WEBHOOK] Data ingested successfully without valid phone number for immediate calling");
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed and automation triggered successfully",
      node: nodeId,
      lead_id: lead.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WEBHOOK API CRITICAL ERROR]:", msg);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = handleWebhook;
export const GET = handleWebhook;
export const PUT = handleWebhook;
export const PATCH = handleWebhook;
export const DELETE = handleWebhook;
export const HEAD = handleWebhook;
