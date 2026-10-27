"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Zap,
  Save,
  PlusCircle,
  AlarmClock,
  MessageSquare as MessageSquareIcon,
  Trash2,
  Edit3,
  UserCheck,
  Terminal,
  Play,
  Cpu,
  Brain,
  Database as DbIcon,
  X,
  Sparkles,
  Calendar,
  RefreshCw,
  Search,
  CalendarPlus,
  CalendarX,
  RefreshCcw,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAIAgents,
  getAgentVariants,
  saveAgentVariant,
  saveAIAgent,
  deleteAIAgent,
} from "@/lib/actions/agents";
import { getKnowledgeBase } from "@/lib/actions/knowledge";
import { testAgentVariables } from "@/lib/actions/simulator";
import type { AIAgent, AIAgentVariant, KnowledgeItem } from "@/types/database";
import { toast } from "@/components/ui/toast";
import { useTenantStore } from "@/store/tenant";

interface AIAgentCRMConfig {
  provider: string;
  api_key?: string;
  api_secret?: string;
  field_mapping?: { tag: string; crm_key: string }[];
  prevent_duplicates?: boolean;
  match_by?: "EMAIL" | "PHONE" | "BOTH";
}

interface AIAgentAutomationRules {
  inactivity_enabled?: boolean;
  inactivity_timeout?: number;
  max_retries?: number;
  inactivity_action?: "MESSAGE" | "NOTIFY";
  inactivity_ai_enabled?: boolean;
  inactivity_message?: string;
  contact_policy?: string;
  working_hours?: { start: string; end: string; days: number[] };
  retry_delay?: number;
  tools?: Record<string, boolean>;
  finalization_criteria?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [activeTab, setActiveTab] = useState<"BRAIN" | "INACTIVO" | "CRM">("BRAIN");

  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingType, setEditingType] = useState("string");
  const [saving, setSaving] = useState(false);

  // Simulator State
  const [simHistory, setSimHistory] = useState<{ role: "user" | "assistant"; content: string }[]>(
    []
  );
  const [simVariables, setSimVariables] = useState<Record<string, string | number | boolean>>({});
  const [simInput, setSimInput] = useState("");
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [simLogs, setSimLogs] = useState<
    { status: "success" | "pending" | "error"; label: string }[]
  >([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);

  const tenantId = useTenantStore((s) => s.tenantId);

  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDescription, setNewAgentDescription] = useState("");

  const [variantA, setVariantA] = useState<Partial<AIAgentVariant>>({});
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeItem[]>([]);

  const loadData = useCallback(async () => {
    const res = await getAIAgents(tenantId || undefined);
    if (res.success && res.data) {
      setAgents(res.data);
      if (res.data.length > 0 && !selectedAgent) setSelectedAgent(res.data[0]);
    }
    const kbRes = await getKnowledgeBase(tenantId || undefined);
    if (kbRes.success && kbRes.data) setKnowledgeBases(kbRes.data);
  }, [selectedAgent, tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData, tenantId]);

  useEffect(() => {
    if (selectedAgent) {
      async function loadVariants(agentId: string) {
        setVariantA({
          agent_id: agentId,
          is_variant_b: false,
          prompt_text: "",
          model_provider: "OPENAI",
          model_name: "gpt-4o",
          automation_rules: {
            contact_policy: "auto",
            working_hours: { start: "09:00", end: "21:00", days: [1, 2, 3, 4, 5] },
            retry_delay: 15,
            max_retries: 3,
          },
          scheduling_config: { enabled: false, duration: 30, buffer: 15 },
        } as Partial<AIAgentVariant>);

        const res = await getAgentVariants(agentId);
        if (res.success && res.data) {
          const data = res.data as AIAgentVariant[];
          const a = data.find((v) => !v.is_variant_b);
          if (a) setVariantA(a);
        }
      }
      loadVariants(selectedAgent.id);
    }
  }, [selectedAgent]);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    setSaving(true);
    try {
      const res = await saveAIAgent({
        name: newAgentName.trim(),
        description: newAgentDescription.trim(),
        status: "ACTIVE",
        type: "QUALIFY",
        tenant_id: tenantId || undefined,
      });
      if (res?.success && res?.data) {
        setIsCreateModalOpen(false);
        setNewAgentName("");
        setNewAgentDescription("");
        toast({
          variant: "success",
          title: "Maestro Creado",
          description: "El agente ha sido configurado con éxito.",
        });
        setSelectedAgent(res.data);
        await loadData();
      } else {
        toast({
          variant: "error",
          title: "Error al crear agente",
          description:
            res?.error || "No se pudo crear el agente. Verifica que haya un cliente seleccionado.",
        });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        variant: "error",
        title: "Error al crear agente",
        description: error?.message || "Error inesperado al contactar con el servidor.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent || !newAgentName.trim()) return;
    setSaving(true);
    try {
      const res = await saveAIAgent({
        id: selectedAgent.id,
        name: newAgentName.trim(),
        description: newAgentDescription.trim(),
        tenant_id: tenantId || undefined,
      });
      if (res?.success && res?.data) {
        await loadData();
        setSelectedAgent(res.data);
        setIsEditModalOpen(false);
        toast({
          variant: "success",
          title: "Maestro Actualizado",
          description: "Los datos básicos se actualizaron correctamente.",
        });
      } else {
        toast({
          variant: "error",
          title: "Error al actualizar agente",
          description: res?.error || "No se pudo actualizar el agente.",
        });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        variant: "error",
        title: "Error al actualizar agente",
        description: error?.message || "Error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    setSaving(true);
    try {
      const res = await deleteAIAgent(agentToDelete.id, tenantId || undefined);
      if (res.success) {
        await loadData();
        if (selectedAgent?.id === agentToDelete.id) setSelectedAgent(null);
        setIsDeleteModalOpen(false);
        toast({
          variant: "success",
          title: "Maestro Eliminado",
          description: "El agente fue eliminado exitosamente.",
        });
      } else {
        toast({
          variant: "error",
          title: "Error al eliminar agente",
          description: res.error || "No se pudo eliminar el agente.",
        });
      }
    } catch (err) {
      const error = err as Error;
      toast({
        variant: "error",
        title: "Error al eliminar agente",
        description: error.message || "Error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAgent) return;
    setIsSaving(true);
    try {
      const res = await saveAgentVariant({
        ...variantA,
        agent_id: selectedAgent.id,
        is_active: true,
        is_variant_b: false,
        tenant_id: tenantId || undefined,
      } as AIAgentVariant);
      if (!res.success) throw new Error(res.error || "Error al guardar");
      toast({
        variant: "success",
        title: "Agente Maestro actualizado",
        description: "Los cambios del agente se guardaron correctamente.",
      });
    } catch (err: unknown) {
      const error = err as Error;
      toast({ variant: "error", title: "Error al guardar", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimSend = async () => {
    if (!selectedAgent || !simInput.trim() || isSimLoading) return;

    const userMsg = simInput.trim();
    setSimInput("");
    setSimHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsSimLoading(true);
    setSimLogs([
      { status: "pending", label: "Procesando mensaje..." },
      { status: "success", label: "ADN del Agente Cargado" },
    ]);

    try {
      const res = await testAgentVariables({
        agentId: selectedAgent.id,
        message: userMsg,
        history: simHistory,
        currentVariables: simVariables,
      });

      if (res.success && res.response) {
        setSimHistory((prev) => [...prev, { role: "assistant", content: res.response! }]);
        if (res.extracted && Object.keys(res.extracted).length > 0) {
          setSimVariables((prev) => ({ ...prev, ...res.extracted }));
          setSimLogs((prev) => [
            ...prev,
            {
              status: "success",
              label: `Datos extraídos: ${Object.keys(res.extracted!).join(", ")}`,
            },
          ]);
        }
        setSimLogs((prev) =>
          prev.map((l) =>
            l.label === "Procesando mensaje..."
              ? { ...l, status: "success", label: "Respuesta generada" }
              : l
          )
        );
      } else {
        toast({
          variant: "error",
          title: "Error en simulador",
          description: res.error || "Desconocido",
        });
        setSimLogs((prev) =>
          prev.map((l) =>
            l.label === "Procesando mensaje..."
              ? { ...l, status: "error", label: "Error en la respuesta" }
              : l
          )
        );
      }
    } catch (err) {
      console.error(err);
      setSimLogs((prev) =>
        prev.map((l) =>
          l.label === "Procesando mensaje..."
            ? { ...l, status: "error", label: "Fallo crítico" }
            : l
        )
      );
    } finally {
      setIsSimLoading(false);
    }
  };

  return (
    <div className="bg-[#030712] text-white selection:bg-[#00e5ff]/30 flex h-[calc(100vh-80px)] flex-col overflow-hidden transition-colors duration-500">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-[rgba(0,229,255,0.1)] bg-[rgba(4,8,20,0.85)] px-8 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.3)] to-transparent" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.1)] text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <Bot className="h-6 w-6 text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                {selectedAgent?.name || "Agente Maestro"}
              </h1>
              {selectedAgent && (
                <button
                  title="Editar Agente"
                  onClick={() => {
                    setNewAgentName(selectedAgent.name);
                    setNewAgentDescription(selectedAgent.description || "");
                    setIsEditModalOpen(true);
                  }}
                  className="rounded-lg border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.06)] p-1 text-[#00e5ff] transition-all hover:bg-[rgba(0,229,255,0.15)] hover:shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-[10px] font-black tracking-[0.2em] text-[#00e5ff]/70 uppercase">
              Single-Prompt Orchestration Console
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            title="Abrir Simulador Vivo"
            onClick={() => setIsSimulatorOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.08)] px-6 text-[10px] font-black tracking-widest text-[#00e5ff] uppercase shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all hover:bg-[rgba(0,229,255,0.18)]"
          >
            <Terminal className="h-4 w-4 text-[#00e5ff]" />
            Abrir Simulador
          </button>
          <button
            title="Guardar cambios en el agente"
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-11 items-center gap-2 rounded-xl border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.18)] px-8 text-[10px] font-black tracking-widest text-[#00e5ff] uppercase shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all hover:scale-105 hover:bg-[rgba(0,229,255,0.28)] active:scale-95"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Publicar Cambios"}
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-80 flex-col border-r border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.7)] backdrop-blur-xl">
          <div className="p-6">
            <button
              title="Crear nuevo Agente Maestro"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.05)] text-[10px] font-black tracking-widest text-[#00e5ff] uppercase shadow-[0_0_12px_rgba(0,229,255,0.15)] transition-all hover:bg-[rgba(0,229,255,0.12)]"
            >
              <PlusCircle className="h-4 w-4" /> Nuevo Maestro
            </button>
          </div>
          <div className="scrollbar-thin scrollbar-thumb-white/5 flex-1 space-y-3 overflow-y-auto px-4 pb-10">
            {agents.length === 0 && (
              <EmptyState
                size="sm"
                icon={<Bot className="h-10 w-10 text-[#00e5ff]" />}
                title="Sin agentes configurados"
                description="Crea tu primer Agente Maestro para empezar a automatizar conversaciones."
                className="mx-2 mt-2 border-[rgba(0,229,255,0.1)] bg-[rgba(6,10,25,0.6)]"
              />
            )}
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  "group relative w-full cursor-pointer overflow-hidden rounded-[24px] border p-5 text-left transition-all",
                  selectedAgent?.id === agent.id
                    ? "border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.1)] shadow-[0_0_18px_rgba(0,229,255,0.15)]"
                    : "border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,30,0.5)] hover:border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.04)]"
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                    <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">
                      Activo
                    </span>
                  </div>
                  <button
                    title="Borrar Agente"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAgentToDelete(agent);
                      setIsDeleteModalOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h3
                  className={cn(
                    "truncate text-sm font-black tracking-tight",
                    selectedAgent?.id === agent.id ? "text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" : "text-white"
                  )}
                >
                  {agent.name}
                </h3>
                <p className="mt-1 line-clamp-1 text-[10px] font-bold text-slate-400">
                  {agent.description || "Sin descripción"}
                </p>
                {selectedAgent?.id === agent.id && (
                  <motion.div
                    layoutId="activeAgent"
                    className="absolute top-0 bottom-0 left-0 w-1 bg-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.8)]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="from-primary/5 flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] via-transparent to-transparent">
          {!selectedAgent ? (
            <div className="flex flex-1 items-center justify-center p-10">
              <EmptyState
                size="lg"
                icon={<Bot className="h-12 w-12" />}
                title="Sin agentes configurados"
                description="Crea tu primer Agente Maestro desde el panel izquierdo para configurar el cerebro, las reglas de inactividad y la sincronización con tu CRM."
              />
            </div>
          ) : (
            <>
              <div className="border-border bg-card/60 flex items-center border-b px-8 backdrop-blur-md">
                <TabButton
                  active={activeTab === "BRAIN"}
                  onClick={() => setActiveTab("BRAIN")}
                  icon={Brain}
                  label="Cerebro"
                />
                <TabButton
                  active={activeTab === "INACTIVO"}
                  onClick={() => setActiveTab("INACTIVO")}
                  icon={AlarmClock}
                  label="Inactividad"
                />
                <TabButton
                  active={activeTab === "CRM"}
                  onClick={() => setActiveTab("CRM")}
                  icon={DbIcon}
                  label="CRM Sync"
                />
              </div>

              <div className="no-scrollbar flex-1 overflow-y-auto p-10">
                <AnimatePresence mode="wait">
                  {activeTab === "BRAIN" && (
                    <motion.div
                      key="BRAIN"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mx-auto max-w-6xl space-y-12 pb-20"
                    >
                      {/* SECCIÓN 1: CEREBRO DEL AGENTE */}
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 border-primary/20 shadow-primary/5 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg">
                              <Cpu className="text-primary h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black tracking-tight uppercase">
                                Cerebro del Agente
                              </h3>
                              <p className="text-muted-foreground mt-1 text-[10px] font-black tracking-widest uppercase">
                                Selecciona el motor de inteligencia para este maestro
                              </p>
                            </div>
                          </div>

                          <div className="bg-card/40 border-border flex rounded-2xl border p-1">
                            <button
                              title="Usar OpenAI como proveedor"
                              onClick={() =>
                                setVariantA((p) => ({ ...p, model_provider: "OPENAI" }))
                              }
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-6 py-2 text-[10px] font-black tracking-widest uppercase transition-all",
                                variantA.model_provider === "OPENAI"
                                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Zap className="h-3 w-3" /> OpenAI
                            </button>
                            <button
                              title="Usar Anthropic como proveedor"
                              onClick={() =>
                                setVariantA((p) => ({ ...p, model_provider: "ANTHROPIC" }))
                              }
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-6 py-2 text-[10px] font-black tracking-widest uppercase transition-all",
                                variantA.model_provider === "ANTHROPIC"
                                  ? "bg-primary shadow-primary/20 text-white shadow-lg"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Brain className="h-3 w-3" /> Claude
                            </button>
                            <button
                              title="Usar Google Gemini como proveedor"
                              onClick={() =>
                                setVariantA((p) => ({ ...p, model_provider: "GEMINI" }))
                              }
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-6 py-2 text-[10px] font-black tracking-widest uppercase transition-all",
                                variantA.model_provider === "GEMINI"
                                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Zap className="h-3 w-3" /> Gemini
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                          {variantA.model_provider === "OPENAI" && (
                            <>
                              <ModelCard
                                active={variantA.model_name === "gpt-4.1"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "gpt-4.1" }))
                                }
                                label="GPT-4.1 (Omni)"
                                desc="Última versión optimizada con razonamiento 4.1"
                              />
                              <ModelCard
                                active={variantA.model_name === "gpt-4.1-mini"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "gpt-4.1-mini" }))
                                }
                                label="GPT-4.1 Mini"
                                desc="Máxima velocidad con inteligencia 4.1"
                              />
                              <ModelCard
                                active={variantA.model_name === "gpt-4o"}
                                onClick={() => setVariantA((p) => ({ ...p, model_name: "gpt-4o" }))}
                                label="GPT-4o (Standard)"
                                desc="El modelo insignia versátil y rápido"
                              />
                              <ModelCard
                                active={variantA.model_name === "gpt-4o-mini"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "gpt-4o-mini" }))
                                }
                                label="GPT-4o MINI"
                                desc="Económico y ultra-rápido"
                              />
                              <ModelCard
                                active={variantA.model_name === "o3-mini"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "o3-mini" }))
                                }
                                label="o3-mini (Logic)"
                                desc="Razonamiento ultra-rápido para lógica compleja"
                              />
                              <ModelCard
                                active={variantA.model_name === "o1"}
                                onClick={() => setVariantA((p) => ({ ...p, model_name: "o1" }))}
                                label="o1 (Preview)"
                                desc="Razonamiento profundo avanzado"
                              />
                              <ModelCard
                                active={variantA.model_name === "o1-mini"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "o1-mini" }))
                                }
                                label="o1-mini"
                                desc="Razonamiento rápido y eficaz"
                              />
                              <ModelCard
                                active={variantA.model_name === "gpt-4-turbo"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "gpt-4-turbo" }))
                                }
                                label="GPT-4 Turbo"
                                desc="Precisión legacy demostrada"
                              />
                            </>
                          )}
                          {variantA.model_provider === "ANTHROPIC" && (
                            <>
                              <ModelCard
                                active={variantA.model_name === "claude-3-5-sonnet-20241022"}
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    model_name: "claude-3-5-sonnet-20241022",
                                  }))
                                }
                                label="Claude 3.5 Sonnet"
                                desc="Balance perfecto entre velocidad e inteligencia"
                              />
                              <ModelCard
                                active={variantA.model_name === "claude-3-5-haiku-20241022"}
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    model_name: "claude-3-5-haiku-20241022",
                                  }))
                                }
                                label="Claude 3.5 Haiku"
                                desc="El más rápido de la familia Anthropic"
                              />
                              <ModelCard
                                active={variantA.model_name === "claude-3-opus-20240229"}
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    model_name: "claude-3-opus-20240229",
                                  }))
                                }
                                label="Claude 3 Opus"
                                desc="Máximo razonamiento y matices"
                              />
                            </>
                          )}
                          {variantA.model_provider === "GEMINI" && (
                            <>
                              <ModelCard
                                active={variantA.model_name === "gemini-1.5-pro"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "gemini-1.5-pro" }))
                                }
                                label="Gemini 1.5 Pro"
                                desc="Gran ventana de contexto y alta fidelidad"
                              />
                              <ModelCard
                                active={variantA.model_name === "gemini-1.5-flash"}
                                onClick={() =>
                                  setVariantA((p) => ({ ...p, model_name: "gemini-1.5-flash" }))
                                }
                                label="Gemini 1.5 Flash"
                                desc="Optimizado para velocidad y escala"
                              />
                            </>
                          )}
                        </div>

                        <div className="space-y-4">
                          <label className="text-muted-foreground ml-4 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase">
                            <Edit3 className="h-3 w-3" /> O introduce un ID de modelo manual
                          </label>
                          <input
                            type="text"
                            value={variantA.model_name || ""}
                            onChange={(e) =>
                              setVariantA((p) => ({ ...p, model_name: e.target.value }))
                            }
                            className="bg-card/60 border-border text-foreground focus:border-primary/40 h-14 w-full rounded-2xl border px-6 text-sm font-bold transition-all outline-none"
                            placeholder="ej: gpt-4.1-mini"
                          />
                        </div>
                      </div>

                      {/* SECCIÓN 2: ADN DEL AGENTE (PROMPT) */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                            <Terminal className="h-6 w-6 text-amber-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight uppercase">
                              ADN del Agente
                            </h3>
                            <p className="mt-1 text-[10px] font-black tracking-widest text-white/40 uppercase">
                              Define el comportamiento y objetivos del maestro
                            </p>
                          </div>
                        </div>
                        <textarea
                          value={variantA.prompt_text || ""}
                          onChange={(e) =>
                            setVariantA((p) => ({ ...p, prompt_text: e.target.value }))
                          }
                          className="bg-card/40 border-border focus:ring-primary/5 text-foreground border-t-primary/20 h-[400px] w-full resize-none rounded-[40px] border p-10 text-base leading-relaxed font-medium shadow-2xl backdrop-blur-xl transition-all outline-none focus:ring-4"
                          placeholder="Eres un agente experto en cualificación de leads..."
                        />
                      </div>

                      {/* SECCIÓN 2.5: POLÍTICA DE FINALIZACIÓN */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                            <X className="h-6 w-6 text-red-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight uppercase">
                              Política de Finalización
                            </h3>
                            <p className="mt-1 text-[10px] font-black tracking-widest text-white/40 uppercase">
                              Define cuándo se considera que la charla ha terminado para el análisis
                              profundo
                            </p>
                          </div>
                        </div>
                        <textarea
                          value={
                            (variantA.automation_rules as unknown as AIAgentAutomationRules)
                              ?.finalization_criteria || ""
                          }
                          onChange={(e) =>
                            setVariantA((p) => ({
                              ...p,
                              automation_rules: {
                                ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                finalization_criteria: e.target.value,
                              },
                            }))
                          }
                          className="bg-card/40 border-border focus:ring-primary/5 text-foreground h-[150px] w-full resize-none rounded-[32px] border p-8 text-sm leading-relaxed font-medium shadow-xl backdrop-blur-xl transition-all outline-none focus:ring-4"
                          placeholder="Ej: Cuando el usuario confirme la cita, cuando se despida explícitamente, o cuando el lead diga que no le interesa..."
                        />
                      </div>

                      {/* SECCIÓN 3: CAPTURAR DATOS (MEMORIA) */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
                              <Brain className="h-6 w-6 text-purple-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black tracking-tight text-amber-500 uppercase">
                                Capturar Datos (Memoria del Agente)
                              </h3>
                              <p className="mt-1 text-[10px] font-black tracking-widest text-white/40 uppercase">
                                La IA detectará estos datos en la charla y los guardará
                                automáticamente
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              title="Nueva etiqueta de memoria"
                              type="text"
                              placeholder="Nueva Etiqueta..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = (e.target as HTMLInputElement).value
                                    .trim()
                                    .toUpperCase();
                                  if (val) {
                                    const current = variantA.tracked_variables || [];
                                    if (!current.includes(val)) {
                                      setVariantA((p) => ({
                                        ...p,
                                        tracked_variables: [...current, val],
                                      }));
                                    }
                                    (e.target as HTMLInputElement).value = "";
                                  }
                                }
                              }}
                              className="bg-card border-border h-11 rounded-xl border px-6 text-xs font-bold outline-none focus:border-amber-500/40"
                            />
                            <button
                              title="Añadir nueva etiqueta de memoria"
                              onClick={() => {
                                const input = document.querySelector(
                                  'input[placeholder="Nueva Etiqueta..."]'
                                ) as HTMLInputElement;
                                const val = input?.value.trim().toUpperCase();
                                if (val) {
                                  const current = variantA.tracked_variables || [];
                                  if (!current.includes(val)) {
                                    setVariantA((p) => {
                                      const dyn =
                                        p.dynamic_variables &&
                                        typeof p.dynamic_variables === "object" &&
                                        !Array.isArray(p.dynamic_variables)
                                          ? { ...(p.dynamic_variables as Record<string, string>) }
                                          : {};
                                      dyn[val] = "string";
                                      return {
                                        ...p,
                                        tracked_variables: [...current, val],
                                        dynamic_variables: dyn,
                                      };
                                    });
                                  }
                                  input.value = "";
                                }
                              }}
                              className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 transition-all hover:bg-amber-500/20"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-card/20 border-border flex flex-wrap gap-3 rounded-[32px] border p-8">
                          {(variantA.tracked_variables || []).map((tag, idx) => {
                            const isEditing = editingTag === tag;
                            const dynVars =
                              variantA.dynamic_variables &&
                              typeof variantA.dynamic_variables === "object" &&
                              !Array.isArray(variantA.dynamic_variables)
                                ? (variantA.dynamic_variables as Record<string, string>)
                                : {};
                            const currentType = dynVars[tag] || "string";

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "group flex cursor-pointer items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 transition-all hover:border-amber-500/50",
                                  isEditing &&
                                    "min-w-[300px] border-blue-500/50 bg-blue-500/5 ring-2 ring-blue-500/50"
                                )}
                              >
                                <DbIcon
                                  className={cn(
                                    "h-3 w-3",
                                    isEditing ? "text-blue-400" : "text-amber-500/40"
                                  )}
                                />

                                {isEditing ? (
                                  <div className="flex w-full flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        autoFocus
                                        title="Editar nombre de variable"
                                        placeholder="NOMBRE_VARIABLE"
                                        value={editingValue}
                                        onChange={(e) =>
                                          setEditingValue(
                                            e.target.value.toUpperCase().replace(/\s/g, "_")
                                          )
                                        }
                                        className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs font-black tracking-wider text-blue-400"
                                      />
                                      <select
                                        title="Tipo de variable"
                                        value={editingType}
                                        onChange={(e) => setEditingType(e.target.value)}
                                        className="bg-card border-border text-foreground rounded-lg border px-2 py-1 text-[10px] font-bold outline-none"
                                      >
                                        <option value="string">Texto</option>
                                        <option value="number">Número</option>
                                        <option value="boolean">Booleano</option>
                                        <option value="date">Fecha</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Teléfono</option>
                                        <option value="url">URL</option>
                                        <option value="currency">Moneda</option>
                                        <option value="json">JSON</option>
                                        <option value="list">Lista</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setEditingTag(null)}
                                        className="text-muted-foreground hover:text-foreground text-[9px] font-bold"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (editingValue) {
                                            const newTags = (variantA.tracked_variables || []).map(
                                              (t) => (t === tag ? editingValue : t)
                                            );
                                            const newDyn = { ...dynVars };
                                            delete newDyn[tag];
                                            newDyn[editingValue] = editingType;

                                            setVariantA((p) => ({
                                              ...p,
                                              tracked_variables: newTags,
                                              dynamic_variables: newDyn,
                                            }));
                                          }
                                          setEditingTag(null);
                                        }}
                                        className="rounded bg-blue-400/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 hover:text-blue-300"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black tracking-wider text-amber-500">
                                        {"{{"}
                                        {tag}
                                        {"}}"}
                                      </span>
                                      <span className="text-[8px] font-bold tracking-widest text-amber-500/40 uppercase">
                                        {currentType}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        title={`Editar etiqueta ${tag}`}
                                        onClick={() => {
                                          setEditingTag(tag);
                                          setEditingValue(tag);
                                          setEditingType(currentType);
                                        }}
                                        className="p-1 text-blue-400 opacity-0 transition-all group-hover:opacity-100 hover:text-blue-300"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        title={`Eliminar etiqueta ${tag}`}
                                        onClick={() => {
                                          const newTags = (variantA.tracked_variables || []).filter(
                                            (t) => t !== tag
                                          );
                                          const newDyn = { ...dynVars };
                                          delete newDyn[tag];
                                          setVariantA((p) => ({
                                            ...p,
                                            tracked_variables: newTags,
                                            dynamic_variables: newDyn,
                                          }));
                                        }}
                                        className="p-1 text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {(variantA.tracked_variables || []).length === 0 && (
                            <p className="text-muted-foreground/20 py-4 text-[10px] font-black tracking-[0.3em] uppercase">
                              No hay etiquetas de memoria configuradas
                            </p>
                          )}
                        </div>
                      </div>

                      {/* SECCIÓN 4: CAPACIDADES Y HERRAMIENTAS */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 border-primary/20 shadow-primary/5 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg">
                            <Zap className="text-primary h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight uppercase">
                              Capacidades y Herramientas
                            </h3>
                            <p className="text-muted-foreground mt-1 text-[10px] font-black tracking-widest uppercase">
                              Habilita funciones avanzadas de orquestación
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {/* Calendario / Bookings */}
                          <div className="bg-card border-border group relative w-full space-y-8 overflow-hidden rounded-[40px] border p-8">
                            <div className="relative z-10 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-primary/10 border-primary/20 shadow-primary/5 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xl">
                                  <Calendar className="text-primary h-7 w-7" />
                                </div>
                                <div>
                                  <h4 className="text-foreground text-lg font-black tracking-tight uppercase">
                                    Orquestador de Citas
                                  </h4>
                                  <p className="text-muted-foreground mt-1 text-[10px] font-black tracking-widest uppercase">
                                    Conexión con Calendario
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              {/* Herramientas de Automatización */}
                              {[
                                {
                                  id: "check_availability",
                                  label: "Verificar Disponibilidad",
                                  desc: "Permite a la IA consultar espacios libres en tiempo real.",
                                  icon: Search,
                                },
                                {
                                  id: "book_appointment",
                                  label: "Agendar Cita",
                                  desc: "Habilita la capacidad de crear nuevas reservas.",
                                  icon: CalendarPlus,
                                },
                                {
                                  id: "cancel_appointment",
                                  label: "Cancelar Cita",
                                  desc: "Permite a la IA anular citas si el usuario lo solicita.",
                                  icon: CalendarX,
                                },
                                {
                                  id: "reschedule_appointment",
                                  label: "Reprogramar Cita",
                                  desc: "Gestiona cambios de horario para citas existentes.",
                                  icon: RefreshCcw,
                                },
                              ].map((tool) => {
                                const isEnabled =
                                  (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                    ?.tools?.[tool.id] === true;
                                const Icon = tool.icon;
                                return (
                                  <div key={tool.id} className="group/tool relative">
                                    <button
                                      onClick={() => {
                                        const currentTools =
                                          (
                                            variantA.automation_rules as unknown as AIAgentAutomationRules
                                          )?.tools || {};
                                        const newTools = { ...currentTools, [tool.id]: !isEnabled };
                                        setVariantA((p) => ({
                                          ...p,
                                          automation_rules: {
                                            ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                            tools: newTools,
                                          },
                                        }));
                                      }}
                                      className={cn(
                                        "relative flex w-full flex-col items-center gap-4 rounded-[24px] border p-5 text-center transition-all",
                                        isEnabled
                                          ? "bg-primary/[0.03] border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]"
                                          : "bg-muted/20 hover:bg-muted/40 hover:border-border border-transparent"
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500",
                                          isEnabled
                                            ? "bg-primary shadow-primary/30 scale-110 rotate-0 text-white shadow-lg"
                                            : "bg-card text-muted-foreground border-border border group-hover/tool:scale-105"
                                        )}
                                      >
                                        <Icon className="h-6 w-6" />
                                      </div>

                                      <div className="space-y-1.5">
                                        <span
                                          className={cn(
                                            "block text-[10px] font-black tracking-[0.15em] uppercase transition-colors",
                                            isEnabled ? "text-primary" : "text-muted-foreground"
                                          )}
                                        >
                                          {tool.label}
                                        </span>
                                        <div className="flex justify-center">
                                          <div
                                            className={cn(
                                              "relative h-5 w-9 rounded-full border transition-all duration-300",
                                              isEnabled
                                                ? "bg-primary border-primary"
                                                : "bg-muted border-border"
                                            )}
                                          >
                                            <div
                                              className={cn(
                                                "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-300",
                                                isEnabled ? "right-1" : "left-1"
                                              )}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </button>

                                    {/* TOOLTIP / SUBMENU FLOTANTE */}
                                    <div className="bg-card/95 border-border pointer-events-none absolute bottom-full left-1/2 z-50 mb-4 w-48 -translate-x-1/2 translate-y-2 rounded-2xl border p-4 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-300 group-hover/tool:translate-y-0 group-hover/tool:opacity-100">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                                          <span className="text-primary text-[9px] font-black tracking-widest uppercase">
                                            Info Herramienta
                                          </span>
                                        </div>
                                        <p className="text-foreground/80 text-[11px] leading-relaxed font-medium">
                                          {tool.desc}
                                        </p>
                                      </div>
                                      <div className="bg-card border-border absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                              <Calendar className="h-32 w-32 -rotate-12" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN 5: CREDENCIALES */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
                              <Zap className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black tracking-tight uppercase">
                                Credenciales de Acceso (Model Provider)
                              </h3>
                              <p className="mt-1 text-[10px] font-black tracking-widest text-white/40 uppercase">
                                Llave API exclusiva para este agente maestro
                              </p>
                            </div>
                          </div>
                          <button
                            title="Mostrar/Ocultar credenciales"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-primary text-[10px] font-black tracking-widest uppercase hover:underline"
                          >
                            {showApiKey ? "Ocultar" : "Mostrar"}
                          </button>
                        </div>

                        <div className="group relative">
                          <input
                            type={showApiKey ? "text" : "password"}
                            title="API Key del Proveedor"
                            value={variantA.api_key || ""}
                            onChange={(e) =>
                              setVariantA((p) => ({ ...p, api_key: e.target.value }))
                            }
                            className="bg-card border-border text-primary focus:border-primary/40 h-20 w-full rounded-[32px] border px-10 text-lg tracking-[0.5em] shadow-2xl transition-all outline-none"
                            placeholder="••••••••••••••••••••••••••••••••••••••••••••••••"
                          />
                          <p className="text-muted-foreground mt-4 ml-4 text-[9px] italic">
                            * Esta llave se usará exclusivamente para las llamadas procesadas por
                            este agente. Si se deja vacía, se usará la llave global del sistema.
                          </p>
                        </div>
                      </div>

                      {/* SECCIÓN 5: KNOWLEDGE BASE */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                            <DbIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase dark:text-white">
                              Biblioteca de Conocimiento
                            </h3>
                            <p className="mt-1 text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-white/40">
                              Entrena al agente con tus documentos PDF
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {knowledgeBases.map((kb) => {
                            const isSelected = variantA.knowledge_base_ids?.includes(kb.id);
                            return (
                              <button
                                title={`Seleccionar base de conocimientos: ${kb.name}`}
                                key={kb.id}
                                onClick={() => {
                                  const currentIds = variantA.knowledge_base_ids || [];
                                  const newIds = isSelected
                                    ? currentIds.filter((id) => id !== kb.id)
                                    : [...currentIds, kb.id];
                                  setVariantA((p) => ({ ...p, knowledge_base_ids: newIds }));
                                }}
                                className={cn(
                                  "group flex h-24 items-center justify-between rounded-[32px] border p-6 text-left transition-all",
                                  isSelected
                                    ? "border-emerald-500/40 bg-emerald-500/10 shadow-xl shadow-emerald-500/10"
                                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.01] dark:hover:bg-white/[0.03]"
                                )}
                              >
                                <div className="flex items-center gap-4 overflow-hidden">
                                  <div
                                    className={cn(
                                      "flex h-12 w-12 items-center justify-center rounded-2xl transition-all",
                                      isSelected
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-200 text-slate-400 dark:bg-white/5 dark:text-white/20"
                                    )}
                                  >
                                    <DbIcon className="h-6 w-6" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <h4
                                      className={cn(
                                        "truncate text-sm font-black tracking-tight uppercase",
                                        isSelected
                                          ? "text-emerald-900 dark:text-white"
                                          : "text-slate-500 dark:text-white/40"
                                      )}
                                    >
                                      {kb.name}
                                    </h4>
                                    <p className="truncate text-[10px] font-bold text-slate-400 uppercase dark:text-white/20">
                                      {kb.description || "Documento indexado"}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "INACTIVO" && (
                    <motion.div
                      key="INACTIVO"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="mx-auto max-w-6xl space-y-8 pb-20"
                    >
                      {/* HEADER & MASTER TOGGLE */}
                      <div className="group hover:border-primary/20 relative overflow-hidden rounded-[48px] border border-slate-200 bg-white p-10 shadow-sm transition-all dark:border-white/5 dark:bg-white/[0.02]">
                        <div className="pointer-events-none absolute top-0 right-0 p-12 opacity-5 transition-opacity group-hover:opacity-10">
                          <AlarmClock className="text-primary h-32 w-32" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
                          <div className="flex items-center gap-6">
                            <div
                              className={cn(
                                "flex h-20 w-20 items-center justify-center rounded-[28px] border transition-all duration-700",
                                (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                  ?.inactivity_enabled
                                  ? "border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                                  : "border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5"
                              )}
                            >
                              <Zap
                                className={cn(
                                  "h-10 w-10 transition-all duration-700",
                                  (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                    ?.inactivity_enabled
                                    ? "scale-110 text-emerald-400"
                                    : "text-slate-300 dark:text-white/20"
                                )}
                              />
                            </div>
                            <div>
                              <h2 className="text-3xl leading-none font-black tracking-tight text-slate-900 uppercase dark:text-white">
                                Rescate Inteligente
                              </h2>
                              <p className="mt-2 text-[11px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                                Recuperación autónoma de prospectos inactivos
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              setVariantA((p) => ({
                                ...p,
                                automation_rules: {
                                  ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                  inactivity_enabled: !(
                                    p.automation_rules as unknown as AIAgentAutomationRules
                                  )?.inactivity_enabled,
                                },
                              }))
                            }
                            className={cn(
                              "group/btn flex h-16 items-center gap-4 rounded-[24px] px-10 text-[11px] font-black tracking-[0.2em] uppercase transition-all active:scale-95",
                              (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                ?.inactivity_enabled
                                ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30"
                                : "border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/20"
                            )}
                          >
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                  ?.inactivity_enabled
                                  ? "animate-ping bg-white"
                                  : "bg-slate-400"
                              )}
                            />
                            {(variantA.automation_rules as unknown as AIAgentAutomationRules)
                              ?.inactivity_enabled
                              ? "Sistema en Guardia"
                              : "Sistema Pausado"}
                          </button>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "grid grid-cols-1 gap-8 transition-all duration-700 lg:grid-cols-12",
                          !(variantA.automation_rules as unknown as AIAgentAutomationRules)
                            ?.inactivity_enabled &&
                            "pointer-events-none scale-[0.99] opacity-30 blur-[2px] grayscale"
                        )}
                      >
                        {/* CONFIG PANEL */}
                        <div className="space-y-8 lg:col-span-4">
                          <div className="space-y-8 rounded-[48px] border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                              <Terminal className="text-primary h-4 w-4" />
                              <h3 className="text-[10px] font-black tracking-widest text-slate-900 uppercase dark:text-white">
                                Parámetros de Ejecución
                              </h3>
                            </div>

                            <div className="space-y-6">
                              <div className="space-y-3">
                                <label className="ml-2 text-[9px] font-black tracking-widest text-slate-400 uppercase dark:text-white/40">
                                  Tiempo de Espera
                                </label>
                                <select
                                  title="Tiempo de espera"
                                  value={
                                    (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                      ?.inactivity_timeout || 30
                                  }
                                  onChange={(e) =>
                                    setVariantA((p) => ({
                                      ...p,
                                      automation_rules: {
                                        ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                        inactivity_timeout: parseInt(e.target.value),
                                      },
                                    }))
                                  }
                                  className="focus:ring-primary/20 h-14 w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-5 text-xs font-bold text-slate-900 transition-all outline-none focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white"
                                >
                                  <option value="10">10 minutos (Agresivo)</option>
                                  <option value="30">30 minutos (Estándar)</option>
                                  <option value="60">1 hora (Amable)</option>
                                  <option value="120">2 horas (Conservador)</option>
                                  <option value="1440">24 horas (Recordatorio)</option>
                                </select>
                              </div>

                              <div className="space-y-3">
                                <label className="ml-2 text-[9px] font-black tracking-widest text-slate-400 uppercase dark:text-white/40">
                                  Máximo de Reintentos
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3].map((n) => (
                                    <button
                                      key={n}
                                      onClick={() =>
                                        setVariantA((p) => ({
                                          ...p,
                                          automation_rules: {
                                            ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                            max_retries: n,
                                          },
                                        }))
                                      }
                                      className={cn(
                                        "h-12 rounded-xl border text-[10px] font-black transition-all",
                                        (
                                          variantA.automation_rules as unknown as AIAgentAutomationRules
                                        )?.max_retries === n
                                          ? "bg-primary border-primary shadow-primary/20 text-white shadow-lg"
                                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5"
                                      )}
                                    >
                                      {n} {n === 1 ? "VEZ" : "VECES"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-200 pt-8 dark:border-white/5">
                              <div className="text-primary flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-[9px] font-black tracking-widest uppercase">
                                  IA Engine v3.0 Active
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* MESSAGE PANEL */}
                        <div className="relative space-y-10 overflow-hidden rounded-[48px] border border-slate-200 bg-white p-10 shadow-sm lg:col-span-8 dark:border-white/5 dark:bg-white/[0.02]">
                          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/10 border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border">
                                <MessageSquareIcon className="text-primary h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black tracking-widest text-slate-900 uppercase dark:text-white">
                                  Lógica de Comunicación
                                </h3>
                                <p className="mt-1 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                                  Define el tono del mensaje de rescate
                                </p>
                              </div>
                            </div>

                            <div className="flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1.5 dark:border-white/10 dark:bg-black/20">
                              <button
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    automation_rules: {
                                      ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                      inactivity_ai_enabled: false,
                                    },
                                  }))
                                }
                                className={cn(
                                  "rounded-xl px-6 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all",
                                  !(variantA.automation_rules as unknown as AIAgentAutomationRules)
                                    ?.inactivity_ai_enabled
                                    ? "bg-white text-slate-900 shadow-xl dark:bg-white/10 dark:text-white"
                                    : "text-slate-400 hover:text-slate-600 dark:text-white/20 dark:hover:text-white/40"
                                )}
                              >
                                Manual
                              </button>
                              <button
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    automation_rules: {
                                      ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                      inactivity_ai_enabled: true,
                                    },
                                  }))
                                }
                                className={cn(
                                  "flex items-center gap-2 rounded-xl px-6 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all",
                                  (variantA.automation_rules as unknown as AIAgentAutomationRules)
                                    ?.inactivity_ai_enabled
                                    ? "text-primary bg-white shadow-xl dark:bg-white/10"
                                    : "text-slate-400 hover:text-slate-600 dark:text-white/20 dark:hover:text-white/40"
                                )}
                              >
                                <Sparkles className="h-3.5 w-3.5" /> IA Decide
                              </button>
                            </div>
                          </div>

                          <div className="relative min-h-[350px] overflow-hidden rounded-[40px] border border-slate-200 bg-slate-50 p-8 shadow-inner dark:border-white/10 dark:bg-black/20">
                            <AnimatePresence mode="wait">
                              {(variantA.automation_rules as unknown as AIAgentAutomationRules)
                                ?.inactivity_ai_enabled ? (
                                <motion.div
                                  key="ai-view"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="flex h-full flex-col items-center justify-center space-y-8 py-10 text-center"
                                >
                                  <div className="relative">
                                    <div className="bg-primary/20 absolute inset-0 animate-pulse rounded-full blur-[60px]" />
                                    <div className="bg-primary/10 border-primary/30 relative z-10 flex h-28 w-28 items-center justify-center rounded-[40px] border shadow-2xl">
                                      <Sparkles className="text-primary h-12 w-12 animate-pulse" />
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="text-xl font-black tracking-tight text-slate-900 uppercase dark:text-white">
                                      Orquestación Predictiva Activa
                                    </h4>
                                    <p className="mx-auto max-w-sm text-[11px] leading-relaxed font-bold tracking-widest text-slate-500 uppercase dark:text-white/40">
                                      Virginia analizará el historial y generará un mensaje
                                      hiper-personalizado para cada prospecto.
                                    </p>
                                  </div>
                                  <div className="bg-primary/10 border-primary/20 rounded-full border px-8 py-3">
                                    <span className="text-primary text-[10px] font-black tracking-[0.2em] uppercase">
                                      Tono: Persuasivo & Natural
                                    </span>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="manual-view"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="h-full"
                                >
                                  <textarea
                                    value={
                                      (
                                        variantA.automation_rules as unknown as AIAgentAutomationRules
                                      )?.inactivity_message || ""
                                    }
                                    onChange={(e) =>
                                      setVariantA((p) => ({
                                        ...p,
                                        automation_rules: {
                                          ...(p.automation_rules as unknown as AIAgentAutomationRules),
                                          inactivity_message: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-[300px] w-full resize-none bg-transparent text-sm leading-relaxed font-medium transition-all outline-none placeholder:text-slate-300 dark:placeholder:text-white/10"
                                    placeholder="Ej: Hola {{nombre}}, ¿sigues interesado en el Máster? He visto que te habías quedado con alguna duda..."
                                  />
                                  <div className="mt-4 flex items-center gap-3">
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[9px] font-black tracking-widest text-slate-400 uppercase dark:border-white/10 dark:bg-white/5">
                                      Usa {"{{nombre}}"} para personalizar
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "CRM" && (
                    <motion.div
                      key="CRM"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mx-auto max-w-6xl space-y-10 pb-20"
                    >
                      {/* 1. CONECTAR CRM */}
                      <div className="space-y-10 rounded-[56px] border border-slate-200 bg-white p-12 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-blue-500/20 bg-blue-500/10 shadow-2xl shadow-blue-500/10">
                              <DbIcon className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase dark:text-white">
                                Conectar CRM (Bridge)
                              </h3>
                              <p className="mt-1 text-[11px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                                Vincula tu base de datos externa para sincronización
                              </p>
                            </div>
                          </div>
                          <select
                            title="Proveedor de CRM"
                            value={String(
                              (variantA.crm_config as unknown as AIAgentCRMConfig)?.provider ||
                                "NONE"
                            )}
                            onChange={(e) =>
                              setVariantA((p) => ({
                                ...p,
                                crm_config: {
                                  ...(p.crm_config as unknown as AIAgentCRMConfig),
                                  provider: e.target.value,
                                },
                              }))
                            }
                            className="h-14 rounded-2xl border border-slate-200 bg-slate-100 px-8 text-xs font-black text-slate-700 uppercase outline-none dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                          >
                            <option value="NONE">Desconectado</option>
                            <option value="HUBSPOT">HubSpot CRM</option>
                            <option value="SALESFORCE">Salesforce</option>
                            <option value="ZOHO">Zoho CRM</option>
                            <option value="PIPEDRIVE">Pipedrive</option>
                            <option value="CUSTOM_WEBHOOK">Webhook Personalizado</option>
                          </select>
                        </div>

                        {(variantA.crm_config as unknown as AIAgentCRMConfig)?.provider !==
                          "NONE" && (
                          <div className="grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 md:grid-cols-2 dark:border-white/5">
                            <div className="space-y-3">
                              <label className="ml-4 text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-white/40">
                                API Key / Token
                              </label>
                              <input
                                type="password"
                                title="CRM API Key"
                                value={
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)?.api_key ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      api_key: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="••••••••••••••••"
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 text-sm font-bold text-slate-900 outline-none focus:border-blue-500/40 dark:border-white/10 dark:bg-black/40 dark:text-white"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="ml-4 text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-white/40">
                                Portal ID / Secret
                              </label>
                              <input
                                type="text"
                                title="CRM API Secret"
                                value={
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)
                                    ?.api_secret || ""
                                }
                                onChange={(e) =>
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      api_secret: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="ID del Portal"
                                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 text-sm font-bold text-slate-900 outline-none focus:border-blue-500/40 dark:border-white/10 dark:bg-black/40 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. MAPEADO DE CAMPOS */}
                      <div className="space-y-10 rounded-[56px] border border-slate-200 bg-white p-12 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-blue-500/20 bg-blue-500/10 shadow-2xl shadow-blue-500/10">
                              <Zap className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase dark:text-white">
                                Mapeado de Memoria
                              </h3>
                              <p className="mt-1 text-[11px] font-black tracking-widest text-slate-500 uppercase dark:text-white/40">
                                Define qué datos de la IA se inyectan en tu CRM
                              </p>
                            </div>
                          </div>
                          <button
                            title="Añadir nuevo atributo de mapeo"
                            onClick={() => {
                              const currentMapping =
                                (variantA.crm_config as unknown as AIAgentCRMConfig)
                                  ?.field_mapping || [];
                              setVariantA((p) => ({
                                ...p,
                                crm_config: {
                                  ...(p.crm_config as unknown as AIAgentCRMConfig),
                                  field_mapping: [...currentMapping, { tag: "", crm_key: "" }],
                                },
                              }));
                            }}
                            className="text-[9px] font-black text-blue-400 uppercase hover:underline"
                          >
                            + Añadir Atributo
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {(
                            (variantA.crm_config as unknown as AIAgentCRMConfig)?.field_mapping ||
                            []
                          ).map((m: { tag: string; crm_key: string }, idx: number) => (
                            <div
                              key={idx}
                              className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-4"
                            >
                              <div className="flex flex-1 items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[10px] font-black text-white/20">
                                  IA
                                </div>
                                <input
                                  title="Etiqueta de memoria"
                                  type="text"
                                  placeholder="MEMORIA_TAG"
                                  value={m.tag}
                                  onChange={(e) => {
                                    const newMapping = [
                                      ...((variantA.crm_config as unknown as AIAgentCRMConfig)
                                        ?.field_mapping || []),
                                    ];
                                    newMapping[idx].tag = e.target.value;
                                    setVariantA((p) => ({
                                      ...p,
                                      crm_config: {
                                        ...(p.crm_config as unknown as AIAgentCRMConfig),
                                        field_mapping: newMapping,
                                      },
                                    }));
                                  }}
                                  className="flex-1 border-b border-white/10 bg-transparent text-xs font-bold text-white outline-none"
                                />
                              </div>
                              <div className="h-px w-8 bg-white/10" />
                              <div className="flex flex-1 items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[10px] font-black text-blue-400/40">
                                  CRM
                                </div>
                                <input
                                  title="Llave del CRM"
                                  type="text"
                                  placeholder="field_api_name"
                                  value={m.crm_key}
                                  onChange={(e) => {
                                    const newMapping = [
                                      ...((variantA.crm_config as unknown as AIAgentCRMConfig)
                                        ?.field_mapping || []),
                                    ];
                                    newMapping[idx].crm_key = e.target.value;
                                    setVariantA((p) => ({
                                      ...p,
                                      crm_config: {
                                        ...(p.crm_config as unknown as AIAgentCRMConfig),
                                        field_mapping: newMapping,
                                      },
                                    }));
                                  }}
                                  className="flex-1 border-b border-white/10 bg-transparent text-xs font-bold text-white outline-none"
                                />
                              </div>
                              <button
                                title="Eliminar atributo"
                                onClick={() => {
                                  const newMapping = (
                                    (variantA.crm_config as unknown as AIAgentCRMConfig)
                                      ?.field_mapping || []
                                  ).filter((_: unknown, i: number) => i !== idx);
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      field_mapping: newMapping,
                                    },
                                  }));
                                }}
                                className="text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 4. SINCRONIZACIÓN Y DUPLICADOS */}
                      <div className="space-y-8 rounded-[56px] border border-white/5 bg-white/[0.02] p-12">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
                            <UserCheck className="h-6 w-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight uppercase">
                              Sincronización Inteligente
                            </h3>
                            <p className="mt-1 text-[10px] font-black tracking-widest text-white/40 uppercase">
                              Lógica para evitar duplicados y mantener integridad
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                          <div className="space-y-6 rounded-[32px] border border-white/5 bg-black/40 p-8">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-black tracking-tight uppercase">
                                  Evitar Duplicados
                                </h4>
                                <p className="text-[10px] font-medium text-white/20">
                                  No crear nuevos leads si el contacto ya existe
                                </p>
                              </div>
                              <button
                                title={
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)
                                    ?.prevent_duplicates
                                    ? "Permitir duplicados"
                                    : "Evitar duplicados"
                                }
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      prevent_duplicates: !(
                                        p.crm_config as unknown as AIAgentCRMConfig
                                      )?.prevent_duplicates,
                                    },
                                  }))
                                }
                                className={cn(
                                  "relative h-6 w-12 rounded-full transition-all",
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)
                                    ?.prevent_duplicates
                                    ? "bg-purple-500"
                                    : "bg-white/10"
                                )}
                              >
                                <div
                                  className={cn(
                                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
                                    (variantA.crm_config as unknown as AIAgentCRMConfig)
                                      ?.prevent_duplicates
                                      ? "right-1"
                                      : "left-1"
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-4 rounded-[32px] border border-white/5 bg-black/40 p-8">
                            <label className="text-[10px] font-black tracking-widest text-white/20 uppercase">
                              Criterio de Match (Unicidad)
                            </label>
                            <div className="flex gap-3">
                              <button
                                title="Sincronizar por Email"
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      match_by: "EMAIL",
                                    },
                                  }))
                                }
                                className={cn(
                                  "h-12 flex-1 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all",
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)?.match_by ===
                                    "EMAIL"
                                    ? "border-purple-500 bg-purple-500/20 text-purple-400"
                                    : "border-white/10 bg-white/5 text-white/20"
                                )}
                              >
                                Email
                              </button>
                              <button
                                title="Sincronizar por Teléfono"
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      match_by: "PHONE",
                                    },
                                  }))
                                }
                                className={cn(
                                  "h-12 flex-1 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all",
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)?.match_by ===
                                    "PHONE"
                                    ? "border-purple-500 bg-purple-500/20 text-purple-400"
                                    : "border-white/10 bg-white/5 text-white/20"
                                )}
                              >
                                Teléfono
                              </button>
                              <button
                                title="Sincronizar por Ambos"
                                onClick={() =>
                                  setVariantA((p) => ({
                                    ...p,
                                    crm_config: {
                                      ...(p.crm_config as unknown as AIAgentCRMConfig),
                                      match_by: "BOTH",
                                    },
                                  }))
                                }
                                className={cn(
                                  "h-12 flex-1 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all",
                                  (variantA.crm_config as unknown as AIAgentCRMConfig)?.match_by ===
                                    "BOTH"
                                    ? "border-purple-500 bg-purple-500/20 text-purple-400"
                                    : "border-white/10 bg-white/5 text-white/20"
                                )}
                              >
                                Ambos
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Live Simulator */}
        <AnimatePresence>
          {isSimulatorOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSimulatorOpen(false)}
                className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="absolute top-0 right-0 bottom-0 z-50 flex w-[500px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 p-8 dark:border-white/5 dark:bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border">
                      <Terminal className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase dark:text-white">
                        Simulador Vivo
                      </h3>
                      <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/20">
                        Prueba el Cerebro en Tiempo Real
                      </p>
                    </div>
                  </div>
                  <button
                    title="Cerrar Simulador"
                    onClick={() => setIsSimulatorOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-white/20 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/5 flex-1 space-y-6 overflow-y-auto p-8">
                  <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
                    <p className="text-primary text-[10px] font-black tracking-widest uppercase">
                      Orquestación Log:
                    </p>
                    <div className="space-y-2">
                      {simLogs.length === 0 ? (
                        <>
                          <LogItem status="success" label="ADN del Agente Cargado" />
                          <LogItem status="success" label="Round Robin Activo (2 Asesores)" />
                          <LogItem status="pending" label="Esperando Interacción..." />
                        </>
                      ) : (
                        simLogs.map((log, i) => (
                          <LogItem key={i} status={log.status} label={log.label} />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-[20px] rounded-tl-none border border-slate-200 bg-slate-100 p-4 text-sm text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                        ¡Hola! Estoy configurado con tu nuevo ADN. ¿Qué quieres probar primero?
                      </div>
                    </div>
                    {simHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-[20px] p-4 text-sm shadow-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "rounded-tl-none border border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isSimLoading && (
                      <div className="flex animate-pulse justify-start">
                        <div className="flex h-10 w-24 items-center justify-center rounded-[20px] rounded-tl-none border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                          <div className="flex gap-1">
                            <div className="h-1 w-1 animate-bounce rounded-full bg-slate-400 dark:bg-white/40" />
                            <div className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s] dark:bg-white/40" />
                            <div className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s] dark:bg-white/40" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {Object.keys(simVariables).length > 0 && (
                    <div className="mt-8 space-y-3 rounded-[24px] border border-emerald-500/20 bg-emerald-500/5 p-6">
                      <p className="text-[9px] font-black tracking-[0.2em] text-emerald-400 uppercase">
                        Memoria Extraída (Facts):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(simVariables).map(([key, val]) => (
                          <div
                            key={key}
                            className="flex flex-col rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5"
                          >
                            <span className="text-[8px] font-black text-emerald-400/60 uppercase">
                              {key}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">
                              {String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 bg-slate-50/50 p-8 dark:border-white/5 dark:bg-black/40">
                  <div className="relative">
                    <input
                      title="Mensaje de prueba"
                      type="text"
                      placeholder="Escribe un mensaje de prueba..."
                      value={simInput}
                      onChange={(e) => setSimInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSimSend()}
                      disabled={isSimLoading}
                      className="focus:border-primary/40 h-14 w-full rounded-2xl border border-slate-200 bg-white px-6 pr-16 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <button
                      title="Enviar mensaje de prueba"
                      onClick={handleSimSend}
                      disabled={isSimLoading || !simInput.trim()}
                      className="bg-primary text-primary-foreground shadow-primary/20 absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
                    >
                      {isSimLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-4 text-center text-[9px] font-black tracking-widest text-slate-500 uppercase dark:text-white/20">
                    La IA analizará este mensaje usando el ADN actual
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl space-y-10 rounded-[48px] border border-white/5 bg-slate-900 p-12 shadow-2xl"
            >
              <h3 className="text-3xl font-black tracking-tight uppercase">Nuevo Maestro</h3>
              <div className="space-y-6">
                <input
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Nombre del Agente"
                  className="focus:border-primary/40 h-16 w-full rounded-[20px] border border-white/10 bg-white/[0.02] px-8 text-lg font-bold text-white outline-none"
                />
                <textarea
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="¿Cuál es su propósito?"
                  rows={3}
                  className="w-full resize-none rounded-[20px] border border-white/10 bg-white/[0.02] p-8 text-sm font-medium text-white/60 outline-none"
                />
              </div>
              <div className="flex gap-4">
                <button
                  title="Cancelar creación"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-16 flex-1 rounded-[20px] border border-white/10 bg-white/5 text-[11px] font-black tracking-widest uppercase transition-all hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  title="Confirmar creación de agente"
                  onClick={handleCreateAgent}
                  disabled={saving || !newAgentName.trim()}
                  className="bg-primary text-primary-foreground shadow-primary/20 h-16 flex-1 rounded-[20px] text-[11px] font-black tracking-widest uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? "Configurando..." : "Crear Ahora"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-xl space-y-10 rounded-[48px] border border-white/5 bg-slate-900 p-12 shadow-2xl"
            >
              <h3 className="text-3xl font-black tracking-tight uppercase">Editar Maestro</h3>
              <div className="space-y-6">
                <input
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Nombre del Agente"
                  className="focus:border-primary/40 h-16 w-full rounded-[20px] border border-white/10 bg-white/[0.02] px-8 text-lg font-bold text-white outline-none"
                />
                <textarea
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="¿Cuál es su propósito?"
                  rows={3}
                  className="w-full resize-none rounded-[20px] border border-white/10 bg-white/[0.02] p-8 text-sm font-medium text-white/60 outline-none"
                />
              </div>
              <div className="flex gap-4">
                <button
                  title="Cancelar edición"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-16 flex-1 rounded-[20px] border border-white/10 bg-white/5 text-[11px] font-black tracking-widest uppercase transition-all hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  title="Guardar cambios del agente"
                  onClick={handleUpdateAgent}
                  disabled={saving || !newAgentName.trim()}
                  className="bg-primary text-primary-foreground shadow-primary/20 h-16 flex-1 rounded-[20px] text-[11px] font-black tracking-widest uppercase shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? "Actualizando..." : "Guardar Cambios"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md space-y-8 rounded-[48px] border border-white/5 bg-slate-900 p-12 text-center shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-500">
                <Trash2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black tracking-tight uppercase">¿Eliminar Agente?</h3>
              <p className="text-sm font-medium text-white/40">
                Esta acción es irreversible y borrará toda la configuración de este Maestro.
              </p>
              <div className="flex gap-4 pt-4">
                <button
                  title="Cancelar eliminación"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  title="Confirmar eliminación permanente"
                  onClick={handleDeleteAgent}
                  disabled={saving}
                  className="h-14 flex-1 rounded-2xl bg-red-500 text-[10px] font-black tracking-widest text-white uppercase shadow-2xl shadow-red-500/20 transition-all hover:scale-[1.02] hover:bg-red-600 active:scale-[0.98]"
                >
                  {saving ? "Borrando..." : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-8 py-5 text-[10px] font-black tracking-[0.2em] uppercase transition-all",
        active ? "text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" : "text-slate-400 hover:text-slate-200"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-all",
          active ? "text-[#00e5ff] scale-110 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]" : "text-slate-400"
        )}
      />{" "}
      {label}
      {active && (
        <motion.div
          layoutId="tabUnderline"
          className="absolute right-4 bottom-0 left-4 h-0.5 rounded-t-full bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.9)]"
        />
      )}
    </button>
  );
}

function ModelCard({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <div className="group relative">
      <button
        title={`Seleccionar modelo ${label}`}
        onClick={onClick}
        className={cn(
          "relative flex h-14 w-full items-center overflow-hidden rounded-2xl border px-6 text-left shadow-sm transition-all",
          active
            ? "border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.12)] text-[#00e5ff] shadow-[0_0_18px_rgba(0,229,255,0.2)]"
            : "border-[rgba(255,255,255,0.06)] bg-[rgba(6,10,25,0.6)] text-slate-400 hover:border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.04)] hover:text-slate-200 backdrop-blur-md"
        )}
      >
        <div className="flex w-full items-center gap-3">
          <div
            className={cn(
              "h-2 w-2 shrink-0 rounded-full transition-all",
              active
                ? "bg-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.9)]"
                : "bg-slate-600"
            )}
          />
          <span
            className={cn(
              "truncate text-[10px] font-black tracking-tight uppercase",
              active
                ? "text-[#00e5ff]"
                : "text-slate-400 group-hover:text-slate-200"
            )}
          >
            {label}
          </span>
        </div>
        {active && <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.8)]" />}
      </button>
      {/* Floating Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-48 -translate-x-1/2 translate-y-2 rounded-2xl border border-[rgba(0,229,255,0.2)] bg-[rgba(4,8,20,0.95)] p-4 opacity-0 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-center text-[10px] leading-relaxed font-bold tracking-wider text-white uppercase">
          {desc}
        </p>
        <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-r border-b border-[rgba(0,229,255,0.2)] bg-[rgba(4,8,20,0.95)]" />
      </div>
    </div>
  );
}

function LogItem({ status, label }: { status: "success" | "pending" | "error"; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {status === "success" ? (
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      ) : (
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
      )}
      <span
        className={cn(
          "text-[9px] font-black tracking-widest uppercase",
          status === "success"
            ? "text-slate-600 dark:text-white/60"
            : "text-slate-400 dark:text-white/20"
        )}
      >
        {label}
      </span>
    </div>
  );
}
