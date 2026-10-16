import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MenuProductsRepository } from "@/lib/repositories/inventory-repository";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { createClient } from "@supabase/supabase-js";

const menuRepo = new MenuProductsRepository();

/**
 * POST /api/restaurant/parse-menu
 * Receives a PDF file (multipart/form-data), extracts menu items using
 * OpenAI gpt-4o-mini, and inserts them into restaurant_menu_items for the tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tenantId = formData.get("tenantId") as string;
    const file = formData.get("file") as File | null;

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }

    // 1. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extract raw text from PDF using pdf-parse
    let rawText = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text || "";
    } catch (pdfErr) {
      console.error("[parse-menu] pdf-parse error:", pdfErr);
      return NextResponse.json(
        { error: "No se pudo leer el PDF. Asegúrate de que el archivo no esté protegido." },
        { status: 422 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "El PDF no contiene texto legible (puede ser una imagen escaneada)." },
        { status: 422 }
      );
    }

    // 3. Get tenant's OpenAI API key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getAuthServiceRoleKey()
    );

    // Two-step query: first get agent IDs for tenant, then get API key
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

    // 4. Call OpenAI gpt-4o-mini to extract structured menu items
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

    // 5. Parse the extracted JSON
    let parsedItems: Array<{
      name: string;
      description?: string;
      category: string;
      price: number;
      preparationTime?: number;
      allergens?: string[];
    }> = [];

    try {
      // Strip markdown code blocks if present
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

    // 6. Insert items into DB
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
        description: item.description ? String(item.description).substring(0, 500) : undefined,
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
