"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { ChartConfig, Tenant } from "@/types/tenant";
import { AnalyticsFilters, ChartRow } from "@/lib/actions/analytics";
import { RevealOnScroll } from "@/components/common/RevealOnScroll";
import {
  AreaChartComponent,
  VerticalBarChart,
  DonutChart,
  HeatmapChartComponent,
  FunnelChartComponent,
} from "@/components/charts/DashboardCharts";
import {
  Save,
  X,
  EyeOff,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  PieChart,
  BarChart3,
  AreaChart,
  Settings,
  Layout,
  Database,
  Bot,
  LayoutGrid,
  Target,
} from "lucide-react";
import { SCHEMA_COLUMNS } from "@/lib/constants/schema";
import { summarizeChartData } from "@/lib/utils/chart-summary";
import { cn } from "@/lib/utils";
import { updateTenant } from "@/lib/actions/tenant";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

type ChartData =
  | { label: string; value: number | string }[]
  | { day: number; hour: number; value: number }[];

interface SortableChartProps {
  c: ChartConfig;
  idx: number;
  isEditing: boolean;
  cycleSize: (id: string, current: string) => void;
  updateChart: (id: string, updates: Partial<ChartConfig>) => void;
  removeChart: (id: string) => void;
  chartData: ChartData;
  totalCount: number;
  onConfigure: (id: string) => void;
}

function SortableChartItem({
  c,
  idx,
  isEditing,
  cycleSize,
  updateChart,
  removeChart,
  chartData,
  onConfigure,
}: SortableChartProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: c.id,
    disabled: !isEditing,
  });

  // Sprint 2B mejora UX (Bloque A feedback 25-05): fade-in + translate-y on-scroll
  // con cascada por idx. Respeta prefers-reduced-motion (WCAG 2.3.3).
  // Se desactiva durante edit mode para no interferir con DnD transform.
  //
  // IMPORTANTE: el dashboard layout tiene el scroll en <main class="overflow-y-auto">,
  // no en window. El IntersectionObserver necesita `root` = ese <main> para detectar
  // visibilidad correcta. Si root=null usaría window y nunca dispararía para charts
  // que están dentro del area scrollable pero offscreen del main.
  const revealRef = useRef<HTMLDivElement | null>(null);
  // Lazy initializer: si edit mode O reduced-motion → arrancar ya revelado.
  const [revealed, setRevealed] = useState<boolean>(() => {
    if (isEditing) return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (revealed) return;
    const el = revealRef.current;
    if (!el) return;
    // Buscar el ancestro scrollable (main del dashboard layout)
    const findScrollRoot = (node: HTMLElement | null): Element | null => {
      let cur: HTMLElement | null = node?.parentElement ?? null;
      while (cur && cur !== document.body) {
        const cs = getComputedStyle(cur);
        if (
          (cs.overflowY === "auto" || cs.overflowY === "scroll") &&
          cur.scrollHeight > cur.clientHeight
        ) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null; // fallback al viewport
    };
    const root = findScrollRoot(el);
    const rootRect = root ? root.getBoundingClientRect() : null;
    const rect = el.getBoundingClientRect();
    const delay = Math.min(idx * 90, 480);
    const alreadyVisible = rootRect
      ? rect.top < rootRect.bottom && rect.bottom > rootRect.top
      : rect.top < window.innerHeight && rect.bottom > 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    if (alreadyVisible) {
      timer = setTimeout(() => setRevealed(true), delay);
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && observer) {
              timer = setTimeout(() => setRevealed(true), delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { root, threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      observer.observe(el);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [idx, revealed]);
  // Edit mode siempre fuerza revelado (sin setState en effect: derivamos directo).
  const effectiveRevealed = revealed || isEditing;

  const colSpanClass =
    c.size === "12"
      ? "lg:col-span-12"
      : c.size === "8"
        ? "lg:col-span-8"
        : c.size === "6"
          ? "lg:col-span-6"
          : "lg:col-span-4";

  const renderChart = () => {
    if (c.type === "heatmap")
      return (
        <HeatmapChartComponent
          title={c.title}
          data={chartData as unknown as { day: number; hour: number; value: number }[]}
        />
      );
    if (c.type === "vertical-bar")
      return <VerticalBarChart title={c.title} data={chartData as unknown as ChartRow[]} />;
    if (c.type === "donut")
      return <DonutChart title={c.title} data={chartData as unknown as ChartRow[]} />;
    if (c.type === "funnel")
      return <FunnelChartComponent title={c.title} data={chartData as unknown as ChartRow[]} />;
    return <AreaChartComponent title={c.title} data={chartData as unknown as ChartRow[]} />;
  };

  const transformStr = transform ? CSS.Translate.toString(transform) : undefined;

  // Combinar refs: setNodeRef de dnd-kit + revealRef de IntersectionObserver.
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    revealRef.current = node;
  };

  return (
    <div
      ref={setRefs}
      className={cn(
        colSpanClass,
        "group relative transition-all duration-700 ease-out will-change-[opacity,transform]",
        isDragging && "opacity-50",
        transformStr && `[transform:${transformStr}]`,
        transition && `[transition:${transition}]`,
        // on-scroll fade-in (sólo cuando NO se edita para no chocar con dnd-kit transform)
        !effectiveRevealed && "translate-y-6 opacity-0",
        effectiveRevealed && "translate-y-0 opacity-100"
      )}
    >
      <div
        className={cn(
          "h-full transition-all duration-300",
          isEditing &&
            "ring-primary/30 bg-card relative z-[40] scale-[1.02] rounded-[32px] shadow-2xl ring-4",
          isEditing && c.isVisible === false && "opacity-40 grayscale"
        )}
      >
        {/* Sprint 2B phase-06 WCAG 2.2 AA: alternative text para screen readers */}
        {/* h-full obligatorio: sin él el ChartCard hijo (flex h-full) no se estira al
            espacio del grid cell con auto-rows-fr y queda en altura natural. */}
        <div
          role="img"
          className="h-full"
          aria-label={`Gráfico: ${c.title}. ${summarizeChartData(
            (c.type === "heatmap" ? null : (chartData as unknown as ChartRow[])) ?? null
          )}`}
        >
          {renderChart()}
        </div>

        {isEditing && (
          <div className="bg-background/40 border-primary/50 absolute inset-0 z-[50] flex items-center justify-center rounded-[32px] border-2 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 dark:bg-slate-950/40">
            <div className="bg-card/90 border-border flex items-center gap-1.5 rounded-2xl border p-2 shadow-xl backdrop-blur-md">
              {/* Drag Handle */}
              <div
                {...attributes}
                {...listeners}
                className="text-muted-foreground hover:text-primary cursor-grab p-2 active:cursor-grabbing"
                title="Arrastrar"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              <button
                title="Configurar Gráfico"
                onClick={() => onConfigure(c.id)}
                className="text-primary hover:bg-primary/10 bg-primary/5 border-primary/20 rounded-lg border p-2 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                title="Cambiar Tamaño"
                onClick={() => cycleSize(c.id, c.size || "6")}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg p-2 transition-colors"
              >
                <Layout className="h-5 w-5" />
              </button>

              <button
                title={c.isVisible === false ? "Mostrar" : "Ocultar"}
                onClick={() => updateChart(c.id, { isVisible: c.isVisible === false })}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  c.isVisible === false
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                {c.isVisible === false ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              <button
                title="Eliminar Gráfico"
                onClick={() => removeChart(c.id)}
                className="text-muted-foreground rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartManager({
  tenant,
  initialCharts,
  data,
  isAdmin,
  configKey = "charts",
  title,
  editButtonLabel,
  extraSlot,
  extraSlotSize = "6",
}: Props) {
  const editLabel = editButtonLabel ?? "Personalizar Gráficos";
  const extraSlotColSpan =
    extraSlotSize === "12"
      ? "lg:col-span-12"
      : extraSlotSize === "8"
        ? "lg:col-span-8"
        : extraSlotSize === "4"
          ? "lg:col-span-4"
          : "lg:col-span-6";
  const [isEditing, setIsEditing] = useState(false);
  const [charts, setCharts] = useState<ChartConfig[]>(initialCharts);
  const [saving, setSaving] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const editingChart = charts.find((c) => c.id === editingChartId);

  async function handleSave() {
    setSaving(true);
    try {
      const newConfig = {
        ...(tenant.config as Record<string, unknown>),
        [configKey]: charts,
      };
      const res = await updateTenant(tenant.id, { config: newConfig });
      if (res.success) {
        setIsEditing(false);
        router.refresh();
      } else {
        toast({ variant: "error", title: "Error al guardar", description: res.error });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "error", title: "Error inesperado" });
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCharts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function updateChart(id: string, updates: Partial<ChartConfig>) {
    setCharts(charts.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function removeChart(id: string) {
    if (confirm("¿Eliminar este gráfico?")) {
      setCharts(charts.filter((c) => c.id !== id));
    }
  }

  function addChart() {
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      title: "Nuevo Gráfico",
      type: "area",
      size: "6",
      dataKey: "lead.fecha_ingreso_crm",
      isVisible: true,
    };
    setCharts([...charts, newChart]);
    setEditingChartId(newChart.id);
  }

  function cycleSize(id: string, current: string) {
    const sizes: ChartConfig["size"][] = ["4", "6", "8", "12"];
    const currentIndex = sizes.indexOf(current as ChartConfig["size"]);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    updateChart(id, { size: nextSize });
  }

  return (
    <div className="relative mb-10">
      <div className="mb-8 flex items-center justify-between">
        {title === undefined ? (
          <div className="flex items-center gap-4">
            <div className="rounded-[20px] border border-indigo-500/20 bg-indigo-500/10 p-3">
              <PieChart className="h-8 w-8 text-indigo-400" />
            </div>
            <div>
              {/* Sprint 3 SP-4-WCAG-09: h1→h2 para heading hierarchy correcta (un único h1 por página, el del dashboard). */}
              <h2 className="text-[32px] leading-tight font-bold tracking-tight text-white">
                Análisis <span className="text-indigo-400">Visual</span>
              </h2>
              <p className="text-[15px] font-medium text-slate-400">
                Histogramas, tendencias y distribución de datos
              </p>
            </div>
          </div>
        ) : title === false || title === null ? null : typeof title === "string" ? (
          <h2 className="text-[12px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            {title}
          </h2>
        ) : (
          title
        )}

        {isAdmin && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={addChart}
                  className="text-primary bg-card border-primary/20 hover:bg-primary/5 flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" /> Nuevo Gráfico
                </button>
                <div className="bg-border mx-1 h-6 w-px" />
                <button
                  onClick={() => {
                    setCharts(initialCharts);
                    setIsEditing(false);
                  }}
                  className="text-muted-foreground bg-card border-border hover:bg-muted flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20 flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </>
            ) : (
              // Sprint 3 SP-4-WCAG-08: aria-label + title refuerzan accesibilidad para screen readers.
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToFirstScrollableAncestor]}
      >
        <div className="grid auto-rows-fr grid-cols-1 gap-6 lg:grid-cols-12">
          <SortableContext
            items={charts.filter((c) => isEditing || c.isVisible !== false).map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            {charts
              .filter((c) => isEditing || c.isVisible !== false)
              .map((c, idx) => (
                <SortableChartItem
                  key={c.id}
                  c={c}
                  idx={idx}
                  isEditing={isEditing}
                  cycleSize={cycleSize}
                  updateChart={updateChart}
                  removeChart={removeChart}
                  chartData={data[c.id] || []}
                  totalCount={charts.length}
                  onConfigure={(id) => setEditingChartId(id)}
                />
              ))}
          </SortableContext>
          {/* Sprint 2B mejora UX: slot extra (no draggable, no editable) integrado en el
           * mismo grid 12-col que los charts dynamic. Permite a OverviewSection meter
           * <OverviewCanalDistribution /> alineado con "Leads por tipo" (no debajo).
           * Animado on-scroll igual que los SortableChartItem. */}
          {extraSlot && (
            <RevealOnScroll delay={Math.min(charts.length * 90, 540)} className={extraSlotColSpan}>
              {extraSlot}
            </RevealOnScroll>
          )}
        </div>
      </DndContext>

      {/* Sidebar Editor */}
      {isEditing && editingChartId && editingChart && (
        <>
          <div
            className="animate-in fade-in fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm duration-300"
            onClick={() => setEditingChartId(null)}
          />
          <div className="bg-card border-border animate-in slide-in-from-right fixed top-0 right-0 z-[101] flex h-full w-[420px] flex-col overflow-hidden border-l shadow-2xl duration-500">
            <div className="border-border bg-muted/30 flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary rounded-xl p-2 shadow-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-black tracking-widest uppercase">
                    Configurar Gráfico
                  </h3>
                  <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {editingChart.title || "Sin título"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingChartId(null)}
                className="hover:bg-muted rounded-xl p-2 transition-all"
                title="Cerrar Editor"
              >
                <X className="text-muted-foreground h-6 w-6" />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6">
              {/* Visual Type */}
              <section className="space-y-4">
                <div className="text-primary flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  <h4 className="text-[11px] font-black tracking-[0.2em] uppercase">
                    Tipo de Visualización
                  </h4>
                </div>
                <div className="grid grid-cols-4 gap-2 pl-6">
                  {[
                    { type: "area", icon: <AreaChart className="h-4 w-4" />, label: "ÁREA" },
                    {
                      type: "vertical-bar",
                      icon: <BarChart3 className="h-4 w-4" />,
                      label: "BARRAS",
                    },
                    { type: "donut", icon: <PieChart className="h-4 w-4" />, label: "DONUT" },
                    { type: "heatmap", icon: <LayoutGrid className="h-4 w-4" />, label: "MAPA" },
                  ].map((t) => (
                    <button
                      key={t.type}
                      onClick={() =>
                        updateChart(editingChart.id, {
                          type: t.type as unknown as ChartConfig["type"],
                        })
                      }
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all hover:scale-105",
                        editingChart.type === t.type
                          ? "bg-primary border-primary text-white shadow-lg"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {t.icon}
                      <span className="text-[8px] font-black tracking-tighter uppercase">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Identity */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-500">
                  <Settings className="h-4 w-4" />
                  <h4 className="text-[11px] font-black tracking-[0.2em] uppercase">Identidad</h4>
                </div>
                <div className="space-y-3 pl-6">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                      Título del Gráfico
                    </label>
                    <input
                      type="text"
                      value={editingChart.title}
                      onChange={(e) => updateChart(editingChart.id, { title: e.target.value })}
                      className="bg-muted border-border text-foreground focus:border-primary w-full rounded-xl border px-4 py-2.5 text-xs font-bold transition-all outline-none"
                      title="Título del Gráfico"
                      placeholder="Ej: Leads por día"
                    />
                  </div>
                </div>
              </section>

              {/* Data Connection */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-500">
                    <Database className="h-4 w-4" />
                    <h4 className="text-[11px] font-black tracking-[0.2em] uppercase">
                      Conexión de Datos
                    </h4>
                  </div>
                  <button
                    onClick={() =>
                      updateChart(editingChart.id, { isAdvanced: !editingChart.isAdvanced })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black tracking-wider uppercase transition-all",
                      editingChart.isAdvanced
                        ? "border-indigo-400 bg-indigo-500 text-white shadow-lg"
                        : "bg-muted text-muted-foreground border-border hover:border-indigo-400"
                    )}
                  >
                    {editingChart.isAdvanced ? (
                      <Bot className="h-3 w-3" />
                    ) : (
                      <Settings className="h-3 w-3" />
                    )}
                    {editingChart.isAdvanced ? "Avanzado" : "Simple"}
                  </button>
                </div>

                <div className="space-y-4 pl-6">
                  {!editingChart.isAdvanced ? (
                    <div className="space-y-4">
                      {/* ── Origen: Tabla / Columna ── */}
                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Origen (Tabla / Columna)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            title="Tabla"
                            value={editingChart.xKey?.split(".")[0] || "lead"}
                            onChange={(e) => {
                              const table = e.target.value;
                              const cols = SCHEMA_COLUMNS[table] || SCHEMA_COLUMNS["lead"];
                              const col = cols[0] || "id";
                              updateChart(editingChart.id, {
                                xKey: `${table}.${col}`,
                                dataKey: "dynamic",
                              });
                            }}
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
                            title="Columna"
                            value={editingChart.xKey?.split(".")[1] || "fecha_ingreso_crm"}
                            onChange={(e) => {
                              const table = editingChart.xKey?.split(".")[0] || "lead";
                              updateChart(editingChart.id, {
                                xKey: `${table}.${e.target.value}`,
                                dataKey: "dynamic",
                              });
                            }}
                            className="bg-muted border-border text-foreground cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition-all outline-none focus:border-indigo-500"
                          >
                            {(
                              SCHEMA_COLUMNS[editingChart.xKey?.split(".")[0] || "lead"] ||
                              SCHEMA_COLUMNS["lead"]
                            ).map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* ── Eje X (Agrupación) ── */}
                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Eje X — ¿Cómo agrupar?
                        </label>
                        <select
                          value={editingChart.xKey || "lead.fecha_ingreso_crm"}
                          onChange={(e) =>
                            updateChart(editingChart.id, {
                              xKey: e.target.value,
                              dataKey: "dynamic",
                            })
                          }
                          className="bg-muted border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold outline-none"
                          title="Eje X — Dimensión"
                        >
                          <optgroup label="⏱ Tiempo">
                            <option value="lead.fecha_ingreso_crm">
                              📅 Día de ingreso de lead
                            </option>
                            <option value="llamadas.fecha_inicio">📅 Día de llamada</option>
                            <option value="agendamientos.fecha_agendada_cliente">
                              📅 Día de agendamiento
                            </option>
                            <option value="lead_cualificacion.fecha_creacion">
                              📅 Día de cualificación
                            </option>
                            <option value="conversaciones_whatsapp.fecha_creacion">
                              📅 Día de conversación WA
                            </option>
                          </optgroup>
                          <optgroup label="🎯 Segmentación">
                            <option value="lead.campana">📢 Campaña</option>
                            <option value="lead.origen">🌐 Origen del lead</option>
                            <option value="lead.tipo_lead">🏷️ Tipo de lead</option>
                            <option value="lead.pais">🌍 País</option>
                            <option value="llamadas.estado_llamada">📞 Estado de llamada</option>
                            <option value="llamadas.razon_termino">🔚 Razón de término</option>
                            <option value="llamadas.tipo_agente">🤖 Tipo de agente</option>
                            <option value="lead_cualificacion.cualificacion">
                              ⭐ Cualificación
                            </option>
                            <option value="lead_cualificacion.motivo_anulacion">
                              ❌ Motivo de anulación
                            </option>
                            <option value="conversaciones_whatsapp.estado">
                              💬 Estado de conversación
                            </option>
                          </optgroup>
                        </select>
                        <p className="px-1 text-[9px] font-bold text-slate-400 italic">
                          Define las etiquetas del eje horizontal del gráfico.
                        </p>
                      </div>

                      {/* ── Eje Y (Métrica) ── */}
                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Eje Y — ¿Qué medir?
                        </label>
                        <select
                          value={editingChart.yKey || "__count__"}
                          onChange={(e) =>
                            updateChart(editingChart.id, {
                              yKey: e.target.value === "__count__" ? undefined : e.target.value,
                            })
                          }
                          className="bg-muted border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold outline-none"
                          title="Eje Y — Métrica"
                        >
                          <optgroup label="📊 Conteos generales">
                            <option value="__count__">🔢 Número de registros (COUNT)</option>
                            <option value="lead.id">👥 Número de leads</option>
                            <option value="llamadas.id">📞 Número de llamadas</option>
                            <option value="agendamientos.id">📅 Número de agendamientos</option>
                            <option value="lead_cualificacion.id">
                              ⭐ Número de cualificaciones
                            </option>
                            <option value="conversaciones_whatsapp.id">
                              💬 Número de conversaciones
                            </option>
                          </optgroup>
                          <optgroup label="⏱ Tiempo y duración">
                            <option value="llamadas.duracion_segundos">
                              ⏱ Segundos de llamada
                            </option>
                          </optgroup>
                          <optgroup label="🔢 Intentos">
                            <option value="intentos_llamadas.numero_intento">
                              🔄 Número de intento
                            </option>
                          </optgroup>
                        </select>
                        <p className="px-1 text-[9px] font-bold text-slate-400 italic">
                          {
                            'Define los valores del eje vertical (COUNT si se elige "Número de registros").'
                          }
                        </p>
                      </div>

                      {/* ── Método de Cálculo ── */}
                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Método de Cálculo
                        </label>
                        <select
                          title="Método de Cálculo"
                          value={editingChart.calcType || "count"}
                          onChange={(e) =>
                            updateChart(editingChart.id, {
                              calcType: e.target.value as ChartConfig["calcType"],
                            })
                          }
                          className="bg-muted border-border text-foreground w-full cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-bold outline-none"
                        >
                          <option value="count">Contar Registros (Count)</option>
                          <option value="sum">Sumatoria de Valores (Sum)</option>
                          <option value="avg">Promedio de Valores (Avg)</option>
                        </select>
                      </div>

                      {/* ── Filtro Condicional ── */}
                      <div className="space-y-2">
                        <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
                          Filtro Condicional (Opcional)
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={editingChart.condCol || ""}
                            onChange={(e) =>
                              updateChart(editingChart.id, { condCol: e.target.value || undefined })
                            }
                            className="bg-muted border-border text-foreground min-w-0 flex-1 cursor-pointer rounded-xl border px-2 py-2 text-[11px] font-bold outline-none"
                            title="Columna para el filtro"
                          >
                            <option value="">-- Columna --</option>
                            {/* Dynamic columns based on xKey table */}
                            {(
                              SCHEMA_COLUMNS[editingChart.xKey?.split(".")[0] || "lead"] ||
                              SCHEMA_COLUMNS["lead"]
                            ).map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                          <select
                            title="Operador de filtro"
                            value={editingChart.condOp || "="}
                            onChange={(e) =>
                              updateChart(editingChart.id, {
                                condOp: e.target.value as ChartConfig["condOp"],
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
                            value={editingChart.condVal || ""}
                            onChange={(e) =>
                              updateChart(editingChart.id, { condVal: e.target.value || undefined })
                            }
                            className="bg-muted border-border text-foreground min-w-0 flex-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all outline-none focus:border-indigo-500"
                            title="Valor del filtro"
                          />
                        </div>
                        <p className="px-1 text-[9px] font-bold text-slate-400 italic">
                          Ej: estado_llamada = completed · solo leads de una campaña · etc.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in space-y-6 duration-300">
                      <div className="bg-muted/60 border-primary/20 space-y-2.5 rounded-3xl border-2 p-4 shadow-inner">
                        <div className="mb-2 flex items-center gap-2">
                          <Target className="text-primary h-4 w-4" />
                          <label className="text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase">
                            Fórmula Temporal
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Ej: (a / b) * 100"
                          value={editingChart.formula || ""}
                          onChange={(e) =>
                            updateChart(editingChart.id, { formula: e.target.value })
                          }
                          className="bg-card border-primary/30 text-primary w-full rounded-2xl border-b-4 px-5 py-4 text-center text-lg font-black uppercase outline-none"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <label className="text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase">
                            Series de Datos
                          </label>
                          <button
                            onClick={() => {
                              const parts = { ...(editingChart.parts || {}) };
                              const nextId = String.fromCharCode(97 + Object.keys(parts).length);
                              parts[nextId] = {
                                id: nextId,
                                targetCol: "lead.id",
                                calcType: "count",
                              };
                              updateChart(editingChart.id, { parts });
                            }}
                            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black tracking-wider uppercase"
                          >
                            <Plus className="h-3.5 w-3.5" /> Añadir Serie
                          </button>
                        </div>

                        <div className="space-y-4">
                          {Object.entries(editingChart.parts || {}).map(([id, part]) => (
                            <div
                              key={id}
                              className="bg-card border-border relative space-y-4 rounded-3xl border p-5 shadow-sm"
                            >
                              <div className="bg-primary/50 absolute top-0 bottom-0 left-0 w-1.5" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white uppercase">
                                    {id}
                                  </div>
                                  <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
                                    Configurar Serie
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    const parts = { ...(editingChart.parts || {}) };
                                    delete parts[id];
                                    updateChart(editingChart.id, { parts });
                                  }}
                                  className="text-muted-foreground hover:text-red-500"
                                  title="Eliminar Serie"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <select
                                  title="Tabla"
                                  value={part.targetCol.split(".")[0]}
                                  onChange={(e) => {
                                    const parts = { ...(editingChart.parts || {}) };
                                    parts[id] = {
                                      ...part,
                                      targetCol: `${e.target.value}.${part.targetCol.split(".")[1] || "id"}`,
                                    };
                                    updateChart(editingChart.id, { parts });
                                  }}
                                  className="bg-muted/50 border-border rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                                >
                                  <option value="lead">lead</option>
                                  <option value="llamadas">llamadas</option>
                                  <option value="agendamientos">agendamientos</option>
                                  <option value="lead_cualificacion">cualificacion</option>
                                </select>
                                <select
                                  title="Método"
                                  value={part.calcType}
                                  onChange={(e) => {
                                    const parts = { ...(editingChart.parts || {}) };
                                    parts[id] = {
                                      ...part,
                                      calcType: e.target.value as "count" | "sum" | "avg",
                                    };
                                    updateChart(editingChart.id, { parts });
                                  }}
                                  className="bg-muted/50 border-border rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                                >
                                  <option value="count">Contar</option>
                                  <option value="sum">Sumar</option>
                                  <option value="avg">Promedio</option>
                                </select>
                              </div>
                              <select
                                title="Columna"
                                value={part.targetCol.split(".")[1] || "id"}
                                onChange={(e) => {
                                  const parts = { ...(editingChart.parts || {}) };
                                  parts[id] = {
                                    ...part,
                                    targetCol: `${part.targetCol.split(".")[0]}.${e.target.value}`,
                                  };
                                  updateChart(editingChart.id, { parts });
                                }}
                                className="bg-muted/50 border-border w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                              >
                                {(
                                  SCHEMA_COLUMNS[part.targetCol.split(".")[0]] ||
                                  SCHEMA_COLUMNS["lead"]
                                ).map((col) => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="border-border bg-muted/30 border-t p-6">
              <button
                onClick={() => setEditingChartId(null)}
                className="bg-primary hover:shadow-primary/20 w-full rounded-2xl py-4 text-xs font-black tracking-[0.2em] text-white uppercase shadow-xl transition-all active:scale-95"
              >
                Aplicar Configuración
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  tenant: Tenant;
  initialCharts: ChartConfig[];
  data: Record<string, ChartData>;
  isAdmin: boolean;
  filters?: AnalyticsFilters;
  configKey?: string;
  // Sprint 2B fix BUG-2B-05: `title === undefined` → render default h1 interno
  // "Análisis Visual". `title === false` / null → ocultar (caller renderiza su
  // propio heading externo, e.g. OverviewSection). Cualquier otro valor (string
  // o ReactNode) se renderiza como h2 minor uppercase.
  title?: ReactNode | false;
  // Sprint 2B fix BUG-2B-04: parametrizar label del botón Personalizar para
  // evitar duplicado visual cuando hay 2 instancias de ChartManager en la
  // misma página (OverviewSection + Análisis Visual de SummarySection).
  editButtonLabel?: string;
  // Sprint 2B mejora UX: slot extra renderizado al final del grid 12-col interno.
  // Usado por OverviewSection para incluir <OverviewCanalDistribution /> en el
  // mismo grid que los 3 charts dynamic (en lugar de en un grid externo aparte
  // donde quedaba siempre debajo). Se le aplica el mismo col-span que la prop
  // `extraSlotSize` indique (default "6" = mitad).
  extraSlot?: ReactNode;
  extraSlotSize?: "4" | "6" | "8" | "12";
}
