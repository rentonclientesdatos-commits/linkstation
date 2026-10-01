/**
 * Tests del helper de masking PII (BUG-SEC-03 fix Sprint 3).
 */
import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone } from "@/lib/security/pii-mask";

describe("maskEmail (BUG-SEC-03)", () => {
  it("enmascara email normal: jua***@dominio.com", () => {
    expect(maskEmail("juan.perez@dominio.com")).toBe("jua***@dominio.com");
  });

  it("respeta local-part corto (< 3 chars)", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
    expect(maskEmail("ab@example.org")).toBe("ab***@example.org");
  });

  it("preserva el dominio completo (útil para debug)", () => {
    expect(maskEmail("alice@linkstation.ai")).toBe("ali***@linkstation.ai");
  });

  it("retorna '***' para email sin @", () => {
    expect(maskEmail("noexisteat")).toBe("***");
  });

  it("retorna '***' para email que termina en @", () => {
    expect(maskEmail("nada@")).toBe("***");
  });

  it("retorna '***' para email que empieza por @", () => {
    expect(maskEmail("@dominio.com")).toBe("***");
  });

  it("retorna '***' para null/undefined/empty", () => {
    expect(maskEmail(null)).toBe("***");
    expect(maskEmail(undefined)).toBe("***");
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("   ")).toBe("***");
  });

  it("trim espacios alrededor antes de procesar", () => {
    expect(maskEmail("  user@example.com  ")).toBe("use***@example.com");
  });

  it("nunca expone el email completo", () => {
    const result = maskEmail("longusernamewithlots@example.com");
    expect(result).not.toContain("longusernamewithlots");
    expect(result.startsWith("lon***@")).toBe(true);
  });
});

describe("maskPhone (extra hardening)", () => {
  it("enmascara móvil internacional dejando últimos 3 dígitos", () => {
    // 11 dígitos tras el '+', últimos 3 visibles, el resto a '*'.
    expect(maskPhone("+34612345678")).toBe("+********678");
  });

  it("enmascara móvil nacional", () => {
    expect(maskPhone("612345678")).toBe("******678");
  });

  it("retorna '***' para entrada corta (<4 chars)", () => {
    expect(maskPhone("123")).toBe("***");
    expect(maskPhone("+1")).toBe("***");
  });

  it("retorna '***' para null/undefined/empty", () => {
    expect(maskPhone(null)).toBe("***");
    expect(maskPhone(undefined)).toBe("***");
    expect(maskPhone("")).toBe("***");
  });

  it("preserva el prefijo + en internacional", () => {
    const result = maskPhone("+34666999111");
    expect(result.startsWith("+")).toBe(true);
    expect(result.endsWith("111")).toBe(true);
  });
});
