"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Users,
  Layers,
  ArrowRight,
} from "lucide-react";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineStageEditorModal } from "./PipelineStageEditorModal";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  updateLeadStage,
  savePipelineStages,
  getPipelineData,
  type PipelineLead,
  type PipelineStage,
} from "@/lib/actions/pipeline";

interface PipelineManagerProps {
  initialStages: PipelineStage[];
  initialLeads: PipelineLead[];
  tenantId: string;
  isAdmin?: boolean;
}

export function PipelineManager({
  initialStages,
  initialLeads,
  tenantId,
  isAdmin = false,
}: PipelineManagerProps) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [leads, setLeads] = useState<PipelineLead[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentlyMovedLeadIds, setRecentlyMovedLeadIds] = useState<Set<string>>(new Set());

  // Configure drag sensors with a distance constraint to prevent accidental drags on clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  // Trigger temporary glow pulse on a moved lead
  const highlightMovedLead = useCallback((leadId: string) => {
    setRecentlyMovedLeadIds((prev) => {
      const next = new Set(prev);
      next.add(leadId);
      return next;
    });

    setTimeout(() => {
      setRecentlyMovedLeadIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }, 4500);
  }, []);

  // ─── REALTIME SUPABASE SUBSCRIPTION ─────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;

    const supabase = getSupabaseClient();
    const channelName = `pipeline-realtime-${tenantId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lead",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const updated = payload.new as PipelineLead;
          if (!updated?.id) return;

          setLeads((prev) => {
            const existing = prev.find((l) => l.id === updated.id);
            if (existing && existing.segmentacion !== updated.segmentacion) {
              highlightMovedLead(updated.id);
            }
            return prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l));
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const inserted = payload.new as PipelineLead;
          if (!inserted?.id) return;

          setLeads((prev) => [inserted, ...prev.filter((l) => l.id !== inserted.id)]);
          highlightMovedLead(inserted.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, highlightMovedLead]);

  // ─── POLLING FALLBACK REFRESH ──────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await getPipelineData();
      if (res.success && res.leads) {
        setLeads(res.leads);
        if (res.stages) setStages(res.stages);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 15000); // 15 seconds polling sync

    return () => clearInterval(interval);
  }, []);

  // ─── MOVE LEAD HANDLER (Optimistic) ─────────────────────────────────────────
  const handleMoveToStage = async (leadId: string, newSegmentKey: string) => {
    const currentLead = leads.find((l) => l.id === leadId);
    if (!currentLead || currentLead.segmentacion === newSegmentKey) return;

    const previousSegment = currentLead.segmentacion;

    // Optimistic local state update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, segmentacion: newSegmentKey } : l))
    );
    highlightMovedLead(leadId);

    try {
      const res = await updateLeadStage(leadId, newSegmentKey);
      if (!res.success) {
        // Revert on failure
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, segmentacion: previousSegment } : l))
        );
      }
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, segmentacion: previousSegment } : l))
      );
    }
  };

  // ─── DRAG AND DROP HANDLER ─────────────────────────────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const targetStageId = String(over.id);

    // Find destination stage
    const targetStage = stages.find((st) => st.id === targetStageId);
    if (!targetStage) return;

    handleMoveToStage(leadId, targetStage.segmentKey);
  };

  // ─── SAVE EDITED STAGES ────────────────────────────────────────────────────
  const handleSaveStages = async (updatedStages: PipelineStage[]) => {
    const res = await savePipelineStages(updatedStages);
    if (res.success && res.stages) {
      setStages(res.stages);
    } else {
      throw new Error(res.error || "No se pudieron guardar las etapas");
    }
  };

  // ─── FILTER LEADS BY SEARCH ────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter((lead) => {
      const name = `${lead.nombre || ""} ${lead.apellido || ""}`.toLowerCase();
      const phone = (lead.telefono || "").toLowerCase();
      const email = (lead.email || "").toLowerCase();
      const origin = (lead.origen || "").toLowerCase();
      return name.includes(query) || phone.includes(query) || email.includes(query) || origin.includes(query);
    });
  }, [leads, searchQuery]);

  // Group leads into stages
  const stageLeadMap = useMemo(() => {
    const map = new Map<string, PipelineLead[]>();
    stages.forEach((st) => map.set(st.segmentKey.toUpperCase(), []));

    const firstStageKey = stages[0]?.segmentKey.toUpperCase();

    filteredLeads.forEach((lead) => {
      const segKey = (lead.segmentacion || "").trim().toUpperCase();
      if (map.has(segKey)) {
        map.get(segKey)!.push(lead);
      } else if (firstStageKey && map.has(firstStageKey)) {
        // Fallback unmatched leads to first stage
        map.get(firstStageKey)!.push(lead);
      }
    });

    return map;
  }, [stages, filteredLeads]);

  return (
    <div className="w-full rounded-[32px] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl shadow-2xl">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Pipeline de Prospectos</h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> En Vivo
                </span>
              </div>
              <p className="text-xs text-white/40">
                Los prospectos avanzan automáticamente de puesto a medida que conversan con la IA o son cualificados.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar prospecto..."
              className="h-10 w-48 md:w-60 rounded-2xl border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 transition-all"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
            title="Refrescar prospectos"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Edit Stages Button (For Admins) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Editar Etapas</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Container */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {stages.map((stage) => {
            const stageLeads = stageLeadMap.get(stage.segmentKey.toUpperCase()) || [];
            return (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={stageLeads}
                allStages={stages}
                totalLeadsCount={filteredLeads.length}
                onMoveToStage={handleMoveToStage}
                movedLeadIds={recentlyMovedLeadIds}
              />
            );
          })}
        </div>
      </DndContext>

      {/* Editor Modal */}
      <PipelineStageEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        stages={stages}
        onSaveStages={handleSaveStages}
      />
    </div>
  );
}
