"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Table, Reservation, Zone, ClosedSale } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import { TicketModal } from "./TicketModal";
import { CashRegisterPanel } from "./CashRegisterPanel";
import { PaymentConfirmationData } from "./TicketModal";
import {
  Receipt,
  Banknote,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
  Search,
  Printer,
  CheckCircle2,
  Coins,
  X,
  RefreshCw,
  ArrowRight,
  LayoutList,
  Table2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CajeroViewProps {
  tables: Table[];
  reservations: Record<string, Reservation>;
  closedSales: ClosedSale[];
  zones: Zone[];
  tenantName?: string;
  isSyncing?: boolean;
  onOpenTableCheckout: (table: Table) => void;
  onExitCajeroView?: () => void;
}

export const CajeroView: React.FC<CajeroViewProps> = ({
  tables,
  reservations,
  closedSales,
  zones,
  tenantName = "Restaurante",
  isSyncing = false,
  onOpenTableCheckout,
  onExitCajeroView,
}) => {
  const [activeTab, setActiveTab] = useState<"mesas" | "historial">("mesas");
  const [methodFilter, setMethodFilter] = useState<"all" | "efectivo" | "tarjeta" | "transferencia">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<ClosedSale | null>(null);
  const [isArqueoOpen, setIsArqueoOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Live clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
      );
    };
    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, []);

  // ── Metrics ──
  const occupiedTables = useMemo(
    () => tables.filter((t) => t.status === "ocupada"),
    [tables]
  );
  const freeTables = useMemo(
    () => tables.filter((t) => t.status === "disponible"),
    [tables]
  );

  const inServiceBillings = useMemo(() => {
    return occupiedTables.reduce((acc, t) => {
      if (t.currentReservationId && reservations[t.currentReservationId]) {
        return acc + (reservations[t.currentReservationId].totalAmount || 0);
      }
      return acc;
    }, 0);
  }, [occupiedTables, reservations]);

  const totalClosedAmount = useMemo(
    () => closedSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0),
    [closedSales]
  );
  const totalTips = useMemo(
    () => closedSales.reduce((acc, s) => acc + (s.tipAmount || 0), 0),
    [closedSales]
  );
  const averageTicket =
    closedSales.length > 0 ? Math.round(totalClosedAmount / closedSales.length) : 0;

  // Payment breakdowns
  const efectivoSales = useMemo(
    () => closedSales.filter((s) => s.paymentMethod === "efectivo"),
    [closedSales]
  );
  const efectivoAmount = useMemo(
    () => efectivoSales.reduce((acc, s) => acc + s.totalAmount, 0),
    [efectivoSales]
  );
  const tarjetaSales = useMemo(
    () => closedSales.filter((s) => s.paymentMethod === "tarjeta"),
    [closedSales]
  );
  const tarjetaAmount = useMemo(
    () => tarjetaSales.reduce((acc, s) => acc + s.totalAmount, 0),
    [tarjetaSales]
  );
  const transferenciaSales = useMemo(
    () => closedSales.filter((s) => s.paymentMethod === "transferencia"),
    [closedSales]
  );
  const transferenciaAmount = useMemo(
    () => transferenciaSales.reduce((acc, s) => acc + s.totalAmount, 0),
    [transferenciaSales]
  );

  // Filtered closed sales
  const filteredSales = useMemo(() => {
    return closedSales.filter((sale) => {
      const matchesMethod =
        methodFilter === "all" || sale.paymentMethod === methodFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        sale.ticketNumber.toLowerCase().includes(q) ||
        sale.tableName.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q);
      return matchesMethod && matchesQuery;
    });
  }, [closedSales, methodFilter, searchQuery]);

  const getZoneName = (zoneId: string) => {
    const found = zones.find((z) => z.id === zoneId);
    return found ? found.name : zoneId;
  };

  const getElapsedTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return null;
    try {
      const diffMins = Math.floor((Date.now() - new Date(dateTimeStr).getTime()) / 60000);
      if (diffMins < 1) return "Recién";
      if (diffMins < 60) return `${diffMins}m`;
      return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    } catch {
      return null;
    }
  };

  const currentDate = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-4 select-none">
      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-xl shadow-xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Role Badge */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/30">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black tracking-tight text-white">
                    Control de Caja
                  </h1>
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cajero
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{tenantName}</p>
              </div>
            </div>

            {/* Right: clock + arqueo + exit */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>{currentTime}</span>
                {isSyncing && (
                  <RefreshCw className="h-3 w-3 animate-spin text-emerald-400 ml-0.5" />
                )}
              </div>

              <button
                onClick={() => setIsArqueoOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-2.5 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition-all active:scale-95"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Arqueo</span>
              </button>

              {onExitCajeroView && (
                <button
                  onClick={onExitCajeroView}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Vista Admin
                </button>
              )}
            </div>
          </div>

          {/* ── KPI STRIP ── */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* Vendido hoy */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">
                Cobrado Hoy
              </p>
              <p className="text-base font-black text-emerald-300">
                {formatCLP(totalClosedAmount)}
              </p>
              <p className="text-[10px] text-slate-400">
                {closedSales.length} ticket{closedSales.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* En servicio */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                En Servicio
              </p>
              <p className="text-base font-black text-amber-300">
                {formatCLP(inServiceBillings)}
              </p>
              <p className="text-[10px] text-slate-400">
                {occupiedTables.length} mesa{occupiedTables.length !== 1 ? "s" : ""} activa{occupiedTables.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Propinas */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                Propinas (10%)
              </p>
              <p className="text-base font-black text-amber-200">
                {formatCLP(totalTips)}
              </p>
              <p className="text-[10px] text-slate-400">Para el equipo</p>
            </div>

            {/* Ticket promedio */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-400/70">
                Ticket Promedio
              </p>
              <p className="text-base font-black text-indigo-200">
                {averageTicket > 0 ? formatCLP(averageTicket) : "—"}
              </p>
              <p className="text-[10px] text-slate-400">
                {freeTables.length} mesa{freeTables.length !== 1 ? "s" : ""} libre{freeTables.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div className="grid grid-cols-2 border-t border-slate-800 bg-slate-950 p-1.5 text-xs font-bold">
          <button
            onClick={() => setActiveTab("mesas")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all",
              activeTab === "mesas"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Table2 className="h-4 w-4" />
            <span>Mesas en Servicio</span>
            {occupiedTables.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black">
                {occupiedTables.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all",
              activeTab === "historial"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            )}
          >
            <LayoutList className="h-4 w-4" />
            <span>Historial de Cobros</span>
            {closedSales.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black">
                {closedSales.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="p-4">
        {/* ═══ TAB: MESAS EN SERVICIO ═══ */}
        {activeTab === "mesas" && (
          <div className="space-y-4">
            {occupiedTables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-14 text-center">
                <Utensils className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                <p className="text-sm font-bold text-white">
                  No hay mesas en servicio
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Cuando el mesero abra una mesa, aparecerá aquí para cobrar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {occupiedTables.map((table) => {
                  const res = table.currentReservationId
                    ? reservations[table.currentReservationId]
                    : null;
                  const items = res?.items || [];
                  const itemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
                  const tableTotal =
                    res?.totalAmount ||
                    items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
                  const elapsed = getElapsedTime(res?.dateTime);
                  const orderStatus = res?.orderStatus;

                  return (
                    <div
                      key={table.id}
                      className="group flex flex-col rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900/90 to-amber-950/20 p-4 shadow-lg transition-all hover:border-amber-400/60 hover:shadow-amber-900/20"
                    >
                      {/* Top info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 font-black text-sm shadow-sm">
                            #{table.number}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{table.name}</h4>
                            <span className="text-[11px] text-slate-400">
                              {getZoneName(table.zone)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          {elapsed && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="h-2.5 w-2.5" />
                              {elapsed}
                            </span>
                          )}
                          <span
                            className={cn(
                              "mt-1 block rounded-full px-2 py-0.5 text-[10px] font-bold border",
                              orderStatus === "en_preparacion"
                                ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                                : orderStatus === "servido"
                                ? "bg-teal-500/10 border-teal-500/30 text-teal-300"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            )}
                          >
                            {orderStatus === "en_preparacion"
                              ? "En Cocina"
                              : orderStatus === "servido"
                              ? "Servido"
                              : "Pendiente"}
                          </span>
                        </div>
                      </div>

                      {/* Customer row */}
                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-[10px] text-slate-500">Cliente:</span>
                          <span className="font-semibold truncate max-w-[140px]">
                            {res?.customer?.name || `Mesa ${table.number}`}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-slate-300">
                          <span className="text-[10px] text-slate-500">
                            {itemsCount} ítem{itemsCount !== 1 ? "s" : ""}
                          </span>
                          <span className="font-black text-emerald-400">
                            {formatCLP(tableTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Items preview (top 3) */}
                      {items.length > 0 && (
                        <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
                          {items.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="truncate max-w-[160px]">
                                {it.quantity}× {it.name}
                              </span>
                              <span className="text-slate-500 whitespace-nowrap">
                                {formatCLP(it.unitPrice * it.quantity)}
                              </span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <p className="text-[10px] text-slate-600">
                              +{items.length - 3} más...
                            </p>
                          )}
                        </div>
                      )}

                      {/* CTA */}
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => onOpenTableCheckout(table)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all"
                        >
                          <Receipt className="h-4 w-4" />
                          Cobrar y Cerrar Mesa
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: HISTORIAL DE COBROS ═══ */}
        {activeTab === "historial" && (
          <div className="space-y-4">
            {/* Filter + Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Method pills */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs overflow-x-auto no-scrollbar">
                {(
                  [
                    { key: "all", label: `Todos (${closedSales.length})` },
                    { key: "efectivo", label: `Efectivo (${efectivoSales.length})` },
                    { key: "tarjeta", label: `POS (${tarjetaSales.length})` },
                    { key: "transferencia", label: `Transfer. (${transferenciaSales.length})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setMethodFilter(f.key)}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-all",
                      methodFilter === f.key
                        ? f.key === "efectivo"
                          ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                          : f.key === "tarjeta"
                          ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                          : f.key === "transferencia"
                          ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                          : "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ticket #, mesa, cliente..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment breakdown mini-cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-center">
                <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider">Efectivo</p>
                <p className="text-sm font-black text-emerald-300">{formatCLP(efectivoAmount)}</p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 px-3 py-2 text-center">
                <p className="text-[9px] font-bold text-blue-400/70 uppercase tracking-wider">POS/Débito</p>
                <p className="text-sm font-black text-blue-300">{formatCLP(tarjetaAmount)}</p>
              </div>
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 px-3 py-2 text-center">
                <p className="text-[9px] font-bold text-purple-400/70 uppercase tracking-wider">Transfer.</p>
                <p className="text-sm font-black text-purple-300">{formatCLP(transferenciaAmount)}</p>
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                <Receipt className="mx-auto h-9 w-9 text-slate-600 mb-2" />
                <p className="text-sm font-bold text-white">Sin ventas aún</p>
                <p className="text-xs text-slate-500 mt-1">
                  Cuando cobres una mesa, aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSales.map((sale) => {
                  const saleTime = new Date(sale.closedAt).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={sale.id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 hover:border-slate-700 transition-all"
                    >
                      {/* Left: ticket + time */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-300 font-mono font-bold text-xs border border-slate-700">
                          #{sale.ticketNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">
                              Mesa #{sale.tableNumber} — {sale.tableName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{saleTime}</span>
                            <span className="text-slate-700">·</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                              {sale.customerName || `Mesa ${sale.tableNumber}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Center: payment method badge */}
                      <span
                        className={cn(
                          "hidden sm:flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                          sale.paymentMethod === "efectivo"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : sale.paymentMethod === "tarjeta"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                            : "bg-purple-500/10 border-purple-500/30 text-purple-300"
                        )}
                      >
                        {sale.paymentMethod === "efectivo" && <Banknote className="h-3 w-3" />}
                        {sale.paymentMethod === "tarjeta" && <CreditCard className="h-3 w-3" />}
                        {sale.paymentMethod === "transferencia" && <DollarSign className="h-3 w-3" />}
                        <span className="capitalize">
                          {sale.paymentMethod === "tarjeta" ? "POS" : sale.paymentMethod}
                        </span>
                      </span>

                      {/* Right: amount + view btn */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-black text-sm text-emerald-400">
                            {formatCLP(sale.totalAmount)}
                          </p>
                          {sale.tipAmount > 0 && (
                            <p className="text-[10px] text-amber-400">
                              +{formatCLP(sale.tipAmount)} prop.
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedTicket(sale)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                          title="Ver y reimprimir ticket"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TICKET REPRINT MODAL ── */}
      {selectedTicket && (
        <TicketModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          table={{
            id: selectedTicket.tableId,
            number: selectedTicket.tableNumber,
            name: selectedTicket.tableName,
            capacity: 4,
            zone: selectedTicket.zone || "salon_principal",
            status: "disponible",
            position: { x: 50, y: 50 },
            shape: "square",
          }}
          reservation={{
            id: `res-${selectedTicket.id}`,
            tableId: selectedTicket.tableId,
            tableNumber: selectedTicket.tableNumber,
            customer: { name: selectedTicket.customerName, phone: "" },
            dateTime: selectedTicket.closedAt,
            guestsCount: 4,
            status: "disponible",
            orderStatus: "pagado",
            iaSummary: {
              channel: "manual",
              summary: "Venta cerrada",
              timestamp: selectedTicket.closedAt,
              guestsCount: 4,
              aiAgentName: "Cajero",
              confidenceScore: 1,
              keyTopics: [],
            },
            items: selectedTicket.items,
            totalAmount: selectedTicket.totalAmount,
            createdVia: "manual",
          }}
          items={selectedTicket.items}
          tenantName={tenantName}
          readOnly={true}
          initialPaymentMethod={selectedTicket.paymentMethod}
          ticketNumber={selectedTicket.ticketNumber}
        />
      )}

      {/* ── MODAL ARQUEO DE CAJA ── */}
      {isArqueoOpen && (
        <CashRegisterPanel
          closedSales={closedSales}
          tenantName={tenantName}
          isOpen={isArqueoOpen}
          onClose={() => setIsArqueoOpen(false)}
        />
      )}
    </div>
  );
};
