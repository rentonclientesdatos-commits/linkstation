"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Zap,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  FolderTree,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  is_primary?: boolean;
}

interface WorkflowPickerProps {
  tenantId: string;
  selectedWorkflowId: string | null;
  onSelect: (id: string) => void;
}

export function WorkflowPicker({
  tenantId,
  selectedWorkflowId,
  onSelect,
}: WorkflowPickerProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load workflows
  useEffect(() => {
    async function loadWorkflows() {
      try {
        const res = await fetch(`/api/orchestration/workflows?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setWorkflows(data);
          if (!selectedWorkflowId && data.length > 0) {
            const primary = data.find((w: WorkflowItem) => w.is_primary) || data[0];
            onSelect(primary.id);
          }
        }
      } catch (error) {
        console.error("Failed to load workflows:", error);
      } finally {
        setLoading(false);
      }
    }
    if (tenantId) loadWorkflows();
  }, [tenantId, selectedWorkflowId, onSelect]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  const activeWorkflow = workflows.find((w) => w.id === selectedWorkflowId) || workflows[0];

  const handleCreate = async () => {
    if (!newWorkflowName.trim()) return;
    try {
      const res = await fetch("/api/orchestration/workflows", {
        method: "POST",
        body: JSON.stringify({ tenantId, name: newWorkflowName.trim() }),
      });
      if (res.ok) {
        const newWf = await res.json();
        setWorkflows([newWf, ...workflows]);
        onSelect(newWf.id);
        setNewWorkflowName("");
        setIsCreating(false);
        setIsOpen(false);
        toast({ variant: "success", title: "Flujo Creado", description: newWf.name });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ variant: "error", title: "Error al crear flujo", description: err.error });
      }
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error de red",
        description: error instanceof Error ? error.message : "Error al crear",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este workflow y todos sus nodos?")) return;
    try {
      const res = await fetch(`/api/orchestration/workflows?id=${id}&tenantId=${tenantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updated = workflows.filter((w) => w.id !== id);
        setWorkflows(updated);
        if (selectedWorkflowId === id) {
          onSelect(updated.length > 0 ? updated[0].id : "");
        }
        toast({ variant: "success", title: "Flujo eliminado" });
      } else {
        toast({ variant: "error", title: "Error al eliminar" });
      }
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error inesperado",
        description: error instanceof Error ? error.message : "Error",
      });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button style Xcode / Figma Branch Switcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 transition-all duration-200",
          "hover:border-cyan-500/40 hover:bg-white/[0.06] active:scale-[0.98]",
          isOpen && "border-cyan-500/50 bg-white/[0.08] shadow-lg shadow-cyan-500/10"
        )}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
          <GitBranch className="h-3.5 w-3.5" />
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-tight text-white capitalize">
              {loading ? "Cargando..." : activeWorkflow?.name || "Sin Flujo"}
            </span>
            {activeWorkflow?.is_primary && (
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.2 text-[8px] font-black tracking-widest text-cyan-300 uppercase">
                Default
              </span>
            )}
          </div>
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none">
            Workflow Activo
          </p>
        </div>

        <ChevronDown
          className={cn(
            "ml-1 h-3.5 w-3.5 text-white/40 transition-transform duration-200",
            isOpen && "rotate-180 text-cyan-400"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 top-full z-[120] mt-2 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c10]/98 p-1.5 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-top-2 duration-200"
          style={{
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/40">
              <FolderTree className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black tracking-widest uppercase">
                Colección de Flujos
              </span>
            </div>
            <span className="font-mono text-[9px] text-white/30">{workflows.length} total</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 p-1 scrollbar-thin">
            {workflows.map((wf) => {
              const isSelected = selectedWorkflowId === wf.id;
              return (
                <div
                  key={wf.id}
                  onClick={() => {
                    onSelect(wf.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all",
                    isSelected
                      ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs",
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-white/[0.04] text-white/30 group-hover:text-white/60"
                      )}
                    >
                      <Zap className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="truncate text-[11px] font-black">{wf.name}</p>
                      {wf.is_primary && (
                        <p className="text-[8px] font-bold text-cyan-400/80 uppercase tracking-widest">
                          Entrada Principal
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    {workflows.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(e, wf.id)}
                        className="rounded-lg p-1 text-white/20 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                        title="Eliminar flujo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* New workflow action */}
          <div className="border-t border-white/[0.05] p-1.5">
            {isCreating ? (
              <div className="space-y-1.5 p-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nombre del nuevo flujo..."
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                  className="w-full rounded-xl border border-cyan-500/40 bg-black/50 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-white/40 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    className="rounded-lg bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase text-black hover:bg-cyan-400"
                  >
                    Crear
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo Workflow</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
