// Sprint 1 — Tarea 2-37 logger estructurado con scrubbing PII básico.
// Sprint 3 — Tarea 4-03 (phase-02 Observabilidad): migrado a Pino v10 internamente,
// preservando la API pública (createLogger, logger, Logger interface).
// Pino 5x más rápido que la implementación manual previa, output JSON estructurado
// compatible con Easypanel/Dokploy log aggregation, campos `tenant_id` para filtrado.
//
// IMPORTANTE: NO usar en Edge runtime (Pino requiere process.stdout, worker_threads).
// Endpoints Edge usan console.log o Response.json directo.

import pino, { type Logger as PinoLogger } from "pino";

const LOG_LEVEL =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

// Scrubbing PII: claves cuyo valor se reemplaza por [REDACTED] en logs.
// Aplicado por Pino via `redact` config — más performante que recursion manual.
const SENSITIVE_KEYS = [
  "password",
  "api_key",
  "apikey",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "authorization",
  "credentials_cipher",
  "encryption_key",
];

// Generar paths de redacción para Pino:
// - top-level (api_key, token, ...)
// - meta.* (meta.api_key, ...)
// - meta.*.* (meta.outer.api_key, ...) — 2 niveles de profundidad dentro de meta
// - *.* (cualquier rama 1 nivel debajo de root: ej. requestBody.api_key)
const REDACT_PATHS = [
  ...SENSITIVE_KEYS,
  ...SENSITIVE_KEYS.map((k) => `meta.${k}`),
  ...SENSITIVE_KEYS.map((k) => `meta.*.${k}`),
  ...SENSITIVE_KEYS.map((k) => `*.${k}`),
];

// Singleton Pino — una sola instancia para todo el proceso.
//
// En test/vitest usamos un stream que escribe via process.stdout.write para que vi.spyOn
// pueda capturar cada línea. En prod usamos pino.destination(1) (escribe directo a fd 1,
// más performante porque bypasea el Writable de Node.js).
const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const testStream = {
  write(chunk: string) {
    process.stdout.write(chunk);
  },
};

const basePinoLogger: PinoLogger = pino(
  {
    level: LOG_LEVEL,
    base: { service: "linkstation", env: process.env.NODE_ENV },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
      remove: false,
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  isTest ? testStream : pino.destination({ dest: 1, sync: false })
);

export interface Logger {
  trace: (msg: string, meta?: Record<string, unknown>) => void;
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Crea un logger con scope (ej. "widget", "orchestrator", "webhook.retell").
 * El scope se añade como campo `scope` en todos los logs del child.
 */
export function createLogger(scope: string): Logger {
  const child = basePinoLogger.child({ scope });
  return {
    trace: (msg, meta) => child.trace(meta ? { meta } : {}, msg),
    debug: (msg, meta) => child.debug(meta ? { meta } : {}, msg),
    info: (msg, meta) => child.info(meta ? { meta } : {}, msg),
    warn: (msg, meta) => child.warn(meta ? { meta } : {}, msg),
    error: (msg, meta) => child.error(meta ? { meta } : {}, msg),
  };
}

/**
 * Logger raw de Pino para casos que necesitan API completa (child loggers tipados,
 * bindings dinámicos por tenant_id, etc).
 */
export const pinoLogger = basePinoLogger;

/**
 * Helper específico para logs con contexto multi-tenant.
 * Uso: `const log = tenantLogger(tenantId, { action: "webhook.retell" });`
 */
export function tenantLogger(tenantId: string, context: Record<string, unknown> = {}) {
  return basePinoLogger.child({ tenant_id: tenantId, ...context });
}

/**
 * Logger por defecto sin scope (compat con código previo Sprint 1).
 */
export const logger = createLogger("app");
