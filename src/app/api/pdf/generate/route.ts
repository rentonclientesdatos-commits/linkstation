import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/pdf/generate
 *
 * Body:
 *   - html_template: string   (HTML con {{placeholders}})
 *   - variables: object       (valores que reemplazan los {{placeholders}})
 *   - filename: string        (nombre del PDF, ej: "cotizacion.pdf")
 *   - paper_size: string      ("A4" | "Letter" | "Legal")
 *   - tenant_id: string       (para leer PDFCO_API_KEY del tenant config)
 *
 * Returns:
 *   - { success: true, url: string, output_variable: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      html_template,
      variables = {},
      filename = "cotizacion.pdf",
      paper_size = "Letter",
      tenant_id,
      output_variable = "pdf_url",
    } = body as {
      html_template: string;
      variables?: Record<string, string>;
      filename?: string;
      paper_size?: string;
      tenant_id?: string;
      output_variable?: string;
    };

    if (!html_template) {
      return NextResponse.json({ error: "html_template es requerido" }, { status: 400 });
    }

    // 1. Obtener API key de pdf.co (primero desde env, luego desde tenant config)
    let pdfCoApiKey = process.env.PDFCO_API_KEY?.trim();

    if (!pdfCoApiKey && tenant_id) {
      const supabase = await getAdminSupabaseClient();
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenant_id)
        .single();

      const config = tenant?.config as { pdfco?: { api_key?: string } } | null;
      pdfCoApiKey = config?.pdfco?.api_key;
    }

    if (!pdfCoApiKey) {
      return NextResponse.json(
        {
          error:
            "PDFCO_API_KEY no configurada. Ve a Ajustes → Integraciones → pdf.co para configurarla.",
        },
        { status: 503 }
      );
    }

    // 2. Reemplazar {{variables}} en el HTML template
    let resolvedHtml = html_template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      resolvedHtml = resolvedHtml.replace(regex, String(value));
    }

    // 3. Llamar a pdf.co API — HTML to PDF
    const pdfCoResponse = await fetch("https://api.pdf.co/v1/pdf/convert/from/html", {
      method: "POST",
      headers: {
        "x-api-key": pdfCoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: resolvedHtml,
        name: filename,
        paperSize: paper_size,
        orientation: "Portrait",
        printBackground: true,
        margins: "10px 10px 10px 10px",
        async: false,
      }),
    });

    if (!pdfCoResponse.ok) {
      const errText = await pdfCoResponse.text();
      console.error("[PDF GENERATOR] pdf.co HTTP error:", errText);
      return NextResponse.json(
        { error: `pdf.co error HTTP ${pdfCoResponse.status}: ${errText}` },
        { status: 502 }
      );
    }

    const pdfCoData = (await pdfCoResponse.json()) as {
      error?: boolean;
      message?: string;
      url?: string;
      name?: string;
    };

    if (pdfCoData.error) {
      console.error("[PDF GENERATOR] pdf.co returned error:", pdfCoData.message);
      return NextResponse.json(
        { error: `pdf.co: ${pdfCoData.message}` },
        { status: 422 }
      );
    }

    const pdfUrl = pdfCoData.url;
    if (!pdfUrl) {
      return NextResponse.json({ error: "pdf.co no devolvió URL." }, { status: 502 });
    }

    console.log(`[PDF GENERATOR] ✅ PDF generado: ${pdfUrl}`);

    return NextResponse.json({
      success: true,
      url: pdfUrl,
      output_variable,
      filename: pdfCoData.name || filename,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[PDF GENERATOR] Error crítico:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
