/**
 * ULTRAVOX AI VOICE BRIDGE
 * Native implementation for initiating AI voice sessions using Ultravox REST API.
 */

export interface UltravoxConfig {
  apiKey: string;
  baseUrl?: string;
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
    /** SIP trunk outbound (Compulan / 3nx / Conectabit / Telnyx / any SIP provider) */
    sip?: {
      outgoing?: {
        /** SIP URI destino: sip:+56950715750@compulan.3nx.co */
        to: string;
        /** SIP URI origen (caller ID): sip:+56233857269@compulan.3nx.co */
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

/**
 * Normaliza cualquier string a una URI SIP válida completa:
 * Ejemplos:
 *  - "+56950715750", "compulan.3nx.co" -> "sip:+56950715750@compulan.3nx.co"
 *  - "56233857269", "compulan.3nx.co"  -> "sip:+56233857269@compulan.3nx.co"
 *  - "sip:+56233857269@compulan.3nx.co" -> "sip:+56233857269@compulan.3nx.co" (se conserva intacto)
 */
export function formatSipUri(rawAddress: string, defaultDomain?: string): string {
  if (!rawAddress) return "";
  const trimmed = String(rawAddress).trim();

  // Si ya es una URI SIP completa con dominio (ej: sip:+56233857269@compulan.3nx.co)
  if (/^sips?:.+@.+/i.test(trimmed)) {
    return trimmed;
  }

  const cleanDomain = defaultDomain ? String(defaultDomain).replace(/^@+/, "").trim() : "";

  // Si inicia con sip: pero le falta el dominio (ej: sip:+56950715750)
  if (/^sips?:/i.test(trimmed)) {
    const withoutScheme = trimmed.replace(/^sips?:/i, "").trim();
    if (cleanDomain && !withoutScheme.includes("@")) {
      return `sip:${withoutScheme}@${cleanDomain}`;
    }
    return trimmed;
  }

  // Si ya contiene @ pero no tiene el prefijo sip:
  if (trimmed.includes("@")) {
    return `sip:${trimmed}`;
  }

  // Si es un número telefónico o identificador
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  let formattedUser = trimmed;

  // Si es puramente numérico (ej. 56912345678 o +56912345678)
  if (digitsOnly.length > 0 && /^[+\d\s().-]+$/.test(trimmed)) {
    if (hasPlus) {
      formattedUser = `+${digitsOnly}`;
    } else if (digitsOnly.length >= 8) {
      formattedUser = `+${digitsOnly}`;
    } else {
      formattedUser = digitsOnly;
    }
  }

  if (cleanDomain) {
    return `sip:${formattedUser}@${cleanDomain}`;
  }

  return `sip:${formattedUser}`;
}

export interface SipOutgoingOptions {
  to: string;
  from: string;
  domain?: string;
  username?: string;
  password?: string;
}

/**
 * Constructor dinámico del objeto SIP Outgoing para Ultravox.
 * Permite que cualquier tenant o cliente arme su payload sin hardcodear credenciales.
 */
export function buildSipOutgoingMedium(options: SipOutgoingOptions) {
  const domain = (
    options.domain ||
    process.env.SIP_DOMAIN ||
    process.env.CONECTABIT_SIP_DOMAIN ||
    ""
  ).trim();

  const toUri = formatSipUri(options.to, domain);
  const fromUri = formatSipUri(options.from, domain);

  return {
    sip: {
      outgoing: {
        to: toUri,
        from: fromUri,
        ...(options.username ? { username: String(options.username).trim() } : {}),
        ...(options.password ? { password: String(options.password).trim() } : {}),
      },
    },
  };
}

/**
 * Sanitiza el medium garantizando que tanto `to` como `from` sean URIs SIP completas.
 */
function sanitizeMedium(medium?: UltravoxCallParams["medium"]): UltravoxCallParams["medium"] {
  if (!medium) return { twilio: {} };

  if (medium.sip?.outgoing) {
    const outgoing = medium.sip.outgoing;
    let domain = "";

    if (outgoing.to && outgoing.to.includes("@")) {
      domain = outgoing.to.split("@")[1].trim();
    } else if (outgoing.from && outgoing.from.includes("@")) {
      domain = outgoing.from.split("@")[1].trim();
    }

    const sanitizedTo = formatSipUri(outgoing.to, domain);
    const sanitizedFrom = formatSipUri(outgoing.from, domain);

    return {
      sip: {
        outgoing: {
          to: sanitizedTo,
          from: sanitizedFrom,
          ...(outgoing.username ? { username: String(outgoing.username).trim() } : {}),
          ...(outgoing.password ? { password: String(outgoing.password).trim() } : {}),
        },
      },
    };
  }

  return medium;
}

export class UltravoxBridge {
  private baseUrl = process.env.ULTRAVOX_API_URL || "https://api.ultravox.ai"; // Base URL for Ultravox API

  private getEffectiveBaseUrl(config?: UltravoxConfig): string {
    return (config?.baseUrl || this.baseUrl).replace(/\/+$/, "");
  }

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

    const effectiveBaseUrl = this.getEffectiveBaseUrl(config);
    const medium = sanitizeMedium(params.medium);

    try {
      const response = await fetch(`${effectiveBaseUrl}/api/agents/${agentId}/calls`, {
        method: "POST",
        headers: {
          "X-API-Key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateContext: params.templateContext || {},
          medium: medium || { twilio: {} },
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
   * Initiates a new AI voice call directly using systemPrompt (inline).
   * Endpoint: POST /api/calls
   */
  public async createCall(
    params: UltravoxCallParams,
    config: UltravoxConfig
  ) {
    if (!config.apiKey) throw new Error("Missing Ultravox API Key");

    const effectiveBaseUrl = this.getEffectiveBaseUrl(config);
    const medium = sanitizeMedium(params.medium);

    try {
      const response = await fetch(`${effectiveBaseUrl}/api/calls`, {
        method: "POST",
        headers: {
          "X-API-Key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: params.systemPrompt,
          model: params.model || "fixie-ai/ultravox",
          voice: params.voice,
          temperature: params.temperature,
          templateContext: params.templateContext || {},
          medium: medium || { twilio: {} },
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
      console.error("[ULTRAVOX BRIDGE] Error creating call:", msg);
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
