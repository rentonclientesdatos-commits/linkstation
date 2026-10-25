"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Reservation,
  TableStatus,
  OrderStatus,
  OrderItem,
  MenuProduct,
} from "@/types/pedidos";
import { formatCLP } from "@/lib/mock-pedidos-data";
import { TicketModal, PaymentConfirmationData } from "./TicketModal";
import {
  X,
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Check,
  Clock,
  Utensils,
  Receipt,
  MessageSquare,
  AlertCircle,
  Edit3,
  Flame,
  Coffee,
  Wine,
  Cake,
  Users,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MeseroOrderSheetProps {
  isOpen: boolean;
  table: Table | null;
  reservation: Reservation | null;
  tenantId?: string | null;
  tenantName?: string;
  /** Fuerza el tab inicial al abrir. Si no se pasa, se decide automáticamente según los items existentes. */
  initialTab?: "menu" | "comanda";
  onClose: () => void;
  onSaveOrder: (
    updatedRes: Reservation,
    newTableStatus: TableStatus,
    newOrderStatus: OrderStatus
  ) => void;
  onUpdateTableStatus: (tableId: string, status: TableStatus) => void;
  onCloseTableSale?: (table: Table, saleData: PaymentConfirmationData) => void;
}

const DEFAULT_PRESET_MENU = [
  { id: "p1", name: "Empanadas de Pino (3 un)", category: "entrante", price: 7500, description: "Carne picada al cuchillo, cebolla y aceituna" },
  { id: "p2", name: "Ensalada Burrata", category: "entrante", price: 14500, description: "Tomates reliquia, pesto y reducción balsámica" },
  { id: "p3", name: "Tabla de Ibéricos", category: "entrante", price: 22000, description: "Jamón de bellota, queso manchego y pan con tomate" },
  { id: "p4", name: "Ceviche Mixto", category: "entrante", price: 16500, description: "Pesca del día, camarones, leche de tigre y camote" },
  { id: "p5", name: "Solomillo de Ternera", category: "principal", price: 24000, description: "Corte premium con papas rústicas al romero" },
  { id: "p6", name: "Paella de Marisco", category: "principal", price: 32000, description: "Arroz bomba, camarones, calamares y azafrán" },
  { id: "p7", name: "Hamburguesa Gourmet", category: "principal", price: 13900, description: "Doble carne angus, queso cheddar y tocino crocante" },
  { id: "p8", name: "Pastel de Choclo", category: "principal", price: 12500, description: "Tradicional receta chilena con pino y pollo" },
  { id: "p9", name: "Chuletón Madurado", category: "principal", price: 58000, description: "800g madurado 45 días con guarnición" },
  { id: "p10", name: "Pisco Sour Catedral", category: "bebida", price: 8900, description: "Pisco chileno 40°, limón de pica y amargo de angostura" },
  { id: "p11", name: "Vino Reserva Especial", category: "bebida", price: 21000, description: "Cabernet Sauvignon del Valle del Maipo" },
  { id: "p12", name: "Cerveza Artesanal Schop (500cc)", category: "bebida", price: 5500, description: "Variedades IPA, Golden o Stout" },
  { id: "p13", name: "Bebida / Agua Mineral", category: "bebida", price: 3200, description: "Variedad de gaseosas y aguas" },
  { id: "p14", name: "Jarra de Sangría (1.5L)", category: "bebida", price: 16000, description: "Vino tinto, frutas de estación y licor de naranja" },
  { id: "p15", name: "Tarta de Queso Vasca", category: "postre", price: 7500, description: "Horneada al estilo San Sebastián con frutos rojos" },
  { id: "p16", name: "Volcán de Chocolate", category: "postre", price: 8200, description: "Relleno tibio con helado de vainilla artesanal" },
  { id: "p17", name: "Café Espresso Doble", category: "bebida", price: 3500, description: "Café de grano recién molido" },
];

const PRESET_NOTES = [
  "Sin cebolla",
  "Término medio",
  "Bien cocido",
  "Poco hecho",
  "Hielo aparte",
  "Para compartir",
  "Sin sal añadida",
  "Alergia a mariscos",
  "Salsa aparte",
  "Sin picante",
];

export const MeseroOrderSheet: React.FC<MeseroOrderSheetProps> = ({
  isOpen,
  table,
  reservation,
  tenantId,
  tenantName = "Restaurante",
  initialTab,
  onClose,
  onSaveOrder,
  onUpdateTableStatus,
  onCloseTableSale,
}) => {
  const [activeTab, setActiveTab] = useState<"menu" | "comanda">("menu");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [liveMenu, setLiveMenu] = useState<Array<{
    id: string;
    name: string;
    category: OrderItem["category"];
    price: number;
    description?: string;
  }>>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(false);

  // Order state
  const [items, setItems] = useState<OrderItem[]>([]);
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [customerName, setCustomerName] = useState<string>("");
  const [meseroName, setMeseroName] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pendiente");

  // Note dialog state
  const [editingNoteItem, setEditingNoteItem] = useState<OrderItem | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState<string>("");

  // Ticket modal
  const [isTicketOpen, setIsTicketOpen] = useState<boolean>(false);

  // Success toast
  const [showToast, setShowToast] = useState<string | null>(null);

  // Initialize order state when table or reservation changes
  useEffect(() => {
    if (!table) return;

    if (reservation) {
      setItems(reservation.items || []);
      setGuestsCount(reservation.guestsCount || table.capacity || 2);
      setCustomerName(reservation.customer?.name || "");
      setMeseroName((reservation as any).meseroName || "");
      setOrderStatus(reservation.orderStatus || "pendiente");
    } else {
      setItems([]);
      setGuestsCount(table.capacity || 2);
      setCustomerName("");
      setMeseroName("");
      setOrderStatus("pendiente");
    }

    // Determine which tab to show:
    // 1. If caller forced a tab (auto-apertura inteligente), respect it.
    // 2. Otherwise fall back to: comanda if items exist, menu otherwise.
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      const hasItems = (reservation?.items || []).length > 0;
      setActiveTab(hasItems ? "comanda" : "menu");
    }

    setSearchQuery("");
    setSelectedCategory("all");
  }, [table, reservation, isOpen, initialTab]);

  // Fetch live menu from API or fallback
  useEffect(() => {
    if (!isOpen || !tenantId) {
      setLiveMenu(DEFAULT_PRESET_MENU as any);
      return;
    }

    let isMounted = true;
    setIsLoadingMenu(true);

    fetch(`/api/restaurant/menu?tenantId=${tenantId}&isActive=true`)
      .then((res) => res.json())
      .then((data: { data?: MenuProduct[] }) => {
        if (!isMounted) return;
        if (data.data && data.data.length > 0) {
          const mapped = data.data.map((p) => ({
            id: p.id,
            name: p.name,
            category: (p.category as OrderItem["category"]) || "principal",
            price: p.price,
            description: p.description,
          }));
          setLiveMenu(mapped);
        } else {
          // If no inventory menu products, check knowledge-menus
          fetch(`/api/restaurant/knowledge-menus?tenantId=${tenantId}`)
            .then((r) => r.json())
            .then((kData) => {
              if (!isMounted) return;
              const allKItems: any[] = [];
              if (kData.documents && Array.isArray(kData.documents)) {
                for (const doc of kData.documents) {
                  if (doc.items && Array.isArray(doc.items)) {
                    allKItems.push(...doc.items);
                  }
                }
              }
              if (allKItems.length > 0) {
                setLiveMenu(allKItems);
              } else {
                setLiveMenu(DEFAULT_PRESET_MENU as any);
              }
            })
            .catch(() => {
              if (isMounted) setLiveMenu(DEFAULT_PRESET_MENU as any);
            });
        }
      })
      .catch(() => {
        if (isMounted) setLiveMenu(DEFAULT_PRESET_MENU as any);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMenu(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId]);

  if (!isOpen || !table) return null;

  // Filtered menu products
  const filteredProducts = useMemo(() => {
    return liveMenu.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === "all" || product.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [liveMenu, searchQuery, selectedCategory]);

  // Item counts & subtotal
  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalAmount = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  // Map of item name -> quantity
  const itemQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const oi of items) {
      map[oi.name.toLowerCase().trim()] = (map[oi.name.toLowerCase().trim()] || 0) + oi.quantity;
    }
    return map;
  }, [items]);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
  };

  // Add product to comanda
  const handleAddProduct = (product: {
    id: string;
    name: string;
    category: OrderItem["category"];
    price?: number;
    unitPrice?: number;
  }) => {
    triggerHaptic();
    const cleanName = product.name.trim();
    const itemPrice = product.price ?? product.unitPrice ?? 0;
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
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        category: product.category,
        quantity: 1,
        unitPrice: itemPrice,
      };
      updated = [...items, newItem];
    }
    setItems(updated);
  };

  // Decrement quantity or remove
  const handleRemoveProduct = (productName: string) => {
    triggerHaptic();
    const cleanName = productName.trim().toLowerCase();
    const existingIndex = items.findIndex(
      (i) => i.name.toLowerCase().trim() === cleanName
    );

    if (existingIndex < 0) return;

    let updated: OrderItem[];
    if (items[existingIndex].quantity > 1) {
      updated = items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity - 1 } : item
      );
    } else {
      updated = items.filter((_, idx) => idx !== existingIndex);
    }
    setItems(updated);
  };

  // Completely delete item from order
  const handleDeleteItem = (itemId: string) => {
    triggerHaptic();
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Open note modal for an item
  const handleOpenNote = (item: OrderItem) => {
    setEditingNoteItem(item);
    setCurrentNoteText(item.notes || "");
  };

  const handleSaveNote = () => {
    if (!editingNoteItem) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingNoteItem.id ? { ...i, notes: currentNoteText.trim() } : i
      )
    );
    setEditingNoteItem(null);
    setCurrentNoteText("");
  };

  // Submit order to kitchen
  const handleSendOrderToKitchen = () => {
    if (items.length === 0) {
      alert("Por favor agrega al menos un plato o bebida a la comanda.");
      return;
    }

    triggerHaptic();

    const reservationId =
      reservation?.id || `res-${Math.floor(100000 + Math.random() * 900000)}`;

    // Preserve the selected status if it is servido or pagado; otherwise mark as en_preparacion
    const newOrderStatus: OrderStatus =
      orderStatus === "servido" || orderStatus === "pagado"
        ? orderStatus
        : "en_preparacion";

    const updatedRes: Reservation = {
      id: reservationId,
      tableId: table.id,
      tableNumber: table.number,
      customer: {
        name: customerName || `Mesa ${table.number}`,
        phone: reservation?.customer?.phone || "",
      },
      dateTime: reservation?.dateTime || new Date().toISOString(),
      guestsCount: guestsCount,
      status: "ocupada",
      orderStatus: newOrderStatus,
      iaSummary: {
        channel: "manual",
        summary: `Comanda de ${items.length} ítems por ${meseroName || "mesero"} en Mesa ${table.number}`,
        keyTopics: ["Comanda Móvil", "Mesero"],
        timestamp: new Date().toISOString(),
        aiAgentName: meseroName || "Mesero",
        confidenceScore: 1,
        guestsCount: guestsCount,
      },
      items,
      totalAmount,
      createdVia: "manual",
      ...(meseroName ? { meseroName } : {}),
    } as Reservation & { meseroName?: string };

    onSaveOrder(updatedRes, "ocupada", newOrderStatus);
    setOrderStatus(newOrderStatus);

    const statusLabel =
      newOrderStatus === "servido"
        ? "marcada como servida"
        : newOrderStatus === "pagado"
        ? "marcada como pagada"
        : "enviada a cocina";
    setShowToast(`Mesa ${table.number} ${statusLabel} ✓`);
    setTimeout(() => {
      setShowToast(null);
      onClose();
    }, 1200);
  };

  // Release table (marcar como disponible)
  const handleReleaseTable = () => {
    if (
      !confirm(
        `¿Confirmas que deseas liberar la Mesa ${table.number}? Se marcará como disponible.`
      )
    )
      return;

    onUpdateTableStatus(table.id, "disponible");
    setShowToast(`Mesa ${table.number} liberada correctamente.`);
    setTimeout(() => {
      setShowToast(null);
      onClose();
    }, 1000);
  };

  // Quick category options
  const categories: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: "all", label: "Todas", icon: <Utensils className="h-3.5 w-3.5" /> },
    { id: "entrante", label: "Entradas", icon: <Flame className="h-3.5 w-3.5 text-amber-400" /> },
    { id: "principal", label: "Principales", icon: <Utensils className="h-3.5 w-3.5 text-rose-400" /> },
    { id: "bebida", label: "Bebidas & Bar", icon: <Wine className="h-3.5 w-3.5 text-blue-400" /> },
    { id: "postre", label: "Postres", icon: <Cake className="h-3.5 w-3.5 text-pink-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in slide-in-from-bottom-6 duration-200">
      {/* TOAST FEEDBACK */}
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/95 px-5 py-3 text-sm font-bold text-emerald-200 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{showToast}</span>
        </div>
      )}

      {/* TOP BAR / HEADER */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 active:scale-95 transition-all hover:bg-slate-700 hover:text-white"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white shadow-sm shadow-indigo-600/30">
                #{table.number}
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                {table.name}
              </h2>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 capitalize">
                {table.zone}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-slate-500" />
                {table.capacity} max
              </span>
              <span>•</span>
              <span
                className={cn(
                  "font-semibold",
                  table.status === "disponible"
                    ? "text-emerald-400"
                    : table.status === "ocupada"
                    ? "text-amber-400"
                    : "text-blue-400"
                )}
              >
                {table.status === "disponible"
                  ? "Mesa Libre"
                  : table.status === "ocupada"
                  ? "En Servicio"
                  : "Reservada"}
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={() => setIsTicketOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-200 active:scale-95 transition-all hover:bg-slate-700 hover:text-white"
            >
              <Receipt className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Pre-cuenta</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MESERO / CUSTOMER NAME FIELDS */}
      <div className="grid grid-cols-2 gap-2 border-b border-slate-800/70 bg-slate-900/60 px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Mesero</label>
          <input
            type="text"
            value={meseroName}
            onChange={(e) => setMeseroName(e.target.value)}
            placeholder="Nombre del mesero"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cliente</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* QUICK TABLE SETTINGS (GUESTS & STATUS BADGE) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 bg-slate-900/60 px-4 py-2 text-xs">
        {/* Comensales Stepper */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-400">Comensales:</span>
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            <button
              onClick={() => setGuestsCount((g) => Math.max(1, g - 1))}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-7 text-center font-bold text-white">
              {guestsCount}
            </span>
            <button
              onClick={() => setGuestsCount((g) => g + 1)}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Order Status Indicator / Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Estado:</span>
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_preparacion">En Cocina</option>
            <option value="servido">Servido</option>
            <option value="pagado">Pagado</option>
          </select>
        </div>
      </div>

      {/* MAIN VIEW TABS: CARTA vs COMANDA */}
      <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-950 p-1.5 text-xs font-bold">
        <button
          onClick={() => setActiveTab("menu")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all",
            activeTab === "menu"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Utensils className="h-4 w-4" />
          <span>Carta & Platos</span>
        </button>

        <button
          onClick={() => setActiveTab("comanda")}
          className={cn(
            "relative flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all",
            activeTab === "comanda"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Comanda Actual</span>
          {totalItemsCount > 0 && (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto pb-28">
        {activeTab === "menu" ? (
          <div className="p-4 space-y-4">
            {/* Nueva Mesa Banner — visible only when table is free */}
            {table?.status === "disponible" && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 to-slate-900/60 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
                  🍽️
                </span>
                <div>
                  <p className="text-xs font-black text-emerald-300">
                    Nueva comanda — Mesa {table.number}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Elige los platos y bebidas. La mesa se marcará como <span className="text-amber-300 font-semibold">ocupada</span> al enviar a cocina.
                  </p>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar plato, trago, postre..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 font-semibold transition-all active:scale-95",
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
                <Utensils className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">
                  No se encontraron productos
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Intenta buscar con otro término o selecciona otra categoría.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {filteredProducts.map((product) => {
                  const qty = itemQuantities[product.name.toLowerCase().trim()] || 0;
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all",
                        qty > 0
                          ? "border-indigo-500/50 bg-indigo-950/20 shadow-md"
                          : "border-slate-800/80 bg-slate-900/70 hover:border-slate-700"
                      )}
                    >
                      {/* Product Info */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white truncate">
                            {product.name}
                          </h4>
                        </div>
                        {product.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {product.description}
                          </p>
                        )}
                        <span className="mt-1 block text-sm font-black text-emerald-400">
                          {formatCLP(product.price)}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAddProduct(product)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 active:scale-90 transition-transform hover:bg-indigo-500"
                          aria-label={`Agregar ${product.name}`}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-slate-950 p-1">
                          <button
                            onClick={() => handleRemoveProduct(product.name)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-200 active:scale-90 transition-transform hover:bg-slate-700"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-7 text-center font-black text-sm text-indigo-300">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleAddProduct(product)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white active:scale-90 transition-transform hover:bg-indigo-500"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* COMANDA ACTUAL VIEW */
          <div className="p-4 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="text-base font-bold text-white">
                  La comanda está vacía
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Selecciona &quot;Carta & Platos&quot; para agregar productos al pedido.
                </p>
                <button
                  onClick={() => setActiveTab("menu")}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
                >
                  Ver Carta
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Productos en la Comanda ({items.length})
                  </span>
                  <button
                    onClick={() => setActiveTab("menu")}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar más
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  {items.map((item) => (
                    <div key={item.id} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-medium">
                            {formatCLP(item.unitPrice)} c/u
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                          <button
                            onClick={() => handleRemoveProduct(item.name)}
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center font-bold text-white text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleAddProduct(item)}
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Total per Item */}
                        <span className="w-20 text-right font-black text-sm text-emerald-400">
                          {formatCLP(item.unitPrice * item.quantity)}
                        </span>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 active:scale-95"
                          title="Eliminar de la comanda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Note display or add button */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        {item.notes ? (
                          <div
                            onClick={() => handleOpenNote(item)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300 hover:bg-amber-500/20"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span className="line-clamp-1">Nota: {item.notes}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenNote(item)}
                            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-300"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Agregar nota de preparación</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Totals Box */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Subtotal Neto (aprox):</span>
                    <span>{formatCLP(Math.round(totalAmount / 1.19))}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>IVA (19%):</span>
                    <span>{formatCLP(totalAmount - Math.round(totalAmount / 1.19))}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-base font-black text-white">
                    <span>Total Comanda:</span>
                    <span className="text-lg text-emerald-400">
                      {formatCLP(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Mesa ocupada controls */}
                {table.status === "ocupada" && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleReleaseTable}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 active:scale-95"
                    >
                      Liberar Mesa
                    </button>

                    <button
                      onClick={() => setIsTicketOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                    >
                      <Receipt className="h-4 w-4 text-emerald-400" />
                      <span>Ver Pre-cuenta</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STICKY BOTTOM COMMAND BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-900/95 p-3.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          {/* Summary Indicator */}
          <div
            onClick={() => setActiveTab("comanda")}
            className="cursor-pointer flex flex-col"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400">
                {totalItemsCount} {totalItemsCount === 1 ? "ítem" : "ítems"}
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold text-indigo-400">
                Mesa #{table.number}
              </span>
            </div>
            <span className="text-lg font-black text-emerald-400">
              {formatCLP(totalAmount)}
            </span>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleSendOrderToKitchen}
            disabled={items.length === 0}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 px-5 font-black text-sm shadow-xl active:scale-95 transition-all",
              items.length > 0
                ? orderStatus === "servido"
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-teal-600/30 hover:from-teal-500 hover:to-cyan-500"
                  : orderStatus === "pagado"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-600/30 hover:from-violet-500 hover:to-purple-500"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
            <span>
              {orderStatus === "servido"
                ? "Actualizar Pedido · Servido ✓"
                : orderStatus === "pagado"
                ? "Actualizar Pedido · Pagado ✓"
                : orderStatus === "en_preparacion"
                ? "Actualizar Pedido · A Cocina"
                : "Actualizar Pedido"}
            </span>
          </button>
        </div>
      </div>

      {/* NOTE EDIT MODAL / BOTTOM SHEET */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="font-bold text-sm text-white">
                Nota para {editingNoteItem.name}
              </h3>
              <button
                onClick={() => setEditingNoteItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_NOTES.map((note) => (
                <button
                  key={note}
                  onClick={() =>
                    setCurrentNoteText((prev) =>
                      prev ? `${prev}, ${note}` : note
                    )
                  }
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-500 hover:text-white"
                >
                  + {note}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={currentNoteText}
              onChange={(e) => setCurrentNoteText(e.target.value)}
              placeholder="Instrucciones especiales para cocina o barra (ej: término medio, sin cebolla)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingNoteItem(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRE-CUENTA / TICKET MODAL */}
      {isTicketOpen && (
        <TicketModal
          isOpen={isTicketOpen}
          onClose={() => setIsTicketOpen(false)}
          table={table}
          reservation={reservation}
          items={items}
          tenantName={tenantName}
          onConfirmPayment={(saleData) => {
            if (onCloseTableSale) {
              onCloseTableSale(table, saleData);
            } else {
              onUpdateTableStatus(table.id, "disponible");
              if (reservation) {
                onSaveOrder(
                  {
                    ...reservation,
                    status: "disponible",
                    orderStatus: "pagado",
                    items,
                    totalAmount: items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
                  },
                  "disponible",
                  "pagado"
                );
              }
            }
            setIsTicketOpen(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};
