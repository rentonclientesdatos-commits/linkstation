/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "./feature-flags";
import { buildComplianceDecision } from "./compliance";
import { whatsappBridge, WhatsAppConfig } from "../integrations/whatsapp";

import { ultravoxBridge } from "../integrations/ultravox";
import { getAgentVariants } from "../actions/agents";
import {
  getOrchestratorConfigForTenant,
  TenantOrchestratorConfig,
  OrchestratorSequenceStep,
} from "../actions/orchestrator-config";
import { enqueueLeadStep, LeadSequenceJob } from "./queue/lead-sequence-queue";
import { logOrchestrationStep } from "./scheduler";
import { LeadStageEnum } from "@/lib/schemas/_base";
import type {
  Lead,
  PlannedAction,
  AIAgentVariant,
  Programa,
  VoiceAgent,
  VoiceAgentVariant,
} from "@/types/database";
import { CRMFactory } from "../integrations/crm/factory";
import { TelephonyFactory } from "../integrations/telephony/factory";
import { handleUnreachable } from "./handoff";

/**
 * ORCHESTRATOR CORE v3.0
 * Enterprise-grade lead sequencer with:
 * - Timezone Compliance Guard
 * - BullMQ delayed execution
 * - A/B multi-agent testing with full logging
 * - Round Robin scheduling
 */
export class Orchestrator {
  private static instance: Orchestrator;

  public static getInstance(): Orchestrator {
    if (!Orchestrator.instance) {
      Orchestrator.instance = new Orchestrator();
    }
    return Orchestrator.instance;
  }

  /**
   * POST-QUALIFICATION LOGIC (Miro Flow)
   * - Changes owner to Virginia (Zoho ID: 781577000032471016)
   * - Adds "Cualificado_Virginia" tag
   * - Changes stage to SCHEDULING
   * - Creates Zoho Task for the appointment
   */
  public async handleLeadQualification(leadId: string, tenantId: string, reason: string) {
    console.log(`[ORCHESTRATOR] 🏆 Lead ${leadId} QUALIFIED. Triggering CRM Sync.`);

    const supabase = await getSupabaseServerClient();
    const config = await getOrchestratorConfigForTenant(tenantId);
    const provider = CRMFactory.getProvider(tenantId, config);

    // 1. Get Lead Details
    const { data: lead } = await (supabase.from("lead") as any)
      .select("*")
      .eq("id", leadId)
      .single();
    if (!lead) return;

    try {
      // 2. Update CRM (Owner & Stage)
      const virginiaOwnerId = (config as any).zoho?.ai_owner_id || "781577000032471016";
      await provider.updateLead(lead.id_lead_externo || "", {
        Owner: { id: virginiaOwnerId },
        Etapa: "SCHEDULING",
      });

      // 3. Add Tag
      await provider.addTags(lead.id_lead_externo || "", ["Cualificado_Virginia"]);

      // 4. Round Robin: Assign next advisor
      const nextAdvisorId = await this.getNextAdvisor(tenantId, config);

      // 5. Update Supabase Stage & Advisor
      await (supabase.from("lead") as any)
        .update({
          current_stage: LeadStageEnum.enum.SCHEDULING,
          assigned_advisor_id: nextAdvisorId,
          last_advisor_assignment: new Date().toISOString(),
        })
        .eq("id", leadId);

      // 6. Update Zoho with the selected advisor
      if (nextAdvisorId) {
        await provider.updateLead(lead.id_lead_externo || "", {
          Assigned_Advisor: nextAdvisorId,
        });
      }

      // 5. Create Zoho Task if appointment data exists in metadata
      const meta = lead.metadata || {};
      const fecha = meta.fecha_cita || meta.appointment_date;
      const hora = meta.hora_cita || meta.appointment_time;

      if (fecha && hora) {
        // FORMAT: fecha hora tarea/nombre lead
        const taskSubject = `${fecha} ${hora} Cita Cualificada / ${lead.nombre} ${lead.apellido || ""}`;
        await provider.createTask(lead.id_lead_externo || "", {
          subject: taskSubject,
          description: `Lead cualificado por Virginia. Razón: ${reason}. Curso: ${meta.course_name || "Desconocido"}`,
          dueDate: fecha,
          priority: "High",
        });
        console.log(`[ORCHESTRATOR] ✅ Zoho Task created: ${taskSubject}`);
      }

      await logOrchestrationStep({
        tenantId,
        leadId: lead.id,
        step: 0,
        actionType: "QUALIFICATION",
        result: "SUCCESS",
        metadata: { qualified: true, reason },
      });
    } catch (err) {
      console.error("[ORCHESTRATOR] handleLeadQualification Error:", err);
    }
  }

  // ─── MAIN ENTRY POINTS ─────────────────────────────────────────

  /**
   * Entry point for a new Lead.
   * Reads tenant config sequentially and applies compliance check first.
   */
  public async handleNewLead(leadId: string, tenantId: string) {
    const isNativeEnabled = await isFeatureEnabled(tenantId, "native_orchestrator");
    if (!isNativeEnabled) return;

    const supabase = await getSupabaseServerClient();
    const { data: lead, error } = await (supabase.from("lead" as any) as any)
      .select("*")
      .eq("id", leadId)
      .single();
    if (error || !lead) return;

    // Load tenant's orchestrator config
    const config = await getOrchestratorConfigForTenant(tenantId);

    // ── ENTRY FILTERS ─────────────────────────────────────────
    if (config.entry_filters?.enabled) {
      const { allowed_campaigns, allowed_origins, allowed_countries } = config.entry_filters;

      const matchesCampaign =
        !allowed_campaigns?.length || allowed_campaigns.includes(lead.campana || "");
      const matchesOrigin = !allowed_origins?.length || allowed_origins.includes(lead.origen || "");
      const matchesCountry =
        !allowed_countries?.length || allowed_countries.includes(lead.pais || "");

      if (!matchesCampaign || !matchesOrigin || !matchesCountry) {
        console.log(`[ORCHESTRATOR] 🚫 Lead ${lead.id} filtered out by entry rules.`);
        await logOrchestrationStep({
          tenantId,
          leadId: lead.id,
          step: 0,
          actionType: "SYSTEM",
          result: "SKIPPED",
          metadata: { reason: "Entry Filter: Criteria not met", filters: config.entry_filters },
        });
        return;
      }
    }

    const sequence = config.sequence;

    if (!sequence || sequence.length === 0) {
      console.warn(`[ORCHESTRATOR] No sequence configured for tenant ${tenantId}`);
      return;
    }

    // Execute first step (subsequent steps will be queued by BullMQ)
    await this.executeSequenceStep(lead as Lead, tenantId, sequence, 0, config);
  }

  /**
   * Executes a specific step from a sequence.
   * Called directly (step 1) or by BullMQ Worker (deferred steps).
   */
  public async executeSequenceStep(
    lead: Lead,
    tenantId: string,
    sequence: OrchestratorSequenceStep[],
    stepIndex: number,
    config: TenantOrchestratorConfig
  ) {
    if (stepIndex >= sequence.length) {
      console.log(`[ORCHESTRATOR] Sequence complete for lead ${lead.id}`);
      return;
    }

    // ── SPEND LIMIT CHECK (Circuit Breaker) ───────────────────
    const supabase = await getSupabaseServerClient();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("daily_spend_limit, current_daily_spend")
      .eq("id", tenantId)
      .single();
    const t = tenant as any;
    if (t && t.current_daily_spend >= t.daily_spend_limit) {
      console.error(
        `[ORCHESTRATOR] 🔥 CIRCUIT BREAKER: Spend limit reached for tenant ${tenantId}`
      );
      await logOrchestrationStep({
        tenantId,
        leadId: lead.id,
        step: sequence[stepIndex].step,
        actionType: "SYSTEM",
        result: "SKIPPED",
        metadata: { reason: "Daily Spend Limit Reached (Circuit Breaker)" },
      });
      return;
    }

    // ── RATE LIMITING / PACING CHECK ──────────────────────────
    const canExecute = await this.checkPacing(tenantId, config);
    if (!canExecute) {
      const pacingDelay = (config.scheduling?.slot_pacing_minutes || 5) * 60 * 1000;
      console.log(
        `[ORCHESTRATOR] ⏳ Pacing limit reached for tenant ${tenantId}. Requeuing job with ${pacingDelay / 1000}s delay.`
      );
      await this.queueStep(lead, tenantId, sequence[stepIndex], stepIndex, config, pacingDelay);
      return;
    }

    const step = sequence[stepIndex];
    console.log(`[ORCHESTRATOR] Lead ${lead.id} → Step ${step.step}: ${step.action}`);

    // ── PERSISTENCE SYNC ──────────────────────────────────────
    // Refresh lead status from DB in case it was paused/disabled manually
    const { data: freshLead } = await (supabase.from("lead" as any) as any)
      .select("*")
      .eq("id", lead.id)
      .single();

    if (freshLead && freshLead.is_ai_enabled === false) {
      console.log(`[ORCHESTRATOR] AI disabled for lead ${lead.id}. Stopping sequence.`);
      await logOrchestrationStep({
        tenantId,
        leadId: lead.id,
        step: step.step,
        actionType: "SYSTEM",
        result: "SKIPPED",
        metadata: { reason: "Human Intervention / AI Disabled" },
      });
      return;
    }

    const activeLead = (freshLead as Lead) || lead;

    // ── GLOBAL STOP CONDITION: Qualified / Booked / Discarded ────────
    const stopNow = await this.shouldStopSequence(activeLead);
    if (stopNow) {
      console.log(`[ORCHESTRATOR] Stop condition met for lead ${activeLead.id}. Ending sequence.`);
      await logOrchestrationStep({
        tenantId,
        leadId: activeLead.id,
        step: step.step,
        actionType: "SYSTEM",
        result: "SUCCESS",
        metadata: { reason: "Goal reached (Qualified/Booked)" },
      });
      return;
    }

    // ── INACTIVITY STOP CONDITION: Lead responded & is active ────────────
    // Check for LAST inbound message time.
    // If they responded more than 20 minutes ago, we RESUME.
    const { data: lastMsg } = await (supabase.from("chat_messages") as any)
      .select("created_at")
      .eq("lead_id", activeLead.id)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastMsg) {
      const lastMsgTime = new Date(lastMsg.created_at).getTime();
      const now = Date.now();
      const minutesSinceLastMsg = (now - lastMsgTime) / 1000 / 60;

      if (minutesSinceLastMsg < 20) {
        console.log(
          `[ORCHESTRATOR] Lead ${activeLead.id} is active (responded ${Math.round(minutesSinceLastMsg)}m ago). Pausing sequence.`
        );
        return;
      } else {
        console.log(
          `[ORCHESTRATOR] Lead ${activeLead.id} is silent (${Math.round(minutesSinceLastMsg)}m since last response). Resuming sequence.`
        );
      }
    }

    // ── COMPLIANCE GUARD ──────────────────────────────────────
    const decision = buildComplianceDecision(
      activeLead.telefono || "",
      activeLead.pais || "",
      config.timezone_rules
    );

    if (!decision.canExecuteNow && step.action === "call") {
      console.log(
        `[ORCHESTRATOR] Outside hours for call. Hopping to WhatsApp fallback for lead ${activeLead.id}`
      );
      // Check if we have a whatsapp fallback (usually it's the next step or a standard template)
      await this.executeWhatsAppStep(activeLead, tenantId, {
        ...step,
        action: "whatsapp",
        template: config.scheduling?.reminder_template || "appointment_reminder_es", // Use a template that likely exists
      } as any);
      return;
    }

    if (!decision.canExecuteNow && step.action !== "wait") {
      console.log(`[ORCHESTRATOR] ${decision.reason}`);
      // Queue for next window
      await this.queueStep(activeLead, tenantId, step, stepIndex, config, decision.delayMs);

      await logOrchestrationStep({
        tenantId,
        leadId: activeLead.id,
        step: step.step,
        actionType: step.action.toUpperCase(),
        result: "QUEUED",
        metadata: { scheduledFor: decision.scheduledFor?.toISOString(), reason: decision.reason },
      });
      return;
    }

    // ── EXECUTE STEP ──────────────────────────────────────────
    try {
      switch (step.action) {
        case "call":
          try {
            const callResult = (await this.executeCallStep(
              activeLead,
              tenantId,
              step,
              config
            )) as any;

            // ── INVALID PHONE / FAILED DESTINATION ──────────────────────
            // NEW-13 (ADR-014): número inválido → handleUnreachable
            // (NO crea tarea en CRM cliente — política unificada Bea V1).
            if (
              callResult?.status === "FAILED" ||
              callResult?.last_error?.code === "invalid_destination"
            ) {
              console.log(
                `[ORCHESTRATOR] ❌ Invalid Destination for lead ${activeLead.id}. Marking UNREACHABLE.`
              );
              await handleUnreachable(activeLead.id, "invalid_phone", { tenantId });
              return;
            }

            // ── ESCALATION CHECK: Qualified but no appointment ──────────
            if (config.escalation?.handoff_on_qualified_not_booked) {
              const { data: updatedLead } = await supabase
                .from("lead")
                .select("current_stage, metadata")
                .eq("id", activeLead.id)
                .single();
              const ul = updatedLead as any;
              if (ul && ul.current_stage === "SCHEDULING") {
                if (callResult?.outcome !== "BOOKED") {
                  await this.triggerHumanEscalation(
                    activeLead,
                    tenantId,
                    config,
                    "Qualified Lead - No Appointment Booked"
                  );
                }
              }
            }
          } catch (err: any) {
            console.error(
              `[ORCHESTRATOR] Call failed: ${err.message}. Attempting WhatsApp fallback.`
            );
            await this.executeWhatsAppStep(activeLead, tenantId, {
              ...step,
              action: "whatsapp",
              template: config.scheduling?.reminder_template || "appointment_reminder_es",
            } as any);
          }
          break;
        case "whatsapp":
          await this.executeWhatsAppStep(activeLead, tenantId, step);
          break;
        case "ai_agent":
          await this.executeAIAgentStep(activeLead, tenantId, step, config);
          break;
        case "crm":
        case "zoho": // Backward compat
          await this.executeCRMStep(activeLead, tenantId, step, config);
          break;
        case "retry_sequence":
          await this.executeRetrySequenceStep(activeLead, tenantId, step, stepIndex, config);
          // NOTE: retry_sequence handles its own queuing for the NEXT attempt
          return;
        case "wait":
          console.log(`[ORCHESTRATOR] Wait step, delay already applied.`);
          break;
      }

      // ── QUEUE NEXT STEP ───────────────────────────────────
      const nextIndex = stepIndex + 1;
      if (nextIndex < sequence.length) {
        const nextStep = sequence[nextIndex];
        const delayMs = nextStep.delay_hours * 60 * 60 * 1000;
        await this.queueStep(activeLead, tenantId, nextStep, nextIndex, config, delayMs);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ORCHESTRATOR] Step error:`, errMsg);
      await logOrchestrationStep({
        tenantId,
        leadId: activeLead.id,
        step: step.step,
        actionType: step.action.toUpperCase(),
        result: "FAILED",
        errorMessage: errMsg,
      });
    }
  }

  /**
   * DYNAMIC RESUME: Skips wait if lead is silent or data is captured.
   */
  public async triggerDynamicResume(leadId: string, tenantId: string) {
    console.log(`[ORCHESTRATOR] ⚡ Dynamic Resume triggered for lead ${leadId}`);

    const supabase = await getSupabaseServerClient();
    const { data: lead } = await (supabase.from("lead" as any) as any)
      .select("*")
      .eq("id", leadId)
      .single();
    if (!lead) return;

    // Find the last successful step to know where we are
    const { data: lastLogs } = await (supabase.from("orchestration_logs" as any) as any)
      .select("step_number")
      .eq("lead_id", leadId)
      .eq("result", "SUCCESS")
      .order("created_at", { ascending: false })
      .limit(1);

    const lastStep = lastLogs && lastLogs.length > 0 ? lastLogs[0].step_number : -1;
    const nextIndex = lastStep + 1;

    const config = await getOrchestratorConfigForTenant(tenantId);
    const sequence = config.sequence;

    if (!sequence || nextIndex >= sequence.length) return;

    const nextStep = sequence[nextIndex];

    // If next step is "wait", we might want to skip it if lead was silent
    // But for now, we just execute the next REAL action immediately
    console.log(
      `[ORCHESTRATOR] 🚀 Jumping to step ${nextStep.step} for lead ${leadId} due to data capture.`
    );
    await this.executeSequenceStep(lead as Lead, tenantId, sequence, nextIndex, config);
  }

  /**
   * Legacy/Graph workflow-based execution (for Constructor builder or Webhooks).
   */
  public async executeWorkflow(
    workflowId: string,
    lead: Lead,
    tenantId: string,
    context: Record<string, unknown>,
    triggerNodeId?: string
  ) {
    const supabase = await getSupabaseServerClient();
    const { data: rules } = await (supabase.from("orchestration_rules" as any) as any)
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("is_active", true)
      .order("sequence_order", { ascending: true });

    if (!rules || rules.length === 0) {
      console.warn(
        `[ORCHESTRATOR] No rules found for workflow ${workflowId}${triggerNodeId ? ` and trigger ${triggerNodeId}` : ""}`
      );
      return;
    }
    await this.executeRule(rules[0] as any, lead, tenantId, context);
  }

  // ─── STEP EXECUTORS ───────────────────────────────────────────

  private async executeCallStep(
    lead: Lead,
    tenantId: string,
    step: OrchestratorSequenceStep,
    config: TenantOrchestratorConfig
  ) {
    const supabase = await getSupabaseServerClient();
    const retellConfig = config.retell;
    let fromNumber = retellConfig?.from_number;
    const apiKey = retellConfig?.api_key;

    // 1. Initial Selection (Internal ID from step.agents or step.agentId)
    const { agentId: internalId, variant } = this.selectAgent(step.agents || [], config.ab_testing);

    // Final technical ID to send to Retell
    let technicalAgentId = internalId;
    let selectedPrompt = "";
    let vAgent: any = null;

    // 2. RESOLVE VOICE AGENT (Internal UUID -> Technical Provider ID)
    if (internalId && internalId.includes("-")) {
      const { data } = await supabase
        .from("voice_agents")
        .select("*")
        .eq("id", internalId)
        .single();

      vAgent = data;

      if (vAgent) {
        const voiceAgent = vAgent as VoiceAgent;
        technicalAgentId = voiceAgent.provider_agent_id || internalId;

        // PRIORITIZE AGENT-SPECIFIC NUMBER
        if (voiceAgent.from_number) {
          fromNumber = voiceAgent.from_number;
        }

        // Load Variants for A/B Prompting
        const { data: variants } = await supabase
          .from("voice_agent_variants")
          .select("*")
          .eq("agent_id", voiceAgent.id)
          .order("created_at", { ascending: true });

        if (variants && variants.length > 0) {
          const variantData =
            variants.find((v) => (v as VoiceAgentVariant).is_variant_b === (variant === "B")) ||
            variants[0];
          selectedPrompt = (variantData as VoiceAgentVariant).prompt_text;
        }
      }
    }

    // 3. CONSTRUCT CONTEXT (Miro & n8n compliant)
    const courseContext = await this.getCourseContext(lead.id);

    const dynamicVariables: Record<string, string> = {
      id_lead: lead.id_lead_externo || lead.id,
      user_name: lead.nombre || "Cliente",
      user_phone: lead.telefono || "",
      user_country: lead.pais || "España",
      company_name: config.company_name || "Esden",

      // Course Specifics (from n8n flow)
      master_name: courseContext.course_name || "",
      description_hype: courseContext.description_hype || "",
      price_range: courseContext.price_range || "",
      modalities: courseContext.modalities || "",
      start_dates: courseContext.start_dates || "",
      practices_info: courseContext.practices_info || "",
      extra_benefits: courseContext.extra_benefits || "",

      // Backward compatibility / System
      system_prompt_override: selectedPrompt,
      course_info: courseContext.course_info,
      qualification_rules: courseContext.qualification_rules,
    };

    // 4. INITIATE CALL
    if (lead.origen === "Web Simulator" && !apiKey) {
      console.log(`[ORCHESTRATOR] [MOCK] Simulating call for lead ${lead.id}`);
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      // DETECT PROVIDER
      const provider = (internalId && (vAgent as any)?.provider) || "ULTRAVOX";
      if (provider === "ULTRAVOX" || provider === "RETELL") {
        const uApiKey = (config as any).ultravox?.api_key;
        if (!uApiKey) {
          console.error(`[ORCHESTRATOR] Ultravox API Key missing for tenant ${tenantId}`);
          return;
        }

        // 1. GET JOIN URL FROM ULTRAVOX
        const ultravoxRes = await ultravoxBridge.createAgentCall(
          technicalAgentId as string,
          {
            templateContext: dynamicVariables,
            medium: { twilio: {} }, // Current default for stream
            recordingEnabled: true,
          },
          { apiKey: uApiKey }
        );

        if (!ultravoxRes.join_url) {
          throw new Error("Failed to get join_url from Ultravox");
        }

        // 2. TRIGGER TELEPHONY
        const telephonyProvider = TelephonyFactory.getProvider(config as any);
        const fromNum = fromNumber || (config as any).telephony?.credentials?.fromNumber;

        if (!fromNum) throw new Error("Missing fromNumber for telephony");

        const telRes = await telephonyProvider.triggerCall({
          to: lead.telefono || "",
          from: fromNum,
          joinUrl: ultravoxRes.join_url,
          recordingEnabled: true,
        });

        if (!telRes.success) {
          throw new Error(`Telephony Error: ${telRes.errorMessage}`);
        }

        console.log(
          `[ORCHESTRATOR] Ultravox call triggered via ${(config as any).telephony?.provider}. ID: ${telRes.providerCallId}`
        );
      }
    }

    await logOrchestrationStep({
      tenantId,
      leadId: lead.id,
      step: step.step,
      actionType: "CALL",
      agentUsed: (internalId || technicalAgentId) as string | undefined,
      abVariant: variant,
      result: "SUCCESS",
    });
  }

  private async executeWhatsAppStep(lead: Lead, tenantId: string, step: OrchestratorSequenceStep) {
    const supabase = await getSupabaseServerClient();
    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (!tenant) return;

    const conf = (tenant as any).config;
    const waConfig: WhatsAppConfig = {
      accessToken: conf?.whatsapp?.accessToken,
      phoneNumberId: conf?.whatsapp?.phoneNumberId,
    };

    const template = step.template || "";
    const mappings = step.variableMappings || {};

    // 1. Resolve parameters (Case-insensitive lookup)
    const headerComp = (step as any).templateComponents?.find(
      (c: any) => c.type?.toUpperCase() === "HEADER"
    );

    const components: any[] = [];

    const resolveVal = (val: string) => {
      if (val === "lead.nombre") return lead.nombre || "Cliente";
      if (val === "lead.apellido") return lead.apellido || "";
      if (val === "lead.email") return lead.email || "";
      return val;
    };

    // Header Params
    if (headerComp?.parameters) {
      const hParams = headerComp.parameters.map((p: any) => ({
        type: "text",
        text: resolveVal(p.text),
      }));
      components.push({ type: "header", parameters: hParams });
    }

    // Body Params
    const bodyParams: any[] = [];
    const sortedIndices = Object.keys(mappings).sort((a, b) => parseInt(a) - parseInt(b));

    if (sortedIndices.length > 0) {
      for (const idx of sortedIndices) {
        const paramObj: any = { type: "text", text: resolveVal(mappings[idx]) };
        if (isNaN(Number(idx))) {
          paramObj.parameter_name = idx;
        }
        bodyParams.push(paramObj);
      }
    } else if (lead.nombre) {
      // Minimal safety fallback
      bodyParams.push({ type: "text", text: lead.nombre });
    }

    if (bodyParams.length > 0) {
      components.push({ type: "body", parameters: bodyParams });
    }

    if (lead.origen === "Web Simulator" && !waConfig.accessToken) {
      console.log(
        `[ORCHESTRATOR] [MOCK] Simulating WhatsApp message for lead ${lead.id} with template ${template}`
      );
      await new Promise((r) => setTimeout(r, 800));
    } else {
      if (!waConfig.accessToken || !waConfig.phoneNumberId) {
        console.warn(`[ORCHESTRATOR] WhatsApp credentials missing for tenant ${tenantId}`);
        return;
      }
      await whatsappBridge.sendTemplateMessage(
        lead.telefono || "",
        template,
        "es",
        components,
        waConfig
      );
    }

    await logOrchestrationStep({
      tenantId,
      leadId: lead.id,
      step: step.step,
      actionType: "WHATSAPP",
      result: "SUCCESS",
      metadata: { template, components },
    });
  }

  private async executeCRMStep(
    lead: Lead,
    tenantId: string,
    step: OrchestratorSequenceStep,
    config: TenantOrchestratorConfig
  ) {
    // Step metadata includes the specific mapping and action
    const { type, ownerId, tagName, transitionId, mappings } = (step as any).metadata || {};

    const provider = CRMFactory.getProvider(tenantId, config);

    try {
      switch (type) {
        case "UPDATE_LEAD":
        case "UPDATE_OWNER": {
          // 1. Build Payload using Mappings
          const payload: Record<string, any> = {};

          if (mappings) {
            if (mappings.nombre && lead.nombre) payload[mappings.nombre] = lead.nombre;
            if (mappings.apellido && lead.apellido) payload[mappings.apellido] = lead.apellido;
            if (mappings.email && lead.email) payload[mappings.email] = lead.email;
            if (mappings.telefono && lead.telefono) payload[mappings.telefono] = lead.telefono;
            if (mappings.pais && lead.pais) payload[mappings.pais] = lead.pais;
            if (mappings.origen && lead.origen) payload[mappings.origen] = lead.origen;
          }

          // 2. Add owner if specified
          if (ownerId) payload["Owner"] = { id: ownerId };

          await provider.updateLead(lead.id_lead_externo || "", payload);
          break;
        }
        case "ADD_TAG":
          await provider.addTags(lead.id_lead_externo || "", [tagName]);
          break;
        case "BLUEPRINT":
        case "EXTERNAL_ACTION":
          await provider.executeAction(
            lead.id_lead_externo || "",
            type === "BLUEPRINT" ? "BLUEPRINT" : transitionId,
            { transitionId }
          );
          break;
        case "CREATE_EVENT": {
          const { subject, startTime, durationMinutes, description } = (step as any).metadata || {};
          await provider.createEvent(lead.id_lead_externo || "", {
            subject: subject || "Cita Agendada - Esden",
            startTime: startTime || new Date().toISOString(),
            durationMinutes: durationMinutes || 30,
            description: description || `Cita con ${lead.nombre} ${lead.apellido}`,
          });
          break;
        }
        default:
          console.warn(`[ORCHESTRATOR] Unknown CRM action type: ${type}`);
      }

      await logOrchestrationStep({
        tenantId,
        leadId: lead.id,
        step: step.step,
        actionType: "CRM",
        result: "SUCCESS",
        metadata: { type, tagName, ownerId },
      });
    } catch (err) {
      console.error(`[ORCHESTRATOR] CRM execution error:`, err);
      throw err;
    }
  }

  private async executeAIAgentStep(
    lead: Lead,
    tenantId: string,
    step: OrchestratorSequenceStep,
    config: TenantOrchestratorConfig
  ) {
    const agentIds = step.agents || [];
    const { agentId, variant } = this.selectAgent(agentIds, config.ab_testing);

    if (!agentId) {
      console.warn(`[ORCHESTRATOR] AI Agent step has no agents configured`);
      return;
    }

    // 1. Fetch variants
    const { data: variants } = await getAgentVariants(agentId);

    // Update lead with currently active agent and reset inactivity counter
    const supabase = await getSupabaseServerClient();
    if (lead.ai_agent_id !== agentId) {
      await (supabase.from("lead" as any) as any)
        .update({
          ai_agent_id: agentId,
          inactivity_sent_count: 0,
        })
        .eq("id", lead.id);

      console.log(
        `[ORCHESTRATOR] Lead ${lead.id} assigned to agent ${agentId}. Inactivity counter reset.`
      );
    }

    if (!variants || variants.length === 0) return;

    const promptVariantData = variants[0] as AIAgentVariant;

    // 2. Course Context from DB (v3.0 Native Logic)
    const courseContext = await this.getCourseContext(lead.id);
    const ragContext = ""; // AWS RAG disabled as per user request

    // 3. Prompt Construction with Memory & Stages
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const systemPrompt = `
        ${promptVariantData.prompt_text}
        
        CONTEXTO DEL CURSO (PDF Knowledge Base):
        ${ragContext || courseContext.course_info}
        
        REGLAS DE CUALIFICACIÓN:
        ${courseContext.qualification_rules}
        
        DATOS EXTRAÍDOS DEL LEAD HASTA AHORA:
        ${JSON.stringify(lead.metadata || {})}
        
        ETAPA ACTUAL: ${lead.current_stage || "QUALIFICATION"}
        `;

    // 4. In a real message event, this would be used for the AI Turn.
    // The orchestrator just ensures the agent is assigned and ready.

    await logOrchestrationStep({
      tenantId,
      leadId: lead.id,
      step: step.step,
      actionType: "AI_AGENT",
      agentUsed: agentId,
      abVariant: variant,
      result: "SUCCESS",
      metadata: {
        stage: lead.current_stage,
        promptVersion: promptVariantData.version_label,
      },
    });
  }

  /**
   * Helper to fetch course-specific information and qualification rules.
   * Maps to course_info and qualification_rules variables in the prompt.
   */
  private async getCourseContext(leadId: string): Promise<Record<string, string>> {
    const supabase = await getSupabaseServerClient();

    // 1. Get the programs this lead is interested in
    const { data: leadPrograms } = await (supabase.from("lead_programas" as any) as any)
      .select("id_programa")
      .eq("id_lead", leadId);

    if (!leadPrograms || leadPrograms.length === 0) {
      return {
        course_info: "No hay información de curso específica disponible.",
        qualification_rules: "Criterios generales de cualificación.",
      };
    }

    // 2. Get details for the first/primary program
    const { data: program } = await (supabase.from("programas" as any) as any)
      .select("*")
      .eq("id", leadPrograms[0].id_programa)
      .single();

    if (!program) {
      return {
        course_info: "Programa no encontrado.",
        qualification_rules: "",
      };
    }

    const p = program as Programa;
    const details = [
      p.presentacion && `Presentación: ${p.presentacion}`,
      p.objetivos && `Objetivos: ${p.objetivos}`,
      p.precio && `Precio: ${p.precio}`,
      p.becas_financiacion && `Becas: ${p.becas_financiacion}`,
      p.metodologia && `Metodología: ${p.metodologia}`,
      p.beneficios && `Beneficios: ${p.beneficios}`,
      p.practicas && `Prácticas: ${p.practicas}`,
      p.fechas_inicio && `Fechas de inicio: ${p.fechas_inicio}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      course_name: p.nombre,
      description_hype: p.presentacion || "",
      price_range: p.precio || "",
      modalities: p.metodologia || "",
      start_dates: p.fechas_inicio || "",
      practices_info: p.practicas || "",
      extra_benefits: p.beneficios || "",
      course_info: details || "Sin detalles específicos.",
      qualification_rules:
        p.requisitos_cualificacion || "Cualificación estándar basada en interés y disponibilidad.",
    };
  }

  // ─── A/B AGENT SELECTOR ────────────────────────────────────────

  /**
   * Selects an agent from an array based on A/B split configuration.
   * Returns the selected agent ID and which variant was chosen.
   */
  private selectAgent(
    agents: string[],
    abConfig: TenantOrchestratorConfig["ab_testing"]
  ): { agentId: string | null; variant: "A" | "B" | undefined } {
    if (!agents || agents.length === 0) return { agentId: null, variant: undefined };
    if (agents.length === 1) return { agentId: agents[0], variant: "A" };

    if (abConfig.enabled && agents.length >= 2) {
      const roll = Math.random();
      const isVariantA = roll <= abConfig.split;
      return {
        agentId: isVariantA ? agents[0] : agents[1],
        variant: isVariantA ? "A" : "B",
      };
    }

    return { agentId: agents[0], variant: "A" };
  }

  // ─── QUEUE HELPERS ────────────────────────────────────────────

  private async queueStep(
    lead: Lead,
    tenantId: string,
    step: OrchestratorSequenceStep,
    stepIndex: number,
    config: TenantOrchestratorConfig,
    delayMs: number
  ) {
    const job: LeadSequenceJob = {
      leadId: lead.id,
      tenantId,
      workflowId: "sequence",
      step: stepIndex,
      action: step.action as any,
      template: step.template,
    };

    await enqueueLeadStep(job, delayMs);
    console.log(
      `[ORCHESTRATOR] Queued step ${step.step} for lead ${lead.id} in ${Math.round(delayMs / 1000 / 60)}min`
    );
  }

  // ─── LEGACY SUPPORT (Constructor Builder) ─────────────────────

  private async executeRule(
    rule: any,
    lead: Lead,
    tenantId: string,
    context: Record<string, unknown>
  ) {
    const { action_type, config: conf, workflow_id } = rule;

    const supabase = await getSupabaseServerClient();
    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    const tenantConf = (tenant as any)?.config;

    switch (action_type) {
      case "CALL": {
        const uApiKey = tenantConf?.ultravox?.api_key;
        if (!uApiKey) {
           console.error("Ultravox configuration missing");
           break;
        }
        
        const ultravoxRes = await ultravoxBridge.createAgentCall(
          conf?.agentId,
          {
            templateContext: { lead_id: lead.id },
            medium: { twilio: {} }, 
            recordingEnabled: true,
          },
          { apiKey: uApiKey }
        );
        
        if (ultravoxRes.join_url) {
           const telephonyProvider = TelephonyFactory.getProvider(tenantConf as any);
           const fromNum = tenantConf?.telephony?.credentials?.fromNumber;
           if (fromNum) {
             await telephonyProvider.triggerCall({
               to: lead.telefono || "",
               from: fromNum,
               joinUrl: ultravoxRes.join_url,
               recordingEnabled: true,
             });
           }
        }
        break;
      }
      case "WHATSAPP": {
        const waConfig: WhatsAppConfig = {
          accessToken: tenantConf?.whatsapp?.accessToken,
          phoneNumberId: tenantConf?.whatsapp?.phoneNumberId,
        };

        const template = conf?.templateId || "";
        const mappings = conf?.variableMappings || {};

        const parameters: any[] = [];
        const sortedIndices = Object.keys(mappings).sort((a, b) => parseInt(a) - parseInt(b));

        for (const idx of sortedIndices) {
          let value = mappings[idx];
          if (value === "lead.nombre") value = lead.nombre || "Cliente";
          else if (value === "lead.apellido") value = lead.apellido || "";
          else if (value === "lead.email") value = lead.email || "";

          const paramObj: any = { type: "text", text: value };
          if (isNaN(Number(idx))) {
            paramObj.parameter_name = idx;
          }
          parameters.push(paramObj);
        }

        const components = parameters.length > 0 ? [{ type: "body", parameters: parameters }] : [];

        await whatsappBridge.sendTemplateMessage(
          lead.telefono || "",
          template,
          "es",
          components,
          waConfig
        );
        break;
      }
      case "AI_AGENT": {
        const { data: variants } = await getAgentVariants(conf?.agentId);
        if (variants && variants.length > 0) {
          const v = variants[0] as AIAgentVariant;
          console.log(`[ORCHESTRATOR] AI Agent ${conf?.agentId}: ${v.version_label}`);
        }
        break;
      }
      case "CRM":
      case "ZOHO": {
        const { type, ownerId, tagName, transitionId, mappings } = conf || {};
        const provider = CRMFactory.getProvider(tenantId, tenantConf);
        const extId = lead.id_lead_externo || "";

        if (type === "UPDATE_OWNER" || type === "UPDATE_LEAD") {
          const payload: Record<string, any> = {};
          if (mappings) {
            for (const [key, crmKey] of Object.entries(mappings)) {
              if ((lead as any)[key]) payload[crmKey as string] = (lead as any)[key];
            }
          }
          if (ownerId) payload["Owner"] = { id: ownerId };
          await provider.updateLead(extId, payload);
        } else if (type === "ADD_TAG") await provider.addTags(extId, [tagName]);
        else if (type === "BLUEPRINT" || type === "EXTERNAL_ACTION") {
          await provider.executeAction(extId, type === "BLUEPRINT" ? "BLUEPRINT" : transitionId, {
            transitionId,
          });
        }

        break;
      }
      case "TRIGGER_LINK":
        console.log(`[ORCHESTRATOR] ⚡ Trigger Link Hit. Moving to next step.`);
        break;
      case "CONDITION":
        // Logic handled after switch for branching
        break;
      case "RETRY_SEQUENCE": {
        // Adapt executeRetrySequenceStep for Graph-based config
        const stepAdapter: OrchestratorSequenceStep = {
          step: rule.sequence_order,
          action: "retry_sequence",
          max_attempts: conf?.maxAttempts || 5,
          channels: conf?.channels || ["call", "whatsapp"],
          retry_delay_hours: conf?.retryDelayHours || 27,
          final_status: conf?.finalStatus || "ilocalizable",
          delay_hours: 0,
        };

        const config = await getOrchestratorConfigForTenant(tenantId);
        await this.executeRetrySequenceStep(
          lead,
          tenantId,
          stepAdapter,
          rule.sequence_order,
          config
        );
        // The retry sequence handles its own queuing/completion, so we return here.
        return;
      }
      case "WAIT":
        console.log(`[ORCHESTRATOR] ⏳ Wait rule hit. Metadata logic will handle pauses.`);
        break;
      default:
        console.warn(`[ORCHESTRATOR] Unknown rule action: ${action_type}`);
    }

    // --- BRANCHING LOGIC (v5.0) ---
    let nextOrder: number | null = (rule.sequence_order || 0) + 1;

    if (action_type === "CONDITION") {
      const { condition_variable, condition_operator, condition_value, branches } = conf || {};
      const leadValue =
        (lead as any)[condition_variable] || (lead.metadata as any)?.[condition_variable];

      const isMet = this.evaluateCondition(leadValue, condition_operator, condition_value);
      console.log(
        `[ORCHESTRATOR] Condition Evaluation: ${condition_variable} (${leadValue}) ${condition_operator} ${condition_value} => ${isMet}`
      );

      // Map result to handles: "if" (true) or "else" (false)
      const handle = isMet ? "if" : "else";
      nextOrder = branches?.[handle] ?? null;
    } else {
      // Non-conditional nodes use "default" branch or sequential increment
      const branches = conf?.branches || {};
      nextOrder = branches["default"] ?? conf?.next_step_order ?? (rule.sequence_order || 0) + 1;
    }

    if (nextOrder === null) {
      console.log(
        `[ORCHESTRATOR] Flow reached end or filter (No next step for order ${rule.sequence_order})`
      );
      return;
    }

    // Continue chain with specific next order
    const { data: nextRule } = await (supabase.from("orchestration_rules" as any) as any)
      .select("*")
      .eq("workflow_id", workflow_id)
      .eq("is_active", true)
      .eq("sequence_order", nextOrder)
      .single();

    if (nextRule) {
      await this.executeRule(nextRule, lead, tenantId, context);
    } else {
      console.log(`[ORCHESTRATOR] No rule found with sequence_order ${nextOrder}. Flow stopped.`);
    }
  }

  /**
   * Helper: Evaluate conditions for Filter/Condition nodes
   */
  private evaluateCondition(leadValue: any, operator: string, targetValue: any): boolean {
    const val = String(leadValue ?? "")
      .toLowerCase()
      .trim();
    const target = String(targetValue ?? "")
      .toLowerCase()
      .trim();

    switch (operator) {
      case "equals":
        return val === target;
      case "not_equals":
        return val !== target;
      case "contains":
        return val.includes(target);
      case "is_true":
        return val === "true" || leadValue === true;
      case "is_false":
        return val === "false" || leadValue === false;
      case "exists":
        return !!leadValue && leadValue !== "null" && leadValue !== "undefined";
      default:
        return val === target;
    }
  }

  // Kept for backward compat with sweep API
  public async executePlannedAction(action: PlannedAction) {
    const lead = (action as any).lead as Lead;
    if (!lead) return;

    const config = await getOrchestratorConfigForTenant(action.tenant_id);
    const step: OrchestratorSequenceStep = {
      step: 1,
      action: action.action_type.toLowerCase() as any,
      agents: [(action.config as any)?.agentId].filter(Boolean),
      template: (action.config as any)?.templateId,
      delay_hours: 0,
    };

    await this.executeSequenceStep(lead, action.tenant_id, [step], 0, config);
  }

  /**
   * Resolves the best timezone for a lead based on metadata or country
   */
  private getLeadTimezone(lead: any): string {
    if (lead.metadata?.timezone) return lead.metadata.timezone;

    const countryMap: Record<string, string> = {
      bolivia: "America/La_Paz",
      méxico: "America/Mexico_City",
      mexico: "America/Mexico_City",
      colombia: "America/Bogota",
      argentina: "America/Argentina/Buenos_Aires",
      chile: "America/Santiago",
      perú: "America/Lima",
      peru: "America/Lima",
      ecuador: "America/Guayaquil",
      panamá: "America/Panama",
      panama: "America/Panama",
      españa: "Europe/Madrid",
      spain: "Europe/Madrid",
    };

    const country = (lead.pais || "").toLowerCase().trim();
    return countryMap[country] || "Europe/Madrid";
  }

  /**
   * Automated Appointment Reminder Logic
   */
  public async handleAppointmentReminder(
    leadId: string,
    tenantId: string,
    appointmentId: string,
    template: string
  ) {
    const supabase = await getSupabaseServerClient();
    const { data: lead } = await (supabase.from("lead" as any) as any)
      .select("*")
      .eq("id", leadId)
      .single();
    const { data: appointment } = await (supabase.from("appointments" as any) as any)
      .select("*, advisor:advisors(*)")
      .eq("id", appointmentId)
      .single();

    if (!lead || !appointment || appointment.status === "CANCELLED") {
      console.log(
        `[ORCHESTRATOR] Reminder skipped: Appointment ${appointmentId} cancelled or lead not found.`
      );
      return;
    }

    // 1. Resolve Timezone for the Lead
    const leadTZ = this.getLeadTimezone(lead);
    console.log(`[ORCHESTRATOR] Formatting reminder for lead in ${leadTZ} (Country: ${lead.pais})`);

    // 2. Format Date for template using Lead's Timezone
    const dateObj = new Date(appointment.scheduled_at);
    const formattedDate =
      dateObj.toLocaleString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: leadTZ,
      }) + (leadTZ !== "Europe/Madrid" ? ` (hora de ${lead.pais || "su país"})` : "");

    // Resolve Course Name
    const courseCtx = await this.getCourseContext(leadId);

    const step: OrchestratorSequenceStep = {
      step: 99,
      action: "whatsapp",
      template: template,
      delay_hours: 0,
      variableMappings: {
        "1": lead.nombre || "Estudiante",
        "2": courseCtx.course_name || "su programa de interés",
        "3": formattedDate,
        "4": appointment.advisor?.name || "un asesor de admisiones",
      },
    };

    await this.executeWhatsAppStep(lead as Lead, tenantId, step);

    await (supabase.from("appointments" as any) as any)
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", appointmentId);

    console.log(`[ORCHESTRATOR] ✅ Reminder sent for appointment ${appointmentId}`);
  }

  /**
   * Checks if the tenant has capacity to send another message in the current slot
   */
  private async checkPacing(tenantId: string, config: TenantOrchestratorConfig): Promise<boolean> {
    const pacing = config.scheduling;
    if (!pacing || !pacing.messages_per_slot) return true;

    const supabase = await getSupabaseServerClient();
    const now = new Date();
    const slotStart = new Date(
      now.getTime() - pacing.slot_pacing_minutes * 60 * 1000
    ).toISOString();

    const { count } = await (supabase.from("orchestration_logs" as any) as any)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("action_type", ["WHATSAPP", "CALL"])
      .gte("executed_at", slotStart);

    return (count || 0) < pacing.messages_per_slot;
  }

  /**
   * Triggers human escalation based on config.
   */
  private async triggerHumanEscalation(
    lead: Lead,
    tenantId: string,
    config: TenantOrchestratorConfig,
    reason: string
  ) {
    console.log(`[ORCHESTRATOR] 🚨 Triggering Escalation for Lead ${lead.id}. Reason: ${reason}`);

    const esc = config.escalation;
    const supabase = await getSupabaseServerClient();

    // 1. Mark lead as "Handed Off"
    await (supabase as any)
      .from("lead")
      .update({
        is_handed_off: true,
        handoff_reason: reason,
        assigned_advisor_id: null, // Release for manual pickup
      })
      .eq("id", lead.id);

    // 2. Notify CRM (Task creation)
    if (esc?.notify_crm) {
      try {
        const provider = CRMFactory.getProvider(tenantId, config);
        await provider.executeAction(lead.id_lead_externo || "", "CREATE_TASK", {
          subject: `Derivación Humana: ${reason}`,
          description: `El lead necesita atención humana inmediata. Razón: ${reason}. Ver en Dashboard: https://app.linkstation.ai/dashboard/historial/${lead.id}`,
          priority: "High",
        });
      } catch (e) {
        console.error("[ORCHESTRATOR] CRM Handoff Failed:", e);
      }
    }

    // 3. Notify via WhatsApp to Sales Human
    if (esc?.notify_human_whatsapp) {
      try {
        // Get a WhatsApp provider (Twilio or Meta)
        const telephony = TelephonyFactory.getProvider(config as any);
        await (telephony as any).sendMessage?.(
          esc.notify_human_whatsapp,
          `ALERTA DERIVACIÓN HUMANA: Lead ${lead.nombre} ${lead.apellido} necesita atención. Razón: ${reason}`
        );
      } catch (e) {
        console.error("[ORCHESTRATOR] WA Handoff Failed:", e);
      }
    }

    await logOrchestrationStep({
      tenantId,
      leadId: lead.id,
      step: 0,
      actionType: "SYSTEM",
      result: "SUCCESS",
      metadata: { escalation: true, reason },
    });
  }

  // ─── SMART RETRY SEQUENCE LOGIC ───────────────────────────────

  /**
   * Executes a retry sequence (e.g., 5 calls every 27 hours).
   * Stops automatically if goal is reached.
   * v5.2: Alternates channels and respects business hours.
   */
  private async executeRetrySequenceStep(
    lead: Lead,
    tenantId: string,
    step: OrchestratorSequenceStep,
    stepIndex: number,
    config: TenantOrchestratorConfig
  ) {
    const supabase = await getSupabaseServerClient();
    const meta = lead.metadata || {};
    const currentAttempt = (meta.sequence_attempts as number) || 0;
    const maxAttempts = step.max_attempts || 5;
    const channels = step.channels || ["call", "whatsapp"];
    const retryDelayHours = step.retry_delay_hours || 27;
    const lastChannel = meta.last_sequence_channel as string | undefined;

    console.log(`[RETRY-SEQ] Lead ${lead.id} | Attempt ${currentAttempt + 1}/${maxAttempts}`);

    // 1. Compliance & Timezone Check
    const tzRules = config.timezone_rules || {
      start: "09:00",
      end: "20:00",
      working_days: [1, 2, 3, 4, 5],
    };
    const decision = buildComplianceDecision(lead.telefono, lead.pais, tzRules);

    console.log(`[RETRY-SEQ] Compliance for lead ${lead.id}: ${decision.reason}`);

    // 2. Determine Channel (Alternating logic based on last used channel)
    let channelToUse: "call" | "whatsapp";
    const possibleChannels = channels as ("call" | "whatsapp")[];

    if (!lastChannel) {
      // First attempt: Default to first channel in list (usually "call")
      channelToUse = possibleChannels[0];
    } else {
      // Alternate: Find the next channel in the list
      const lastIdx = channels.indexOf(lastChannel as any);
      channelToUse = possibleChannels[(lastIdx + 1) % possibleChannels.length];
    }

    // 3. Execution Logic
    if (decision.canExecuteNow) {
      // ─── WITHIN HOURS ───
      if (channelToUse === "call") {
        await this.executeCallStep(lead, tenantId, step, config);
      } else {
        await this.executeWhatsAppStep(lead, tenantId, step);
      }

      const nextAttempt = currentAttempt + 1;
      await (supabase.from("lead" as any) as any)
        .update({
          metadata: {
            ...meta,
            sequence_attempts: nextAttempt,
            last_sequence_channel: channelToUse,
          },
        })
        .eq("id", lead.id);

      if (nextAttempt < maxAttempts) {
        const delayMs = retryDelayHours * 60 * 60 * 1000;
        await this.queueStep(lead, tenantId, step, stepIndex, config, delayMs);
      } else {
        await this.finishRetrySequence(lead, tenantId, step, config);
      }
    } else {
      // ─── OUT OF HOURS: Night Bridge Logic ───
      console.log(`[RETRY-SEQ] Out of hours for lead ${lead.id}. Applying Night Bridge.`);

      // User requirement: If night, send WA. If no response, morning Call.
      if (channels.includes("whatsapp")) {
        console.log(`[RETRY-SEQ] Night Bridge: Sending WA for lead ${lead.id}`);
        await this.executeWhatsAppStep(lead, tenantId, step);
        channelToUse = "whatsapp"; // Record that we used WA
      }

      const nextAttempt = currentAttempt + 1;
      await (supabase.from("lead" as any) as any)
        .update({
          metadata: {
            ...meta,
            sequence_attempts: nextAttempt,
            last_sequence_channel: channelToUse,
          },
        })
        .eq("id", lead.id);

      // Queue for the MORNING (decision.scheduledFor)
      if (nextAttempt < maxAttempts) {
        const delayMs = decision.delayMs;
        await this.queueStep(lead, tenantId, step, stepIndex, config, delayMs);
      }
    }
  }

  private async finishRetrySequence(
    lead: Lead,
    tenantId: string,
    _step: OrchestratorSequenceStep,
    _config: TenantOrchestratorConfig
  ) {
    // NEW-13 (ADR-014): tras agotar intentos → handleUnreachable.
    // NO se actualiza CRM cliente (Bea V1: asesores no deben recibir tareas
    // de ilocalizables). Si el cliente quiere visibilidad, consulta nuestra BD.
    console.log(`[RETRY-SEQ] Max attempts reached for lead ${lead.id}. Marking UNREACHABLE.`);
    await handleUnreachable(lead.id, "max_attempts_exceeded", { tenantId });
  }

  /**
   * Checks if a lead has reached its goal, to stop the sequence.
   */
  private async shouldStopSequence(lead: Lead): Promise<boolean> {
    if (["SCHEDULING", "CLOSED", "LOST", "COMPLETED"].includes(lead.current_stage || "")) {
      return true;
    }

    const meta = lead.metadata || {};
    if (meta.status === "QUALIFIED" || meta.status === "BOOKED" || meta.status === "DISCARDED") {
      return true;
    }

    const supabase = await getSupabaseServerClient();
    const { count } = await (supabase.from("agendamientos" as any) as any)
      .select("*", { count: "exact", head: true })
      .eq("id_lead", lead.id);

    return (count && count > 0) || false;
  }

  /**
   * Round Robin: Fetches the next advisor in the rotation.
   */
  private async getNextAdvisor(
    tenantId: string,
    config: TenantOrchestratorConfig
  ): Promise<string | null> {
    const advisors = config.advisors || [];
    if (advisors.length === 0) return null;
    if (advisors.length === 1) return advisors[0];

    const supabase = await getSupabaseServerClient();

    const { data: lastLeads } = await (supabase.from("lead" as any) as any)
      .select("assigned_advisor_id")
      .eq("tenant_id", tenantId)
      .not("assigned_advisor_id", "is", null)
      .order("last_advisor_assignment", { ascending: false })
      .limit(1);

    const lastId = lastLeads && lastLeads.length > 0 ? lastLeads[0].assigned_advisor_id : null;
    if (!lastId) return advisors[0];

    const currentIndex = advisors.indexOf(lastId);
    const nextIndex = (currentIndex + 1) % advisors.length;

    return advisors[nextIndex];
  }
}

export const orchestrator = Orchestrator.getInstance();
