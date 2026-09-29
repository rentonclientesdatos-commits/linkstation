/**
 * ZohoCRMProvider tests — cubre los 7 bugs B-01..B-07 + 429 + 5xx + token rotation.
 *
 * Mockea TokenManager para no necesitar DB, y MSW para respuestas HTTP.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { server } from "@/../tests/mocks/server";
import { zohoHandlers } from "@/../tests/mocks/zoho-handlers";

// Mock TokenManager — devuelve tokens fijos sin hitting DB.
const { getValidTokensMock, invalidateTokenMock, registerRefresherMock } = vi.hoisted(() => ({
  getValidTokensMock: vi.fn(),
  invalidateTokenMock: vi.fn(),
  registerRefresherMock: vi.fn(),
}));

vi.mock("@/lib/integrations/crm/token-manager", async () => {
  const actual = await vi.importActual<typeof import("@/lib/integrations/crm/token-manager")>(
    "@/lib/integrations/crm/token-manager"
  );
  return {
    ...actual,
    getValidTokens: getValidTokensMock,
    invalidateToken: invalidateTokenMock,
    registerRefresher: registerRefresherMock,
  };
});

// Importar después de los mocks (orden importa).
import { ZohoCRMProvider } from "@/lib/integrations/crm/providers/zoho";

const EU_API = "https://www.zohoapis.eu";
const EU_ACCOUNTS = "https://accounts.zoho.eu";

describe("ZohoCRMProvider — B-01/B-02 (multi-DC: NO hardcoded US)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS }));
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at_eu",
      refreshToken: "zoho_rt_eu",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("hace llamadas al api domain EU cuando metadata.api_domain = EU", async () => {
    const provider = new ZohoCRMProvider({
      integrationId: "int-eu",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS, location: "eu" },
    });
    const lead = await provider.getLead("111");
    expect(lead).not.toBeNull();
    expect(lead?.id).toBe("111");
    // Si llamara a US, MSW devolvería onUnhandledRequest=error.
  });

  it("constructor lanza error si integrationId set y api_domain missing", () => {
    expect(
      () =>
        new ZohoCRMProvider({
          integrationId: "int-eu",
          metadata: { accounts_server: EU_ACCOUNTS },
        })
    ).toThrowError(/api_domain/);
  });
});

describe("ZohoCRMProvider — B-03 (401 → invalidate + retry una vez)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at",
      refreshToken: "zoho_rt",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("primer 401 → invalidate + retry → 200 OK", async () => {
    server.use(...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS, authFailures: 1 }));
    const provider = new ZohoCRMProvider({
      integrationId: "int-401",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    const ok = await provider.healthcheck();
    expect(ok).toBe(true);
    expect(invalidateTokenMock).toHaveBeenCalledWith("int-401");
  });

  it("dos 401 consecutivos → throw AUTH_FAILED (no infinite retry)", async () => {
    server.use(...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS, authFailures: 5 }));
    const provider = new ZohoCRMProvider({
      integrationId: "int-401x2",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    // healthcheck() captura excepciones internamente; usamos searchLeads que las propaga.
    await expect(provider.searchLeads("Last_Name:starts_with:Z", 1, 200)).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
  });
});

describe("ZohoCRMProvider — B-04 (OAuth init flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS }));
  });

  it("getAuthorizationUrl produce URL accounts.zoho.eu con scopes + state encoded", () => {
    const provider = new ZohoCRMProvider({
      clientId: "client123",
      clientSecret: "secret",
      metadata: { accounts_server: EU_ACCOUNTS, location: "eu" },
    });
    const url = provider.getAuthorizationUrl("STATE_TOKEN", "http://app/callback");
    expect(url).toMatch(/^https:\/\/accounts\.zoho\.eu\/oauth\/v2\/auth/);
    expect(url).toContain("state=STATE_TOKEN");
    expect(url).toContain("access_type=offline");
    expect(decodeURIComponent(url)).toContain("ZohoCRM.modules.leads.READ");
    expect(decodeURIComponent(url)).toContain("http://app/callback");
  });

  it("completeOAuth POSTea a tokenUrl y devuelve tokens + apiBase", async () => {
    const provider = new ZohoCRMProvider({
      clientId: "client123",
      clientSecret: "secret",
      metadata: { accounts_server: EU_ACCOUNTS, location: "eu" },
    });
    const tokens = await provider.completeOAuth("CODE", "http://app/callback");
    expect(tokens.accessToken).toBe("zoho_at_initial");
    expect(tokens.refreshToken).toBe("zoho_rt_initial");
    expect(tokens.apiBase).toBe(EU_API);
  });
});

describe("ZohoCRMProvider — B-05 (paginación searchLeads)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS }));
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at",
      refreshToken: "zoho_rt",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("page 1 devuelve 200 records (per_page=200)", async () => {
    const provider = new ZohoCRMProvider({
      integrationId: "int-page",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    const results = await provider.searchLeads("Last_Name:starts_with:User", 1, 200);
    expect(results).toHaveLength(200);
  });

  it("page 2 devuelve 50 records (final page)", async () => {
    const provider = new ZohoCRMProvider({
      integrationId: "int-page2",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    const results = await provider.searchLeads("Last_Name:starts_with:User", 2, 200);
    expect(results).toHaveLength(50);
  });
});

describe("ZohoCRMProvider — B-06 (módulo configurable)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at",
      refreshToken: "zoho_rt",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("module Deals → paths van a /Deals/...", async () => {
    server.use(
      ...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS, moduleName: "Deals" })
    );
    const provider = new ZohoCRMProvider({
      integrationId: "int-deals",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS, module_name: "Deals" },
    });
    const ok = await provider.healthcheck();
    expect(ok).toBe(true);
  });
});

describe("ZohoCRMProvider — B-07 (findLeadByEmail exact match)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS }));
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at",
      refreshToken: "zoho_rt",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("findLeadByEmail usa ?email= (no criteria) y devuelve match exacto", async () => {
    const provider = new ZohoCRMProvider({
      integrationId: "int-email",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    const lead = await provider.findLeadByEmail("test@example.com");
    expect(lead).not.toBeNull();
    expect(lead?.fields.email).toBe("test@example.com");
  });
});

describe("ZohoCRMProvider — 429 con backoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at",
      refreshToken: "zoho_rt",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("respeta Retry-After=0 y reintenta una vez", async () => {
    server.use(
      ...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS, rateLimitedOnce: true })
    );
    const provider = new ZohoCRMProvider({
      integrationId: "int-429",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    const ok = await provider.healthcheck();
    expect(ok).toBe(true);
  });
});

describe("ZohoCRMProvider — 5xx exp backoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getValidTokensMock.mockResolvedValue({
      accessToken: "zoho_at",
      refreshToken: "zoho_rt",
      expiresAt: Date.now() + 3600_000,
      apiBase: EU_API,
    });
  });

  it("503 → retry → 200 OK (con timer fake para no esperar 8s)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(
      ...zohoHandlers({ apiBase: EU_API, accountsServer: EU_ACCOUNTS, serverErrorsBefore200: 2 })
    );
    const provider = new ZohoCRMProvider({
      integrationId: "int-5xx",
      metadata: { api_domain: EU_API, accounts_server: EU_ACCOUNTS },
    });
    const ok = await provider.healthcheck();
    expect(ok).toBe(true);
    vi.useRealTimers();
  }, 15000);
});

describe("ZohoCRMProvider — getCapabilities", () => {
  it("retorna el objeto literal con hasDataCenters=true y oauthFlow correcto", () => {
    const provider = new ZohoCRMProvider({ metadata: { api_domain: EU_API } });
    const caps = provider.getCapabilities();
    expect(caps.hasDataCenters).toBe(true);
    expect(caps.hasBlueprints).toBe(true);
    expect(caps.oauthFlow).toBe("authorization_code");
  });
});
