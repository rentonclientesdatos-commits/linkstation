import { NextResponse } from "next/server";
import OpenAI from "openai";
import ExcelJS from "exceljs";

export const maxDuration = 60;

/**
 * POST /api/pdf/extract-template
 *
 * Accepts a sample document (PDF, Excel, CSV) via multipart/form-data.
 * Analyzes the layout, tables, and headers with GPT-4o.
 * Returns an HTML template with CSS, dynamic {{variables}}, and suggested template name.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const fileName = file.name || "documento";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    // 1. Parse Excel
    if (extension === "xlsx" || extension === "xls" || extension === "csv") {
      try {
        const workbook = new ExcelJS.Workbook();
        if (extension === "csv") {
          await workbook.csv.read(buffer as unknown as any);
        } else {
          await workbook.xlsx.load(buffer);
        }

        const lines: string[] = [];
        workbook.eachSheet((worksheet, sheetId) => {
          lines.push(`--- HOJA: ${worksheet.name} (ID: ${sheetId}) ---`);
          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            const values = Array.isArray(row.values)
              ? row.values.slice(1).map((v) => (v !== null && v !== undefined ? String(v) : ""))
              : [];
            if (values.length > 0) {
              lines.push(`Fila ${rowNumber}: | ${values.join(" | ")} |`);
            }
          });
        });
        extractedText = lines.join("\n");
      } catch (excelErr) {
        console.error("[EXTRACT TEMPLATE] Excel parsing error:", excelErr);
        return NextResponse.json(
          { error: `Error leyendo el archivo Excel: ${(excelErr as Error).message}` },
          { status: 400 }
        );
      }
    }
    // 2. Parse PDF
    else if (extension === "pdf") {
      try {
        const pdfModule = await import("pdf-parse");
        const pdfFunc =
          typeof (pdfModule as any).default === "function"
            ? (pdfModule as any).default
            : typeof pdfModule === "function"
              ? pdfModule
              : (pdfModule as any).PDFParse;

        if (typeof pdfFunc === "function") {
          const pdfData = await pdfFunc(buffer);
          extractedText = pdfData.text || "";
        } else {
          extractedText = buffer.toString("utf-8").slice(0, 5000);
        }
      } catch (pdfErr) {
        console.error("[EXTRACT TEMPLATE] PDF parsing error:", pdfErr);
        // Fallback: try raw string extraction of visible characters
        extractedText = buffer.toString("latin1").replace(/[^\x20-\x7E\n\r]/g, " ").slice(0, 5000);
      }
    } else {
      return NextResponse.json(
        { error: "Formato no soportado. Por favor sube un archivo PDF (.pdf) o Excel (.xlsx, .xls, .csv)" },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No se pudo extraer texto o contenido legible del archivo proporcionado." },
        { status: 400 }
      );
    }

    // 3. Obtain OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY no configurada en el servidor" },
        { status: 500 }
      );
    }

    // 4. Generate HTML Template and Variables with GPT-4o
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Eres un diseñador experto en plantillas HTML/CSS profesionales para cotizaciones, presupuestos y órdenes de servicio que se convierten a PDF con pdf.co.
El usuario te dará el contenido y la estructura extraída de su archivo de muestra (${fileName}).

Tu objetivo es recrear fielmente la estructura visual (encabezado, datos del cliente, tabla de items/repuestos/servicios, subtotales y total) en un HTML limpio y estilizado con CSS integrado, utilizando placeholders {{variable}} para los campos dinámicos.

Debes responder ÚNICAMENTE en formato JSON con la siguiente estructura exacta:
{
  "templateName": "Nombre descriptivo sugerido para la plantilla (ej: Cotización Grúas Horquilla)",
  "htmlTemplate": "<!DOCTYPE html><html><head><meta charset=\\"utf-8\\"><style>...</style></head><body>...</body></html>",
  "variables": {
    "cliente": "{{lead.nombre}}",
    "telefono": "{{lead.telefono}}",
    "empresa": "{{empresa}}",
    "total": "{{total}}"
  }
}

Reglas del HTML:
1. Debe tener <!DOCTYPE html>, fuentes legibles (Arial o sans-serif), márgenes adecuados para hoja Letter/A4, colores sobrios y modernos.
2. La cabecera debe incluir espacio para logo o nombre de la empresa, número de documento y fecha.
3. Debe contener una tabla de items/productos con columnas claras (Descripción, Cantidad, Precio Unitario, Total).
4. Debe contener los placeholders {{placeholder}} para que puedan ser inyectados dinámicamente antes de enviar a pdf.co y WhatsApp.
5. El objeto "variables" debe listar todas las variables dinámicas que se usaron en el HTML con un valor inicial sugerido.`,
        },
        {
          role: "user",
          content: `Archivo original: "${fileName}"\n\nContenido extraído del documento de muestra:\n\n${extractedText.slice(0, 15000)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return NextResponse.json(
        { error: "No se recibió respuesta del modelo de IA" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(responseContent);

    return NextResponse.json({
      success: true,
      templateName: parsed.templateName || "Plantilla Generada",
      htmlTemplate: parsed.htmlTemplate || "",
      variables: parsed.variables || {},
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[EXTRACT TEMPLATE] Unhandled exception:", err);
    return NextResponse.json({ error: err.message || "Error procesando el archivo" }, { status: 500 });
  }
}
