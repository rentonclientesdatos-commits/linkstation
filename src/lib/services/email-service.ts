import nodemailer from "nodemailer";

export interface SendQuotationEmailParams {
  to: string;
  cliente: string;
  cotizacionNumero: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
  maquinaria?: string;
  repuestos?: string;
  total?: string;
}

export class EmailService {
  /**
   * Resolves SMTP transporter based on environment variables or tenant config.
   */
  private static getTransporter() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;

    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Sends the quotation PDF via email as an attachment.
   */
  public static async sendQuotationEmail(params: SendQuotationEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const transporter = this.getTransporter();

      if (!transporter) {
        console.warn(
          "[EMAIL SERVICE] ⚠️ SMTP credentials not configured (SMTP_USER/SMTP_PASS). Email dispatch skipped."
        );
        return {
          success: false,
          error: "Credenciales SMTP no configuradas en el servidor.",
        };
      }

      const fromAddress =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        `"Ventas Jorklift" <repuesto@jorklift.cl>`;

      const mailOptions = {
        from: fromAddress,
        to: params.to,
        replyTo: "repuesto@jorklift.cl",
        subject: `Cotización Oficial ${params.cotizacionNumero} - Jorklift SPA`,
        text: `Estimado(a) ${params.cliente},\n\n` +
          `Junto con saludar, adjuntamos la cotización oficial ${params.cotizacionNumero} solicitada para su equipo ${params.maquinaria || "grúa horquilla"}.\n\n` +
          `Detalle solicitado: ${params.repuestos || "Repuestos y servicios"}\n` +
          (params.total ? `Total Estimado: ${params.total}\n\n` : "\n") +
          `Quedamos atentos a cualquier consulta.\n\n` +
          `Atentamente,\n` +
          `Ventas de Repuestos JORKLIFT\n` +
          `Las Encinas 600 - Cerrillos, Santiago\n` +
          `Teléfono: +56 9 5236 3088 | Email: repuesto@jorklift.cl\n` +
          `www.jorklift.cl`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0f172a; padding: 20px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; letter-spacing: -0.5px; text-transform: uppercase;">Jorklift SPA · Soluciones para Maquinaria</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Grúas Horquilla, Repuestos y Soporte Técnico</p>
            </div>
            
            <div style="padding: 24px;">
              <p style="font-size: 14px;">Estimado(a) <strong>${params.cliente}</strong>,</p>
              
              <p style="font-size: 13px; color: #475569; line-height: 1.6;">
                Junto con saludar cordialmente, le enviamos adjunta la <strong>Cotización Oficial ${params.cotizacionNumero}</strong> generada para su requerimiento técnico.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin: 18px 0; font-size: 12px;">
                <p style="margin: 3px 0;"><strong>🚜 Maquinaria:</strong> ${params.maquinaria || "Grúa Horquilla / Multimarca"}</p>
                <p style="margin: 3px 0;"><strong>⚙️ Repuestos:</strong> ${params.repuestos || "Repuestos y servicios solicitados"}</p>
                ${params.total ? `<p style="margin: 3px 0; font-size: 13px; color: #2563eb;"><strong>💰 Total:</strong> ${params.total}</p>` : ""}
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                En el archivo PDF adjunto encontrará el desglose completo de ítems, condiciones de entrega, validez de la oferta y datos bancarios para transferencia.
              </p>

              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                <p style="margin: 2px 0;"><strong>Ventas de Repuestos JORKLIFT</strong></p>
                <p style="margin: 2px 0;">Las Encinas 600, Cerrillos, Santiago de Chile</p>
                <p style="margin: 2px 0;">WhatsApp: +56 9 5236 3088 | <a href="mailto:repuesto@jorklift.cl" style="color: #2563eb;">repuesto@jorklift.cl</a></p>
                <p style="margin: 2px 0;"><a href="https://www.jorklift.cl" style="color: #2563eb;">www.jorklift.cl</a></p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: params.pdfFilename,
            content: params.pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      };

      console.log(`[EMAIL SERVICE] 📤 Sending quotation PDF email to ${params.to}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SERVICE] ✅ Email sent successfully. Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[EMAIL SERVICE] ❌ Error sending quotation email:", errMsg);
      return {
        success: false,
        error: errMsg,
      };
    }
  }
}
