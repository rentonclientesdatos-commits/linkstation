/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { whatsappBridge } from "../../integrations/whatsapp";
import OpenAI from "openai";
import { ChatMemoryService } from "@/lib/services/chat-memory";
import { KnowledgeBaseService, ChatSummaryService } from "@/lib/services/knowledge-base";
import { FactExtractionService } from "@/lib/services/fact-extractor";
import { GlobalLogger } from "../logger";
import { getTimezoneByCountry } from "@/lib/utils/timezones";
import { resolveCountryFromPhone } from "@/lib/utils/location-client";
import { ensurePlusPrefix } from "@/lib/utils/phone-helper";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import {
  isTimeWithinOperatingHours,
  formatOperatingHoursText,
  formatDaysText,
} from "@/lib/utils/operating-hours";

/**
 * WHATSAPP AI PROCESSOR (CEREBRO v3.0)
 * Consolidates Redis Memory, PGVector Knowledge, and Dynamic Variables.
 * No AWS dependencies.
 */

export async function generateAIWhatsAppResponse(
  tenantId: string,
  leadId: string,
  incomingMessage: string,
  incomingMessageId?: string
) {
  if (!incomingMessage) return;

  const startTime = Date.now();
  try {
    const supabase = getAdminSupabase();
    await GlobalLogger.info(tenantId, "WHATSAPP", `Thinking started for lead ${leadId}`, {
      message: incomingMessage,
    });

    // 0. Deduplication check - Handled by Webhook Processor to avoid self-blocking

    // 0. Deduplication check - Handled by Webhook Processor to avoid self-blocking

    // 1. Get Lead Context
    const { data: lead } = await supabase.from("lead").select("*").eq("id", leadId).single();
    if (!lead) return;

    // 2. Identify Active Agent & Variant
    const agentId = (
      lead as unknown as {
        ai_agent_id?: string;
        pais?: string;
        telefono?: string;
        nombre?: string;
        email?: string;
        metadata?: Record<string, unknown>;
      }
    ).ai_agent_id;

    let variantQuery = supabase
      .from("ai_agent_variants")
      .select("*")
      .eq("is_active", true)
      .neq("prompt_text", "")
      .not("api_key", "is", null)
      .order("is_variant_b", { ascending: true }) // Prioriza Variant A (false) sobre B (true)
      .order("updated_at", { ascending: false });

    if (agentId) {
      variantQuery = variantQuery.eq("agent_id", agentId);
    } else {
      // Fallback to first active variant of the tenant
      const { data: tenantAgents } = await supabase
        .from("ai_agents")
        .select("id")
        .eq("tenant_id", tenantId);
      const agentIds = (tenantAgents || []).map((a: { id: string }) => a.id);
      variantQuery = variantQuery.in("agent_id", agentIds);
    }

    let { data: variants } = await variantQuery;

    if (
      !variants ||
      (
        variants as unknown as {
          id?: string;
          api_key?: string;
          knowledge_base_ids?: string[];
          tracked_variables?: string[];
          dynamic_variables?: Record<string, string>;
          prompt_text?: string;
          model_name?: string;
        }[]
      ).length === 0
    ) {
      console.warn(
        `[AI PROCESSOR] ⚠️ No active AI variant with prompt found for lead ${leadId}. Checking for ANY variant...`
      );

      // Second attempt: just ANY variant with a prompt
      const { data: anyVariants } = await (
        supabase.from("ai_agent_variants" as unknown as string) as any
      )
        .select("*")
        .eq("agent_id", agentId || "")
        .neq("prompt_text", "")
        .limit(1);

      if (!anyVariants || anyVariants.length === 0) {
        console.error(
          `[AI PROCESSOR] ❌ CRITICAL: No variants with prompt_text found for agent ${agentId}`
        );
        return;
      }
      variants = anyVariants;
    }

    // Si hay varias, intentamos elegir la que tenga prompt_text más largo o simplemente la primera (que por el orden será Variant A si existe)
    const activeVariant = (
      variants as unknown as {
        id?: string;
        api_key?: string;
        knowledge_base_ids?: string[];
        tracked_variables?: string[];
        dynamic_variables?: Record<string, string>;
        prompt_text?: string;
        model_name?: string;
      }[]
    )[0];
    const apiKey =
      activeVariant.api_key && activeVariant.api_key !== "your_api_key_here"
        ? activeVariant.api_key
        : process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === "your_api_key_here") {
      await GlobalLogger.error(tenantId, "WHATSAPP", `Missing OpenAI API Key for lead ${leadId}`);
      console.error(
        `[AI PROCESSOR] ❌ OpenAI API Key missing both in Variant and System Env for lead ${leadId}`
      );
      return;
    }

    await GlobalLogger.info(
      tenantId,
      "WHATSAPP",
      `API Key verified, using variant ${activeVariant.id}`
    );

    const { AppointmentService } = await import("@/lib/services/appointment-service");

    // 3-5. Fetch all context data in parallel to reduce latency
    console.log(`[AI PROCESSOR] ⚡ Fetching context data and credentials in parallel...`);
    const [
      recentHistory,
      chatSummary,
      localKnowledge,
      tenantData,
      leadAppointments,
      leadProgramsData,
      allProgramsData,
      menuProductsData,
      kbDocumentsData,
    ] = await Promise.all([
      // 3. Get Recent Context from DB (last 10 messages)
      ChatMemoryService.getRecentContext(leadId).catch((err) => {
        console.warn("[AI PROCESSOR] Memory fetch skipped:", err);
        return [];
      }),
      // 4. Get Long-Term Memory (SQL Summary)
      ChatSummaryService.getSummary(leadId).catch((err) => {
        console.warn("[AI PROCESSOR] Summary fetch skipped:", err);
        return null;
      }),
      // 5. Get Local Knowledge (PGVector)
      (async () => {
        try {
          const openai = new OpenAI({ apiKey });
          let searchQuery = incomingMessage;
          const lowerMsg = incomingMessage.toLowerCase();
          if (
            lowerMsg.includes("delivery") ||
            lowerMsg.includes("carta") ||
            lowerMsg.includes("menu") ||
            lowerMsg.includes("menú") ||
            lowerMsg.includes("pedir") ||
            lowerMsg.includes("precio") ||
            lowerMsg.includes("plato") ||
            lowerMsg.includes("comida") ||
            lowerMsg.includes("reserva")
          ) {
            searchQuery = `${incomingMessage} carta menú precios platos bebidas delivery`;
          }

          const embedRes = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: searchQuery,
          });
          const embedding = embedRes.data[0].embedding;
          const kbIds =
            (
              activeVariant as unknown as {
                id?: string;
                api_key?: string;
                knowledge_base_ids?: string[];
                tracked_variables?: string[];
                dynamic_variables?: Record<string, string>;
                prompt_text?: string;
                model_name?: string;
              }
            ).knowledge_base_ids || [];
          const kbResults = await KnowledgeBaseService.search(tenantId, embedding, 0.25, 6, kbIds);
          return kbResults.map((r) => `- ${r.content}`).join("\n");
        } catch (kbErr) {
          console.warn("[AI PROCESSOR] KB search skipped/failed:", kbErr);
          return "";
        }
      })(),
      // 6. Get Tenant WhatsApp Config
      supabase.from("tenants").select("config").eq("id", tenantId).single(),
      // 7. Get Lead Appointments
      AppointmentService.getLeadAppointments(leadId).catch((err) => {
        console.warn("[AI PROCESSOR] Appointments fetch skipped:", err);
        return [];
      }),
      // 8. Get Lead Programs Requirements (and all programs to prevent hallucination)
      (supabase.from("lead_programas") as any)
        .select("programas(nombre, requisitos_cualificacion)")
        .eq("id_lead", leadId),
      (supabase.from("programas") as any).select("nombre").eq("tenant_id", tenantId),
      // 9. Get Active Menu Products (Structured Carta)
      (supabase.from("menu_products") as any)
        .select("id, name, description, category, price, preparation_time, allergens")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category"),
      // 10. Get Knowledge Base Documents (PDF files, Carta, etc.)
      (async () => {
        try {
          const { data: docs } = await supabase
            .from("knowledge_base")
            .select("id, name, description, file_url, file_key")
            .eq("tenant_id", tenantId);
          return (docs || []) as Array<{
            id: string;
            name: string;
            description?: string;
            file_url?: string;
            file_key?: string;
          }>;
        } catch (kbDocsErr) {
          console.warn("[AI PROCESSOR] KB Documents fetch skipped:", kbDocsErr);
          return [];
        }
      })(),
    ]);

    const leadPrograms =
      (leadProgramsData?.data as {
        programas?: { nombre: string; requisitos_cualificacion: string };
      }[]) || [];
    const allPrograms = (allProgramsData?.data as { nombre: string }[]) || [];
    const allProgramNames = allPrograms
      .map((p) => p.nombre)
      .filter(Boolean)
      .join(", ");

    let programRequirements = leadPrograms
      .filter((p) => p.programas?.requisitos_cualificacion)
      .map((p) => `### ${p.programas?.nombre}:\n${p.programas?.requisitos_cualificacion}`)
      .join("\n\n");

    if (allProgramNames) {
      programRequirements += `\n\nCURSOS DISPONIBLES EN LA INSTITUCIÓN: ${allProgramNames}. Si el usuario menciona un curso, DEBE ser uno de estos, de lo contrario asume que se equivocó o no lo extraigas.`;
    }

    const menuProducts =
      (menuProductsData?.data as {
        id: string;
        name: string;
        description?: string;
        category: string;
        price: number;
        preparation_time?: number;
        allergens?: string[];
      }[]) || [];

    let formattedMenu = "";
    if (menuProducts.length > 0) {
      const groupedMenu = menuProducts.reduce((acc: Record<string, typeof menuProducts>, item) => {
        const cat = item.category || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});

      formattedMenu = Object.entries(groupedMenu)
        .map(([cat, prods]) => {
          const catTitle = cat.toUpperCase();
          const itemsStr = prods
            .map(
              (p) =>
                `- **${p.name}** | Precio: $${Number(p.price).toFixed(2)}${p.description ? ` (${p.description})` : ""}${p.allergens && p.allergens.length > 0 ? ` [Alérgenos: ${p.allergens.join(", ")}]` : ""}`
            )
            .join("\n");
          return `### ${catTitle}:\n${itemsStr}`;
        })
        .join("\n\n");
    }

    const rawKbDocs = (kbDocumentsData as Array<{
      id: string;
      name: string;
      description?: string;
      file_url?: string;
      file_key?: string;
    }>) || [];

    const availableKbDocs = rawKbDocs
      .map((doc) => {
        let url = doc.file_url || "";
        if ((!url || url.startsWith("/")) && doc.file_key) {
          try {
            const { data: publicUrlData } = supabase.storage
              .from("knowledge_base")
              .getPublicUrl(doc.file_key);
            if (publicUrlData?.publicUrl) {
              url = publicUrlData.publicUrl;
            }
          } catch {
            /* ignore */
          }
        }
        return {
          ...doc,
          file_url: url,
        };
      })
      .filter((d) => Boolean(d.file_url));

    let formattedKbDocs = "";
    if (availableKbDocs.length > 0) {
      formattedKbDocs = availableKbDocs
        .map(
          (d) =>
            `- Documento: "${d.name}" | ID: "${d.id}"${d.description ? ` | Descripción: "${d.description}"` : ""} | URL: ${d.file_url}`
        )
        .join("\n");
    }

    const tenantConfig = (
      tenantData?.data as unknown as {
        config?: {
          whatsapp?: { accessToken?: string; phoneNumberId?: string };
          business_type?: string;
        };
      }
    )?.config;
    let waConfig = tenantConfig?.whatsapp;

    // Fallback: Check waba_configurations if credentials are missing in tenantConfig
    if (!waConfig?.accessToken || !waConfig?.phoneNumberId) {
      try {
        const { data: wabaRow } = await supabase
          .from("waba_configurations")
          .select("access_token, phone_number_id")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (wabaRow?.access_token && wabaRow?.phone_number_id) {
          waConfig = {
            accessToken: wabaRow.access_token,
            phoneNumberId: wabaRow.phone_number_id,
          };
          console.log(`[AI PROCESSOR] Loaded WhatsApp credentials from waba_configurations for tenant ${tenantId}`);
        }
      } catch (wabaErr) {
        console.warn("[AI PROCESSOR] Failed checking waba_configurations:", wabaErr);
      }
    }

    // Detección robusta de restaurante (por config, columna business_type, mesas cargadas o prompt)
    const rawBusinessType = String(
      tenantConfig?.business_type ||
      (tenantData?.data as any)?.business_type ||
      ""
    ).toLowerCase();
    const hasRestaurantTables = Boolean(
      ((tenantConfig as any)?.restaurant?.tables || []).length > 0
    );
    const agentPromptLower = (activeVariant.prompt_text || "").toLowerCase();
    const isRestaurant =
      rawBusinessType.includes("restauran") ||
      rawBusinessType.includes("gastro") ||
      rawBusinessType.includes("bar") ||
      rawBusinessType.includes("comida") ||
      hasRestaurantTables ||
      agentPromptLower.includes("restobar") ||
      agentPromptLower.includes("restaurante") ||
      !tenantConfig?.business_type;

    // Horarios de atención configurados en el constructor
    const variantRules = (activeVariant as any)?.automation_rules;
    const variantHours = variantRules?.working_hours;
    const tenantHours =
      (tenantConfig as any)?.working_hours ||
      (tenantConfig as any)?.orchestrator?.timezone_rules;

    // Para restaurante: los restaurantes típicamente abren desde las 3pm hasta las 5am (15:00 a 05:00) si no tienen otro configurado
    let operatingStart =
      variantHours?.start || tenantHours?.start || (isRestaurant ? "15:00" : "09:00");
    let operatingEnd =
      variantHours?.end || tenantHours?.end || (isRestaurant ? "05:00" : "20:00");
    let operatingDays: number[] =
      variantHours?.days ||
      tenantHours?.days ||
      tenantHours?.working_days ||
      [0, 1, 2, 3, 4, 5, 6];

    // Si para restaurante estaba guardado el default de oficina (09:00 a 21:00 o 20:00),
    // aplicar 15:00 a 05:00 conforme a los requerimientos de restaurantes
    if (
      isRestaurant &&
      operatingStart === "09:00" &&
      (operatingEnd === "21:00" || operatingEnd === "20:00")
    ) {
      operatingStart = "15:00";
      operatingEnd = "05:00";
    }

    // 🟢 EARLY TYPING INDICATOR: Trigger as soon as credentials are ready to show while AI is thinking
    if (waConfig?.accessToken && waConfig?.phoneNumberId && incomingMessageId) {
      whatsappBridge
        .sendTypingIndicator(
          ensurePlusPrefix(
            (
              lead as unknown as {
                ai_agent_id?: string;
                pais?: string;
                telefono?: string;
                nombre?: string;
                email?: string;
                metadata?: Record<string, unknown>;
              }
            ).telefono!
          ),
          incomingMessageId,
          {
            accessToken: waConfig.accessToken,
            phoneNumberId: waConfig.phoneNumberId,
          }
        )
        .catch(() => {});
    }

    const conversationContext = recentHistory
      .map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.content}`)
      .join("\n");

    const now = new Date();
    const leadPais =
      (
        lead as unknown as {
          ai_agent_id?: string;
          pais?: string;
          telefono?: string;
          nombre?: string;
          email?: string;
          metadata?: Record<string, unknown>;
        }
      ).pais &&
      (
        lead as unknown as {
          ai_agent_id?: string;
          pais?: string;
          telefono?: string;
          nombre?: string;
          email?: string;
          metadata?: Record<string, unknown>;
        }
      ).pais !== "Desconocido" &&
      (
        lead as unknown as {
          ai_agent_id?: string;
          pais?: string;
          telefono?: string;
          nombre?: string;
          email?: string;
          metadata?: Record<string, unknown>;
        }
      ).pais !== "Identificando..."
        ? (
            lead as unknown as {
              ai_agent_id?: string;
              pais?: string;
              telefono?: string;
              nombre?: string;
              email?: string;
              metadata?: Record<string, unknown>;
            }
          ).pais
        : resolveCountryFromPhone(
            (
              lead as unknown as {
                ai_agent_id?: string;
                pais?: string;
                telefono?: string;
                nombre?: string;
                email?: string;
                metadata?: Record<string, unknown>;
              }
            ).telefono
          ) || "Desconocido";

    const leadTZ = getTimezoneByCountry((leadPais as string) || "");

    // Resolver zona horaria local exacta del negocio / restaurante
    const tenantCountry =
      (tenantConfig as any)?.country ||
      (tenantConfig as any)?.orchestrator?.timezone_rules?.country ||
      (leadPais === "Chile" || agentPromptLower.includes("chile") || agentPromptLower.includes("iquique")
        ? "Chile"
        : leadPais);
    const localTZ =
      (tenantConfig as any)?.timezone ||
      getTimezoneByCountry(tenantCountry) ||
      leadTZ ||
      "America/Santiago";

    const yearFormatter = new Intl.DateTimeFormat("es-CL", { timeZone: localTZ, year: "numeric" });
    const currentYear = yearFormatter.format(now);

    const dateFormatter = new Intl.DateTimeFormat("es-CL", {
      timeZone: localTZ,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const currentDateFull = dateFormatter.format(now); // ej: "jueves, 15 de octubre de 2026"

    const timeFormatter = new Intl.DateTimeFormat("es-CL", {
      timeZone: localTZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentTimeFull = timeFormatter.format(now); // ej: "15:10"

    const currentDateISO = now.toLocaleDateString("en-CA", { timeZone: localTZ }); // YYYY-MM-DD
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDateISO = tomorrow.toLocaleDateString("en-CA", { timeZone: localTZ });

    const variableMap: Record<string, string> = {
      nombre:
        (
          lead as unknown as {
            ai_agent_id?: string;
            pais?: string;
            telefono?: string;
            nombre?: string;
            email?: string;
            metadata?: Record<string, unknown>;
          }
        ).nombre || "Cliente",
      email:
        (
          lead as unknown as {
            ai_agent_id?: string;
            pais?: string;
            telefono?: string;
            nombre?: string;
            email?: string;
            metadata?: Record<string, unknown>;
          }
        ).email || "",
      telefono: ensurePlusPrefix(
        (
          lead as unknown as {
            ai_agent_id?: string;
            pais?: string;
            telefono?: string;
            nombre?: string;
            email?: string;
            metadata?: Record<string, unknown>;
          }
        ).telefono || ""
      ),
      fecha: currentDateISO,
      hora: currentTimeFull,
      now: `${currentDateFull} ${currentTimeFull}`,
      anio: currentYear,
      ano: currentYear,
      pais: leadPais ?? "",
      $now: `${currentDateFull} ${currentTimeFull}`,
      $date: currentDateISO,
      $time: currentTimeFull,
      $year: currentYear,
      $date_full: currentDateFull,
      $date_iso: currentDateISO,
      $tomorrow_iso: tomorrowDateISO,
      $timezone: localTZ,
      $timezone_lead: leadTZ,
      $horario_inicio: operatingStart,
      $horario_fin: operatingEnd,
    };

    // 1. Pre-populate all tracked variables from the active variant as "Pendiente..."
    const trackedVars = (activeVariant.tracked_variables as string[]) || [];
    trackedVars.forEach((v) => {
      const clean = v
        .replace(/^\{\{|\}\}$/g, "")
        .replace(/\s+/g, "")
        .trim();
      variableMap[clean] = "Pendiente...";
    });

    // 2. Overlay captured metadata
    Object.entries(
      (
        lead as unknown as {
          ai_agent_id?: string;
          pais?: string;
          telefono?: string;
          nombre?: string;
          email?: string;
          metadata?: Record<string, unknown>;
        }
      ).metadata || {}
    ).forEach(([k, val]) => {
      const clean = k
        .replace(/^\{\{|\}\}$/g, "")
        .replace(/\s+/g, "")
        .trim();
      variableMap[clean] = String(val);
    });

    // 3. Overlay static dynamic variables context
    Object.entries((activeVariant.dynamic_variables as Record<string, string>) || {}).forEach(
      ([k, val]) => {
        const clean = k
          .replace(/^\{\{|\}\}$/g, "")
          .replace(/\s+/g, "")
          .trim();
        variableMap[clean] = String(val);
      }
    );

    // Reglas maestras según tipo de negocio (Restaurante con Mesas & Reservas vs Servicios Generales)
    const timezoneContext = isRestaurant
      ? `
### CONTEXTO TEMPORAL Y HORARIOS DEL RESTAURANTE (EN VIVO - CRÍTICO):
- AÑO ACTUAL EXACTO: ${currentYear}
- FECHA ACTUAL: ${currentDateFull}
- HORA ACTUAL EXACTA: ${currentTimeFull} (Zona horaria: ${localTZ})
- FECHA DE HOY (ISO): ${currentDateISO}
- FECHA DE MAÑANA (ISO): ${tomorrowDateISO}
- HORARIO DE ATENCIÓN CONFIGURADO EN EL CONSTRUCTOR: Desde las ${operatingStart} hasta las ${operatingEnd} (${formatOperatingHoursText(operatingStart, operatingEnd)})
- DÍAS DE ATENCIÓN: ${formatDaysText(operatingDays)}
- REGLA DE AÑO: El año actual es ${currentYear}. Si el cliente dice "hoy", la fecha es ${currentDateISO}. Si dice "mañana", es ${tomorrowDateISO}. NUNCA utilices un año diferente a ${currentYear}.

### REGLAS MAESTRAS DE MESAS Y RESERVAS DEL RESTAURANTE (CRÍTICO):
1. Este negocio es un RESTAURANTE con sistema de Mesas y Reservas en vivo en la app.
2. NO es un servicio de citas ni asesorías. NUNCA menciones citas, llamadas, asesores, Google Calendar ni reuniones.
3. Para consultar si hay mesas disponibles o si el restaurante está abierto en un día/hora específicos, DEBES llamar a la herramienta 'check_table_availability'.
4. Para confirmar la reserva, solicita los datos indispensables (Día, Hora, Personas, Nombre y Teléfono) y llama OBLIGATORIAMENTE a 'book_restaurant_table'.
5. La reserva se realiza directamente en la sección de mesas de la app SIN IMPORTAR EL PORTE O CAPACIDAD DE LA MESA (cualquier mesa disponible puede ser asignada).
6. Si el cliente solicita una hora en la que el local está cerrado (fuera de ${operatingStart} a ${operatingEnd}), indícale amablemente el horario de atención: ${formatOperatingHoursText(operatingStart, operatingEnd)}.
7. NO PREGUNTES POR DATOS QUE YA TIENES: Si en los datos del prospecto ya está el Nombre o Teléfono, úsalos directamente.
`
      : `
### REGLAS MAESTRAS DE HORARIO Y ZONAS HORARIAS (CRÍTICO):
1. Nuestra sede está en MADRID, ESPAÑA. Los horarios de atención son LUNES A VIERNES de 09:00 a 20:00 (hora de Madrid).
2. El prospecto está en: ${leadPais} (zona horaria: ${leadTZ}).
3. Los huecos de disponibilidad que recibes de 'check_availability' YA ESTÁN CONVERTIDOS a la hora local del prospecto (${leadTZ}). DEBES mostrarlos TAL CUAL al usuario, sin alterar las horas.
4. IMPORTANTE: Nunca muestres horas de madrugada (00:00–07:00) al prospecto.
5. Si el prospecto pide una hora que NO aparece en la lista, explécale que nuestras oficinas estarían cerradas a esa hora.
6. DOBLE CONFIRMACIÓN: Al agendar, confirma siempre la hora local del prospecto.
7. NO PREGUNTES POR DATOS QUE YA TIENES: Si en la sección 'DATOS DEL PROSPECTO' ya aparece el Nombre, País o Teléfono, NO se los preguntes al usuario. Actúa como si ya lo supieras.
8. CRÍTICO: Para agendar una cita real en el sistema, SIEMPRE DEBES EJECUTAR LA FUNCIÓN 'book_appointment'.
`;

    let finalPrompt = timezoneContext + "\n" + activeVariant.prompt_text;

    // Replace patterns like {{nombre}} case-insensitively and space-insensitively
    Object.keys(variableMap).forEach((key) => {
      const cleanKey = key
        .replace(/^\{\{|\}\}$/g, "")
        .replace(/\s+/g, "")
        .trim();

      // Safe escape function for characters inside regex (like $ in $now, $date)
      const regexStr = cleanKey
        .split("")
        .map((char) => {
          if (char === "_" || char === "-") return char + "\\s*";
          if ("-$^*+?.()|[]{}".includes(char)) return "\\" + char;
          return char;
        })
        .join("\\s*");

      const regex = new RegExp(`{{\\s*${regexStr}\\s*}}`, "gi");
      finalPrompt = finalPrompt.replace(regex, String(variableMap[key] ?? ""));
    });

    // 7. Define Tools según tipo de negocio
    let tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

    if (isRestaurant) {
      // Para restaurantes: SOLO herramientas de mesas, reservas y pedidos de restaurante
      tools = [
        {
          type: "function",
          function: {
            name: "check_table_availability",
            description:
              "Consultar en la sección de mesas y reservas de la app si hay mesas disponibles para una fecha y hora, y verificar si el restaurante está abierto. Usar cuando el cliente pregunte por mesas, disponibilidad, o si tienen lugar.",
            parameters: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Fecha de la reserva en formato YYYY-MM-DD o 'Hoy' / 'Mañana'",
                },
                time: {
                  type: "string",
                  description: "Hora de la reserva (ej: 21:00 o 01:30)",
                },
                guests: {
                  type: "number",
                  description: "Número de personas / comensales",
                },
                zonePreference: {
                  type: "string",
                  description: "Zona preferida opcional: 'terraza', 'salon_principal', 'pub_bar', 'vip'",
                },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "book_restaurant_table",
            description:
              "Crear y confirmar una reserva de mesa en la sección de mesas de la app sin importar el porte de la mesa. Úsala cuando el cliente confirme día, hora, comensales, nombre y teléfono. NUNCA uses citas ni calendarios.",
            parameters: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Fecha de la reserva (formato YYYY-MM-DD)",
                },
                time: {
                  type: "string",
                  description: "Hora de la reserva (formato HH:MM, ej: 21:00)",
                },
                guests: {
                  type: "number",
                  description: "Número de comensales / personas",
                },
                customerName: {
                  type: "string",
                  description: "Nombre del cliente para la reserva",
                },
                customerPhone: {
                  type: "string",
                  description: "Teléfono de contacto del cliente",
                },
                zonePreference: {
                  type: "string",
                  description: "Zona preferida opcional: 'terraza', 'salon_principal', 'pub_bar', 'vip'",
                },
                notes: {
                  type: "string",
                  description: "Notas adicionales o peticiones especiales",
                },
              },
              required: ["date", "time", "guests", "customerName", "customerPhone"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_delivery_order",
            description:
              "Registrar un pedido a domicilio / delivery con los platos y productos de la carta.",
            parameters: {
              type: "object",
              properties: {
                customerName: { type: "string", description: "Nombre completo del cliente" },
                customerPhone: { type: "string", description: "Teléfono de contacto" },
                deliveryAddress: { type: "string", description: "Dirección completa de entrega" },
                items: {
                  type: "array",
                  description: "Lista de platos o productos pedidos",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nombre del plato o bebida" },
                      quantity: { type: "number", description: "Cantidad pedida" },
                      unitPrice: { type: "number", description: "Precio unitario" },
                      notes: { type: "string", description: "Notas especiales del plato" },
                    },
                    required: ["name", "quantity", "unitPrice"],
                  },
                },
                totalAmount: { type: "number", description: "Total a pagar" },
                notes: { type: "string", description: "Notas adicionales de entrega" },
              },
              required: [
                "customerName",
                "customerPhone",
                "deliveryAddress",
                "items",
                "totalAmount",
              ],
            },
          },
        },
      ];
    } else {
      // Para servicios generales / CRM / Citas con asesores
      tools = [
        {
          type: "function",
          function: {
            name: "book_appointment",
            description:
              "Agendar una nueva cita con un asesor. IMPORTANTE: El argumento 'date' DEBE ser una fecha en formato ISO (YYYY-MM-DD).",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "Fecha de la cita (formato YYYY-MM-DD)" },
                time: { type: "string", description: "Hora de la cita (formato HH:MM)" },
                notes: { type: "string", description: "Notas adicionales sobre el interés del lead" },
              },
              required: ["date", "time"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "cancel_appointment",
            description: "Cancelar una cita existente.",
            parameters: {
              type: "object",
              properties: {
                appointmentId: {
                  type: "string",
                  description: "ID único (UUID) de la cita a cancelar",
                },
              },
              required: ["appointmentId"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "reschedule_appointment",
            description: "Cambiar la fecha u hora de una cita existente.",
            parameters: {
              type: "object",
              properties: {
                appointmentId: {
                  type: "string",
                  description: "ID único (UUID) de la cita",
                },
                newDate: { type: "string", description: "Nueva fecha YYYY-MM-DD" },
                newTime: { type: "string", description: "Nueva hora HH:MM" },
              },
              required: ["appointmentId", "newDate"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "check_availability",
            description: "Consultar huecos libres para citas con asesores.",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "Fecha a consultar" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            name: "generar_cotizacion_por_correo",
            description:
              "Genera una cotización formal en PDF y la envía automáticamente por correo electrónico al cliente.",
            parameters: {
              type: "object",
              properties: {
                cliente: { type: "string", description: "Nombre completo del cliente o empresa" },
                email: { type: "string", description: "Correo electrónico del cliente" },
                repuestos: { type: "string", description: "Detalle de los repuestos o servicios solicitados" },
                maquinaria: { type: "string", description: "Marca, modelo o tipo de maquinaria" },
                modelo: { type: "string", description: "Modelo específico o número de serie" },
                comuna: { type: "string", description: "Comuna o ciudad de despacho" },
              },
              required: ["email", "repuestos"],
            },
          },
        },
      ];
    }

    if (availableKbDocs.length > 0) {
      tools.push({
        type: "function",
        function: {
          name: "send_knowledge_document",
          description:
            "Envía un archivo PDF oficial cargado en la base de conocimiento (por ejemplo, la carta de comida, carta de tragos o menú) directamente al chat de WhatsApp del cliente como documento adjunto.",
          parameters: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description:
                  "ID (UUID) exacto del documento de la lista disponible que deseas enviar.",
              },
              documentNameOrType: {
                type: "string",
                description:
                  "Nombre o tipo de documento a enviar: 'comida', 'tragos', 'carta general', o palabras clave del nombre.",
              },
              caption: {
                type: "string",
                description:
                  "Texto breve o pie de documento que acompaña al archivo en WhatsApp (ej: 'Carta de Comida - Gaïa Restobar')",
              },
            },
          },
        },
      });
    }

    // 8. Build System Prompt
    const restaurantPromptSection = isRestaurant
      ? `
CARTA Y MENÚ OFICIAL DEL RESTAURANTE (PRECIOS Y PRODUCTOS DISPONIBLES):
${formattedMenu || "No hay productos cargados en la base de datos de carta actualmente."}

### PROTOCOLO DE ATENCIÓN DE RESTAURANTE (MESAS & RESERVAS):
1. **SI EL CLIENTE PREGUNTA POR DISPONIBILIDAD O SI ESTÁ ABIERTO:**
   - Llama a la herramienta **'check_table_availability'** pasando el día y hora indicados.
   - Si no indicó hora, usa la hora actual o la que mencione.
   - Responde confirmando amablemente si hay mesas disponibles en la sección de mesas del restaurante.

2. **SI EL CLIENTE DESEA HACER UNA RESERVA DE MESA:**
   - DEBES recolectar los 4 datos indispensables:
     1. **Día y Hora** de la reserva (ej: hoy a las 21:00, sábado a las 22:00).
     2. **Cantidad de personas / comensales**.
     3. **Nombre completo** de quien reserva.
     4. **Número de teléfono** de contacto.
   - En cuanto tengas estos datos, llama OBLIGATORIAMENTE a la herramienta **'book_restaurant_table'**.
   - Recuerda: Se le asignará una mesa automáticamente en la app **sin importar el porte de la mesa**.
   - Confírmale la reserva al cliente indicando la mesa asignada, fecha, hora y comensales.

3. **SI EL CLIENTE DESEA UN PEDIDO DE DELIVERY / A DOMICILIO O CONSULTA LA CARTA:**
   - Consulta los productos y precios exactos en la sección 'CARTA Y MENÚ OFICIAL DEL RESTAURANTE'.
   - NUNCA inventes precios ni productos fuera de la carta oficial.
   - DEBES solicitar los siguientes datos indispensables:
     1. **Qué platos, bebidas o productos desea pedir** de la carta.
     2. **Nombre de quien recibe**.
     3. **Teléfono de contacto**.
     4. **Dirección exacta de entrega**.
   - Calcula el total y DEBES informarle al cliente el desglose de productos y el **TOTAL EXACTO a pagar**.
   - Llama OBLIGATORIAMENTE a la herramienta **'create_delivery_order'** para registrar el pedido.

4. **SI EL CLIENTE PIDE LA CARTA O MENÚ EN PDF (O PREGUNTA POR LA CARTA DIGITAL / QUÉ TIENEN PARA COMER O TOMAR):**
   - TIENES LA CARTA OFICIAL EN FORMATO PDF CARGADA EN TU BASE DE CONOCIMIENTO.
   - DEBES llamar OBLIGATORIAMENTE a la herramienta **'send_knowledge_document'** para enviarle el archivo PDF directamente a su WhatsApp.
   - Si el cliente pide la carta de comida o la carta general, envía la carta de comida.
   - Si pide la carta de tragos, cócteles o barra, envía la carta de tragos.
   - Si pide ambas o la carta completa, puedes enviar la carta de comida y ofrecer o enviar también la de tragos.
   - NUNCA digas que no puedes mandar archivos o que no tienes el PDF; la herramienta 'send_knowledge_document' lo envía de forma nativa e inmediata al chat de WhatsApp.
   - Responde siempre con un mensaje cercano, relajado y con buena onda confirmando que le acabas de adjuntar la carta en PDF para que la mire con calma.
`
      : "";

    const documentsPromptSection = availableKbDocs.length > 0
      ? `
ARCHIVOS Y DOCUMENTOS PDF OFICIALES DISPONIBLES EN LA BASE DE CONOCIMIENTO:
${formattedKbDocs}

REGLAS PARA ENVIAR DOCUMENTOS EN PDF:
1. Si el cliente solicita la carta, el menú, precios en PDF, carta de comidas, carta de tragos o cualquier archivo:
   - TIENES LA CAPACIDAD DE ENVIAR EL ARCHIVO PDF DIRECTAMENTE AL WHATSAPP DEL CLIENTE.
   - DEBES llamar OBLIGATORIAMENTE a la herramienta 'send_knowledge_document'.
   - Si pide comida o general: envía la carta de comida.
   - Si pide tragos o coctelería: envía la carta de tragos.
   - Si pide ambas: puedes enviar la carta de comida y ofrecer o enviar también la de tragos.
2. NUNCA digas que no tienes la carta o que no puedes mandar archivos. Los documentos listados arriba están 100% listos y cargados en tu base de conocimiento.
3. Responde siempre con un mensaje amigable, natural y con buena onda informando que le acabas de adjuntar el archivo PDF para que lo revise.`
      : "";

    const systemPrompt = `
${finalPrompt}

### CONTEXTO TEMPORAL ACTUAL:
- Fecha actual: ${currentDateFull}
- Hora exacta: ${currentTimeFull} (${localTZ})
- Año actual: ${currentYear}

### DATOS DEL PROSPECTO:
- Nombre: ${variableMap.nombre}
- Teléfono: ${variableMap.telefono}
- País: ${variableMap.pais}
- Email: ${variableMap.email || "No proporcionado"}

CRITERIOS DE CUALIFICACIÓN ESPECÍFICOS POR PROGRAMA:
${programRequirements || "No hay criterios específicos definidos para los programas actuales de este lead. Usa criterios generales de admisión."}

VARIABLES A CAPTURAR (OBLIGATORIO):
${((activeVariant.tracked_variables as string[]) || []).map((v) => `- ${v}`).join("\n") || "No hay variables específicas configuradas."}
*Nota: Intenta obtener estos datos de forma sutil durante la charla.*

INFORMACIÓN ADICIONAL (CEREBRO / BASE DE CONOCIMIENTO):
${localKnowledge || "No hay información adicional específica en la base de conocimiento para este mensaje."}
${documentsPromptSection}

RESUMEN DE CONVERSACIÓN PREVIA:
${chatSummary || "Primera interacción con este lead."}

CONTEXTO RECIENTE (Últimas 10 líneas):
${conversationContext}

CITAS PROGRAMADAS PARA ESTE LEAD:
${
  (
    leadAppointments as {
      id: string;
      scheduled_at: string;
      status: string;
      advisors?: { name?: string };
    }[]
  ).length > 0
    ? (
        leadAppointments as {
          id: string;
          scheduled_at: string;
          status: string;
          advisors?: { name?: string };
        }[]
      )
        .map(
          (a) =>
            `- ID: ${a.id} | Fecha/Hora: ${new Date(a.scheduled_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} (Madrid) | Estado: ${a.status} | Asesor: ${a.advisors?.name || "Por asignar"}`
        )
        .join("\n")
    : "No hay citas programadas activas para este lead."
}
${restaurantPromptSection}`;

    // 9. Call OpenAI with Tools
    let modelName = activeVariant.model_name || "gpt-4o";
    if (modelName === "gpt-4.1") modelName = "gpt-4o";
    if (modelName === "gpt-4.1-mini") modelName = "gpt-4o-mini";

    const openai = new OpenAI({ apiKey });

    console.log(`[AI PROCESSOR] 🧠 Calling ${modelName} with Tools...`);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: incomingMessage },
    ];

    await GlobalLogger.info(tenantId, "WHATSAPP", `Calling OpenAI model ${modelName}`, {
      promptLength: systemPrompt.length,
    });

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 500,
    });

    let aiMessage = completion.choices[0]?.message;

    // Acumulador de token usage de TODAS las llamadas (inicial + rondas tool).
    // El dashboard /dashboard/costs lee chat_messages.metadata.token_usage; con
    // tool calls hay hasta 3 llamadas OpenAI por mensaje, así que el coste real
    // es la suma, no solo la primera (red-team Sprint 8 V5). Aproximado por
    // mensaje: cubre el agregado de las rondas de este turno.
    const tokenUsage = {
      prompt_tokens: completion.usage?.prompt_tokens ?? 0,
      completion_tokens: completion.usage?.completion_tokens ?? 0,
      total_tokens: completion.usage?.total_tokens ?? 0,
    };

    // 10. Handle Tool Calls with recursion (max 2 rounds)
    let toolRounds = 0;
    const maxToolRounds = 2;

    while (aiMessage?.tool_calls && toolRounds < maxToolRounds) {
      toolRounds++;
      console.log(
        `[AI PROCESSOR] 🛠️ Tool calls detected (Round ${toolRounds}): ${aiMessage.tool_calls.length}`
      );
      messages.push(aiMessage);

      const { AppointmentService } = await import("@/lib/services/appointment-service");
      const executedToolsInRound = new Set<string>();
      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.type !== "function") continue;

        const name = toolCall.function.name;
        const argsString = toolCall.function.arguments;
        const toolKey = `${name}:${argsString}`;

        if (executedToolsInRound.has(toolKey)) {
          console.log(`[AI PROCESSOR] ⏭️ Skipping duplicate tool call in same round: ${toolKey}`);
          continue;
        }
        executedToolsInRound.add(toolKey);

        const args = JSON.parse(argsString);
        console.log(`[AI PROCESSOR] 🛠️ Executing tool: ${name}`, args);
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

            // AUTO-QUALIFY: If appointment is booked, automatically qualify the lead
            try {
              // Fetch dynamic segments to find the one for "appointments"
              const { data: tenant } = await (supabase.from("tenants") as any)
                .select("config")
                .eq("id", tenantId)
                .single();
              let targetSegment = "AGENDADO"; // fallback
              if (tenant?.config?.segmentations) {
                const segs = (tenant.config as { segmentations: string[] }).segmentations || [];
                // Look for anything containing "AGENDA", "CITA", or "BOOK"
                const matched = segs.find(
                  (s) => s.toUpperCase().includes("AGENDA") || s.toUpperCase().includes("CITA")
                );
                if (matched) targetSegment = matched;
              }

              await (supabase.from("lead") as any)
                .update({
                  tipo_lead: "CUALIFICADO",
                  segmentacion: targetSegment,
                })
                .eq("id", leadId);
              console.log(
                `[AI PROCESSOR] 🎯 Goal met! Auto-qualifying lead ${leadId} as CUALIFICADO / ${targetSegment}.`
              );
            } catch (err) {
              console.error("[AI PROCESSOR] Failed to auto-qualify lead:", err);
            }

            result = JSON.stringify({ success: true, appointment: appt });
          } else if (name === "cancel_appointment") {
            const res = await AppointmentService.cancelAppointment(args.appointmentId, tenantId);
            result = JSON.stringify(res);
          } else if (name === "reschedule_appointment") {
            const res = await AppointmentService.rescheduleAppointment(
              args.appointmentId,
              tenantId,
              args.newDate,
              args.newTime
            );
            result = JSON.stringify(res);
          } else if (name === "check_availability") {
            const leadTimezone = getTimezoneByCountry(
              (
                lead as unknown as {
                  ai_agent_id?: string;
                  pais?: string;
                  telefono?: string;
                  nombre?: string;
                  email?: string;
                  metadata?: Record<string, unknown>;
                }
              ).pais ?? ""
            );
            const res = await AppointmentService.checkAvailability(
              tenantId,
              args.date,
              leadTimezone
            );
            result = JSON.stringify(res);
          } else if (name === "check_table_availability") {
            const { RestaurantService } = await import("@/lib/services/restaurant-service");
            const requestedTime = args.time || currentTimeFull;
            const isWithinHours = isTimeWithinOperatingHours(requestedTime, operatingStart, operatingEnd);

            if (!isWithinHours) {
              result = JSON.stringify({
                success: true,
                isOpen: false,
                available: false,
                availableCount: 0,
                message: `El restaurante atiende ${formatOperatingHoursText(operatingStart, operatingEnd)}. A las ${requestedTime} se encuentra cerrado.`,
              });
            } else {
              const res = await RestaurantService.checkTableAvailability(tenantId, {
                date: args.date,
                time: args.time,
                guests: Number(args.guests) || 1,
                zonePreference: args.zonePreference,
              });
              result = JSON.stringify({
                ...res,
                operatingHours: `${operatingStart} a ${operatingEnd}`,
                isWithinOperatingHours: true,
              });
            }
          } else if (name === "book_restaurant_table") {
            const { RestaurantService } = await import("@/lib/services/restaurant-service");
            const res = await RestaurantService.bookTableReservation(tenantId, {
              date: args.date,
              time: args.time,
              guests: Number(args.guests) || 1,
              customerName: args.customerName || (lead as any)?.nombre || "Cliente",
              customerPhone: args.customerPhone || (lead as any)?.telefono || "",
              customerEmail: (lead as any)?.email,
              zonePreference: args.zonePreference,
              notes: args.notes,
              source: "whatsapp",
            });
            result = JSON.stringify(res);
          } else if (name === "create_delivery_order") {
            const { RestaurantService } = await import("@/lib/services/restaurant-service");
            const res = await RestaurantService.createDeliveryOrder(tenantId, {
              customerName: args.customerName || (lead as any)?.nombre || "Cliente",
              customerPhone: args.customerPhone || (lead as any)?.telefono || "",
              deliveryAddress: args.deliveryAddress,
              items: args.items,
              totalAmount: Number(args.totalAmount) || 0,
              notes: args.notes,
              source: "whatsapp",
            });
            result = JSON.stringify(res);
          } else if (name === "generar_cotizacion_por_correo") {
            const { PdfService } = await import("@/lib/services/pdf-service");
            const customerEmail = String(args.email || (lead as any)?.email || "").trim();
            const clienteName = String(args.cliente || (lead as any)?.nombre || "Cliente").trim();
            const repuestosDesc = String(args.repuestos || "Repuestos y Servicios para Maquinaria").trim();
            const maquinariaDesc = String(args.maquinaria || "Grúa Horquilla / Maquinaria Pesada").trim();
            const comunaDesc = args.comuna ? String(args.comuna).trim() : "";
            const modeloDesc = args.modelo ? String(args.modelo).trim() : "";

            if (!customerEmail) {
              result = JSON.stringify({
                success: false,
                error: "Falta el correo electrónico del cliente para poder despacharle la cotización en PDF.",
              });
            } else {
              // Actualizar email y estado del prospecto
              try {
                await (supabase.from("lead") as any).update({
                  email: customerEmail,
                  tipo_lead: "cotizacion",
                  status: "cotizacion_solicitada",
                }).eq("id", leadId);
              } catch (e) {
                console.warn("[AI PROCESSOR] Error actualizando email del lead:", e);
              }

              const cotResult = await PdfService.executeQuotationAndWhatsApp({
                supabase,
                tenantId,
                leadId,
                quotationData: {
                  cliente: clienteName,
                  telefono: (lead as any)?.telefono || "",
                  email: customerEmail,
                  repuestos: repuestosDesc,
                  maquinaria: maquinariaDesc,
                  modelo: modeloDesc || undefined,
                  observaciones: comunaDesc ? `Despacho / Ciudad: ${comunaDesc}` : undefined,
                },
                sendWhatsApp: false, // Se envía por email; el agente de WhatsApp le confirma textualmente al cliente en el chat actual
              });

              result = JSON.stringify({
                success: true,
                email_enviado: cotResult.emailSent,
                email_error: cotResult.emailError,
                destinatario: customerEmail,
                pdf_url: cotResult.pdfUrl,
                mensaje: `Cotización PDF oficial generada con éxito y enviada al correo ${customerEmail}.`,
              });
            }
          } else if (name === "send_knowledge_document") {
            const docId = args.documentId;
            const docQuery = String(args.documentNameOrType || "").toLowerCase();
            const caption = args.caption || "Carta Gaïa Restobar";

            let targetDoc = null;
            // 1. Try finding by documentId
            if (docId) {
              targetDoc = availableKbDocs.find((d) => d.id === docId);
            }

            // 2. Try matching by type/name query
            if (!targetDoc && docQuery) {
              if (
                docQuery.includes("trago") ||
                docQuery.includes("bebida") ||
                docQuery.includes("coctel") ||
                docQuery.includes("bar")
              ) {
                targetDoc = availableKbDocs.find(
                  (d) =>
                    d.name.toLowerCase().includes("trago") ||
                    d.name.toLowerCase().includes("bebida") ||
                    d.name.toLowerCase().includes("bar") ||
                    (d.description && d.description.toLowerCase().includes("trago"))
                );
              } else if (
                docQuery.includes("comida") ||
                docQuery.includes("plato") ||
                docQuery.includes("alimento") ||
                docQuery.includes("carta")
              ) {
                targetDoc = availableKbDocs.find(
                  (d) =>
                    d.name.toLowerCase().includes("comida") ||
                    d.name.toLowerCase().includes("plato") ||
                    (d.description && d.description.toLowerCase().includes("comida"))
                );
              }

              if (!targetDoc) {
                targetDoc = availableKbDocs.find(
                  (d) =>
                    d.name.toLowerCase().includes(docQuery) ||
                    (d.description && d.description.toLowerCase().includes(docQuery))
                );
              }
            }

            // 3. Fallback: find any doc containing "carta" or the first available PDF
            if (!targetDoc) {
              targetDoc =
                availableKbDocs.find((d) => d.name.toLowerCase().includes("carta")) ||
                availableKbDocs[0];
            }

            if (!targetDoc || !targetDoc.file_url) {
              result = JSON.stringify({
                success: false,
                error: "No se encontró ningún archivo PDF en la base de conocimiento para enviar.",
              });
            } else {
              // Generate clean filename
              let cleanFilename = targetDoc.name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9_\-\s]/g, "")
                .trim()
                .replace(/\s+/g, "_");
              if (!cleanFilename.toLowerCase().endsWith(".pdf")) cleanFilename += ".pdf";

              const customerPhone = ensurePlusPrefix(
                (
                  lead as unknown as {
                    telefono?: string;
                  }
                ).telefono || ""
              );
              let docSent = false;
              let sendError: string | null = null;

              if (waConfig?.accessToken && waConfig?.phoneNumberId && customerPhone) {
                try {
                  await whatsappBridge.sendDocumentMessage(
                    customerPhone,
                    targetDoc.file_url,
                    cleanFilename,
                    caption,
                    waConfig as { accessToken: string; phoneNumberId: string }
                  );
                  docSent = true;
                  console.log(
                    `[AI PROCESSOR] ✅ PDF Document '${targetDoc.name}' delivered via WhatsApp to ${customerPhone}`
                  );
                } catch (waErr: any) {
                  sendError = waErr?.message || String(waErr);
                  console.error("[AI PROCESSOR] ❌ Error delivering WhatsApp document:", waErr);
                }
              } else {
                console.warn(
                  "[AI PROCESSOR] ⚠️ Skipping native WhatsApp document: missing credentials or phone"
                );
              }

              // Log document in chat_messages so it appears in Dashboard and history
              try {
                await (supabase.from("chat_messages") as any).insert({
                  tenant_id: tenantId,
                  lead_id: leadId,
                  direction: "OUTBOUND",
                  message_type: "DOCUMENT",
                  content: `📄 [Documento PDF]: ${targetDoc.name} - ${targetDoc.file_url}`,
                  sent_by: "AI_AGENT",
                  status: docSent ? "DELIVERED" : "SENT",
                  metadata: {
                    pdf_url: targetDoc.file_url,
                    filename: cleanFilename,
                    document_id: targetDoc.id,
                    document_name: targetDoc.name,
                    caption: caption,
                    channel: "whatsapp",
                  },
                });
              } catch (saveErr) {
                console.warn("[AI PROCESSOR] Error logging document to chat_messages:", saveErr);
              }

              result = JSON.stringify({
                success: true,
                document_sent: docSent,
                document_name: targetDoc.name,
                pdf_url: targetDoc.file_url,
                filename: cleanFilename,
                caption: caption,
                message: `El archivo PDF '${targetDoc.name}' ha sido enviado directamente al WhatsApp del cliente (${customerPhone}).`,
                instruction_for_assistant:
                  "Confírmale de forma cálida, cercana y con buena onda al cliente que le acabas de adjuntar la carta en PDF aquí en el chat para que la revise con calma.",
              });
            }
          }
        } catch (e) {
          console.error(`[AI PROCESSOR] ❌ Error executing tool ${name}:`, e);
          result = JSON.stringify({
            error: (e as Error).message,
            details: "Si el error persiste, contacta a soporte técnico.",
          });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
        console.log(`[AI PROCESSOR] ✅ Tool ${name} result:`, result);
      }

      // Get next completion (could be another tool call or final response)
      const nextCompletion = await openai.chat.completions.create({
        model: modelName,
        messages,
        temperature: 0.7,
      });
      aiMessage = nextCompletion.choices[0]?.message;

      // Acumular el usage de esta ronda de tool al total del mensaje.
      tokenUsage.prompt_tokens += nextCompletion.usage?.prompt_tokens ?? 0;
      tokenUsage.completion_tokens += nextCompletion.usage?.completion_tokens ?? 0;
      tokenUsage.total_tokens += nextCompletion.usage?.total_tokens ?? 0;
    }

    const aiResponse = aiMessage?.content || "";
    await GlobalLogger.info(tenantId, "WHATSAPP", `AI Response generated`, {
      response: aiResponse.substring(0, 100),
    });

    if (aiResponse) {
      // 11. Update Redis Memory (Short-term)
      await ChatMemoryService.addMessage(leadId, "user", incomingMessage);
      await ChatMemoryService.addMessage(leadId, "assistant", aiResponse);

      if (waConfig?.accessToken && waConfig?.phoneNumberId) {
        // 11. Send response via WhatsApp
        // Ensure a natural delay based on message length (approx 30ms per char)
        // Min 1.5s, Max 6s
        const typingDuration = Math.max(1500, Math.min(6000, aiResponse.length * 30));
        const elapsed = Date.now() - startTime;

        if (elapsed < typingDuration) {
          await new Promise((resolve) => setTimeout(resolve, typingDuration - elapsed));
        }

        const sendResult = await whatsappBridge.sendTextMessage(
          ensurePlusPrefix(
            (
              lead as unknown as {
                ai_agent_id?: string;
                pais?: string;
                telefono?: string;
                nombre?: string;
                email?: string;
                metadata?: Record<string, unknown>;
              }
            ).telefono ?? ""
          ),
          aiResponse,
          waConfig as { accessToken: string; phoneNumberId: string }
        );
        console.log(`[AI PROCESSOR] 📤 WhatsApp send result for lead ${leadId}:`, sendResult);

        // 11b. Resilient Save to Database (Ensures visibility in Dashboard)
        // Using EXACT SAME format as Inbound messages which are working
        const messagePayload: Record<string, unknown> = {
          tenant_id: tenantId,
          lead_id: leadId,
          direction: "OUTBOUND",
          message_type: "TEXT",
          content: aiResponse,
          sent_by: "AI_AGENT",
          status: "SENT",
          metadata: {
            meta_id: completion.id,
            model: modelName,
            // Suma de tokens de todas las llamadas de este turno (red-team V5).
            token_usage: tokenUsage,
          },
        };

        const stripOrder = ["metadata", "sent_by", "status", "message_type"];
        let lastInsertError: unknown = null;

        // Create a working copy to avoid modifying the original payload during retries
        let currentPayload = { ...messagePayload };

        for (let i = 0; i <= stripOrder.length; i++) {
          const { error: insertError } = await (supabase.from("chat_messages") as any).insert(
            currentPayload
          );

          if (!insertError) {
            lastInsertError = null;
            console.log(`[AI PROCESSOR] ✅ Message saved to DB for lead ${leadId}`);
            break;
          }

          lastInsertError = insertError;
          const msg = insertError.message || "";
          console.warn(`[AI PROCESSOR] ⚠️ Attempt ${i + 1} failed: ${msg}`);

          if (
            msg.includes("column") ||
            insertError.code === "PGRST204" ||
            msg.includes("not found")
          ) {
            const fieldToRemove = stripOrder[i];
            if (fieldToRemove) {
              const rest = { ...currentPayload };
              delete (rest as any)[fieldToRemove];
              currentPayload = rest;
            } else {
              break;
            }
          } else {
            break; // Non-schema error, stop retrying
          }
        }

        if (lastInsertError) {
          console.error(`[AI PROCESSOR] ❌ Failed to save message to DB:`, lastInsertError);
          await (supabase.from("system_logs") as any)
            .insert({
              tenant_id: tenantId,
              level: "ERROR",
              message: `No se pudo guardar mensaje de IA en chat_messages: ${(lastInsertError as any)?.message ?? String(lastInsertError)}`,
              metadata: { leadId, error: lastInsertError },
            })
            .catch(() => {});
        } else {
          // 11c. REFRESH DASHBOARD (Crucial for visibility)
          try {
            const { data: existingConv } = await supabase
              .from("conversaciones_whatsapp")
              .select("id")
              .eq("tenant_id", tenantId)
              .eq("id_lead", leadId)
              .maybeSingle();

            if (existingConv?.id) {
              await supabase
                .from("conversaciones_whatsapp")
                .update({
                  fecha_ultimo_mensaje: new Date().toISOString(),
                  estado: "ACTIVA",
                })
                .eq("id", existingConv.id);
            } else {
              await supabase
                .from("conversaciones_whatsapp")
                .insert({
                  tenant_id: tenantId,
                  id_lead: leadId,
                  fecha_ultimo_mensaje: new Date().toISOString(),
                  estado: "ACTIVA",
                });
            }

            // Also bump lead.fecha_actualizacion so lead rises to top of inbox
            await supabase
              .from("lead")
              .update({ fecha_actualizacion: new Date().toISOString() } as never)
              .eq("id", leadId);

            console.log(`[AI PROCESSOR] 🔄 Dashboard refreshed for lead ${leadId}`);
          } catch (refreshErr) {
            console.warn(`[AI PROCESSOR] Failed to refresh dashboard:`, refreshErr);
          }
        }

        // 12. Autonomous Learning (Fact Extraction & Discovery)
        const trackedVars = (activeVariant.tracked_variables as string[]) || [];

        // 12b. Inject System Variables into metadata automatically
        const systemFacts: Record<string, string> = {
          AGENT_MESSAGE: aiResponse.substring(0, 500),
          USER_PHONE: ensurePlusPrefix(
            (
              lead as unknown as {
                ai_agent_id?: string;
                pais?: string;
                telefono?: string;
                nombre?: string;
                email?: string;
                metadata?: Record<string, unknown>;
              }
            ).telefono || ""
          ),
          USER_COUNTRY: variableMap.pais,
        };

        // We run it even if trackedVars is empty to allow for "Discovery" of other relevant data
        // The dialogue includes recent history to provide enough context for a good summary
        const dialogueForExtraction = conversationContext
          ? `${conversationContext}\nUsuario: ${incomingMessage}\nAsistente: ${aiResponse}`
          : `Usuario: ${incomingMessage}\nAsistente: ${aiResponse}`;

        FactExtractionService.extractFromDialogue(
          leadId,
          dialogueForExtraction,
          trackedVars,
          apiKey,
          tenantId,
          systemFacts, // Passing pre-filled system facts
          programRequirements
        ).catch((e: unknown) => console.error("[AI PROCESSOR] Fact extraction error:", e));
      } else {
        console.error(`[AI PROCESSOR] ❌ WhatsApp credentials missing for tenant ${tenantId}`);
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    await GlobalLogger.error(
      tenantId,
      "WHATSAPP",
      `Critical Error in generateAIWhatsAppResponse: ${error.message}`,
      { stack: error.stack }
    );
    console.error("[AI PROCESSOR] ❌ Critical Error:", error.message);
  }
}

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing Supabase configuration (SUPABASE_URL)");
  }
  const key = getAuthServiceRoleKey();

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
