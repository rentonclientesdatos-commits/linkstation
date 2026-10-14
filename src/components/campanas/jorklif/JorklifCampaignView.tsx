"use client";

import { useState, useMemo } from "react";
import {
  PhoneCall,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  FileText,
  Building2,
  User,
  Sparkles,
  PhoneForwarded,
  Loader2,
} from "lucide-react";
import type { JorklifCampaignLeadItem } from "@/lib/schemas/jorklif-campaign";
import { downloadJorklifTemplateBase64, triggerJorklifCallAction, launchJorklifCampaignAction } from "@/lib/actions/jorklif-campaign";
import { ImportModal } from "./ImportModal";
import { toast } from "@/components/ui/toast";

interface Props {
  initialLeads: JorklifCampaignLeadItem[];
  initialStats: {
    totalLeads: number;
    totalCarteraMonto: number;
    totalCotizacionesMonto: number;
    llamadasRealizadas: number;
    promesasPago: number;
    pendientes: number;
  };
}

export function JorklifCampaignView({ initialLeads, initialStats }: Props) {
  const [leads, setLeads] = useState<JorklifCampaignLeadItem[]>(initialLeads);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "COBRANZA" | "COTIZACION">("ALL");
  const [filterCallStatus, setFilterCallStatus] = useState<string>("ALL");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [isBatchCalling, setIsBatchCalling] = useState(false);

  // Formateador de moneda
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtrado reactivo
  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      // Filtro tipo
      if (filterType !== "ALL" && item.tipo_gestion !== filterType) {
        return false;
      }
      // Filtro estado llamada
      if (filterCallStatus !== "ALL" && item.estado_llamada !== filterCallStatus) {
        return false;
      }
      // Búsqueda
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesClient = item.cliente_nombre.toLowerCase().includes(q);
        const matchesContact = item.contacto_nombre.toLowerCase().includes(q);
        const matchesPhone = item.telefono.includes(q);
        const matchesDoc = item.numero_documento.toLowerCase().includes(q);
        const matchesVendor = item.vendedor_responsable.toLowerCase().includes(q);
        if (!matchesClient && !matchesContact && !matchesPhone && !matchesDoc && !matchesVendor) {
          return false;
        }
      }
      return true;
    });
  }, [leads, filterType, filterCallStatus, search]);

  const handleDownloadTemplate = async () => {
    try {
      const base64 = await downloadJorklifTemplateBase64();
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      link.download = "Plantilla_Jorklif_Cobranza_Cotizaciones.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        variant: "success",
        title: "Plantilla descargada",
        description: "Se ha descargado la plantilla oficial en Excel.",
      });
    } catch {
      toast({
        variant: "error",
        title: "Error",
        description: "No se pudo descargar la plantilla",
      });
    }
  };

  const handleSingleCall = async (lead: JorklifCampaignLeadItem) => {
    try {
      setCallingId(lead.id);
      const res = await triggerJorklifCallAction(lead.id);
      if (res.success) {
        setLeads((prev) =>
          prev.map((item) =>
            item.id === lead.id
              ? { ...item, estado_llamada: "EN_LLAMADA" as const }
              : item
          )
        );
        toast({
          variant: "success",
          title: "✅ Llamada Ultravox iniciada",
          description: res.callId
            ? `Marcando a ${lead.cliente_nombre} (${lead.telefono}). Call ID: ${res.callId.slice(0, 12)}...`
            : `Marcando a ${lead.cliente_nombre} (${lead.telefono})...`,
        });
      } else {
        toast({
          variant: "error",
          title: "Error al iniciar llamada",
          description: res.message,
        });
      }
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Error",
        description: err.message || "Error al conectar llamada",
      });
    } finally {
      setCallingId(null);
    }
  };

  const handleBatchLaunch = async () => {
    const pendings = filteredLeads.filter((l) => l.estado_llamada === "PENDIENTE");
    if (pendings.length === 0) {
      toast({
        variant: "warning",
        title: "Sin registros pendientes",
        description: "No hay clientes en estado 'Pendiente' con los filtros actuales.",
      });
      return;
    }

    const tipoLabel = filterType === "ALL" ? "todos los tipos" : filterType.toLowerCase();
    if (!confirm(`¿Deseas lanzar la campaña Ultravox para ${pendings.length} clientes pendientes (${tipoLabel})?\n\nSe realizará 1 llamada simultánea con 3 segundos de pausa entre cada una.`)) {
      return;
    }

    setIsBatchCalling(true);
    try {
      const res = await launchJorklifCampaignAction({
        tipoGestion: filterType === "ALL" ? "TODOS" : filterType as "COBRANZA" | "COTIZACION",
        delayBetweenCallsMs: 3000,
      });

      if (res.success) {
        // Actualizar estado visual en tabla
        setLeads((prev) =>
          prev.map((item) => {
            const isPending = item.estado_llamada === "PENDIENTE";
            const tipoMatch = filterType === "ALL" || item.tipo_gestion === filterType;
            return isPending && tipoMatch ? { ...item, estado_llamada: "EN_LLAMADA" as const } : item;
          })
        );
        toast({
          variant: "success",
          title: "🚀 Campaña Ultravox lanzada",
          description: res.message,
        });
      } else {
        toast({
          variant: "error",
          title: "Error al lanzar campaña",
          description: res.message,
        });
      }
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Error inesperado",
        description: err.message || "No se pudo lanzar la campaña",
      });
    } finally {
      setIsBatchCalling(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header con Branding Jorklif */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Jorklif Industrial
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              Servicio de Cartera & Cotizaciones
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Recuperación de Cartera & <span className="text-blue-600 dark:text-blue-400">Cotizaciones</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Gestión telefónica automatizada con voz AI (Ultravox) y registro en tiempo real.
          </p>
        </div>

        {/* Acciones Rápidas Superiores */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all shadow-sm"
          >
            <Download className="h-4 w-4 text-blue-500" />
            Descargar Plantilla Excel
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-lg shadow-blue-500/20"
          >
            <Upload className="h-4 w-4" />
            Subir Base de Datos
          </button>
          <button
            onClick={handleBatchLaunch}
            disabled={isBatchCalling}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isBatchCalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneForwarded className="h-4 w-4" />}
            Lanzar Campaña Masiva
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cartera en Mora */}
        <div className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-card to-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
            <span>Cartera en Mora</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {formatMoney(stats.totalCarteraMonto)}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Facturas pendientes de cobro
          </p>
        </div>

        {/* Cotizaciones en Seguimiento */}
        <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <span>Cotizaciones Abiertas</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {formatMoney(stats.totalCotizacionesMonto)}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Valor de ofertas en seguimiento comercial
          </p>
        </div>

        {/* Llamadas Realizadas */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Llamadas Realizadas</span>
            <PhoneCall className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {stats.llamadasRealizadas} / {stats.totalLeads}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            {stats.pendientes} pendientes por contactar
          </p>
        </div>

        {/* Promesas de Pago */}
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <span>Promesas de Pago</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {stats.promesasPago}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Compromisos con fecha exacta de pago
          </p>
        </div>
      </div>

      {/* 3. Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card border border-border rounded-3xl p-4 shadow-sm">
        {/* Tabs de tipo de gestión */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === "ALL"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({leads.length})
          </button>
          <button
            onClick={() => setFilterType("COBRANZA")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === "COBRANZA"
                ? "bg-red-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cobranza
          </button>
          <button
            onClick={() => setFilterType("COTIZACION")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === "COTIZACION"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cotizaciones
          </button>
        </div>

        {/* Búsqueda y selector de estado */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, documento..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={filterCallStatus}
            onChange={(e) => setFilterCallStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">Estado: Todos</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_LLAMADA">En Llamada</option>
            <option value="PROMESA_PAGO">Promesa de Pago</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="NO_CONTESTA">No Contesta</option>
          </select>
        </div>
      </div>

      {/* 4. Tabla Principal de Leads */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-4">Cliente / Contacto</th>
                <th className="px-4 py-4">Teléfono</th>
                <th className="px-4 py-4">Gestión</th>
                <th className="px-4 py-4">Documento</th>
                <th className="px-4 py-4">Monto</th>
                <th className="px-4 py-4">Mora</th>
                <th className="px-4 py-4">Vendedor</th>
                <th className="px-4 py-4">Estado Llamada</th>
                <th className="px-5 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-muted-foreground/60" />
                    <p className="font-bold text-sm">No se encontraron clientes</p>
                    <p className="text-xs mt-1">
                      {leads.length === 0
                        ? "Haz clic en 'Subir Base de Datos' para cargar el archivo Excel de Jorklif."
                        : "No hay registros que coincidan con los filtros aplicados."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    {/* Cliente / Contacto */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {item.cliente_nombre}
                      </div>
                      {item.contacto_nombre && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                          <User className="h-3 w-3 shrink-0" />
                          {item.contacto_nombre}
                        </div>
                      )}
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-4 font-mono font-bold text-foreground">
                      {item.telefono}
                    </td>

                    {/* Gestión */}
                    <td className="px-4 py-4">
                      {item.tipo_gestion === "COBRANZA" ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          Cobranza
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Cotización
                        </span>
                      )}
                    </td>

                    {/* Documento */}
                    <td className="px-4 py-4 font-mono text-muted-foreground font-semibold">
                      {item.numero_documento || "—"}
                    </td>

                    {/* Monto */}
                    <td className="px-4 py-4 font-bold text-foreground">
                      {item.monto_total > 0 ? formatMoney(item.monto_total) : "—"}
                    </td>

                    {/* Días Mora */}
                    <td className="px-4 py-4">
                      {item.dias_mora > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            item.dias_mora > 30
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {item.dias_mora} días
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">—</span>
                      )}
                    </td>

                    {/* Vendedor */}
                    <td className="px-4 py-4 text-muted-foreground font-medium">
                      {item.vendedor_responsable || "—"}
                    </td>

                    {/* Estado Llamada */}
                    <td className="px-4 py-4">
                      {item.estado_llamada === "PROMESA_PAGO" && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Promesa de Pago
                        </span>
                      )}
                      {item.estado_llamada === "EN_LLAMADA" && (
                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                          En curso...
                        </span>
                      )}
                      {item.estado_llamada === "COMPLETADA" && (
                        <span className="text-foreground font-semibold">Completada</span>
                      )}
                      {item.estado_llamada === "PENDIENTE" && (
                        <span className="text-muted-foreground font-medium">Pendiente</span>
                      )}
                      {item.estado_llamada === "NO_CONTESTA" && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">No contesta</span>
                      )}
                    </td>

                    {/* Acción Individual */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleSingleCall(item)}
                        disabled={callingId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {callingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PhoneCall className="h-3.5 w-3.5" />
                        )}
                        Llamar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Importación */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          // Recargar datos suavemente
          window.location.reload();
        }}
      />
    </div>
  );
}
