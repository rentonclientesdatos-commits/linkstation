/**
 * STANDALONE BULLMQ WORKER
 * Run with: node worker.js
 * This process stays alive and picks up queued lead sequence jobs from Redis.
 */

import { createLeadWorker } from "./src/lib/core/queue/lead-sequence-queue.js";
import { orchestrator } from "./src/lib/core/orchestrator.js";
import { getSupabaseServerClient } from "./src/lib/supabase/server.js";
import { getOrchestratorConfigForTenant } from "./src/lib/actions/orchestrator-config.js";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("[WORKER] 🚀 LinkStation Lead Sequence Worker starting...");
console.log(`[WORKER] Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`);

const worker = createLeadWorker(async (job) => {
  const { leadId, tenantId, step, action, transcript, callId } = job.data;

  console.log(`[WORKER] Incoming job ${job.id}: Action: ${action} | Lead: ${leadId}`);

  // Fetch tenant and check spend limits (Circuit Breaker)
  const supabase = await getSupabaseServerClient();
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("daily_spend_limit, current_daily_spend")
      .eq("id", tenantId)
      .single();
    if (tenant && tenant.current_daily_spend >= tenant.daily_spend_limit) {
      console.error(
        `[WORKER] 🔥 CIRCUIT BREAKER ACTIVE: Tenant ${tenantId} exceeded daily spend limit (${tenant.current_daily_spend}/${tenant.daily_spend_limit})`
      );
      return; // Stop processing for this tenant
    }
  }

  // 1. HANDLER: Recurring Watchdog Scan
  if (action === "WATCHDOG_SCAN") {
    const { appointmentWatchdog } =
      await import("./src/lib/core/processors/AppointmentWatchdog.js");
    await appointmentWatchdog.run();
    return;
  }

  // 2. HANDLER: Deep Qualification Analysis
  if (action === "QUALIFY_ANALYSIS") {
    const { qualificationProcessor } =
      await import("./src/lib/core/processors/QualificationProcessor.js");
    await qualificationProcessor.process({ leadId, tenantId, transcript, callId });
    return;
  }

  // 3. HANDLER: Recurring Zoho CRM Polling
  if (action === "ZOHO_POLLING") {
    const { crmPollingProcessor } =
      await import("./src/lib/core/processors/CRMPollingProcessor.js");
    await crmPollingProcessor.run();
    return;
  }

  // 4. HANDLER: Standard Lead Sequence Step (Calls, WhatsApp, Zoho Update)
  if (
    action === "call" ||
    action === "whatsapp" ||
    action === "ai_agent" ||
    action === "zoho" ||
    action === "APPOINTMENT_REMINDER"
  ) {
    try {
      // Sprint 0 tarea 1-01: firma de executeSequenceStep es
      //   (lead: Lead, tenantId: string, sequence: OrchestratorSequenceStep[], stepIndex: number, config: TenantOrchestratorConfig)
      // El job sólo transporta { leadId, tenantId, step, action, ... } — hay que reconstruir lead+sequence+config antes de invocar.
      // ANTES: pasábamos `job.data` como único argumento => el orquestrador recibía un objeto con `id` undefined (job.data.id no existe)
      // y la sequence/config quedaban undefined → ningún paso diferido se ejecutaba. Flujo multi-día roto.
      if (!leadId || !tenantId) {
        console.error(
          `[WORKER] Job ${job.id} sin leadId/tenantId — descarto. data=${JSON.stringify(job.data)}`
        );
        return;
      }

      const { data: lead, error: leadErr } = await supabase
        .from("lead")
        .select("*")
        .eq("id", leadId)
        .single();

      if (leadErr || !lead) {
        console.error(
          `[WORKER] Job ${job.id}: lead ${leadId} no encontrado (tenant ${tenantId}): ${leadErr?.message ?? "no data"}`
        );
        return;
      }

      const config = await getOrchestratorConfigForTenant(tenantId);
      const sequence = config?.sequence;

      if (!sequence || sequence.length === 0) {
        console.warn(`[WORKER] Job ${job.id}: tenant ${tenantId} sin sequence configurada — salto`);
        return;
      }

      const stepIndex = typeof step === "number" ? step : 0;

      await orchestrator.executeSequenceStep(lead, tenantId, sequence, stepIndex, config);
    } catch (err) {
      console.error(`[WORKER] Execution failed for job ${job.id}:`, err);
      throw err; // Re-queue
    }
  }

  // 5. HANDLER: CRM Export / Sync (One by One)
  if (action === "CRM_SYNC") {
    const { crmExportProcessor } = await import("./src/lib/core/processors/CRMExportProcessor.js");
    await crmExportProcessor.exportLead(leadId, tenantId);
    return;
  }
});

// Initialize Cron for Watchdog & Zoho (If running as a background process)
import { setupWatchdogCron, setupZohoCron } from "./src/lib/core/queue/lead-sequence-queue.js";
setupWatchdogCron().catch((err) => console.error("[WORKER] Failed to setup watchdog cron:", err));
setupZohoCron().catch((err) => console.error("[WORKER] Failed to setup zoho cron:", err));

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[WORKER] SIGTERM received. Closing gracefully...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[WORKER] SIGINT received. Closing gracefully...");
  await worker.close();
  process.exit(0);
});
