"use client";

import React, { useRef } from "react";
import { Table, Reservation, OrderItem } from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import { Printer, X, Check, Receipt, DollarSign, CreditCard, Banknote } from "lucide-react";

export interface PaymentConfirmationData {
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  subtotal: number;
  tipAmount: number;
  totalToPay: number;
  netAmount: number;
  ivaAmount: number;
  includeTip: boolean;
  items: OrderItem[];
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table;
  reservation: Reservation | null;
  items: OrderItem[];
  tenantName?: string;
  onConfirmPayment?: (data: PaymentConfirmationData) => void;
  readOnly?: boolean;
  initialPaymentMethod?: "efectivo" | "tarjeta" | "transferencia";
  ticketNumber?: string;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  table,
  reservation,
  items,
  tenantName = "Restaurante LinkStation",
  onConfirmPayment,
  readOnly = false,
  initialPaymentMethod = "tarjeta",
  ticketNumber,
}) => {
  const [paymentMethod, setPaymentMethod] = React.useState<"efectivo" | "tarjeta" | "transferencia">(
    initialPaymentMethod
  );
  const [includeTip, setIncludeTip] = React.useState<boolean>(true);
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const tipAmount = includeTip ? Math.round(subtotal * 0.1) : 0;
  const totalToPay = subtotal + tipAmount;
  const netAmount = Math.round(subtotal / 1.19);
  const ivaAmount = subtotal - netAmount;

  const handlePrint = () => {
    window.print();
  };

  const handleCompletePayment = () => {
    if (onConfirmPayment) {
      onConfirmPayment({
        paymentMethod,
        subtotal,
        tipAmount,
        totalToPay,
        netAmount,
        ivaAmount,
        includeTip,
        items,
      });
    }
    onClose();
  };

  const currentDate = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible;
          }
          #printable-ticket {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10px;
            margin: 0;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-[rgba(0,229,255,0.15)] bg-[rgba(10,15,30,0.88)] shadow-[0_16px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(0,229,255,0.1)] backdrop-blur-2xl">
        {/* Top subtle glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.35)] to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.8)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              readOnly
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "bg-[#00e5ff]/10 text-[#00e5ff] border-[rgba(0,229,255,0.3)] shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            }`}>
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {readOnly ? "Ticket de Venta (Pagada)" : "Comanda / Pre-cuenta"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {ticketNumber ? `Folio #${ticketNumber} • ` : ""}Mesa #{table.number} • {table.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-white/[0.04] text-slate-400 hover:text-white hover:border-[rgba(0,229,255,0.3)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Opciones de pago (Cajero) */}
          <div className="space-y-2 rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {readOnly ? "Medio de Pago Registrado" : "Medio de Pago"}
            </span>

            {readOnly ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300">
                {paymentMethod === "efectivo" && <Banknote className="h-4 w-4" />}
                {paymentMethod === "tarjeta" && <CreditCard className="h-4 w-4" />}
                {paymentMethod === "transferencia" && <DollarSign className="h-4 w-4" />}
                <span className="capitalize">
                  Pagado con {paymentMethod === "tarjeta" ? "Débito / Tarjeta POS" : paymentMethod}
                </span>
                <span className="ml-auto text-[10px] rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400 font-semibold">
                  Cobrado
                </span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("tarjeta")}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === "tarjeta"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Débito / POS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("efectivo")}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === "efectivo"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transferencia")}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === "transferencia"
                        ? "bg-purple-600/20 border-purple-500 text-purple-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Transferencia</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeTip}
                    onChange={(e) => setIncludeTip(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <span>Incluir Propina Sugerida del 10% ({formatCLP(Math.round(subtotal * 0.1))})</span>
                </label>
              </>
            )}
          </div>

          {/* Ticket preview paper (80mm style) */}
          <div
            id="printable-ticket"
            ref={ticketRef}
            className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900 font-mono text-xs shadow-md space-y-3"
          >
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h4 className="font-bold text-sm tracking-wide uppercase">{tenantName}</h4>
              <p className="text-[10px] text-slate-500">SISTEMA INTEGRADO DE PUNTO DE VENTA</p>
              <p className="text-[10px] text-slate-500">{currentDate}</p>
              <p className="text-[10px] text-slate-600 font-bold mt-1">
                {ticketNumber
                  ? `COMPROBANTE DE PAGO • #${ticketNumber}`
                  : `TICKET PRE-CUENTA • MESA #${table.number}`}
              </p>
              {reservation?.customer?.name && (
                <p className="text-[10px] text-slate-500">Cliente: {reservation.customer.name}</p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase pb-1">
                <span>Cant • Descripción</span>
                <span>Total</span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs">
                  <div className="pr-2">
                    <span className="font-bold">{item.quantity}x </span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    {formatCLP(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Neto:</span>
                <span>{formatCLP(netAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA (19%):</span>
                <span>{formatCLP(ivaAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                <span>Subtotal Consumo:</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              {includeTip && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Propina Sugerida (10%):</span>
                  <span>{formatCLP(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t-2 border-slate-800">
                <span>TOTAL {readOnly ? "PAGADO" : "A PAGAR"}:</span>
                <span>{formatCLP(totalToPay)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-1 uppercase font-semibold">
                <span>Forma de Pago:</span>
                <span className="font-bold text-slate-900">
                  {paymentMethod === "tarjeta"
                    ? "Tarjeta Débito/POS"
                    : paymentMethod === "efectivo"
                    ? "Efectivo"
                    : "Transferencia"}
                </span>
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-400 pt-3 border-t border-dashed border-slate-300 leading-tight">
              <p>¡Gracias por su visita!</p>
              <p>Documento de control interno • No válido como boleta fiscal</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-4 gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
          >
            <Printer className="h-4 w-4 text-amber-400" />
            <span>Imprimir Ticket</span>
          </button>

          {readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
              <span>Cerrar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompletePayment}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
            >
              <Check className="h-4 w-4" />
              <span>Cobrar y Cerrar Mesa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
