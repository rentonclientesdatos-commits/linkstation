"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Zap,
  Clock,
  Phone,
  MessageSquare,
  BrainCircuit,
  Globe,
  GitBranchPlus,
  Webhook,
  Reply,
  Hourglass,
  Timer,
  Bot,
  CheckCircle2,
  ArrowRightLeft,
  Sun,
  Moon,
  FileDown,
} from "lucide-react";
import { BaseNode } from "./BaseNode";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface NodeProps {
  data: any;
  selected?: boolean;
}

// ─── DÍAS MAP ─────────────────────────────────────────────────────
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ─── LEAD TRIGGER NODE ────────────────────────────────────────────
export const LeadTriggerNode = memo(({ data, selected }: NodeProps) => {
  const source = data.config?.source || "Cualquier Origen";
  const campaign = data.config?.campaignFilter || "Todas las Campañas";

  return (
    <BaseNode
      label="Disparador (Trigger)"
      icon={<Zap className="h-4 w-4" />}
      colorClass="bg-orange-500"
      selected={selected}
    >
      <div className="flex flex-col gap-2">
        <p className="truncate text-[11px] leading-relaxed font-bold opacity-80">
          Origen: <span className="text-orange-300">{source}</span>
        </p>
        <div className="rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[10px] break-all">
          Campaña: {campaign}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400/60">
          <Globe className="h-3 w-3" />
          Se activa al entrar el Lead
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 border-2 border-white bg-orange-500"
      />
    </BaseNode>
  );
});

// ─── TIME CONDITION NODE ⭐ NUEVO ─────────────────────────────────
export const TimeConditionNode = memo(({ data, selected }: NodeProps) => {
  const start = data.config?.start || "09:00";
  const end = data.config?.end || "20:00";
  const workingDays: number[] = data.config?.working_days || [1, 2, 3, 4, 5];

  return (
    <div
      className={cn(
        "min-w-[260px] rounded-2xl border-2 bg-black/80 shadow-2xl backdrop-blur-xl transition-all duration-300",
        selected
          ? "scale-105 border-yellow-400 ring-4 ring-yellow-400/20"
          : "border-yellow-500/30 hover:border-yellow-500/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 rounded-t-2xl border-b border-white/5 bg-yellow-500/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-400">
          <Timer className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-bold tracking-tight text-white/90 uppercase">
            Condición Horaria
          </span>
        </div>
        <ArrowRightLeft className="h-3.5 w-3.5 text-yellow-400/50" />
      </div>

      {/* Content */}
      <div className="space-y-3 p-4 text-xs text-white/60">
        {/* Time Range */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <Sun className="h-3 w-3 text-emerald-400" />
            <span className="text-sm font-black text-emerald-400 tabular-nums">{start}</span>
          </div>
          <div className="font-bold text-white/20">→</div>
          <div className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2">
            <Moon className="h-3 w-3 text-blue-400" />
            <span className="text-sm font-black text-blue-400 tabular-nums">{end}</span>
          </div>
        </div>

        {/* Working Days */}
        <div className="flex flex-wrap gap-1">
          {DAYS.map((d, i) => (
            <span
              key={i}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[9px] font-black",
                workingDays.includes(i)
                  ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-300"
                  : "border-white/5 bg-white/5 text-white/20"
              )}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Timezone Auto Note */}
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-[9px] leading-relaxed font-bold text-white/30">
          🌍 Se adapta al huso horario del lead según prefijo telefónico (+34, +52, +57...)
        </div>
      </div>

      {/* Footer decoration */}
      <div className="mx-auto mb-1 h-1 w-1/3 rounded-full bg-yellow-400/40 opacity-20" />

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 border-2 border-white bg-yellow-500"
      />

      {/* Bottom handles row */}
      <div className="relative h-8 w-full">
        {/* Output A - Dentro del horario (left 30%) */}
        <div className="absolute bottom-0 left-[30%] -translate-x-1/2">
          <Handle
            type="source"
            id="in-hours"
            position={Position.Bottom}
            className="!relative !bottom-0 !left-0 h-3 w-3 border-2 border-white bg-emerald-500"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap text-emerald-400 uppercase">
            Horario ✓
          </span>
        </div>

        {/* Output B - Fuera del horario (left 70%) */}
        <div className="absolute bottom-0 left-[70%] -translate-x-1/2">
          <Handle
            type="source"
            id="out-of-hours"
            position={Position.Bottom}
            className="!relative !bottom-0 !left-0 h-3 w-3 border-2 border-white bg-blue-500"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap text-blue-400 uppercase">
            Fuera ✗
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── CONDITION NODE (IF/ELSE) ⭐ NUEVO ────────────────────────────
export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const variable = data.config?.variable || "{{call.answered}}";
  const operator = data.config?.operator || "==";
  const value = data.config?.value || "true";

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-2xl border-2 bg-black/80 shadow-2xl backdrop-blur-xl transition-all duration-300",
        selected
          ? "scale-105 border-indigo-400 ring-4 ring-indigo-400/20"
          : "border-indigo-500/30 hover:border-indigo-500/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 rounded-t-2xl border-b border-white/5 bg-indigo-500/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
          <GitBranchPlus className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white/90 uppercase">
          Condición (If/Else)
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2 p-4 text-center">
        <div className="truncate rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 font-mono text-[10px] text-indigo-300">
          {variable} {operator} {value}
        </div>
        <div className="mt-1 text-[9px] italic opacity-40">
          Evalúa el estado para bifurcar el flujo
        </div>
      </div>

      <div className="mx-auto mb-1 h-1 w-1/3 rounded-full bg-indigo-400/40 opacity-20" />

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 border-2 border-white bg-indigo-500"
      />

      {/* Bottom handles row */}
      <div className="relative h-8 w-full">
        <div className="absolute bottom-0 left-[30%] -translate-x-1/2">
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            className="!relative !bottom-0 !left-0 h-3 w-3 border-2 border-white bg-emerald-500"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap text-emerald-400 uppercase">
            Sí (True)
          </span>
        </div>

        <div className="absolute bottom-0 left-[70%] -translate-x-1/2">
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            className="!relative !bottom-0 !left-0 h-3 w-3 border-2 border-white bg-rose-500"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap text-rose-400 uppercase">
            No (False)
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── VOICE CALL NODE ⭐ NUEVO ──────────────────────────────────────
export const VoiceCallNode = memo(({ data, selected }: NodeProps) => {
  const agentName = data.config?.agentName || "Sin Agente Configurado";
  const provider = data.config?.provider || "retell";

  return (
    <BaseNode
      label="Llamada IA"
      icon={<Phone className="h-4 w-4" />}
      colorClass="bg-blue-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-blue-500 bg-white"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase",
              provider === "retell"
                ? "border-blue-500/30 bg-blue-500/20 text-blue-400"
                : "border-violet-500/30 bg-violet-500/20 text-violet-400"
            )}
          >
            {provider === "retell" ? "RETELL" : "ULTRAVOX"}
          </span>
          <p className="truncate text-[11px] font-bold text-white/90">{agentName}</p>
        </div>
        <div className="text-[9px] italic opacity-40">Voice AI Agent → Lead qualificación</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-blue-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── TEXT AGENT NODE ⭐ NUEVO ──────────────────────────────────────
export const TextAgentNode = memo(({ data, selected }: NodeProps) => {
  const agentName = data.config?.agentName || "Sin Agente Configurado";
  const prompt = data.config?.prompt;

  return (
    <BaseNode
      label="Agente de Texto"
      icon={<Bot className="h-4 w-4" />}
      colorClass="bg-purple-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-purple-500 bg-white"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
            <BrainCircuit className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <p className="truncate text-[11px] font-bold text-white/90">{agentName}</p>
        </div>
        {prompt && (
          <p className="line-clamp-2 text-[10px] italic opacity-50">&quot;{prompt}&quot;</p>
        )}
        <div className="text-[9px] italic opacity-40">AI Text Agent → Conversación asincrónica</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-purple-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── WHATSAPP NODE (mejorado) ─────────────────────────────────────
export const WhatsAppNode = memo(({ data, selected }: NodeProps) => {
  const templateName = data.config?.templateId || data.config?.template || "Sin Plantilla";

  return (
    <BaseNode
      label="WhatsApp"
      icon={<MessageSquare className="h-4 w-4" />}
      colorClass="bg-emerald-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-emerald-500 bg-white"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 uppercase">
            META API
          </span>
          <p className="truncate font-mono text-[10px] text-white/70">{templateName}</p>
        </div>
        {data.config?.variables && (
          <div className="text-[9px] italic opacity-40">
            Variables: {JSON.stringify(data.config.variables).slice(0, 40)}...
          </div>
        )}
        <div className="text-[9px] italic opacity-40">Template → Cloud API v20.0</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-emerald-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── LLM NODE (AI Logic – backward compat) ────────────────────────
export const LLMNode = memo(({ data, selected }: NodeProps) => {
  return (
    <BaseNode
      label="Agente de Texto"
      icon={<BrainCircuit className="h-4 w-4" />}
      colorClass="bg-purple-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-purple-500 bg-white"
      />
      <div className="space-y-2">
        <p className="font-bold text-white/90">Razonamiento AI</p>
        <p className="line-clamp-2 text-[10px] italic opacity-50">
          &quot;{data.config?.prompt || "Analizar intención del lead..."}&quot;
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-purple-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── API REQUEST NODE ─────────────────────────────────────────────
export const APINode = memo(({ data, selected }: NodeProps) => {
  return (
    <BaseNode
      label="Petición API"
      icon={<Globe className="h-4 w-4" />}
      colorClass="bg-cyan-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-cyan-500 bg-white"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400 uppercase">
            POST
          </span>
          <p className="truncate font-mono text-[10px]">
            {data.config?.url || "https://api.crm.com/v1"}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-cyan-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── SUB-WORKFLOW NODE ────────────────────────────────────────────
export const SubWorkflowNode = memo(({ data, selected }: NodeProps) => {
  return (
    <BaseNode
      label="Vincular Flujo"
      icon={<GitBranchPlus className="h-4 w-4" />}
      colorClass="bg-pink-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-pink-500 bg-white"
      />
      <div className="space-y-2">
        <p className="font-bold text-white/90">Disparar Sub-Workflow</p>
        <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-2 text-[9px] font-black tracking-widest text-pink-400 uppercase">
          {data.config?.targetWorkflowId || "SELECCIONAR FLUJO"}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-pink-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── DELAY NODE ───────────────────────────────────────────────────
export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const hours = data.config?.duration || data.config?.hours || 2;
  return (
    <BaseNode
      label="Espera"
      icon={<Clock className="h-4 w-4" />}
      colorClass="bg-amber-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-amber-500 bg-white"
      />
      <div className="flex h-12 items-center justify-center py-2">
        <span className="text-2xl font-black tabular-nums">{hours}H</span>
      </div>
      <div className="text-center text-[9px] italic opacity-30">
        Espera antes del siguiente paso
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-amber-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── WEBHOOK TRIGGER NODE ─────────────────────────────────────────
export const WebhookNode = memo(({ data, selected }: NodeProps) => {
  const method = data.config?.method || "POST";
  return (
    <BaseNode
      label="Webhook (Entrada)"
      icon={<Webhook className="h-4 w-4" />}
      colorClass="bg-orange-600"
      selected={selected}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase",
              method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
            )}
          >
            {method}
          </span>
          <p className="truncate font-mono text-[9px] opacity-60">
            /{data.config?.path || "webhook"}
          </p>
        </div>
        <div className="truncate rounded-md border border-white/5 bg-black/40 p-1 px-2 font-mono text-[8px] text-white/40 italic">
          Configura la URL en el panel
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-orange-600 bg-white opacity-20"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-orange-600 bg-white"
      />
    </BaseNode>
  );
});

// ─── WEBHOOK RESPONSE NODE ────────────────────────────────────────
export const WebhookResponseNode = memo(({ data, selected }: NodeProps) => {
  return (
    <BaseNode
      label="Respuesta Webhook"
      icon={<Reply className="h-4 w-4" />}
      colorClass="bg-indigo-600"
      selected={selected}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
            HTTP {data.config?.statusCode || 200}
          </span>
          <p className="truncate font-mono text-[9px] opacity-50">JSON Response</p>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-indigo-600 bg-white"
      />
    </BaseNode>
  );
});

// ─── WEBHOOK WAIT NODE ────────────────────────────────────────────
export const WebhookWaitNode = memo(({ selected }: NodeProps) => {
  return (
    <BaseNode
      label="Espera Callback"
      icon={<Hourglass className="h-4 w-4" />}
      colorClass="bg-pink-600"
      selected={selected}
    >
      <div className="space-y-2">
        <p className="text-[10px] leading-tight font-bold opacity-80">Pausa hasta recibir señal</p>
        <div className="rounded border border-pink-500/20 bg-black/40 p-1 px-2 font-mono text-[8px] text-pink-400/80 italic">
          URL dinámica generada
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-pink-600 bg-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-pink-600 bg-white"
      />
    </BaseNode>
  );
});

// ─── END NODE ⭐ NUEVO ────────────────────────────────────────────
export const EndNode = memo(({ selected }: NodeProps) => {
  return (
    <div
      className={cn(
        "min-w-[180px] rounded-2xl border-2 bg-black/80 shadow-2xl backdrop-blur-xl transition-all duration-300",
        selected
          ? "scale-105 border-gray-400 ring-4 ring-gray-400/20"
          : "border-white/10 hover:border-white/20"
      )}
    >
      <div className="flex items-center gap-2.5 rounded-t-2xl border-b border-white/5 bg-gray-500/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-500/20 text-gray-400">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white/90 uppercase">
          Fin de Flujo
        </span>
      </div>
      <div className="p-4 text-center text-xs text-white/30 italic">
        El lead ha completado esta secuencia
      </div>
      <div className="mx-auto mb-1 h-1 w-1/3 rounded-full bg-gray-400/40 opacity-20" />
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-gray-500 bg-white"
      />
    </div>
  );
});

// ─── RETRY SEQUENCE NODE ⭐ NUEVO (v5.1) ─────────────────────────
export const RetrySequenceNode = memo(({ data, selected }: NodeProps) => {
  const maxAttempts = data.config?.maxAttempts || 5;
  const delayHours = data.config?.retryDelayHours || 27;
  const channels = data.config?.channels || ["call", "whatsapp"];

  return (
    <div
      className={cn(
        "min-w-[240px] overflow-hidden rounded-2xl border-2 bg-black/80 shadow-2xl backdrop-blur-xl transition-all duration-300",
        selected
          ? "scale-105 border-orange-500 ring-4 ring-orange-500/20"
          : "border-orange-500/30 hover:border-orange-500/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/5 bg-orange-500/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm leading-none font-bold tracking-tight text-white/90 uppercase">
            Bucle de Contacto
          </span>
          <span className="mt-0.5 text-[9px] font-black tracking-widest text-orange-400 uppercase">
            Auto-Retry Engine
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 text-center">
            <p className="mb-1 text-[8px] font-black text-white/30 uppercase">Intentos</p>
            <p className="text-lg font-black text-white tabular-nums">{maxAttempts}x</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 text-center">
            <p className="mb-1 text-[8px] font-black text-white/30 uppercase">Intervalo</p>
            <p className="text-lg font-black text-white tabular-nums">{delayHours}H</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {channels.map((c: string) => (
            <div
              key={c}
              className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[9px] font-black text-orange-400 uppercase"
            >
              {c === "call" ? <Phone className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
              {c}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-orange-500/20 bg-orange-500/5 p-2 text-center text-[9px] leading-relaxed font-bold text-orange-400/60">
          Finaliza tras {maxAttempts} intentos sin éxito o al cualificar.
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-orange-500 bg-white"
      />

      {/* Bottom handles row */}
      <div className="relative h-8 w-full">
        {/* Output A - Vía Llamada (left 30%) */}
        <div className="absolute bottom-0 left-[30%] -translate-x-1/2">
          <Handle
            type="source"
            id="call"
            position={Position.Bottom}
            className="!relative !bottom-0 !left-0 h-3 w-3 border-2 border-white bg-blue-500"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap text-blue-400 uppercase">
            Llamada
          </span>
        </div>

        {/* Output B - Vía WhatsApp (left 70%) */}
        <div className="absolute bottom-0 left-[70%] -translate-x-1/2">
          <Handle
            type="source"
            id="whatsapp"
            position={Position.Bottom}
            className="!relative !bottom-0 !left-0 h-3 w-3 border-2 border-white bg-emerald-500"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider whitespace-nowrap text-emerald-400 uppercase">
            WhatsApp
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── ACTION NODE (backward compat) ───────────────────────────────
export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const isCall = data.action === "CALL";
  return (
    <BaseNode
      label={isCall ? "Llamada IA" : "WhatsApp"}
      icon={isCall ? <Phone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
      colorClass={isCall ? "bg-blue-500" : "bg-emerald-500"}
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-blue-500 bg-white"
      />
      <div className="space-y-2">
        <p className="truncate font-bold text-white/90">
          {data.config?.agentId || data.config?.templateId || "Sin Configurar"}
        </p>
        <div className="text-[10px] italic opacity-40">
          Target: {isCall ? "Voice AI Agent" : "Meta Template v1"}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-blue-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── PDF GENERATOR NODE ──────────────────────────────────────────
export const PdfGeneratorNode = memo(({ data, selected }: NodeProps) => {
  const templateName = data.config?.pdf_template_name || data.pdf_template_name || "Cotización";
  const outputVar = data.config?.pdf_output_variable || data.pdf_output_variable || "pdf_url";
  const filename = data.config?.pdf_filename || data.pdf_filename || "documento.pdf";

  return (
    <BaseNode
      label="Crear PDF"
      icon={<FileDown className="h-4 w-4" />}
      colorClass="bg-rose-500"
      selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border border-rose-500 bg-white"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded border border-rose-500/30 bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-bold text-rose-400 uppercase">
            PDF.CO
          </span>
          <p className="truncate font-mono text-[10px] text-white/90">{templateName}</p>
        </div>
        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-2 py-1 font-mono text-[9px] text-rose-300">
          Salida: {`{{${outputVar}}}`}
        </div>
        <div className="truncate text-[9px] italic opacity-40">{filename}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border border-rose-500 bg-white"
      />
    </BaseNode>
  );
});

// ─── Display Names ────────────────────────────────────────────────
PdfGeneratorNode.displayName = "PdfGeneratorNode";
LeadTriggerNode.displayName = "LeadTriggerNode";
TimeConditionNode.displayName = "TimeConditionNode";
ConditionNode.displayName = "ConditionNode";
VoiceCallNode.displayName = "VoiceCallNode";
TextAgentNode.displayName = "TextAgentNode";
WhatsAppNode.displayName = "WhatsAppNode";
ActionNode.displayName = "ActionNode";
LLMNode.displayName = "LLMNode";
APINode.displayName = "APINode";
SubWorkflowNode.displayName = "SubWorkflowNode";
DelayNode.displayName = "DelayNode";
WebhookNode.displayName = "WebhookNode";
WebhookResponseNode.displayName = "WebhookResponseNode";
WebhookWaitNode.displayName = "WebhookWaitNode";
EndNode.displayName = "EndNode";
RetrySequenceNode.displayName = "RetrySequenceNode";
