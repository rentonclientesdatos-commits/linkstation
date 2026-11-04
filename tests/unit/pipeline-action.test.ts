import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPipelineStages,
  getPipelineData,
  updateLeadStage,
  savePipelineStages,
  DEFAULT_PIPELINE_STAGES,
  type PipelineStage,
} from "@/lib/actions/pipeline";

const { mockFrom, mockGetActiveTenantConfig } = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
    mockGetActiveTenantConfig: vi.fn(),
  };
});

// Mock Supabase Server
vi.mock("@/lib/supabase/server", () => ({
  getAdminSupabaseClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}));

// Mock Tenant Action
vi.mock("@/lib/actions/tenant", () => ({
  getActiveTenantConfig: mockGetActiveTenantConfig,
}));

interface MockChain {
  select: (...args: any[]) => MockChain;
  eq: (...args: any[]) => MockChain;
  gte: (...args: any[]) => MockChain;
  lte: (...args: any[]) => MockChain;
  order: (...args: any[]) => MockChain;
  limit: (...args: any[]) => MockChain;
  single: () => Promise<any>;
  update: (...args: any[]) => MockChain;
  then: (onfulfilled: (value: any) => any) => Promise<any>;
}

function createChain(resolvedData: any, error: any = null): MockChain {
  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    gte: vi.fn().mockImplementation(() => chain),
    lte: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    limit: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    then: (onfulfilled: any) => Promise.resolve({ data: resolvedData, error }).then(onfulfilled),
  };
  return chain;
}

describe("Pipeline Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPipelineStages", () => {
    it("should return DEFAULT_PIPELINE_STAGES when no config exists", async () => {
      const stages = await getPipelineStages();
      expect(stages).toEqual(DEFAULT_PIPELINE_STAGES);
    });

    it("should return saved pipeline_stages sorted by order", async () => {
      const savedStages: PipelineStage[] = [
        { id: "s2", name: "Segunda", segmentKey: "DOS", color: "indigo", order: 2 },
        { id: "s1", name: "Primera", segmentKey: "UNO", color: "blue", order: 1 },
      ];
      const stages = await getPipelineStages({ pipeline_stages: savedStages });
      expect(stages[0].id).toBe("s1");
      expect(stages[1].id).toBe("s2");
    });

    it("should generate stages from custom segmentations array", async () => {
      const customSegments = ["NUEVO", "EN REVISIÓN", "CERRADO"];
      const stages = await getPipelineStages({ segmentations: customSegments });
      expect(stages).toHaveLength(3);
      expect(stages[0].segmentKey).toBe("NUEVO");
      expect(stages[1].segmentKey).toBe("EN REVISIÓN");
      expect(stages[2].segmentKey).toBe("CERRADO");
    });
  });

  describe("getPipelineData", () => {
    it("should return error if no active tenant is selected", async () => {
      mockGetActiveTenantConfig.mockResolvedValue(null);
      const result = await getPipelineData();
      expect(result.success).toBe(false);
      expect(result.error).toContain("No hay tenant activo");
    });

    it("should fetch active tenant stages and leads successfully", async () => {
      mockGetActiveTenantConfig.mockResolvedValue({
        id: "tenant-100",
        name: "Test Tenant",
        config: {},
      });

      const mockLeads = [
        {
          id: "lead-1",
          nombre: "Ana",
          apellido: "López",
          telefono: "+34611111111",
          email: "ana@test.com",
          segmentacion: "PUESTO 1",
          tipo_lead: "CUALIFICADO",
          origen: "whatsapp",
          campana: "Verano 2026",
          fecha_creacion: "2026-06-01T10:00:00Z",
          fecha_actualizacion: "2026-06-01T12:00:00Z",
          last_interaction_at: null,
          is_ai_enabled: true,
          is_ai_paused: false,
          metadata: {},
        },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === "lead") return createChain(mockLeads);
        return createChain([]);
      });

      const result = await getPipelineData();
      expect(result.success).toBe(true);
      expect(result.tenantId).toBe("tenant-100");
      expect(result.leads).toHaveLength(1);
      expect(result.leads[0].nombre).toBe("Ana");
      expect(result.stages).toEqual(DEFAULT_PIPELINE_STAGES);
    });
  });

  describe("updateLeadStage", () => {
    it("should update lead segmentacion in database", async () => {
      mockGetActiveTenantConfig.mockResolvedValue({ id: "tenant-100" });

      let updatePayload: any = null;
      mockFrom.mockImplementation((table: string) => {
        if (table === "lead") {
          const chain = createChain(null);
          chain.update = vi.fn().mockImplementation((payload) => {
            updatePayload = payload;
            return chain;
          });
          return chain;
        }
        return createChain(null);
      });

      const result = await updateLeadStage("lead-1", "AGENDADO");
      expect(result.success).toBe(true);
      expect(updatePayload).not.toBeNull();
      expect(updatePayload.segmentacion).toBe("AGENDADO");
    });
  });

  describe("savePipelineStages", () => {
    it("should save stages into tenant config and synchronize segmentations", async () => {
      mockGetActiveTenantConfig.mockResolvedValue({ id: "tenant-100" });

      const currentConfig = { business_type: "general" };
      let updatedConfigSaved: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === "tenants") {
          const chain = createChain({ config: currentConfig });
          chain.update = vi.fn().mockImplementation((payload) => {
            updatedConfigSaved = payload;
            return chain;
          });
          return chain;
        }
        return createChain(null);
      });

      const newStages: PipelineStage[] = [
        { id: "s1", name: "Paso 1", segmentKey: "PASO_1", color: "blue", order: 0 },
        { id: "s2", name: "Paso 2", segmentKey: "PASO_2", color: "emerald", order: 1 },
      ];

      const result = await savePipelineStages(newStages);
      expect(result.success).toBe(true);
      expect(updatedConfigSaved).not.toBeNull();
      expect(updatedConfigSaved.config.pipeline_stages).toHaveLength(2);
      expect(updatedConfigSaved.config.segmentations).toEqual(["PASO_1", "PASO_2"]);
    });
  });
});
