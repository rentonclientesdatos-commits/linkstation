"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Settings2,
  Info,
  Phone,
  MessageSquare,
  BrainCircuit,
  Globe,
  GitBranchPlus,
  Clock,
  Bot,
  Webhook,
  Copy,
  Check,
  Reply,
  Hourglass,
  Zap,
  Timer,
  Sun,
  Moon,
  Globe2,
  Plus,
  Database,
  MessageCircle,
  ArrowRightLeft,
  FileDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Node } from "@xyflow/react";
import { getWhatsAppTemplates } from "@/lib/actions/orchestration";
import { getAIAgents } from "@/lib/actions/agents";
import { WhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { AIAgent } from "@/types/database";
import { VoiceAgentSelector } from "../orchestrator/VoiceAgentSelector";
import ct from "countries-and-timezones";

const DAYS_MAP = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

/**
 * NODE CONFIGURATION SIDEBAR
 * Dynamic form for editing node parameters in the Sequence Builder.
 */

interface NodeConfigSidebarProps {
  node: Node;
  workflowId: string;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigSidebar({ node, workflowId, onSave, onClose }: NodeConfigSidebarProps) {
  // We use a key on this component from the parent to reset state when the node changes
  const [config, setConfig] = useState<Record<string, unknown>>(
    (node.data?.config as Record<string, unknown>) || {}
  );
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await getWhatsAppTemplates();
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (error) {
      console.error("Templates fetch failed", error);
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function loadAgents() {
    setLoadingAgents(true);
    try {
      const res = await getAIAgents();
      if (res.success && res.data) {
        setAgents(res.data);
      }
    } catch (error) {
      console.error("Agents fetch failed", error);
    } finally {
      setLoadingAgents(false);
    }
  }

  useEffect(() => {
    if (node.type === "action" && node.data?.action === "WHATSAPP") loadTemplates();
    if (node.type === "action" && node.data?.action === "AI_AGENT") {
      loadAgents();
      loadTemplates();
    }
    if (node.type === "llm") loadAgents();
    // New specialized nodes
    if (node.type === "voiceCall") {
      /* voice agents loaded by VoiceAgentSelector */
    }
    if (node.type === "textAgent") loadAgents();
    if (node.type === "whatsapp") loadTemplates();
  }, [node.id, node.type, node.data?.action]);

  const handleSave = () => {
    onSave(config);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookPath = (config.path as string) || "webhook";
  const webhookUrl = `${baseUrl}/api/webhooks/${workflowId}/${webhookPath}/${node.id}`;

  const type = node.type;
  const action = node.data?.action as string | undefined;

  return (
    <div className="animate-in slide-in-from-right absolute top-0 right-0 z-[70] flex h-full w-96 flex-col border-l border-white/10 bg-black/60 shadow-2xl backdrop-blur-3xl duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white/90 uppercase">
              Configuración
            </h3>
            <p className="text-[10px] leading-none font-bold tracking-widest text-white/40 uppercase">
              Node: {type}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Cerrar panel"
          className="rounded-xl border border-white/10 p-2 text-white/40 transition-all hover:bg-white/5"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form Fields */}
      <div className="flex-1 space-y-8 overflow-y-auto p-8">
        {/* 0. INBOUND WHATSAPP TRIGGER CONFIG */}
        {type === "inboundWhatsApp" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 text-left duration-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest text-emerald-400/80 uppercase">
                Trigger: WhatsApp Entrante
              </span>
            </div>
            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[10px] leading-relaxed text-emerald-300/80">
                Este nodo inicia el flujo automáticamente cuando alguien te escribe a tu número de
                WhatsApp y <strong>aún no está en el CRM</strong>.
              </p>
              <p className="text-[10px] leading-relaxed text-white/50">
                Es ideal para prospectos fríos que llegan desde campañas o botones en tu web. El
                sistema extraerá el teléfono y creará el lead temporalmente.
              </p>
            </div>
          </div>
        )}
        {/* 0. LEAD TRIGGER CONFIG */}
        {type === "leadTrigger" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 text-left duration-300">
            <div className="flex items-center gap-2 text-orange-400">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest text-orange-400/80 uppercase">
                Disparador de Entrada
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Origen del Lead
                </label>
                <select
                  title="Origen del Lead"
                  value={(config.source as string) || "Cualquier Origen"}
                  onChange={(e) => setConfig({ ...config, source: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80 transition-all focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                >
                  <option value="Cualquier Origen" className="bg-[#0a0a0a]">
                    Cualquier Origen (Global)
                  </option>
                  <option value="Meta Ads" className="bg-[#0a0a0a]">
                    Meta Ads (Facebook/Instagram)
                  </option>
                  <option value="API Manual" className="bg-[#0a0a0a]">
                    API Manual / CRM
                  </option>
                  <option value="Zapier" className="bg-[#0a0a0a]">
                    Zapier / Make
                  </option>
                </select>
              </div>

              {/* Configuración activa de API CRM */}
              {config.source === "API Manual" && (
                <div className="animate-in fade-in zoom-in-95 space-y-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 duration-300">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-cyan-400" />
                    <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                      Conexión a CRM (Pull API)
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-white/40 uppercase">
                      Endpoint del CRM (URL para obtener leads)
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/60 transition-all focus-within:ring-1 focus-within:ring-cyan-500/30">
                      <select
                        title="HTTP Method"
                        value={(config.crmMethod as string) || "GET"}
                        onChange={(e) => setConfig({ ...config, crmMethod: e.target.value })}
                        className="cursor-pointer appearance-none border-r border-white/10 bg-transparent px-3 py-3 text-center text-[10px] font-black text-cyan-400 uppercase transition-colors outline-none hover:bg-white/5"
                      >
                        <option value="GET" className="bg-[#0a0a0a]">
                          GET
                        </option>
                        <option value="POST" className="bg-[#0a0a0a]">
                          POST
                        </option>
                      </select>
                      <input
                        value={(config.crmEndpoint as string) || ""}
                        onChange={(e) => setConfig({ ...config, crmEndpoint: e.target.value })}
                        placeholder="https://api.tu-crm.com/v1/leads/new"
                        className="flex-1 bg-transparent px-4 py-3 font-mono text-xs text-white/80 outline-none placeholder:opacity-20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-white/40 uppercase">
                      Autenticación / API Key
                    </label>
                    <input
                      type="password"
                      value={(config.crmApiKey as string) || ""}
                      onChange={(e) => setConfig({ ...config, crmApiKey: e.target.value })}
                      placeholder="Bearer token o API Key del CRM"
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 font-mono text-xs text-white/80 transition-all placeholder:opacity-20 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-start gap-2 border-t border-cyan-500/10 pt-2">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <p className="text-[9px] leading-relaxed text-white/50">
                      El orquestador consultará esta API periódicamente para extraer los nuevos
                      leads. Asegúrate de que el endpoint devuelva los datos del lead en formato
                      JSON.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Filtro por Campaña (Opcional)
                </label>
                <input
                  value={(config.campaignFilter as string) || ""}
                  onChange={(e) => setConfig({ ...config, campaignFilter: e.target.value })}
                  placeholder="Ej: Promo Verano 2026"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition-all focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                />
                <div className="rounded-xl border border-orange-500/10 bg-orange-500/5 p-3 text-[9px] leading-relaxed font-medium text-white/40">
                  🚀 Si lo dejas en blanco, este flujo se activará para **TODOS** los leads que
                  entren. Si pones un nombre, solo procesará los leads de esa campaña específica.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. RETELL CALL CONFIG */}
        {type === "action" && action === "CALL" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-blue-400">
              <Phone className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Configuración de Llamada
              </span>
            </div>

            <VoiceAgentSelector
              selectedAgentId={(config.agentId as string) || null}
              onChange={(id) => setConfig({ ...config, agentId: id })}
            />

            <div className="space-y-2">
              <label
                htmlFor="dynamicVariables"
                className="text-[10px] font-bold text-white/40 uppercase"
              >
                Variables Dinámicas (JSON)
              </label>
              <textarea
                id="dynamicVariables"
                value={(config.dynamicVariables as string) || ""}
                onChange={(e) => setConfig({ ...config, dynamicVariables: e.target.value })}
                rows={3}
                className="focus:ring-primary/20 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm transition-all focus:ring-2 focus:outline-none"
                placeholder='{"nombre_lead": "{{lead.nombre}}"}'
                title="Contexto dinámico para el agente"
              />
              <p className="px-1 text-[9px] text-white/20 italic">
                Estas variables se pasan al LLM del proveedor para personalizar la conversación.
              </p>
            </div>
          </div>
        )}

        {/* 1.5. HTTP REQUEST CONFIG (Enhanced) */}
        {type === "api" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 text-left duration-300">
            <div className="flex items-center gap-2 text-cyan-400">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest text-cyan-400/80 uppercase">
                HTTP Request (Salida)
              </span>
            </div>

            <div className="space-y-4">
              {/* Unified Address Bar Style */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Endpoint URL
                </label>
                <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all focus-within:ring-1 focus-within:ring-cyan-500/30">
                  <select
                    title="HTTP Method"
                    value={(config.method as string) || "POST"}
                    onChange={(e) => setConfig({ ...config, method: e.target.value })}
                    className="min-w-[80px] cursor-pointer appearance-none border-r border-white/10 bg-white/5 px-3 py-3 text-center text-[10px] font-black text-cyan-400 uppercase transition-colors outline-none hover:bg-white/10"
                  >
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <option key={m} value={m} className="bg-[#0a0a0a]">
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    value={(config.url as string) || ""}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://api.ejemplo.com/v1/recurso"
                    className="flex-1 bg-transparent px-4 py-3 font-mono text-xs text-white/80 outline-none placeholder:opacity-20"
                  />
                </div>
              </div>

              {config.method !== "GET" && (
                <div className="animate-in fade-in space-y-2 pt-2 duration-300">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[10px] font-bold tracking-tighter text-white/40 uppercase">
                      Cuerpo de la Petición (JSON)
                    </label>
                    <span className="text-[8px] font-black tracking-widest text-white/20 uppercase">
                      application/json
                    </span>
                  </div>
                  <textarea
                    value={(config.body as string) || ""}
                    onChange={(e) => setConfig({ ...config, body: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed outline-none placeholder:opacity-20 focus:ring-1 focus:ring-cyan-500/30"
                    placeholder='{&#10;  "lead_id": "{{lead_id}}",&#10;  "mensaje": "Hola de nuevo"&#10;}'
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. WHATSAPP CONFIG */}
        {type === "action" && action === "WHATSAPP" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-emerald-400">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                WhatsApp Meta Template
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Seleccionar Plantilla
              </label>
              {loadingTemplates ? (
                <div className="flex h-12 animate-pulse items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-bold tracking-widest text-white/20 uppercase">
                  Sincronizando con Meta...
                </div>
              ) : (
                <select
                  title="WhatsApp Template"
                  value={(config.templateId as string) || ""}
                  onChange={(e) => {
                    const tName = e.target.value;
                    const selected = templates.find((t) => t.name === tName);
                    // Reset component mapping when template changes
                    setConfig({
                      ...config,
                      templateId: tName,
                      templateLanguage: selected?.language || "es",
                      components: [],
                    });
                  }}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="" disabled className="bg-black">
                    -- Elige una plantilla --
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.name} className="bg-black text-white">
                      {t.name} ({t.language}) {t.status !== "APPROVED" ? `[${t.status}]` : ""}
                    </option>
                  ))}
                  {templates.length === 0 && (
                    <option value="" className="bg-black">
                      Ingresa manualmente en Ajustes
                    </option>
                  )}
                </select>
              )}
            </div>

            {/* Template Preview & Variable Mapping */}
            {(() => {
              const selectedTemplate = templates.find((t) => t.name === config.templateId);
              if (!selectedTemplate) return null;

              const bodyComponent = selectedTemplate.components?.find((c) => c.type === "BODY");
              const bodyText = (bodyComponent?.text as string) || "";

              // Find variables like {{1}}, {{2}}...
              const variableMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
              const uniqueVars: string[] = Array.from(new Set(variableMatches)) as string[];

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 border-t border-white/5 pt-4"
                >
                  <div className="space-y-2 rounded-2xl border border-white/5 bg-black/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black tracking-widest text-emerald-500/60 uppercase">
                        Vista Previa (Meta)
                      </span>
                      <span className="text-[9px] font-medium text-white/20 italic">
                        {selectedTemplate.language}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed font-medium text-white/70">
                      {bodyText}
                    </p>
                  </div>

                  {uniqueVars.length > 0 && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                        <Zap className="h-3 w-3 text-amber-500" /> Mapeo de Variables (
                        {uniqueVars.length})
                      </label>
                      <div className="space-y-2">
                        {uniqueVars.map((v: string, i: number) => {
                          const idx = v.replace(/[\{\}]/g, "");
                          const currentMappings =
                            (config.variableMappings as Record<string, string>) || {};

                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-black text-white/40">
                                {idx}
                              </div>
                              <input
                                title={`Mapeo para variable ${idx}`}
                                value={currentMappings[idx] || ""}
                                onChange={(e) => {
                                  const newMappings = { ...currentMappings, [idx]: e.target.value };
                                  setConfig({ ...config, variableMappings: newMappings });
                                }}
                                placeholder="field.name o Texto fijo"
                                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold focus:ring-1 focus:ring-emerald-500/20"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="px-1 text-[9px] text-white/20 italic">
                        Tip: Usa <code className="text-emerald-400">lead.nombre</code> para insertar
                        el nombre del lead.
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            <div className="my-4 h-px bg-white/5" />

            {/* ADVANCED SCHEDULING SUB-PANEL */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black tracking-widest uppercase">
                  Programación en Destino
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="delayMinutes"
                      className="text-[9px] font-bold text-white/40 uppercase"
                    >
                      Minutos (Delay)
                    </label>
                    <input
                      id="delayMinutes"
                      title="Minutos de delay"
                      placeholder="0"
                      type="number"
                      value={(config.delayMinutes as number) || 0}
                      onChange={(e) =>
                        setConfig({ ...config, delayMinutes: parseInt(e.target.value) })
                      }
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="delayHours"
                      className="text-[9px] font-bold text-white/40 uppercase"
                    >
                      Horas (Delay)
                    </label>
                    <input
                      id="delayHours"
                      title="Horas de delay"
                      placeholder="0"
                      type="number"
                      value={(config.delayHours as number) || 0}
                      onChange={(e) =>
                        setConfig({ ...config, delayHours: parseInt(e.target.value) })
                      }
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="exactSchedule"
                    className="text-[9px] font-bold tracking-widest text-white/40 uppercase"
                  >
                    O en Fecha/Hora Específica
                  </label>
                  <input
                    id="exactSchedule"
                    title="Fecha específica de agendamiento"
                    placeholder="YYYY-MM-DDTHH:MM"
                    type="datetime-local"
                    value={(config.exactSchedule as string) || ""}
                    onChange={(e) => setConfig({ ...config, exactSchedule: e.target.value })}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm [color-scheme:dark] focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. AI AGENT CONFIG (Integrated A/B + Meta) */}
        {type === "action" && action === "AI_AGENT" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-purple-400">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Agente de IA Orquestrado
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Vincular Agente Predefinido
              </label>
              {loadingAgents ? (
                <div className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/5" />
              ) : (
                <select
                  title="Seleccionar Agente"
                  value={(config.agentId as string) || ""}
                  onChange={(e) => setConfig({ ...config, agentId: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold transition-all focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="" disabled className="bg-black">
                    -- Elige un Agente --
                  </option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-black text-white">
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              )}
              <p className="px-1 text-[9px] text-white/20 italic">
                Este nodo usará automáticamente las variantes A o B configuradas en el tablero de
                Agentes.
              </p>
            </div>

            <div className="my-4 h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/40 uppercase">
                Enviar WhatsApp tras análisis
              </span>
              <button
                title="Alternar Envio de WhatsApp"
                onClick={() => setConfig({ ...config, sendWhatsApp: !config.sendWhatsApp })}
                className={cn(
                  "relative h-5 w-10 rounded-full transition-all",
                  config.sendWhatsApp ? "bg-primary" : "bg-white/10"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                    config.sendWhatsApp ? "left-6" : "left-1"
                  )}
                />
              </button>
            </div>

            {Boolean(config.sendWhatsApp) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 border-t border-white/5 pt-2"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    Plantilla Meta (Success)
                  </label>
                  <select
                    title="WhatsApp Success Template"
                    value={(config.successTemplateId as string) || ""}
                    onChange={(e) => setConfig({ ...config, successTemplateId: e.target.value })}
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-xs"
                  >
                    <option value="" disabled className="bg-black">
                      -- Seleccionar plantilla --
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.name} className="bg-black">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 3.5 LLM TEXT CONFIG (RAZONAMIENTO) */}
        {type === "llm" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-fuchsia-400">
              <BrainCircuit className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Nodo de Razonamiento (LLM)
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-white/50 italic">
              A diferencia del Agente de Texto, este nodo no envía mensajes al lead. Se usa para
              analizar transcripciones, calcular el &quot;Scoring&quot; de interés o extraer
              variables JSON internamente.
            </p>

            {/* Agent selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                Seleccionar Agente Creado
              </label>
              {loadingAgents ? (
                <div className="flex h-12 animate-pulse items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs text-white/20">
                  Cargando agentes...
                </div>
              ) : (
                <select
                  title="Seleccionar Agente de Texto"
                  value={(config.linkedAgentId as string) || "none"}
                  onChange={(e) => setConfig({ ...config, linkedAgentId: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold transition-all focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="none" className="bg-black">
                    — Ninguno (configurar manualmente) —
                  </option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-black text-white">
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              )}
              {agents.length === 0 && !loadingAgents && (
                <p className="px-1 text-[9px] text-white/20 italic">
                  No hay agentes creados aún. Crea uno en el módulo de Agentes.
                </p>
              )}
              {Boolean(config.linkedAgentId) && (config.linkedAgentId as string) !== "none" && (
                <p className="px-1 text-[9px] text-purple-400/60 italic">
                  ✓ Este nodo usará la configuración del agente seleccionado.
                </p>
              )}
            </div>

            {/* Custom prompt + model — only when no agent is linked */}
            {(!config.linkedAgentId || (config.linkedAgentId as string) === "none") && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 border-t border-white/5 pt-2"
              >
                <div className="flex items-center gap-2 text-purple-300/70">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black tracking-widest uppercase">
                    Configuración Manual
                  </span>
                </div>

                {/* AI Model selector */}
                <div className="space-y-2">
                  <label
                    htmlFor="aiModel"
                    className="text-[10px] font-bold tracking-widest text-white/40 uppercase"
                  >
                    Modelo de IA
                  </label>
                  <select
                    id="aiModel"
                    title="Modelo de IA"
                    value={(config.model as string) || "gpt-4o-mini"}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold transition-all focus:ring-2 focus:ring-purple-500/20"
                  >
                    <optgroup label="OpenAI" className="bg-black text-white">
                      <option value="gpt-4.1" className="bg-black text-white">
                        GPT-4.1 (Avanzado)
                      </option>
                      <option value="gpt-4.1-mini" className="bg-black text-white">
                        GPT-4.1 Mini (Eficiente)
                      </option>
                      <option value="gpt-4.5-preview" className="bg-black text-white">
                        GPT-4.5 Preview (Experimental)
                      </option>
                      <option value="o3-mini" className="bg-black text-white">
                        o3-mini (Razonamiento)
                      </option>
                      <option value="o1" className="bg-black text-white">
                        o1 (Profundo)
                      </option>
                      <option value="o1-mini" className="bg-black text-white">
                        o1 Mini (Razonamiento Rápido)
                      </option>
                      <option value="gpt-4o" className="bg-black text-white">
                        GPT-4o (Inteligente)
                      </option>
                      <option value="gpt-4o-mini" className="bg-black text-white">
                        GPT-4o Mini (Rápido)
                      </option>
                      <option value="gpt-4-turbo" className="bg-black text-white">
                        GPT-4 Turbo
                      </option>
                    </optgroup>
                    <optgroup label="Anthropic" className="bg-black">
                      <option value="claude-3-5-sonnet-20241022" className="bg-black text-white">
                        Claude 3.5 Sonnet
                      </option>
                      <option value="claude-3-haiku-20240307" className="bg-black text-white">
                        Claude 3 Haiku (Rápido)
                      </option>
                      <option value="claude-3-opus-20240229" className="bg-black text-white">
                        Claude 3 Opus (Potente)
                      </option>
                    </optgroup>
                    <optgroup label="Google" className="bg-black">
                      <option value="gemini-1.5-pro" className="bg-black text-white">
                        Gemini 1.5 Pro
                      </option>
                      <option value="gemini-1.5-flash" className="bg-black text-white">
                        Gemini 1.5 Flash
                      </option>
                      <option value="gemini-2.0-flash" className="bg-black text-white">
                        Gemini 2.0 Flash
                      </option>
                    </optgroup>
                  </select>
                  <p className="px-1 text-[9px] text-white/20 italic">
                    Proveedor seleccionado automáticamente según el modelo.
                  </p>
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <label
                    htmlFor="prompt"
                    className="text-[10px] font-bold tracking-widest text-white/40 uppercase"
                  >
                    Instrucción del Sistema (Prompt)
                  </label>
                  <textarea
                    id="prompt"
                    value={(config.prompt as string) || ""}
                    rows={7}
                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed transition-all placeholder:opacity-20 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                    placeholder="Eres un asistente de ventas experto. Analiza el interés del lead basado en su historial de conversación y clasifícalo como: ALTO, MEDIO o BAJO..."
                  />
                  <p className="px-1 text-[9px] leading-relaxed text-white/20 italic">
                    Usa{" "}
                    <code className="rounded bg-purple-500/10 px-1 text-purple-400">
                      {"{{lead.nombre}}"}
                    </code>{" "}
                    para variables del lead.
                  </p>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="temperature"
                      className="text-[10px] font-bold tracking-widest text-white/40 uppercase"
                    >
                      Temperatura
                    </label>
                    <span className="text-[10px] font-black text-purple-400">
                      {((config.temperature as number) ?? 0.7).toString()}
                    </span>
                  </div>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={(config.temperature as number | undefined) ?? 0.7}
                    onChange={(e) =>
                      setConfig({ ...config, temperature: parseFloat(e.target.value) })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-purple-500"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-white/20">
                    <span>Preciso (0)</span>
                    <span>Creativo (1)</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 4. WAIT DELAY CONFIG */}
        {type === "delay" && (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Intervalo de Espera
              </span>
            </div>
            <div className="space-y-2">
              <label htmlFor="duration" className="text-[10px] font-bold text-white/40 uppercase">
                Horas de Retraso
              </label>
              <div className="flex items-end gap-4">
                <input
                  id="duration"
                  type="number"
                  value={(config.duration as number) || 2}
                  onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                  className="focus:ring-primary/20 h-12 w-24 rounded-xl border border-white/10 bg-white/5 px-4 text-center text-xl font-black tabular-nums transition-all focus:ring-2 focus:outline-none"
                />
                <span className="pb-4 text-xs font-bold text-white/20 uppercase">Horas</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. WEBHOOK RESPONSE CONFIG */}
        {type === "webhookResponse" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 text-left duration-300">
            <div className="flex items-center gap-2 text-indigo-400">
              <Reply className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Respuesta Webhook
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Código de Estado (HTTP)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[200, 201, 400, 404, 500].map((code) => (
                    <button
                      key={code}
                      onClick={() => setConfig({ ...config, statusCode: code })}
                      className={cn(
                        "rounded-lg border py-2 text-[10px] font-black transition-all",
                        (config.statusCode || 200) === code
                          ? "border-indigo-400 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                          : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {code}
                    </button>
                  ))}
                  <input
                    type="number"
                    title="Código HTTP personalizado"
                    placeholder="Otro..."
                    value={(config.statusCode as number | undefined) || ""}
                    onChange={(e) => setConfig({ ...config, statusCode: parseInt(e.target.value) })}
                    className="h-full rounded-lg border border-white/10 bg-white/5 text-center text-[10px] font-black outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Cuerpo de la Respuesta (JSON)
                </label>
                <textarea
                  value={(config.responseBody as string) || ""}
                  onChange={(e) => setConfig({ ...config, responseBody: e.target.value })}
                  rows={8}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed"
                  placeholder='{&#10;  "success": true,&#10;  "message": "Petición recibida correctamente"&#10;}'
                />
                <p className="mt-1 text-center text-[9px] text-white/20 italic">
                  Puedes usar variables como {"{{lead_id}}"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5.5 WEBHOOK WAIT (CALLBACK) CONFIG */}
        {type === "webhookWait" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 text-left duration-300">
            <div className="flex items-center gap-2 text-pink-400">
              <Hourglass className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Espera de Señal (Callback)
              </span>
            </div>

            <div className="space-y-4 rounded-xl border border-pink-500/10 bg-pink-500/5 p-4">
              <p className="text-[10px] leading-relaxed font-medium text-white/60">
                El proceso se detendrá en este punto. Solo continuará cuando se reciba una petición
                GET/POST a la siguiente URL.
              </p>

              <div className="group relative">
                <div className="rounded-lg border border-white/5 bg-black/40 p-3 pr-10 font-mono text-[9px] break-all opacity-60">
                  {webhookUrl.replace("webhook", "callback")}
                </div>
                <button
                  onClick={() => copyToClipboard(webhookUrl.replace("webhook", "callback"))}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-white/5 p-2 transition-all hover:bg-white/10"
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-white/40" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Tiempo Máximo de Espera (TTL)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    title="Duración del TTL"
                    placeholder="24"
                    value={(config.ttlDuration as number) || 24}
                    onChange={(e) =>
                      setConfig({ ...config, ttlDuration: parseInt(e.target.value) })
                    }
                    className="h-11 w-20 rounded-xl border border-white/10 bg-white/5 text-center text-sm font-black outline-none"
                  />
                  <select
                    title="TTL Unit"
                    value={(config.ttlUnit as string) || "hours"}
                    onChange={(e) => setConfig({ ...config, ttlUnit: e.target.value })}
                    className="h-11 flex-1 cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold"
                  >
                    <option value="minutes" className="bg-black">
                      Minutos
                    </option>
                    <option value="hours" className="bg-black">
                      Horas
                    </option>
                    <option value="days" className="bg-black">
                      Días
                    </option>
                  </select>
                </div>
                <p className="px-1 text-[9px] text-white/20 italic">
                  Si no se recibe la señal en este tiempo, el lead se marcará como
                  &quot;Expirado&quot;.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5.7 RETRY SEQUENCE CONFIG ⭐ NUEVO ── */}
        {type === "retrySequence" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 text-left duration-300">
            <div className="flex items-center gap-2 text-orange-500">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest text-orange-500/80 uppercase">
                Bucle de Reintentos Auto
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="maxAttempts"
                  className="text-[10px] font-bold text-white/40 uppercase"
                >
                  Intentos Máximos
                </label>
                <input
                  id="maxAttempts"
                  type="number"
                  value={(config.maxAttempts as number) || 5}
                  onChange={(e) => setConfig({ ...config, maxAttempts: parseInt(e.target.value) })}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xl font-black text-white tabular-nums outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="retryDelay"
                  className="text-[10px] font-bold text-white/40 uppercase"
                >
                  Horas entre Intentos
                </label>
                <input
                  id="retryDelay"
                  type="number"
                  value={(config.retryDelayHours as number) || 27}
                  onChange={(e) =>
                    setConfig({ ...config, retryDelayHours: parseInt(e.target.value) })
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xl font-black text-white tabular-nums outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Canales de Contacto
              </label>
              <div className="flex gap-2">
                {["call", "whatsapp"].map((c) => {
                  const activeChannels = (config.channels as string[]) || ["call", "whatsapp"];
                  const isActive = activeChannels.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        const updated = isActive
                          ? activeChannels.filter((x) => x !== c)
                          : [...activeChannels, c];
                        setConfig({ ...config, channels: updated });
                      }}
                      className={cn(
                        "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all",
                        isActive
                          ? "border-orange-500/40 bg-orange-500/20 text-orange-300 shadow-lg shadow-orange-500/10"
                          : "border-white/10 bg-white/5 text-white/30 hover:text-white/60"
                      )}
                    >
                      {c === "call" ? (
                        <Phone className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Estado Final (Si falla todo)
              </label>
              <select
                title="Estado Final"
                value={(config.finalStatus as string) || "ilocalizable"}
                onChange={(e) => setConfig({ ...config, finalStatus: e.target.value })}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/80 outline-none"
              >
                <option value="ilocalizable" className="bg-black">
                  Marcar como Ilocalizable
                </option>
                <option value="perdido" className="bg-black">
                  Marcar como Perdido
                </option>
                <option value="seguimiento_manual" className="bg-black">
                  Mover a Seguimiento Manual
                </option>
              </select>
            </div>

            <div className="space-y-2 rounded-xl border border-dashed border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-[10px] font-black tracking-widest text-orange-400 uppercase">
                💡 Inteligencia Nativa
              </p>
              <p className="text-[10px] leading-relaxed font-medium text-white/50">
                Este nodo gestiona solo el bucle de contacto. <br />
                <strong className="text-orange-400/80">
                  Si el lead responde o agenda, el bucle se rompe automáticamente
                </strong>{" "}
                y el orquestador salta al siguiente paso de éxito.
              </p>
            </div>
          </div>
        )}

        {/* 6. SUB-WORKFLOW CONFIG */}
        {type === "subWorkflow" && (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2 text-pink-400">
              <GitBranchPlus className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">Vincular Flujo</span>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="targetWorkflowId"
                className="text-[10px] font-bold text-white/40 uppercase"
              >
                Workflow ID Destino
              </label>
              <input
                id="targetWorkflowId"
                value={(config.targetWorkflowId as string) || ""}
                onChange={(e) => setConfig({ ...config, targetWorkflowId: e.target.value })}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-sm"
                placeholder="UUID del workflow..."
              />
            </div>
          </div>
        )}

        {/* 7. WEBHOOK TRIGGER CONFIG (n8n style) */}
        {type === "webhookTrigger" && (
          <div className="animate-in slide-in-from-bottom space-y-6 text-left duration-500">
            <div className="flex items-center gap-2 text-orange-500">
              <Webhook className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Configuración Webhook
              </span>
            </div>

            {/* URL DISPLAY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Webhook URLs
                </label>
                <div className="flex rounded-lg border border-white/5 bg-black/40 p-0.5">
                  <button className="rounded-md bg-white/10 px-2 py-1 text-[8px] font-bold text-white">
                    Test
                  </button>
                  <button className="rounded-md px-2 py-1 text-[8px] font-bold text-white/20 transition-colors hover:text-white/40">
                    Production
                  </button>
                </div>
              </div>

              <div className="group relative">
                <div className="flex min-h-[60px] items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-4 pr-12 font-mono text-[10px] leading-relaxed break-all">
                  <span className="shrink-0 rounded-md bg-orange-500/20 px-2 py-0.5 text-[9px] font-black tracking-tighter text-orange-400 uppercase">
                    {(config.method as string) || "POST"}
                  </span>
                  <span className="opacity-40 select-all">{webhookUrl}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(webhookUrl)}
                  aria-label="Copiar URL"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-xl border border-white/5 bg-white/5 p-2.5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="px-1 text-[9px] text-white/20 italic">
                Usa este enlace para enviar datos desde servicios externos.
              </p>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">HTTP Method</label>
                <select
                  title="Webhook Method"
                  value={(config.method as string) || "POST"}
                  onChange={(e) => setConfig({ ...config, method: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="GET" className="bg-black">
                    GET
                  </option>
                  <option value="POST" className="bg-black">
                    POST
                  </option>
                  <option value="PUT" className="bg-black">
                    PUT
                  </option>
                  <option value="PATCH" className="bg-black">
                    PATCH
                  </option>
                  <option value="DELETE" className="bg-black">
                    DELETE
                  </option>
                  <option value="HEAD" className="bg-black">
                    HEAD
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Path Personalizado
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-xs text-white/20">
                    /
                  </span>
                  <input
                    value={(config.path as string) || ""}
                    onChange={(e) => setConfig({ ...config, path: e.target.value })}
                    placeholder="webhook"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pr-4 pl-8 font-mono text-sm text-orange-400/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Autenticación
                </label>
                <select
                  title="Webhook Authentication"
                  value={(config.auth as string) || "none"}
                  onChange={(e) => setConfig({ ...config, auth: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm"
                >
                  <option value="none" className="bg-black">
                    None (Open)
                  </option>
                  <option value="header" className="bg-black">
                    Header Auth (X-API-KEY)
                  </option>
                  <option value="basic" className="bg-black">
                    Basic Auth
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── TIME CONDITION CONFIG ───────────────────────── */}
        {type === "timeCondition" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-yellow-400">
              <Timer className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Condición Horaria del Sistema
              </span>
            </div>

            {/* Hour range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="tc-start"
                  className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase"
                >
                  <Sun className="h-3 w-3 text-emerald-400" /> Hora Inicio
                </label>
                <input
                  id="tc-start"
                  type="time"
                  value={(config.start as string) || "09:00"}
                  onChange={(e) => setConfig({ ...config, start: e.target.value })}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-emerald-400 [color-scheme:dark] focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="tc-end"
                  className="flex items-center gap-1 text-[10px] font-bold text-white/40 uppercase"
                >
                  <Moon className="h-3 w-3 text-blue-400" /> Hora Fin
                </label>
                <input
                  id="tc-end"
                  type="time"
                  value={(config.end as string) || "20:00"}
                  onChange={(e) => setConfig({ ...config, end: e.target.value })}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-blue-400 [color-scheme:dark] focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Working days */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Días Laborables
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_MAP.map((d) => {
                  const activeDays = (config.working_days as number[]) || [1, 2, 3, 4, 5];
                  const isActive = activeDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => {
                        const updated = isActive
                          ? activeDays.filter((x) => x !== d.value)
                          : [...activeDays, d.value].sort();
                        setConfig({ ...config, working_days: updated });
                      }}
                      className={cn(
                        "h-10 w-10 rounded-xl border text-xs font-black transition-all",
                        isActive
                          ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-300"
                          : "border-white/10 bg-white/5 text-white/30 hover:text-white/50"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Searchable Headquarters Timezone Selection */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                <Globe2 className="h-3.5 w-3.5 text-cyan-500" />
                Escribe tu País / Zona de Cabecera
              </label>
              <div className="relative">
                <input
                  list="timezone-options"
                  placeholder="Escribe un país (ej: Colombia, España...)"
                  value={
                    (config.default_timezone_label as string | undefined) ??
                    (config.default_timezone as string | undefined) ??
                    ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    // We store the label separately to allow clearing without immediate fallback
                    setConfig({
                      ...config,
                      default_timezone_label: val,
                      default_timezone: val,
                    });
                  }}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70 transition-all outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <datalist id="timezone-options">
                  {/* Principales / Sugeridos */}
                  <option value="Europe/Madrid">España (Madrid)</option>
                  <option value="America/Bogota">Colombia (Bogotá)</option>
                  <option value="America/Mexico_City">México (CDMX)</option>
                  <option value="America/Lima">Perú (Lima)</option>
                  <option value="America/Santiago">Chile (Santiago)</option>
                  <option value="America/Argentina/Buenos_Aires">Argentina (B. Aires)</option>
                  <option value="America/Panama">Panamá</option>
                  <option value="America/Guayaquil">Ecuador</option>
                  <option value="America/New_York">Miami / Nueva York (EST)</option>
                  <option value="America/Chicago">Chicago / Central (CST)</option>
                  <option value="America/Denver">Denver / Mountain (MST)</option>
                  <option value="America/Los_Angeles">Los Ángeles / Pacific (PST)</option>

                  {/* Carga dinámica de todos los husos del mundo para que aparezca Miami, etc */}
                  {Object.keys(ct.getAllTimezones()).map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </datalist>
                <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 opacity-20">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3 text-[9px] leading-relaxed font-medium text-white/40">
                🚀 **Buscador Inteligente**: Puedes escribir el nombre del país o la zona horaria
                directamente. El sistema se encargará de traducir &quot;Ecuador&quot; a su zona
                horaria correspondiente.
              </div>
            </div>
          </div>
        )}

        {/* ── VOICE CALL CONFIG ───────────────────────────── */}
        {type === "voiceCall" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-blue-400">
              <Phone className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Llamada IA — Agente de Voz
              </span>
            </div>

            {/* Provider selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Proveedor de Voz
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["retell", "ultravox"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setConfig({ ...config, provider: p })}
                    className={cn(
                      "h-11 rounded-xl border text-xs font-black tracking-widest uppercase transition-all",
                      (config.provider || "retell") === p
                        ? "border-blue-500/40 bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/10"
                        : "border-white/10 bg-white/5 text-white/30 hover:text-white/60"
                    )}
                  >
                    {p === "retell" ? "📞 Retell AI" : "🎙 Ultravox"}
                  </button>
                ))}
              </div>
            </div>

            <VoiceAgentSelector
              selectedAgentId={(config.agentId as string) || null}
              onChange={(id, name) => setConfig({ ...config, agentId: id, agentName: name || id })}
            />

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Número de Salida
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                <Phone className="h-4 w-4 text-blue-400" />
                <span>Autoresuelto por la API del Proveedor</span>
              </div>
              <p className="px-1 text-[9px] text-white/30 italic">
                El sistema detectará y utilizará automáticamente el número de teléfono que hayas
                vinculado a este agente en Retell / Ultravox.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="vc-vars" className="text-[10px] font-bold text-white/40 uppercase">
                Variables Dinámicas (JSON)
              </label>
              <textarea
                id="vc-vars"
                value={(config.dynamicVariables as string) || ""}
                onChange={(e) => setConfig({ ...config, dynamicVariables: e.target.value })}
                rows={3}
                className="focus:ring-primary/20 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-emerald-300 focus:ring-2 focus:outline-none"
                placeholder='{"nombre_lead": "{{lead.nombre}}"}'
              />

              {/* Diccionario de Variables */}
              <div className="mt-3 space-y-2 rounded-xl border border-white/5 bg-black/40 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-black text-white/40 uppercase">
                  <Database className="h-3 w-3" /> Diccionario del Sistema
                </p>
                <p className="mb-2 text-[9px] leading-relaxed text-white/30">
                  Usa estos códigos para inyectar los datos del Lead que entraron por el Disparador
                  (ZOHO/Webhook) hacia tu agente de voz:
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-cyan-300/70">
                  <div
                    className="truncate rounded border border-white/5 bg-white/5 p-1.5"
                    title="{{lead.nombre}}"
                  >
                    {"{{lead.nombre}}"}
                  </div>
                  <div
                    className="truncate rounded border border-white/5 bg-white/5 p-1.5"
                    title="{{lead.apellido}}"
                  >
                    {"{{lead.apellido}}"}
                  </div>
                  <div
                    className="truncate rounded border border-white/5 bg-white/5 p-1.5"
                    title="{{lead.telefono}}"
                  >
                    {"{{lead.telefono}}"}
                  </div>
                  <div
                    className="truncate rounded border border-white/5 bg-white/5 p-1.5"
                    title="{{lead.email}}"
                  >
                    {"{{lead.email}}"}
                  </div>
                  <div
                    className="truncate rounded border border-white/5 bg-white/5 p-1.5"
                    title="{{lead.pais}}"
                  >
                    {"{{lead.pais}}"}
                  </div>
                  <div
                    className="truncate rounded border border-white/5 bg-white/5 p-1.5"
                    title="{{lead.curso}}"
                  >
                    {"{{lead.curso}}"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONDITION (IF/ELSE) CONFIG ──────────────────────── */}
        {type === "condition" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-indigo-400">
              <GitBranchPlus className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Condición Lógica (IF/ELSE)
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase">
                  Variable a evaluar
                </label>
                <input
                  value={(config.variable as string) || "{{call.answered}}"}
                  onChange={(e) => setConfig({ ...config, variable: e.target.value })}
                  placeholder="{{call.answered}}"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80 transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <p className="px-1 text-[9px] text-white/30 italic">
                  Ej: <code>{`{{call.answered}}`}</code>, <code>{`{{llm.is_qualified}}`}</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase">Operador</label>
                  <select
                    title="Operador Lógico"
                    value={(config.operator as string) || "=="}
                    onChange={(e) => setConfig({ ...config, operator: e.target.value })}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white/80 transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  >
                    <option value="==" className="bg-[#0a0a0a]">
                      Es igual a (==)
                    </option>
                    <option value="!=" className="bg-[#0a0a0a]">
                      Distinto de (!=)
                    </option>
                    <option value="contains" className="bg-[#0a0a0a]">
                      Contiene
                    </option>
                    <option value=">" className="bg-[#0a0a0a]">
                      Mayor que ({">"})
                    </option>
                    <option value="<" className="bg-[#0a0a0a]">
                      Menor que ({"<"})
                    </option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase">
                    Valor Esperado
                  </label>
                  <input
                    value={(config.value as string) || "true"}
                    onChange={(e) => setConfig({ ...config, value: e.target.value })}
                    placeholder="true, false, yes..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white/80 transition-all focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-3 text-[9px] leading-relaxed font-medium text-white/40">
              🚀 Si la condición se cumple, el flujo continuará por la conexión &quot;Sí
              (True)&quot;. En caso contrario, seguirá por la rama &quot;No (False)&quot;.
            </div>

            {/* INSPECTOR DE PAYLOAD (n8n style) */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <label className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-emerald-400" />
                  <span>Inspeccionar Datos de Entrada</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black tracking-widest text-emerald-400">
                  SIMULADO
                </span>
              </label>
              <div className="custom-scrollbar overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3">
                <pre className="font-mono text-[9px] leading-relaxed text-emerald-400/80">
                  {JSON.stringify(
                    {
                      lead: {
                        nombre: "Juan Perez",
                        email: "juan@ejemplo.com",
                        telefono: "+34600000000",
                        score: 85,
                      },
                      call: {
                        answered: true,
                        duration_seconds: 124,
                        status: "completed",
                      },
                      llm: {
                        is_qualified: true,
                        objecion_principal: "precio",
                        interes_curso: "MBA",
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
              <p className="px-1 text-[9px] text-white/30 italic">
                * Este JSON simula la estructura exacta que llega al nodo. Copia la ruta (ej.{" "}
                <code className="rounded bg-emerald-500/10 px-1 text-emerald-400">{`{{llm.is_qualified}}`}</code>
                ) para armar tu condición.
              </p>
            </div>
          </div>
        )}

        {/* ── TEXT AGENT CONFIG ───────────────────────────── */}
        {type === "textAgent" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-purple-400">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                Agente de Texto IA
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                Seleccionar Agente Configurado
              </label>
              {loadingAgents ? (
                <div className="h-12 animate-pulse rounded-xl border border-white/5 bg-white/5" />
              ) : (
                <select
                  title="Seleccionar agente de texto"
                  value={(config.linkedAgentId as string) || "none"}
                  onChange={(e) => {
                    const agent = agents.find((a) => a.id === e.target.value);
                    setConfig({
                      ...config,
                      linkedAgentId: e.target.value,
                      agentName: agent?.name || e.target.value,
                    });
                  }}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="none" className="bg-black">
                    — Configurar manualmente —
                  </option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-black text-white">
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              )}
              {agents.length === 0 && !loadingAgents && (
                <p className="px-1 text-[9px] text-white/20 italic">
                  No hay agentes. Crea uno en el módulo de Agentes.
                </p>
              )}
            </div>

            {(!config.linkedAgentId || (config.linkedAgentId as string) === "none") && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 border-t border-white/5 pt-2"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="ta-prompt"
                    className="text-[10px] font-bold text-white/40 uppercase"
                  >
                    Prompt del Sistema
                  </label>
                  <textarea
                    id="ta-prompt"
                    value={(config.prompt as string) || ""}
                    rows={6}
                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed transition-all focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                    placeholder="Eres un asistente de ventas. Califica al lead según su interés..."
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="ta-model"
                    className="text-[10px] font-bold text-white/40 uppercase"
                  >
                    Modelo de IA
                  </label>
                  <select
                    id="ta-model"
                    title="Modelo"
                    value={(config.model as string) || "gpt-4o-mini"}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold focus:ring-2 focus:ring-purple-500/20"
                  >
                    <optgroup label="OpenAI" className="bg-black">
                      <option value="gpt-4o" className="bg-black text-white">
                        GPT-4o
                      </option>
                      <option value="gpt-4o-mini" className="bg-black text-white">
                        GPT-4o Mini
                      </option>
                    </optgroup>
                    <optgroup label="Anthropic" className="bg-black">
                      <option value="claude-3-5-sonnet-20241022" className="bg-black text-white">
                        Claude 3.5 Sonnet
                      </option>
                      <option value="claude-3-haiku-20240307" className="bg-black text-white">
                        Claude 3 Haiku
                      </option>
                    </optgroup>
                    <optgroup label="Google" className="bg-black">
                      <option value="gemini-2.0-flash" className="bg-black text-white">
                        Gemini 2.0 Flash
                      </option>
                    </optgroup>
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── WHATSAPP NODE CONFIG (new type) ────────────── */}
        {type === "whatsapp" && (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-2 text-emerald-400">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-black tracking-widest uppercase">
                WhatsApp — Meta Cloud API
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase">
                Seleccionar Plantilla
              </label>
              {loadingTemplates ? (
                <div className="flex h-12 animate-pulse items-center rounded-xl border border-white/5 bg-white/5 px-4 text-xs font-bold text-white/20">
                  Cargando plantillas...
                </div>
              ) : (
                <select
                  title="WhatsApp Template"
                  value={(config.templateId as string) || ""}
                  onChange={(e) => setConfig({ ...config, templateId: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="" disabled className="bg-black">
                    -- Elige una plantilla --
                  </option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.name} className="bg-black text-white">
                      {t.name} ({t.language})
                    </option>
                  ))}
                  {templates.length === 0 && (
                    <option value="" className="bg-black">
                      Sin plantillas — configura en Ajustes
                    </option>
                  )}
                </select>
              )}
            </div>

            {/* Template preview */}
            {(() => {
              const selected = templates.find((t) => t.name === config.templateId);
              if (!selected) return null;
              const body = selected.components?.find((c) => c.type === "BODY");
              const text = (body?.text as string) || "";
              const vars: string[] = Array.from(new Set(text.match(/\{\{\d+\}\}/g) || []));
              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                    <p className="mb-2 text-[9px] font-black text-emerald-500/50 uppercase">
                      Vista Previa
                    </p>
                    <p className="text-[11px] leading-relaxed text-white/70">{text}</p>
                  </div>
                  {vars.length > 0 && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                        <Zap className="h-3 w-3 text-amber-500" /> Variables ({vars.length})
                      </label>
                      {vars.map((v) => {
                        const idx = v.replace(/[\{\}]/g, "");
                        const maps = (config.variableMappings as Record<string, string>) || {};
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-black text-white/40">
                              {idx}
                            </div>
                            <input
                              value={maps[idx] || ""}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  variableMappings: { ...maps, [idx]: e.target.value },
                                })
                              }
                              placeholder="lead.nombre o Texto fijo"
                              className="h-9 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold focus:ring-1 focus:ring-emerald-500/20"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </div>
        )}

        {/* ── PDF GENERATOR CONFIG ─────────────────────────────────── */}
        {(type === "pdfGenerator" || type === "flow_pdf_generator") && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <div className="mb-1 flex items-center gap-2">
                <FileDown className="h-4 w-4 text-rose-400" />
                <span className="text-[10px] font-black tracking-tighter text-rose-400 uppercase">
                  Generador de PDF · pdf.co
                </span>
              </div>
              <p className="text-[9px] leading-relaxed font-bold text-white/40">
                Genera un PDF a partir de una plantilla HTML y expone su URL como variable para WhatsApp o emails.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                Nombre de plantilla
              </label>
              <input
                value={(config.pdf_template_name as string) || ""}
                onChange={(e) => setConfig({ ...config, pdf_template_name: e.target.value })}
                className="h-10 w-full rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 text-xs font-bold text-rose-300 placeholder-white/20"
                placeholder="Ej: Cotización Grúas"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black tracking-widest text-rose-400 uppercase">
                📤 Variable de Salida (URL del PDF)
              </label>
              <input
                value={(config.pdf_output_variable as string) || "pdf_url"}
                onChange={(e) => setConfig({ ...config, pdf_output_variable: e.target.value })}
                className="h-10 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 font-mono text-xs font-bold text-rose-300"
                placeholder="pdf_url"
              />
              <p className="text-[8px] text-white/30 italic">
                Disponible en pasos siguientes como <span className="font-mono text-rose-400">{`{{${(config.pdf_output_variable as string) || "pdf_url"}}}`}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                Nombre del archivo PDF
              </label>
              <input
                value={(config.pdf_filename as string) || "cotizacion.pdf"}
                onChange={(e) => setConfig({ ...config, pdf_filename: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-xs text-white/80"
                placeholder="cotizacion.pdf"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                Tamaño de página
              </label>
              <select
                value={(config.pdf_paper_size as string) || "Letter"}
                onChange={(e) => setConfig({ ...config, pdf_paper_size: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80 outline-none"
              >
                <option value="Letter">Letter</option>
                <option value="A4">A4</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                Variables dinámicas (JSON)
              </label>
              <textarea
                value={
                  (config.pdf_variables as string) ||
                  JSON.stringify(
                    {
                      cliente: "{{lead.nombre}}",
                      telefono: "{{lead.telefono}}",
                      items: "{{items}}",
                      total: "{{total}}",
                      fecha: "{{fecha}}",
                    },
                    null,
                    2
                  )
                }
                onChange={(e) => setConfig({ ...config, pdf_variables: e.target.value })}
                className="min-h-[110px] w-full rounded-2xl border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-white/50 outline-none focus:text-white/80"
                placeholder='{"cliente": "{{lead.nombre}}", "total": "{{total}}"}'
              />
              <p className="text-[8px] text-white/20 italic">
                Usa <span className="font-mono text-rose-400">{`{{variable}}`}</span> para reemplazar placeholders en tu plantilla HTML.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                Plantilla HTML
              </label>
              <textarea
                value={
                  (config.pdf_html_template as string) ||
                  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px; }
    .logo { font-size: 24px; font-weight: bold; }
    .subtitle { color: #aaa; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f0f0f0; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Cotización de Servicio</div>
    <div class="subtitle">Cliente: {{cliente}} | Tel: {{telefono}} | Fecha: {{fecha}}</div>
  </div>
  <table>
    <thead><tr><th>Descripción</th><th>Detalles</th></tr></thead>
    <tbody>
      <tr><td>Items / Servicios</td><td>{{items}}</td></tr>
    </tbody>
  </table>
  <div class="total">Total: {{total}}</div>
</body>
</html>`
                }
                onChange={(e) => setConfig({ ...config, pdf_html_template: e.target.value })}
                className="min-h-[180px] w-full rounded-2xl border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-white/60 outline-none focus:text-white/90"
              />
            </div>
          </div>
        )}

        {/* VARIABLE EXPLORER (HINT) */}
        <div className="bg-primary/5 border-primary/10 space-y-2 rounded-xl border p-4 text-left">
          <div className="text-primary flex items-center gap-2">
            <Info className="h-3 w-3" />
            <span className="text-[9px] font-black tracking-widest uppercase">
              Variables Disponibles
            </span>
          </div>
          <p className="group text-[10px] leading-relaxed font-medium text-white/40 transition-all">
            Usa{" "}
            <code
              className={cn(
                "text-primary group-hover:bg-primary/20 rounded px-1 transition-colors"
              )}
            >
              {"{{llm_result}}"}
            </code>{" "}
            para insertar el análisis de la IA o{" "}
            <code className="text-cyan-400">{"{{api_response}}"}</code> para datos externos.
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-white/5 bg-white/[0.01] p-8">
        <button
          onClick={handleSave}
          className="bg-primary text-primary-foreground shadow-primary/20 flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-sm font-black tracking-widest uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Save className="h-5 w-5" />
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
