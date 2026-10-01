/**
 * Tests del logger (Sprint 1 tarea 2-37, migrado a Pino en Sprint 3 phase-02).
 *
 * Cambios de comportamiento vs Sprint 1:
 * - Pino escribe TODOS los niveles a stdout (estándar JSON logging) — los log aggregators
 *   filtran por campo `level` en cada line. No más split stdout/stderr.
 * - Scrubbing PII via `redact` de Pino: cubre paths estáticos (top-level + meta.* + *.).
 *   El recursive deep-redact se delega al consumidor: si necesitas redactar a 3+ niveles,
 *   pre-procesa el objeto o usa Pino `redact.paths` con paths específicos.
 * - Campo `scope` se añade vía `child({ scope })` — sigue presente top-level en cada log.
 * - Pino añade `time` (ISO8601) en lugar de `ts`. Tests actualizados.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "@/lib/utils/logger";

describe("logger (2-37 → Pino phase-02)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: any;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("emite info a stdout con JSON estructurado (level, scope, msg, time)", () => {
    const log = createLogger("test-scope");
    log.info("hello", { foo: "bar" });
    expect(stdoutSpy).toHaveBeenCalled();
    const written = String(stdoutSpy.mock.calls[0]?.[0] ?? "");
    const parsed = JSON.parse(written.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.scope).toBe("test-scope");
    expect(parsed.msg).toBe("hello");
    expect(parsed.meta).toEqual({ foo: "bar" });
    expect(parsed.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.service).toBe("linkstation");
  });

  it("emite error con level=error a stdout (Pino: todos los niveles a stdout)", () => {
    const log = createLogger("scope-x");
    log.error("boom");
    expect(stdoutSpy).toHaveBeenCalled();
    const written = String(stdoutSpy.mock.calls[0]?.[0] ?? "");
    const parsed = JSON.parse(written.trim());
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("boom");
  });

  it("scrub redacta claves sensibles top-level en meta", () => {
    const log = createLogger("scope");
    log.info("auth", {
      api_key: "sk-secret",
      access_token: "tok",
      password: "pw",
      credentials_cipher: "iv:ct:tag",
      normal_field: "visible",
    });
    const written = String(stdoutSpy.mock.calls[0]?.[0] ?? "");
    const parsed = JSON.parse(written.trim());
    expect(parsed.meta.api_key).toBe("[REDACTED]");
    expect(parsed.meta.access_token).toBe("[REDACTED]");
    expect(parsed.meta.password).toBe("[REDACTED]");
    expect(parsed.meta.credentials_cipher).toBe("[REDACTED]");
    expect(parsed.meta.normal_field).toBe("visible");
  });

  it("scrub aplica a primer nivel de anidación dentro de meta (paths *.)", () => {
    const log = createLogger("scope");
    log.info("nested", {
      outer: {
        api_key: "secret",
        safe: "visible",
      },
    });
    const written = String(stdoutSpy.mock.calls[0]?.[0] ?? "");
    const parsed = JSON.parse(written.trim());
    expect(parsed.meta.outer.api_key).toBe("[REDACTED]");
    expect(parsed.meta.outer.safe).toBe("visible");
  });
});
