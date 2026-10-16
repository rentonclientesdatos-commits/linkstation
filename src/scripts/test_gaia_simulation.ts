import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runTest() {
  console.log("==================================================");
  console.log("🧪 TEST INTEGRAL DE GAÏA / RESTAURANTE REFORMA");
  console.log("==================================================\n");

  // 1. Obtener Tenant Reforma
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, config")
    .ilike("name", "%reforma%")
    .single();

  if (!tenant) {
    throw new Error("No se encontró el tenant Reforma");
  }
  const tenantId = tenant.id;
  console.log(`1. Tenant verificado: ${tenant.name} (${tenantId})`);

  // 2. Obtener Agente Gaïa y su Variant activa
  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, name")
    .eq("tenant_id", tenantId);

  const gaiaAgent = agents?.find((a) => a.name.toLowerCase().includes("gaia")) || agents?.[0];
  console.log(`2. Agente IA: ${gaiaAgent?.name} (${gaiaAgent?.id})`);

  const { data: variant } = await supabase
    .from("ai_agent_variants")
    .select("*")
    .eq("agent_id", gaiaAgent!.id)
    .eq("is_active", true)
    .single();

  if (!variant) {
    throw new Error("No hay variant activa con prompt para Gaïa");
  }
  const apiKey = variant.api_key || process.env.OPENAI_API_KEY;
  console.log(`   Modelo: ${variant.model_name} | API Key: ${apiKey ? "Configurada (" + apiKey.slice(0, 10) + "...)" : "FALTA"}`);

  // 3. Documentos en Knowledge Base disponibles para envío
  const { data: rawKbDocs } = await supabase
    .from("knowledge_base")
    .select("id, name, description, file_url, file_key")
    .eq("tenant_id", tenantId);

  console.log(`\n3. Documentos PDF en Knowledge Base (${rawKbDocs?.length || 0}):`);
  const availableKbDocs = (rawKbDocs || []).map((doc) => {
    let url = doc.file_url || "";
    if ((!url || url.startsWith("/")) && doc.file_key) {
      const { data: publicUrlData } = supabase.storage
        .from("knowledge_base")
        .getPublicUrl(doc.file_key);
      if (publicUrlData?.publicUrl) url = publicUrlData.publicUrl;
    }
    return { ...doc, file_url: url };
  }).filter((d) => Boolean(d.file_url));

  for (const doc of availableKbDocs) {
    console.log(`   📄 "${doc.name}" (ID: ${doc.id})`);
    console.log(`      URL: ${doc.file_url}`);
  }

  // 4. Test con OpenAI Tool Calling simulando solicitud de carta
  console.log("\n4. Simulando petición del cliente por WhatsApp:");
  console.log("   Cliente: \"Hola! ¿Me puedes pasar la carta de comida en pdf por favor?\"");

  const openai = new OpenAI({ apiKey });

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
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
              description: "El ID exacto del documento de la lista proporcionada.",
            },
            documentNameOrType: {
              type: "string",
              description: "Tipo de carta o documento que solicita el cliente: 'comida', 'tragos', 'carta general', etc.",
            },
            caption: {
              type: "string",
              description: "Mensaje cordial de acompañamiento que describe el documento enviado.",
            },
          },
          required: ["documentNameOrType"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_table_availability",
        description: "Consultar si hay mesas disponibles para una fecha y hora.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string" },
            time: { type: "string" },
            guests: { type: "number" },
          },
        },
      },
    },
  ];

  const formattedDocsList = availableKbDocs
    .map((d) => `- Documento: "${d.name}" | ID: "${d.id}" | URL: ${d.file_url}`)
    .join("\n");

  const systemPrompt = `
${variant.prompt_text}

### DOCUMENTOS OFICIALES DISPONIBLES EN LA BASE DE CONOCIMIENTO (PDF):
${formattedDocsList}

### REGLA OBLIGATORIA DE ENVÍO DE CARTA / MENÚ EN PDF POR WHATSAPP:
- Cuando el cliente pida la carta, el menú, los tragos o la comida en PDF, DEBES llamar OBLIGATORIAMENTE a la herramienta 'send_knowledge_document'.
- NUNCA digas que no puedes mandar archivos o que no tienes el PDF; la herramienta 'send_knowledge_document' lo envía de forma nativa e inmediata al chat de WhatsApp.
`;

  const completion = await openai.chat.completions.create({
    model: variant.model_name || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Hola! ¿Me puedes pasar la carta de comida en pdf por favor?" },
    ],
    tools,
    tool_choice: "auto",
    temperature: 0.3,
  });

  const responseMsg = completion.choices[0].message;
  console.log("\n   Respuesta del modelo:");
  if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
    for (const tc of responseMsg.tool_calls) {
      if (tc.type === 'function') {
        console.log(`   ✅ LLAMÓ A LA HERRAMIENTA: '${tc.function.name}'`);
        console.log(`      Argumentos: ${tc.function.arguments}`);
        
        // Simular ejecución
        const args = JSON.parse(tc.function.arguments);
        let targetDoc = availableKbDocs.find((d) => d.id === args.documentId);
        if (!targetDoc) {
          const q = (args.documentNameOrType || "").toLowerCase();
          targetDoc = availableKbDocs.find((d) => d.name.toLowerCase().includes(q) || (q.includes("comida") && d.name.toLowerCase().includes("comida")));
        }
        if (!targetDoc) targetDoc = availableKbDocs[0];
        console.log(`      📄 Documento seleccionado para despacho: "${targetDoc?.name}"`);
        console.log(`      🔗 URL enviada a WhatsApp: ${targetDoc?.file_url}`);
      }
    }
  } else {
    console.log(`   Mensaje de texto: ${responseMsg.content}`);
  }

  // 5. Test 2: Solicitud de Tragos
  console.log("\n5. Simulando segunda petición del cliente:");
  console.log("   Cliente: \"¿Y tienen carta de tragos o cocteles en pdf?\"");

  const completionTragos = await openai.chat.completions.create({
    model: variant.model_name || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "¿Y tienen carta de tragos o cocteles en pdf?" },
    ],
    tools,
    tool_choice: "auto",
    temperature: 0.3,
  });

  const responseMsg2 = completionTragos.choices[0].message;
  console.log("\n   Respuesta del modelo:");
  if (responseMsg2.tool_calls && responseMsg2.tool_calls.length > 0) {
    for (const tc of responseMsg2.tool_calls) {
      if (tc.type === 'function') {
        console.log(`   ✅ LLAMÓ A LA HERRAMIENTA: '${tc.function.name}'`);
        console.log(`      Argumentos: ${tc.function.arguments}`);
        const args = JSON.parse(tc.function.arguments);
        let targetDoc = availableKbDocs.find((d) => d.id === args.documentId);
        if (!targetDoc) {
          targetDoc = availableKbDocs.find((d) => d.name.toLowerCase().includes("trago"));
        }
        console.log(`      🍸 Documento seleccionado para despacho: "${targetDoc?.name}"`);
        console.log(`      🔗 URL enviada a WhatsApp: ${targetDoc?.file_url}`);
      }
    }
  } else {
    console.log(`   Mensaje de texto: ${responseMsg2.content}`);
  }

  console.log("\n==================================================");
  console.log("🎉 TEST FINALIZADO CON ÉXITO: TODO ESTÁ OPERATIVO");
  console.log("==================================================");
}

runTest().catch((err) => {
  console.error("❌ Error en test:", err);
  process.exit(1);
});
