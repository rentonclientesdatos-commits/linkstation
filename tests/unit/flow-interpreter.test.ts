import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlowInterpreter } from "@/lib/core/flow/interpreter";
import axios from "axios";

// Mock axios
vi.mock("axios");

// Mock OpenAI
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "Respuesta de la IA simulada" } }],
          }),
        },
      },
    })),
  };
});

// Mock auth config
vi.mock("@/lib/auth-config", () => ({
  getAuthServiceRoleKey: () => "test-service-role-key",
}));

// Mock WhatsApp Bridge
vi.mock("../../integrations/whatsapp", () => ({
  whatsappBridge: {
    sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

interface MockQuery {
  select: () => MockQuery;
  eq: () => MockQuery;
  single: () => MockQuery;
  insert: () => MockQuery;
  upsert: () => MockQuery;
  update: () => MockQuery;
  limit: () => MockQuery;
  then: (onfulfilled: (value: unknown) => unknown) => Promise<unknown>;
  catch: (onrejected: (reason: unknown) => unknown) => Promise<unknown>;
}

function createMockQuery(resolvedValue: unknown) {
  const query: MockQuery = {
    select: vi.fn().mockImplementation(() => query),
    eq: vi.fn().mockImplementation(() => query),
    single: vi.fn().mockImplementation(() => query),
    insert: vi.fn().mockImplementation(() => query),
    upsert: vi.fn().mockImplementation(() => query),
    update: vi.fn().mockImplementation(() => query),
    limit: vi.fn().mockImplementation(() => query),
    then: (onfulfilled) => Promise.resolve(resolvedValue).then(onfulfilled),
    catch: (onrejected) => Promise.resolve(resolvedValue).catch(onrejected),
  };
  return query;
}

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn().mockImplementation(() => createMockQuery({ data: [], error: null })),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

describe("FlowInterpreter Core Execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "http://localhost:8000";
  });

  it("should successfully traverse a simple trigger -> message flow", async () => {
    const mockNodes = [
      { node_id: "start", type: "flow_trigger", data: {}, position: {} },
      { node_id: "msg_1", type: "flow_message", data: { text: "Hola {{nombre}}" }, position: {} },
    ];
    const mockEdges = [
      { edge_id: "e1", source: "start", target: "msg_1", source_handle: null, target_handle: null },
    ];
    const mockLead = {
      id: "lead-123",
      nombre: "Juan",
      telefono: "+34600000000",
      metadata: {},
    };

    // Configurar retornos mock del cliente Supabase
    vi.spyOn(mockSupabaseClient, "from").mockImplementation((table: string) => {
      if (table === "flow_nodes") {
        return createMockQuery({ data: mockNodes, error: null });
      }
      if (table === "flow_edges") {
        return createMockQuery({ data: mockEdges, error: null });
      }
      if (table === "lead") {
        return createMockQuery({ data: mockLead, error: null });
      }
      if (table === "tenants") {
        return createMockQuery({ data: { config: {} }, error: null });
      }
      return createMockQuery({ data: null, error: null });
    });

    const result = await FlowInterpreter.execute({
      tenantId: "tenant-123",
      leadId: "lead-123",
      flowId: "flow-123",
    });

    expect(result.status).toBe("COMPLETED");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("chat_messages");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("conversaciones_whatsapp");
  });

  it("should evaluate and route flow_condition correctly (branch true)", async () => {
    const mockNodes = [
      { node_id: "start", type: "flow_trigger", data: {}, position: {} },
      {
        node_id: "cond_1",
        type: "flow_condition",
        data: { condition_variable: "origen", condition_operator: "equals", condition_value: "web" },
        position: {},
      },
      { node_id: "msg_true", type: "flow_message", data: { text: "Viene de web" }, position: {} },
      { node_id: "msg_false", type: "flow_message", data: { text: "Viene de otra parte" }, position: {} },
    ];
    const mockEdges = [
      { edge_id: "e1", source: "start", target: "cond_1", source_handle: null, target_handle: null },
      { edge_id: "e2", source: "cond_1", target: "msg_true", source_handle: "if", target_handle: null },
      { edge_id: "e3", source: "cond_1", target: "msg_false", source_handle: "else", target_handle: null },
    ];
    const mockLead = {
      id: "lead-123",
      nombre: "Juan",
      origen: "web",
      metadata: {},
    };

    vi.spyOn(mockSupabaseClient, "from").mockImplementation((table: string) => {
      if (table === "flow_nodes") {
        return createMockQuery({ data: mockNodes, error: null });
      }
      if (table === "flow_edges") {
        return createMockQuery({ data: mockEdges, error: null });
      }
      if (table === "lead") {
        return createMockQuery({ data: mockLead, error: null });
      }
      if (table === "tenants") {
        return createMockQuery({ data: { config: {} }, error: null });
      }
      return createMockQuery({ data: null, error: null });
    });

    const result = await FlowInterpreter.execute({
      tenantId: "tenant-123",
      leadId: "lead-123",
      flowId: "flow-123",
    });

    expect(result.status).toBe("COMPLETED");
    // Debería guardar el mensaje de la rama verdadera, no de la falsa
    const insertCalls = (mockSupabaseClient.from as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter((c) => c[0] === "chat_messages");
    expect(insertCalls).toHaveLength(1);
  });

  it("should prevent infinite loops by aborting if a cycle is detected", async () => {
    // Grafo cíclico: start -> loop_1 -> loop_2 -> loop_1 (sin nodos de espera)
    const mockNodes = [
      { node_id: "start", type: "flow_trigger", data: {}, position: {} },
      { node_id: "loop_1", type: "flow_message", data: { text: "Vuelta 1" }, position: {} },
      { node_id: "loop_2", type: "flow_message", data: { text: "Vuelta 2" }, position: {} },
    ];
    const mockEdges = [
      { edge_id: "e1", source: "start", target: "loop_1", source_handle: null, target_handle: null },
      { edge_id: "e2", source: "loop_1", target: "loop_2", source_handle: null, target_handle: null },
      { edge_id: "e3", source: "loop_2", target: "loop_1", source_handle: null, target_handle: null },
    ];
    const mockLead = {
      id: "lead-123",
      nombre: "Juan",
      telefono: "+34600000000",
      metadata: {},
    };

    vi.spyOn(mockSupabaseClient, "from").mockImplementation((table: string) => {
      if (table === "flow_nodes") {
        return createMockQuery({ data: mockNodes, error: null });
      }
      if (table === "flow_edges") {
        return createMockQuery({ data: mockEdges, error: null });
      }
      if (table === "lead") {
        return createMockQuery({ data: mockLead, error: null });
      }
      if (table === "tenants") {
        return createMockQuery({ data: { config: {} }, error: null });
      }
      return createMockQuery({ data: null, error: null });
    });

    const result = await FlowInterpreter.execute({
      tenantId: "tenant-123",
      leadId: "lead-123",
      flowId: "flow-123",
    });

    expect(result.status).toBe("ERROR");
    expect(result.error).toContain("Infinite synchronous execution loop detected");
  });

  it("should pause execution when a flow_wait node is hit", async () => {
    const mockNodes = [
      { node_id: "start", type: "flow_trigger", data: {}, position: {} },
      { node_id: "wait_1", type: "flow_wait", data: { delay_value: 10, delay_unit: "minutos" }, position: {} },
      { node_id: "msg_after", type: "flow_message", data: { text: "Después de esperar" }, position: {} },
    ];
    const mockEdges = [
      { edge_id: "e1", source: "start", target: "wait_1", source_handle: null, target_handle: null },
      { edge_id: "e2", source: "wait_1", target: "msg_after", source_handle: null, target_handle: null },
    ];
    const mockLead = {
      id: "lead-123",
      nombre: "Juan",
      metadata: {},
    };

    vi.spyOn(mockSupabaseClient, "from").mockImplementation((table: string) => {
      if (table === "flow_nodes") {
        return createMockQuery({ data: mockNodes, error: null });
      }
      if (table === "flow_edges") {
        return createMockQuery({ data: mockEdges, error: null });
      }
      if (table === "lead") {
        return createMockQuery({ data: mockLead, error: null });
      }
      if (table === "tenants") {
        return createMockQuery({ data: { config: {} }, error: null });
      }
      return createMockQuery({ data: null, error: null });
    });

    const result = await FlowInterpreter.execute({
      tenantId: "tenant-123",
      leadId: "lead-123",
      flowId: "flow-123",
    });

    expect(result.status).toBe("PAUSED");
    expect(result.node_id).toBe("wait_1");
    // Debería crear/guardar la espera en flow_wait_states
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("flow_wait_states");
  });

  it("should successfully execute a flow_http post node with request mapping", async () => {
    const mockNodes = [
      { node_id: "start", type: "flow_trigger", data: {}, position: {} },
      {
        node_id: "http_1",
        type: "flow_http",
        data: {
          method: "POST",
          url: "https://api.test.com/v1/webhook",
          headers: '{"Authorization": "Bearer 123"}',
          payload: '{"name": "{{nombre}}"}',
        },
        position: {},
      },
    ];
    const mockEdges = [
      { edge_id: "e1", source: "start", target: "http_1", source_handle: null, target_handle: null },
    ];
    const mockLead = {
      id: "lead-123",
      nombre: "Juan",
      metadata: {},
    };

    vi.spyOn(mockSupabaseClient, "from").mockImplementation((table: string) => {
      if (table === "flow_nodes") {
        return createMockQuery({ data: mockNodes, error: null });
      }
      if (table === "flow_edges") {
        return createMockQuery({ data: mockEdges, error: null });
      }
      if (table === "lead") {
        return createMockQuery({ data: mockLead, error: null });
      }
      if (table === "tenants") {
        return createMockQuery({ data: { config: {} }, error: null });
      }
      return createMockQuery({ data: null, error: null });
    });

    vi.mocked(axios).mockResolvedValue({ data: { success: true } });

    const result = await FlowInterpreter.execute({
      tenantId: "tenant-123",
      leadId: "lead-123",
      flowId: "flow-123",
    });

    expect(result.status).toBe("COMPLETED");
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://api.test.com/v1/webhook",
        headers: { Authorization: "Bearer 123" },
        data: { name: "Juan" },
      })
    );
  });

  it("should successfully execute a flow_ai_agent node and reassign lead to the new agent", async () => {
    const mockNodes = [
      { node_id: "start", type: "flow_trigger", data: {}, position: {} },
      {
        node_id: "agent_node_1",
        type: "flow_ai_agent",
        data: {
          agentId: "agent-target-uuid",
          agentName: "Agente Especialista Cierre",
        },
        position: {},
      },
    ];
    const mockEdges = [
      { edge_id: "e1", source: "start", target: "agent_node_1", source_handle: null, target_handle: null },
    ];
    const mockLead = {
      id: "lead-123",
      nombre: "Carlos",
      ai_agent_id: "agent-initial-uuid",
      metadata: {},
    };

    let updatedLeadData: any = null;

    vi.spyOn(mockSupabaseClient, "from").mockImplementation((table: string) => {
      if (table === "flow_nodes") {
        return createMockQuery({ data: mockNodes, error: null });
      }
      if (table === "flow_edges") {
        return createMockQuery({ data: mockEdges, error: null });
      }
      if (table === "lead") {
        const query = createMockQuery({ data: mockLead, error: null });
        query.update = vi.fn().mockImplementation((payload) => {
          updatedLeadData = payload;
          return createMockQuery({ data: { ...mockLead, ...payload }, error: null });
        });
        return query;
      }
      return createMockQuery({ data: null, error: null });
    });

    const result = await FlowInterpreter.execute({
      tenantId: "tenant-123",
      leadId: "lead-123",
      flowId: "flow-123",
    });

    expect(result.status).toBe("COMPLETED");
    expect(updatedLeadData).not.toBeNull();
    expect(updatedLeadData.ai_agent_id).toBe("agent-target-uuid");
    expect(updatedLeadData.inactivity_sent_count).toBe(0);
    expect(updatedLeadData.metadata.current_agent_name).toBe("Agente Especialista Cierre");
    expect(updatedLeadData.metadata.last_agent_handoff.to_agent_id).toBe("agent-target-uuid");
  });
});

