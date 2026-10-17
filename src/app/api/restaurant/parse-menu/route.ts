import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { MenuProductsRepository } from "@/lib/repositories/inventory-repository";
import { getAuthServiceRoleKey } from "@/lib/auth-config";
import { createClient } from "@supabase/supabase-js";
import { extractTextFromPdf } from "@/lib/services/knowledge-upload-service";

// Route Segment Config
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const menuRepo = new MenuProductsRepository();

/**
 * GET /api/restaurant/parse-menu?tenantId=...&fileName=...
 * Genera una URL/token de subida firmada en Supabase Storage usando Service Role Key.
 * Permite al navegador subir directamente el PDF a Storage sin topar el límite
 * de 4.5MB de Vercel y sin violar las políticas de RLS de Supabase.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const fileName = searchParams.get("fileName") || "carta.pdf";

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getAuthServiceRoleKey()
    );

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `menu-uploads/${tenantId}/${Date.now()}_${safeFileName}`;

    const { data, error } = await supabase.storage
      .from("knowledge_base")
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (error || !data) {
      console.error("[parse-menu] Error generating signed upload URL:", error);
      return NextResponse.json(
        { error: error?.message || "No se pudo autorizar la subida a Storage." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      storagePath,
      token: data.token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[parse-menu] GET error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/restaurant/parse-menu
 *
 * Nuevo flujo (sin límite de body en Vercel ni problemas de RLS):
 *  1. El cliente obtiene un token firmado con GET
 *  2. El cliente sube el PDF con uploadToSignedUrl directo a Supabase Storage
 *  3. El cliente llama a este POST con { tenantId, storagePath }
 *  4. El servidor descarga el PDF, extrae el menú con IA e inserta los platos
 *  5. Limpia el archivo temporal del bucket
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

    // 1. Descargar PDF desde Supabase Storage con Service Role Key
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

    // Limpieza del archivo temporal en Supabase Storage (fire-and-forget)
    supabase.storage.from("knowledge_base").remove([storagePath]).catch(() => {
      console.warn("[parse-menu] No se pudo limpiar archivo temporal:", storagePath);
    });

    // 2. Obtener API key de OpenAI del tenant
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

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `Eres un extractor experto de cartas y menús de restaurantes, bares y cafeterías.
Tu trabajo es identificar TODOS los productos, platos, cócteles, vinos, cervezas, postres y bebidas que aparecen en el documento, junto con sus precios y categorías.

Responde ÚNICAMENTE con un JSON array válido con este formato:
[
  {
    "name": "Nombre exacto del producto",
    "description": "Ingredientes o descripción breve si existe, o null",
    "category": "entrante|principal|postre|bebida|especial",
    "price": 9900,
    "preparationTime": 15,
    "allergens": []
  }
]

REGLAS CRÍTICAS:
- category DEBE ser una de: "entrante", "principal", "postre", "bebida", "especial"
- price DEBE ser un número entero (ej: 8900 para $8.900 CLP o 12 para $12 USD). Si no hay precio explícito, coloca 0.
- Si un ítem es trago, cóctel, pisco, cerveza, vino, jugo, café, té o gaseosa -> category: "bebida"
- Si un ítem es postre, torta, pastel, helado o dulce -> category: "postre"
- Si es entrada, sopa, ensalada, picoteo o tabla -> category: "entrante"
- Si es plato de fondo, hamburguesa, sandwich, pizza, pasta o carne -> category: "principal"
- Si no encaja en las anteriores -> category: "especial"
- No omitas ningún producto; extrae absolutamente todos los que encuentres en la carta.`;

    // 3. Procesar el PDF con OpenAI: Intentar primero subida nativa de documento (visión + texto)
    let rawJson = "[]";
    let openAiFileId: string | null = null;

    try {
      const safeName = storagePath.split("/").pop() || "carta.pdf";
      const fileToUpload = await toFile(buffer, safeName, { type: "application/pdf" });
      const uploadedFile = await openai.files.create({
        file: fileToUpload,
        purpose: "user_data",
      });
      openAiFileId = uploadedFile.id;

      const extraction = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "file" as any,
                file: { file_id: uploadedFile.id },
              } as any,
              {
                type: "text",
                text: "Extrae todos los productos, platos, bebidas y cócteles de esta carta en el JSON array especificado.",
              },
            ],
          },
        ],
      });

      rawJson = extraction.choices[0]?.message?.content || "[]";
    } catch (nativeErr) {
      console.warn("[parse-menu] Fallback a extracción de texto tradicional:", nativeErr);

      // Fallback: extraer texto plano del PDF si la subida nativa falla
      const rawText = await extractTextFromPdf(buffer);
      if (!rawText || rawText.trim().length < 15) {
        return NextResponse.json(
          { error: "No se pudo extraer texto del PDF ni procesarlo como imagen. Asegúrate de que sea un archivo PDF legible." },
          { status: 422 }
        );
      }

      const textExtraction = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extrae todos los productos de este menú:\n\n${rawText.substring(0, 45000)}`,
          },
        ],
      });

      rawJson = textExtraction.choices[0]?.message?.content || "[]";
    } finally {
      if (openAiFileId) {
        openai.files.delete(openAiFileId).catch(() => {});
      }
    }

    // 4. Parsear el JSON extraído (tolerante a arrays directos u objetos { menu: [...] })
    let parsedItems: Array<Record<string, any>> = [];

    try {
      const cleanJson = rawJson
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsedData = JSON.parse(cleanJson);
      if (Array.isArray(parsedData)) {
        parsedItems = parsedData;
      } else if (typeof parsedData === "object" && parsedData !== null) {
        for (const k of ["menu", "items", "products", "productos", "platos", "dishes", "carta"]) {
          if (Array.isArray((parsedData as any)[k])) {
            parsedItems = (parsedData as any)[k];
            break;
          }
        }
        if (parsedItems.length === 0) {
          const firstArr = Object.values(parsedData).find((v) => Array.isArray(v));
          if (Array.isArray(firstArr)) {
            parsedItems = firstArr as any[];
          }
        }
      }
    } catch {
      console.error("[parse-menu] Failed to parse OpenAI JSON:", rawJson.substring(0, 500));
      return NextResponse.json(
        { error: "No se pudo estructurar el formato de la carta. Intenta nuevamente." },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      console.warn("[parse-menu] Raw response from OpenAI was:", rawJson.substring(0, 500));
      return NextResponse.json(
        { error: "No se encontraron productos en el documento. Verifica que el archivo corresponda a una carta con platos o bebidas." },
        { status: 422 }
      );
    }

    // 5. Insertar ítems en la base de datos con mapeo de campos flexible
    const validCategories = ["entrante", "principal", "postre", "bebida", "especial"];
    const inserted: string[] = [];
    const errors: string[] = [];

    type ValidCategory = "entrante" | "principal" | "postre" | "bebida" | "especial";

    for (const item of parsedItems) {
      const rawName = item.name || item.item || item.nombre || item.title || "";
      if (!rawName || typeof rawName !== "string" || !rawName.trim()) continue;

      const rawCategory = String(item.category || item.categoria || "").toLowerCase();
      const category: ValidCategory = validCategories.includes(rawCategory)
        ? (rawCategory as ValidCategory)
        : "especial";

      const rawPrice = item.price ?? item.precio ?? 0;
      const cleanPrice = typeof rawPrice === "number"
        ? rawPrice
        : parseInt(String(rawPrice).replace(/[^0-9]/g, ""), 10) || 0;

      const rawDesc = item.description || item.descripcion || "";
      const description = rawDesc ? String(rawDesc).substring(0, 500) : "";

      const rawPrepTime = Number(item.preparationTime || item.tiempoPreparacion) || 15;
      const rawAllergens = item.allergens || item.alergenos;

      const res = await menuRepo.create(tenantId, {
        tenantId,
        name: rawName.trim().substring(0, 200),
        description,
        category,
        price: Math.max(0, Math.round(cleanPrice)),
        isActive: true,
        preparationTime: Math.max(1, rawPrepTime),
        allergens: Array.isArray(rawAllergens) ? rawAllergens : [],
        recipe: [],
      });

      if (res.error) {
        errors.push(`${rawName}: ${res.error}`);
      } else {
        inserted.push(rawName);
      }
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      errors: errors.length,
      items: inserted,
      message: `Se cargaron exitosamente ${inserted.length} productos de la carta.${errors.length > 0 ? ` (${errors.length} no pudieron insertarse)` : ""}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("[parse-menu] Unexpected error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

