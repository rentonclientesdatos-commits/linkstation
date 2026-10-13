// Sprint 4 - GoogleSheetsAdapter
//
// Cliente Google Sheets/Drive para una SheetConnection. Construye el OAuth2
// client con credenciales del tenant + tokens cifrados, expone:
//   - readRows(): lee toda la pestania como array de filas.
//   - writeCells(): batch update de celdas (write-back).
//   - setupWatch(): registra Drive push notification channel (TTL 7 dias).
//   - stopWatch(): desactiva un canal antes del expiry.
//   - getUserEmail(): para mostrar "Conectado como X" en UI.
//   - listUserSpreadsheets(): listado para el Picker (fallback no-Picker).
//
// NOTA: este adapter NO implementa ICRMProvider (Sheets no es CRM tradicional).
// Tiene su propia API alineada con el modelo row-based de Sheets.

import { google, sheets_v4, drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import {
  getAppCredentials,
  getOAuthBaseUrl,
  getOAuthTokens,
  saveOAuthTokens,
  getSheetsIntegration,
} from "./credentials";
import { SheetsAdapterError } from "./types";

const REDIRECT_PATH = "/api/integrations/google/callback";
const DRIVE_WATCH_TTL_DAYS = 7;
const DRIVE_WATCH_RENEW_BEFORE_HOURS = 24;

export class GoogleSheetsAdapter {
  private oauth2!: any;
  private integrationId!: string;
  private sheets!: sheets_v4.Sheets;
  private drive!: drive_v3.Drive;

  private constructor(private readonly tenantId: string) {}

  /**
   * Factory: resuelve credenciales del tenant + tokens y crea el adapter
   * listo para llamadas API. Tokens caducados se refrescan automaticamente
   * y los nuevos se persisten cifrados.
   */
  static async forTenant(tenantId: string): Promise<GoogleSheetsAdapter> {
    const adapter = new GoogleSheetsAdapter(tenantId);
    const creds = await getAppCredentials(tenantId);
    const row = await getSheetsIntegration(tenantId);
    if (!row) {
      throw new SheetsAdapterError(
        "OAUTH_MISSING",
        `Tenant ${tenantId} no tiene integration Sheets`
      );
    }
    adapter.integrationId = row.id;

    const tokens = await getOAuthTokens(tenantId);
    if (!tokens?.access_token || !tokens.refresh_token) {
      throw new SheetsAdapterError(
        "OAUTH_MISSING",
        `Tenant ${tenantId} no ha completado OAuth todavia`
      );
    }

    const redirectUri = `${getOAuthBaseUrl()}${REDIRECT_PATH}`;
    adapter.oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
    adapter.oauth2.setCredentials(tokens);

    // Persistir tokens refrescados.
    adapter.oauth2.on("tokens", (next: any) => {
      const merged = {
        access_token: next.access_token ?? tokens.access_token,
        refresh_token: next.refresh_token ?? tokens.refresh_token,
        expiry_date: next.expiry_date ?? tokens.expiry_date,
        scope: next.scope ?? tokens.scope,
        token_type: next.token_type ?? tokens.token_type,
      };
      void saveOAuthTokens(adapter.integrationId, merged);
    });

    adapter.sheets = google.sheets({ version: "v4", auth: adapter.oauth2 });
    adapter.drive = google.drive({ version: "v3", auth: adapter.oauth2 });
    return adapter;
  }

  // ─── Lectura ───────────────────────────────────────────────────────────────

  /**
   * Lee filas crudas de la pestania. range incluye TODA la hoja (A1:notation
   * sin acotar -> Google devuelve hasta el ultimo dato).
   */
  async readRows(spreadsheetId: string, sheetTabName: string): Promise<unknown[][]> {
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetTabName.replace(/'/g, "''")}'`,
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      return (res.data.values ?? []) as unknown[][];
    } catch (err) {
      throw new SheetsAdapterError(
        "READ_FAILED",
        `Error leyendo Sheet ${spreadsheetId}/${sheetTabName}`,
        err
      );
    }
  }

  /** Metadata basica del spreadsheet (nombre, pestanias). Util para UI. */
  async getSpreadsheetMeta(spreadsheetId: string): Promise<{
    name: string;
    tabs: Array<{ title: string; sheetId: number; rowCount: number; columnCount: number }>;
  }> {
    try {
      const res = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title,sheets.properties",
      });
      const name = res.data.properties?.title ?? spreadsheetId;
      const tabs = (res.data.sheets ?? []).map((s) => ({
        title: s.properties?.title ?? "",
        sheetId: s.properties?.sheetId ?? 0,
        rowCount: s.properties?.gridProperties?.rowCount ?? 0,
        columnCount: s.properties?.gridProperties?.columnCount ?? 0,
      }));
      return { name, tabs };
    } catch (err) {
      throw new SheetsAdapterError(
        "READ_FAILED",
        `Error leyendo metadata de Sheet ${spreadsheetId}`,
        err
      );
    }
  }

  // ─── Escritura (write-back) ────────────────────────────────────────────────

  /**
   * Batch update de celdas. Cells indica letra + rowIndex (1-based, fila real
   * en la Sheet) + valor. Util para reflejar cambios de stage del lead.
   */
  async writeCells(
    spreadsheetId: string,
    sheetTabName: string,
    cells: Array<{ letter: string; rowIndex: number; value: string | number | boolean | null }>
  ): Promise<void> {
    if (cells.length === 0) return;
    try {
      const data = cells.map((c) => ({
        range: `'${sheetTabName.replace(/'/g, "''")}'!${c.letter}${c.rowIndex + 1}`,
        values: [[c.value === null ? "" : c.value]],
      }));
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          // RAW, no USER_ENTERED (SEC-S4-07, formula injection): los valores son
          // datos de aplicación (stage del lead, etc.) y deben escribirse literales.
          // Con USER_ENTERED un valor que empiece por "=", "+", "-" o "@" se
          // interpretaría como fórmula en la Sheet del cliente.
          valueInputOption: "RAW",
          data,
        },
      });
    } catch (err) {
      throw new SheetsAdapterError(
        "WRITE_FAILED",
        `Error escribiendo ${cells.length} celdas en ${spreadsheetId}`,
        err
      );
    }
  }

  // ─── Drive push notifications (watch channel) ──────────────────────────────

  /**
   * Registra un canal de notificacion Drive para detectar cambios en el
   * spreadsheet. Drive limita el TTL a 7 dias maximo - el cron lo renueva
   * 24h antes del expiry. Devuelve los datos del canal para persistir en
   * sheet_connections.
   */
  async setupWatch(spreadsheetId: string): Promise<{
    channelId: string;
    channelToken: string;
    resourceId: string;
    expiry: Date;
  }> {
    const channelId = randomUUID();
    const channelToken = randomUUID();
    const expirationMs = Date.now() + DRIVE_WATCH_TTL_DAYS * 24 * 60 * 60 * 1000;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8500"}/api/webhooks/google-sheets`;

    try {
      const res = await this.drive.files.watch({
        fileId: spreadsheetId,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: channelToken,
          expiration: String(expirationMs),
        },
      });
      const resourceId = res.data.resourceId;
      const expiration = res.data.expiration ? Number(res.data.expiration) : expirationMs;
      if (!resourceId) {
        throw new SheetsAdapterError("WATCH_FAILED", "Drive no devolvio resourceId");
      }
      return {
        channelId,
        channelToken,
        resourceId,
        expiry: new Date(expiration),
      };
    } catch (err) {
      throw new SheetsAdapterError(
        "WATCH_FAILED",
        `Error registrando watch channel para ${spreadsheetId}`,
        err
      );
    }
  }

  async stopWatch(channelId: string, resourceId: string): Promise<void> {
    try {
      await this.drive.channels.stop({
        requestBody: { id: channelId, resourceId },
      });
    } catch (err) {
      // Si el canal ya expiro, Drive devuelve 404 - no es error real.
      console.warn(`[SheetsAdapter] stopWatch falló (canal probablemente expirado):`, err);
    }
  }

  // ─── Info del usuario ──────────────────────────────────────────────────────

  async getUserEmail(): Promise<string | null> {
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2 });
      const info = await oauth2.userinfo.get();
      return info.data.email ?? null;
    } catch (err) {
      console.warn("[SheetsAdapter] no se pudo resolver userinfo:", err);
      return null;
    }
  }

  /**
   * Lista los spreadsheets que el usuario ha autorizado vía Picker para esta
   * app (scope drive.file solo ve esos). Util como fallback cuando Picker no
   * disponible o para refrescar nombres.
   */
  async listUserSpreadsheets(
    maxResults = 50
  ): Promise<Array<{ id: string; name: string; modifiedTime: string }>> {
    try {
      const res = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: "files(id,name,modifiedTime)",
        pageSize: maxResults,
        orderBy: "modifiedTime desc",
      });
      return (res.data.files ?? []).map((f) => ({
        id: f.id ?? "",
        name: f.name ?? "",
        modifiedTime: f.modifiedTime ?? "",
      }));
    } catch (err) {
      throw new SheetsAdapterError("READ_FAILED", "Error listando spreadsheets del usuario", err);
    }
  }

  /** Token bruto para el Google Picker en cliente (solo access_token, NO refresh). */
  getAccessTokenForClient(): string | null {
    return this.oauth2.credentials.access_token ?? null;
  }
}

export const SHEETS_WATCH_RENEW_THRESHOLD_MS = DRIVE_WATCH_RENEW_BEFORE_HOURS * 60 * 60 * 1000;
