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
   * Helper to parse CSV formatted text into array of row objects
   */
  private static parseCsv(csvText: string): Array<Record<string, string>> {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/^["']|["']$/g, "").trim()
    );
    return lines.slice(1).map((line) => {
      const values = parseLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || "").replace(/^["']|["']$/g, "").trim();
      });
      return obj;
    });
  }

  /**
   * Reads all rows from a given sheet tab and returns them as an array of objects.
   * Tries multiple resolution strategies:
   * 1. GoogleSheetsAdapter via sheet_connections / integrations (Sprint 4 OAuth)
   * 2. tenant.config.google (legacy OAuth config)
   * 3. Public Google Sheet CSV export (fallback)
   */
  static async readRows(
    tenantId: string,
    sheetName?: string
  ): Promise<Array<Record<string, string>>> {
    const supabase = (await getAdminSupabaseClient()) as any;

    // ── STRATEGY 1: Sprint 4 GoogleSheetsAdapter via sheet_connections ──
    try {
      const { GoogleSheetsAdapter } = await import("@/lib/integrations/sheets/adapter");
      const adapter = await GoogleSheetsAdapter.forTenant(tenantId);
      const { data: conn } = await supabase
        .from("sheet_connections")
        .select("spreadsheet_id, sheet_tab_name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (conn?.spreadsheet_id) {
        const targetTab = sheetName || conn.sheet_tab_name || "Repuestos";
        console.log(`[SHEETS SERVICE] 📖 Reading via OAuth adapter from spreadsheet: ${conn.spreadsheet_id}, tab: ${targetTab}`);
        const rawRows = await adapter.readRows(conn.spreadsheet_id, targetTab);
        if (rawRows && rawRows.length > 1) {
          const headers = (rawRows[0] as string[]).map((h) => String(h || "").trim().toLowerCase());
          return (rawRows.slice(1) as string[][]).map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = String(row[i] || "").trim();
            });
            return obj;
          });
        }
      }
    } catch (adapterErr: any) {
      // Normal fallback if OAuth adapter is not configured yet
      console.log(`[SHEETS SERVICE] ℹ️ Adapter strategy not active (${adapterErr?.message || "unconnected"}), trying config/csv fallback...`);
    }

    // ── STRATEGY 2: Legacy tenant.config.google OAuth ──
    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("config")
        .eq("id", tenantId)
        .single();

      const config = tenant?.config?.google;

      if (config?.connected && config?.tokens && config?.spreadsheetId) {
        const auth = await this.getOAuthClient(tenantId, config);
        const sheets = google.sheets({ version: "v4", auth });
        const tab = sheetName || config.repuestosSheet || config.sheetName || "Repuestos";

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: config.spreadsheetId,
          range: `${tab}!A:Z`,
        });

        const rows = response.data.values || [];
        if (rows.length >= 2) {
          const headers = (rows[0] as string[]).map((h) => h?.toString().trim().toLowerCase());
          return (rows.slice(1) as string[][]).map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = row[i]?.toString().trim() || "";
            });
            return obj;
          });
        }
      }

      // ── STRATEGY 3: Public Google Sheet CSV export or direct spreadsheetId ──
      const spreadsheetId =
        config?.spreadsheetId ||
        config?.sheetId ||
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

      if (spreadsheetId) {
        const targetTab = sheetName || config?.repuestosSheet || config?.sheetName || "Repuestos";
        console.log(`[SHEETS SERVICE] 🌐 Attempting public CSV fetch for spreadsheet ${spreadsheetId} (${targetTab})...`);
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetTab)}`;
        const res = await fetch(csvUrl, { next: { revalidate: 60 } });
        if (res.ok) {
          const text = await res.text();
          const parsed = this.parseCsv(text);
          if (parsed.length > 0) {
            console.log(`[SHEETS SERVICE] ✅ Retrieved ${parsed.length} rows via public CSV fetch.`);
            return parsed;
          }
        }
      }
    } catch (error: any) {
      console.error(`[SHEETS SERVICE] ❌ Error in readRows:`, error.message);
    }

    return [];
  }

  /**
   * Search for spare parts (repuestos) in Google Sheets with tokenized smart matching.
   * Searches across common column names: codigo, descripcion, nombre, parte, part_number, modelo.
   * Returns matching rows with price and stock info, ranked by relevance.
   */
  static async searchRepuestos(
    tenantId: string,
    query: string,
    sheetName?: string
  ): Promise<Array<Record<string, string>>> {
    const rows = await this.readRows(tenantId, sheetName);
    if (!rows.length) return [];

    const rawQuery = query.toLowerCase().trim();
    if (!rawQuery) return [];

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
      "marca",
    ];

    // Filter out common conversational stop words in Spanish
    const stopWords = new Set([
      "para", "de", "el", "la", "los", "las", "un", "una", "unos", "unas",
      "por", "favor", "necesito", "cotizar", "cotizacion", "precio", "cuanto",
      "cuesta", "tienen", "hay", "grua", "horquilla", "repuesto", "repuestos",
      "solicito", "quiero", "busco", "y", "en", "con"
    ]);

    const queryTokens = rawQuery
      .split(/[\s,+/_-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !stopWords.has(t));

    // First: Check for direct substring match
    const directMatches = rows.filter((row) =>
      searchFields.some((field) => {
        const val = (row[field] || "").toLowerCase();
        return val.includes(rawQuery);
      })
    );

    if (directMatches.length > 0) {
      return directMatches;
    }

    // Second: Token-based relevance scoring
    if (queryTokens.length === 0) return [];

    const scored = rows
      .map((row) => {
        let score = 0;
        const combinedText = searchFields
          .map((f) => (row[f] || "").toLowerCase())
          .join(" ");

        for (const token of queryTokens) {
          if (combinedText.includes(token)) {
            score += 1;
            // Extra weight if token matches exact part code
            const code = (row["codigo"] || row["code"] || row["ref"] || "").toLowerCase();
            if (code.includes(token)) {
              score += 2;
            }
          }
        }
        return { row, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((item) => item.row);
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
