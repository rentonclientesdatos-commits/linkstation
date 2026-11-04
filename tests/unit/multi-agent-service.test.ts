import { describe, it, expect, vi, beforeEach } from "vitest";
import { MultiAgentService } from "@/lib/services/multi-agent-service";

const { mockFrom, mockChatCreate } = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(),
    mockChatCreate: vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Respuesta del especialista técnico" } }],
    }),
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

// Mock LLM Client
vi.mock("@/lib/llm/llm-client", () => ({
  getLLMClient: vi.fn().mockReturnValue({
    chat: {
      completions: {
        create: mockChatCreate,
      },
    },
  }),
}));

// Mock Knowledge Base Service
vi.mock("@/lib/services/knowledge-base", () => ({
  KnowledgeBaseService: {
    search: vi.fn().mockResolvedValue([{ content: "Fragmento técnico verificado" }]),
  },
}));

interface MockChain {
  select: (...args: any[]) => MockChain;
  eq: (...args: any[]) => MockChain;
  neq: (...args: any[]) => MockChain;
  in: (...args: any[]) => MockChain;
  order: (...args: any[]) => MockChain;
  single: () => Promise<any>;
  limit: (...args: any[]) => MockChain;
  update: (...args: any[]) => MockChain;
  then: (onfulfilled: (value: any) => any) => Promise<any>;
}

function createChain(resolvedData: any, error: any = null): MockChain {
  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    neq: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    limit: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    then: (onfulfilled: any) => Promise.resolve({ data: resolvedData, error }).then(onfulfilled),
  };
  return chain;
}

describe("MultiAgentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch available agents excluding the current agent", async () => {
    const agentsList = [
      { id: "agent-1", name: "Agente Ventas", created_at: "2026-01-01" },
      { id: "agent-2", name: "Agente Soporte", created_at: "2026-01-02" },
    ];
    const variantsList = [
      { agent_id: "agent-1", prompt_text: "Eres experto en ventas.", model_name: "gpt-4o", is_active: true },
      { agent_id: "agent-2", prompt_text: "Eres experto en soporte técnico.", model_name: "gpt-4o-mini", is_active: true },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_agents") return createChain(agentsList);
      if (table === "ai_agent_variants") return createChain(variantsList);
      return createChain([]);
    });

    const result = await MultiAgentService.getAvailableAgents("tenant-1", "current-agent");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("agent-1");
    expect(result[0].name).toBe("Agente Ventas");
    expect(result[1].name).toBe("Agente Soporte");
  });

  it("should successfully transfer lead to target agent and record handoff history", async () => {
    const targetAgent = { id: "agent-2", name: "Agente Soporte" };
    const initialLead = {
      id: "lead-100",
      metadata: { origen: "whatsapp", tags: ["vip"] },
    };

    let updatedPayload: any = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_agents") {
        return createChain(targetAgent);
      }
      if (table === "lead") {
        const chain = createChain(initialLead);
        chain.update = vi.fn().mockImplementation((payload) => {
          updatedPayload = payload;
          return createChain(null);
        });
        return chain;
      }
      return createChain(null);
    });

    const transferResult = await MultiAgentService.transferLeadToAgent({
      tenantId: "tenant-1",
      leadId: "lead-100",
      currentAgentId: "agent-1",
      targetAgentId: "agent-2",
      reason: "Cliente solicita soporte técnico urgente",
      handoffMessage: "Te paso con nuestro especialista en soporte técnico...",
    });

    expect(transferResult.success).toBe(true);
    expect(transferResult.targetAgentName).toBe("Agente Soporte");
    expect(updatedPayload).not.toBeNull();
    expect(updatedPayload.ai_agent_id).toBe("agent-2");
    expect(updatedPayload.inactivity_sent_count).toBe(0);
    expect(updatedPayload.metadata.last_agent_handoff.to_agent_id).toBe("agent-2");
    expect(updatedPayload.metadata.last_agent_handoff.reason).toBe("Cliente solicita soporte técnico urgente");
  });

  it("should fail transfer if target agent does not belong to tenant", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_agents") {
        return createChain(null, new Error("Not found"));
      }
      return createChain(null);
    });

    const result = await MultiAgentService.transferLeadToAgent({
      tenantId: "tenant-1",
      leadId: "lead-100",
      targetAgentId: "unknown-agent",
      reason: "transfer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Target agent");
  });

  it("should consult specialist agent internally and return answer", async () => {
    const specialistAgent = { id: "agent-specialist", name: "Especialista Maquinaria" };
    const variantData = [
      {
        prompt_text: "Eres experto en grúas horquillas y especificaciones hidráulicas.",
        api_key: "sk-test-key",
        model_name: "gpt-4o",
        knowledge_base_ids: [],
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "ai_agents") return createChain(specialistAgent);
      if (table === "ai_agent_variants") return createChain(variantData);
      return createChain([]);
    });

    const consultation = await MultiAgentService.consultSpecialistAgent({
      tenantId: "tenant-1",
      leadId: "lead-100",
      targetAgentId: "agent-specialist",
      query: "¿La grúa X-500 soporta carga de 5 toneladas?",
    });

    expect(consultation.success).toBe(true);
    expect(consultation.specialistName).toBe("Especialista Maquinaria");
    expect(consultation.response).toBe("Respuesta del especialista técnico");
    expect(mockChatCreate).toHaveBeenCalled();
  });
});
