import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MenuProductsRepository } from "@/lib/repositories/inventory-repository";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { createClient } from "@supabase/supabase-js";
import { extractTextFromPdf } from "@/lib/services/knowledge-upload-service";

// Route Segment Config
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const menuRepo = new MenuProductsRepository();

/**
 * POST /api/restaurant/parse-menu
 *
 * Nuevo flujo (sin límite de body en Vercel):
 *  1. El cliente sube el PDF directo a Supabase Storage → recibimos solo storagePath
 *  2. El servidor descarga el PDF desde Storage (server-side, sin límite de Vercel)
 *  3. Extrae texto con extractTextFromPdf
 *  4. Llama a OpenAI gpt-4o-mini para estructurar los ítems
 *  5. Inserta en restaurant_menu_items
 *  6. Limpia el archivo temporal del bucket
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, storagePath } = body as {
      tenantId?: string;
      storagePath?: string;
    };

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }
    if (!storagePath) {
      return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
    }

    // 1. Descargar PDF desde Supabase Storage (server-side, sin límite de body)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getAuthServiceRoleKey()
    );

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("knowledge_base")
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `No se pudo descargar el PDF desde Storage: ${downloadError?.message}` },
        { status: 422 }
      );
    }

    // Convertir Blob → Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extraer texto del PDF
    let rawText = "";
    try {
      rawText = await extractTextFromPdf(buffer);
    } catch (pdfErr) {
      console.error("[parse-menu] PDF extraction error:", pdfErr);
      await supabase.storage.from("knowledge_base").remove([storagePath]);
      return NextResponse.json(
        { error: "No se pudo leer el PDF. Asegúrate de que el archivo no esté protegido." },
        { status: 422 }
      );
    }

    // Limpieza del archivo temporal (fire-and-forget)
    supabase.storage.from("knowledge_base").remove([storagePath]).catch(() => {
      console.warn("[parse-menu] No se pudo limpiar el archivo temporal:", storagePath);
    });

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "El PDF no contiene texto legible (puede ser una imagen escaneada)." },
        { status: 422 }
      );
    }

    // 3. Obtener API key de OpenAI del tenant
    const { data: tenantAgents } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("tenant_id", tenantId);

    const agentIds = (tenantAgents || []).map((a: { id: string }) => a.id);

    let agentApiKey: string | null = null;
    if (agentIds.length > 0) {
      const { data: agentVariant } = await supabase
        .from("ai_agent_variants")
        .select("api_key")
        .eq("is_active", true)
        .not("api_key", "is", null)
        .in("agent_id", agentIds)
        .limit(1)
        .maybeSingle();
      agentApiKey = agentVariant?.api_key ?? null;
    }

    const apiKey = agentApiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "No se encontró API key de OpenAI para este tenant." },
        { status: 500 }
      );
    }

    // 4. Llamar a OpenAI gpt-4o-mini para estructurar los ítems
    const openai = new OpenAI({ apiKey });

    const extraction = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `Eres un extractor de cartas de restaurante. 
Recibirás el texto extraído de un PDF de carta/menú de un restaurante.
Tu trabajo es identificar TODOS los platos, bebidas y productos con sus precios y categorías.

Responde ÚNICAMENTE con un JSON array válido con este formato exacto:
[
  {
    "name": "Nombre del plato",
    "description": "Descripción breve o null",
    "category": "entrante|principal|postre|bebida|especial",
    "price": 9900,
    "preparationTime": 15,
    "allergens": ["Gluten", "Lácteos"]
  }
]

REGLAS:
- category SOLO puede ser: "entrante", "principal", "postre", "bebida", "especial"
- price en número entero (sin símbolo $, sin puntos de miles). Si no hay precio claro, usa 0.
- preparationTime estimado en minutos según el tipo de plato (bebidas: 3, entrantes: 10, principales: 20, postres: 12)
- allergens: array vacío [] si no se mencionan alérgenos
- Si un ítem es bebida alcohólica o cóctel → category: "bebida"
- Si un ítem es postre, helado o dulce → category: "postre"
- Si un ítem parece ser de entrada, tapa o para compartir → category: "entrante"
- Si un ítem es plato de fondo, principal o de fuerza → category: "principal"
- Si es una especialidad del chef o fuera de categoría clara → category: "especial"
- NO incluyas categorías, secciones, títulos ni descripciones generales, SOLO productos individuales
- NO inventes precios: si no ves un número asociado al producto, usa 0`,
        },
        {
          role: "user",
          content: `Extrae todos los productos de este menú:\n\n${rawText.substring(0, 12000)}`,
        },
      ],
    });

    const rawJson = extraction.choices[0]?.message?.content || "[]";

    // 5. Parsear el JSON extraído
    let parsedItems: Array<{
      name: string;
      description?: string;
      category: string;
      price: number;
      preparationTime?: number;
      allergens?: string[];
    }> = [];

    try {
      const cleanJson = rawJson
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedItems = JSON.parse(cleanJson);
    } catch {
      console.error("[parse-menu] Failed to parse OpenAI JSON:", rawJson.substring(0, 500));
      return NextResponse.json(
        { error: "No se pudo estructurar la carta. Intenta con otro PDF o con menos páginas." },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos en el PDF. Verifica que sea una carta de restaurante." },
        { status: 422 }
      );
    }

    // 6. Insertar ítems en la base de datos
    const validCategories = ["entrante", "principal", "postre", "bebida", "especial"];
    const inserted: string[] = [];
    const errors: string[] = [];

    type ValidCategory = "entrante" | "principal" | "postre" | "bebida" | "especial";
    for (const item of parsedItems) {
      const category: ValidCategory = validCategories.includes(item.category)
        ? (item.category as ValidCategory)
        : "especial";

      const res = await menuRepo.create(tenantId, {
        tenantId,
        name: String(item.name || "").trim().substring(0, 200),
        description: item.description ? String(item.description).substring(0, 500) : "",
        category,
        price: Math.max(0, Math.round(Number(item.price) || 0)),
        isActive: true,
        preparationTime: Math.max(1, Number(item.preparationTime) || 15),
        allergens: Array.isArray(item.allergens) ? item.allergens : [],
        recipe: [],
      });

      if (res.error) {
        errors.push(`${item.name}: ${res.error}`);
      } else {
        inserted.push(item.name);
      }
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      errors: errors.length,
      items: inserted,
      message: `Se cargaron ${inserted.length} productos de la carta.${errors.length > 0 ? ` ${errors.length} no pudieron insertarse.` : ""}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("[parse-menu] Unexpected error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
