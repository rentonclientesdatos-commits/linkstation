"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  MessageSquare,
  Phone,
  PhoneCall,
  Globe,
  Sparkles,
  ChevronRight,
  Clock,
  User,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { PipelineLead, PipelineStage } from "@/lib/actions/pipeline";

interface PipelineCardProps {
  lead: PipelineLead;
  stages: PipelineStage[];
  currentStage: PipelineStage;
  onMoveToStage: (leadId: string, newSegmentKey: string) => void;
  isJustMoved?: boolean;
}

export function PipelineCard({
  lead,
  stages,
  currentStage,
  onMoveToStage,
  isJustMoved = false,
}: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: {
      lead,
      currentSegmentKey: currentStage.segmentKey,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  // Format initials
  const fullName = `${lead.nombre || ""} ${lead.apellido || ""}`.trim() || "Lead sin nombre";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "L";

  // Channel badge
  const originLower = (lead.origen || "").toLowerCase();
  const getChannelBadge = () => {
    if (originLower.includes("whatsapp") || originLower.includes("wsp")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
          <MessageSquare className="h-3 w-3" /> WhatsApp
        </span>
      );
    }
    if (originLower.includes("instagram") || originLower.includes("ig")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-pink-400 border border-pink-500/20">
          Instagram
        </span>
      );
    }
    if (originLower.includes("voz") || originLower.includes("llamada") || originLower.includes("call")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
          <PhoneCall className="h-3 w-3" /> Llamada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
        <Globe className="h-3 w-3" /> {lead.origen || "Web"}
      </span>
    );
  };

  // Time elapsed
  const getRelativeTime = () => {
    const time = lead.fecha_actualizacion || lead.fecha_creacion;
    if (!time) return "Reciente";
    const diffMin = Math.floor((Date.now() - new Date(time).getTime()) / 60000);
    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-grab active:cursor-grabbing rounded-2xl border p-3.5 transition-all duration-200 select-none ${
        isDragging
          ? "border-primary/60 bg-slate-900/90 shadow-2xl scale-105 opacity-90 ring-2 ring-primary/40 backdrop-blur-md"
          : isJustMoved
          ? "border-emerald-500/60 bg-emerald-950/20 shadow-lg ring-1 ring-emerald-500/40"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] hover:shadow-md"
      }`}
    >
      {/* Glow highlight for automatic stage transitions */}
      {isJustMoved && (
        <div className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
      )}

      {/* Top row: Avatar + Name + Relative time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-xs font-bold text-white border border-white/10">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-xs font-semibold text-white/95 group-hover:text-primary transition-colors">
              {fullName}
            </h4>
            {lead.telefono && (
              <p className="flex items-center gap-1 text-[11px] text-white/40 truncate">
                <Phone className="h-2.5 w-2.5 shrink-0" />
                {lead.telefono}
              </p>
            )}
          </div>
        </div>

        <span className="shrink-0 flex items-center gap-1 text-[10px] text-white/30 font-medium">
          <Clock className="h-2.5 w-2.5" />
          {getRelativeTime()}
        </span>
      </div>

      {/* Middle row: Badges (Channel, AI Status, Campaign) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {getChannelBadge()}

        {lead.is_ai_enabled && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
              lead.is_ai_paused
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            }`}
            title={lead.is_ai_paused ? "IA en Pausa (Intervención humana)" : "IA Atendiendo activamente"}
          >
            <Sparkles className="h-2.5 w-2.5" />
            {lead.is_ai_paused ? "Pausa" : "IA Activa"}
          </span>
        )}

        {lead.campana && (
          <span className="inline-flex items-center rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/60 border border-white/5 truncate max-w-[120px]">
            {lead.campana}
          </span>
        )}
      </div>

      {/* Bottom row: Quick stage mover & Link to chat */}
      <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
        {/* Quick Stage Selector */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <select
            value={currentStage.segmentKey}
            onChange={(e) => onMoveToStage(lead.id, e.target.value)}
            title="Cambiar etapa manualmente"
            className="h-6 rounded-lg border border-white/10 bg-slate-900/80 px-2 text-[10px] font-medium text-white/70 outline-none hover:border-white/20 focus:border-primary/50 transition-colors"
          >
            {stages.map((st) => (
              <option key={st.id} value={st.segmentKey} className="bg-slate-900 text-white">
                → {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* Link to Lead Details / Chat */}
        <Link
          href={`/dashboard/conversaciones?leadId=${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-white/40 hover:text-white transition-colors"
          title="Ver conversación en bandeja de entrada"
        >
          <span>Chat</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
