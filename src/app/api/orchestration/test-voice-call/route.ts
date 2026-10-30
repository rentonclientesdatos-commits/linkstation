/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/supabase/server";
import { ultravoxBridge, UltravoxConfig } from "@/lib/integrations/ultravox";

/**
 * POST /api/orchestration/test-voice-call
 * Dispara una llamada de prueba en vivo usando SIP (Ultravox + Conectabit).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, agentId, prompt } = body;
    let { tenantId } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Ingresa un número de teléfono para la prueba." },
        { status: 400 }
      );
    }

    const supabase = await getAdminSupabaseClient();

    // 1. Resolver Tenant si no viene especificado
    if (!tenantId) {
      const { data: firstTenant } = await (supabase as any)
        .from("tenants")
        .select("id")
        .limit(1)
        .maybeSingle();
      tenantId = firstTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "No se encontró un tenant válido." },
        { status: 400 }
      );
    }

    // 2. Obtener configuración del Tenant
    const { data: tenant } = await (supabase as any)
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    const tenantConfig = (tenant?.config || {}) as Record<string, any>;
    const ultravoxConfigData = (tenantConfig.ultravox || {}) as Record<string, any>;

    const apiKey =
      (typeof ultravoxConfigData.api_key === "string" ? ultravoxConfigData.api_key : "") ||
      (typeof ultravoxConfigData.apiKey === "string" ? ultravoxConfigData.apiKey : "") ||
      process.env.ULTRAVOX_API_KEY ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se encontró la API Key de Ultravox. Configúrala en los ajustes del tenant o en ULTRAVOX_API_KEY.",
        },
        { status: 400 }
      );
    }

    // 3. Resolver Agente
    let targetAgentId = agentId;
    if (targetAgentId) {
      const { data: vAgent } = await (supabase as any)
        .from("voice_agents")
        .select("provider_agent_id")
        .or(`id.eq.${targetAgentId},provider_agent_id.eq.${targetAgentId}`)
        .limit(1)
        .maybeSingle();
      if (vAgent?.provider_agent_id) {
        targetAgentId = vAgent.provider_agent_id;
      }
    } else {
      // Buscar el agente más reciente de este tenant
      const { data: defaultAgent } = await (supabase as any)
        .from("voice_agents")
        .select("provider_agent_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (defaultAgent?.provider_agent_id) {
        targetAgentId = defaultAgent.provider_agent_id;
      }
    }

    // 4. Resolver parámetros SIP (Conectabit)
    // ⚠️  IMPORTANTE: username = usuario SIP (ej: "65312352624")
    //                 password = contraseña SIP (ej: "w655318M")
    // Los valores se leen con .trim() para evitar espacios involuntarios.

    const rawSipDomain =
      body.sip_domain ||
      tenantConfig?.conectabit?.sip_domain ||
      tenantConfig?.telephony?.sip?.domain ||
      process.env.CONECTABIT_SIP_DOMAIN ||
      "ultravox.conecta-bit.com:7560";
    const sipDomain = String(rawSipDomain).trim();

    // sip_username → campo "username" del outgoing SIP
    const rawSipUsername =
      body.sip_username ||
      tenantConfig?.conectabit?.sip_username ||
      tenantConfig?.telephony?.sip?.username ||
      process.env.CONECTABIT_SIP_USERNAME ||
      "";
    const sipUsername = String(rawSipUsername).trim();

    // sip_password → campo "password" del outgoing SIP
    const rawSipPassword =
      body.sip_password ||
      tenantConfig?.conectabit?.sip_password ||
      tenantConfig?.telephony?.sip?.password ||
      process.env.CONECTABIT_SIP_PASSWORD ||
      "";
    const sipPassword = String(rawSipPassword).trim();

    const rawSipCallerId =
      body.sip_caller_id ||
      tenantConfig?.jorklif?.caller_id ||
      tenantConfig?.telephony?.fromNumber ||
      process.env.JORKLIF_CALLER_ID ||
      process.env.TWILIO_PHONE_NUMBER ||
      "";
    const sipCallerId = String(rawSipCallerId).trim();

    const sipFirstSpeaker = body.sip_first_speaker || "user";

    // 5. Formatear y sanitizar teléfono
    const rawPhone = String(phone);
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
    const sipUri = `sip:${cleanPhone}@${sipDomain}`;

    // ── DIAGNÓSTICO COMPLETO ──────────────────────────────────────────────────
    console.log("[TEST_VOICE_CALL] 🔍 SIP Credential Diagnostic:");
    console.log(`  sip_domain   : "${sipDomain}" (source: ${body.sip_domain ? "body" : tenantConfig?.conectabit?.sip_domain ? "tenant.conectabit" : tenantConfig?.telephony?.sip?.domain ? "tenant.telephony" : "env/default"})`);
    console.log(`  sip_username : "${sipUsername}" (source: ${body.sip_username ? "body" : tenantConfig?.conectabit?.sip_username ? "tenant.conectabit" : tenantConfig?.telephony?.sip?.username ? "tenant.telephony" : "env/default"})`);
    console.log(`  sip_password : [length ${sipPassword.length}] (source: ${body.sip_password ? "body" : tenantConfig?.conectabit?.sip_password ? "tenant.conectabit" : tenantConfig?.telephony?.sip?.password ? "tenant.telephony" : "env/default"})`);
    console.log(`  caller_id    : "${sipCallerId}"`);
    console.log(`  sip_uri      : "${sipUri}"`);
    // ─────────────────────────────────────────────────────────────────────────

    const ultravoxConfig: UltravoxConfig = { apiKey };

    const callPayload = {
      templateContext: {
        nombre: "Prueba Conectabit SIP",
        telefono: cleanPhone,
        test_mode: true,
        fecha: new Date().toISOString(),
      },
      medium: {
        sip: {
          outgoing: {
            to: sipUri,
            from: sipCallerId || cleanPhone,
            ...(sipUsername ? { username: sipUsername } : {}),
            ...(sipPassword ? { password: sipPassword } : {}),
          },
        },
      },
      firstSpeakerSettings: sipFirstSpeaker === "agent" ? { agent: {} } : { user: {} },
      recordingEnabled: true,
      maxDuration: "300s", // 5 minutos para prueba
    };

    let result;
    if (targetAgentId) {
      result = await ultravoxBridge.createAgentCall(targetAgentId, callPayload, ultravoxConfig);
    } else {
      result = await ultravoxBridge.createCall(
        {
          systemPrompt:
            prompt ||
            "Eres un asistente de voz de prueba conectado vía Ultravox y Conectabit SIP. Saluda cordialmente al usuario y dile que la prueba de conexión telefónica fue un éxito.",
          ...callPayload,
        },
        ultravoxConfig
      );
    }

    console.log(`[TEST_VOICE_CALL] ✅ Llamada iniciada exitosamente. Call ID: ${result.call_id}`);

    // Registrar en llamadas para historial
    try {
      await (supabase as any).from("llamadas").insert({
        tenant_id: tenantId,
        tipo_agente: "VOICE_SIP_TEST",
        nombre_agente: "Prueba Conectabit",
        estado_llamada: "IN_PROGRESS",
        fecha_inicio: new Date().toISOString(),
        metadata: {
          test: true,
          phone: cleanPhone,
          sip_uri: sipUri,
          sip_domain: sipDomain,
          call_id: result.call_id,
        },
      });
    } catch (e) {
      console.warn("[TEST_VOICE_CALL] Notice: could not record test call in llamadas table:", e);
    }

    return NextResponse.json({
      success: true,
      call_id: result.call_id,
      join_url: result.join_url,
      sip_uri: sipUri,
      caller_id: sipCallerId,
      message: `¡Llamada SIP disparada exitosamente hacia ${cleanPhone}!`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[TEST_VOICE_CALL] ❌ Error initiating test call:", msg);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 400 }
    );
  }
}
