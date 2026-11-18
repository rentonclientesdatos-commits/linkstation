"use client";

import { useState } from "react";
import { Tenant } from "@/types/tenant";
import { updateTenant } from "@/lib/actions/tenant";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Trash2,
  Plus,
  Save,
  X,
  Table,
  Check,
  ChevronRight,
  Info,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

interface ColumnConfig {
  key: string;
  label: string;
}

const PREDEFINED_FIELDS = [
  {
    key: "fecha_ingreso_crm",
    label: "Fecha Ingreso CRM",
    desc: "Fecha en que el lead entró al sistema",
  },
  {
    key: "lead",
    label: "Lead (Nombre/Telf)",
    desc: "Bloque consolidado de nombre, teléfono y país",
  },
  { key: "nombre", label: "Nombre", desc: "Campo individual de nombre" },
  { key: "apellido", label: "Apellido", desc: "Campo individual de apellido" },
  { key: "telefono", label: "Teléfono", desc: "Campo individual de teléfono" },
  { key: "email", label: "Email", desc: "Correo electrónico del lead" },
  { key: "pais", label: "País", desc: "País de origen" },
  { key: "origen", label: "Origen", desc: "Fuente del lead (UTM Source)" },
  { key: "campana", label: "Campaña", desc: "Nombre de la campaña (UTM Campaign)" },
  { key: "tipo_lead", label: "Tipo Lead", desc: "Categoría (Nuevo, Ilocalizable, etc)" },
  { key: "programa_nombre", label: "Programa", desc: "Programa de interés" },
  { key: "cualificacion", label: "Cualificación", desc: "Estado de cualificación (SI/NO)" },
  { key: "fecha_agendada_cliente", label: "Cita Agendada", desc: "Fecha de la cita con el asesor" },
  { key: "intentos_count", label: "Nº Intentos", desc: "Cantidad de intentos de contacto" },
  {
    key: "estado_llamada",
    label: "Última Llamada",
    desc: "Estado y grabación de la última llamada",
  },
  { key: "whatsapp_status", label: "Estado WhatsApp", desc: "Si tiene Opt-In o estado del chat" },
  {
    key: "notificaciones_status",
    label: "Notificaciones",
    desc: "Estado del envío de notificaciones",
  },
];

interface SortableColumnProps {
  col: ColumnConfig;
  onRemove: (key: string) => void;
  onLabelChange: (key: string, newLabel: string) => void;
}

function SortableColumn({ col, onRemove, onLabelChange }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id: col.key });

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
        "bg-card border-border group flex items-center gap-3 rounded-2xl border p-3 shadow-sm",
        isDragging && "bg-muted/50 border-primary/50 z-50 opacity-50 shadow-2xl"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-primary cursor-grab p-1 transition-colors active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <input
          type="text"
          value={col.label}
          onChange={(e) => onLabelChange(col.key, e.target.value)}
          className="text-foreground border-none bg-transparent p-0 text-xs font-black tracking-widest uppercase outline-none focus:ring-0"
          placeholder="ETIQUETA"
        />
        <span className="text-muted-foreground mt-0.5 font-mono text-[10px] font-bold opacity-50">
          {col.key}
        </span>
      </div>

      <button
        onClick={() => onRemove(col.key)}
        title="Eliminar columna"
        aria-label="Eliminar columna"
        className="text-muted-foreground rounded-xl p-2 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function HistorialColumnManager({
  tenant,
  sampleKeys = [],
}: {
  tenant: Tenant;
  sampleKeys?: string[];
}) {
  const [columns, setColumns] = useState<ColumnConfig[]>(
    (tenant.config as unknown as { historial_columns?: ColumnConfig[] })?.historial_columns || []
  );
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((i) => i.key === active.id);
        const newIndex = items.findIndex((i) => i.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const newConfig = {
        ...(tenant.config as unknown as Record<string, unknown>),
        historial_columns: columns,
      };
      const res = await updateTenant(tenant.id, { config: newConfig });
      if (res.success) {
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

  function addColumn(key: string, label: string) {
    if (columns.some((c) => c.key === key)) return;
    setColumns([...columns, { key, label }]);
    setIsAdding(false);
  }

  function removeColumn(key: string) {
    setColumns(columns.filter((c) => c.key !== key));
  }

  function updateLabel(key: string, newLabel: string) {
    setColumns(columns.map((c) => (c.key === key ? { ...c, label: newLabel } : c)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground flex items-center gap-2 text-sm font-black tracking-[0.2em] uppercase">
            <Table className="text-primary h-4 w-4" />
            Configuración de Columnas
          </h3>
          <p className="text-muted-foreground mt-1 text-[10px] font-bold tracking-widest uppercase">
            Personaliza los encabezados y campos visibles en Leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (
                confirm(
                  "Se cargarán todos los campos detectados en la base de datos que aún no estén en la lista. ¿Continuar?"
                )
              ) {
                const ignoredKeys = [
                  "id",
                  "id_lead",
                  "llamadas",
                  "total_llamadas",
                  "url_grabacion",
                  "transcripcion",
                  "resumen",
                ];
                const newCols: ColumnConfig[] = [...columns];
                sampleKeys.forEach((key) => {
                  if (!ignoredKeys.includes(key) && !newCols.some((c) => c.key === key)) {
                    newCols.push({
                      key,
                      label: key.replace(/_/g, " ").toUpperCase(),
                    });
                  }
                });
                setColumns(newCols);
              }
            }}
            className="text-muted-foreground bg-muted border-border hover:bg-muted/80 font-outfit flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-all"
          >
            <Settings className="h-3.5 w-3.5" /> Descubrir Campos
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="text-primary bg-primary/10 border-primary/20 hover:bg-primary/20 font-outfit flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir Columna
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 shadow-primary/20 flex items-center gap-2 rounded-xl px-5 py-2 text-[10px] font-black tracking-widest text-white uppercase shadow-lg transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="bg-muted/30 border-border rounded-[32px] border p-8">
        <DndContext id="historial-columns-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {columns.map((col) => (
                <SortableColumn
                  key={col.key}
                  col={col}
                  onRemove={removeColumn}
                  onLabelChange={updateLabel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {columns.length === 0 && (
          <div className="border-border rounded-3xl border-2 border-dashed py-12 text-center">
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase italic">
              No hay columnas configuradas. El sistema usará los campos por defecto.
            </p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 border-primary/10 flex items-start gap-3 rounded-2xl border p-4">
        <Info className="text-primary mt-0.5 h-4 w-4" />
        <p className="text-muted-foreground text-[10px] leading-relaxed font-bold tracking-widest uppercase">
          <span className="text-primary">TIP:</span> Arrastra las columnas para cambiar su orden en
          la tabla. Haz clic en el nombre para editar la etiqueta que verá el cliente.
        </p>
      </div>

      {/* Modal de añadir columna */}
      {isAdding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="animate-in fade-in absolute inset-0 bg-slate-950/60 backdrop-blur-md duration-300"
            onClick={() => setIsAdding(false)}
          />
          <div className="bg-card border-border animate-in zoom-in-95 relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[32px] border p-8 shadow-2xl duration-300">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-foreground text-xl font-black tracking-tight uppercase">
                  Añadir Columna
                </h2>
                <p className="text-muted-foreground mt-1 text-xs font-bold tracking-wider uppercase">
                  Selecciona un campo disponible de la base de datos
                </p>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="hover:bg-muted rounded-xl p-2 transition-all"
                title="Cerrar"
              >
                <X className="text-muted-foreground h-5 w-5" />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PREDEFINED_FIELDS.map((f) => {
                  const exists = columns.some((c) => c.key === f.key);
                  return (
                    <button
                      key={f.key}
                      disabled={exists}
                      onClick={() => addColumn(f.key, f.label)}
                      className={cn(
                        "group flex items-center justify-between rounded-2xl border p-4 text-left transition-all",
                        exists
                          ? "bg-muted/50 border-border cursor-not-allowed opacity-50"
                          : "bg-card border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                      )}
                    >
                      <div className="min-w-0">
                        <h4 className="text-foreground flex items-center gap-2 text-[11px] font-black tracking-widest uppercase">
                          {f.label}
                          {exists && <Check className="h-3 w-3 text-emerald-500" />}
                        </h4>
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[9px] font-bold tracking-wider uppercase">
                          {f.desc}
                        </p>
                      </div>
                      {!exists && (
                        <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="border-border w-full border-t" />
                </div>
                <div className="relative flex justify-center text-[9px] font-black uppercase">
                  <span className="bg-card text-muted-foreground px-3 tracking-[0.3em]">
                    o campo personalizado
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-muted-foreground ml-1 text-[10px] font-black tracking-[0.2em] uppercase">
                  Key en Supabase
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-key"
                    type="text"
                    placeholder="ej: mi_campo_custom"
                    className="bg-muted border-border text-foreground focus:border-primary flex-1 rounded-xl border px-4 py-3 text-xs font-bold transition-all outline-none"
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById("custom-key") as HTMLInputElement;
                      if (el.value) addColumn(el.value, el.value.replace(/_/g, " ").toUpperCase());
                    }}
                    className="bg-primary hover:bg-primary/90 shadow-primary/20 rounded-xl px-6 text-[10px] font-black tracking-widest text-white uppercase shadow-lg transition-all"
                  >
                    Añadir
                  </button>
                </div>
                <p className="text-muted-foreground text-[9px] font-bold tracking-wider uppercase italic">
                  Asegúrate de que la &quot;Key&quot; existe como columna en la tabla `lead`.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
