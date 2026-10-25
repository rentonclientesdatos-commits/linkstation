"use client";

import React, { useState, useMemo } from "react";
import { Table, Reservation, Zone, ClosedSale } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import { TicketModal } from "./TicketModal";
import { CashRegisterPanel } from "./CashRegisterPanel";
import {
  Receipt,
  Banknote,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  Utensils,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Coins,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CajaPanelProps {
  tables: Table[];
  reservations: Record<string, Reservation>;
  closedSales: ClosedSale[];
  zones: Zone[];
  tenantName?: string;
  onOpenTableCheckout: (table: Table) => void;
  onClearClosedSales?: () => void;
}

export const CajaPanel: React.FC<CajaPanelProps> = ({
  tables,
  reservations,
  closedSales,
  zones,
  tenantName = "Restaurante",
  onOpenTableCheckout,
  onClearClosedSales,
}) => {
  const [methodFilter, setMethodFilter] = useState<"all" | "efectivo" | "tarjeta" | "transferencia">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTicketForView, setSelectedTicketForView] = useState<ClosedSale | null>(null);
  const [isArqueoModalOpen, setIsArqueoModalOpen] = useState<boolean>(false);

  // ── Metrics Calculations ──
  const totalClosedSalesCount = closedSales.length;
  const totalClosedAmount = useMemo(
    () => closedSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0),
    [closedSales]
  );
  const totalTips = useMemo(
    () => closedSales.reduce((acc, sale) => acc + (sale.tipAmount || 0), 0),
    [closedSales]
  );
  const averageTicket = totalClosedSalesCount > 0 ? Math.round(totalClosedAmount / totalClosedSalesCount) : 0;

  // Breakdown by payment method
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

  // In-Service Tables (Ocupadas actualmente)
  const occupiedTables = useMemo(
    () => tables.filter((t) => t.status === "ocupada"),
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

  // Filtered closed sales
  const filteredSales = useMemo(() => {
    return closedSales.filter((sale) => {
      const matchesMethod = methodFilter === "all" || sale.paymentMethod === methodFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        sale.ticketNumber.toLowerCase().includes(q) ||
        sale.tableName.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.items.some((i) => i.name.toLowerCase().includes(q));

      return matchesMethod && matchesQuery;
    });
  }, [closedSales, methodFilter, searchQuery]);

  const getZoneName = (zoneId: string) => {
    const found = zones.find((z) => z.id === zoneId);
    return found ? found.name : zoneId;
  };

  const handlePrintArqueo = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER DE CAJA ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Control de Caja & Cierre de Turno</h2>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Caja Activa
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Turno actual • {currentDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsArqueoModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-4 py-2.5 text-xs font-bold text-indigo-200 shadow-lg hover:border-indigo-400 hover:text-white transition-all active:scale-95"
            title="Generar arqueo de caja imprimible del turno"
          >
            <Printer className="h-4 w-4 text-indigo-400" />
            <span>Arqueo / Corte de Caja</span>
          </button>
        </div>
      </div>

      {/* ── TARJETAS DE MÉTRICAS FINANCIERAS (KPIS DE CAJA) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Ventas Cerradas */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Ventas Cerradas
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              {formatCLP(totalClosedAmount)}
            </span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>{totalClosedSalesCount} tickets cobrados</span>
              {totalClosedSalesCount > 0 && (
                <span className="text-emerald-400 font-semibold">
                  Prom: {formatCLP(averageTicket)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Efectivo en Caja */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Efectivo
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-300">
              {formatCLP(efectivoAmount)}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              {efectivoSales.length} {efectivoSales.length === 1 ? "cobro" : "cobros"} en efectivo
            </p>
          </div>
        </div>

        {/* Tarjeta Débito / POS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Débito / POS
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-300">
              {formatCLP(tarjetaAmount)}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              {tarjetaSales.length} transacciones POS
            </p>
          </div>
        </div>

        {/* Transferencia */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Transferencia
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-300">
              {formatCLP(transferenciaAmount)}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              {transferenciaSales.length} comprobantes
            </p>
          </div>
        </div>

        {/* Propinas del Personal (10%) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Propinas (10%)
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300">
              {formatCLP(totalTips)}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              A repartir equipo/meseros
            </p>
          </div>
        </div>

        {/* Mesas en Servicio (Consumo Activo) */}
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              En Servicio Activo
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-300">
              {formatCLP(inServiceBillings)}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              {occupiedTables.length} {occupiedTables.length === 1 ? "mesa comiendo" : "mesas comiendo"}
            </p>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 1: MESAS EN SERVICIO (ACTIVAS EN VIVO) ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Mesas en Servicio</h3>
              <p className="text-[11px] text-slate-400">
                Mesas actualmente ocupadas con comandas abiertas pendientes de cobro
              </p>
            </div>
          </div>

          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">
            {occupiedTables.length} {occupiedTables.length === 1 ? "mesa activa" : "mesas activas"}
          </span>
        </div>

        {occupiedTables.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center">
            <Utensils className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">
              No hay mesas en servicio en este momento
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Todas las mesas están desocupadas o disponibles para nuevos clientes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {occupiedTables.map((table) => {
              const res = table.currentReservationId ? reservations[table.currentReservationId] : null;
              const items = res?.items || [];
              const itemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
              const tableTotal = res?.totalAmount || items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

              return (
                <div
                  key={table.id}
                  className="flex flex-col justify-between rounded-xl border border-rose-500/20 bg-slate-950/70 p-4 transition-all hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-950/20"
                >
                  <div className="space-y-3">
                    {/* Top table info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-black text-sm">
                          #{table.number}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{table.name}</h4>
                          <span className="text-[11px] text-slate-400 capitalize">
                            {getZoneName(table.zone)}
                          </span>
                        </div>
                      </div>

                      <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                        Ocupada
                      </span>
                    </div>

                    {/* Customer & channel */}
                    <div className="rounded-lg bg-slate-900/80 p-2.5 text-xs space-y-1 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[11px] text-slate-400">Cliente:</span>
                        <span className="font-semibold truncate max-w-[140px]">
                          {res?.customer?.name || `Mesa ${table.number}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[11px] text-slate-400">Comensales:</span>
                        <span className="font-medium text-slate-300">
                          {res?.guestsCount || table.capacity || 2} personas
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-[11px] text-slate-400">Canal:</span>
                        <span className="font-semibold text-indigo-400 capitalize text-[10px]">
                          {res?.createdVia || "Manual"}
                        </span>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Comanda ({itemsCount} ítems)
                      </span>
                      {items.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">Mesa sin platos cargados</p>
                      ) : (
                        <div className="max-h-20 overflow-y-auto space-y-1 text-xs text-slate-300 pr-1">
                          {items.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="flex justify-between text-[11px]">
                              <span className="truncate max-w-[150px]">
                                {it.quantity}x {it.name}
                              </span>
                              <span className="text-slate-400 whitespace-nowrap">
                                {formatCLP(it.unitPrice * it.quantity)}
                              </span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <p className="text-[10px] text-slate-500">
                              +{items.length - 3} platos más...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total & Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Subtotal actual:</span>
                      <span className="text-base font-black text-emerald-400">
                        {formatCLP(tableTotal)}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenTableCheckout(table)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all"
                    >
                      <Receipt className="h-4 w-4" />
                      <span>Cobrar y Cerrar Mesa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECCIÓN 2: HISTORIAL DE VENTAS CERRADAS (TICKETS COBRADOS) ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Historial de Ventas Cerradas</h3>
              <p className="text-[11px] text-slate-400">
                Registro cronológico de todos los tickets cobrados durante el turno
              </p>
            </div>
          </div>

          {/* Filter Tabs by payment method */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
            <button
              onClick={() => setMethodFilter("all")}
              className={cn(
                "rounded-lg px-3 py-1 font-semibold transition-all",
                methodFilter === "all"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Todos ({totalClosedSalesCount})
            </button>
            <button
              onClick={() => setMethodFilter("tarjeta")}
              className={cn(
                "rounded-lg px-3 py-1 font-semibold transition-all",
                methodFilter === "tarjeta"
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Débito/POS ({tarjetaSales.length})
            </button>
            <button
              onClick={() => setMethodFilter("efectivo")}
              className={cn(
                "rounded-lg px-3 py-1 font-semibold transition-all",
                methodFilter === "efectivo"
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Efectivo ({efectivoSales.length})
            </button>
            <button
              onClick={() => setMethodFilter("transferencia")}
              className={cn(
                "rounded-lg px-3 py-1 font-semibold transition-all",
                methodFilter === "transferencia"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Transferencia ({transferenciaSales.length})
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ticket #, mesa o cliente..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">
            Mostrando {filteredSales.length} de {closedSales.length} ventas
          </span>
        </div>

        {/* Table or Empty State */}
        {filteredSales.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-10 text-center">
            <Receipt className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-400">
              No hay ventas registradas con los filtros actuales
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Al cobrar y cerrar cualquier mesa, su comanda y comprobante aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-bold">Folio / Ticket</th>
                  <th className="px-4 py-3 font-bold">Hora</th>
                  <th className="px-4 py-3 font-bold">Mesa / Ubicación</th>
                  <th className="px-4 py-3 font-bold">Cliente</th>
                  <th className="px-4 py-3 font-bold">Medio de Pago</th>
                  <th className="px-4 py-3 font-bold text-right">Subtotal</th>
                  <th className="px-4 py-3 font-bold text-right">Propina (10%)</th>
                  <th className="px-4 py-3 font-bold text-right">Total Cobrado</th>
                  <th className="px-4 py-3 font-bold text-center">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {filteredSales.map((sale) => {
                  const saleTime = new Date(sale.closedAt).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                        #{sale.ticketNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {saleTime}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">
                          Mesa #{sale.tableNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {sale.tableName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">
                        {sale.customerName || `Mesa ${sale.tableNumber}`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
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
                            {sale.paymentMethod === "tarjeta" ? "Débito/POS" : sale.paymentMethod}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 font-mono">
                        {formatCLP(sale.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-300 font-mono">
                        {sale.tipAmount > 0 ? formatCLP(sale.tipAmount) : "$0"}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400 font-mono text-sm">
                        {formatCLP(sale.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedTicketForView(sale)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
                          title="Ver y re-imprimir ticket"
                        >
                          <Receipt className="h-3 w-3 text-amber-400" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL REIMPRESIÓN DE TICKET CERRADO ── */}
      {selectedTicketForView && (
        <TicketModal
          isOpen={!!selectedTicketForView}
          onClose={() => setSelectedTicketForView(null)}
          table={{
            id: selectedTicketForView.tableId,
            number: selectedTicketForView.tableNumber,
            name: selectedTicketForView.tableName,
            capacity: 4,
            zone: selectedTicketForView.zone || "salon_principal",
            status: "disponible",
            position: { x: 50, y: 50 },
            shape: "square",
          }}
          reservation={{
            id: `res-${selectedTicketForView.id}`,
            tableId: selectedTicketForView.tableId,
            tableNumber: selectedTicketForView.tableNumber,
            customer: { name: selectedTicketForView.customerName, phone: "" },
            dateTime: selectedTicketForView.closedAt,
            guestsCount: 4,
            status: "disponible",
            orderStatus: "pagado",
            iaSummary: {
              channel: "manual",
              summary: "Venta cerrada",
              timestamp: selectedTicketForView.closedAt,
              guestsCount: 4,
              aiAgentName: "Cajero",
              confidenceScore: 1,
              keyTopics: [],
            },
            items: selectedTicketForView.items,
            totalAmount: selectedTicketForView.totalAmount,
            createdVia: "manual",
          }}
          items={selectedTicketForView.items}
          tenantName={tenantName}
          readOnly={true}
          initialPaymentMethod={selectedTicketForView.paymentMethod}
          ticketNumber={selectedTicketForView.ticketNumber}
        />
      )}

      {/* ── MODAL DE ARQUEO / CORTE DE CAJA ── */}
      {isArqueoModalOpen && (
        <CashRegisterPanel
          closedSales={closedSales}
          tenantName={tenantName}
          isOpen={isArqueoModalOpen}
          onClose={() => setIsArqueoModalOpen(false)}
        />
      )}
    </div>
  );
};
