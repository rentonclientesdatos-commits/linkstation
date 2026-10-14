/**
 * ULTRAVOX AI VOICE BRIDGE
 * Native implementation for initiating AI voice sessions using Ultravox REST API.
 */

export interface UltravoxConfig {
  apiKey: string;
}

export interface UltravoxCallParams {
  systemPrompt?: string;
  model?: string;
  voice?: string;
  temperature?: number;
  initialMessages?: Array<{ role: string; text: string }>;
  medium?: {
    twilio?: {
      fromNumber?: string;
      toNumber?: string;
      accountSid?: string;
      authToken?: string;
    };
    /** SIP trunk outbound (Conectabit / Telnyx / any SIP provider) */
    sip?: {
      outgoing?: {
        /** SIP URI destino: sip:+56912345678@sip.conectabit.com */
        to: string;
        /** Caller ID (número emisor) */
        from: string;
        username?: string;
        password?: string;
      };
    };
    webRTC?: Record<string, unknown>;
  };
  templateContext?: Record<string, unknown>;
  firstSpeakerSettings?: Record<string, unknown>;
  maxDuration?: string;
  recordingEnabled?: boolean;
}

export class UltravoxBridge {
  private baseUrl = "https://api.ultravox.ai"; // Base URL for Ultravox API

  /**
   * Initiates a new AI voice call for a specific agent.
   * Endpoint: POST /api/agents/{agentId}/calls
   */
  public async createAgentCall(
    agentId: string,
    params: UltravoxCallParams,
    config: UltravoxConfig
  ) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");

    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/calls`, {
        method: "POST",
        headers: {
          "X-API-Key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateContext: params.templateContext || {},
          medium: params.medium || { twilio: {} },
          firstSpeakerSettings: params.firstSpeakerSettings || { user: {} },
          maxDuration: params.maxDuration || "900s",
          recordingEnabled: params.recordingEnabled ?? true,
          initialMessages: params.initialMessages || [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ultravox API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return {
        call_id: data.callId,
        join_url: data.joinUrl,
        status: data.status,
        _raw: data,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[ULTRAVOX BRIDGE] Error creating agent call:", msg);
      throw error;
    }
  }

  /**
   * List all agents.
   * Endpoint: GET /api/agents
   */
  public async listAgents(config: UltravoxConfig) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error("Failed to list Ultravox agents");
    return await response.json();
  }

  /**
   * List available voices.
   * Endpoint: GET /api/voices
   */
  public async listVoices(config: UltravoxConfig) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const response = await fetch(`${this.baseUrl}/api/voices`, {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error("Failed to list Ultravox voices");
    return await response.json();
  }

  /**
   * List available models.
   * Endpoint: GET /api/models
   */
  public async listModels(config: UltravoxConfig) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const response = await fetch(`${this.baseUrl}/api/models`, {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error("Failed to list Ultravox models");
    return await response.json();
  }

  /**
   * Create a new persistent agent.
   * Endpoint: POST /api/agents
   */
  public async createAgent(
    params: { name: string; systemPrompt: string; voice?: string; model?: string },
    config: UltravoxConfig
  ) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const bodyPayload = {
      name: params.name,
      callTemplate: {
        systemPrompt: params.systemPrompt,
        voice: params.voice || undefined,
        model: params.model || undefined,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create Ultravox agent: ${err}`);
    }
    return await response.json();
  }

  /**
   * Update an existing agent.
   * Endpoint: PATCH /api/agents/{agentId}
   */
  public async updateAgent(
    agentId: string,
    params: { name?: string; systemPrompt?: string; voice?: string; model?: string },
    config: UltravoxConfig
  ) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const bodyPayload: any = {};
    if (params.name) bodyPayload.name = params.name;
    if (params.systemPrompt !== undefined || params.voice !== undefined || params.model !== undefined) {
      bodyPayload.callTemplate = {};
      if (params.systemPrompt !== undefined) bodyPayload.callTemplate.systemPrompt = params.systemPrompt;
      if (params.voice !== undefined) bodyPayload.callTemplate.voice = params.voice;
      if (params.model !== undefined) bodyPayload.callTemplate.model = params.model;
    }

    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to update Ultravox agent: ${err}`);
    }
    return await response.json();
  }

  /**
   * List calls for an agent or globally.
   * Endpoint: GET /api/calls
   */
  public async listCalls(
    params: { agentId?: string; limit?: number } = {},
    config: UltravoxConfig
  ) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const url = new URL(`${this.baseUrl}/api/calls`);
    if (params.agentId) url.searchParams.append("agentId", params.agentId);
    if (params.limit) url.searchParams.append("limit", params.limit.toString());

    const response = await fetch(url.toString(), {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error("Failed to list Ultravox calls");
    return await response.json();
  }

  /**
   * Get specific agent detail.
   * Endpoint: GET /api/agents/{agentId}
   */
  public async getAgent(agentId: string, config: UltravoxConfig) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error(`Failed to fetch Ultravox agent ${agentId}`);
    return await response.json();
  }

  /**
   * Get call transcript.
   * Endpoint: GET /api/calls/{callId}/messages
   */
  public async getCallTranscript(callId: string, config: UltravoxConfig) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const response = await fetch(`${this.baseUrl}/api/calls/${callId}/messages`, {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error(`Failed to fetch transcript for call ${callId}`);
    return await response.json();
  }

  /**
   * Get call recording.
   * Endpoint: GET /api/calls/{callId}/recording
   */
  public async getCallRecording(callId: string, config: UltravoxConfig) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");
    const response = await fetch(`${this.baseUrl}/api/calls/${callId}/recording`, {
      headers: { "X-API-Key": config.apiKey },
    });
    if (!response.ok) throw new Error(`Failed to fetch recording for call ${callId}`);
    return await response.json();
  }
}

export const ultravoxBridge = new UltravoxBridge();
