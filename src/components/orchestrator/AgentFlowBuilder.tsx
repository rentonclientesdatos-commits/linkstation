"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  PanelPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageSquare,
  HelpCircle,
  GitBranch,
  Calendar,
  Settings,
  Zap,
  Check,
  Timer,
  Terminal,
  Database,
  Link2,
  Trash2,
  X,
  Globe,
  Brain,
  Plus,
  Sparkles,
  Search,
  LayoutGrid,
  Layers,
  Activity,
  ArrowRight,
  Save,
  FileText,
  AlarmClock,
  LucideIcon,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AIAgent } from "@/types/database";
import { getAIAgents } from "@/lib/actions/agents";
import { getWhatsAppTemplates } from "@/lib/actions/whatsapp";
import type { WhatsAppDBTemplate } from "@/lib/integrations/whatsapp/client";

interface FlowNodeData {
  text?: string;
  ifLabel?: string;
  elseLabel?: string;
  delay_value?: number;
  delay_unit?: string;
  command_type?: string;
  fields?: string[];
  target_variable?: string;
  webhook_url?: string;
  metadata_key?: string;
  metadata_value?: string;
  tag_name?: string;
  event?: string;
  method?: string;
  url?: string;
  headers?: string;
  payload?: string;
  action?: string;
  table?: string;
  mapping?: string;
  model?: string;
  task?: string;
  instructions?: string;
  label?: string;
  validation?: string;
  config?: Record<string, unknown>;
  // Wait properties
  interrupt_on_reply?: boolean;
  wait_condition_variable?: string;
  // Condition properties
  condition_variable?: string;
  condition_operator?: string;
  condition_value?: string;
  // CRM properties
  type?: string;
  mappings?: Record<string, string>;
  crm_mappings?: string;
  api_url?: string;
  api_key?: string;
  operation?: string;
  platform?: string;
  ownerId?: string;
  tagName?: string;
  transitionId?: string;
  timeout?: number;
  max_retries?: number;
  message?: string;
  // PDF Generator properties
  pdf_template_name?: string;
  pdf_html_template?: string;
  pdf_output_variable?: string;
  pdf_filename?: string;
  pdf_paper_size?: string;
  pdf_variables?: string;
  [key: string]: unknown;
}

// ─── Custom Node Types ─────────────────────────────────────────────

const NodeWrapper = ({
  title,
  icon: Icon,
  children,
  color,
  selected,
  type,
  headerColor,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  color: string;
  selected?: boolean;
  type?: string;
  headerColor: string;
}) => (
  <div
    className={cn(
      "min-w-[240px] overflow-hidden rounded-2xl border-2 bg-slate-900/90 shadow-2xl backdrop-blur-xl transition-all duration-500",
      selected
        ? "border-primary/60 ring-primary/5 -translate-y-1 scale-[1.02] shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] ring-8"
        : "border-white/5 shadow-black/60 hover:border-white/10"
    )}
  >
    {/* Progress bar style header */}
    <div className={cn("relative h-1 w-full overflow-hidden", headerColor)}>
      <div className="absolute inset-0 animate-pulse bg-white/20" />
    </div>

    <div className="px-5 py-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn("shrink-0 rounded-xl p-2 shadow-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="mb-0.5 block truncate text-[7px] font-black tracking-[0.3em] text-white/20 uppercase">
            {type || "MODULO"}
          </span>
          <span className="block truncate text-xs font-bold tracking-tight text-white">
            {title}
          </span>
        </div>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-primary h-2 w-2 rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),1)]"
          />
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  </div>
);

const TriggerNode = ({ data, selected }: { data: { event?: string }; selected?: boolean }) => (
  <NodeWrapper
    title="Disparador"
    icon={Zap}
    color="bg-yellow-500/20 text-yellow-500"
    headerColor="bg-yellow-500"
    selected={selected}
    type="INICIO"
  >
    <div className="rounded-lg border border-yellow-500/10 bg-yellow-500/5 px-2 py-1.5">
      <p className="text-[10px] leading-relaxed font-medium text-yellow-200/50">
        {data.event || "Nueva entrada de lead"}
      </p>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-yellow-500"
    />
  </NodeWrapper>
);

const MessageNode = ({ data, selected }: { data: { text?: string }; selected?: boolean }) => (
  <NodeWrapper
    title="Respuesta Agente"
    icon={MessageSquare}
    color="bg-blue-500/20 text-blue-400"
    headerColor="bg-blue-500"
    selected={selected}
    type="SALIDA"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-blue-500"
    />
    <div className="line-clamp-3 rounded-xl border border-blue-500/10 bg-blue-500/5 p-3 text-[10px] text-white/70 italic">
      &quot;{data.text || "El agente responderá usando su conocimiento..."}&quot;
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-blue-500"
    />
  </NodeWrapper>
);

interface NodeSimulation {
  status: "idle" | "loading" | "success" | "error";
  result?: unknown;
  request?: unknown;
  error?: string;
  timestamp?: string;
}

const HTTPRequestNode = ({
  data,
  selected,
}: {
  data: { method?: string; url?: string; simulation?: NodeSimulation };
  selected?: boolean;
}) => {
  const sim = data.simulation;
  return (
    <NodeWrapper
      title="HTTP Request"
      icon={Globe}
      color="bg-orange-500/20 text-orange-400"
      headerColor="bg-orange-500"
      selected={selected}
      type="INTEGRACIÓN"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 border-2 border-slate-900 bg-orange-500"
      />
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-orange-400/10 px-1.5 py-0.5 text-[9px] font-black text-orange-400">
            {data.method || "POST"}
          </span>
          <span className="flex-1 truncate text-[10px] text-white/40">
            {data.url || "https://api..."}
          </span>
        </div>
        {sim && sim.status === "success" && (
          <div className="animate-in fade-in zoom-in-95 mt-2 flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[8px] font-bold text-emerald-400 uppercase">
              Respuesta: 200 OK
            </span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 border-2 border-slate-900 bg-orange-500"
      />
    </NodeWrapper>
  );
};

const DatabaseNode = ({
  data,
  selected,
}: {
  data: { action?: string; target?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Acción DB"
    icon={Database}
    color="bg-cyan-500/20 text-cyan-400"
    headerColor="bg-cyan-500"
    selected={selected}
    type="DATOS"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-cyan-500"
    />
    <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-2">
      <p className="text-[10px] font-bold tracking-tighter text-cyan-400 uppercase">
        {data.action || "UPDATE_LEAD"} <span className="text-white/20">→</span>{" "}
        {data.target || "Status"}
      </p>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-cyan-500"
    />
  </NodeWrapper>
);

const AITaskNode = ({
  data,
  selected,
}: {
  data: { task?: string; instructions?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Procesador IA"
    icon={Brain}
    color="bg-purple-500/20 text-purple-400"
    headerColor="bg-purple-500"
    selected={selected}
    type="CEREBRO"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-purple-500"
    />
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-purple-200/60 uppercase">
        <Sparkles className="h-3 w-3" />
        {data.task || "ANÁLISIS DE DATOS"}
      </div>
      <div className="line-clamp-3 rounded-lg border border-purple-500/10 bg-purple-500/5 p-2 text-[9px] text-white/50 italic">
        {data.instructions || "Extraer información o validar criterios..."}
      </div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-purple-500"
    />
  </NodeWrapper>
);

const QuestionNode = ({
  data,
  selected,
}: {
  data: { text?: string; validation?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Pregunta"
    icon={HelpCircle}
    color="bg-emerald-500/20 text-emerald-400"
    headerColor="bg-emerald-500"
    selected={selected}
    type="INTERACCIÓN"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-emerald-500"
    />
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed font-medium text-white/80 italic">
        &quot;{data.text || "¿Cuál es tu duda?"}&quot;
      </p>
      {data.validation && (
        <div className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5">
          <Check className="h-2.5 w-2.5 text-emerald-400" />
          <span className="text-[8px] font-black tracking-widest text-emerald-400 uppercase">
            {data.validation}
          </span>
        </div>
      )}
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-emerald-500"
    />
  </NodeWrapper>
);

const AIAgentNode = ({
  data,
  selected,
}: {
  data: { agentId?: string; agentName?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Llamar otro Agente"
    icon={Brain}
    color="bg-indigo-500/20 text-indigo-400"
    headerColor="bg-indigo-500"
    selected={selected}
    type="CROSS_AGENT"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-indigo-500"
    />
    <div className="space-y-2">
      <div className="rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-2 text-[10px] font-bold text-indigo-300">
        Delegar a: {data.agentName || "Seleccionar..."}
      </div>
      <p className="text-[8px] font-black tracking-widest text-white/30 uppercase">
        Transfiere el control a otro experto
      </p>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-indigo-500"
    />
  </NodeWrapper>
);

const PdfGeneratorNode = ({
  data,
  selected,
}: {
  data: { pdf_template_name?: string; pdf_output_variable?: string; pdf_filename?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Generar PDF"
    icon={FileDown}
    color="bg-rose-500/20 text-rose-400"
    headerColor="bg-rose-600"
    selected={selected}
    type="PDF.CO"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-rose-500"
    />
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded border border-rose-500/10 bg-rose-500/5 p-1.5">
        <FileDown className="h-3 w-3 text-rose-400 shrink-0" />
        <span className="text-[9px] font-black text-rose-300 uppercase truncate">
          {data.pdf_template_name || "Sin plantilla"}
        </span>
      </div>
      {data.pdf_output_variable && (
        <div className="flex items-center gap-1.5 rounded border border-white/5 bg-white/5 p-1.5">
          <span className="text-[7px] font-bold text-white/30 uppercase">Salida →</span>
          <span className="font-mono text-[8px] text-rose-300">{`{{${data.pdf_output_variable}}}`}</span>
        </div>
      )}
      <p className="text-[8px] text-white/30 italic">Genera PDF y expone URL como variable</p>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-rose-500"
    />
  </NodeWrapper>
);

const MetaTemplateNode = ({
  data,
  selected,
}: {
  data: { templateName?: string; language?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Plantilla Meta"
    icon={FileText}
    color="bg-green-500/20 text-green-400"
    headerColor="bg-green-500"
    selected={selected}
    type="WHATSAPP"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-green-500"
    />
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded border border-green-500/10 bg-green-500/5 p-1.5">
        <span className="text-[9px] font-black text-green-400 uppercase">
          {data.templateName || "N/A"}
        </span>
        <span className="text-[7px] text-white/20">({data.language || "es"})</span>
      </div>
      <p className="text-[8px] text-white/30 italic">Mapeo dinámico activado</p>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-green-500"
    />
  </NodeWrapper>
);

const ConditionNode = ({
  data,
  selected,
}: {
  data: { ifLabel?: string; elseLabel?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Filtro"
    icon={GitBranch}
    color="bg-pink-500/20 text-pink-400"
    headerColor="bg-pink-500"
    selected={selected}
    type="LÓGICA"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-pink-500"
    />
    <div className="flex items-center justify-between rounded-xl border border-pink-500/10 bg-pink-500/5 px-3 py-2">
      <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">
        {data.ifLabel || "SÍ"}
      </span>
      <div className="mx-2 h-3 w-[1px] bg-white/10" />
      <span className="text-[9px] font-black tracking-widest text-rose-400 uppercase">
        {data.elseLabel || "NO"}
      </span>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      id="if"
      className="left-[25%] h-3 w-3 border-2 border-slate-900 bg-emerald-500"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="else"
      className="left-[75%] h-3 w-3 border-2 border-slate-900 bg-rose-500"
    />
  </NodeWrapper>
);

const WaitNode = ({
  data,
  selected,
}: {
  data: { delay_value?: number; delay_unit?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Esperar"
    icon={Timer}
    color="bg-amber-500/10 text-amber-400"
    headerColor="bg-amber-500"
    selected={selected}
    type="TEMPORIZADOR"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-amber-500"
    />
    <div className="flex flex-col items-center">
      <span className="text-[14px] font-black">{data.delay_value || 0}</span>
      <span className="text-[8px] tracking-widest text-white/30 uppercase">
        {data.delay_unit || "minutos"}
      </span>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-amber-500"
    />
  </NodeWrapper>
);

const CommandNode = ({
  data,
  selected,
}: {
  data: { command_type?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Comando"
    icon={Terminal}
    color="bg-blue-500/20 text-blue-400"
    headerColor="bg-blue-500"
    selected={selected}
    type="SISTEMA"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-blue-500"
    />
    <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 p-2 text-[10px] font-bold text-blue-400 uppercase">
      {data.command_type || "EJECUTAR_ACCION"}
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-blue-500"
    />
  </NodeWrapper>
);

const InactivityNode = ({
  data,
  selected,
}: {
  data: { timeout?: number; max_retries?: number; message?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Inactividad"
    icon={AlarmClock}
    color="bg-red-500/20 text-red-400"
    headerColor="bg-red-500"
    selected={selected}
    type="RESCATE"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-red-500"
    />
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-white/40">ESPERA:</span>
        <span className="text-red-400">{data.timeout || 30} min</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-white/40">REINTENTOS:</span>
        <span className="text-red-400">{data.max_retries || 1}</span>
      </div>
      <div className="line-clamp-2 rounded-lg border border-red-500/10 bg-red-500/5 p-2 text-[9px] text-white/50 italic">
        &quot;{data.message || "Enviando mensaje de rescate..."}&quot;
      </div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-red-500"
    />
  </NodeWrapper>
);

const CollectorNode = ({
  data,
  selected,
}: {
  data: { fields?: string[]; target_variable?: string };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="Colector"
    icon={Database}
    color="bg-cyan-500/20 text-cyan-400"
    headerColor="bg-cyan-500"
    selected={selected}
    type="DATOS"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-cyan-500"
    />
    <div className="space-y-1">
      <p className="text-[8px] font-black tracking-tighter text-cyan-300/40 uppercase">
        Destino: {data.target_variable || "unified_data"}
      </p>
      <div className="flex flex-wrap gap-1">
        {(data.fields || ["array"]).map((f, idx) => (
          <span
            key={idx}
            className="rounded border border-cyan-500/10 bg-cyan-500/20 px-1.5 py-0.5 text-[7px] font-black text-cyan-300 uppercase"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-cyan-500"
    />
  </NodeWrapper>
);

const BookNode = ({ selected }: { selected?: boolean }) => (
  <NodeWrapper
    title="Agendar"
    icon={Calendar}
    color="bg-amber-500/10 text-amber-400"
    headerColor="bg-amber-500"
    selected={selected}
    type="CALENDARIO"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-amber-500"
    />
    <p className="text-[10px] font-bold text-white/40">Cierra y agenda cita</p>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-amber-500"
    />
  </NodeWrapper>
);

const CRMNode = ({
  data,
  selected,
}: {
  data: { type?: string; tagName?: string; ownerId?: string; mappings?: Record<string, string> };
  selected?: boolean;
}) => (
  <NodeWrapper
    title="CRM Integration"
    icon={Database}
    color="bg-indigo-600/20 text-indigo-400"
    headerColor="bg-indigo-600"
    selected={selected}
    type="CRM"
  >
    <Handle
      type="target"
      position={Position.Top}
      className="h-3 w-3 border-2 border-slate-900 bg-indigo-600"
    />
    <div className="space-y-1.5">
      <div className="rounded-lg border border-indigo-600/10 bg-indigo-600/5 p-2">
        <p className="text-[10px] font-bold tracking-tighter text-indigo-400 uppercase">
          {data.type || "ACCION REQUERIDA"}
        </p>
        {data.mappings && (
          <p className="mt-1 text-[8px] text-white/30 italic">
            {Object.keys(data.mappings).length} campos mapeados
          </p>
        )}
      </div>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="h-3 w-3 border-2 border-slate-900 bg-indigo-600"
    />
  </NodeWrapper>
);

const CRM_PLATFORM_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  zoho: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  hubspot: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  salesforce: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  pipedrive: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  custom: { color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/20" },
};

const CrmConnectNode = ({
  data,
  selected,
}: {
  data: { platform?: string; operation?: string; api_url?: string; simulation?: NodeSimulation };
  selected?: boolean;
}) => {
  const platform = data.platform || "zoho";
  const palette = CRM_PLATFORM_COLORS[platform] || CRM_PLATFORM_COLORS.custom;
  const platformLabel: Record<string, string> = {
    zoho: "Zoho CRM",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    pipedrive: "Pipedrive",
    custom: "API Custom",
  };
  const sim = data.simulation;
  return (
    <NodeWrapper
      title="Conectar BD / CRM"
      icon={Link2}
      color={`${palette.bg} ${palette.color}`}
      headerColor={palette.bg.replace("/10", "")}
      selected={selected}
      type="CONECTOR"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 border-2 border-slate-900 bg-violet-500"
      />
      <div className="space-y-2">
        <div
          className={cn(
            "rounded-lg border px-3 py-1.5 text-[10px] font-black tracking-wider uppercase",
            palette.bg,
            palette.color,
            palette.border
          )}
        >
          {platformLabel[platform] || "Plataforma"}
        </div>
        <p className="line-clamp-1 text-[9px] tracking-wide text-white/40 uppercase">
          {data.operation || "OPERACIÓN"}
        </p>

        {sim && sim.status === "success" && (
          <div className="animate-in fade-in zoom-in-95 flex items-center justify-between rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5">
            <span className="text-[8px] font-bold text-emerald-400 uppercase">Sincronizado</span>
            <Check className="h-2 w-2 text-emerald-400" />
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 border-2 border-slate-900 bg-violet-500"
      />
    </NodeWrapper>
  );
};

// ─── Component ─────────────────────────────────────────────────────

interface AgentFlowBuilderProps {
  initialFlow: { nodes: Node<FlowNodeData>[]; edges: Edge[] };
  onSave: (flow: { nodes: Node<FlowNodeData>[]; edges: Edge[] }) => void;
  onClose: () => void;
  agentName: string;
  isInline?: boolean;
}

export function AgentFlowBuilder({
  initialFlow,
  onSave,
  onClose,
  agentName,
  isInline,
}: AgentFlowBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [isNodeLibraryOpen, setIsNodeLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsAppDBTemplate[]>([]);
  const [precedingVariables, setPrecedingVariables] = useState<string[]>([]);
  const [nodeSimulations, setNodeSimulations] = useState<Record<string, NodeSimulation>>({});

  const handleTestNode = async (node: Node<FlowNodeData>) => {
    const id = node.id;
    setNodeSimulations((prev) => ({
      ...prev,
      [id]: { status: "loading" },
    }));

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      let result: unknown = null;
      let request: unknown = null;

      if (node.type === "flow_http") {
        const headersStr = (node.data.headers as string) || "{}";
        const payloadStr = (node.data.payload as string) || "{}";

        request = {
          method: node.data.method || "POST",
          url: node.data.url || "https://api.example.com",
          headers: JSON.parse(headersStr),
          body: JSON.parse(payloadStr),
        };
        // Mock result
        result = {
          status: 200,
          data: {
            success: true,
            id: "res_" + Math.random().toString(36).substr(2, 9),
            message: "Request processed successfully",
            received_at: new Date().toISOString(),
          },
        };
      } else if (node.type === "flow_crm_connect") {
        const mappingsStr = (node.data.crm_mappings as string) || "{}";
        request = {
          platform: node.data.platform,
          operation: node.data.operation,
          mappings: JSON.parse(mappingsStr),
        };
        result = {
          success: true,
          crm_id: "CRM_" + Math.random().toString(36).substr(2, 9),
          sync_status: "COMPLETED",
          platform: node.data.platform,
        };
      }

      setNodeSimulations((prev) => ({
        ...prev,
        [id]: {
          status: "success",
          result,
          request,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } catch (err: unknown) {
      setNodeSimulations((prev) => ({
        ...prev,
        [id]: {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    }
  };

  useEffect(() => {
    const loadAgents = async () => {
      const res = await getAIAgents();
      if (res.success && res.data) setAiAgents(res.data);
    };
    const loadWaTemplates = async () => {
      const res = await getWhatsAppTemplates("APPROVED");
      if (res.success && res.data) setWaTemplates(res.data);
    };
    loadAgents();
    loadWaTemplates();
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(
    initialFlow.nodes && initialFlow.nodes.length > 0
      ? initialFlow.nodes
      : [{ id: "start", type: "flow_trigger", position: { x: 250, y: 0 }, data: {} }]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Fetch variables from preceding nodes when a condition node is selected
  useEffect(() => {
    const fetchPrecedingVars = async () => {
      const node = nodes.find((n) => n.id === selectedNodeId);
      if (node?.type === "flow_condition") {
        // Find source node
        const edge = edges.find((e) => e.target === node.id);
        if (edge) {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          if (sourceNode?.type === "flow_ai_agent" && sourceNode.data.agentId) {
            const { getAgentTrackedVariables } = await import("@/lib/actions/inbox");
            const res = await getAgentTrackedVariables(sourceNode.data.agentId as string);
            if (res.success && res.data) {
              setPrecedingVariables(res.data);
            } else {
              setPrecedingVariables([]);
            }
          } else {
            setPrecedingVariables([
              "nombre",
              "email",
              "telefono",
              "pais",
              "origen",
              "segmentacion",
              "tipo_lead",
            ]);
          }
        }
      }
    };
    fetchPrecedingVars();
  }, [selectedNodeId, nodes, edges]);

  const handlePublish = async () => {
    setSaving(true);
    try {
      await onSave({ nodes, edges });
    } finally {
      setSaving(false);
    }
  };

  const nodeTypes = useMemo(
    () => ({
      flow_trigger: TriggerNode,
      flow_message: MessageNode,
      flow_question: QuestionNode,
      flow_condition: ConditionNode,
      flow_wait: WaitNode,
      flow_command: CommandNode,
      flow_collector: CollectorNode,
      flow_book: BookNode,
      flow_http: HTTPRequestNode,
      flow_db: DatabaseNode,
      flow_ai: AITaskNode,
      flow_crm: CRMNode,
      flow_crm_connect: CrmConnectNode,
      flow_ai_agent: AIAgentNode,
      flow_meta_template: MetaTemplateNode,
      flow_inactivity: InactivityNode,
      flow_pdf_generator: PdfGeneratorNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Update nodes with simulation data when they change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (nodeSimulations[n.id]) {
          return { ...n, data: { ...n.data, simulation: nodeSimulations[n.id] } };
        }
        return n;
      })
    );
  }, [nodeSimulations, setNodes]);

  const updateNodeData = (id: string, newData: Partial<FlowNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newData } } : n))
    );
  };

  const addNode = (type: string) => {
    const id = `${type}_${Date.now()}`;
    const newNode: Node<FlowNodeData> = {
      id,
      type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        text: "",
        ifLabel: "SÍ",
        elseLabel: "NO",
        delay_value: 5,
        delay_unit: "minutos",
        command_type: "update_status",
        fields: ["leads", "responses"],
        target_variable: "unified_data",
        webhook_url: "",
        metadata_key: "",
        metadata_value: "",
        tag_name: "",
        event: "nueva_entrada",
        method: "POST",
        url: "",
        action: "SAVE_LEAD",
        model: "gpt-4o",
        task: "Clasificar intención",
        // CRM Connect defaults
        platform: "zoho",
        operation: "CREATE_OR_UPDATE_CONTACT",
        api_url: "",
        api_key: "",
        crm_mappings: JSON.stringify(
          {
            nombre: "{{nombre}}",
            email: "{{email}}",
            telefono: "{{telefono}}",
          },
          null,
          2
        ),
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    setIsNodeLibraryOpen(false);
  };

  const nodeCategories = [
    {
      title: "Disparadores",
      icon: Zap,
      items: [
        {
          type: "flow_trigger",
          label: "Inicio de Chat",
          desc: "Se activa cuando llega un nuevo mensaje.",
          icon: MessageSquare,
        },
        {
          type: "flow_trigger",
          label: "Webhook",
          desc: "Se activa mediante una URL externa.",
          icon: Globe,
        },
      ],
    },
    {
      title: "Interacción",
      icon: MessageSquare,
      items: [
        {
          type: "flow_message",
          label: "Respuesta Agente",
          desc: "El agente responde usando su configuración.",
          icon: MessageSquare,
        },
        {
          type: "flow_ai_agent",
          label: "Llamar otro Agente",
          desc: "Delega la conversación a otro agente experto.",
          icon: Brain,
        },
        {
          type: "flow_meta_template",
          label: "Plantilla WhatsApp",
          desc: "Envía plantilla oficial de Meta.",
          icon: FileText,
        },
        {
          type: "flow_question",
          label: "Hacer Pregunta",
          desc: "Solicita datos específicos.",
          icon: HelpCircle,
        },
        { type: "flow_wait", label: "Esperar", desc: "Pausa el flujo temporalmente.", icon: Timer },
      ],
    },
    {
      title: "Lógica y Datos",
      icon: GitBranch,
      items: [
        {
          type: "flow_condition",
          label: "Filtrar (IF)",
          desc: "Ramifica según condiciones.",
          icon: Layers,
        },
        {
          type: "flow_inactivity",
          label: "Inactividad",
          desc: "Seguimiento automático si no responden.",
          icon: AlarmClock,
        },
        {
          type: "flow_collector",
          label: "Colector JSON",
          desc: "Agrupa variables en un objeto.",
          icon: Database,
        },
        {
          type: "flow_book",
          label: "Agendar Cita",
          desc: "Cierra el flujo agendando.",
          icon: Calendar,
        },
      ],
    },
    {
      title: "Integraciones",
      icon: Globe,
      items: [
        {
          type: "flow_http",
          label: "Petición HTTP",
          desc: "Conecta con cualquier API.",
          icon: Terminal,
        },
        {
          type: "flow_db",
          label: "Acción DB",
          desc: "Guarda o lee de la base de datos.",
          icon: Activity,
        },
        {
          type: "flow_ai",
          label: "Procesador IA",
          desc: "Análisis y validación de datos avanzada.",
          icon: Brain,
        },
        {
          type: "flow_crm",
          label: "Integración CRM",
          desc: "Tag, Owner, Mapeo personalizado.",
          icon: Database,
        },
        {
          type: "flow_crm_connect",
          label: "Conectar BD / CRM",
          desc: "Sincroniza con Zoho, HubSpot, Salesforce, Pipedrive o API propia.",
          icon: Link2,
        },
        {
          type: "flow_pdf_generator",
          label: "Generar PDF",
          desc: "Genera un PDF de cotización vía pdf.co y lo expone como variable.",
          icon: FileDown,
        },
      ],
    },
  ];

  const filteredCategories = nodeCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      className={cn(
        isInline ? "absolute inset-0" : "fixed inset-0 z-[100] shadow-2xl",
        "animate-in fade-in flex flex-col overflow-hidden bg-slate-950 text-white duration-300"
      )}
    >
      {/* Header */}
      {!isInline && (
        <div className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-slate-900/50 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 border-primary/20 flex h-9 w-9 items-center justify-center rounded-xl border">
              <GitBranch className="text-primary h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={cn(
                    "font-black tracking-tight uppercase",
                    isInline ? "text-base" : "text-lg"
                  )}
                >
                  Flow Builder Pro
                </h2>
                <span className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white/30 uppercase">
                  Beta 2.0
                </span>
              </div>
              <p className="mt-0.5 text-[9px] leading-none font-bold tracking-widest text-white/30 uppercase">
                Editando: <span className="text-primary/60">{agentName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePublish}
              disabled={saving}
              className="bg-primary shadow-primary/20 hover:shadow-primary/30 border-primary-foreground/20 h-10 rounded-xl border-b-4 px-6 text-[10px] font-black tracking-widest text-white uppercase shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Publicar Cambios"}
            </button>
            <button
              onClick={onClose}
              title="Cerrar panel"
              className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 font-bold transition-all hover:border-red-500/20 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 text-white/40 group-hover:text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ── Floatin Toolbar (Left) ── */}
        <div className="absolute top-1/2 left-6 z-20 flex -translate-y-1/2 flex-col items-center gap-3 rounded-[28px] border border-white/10 bg-slate-950/40 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-2 border-b border-white/5 p-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
              <Activity className="text-primary h-3 w-3" />
            </div>
          </div>
          <QuickActionButton
            onClick={() => addNode("flow_trigger")}
            title="Inicio"
            color="text-yellow-400 bg-yellow-400/10"
            icon={Zap}
          />
          <QuickActionButton
            onClick={() => addNode("flow_message")}
            title="Respuesta Agente"
            color="text-blue-400 bg-blue-400/10"
            icon={MessageSquare}
          />
          <QuickActionButton
            onClick={() => addNode("flow_question")}
            title="Pregunta"
            color="text-emerald-400 bg-emerald-400/10"
            icon={HelpCircle}
          />
          <QuickActionButton
            onClick={() => addNode("flow_condition")}
            title="Condición"
            color="text-pink-400 bg-pink-400/10"
            icon={GitBranch}
          />
          <QuickActionButton
            onClick={() => addNode("flow_http")}
            title="API / HTTP"
            color="text-orange-400 bg-orange-400/10"
            icon={Globe}
          />
          <QuickActionButton
            onClick={() => addNode("flow_db")}
            title="Base de Datos"
            color="text-cyan-400 bg-cyan-400/10"
            icon={Database}
          />
          <QuickActionButton
            onClick={() => addNode("flow_ai")}
            title="Procesador IA"
            color="text-purple-400 bg-purple-400/10"
            icon={Brain}
          />
          <QuickActionButton
            onClick={() => addNode("flow_crm_connect")}
            title="BD / CRM"
            color="text-violet-400 bg-violet-400/10"
            icon={Link2}
          />

          <div className="mt-2 border-t border-white/5 pt-2">
            <button
              onClick={() => setIsNodeLibraryOpen(true)}
              className="bg-primary shadow-primary/40 group flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg transition-all hover:scale-110 active:scale-95"
              title="Librería de Nodos"
            >
              <Plus className="h-5 w-5 transition-transform duration-500 group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* ── Node Library Overlay ── */}
        <AnimatePresence>
          {isNodeLibraryOpen && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-8 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl"
              >
                {/* Library Header */}
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border">
                      <LayoutGrid className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight uppercase">
                        Librería de Nodos
                      </h3>
                      <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                        Selecciona el módulo que deseas añadir a tu flujo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/20" />
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar módulo..."
                        className="focus:border-primary/50 h-12 w-80 rounded-2xl border border-white/10 bg-white/5 pr-6 pl-12 text-sm font-bold text-white transition-all outline-none placeholder:text-white/10"
                      />
                    </div>
                    <button
                      onClick={() => setIsNodeLibraryOpen(false)}
                      title="Cerrar librería"
                      aria-label="Cerrar librería de módulos"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/20 transition-all hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Library Content */}
                <div className="no-scrollbar flex-1 space-y-12 overflow-y-auto p-8">
                  {filteredCategories.map((cat, idx) => (
                    <div key={idx} className="space-y-6">
                      <div className="flex items-center gap-3 px-2">
                        <cat.icon className="h-4 w-4 text-white/30" />
                        <h4 className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">
                          {cat.title}
                        </h4>
                        <div className="ml-2 h-px flex-1 bg-white/5" />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {cat.items.map((item, itemIdx) => (
                          <button
                            key={itemIdx}
                            onClick={() => addNode(item.type)}
                            className="group hover:bg-primary/10 hover:border-primary/30 hover:shadow-primary/10 rounded-[24px] border border-white/5 bg-white/[0.02] p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl"
                          >
                            <div className="flex items-start gap-5">
                              <div className="group-hover:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 transition-colors">
                                <item.icon className="group-hover:text-primary h-6 w-6 text-white/40 transition-colors" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="group-hover:text-primary text-sm font-bold text-white transition-colors">
                                  {item.label}
                                </h5>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/30">
                                  {item.desc}
                                </p>
                              </div>
                              <ArrowRight className="group-hover:text-primary mt-1 h-4 w-4 text-white/10 transition-all group-hover:translate-x-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            colorMode="dark"
            className="selection:bg-primary/20"
          >
            <Background color="#1e293b" gap={32} size={1} />
            <Panel position="bottom-right" className="!m-6">
              <div className="flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 shadow-2xl backdrop-blur-xl">
                <Controls
                  showInteractive={false}
                  className="hover:[&_path]:!fill-primary !static !m-0 !border-none !bg-transparent !shadow-none transition-all [&_button]:!h-9 [&_button]:!w-9 [&_button]:!border-none [&_button]:!bg-transparent [&_button]:!outline-none [&_button:not(:last-child)]:!border-b [&_button:not(:last-child)]:!border-white/5 [&_path]:!fill-white/60"
                />
              </div>
            </Panel>

            <Panel position={"top-right" as PanelPosition} className="m-6 flex items-center gap-3">
              <button
                onClick={handlePublish}
                disabled={saving}
                className="bg-primary shadow-primary/40 border-primary-foreground/20 flex h-11 items-center gap-3 rounded-2xl border-b-4 px-8 text-[10px] font-black tracking-[0.2em] text-white uppercase shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Guardando..." : "Publicar Cambios"}</span>
              </button>
            </Panel>

            <Panel position={"bottom-center" as PanelPosition} className="m-6">
              <AnimatePresence>
                {selectedNodeId && (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    onClick={() => {
                      setNodes((nds) => nds.filter((n) => !n.selected));
                      setEdges((eds) => eds.filter((e) => !e.selected));
                      setSelectedNodeId(null);
                    }}
                    className="flex items-center gap-3 rounded-full border-b-4 border-red-700/50 bg-red-500 px-6 py-3 text-[10px] font-black tracking-[0.2em] text-white uppercase shadow-2xl shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar Selección</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties Sidebar (Right) */}
        {selectedNode && (
          <div className="animate-in slide-in-from-right-5 flex w-80 flex-col gap-8 overflow-y-auto border-l border-white/5 bg-slate-900 p-8 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="text-primary h-4 w-4" />
                <h3 className="text-sm font-black tracking-widest uppercase">Propiedades</h3>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                title="Cerrar propiedades"
                aria-label="Cerrar panel de propiedades de nodo"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
              >
                <X className="h-4 w-4 text-white/30" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Common: Label */}
              <div className="space-y-3">
                <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                  Identificador Nodo
                </label>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3 font-mono text-[10px] text-white/20">
                  {selectedNode.id}
                </div>
              </div>

              {/* Node Specific Configs */}
              {selectedNode.type === "flow_message" && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                    Texto del Mensaje
                  </label>
                  <textarea
                    value={selectedNode.data.text || ""}
                    onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                    className="focus:ring-primary/30 min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/80 focus:ring-2 focus:outline-none"
                    placeholder="Ej: Hola, ¿en qué puedo ayudarte?"
                  />
                </div>
              )}

              {selectedNode.type === "flow_question" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Pregunta al Usuario
                    </label>
                    <textarea
                      value={selectedNode.data.text || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/80 transition-all outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10"
                      placeholder="Escribe la pregunta que el agente hará..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Validación de Respuesta
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["texto", "email", "telefono", "numero", "fecha"].map((v) => (
                        <button
                          key={v}
                          onClick={() => updateNodeData(selectedNode.id, { validation: v })}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-[10px] font-bold uppercase transition-all",
                            selectedNode.data.validation === v
                              ? "border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_inactivity" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Tiempo de Espera (min)
                    </label>
                    <input
                      type="number"
                      value={selectedNode.data.timeout || 30}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })
                      }
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-6 text-xs text-white outline-none focus:border-red-500/40"
                      title="Tiempo de espera en minutos"
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Máximo de Reintentos
                    </label>
                    <input
                      type="number"
                      value={selectedNode.data.max_retries || 1}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { max_retries: parseInt(e.target.value) })
                      }
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-6 text-xs text-white outline-none focus:border-red-500/40"
                      title="Máximo de reintentos"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Mensaje de Rescate
                    </label>
                    <textarea
                      value={selectedNode.data.message || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/80 transition-all outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/10"
                      placeholder="Ej: Hola, ¿sigues ahí? Quería confirmar..."
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_trigger" && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                    Evento de Activación
                  </label>
                  <select
                    value={selectedNode.data.event || "nueva_entrada"}
                    onChange={(e) => updateNodeData(selectedNode.id, { event: e.target.value })}
                    title="Seleccionar evento de activación"
                    aria-label="Evento de activación del flujo"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-xs text-white/80 outline-none focus:border-yellow-500/40"
                  >
                    <option value="nueva_entrada">Nueva Entrada de Usuario</option>
                    <option value="mensaje_recibido">Mensaje Específico Recibido</option>
                    <option value="tiempo_inactivo">Tiempo de Inactividad</option>
                    <option value="webhook">Webhook Externo</option>
                  </select>
                </div>
              )}

              {selectedNode.type === "flow_condition" && (
                <div className="space-y-4">
                  <label
                    htmlFor="flow-if-label"
                    className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                  >
                    Etiqueta SI (Verdad)
                  </label>
                  <input
                    id="flow-if-label"
                    value={selectedNode.data.ifLabel || ""}
                    onChange={(e) => updateNodeData(selectedNode.id, { ifLabel: e.target.value })}
                    aria-label="Etiqueta para caso positivo"
                    placeholder="SI"
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-emerald-400"
                  />
                  <div className="space-y-3">
                    <label
                      htmlFor="flow-else-label"
                      className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                    >
                      Etiqueta NO (Falso)
                    </label>
                    <input
                      id="flow-else-label"
                      value={selectedNode.data.elseLabel || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { elseLabel: e.target.value })
                      }
                      aria-label="Etiqueta para caso negativo"
                      placeholder="NO"
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-red-400"
                    />
                  </div>

                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-pink-400 uppercase">
                        Variable a Filtrar
                      </label>
                      <select
                        value={(selectedNode.data.condition_variable as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { condition_variable: e.target.value })
                        }
                        title="Variable a filtrar"
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white"
                      >
                        <option value="">-- Seleccionar Variable --</option>
                        {precedingVariables.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-pink-400 uppercase">
                        Operador
                      </label>
                      <select
                        value={(selectedNode.data.condition_operator as string) || "equals"}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { condition_operator: e.target.value })
                        }
                        title="Operador de comparación"
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white"
                      >
                        <option value="equals">Es igual a</option>
                        <option value="not_equals">Es distinto a</option>
                        <option value="contains">Contiene</option>
                        <option value="is_true">Es Verdadero</option>
                        <option value="is_false">Es Falso</option>
                        <option value="exists">Existe / Tiene valor</option>
                      </select>
                    </div>

                    {!["is_true", "is_false", "exists"].includes(
                      selectedNode.data.condition_operator as string
                    ) && (
                      <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                        <label className="text-[9px] font-black tracking-widest text-pink-400 uppercase">
                          Valor de Comparación
                        </label>
                        <input
                          value={(selectedNode.data.condition_value as string) || ""}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, { condition_value: e.target.value })
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white"
                          placeholder="Ej: cualificado, si, 5000..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_wait" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label
                      htmlFor="flow-wait-value"
                      className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                    >
                      Valor de Espera
                    </label>
                    <input
                      id="flow-wait-value"
                      type="number"
                      value={selectedNode.data.delay_value || 0}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { delay_value: parseInt(e.target.value) })
                      }
                      aria-label="Cantidad de tiempo de espera"
                      placeholder="0"
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-amber-400"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Unidad de Tiempo
                    </label>
                    <select
                      value={selectedNode.data.delay_unit || "minutos"}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { delay_unit: e.target.value })
                      }
                      title="Unidad de tiempo para la espera"
                      aria-label="Unidad de tiempo"
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/80"
                    >
                      <option value="minutos">Minutos</option>
                      <option value="horas">Horas</option>
                      <option value="dias">Días</option>
                    </select>
                  </div>

                  {/* Smart Wait Extensions */}
                  <div className="space-y-6 border-t border-white/5 pt-6">
                    <div className="flex items-center justify-between rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
                      <div>
                        <p className="text-[10px] font-black tracking-tight text-amber-200 uppercase">
                          Interrumpir al responder
                        </p>
                        <p className="mt-0.5 text-[8px] font-bold text-white/20 uppercase">
                          Si el lead escribe, saltar espera
                        </p>
                      </div>
                      <button
                        title={
                          selectedNode.data.interrupt_on_reply
                            ? "Desactivar interrupción"
                            : "Activar interrupción"
                        }
                        onClick={() =>
                          updateNodeData(selectedNode.id, {
                            interrupt_on_reply: !selectedNode.data.interrupt_on_reply,
                          })
                        }
                        className={cn(
                          "relative h-5 w-10 rounded-full transition-all",
                          selectedNode.data.interrupt_on_reply ? "bg-amber-500" : "bg-white/10"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                            selectedNode.data.interrupt_on_reply ? "right-1" : "left-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                          Condiciones Inteligentes
                        </label>
                      </div>

                      <div className="space-y-3">
                        <select
                          value={(selectedNode.data.wait_condition_variable as string) || ""}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              wait_condition_variable: e.target.value,
                            })
                          }
                          title="Variable a monitorear durante la espera"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white"
                        >
                          <option value="">-- No interrumpir por datos --</option>
                          {precedingVariables.map((v) => (
                            <option key={v} value={v}>
                              Saltar si se captura: {v}
                            </option>
                          ))}
                        </select>
                        <p className="text-[8px] text-white/20 italic">
                          La espera terminará inmediatamente si esta variable es capturada por la IA
                          durante el intervalo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_command" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Acción de Ejecución
                    </label>
                    <select
                      value={selectedNode.data.command_type || "update_status"}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { command_type: e.target.value })
                      }
                      title="Seleccionar tipo de comando a ejecutar"
                      aria-label="Tipo de comando"
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/80"
                    >
                      <option value="update_status">Actualizar Estado Lead</option>
                      <option value="trigger_webhook">Disparar Webhook (POST)</option>
                      <option value="add_tag">Añadir Etiqueta (Tag)</option>
                      <option value="update_metadata">Actualizar Metadatos (JSON)</option>
                      <option value="human_handoff">Transferir a Humano</option>
                      <option value="notify_admin">Notificar a Admin (WhatsApp)</option>
                    </select>
                  </div>

                  {/* Conditional Command Fields */}
                  {selectedNode.data.command_type === "trigger_webhook" && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-red-400 uppercase">
                        URL del Webhook
                      </label>
                      <input
                        value={selectedNode.data.webhook_url || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { webhook_url: e.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                        placeholder="https://api.tuservicio.com/hook"
                      />
                    </div>
                  )}

                  {selectedNode.data.command_type === "add_tag" && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-red-400 uppercase">
                        Nombre de la Etiqueta
                      </label>
                      <input
                        value={selectedNode.data.tag_name || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { tag_name: e.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                        placeholder="Ej: interesado_premium"
                      />
                    </div>
                  )}

                  {selectedNode.data.command_type === "update_metadata" && (
                    <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black tracking-widest text-red-400 uppercase">
                          Key
                        </label>
                        <input
                          value={selectedNode.data.metadata_key || ""}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, { metadata_key: e.target.value })
                          }
                          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                          placeholder="budget"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black tracking-widest text-red-400 uppercase">
                          Value
                        </label>
                        <input
                          value={selectedNode.data.metadata_value || ""}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, { metadata_value: e.target.value })
                          }
                          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === "flow_crm" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Acción CRM
                    </label>
                    <select
                      title="Seleccionar Acción CRM"
                      value={(selectedNode.data.type as string) || "UPDATE_LEAD"}
                      onChange={(e) => updateNodeData(selectedNode.id, { type: e.target.value })}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-xs text-white/80 outline-none focus:border-indigo-500/40"
                    >
                      <option value="UPDATE_LEAD">Actualizar Lead (Mapeado)</option>
                      <option value="UPDATE_OWNER">Asignar Propietario</option>
                      <option value="ADD_TAG">Añadir Etiqueta (Tag)</option>
                      <option value="EXTERNAL_ACTION">Acción Externa (Blueprint/Workflow)</option>
                    </select>
                  </div>

                  {(selectedNode.data.type === "UPDATE_LEAD" ||
                    selectedNode.data.type === "UPDATE_OWNER") && (
                    <div className="space-y-4">
                      <label className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">
                        Mapeo de Campos CRM
                      </label>
                      <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
                        {["nombre", "apellido", "email", "telefono", "pais", "origen"].map(
                          (field) => (
                            <div key={field} className="group flex items-center gap-2">
                              <span className="w-16 text-[9px] text-white/40 uppercase">
                                {field}
                              </span>
                              <input
                                value={
                                  (selectedNode.data.mappings as Record<string, string>)?.[field] ||
                                  ""
                                }
                                onChange={(e) => {
                                  const newMappings = {
                                    ...((selectedNode.data.mappings as Record<string, string>) ||
                                      {}),
                                    [field]: e.target.value,
                                  };
                                  updateNodeData(selectedNode.id, { mappings: newMappings });
                                }}
                                placeholder={`ID de campo...`}
                                className="h-8 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] text-white/80 transition-colors group-hover:border-white/20"
                              />
                            </div>
                          )
                        )}
                      </div>

                      {selectedNode.data.type === "UPDATE_OWNER" && (
                        <div className="space-y-2 border-t border-white/5 pt-2">
                          <label className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">
                            ID del Propietario
                          </label>
                          <input
                            value={(selectedNode.data.ownerId as string) || ""}
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, { ownerId: e.target.value })
                            }
                            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                            placeholder="781577000..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.data.type === "ADD_TAG" && (
                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">
                        Nombre de la Etiqueta
                      </label>
                      <input
                        value={(selectedNode.data.tagName as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { tagName: e.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                        placeholder="Ej: VirginIA"
                      />
                    </div>
                  )}

                  {selectedNode.data.type === "EXTERNAL_ACTION" && (
                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">
                        ID de Transición / Acción
                      </label>
                      <input
                        value={(selectedNode.data.transitionId as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { transitionId: e.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                        placeholder="ID deBlueprint o Workflow"
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type === "flow_collector" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Variable de Destino (Array)
                    </label>
                    <input
                      value={selectedNode.data.target_variable || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { target_variable: e.target.value })
                      }
                      className="h-10 w-full rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 text-xs font-bold text-indigo-400"
                      placeholder="unified_data"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Campos a Unificar (Separados por coma)
                    </label>
                    <textarea
                      value={selectedNode.data.fields?.join(", ") || ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          fields: e.target.value
                            .split(",")
                            .map((f) => f.trim())
                            .filter((f) => f !== ""),
                        })
                      }
                      className="min-h-[80px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80"
                      placeholder="nombre, email, presupuesto, fuente"
                    />
                    <p className="text-[8px] text-white/20 italic">
                      Estos campos se empaquetarán en un objeto JSON dentro del array final.
                    </p>
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_http" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Método y URL
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="http-method"
                        value={selectedNode.data.method || "POST"}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { method: e.target.value })
                        }
                        title="Seleccionar método HTTP"
                        className="h-11 w-24 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 text-[10px] font-black text-orange-400"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                      <input
                        value={selectedNode.data.url || ""}
                        onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                        className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-xs text-white/80"
                        placeholder="https://api..."
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label
                      htmlFor="http-headers"
                      className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                    >
                      Headers (JSON)
                    </label>
                    <textarea
                      id="http-headers"
                      value={
                        selectedNode.data.headers || '{\n  "Content-Type": "application/json"\n}'
                      }
                      onChange={(e) => updateNodeData(selectedNode.id, { headers: e.target.value })}
                      title="Headers de la petición HTTP"
                      placeholder='{\n  "Content-Type": "application/json"\n}'
                      className="min-h-[100px] w-full rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[10px] text-white/40 transition-all outline-none focus:text-white/80"
                    />
                  </div>
                  <div className="space-y-3">
                    <label
                      htmlFor="http-payload"
                      className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                    >
                      Body / Payload
                    </label>
                    <textarea
                      id="http-payload"
                      value={
                        selectedNode.data.payload ||
                        '{\n  "lead_id": "{{lead_id}}",\n  "status": "contacted"\n}'
                      }
                      onChange={(e) => updateNodeData(selectedNode.id, { payload: e.target.value })}
                      title="Cuerpo de la petición HTTP"
                      placeholder='{\n  "lead_id": "{{lead_id}}",\n  "status": "contacted"\n}'
                      className="min-h-[120px] w-full rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[10px] text-white/40 transition-all outline-none focus:text-white/80"
                    />
                  </div>

                  {/* Simulation Panel for HTTP */}
                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black tracking-widest text-orange-400 uppercase">
                        Prueba de Ejecución
                      </label>
                      {nodeSimulations[selectedNode.id]?.timestamp && (
                        <span className="text-[8px] text-white/20">
                          Last: {nodeSimulations[selectedNode.id].timestamp}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleTestNode(selectedNode)}
                      disabled={nodeSimulations[selectedNode.id]?.status === "loading"}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 text-[10px] font-black tracking-widest text-orange-400 uppercase transition-all hover:bg-orange-500/20 disabled:opacity-50"
                    >
                      {nodeSimulations[selectedNode.id]?.status === "loading" ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                      ) : (
                        <Activity className="h-3 w-3" />
                      )}
                      {nodeSimulations[selectedNode.id]?.status === "loading"
                        ? "Ejecutando..."
                        : "Simular Petición"}
                    </button>

                    {nodeSimulations[selectedNode.id]?.status === "success" && (
                      <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div className="space-y-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-tighter text-emerald-400 uppercase">
                              Resultado: 200 OK
                            </span>
                            <Check className="h-3 w-3 text-emerald-400" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[8px] font-black tracking-widest text-white/30 uppercase">
                              Respuesta Recibida:
                            </p>
                            <pre className="overflow-x-auto rounded-lg bg-black/20 p-2 font-mono text-[9px] text-emerald-200/60">
                              {JSON.stringify(nodeSimulations[selectedNode.id].result, null, 2)}
                            </pre>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                          <p className="mb-2 text-[8px] font-bold tracking-widest text-white/40 uppercase">
                            Variables Generadas:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {Object.keys(
                              (nodeSimulations[selectedNode.id].result as any)?.data || {}
                            ).map((key) => (
                              <div
                                key={key}
                                className="rounded border border-white/5 bg-white/5 px-2 py-0.5 font-mono text-[8px] text-orange-200/50"
                              >
                                {"{{" + key + "}}"}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_db" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label
                      htmlFor="db-action"
                      className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                    >
                      Acción
                    </label>
                    <select
                      id="db-action"
                      value={selectedNode.data.action || "SAVE_LEAD"}
                      onChange={(e) => updateNodeData(selectedNode.id, { action: e.target.value })}
                      title="Seleccionar acción de base de datos"
                      className="h-11 w-full rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 text-xs font-black text-cyan-400"
                    >
                      <option value="SAVE_LEAD">Guardar/Actualizar Lead</option>
                      <option value="LOAD_CONTEXT">Cargar Contexto Histórico</option>
                      <option value="UPDATE_VAR">Actualizar Variable Global</option>
                      <option value="QUERY_CUSTOM">Consulta Personalizada</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Tabla Destino
                    </label>
                    <input
                      value={selectedNode.data.table || "lead"}
                      onChange={(e) => updateNodeData(selectedNode.id, { table: e.target.value })}
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80"
                      placeholder="Nombre de la tabla..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label
                      htmlFor="db-mapping"
                      className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                    >
                      Mapeo de Datos (Key: Value)
                    </label>
                    <textarea
                      id="db-mapping"
                      value={
                        selectedNode.data.mapping ||
                        '{\n  "nombre": "{{nombre}}",\n  "cualificacion": "{{score}}"\n}'
                      }
                      onChange={(e) => updateNodeData(selectedNode.id, { mapping: e.target.value })}
                      title="Mapeo de datos para la base de datos"
                      placeholder='{\n  "nombre": "{{nombre}}",\n  "cualificacion": "{{score}}"\n}'
                      className="min-h-[100px] w-full rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[10px] text-cyan-200/40 transition-all outline-none focus:text-cyan-200/80"
                    />
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_ai_agent" && (
                <div className="animate-in fade-in slide-in-from-top-4 space-y-6 duration-500">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">
                      Seleccionar Cerebro Agente
                    </label>
                    <select
                      title="Seleccionar Agente de IA"
                      value={(selectedNode.data.agentId as string) || ""}
                      onChange={(e) => {
                        const agent = aiAgents.find((a) => a.id === e.target.value);
                        updateNodeData(selectedNode.id, {
                          agentId: e.target.value,
                          agentName: agent?.name || "Agente sin nombre",
                        });
                      }}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-xs text-white/80 outline-none focus:border-indigo-500/40"
                    >
                      <option value="">-- Seleccionar Agente --</option>
                      {aiAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Exit Criteria Section */}
                  <div className="space-y-4 rounded-[32px] border border-indigo-500/10 bg-indigo-500/[0.03] p-5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
                      <p className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                        Criterio de Salida (Escalamiento)
                      </p>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/30 italic">
                      Define la variable que, al cumplirse, hará que el agente finalice y el flujo
                      continúe al siguiente nodo.
                    </p>

                    <div className="space-y-3 pt-2">
                      <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                        Variable de Disparo
                      </label>
                      <select
                        value={(selectedNode.data.exit_variable as string) || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { exit_variable: e.target.value })
                        }
                        title="Variable que dispara la salida"
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white outline-none"
                      >
                        <option value="">-- Siempre Continuar --</option>
                        <option value="cualificado">Cualificado (True/False)</option>
                        <option value="es_agendable">Es Agendable</option>
                        <option value="interes_confirmado">Interés Confirmado</option>
                        <option value="custom">Variable Personalizada...</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                        Condición de Salida
                      </label>
                      <select
                        value={(selectedNode.data.exit_condition as string) || "is_true"}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { exit_condition: e.target.value })
                        }
                        title="Condición para salir del nodo"
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white outline-none"
                      >
                        <option value="is_true">Es Verdadero (True)</option>
                        <option value="exists">Tiene Valor (Cualquiera)</option>
                        <option value="equals">Es igual a...</option>
                      </select>
                    </div>

                    {selectedNode.data.exit_condition === "equals" && (
                      <div className="space-y-3">
                        <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                          Valor Esperado
                        </label>
                        <input
                          value={(selectedNode.data.exit_value as string) || ""}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, { exit_value: e.target.value })
                          }
                          placeholder="Ej: Si"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                    <p className="text-[10px] leading-relaxed font-medium text-indigo-200/60">
                      Este nodo invocará al agente seleccionado usando su configuración de{" "}
                      <b>Memoria Autónoma</b> y <b>Base de Conocimiento.</b>
                    </p>
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_meta_template" && (
                <div className="space-y-5">
                  {/* Template selector from DB */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-green-400 uppercase">
                      Plantilla Meta (aprobadas)
                    </label>
                    {waTemplates.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-green-500/20 bg-green-500/5 px-4 py-3">
                        <p className="text-[9px] font-semibold text-green-300/60">
                          Sin plantillas sincronizadas.
                        </p>
                        <p className="mt-0.5 text-[8px] text-white/20">
                          Ve a Ajustes → WhatsApp WABA y pulsa &quot;Sincronizar desde Meta&quot;.
                        </p>
                      </div>
                    ) : (
                      <select
                        id="meta-template-select"
                        title="Seleccionar plantilla de WhatsApp"
                        value={(selectedNode.data.templateId as string) || ""}
                        onChange={(e) => {
                          const tpl = waTemplates.find((t) => t.id === e.target.value);
                          updateNodeData(selectedNode.id, {
                            templateId: e.target.value,
                            templateName: tpl?.name || "",
                            language: tpl?.language || "es",
                            templateCategory: tpl?.category || "",
                          });
                        }}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white outline-none focus:border-green-500/40"
                      >
                        <option value="">-- Seleccionar plantilla --</option>
                        {waTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.language}) · {tpl.category}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Show resolved info when a template is selected */}
                  {(selectedNode.data.templateId as string) &&
                    (() => {
                      const tpl = waTemplates.find(
                        (t) => t.id === (selectedNode.data.templateId as string)
                      );
                      if (!tpl) return null;
                      const mappingEntries = Object.entries(tpl.variable_mapping || {});
                      return (
                        <div className="space-y-3 rounded-xl border border-green-500/10 bg-green-500/5 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black tracking-widest text-green-400 uppercase">
                              Info de plantilla
                            </p>
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[8px] font-bold text-green-300 uppercase">
                              {tpl.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px]">
                            <div>
                              <p className="font-bold text-white/30 uppercase">Idioma</p>
                              <p className="font-mono text-green-300">{tpl.language}</p>
                            </div>
                            <div>
                              <p className="font-bold text-white/30 uppercase">Categoría</p>
                              <p className="font-mono text-green-300">{tpl.category}</p>
                            </div>
                          </div>
                          {mappingEntries.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[8px] font-bold text-white/20 uppercase">
                                Variables mapeadas
                              </p>
                              {mappingEntries.map(([idx, field]) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="font-mono text-[9px] text-green-400">{`{{${idx}}}`}</span>
                                  <span className="text-[8px] text-white/40">→</span>
                                  <span className="text-[9px] text-white/60">{field}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {mappingEntries.length === 0 && (
                            <p className="text-[8px] text-amber-400/70 italic">
                              ⚠ Esta plantilla no tiene variables mapeadas aún. Configúralas en
                              Ajustes → WhatsApp WABA.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                </div>
              )}

              {selectedNode.type === "flow_pdf_generator" && (
                <div className="space-y-5">
                  {/* Header info */}
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-rose-400" />
                      <span className="text-[10px] font-black tracking-tighter text-rose-400 uppercase">
                        Generador de PDF · pdf.co
                      </span>
                    </div>
                    <p className="text-[9px] leading-relaxed font-bold text-white/40">
                      Genera un PDF a partir de tu plantilla HTML y lo expone como variable URL para el agente de WhatsApp.
                    </p>
                  </div>

                  {/* Template name */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Nombre de plantilla
                    </label>
                    <input
                      value={(selectedNode.data.pdf_template_name as string) || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { pdf_template_name: e.target.value })}
                      className="h-10 w-full rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 text-xs font-bold text-rose-300 placeholder-white/20"
                      placeholder="Ej: Cotización Grúas"
                    />
                  </div>

                  {/* Output variable name */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-rose-400 uppercase">
                      📤 Variable de Salida (URL del PDF)
                    </label>
                    <input
                      value={(selectedNode.data.pdf_output_variable as string) || "pdf_url"}
                      onChange={(e) => updateNodeData(selectedNode.id, { pdf_output_variable: e.target.value })}
                      className="h-10 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 font-mono text-xs font-bold text-rose-300"
                      placeholder="pdf_url"
                    />
                    <p className="text-[8px] text-white/30 italic">
                      Esta variable queda disponible para el nodo de WhatsApp como <span className="font-mono text-rose-400">{`{{${(selectedNode.data.pdf_output_variable as string) || "pdf_url"}}}`}</span>
                    </p>
                  </div>

                  {/* Filename */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Nombre del archivo PDF
                    </label>
                    <input
                      value={(selectedNode.data.pdf_filename as string) || "cotizacion.pdf"}
                      onChange={(e) => updateNodeData(selectedNode.id, { pdf_filename: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-xs text-white/80"
                      placeholder="cotizacion.pdf"
                    />
                  </div>

                  {/* Paper size */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Tamaño de página
                    </label>
                    <select
                      value={(selectedNode.data.pdf_paper_size as string) || "Letter"}
                      onChange={(e) => updateNodeData(selectedNode.id, { pdf_paper_size: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white/80 outline-none"
                    >
                      <option value="Letter">Letter</option>
                      <option value="A4">A4</option>
                      <option value="Legal">Legal</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>

                  {/* Dynamic variables to inject */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Variables dinámicas (JSON)
                    </label>
                    <textarea
                      value={(selectedNode.data.pdf_variables as string) || JSON.stringify({
                        empresa: "{{empresa}}",
                        cliente: "{{nombre}}",
                        telefono: "{{telefono}}",
                        items: "{{items}}",
                        total: "{{total}}",
                        fecha: "{{fecha}}"
                      }, null, 2)}
                      onChange={(e) => updateNodeData(selectedNode.id, { pdf_variables: e.target.value })}
                      className="min-h-[130px] w-full rounded-2xl border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-white/50 outline-none focus:text-white/80"
                      placeholder='{"empresa": "{{empresa}}", "total": "{{total}}"}'
                    />
                    <p className="text-[8px] text-white/20 italic">
                      Usa <span className="font-mono text-rose-400">{`{{variable}}`}</span> para insertar datos del flujo. Estos reemplazarán los placeholders en tu plantilla HTML.
                    </p>
                  </div>

                  {/* HTML Template */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Plantilla HTML
                    </label>
                    <textarea
                      value={(selectedNode.data.pdf_html_template as string) || `<!DOCTYPE html>
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
    <div class="logo">{{empresa}}</div>
    <div class="subtitle">Cotización para: {{cliente}}</div>
  </div>
  <p>Fecha: {{fecha}} | Tel: {{telefono}}</p>
  <table>
    <thead><tr><th>Ítem</th><th>Cantidad</th><th>Precio</th></tr></thead>
    <tbody>{{items}}</tbody>
  </table>
  <div class="total">Total: $ {{total}}</div>
</body>
</html>`}
                      onChange={(e) => updateNodeData(selectedNode.id, { pdf_html_template: e.target.value })}
                      className="min-h-[220px] w-full rounded-2xl border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-white/50 outline-none focus:text-white/80"
                    />
                    <p className="text-[8px] text-white/20 italic">
                      Escribe tu HTML de cotización. Los <span className="font-mono text-rose-400">{`{{placeholders}}`}</span> se reemplazarán con las variables del flujo antes de generar el PDF.
                    </p>
                  </div>

                  {/* Info box */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[9px] font-bold text-amber-400">
                      ⚙ Configura tu API Key de pdf.co en
                    </p>
                    <p className="mt-0.5 text-[8px] text-white/30">
                      Ajustes → Integraciones → pdf.co
                    </p>
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_ai" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="mb-2 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-400" />
                        <span className="text-[10px] font-black tracking-tighter text-purple-400 uppercase">
                          Cerebro Neural v2.0
                        </span>
                      </div>
                      <p className="text-[9px] leading-relaxed font-bold text-white/40 italic">
                        Configura aquí la lógica cognitiva de este bloque.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label
                        htmlFor="ai-mission"
                        className="text-[9px] font-black tracking-widest text-white/30 uppercase"
                      >
                        Misión del Cerebro
                      </label>
                      <select
                        id="ai-mission"
                        title="Misión del Cerebro"
                        value={selectedNode.data.task || "custom"}
                        onChange={(e) => updateNodeData(selectedNode.id, { task: e.target.value })}
                        className="relative h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 px-8 text-xs font-bold text-white outline-none focus:border-purple-500/50"
                      >
                        <option value="custom" className="bg-slate-900">
                          🧠 Prompt Libre (Libertad Total)
                        </option>
                        <option value="sentiment" className="bg-slate-900">
                          🎭 Análisis de Sentimiento
                        </option>
                        <option value="scoring" className="bg-slate-900">
                          ⭐ Puntuación de Lead (0-100)
                        </option>
                        <option value="summary" className="bg-slate-900">
                          📝 Resumir Conversación
                        </option>
                        <option value="extraction" className="bg-slate-900">
                          🔍 Extraer Datos (JSON)
                        </option>
                        <option value="classification" className="bg-slate-900">
                          🏷️ Clasificar por Categoría
                        </option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black tracking-widest text-purple-400 uppercase">
                          Instrucciones / Brain Prompt
                        </label>
                        <Sparkles className="h-3 w-3 animate-pulse text-purple-400" />
                      </div>
                      <textarea
                        value={selectedNode.data.instructions || ""}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, { instructions: e.target.value })
                        }
                        className="min-h-[200px] w-full rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 font-mono text-[11px] leading-relaxed text-purple-100 transition-all outline-none focus:border-purple-500"
                        placeholder="Define aquí exactamente qué debe hacer la IA... Ej: 'Si el cliente pregunta por precios, dile que tenemos un descuento del 20% solo por hoy y guarda esto en la variable PROMO'."
                      />
                      <p className="mt-1 text-[8px] font-black tracking-tighter text-white/20 uppercase">
                        Este prompt es el cerebro del flujo. Tienes libertad total para programarlo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.type === "flow_book" && (
                <div className="animate-in fade-in slide-in-from-top-4 space-y-6 duration-500">
                  <div className="space-y-4 rounded-[32px] border border-amber-500/10 bg-amber-500/5 p-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase">
                        Configuración de Agendado
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                        Horario Disponible
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-white/20 uppercase">
                            Desde
                          </span>
                          <input
                            type="time"
                            title="Hora de inicio disponible"
                            value={(selectedNode.data.start_time as string) || "09:00"}
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, { start_time: e.target.value })
                            }
                            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-white/20 uppercase">
                            Hasta
                          </span>
                          <input
                            type="time"
                            title="Hora de fin disponible"
                            value={(selectedNode.data.end_time as string) || "18:00"}
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, { end_time: e.target.value })
                            }
                            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black tracking-widest text-white/40 uppercase">
                        Intervalo de Citas
                      </label>
                      <select
                        title="Duración de la cita"
                        value={(selectedNode.data.slot_duration as number) || 30}
                        onChange={(e) =>
                          updateNodeData(selectedNode.id, {
                            slot_duration: parseInt(e.target.value),
                          })
                        }
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-white outline-none"
                      >
                        <option value="15">15 Minutos</option>
                        <option value="30">30 Minutos</option>
                        <option value="45">45 Minutos</option>
                        <option value="60">1 Hora</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <p className="text-[10px] font-black tracking-tight uppercase">
                          Requiere Asesor
                        </p>
                        <p className="mt-0.5 text-[8px] font-bold text-white/20 uppercase">
                          Asignar automáticamente
                        </p>
                      </div>
                      <button
                        title={
                          selectedNode.data.require_advisor
                            ? "Desactivar requerimiento de asesor"
                            : "Activar requerimiento de asesor"
                        }
                        onClick={() =>
                          updateNodeData(selectedNode.id, {
                            require_advisor: !selectedNode.data.require_advisor,
                          })
                        }
                        className={cn(
                          "relative h-5 w-10 rounded-full transition-all",
                          selectedNode.data.require_advisor ? "bg-amber-500" : "bg-white/10"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                            selectedNode.data.require_advisor ? "right-1" : "left-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-[10px] leading-relaxed font-medium text-amber-200/60">
                      Este bloque cerrará la conversación y confirmará la cita según la
                      disponibilidad detectada en este rango horario.
                    </p>
                  </div>
                </div>
              )}
              {/* ── CRM Connect Node Properties ── */}
              {selectedNode.type === "flow_crm_connect" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Plataforma / CRM
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "zoho", label: "Zoho CRM", emoji: "🔴" },
                          { value: "hubspot", label: "HubSpot", emoji: "🟠" },
                          { value: "salesforce", label: "Salesforce", emoji: "🔵" },
                          { value: "pipedrive", label: "Pipedrive", emoji: "🟢" },
                          { value: "custom", label: "API Custom", emoji: "⚙️" },
                        ] as const
                      ).map((p) => {
                        const pal = CRM_PLATFORM_COLORS[p.value];
                        const isActive =
                          ((selectedNode.data.platform as string) || "zoho") === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => updateNodeData(selectedNode.id, { platform: p.value })}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-left text-[10px] font-black tracking-wide uppercase transition-all",
                              isActive
                                ? cn(pal.bg, pal.color, pal.border)
                                : "border-white/5 bg-white/5 text-white/30 hover:bg-white/10"
                            )}
                          >
                            {p.emoji} {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      Operación
                    </label>
                    <select
                      value={(selectedNode.data.operation as string) || "CREATE_OR_UPDATE_CONTACT"}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, { operation: e.target.value })
                      }
                      title="Seleccionar operación CRM"
                      className="h-11 w-full rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 text-[10px] font-black text-violet-400"
                    >
                      <option value="CREATE_OR_UPDATE_CONTACT">
                        📋 Crear / Actualizar Contacto
                      </option>
                      <option value="CREATE_LEAD">➕ Crear Lead</option>
                      <option value="UPDATE_DEAL">💼 Actualizar Negocio / Deal</option>
                      <option value="SEARCH_CONTACT">🔍 Buscar Contacto</option>
                      <option value="ADD_TAG">🏷️ Añadir Etiqueta</option>
                      <option value="CUSTOM_WEBHOOK">🔗 Webhook Personalizado</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      URL Base del CRM / API
                    </label>
                    <input
                      value={(selectedNode.data.api_url as string) || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { api_url: e.target.value })}
                      placeholder="https://www.zohoapis.com/crm/v2/..."
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-[10px] text-white/70 outline-none focus:border-violet-500/40"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                      API Key / Bearer Token
                    </label>
                    <input
                      type="password"
                      value={(selectedNode.data.api_key as string) || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { api_key: e.target.value })}
                      placeholder="••••••••••••"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-[10px] text-white/70 outline-none focus:border-violet-500/40"
                    />
                    <p className="text-[8px] text-white/20 italic">
                      Authorization: Bearer &#123;token&#125;
                    </p>
                  </div>

                  {/* Simulation Panel for CRM */}
                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black tracking-widest text-violet-400 uppercase">
                        Test de Sincronización
                      </label>
                      {nodeSimulations[selectedNode.id]?.timestamp && (
                        <span className="text-[8px] text-white/20">
                          Sync: {nodeSimulations[selectedNode.id].timestamp}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleTestNode(selectedNode)}
                      disabled={nodeSimulations[selectedNode.id]?.status === "loading"}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-[10px] font-black tracking-widest text-violet-400 uppercase transition-all hover:bg-violet-500/20 disabled:opacity-50"
                    >
                      {nodeSimulations[selectedNode.id]?.status === "loading" ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                      {nodeSimulations[selectedNode.id]?.status === "loading"
                        ? "Probando..."
                        : "Verificar Conexión"}
                    </button>

                    {nodeSimulations[selectedNode.id]?.status === "success" && (
                      <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div className="space-y-3 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-tighter text-indigo-400 uppercase">
                              Sincronización Exitosa
                            </span>
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[8px] font-black tracking-widest text-white/30 uppercase">
                              Payload Enviado:
                            </p>
                            <pre className="max-h-[100px] overflow-x-auto rounded-lg bg-black/20 p-2 font-mono text-[9px] text-indigo-200/60">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {JSON.stringify(
                                (nodeSimulations[selectedNode.id].request as any)?.mappings,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                          <div className="border-t border-white/5 pt-2">
                            <div className="flex items-center justify-between text-[8px] font-bold">
                              <span className="tracking-widest text-white/20 uppercase">
                                ID Generado:
                              </span>
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              <span className="font-mono text-indigo-400">
                                {(nodeSimulations[selectedNode.id].result as any)?.crm_id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-white/5 pt-8">
              <div className="bg-primary/5 border-primary/10 rounded-2xl border p-4">
                <p className="text-primary mb-1 text-[10px] font-black tracking-widest uppercase italic">
                  Recordatorio
                </p>
                <p className="text-[10px] leading-relaxed font-bold text-white/40">
                  Los cambios en las propiedades se aplican instantáneamente al nodo en el canvas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({
  onClick,
  icon: Icon,
  title,
  color,
}: {
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 shadow-lg transition-all hover:scale-110 active:scale-90",
        color
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
