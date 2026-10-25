"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ClosedSale } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import {
  Receipt,
  Printer,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronRight,
  Lock,
  Unlock,
  FileText,
  AlertTriangle,
  Info,
  DollarSign,
  Coins,
  CreditCard,
  Building,
  RotateCcw,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  User,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CashRegisterStep = "apertura" | "turno" | "arqueo" | "informe";
export type MovimientoTipo = "ingreso" | "egreso";

export interface CashMovement {
  id: string;
  tipo: MovimientoTipo;
  concepto: string;
  monto: number;
  timestamp: string;
  operador?: string;
}

export interface CashRegisterShift {
  id: string;
  step: CashRegisterStep;
  openedAt: string;
  openedBy: string;
  fondoInicial: number;
  movimientos: CashMovement[];
  closedAt: string | null;
  closedBy: string | null;
  efectivoRealContado: number | null;
  diferenciaCaja: number | null;
  justificacionDiferencia?: string;
  salesSnapshot?: ClosedSale[];
}

interface CashRegisterPanelProps {
  closedSales: ClosedSale[];
  tenantName?: string;
  operatorName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onShiftCompleted?: (shift: CashRegisterShift) => void;
}

const PRESETS_EGRESO = [
  "Pago a proveedor urgente",
  "Compra de verduras / insumos",
  "Retiro parcial a caja fuerte",
  "Gastos operativos menores",
  "Devolución de dinero a cliente",
  "Pago de delivery externo",
  "Otro egreso",
];

const PRESETS_INGRESO = [
  "Aporte de fondo adicional",
  "Corrección por ajuste",
  "Cobro manual extraordinario",
  "Otro ingreso",
];

const CLP_DENOMINATIONS = [
  { label: "$20.000", value: 20000, type: "billete" },
  { label: "$10.000", value: 10000, type: "billete" },
  { label: "$5.000", value: 5000, type: "billete" },
  { label: "$2.000", value: 2000, type: "billete" },
  { label: "$1.000", value: 1000, type: "billete" },
  { label: "$500", value: 500, type: "moneda" },
  { label: "$100", value: 100, type: "moneda" },
  { label: "$50", value: 50, type: "moneda" },
  { label: "$10", value: 10, type: "moneda" },
];

export const CashRegisterPanel: React.FC<CashRegisterPanelProps> = ({
  closedSales,
  tenantName = "LinkStation Restaurante",
  operatorName = "Cajero en Turno",
  isOpen = true,
  onClose,
  onShiftCompleted,
}) => {
  const storageKey = `linkstation_cash_register_${tenantName.replace(/\s+/g, "_")}`;

  // State
  const [shift, setShift] = useState<CashRegisterShift>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn("Could not load cash register shift from localStorage", e);
      }
    }
    return {
      id: `shift-${Date.now()}`,
      step: "apertura",
      openedAt: new Date().toISOString(),
      openedBy: operatorName,
      fondoInicial: 50000,
      movimientos: [],
      closedAt: null,
      closedBy: null,
      efectivoRealContado: null,
      diferenciaCaja: null,
    };
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(shift));
    } catch (e) {
      console.warn("Failed saving cash register shift to localStorage", e);
    }
  }, [shift, storageKey]);

  // Form states
  const [inputFondo, setInputFondo] = useState<number>(shift.fondoInicial || 50000);
  const [inputOperador, setInputOperador] = useState<string>(operatorName);

  // New Movement Form
  const [isAddingMovement, setIsAddingMovement] = useState<boolean>(false);
  const [movTipo, setMovTipo] = useState<MovimientoTipo>("egreso");
  const [movConcepto, setMovConcepto] = useState<string>("");
  const [movMonto, setMovMonto] = useState<string>("");

  // Cash count breakdown
  const [denominationsCount, setDenominationsCount] = useState<Record<number, number>>({
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    10: 0,
  });
  const [manualCashInput, setManualCashInput] = useState<string>("");
  const [countMode, setCountMode] = useState<"billetes" | "directo">("directo");
  const [justificacion, setJustificacion] = useState<string>("");

  // Relevant sales during this shift (sales closed after openedAt)
  const shiftSales = useMemo(() => {
    if (!shift.openedAt) return closedSales;
    const openTime = new Date(shift.openedAt).getTime();
    return closedSales.filter((sale) => {
      const saleTime = new Date(sale.closedAt).getTime();
      return saleTime >= openTime;
    });
  }, [closedSales, shift.openedAt]);

  // Metrics
  const totalVentasEfectivo = useMemo(() => {
    return shiftSales
      .filter((s) => s.paymentMethod === "efectivo")
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [shiftSales]);

  const totalVentasTarjeta = useMemo(() => {
    return shiftSales
      .filter((s) => s.paymentMethod === "tarjeta")
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [shiftSales]);

  const totalVentasTransferencia = useMemo(() => {
    return shiftSales
      .filter((s) => s.paymentMethod === "transferencia")
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [shiftSales]);

  const totalPropinas = useMemo(() => {
    return shiftSales.reduce((acc, s) => acc + (s.tipAmount || 0), 0);
  }, [shiftSales]);

  const totalVentasTurno = totalVentasEfectivo + totalVentasTarjeta + totalVentasTransferencia;

  const totalIngresosExtra = useMemo(() => {
    return shift.movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((acc, m) => acc + m.monto, 0);
  }, [shift.movimientos]);

  const totalEgresosExtra = useMemo(() => {
    return shift.movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((acc, m) => acc + m.monto, 0);
  }, [shift.movimientos]);

  // Teórico de efectivo que DEBERÍA haber en el cajón de dinero:
  // Fondo Inicial + Ventas Efectivo + Ingresos extraordinarios - Egresos
  const efectivoTeoricoEsperado = useMemo(() => {
    return (shift.fondoInicial || 0) + totalVentasEfectivo + totalIngresosExtra - totalEgresosExtra;
  }, [shift.fondoInicial, totalVentasEfectivo, totalIngresosExtra, totalEgresosExtra]);

  // Conteo total desde el desglose de billetes
  const calculatedBreakdownTotal = useMemo(() => {
    return Object.entries(denominationsCount).reduce((acc, [denom, count]) => {
      return acc + Number(denom) * Number(count || 0);
    }, 0);
  }, [denominationsCount]);

  // Efectivo real final ingresado por el usuario
  const efectivoRealContado = useMemo(() => {
    if (countMode === "billetes") {
      return calculatedBreakdownTotal;
    }
    const parsed = parseInt(manualCashInput.replace(/\D/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [countMode, calculatedBreakdownTotal, manualCashInput]);

  // Diferencia de caja (Real - Esperado)
  const diferenciaCalculada = useMemo(() => {
    return efectivoRealContado - efectivoTeoricoEsperado;
  }, [efectivoRealContado, efectivoTeoricoEsperado]);

  // Step 1: Open Register
  const handleApertura = () => {
    setShift((prev) => ({
      ...prev,
      step: "turno",
      fondoInicial: Number(inputFondo) || 0,
      openedAt: new Date().toISOString(),
      openedBy: inputOperador || operatorName,
      movimientos: [],
      closedAt: null,
      closedBy: null,
      efectivoRealContado: null,
      diferenciaCaja: null,
    }));
  };

  // Step 2: Add Movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseInt(movMonto.replace(/\D/g, ""), 10);
    if (!movConcepto.trim() || !montoNum || montoNum <= 0) return;

    const newMov: CashMovement = {
      id: `mov-${Date.now()}`,
      tipo: movTipo,
      concepto: movConcepto.trim(),
      monto: montoNum,
      timestamp: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      operador: operatorName,
    };

    setShift((prev) => ({
      ...prev,
      movimientos: [newMov, ...prev.movimientos],
    }));

    setMovConcepto("");
    setMovMonto("");
    setIsAddingMovement(false);
  };

  // Step 3: Go to Arqueo / Cierre
  const handleGoToArqueo = () => {
    setManualCashInput(efectivoTeoricoEsperado.toString());
    setShift((prev) => ({ ...prev, step: "arqueo" }));
  };

  // Step 4: Confirm Cierre
  const handleConfirmCierre = () => {
    const finalShift: CashRegisterShift = {
      ...shift,
      step: "informe",
      closedAt: new Date().toISOString(),
      closedBy: operatorName,
      efectivoRealContado,
      diferenciaCaja: diferenciaCalculada,
      justificacionDiferencia: justificacion.trim() || undefined,
      salesSnapshot: shiftSales,
    };
    setShift(finalShift);
    if (onShiftCompleted) {
      onShiftCompleted(finalShift);
    }
  };

  // Reset shift to start a new one
  const handleNuevoTurno = () => {
    const newShift: CashRegisterShift = {
      id: `shift-${Date.now()}`,
      step: "apertura",
      openedAt: new Date().toISOString(),
      openedBy: operatorName,
      fondoInicial: 50000,
      movimientos: [],
      closedAt: null,
      closedBy: null,
      efectivoRealContado: null,
      diferenciaCaja: null,
    };
    setShift(newShift);
    setInputFondo(50000);
    setManualCashInput("");
    setJustificacion("");
    setDenominationsCount({
      20000: 0,
      10000: 0,
      5000: 0,
      2000: 0,
      1000: 0,
      500: 0,
      100: 0,
      50: 0,
      10: 0,
    });
  };

  // Print Informe Z
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-indigo-950/40">
        {/* TOP BAR */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Arqueo y Control de Caja</h2>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    shift.step === "apertura" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                    shift.step === "turno" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                    shift.step === "arqueo" && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                    shift.step === "informe" && "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  )}
                >
                  {shift.step === "apertura" && "Caja Cerrada"}
                  {shift.step === "turno" && "Turno Abierto"}
                  {shift.step === "arqueo" && "Conteo de Caja"}
                  {shift.step === "informe" && "Informe Z Cerrado"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {tenantName} • Operador: <span className="text-slate-200">{shift.openedBy || operatorName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shift.step !== "apertura" && shift.step !== "informe" && (
              <button
                onClick={() => setShift((prev) => ({ ...prev, step: prev.step === "arqueo" ? "turno" : "arqueo" }))}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                {shift.step === "arqueo" ? "← Volver a Turno" : "Hacer Cierre / Arqueo"}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* WORKFLOW CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ============================================================== */}
          {/* STEP 1: APERTURA DE CAJA */}
          {/* ============================================================== */}
          {shift.step === "apertura" && (
            <div className="mx-auto max-w-lg space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lock className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Apertura de Turno de Caja</h3>
                <p className="text-xs text-slate-400">
                  Ingresa el fondo inicial de sencillo o caja chica para dar inicio a las operaciones del día.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fondo Inicial de Caja (Efectivo disponible)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      value={inputFondo}
                      onChange={(e) => setInputFondo(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-8 pr-4 text-base font-bold text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="50000"
                    />
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {[30000, 50000, 70000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setInputFondo(amt)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                          inputFondo === amt
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                        )}
                      >
                        {formatCLP(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombre del Cajero / Responsable
                  </label>
                  <input
                    type="text"
                    value={inputOperador}
                    onChange={(e) => setInputOperador(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-300 flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                  <span>
                    El fondo inicial se sumará automáticamente a las ventas en efectivo para calcular el arqueo final
                    al cerrar el turno.
                  </span>
                </div>

                <button
                  onClick={handleApertura}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:brightness-110 active:scale-[0.99] transition-all"
                >
                  <Unlock className="h-4 w-4" />
                  <span>Abrir Caja e Iniciar Turno</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: TURNO ACTIVO / MOVIMIENTOS EN VIVO */}
          {/* ============================================================== */}
          {shift.step === "turno" && (
            <div className="space-y-6">
              {/* KPIS DE CAJA */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Fondo Inicial</span>
                    <Coins className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-lg font-bold text-white">{formatCLP(shift.fondoInicial)}</div>
                  <p className="text-[10px] text-slate-500">Caja chica de apertura</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Ventas Efectivo</span>
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400">{formatCLP(totalVentasEfectivo)}</div>
                  <p className="text-[10px] text-slate-500">En {shiftSales.filter((s) => s.paymentMethod === "efectivo").length} cobros</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>Ventas Tarjeta / POS</span>
                    <CreditCard className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-lg font-bold text-blue-400">{formatCLP(totalVentasTarjeta)}</div>
                  <p className="text-[10px] text-slate-500">En {shiftSales.filter((s) => s.paymentMethod === "tarjeta").length} cobros</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 bg-indigo-950/20 border-indigo-500/20">
                  <div className="flex items-center justify-between text-indigo-300 text-xs mb-1">
                    <span className="font-semibold">Efectivo Teórico en Caja</span>
                    <Building className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-lg font-black text-indigo-400">{formatCLP(efectivoTeoricoEsperado)}</div>
                  <p className="text-[10px] text-indigo-300/70">Fondo + Ventas Efec. + Ingr. - Egr.</p>
                </div>
              </div>

              {/* ACTION BUTTONS & SUMMARY ROW */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-800 py-3">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>
                    Total Recaudado Turno: <strong className="text-white">{formatCLP(totalVentasTurno)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Propinas Totales: <strong className="text-amber-400">{formatCLP(totalPropinas)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Movimientos Extra: <strong className="text-slate-200">+{formatCLP(totalIngresosExtra)} / -{formatCLP(totalEgresosExtra)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingMovement(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Registrar Ingreso / Retiro</span>
                  </button>

                  <button
                    onClick={handleGoToArqueo}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Realizar Arqueo y Cierre</span>
                  </button>
                </div>
              </div>

              {/* MODAL REGISTRAR MOVIMIENTO (INGRESO / EGRESO) */}
              {isAddingMovement && (
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="h-4 w-4 text-indigo-400" />
                      Registrar Movimiento de Efectivo
                    </h4>
                    <button
                      onClick={() => setIsAddingMovement(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Selector Tipo */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovTipo("egreso")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border",
                        movTipo === "egreso"
                          ? "border-red-500/50 bg-red-500/10 text-red-400 shadow-md shadow-red-500/10"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      )}
                    >
                      <ArrowUpRight className="h-4 w-4 text-red-400" />
                      <span>Egreso / Retiro (Salida de dinero)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovTipo("ingreso")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border",
                        movTipo === "ingreso"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/10"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      )}
                    >
                      <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                      <span>Ingreso Adicional (Entrada de dinero)</span>
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAddMovement} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Concepto / Motivo
                      </label>
                      <input
                        type="text"
                        value={movConcepto}
                        onChange={(e) => setMovConcepto(e.target.value)}
                        placeholder="Ej. Compra de limones y servilletas de emergencia"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        required
                      />
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(movTipo === "egreso" ? PRESETS_EGRESO : PRESETS_INGRESO).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMovConcepto(preset)}
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Monto en Pesos (CLP)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                        <input
                          type="number"
                          value={movMonto}
                          onChange={(e) => setMovMonto(e.target.value)}
                          placeholder="15000"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-7 pr-3 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingMovement(false)}
                        className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                      >
                        Guardar Movimiento
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* LISTA DE MOVIMIENTOS Y VENTAS DEL TURNO */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Panel Movimientos de Caja */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                      Movimientos Manuales del Turno ({shift.movimientos.length})
                    </h4>
                    <span className="text-[11px] text-slate-400">Ingresos / Egresos</span>
                  </div>

                  {shift.movimientos.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No se han registrado retiros ni aportes de dinero en este turno.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {shift.movimientos.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                                m.tipo === "egreso"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              )}
                            >
                              {m.tipo === "egreso" ? "-" : "+"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-200">{m.concepto}</p>
                              <p className="text-[10px] text-slate-500">{m.timestamp} • {m.operador}</p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "font-bold",
                              m.tipo === "egreso" ? "text-red-400" : "text-emerald-400"
                            )}
                          >
                            {m.tipo === "egreso" ? "-" : "+"}
                            {formatCLP(m.monto)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel Ventas Cobradas del Turno */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-emerald-400" />
                      Ventas Cerradas en el Turno ({shiftSales.length})
                    </h4>
                    <span className="text-[11px] text-slate-400">{formatCLP(totalVentasTurno)}</span>
                  </div>

                  {shiftSales.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No hay ventas cerradas desde la apertura de este turno.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {shiftSales.slice(0, 8).map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">Ticket #{sale.ticketNumber}</span>
                              <span className="text-[10px] text-slate-400">• Mesa {sale.tableNumber}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 capitalize">{sale.paymentMethod}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white">{formatCLP(sale.totalAmount)}</span>
                            {sale.tipAmount > 0 && (
                              <p className="text-[10px] text-amber-400/80">+{formatCLP(sale.tipAmount)} propina</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: ARQUEO DE CAJA / CONTEO FISICO */}
          {/* ============================================================== */}
          {shift.step === "arqueo" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-indigo-400" />
                      Conteo de Efectivo en Caja
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cuenta el dinero físico que hay actualmente en el cajón de dinero.
                    </p>
                  </div>

                  {/* Toggle Mode */}
                  <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
                    <button
                      type="button"
                      onClick={() => setCountMode("directo")}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                        countMode === "directo" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      Monto Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountMode("billetes")}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                        countMode === "billetes" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      Desglose Billetes/Monedas
                    </button>
                  </div>
                </div>

                {countMode === "directo" ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Total de Efectivo Físico Contado
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                      <input
                        type="number"
                        value={manualCashInput}
                        onChange={(e) => setManualCashInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-8 pr-4 text-base font-bold text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Ingresa el monto total contado"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CLP_DENOMINATIONS.map((den) => (
                      <div
                        key={den.value}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-2.5"
                      >
                        <span className="font-bold text-xs text-slate-200">{den.label}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={denominationsCount[den.value] || ""}
                            onChange={(e) =>
                              setDenominationsCount((prev) => ({
                                ...prev,
                                [den.value]: parseInt(e.target.value, 10) || 0,
                              }))
                            }
                            className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-xs font-bold text-white focus:border-indigo-500 focus:outline-none"
                            placeholder="0"
                          />
                          <span className="text-[10px] text-slate-500">cant.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* COMPARATIVA DE ARQUEO: TEÓRICO VS REAL */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] font-semibold text-slate-400">Efectivo Teórico Esperado</span>
                      <p className="text-base font-bold text-white mt-0.5">{formatCLP(efectivoTeoricoEsperado)}</p>
                      <p className="text-[9px] text-slate-500 mt-1">Fondo + Ventas + Ingr. - Egr.</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <span className="text-[11px] font-semibold text-slate-400">Efectivo Real Físico</span>
                      <p className="text-base font-bold text-emerald-400 mt-0.5">{formatCLP(efectivoRealContado)}</p>
                      <p className="text-[9px] text-slate-500 mt-1">Conteo ingresado</p>
                    </div>

                    <div
                      className={cn(
                        "rounded-xl border p-3 flex flex-col justify-center",
                        diferenciaCalculada === 0 && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                        diferenciaCalculada > 0 && "border-blue-500/30 bg-blue-500/10 text-blue-400",
                        diferenciaCalculada < 0 && "border-red-500/30 bg-red-500/10 text-red-400"
                      )}
                    >
                      <span className="text-[11px] font-bold">Diferencia de Caja</span>
                      <p className="text-lg font-black mt-0.5">
                        {diferenciaCalculada > 0 ? `+${formatCLP(diferenciaCalculada)}` : formatCLP(diferenciaCalculada)}
                      </p>
                      <span className="text-[10px] font-medium">
                        {diferenciaCalculada === 0 && "✓ Caja Cuadrada Perfecta"}
                        {diferenciaCalculada > 0 && "▲ Sobrante en caja"}
                        {diferenciaCalculada < 0 && "▼ Faltante en caja"}
                      </span>
                    </div>
                  </div>

                  {/* Justificación if there is a discrepancy */}
                  {diferenciaCalculada !== 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <label className="block text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Observación / Justificación del descuadre:
                      </label>
                      <textarea
                        value={justificacion}
                        onChange={(e) => setJustificacion(e.target.value)}
                        placeholder="Ej. Se entregó vuelto aproximado por falta de monedas de $50..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Final Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setShift((prev) => ({ ...prev, step: "turno" }))}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    ← Volver a Turno
                  </button>

                  <button
                    onClick={handleConfirmCierre}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar Cierre y Generar Informe Z</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: INFORME Z / TICKET DE CIERRE FISCAL */}
          {/* ============================================================== */}
          {shift.step === "informe" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Turno Cerrado Exitosamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Informe Z (80mm)</span>
                  </button>
                  <button
                    onClick={handleNuevoTurno}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:text-white transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Abrir Nuevo Turno</span>
                  </button>
                </div>
              </div>

              {/* TICKET TERMICAMENTE FORMATEADO (80MM / PRINT READY) */}
              <div className="mx-auto max-w-sm rounded-2xl border border-slate-700 bg-white p-6 text-slate-900 font-mono text-xs shadow-2xl space-y-3.5 print:border-none print:shadow-none print:m-0 print:p-0 print:w-full">
                {/* Header */}
                <div className="text-center border-b border-dashed border-slate-400 pb-3">
                  <h3 className="font-bold text-base uppercase tracking-wider">{tenantName}</h3>
                  <p className="text-[10px] text-slate-600 uppercase">Informe Z • Cierre de Turno de Caja</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(shift.closedAt || Date.now()).toLocaleDateString("es-CL", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* Shift Details */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">ID Turno:</span>
                    <span className="font-bold">{shift.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cajero / Operador:</span>
                    <span className="font-bold">{shift.closedBy || shift.openedBy || operatorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Apertura:</span>
                    <span>{new Date(shift.openedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cierre:</span>
                    <span>{new Date(shift.closedAt || Date.now()).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                {/* Sales Breakdown by Payment Method */}
                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2 text-[11px]">
                  <div className="font-bold uppercase text-[10px] text-slate-500 pb-0.5">
                    Ventas por Medio de Pago
                  </div>
                  <div className="flex justify-between">
                    <span>Efectivo ({shiftSales.filter((s) => s.paymentMethod === "efectivo").length}):</span>
                    <span className="font-bold">{formatCLP(totalVentasEfectivo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarjeta / POS ({shiftSales.filter((s) => s.paymentMethod === "tarjeta").length}):</span>
                    <span className="font-bold">{formatCLP(totalVentasTarjeta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transferencia ({shiftSales.filter((s) => s.paymentMethod === "transferencia").length}):</span>
                    <span className="font-bold">{formatCLP(totalVentasTransferencia)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-semibold">Total Propinas:</span>
                    <span className="font-bold text-amber-800">{formatCLP(totalPropinas)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-xs border-t border-slate-300">
                    <span>TOTAL VENTAS:</span>
                    <span>{formatCLP(totalVentasTurno)}</span>
                  </div>
                </div>

                {/* Cash Drawer Flow */}
                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2 text-[11px]">
                  <div className="font-bold uppercase text-[10px] text-slate-500 pb-0.5">
                    Flujo de Efectivo en Caja
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">(+) Fondo Inicial:</span>
                    <span>{formatCLP(shift.fondoInicial)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">(+) Ventas en Efectivo:</span>
                    <span>{formatCLP(totalVentasEfectivo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">(+) Ingresos Extra:</span>
                    <span>+{formatCLP(totalIngresosExtra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">(-) Egresos / Retiros:</span>
                    <span>-{formatCLP(totalEgresosExtra)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-semibold border-t border-slate-200">
                    <span>Efectivo Teórico:</span>
                    <span>{formatCLP(efectivoTeoricoEsperado)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs">
                    <span>Efectivo Real Contado:</span>
                    <span>{formatCLP(shift.efectivoRealContado ?? efectivoRealContado)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                    <span>DIFERENCIA:</span>
                    <span
                      className={cn(
                        (shift.diferenciaCaja ?? diferenciaCalculada) === 0 && "text-slate-900",
                        (shift.diferenciaCaja ?? diferenciaCalculada) > 0 && "text-blue-800",
                        (shift.diferenciaCaja ?? diferenciaCalculada) < 0 && "text-red-700"
                      )}
                    >
                      {(shift.diferenciaCaja ?? diferenciaCalculada) > 0 ? "+" : ""}
                      {formatCLP(shift.diferenciaCaja ?? diferenciaCalculada)}
                    </span>
                  </div>
                  {shift.justificacionDiferencia && (
                    <p className="text-[10px] text-slate-600 italic pt-1">
                      Nota: {shift.justificacionDiferencia}
                    </p>
                  )}
                </div>

                {/* Signatures */}
                <div className="pt-6 pb-2 space-y-6 text-center text-[10px] text-slate-500">
                  <div className="w-36 border-t border-slate-400 mx-auto pt-1">
                    <p className="font-sans font-semibold text-slate-700">Firma Cajero</p>
                  </div>
                  <div className="w-36 border-t border-slate-400 mx-auto pt-1">
                    <p className="font-sans font-semibold text-slate-700">Firma Administrador</p>
                  </div>
                  <p className="text-[9px] text-slate-400">Control Interno • LinkStation POS</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
