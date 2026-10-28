"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  FolderTree,
  Zap,
  ChevronRight,
  Trash2,
  Settings2,
  Sun,
  Moon,
  Rocket,
  Globe2,
  ChevronDown,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrchestratorConfig, saveOrchestratorConfig } from "@/lib/actions/orchestrator-config";
import { runSystemDeployment } from "@/lib/actions/system";
import { toast } from "@/components/ui/toast";

interface Workflow {
  id: string;
  name: string;
  description: string;
  is_primary: boolean;
}

interface WorkflowSidebarProps {
  tenantId: string;
  selectedWorkflowId: string | null;
  onSelect: (id: string) => void;
}

const DAYS_MAP = [
  { value: 0, label: "D" },
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
];

export function WorkflowSidebar({ tenantId, selectedWorkflowId, onSelect }: WorkflowSidebarProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Orchestrator Global Config ───────────────────────────────
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [pacingMinutes, setPacingMinutes] = useState(60);
  const [messagesPerSlot, setMessagesPerSlot] = useState(10);
  const [reminderHours, setReminderHours] = useState(24);
  const [country, setCountry] = useState("España");

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const res = await fetch(`/api/orchestration/workflows?tenantId=${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setWorkflows(data);
          if (!selectedWorkflowId && data.length > 0) {
            const primary = data.find((w: Workflow) => w.is_primary) || data[0];
            onSelect(primary.id);
          }
        }
      } catch (error) {
        console.error("Failed to load workflows:", error);
      } finally {
        setLoading(false);
      }
    };
    loadWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Load orchestrator config for timezone section
  useEffect(() => {
    async function loadConfig() {
      if (!tenantId) return;
      const res = await getOrchestratorConfig(tenantId);
      if (res.success && res.data) {
        setStartTime(res.data.timezone_rules.start || "09:00");
        setEndTime(res.data.timezone_rules.end || "20:00");
        setWorkingDays(res.data.timezone_rules.working_days || [1, 2, 3, 4, 5]);
        setPacingMinutes(res.data.scheduling?.slot_pacing_minutes || 60);
        setMessagesPerSlot(res.data.scheduling?.messages_per_slot || 10);
        setReminderHours(res.data.scheduling?.reminder_hours || 24);
        if (res.data.timezone_rules?.country) {
          setCountry(res.data.timezone_rules.country);
        }
      }
    }
    loadConfig();
  }, [tenantId]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await saveOrchestratorConfig(
        {
          timezone_rules: {
            start: startTime,
            end: endTime,
            working_days: workingDays,
            phone_prefix_map: {
              "+34": "Europe/Madrid",
              "+56": "America/Santiago",
              "+52": "America/Mexico_City",
              "+57": "America/Bogota",
              "+51": "America/Lima",
              "+54": "America/Argentina/Buenos_Aires",
              "+598": "America/Montevideo",
              "+1": "America/New_York",
              "+44": "Europe/London",
            },
            country: country,
          },
          scheduling: {
            slot_pacing_minutes: pacingMinutes,
            messages_per_slot: messagesPerSlot,
            reminder_hours: reminderHours,
            reminder_template: "appointment_reminder_es",
          },
        },
        tenantId
      );

      if (res.success) {
        toast({
          variant: "success",
          title: "Configuración guardada",
          description: `País base guardado en ${country} correctamente.`,
        });
      } else {
        toast({
          variant: "error",
          title: "Error al guardar",
          description: res.error || "No se pudo guardar la configuración.",
        });
      }
    } catch (err: unknown) {
      toast({
        variant: "error",
        title: "Error inesperado",
        description: err instanceof Error ? err.message : "Error al guardar.",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await handleSaveConfig();
      const res = await runSystemDeployment();
      if (res.success) {
        toast({ variant: "success", title: "Sistema desplegado", description: res.message });
      } else {
        toast({ variant: "error", title: "Error al desplegar", description: res.error });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "error", title: "Error inesperado", description: error?.message });
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este workflow? Esta acción no se puede deshacer."
      )
    )
      return;
    try {
      const res = await fetch(`/api/orchestration/workflows?id=${id}&tenantId=${tenantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedWfs = workflows.filter((wf) => wf.id !== id);
        setWorkflows(updatedWfs);
        if (selectedWorkflowId === id) {
          onSelect(updatedWfs.length > 0 ? updatedWfs[0].id : "");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          variant: "error",
          title: "Error al eliminar workflow",
          description: errData.error || res.statusText,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "error", title: "Error de red", description: error?.message });
    }
  };

  const handleCreate = async () => {
    const name = prompt("Nombre del nuevo workflow:");
    if (!name) return;
    try {
      const res = await fetch("/api/orchestration/workflows", {
        method: "POST",
        body: JSON.stringify({ tenantId, name }),
      });
      if (res.ok) {
        const newWf = await res.json();
        setWorkflows([newWf, ...workflows]);
        onSelect(newWf.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          variant: "error",
          title: "Error al crear workflow",
          description: errData.error || res.statusText,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ variant: "error", title: "Error de red", description: error?.message });
    }
  };

  return (
    <div className="animate-in slide-in-from-left flex h-full w-72 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-3xl duration-500 dark:border-white/5 dark:bg-black/60">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/5">
        <div className="flex items-center gap-2 text-slate-500 dark:text-white/40">
          <FolderTree className="h-4 w-4" />
          <span className="text-[10px] font-black tracking-widest uppercase">Colecciones</span>
        </div>
        <button
          onClick={handleCreate}
          title="Crear nuevo flujo"
          className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex h-7 w-7 items-center justify-center rounded-lg transition-all"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* ── Workflow List ────────────────────────────────────── */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="space-y-3 py-8 text-center">
            <Zap className="mx-auto h-8 w-8 text-slate-300 dark:text-white/10" />
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-white/20">
              Sin workflows
            </p>
            <button
              onClick={handleCreate}
              className="text-primary text-[10px] font-black hover:underline"
            >
              + Crear primero
            </button>
          </div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => onSelect(wf.id)}
              className={cn(
                "group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                selectedWorkflowId === wf.id
                  ? "bg-primary/10 border-primary/20 text-primary shadow-primary/5 shadow-lg"
                  : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200 dark:border-white/5 dark:bg-white/[0.02] dark:text-white/40 dark:hover:border-white/10 dark:hover:bg-white/5"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  selectedWorkflowId === wf.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-200 text-slate-400 group-hover:text-slate-600 dark:bg-white/5 dark:text-white/20 dark:group-hover:text-white/40"
                )}
              >
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-bold transition-colors",
                    selectedWorkflowId === wf.id
                      ? "text-slate-900 dark:text-white"
                      : "group-hover:text-slate-700 dark:group-hover:text-white/60"
                  )}
                >
                  {wf.name}
                </p>
                {wf.is_primary && (
                  <span className="text-[9px] font-black tracking-tighter uppercase opacity-40">
                    Default Entry
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleDelete(e, wf.id)}
                  className="rounded-lg p-1.5 text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                  title="Eliminar workflow"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-all",
                    selectedWorkflowId === wf.id
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-2 opacity-0"
                  )}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Global System Config ─────────────────────────────── */}
      <div className="border-t border-slate-200 dark:border-white/5">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="flex w-full items-center justify-between p-5 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-white/40">
            <Settings2 className="h-4 w-4" />
            <span className="text-[10px] font-black tracking-widest uppercase">
              Config. Sistema
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-300 dark:text-white/20",
              configOpen && "rotate-180"
            )}
          />
        </button>

        {configOpen && (
          <div className="animate-in slide-in-from-top-2 scrollbar-thin max-h-[50vh] space-y-4 overflow-y-auto px-5 pb-5 duration-200">
            {/* Time range */}
            <div className="space-y-2">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase dark:text-white/30">
                Horario de Activación
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <Sun className="h-3 w-3 shrink-0 text-emerald-400" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-transparent text-xs font-black text-emerald-400 [color-scheme:dark] outline-none"
                    title="Hora inicio"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <Moon className="h-3 w-3 shrink-0 text-blue-400" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-transparent text-xs font-black text-blue-400 [color-scheme:dark] outline-none"
                    title="Hora fin"
                  />
                </div>
              </div>
            </div>

            {/* Working days */}
            <div className="space-y-2">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase dark:text-white/30">
                Días Laborables
              </p>
              <div className="flex gap-1">
                {DAYS_MAP.map((d) => {
                  const isActive = workingDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => {
                        const updated = isActive
                          ? workingDays.filter((x) => x !== d.value)
                          : [...workingDays, d.value].sort();
                        setWorkingDays(updated);
                      }}
                      className={cn(
                        "h-8 flex-1 rounded-lg border text-[10px] font-black transition-all",
                        isActive
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "border-slate-200 bg-slate-100 text-slate-400 hover:text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/20 dark:hover:text-white/40"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Country Selector */}
            <div className="space-y-2">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase dark:text-white/30">
                País del Cliente (Base Horaria)
              </p>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                title="Seleccionar país base del cliente"
                className="focus:ring-primary/20 h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-black text-slate-700 outline-none focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="España">España 🇪🇸</option>
                <option value="México">México 🇲🇽</option>
                <option value="Chile">Chile 🇨🇱</option>
                <option value="Colombia">Colombia 🇨🇴</option>
                <option value="Perú">Perú 🇵🇪</option>
                <option value="Argentina">Argentina 🇦🇷</option>
                <option value="Uruguay">Uruguay 🇺🇾</option>
                <option value="USA">USA 🇺🇸</option>
                <option value="Portugal">Portugal 🇵🇹</option>
              </select>
            </div>

            {/* Timezone note */}
            <div className="flex items-start gap-2 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3">
              <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500/60" />
              <p className="text-[9px] leading-relaxed text-slate-500 dark:text-white/30">
                El sistema adapta el horario al huso horario del lead según su prefijo telefónico
                (+34 España, +52 México, etc.)
              </p>
            </div>

            {/* Pacing Config */}
            <div className="space-y-4 rounded-xl border border-orange-500/10 bg-orange-500/5 p-4">
              <p className="flex items-center gap-2 text-[9px] font-black tracking-widest text-orange-500 uppercase">
                <Timer className="h-3 w-3" /> Pacing & Control
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black tracking-widest text-slate-500 uppercase dark:text-white/30">
                    Ventana (min)
                  </label>
                  <input
                    type="number"
                    value={pacingMinutes}
                    onChange={(e) => setPacingMinutes(parseInt(e.target.value))}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white/50 px-3 text-[10px] font-bold text-slate-900 outline-none focus:border-orange-500/40 dark:border-white/5 dark:bg-black/20 dark:text-white"
                    title="Ventana de tiempo en minutos"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black tracking-widest text-slate-500 uppercase dark:text-white/30">
                    Límite
                  </label>
                  <input
                    type="number"
                    value={messagesPerSlot}
                    onChange={(e) => setMessagesPerSlot(parseInt(e.target.value))}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white/50 px-3 text-[10px] font-bold text-slate-900 outline-none focus:border-orange-500/40 dark:border-white/5 dark:bg-black/20 dark:text-white"
                    title="Límite de mensajes por ventana"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black tracking-widest text-slate-500 uppercase dark:text-white/30">
                    Recordatorio (h)
                  </label>
                  <input
                    type="number"
                    value={reminderHours}
                    onChange={(e) => setReminderHours(parseInt(e.target.value))}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white/50 px-3 text-[10px] font-bold text-slate-900 outline-none focus:border-orange-500/40 dark:border-white/5 dark:bg-black/20 dark:text-white"
                    title="Horas antes para enviar recordatorio"
                  />
                </div>
              </div>
            </div>

            {/* Save config */}
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/80"
            >
              {savingConfig ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        )}
      </div>

      {/* ── Deploy Button ────────────────────────────────────── */}
      <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-widest uppercase shadow-lg transition-all",
            "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
          )}
        >
          <Rocket className={cn("h-4 w-4", deploying && "animate-bounce")} />
          {deploying ? "Desplegando..." : "Desplegar Sistema"}
        </button>
      </div>
    </div>
  );
}
