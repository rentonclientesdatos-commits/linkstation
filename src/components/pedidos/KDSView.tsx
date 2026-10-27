"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Table, Reservation, DeliveryOrder, OrderItem, OrderStatus, Zone } from "@/types/pedidos";
import {
  Flame,
  Utensils,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Wine,
  Salad,
  ChefHat,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Sparkles,
  Phone,
  MessageSquare,
  Bike,
  Users,
  Eye,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface KDSViewProps {
  tenantId?: string;
  tenantName?: string;
  onExitKDS?: () => void;
}

export type StationType = "todas" | "caliente" | "fria" | "bar";
export type KDSFilterStatus = "activas" | "listas" | "todas";

export interface KDSTicket {
  id: string;
  ticketNumber: string;
  type: "mesa" | "delivery" | "manual";
  title: string;
  subtitle?: string;
  customerName: string;
  phone?: string;
  guestsCount?: number;
  createdAt: string;
  orderStatus: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  tableId?: string;
  tableNumber?: number;
  zone?: string;
  source: "whatsapp" | "voice" | "web" | "manual";
}

/**
 * Native Web Audio API synthesizer chime (double ping 880Hz -> 1174Hz)
 * Works 100% offline without external audio files.
 */
function playKitchenChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    // First tone (A5 - 880Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone (D6 - 1174Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn("[KDS] Audio notification not allowed by browser autoplay policy:", e);
  }
}

export const KDSView: React.FC<KDSViewProps> = ({
  tenantId = "",
  tenantName = "Restaurante",
  onExitKDS,
}) => {
  // State
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Record<string, Reservation>>({});
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filters
  const [stationFilter, setStationFilter] = useState<StationType>("todas");
  const [statusFilter, setStatusFilter] = useState<KDSFilterStatus>("activas");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("linkstation_kds_sound") !== "false";
    }
    return true;
  });

  // Track checked items per ticket: { `${ticketId}_${itemId}`: true }
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Previous pending ticket IDs to detect new orders and chime
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save sound setting
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("linkstation_kds_sound", soundEnabled ? "true" : "false");
    }
  }, [soundEnabled]);

  // Fetch state from server
  const loadKDSData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/restaurant/state?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tables) setTables(data.tables);
        if (data.reservations) setReservations(data.reservations);
        if (data.orders) setOrders(data.orders);
        if (data.zones) setZones(data.zones);
      }
    } catch (e) {
      console.warn("[KDS] Error loading data:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [tenantId]);

  // Polling every 7 seconds
  useEffect(() => {
    loadKDSData();
    const interval = setInterval(loadKDSData, 7000);
    return () => clearInterval(interval);
  }, [loadKDSData]);

  // Convert reservations and delivery orders into unified KDSTickets
  const allTickets: KDSTicket[] = useMemo(() => {
    const tickets: KDSTicket[] = [];

    // 1. From Tables with active reservations and items
    tables.forEach((table) => {
      if (table.currentReservationId && reservations[table.currentReservationId]) {
        const res = reservations[table.currentReservationId];
        // Only tickets with items and in active or recently served states
        if (res.items && res.items.length > 0) {
          tickets.push({
            id: res.id,
            ticketNumber: res.id.replace(/\D/g, "").slice(-4) || `${table.number}`,
            type: "mesa",
            title: `Mesa ${table.number}`,
            subtitle: table.name !== `Mesa ${table.number}` ? table.name : undefined,
            customerName: res.customer?.name || "Comensal",
            phone: res.customer?.phone,
            guestsCount: res.guestsCount || table.capacity,
            createdAt: res.dateTime || new Date().toISOString(),
            orderStatus: res.orderStatus || "pendiente",
            items: res.items,
            totalAmount: res.totalAmount || 0,
            notes: res.iaSummary?.specialRequests || res.customer?.notes,
            tableId: table.id,
            tableNumber: table.number,
            zone: table.zone,
            source: res.createdVia || "manual",
          });
        }
      }
    });

    // 2. From Delivery orders
    orders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        tickets.push({
          id: order.id,
          ticketNumber: order.id.replace(/\D/g, "").slice(-4) || "DELV",
          type: "delivery",
          title: `Delivery #${order.id.slice(-4)}`,
          subtitle: order.customer.address,
          customerName: order.customer.name,
          phone: order.customer.phone,
          createdAt: order.createdAt || new Date().toISOString(),
          orderStatus: order.status || "pendiente",
          items: order.items,
          totalAmount: order.totalAmount || 0,
          notes: order.notes,
          source: order.source || "whatsapp",
        });
      }
    });

    // Sort: Pendiente first, then En Preparación, then Servido.
    // Within same status, oldest first (FIFO - First In, First Out)
    const statusWeight: Record<OrderStatus, number> = {
      pendiente: 1,
      en_preparacion: 2,
      servido: 3,
      pagado: 4,
    };

    return tickets.sort((a, b) => {
      const weightA = statusWeight[a.orderStatus] || 99;
      const weightB = statusWeight[b.orderStatus] || 99;
      if (weightA !== weightB) return weightA - weightB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [tables, reservations, orders]);

  // Audio chime effect on new pending orders
  useEffect(() => {
    const currentPendingIds = new Set(
      allTickets.filter((t) => t.orderStatus === "pendiente").map((t) => t.id)
    );

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      prevPendingIdsRef.current = currentPendingIds;
      return;
    }

    // Check if there is any new pending ticket not in previous set
    let hasNewTicket = false;
    currentPendingIds.forEach((id) => {
      if (!prevPendingIdsRef.current.has(id)) {
        hasNewTicket = true;
      }
    });

    if (hasNewTicket && soundEnabled) {
      playKitchenChime();
    }

    prevPendingIdsRef.current = currentPendingIds;
  }, [allTickets, soundEnabled]);

  // Helper to test if item matches station
  const itemMatchesStation = (item: OrderItem, station: StationType): boolean => {
    if (station === "todas") return true;
    if (station === "bar") {
      return (
        item.category === "bebida" ||
        item.name.toLowerCase().includes("trago") ||
        item.name.toLowerCase().includes("cerveza") ||
        item.name.toLowerCase().includes("vino") ||
        item.name.toLowerCase().includes("jugo") ||
        item.name.toLowerCase().includes("cocktail") ||
        item.name.toLowerCase().includes("pisco")
      );
    }
    if (station === "fria") {
      return (
        item.category === "postre" ||
        item.name.toLowerCase().includes("ensalada") ||
        item.name.toLowerCase().includes("ceviche") ||
        item.name.toLowerCase().includes("carpaccio") ||
        item.name.toLowerCase().includes("helado") ||
        item.name.toLowerCase().includes("torta")
      );
    }
    if (station === "caliente") {
      return item.category === "principal" || item.category === "entrante" || item.category === "especial";
    }
    return true;
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      // 1. Status filter
      if (statusFilter === "activas") {
        if (ticket.orderStatus === "pagado") return false;
      } else if (statusFilter === "listas") {
        if (ticket.orderStatus !== "servido") return false;
      }

      // 2. Station filter
      if (stationFilter !== "todas") {
        const hasStationItem = ticket.items.some((i) => itemMatchesStation(i, stationFilter));
        if (!hasStationItem) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = ticket.title.toLowerCase().includes(q);
        const matchesCustomer = ticket.customerName.toLowerCase().includes(q);
        const matchesItems = ticket.items.some((i) => i.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCustomer && !matchesItems) return false;
      }

      return true;
    });
  }, [allTickets, statusFilter, stationFilter, searchQuery]);

  // KPI counts
  const pendingCount = allTickets.filter((t) => t.orderStatus === "pendiente").length;
  const preparingCount = allTickets.filter((t) => t.orderStatus === "en_preparacion").length;
  const readyCount = allTickets.filter((t) => t.orderStatus === "servido").length;

  // Persist updated status to backend
  const updateTicketStatus = async (ticket: KDSTicket, nextStatus: OrderStatus) => {
    try {
      if (ticket.type === "mesa" && ticket.tableId) {
        // Update reservation orderStatus
        const updatedReservations = { ...reservations };
        if (reservations[ticket.id]) {
          updatedReservations[ticket.id] = {
            ...reservations[ticket.id],
            orderStatus: nextStatus,
          };
          setReservations(updatedReservations);
        }

        // Persist to server
        await fetch("/api/restaurant/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            state: {
              tables,
              reservations: updatedReservations,
              orders,
              zones,
            },
          }),
        });
      } else if (ticket.type === "delivery") {
        // Update delivery order status
        const updatedOrders = orders.map((o) =>
          o.id === ticket.id ? { ...o, status: nextStatus } : o
        );
        setOrders(updatedOrders);

        // Persist to server
        await fetch("/api/restaurant/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            state: {
              tables,
              reservations,
              orders: updatedOrders,
              zones,
            },
          }),
        });
      }
    } catch (e) {
      console.error("[KDS] Error updating status:", e);
    }
  };

  // Toggle item strike
  const toggleItemCheck = (ticketId: string, itemId: string) => {
    const key = `${ticketId}_${itemId}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Elapsed time helper
  const getElapsedMinutes = (dateStr: string): number => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch {
      return 0;
    }
  };

  const formatElapsedTimer = (dateStr: string): string => {
    try {
      const totalSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    } catch {
      return "0:00";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] font-sans text-slate-100 select-none">
      {/* ── TOP CONTROL BAR ── */}
      <header className="sticky top-0 z-40 border-b border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.85)] px-4 py-3 shadow-2xl backdrop-blur-2xl">
        {/* Top subtle glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.35)] to-transparent" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Branding & Role */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,45,85,0.4)] bg-gradient-to-tr from-rose-600 to-amber-500 shadow-[0_0_15px_rgba(255,45,85,0.35)]">
              <Flame className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white uppercase">
                  Pantalla de Cocina & Bar (KDS)
                </h1>
                <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-400 shadow-[0_0_10px_rgba(255,45,85,0.2)]">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {tenantName} • Despacho de comandas en tiempo real
              </p>
            </div>
          </div>

          {/* Center: Station Selector Tabs */}
          <div className="flex items-center rounded-2xl border border-[rgba(0,229,255,0.08)] bg-[rgba(10,15,30,0.8)] p-1 text-xs shadow-inner">
            <button
              onClick={() => setStationFilter("todas")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                stationFilter === "todas"
                  ? "bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-[#000d14] font-black shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <ChefHat className="h-4 w-4" />
              <span>Todas las Estaciones</span>
            </button>
            <button
              onClick={() => setStationFilter("caliente")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                stationFilter === "caliente"
                  ? "border border-rose-500/50 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(255,45,85,0.3)]"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Flame className="h-4 w-4 text-amber-400" />
              <span>Cocina Caliente</span>
            </button>
            <button
              onClick={() => setStationFilter("fria")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                stationFilter === "fria"
                  ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Salad className="h-4 w-4 text-emerald-400" />
              <span>Cocina Fría & Postres</span>
            </button>
            <button
              onClick={() => setStationFilter("bar")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                stationFilter === "bar"
                  ? "border border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Wine className="h-4 w-4 text-indigo-400" />
              <span>Bar & Tragos</span>
            </button>
          </div>

          {/* Right: Sound, Clock, Fullscreen & Exit */}
          <div className="flex items-center gap-2">
            {/* Live Clock */}
            <div className="flex items-center gap-2 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-3 py-1.5 font-mono text-sm font-black text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>{currentTime}</span>
              {isSyncing && (
                <RefreshCw className="h-3 w-3 animate-spin text-[#00e5ff] ml-1" />
              )}
            </div>

            {/* Sound notification toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playKitchenChime();
              }}
              title={soundEnabled ? "Campana de aviso activada (clic para silenciar)" : "Sonido silenciado"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95",
                soundEnabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/10 hover:bg-emerald-500/20"
                  : "border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300"
              )}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Pantalla completa"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition-all active:scale-95"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Exit to Pedidos or Admin */}
            {onExitKDS ? (
              <button
                type="button"
                onClick={onExitKDS}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Salir</span>
              </button>
            ) : (
              <Link
                href="/dashboard/pedidos"
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Plano Mesas</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── SUBSTRIP: STATUS FILTER & METRICS COUNTER ── */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5 text-xs">
          {/* Counters & Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("activas")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 font-bold transition-all",
                statusFilter === "activas"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>Por Preparar</span>
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-black text-rose-300 border border-rose-500/30">
                {pendingCount + preparingCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("listas")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 font-bold transition-all",
                statusFilter === "listas"
                  ? "bg-emerald-600/30 text-emerald-200 shadow-md border border-emerald-500/40"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>Listas para Servir</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-black text-emerald-300 border border-emerald-500/30">
                {readyCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("todas")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-all",
                statusFilter === "todas"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span>Todas ({allTickets.length})</span>
            </button>
          </div>

          {/* Search box & Test Sound button */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar plato, mesa o cliente..."
                className="h-8 w-52 rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={playKitchenChime}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Probar sonido de campana de cocina"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Timbre</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── KDS TICKETS GRID (MAIN STAGE) ── */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {filteredTickets.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center animate-in fade-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-600 mb-4">
              <ChefHat className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-lg font-black text-white">Cocina al día • Sin comandas pendientes</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Cuando un mesero abra una comanda o entre un pedido por WhatsApp, aparecerá aquí al instante con alerta sonora.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={loadKDSData}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin text-rose-400")} />
                <span>Actualizar Ahora</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 animate-in fade-in">
            {filteredTickets.map((ticket) => {
              const elapsedMins = getElapsedMinutes(ticket.createdAt);
              const timerStr = formatElapsedTimer(ticket.createdAt);

              // Urgency calculation:
              // < 10 mins: green / ok
              // 10-20 mins: warning / amber
              // > 20 mins: critical / red blinking
              const isUrgent = elapsedMins >= 20;
              const isWarning = elapsedMins >= 10 && elapsedMins < 20;

              // Filter ticket items by station if active
              const displayItems = ticket.items.filter((i) =>
                itemMatchesStation(i, stationFilter)
              );

              // All items checked?
              const allChecked =
                displayItems.length > 0 &&
                displayItems.every((item) => checkedItems[`${ticket.id}_${item.id}`]);

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    "flex flex-col justify-between rounded-[22px] border transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-xl",
                    // Border color by urgency and status with futuristic neon glow
                    ticket.orderStatus === "servido"
                      ? "border-emerald-500/50 bg-[rgba(16,185,129,0.06)] shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : isUrgent
                      ? "border-red-500 bg-[rgba(255,45,85,0.12)] shadow-[0_0_24px_rgba(255,45,85,0.4)] ring-2 ring-red-500/60 animate-pulse"
                      : isWarning
                      ? "border-amber-400/80 bg-[rgba(245,158,11,0.08)] shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                      : ticket.orderStatus === "en_preparacion"
                      ? "border-[#00e5ff]/80 bg-[rgba(0,229,255,0.08)] shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                      : "border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.7)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  )}
                >
                  {/* TICKET TOP HEADER */}
                  <div
                    className={cn(
                      "flex items-center justify-between border-b px-4 py-3 backdrop-blur-md",
                      ticket.orderStatus === "servido"
                        ? "border-emerald-500/30 bg-emerald-950/40"
                        : isUrgent
                        ? "border-red-500/40 bg-red-950/50"
                        : isWarning
                        ? "border-amber-500/30 bg-amber-950/40"
                        : ticket.orderStatus === "en_preparacion"
                        ? "border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.1)]"
                        : "border-[rgba(0,229,255,0.08)] bg-[rgba(4,8,20,0.85)]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#00e5ff] drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]">
                        #{ticket.ticketNumber}
                      </span>
                      <h3 className="text-base font-extrabold text-white">{ticket.title}</h3>
                      {ticket.type === "delivery" && (
                        <span className="flex items-center gap-1 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30 shadow-[0_0_8px_rgba(139,92,246,0.3)]">
                          <Bike className="h-3 w-3" /> Delivery
                        </span>
                      )}
                    </div>

                    {/* LIVE TIMER BADGE */}
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-mono font-black shadow-inner",
                        ticket.orderStatus === "servido"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : isUrgent
                          ? "bg-red-500 text-white animate-bounce"
                          : isWarning
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{timerStr}</span>
                    </div>
                  </div>

                  {/* METADATA STRIP (CUSTOMER / DINERS / CHANNEL) */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 px-4 py-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                      👤 {ticket.customerName}
                    </span>
                    <div className="flex items-center gap-2">
                      {ticket.guestsCount && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-500" />
                          {ticket.guestsCount}p
                        </span>
                      )}
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 capitalize">
                        {ticket.source}
                      </span>
                    </div>
                  </div>

                  {/* SPECIAL REQUESTS / ALLERGIES / NOTES */}
                  {ticket.notes && (
                    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-bold text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
                      <span className="leading-tight">{ticket.notes}</span>
                    </div>
                  )}

                  {/* ORDER ITEMS LIST (CHECKABLE) */}
                  <div className="flex-1 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Platos ({displayItems.length}):
                    </p>
                    <div className="space-y-1.5">
                      {displayItems.map((item) => {
                        const isChecked = !!checkedItems[`${ticket.id}_${item.id}`];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItemCheck(ticket.id, item.id)}
                            className={cn(
                              "w-full flex items-start justify-between rounded-xl p-2 text-left transition-all border",
                              isChecked
                                ? "border-slate-800/60 bg-slate-950/40 opacity-50 line-through text-slate-500"
                                : "border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-100"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black",
                                  isChecked
                                    ? "bg-slate-800 text-slate-500"
                                    : "bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30"
                                )}
                              >
                                {item.quantity}×
                              </span>
                              <div>
                                <span className="text-xs font-bold block leading-snug">
                                  {item.name}
                                </span>
                                {item.notes && (
                                  <span className="block text-[10px] font-medium text-amber-400/90 italic">
                                    Nota: {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "h-4 w-4 shrink-0 rounded-md border flex items-center justify-center mt-0.5",
                                isChecked
                                  ? "border-emerald-500 bg-emerald-500 text-slate-950"
                                  : "border-slate-700 bg-slate-800"
                              )}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="border-t border-slate-800/80 bg-slate-950/70 p-3 space-y-2">
                    {/* Status badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Estado:</span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-bold uppercase text-[10px]",
                          ticket.orderStatus === "pendiente" && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                          ticket.orderStatus === "en_preparacion" && "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
                          ticket.orderStatus === "servido" && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        )}
                      >
                        {ticket.orderStatus === "pendiente" && "Pendiente"}
                        {ticket.orderStatus === "en_preparacion" && "Preparando"}
                        {ticket.orderStatus === "servido" && "¡Listo para Servir!"}
                      </span>
                    </div>

                    {/* Action Flow */}
                    {ticket.orderStatus === "pendiente" && (
                      <button
                        type="button"
                        onClick={() => updateTicketStatus(ticket, "en_preparacion")}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/20 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        <Flame className="h-4 w-4 text-white" />
                        <span>Empezar a Preparar</span>
                      </button>
                    )}

                    {ticket.orderStatus === "en_preparacion" && (
                      <button
                        type="button"
                        onClick={() => updateTicketStatus(ticket, "servido")}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4 text-white" />
                        <span>{allChecked ? "¡Todo Listo! Marcar Servido" : "Marcar como Listo"}</span>
                      </button>
                    )}

                    {ticket.orderStatus === "servido" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateTicketStatus(ticket, "en_preparacion")}
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-[11px] font-bold text-slate-300 hover:text-white"
                          title="Volver a poner en preparación si hubo algún cambio"
                        >
                          ← Reabrir
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTicketStatus(ticket, "pagado")}
                          className="flex-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 px-3 text-[11px] font-bold text-emerald-400"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Despachado</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
