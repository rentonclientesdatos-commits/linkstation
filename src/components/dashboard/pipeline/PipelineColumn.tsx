"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { PipelineCard } from "./PipelineCard";
import type { PipelineLead, PipelineStage } from "@/lib/actions/pipeline";

interface PipelineColumnProps {
  stage: PipelineStage;
  leads: PipelineLead[];
  allStages: PipelineStage[];
  totalLeadsCount: number;
  onMoveToStage: (leadId: string, newSegmentKey: string) => void;
  movedLeadIds?: Set<string>;
}

const COLOR_MAP: Record<PipelineStage["color"], { border: string; bg: string; text: string; dot: string; bar: string }> = {
  blue: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    text: "text-blue-400",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  indigo: {
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
    text: "text-indigo-400",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
  },
  purple: {
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
    text: "text-purple-400",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
  },
  emerald: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    text: "text-amber-400",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  rose: {
    border: "border-rose-500/20",
    bg: "bg-rose-500/5",
    text: "text-rose-400",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  teal: {
    border: "border-teal-500/20",
    bg: "bg-teal-500/5",
    text: "text-teal-400",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },
  cyan: {
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/5",
    text: "text-cyan-400",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },
  slate: {
    border: "border-slate-500/20",
    bg: "bg-slate-500/5",
    text: "text-slate-400",
    dot: "bg-slate-400",
    bar: "bg-slate-500",
  },
};

export function PipelineColumn({
  stage,
  leads,
  allStages,
  totalLeadsCount,
  onMoveToStage,
  movedLeadIds,
}: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: {
      stage,
      segmentKey: stage.segmentKey,
    },
  });

  const colorConfig = COLOR_MAP[stage.color] || COLOR_MAP.blue;
  const percentage = totalLeadsCount > 0 ? Math.round((leads.length / totalLeadsCount) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-full shrink-0 rounded-3xl border ${
        isOver
          ? "border-primary/50 bg-primary/[0.04] ring-2 ring-primary/20"
          : "border-white/10 bg-slate-950/40"
      } p-3.5 transition-all duration-200 backdrop-blur-sm`}
    >
      {/* Column Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`h-2.5 w-2.5 rounded-full ${colorConfig.dot} shadow-sm shrink-0`} />
            <h3 className="truncate text-xs font-bold uppercase tracking-wider text-white/90">
              {stage.name}
            </h3>
          </div>
          <span className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/80">
            {leads.length}
          </span>
        </div>

        {/* Progress Bar & Subtitle */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/40">
          <span className="truncate">{stage.segmentKey}</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full ${colorConfig.bar} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Cards Scrollable Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[620px] min-h-[140px] custom-scrollbar">
        {leads.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-4 text-center">
            <p className="text-[11px] text-white/30">Sin prospectos en esta etapa</p>
            <p className="mt-1 text-[9px] text-white/20">Arrastra un lead aquí para moverlo</p>
          </div>
        ) : (
          leads.map((lead) => (
            <PipelineCard
              key={lead.id}
              lead={lead}
              stages={allStages}
              currentStage={stage}
              onMoveToStage={onMoveToStage}
              isJustMoved={movedLeadIds?.has(lead.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
