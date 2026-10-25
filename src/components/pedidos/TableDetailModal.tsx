"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Reservation,
  TableStatus,
  OrderStatus,
  OrderItem,
  MenuProduct,
} from "@/types/pedidos";
import { useTenantStore } from "@/store/tenant";
import {
  X,
  Bot,
  User,
  Phone,
  Calendar,
  Utensils,
  Clock,
  Sparkles,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  MessageSquare,
  PhoneCall,
  Globe,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PDFMenuModal } from "./PDFMenuModal";
import { TicketModal, PaymentConfirmationData } from "./TicketModal";

import { formatCLP } from "@/lib/mock-pedidos-data";

interface TableDetailModalProps {
  table: Table | null;
  reservation: Reservation | null;
  onClose: () => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => void;
  onSaveReservation: (reservation: Reservation) => void;
  onCloseTableSale?: (table: Table, saleData: PaymentConfirmationData) => void;
}

const MENU_PRESETS = [
  { name: "Ensalada Burrata", category: "entrante", price: 14500 },
  { name: "Tabla de Ibéricos", category: "entrante", price: 22000 },
  { name: "Solomillo de Ternera", category: "principal", price: 24000 },
  { name: "Paella de Marisco", category: "principal", price: 32000 },
  { name: "Chuletón Madurado", category: "principal", price: 58000 },
  { name: "Tarta de Queso", category: "postre", price: 7500 },
  { name: "Vino Reserva Especial", category: "bebida", price: 21000 },
  { name: "Jarra de Sangría (1.5L)", category: "bebida", price: 16000 },
];

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  table,
  reservation,
  onClose,
  onUpdateStatus,
  onSaveReservation,
  onCloseTableSale,
}) => {
  // ── All hooks MUST be declared before any conditional return ──
  const { tenantId, tenantName, restaurantRole } = useTenantStore();
  const [currentStatus, setCurrentStatus] = useState<TableStatus>(table?.status ?? "disponible");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    reservation?.orderStatus || "pendiente"
  );
  const [items, setItems] = useState<OrderItem[]>(reservation?.items || []);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [isPDFMenuModalOpen, setIsPDFMenuModalOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [liveMenu, setLiveMenu] = useState<MenuProduct[]>([]);
  const [isDeductingStock, setIsDeductingStock] = useState(false);
  const [stockFeedback, setStockFeedback] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/restaurant/menu?tenantId=${tenantId}&isActive=true`)
      .then((res) => res.json())
      .then((data: { data?: MenuProduct[] }) => {
        if (data.data) setLiveMenu(data.data);
      })
      .catch((err: unknown) => console.warn("Error fetching live menu in modal:", err));
  }, [tenantId]);

  // Guard: if no table is provided, render nothing (hooks already called above)
  if (!table) return null;

  const calculateTotal = (currentItems: OrderItem[]) => {
    return currentItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  };

  const handleUpdateItemsFromPDF = (newItems: OrderItem[]) => {
    setItems(newItems);
    const activeRes: Reservation = reservation || {
      id: `res-${Math.floor(100000 + Math.random() * 900000)}`,
      tableId: table.id,
      tableNumber: table.number,
      customer: { name: `Mesa ${table.number} (Salón)`, phone: "" },
      dateTime: new Date().toISOString(),
      guestsCount: table.capacity || 2,
      status: "ocupada",
      orderStatus: "pendiente",
      iaSummary: {
        channel: "manual",
        summary: `Pedido cargado desde carta PDF para Mesa ${table.number}`,
        keyTopics: ["Pedido en Mesa", "Carta PDF"],
        timestamp: new Date().toISOString(),
        aiAgentName: "Mesero",
        confidenceScore: 1,
        guestsCount: table.capacity || 2,
      },
      items: newItems,
      totalAmount: calculateTotal(newItems),
      createdVia: "manual",
    };

    onSaveReservation({
      ...activeRes,
      orderStatus,
      items: newItems,
      totalAmount: calculateTotal(newItems),
    });
  };

  const handleAddItem = (preset: {
    name: string;
    category: string;
    price: number;
    id?: string;
  }) => {
    const cleanName = preset.name.trim();
    const existingIndex = items.findIndex(
      (i) => i.name.toLowerCase().trim() === cleanName.toLowerCase()
    );

    let updated: OrderItem[];
    if (existingIndex >= 0) {
      updated = items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      const newItem: OrderItem = {
        id: preset.id || `item-${Date.now()}`,
        name: cleanName,
        category: preset.category as OrderItem["category"],
        quantity: 1,
        unitPrice: preset.price,
      };
      updated = [...items, newItem];
    }

    setItems(updated);
    if (reservation) {
      onSaveReservation({
        ...reservation,
        orderStatus,
        items: updated,
        totalAmount: calculateTotal(updated),
      });
    }
  };

  const handleRemoveItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    if (reservation) {
      onSaveReservation({
        ...reservation,
        orderStatus,
        items: updated,
        totalAmount: calculateTotal(updated),
      });
    }
  };

  const handleStatusChange = (newStatus: TableStatus) => {
    setCurrentStatus(newStatus);
    onUpdateStatus(table.id, newStatus);
  };

  const handleOrderStatusChange = async (newOrderStatus: OrderStatus) => {
    const previous = orderStatus;
    setOrderStatus(newOrderStatus);

    // Stock se descuenta únicamente al pasar a "servido"
    if (newOrderStatus === "servido" && previous !== "servido" && items.length > 0 && tenantId) {
      setIsDeductingStock(true);
      setStockFeedback(null);
      try {
        const res = await fetch("/api/restaurant/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            reservationId: reservation?.id,
            items: items.map((i) => ({
              productId: i.id,
              name: i.name,
              quantity: i.quantity,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.warnings && data.warnings.length > 0) {
            setStockFeedback({
              type: "warning",
              message: `¡Pedido Servido! Stock de insumos descontado (${data.deductedMovementsCount} movs). Advertencia: algunos insumos quedaron en stock crítico.`,
            });
          } else {
            setStockFeedback({
              type: "success",
              message: `¡Pedido Servido! Se descontó stock de insumos automáticamente en base a recetas BOM (${data.deductedMovementsCount} insumos afectados).`,
            });
          }
        } else {
          setStockFeedback({
            type: "error",
            message: data.error || "No se pudo descontar el stock",
          });
        }
      } catch (err: unknown) {
        setStockFeedback({
          type: "error",
          message:
            (err instanceof Error ? err.message : null) ||
            "Error de red al registrar consumo de stock",
        });
      } finally {
        setIsDeductingStock(false);
      }
    }

    if (reservation) {
      onSaveReservation({
        ...reservation,
        status: currentStatus,
        orderStatus: newOrderStatus,
        items,
        totalAmount: calculateTotal(items),
      });
    }
  };

  const channelBadge = (channel?: string) => {
    switch (channel) {
      case "whatsapp":
        return (
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp AI
          </span>
        );
      case "voice":
        return (
          <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
            <PhoneCall className="h-3.5 w-3.5" /> Agente de Voz AI
          </span>
        );
      case "web":
        return (
          <span className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-300">
            <Globe className="h-3.5 w-3.5" /> Chatbot Web
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
            <User className="h-3.5 w-3.5" /> Manual
          </span>
        );
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 p-4 backdrop-blur-sm duration-200 md:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-lg font-bold text-indigo-400">
              #{table.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{table.name}</h2>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                  {table.zone === "terraza"
                    ? "Terraza"
                    : table.zone === "vip"
                      ? "Zona VIP"
                      : "Salón Principal"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Capacidad: {table.capacity} comensales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Quick Status Control Buttons */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <label className="mb-2.5 block text-xs font-bold tracking-wider text-slate-400 uppercase">
              Estado de la Mesa
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStatusChange("disponible")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  currentStatus === "disponible"
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/10"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                )}
              >
                <Check className="h-3.5 w-3.5" /> Disponible
              </button>

              <button
                onClick={() => handleStatusChange("reservada")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  currentStatus === "reservada"
                    ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/10"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                )}
              >
                <Clock className="h-3.5 w-3.5" /> Reservada
              </button>

              <button
                onClick={() => handleStatusChange("ocupada")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  currentStatus === "ocupada"
                    ? "border-rose-500/50 bg-rose-500/20 text-rose-300 shadow-md shadow-rose-500/10"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                )}
              >
                <Utensils className="h-3.5 w-3.5" /> Ocupada
              </button>
            </div>
          </div>

          {/* AI SUMMARY CARD ("Lo que habló con la IA") */}
          {reservation ? (
            <div className="relative overflow-hidden rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-5 shadow-lg">
              <div className="pointer-events-none absolute top-0 right-0 p-3 opacity-10">
                <Bot className="h-32 w-32 text-indigo-400" />
              </div>

              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/20 p-2 text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Resumen de Conversación con IA</h3>
                    <p className="text-[11px] text-indigo-300">
                      {reservation.iaSummary.aiAgentName}
                    </p>
                  </div>
                </div>
                {channelBadge(reservation.createdVia)}
              </div>

              {/* Summary details */}
              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 leading-relaxed font-normal text-slate-200">
                  {`"${reservation.iaSummary.summary}"`}
                </div>

                {/* Key Topics & Tags */}
                {reservation.iaSummary.keyTopics && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-medium text-slate-400">
                      Temas clave:
                    </span>
                    {reservation.iaSummary.keyTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-indigo-300"
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dietary Restrictions & Special Requests */}
                {(reservation.iaSummary.dietaryRestrictions ||
                  reservation.iaSummary.specialRequests) && (
                  <div className="grid grid-cols-1 gap-2 pt-1 md:grid-cols-2">
                    {reservation.iaSummary.dietaryRestrictions && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                        <div>
                          <span className="block text-[11px] font-semibold">
                            Restricciones alimentarias:
                          </span>
                          <span className="text-[11px]">
                            {reservation.iaSummary.dietaryRestrictions.join(", ")}
                          </span>
                        </div>
                      </div>
                    )}

                    {reservation.iaSummary.specialRequests && (
                      <div className="flex items-start gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-2.5 text-purple-300">
                        <Tag className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400" />
                        <div>
                          <span className="block text-[11px] font-semibold">
                            Petición especial:
                          </span>
                          <span className="text-[11px]">
                            {reservation.iaSummary.specialRequests}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
              <Bot className="mx-auto mb-2 h-8 w-8 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">
                Esta mesa no tiene una reserva activa asociada
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Puedes cambiar el estado arriba a &quot;Reservada&quot; u &quot;Ocupada&quot; para
                asignarle un cliente.
              </p>
            </div>
          )}

          {/* CUSTOMER INFORMATION */}
          {reservation && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <User className="h-4 w-4 text-slate-400" /> Datos del Cliente
              </h3>

              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                <div>
                  <span className="block text-slate-500">Nombre del titular:</span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {reservation.customer.name}
                    </span>
                    {reservation.customer.isVip && (
                      <span className="rounded border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        ★ VIP
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500">Contacto:</span>
                  <span className="mt-0.5 block flex items-center gap-1 font-medium text-slate-300">
                    <Phone className="h-3 w-3 text-slate-400" /> {reservation.customer.phone}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-500">Fecha y Hora:</span>
                  <span className="mt-0.5 block flex items-center gap-1 font-medium text-slate-300">
                    <Calendar className="h-3 w-3 text-slate-400" /> {reservation.dateTime}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-500">Comensales:</span>
                  <span className="mt-0.5 block font-medium text-slate-300">
                    {reservation.guestsCount} personas
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ORDER ITEMS & BILLING SECTION */}
          {reservation && (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
              {/* ORDER STATUS (FUDO POS FLOW) */}
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" /> Estado del Pedido
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Al marcar como <b>Servido</b> se descuentan los insumos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "pendiente", label: "Pendiente", bg: "bg-slate-800 text-slate-300" },
                    {
                      id: "en_preparacion",
                      label: "En Cocina",
                      bg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                    },
                    {
                      id: "servido",
                      label: "🍽 Servido (Stock)",
                      bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                    },
                    {
                      id: "pagado",
                      label: "Pagado",
                      bg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isDeductingStock}
                      onClick={() => handleOrderStatusChange(st.id as OrderStatus)}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-center text-xs font-bold transition-all",
                        orderStatus === st.id
                          ? `${st.bg} border-indigo-400 shadow-md ring-1 ring-indigo-400/50`
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Stock deduction feedback */}
                {stockFeedback && (
                  <div
                    className={cn(
                      "animate-in fade-in flex items-start gap-2 rounded-lg p-2.5 text-xs",
                      stockFeedback.type === "success"
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : stockFeedback.type === "warning"
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                    )}
                  >
                    {stockFeedback.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    )}
                    <p className="leading-snug">{stockFeedback.message}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Utensils className="h-4 w-4 text-indigo-400" /> Platos & Consumo ({items.length})
                </h3>

                <button
                  onClick={() => setIsPDFMenuModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 to-violet-600/30 px-3.5 py-1.5 text-xs font-bold text-indigo-200 shadow-md shadow-indigo-600/10 transition-all hover:border-indigo-400 hover:from-indigo-600/40 hover:to-violet-600/40 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Agregar Plato</span>
                </button>
              </div>

              {/* Items List */}
              {items.length > 0 ? (
                <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800/80 text-xs">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 bg-slate-900/50 p-3 transition-colors hover:bg-slate-900"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 uppercase">
                            {item.category}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="mt-0.5 text-[11px] text-amber-300/80">Nota: {item.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">x{item.quantity}</span>
                        <span className="w-24 text-right font-bold text-white">
                          {formatCLP(item.unitPrice * item.quantity)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Total calculation */}
                  <div className="flex items-center justify-between bg-slate-950 p-3.5 text-sm font-bold text-white">
                    <span>Total del Pedido:</span>
                    <span className="text-base text-emerald-400">
                      {formatCLP(calculateTotal(items))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-900/40 p-4 text-center text-xs text-slate-400">
                  No hay ítems registrados en el pedido. Usa &quot;Agregar Plato&quot; para incluir
                  consumo.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 p-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {/* Botón de cobro - visible para admin y cajero */}
            {(restaurantRole === "admin" || restaurantRole === "cajero") && items.length > 0 && (
              <button
                type="button"
                onClick={() => setIsTicketOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-900 shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400"
              >
                <Receipt className="h-4 w-4" /> Cobrar
              </button>
            )}

            <button
              onClick={() => {
                handleStatusChange(currentStatus);
                if (reservation) {
                  onSaveReservation({
                    ...reservation,
                    status: currentStatus,
                    orderStatus,
                    items,
                    totalAmount: calculateTotal(items),
                  });
                }
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
            >
              <Check className="h-4 w-4" /> Guardar
            </button>
          </div>
        </div>
      </div>

      {/* PDF Menu Picker Modal */}
      <PDFMenuModal
        isOpen={isPDFMenuModalOpen}
        onClose={() => setIsPDFMenuModalOpen(false)}
        tenantId={tenantId || ""}
        tableNumber={table.number}
        currentItems={items}
        onUpdateItems={handleUpdateItemsFromPDF}
      />

      {/* Ticket / Cobrar Modal */}
      <TicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        table={table}
        reservation={reservation}
        items={items}
        tenantName={tenantName || "Restaurante"}
        onConfirmPayment={(saleData) => {
          if (onCloseTableSale) {
            onCloseTableSale(table, saleData);
          } else {
            handleStatusChange("disponible");
            if (reservation) {
              onSaveReservation({
                ...reservation,
                status: "disponible",
                orderStatus: "pagado",
                items,
                totalAmount: calculateTotal(items),
              });
            }
          }
          setIsTicketOpen(false);
          onClose();
        }}
      />
    </div>
  );
};
