"use client";

import { ReactNode, useState } from "react";
import { KpiConfig, Tenant } from "@/types/tenant";
import { KpiGenerales } from "@/lib/actions/analytics";
import { SummaryCard } from "@/components/charts/DashboardCharts";
import { cn, formatDuration } from "@/lib/utils";
import {
  TrendingUp,
  Save,
  X,
  GripVertical,
  Check,
  ChevronRight,
  Bot,
  Target,
  Percent,
  Layout,
  Settings,
  Trash2,
  Database,
  Plus,
} from "lucide-react";
import { updateTenant } from "@/lib/actions/tenant";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSingleDynamicKpi, type AnalyticsFilters } from "@/lib/actions/analytics";
import {
  AVAILABLE_COLORS,
  COL_SPAN_MAP,
  SCHEMA_COLUMNS,
  AVAILABLE_ICONS,
  ICON_MAP,
} from "@/lib/constants/schema";

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

interface SectionHeaderProps {
  title: string;
  isEditing?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDelete?: () => void;
}

function SectionHeader({ title, isEditing, onTitleChange, onDelete }: SectionHeaderProps) {
  return (
    <div className="col-span-12 mt-8 mb-2 first:mt-0">
      <div className="flex items-center gap-4">
        {isEditing ? (
          <div className="group/header flex w-full items-center gap-2">
            <div className="bg-muted border-border flex items-center gap-2 rounded-lg border px-3 py-1 transition-all">
              <Plus className="text-muted-foreground h-3 w-3" />
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                className="text-foreground min-w-[150px] bg-transparent text-[11px] font-black tracking-[0.25em] uppercase outline-none"
                placeholder="NOMBRE DEL GRUPO"
              />
            </div>
            <div className="bg-border h-px flex-1" />
            <button
              onClick={onDelete}
              className="text-muted-foreground rounded-lg p-1.5 opacity-0 transition-colors group-hover/header:opacity-100 hover:bg-red-500/10 hover:text-red-500"
              title="Eliminar grupo completo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-[12px] font-bold tracking-[0.15em] whitespace-nowrap text-slate-400 uppercase">
              {title}
            </h2>
            <div className="h-px w-full bg-slate-100" />
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  tenant: Tenant;
  initialKpis: KpiConfig[];
  values: KpiGenerales;
  dynamicValues: Record<string, number>;
  isAdmin: boolean;
  configKey?: string;
  // Sprint 2B fix BUG-2B-05: `title === undefined` → render default h1 interno.
  // `title === null` / `false` / <></> → ocultar (caller ya renderiza su propio
  // heading externo, e.g. OverviewSection con su h2 "Resumen general").
  title?: ReactNode | false;
  from?: string;
  to?: string;
  filters?: AnalyticsFilters;
  layout?: "grid" | "funnel";
  // Sprint 2B: parametrizar label del botón Personalizar para evitar duplicado
  // visual entre OverviewSection y SummarySection (ambos usan layout=grid).
  editButtonLabel?: string;
}

interface SortableKpiProps {
  k: KpiConfig;
  isEditing: boolean;
  cycleSize: (id: string, current: string) => void;
  updateKpi: (id: string, updates: Partial<KpiConfig>) => void;
  removeKpi: (id: string) => void;
  val: number | string;
}

function SortableKpi({
  k,
  isEditing,
  cycleSize,
  updateKpi,
  removeKpi,
  val,
  onConfigure,
}: SortableKpiProps & { onConfigure: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: k.id,
    disabled: !isEditing,
  });

  const colSpanClass = COL_SPAN_MAP[k.size || "4"] || "md:col-span-4";
  const IconComponent = ICON_MAP[k.icon] || TrendingUp;

  return (
    <motion.div
      ref={setNodeRef}
      animate={{
        x: transform ? transform.x : 0,
        y: transform ? transform.y : 0,
        scale: isDragging ? 1.05 : 1,
        zIndex: isDragging ? 50 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        colSpanClass,
        "group font-outfit relative w-full min-w-0 transition-all duration-300",
        isDragging && "opacity-50"
      )}
    >
      <div
        className={cn(
          "h-full transition-all duration-300",
          isEditing &&
            "ring-primary/30 bg-card relative z-[40] scale-[1.03] rounded-[32px] shadow-2xl ring-4",
          isEditing && k.isVisible === false && "opacity-40 grayscale"
        )}
      >
        <SummaryCard
          label={k.label as string}
          value={typeof val === "number" ? val.toLocaleString("es-ES") : val}
          icon={<IconComponent className="text-sky-500" />}
        />

        {/* Edit Overlays - Simplified */}
        {isEditing && (
          <div className="bg-background/40 border-primary/50 absolute inset-0 z-[50] flex items-center justify-center rounded-[32px] border-2 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 dark:bg-slate-950/40">
            <div className="bg-card/90 border-border flex items-center gap-1.5 rounded-2xl border p-2 shadow-xl backdrop-blur-md">
              {/* Drag Handle */}
              <div
                {...attributes}
                {...listeners}
                className="text-muted-foreground hover:text-primary cursor-grab p-2 active:cursor-grabbing"
                title="Arrastrar Bloque"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              <button
                title="Configurar Bloque"
                onClick={() => onConfigure(k.id)}
                className="text-primary hover:bg-primary/10 bg-primary/5 border-primary/20 rounded-lg border p-2 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                title="Cambiar Tamaño"
                onClick={() => cycleSize(k.id, k.size)}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg p-2 transition-colors"
              >
                <Layout className="h-5 w-5" />
              </button>

              <button
                title={k.isVisible === false ? "Mostrar" : "Ocultar"}
                onClick={() => updateKpi(k.id, { isVisible: k.isVisible === false })}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  k.isVisible === false
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                {k.isVisible === false ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </button>

              <button
                title="Eliminar Bloque"
                onClick={() => removeKpi(k.id)}
                className="text-muted-foreground rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function SummaryManager({
  tenant,
  initialKpis,
  values,
  dynamicValues,
  isAdmin,
  configKey = "kpis",
  title,
  from,
  to,
  filters,
  layout = "grid",
  editButtonLabel,
}: Props) {
  const defaultLabel = layout === "funnel" ? "Personalizar Embudo" : "Personalizar Tablero";
  const editLabel = editButtonLabel ?? defaultLabel;
  const [isEditing, setIsEditing] = useState(false);
  const [kpis, setKpis] = useState<KpiConfig[]>(initialKpis);
  const [saving, setSaving] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [isAddingKpi, setIsAddingKpi] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [previewValues, setPreviewValues] = useState<Record<string, number>>({});

  // Effectiveness config: which two steps to compare, and description text
  const savedEff = (tenant.config as Record<string, unknown>)?.[`${configKey}_eff`] as
    | Record<string, string>
    | undefined;
  const [effFromId, setEffFromId] = useState<string>(savedEff?.fromId || "__first__");
  const [effToId, setEffToId] = useState<string>(savedEff?.toId || "__last__");
  const [effLabel, setEffLabel] = useState<string>(
    savedEff?.label || "De leads ingresados a agendamiento confirmado"
  );

  const router = useRouter();

  const onConfigure = (id: string) => {
    const k = kpis.find((item) => item.id === id);
    if (!k) return;
    setEditingKpiId(id);
    setIsEditing(true); // Ensure we are in editing mode
  };

  async function handleFinalizeEdition() {
    if (!editingKpiId) return;
    const editingKpi = kpis.find((k) => k.id === editingKpiId);
    if (!editingKpi || editingKpi.staticKey) {
      setEditingKpiId(null);
      return;
    }

    setSaving(true);
    try {
      // If it's a dynamic kpi, fetch latest value for preview
      if (from && to) {
        const newVal = await getSingleDynamicKpi(editingKpi, from, to, filters || {});
        setPreviewValues((prev) => ({ ...prev, [editingKpi.id]: newVal }));
      }
      setEditingKpiId(null);
    } catch (e) {
      console.error("Error fetching preview value:", e);
      setEditingKpiId(null);
    } finally {
      setSaving(false);
    }
  }

  const editingKpi = kpis.find((k) => k.id === editingKpiId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleSave(exitEditMode = true) {
    setSaving(true);
    try {
      const newConfig = {
        ...(tenant.config as Record<string, unknown>),
        [configKey]: kpis,
        [`${configKey}_eff`]: { fromId: effFromId, toId: effToId, label: effLabel },
      };
      const res = await updateTenant(tenant.id, { config: newConfig });
      if (res.success) {
        if (exitEditMode) {
          setIsEditing(false);
        }
        router.refresh();
        // Clear previews once definitively saved
        setPreviewValues({});
      } else {
        toast({ variant: "error", title: "Error al guardar", description: res.error });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "error", title: "Error inesperado al guardar" });
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setKpis((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Inherit the group of the adjacent items if we dragged across a group boundary
        const movedItem = newItems[newIndex];
        const neighbor = oldIndex < newIndex ? newItems[newIndex - 1] : newItems[newIndex + 1];
        if (neighbor && neighbor.group) {
          movedItem.group = neighbor.group;
        }

        return newItems;
      });
    }
  }

  function updateKpi(id: string, updates: Partial<KpiConfig>) {
    const dataKeys: (keyof KpiConfig)[] = [
      "targetCol",
      "calcType",
      "condCol",
      "condOp",
      "condVal",
      "isPercentage",
      "denomTargetCol",
      "denomCalcType",
      "denomCondCol",
      "denomCondOp",
      "denomCondVal",
      "formula",
      "parts",
      "isAdvanced",
    ];
    // If the user modifies any data connection property, convert static preset to dynamic KPI.
    const shouldClearStatic = dataKeys.some((key) => key in updates);

    setKpis(
      kpis.map((k) => {
        if (k.id === id) {
          const updated = { ...k, ...updates };
          if (shouldClearStatic) {
            delete updated.staticKey;
          }
          return updated;
        }
        return k;
      })
    );
  }

  function addKpi(selectedGroup: string) {
    const newKpi: KpiConfig = {
      id: `kpi-${Date.now()}`,
      label: "Nuevo Bloque",
      icon: "TrendingUp",
      color: "bg-primary",
      size: "4",
      isVisible: true,
      group: selectedGroup,
      calcType: "count",
      targetCol: "llamadas.id",
    };

    setKpis((prev) => {
      const lastIndex = prev.map((k) => k.group).lastIndexOf(selectedGroup);
      if (lastIndex !== -1) {
        // Insert explicitly after the last block of the given group
        const newArr = [...prev];
        newArr.splice(lastIndex + 1, 0, newKpi);
        return newArr;
      } else {
        return [...prev, newKpi];
      }
    });
    setIsAddingKpi(false);
    setEditingKpiId(newKpi.id); // Open sidebar immediately for the new block
  }

  const existingGroups = Array.from(new Set(kpis.map((k) => k.group).filter(Boolean))) as string[];

  function removeKpi(id: string) {
    if (confirm("¿Estás seguro de eliminar este bloque?")) {
      setKpis(kpis.filter((k) => k.id !== id));
    }
  }

  function removeGroup(groupName: string) {
    if (confirm(`¿Estás seguro de eliminar todo el grupo "${groupName}" y sus bloques?`)) {
      setKpis(kpis.filter((k) => k.group !== groupName));
    }
  }

  function cycleSize(id: string, current: string) {
    const sizes: KpiConfig["size"][] = ["3", "4", "6", "12"];
    const currentIndex = sizes.indexOf(current as KpiConfig["size"]);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    updateKpi(id, { size: nextSize });
  }

  function updateGroupName(oldName: string, newName: string) {
    setKpis(kpis.map((k) => (k.group === oldName ? { ...k, group: newName } : k)));
  }

  return (
    <div className="relative mb-10">
      {layout !== "funnel" ? (
        <div className="mb-8 flex items-center justify-between">
          {title === undefined ? (
            <div className="flex items-center gap-4">
              <div className="rounded-[20px] border border-blue-500/20 bg-blue-500/10 p-3">
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                {/* Sprint 3 SP-4-WCAG-09: h1→h2 para heading hierarchy correcta. */}
                <h2 className="text-[32px] leading-tight font-bold tracking-tight text-white">
                  Métricas <span className="text-blue-400">Generales</span>
                </h2>
                <p className="text-[15px] font-medium text-slate-400">
                  Rendimiento global y estadísticas del sistema
                </p>
              </div>
            </div>
          ) : (
            title || null
          )}

          {isAdmin && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsAddingKpi(true)}
                    className="text-foreground bg-card border-border hover:bg-muted flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all"
                    title="Crear nuevo grupo"
                  >
                    <Plus className="h-4 w-4" /> Crear grupo
                  </button>
                  <button
                    onClick={() => setIsAddingKpi(true)}
                    className="text-primary bg-card border-primary/20 hover:bg-primary/5 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-all"
                    title="Crear nuevo bloque"
                  >
                    <Plus className="h-4 w-4" /> Crear bloque
                  </button>
                  <div className="bg-border mx-1 h-6 w-px" />
                  <button
                    onClick={() => {
                      setKpis(initialKpis);
                      setIsEditing(false);
                    }}
                    className="text-muted-foreground bg-card border-border hover:bg-muted font-outfit flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all"
                    title="Cancelar edición"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20 font-outfit flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                    title="Guardar cambios"
                  >
                    <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </>
              ) : (
                // Sprint 3 SP-4-WCAG-08: aria-label refuerza accesibilidad.
                <button
                  onClick={() => setIsEditing(true)}
                  aria-label={editLabel}
                  title={editLabel}
                  className="text-primary bg-primary/10 border-primary/20 hover:bg-primary/20 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all"
                >
                  <Settings className="h-4 w-4" /> {editLabel}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        isAdmin && (
          <div className="mb-4 flex items-center justify-end">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setKpis(initialKpis);
                    setIsEditing(false);
                  }}
                  className="text-muted-foreground bg-card border-border hover:bg-muted font-outfit flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20 font-outfit flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            ) : (
              // Sprint 3 SP-4-WCAG-08: aria-label refuerza accesibilidad para screen readers.
              <button
                onClick={() => setIsEditing(true)}
                aria-label={editLabel}
                title={editLabel}
                className="text-primary bg-primary/10 border-primary/20 hover:bg-primary/20 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all"
              >
                <Settings className="h-4 w-4" /> {editLabel}
              </button>
            )}
          </div>
        )
      )}

      {layout === "funnel" ? (
        (() => {
          const steps = kpis
            .filter((k) => isEditing || k.isVisible !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          let eff = 0;
          if (steps.length >= 2) {
            // Resolve which steps to use for the conversion rate
            const fromStep =
              effFromId === "__first__"
                ? steps[0]
                : steps.find((s) => s.id === effFromId) || steps[0];
            const toStep =
              effToId === "__last__"
                ? steps[steps.length - 1]
                : steps.find((s) => s.id === effToId) || steps[steps.length - 1];

            const fv = fromStep.staticKey
              ? (values[fromStep.staticKey as keyof KpiGenerales] as number)
              : (previewValues[fromStep.id] ?? dynamicValues[fromStep.id] ?? 0);
            const lv = toStep.staticKey
              ? (values[toStep.staticKey as keyof KpiGenerales] as number)
              : (previewValues[toStep.id] ?? dynamicValues[toStep.id] ?? 0);
            if (fv > 0) eff = (lv / fv) * 100;
          }

          // ── Compute raw numeric values for intensity mapping ──────────
          const rawVals = steps.map((k) =>
            typeof (k.staticKey
              ? values[k.staticKey as keyof KpiGenerales]
              : (previewValues[k.id] ?? dynamicValues[k.id] ?? 0)) === "number"
              ? k.staticKey
                ? (values[k.staticKey as keyof KpiGenerales] as number)
                : (previewValues[k.id] ?? dynamicValues[k.id] ?? 0)
              : 0
          );
          const maxVal = Math.max(...rawVals, 1);

          const COLORS: Record<string, [string, string]> = {
            "bg-blue-600": ["#3b82f6", "#1d4ed8"],
            "bg-indigo-600": ["#818cf8", "#4338ca"],
            "bg-purple-600": ["#c084fc", "#7e22ce"],
            "bg-violet-600": ["#a78bfa", "#5b21b6"],
            "bg-emerald-600": ["#34d399", "#059669"],
            "bg-teal-600": ["#2dd4bf", "#0f766e"],
            "bg-cyan-600": ["#22d3ee", "#0e7490"],
            "bg-orange-600": ["#fb923c", "#c2410c"],
            "bg-rose-500": ["#fb7185", "#e11d48"],
            "bg-rose-600": ["#f43f5e", "#be123c"],
            "bg-slate-600": ["#94a3b8", "#334155"],
            "bg-zinc-800": ["#71717a", "#18181b"],
          };

          const svgW = 500;
          const total = steps.length;
          const topR = 220;
          const botR = 55;
          const rowH = 64;
          const ellipseRY = 14;
          const svgH = total * rowH + ellipseRY * 2 + 10;

          function rx(idx: number) {
            return topR - (topR - botR) * (idx / total);
          }

          return (
            <div className="relative mx-auto mb-12 flex w-full max-w-[900px] flex-col items-center overflow-hidden rounded-[40px] border border-[rgba(0,229,255,0.12)] bg-[rgba(10,15,30,0.65)] px-6 py-12 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.06),transparent_70%)] opacity-100" />

              {/* SVG Funnel */}
              <div className="relative flex w-full justify-center">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  width="100%"
                  className="max-w-[520px] overflow-visible"
                >
                  <defs>
                    {steps.map((k, idx) => {
                      const [c1, c2] = COLORS[k.color || "bg-blue-600"] || ["#3b82f6", "#1d4ed8"];
                      // Intensity: 1.0 = max value (darkest), 0.35 = min (lightest)
                      const intensity = 0.35 + 0.65 * (rawVals[idx] / maxVal);
                      return (
                        <linearGradient
                          key={`g${k.id}`}
                          id={`grad${k.id}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor={c2} stopOpacity={intensity} />
                          <stop offset="30%" stopColor={c1} stopOpacity={intensity} />
                          <stop offset="70%" stopColor={c1} stopOpacity={intensity} />
                          <stop offset="100%" stopColor={c2} stopOpacity={intensity} />
                        </linearGradient>
                      );
                    })}
                    {/* Dark overlay mask for low-intensity steps */}
                    {steps.map((k, idx) => {
                      const intensity = 0.35 + 0.65 * (rawVals[idx] / maxVal);
                      const dimAmount = 1 - intensity; // 0 = no dim (high data), up to 0.65 (low data)
                      return (
                        <linearGradient
                          key={`dim${k.id}`}
                          id={`dim${k.id}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(0,0,0,0)"
                            stopOpacity={dimAmount * 0.4}
                          />
                          <stop
                            offset="50%"
                            stopColor="rgba(0,0,0,0)"
                            stopOpacity={dimAmount * 0.15}
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(0,0,0,0)"
                            stopOpacity={dimAmount * 0.4}
                          />
                        </linearGradient>
                      );
                    })}
                  </defs>

                  {steps.map((k, idx) => {
                    const [c1, c2] = COLORS[k.color || "bg-blue-600"] || ["#3b82f6", "#1d4ed8"];
                    const cx = svgW / 2;
                    const rTop = rx(idx);
                    const rBot = rx(idx + 1);
                    const yTop = idx * rowH + ellipseRY + 5;
                    const yBot = yTop + rowH;
                    const bodyPath = `M ${cx - rTop} ${yTop} L ${cx + rTop} ${yTop} L ${cx + rBot} ${yBot} L ${cx - rBot} ${yBot} Z`;

                    let val: number | string = k.staticKey
                      ? (values[k.staticKey as keyof KpiGenerales] as number)
                      : (previewValues[k.id] ?? dynamicValues[k.id] ?? 0);
                    if (typeof val === "number") {
                      const isDuration =
                        k.valType === "duration" ||
                        k.staticKey?.includes("segundos") ||
                        k.suffix === " seg";
                      if (isDuration) {
                        const m = Math.floor(val / 60);
                        const s = Math.round(val % 60);
                        val = s > 0 ? `${m}m ${s}s` : `${m}m`;
                      } else {
                        val = k.isPercentage ? val.toFixed(1) : val.toLocaleString("es-ES");
                      }
                    }
                    const dval = k.isPercentage ? `${val}%` : k.suffix ? `${val}${k.suffix}` : val;
                    const yCtr = yTop + rowH / 2;

                    const intensity = 0.35 + 0.65 * (rawVals[idx] / maxVal);
                    // Text opacity: brighter when more data
                    const textAlpha = 0.55 + 0.45 * (rawVals[idx] / maxVal);

                    return (
                      <g key={k.id}>
                        {/* Gradient body */}
                        <path d={bodyPath} fill={`url(#grad${k.id})`} />
                        {/* Top rim */}
                        <ellipse
                          cx={cx}
                          cy={yTop}
                          rx={rTop}
                          ry={ellipseRY}
                          fill={c1}
                          fillOpacity={intensity}
                        />
                        <ellipse
                          cx={cx}
                          cy={yTop}
                          rx={rTop * 0.85}
                          ry={ellipseRY * 0.55}
                          fill="white"
                          fillOpacity={intensity * 0.18}
                        />
                        {/* Bottom shadow rim */}
                        <ellipse
                          cx={cx}
                          cy={yBot}
                          rx={rBot}
                          ry={ellipseRY * 0.7}
                          fill={c2}
                          fillOpacity={intensity * 0.7}
                        />

                        {/* Label */}
                        <text
                          x={cx}
                          y={yCtr - 5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={`rgba(255,255,255,${textAlpha})`}
                          fontSize="12"
                          fontWeight="600"
                          className="font-outfit tracking-[0.08em] uppercase"
                        >
                          {k.label}
                        </text>
                        {/* Value */}
                        <text
                          x={cx}
                          y={yCtr + 13}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={`rgba(255,255,255,${Math.min(textAlpha + 0.15, 1)})`}
                          fontSize="17"
                          fontWeight="800"
                          className="font-outfit"
                        >
                          {dval}
                        </text>

                        {/* ── Edit buttons (visible only in editing mode) ── */}
                        {isEditing && (
                          <foreignObject
                            x={cx + rTop + 6}
                            y={yCtr - 22}
                            width={50}
                            height={44}
                            className="overflow-visible"
                          >
                            <div className="flex flex-col gap-1">
                              {/* Configure data */}
                              <button
                                onClick={() => setEditingKpiId(k.id)}
                                title="Configurar datos del paso"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-lg transition-transform hover:scale-110 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </button>
                              {/* Toggle visibility */}
                              <button
                                onClick={() =>
                                  updateKpi(k.id, {
                                    isVisible: k.isVisible === false ? true : false,
                                  })
                                }
                                title={k.isVisible === false ? "Mostrar paso" : "Ocultar paso"}
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full border shadow-lg transition-transform hover:scale-110",
                                  k.isVisible === false
                                    ? "border-slate-300 bg-slate-400 text-white"
                                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                )}
                              >
                                {k.isVisible === false ? (
                                  <X className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}

                  {/* Bottom rim of last step */}
                  {steps.length > 0 &&
                    (() => {
                      const last = steps[steps.length - 1];
                      const [, c2] = COLORS[last.color || "bg-blue-600"] || ["#3b82f6", "#1d4ed8"];
                      const yBot = steps.length * rowH + ellipseRY + 5;
                      const rBot = rx(steps.length);
                      const lastIntensity = 0.35 + 0.65 * (rawVals[steps.length - 1] / maxVal);
                      return (
                        <ellipse
                          cx={svgW / 2}
                          cy={yBot}
                          rx={rBot}
                          ry={ellipseRY}
                          fill={c2}
                          fillOpacity={lastIntensity}
                        />
                      );
                    })()}
                </svg>
              </div>

              {/* ── Inline Color Picker (edit mode only) ───────────────── */}
              {isEditing && (
                <div className="mt-6 w-full max-w-[520px] space-y-2">
                  <p className="mb-3 text-center text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase dark:text-slate-500">
                    Color por nivel del embudo
                  </p>
                  {steps.map((k) => (
                    <div
                      key={`cp-${k.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/60"
                    >
                      <span className="flex-1 truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {k.label}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {AVAILABLE_COLORS.map((c) => (
                          <button
                            key={c.class}
                            title={c.name}
                            onClick={() => updateKpi(k.id, { color: c.class })}
                            className={cn(
                              "h-5 w-5 rounded-full transition-all duration-200",
                              c.class,
                              k.color === c.class
                                ? "scale-125 ring-2 ring-slate-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-800"
                                : "opacity-60 hover:scale-110 hover:opacity-100"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Effectiveness footer */}
              <div className="mt-10 flex w-full max-w-[520px] flex-col items-center gap-1 border-t border-[rgba(0,229,255,0.12)] pt-6">
                {isEditing ? (
                  /* ── Edit mode: configure which steps to compare ── */
                  <div className="w-full space-y-3">
                    <p className="text-center text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                      Configurar Efectividad
                    </p>

                    {/* From step */}
                    <div className="flex items-center gap-3 rounded-2xl border border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.8)] px-4 py-3 shadow-sm">
                      <span className="w-16 shrink-0 text-[11px] font-bold text-slate-400">
                        Desde
                      </span>
                      <select
                        value={effFromId}
                        onChange={(e) => setEffFromId(e.target.value)}
                        className="flex-1 cursor-pointer bg-transparent text-[12px] font-semibold text-slate-200 outline-none"
                        title="Paso inicial de efectividad"
                      >
                        <option value="__first__" className="bg-slate-900 text-white">— Primer paso (automático)</option>
                        {steps.map((s) => (
                          <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* To step */}
                    <div className="flex items-center gap-3 rounded-2xl border border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.8)] px-4 py-3 shadow-sm">
                      <span className="w-16 shrink-0 text-[11px] font-bold text-slate-400">
                        Hasta
                      </span>
                      <select
                        value={effToId}
                        onChange={(e) => setEffToId(e.target.value)}
                        className="flex-1 cursor-pointer bg-transparent text-[12px] font-semibold text-slate-200 outline-none"
                        title="Paso final de efectividad"
                      >
                        <option value="__last__" className="bg-slate-900 text-white">— Último paso (automático)</option>
                        {steps.map((s) => (
                          <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="flex items-center gap-3 rounded-2xl border border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.8)] px-4 py-3 shadow-sm">
                      <span className="w-16 shrink-0 text-[11px] font-bold text-slate-400">
                        Texto
                      </span>
                      <input
                        type="text"
                        value={effLabel}
                        onChange={(e) => setEffLabel(e.target.value)}
                        placeholder="Descripción de la conversión..."
                        title="Etiqueta de efectividad"
                        className="flex-1 bg-transparent text-[12px] font-semibold text-slate-200 outline-none placeholder:text-slate-600"
                      />
                    </div>

                    {/* Live preview */}
                    <div className="flex flex-col items-center pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-[#00e5ff] uppercase">
                        <Target className="h-4 w-4" /> Efectividad del Embudo
                      </div>
                      <div className="font-outfit text-3xl font-black text-white">
                        {eff.toFixed(1)}%
                      </div>
                      <div className="text-center text-[11px] font-medium tracking-wide text-slate-400">
                        {effLabel}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <>
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-[#00e5ff] uppercase">
                      <Target className="h-4 w-4" /> Efectividad del Embudo
                    </div>
                    <div className="font-outfit text-4xl font-black text-white">
                      {eff.toFixed(1)}%
                    </div>
                    <div className="text-center text-[11px] font-medium tracking-wide text-slate-400">
                      {effLabel}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToFirstScrollableAncestor]}
        >
          <div className="mb-8 grid grid-cols-1 gap-4 text-left transition-all duration-500 sm:grid-cols-6 lg:grid-cols-12">
            <SortableContext
              items={kpis.filter((k) => isEditing || k.isVisible !== false).map((k) => k.id)}
              strategy={rectSortingStrategy}
            >
              {(() => {
                const filtered = kpis.filter((k) => isEditing || k.isVisible !== false);
                let lastGroup = title ? "" : "Informes";

                return filtered.map((k) => {
                  // Determine value
                  let val: number | string = 0;
                  if (k.staticKey) {
                    val = (values as unknown as Record<string, number>)[k.staticKey] ?? 0;
                  } else {
                    val = previewValues[k.id] ?? dynamicValues[k.id] ?? 0;
                  }

                  // Format numeric values
                  if (typeof val === "number") {
                    const isDuration =
                      k.valType === "duration" ||
                      (k.staticKey && k.staticKey.endsWith("_segundos")) ||
                      k.label.toLowerCase().includes("duración media");

                    if (isDuration) {
                      val = formatDuration(val);
                    } else if (k.calcType === "avg" || k.isPercentage) {
                      val = Number(val).toFixed(1);
                    } else {
                      val = Number(val).toLocaleString("es-ES");
                    }
                  }
                  // Append suffix (e.g. ' min', ' seg', '%')
                  if (k.suffix && val !== null && val !== undefined) {
                    val = `${val}${k.suffix}`;
                  }
                  if (k.isPercentage && !k.suffix) val = `${val}%`;

                  const showHeader = k.group && k.group !== lastGroup;
                  if (k.group) lastGroup = k.group;

                  return (
                    <div
                      key={k.id}
                      className={cn(COL_SPAN_MAP[k.size || "4"] || "md:col-span-4", "md:contents")}
                    >
                      {showHeader && (
                        <SectionHeader
                          title={k.group!}
                          key={`header-${k.group}`}
                          isEditing={isEditing}
                          onTitleChange={(newTitle) => updateGroupName(k.group!, newTitle)}
                          onDelete={() => removeGroup(k.group!)}
                        />
                      )}
                      <SortableKpi
                        k={k}
                        isEditing={isEditing}
                        cycleSize={cycleSize}
                        updateKpi={updateKpi}
                        removeKpi={removeKpi}
                        val={val}
                        onConfigure={(id) => onConfigure(id)}
                      />
                    </div>
                  );
                });
              })()}
            </SortableContext>
          </div>
        </DndContext>
      )}

      {/* Unified Sidebar Editor */}
      {isEditing && editingKpiId && editingKpi && (
        <>
          <div
            className="animate-in fade-in fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm duration-300"
            onClick={() => setEditingKpiId(null)}
          />
          <div className="bg-card border-border animate-in slide-in-from-right fixed top-0 right-0 z-[101] flex h-full w-[400px] flex-col overflow-hidden border-l shadow-2xl duration-500">
            <div className="border-border bg-muted/30 flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-xl p-2 shadow-lg", editingKpi.color || "bg-primary")}>
                  {(() => {
                    const IconComp = ICON_MAP[editingKpi.icon] || TrendingUp;
                    return <IconComp className="h-5 w-5 text-white" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-black tracking-widest uppercase">
                    Configurar Bloque
                  </h3>
                  <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {(editingKpi.label as string) || "Sin nombre"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingKpiId(null)}
                className="hover:bg-muted text-muted-foreground hover:text-foreground group rounded-xl p-2 transition-all"
                title="Cerrar Editor"
              >
                <X className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6">
              {/* Identidad */}
              <section className="space-y-4">
                <div className="text-primary flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <h4 className="text-[11px] font-black tracking-[0.2em] uppercase">Identidad</h4>
                </div>
                <div className="space-y-3 pl-6">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                      Título del KPI
                    </label>
                    <input
                      type="text"
                      value={editingKpi.label as string}
                      onChange={(e) => updateKpi(editingKpi.id, { label: e.target.value })}
                      className="bg-muted border-border text-foreground focus:border-primary w-full rounded-xl border px-4 py-2.5 text-xs font-bold transition-all outline-none"
                      placeholder="Ej: Leads Totales"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                      Grupo (Categoría)
                    </label>
                    <input
                      type="text"
                      value={editingKpi.group || ""}
                      onChange={(e) => updateKpi(editingKpi.id, { group: e.target.value })}
                      className="bg-muted border-border text-foreground focus:border-primary w-full rounded-xl border px-4 py-2.5 text-xs font-bold transition-all outline-none"
                      placeholder="Ej: VENTAS"
                    />
                  </div>
                </div>
              </section>

              {/* Diseño */}
              {layout !== "funnel" && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Layout className="h-4 w-4" />
                    <h4 className="text-[11px] font-black tracking-[0.2em] uppercase">
                      Diseño y Apariencia
                    </h4>
                  </div>
                  <div className="space-y-5 pl-6">
                    <div className="space-y-2.5">
                      <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                        Seleccionar Icono
                      </label>
                      <div className="bg-muted/50 custom-scrollbar border-border grid max-h-40 grid-cols-6 gap-2 overflow-y-auto rounded-2xl border p-3">
                        {AVAILABLE_ICONS.map((iconName) => {
                          const IconComp = ICON_MAP[iconName] || TrendingUp;
                          return (
                            <button
                              key={iconName}
                              onClick={() => updateKpi(editingKpi.id, { icon: iconName })}
                              className={cn(
                                "flex aspect-square items-center justify-center rounded-xl p-2.5 transition-all",
                                editingKpi.icon === iconName
                                  ? "bg-primary scale-110 text-white shadow-xl"
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              )}
                              title={iconName}
                            >
                              <IconComp className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                        Color de Fondo
                      </label>
                      <div className="flex flex-wrap gap-2 p-1">
                        {AVAILABLE_COLORS.map((color) => (
                          <button
                            key={color.class}
                            onClick={() => updateKpi(editingKpi.id, { color: color.class })}
                            className={cn(
                              "h-7 w-7 rounded-full border-4 transition-all hover:scale-125",
                              color.class,
                              editingKpi.color === color.class
                                ? "border-primary ring-primary/20 scale-110 shadow-xl ring-2"
                                : "border-transparent opacity-80 hover:opacity-100"
                            )}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Datos */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-500">
                    <Database className="h-4 w-4" />
                    <h4 className="text-[11px] font-black tracking-[0.2em] uppercase">
                      Conexión de Datos
                    </h4>
                  </div>
                  <button
                    onClick={() => updateKpi(editingKpi.id, { isAdvanced: !editingKpi.isAdvanced })}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black tracking-wider uppercase transition-all",
                      editingKpi.isAdvanced
                        ? "border-indigo-400 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-muted text-muted-foreground border-border hover:border-indigo-500/50"
                    )}
                    title={
                      editingKpi.isAdvanced ? "Cambiar a Modo Simple" : "Cambiar a Modo Avanzado"
                    }
                  >
                    {editingKpi.isAdvanced ? (
                      <Bot className="h-3 w-3" />
                    ) : (
                      <Settings className="h-3 w-3" />
                    )}
                    {editingKpi.isAdvanced ? "Modo Avanzado" : "Modo Simple"}
                  </button>
                </div>

                <div className="space-y-4 pl-6">
                  {!editingKpi.isAdvanced ? (
                    <>
                      {/* Simple Mode UI */}
                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Origen (Tabla / Columna)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            title="Tabla Supabase"
                            value={editingKpi.targetCol?.split(".")[0] || "lead"}
                            onChange={(e) =>
                              updateKpi(editingKpi.id, {
                                targetCol: `${e.target.value}.${editingKpi.targetCol?.split(".")[1] || "id"}`,
                              })
                            }
                            className="bg-muted border-border text-foreground cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-all outline-none focus:border-indigo-500"
                          >
                            <option value="lead">lead</option>
                            <option value="llamadas">llamadas</option>
                            <option value="agendamientos">agendamientos</option>
                            <option value="lead_cualificacion">lead_cualificacion</option>
                            <option value="intentos_llamadas">intentos_llamadas</option>
                            <option value="conversaciones_whatsapp">conversaciones_whatsapp</option>
                          </select>
                          <select
                            value={editingKpi.targetCol?.split(".")[1] || "id"}
                            onChange={(e) =>
                              updateKpi(editingKpi.id, {
                                targetCol: `${editingKpi.targetCol?.split(".")[0] || "lead"}.${e.target.value}`,
                              })
                            }
                            className="bg-muted border-border text-foreground cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-all outline-none focus:border-indigo-500"
                            title="Columna de la tabla"
                          >
                            {(
                              SCHEMA_COLUMNS[editingKpi.targetCol?.split(".")[0] || "lead"] ||
                              SCHEMA_COLUMNS["lead"]
                            ).map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Método de Cálculo
                        </label>
                        <select
                          title="Operación"
                          value={editingKpi.calcType || "count"}
                          onChange={(e) =>
                            updateKpi(editingKpi.id, {
                              calcType: e.target.value as KpiConfig["calcType"],
                            })
                          }
                          className="bg-muted border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-all outline-none focus:border-indigo-500"
                        >
                          <option value="count">Contar Registros (Count)</option>
                          <option value="sum">Sumatoria de Valores (Sum)</option>
                          <option value="avg">Promedio de Valores (Avg)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Filtro Condicional (Opcional)
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={editingKpi.condCol || ""}
                            onChange={(e) => updateKpi(editingKpi.id, { condCol: e.target.value })}
                            className="bg-muted border-border text-foreground min-w-0 flex-1 cursor-pointer rounded-xl border px-2 py-2 text-[11px] font-bold transition-all outline-none focus:border-indigo-500"
                            title="Columna para el filtro"
                          >
                            <option value="">-- Columna --</option>
                            {(
                              SCHEMA_COLUMNS[editingKpi.targetCol?.split(".")[0] || "lead"] ||
                              SCHEMA_COLUMNS["lead"]
                            ).map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                          <select
                            title="Operador"
                            value={editingKpi.condOp || "="}
                            onChange={(e) =>
                              updateKpi(editingKpi.id, {
                                condOp: e.target.value as KpiConfig["condOp"],
                              })
                            }
                            className="bg-muted border-border text-foreground cursor-pointer rounded-xl border px-1 py-2 text-[11px] font-bold outline-none"
                          >
                            <option value="=">=</option>
                            <option value="!=">!=</option>
                            <option value="ILIKE">~</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                          </select>
                          <input
                            type="text"
                            placeholder="valor"
                            value={editingKpi.condVal || ""}
                            onChange={(e) => updateKpi(editingKpi.id, { condVal: e.target.value })}
                            className="bg-muted border-border text-foreground min-w-0 flex-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all outline-none focus:border-indigo-500"
                            title="Valor para el filtro"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-4 transition-all hover:bg-indigo-500/10"
                          onClick={() =>
                            updateKpi(editingKpi.id, { isPercentage: !editingKpi.isPercentage })
                          }
                          title="Activar/Desactivar métrica porcentual"
                        >
                          <div
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-all",
                              editingKpi.isPercentage
                                ? "border-indigo-500 bg-indigo-500 shadow-lg shadow-indigo-500/20"
                                : "border-border bg-muted"
                            )}
                          >
                            {editingKpi.isPercentage && (
                              <Check className="h-3.5 w-3.5 text-white" />
                            )}
                          </div>
                          <span className="text-foreground text-[11px] font-black tracking-wider uppercase">
                            Métrica Porcentual (%)
                          </span>
                        </div>

                        {editingKpi.isPercentage && (
                          <div className="bg-muted/40 border-border animate-in fade-in zoom-in-95 space-y-4 rounded-2xl border p-4 duration-200">
                            <div className="mb-1 flex items-center gap-2 text-indigo-400">
                              <Percent className="h-3.5 w-3.5" />
                              <label className="text-[9px] font-black tracking-widest uppercase">
                                Configuración Denominador
                              </label>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400">
                                  TABLA
                                </label>
                                <select
                                  title="Tabla Denominador"
                                  className="bg-card border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2 text-[11px] font-bold outline-none"
                                  value={editingKpi.denomTargetCol?.split(".")[0] || "lead"}
                                  onChange={(e) => {
                                    const col = editingKpi.denomTargetCol?.split(".")[1] || "id";
                                    updateKpi(editingKpi.id, {
                                      denomTargetCol: `${e.target.value}.${col}`,
                                    });
                                  }}
                                >
                                  <option value="lead">Leads</option>
                                  <option value="llamadas">Llamadas</option>
                                  <option value="intentos_llamadas">Intentos</option>
                                  <option value="agendamientos">Agendados</option>
                                  <option value="lead_cualificacion">Cualificación</option>
                                  <option value="conversaciones_whatsapp">WhatsApp</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400">
                                  COLUMNA
                                </label>
                                <select
                                  className="bg-card border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2 text-[11px] font-bold transition-all outline-none focus:border-indigo-500"
                                  value={editingKpi.denomTargetCol?.split(".")[1] || "id"}
                                  onChange={(e) => {
                                    const table =
                                      editingKpi.denomTargetCol?.split(".")[0] || "lead";
                                    updateKpi(editingKpi.id, {
                                      denomTargetCol: `${table}.${e.target.value}`,
                                    });
                                  }}
                                  title="Columna del denominador"
                                >
                                  {(
                                    SCHEMA_COLUMNS[
                                      editingKpi.denomTargetCol?.split(".")[0] || "lead"
                                    ] || SCHEMA_COLUMNS["lead"]
                                  ).map((col) => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400">
                                CÁLCULO
                              </label>
                              <select
                                title="Tipo de Cálculo"
                                className="bg-card border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2 text-[11px] font-bold outline-none"
                                value={editingKpi.denomCalcType || "count"}
                                onChange={(e) =>
                                  updateKpi(editingKpi.id, {
                                    denomCalcType: e.target.value as KpiConfig["denomCalcType"],
                                  })
                                }
                              >
                                <option value="count">Contar (Count)</option>
                                <option value="sum">Sumar (Sum)</option>
                                <option value="avg">Promedio (Avg)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="animate-in fade-in space-y-6 duration-300">
                      {/* Advanced Mode UI */}
                      <div className="bg-muted/60 border-primary/20 space-y-2.5 rounded-[28px] border-2 p-4 shadow-inner">
                        <div className="mb-2 flex items-center gap-2">
                          <Target className="text-primary h-4 w-4" />
                          <label className="text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase">
                            Fórmula Matemática
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Ej: (a / b) * 100"
                          value={editingKpi.formula || ""}
                          onChange={(e) => updateKpi(editingKpi.id, { formula: e.target.value })}
                          className="bg-card border-primary/30 text-primary focus:border-primary placeholder:text-muted-foreground/30 w-full rounded-2xl border-b-4 px-5 py-4 text-center text-lg font-black uppercase transition-all outline-none"
                          title="Fórmula matemática para el KPI"
                        />
                        <p className="text-muted-foreground px-2 text-[10px] font-bold italic">
                          Usa las etiquetas (a, b, c...) definidas abajo.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <label className="text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase">
                            Partes de Datos
                          </label>
                          <button
                            onClick={() => {
                              const parts = { ...(editingKpi.parts || {}) };
                              const nextId = String.fromCharCode(97 + Object.keys(parts).length);
                              parts[nextId] = {
                                id: nextId,
                                targetCol: "lead.id",
                                calcType: "count",
                              };
                              updateKpi(editingKpi.id, { parts });
                            }}
                            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black tracking-wider uppercase transition-all"
                            title="Añadir nueva parte de datos"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Añadir Parte
                          </button>
                        </div>

                        <div className="space-y-4">
                          {Object.entries(editingKpi.parts || {}).map(([id, part]) => (
                            <div
                              key={id}
                              className="bg-card border-border group/part animate-in slide-in-from-bottom-2 relative space-y-4 overflow-hidden rounded-3xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md"
                            >
                              <div className="bg-primary/50 absolute top-0 bottom-0 left-0 w-1.5" />
                              <div className="mb-1 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="bg-primary shadow-primary/20 flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white uppercase shadow-lg">
                                    {id}
                                  </div>
                                  <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                                    Configurar Parte
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    const parts = { ...(editingKpi.parts || {}) };
                                    delete parts[id];
                                    updateKpi(editingKpi.id, { parts });
                                  }}
                                  className="text-muted-foreground p-1.5 transition-colors hover:text-red-500"
                                  title="Eliminar Parte"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                    Tabla
                                  </label>
                                  <select
                                    title="Tabla"
                                    value={part.targetCol.split(".")[0]}
                                    onChange={(e) => {
                                      const parts = { ...(editingKpi.parts || {}) };
                                      parts[id] = {
                                        ...part,
                                        targetCol: `${e.target.value}.${part.targetCol.split(".")[1] || "id"}`,
                                      };
                                      updateKpi(editingKpi.id, { parts });
                                    }}
                                    className="bg-muted/50 border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                                  >
                                    <option value="lead">lead</option>
                                    <option value="llamadas">llamadas</option>
                                    <option value="agendamientos">agendamientos</option>
                                    <option value="lead_cualificacion">lead_cualificacion</option>
                                    <option value="intentos_llamadas">intentos</option>
                                    <option value="conversaciones_whatsapp">whatsapp</option>
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                    Método
                                  </label>
                                  <select
                                    title="Cálculo"
                                    value={part.calcType}
                                    onChange={(e) => {
                                      const parts = { ...(editingKpi.parts || {}) };
                                      parts[id] = {
                                        ...part,
                                        calcType: e.target.value as "count" | "sum" | "avg",
                                      };
                                      updateKpi(editingKpi.id, { parts });
                                    }}
                                    className="bg-muted/50 border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                                  >
                                    <option value="count">Contar</option>
                                    <option value="sum">Sumar</option>
                                    <option value="avg">Promedio</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                  Campo (Columna)
                                </label>
                                <select
                                  value={part.targetCol.split(".")[1] || "id"}
                                  onChange={(e) => {
                                    const parts = { ...(editingKpi.parts || {}) };
                                    parts[id] = {
                                      ...part,
                                      targetCol: `${part.targetCol.split(".")[0]}.${e.target.value}`,
                                    };
                                    updateKpi(editingKpi.id, { parts });
                                  }}
                                  className="bg-muted/50 border-border text-foreground focus:border-primary w-full cursor-pointer rounded-xl border px-4 py-2 text-xs font-bold transition-all outline-none"
                                  title="Columna"
                                >
                                  {(
                                    SCHEMA_COLUMNS[part.targetCol.split(".")[0] || "lead"] ||
                                    SCHEMA_COLUMNS["lead"]
                                  ).map((col) => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                  Filtro Parte
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    value={part.condCol || ""}
                                    onChange={(e) => {
                                      const parts = { ...(editingKpi.parts || {}) };
                                      parts[id] = { ...part, condCol: e.target.value };
                                      updateKpi(editingKpi.id, { parts });
                                    }}
                                    className="bg-muted/30 border-border text-foreground min-w-0 flex-[2] cursor-pointer rounded-xl border px-2 py-2 text-[10px] font-bold outline-none"
                                    title="Filtro"
                                  >
                                    <option value="">-- Ninguno --</option>
                                    {(
                                      SCHEMA_COLUMNS[part.targetCol.split(".")[0] || "lead"] ||
                                      SCHEMA_COLUMNS["lead"]
                                    ).map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    title="Op"
                                    value={part.condOp || "="}
                                    onChange={(e) => {
                                      const parts = { ...(editingKpi.parts || {}) };
                                      parts[id] = {
                                        ...part,
                                        condOp: e.target.value as "=" | "!=" | "ILIKE" | ">" | "<",
                                      };
                                      updateKpi(editingKpi.id, { parts });
                                    }}
                                    className="bg-muted/30 border-border text-foreground flex-1 rounded-xl border px-1 py-2 text-[10px] font-bold"
                                  >
                                    <option value="=">=</option>
                                    <option value="!=">!=</option>
                                    <option value="ILIKE">~</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Val"
                                    value={part.condVal || ""}
                                    onChange={(e) => {
                                      const parts = { ...(editingKpi.parts || {}) };
                                      parts[id] = { ...part, condVal: e.target.value };
                                      updateKpi(editingKpi.id, { parts });
                                    }}
                                    className="bg-muted/30 border-border text-foreground flex-[2] rounded-xl border px-2 py-2 text-[10px] font-bold outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="border-border bg-muted/30 space-y-3 border-t p-6">
              {/* Live preview value — shows current dynamicValues entry */}
              {!editingKpi.staticKey && dynamicValues[editingKpi.id] != null && (
                <div className="bg-card border-border flex items-center justify-between gap-3 rounded-2xl border p-3">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[9px] font-black tracking-widest uppercase">
                      Valor actual
                    </span>
                    <span className="text-primary text-lg font-black">
                      {editingKpi.isPercentage
                        ? `${Number(dynamicValues[editingKpi.id]).toFixed(1)}%`
                        : Number(dynamicValues[editingKpi.id]).toLocaleString("es-ES")}
                    </span>
                  </div>
                  <Database className="text-muted-foreground h-4 w-4" />
                </div>
              )}
              <button
                onClick={handleFinalizeEdition}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:shadow-primary/20 w-full rounded-2xl py-4 text-sm font-black tracking-[0.2em] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Selección de Grupo */}
      {isAddingKpi && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="animate-in fade-in absolute inset-0 bg-slate-950/60 backdrop-blur-md duration-300"
            onClick={() => setIsAddingKpi(false)}
          />
          <div className="bg-card border-border animate-in zoom-in-95 relative w-full max-w-md rounded-[32px] border p-8 shadow-2xl duration-300">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-foreground text-xl font-black tracking-tight uppercase">
                  Nuevo Bloque
                </h2>
                <p className="text-muted-foreground mt-1 text-xs font-bold tracking-wider uppercase">
                  Selecciona la ubicación del bloque
                </p>
              </div>
              <button
                onClick={() => setIsAddingKpi(false)}
                className="hover:bg-muted rounded-xl p-2 transition-all"
                title="Cerrar"
              >
                <X className="text-muted-foreground h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-muted-foreground ml-1 text-[10px] font-black tracking-[0.2em] uppercase">
                  Grupos Existentes
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {existingGroups.length > 0 ? (
                    existingGroups.map((group) => (
                      <button
                        key={group}
                        onClick={() => addKpi(group)}
                        className="bg-muted/40 hover:bg-primary/5 border-border hover:border-primary/30 group flex items-center justify-between rounded-2xl border p-4 transition-all"
                      >
                        <span className="text-foreground text-xs font-black tracking-wider uppercase">
                          {group}
                        </span>
                        <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    ))
                  ) : (
                    <p className="bg-muted/20 text-muted-foreground rounded-2xl py-4 text-center text-[10px] italic">
                      Sin grupos definidos aún
                    </p>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="border-border w-full border-t" />
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase">
                  <span className="bg-card text-muted-foreground px-3 tracking-[0.3em]">
                    o crea uno nuevo
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del nuevo grupo..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newGroupName.trim()) {
                        addKpi(newGroupName.trim().toUpperCase());
                        setNewGroupName("");
                      }
                    }}
                    className="bg-muted border-border text-foreground focus:border-primary flex-1 rounded-xl border px-4 py-3 text-xs font-bold transition-all outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newGroupName.trim()) {
                        addKpi(newGroupName.trim().toUpperCase());
                        setNewGroupName("");
                      }
                    }}
                    disabled={!newGroupName.trim()}
                    className="bg-primary hover:bg-primary/90 rounded-xl px-4 text-white transition-all disabled:opacity-50 disabled:grayscale"
                    title="Confirmar nuevo grupo"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-border mt-8 border-t pt-6">
              <button
                onClick={() => setIsAddingKpi(false)}
                className="text-muted-foreground hover:text-foreground w-full py-3 text-[10px] font-black tracking-widest uppercase transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
