import { getAdminSupabaseClient } from "@/lib/supabase/server";

export type LogLevel = "INFO" | "WARN" | "ERROR";
export type LogSource = "ORCHESTRATOR" | "API" | "RESCUE" | "WHATSAPP" | "INSTAGRAM" | "SYSTEM";

export class GlobalLogger {
  /**
   * Persists a log entry to the database and outputs to console.
   */
  static async log(
    tenantId: string,
    level: LogLevel,
    source: LogSource,
    message: string,
    metadata: Record<string, unknown> = {},
    errorCode?: string
  ) {
    try {
      const supabase = await getAdminSupabaseClient();

      // Console output with color-like prefixes
      const prefix = `[${level}] [${source}]`;
      if (level === "ERROR") console.error(prefix, message, metadata);
      else if (level === "WARN") console.warn(prefix, message, metadata);
      else console.log(prefix, message, metadata);

      // Persist to DB
      // Using a typed cast to avoid 'any' since system_logs might not be in the generated types
      const payload: Record<string, unknown> = {
        tenant_id: tenantId,
        level,
        source,
        message,
        metadata: metadata as Record<string, unknown>,
        error_code: errorCode,
      };

      const { error } = await supabase.from("system_logs").insert(payload);

      if (error) {
        // If the error is about the source column missing in schema cache, retry without it
        if (error.message.includes("column") && error.message.includes("source")) {
          const { source: _s, ...payloadWithoutSource } = payload;
          const { error: retryError } = await supabase
            .from("system_logs")
            .insert(payloadWithoutSource);

          if (retryError) {
            console.error(
              "[LOGGER FATAL] Failed to persist log even without source:",
              retryError.message
            );
          }
        } else {
          console.error("[LOGGER FATAL] Failed to persist log to DB:", error.message);
        }
      }
    } catch (e) {
      console.error("[LOGGER FATAL] Critical failure in logging system:", e);
    }
  }

  static async info(
    tenantId: string,
    source: LogSource,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    return this.log(tenantId, "INFO", source, message, metadata);
  }

  static async warn(
    tenantId: string,
    source: LogSource,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    return this.log(tenantId, "WARN", source, message, metadata);
  }

  static async error(
    tenantId: string,
    source: LogSource,
    message: string,
    metadata?: Record<string, unknown>,
    errorCode?: string
  ) {
    return this.log(tenantId, "ERROR", source, message, metadata, errorCode);
  }
}
