"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Table, Reservation, TableStatus, OrderStatus, Zone } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import { MeseroOrderSheet } from "./MeseroOrderSheet";
import { PaymentConfirmationData } from "./TicketModal";
import {
  Utensils,
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  User,
  Coffee,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MeseroViewProps {
  tables: Table[];
  reservations: Record<string, Reservation>;
  zones: Zone[];
  selectedZone: string;
  onSelectZone: (zoneId: string) => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => void;
  onSaveReservation: (reservation: Reservation) => void;
  onCloseTableSale?: (table: Table, saleData: PaymentConfirmationData) => void;
  onExitMeseroView?: () => void;
  tenantId?: string | null;
  tenantName?: string;
  isSyncing?: boolean;
}

export const MeseroView: React.FC<MeseroViewProps> = ({
  tables,
  reservations,
  zones,
  selectedZone,
  onSelectZone,
  onUpdateStatus,
  onSaveReservation,
  onCloseTableSale,
  onExitMeseroView,
  tenantId,
  tenantName = "Restaurante",
  isSyncing = false,
}) => {
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [activeTableInitialTab, setActiveTableInitialTab] = useState<"menu" | "comanda">("menu");
  const [statusFilter, setStatusFilter] = useState<"all" | "disponible" | "ocupada" | "reservada">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  // Live clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filtered tables based on zone, status and search
  const filteredTables = useMemo(() => {
    return tables
      .filter((table) => {
        // Zone filter
        if (selectedZone !== "all" && table.zone !== selectedZone) {
          return false;
        }
        // Status filter
        if (statusFilter !== "all" && table.status !== statusFilter) {
          return false;
        }
        // Search filter (number or name)
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const matchesNum = table.number.toString().includes(q);
          const matchesName = table.name.toLowerCase().includes(q);
          if (!matchesNum && !matchesName) return false;
        }
        return true;
      })
      .sort((a, b) => a.number - b.number);
  }, [tables, selectedZone, statusFilter, searchQuery]);

  // KPIs
  const totalTables = tables.length;
  const countLibres = tables.filter((t) => t.status === "disponible").length;
  const countOcupadas = tables.filter((t) => t.status === "ocupada").length;
  const countReservadas = tables.filter((t) => t.status === "reservada").length;

  const totalBillings = Object.values(reservations).reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  // Active reservation for activeTable
  const activeReservation = activeTable?.currentReservationId
    ? reservations[activeTable.currentReservationId] || null
    : null;

  // Handle order saving from MeseroOrderSheet
  const handleSaveOrder = (
    updatedRes: Reservation,
    newTableStatus: TableStatus,
    newOrderStatus: OrderStatus
  ) => {
    onSaveReservation(updatedRes);
    if (activeTable) {
      onUpdateStatus(activeTable.id, newTableStatus);
    }
  };

  // Auto-apertura inteligente: decide el tab inicial según el estado de la mesa
  const handleTableTap = (table: Table) => {
    const isAvailable = table.status === "disponible";
    // Mesa libre → directo a la carta para empezar el pedido
    // Mesa ocupada o reservada → directo a la comanda activa
    const tab: "menu" | "comanda" = isAvailable ? "menu" : "comanda";
    setActiveTableInitialTab(tab);
    setActiveTable(table);
  };

  // Helper for elapsed time
  const getElapsedTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return null;
    try {
      const created = new Date(dateTimeStr).getTime();
      const now = Date.now();
      const diffMins = Math.floor((now - created) / (1000 * 60));
      if (diffMins < 1) return "Recién abierta";
      if (diffMins < 60) return `${diffMins} min`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white pb-20 select-none">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 border-b border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.92)] backdrop-blur-2xl px-4 py-3 shadow-2xl">
        {/* Top glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.4)] to-transparent" />
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Waiter Badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.1)] text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white">
                  LinkStation Salón
                </h1>
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mesero
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {tenantName}
              </p>
            </div>
          </div>

          {/* Right Info: Clock, Sync & Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.05)] px-2.5 py-1 text-xs font-semibold text-[#00e5ff]">
              <Clock className="h-3.5 w-3.5" />
              <span>{currentTime}</span>
              {isSyncing && (
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-400 ml-0.5" />
              )}
            </div>

            {onExitMeseroView && (
              <button
                onClick={onExitMeseroView}
                className="rounded-xl border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.06)] px-2.5 py-1 text-xs font-semibold text-[#00e5ff] hover:bg-[rgba(0,229,255,0.12)] transition-all">
                Plano Admin
              </button>
            )}
          </div>
        </div>

        {/* QUICK METRICS BAR */}
        <div className="mt-3 flex items-center justify-between gap-2 overflow-x-auto rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(0,229,255,0.03)] p-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Total:</span>
              <span className="font-bold text-white">{totalTables} mesas</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <span>🟢 {countLibres}</span>
              <span className="text-[11px] font-normal text-slate-400">libres</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <span>🟠 {countOcupadas}</span>
              <span className="text-[11px] font-normal text-slate-400">activas</span>
            </div>
          </div>

          <div className="flex items-center gap-1 font-black text-emerald-400 whitespace-nowrap">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{formatCLP(totalBillings)}</span>
          </div>
        </div>
      </header>

      {/* ZONE SELECTOR TABS (HORIZONTAL SCROLL) */}
      <div className="sticky top-[108px] z-20 border-b border-[rgba(0,229,255,0.06)] bg-[rgba(3,7,18,0.95)] backdrop-blur-xl px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          {zones.map((zone) => {
            const countInZone = tables.filter((t) => t.zone === zone.id).length;
            return (
              <button
                key={zone.id}
                onClick={() => onSelectZone(zone.id)}
                className={cn(
                  "whitespace-nowrap rounded-xl px-3.5 py-2 font-bold capitalize transition-all active:scale-95",
                  selectedZone === zone.id
                    ? "border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.12)] text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                    : "border border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.6)] text-slate-400 hover:text-white"
                )}
              >
                {zone.name} ({countInZone})
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH ROW */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Table */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mesa (#1, #5, Terraza)..."
              className="w-full rounded-xl border border-[rgba(0,229,255,0.15)] bg-[rgba(4,8,20,0.8)] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[rgba(0,229,255,0.5)] focus:shadow-[0_0_10px_rgba(0,229,255,0.15)] focus:outline-none backdrop-blur-md"
            />
          </div>

          {/* Quick status filter pills */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-xl px-2.5 py-2 font-bold transition-all border",
                statusFilter === "all"
                  ? "border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.1)] text-[#00e5ff]"
                  : "border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.6)] text-slate-400 hover:text-white"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter("disponible")}
              className={cn(
                "rounded-xl px-2.5 py-2 font-bold transition-all border",
                statusFilter === "disponible"
                  ? "border-emerald-500/50 bg-[rgba(16,185,129,0.15)] text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.6)] text-emerald-400 hover:bg-[rgba(16,185,129,0.08)]"
              )}
            >
              Libres
            </button>
            <button
              onClick={() => setStatusFilter("ocupada")}
              className={cn(
                "rounded-xl px-2.5 py-2 font-bold transition-all border",
                statusFilter === "ocupada"
                  ? "border-amber-500/50 bg-[rgba(245,158,11,0.15)] text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.6)] text-amber-400 hover:bg-[rgba(245,158,11,0.08)]"
              )}
            >
              Ocupadas
            </button>
          </div>
        </div>

        {/* TABLES GRID (MOBILE 2-COL, TABLET 3-4 COL) */}
        {filteredTables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(0,229,255,0.12)] p-10 text-center">
            <Utensils className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-300">
              No se encontraron mesas
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ajusta los filtros de zona o estado arriba.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredTables.map((table) => {
              const res = table.currentReservationId
                ? reservations[table.currentReservationId] || null
                : null;
              const isOccupied = table.status === "ocupada";
              const isReserved = table.status === "reservada";
              const isAvailable = table.status === "disponible";

              const orderTotal = res?.totalAmount || 0;
              const itemsCount = res?.items?.length || 0;
              const orderStatus = res?.orderStatus || "pendiente";
              const elapsedTime = getElapsedTime(res?.dateTime);

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableTap(table)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all cursor-pointer active:scale-95 select-none backdrop-blur-md overflow-hidden",
                    isAvailable
                      ? "border-emerald-500/35 bg-[rgba(16,185,129,0.04)] hover:border-emerald-400/70 hover:shadow-[0_0_18px_rgba(16,185,129,0.2)]"
                      : isOccupied
                      ? "border-amber-500/55 bg-[rgba(245,158,11,0.05)] hover:border-amber-400 hover:shadow-[0_0_18px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20"
                      : "border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.03)] hover:border-[rgba(0,229,255,0.55)] hover:shadow-[0_0_18px_rgba(0,229,255,0.18)]"
                  )}
                >
                  {/* Card Top: Number & Status Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl font-black text-base shadow-sm",
                            isAvailable
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isOccupied
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          )}
                        >
                          #{table.number}
                        </span>
                        <div>
                          <h3 className="font-bold text-xs text-white truncate max-w-[85px]">
                            {table.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 capitalize block truncate max-w-[85px]">
                            {table.zone}
                          </span>
                        </div>
                      </div>

                      {/* Capacity Pill */}
                      <span className="flex items-center gap-0.5 rounded-md border border-[rgba(0,229,255,0.1)] bg-[rgba(0,229,255,0.05)] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                        <Users className="h-2.5 w-2.5 text-slate-400" />
                        {table.capacity}
                      </span>
                    </div>

                    {/* Middle: Status & Timing */}
                    <div className="mt-3">
                      {isAvailable && (
                        <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/8 p-2 text-center group-hover:border-emerald-400/70 group-hover:bg-emerald-500/12 transition-colors">
                          <span className="block text-[11px] font-bold text-emerald-400">
                            🟢 Mesa Libre
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-300 transition-colors flex items-center justify-center gap-1">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Toca para abrir carta
                          </span>
                        </div>
                      )}

                      {isOccupied && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1 font-semibold text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                              {orderStatus === "en_preparacion"
                                ? "En Cocina"
                                : orderStatus === "servido"
                                ? "Servido"
                                : "Pendiente"}
                            </span>
                            {elapsedTime && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {elapsedTime}
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between rounded-lg bg-[rgba(4,8,20,0.8)] px-2 py-1">
                            <span className="text-[10px] text-slate-400">
                              {itemsCount} {itemsCount === 1 ? "ítem" : "ítems"}
                            </span>
                            <span className="font-black text-xs text-emerald-400">
                              {formatCLP(orderTotal)}
                            </span>
                          </div>
                        </div>
                      )}

                      {isReserved && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2">
                          <span className="block text-[11px] font-bold text-blue-300">
                            🔵 Reservada
                          </span>
                          <span className="text-[10px] text-slate-300 truncate block">
                            {res?.customer?.name || "Cliente"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Quick Action Hint */}
                  <div className="mt-3 pt-2 border-t border-[rgba(0,229,255,0.07)] flex items-center justify-between text-[10px] text-slate-400">
                    <span className={cn(
                      "font-medium",
                      isAvailable ? "text-emerald-400/80" : isOccupied ? "text-amber-400/80" : "text-blue-400/80"
                    )}>
                      {isAvailable ? "✦ Nueva Comanda" : isOccupied ? "→ Ver Pedido" : "→ Abrir Mesa"}
                    </span>
                    <ArrowRight className={cn(
                      "h-3 w-3 transition-transform group-hover:translate-x-0.5",
                      isAvailable ? "text-emerald-500" : isOccupied ? "text-amber-500" : "text-blue-500"
                    )} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL SCREEN ORDER SHEET MODAL */}
      {activeTable && (
        <MeseroOrderSheet
          isOpen={!!activeTable}
          table={activeTable}
          reservation={activeReservation}
          tenantId={tenantId}
          tenantName={tenantName}
          initialTab={activeTableInitialTab}
          onClose={() => setActiveTable(null)}
          onSaveOrder={handleSaveOrder}
          onUpdateTableStatus={onUpdateStatus}
          onCloseTableSale={onCloseTableSale}
        />
      )}
    </div>
  );
};
