/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * src/lib/core/processors/InstagramAIProcessor.ts
 *
 * Instagram AI Processor — CEREBRO para DMs de Instagram
 * Mirrors the WhatsAppAIProcessor but uses Instagram as the reply channel.
 *
 * Flow:
 *   1. Load lead context, AI variant, knowledge base
 *   2. Build system prompt with conversation history
 *   3. Call OpenAI with tools (appointments, etc.)
 *   4. Send reply via Instagram Messenger API
 *   5. Save to chat_messages + update conversaciones_instagram
 */

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { instagramClient } from "@/lib/integrations/instagram/client";
import OpenAI from "openai";
import { ChatMemoryService } from "@/lib/services/chat-memory";
import { KnowledgeBaseService, ChatSummaryService } from "@/lib/services/knowledge-base";
import { FactExtractionService } from "@/lib/services/fact-extractor";
import { GlobalLogger } from "../logger";
import { getAuthServiceRoleKey } from "@/lib/auth-config";

// ─── Admin Supabase ────────────────────────────────────────────────────────────

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing Supabase configuration (SUPABASE_URL)");
  const key = getAuthServiceRoleKey();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Main AI Response Function ────────────────────────────────────────────────

export async function generateAIInstagramResponse(
  tenantId: string,
  leadId: string,
  senderIgsid: string,
  incomingMessage: string,
  pageAccessToken: string,
  igAccountId: string
) {
  if (!incomingMessage) return;

  const startTime = Date.now();

  try {
    const supabase = getAdminSupabase();
    await GlobalLogger.info(tenantId, "INSTAGRAM", `AI thinking for lead ${leadId}`, {
      message: incomingMessage,
    });

    // 1. Get Lead Context
    const { data: lead } = await supabase.from("lead").select("*").eq("id", leadId).single();
    if (!lead) return;

    const leadAny = lead as any;
    const agentId = leadAny.ai_agent_id;

    // 2. Find AI Variant (same priority as WhatsApp)
    let variantQuery = supabase
      .from("ai_agent_variants")
      .select("*")
      .eq("is_active", true)
      .neq("prompt_text", "")
      .not("api_key", "is", null)
      .order("is_variant_b", { ascending: true })
      .order("updated_at", { ascending: false });

    if (agentId) {
      variantQuery = variantQuery.eq("agent_id", agentId);
    } else {
      const { data: tenantAgents } = await supabase
        .from("ai_agents")
        .select("id")
        .eq("tenant_id", tenantId);
      const agentIds = (tenantAgents || []).map((a: any) => a.id);
      variantQuery = variantQuery.in("agent_id", agentIds);
    }

    const { data: variants } = await variantQuery;

    if (!variants || (variants as any[]).length === 0) {
      console.warn(`[IG AI PROCESSOR] No active variant for lead ${leadId}`);
      return;
    }

    const activeVariant = (variants as any[])[0];
    const apiKey =
      activeVariant.api_key && activeVariant.api_key !== "your_api_key_here"
        ? activeVariant.api_key
        : process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === "your_api_key_here") {
      console.error(`[IG AI PROCESSOR] Missing OpenAI key for lead ${leadId}`);
      return;
    }

    // 3. Fetch context in parallel
    const [recentHistory, chatSummary, localKnowledge] = await Promise.all([
      ChatMemoryService.getRecentContext(leadId).catch(() => []),
      ChatSummaryService.getSummary(leadId).catch(() => null),
      (async () => {
        try {
          const openai = new OpenAI({ apiKey });
          const embedRes = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: incomingMessage,
          });
          const embedding = embedRes.data[0].embedding;
          const kbIds = (activeVariant.knowledge_base_ids as string[]) || [];
          const kbResults = await KnowledgeBaseService.search(tenantId, embedding, 0.25, 5, kbIds);
          return kbResults.map((r) => `- ${r.content}`).join("\n");
        } catch {
          return "";
        }
      })(),
    ]);

    // 4. Typing indicator
    await instagramClient.sendTypingIndicator(senderIgsid, { pageAccessToken, igAccountId });

    // 5. Build prompt
    const conversationContext = recentHistory
      .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
      .join("\n");

    const now = new Date();
    const variableMap: Record<string, string> = {
      nombre: leadAny.nombre || "usuario",
      email: leadAny.email || "",
      telefono: leadAny.telefono || "",
      fecha: now.toLocaleDateString("es-ES"),
      hora: now.toLocaleTimeString("es-ES"),
      now: now.toLocaleString("es-ES"),
      canal: "Instagram",
    };

    // Overlay metadata variables
    Object.entries(leadAny.metadata || {}).forEach(([k, val]) => {
      variableMap[k.replace(/[{}]/g, "").trim()] = String(val);
    });

    // Overlay variant dynamic variables
    Object.entries((activeVariant.dynamic_variables as Record<string, string>) || {}).forEach(
      ([k, val]) => {
        variableMap[k.replace(/[{}]/g, "").trim()] = String(val);
      }
    );

    let finalPrompt = activeVariant.prompt_text as string;
    Object.keys(variableMap).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      finalPrompt = finalPrompt.replace(regex, String(variableMap[key] ?? ""));
    });

    const systemPrompt = `${finalPrompt}

### CANAL DE COMUNICACIÓN:
Estás respondiendo en INSTAGRAM DIRECT MESSAGES. Adapta el tono y formato para Instagram:
- Mensajes concisos y directos
- Usa emojis con moderación para dar calidez
- Evita listas largas con bullets; usa texto corrido cuando sea posible
- Nunca respondas con markdown complejo (sin headers ###, sin negritas con **)

### DATOS DEL USUARIO:
- Nombre: ${variableMap.nombre}
- Instagram ID: ${senderIgsid}

### BASE DE CONOCIMIENTO:
${localKnowledge || "No hay información adicional específica."}

### RESUMEN DE CONVERSACIÓN PREVIA:
${chatSummary || "Primera interacción."}

### CONTEXTO RECIENTE:
${conversationContext || "No hay mensajes previos."}`;

    // 6. Build tools (appointment booking)
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Agendar una cita con un asesor.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
              time: { type: "string", description: "Hora (HH:MM)" },
              notes: { type: "string", description: "Notas adicionales" },
            },
            required: ["date", "time"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Consultar huecos libres para citas.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Fecha a consultar" },
            },
          },
        },
      },
    ];

    // 7. Call OpenAI
    const openai = new OpenAI({ apiKey });
    const modelName = activeVariant.model_name || "gpt-4o";
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: incomingMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 400,
    });

    let aiMessage = completion.choices[0]?.message;
    const tokenUsage = {
      prompt_tokens: completion.usage?.prompt_tokens ?? 0,
      completion_tokens: completion.usage?.completion_tokens ?? 0,
      total_tokens: completion.usage?.total_tokens ?? 0,
    };

    // 8. Handle tool calls (max 2 rounds)
    let toolRounds = 0;
    while (aiMessage?.tool_calls && toolRounds < 2) {
      toolRounds++;
      messages.push(aiMessage);

      const { AppointmentService } = await import("@/lib/services/appointment-service");

      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.type !== "function") continue;
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result = "";

        try {
          if (name === "book_appointment") {
            const appt = await AppointmentService.bookAppointment(
              tenantId,
              leadId,
              args.date,
              args.time,
              args.notes
            );
            // Auto-qualify lead
            await (supabase.from("lead") as any)
              .update({ tipo_lead: "CUALIFICADO", segmentacion: "AGENDADO" })
              .eq("id", leadId);
            result = JSON.stringify({ success: true, appointment: appt });
          } else if (name === "check_availability") {
            const res = await AppointmentService.checkAvailability(
              tenantId,
              args.date,
              "Europe/Madrid"
            );
            result = JSON.stringify(res);
          }
        } catch (e: any) {
          result = JSON.stringify({ error: e.message });
        }

        messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }

      const nextCompletion = await openai.chat.completions.create({
        model: modelName,
        messages,
        temperature: 0.7,
      });
      aiMessage = nextCompletion.choices[0]?.message;
      tokenUsage.prompt_tokens += nextCompletion.usage?.prompt_tokens ?? 0;
      tokenUsage.completion_tokens += nextCompletion.usage?.completion_tokens ?? 0;
      tokenUsage.total_tokens += nextCompletion.usage?.total_tokens ?? 0;
    }

    const aiResponse = aiMessage?.content || "";
    if (!aiResponse) return;

    // 9. Update memory
    await ChatMemoryService.addMessage(leadId, "user", incomingMessage);
    await ChatMemoryService.addMessage(leadId, "assistant", aiResponse);

    // 10. Natural typing delay
    const typingDuration = Math.max(1000, Math.min(4000, aiResponse.length * 25));
    const elapsed = Date.now() - startTime;
    if (elapsed < typingDuration) {
      await new Promise((resolve) => setTimeout(resolve, typingDuration - elapsed));
    }

    // 11. Send reply via Instagram
    await instagramClient.sendTextMessage(senderIgsid, aiResponse, {
      pageAccessToken,
      igAccountId,
    });

    // 12. Save outbound message to DB
    await (supabase.from("chat_messages") as any).insert({
      tenant_id: tenantId,
      lead_id: leadId,
      direction: "OUTBOUND",
      message_type: "TEXT",
      content: aiResponse,
      sent_by: "AI_AGENT",
      status: "SENT",
      metadata: {
        channel: "instagram",
        model: modelName,
        token_usage: tokenUsage,
      },
    });

    // 13. Update or create conversaciones_instagram record
    try {
      const { data: existingConv } = await (supabase.from("conversaciones_instagram") as any)
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("id_lead", leadId)
        .maybeSingle();

      if (existingConv?.id) {
        await (supabase.from("conversaciones_instagram") as any)
          .update({ fecha_ultimo_mensaje: new Date().toISOString(), estado: "ACTIVA" })
          .eq("id", existingConv.id);
      } else {
        await (supabase.from("conversaciones_instagram") as any).insert({
          tenant_id: tenantId,
          id_lead: leadId,
          ig_igsid: senderIgsid,
          fecha_ultimo_mensaje: new Date().toISOString(),
          estado: "ACTIVA",
        });
      }

      // Bump lead to top of inbox
      await supabase
        .from("lead")
        .update({ fecha_actualizacion: new Date().toISOString() } as never)
        .eq("id", leadId);
    } catch (e) {
      console.warn("[IG AI PROCESSOR] Failed to update conversation record:", e);
    }

    // 14. Fact extraction (async, fire-and-forget)
    const trackedVars = (activeVariant.tracked_variables as string[]) || [];
    const dialogueForExtraction = `Usuario: ${incomingMessage}\nAsistente: ${aiResponse}`;
    FactExtractionService.extractFromDialogue(
      leadId,
      dialogueForExtraction,
      trackedVars,
      apiKey,
      tenantId,
      { AGENT_MESSAGE: aiResponse.substring(0, 500), CHANNEL: "instagram" }
    ).catch(() => {});

    await GlobalLogger.info(tenantId, "INSTAGRAM", `Response sent to ${senderIgsid}`, {
      response: aiResponse.substring(0, 100),
    });
  } catch (err: any) {
    await GlobalLogger.error(tenantId, "INSTAGRAM", `Critical error: ${err.message}`, {
      stack: err.stack,
    });
    console.error("[IG AI PROCESSOR] ❌ Critical error:", err.message);
  }
}
