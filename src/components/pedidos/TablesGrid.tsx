"use client";

import React from "react";
import { Table, Reservation, Zone, TableStatus } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import {
  Users,
  Clock,
  Plus,
  Edit2,
  Copy,
  Trash2,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight,
  MessageSquare,
  PhoneCall,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TablesGridProps {
  tables: Table[];
  reservations: Record<string, Reservation>;
  zones: Zone[];
  selectedZone: string;
  isEditMode: boolean;
  onSelectTable: (table: Table) => void;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onDuplicateTable?: (table: Table) => void;
  onAddTableInZone?: (zoneId: string) => void;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3 w-3 text-emerald-400" />,
  voice: <PhoneCall className="h-3 w-3 text-blue-400" />,
  web: <Globe className="h-3 w-3 text-violet-400" />,
  manual: <Users className="h-3 w-3 text-slate-400" />,
};

export const TablesGrid: React.FC<TablesGridProps> = ({
  tables,
  reservations,
  zones,
  selectedZone,
  isEditMode,
  onSelectTable,
  onEditTable,
  onDeleteTable,
  onDuplicateTable,
  onAddTableInZone,
}) => {
  // Filter active zones to display
  const activeZones =
    selectedZone === "all"
      ? zones
      : zones.filter((z) => z.id === selectedZone);

  return (
    <div className="space-y-8 select-none">
      {activeZones.map((zone) => {
        const zoneTables = tables
          .filter((t) => t.zone === zone.id)
          .sort((a, b) => (a.number || 0) - (b.number || 0));

        const occupiedCount = zoneTables.filter((t) => t.status === "ocupada").length;
        const availableCount = zoneTables.filter((t) => t.status === "disponible").length;
        const reservedCount = zoneTables.filter((t) => t.status === "reservada").length;

        return (
          <div
            key={zone.id}
            className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-5 shadow-xl backdrop-blur-md"
          >
            {/* ZONE HEADER */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white capitalize">
                    {zone.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {zone.description || "Espacio del local"} • {zoneTables.length} mesas en total
                  </p>
                </div>
              </div>

              {/* Status Pills & Add Button */}
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 font-bold text-emerald-400">
                  🟢 {availableCount} libres
                </span>
                <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 font-bold text-amber-300">
                  🟠 {occupiedCount} en servicio
                </span>
                {reservedCount > 0 && (
                  <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 font-bold text-blue-300">
                    🔵 {reservedCount} reservadas
                  </span>
                )}

                {isEditMode && onAddTableInZone && (
                  <button
                    onClick={() => onAddTableInZone(zone.id)}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all ml-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Mesa</span>
                  </button>
                )}
              </div>
            </div>

            {/* UNIFORM GRID OF TABLES (NO OVERLAPS GUARANTEED) */}
            {zoneTables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800/80 p-6 text-center text-xs text-slate-500">
                No hay mesas registradas en este espacio. Pulsa en &quot;Añadir Mesa&quot; para crear la primera.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {zoneTables.map((table) => {
                  const res = table.currentReservationId
                    ? reservations[table.currentReservationId] || null
                    : null;
                  const isAvailable = table.status === "disponible";
                  const isOccupied = table.status === "ocupada";
                  const isReserved = table.status === "reservada";

                  const orderTotal = res?.totalAmount || 0;
                  const itemsCount = res?.items?.length || 0;
                  const orderStatus = res?.orderStatus || "pendiente";

                  return (
                    <div
                      key={table.id}
                      onClick={() => {
                        if (!isEditMode) onSelectTable(table);
                      }}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all select-none shadow-md",
                        isEditMode
                          ? "border-amber-500/40 bg-slate-900/90"
                          : "cursor-pointer active:scale-95",
                        isAvailable
                          ? "border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-emerald-950/20 hover:border-emerald-400"
                          : isOccupied
                          ? "border-amber-500/50 bg-gradient-to-b from-slate-900/90 to-amber-950/30 hover:border-amber-400 ring-1 ring-amber-500/20"
                          : "border-blue-500/40 bg-gradient-to-b from-slate-900/90 to-blue-950/20 hover:border-blue-400"
                      )}
                    >
                      {/* CARD TOP: NUMBER & EDIT ACTIONS */}
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg font-black text-sm shadow-sm",
                                isAvailable
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isOccupied
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              )}
                            >
                              #{table.number}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-white truncate max-w-[90px]">
                                {table.name}
                              </h4>
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                                <Users className="h-2.5 w-2.5 text-slate-500" />
                                {table.capacity} pers
                              </span>
                            </div>
                          </div>

                          {/* EDIT ACTIONS EMBEDDED CLEANLY INSIDE CARD */}
                          {isEditMode ? (
                            <div className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-950/90 p-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTable(table);
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors"
                                title="Editar mesa"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              {onDuplicateTable && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateTable(table);
                                  }}
                                  className="rounded p-1 text-slate-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                  title="Duplicar mesa"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTable(table.id);
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-rose-600 hover:text-white transition-colors"
                                title="Eliminar mesa"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full shrink-0",
                                isAvailable
                                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                                  : isOccupied
                                  ? "bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50"
                                  : "bg-blue-400"
                              )}
                            />
                          )}
                        </div>

                        {/* CARD MIDDLE: STATUS DETAILS */}
                        <div className="mt-3">
                          {isAvailable && (
                            <div className="rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/5 p-2 text-center">
                              <span className="block text-[11px] font-bold text-emerald-400">
                                Disponible
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Libre para ocupar
                              </span>
                            </div>
                          )}

                          {isOccupied && (
                            <div className="space-y-1 rounded-lg bg-slate-950/70 p-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-amber-300">
                                  {orderStatus === "en_preparacion"
                                    ? "En Cocina"
                                    : orderStatus === "servido"
                                    ? "Servido"
                                    : "Pendiente"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {itemsCount} {itemsCount === 1 ? "ítem" : "ítems"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-0.5 border-t border-slate-800">
                                <span className="text-[10px] text-slate-400">Total:</span>
                                <span className="text-xs font-black text-emerald-400">
                                  {formatCLP(orderTotal)}
                                </span>
                              </div>
                            </div>
                          )}

                          {isReserved && (
                            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-xs">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-blue-300">
                                <span>{res?.customer?.name || "Reserva"}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {res?.dateTime} • {res?.guestsCount} comensales
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CARD BOTTOM: INTERACTIVE HINT */}
                      {!isEditMode && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-slate-200">
                          <span>{isAvailable ? "Abrir Mesa" : "Ver Detalle"}</span>
                          <ArrowRight className="h-3 w-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
