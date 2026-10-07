"use client";

import React, { useCallback, useState, useEffect } from "react";
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
} from "./nodes/TriggerNodes";
import { NodeConfigSidebar } from "./NodeConfigSidebar";
import {
  Save,
  Plus,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

// ─── NODE TYPES REGISTRY ─────────────────────────────────────────
const nodeTypes = {
  // New specialized nodes
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

// ─── NODE MENU CONFIG ─────────────────────────────────────────────
const NODE_MENU = [
  {
    section: "🚀 Disparadores",
    items: [
      {
        type: "leadTrigger",
        label: "Entry Lead (CRM / Webhook)",
        icon: <Globe className="h-4 w-4" />,
        color: "text-orange-400 hover:bg-orange-500/20",
      },
      {
        type: "webhookTrigger",
        label: "Webhook (Genérico)",
        icon: <Webhook className="h-4 w-4" />,
        color: "text-orange-500 hover:bg-orange-600/20",
      },
      {
        type: "inboundWhatsApp",
        label: "Mensaje Entrante (WhatsApp)",
        icon: <MessageCircle className="h-4 w-4" />,
        color: "text-emerald-400 hover:bg-emerald-500/20",
      },
    ],
  },
  {
    section: "⚙️ Lógica de Sistema",
    items: [
      {
        type: "timeCondition",
        label: "Condición Horaria",
        icon: <Timer className="h-4 w-4" />,
        color: "text-yellow-400 hover:bg-yellow-500/20",
        data: { config: { start: "09:00", end: "20:00", working_days: [1, 2, 3, 4, 5] } },
      },
      {
        type: "retrySequence",
        label: "Bucle de Reintentos",
        icon: <ArrowRightLeft className="h-4 w-4" />,
        color: "text-orange-400 hover:bg-orange-500/20",
        data: { config: { maxAttempts: 5, retryDelayHours: 27, channels: ["call", "whatsapp"] } },
      },
      {
        type: "condition",
        label: "Condición (IF/ELSE)",
        icon: <GitBranchPlus className="h-4 w-4" />,
        color: "text-indigo-400 hover:bg-indigo-500/20",
      },
      {
        type: "delay",
        label: "Espera (Wait)",
        icon: <Clock className="h-4 w-4" />,
        color: "text-amber-400 hover:bg-amber-500/20",
        data: { config: { duration: 2 } },
      },
    ],
  },
  {
    section: "📞 Canales de Contacto",
    items: [
      {
        type: "voiceCall",
        label: "Llamada IA (Voz)",
        icon: <Phone className="h-4 w-4" />,
        color: "text-blue-400 hover:bg-blue-500/20",
        data: { config: { provider: "retell" } },
      },
      {
        type: "whatsapp",
        label: "WhatsApp Template",
        icon: <MessageSquare className="h-4 w-4" />,
        color: "text-emerald-400 hover:bg-emerald-500/20",
      },
      {
        type: "textAgent",
        label: "Agente de Texto IA",
        icon: <Bot className="h-4 w-4" />,
        color: "text-purple-400 hover:bg-purple-500/20",
      },
    ],
  },
  {
    section: "🧠 Inteligencia",
    items: [
      {
        type: "llm",
        label: "LLM / Razonamiento",
        icon: <BrainCircuit className="h-4 w-4" />,
        color: "text-fuchsia-400 hover:bg-fuchsia-500/20",
      },
      {
        type: "api",
        label: "Petición API / CRM",
        icon: <Globe className="h-4 w-4" />,
        color: "text-cyan-400 hover:bg-cyan-500/20",
      },
    ],
  },
  {
    section: "🔗 Integración Avanzada",
    items: [
      {
        type: "subWorkflow",
        label: "Sub-Workflow",
        icon: <GitBranchPlus className="h-4 w-4" />,
        color: "text-pink-400 hover:bg-pink-500/20",
      },
      {
        type: "webhookResponse",
        label: "Webhook Respuesta",
        icon: <Reply className="h-4 w-4" />,
        color: "text-indigo-400 hover:bg-indigo-500/20",
      },
      {
        type: "webhookWait",
        label: "Webhook Espera",
        icon: <Hourglass className="h-4 w-4" />,
        color: "text-pink-500 hover:bg-pink-600/20",
      },
    ],
  },
  {
    section: "📄 Documentos & PDF",
    items: [
      {
        type: "pdfGenerator",
        label: "Crear PDF (Cotización)",
        icon: <FileDown className="h-4 w-4" />,
        color: "text-rose-400 hover:bg-rose-500/20",
        data: {
          config: {
            pdf_template_name: "Cotización Grúas",
            pdf_output_variable: "pdf_url",
            pdf_filename: "cotizacion.pdf",
            pdf_paper_size: "Letter",
            pdf_variables: JSON.stringify(
              {
                cliente: "{{lead.nombre}}",
                telefono: "{{lead.telefono}}",
                items: "{{items}}",
                total: "{{total}}",
                fecha: "{{fecha}}",
              },
              null,
              2
            ),
            pdf_html_template: `<!DOCTYPE html>
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
</html>`,
          },
        },
      },
    ],
  },
  {
    section: "🏁 Finalización",
    items: [
      {
        type: "end",
        label: "Fin de Flujo",
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: "text-gray-400 hover:bg-gray-500/20",
      },
    ],
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────
export function SequenceCanvas({ tenantId, workflowId }: { tenantId: string; workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(createMinimalNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const { setViewport } = useReactFlow();

  // Close menu when clicking outside
  useEffect(() => {
    if (!isAddMenuOpen) return;
    const handleClickOutside = () => setIsAddMenuOpen(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [isAddMenuOpen]);

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
          description: "El flujo se guardó pero hubo un error al activarlo.",
        });
      }
    } catch (error) {
      console.error("Error deploying:", error);
      toast({ variant: "error", title: "Error crítico en el despliegue" });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="group relative h-full w-full flex-1">
      {/* ── Canvas Toolbar ─────────────────────────────────────── */}
      <div className="absolute top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-black/80 p-2 opacity-40 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:opacity-100">
        <button
          disabled={isPublishing}
          onClick={onPublish}
          className={cn(
            "flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-white/60 transition-all hover:bg-white/10 hover:text-white",
            isPublishing && "cursor-not-allowed opacity-50"
          )}
        >
          <Save className={cn("h-4 w-4", isPublishing && "animate-spin")} />
          {isPublishing ? "Guardando..." : "Guardar Borrador"}
        </button>

        <div className="mx-1 h-4 w-px bg-white/10" />

        {/* Add node menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAddMenuOpen(!isAddMenuOpen);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
              isAddMenuOpen
                ? "bg-primary text-primary-foreground"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Plus className="h-4 w-4" />
            Agregar Nodo
          </button>

          {/* Dropdown */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute top-full left-0 z-[100] mt-2 max-h-[70vh] w-56 origin-top-left overflow-auto rounded-2xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-2xl transition-all",
              isAddMenuOpen
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            )}
          >
            {NODE_MENU.map((group) => (
              <div key={group.section}>
                <p className="sticky top-0 border-b border-white/5 bg-black/95 px-3 py-2 text-[9px] font-black tracking-widest text-white/20 uppercase backdrop-blur-xl">
                  {group.section}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      addNode(item.type, item.data);
                      setIsAddMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-bold text-white/50 transition-colors",
                      item.color
                    )}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={deleteSelected}
          className={cn(
            "rounded-xl p-2 transition-colors",
            selectedNode || selectedEdge
              ? "text-red-500 hover:bg-red-500/10"
              : "cursor-not-allowed text-white/20"
          )}
          title="Eliminar seleccionado (Nodo o Conexión)"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-white/10" />

        <button
          onClick={onDeploy}
          disabled={isPublishing}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Rocket className={cn("h-3.5 w-3.5", isPublishing && "animate-pulse")} />
          {isPublishing ? "Desplegando..." : "Desplegar Workflow"}
        </button>
      </div>

      {/* ── React Flow Canvas ──────────────────────────────────── */}
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
        className="bg-[#0a0a0a]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.2}
          color="#222"
          className="opacity-60"
        />
        <Controls
          className="overflow-hidden rounded-xl border border-white/10 bg-black/60 fill-white"
          showInteractive={false}
        />
        <MiniMap
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl"
          nodeColor={(n: Node) => {
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
            if (n.type === "end") return "#6b7280";
            return "#fff";
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>

      {/* ── Node Configuration Sidebar ─────────────────────────── */}
      {selectedNode && (
        <NodeConfigSidebar
          key={selectedNode.id}
          node={selectedNode}
          workflowId={workflowId}
          onSave={onConfigSave}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* ── Status Badge ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute right-5 bottom-5 z-50">
        <div className="space-y-1 rounded-2xl border border-white/5 bg-black/50 p-4 backdrop-blur-md">
          <p className="text-[9px] font-black tracking-widest text-white/20 uppercase">
            Flow Engine
          </p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <p className="text-[11px] font-bold text-emerald-400">Operational V2</p>
          </div>
          <p className="font-mono text-[9px] text-white/20">
            {nodes.length} nodos · {edges.length} conexiones
          </p>
        </div>
      </div>
    </div>
  );
}
