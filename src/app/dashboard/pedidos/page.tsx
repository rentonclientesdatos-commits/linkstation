"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  INITIAL_TABLES,
  INITIAL_RESERVATIONS,
  INITIAL_ZONES,
  formatCLP,
} from "@/lib/mock-pedidos-data";
import { Table, Reservation, TableStatus, Zone, ClosedSale } from "@/types/pedidos";
import { TablesCanvas } from "@/components/pedidos/TablesCanvas";
import { TablesGrid } from "@/components/pedidos/TablesGrid";
import { TableDetailModal } from "@/components/pedidos/TableDetailModal";
import { OrderListTable } from "@/components/pedidos/OrderListTable";
import { SimulationModal } from "@/components/pedidos/SimulationModal";
import { EditTableModal } from "@/components/pedidos/EditTableModal";
import { ZoneManagerModal } from "@/components/pedidos/ZoneManagerModal";
import { InventoryPanel } from "@/components/pedidos/InventoryPanel";
import { MeseroView } from "@/components/pedidos/MeseroView";
import { CajaPanel } from "@/components/pedidos/CajaPanel";
import { CajeroView } from "@/components/pedidos/CajeroView";
import { KDSView } from "@/components/pedidos/KDSView";
import { PaymentConfirmationData } from "@/components/pedidos/TicketModal";

import { useTenantStore } from "@/store/tenant";
import {
  Utensils,
  UtensilsCrossed,
  LayoutGrid,
  Grid,
  List,
  Sparkles,
  Users,
  Clock,
  TrendingUp,
  Bot,
  Filter,
  Move,
  Plus,
  Layers,
  Check,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Wand2,
  Receipt,
  Banknote,
  CreditCard,
  DollarSign,
  Coins,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PedidosPage() {
  const { tenantId, tenantName, restaurantRole } = useTenantStore();
  const isAdmin = !restaurantRole || restaurantRole === "admin";
  const isMesero = restaurantRole === "mesero";
  const isCajero = restaurantRole === "cajero";
  const isCocina = restaurantRole === "cocina";
  const [forceMeseroView, setForceMeseroView] = useState<boolean>(false);
  const [forceCajeroView, setForceCajeroView] = useState<boolean>(false);
  const [forceKDSView, setForceKDSView] = useState<boolean>(false);
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [reservations, setReservations] =
    useState<Record<string, Reservation>>(INITIAL_RESERVATIONS);
  const [closedSales, setClosedSales] = useState<ClosedSale[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [selectedZone, setSelectedZone] = useState<string>(INITIAL_ZONES[0]?.id || "salon_principal");
  const [viewMode, setViewMode] = useState<"canvas" | "grid" | "list" | "inventory" | "caja">(
    restaurantRole === "cajero" ? "caja" : "canvas"
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Modals state
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null | undefined>(undefined); // undefined means modal closed
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState<boolean>(false);

  // Sincronización en vivo con el servidor / WhatsApp
  const loadRestaurantData = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/restaurant/state?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tables) setTables(data.tables);
        if (data.reservations) setReservations(data.reservations);
        if (data.closedSales) setClosedSales(data.closedSales);
        if (data.zones && data.zones.length > 0) {
          setZones(data.zones);
          setSelectedZone((prev) => {
            if (prev === "all" || !data.zones.some((z: Zone) => z.id === prev)) {
              return data.zones[0].id;
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.warn("[PedidosPage] Error loading state:", e);
    }
  }, [tenantId]);

  useEffect(() => {
    loadRestaurantData();
    const interval = setInterval(loadRestaurantData, 6000);
    return () => clearInterval(interval);
  }, [loadRestaurantData]);

  const persistServerState = async (
    updatedTables?: Table[],
    updatedReservations?: Record<string, Reservation>,
    updatedZones?: Zone[],
    updatedClosedSales?: ClosedSale[]
  ) => {
    if (!tenantId) return;
    setIsSyncing(true);
    try {
      await fetch(`/api/restaurant/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          state: {
            tables: updatedTables || tables,
            reservations: updatedReservations || reservations,
            zones: updatedZones || zones,
            closedSales: updatedClosedSales || closedSales,
          },
        }),
      });
    } catch (e) {
      console.error("[PedidosPage] Error persisting state:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Stats KPIs
  const totalTables = tables.length;
  const occupiedTablesList = tables.filter((t) => t.status === "ocupada");
  const occupiedTables = occupiedTablesList.length;
  const reservedTables = tables.filter((t) => t.status === "reservada").length;
  const occupancyPercentage =
    totalTables > 0 ? Math.round(((occupiedTables + reservedTables) / totalTables) * 100) : 0;

  // In-Service active billings (monto actualmente en consumo en mesas)
  const inServiceBillings = occupiedTablesList.reduce((sum, t) => {
    if (t.currentReservationId && reservations[t.currentReservationId]) {
      return sum + (reservations[t.currentReservationId].totalAmount || 0);
    }
    return sum;
  }, 0);

  // Closed Sales KPIs
  const totalClosedSalesCount = closedSales.length;
  const totalClosedAmount = closedSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalTips = closedSales.reduce((sum, s) => sum + s.tipAmount, 0);

  // Table Checkout & Close Sale (Cobrar y Cerrar Mesa)
  const handleCloseTableSale = (table: Table, saleData: PaymentConfirmationData) => {
    const consecutiveNumber = (closedSales.length + 1).toString().padStart(4, "0");
    const reservation = table.currentReservationId ? reservations[table.currentReservationId] : null;

    const newSale: ClosedSale = {
      id: `sale-${Date.now()}`,
      ticketNumber: consecutiveNumber,
      tableId: table.id,
      tableNumber: table.number,
      tableName: table.name,
      customerName: reservation?.customer?.name || `Mesa ${table.number}`,
      items: saleData.items,
      subtotal: saleData.subtotal,
      tipAmount: saleData.tipAmount,
      totalAmount: saleData.totalToPay,
      netAmount: saleData.netAmount,
      ivaAmount: saleData.ivaAmount,
      paymentMethod: saleData.paymentMethod,
      closedAt: new Date().toISOString(),
      closedBy: tenantName || "Cajero",
      zone: table.zone,
    };

    const updatedClosedSales = [newSale, ...closedSales];
    setClosedSales(updatedClosedSales);

    // 1. Mark table as disponible and clear reservation reference
    const updatedTables = tables.map((t) =>
      t.id === table.id
        ? {
            ...t,
            status: "disponible" as const,
            currentReservationId: undefined,
          }
        : t
    );
    setTables(updatedTables);

    // 2. Mark reservation as pagado & disponible
    let updatedReservations = { ...reservations };
    if (table.currentReservationId && reservations[table.currentReservationId]) {
      updatedReservations = {
        ...reservations,
        [table.currentReservationId]: {
          ...reservations[table.currentReservationId],
          status: "disponible" as const,
          orderStatus: "pagado" as const,
        },
      };
      setReservations(updatedReservations);
    }

    setActiveTable(null);
    persistServerState(updatedTables, updatedReservations, undefined, updatedClosedSales);
  };

  // Table Status update
  const handleUpdateStatus = (tableId: string, newStatus: TableStatus) => {
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: newStatus,
            currentReservationId: newStatus === "disponible" ? undefined : t.currentReservationId,
          }
        : t
    );
    setTables(updated);
    if (activeTable && activeTable.id === tableId) {
      setActiveTable((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              currentReservationId: newStatus === "disponible" ? undefined : prev.currentReservationId,
            }
          : null
      );
    }
    persistServerState(updated);
  };

  const handleSaveReservation = (updatedRes: Reservation) => {
    const updatedResMap = {
      ...reservations,
      [updatedRes.id]: updatedRes,
    };
    setReservations(updatedResMap);

    const updatedTables = tables.map((t) =>
      t.id === updatedRes.tableId
        ? {
            ...t,
            status: updatedRes.status,
            currentReservationId: updatedRes.status === "disponible" ? undefined : updatedRes.id,
          }
        : t
    );
    setTables(updatedTables);
    persistServerState(updatedTables, updatedResMap);
  };

  const handleSimulateReservation = (newRes: Reservation, targetTableId: string) => {
    const updatedRes = {
      ...reservations,
      [newRes.id]: newRes,
    };
    setReservations(updatedRes);

    const updatedTables = tables.map((t) =>
      t.id === targetTableId
        ? { ...t, status: "reservada" as const, currentReservationId: newRes.id }
        : t
    );
    setTables(updatedTables);
    persistServerState(updatedTables, updatedRes);
  };

  const handleResetToZero = async () => {
    if (
      !confirm(
        "¿Deseas reiniciar todas las mesas a 'Disponible' y vaciar las reservas para empezar desde cero?"
      )
    )
      return;
    const cleanTables = INITIAL_TABLES.map((t) => ({
      ...t,
      status: "disponible" as const,
      currentReservationId: undefined,
    }));
    setTables(cleanTables);
    setReservations({});
    await persistServerState(cleanTables, {});
  };

  // Table CRUD
  const handleSaveTableData = (tableData: Partial<Table>) => {
    if (!tableData.id) return;

    let updated: Table[];
    const exists = tables.some((t) => t.id === tableData.id);
    if (exists) {
      updated = tables.map((t) => (t.id === tableData.id ? ({ ...t, ...tableData } as Table) : t));
    } else {
      updated = [...tables, tableData as Table];
    }
    setTables(updated);
    persistServerState(updated);
  };

  const handleDeleteTable = (tableId: string) => {
    const updated = tables.filter((t) => t.id !== tableId);
    setTables(updated);
    persistServerState(updated);
  };

  const handleDuplicateTable = (sourceTable: Table) => {
    // Calcular siguiente número de mesa disponible
    const existingNumbers = tables.map((t) => t.number || 0);
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    // Generar nombre sugerido sin perder la convención
    const hasNumberedName = /mesa\s*\d+/i.test(sourceTable.name);
    const newName = hasNumberedName ? `Mesa ${nextNumber}` : `${sourceTable.name} (Copia)`;

    // Posición con desplazamiento limpio para que nunca quede encima de la otra
    let nextX = sourceTable.position.x + 16;
    let nextY = sourceTable.position.y;
    if (nextX > 88) {
      nextX = 12;
      nextY = Math.min(88, sourceTable.position.y + 18);
    }

    const duplicatedTable: Table = {
      id: `table-${Date.now()}`,
      name: newName,
      number: nextNumber,
      capacity: sourceTable.capacity,
      shape: sourceTable.shape,
      zone: sourceTable.zone,
      status: "disponible",
      position: {
        x: Math.min(92, Math.max(8, nextX)),
        y: Math.min(92, Math.max(8, nextY)),
      },
    };

    const updated = [...tables, duplicatedTable];
    setTables(updated);
    persistServerState(updated);
  };

  // Reorganizar mesas automáticamente en una cuadrícula simétrica sin colisiones
  const handleAutoArrangeTables = (targetZone: string = selectedZone) => {
    let updated = [...tables];

    if (targetZone === "all") {
      const activeZoneIds = zones.map((z) => z.id);
      const allZoneIds = Array.from(new Set([...activeZoneIds, ...tables.map((t) => t.zone)]));
      const validZones = allZoneIds.filter((zId) => updated.some((t) => t.zone === zId));

      const bandHeight = 88 / Math.max(1, validZones.length);

      validZones.forEach((zId, zIndex) => {
        const zTables = updated
          .filter((t) => t.zone === zId)
          .sort((a, b) => (a.number || 0) - (b.number || 0));

        if (zTables.length === 0) return;

        const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(zTables.length * 1.6))));
        const rows = Math.ceil(zTables.length / cols);

        const startY = 8 + zIndex * bandHeight;
        const availableHeight = bandHeight * 0.88;

        zTables.forEach((t, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const newX = Math.round(10 + (c + 0.5) * (80 / cols));
          const newY = Math.round(startY + (r + 0.5) * (availableHeight / Math.max(1, rows)));

          updated = updated.map((tbl) =>
            tbl.id === t.id ? { ...tbl, position: { x: newX, y: newY } } : tbl
          );
        });
      });
    } else {
      const zTables = updated
        .filter((t) => t.zone === targetZone)
        .sort((a, b) => (a.number || 0) - (b.number || 0));

      const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(zTables.length * 1.6))));
      const rows = Math.ceil(zTables.length / cols);

      zTables.forEach((t, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const newX = Math.round(10 + (c + 0.5) * (80 / cols));
        const newY = Math.round(12 + (r + 0.5) * (76 / Math.max(1, rows)));

        updated = updated.map((tbl) =>
          tbl.id === t.id ? { ...tbl, position: { x: newX, y: newY } } : tbl
        );
      });
    }

    setTables(updated);
    persistServerState(updated);
  };

  const handleUpdateTablePosition = (tableId: string, position: { x: number; y: number }) => {
    const updated = tables.map((t) => (t.id === tableId ? { ...t, position } : t));
    setTables(updated);
    persistServerState(updated);
  };

  const handleBatchCreateTables = (count: number, templateData: Partial<Table>) => {
    // Genera N mesas consecutivas con numeración automática
    const existingNumbers = tables.map((t) => t.number || 0);
    let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    const newTables: Table[] = [];
    for (let i = 0; i < count; i++) {
      // Calcula posición escalonada para que no se superpongan
      const col = i % 5;
      const row = Math.floor(i / 5);
      newTables.push({
        id: `table-${Date.now()}-${i}`,
        name: templateData.name
          ? count > 1
            ? `${templateData.name.replace(/\s*\d+$/, "")} ${nextNumber}`
            : templateData.name
          : `Mesa ${nextNumber}`,
        number: nextNumber,
        capacity: templateData.capacity || 4,
        shape: templateData.shape || "square",
        zone: templateData.zone || zones[0]?.id || "principal",
        status: "disponible",
        position: {
          x: Math.min(90, 10 + col * 18),
          y: Math.min(88, 15 + row * 25),
        },
      });
      nextNumber++;
    }

    const updated = [...tables, ...newTables];
    setTables(updated);
    persistServerState(updated);
  };

  // Zone CRUD
  const handleAddZone = (newZone: Zone) => {
    const updated = [...zones, newZone];
    setZones(updated);
    persistServerState(undefined, undefined, updated);
  };

  const handleDeleteZone = (zoneId: string) => {
    const updated = zones.filter((z) => z.id !== zoneId);
    setZones(updated);
    if (selectedZone === zoneId) setSelectedZone(updated[0]?.id || "salon_principal");
    persistServerState(undefined, undefined, updated);
  };

  const currentReservation = activeTable?.currentReservationId
    ? reservations[activeTable.currentReservationId] || null
    : null;

  // Si el rol es mesero o el admin/cajero activó la vista móvil de mesero
  if (isMesero || forceMeseroView) {
    return (
      <MeseroView
        tables={tables}
        reservations={reservations}
        zones={zones}
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
        onUpdateStatus={handleUpdateStatus}
        onSaveReservation={handleSaveReservation}
        onCloseTableSale={handleCloseTableSale}
        onExitMeseroView={isAdmin || isCajero ? () => setForceMeseroView(false) : undefined}
        tenantId={tenantId}
        tenantName={tenantName}
        isSyncing={isSyncing}
      />
    );
  }

  // Si el rol es cajero o el admin activó la vista de caja dedicada
  if (isCajero || forceCajeroView) {
    return (
      <>
        <CajeroView
          tables={tables}
          reservations={reservations}
          closedSales={closedSales}
          zones={zones}
          tenantName={tenantName}
          isSyncing={isSyncing}
          onOpenTableCheckout={(table) => setActiveTable(table)}
          onExitCajeroView={isAdmin ? () => setForceCajeroView(false) : undefined}
        />
        {/* Modal de cobro/checkout accesible desde la vista cajero */}
        {activeTable && (
          <TableDetailModal
            table={activeTable}
            reservation={currentReservation}
            onClose={() => setActiveTable(null)}
            onUpdateStatus={handleUpdateStatus}
            onSaveReservation={handleSaveReservation}
            onCloseTableSale={handleCloseTableSale}
          />
        )}
      </>
    );
  }

  // Si el rol es cocina o el admin activó la pantalla KDS dedicada
  if (isCocina || forceKDSView) {
    return (
      <KDSView
        tenantId={tenantId || "default-tenant"}
        tenantName={tenantName}
        onExitKDS={isAdmin ? () => setForceKDSView(false) : undefined}
      />
    );
  }


  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      {/* HEADER TITLE & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-400">
              <Utensils className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Gestión de Pedidos & Plano de Mesas
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Diseño interactivo del local (restaurante, pub, bar) con reservas automatizadas vía IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Mobile Waiter View for testing & phone users */}
          <button
            onClick={() => setForceMeseroView(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5 text-xs font-bold text-indigo-300 shadow-lg transition-all hover:bg-indigo-500/20 active:scale-95"
            title="Abrir la interfaz táctil mobile-first para meseros"
          >
            <Smartphone className="h-4 w-4 text-indigo-400" />
            <span>Vista Mesero Móvil</span>
          </button>

          {/* Quick Cajero View */}
          {isAdmin && (
            <>
              <button
                onClick={() => setForceCajeroView(true)}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-bold text-emerald-300 shadow-lg transition-all hover:bg-emerald-500/20 active:scale-95"
                title="Abrir la vista de caja dedicada para cajero"
              >
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Vista Caja</span>
              </button>

              <button
                onClick={() => setForceKDSView(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-300 shadow-lg transition-all hover:bg-rose-500/20 active:scale-95"
                title="Abrir la pantalla de preparación de cocina y bar (KDS)"
              >
                <Flame className="h-4 w-4 text-rose-400" />
                <span>Pantalla Cocina</span>
              </button>
            </>
          )}

          {/* Layout Edit Toggle Button - solo admin */}
          {isAdmin && (
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-lg transition-all",
              isEditMode
                ? "border-amber-400 bg-amber-500 text-slate-950 shadow-amber-500/20"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {isEditMode ? (
              <>
                <Check className="h-4 w-4" /> Finalizar Edición del Plano
              </>
            ) : (
              <>
                <Move className="h-4 w-4 text-amber-400" /> Modo Edición del Plano
              </>
            )}
          </button>
          )}

          {/* Auto-Organize tables button */}
          {isAdmin && (
            <button
              onClick={() => handleAutoArrangeTables(selectedZone)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-3.5 py-2.5 text-xs font-bold text-indigo-200 shadow-lg hover:border-indigo-400 hover:text-white active:scale-95 transition-all"
              title="Alinear y ordenar todas las mesas automáticamente en una cuadrícula simétrica sin superposiciones"
            >
              <Wand2 className="h-4 w-4 text-indigo-400" />
              <span>Auto-Organizar Plano</span>
            </button>
          )}

          {/* Edit Mode Quick Tools */}
          {isEditMode && (
            <>
              <button
                onClick={() => setEditingTable(null)} // null = create new table
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" /> Añadir Mesa
              </button>

              <button
                onClick={() => setIsZoneManagerOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500"
              >
                <Layers className="h-4 w-4" /> Espacios & Zonas
              </button>
            </>
          )}

          {/* Simulate AI reservation & Live Sync buttons */}
          {!isEditMode && (
            <>
              <button
                onClick={loadRestaurantData}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 shadow-lg transition-all hover:bg-slate-800 hover:text-white"
                title="Actualizar mesas y reservas en vivo desde WhatsApp"
              >
                <RefreshCw
                  className={cn("h-4 w-4 text-emerald-400", isSyncing && "animate-spin")}
                />
                <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
              </button>

              <button
                onClick={handleResetToZero}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-300 shadow-lg transition-all hover:bg-slate-800 hover:text-amber-300"
                title="Reiniciar todas las mesas a 'Disponible' y vaciar reservas para empezar completamente de cero"
              >
                <RotateCcw className="h-4 w-4 text-amber-400" />
                <span>Empezar de Cero</span>
              </button>

              <button
                onClick={() => setIsSimulating(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
              >
                <Sparkles className="h-4 w-4" /> Simular Reserva IA
              </button>
            </>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
            <button
              onClick={() => setViewMode("canvas")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all",
                viewMode === "canvas"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <LayoutGrid className="h-4 w-4" /> Plano (Canvas)
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all",
                viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Grid className="h-4 w-4" /> Cuadrícula Fudo
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all",
                viewMode === "list"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <List className="h-4 w-4" /> Lista de Pedidos
            </button>
            {/* Control de Caja (Métricas, Ventas Cerradas y Mesas en Servicio) */}
            <button
              onClick={() => setViewMode("caja")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all",
                viewMode === "caja"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Receipt className="h-4 w-4 text-emerald-400" />
              <span>Control de Caja</span>
              {closedSales.length > 0 && (
                <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  {closedSales.length}
                </span>
              )}
            </button>
            {/* Carta & Stock - solo para admin y cajero */}
            {!isMesero && (
            <button
              onClick={() => setViewMode("inventory")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all",
                viewMode === "inventory"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <UtensilsCrossed className="h-4 w-4 text-amber-400" /> Carta & Stock
            </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ocupación Total */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-xl">
          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-400">Ocupación del Salón</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{occupancyPercentage}%</span>
              <span className="text-xs font-medium text-slate-400">
                ({occupiedTables + reservedTables}/{totalTables} mesas)
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Mesas en Servicio (Activas en vivo) */}
        <div className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900 p-5 shadow-xl">
          <div>
            <span className="mb-1 block text-xs font-semibold text-rose-300">Mesas en Servicio</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400">{occupiedTables}</span>
              <span className="text-xs font-medium text-rose-300/80">
                ({formatCLP(inServiceBillings)} activo)
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Ventas Cerradas del Turno */}
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900 p-5 shadow-xl">
          <div>
            <span className="mb-1 block text-xs font-semibold text-emerald-300">
              Ventas Cerradas (Hoy)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {formatCLP(totalClosedAmount)}
              </span>
              <span className="text-xs font-medium text-emerald-500/80">
                ({totalClosedSalesCount} {totalClosedSalesCount === 1 ? "ticket" : "tickets"})
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        {/* Propinas del Personal & Desglose */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-xl">
          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              Propinas & Caja
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300">
                {formatCLP(totalTips)}
              </span>
              <span className="text-xs font-medium text-amber-400/80">
                10% garzones
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400">
            <Coins className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* DYNAMIC ZONES SELECTOR TABS (Visible in canvas and list modes, not inventory or caja) */}
      {viewMode !== "inventory" && viewMode !== "caja" && (
        <div className="flex items-center justify-between gap-4 overflow-x-auto border-b border-slate-800/80 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="mr-2 flex items-center gap-1 font-semibold text-slate-400">
              <Filter className="h-3.5 w-3.5" /> Espacio / Zona:
            </span>

            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={cn(
                  "rounded-xl px-3.5 py-2 font-semibold whitespace-nowrap capitalize transition-all",
                  selectedZone === zone.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                )}
              >
                {zone.name}
              </button>
            ))}
          </div>

          {isAdmin && (
          <button
            onClick={() => setIsZoneManagerOpen(true)}
            className="flex items-center gap-1 font-semibold whitespace-nowrap text-purple-400 transition-colors hover:text-purple-300"
          >
            <Layers className="h-3.5 w-3.5" /> Editar Espacios
          </button>
          )}
        </div>
      )}

      {/* MAIN VIEW CONTENT (CANVAS, GRID, LIST, INVENTORY OR CAJA) */}
      {viewMode === "caja" ? (
        <CajaPanel
          tables={tables}
          reservations={reservations}
          closedSales={closedSales}
          zones={zones}
          tenantName={tenantName}
          onOpenTableCheckout={(table) => setActiveTable(table)}
        />
      ) : viewMode === "inventory" ? (
        <InventoryPanel tenantId={tenantId || "default-tenant"} />
      ) : viewMode === "grid" ? (
        <TablesGrid
          tables={tables}
          reservations={reservations}
          zones={zones}
          selectedZone={selectedZone}
          isEditMode={isEditMode}
          onSelectTable={(table) => setActiveTable(table)}
          onEditTable={(table) => setEditingTable(table)}
          onDeleteTable={handleDeleteTable}
          onDuplicateTable={handleDuplicateTable}
          onAddTableInZone={(zId) => setEditingTable({ zone: zId } as Table)}
        />
      ) : viewMode === "canvas" ? (
        <TablesCanvas
          tables={tables}
          reservations={reservations}
          zones={zones}
          selectedZone={selectedZone}
          isEditMode={isEditMode}
          onSelectTable={(table) => setActiveTable(table)}
          onEditTable={(table) => setEditingTable(table)}
          onDeleteTable={handleDeleteTable}
          onDuplicateTable={handleDuplicateTable}
          onUpdateTablePosition={handleUpdateTablePosition}
          onAutoArrange={() => handleAutoArrangeTables(selectedZone)}
        />
      ) : (
        <OrderListTable
          tables={tables}
          reservations={reservations}
          onSelectTable={(table) => setActiveTable(table)}
        />
      )}

      {/* TABLE DETAIL MODAL / DRAWER */}
      {activeTable && (
        <TableDetailModal
          table={activeTable}
          reservation={currentReservation}
          onClose={() => setActiveTable(null)}
          onUpdateStatus={handleUpdateStatus}
          onSaveReservation={handleSaveReservation}
          onCloseTableSale={handleCloseTableSale}
        />
      )}

      {/* EDIT / CREATE TABLE MODAL */}
      {editingTable !== undefined && (
        <EditTableModal
          table={editingTable}
          zones={zones}
          existingTables={tables}
          onClose={() => setEditingTable(undefined)}
          onSave={handleSaveTableData}
          onDelete={handleDeleteTable}
          onDuplicate={handleDuplicateTable}
          onBatchCreate={handleBatchCreateTables}
        />
      )}

      {/* ZONE MANAGER MODAL */}
      {isZoneManagerOpen && (
        <ZoneManagerModal
          zones={zones}
          onClose={() => setIsZoneManagerOpen(false)}
          onAddZone={handleAddZone}
          onDeleteZone={handleDeleteZone}
        />
      )}

      {/* SIMULATION MODAL */}
      {isSimulating && (
        <SimulationModal
          tables={tables}
          onClose={() => setIsSimulating(false)}
          onSimulate={handleSimulateReservation}
        />
      )}
    </div>
  );
}
