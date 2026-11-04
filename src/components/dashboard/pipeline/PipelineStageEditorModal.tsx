"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Palette,
  Layers,
  AlertCircle,
} from "lucide-react";
import type { PipelineStage } from "@/lib/actions/pipeline";

interface PipelineStageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  onSaveStages: (updatedStages: PipelineStage[]) => Promise<void>;
}

const AVAILABLE_COLORS: { label: string; value: PipelineStage["color"]; bg: string }[] = [
  { label: "Azul", value: "blue", bg: "bg-blue-500" },
  { label: "Índigo", value: "indigo", bg: "bg-indigo-500" },
  { label: "Púrpura", value: "purple", bg: "bg-purple-500" },
  { label: "Ámbar", value: "amber", bg: "bg-amber-500" },
  { label: "Esmeralda", value: "emerald", bg: "bg-emerald-500" },
  { label: "Cian", value: "cyan", bg: "bg-cyan-500" },
  { label: "Rosa", value: "rose", bg: "bg-rose-500" },
  { label: "Teal", value: "teal", bg: "bg-teal-500" },
];

export function PipelineStageEditorModal({
  isOpen,
  onClose,
  stages: initialStages,
  onSaveStages,
}: PipelineStageEditorModalProps) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddStage = () => {
    const nextOrder = stages.length;
    const newStage: PipelineStage = {
      id: `stage-custom-${Date.now()}`,
      name: `Nueva Etapa ${nextOrder + 1}`,
      segmentKey: `ETAPA_${nextOrder + 1}`,
      color: AVAILABLE_COLORS[nextOrder % AVAILABLE_COLORS.length].value,
      order: nextOrder,
    };
    setStages([...stages, newStage]);
  };

  const handleUpdateStage = (id: string, updates: Partial<PipelineStage>) => {
    setStages(
      stages.map((st) => {
        if (st.id === id) {
          const updated = { ...st, ...updates };
          // If updating segmentKey, sanitize to uppercase
          if (updates.segmentKey !== undefined) {
            updated.segmentKey = updates.segmentKey.toUpperCase().replace(/\s+/g, " ");
          }
          return updated;
        }
        return st;
      })
    );
  };

  const handleDeleteStage = (id: string) => {
    if (stages.length <= 1) {
      setError("El pipeline debe tener al menos una etapa.");
      return;
    }
    setStages(stages.filter((st) => st.id !== id).map((st, idx) => ({ ...st, order: idx })));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const copy = [...stages];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setStages(copy.map((st, idx) => ({ ...st, order: idx })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Validate that all stages have names and keys
      for (const st of stages) {
        if (!st.name.trim()) {
          throw new Error("Todas las etapas deben tener un nombre.");
        }
        if (!st.segmentKey.trim()) {
          throw new Error("Todas las etapas deben tener una clave de segmentación.");
        }
      }

      await onSaveStages(stages);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar etapas");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configurar Etapas del Pipeline</h2>
              <p className="text-xs text-white/40">
                Personaliza las columnas del embudo. La IA clasificará automáticamente a los prospectos en estas etapas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stages List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar pr-1">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-colors"
            >
              {/* Order buttons */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, "up")}
                  className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white disabled:opacity-20 transition-colors"
                  title="Subir orden"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === stages.length - 1}
                  onClick={() => handleMove(idx, "down")}
                  className="rounded p-1 text-white/30 hover:bg-white/5 hover:text-white disabled:opacity-20 transition-colors"
                  title="Bajar orden"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>

              {/* Color picker */}
              <div className="relative group shrink-0">
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1.5 cursor-pointer">
                  <span
                    className={`h-4 w-4 rounded-full ${
                      AVAILABLE_COLORS.find((c) => c.value === stage.color)?.bg || "bg-blue-500"
                    }`}
                  />
                  <select
                    value={stage.color}
                    onChange={(e) =>
                      handleUpdateStage(stage.id, { color: e.target.value as PipelineStage["color"] })
                    }
                    title="Color de columna"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  >
                    {AVAILABLE_COLORS.map((c) => (
                      <option key={c.value} value={c.value} className="bg-slate-900 text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stage Name */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                  Nombre Visual
                </label>
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                  placeholder="Ej: Prospectos Nuevos"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-primary/50"
                />
              </div>

              {/* Stage Segment Key (matches lead.segmentacion) */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                  Clave de Segmento (IA)
                </label>
                <input
                  type="text"
                  value={stage.segmentKey}
                  onChange={(e) => handleUpdateStage(stage.id, { segmentKey: e.target.value })}
                  placeholder="Ej: PUESTO 1"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-emerald-400 placeholder-white/20 outline-none focus:border-primary/50 uppercase"
                />
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDeleteStage(stage.id)}
                className="shrink-0 rounded-xl p-2 text-white/30 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                title="Eliminar etapa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Stage Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddStage}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 p-2.5 text-xs font-semibold text-white/60 hover:border-primary/40 hover:text-primary transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir Nueva Etapa</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {isSaving ? (
              <span>Guardando...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
