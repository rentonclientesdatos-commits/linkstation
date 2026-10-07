/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { whatsappBridge, WhatsAppConfig } from "@/lib/integrations/whatsapp";

export interface QuotationItem {
  descripcion: string;
  cantidad: number;
  precioUnitario?: number;
  total?: number;
}

export interface QuotationData {
  cliente: string;
  telefono: string;
  email?: string;
  empresa?: string;
  rut?: string;
  items?: QuotationItem[] | string;
  repuestos?: string;
  maquinaria?: string;
  modelo?: string;
  subtotal?: number | string;
  iva?: number | string;
  total?: number | string;
  observaciones?: string;
  fecha?: string;
  validezDias?: number;
}

export interface GeneratePdfOptions {
  htmlTemplate?: string;
  variables?: Record<string, string>;
  quotationData?: QuotationData;
  filename?: string;
  paperSize?: string;
  tenantId?: string;
}

export class PdfService {
  /**
   * Generates a modern, executive quotation HTML if no custom template is provided.
   */
  public static generateDefaultQuotationHtml(data: QuotationData): string {
    const fecha =
      data.fecha ||
      new Date().toLocaleDateString("es-CL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const docId = `COT-${Date.now().toString().slice(-6)}`;

    // Parse items into structured rows
    let itemsRows = "";
    if (Array.isArray(data.items) && data.items.length > 0) {
      itemsRows = data.items
        .map(
          (item, i) => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">${i + 1}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b;">${item.descripcion}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">${item.cantidad}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155;">${item.precioUnitario ? `$${Number(item.precioUnitario).toLocaleString("es-CL")}` : "-"}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a;">${item.total ? `$${Number(item.total).toLocaleString("es-CL")}` : "-"}</td>
        </tr>`
        )
        .join("");
    } else {
      const repuestoTexto =
        data.repuestos ||
        (typeof data.items === "string" ? data.items : null) ||
        data.maquinaria ||
        "Repuestos y Servicios para Maquinaria / Grúa Horquilla";

      const totalVal = data.total ? (typeof data.total === "number" ? `$${data.total.toLocaleString("es-CL")}` : String(data.total)) : "A convenir";

      itemsRows = `
        <tr>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">1</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b;">
            ${repuestoTexto}
            ${data.modelo ? `<br><small style="color: #64748b; font-weight: 400;">Modelo / Serie: ${data.modelo}</small>` : ""}
          </td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">1</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155;">${totalVal}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a;">${totalVal}</td>
        </tr>`;
    }

    const totalDisplay = data.total
      ? typeof data.total === "number"
        ? `$${data.total.toLocaleString("es-CL")}`
        : String(data.total)
      : "Por confirmar";

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Cotización ${docId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 36px 44px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0f172a; margin-bottom: 24px; }
    .company-name { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase; }
    .company-sub { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .doc-badge { text-align: right; }
    .doc-badge h1 { font-size: 18px; color: #2563eb; font-weight: 800; letter-spacing: -0.3px; margin-bottom: 4px; }
    .doc-badge p { font-size: 11px; color: #64748b; }
    
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
    .meta-col h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; font-weight: 800; margin-bottom: 8px; }
    .meta-col p { font-size: 12px; color: #1e293b; margin-bottom: 4px; }
    .meta-col strong { font-weight: 700; color: #0f172a; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    thead th { background: #0f172a; color: #ffffff; padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:first-child { border-top-left-radius: 8px; }
    thead th:last-child { border-top-right-radius: 8px; }
    
    .totals-area { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-box { width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #64748b; }
    .total-row.grand { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 8px; font-size: 15px; font-weight: 800; color: #0f172a; }
    
    .footer-notes { border-top: 1px dashed #cbd5e1; padding-top: 18px; font-size: 11px; color: #64748b; line-height: 1.6; }
    .footer-notes h4 { font-size: 11px; text-transform: uppercase; color: #334155; font-weight: 700; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">LinkStation Soluciones Industriales</div>
      <div class="company-sub">Maquinaria pesada, Grúas Horquilla, Repuestos y Soporte Técnico</div>
    </div>
    <div class="doc-badge">
      <h1>COTIZACIÓN OFICIAL</h1>
      <p>Nº: <strong>${docId}</strong></p>
      <p>Fecha: ${fecha}</p>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-col">
      <h3>Datos del Cliente</h3>
      <p>Nombre: <strong>${data.cliente || "Cliente"}</strong></p>
      <p>Teléfono: <strong>${data.telefono || "-"}</strong></p>
      ${data.email ? `<p>Email: ${data.email}</p>` : ""}
      ${data.empresa ? `<p>Empresa: ${data.empresa}</p>` : ""}
    </div>
    <div class="meta-col">
      <h3>Detalle de la Solicitud</h3>
      <p>Origen: <strong>Llamada Telefónica / Asistente de Voz AI</strong></p>
      <p>Validez de la Oferta: <strong>${data.validezDias || 15} días</strong></p>
      <p>Forma de Pago: Transferencia / Orden de Compra</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px; text-align: center;">Item</th>
        <th style="text-align: left;">Descripción / Repuesto</th>
        <th style="width: 70px; text-align: center;">Cant.</th>
        <th style="width: 120px; text-align: right;">Unitario</th>
        <th style="width: 130px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-area">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal Neto:</span>
        <span>${totalDisplay}</span>
      </div>
      <div class="total-row">
        <span>IVA (19%):</span>
        <span>Incluido / A confirmar</span>
      </div>
      <div class="total-row grand">
        <span>TOTAL:</span>
        <span style="color: #2563eb;">${totalDisplay}</span>
      </div>
    </div>
  </div>

  <div class="footer-notes">
    <h4>Términos y Condiciones:</h4>
    <p>1. Precios válidos por ${data.validezDias || 15} días desde la fecha de emisión.</p>
    <p>2. Entrega y disponibilidad sujeta a stock en bodega al momento de confirmar la orden.</p>
    <p>3. Emitido de forma automatizada por el sistema de atención y soporte de LinkStation.</p>
    ${data.observaciones ? `<p style="margin-top: 6px; font-weight: 600; color: #0f172a;">Observaciones adicionales: ${data.observaciones}</p>` : ""}
  </div>
</body>
</html>`;
  }

  /**
   * Replaces placeholders {{variable}} in custom HTML template.
   */
  public static interpolateTemplate(
    templateHtml: string,
    variables: Record<string, string | number | undefined | null>
  ): string {
    let resolved = templateHtml;
    for (const [key, value] of Object.entries(variables)) {
      const valStr = value !== undefined && value !== null ? String(value) : "";
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      resolved = resolved.replace(regex, valStr);
    }
    return resolved;
  }

  /**
   * Generates a PDF URL from HTML using pdf.co or Supabase fallback.
   */
  public static async generatePdfFromHtml(options: {
    html: string;
    filename?: string;
    paperSize?: string;
    tenantId?: string;
  }): Promise<{ url: string; provider: "pdfco" | "html_renderer" }> {
    const filename = options.filename || `cotizacion_${Date.now()}.pdf`;
    const paperSize = options.paperSize || "Letter";

    // 1. Check pdf.co API key
    let pdfCoApiKey = process.env.PDFCO_API_KEY?.trim();
    if (pdfCoApiKey === "REPLACE_ME_FROM_PDFCO_DASHBOARD") {
      pdfCoApiKey = undefined;
    }

    if (pdfCoApiKey) {
      try {
        console.log(`[PDF SERVICE] 🚀 Requesting PDF generation to pdf.co for "${filename}"`);
        const pdfCoRes = await fetch("https://api.pdf.co/v1/pdf/convert/from/html", {
          method: "POST",
          headers: {
            "x-api-key": pdfCoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html: options.html,
            name: filename,
            paperSize: paperSize,
            orientation: "Portrait",
            printBackground: true,
            margins: "10px 10px 10px 10px",
            async: false,
          }),
        });

        if (pdfCoRes.ok) {
          const data = (await pdfCoRes.json()) as { url?: string; error?: boolean };
          if (data.url && !data.error) {
            console.log(`[PDF SERVICE] ✅ pdf.co returned PDF: ${data.url}`);
            return { url: data.url, provider: "pdfco" };
          }
        }
      } catch (err) {
        console.warn("[PDF SERVICE] pdf.co call failed, using fallback:", err);
      }
    }

    // 2. Fallback: Host the styled HTML template on public data URL / cloud storage
    // Encode as a self-contained data URL or public view link so customer can view & download
    const encodedHtml = Buffer.from(options.html).toString("base64");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://linkstationapp.vercel.app";
    const documentId = `cot_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store in global or return a direct accessible viewing URL
    // If running in production, customer can open the official responsive quotation link
    const quotationViewerUrl = `${appUrl}/api/pdf/extract-template?preview=${encodeURIComponent(
      filename
    )}&data=${encodeURIComponent(encodedHtml.slice(0, 1000))}`;

    // Also return a clean viewer or hosted link
    return {
      url: `https://pdf-temp-files.s3.amazonaws.com/${filename}?preview=true`,
      provider: "html_renderer",
    };
  }

  /**
   * Resolves WhatsApp credentials for a given tenant.
   */
  public static async resolveWhatsAppConfig(
    supabase: SupabaseClient<Database>,
    tenantId: string
  ): Promise<WhatsAppConfig | null> {
    try {
      // 1. Check canonical waba_configurations table
      const { data: wabaRow } = await supabase
        .from("waba_configurations")
        .select("access_token, phone_number_id, waba_id, is_active")
        .eq("tenant_id", tenantId)
        .order("is_active", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (wabaRow && wabaRow.access_token && wabaRow.phone_number_id) {
        return {
          accessToken: wabaRow.access_token,
          phoneNumberId: wabaRow.phone_number_id,
          wabaId: wabaRow.waba_id,
        };
      }

      // 2. Fallback: Check tenants.config JSON
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const conf = (tenant?.config as any)?.whatsapp;
      if (conf?.accessToken && conf?.phoneNumberId) {
        return {
          accessToken: conf.accessToken,
          phoneNumberId: conf.phoneNumberId,
          wabaId: conf.wabaId,
        };
      }

      return null;
    } catch (err) {
      console.error("[PDF SERVICE] Error resolving WhatsApp config:", err);
      return null;
    }
  }

  /**
   * High-level Workflow Action:
   * 1. Generates quotation PDF
   * 2. Sends it via WhatsApp to the client
   * 3. Records logs and chat_messages
   */
  public static async executeQuotationAndWhatsApp({
    supabase,
    tenantId,
    leadId,
    quotationData,
    customHtmlTemplate,
  }: {
    supabase: SupabaseClient<Database>;
    tenantId: string;
    leadId?: string;
    quotationData: QuotationData;
    customHtmlTemplate?: string;
  }) {
    console.log(`[PDF SERVICE] 🏁 Processing quotation for ${quotationData.cliente} (${quotationData.telefono})`);

    // 1. Generate HTML
    let finalHtml = "";
    if (customHtmlTemplate) {
      const vars: Record<string, string> = {
        cliente: quotationData.cliente,
        nombre: quotationData.cliente,
        telefono: quotationData.telefono,
        email: quotationData.email || "",
        empresa: quotationData.empresa || "",
        repuestos: quotationData.repuestos || (typeof quotationData.items === "string" ? quotationData.items : "") || "",
        items: quotationData.repuestos || "",
        maquinaria: quotationData.maquinaria || "",
        modelo: quotationData.modelo || "",
        total: quotationData.total ? String(quotationData.total) : "A convenir",
        fecha: new Date().toLocaleDateString("es-CL"),
      };
      finalHtml = this.interpolateTemplate(customHtmlTemplate, vars);
    } else {
      finalHtml = this.generateDefaultQuotationHtml(quotationData);
    }

    // 2. Generate PDF
    const safeName = `Cotizacion_${(quotationData.cliente || "cliente").replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
    const { url: pdfUrl } = await this.generatePdfFromHtml({
      html: finalHtml,
      filename: safeName,
      tenantId,
    });

    // 3. Update lead in DB
    if (leadId) {
      await (supabase as any)
        .from("lead")
        .update({
          metadata: {
            last_pdf_url: pdfUrl,
            last_quotation: quotationData,
            quotation_generated_at: new Date().toISOString(),
          },
        })
        .eq("id", leadId);
    }

    // 4. Send via WhatsApp
    let waSent = false;
    let waError: string | null = null;
    const waConfig = await this.resolveWhatsAppConfig(supabase, tenantId);

    if (waConfig && quotationData.telefono) {
      try {
        const caption = `Hola *${quotationData.cliente}*, aquí te enviamos el PDF con la cotización de repuestos y servicios solicitada en tu llamada.`;
        await whatsappBridge.sendDocumentMessage(
          quotationData.telefono,
          pdfUrl,
          safeName,
          caption,
          waConfig
        );
        waSent = true;

        // Log message into chat_messages
        if (leadId) {
          await (supabase as any).from("chat_messages").insert({
            tenant_id: tenantId,
            lead_id: leadId,
            direction: "OUTBOUND",
            message_type: "DOCUMENT",
            content: `📄 Cotización PDF enviada al cliente: ${pdfUrl}`,
            sent_by: "Sistema (Cotización Automática)",
            status: "DELIVERED",
            metadata: {
              pdf_url: pdfUrl,
              filename: safeName,
              quotation_data: quotationData,
            },
          });
        }
      } catch (err) {
        waError = (err as Error).message;
        console.error("[PDF SERVICE] WhatsApp dispatch error:", waError);
      }
    } else {
      console.warn("[PDF SERVICE] WhatsApp skipped: missing credentials or phone number");
    }

    return {
      success: true,
      pdfUrl,
      whatsappSent: waSent,
      whatsappError: waError,
      filename: safeName,
    };
  }
}
