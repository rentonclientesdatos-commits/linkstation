"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  LeadTriggerNode,
  ActionNode,
  DelayNode,
  LLMNode,
  APINode,
  SubWorkflowNode,
  WebhookNode,
  WebhookResponseNode,
  WebhookWaitNode,
  TimeConditionNode,
  VoiceCallNode,
  TextAgentNode,
  WhatsAppNode,
  EndNode,
  ConditionNode,
  RetrySequenceNode,
  PdfGeneratorNode,
  UltravoxTriggerNode,
} from "./nodes/TriggerNodes";
import { NodeConfigSidebar } from "./NodeConfigSidebar";
import {
  Save,
  Rocket,
  Trash2,
  Phone,
  MessageSquare,
  BrainCircuit,
  Globe,
  Clock,
  GitBranchPlus,
  Webhook,
  Reply,
  Hourglass,
  Timer,
  Bot,
  CheckCircle2,
  MessageCircle,
  ArrowRightLeft,
  FileDown,
  Sparkles,
  Zap,
  ChevronDown,
  Activity,
  Layers,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

// â”€â”€â”€ NODE TYPES REGISTRY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const nodeTypes = {
  // New specialized nodes
  ultravoxTrigger: UltravoxTriggerNode,
  timeCondition: TimeConditionNode,
  voiceCall: VoiceCallNode,
  textAgent: TextAgentNode,
  whatsapp: WhatsAppNode,
  condition: ConditionNode,
  retrySequence: RetrySequenceNode,
  pdfGenerator: PdfGeneratorNode,
  flow_pdf_generator: PdfGeneratorNode,
  end: EndNode,
  // Legacy / generic nodes (keep backward compat)
  leadTrigger: LeadTriggerNode,
  webhookTrigger: WebhookNode,
  inboundWhatsApp: LeadTriggerNode,
  action: ActionNode,
  delay: DelayNode,
  llm: LLMNode,
  api: APINode,
  subWorkflow: SubWorkflowNode,
  webhookResponse: WebhookResponseNode,
  webhookWait: WebhookWaitNode,
};

// ─── MINIMAL FLOW: Only the Entry Lead trigger
const createMinimalNodes = (): Node[] => [
  {
    id: "trigger-1",
    type: "leadTrigger",
    position: { x: 400, y: 100 },
    data: { label: "Entry Lead" },
  },
];

// ─── NODE MENU CONFIG ────────────────────────────────────────────────────────
interface NodeMenuItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  bgColor: string;
  data?: Record<string, unknown>;
}
interface NodeMenuGroup {
  section: string;
  categoryIcon: React.ReactNode;
  items: NodeMenuItem[];
}

const NODE_MENU: NodeMenuGroup[] = [
  {
    section: "Disparadores",
    categoryIcon: <Zap className="h-3.5 w-3.5 text-amber-400" />,
    items: [
      { type: "leadTrigger", label: "Entry Lead (CRM)", icon: <Globe className="h-3.5 w-3.5" />, accentColor: "#f97316", bgColor: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40" },
      { type: "ultravoxTrigger", label: "Ultravox Voice", icon: <Phone className="h-3.5 w-3.5" />, accentColor: "#8b5cf6", bgColor: "bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40", data: { config: { tool_name: "capturarDatosCotizacion", agent_name: "Asistente Voz Ultravox" } } },
      { type: "webhookTrigger", label: "Webhook (Generico)", icon: <Webhook className="h-3.5 w-3.5" />, accentColor: "#f97316", bgColor: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40" },
      { type: "inboundWhatsApp", label: "WhatsApp Entrante", icon: <MessageCircle className="h-3.5 w-3.5" />, accentColor: "#10b981", bgColor: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40" },
    ],
  },
  {
    section: "Logica",
    categoryIcon: <GitBranchPlus className="h-3.5 w-3.5 text-indigo-400" />,
    items: [
      { type: "timeCondition", label: "Condicion Horaria", icon: <Timer className="h-3.5 w-3.5" />, accentColor: "#eab308", bgColor: "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/40", data: { config: { start: "09:00", end: "20:00", working_days: [1, 2, 3, 4, 5] } } },
      { type: "retrySequence", label: "Bucle Reintentos", icon: <ArrowRightLeft className="h-3.5 w-3.5" />, accentColor: "#f97316", bgColor: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40", data: { config: { maxAttempts: 5, retryDelayHours: 27, channels: ["call", "whatsapp"] } } },
      { type: "condition", label: "IF / ELSE", icon: <GitBranchPlus className="h-3.5 w-3.5" />, accentColor: "#6366f1", bgColor: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40" },
      { type: "delay", label: "Espera (Wait)", icon: <Clock className="h-3.5 w-3.5" />, accentColor: "#f59e0b", bgColor: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40", data: { config: { duration: 2 } } },
    ],
  },
  {
    section: "Canales",
    categoryIcon: <Phone className="h-3.5 w-3.5 text-blue-400" />,
    items: [
      { type: "voiceCall", label: "Llamada IA (Voz)", icon: <Phone className="h-3.5 w-3.5" />, accentColor: "#3b82f6", bgColor: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40", data: { config: { provider: "retell" } } },
      { type: "whatsapp", label: "WhatsApp Template", icon: <MessageSquare className="h-3.5 w-3.5" />, accentColor: "#10b981", bgColor: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40" },
      { type: "textAgent", label: "Agente de Texto IA", icon: <Bot className="h-3.5 w-3.5" />, accentColor: "#a855f7", bgColor: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40" },
    ],
  },
  {
    section: "IA & APIs",
    categoryIcon: <BrainCircuit className="h-3.5 w-3.5 text-fuchsia-400" />,
    items: [
      { type: "llm", label: "LLM / Razonamiento", icon: <BrainCircuit className="h-3.5 w-3.5" />, accentColor: "#d946ef", bgColor: "bg-fuchsia-500/10 border-fuchsia-500/20 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/40" },
      { type: "api", label: "API / CRM", icon: <Globe className="h-3.5 w-3.5" />, accentColor: "#06b6d4", bgColor: "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40" },
    ],
  },
  {
    section: "Extras",
    categoryIcon: <Layers className="h-3.5 w-3.5 text-pink-400" />,
    items: [
      { type: "subWorkflow", label: "Sub-Workflow", icon: <GitBranchPlus className="h-3.5 w-3.5" />, accentColor: "#ec4899", bgColor: "bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20 hover:border-pink-500/40" },
      { type: "webhookResponse", label: "Webhook Respuesta", icon: <Reply className="h-3.5 w-3.5" />, accentColor: "#6366f1", bgColor: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40" },
      { type: "webhookWait", label: "Webhook Espera", icon: <Hourglass className="h-3.5 w-3.5" />, accentColor: "#ec4899", bgColor: "bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20 hover:border-pink-500/40" },
      { type: "pdfGenerator", label: "Crear PDF", icon: <FileDown className="h-3.5 w-3.5" />, accentColor: "#f43f5e", bgColor: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40", data: { config: { pdf_template_name: "Cotizacion Gruas", pdf_output_variable: "pdf_url", pdf_filename: "cotizacion.pdf", pdf_paper_size: "Letter" } } },
      { type: "end", label: "Fin de Flujo", icon: <CheckCircle2 className="h-3.5 w-3.5" />, accentColor: "#6b7280", bgColor: "bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/20 hover:border-gray-500/40" },
    ],
  },
];

// â”€â”€â”€ COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function SequenceCanvas({ tenantId, workflowId }: { tenantId: string; workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(createMinimalNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { setViewport } = useReactFlow();

  // Close category dropdown when clicking outside the toolbar
  useEffect(() => {
    if (activeCategory === null) return;
    const handleOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as globalThis.Node)) {
        setActiveCategory(null);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [activeCategory]);

  // Load existing graph for this workflow
  useEffect(() => {
    async function loadGraph() {
      try {
        const res = await fetch(`/api/orchestration/graph?workflowId=${workflowId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.graph_data && data.graph_data.nodes && data.graph_data.nodes.length > 0) {
            setNodes(data.graph_data.nodes || []);
            setEdges(data.graph_data.edges || []);
            if (data.graph_data.viewport) setViewport(data.graph_data.viewport);
          } else {
            // No saved graph: start with minimal entry node
            setNodes(createMinimalNodes());
            setEdges([]);
          }
        }
      } catch (error) {
        console.error("Failed to load graph:", error);
      }
    }
    if (workflowId) loadGraph();
  }, [workflowId, setNodes, setEdges, setViewport]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onPublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch("/api/orchestration/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, workflowId, graphData: { nodes, edges } }),
      });
      if (res.ok) {
        toast({ variant: "success", title: "Secuencia publicada" });
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Publish failed:", err.error);
        toast({
          variant: "error",
          title: "Error al publicar",
          description: err.error || "Error desconocido",
        });
      }
    } catch (error) {
      console.error("Error publishing:", error);
      toast({
        variant: "error",
        title: "Error de red",
        description: "No se pudo publicar la secuencia.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setActiveCategory(null);
  }, []);

  const onConfigSave = (newConfig: Record<string, unknown>) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, config: newConfig } } : node
      )
    );
    setSelectedNode(null);
  };

  const loadUltravoxQuotationFlow = () => {
    const newNodes: Node[] = [
      {
        id: "node-ultravox-trigger",
        type: "ultravoxTrigger",
        position: { x: 350, y: 80 },
        data: {
          label: "Llamada Ultravox: Captura",
          config: {
            tool_name: "capturarDatosCotizacion",
            agent_name: "Asistente de Voz Ultravox",
          },
        },
      },
      {
        id: "node-pdf-generator",
        type: "pdfGenerator",
        position: { x: 350, y: 250 },
        data: {
          label: "Crear PDF (Cotizacion)",
          config: {
            pdf_template_name: "Cotizacion Repuestos y Maquinaria",
            pdf_filename: "Cotizacion.pdf",
            pdf_output_variable: "pdf_url",
            pdf_paper_size: "Letter",
          },
        },
      },
      {
        id: "node-whatsapp-sender",
        type: "whatsapp",
        position: { x: 350, y: 420 },
        data: {
          label: "Enviar PDF por WhatsApp",
          config: {
            send_pdf: true,
            caption: "Hola {{lead.nombre}}, aqui tienes el PDF con tu cotizacion.",
            templateId: "",
          },
        },
      },
    ];

    const newEdges: Edge[] = [
      {
        id: "edge-trigger-to-pdf",
        source: "node-ultravox-trigger",
        target: "node-pdf-generator",
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
      },
      {
        id: "edge-pdf-to-whatsapp",
        source: "node-pdf-generator",
        target: "node-whatsapp-sender",
        animated: true,
        style: { stroke: "#10b981", strokeWidth: 2 },
      },
    ];

    setNodes(newNodes);
    setEdges(newEdges);
    toast({
      title: "Flujo Cargado con Exito",
      description: "Llamada Ultravox -> Crear PDF -> Enviar por WhatsApp",
      variant: "success",
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addNode = (type: string, extraData?: any) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: type, config: {}, ...(extraData || {}) },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const deleteSelected = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
      );
      setSelectedNode(null);
    } else if (selectedEdge) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  };

  const onDeploy = async () => {
    setIsPublishing(true);
    try {
      // First save it
      await onPublish();

      // Then call deploy specifically to activate it
      const res = await fetch("/api/orchestration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, workflowId, status: "ACTIVE" }),
      });

      if (res.ok) {
        toast({ variant: "success", title: "Workflow desplegado y activo" });
      } else {
        toast({
          variant: "warning",
          title: "Flujo guardado pero no activado",
          description: "El flujo se guardo pero hubo un error al activarlo.",
        });
      }
    } catch (error) {
      console.error("Error deploying:", error);
      toast({ variant: "error", title: "Error critico en el despliegue" });
    } finally {
      setIsPublishing(false);
    }
  };

  const hasSelection = !!(selectedNode || selectedEdge);

  return (
    <div className="relative h-full w-full flex-1 overflow-hidden">

      {/* â”€â”€ Ambient glow layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-80 w-80 rounded-full bg-violet-600/6 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-60 w-60 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* â”€â”€ Dynamic Island Toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        ref={toolbarRef}
        className="absolute top-4 left-1/2 z-50 -translate-x-1/2"
      >
        <div
          className="flex items-center gap-1 rounded-[20px] border border-white/[0.07] bg-[#0c0c0f]/90 p-1.5 shadow-2xl backdrop-blur-2xl"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 12px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          {/* Brand icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-500/25">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>

          <div className="mx-1 h-4 w-px bg-white/[0.07]" />

          {/* Save draft */}
          <button
            disabled={isPublishing}
            onClick={onPublish}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/70",
              isPublishing && "cursor-wait opacity-50"
            )}
            title="Guardar borrador"
          >
            <Save className={cn("h-3.5 w-3.5", isPublishing && "animate-spin")} />
            Guardar
          </button>

          <div className="mx-1 h-4 w-px bg-white/[0.07]" />

          {/* Node category pills */}
          <div className="flex items-center gap-0.5">
            {NODE_MENU.map((group, idx) => (
              <div key={group.section} className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory(activeCategory === idx ? null : idx);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[11px] px-2.5 py-1.5 text-[11px] font-black transition-all duration-200",
                    activeCategory === idx
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:bg-white/[0.05] hover:text-white/60"
                  )}
                >
                  <span className="flex items-center">{group.categoryIcon}</span>
                  <span className="hidden text-[10px] font-black uppercase tracking-wide sm:block">{group.section}</span>
                  <ChevronDown
                    className={cn(
                      "h-2.5 w-2.5 transition-transform duration-200",
                      activeCategory === idx && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown panel */}
                {activeCategory === idx && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-1/2 z-[200] mt-2 w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c0f]/98 shadow-2xl backdrop-blur-2xl"
                    style={{
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.7)",
                      animation: "dyn-island-drop 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards",
                    }}
                  >
                    <div className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-2.5">
                      {group.categoryIcon}
                      <p className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                        {group.section}
                      </p>
                    </div>
                    <div className="space-y-0.5 p-1.5">
                      {group.items.map((item) => (
                        <button
                          key={item.type}
                          onClick={() => {
                            addNode(item.type, item.data as Record<string, unknown>);
                            setActiveCategory(null);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition-all",
                            item.bgColor
                          )}
                          style={{ color: item.accentColor }}
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: `${item.accentColor}1a` }}
                          >
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mx-1 h-4 w-px bg-white/[0.07]" />

          {/* Delete */}
          <button
            onClick={deleteSelected}
            disabled={!hasSelection}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all",
              hasSelection
                ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                : "cursor-not-allowed text-white/10"
            )}
            title="Eliminar seleccionado"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-4 w-px bg-white/[0.07]" />

          {/* Template loader */}
          <button
            onClick={loadUltravoxQuotationFlow}
            className="flex items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-violet-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/20 active:scale-95"
            title="Plantilla: Ultravox -> PDF -> WhatsApp"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Plantilla
          </button>

          <div className="mx-1 h-4 w-px bg-white/[0.07]" />

          {/* Deploy CTA */}
          <button
            onClick={onDeploy}
            disabled={isPublishing}
            className={cn(
              "flex items-center gap-1.5 rounded-[11px] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all",
              "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:scale-105 active:scale-95",
              isPublishing && "cursor-wait opacity-70"
            )}
          >
            <Rocket className={cn("h-3.5 w-3.5", isPublishing && "animate-pulse")} />
            {isPublishing ? "..." : "Deploy"}
          </button>
        </div>

        {/* Selection info pill — appears below toolbar */}
        {hasSelection && (
          <div className="mt-2 flex justify-center">
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-[#0c0c0f]/90 px-3 py-1.5 text-[10px] font-bold text-indigo-300 backdrop-blur-xl shadow-lg">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
              {selectedNode ? `${selectedNode.type}` : "Conexión"} seleccionado
              <button
                onClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
                className="ml-1 rounded-md p-0.5 opacity-60 hover:bg-indigo-500/20 hover:opacity-100 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── React Flow Canvas ────────────────────────────────────────────── */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        className="bg-[#070709]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={32}
          size={1}
          color="#18182a"
          className="opacity-90"
        />
        <Controls
          className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0c0f]/80 fill-white/40 backdrop-blur-xl"
          showInteractive={false}
        />
        <MiniMap
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0f]/80 shadow-2xl backdrop-blur-xl"
          nodeColor={(n: Node) => {
            if (n.type === "ultravoxTrigger") return "#8b5cf6";
            if (n.type === "leadTrigger") return "#f97316";
            if (n.type === "timeCondition") return "#eab308";
            if (n.type === "voiceCall") return "#3b82f6";
            if (n.type === "textAgent") return "#a855f7";
            if (n.type === "whatsapp") return "#10b981";
            if (n.type === "action") return "#3b82f6";
            if (n.type === "delay") return "#f59e0b";
            if (n.type === "llm") return "#a855f7";
            if (n.type === "api") return "#06b6d4";
            if (n.type === "pdfGenerator" || n.type === "flow_pdf_generator") return "#f43f5e";
            if (n.type === "end") return "#374151";
            return "#fff";
          }}
          maskColor="rgba(7, 7, 9, 0.85)"
        />
      </ReactFlow>

      {/* ─── Node Configuration Sidebar ───────────────────────────────────── */}
      {selectedNode && (
        <NodeConfigSidebar
          key={selectedNode.id}
          node={selectedNode}
          workflowId={workflowId}
          onSave={onConfigSave}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* ─── Status HUD (bottom-right) ────────────────────────────────────── */}
      <div className="pointer-events-none absolute right-4 bottom-4 z-50">
        <div
          className="space-y-2 rounded-2xl border border-white/[0.05] bg-[#0c0c0f]/75 p-3.5 backdrop-blur-xl"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-white/20" />
            <p className="text-[9px] font-black tracking-widest text-white/20 uppercase">Flow Engine</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />
            <p className="text-[11px] font-bold text-emerald-400">Operational v2</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="h-3 w-3 text-white/15" />
            <p className="font-mono text-[9px] text-white/20">
              {nodes.length}n • {edges.length}e
            </p>
          </div>
        </div>
      </div>

      {/* â”€â”€ Dynamic Island keyframe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <style>{`
        @keyframes dyn-island-drop {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
