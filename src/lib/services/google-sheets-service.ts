/* eslint-disable @typescript-eslint/no-explicit-any -- service Google Sheets pre-Fase 4, refactor pendiente en Sprint 1 tarea 2-22 */
import { google } from "googleapis";
import { getAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * GOOGLE SHEETS SERVICE
 * Handles synchronization of lead data to Google Sheets via OAuth2.
 * Also supports reading rows for Ultravox tool calls (repuestos lookup, cotización data).
 */
export class GoogleSheetsService {
  private static async getOAuthClient(tenantId: string, googleConfig: any) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8500"}/api/integrations/google/callback`
    );

    oauth2Client.setCredentials(googleConfig.tokens);

    // Listen for token refresh events to save new tokens
    oauth2Client.on("tokens", async (tokens) => {
      console.log(`[SHEETS SERVICE] 🔄 Tokens refreshed for tenant ${tenantId}`);
      const supabase = (await getAdminSupabaseClient()) as any;
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();
      const currentConfig = tenant?.config || {};

      const updatedConfig = {
        ...currentConfig,
        google: {
          ...currentConfig.google,
          tokens: { ...currentConfig.google.tokens, ...tokens },
        },
      };

      await supabase
        .from("tenants")
        .update({ config: updatedConfig } as any)
        .eq("id", tenantId);
    });

    return oauth2Client;
  }

  /**
   * Appends a lead row to the configured Google Sheet.
   */
  static async appendLead(tenantId: string, lead: any) {
    try {
      const supabase = (await getAdminSupabaseClient()) as any;
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const config = tenant?.config?.google;

      if (!config || !config.connected || !config.tokens || !config.spreadsheetId) {
        console.log(
          `[SHEETS SERVICE] ℹ️ Google Sheets not connected or configured for tenant ${tenantId}`
        );
        return;
      }

      const auth = await this.getOAuthClient(tenantId, config);
      const sheets = google.sheets({ version: "v4", auth });

      // Prepare row data
      // Columns: Date | Name | Phone | Email | Country | Qualification | Origin | Campaign | Metadata
      const values = [
        [
          new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
          `${lead.nombre || ""} ${lead.apellido || ""}`.trim(),
          lead.telefono || "",
          lead.email || "",
          lead.pais || "",
          lead.cualificacion || lead.tipo_lead || "PENDIENTE",
          lead.origen || "",
          lead.campana || "",
          JSON.stringify(lead.metadata || {}),
        ],
      ];

      const sheetName = config.sheetName || "Leads";

      await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });

      console.log(
        `[SHEETS SERVICE] ✅ Lead ${lead.id} synced to Google Sheet ${config.spreadsheetId}`
      );
    } catch (error: any) {
      console.error(`[SHEETS SERVICE] ❌ Error syncing lead to Google Sheets:`, error.message);

      // Log error to system logs
      const supabase = await getAdminSupabaseClient();
      await supabase.from("system_logs").insert({
        tenant_id: tenantId,
        level: "ERROR",
        message: `Error sincronizando con Google Sheets: ${error.message}`,
        metadata: { leadId: lead.id },
      } as any);
    }
  }

  /**
   * Reads all rows from a given sheet tab and returns them as an array of objects.
   * The first row is treated as headers.
   */
  static async readRows(
    tenantId: string,
    sheetName?: string
  ): Promise<Array<Record<string, string>>> {
    try {
      const supabase = (await getAdminSupabaseClient()) as any;
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const config = tenant?.config?.google;

      if (!config || !config.connected || !config.tokens || !config.spreadsheetId) {
        console.log(
          `[SHEETS SERVICE] ℹ️ Google Sheets not connected for tenant ${tenantId}`
        );
        return [];
      }

      const auth = await this.getOAuthClient(tenantId, config);
      const sheets = google.sheets({ version: "v4", auth });

      const tab = sheetName || config.repuestosSheet || config.sheetName || "Repuestos";

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${tab}!A:Z`,
      });

      const rows = response.data.values || [];
      if (rows.length < 2) return []; // no data beyond headers

      const headers = (rows[0] as string[]).map((h) => h?.toString().trim().toLowerCase());
      return (rows.slice(1) as string[][]).map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i]?.toString().trim() || "";
        });
        return obj;
      });
    } catch (error: any) {
      console.error(`[SHEETS SERVICE] ❌ Error reading rows:`, error.message);
      return [];
    }
  }

  /**
   * Search for spare parts (repuestos) in Google Sheets.
   * Searches across common column names: codigo, descripcion, nombre, parte, part_number.
   * Returns matching rows with price and stock info.
   */
  static async searchRepuestos(
    tenantId: string,
    query: string,
    sheetName?: string
  ): Promise<Array<Record<string, string>>> {
    const rows = await this.readRows(tenantId, sheetName);
    if (!rows.length) return [];

    const q = query.toLowerCase().trim();
    const searchFields = [
      "codigo",
      "descripcion",
      "nombre",
      "parte",
      "part_number",
      "part number",
      "item",
      "repuesto",
      "modelo",
      "model",
      "referencia",
      "ref",
    ];

    return rows.filter((row) => {
      return searchFields.some((field) => {
        const val = row[field] || "";
        return val.toLowerCase().includes(q);
      });
    });
  }

  /**
   * Reads cotización/pricing data from a dedicated tab.
   * Returns all rows as structured objects for the Ultravox AI.
   */
  static async getCotizacionData(
    tenantId: string,
    sheetName?: string
  ): Promise<Array<Record<string, string>>> {
    return this.readRows(tenantId, sheetName || "Cotizacion");
  }
}
