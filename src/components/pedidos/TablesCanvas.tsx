"use client";

import React, { useState, useRef } from "react";
import { Table, TableStatus, Reservation, Zone } from "@/types/pedidos";
import {
  Users,
  Bot,
  MessageSquare,
  PhoneCall,
  Globe,
  Sparkles,
  Edit2,
  Trash2,
  Move,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TablesCanvasProps {
  tables: Table[];
  reservations: Record<string, Reservation>;
  zones: Zone[];
  selectedZone: string;
  isEditMode: boolean;
  onSelectTable: (table: Table) => void;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onDuplicateTable?: (table: Table) => void;
  onUpdateTablePosition: (tableId: string, position: { x: number; y: number }) => void;
  onAutoArrange?: () => void;
}

const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; dotClass: string }
> = {
  disponible: {
    label: "Disponible",
    bgClass: "bg-emerald-500/10 hover:bg-emerald-500/20",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/40 hover:border-emerald-400",
    dotClass: "bg-emerald-500 shadow-emerald-500/50",
  },
  reservada: {
    label: "Reservada (IA)",
    bgClass: "bg-amber-500/15 hover:bg-amber-500/25",
    textClass: "text-amber-300",
    borderClass: "border-amber-500/50 hover:border-amber-400",
    dotClass: "bg-amber-400 shadow-amber-400/50 animate-pulse",
  },
  ocupada: {
    label: "Ocupada",
    bgClass: "bg-rose-500/15 hover:bg-rose-500/25",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/50 hover:border-rose-400",
    dotClass: "bg-rose-500 shadow-rose-500/50",
  },
  mantenimiento: {
    label: "Mantenimiento",
    bgClass: "bg-slate-700/20 hover:bg-slate-700/30",
    textClass: "text-slate-400",
    borderClass: "border-slate-600/40",
    dotClass: "bg-slate-500",
  },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />,
  voice: <PhoneCall className="h-3.5 w-3.5 text-blue-400" />,
  web: <Globe className="h-3.5 w-3.5 text-violet-400" />,
  manual: <Users className="h-3.5 w-3.5 text-slate-400" />,
};

export const TablesCanvas: React.FC<TablesCanvasProps> = ({
  tables,
  reservations,
  zones,
  selectedZone,
  isEditMode,
  onSelectTable,
  onEditTable,
  onDeleteTable,
  onDuplicateTable,
  onUpdateTablePosition,
  onAutoArrange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);

  const filteredTables = tables.filter((t) => t.zone === selectedZone);

  // Handle Dragging in Edit Mode with 4% magnetic snap to grid
  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setDraggingTableId(tableId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditMode || !draggingTableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    // Snap to 4% grid so tables align cleanly to rows and columns
    const snappedX = Math.round(rawX / 4) * 4;
    const snappedY = Math.round(rawY / 4) * 4;

    const clampedX = Math.max(6, Math.min(94, snappedX));
    const clampedY = Math.max(8, Math.min(92, snappedY));

    onUpdateTablePosition(draggingTableId, { x: clampedX, y: clampedY });
  };

  const handleMouseUp = () => {
    if (draggingTableId) {
      setDraggingTableId(null);
    }
  };

  const activeZoneObj = zones.find((z) => z.id === selectedZone);

  return (
    <div
      className={cn(
        "relative flex min-h-[640px] w-full flex-col justify-between overflow-hidden rounded-2xl border bg-slate-950/90 p-6 shadow-2xl backdrop-blur-md transition-colors select-none",
        isEditMode ? "border-amber-500/50 bg-slate-950/95" : "border-slate-800"
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Pattern Background */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-[size:32px_32px] transition-opacity",
          isEditMode
            ? "bg-[linear-gradient(to_right,#f59e0b25_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b25_1px,transparent_1px)] opacity-100"
            : "bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] opacity-80"
        )}
      />

      {/* Header Info & Edit Mode Alert Banner */}
      <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-wide text-white">
              {activeZoneObj?.name || "Espacio"}
            </h3>
            {isEditMode ? (
              <span className="flex animate-pulse items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                <Move className="h-3.5 w-3.5" /> Modo Edición Activo
              </span>
            ) : (
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                Canvas Interactivo
              </span>
            )}
            {onAutoArrange && (
              <button
                onClick={onAutoArrange}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-3 py-1 text-xs font-bold text-indigo-200 shadow-md transition-all hover:border-indigo-400 hover:text-white active:scale-95"
                title="Alinear y ordenar todas las mesas automáticamente en una cuadrícula simétrica sin superposiciones"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Auto-Organizar Plano</span>
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {isEditMode
              ? "Arrastra cualquier mesa para cambiar su posición (se alinea automáticamente a la cuadrícula) o pulsa en 'Auto-Organizar Plano'."
              : activeZoneObj?.description || "Vista interactiva en tiempo real"}
          </p>
        </div>

        {/* Legend */}
        {!isEditMode && (
          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              Disponible
            </div>
            <div className="flex items-center gap-1.5 font-medium text-amber-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              Reservada (IA)
            </div>
            <div className="flex items-center gap-1.5 font-medium text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              Ocupada
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Canvas Container */}
      <div
        ref={canvasRef}
        className={cn(
          "relative z-10 min-h-[500px] w-full flex-1 overflow-hidden rounded-xl border p-4 transition-all",
          isEditMode
            ? "cursor-crosshair border-amber-500/30 bg-slate-900/70"
            : "border-slate-800/60 bg-slate-900/40"
        )}
      >

        {/* Interactive Tables */}
        {filteredTables.map((table) => {
          const res = table.currentReservationId ? reservations[table.currentReservationId] : null;
          const statusCfg = STATUS_CONFIG[table.status];

          const isRound = table.shape === "round";
          const isRect = table.shape === "rectangle";
          const isDragging = draggingTableId === table.id;

          return (
            <div
              key={table.id}
              onMouseDown={(e) => handleMouseDown(table.id, e)}
              onClick={() => {
                if (!isEditMode) onSelectTable(table);
              }}
              style={{
                left: `${table.position.x}%`,
                top: `${table.position.y}%`,
              }}
              className={cn(
                "group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 p-3 shadow-lg backdrop-blur-md transition-all",
                isEditMode
                  ? "cursor-grab border-dashed border-amber-400 active:cursor-grabbing"
                  : "cursor-pointer",
                isDragging ? "z-40 scale-110 border-amber-300 bg-amber-500/20 shadow-2xl" : "",
                isRound
                  ? "h-24 w-24 rounded-full"
                  : isRect
                    ? "h-20 w-32 rounded-xl"
                    : "h-24 w-24 rounded-xl",
                statusCfg.bgClass,
                statusCfg.borderClass
              )}
            >
              {/* Table Number & Name */}
              <div className="mb-1 flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", statusCfg.dotClass)} />
                <span className="text-xs font-bold text-white transition-transform group-hover:scale-105">
                  {table.name}
                </span>
              </div>

              {/* Capacity info */}
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                <Users className="h-3 w-3 text-slate-400" />
                <span>{res?.guestsCount || table.capacity} pers.</span>
              </div>

              {/* AI reservation badge if available */}
              {!isEditMode && res && (
                <div className="mt-1 flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-200">
                  {CHANNEL_ICONS[res.createdVia]}
                  <span className="max-w-[70px] truncate font-semibold">
                    {res.customer.name.split(" ")[0]}
                  </span>
                </div>
              )}

              {/* Edit Mode Quick Action Overlays (contained cleanly inside card) */}
              {isEditMode && (
                <div className="absolute top-1 right-1 z-30 flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-950/95 p-0.5 shadow-md">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTable(table);
                    }}
                    className="rounded p-1 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                    title="Editar mesa"
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                  </button>
                  {onDuplicateTable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateTable(table);
                      }}
                      className="rounded p-1 text-slate-300 hover:bg-emerald-600 hover:text-white transition-colors"
                      title="Copiar / Duplicar mesa"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTable(table.id);
                    }}
                    className="rounded p-1 text-slate-300 hover:bg-rose-600 hover:text-white transition-colors"
                    title="Eliminar mesa"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              {/* Hover Popover Tooltip (Normal Mode Only) */}
              {!isEditMode && (
                <div className="pointer-events-none absolute bottom-[110%] left-1/2 z-50 hidden w-56 -translate-x-1/2 flex-col rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white shadow-2xl transition-all duration-200 group-hover:flex">
                  <div className="mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-indigo-300">{table.name}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        statusCfg.textClass
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {res ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Cliente:</span>
                        <span className="font-medium text-white">{res.customer.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Hora / Comensales:</span>
                        <span>
                          {res.dateTime} ({res.guestsCount}p)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-[11px] text-emerald-400">
                        <Sparkles className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                        <span className="line-clamp-2">{res.iaSummary.summary}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">
                      Mesa sin reserva. Haz clic para asignar cliente o abrir pedido.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-400" />
          <span>
            {isEditMode
              ? "Arrastra cualquier mesa para recolocarla en el mapa. Pulsa en 'Finalizar Edición' cuando termines."
              : "Las reservas con distintivo de IA provienen de conversaciones automatizadas."}
          </span>
        </div>
      </div>
    </div>
  );
};
