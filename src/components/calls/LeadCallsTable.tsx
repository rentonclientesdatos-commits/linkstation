"use client";

import { useState, useMemo } from "react";
import {
  Phone,
  Search,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Download,
  AlertCircle,
  PhoneCall,
  User,
  Truck,
  Wrench,
  FileText,
  Building2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { UltravoxCallItem, ToolCategoryType } from "@/lib/actions/ultravox-calls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CallDetailDrawer } from "./CallDetailDrawer";

interface LeadCallsTableProps {
  initialCalls: UltravoxCallItem[];
  totalCount: number;
  apiKeyFound: boolean;
  error?: string;
}

export function LeadCallsTable({
  initialCalls,
  totalCount,
  apiKeyFound,
  error: initialError,
}: LeadCallsTableProps) {
  const [calls, setCalls] = useState<UltravoxCallItem[]>(initialCalls);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryTab, setCategoryTab] = useState<"all" | ToolCategoryType>("all");
  const [selectedCall, setSelectedCall] = useState<UltravoxCallItem | null>(null);
  const [error, setError] = useState<string | undefined>(initialError);

  const handleRefresh = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch("/api/lead-calls?limit=100");
      const data = await res.json();
      if (data?.success) {
        setCalls(data.calls || []);
      } else {
        setError(data?.error || "Error al actualizar");
      }
    } catch (e: any) {
      setError(e?.message || "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  // Category counts
  const counts = useMemo(() => {
    return {
      all: calls.length,
      arriendo_gruas: calls.filter((c) => c.toolCategory === "arriendo_gruas").length,
      servicio_tecnico: calls.filter((c) => c.toolCategory === "servicio_tecnico").length,
      cotizacion: calls.filter((c) => c.toolCategory === "cotizacion").length,
    };
  }, [calls]);

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      // Category tab filter
      if (categoryTab !== "all" && c.toolCategory !== categoryTab) return false;

      // Status filter
      if (statusFilter === "completed" && c.status !== "completed" && !c.ended) return false;
      if (statusFilter === "with_vars" && Object.keys(c.variables || {}).length === 0) return false;

      // Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchPhone = c.callerId?.toLowerCase().includes(q) || c.dialedNumber?.toLowerCase().includes(q);
      const matchAgent = c.agentName?.toLowerCase().includes(q);
      const matchSummary = c.summary?.toLowerCase().includes(q) || c.shortSummary?.toLowerCase().includes(q);
      const matchId = c.callId?.toLowerCase().includes(q);
      const matchVars = Object.entries(c.variables || {}).some(
        ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
      );

      return matchPhone || matchAgent || matchSummary || matchId || matchVars;
    });
  }, [calls, search, statusFilter, categoryTab]);

  // Statistics calculation for the current view
  const totalCalls = filteredCalls.length;
  const totalSeconds = filteredCalls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
  const avgSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
  const callsWithVariables = filteredCalls.filter((c) => Object.keys(c.variables || {}).length > 0).length;
  const completedCalls = filteredCalls.filter((c) => c.status === "completed" || c.ended).length;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}m ${rem.toString().padStart(2, "0")}s`;
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/[^\d+]/g, "");
  };

  const handleExportCsv = () => {
    if (filteredCalls.length === 0) return;
    const headers = [
      "ID",
      "Fecha",
      "Categoria",
      "Contacto",
      "Tool",
      "Duracion (seg)",
      "Variables",
      "Resumen",
    ];
    const rows = filteredCalls.map((c) => [
      c.callId,
      new Date(c.created).toLocaleString(),
      c.toolCategory || "general",
      `"${c.callerId || ""}"`,
      `"${c.toolName || c.agentName}"`,
      c.durationSeconds,
      `"${JSON.stringify(c.toolData || c.variables).replace(/"/g, '""')}"`,
      `"${(c.shortSummary || c.summary || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `llamadas_${categoryTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!apiKeyFound) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-foreground">API Key de Ultravox Requerida</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Para ver las llamadas y variables capturadas de tus agentes de voz, debes ingresar la API Key de Ultravox en la sección de Configuración de Tenant o Agentes de Voz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Sub-Menu Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/80 pb-4">
        <button
          onClick={() => setCategoryTab("all")}
          className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
            categoryTab === "all"
              ? "bg-blue-600 text-white shadow-blue-500/20"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <PhoneCall className="h-4 w-4" />
          <span>Todas las Llamadas</span>
          <Badge
            variant={categoryTab === "all" ? "secondary" : "outline"}
            className="ml-1 text-[11px] font-semibold"
          >
            {counts.all}
          </Badge>
        </button>

        <button
          onClick={() => setCategoryTab("arriendo_gruas")}
          className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
            categoryTab === "arriendo_gruas"
              ? "bg-amber-600 text-white shadow-amber-500/20"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Arriendo de Grúas</span>
          <Badge
            variant={categoryTab === "arriendo_gruas" ? "secondary" : "outline"}
            className="ml-1 text-[11px] font-semibold"
          >
            {counts.arriendo_gruas}
          </Badge>
        </button>

        <button
          onClick={() => setCategoryTab("servicio_tecnico")}
          className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
            categoryTab === "servicio_tecnico"
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Servicio Técnico</span>
          <Badge
            variant={categoryTab === "servicio_tecnico" ? "secondary" : "outline"}
            className="ml-1 text-[11px] font-semibold"
          >
            {counts.servicio_tecnico}
          </Badge>
        </button>

        <button
          onClick={() => setCategoryTab("cotizacion")}
          className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
            categoryTab === "cotizacion"
              ? "bg-purple-600 text-white shadow-purple-500/20"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Captura Cotización</span>
          <Badge
            variant={categoryTab === "cotizacion" ? "secondary" : "outline"}
            className="ml-1 text-[11px] font-semibold"
          >
            {counts.cotizacion}
          </Badge>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Registros en categoría */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-blue-500/30">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {categoryTab === "arriendo_gruas" ? (
              <Truck className="h-6 w-6" />
            ) : categoryTab === "servicio_tecnico" ? (
              <Wrench className="h-6 w-6" />
            ) : categoryTab === "cotizacion" ? (
              <FileText className="h-6 w-6" />
            ) : (
              <PhoneCall className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {categoryTab === "all" ? "Total Llamadas" : "Registros Capturados"}
            </p>
            <p className="text-2xl font-black tracking-tight text-foreground">{totalCalls}</p>
          </div>
        </div>

        {/* Card 2: Duración Promedio */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-purple-500/30">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Duración Promedio
            </p>
            <p className="text-2xl font-black tracking-tight text-foreground">
              {formatDuration(avgSeconds)}
            </p>
          </div>
        </div>

        {/* Card 3: Con Datos Capturados */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-500/30">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Con Datos de Tool
            </p>
            <p className="text-2xl font-black tracking-tight text-foreground">
              {callsWithVariables}
            </p>
          </div>
        </div>

        {/* Card 4: Tasa de Finalización */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-amber-500/30">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completadas
            </p>
            <p className="text-2xl font-black tracking-tight text-foreground">
              {completedCalls}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por teléfono, empresa, datos de grúa, comuna o repuesto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-xs outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="completed">Solo Completadas</option>
            <option value="with_vars">Con Datos de Tool</option>
          </select>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredCalls.length === 0}
            className="h-11 gap-2 rounded-xl border-border bg-card px-4 text-xs font-semibold shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="h-11 gap-2 rounded-xl border-border bg-card px-4 text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Calls Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          {/* TAB 1: ARRIENDO DE GRUAS TABLE */}
          {categoryTab === "arriendo_gruas" && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-amber-500/5 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Capacidad / Peso</th>
                  <th className="px-6 py-4">Combustible</th>
                  <th className="px-6 py-4">Altura Levante</th>
                  <th className="px-6 py-4">Duración & Inicio</th>
                  <th className="px-6 py-4">Comuna / Dirección</th>
                  <th className="px-6 py-4">Fecha Captura</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                      <Truck className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      No hay registros capturados de arriendo de grúas aún.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const data = call.toolData || call.variables || {};
                    const empresa = data.Nombre_empresa || data.nombre_empresa || "Empresa por confirmar";
                    const whatsapp = data.WhatsApp || data.whatsapp || call.callerId || "";
                    const capacidad = data.capacidad || "-";
                    const peso = data.peso_a_mover || "-";
                    const combustible = data.combustible || "-";
                    const altura = data.altura_de_levante ? `${data.altura_de_levante}m` : "-";
                    const duracion = data.duracion_del_arriendo || data.duracion_del_arrie || "-";
                    const fechaInicio = data.fecha_de_inicio || "-";
                    const comuna = data.comuna || "-";
                    const direccion = data.direccion_de_uso || "";

                    return (
                      <tr
                        key={call.callId}
                        className="group cursor-pointer transition-colors hover:bg-amber-500/5"
                        onClick={() => setSelectedCall(call)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-bold text-foreground">{empresa}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {whatsapp ? (
                            <a
                              href={`https://wa.me/${getCleanPhone(whatsapp)}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              {whatsapp}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin número</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-foreground">{capacidad}</span>
                          {peso !== "-" && <span className="text-xs text-muted-foreground ml-1">({peso})</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
                            {combustible}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{altura}</td>
                        <td className="px-6 py-4 text-xs">
                          <p className="font-medium text-foreground">{duracion}</p>
                          <p className="text-muted-foreground">Inicio: {fechaInicio}</p>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <p className="font-medium text-foreground">{comuna}</p>
                          {direccion && <p className="text-muted-foreground truncate max-w-[150px]">{direccion}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {new Date(call.created).toLocaleDateString("es-CL", { dateStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                            className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                          >
                            Detalle
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: SERVICIO TECNICO TABLE */}
          {categoryTab === "servicio_tecnico" && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-emerald-500/5 text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Datos de la Grúa / Falla</th>
                  <th className="px-6 py-4">Fecha de Visita Solicitada</th>
                  <th className="px-6 py-4">Fecha Captura</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <Wrench className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      No hay registros de servicio técnico capturados aún.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const data = call.toolData || call.variables || {};
                    const empresa = data.Nombre_empresa || data.nombre_empresa || "Empresa por confirmar";
                    const whatsapp = data.WhatsApp || data.whatsapp || call.callerId || "";
                    const datosGrua = data.datos_de_la_grua || data.datos_grua || "-";
                    const fechaVisita = data.fecha_de_visita || data.fecha_de_visita_si || "-";

                    return (
                      <tr
                        key={call.callId}
                        className="group cursor-pointer transition-colors hover:bg-emerald-500/5"
                        onClick={() => setSelectedCall(call)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-bold text-foreground">{empresa}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {whatsapp ? (
                            <a
                              href={`https://wa.me/${getCleanPhone(whatsapp)}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              {whatsapp}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin número</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <p className="line-clamp-2 text-xs font-medium text-foreground">{datosGrua}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                            {fechaVisita}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {new Date(call.created).toLocaleDateString("es-CL", { dateStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                            className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            Detalle
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: CAPTURA COTIZACION TABLE */}
          {categoryTab === "cotizacion" && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-purple-500/5 text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Correo</th>
                  <th className="px-6 py-4">Repuesto Solicitado</th>
                  <th className="px-6 py-4">Datos de la Grúa</th>
                  <th className="px-6 py-4">Comuna / Ciudad</th>
                  <th className="px-6 py-4">Fecha Captura</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      <FileText className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      No hay cotizaciones capturadas aún.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const data = call.toolData || call.variables || {};
                    const cliente = data.Nombre_del_cliente || data.nombre_del_cliente || "Cliente";
                    const whatsapp = data.WhatsApp || data.whatsapp || call.callerId || "";
                    const correo = data.Correo_electronico || data.correo || "-";
                    const repuesto = data.Repuesto_solicitado || data.Repuesto_solicitad || "-";
                    const datosGrua = data.Datos_de_la_grua || data.datos_grua || "-";
                    const comuna = data.Comuna_o_Ciudad || data.comuna || "-";

                    return (
                      <tr
                        key={call.callId}
                        className="group cursor-pointer transition-colors hover:bg-purple-500/5"
                        onClick={() => setSelectedCall(call)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="font-bold text-foreground">{cliente}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {whatsapp ? (
                            <a
                              href={`https://wa.me/${getCleanPhone(whatsapp)}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              {whatsapp}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin número</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground truncate max-w-[150px]">
                          {correo}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs">
                            {repuesto}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[150px]">
                          {datosGrua}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-foreground">{comuna}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {new Date(call.created).toLocaleDateString("es-CL", { dateStyle: "short" })}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                            className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                          >
                            Detalle
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: TODAS LAS LLAMADAS (GENERAL) */}
          {categoryTab === "all" && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Fecha & Agente</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Categoría / Tool</th>
                  <th className="px-6 py-4">Duración</th>
                  <th className="px-6 py-4">Variables Capturadas</th>
                  <th className="px-6 py-4">Resumen de la Llamada</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <Phone className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      No se encontraron registros de llamadas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const varEntries = Object.entries(call.toolData || call.variables || {});
                    return (
                      <tr
                        key={call.callId}
                        className="group cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => setSelectedCall(call)}
                      >
                        {/* Fecha y Agente */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {call.agentName}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(call.created).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Contacto */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-mono text-xs font-medium text-foreground">
                              {call.callerId || "Desconocido"}
                            </span>
                          </div>
                        </td>

                        {/* Categoría / Tool */}
                        <td className="px-6 py-4">
                          {call.toolCategory === "arriendo_gruas" ? (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs gap-1">
                              <Truck className="h-3 w-3" /> Arriendo
                            </Badge>
                          ) : call.toolCategory === "servicio_tecnico" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs gap-1">
                              <Wrench className="h-3 w-3" /> Serv. Técnico
                            </Badge>
                          ) : call.toolCategory === "cotizacion" ? (
                            <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-xs gap-1">
                              <FileText className="h-3 w-3" /> Cotización
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              General
                            </Badge>
                          )}
                        </td>

                        {/* Duración & Estado */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {formatDuration(call.durationSeconds)}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              {call.endReason || call.status}
                            </span>
                          </div>
                        </td>

                        {/* Variables Capturadas Chips */}
                        <td className="px-6 py-4 max-w-xs">
                          {varEntries.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Sin variables
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {varEntries.slice(0, 3).map(([k, v]) => (
                                <Badge
                                  key={k}
                                  variant="outline"
                                  className="border-blue-500/20 bg-blue-500/5 text-[10px] font-medium text-blue-700 dark:text-blue-300 py-0.5 px-2"
                                >
                                  <span className="font-bold uppercase opacity-80">{k}:</span>{" "}
                                  <span className="ml-1 truncate max-w-[100px] inline-block align-bottom">
                                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                  </span>
                                </Badge>
                              ))}
                              {varEntries.length > 3 && (
                                <Badge variant="secondary" className="text-[10px] py-0.5 px-1.5">
                                  +{varEntries.length - 3} más
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Resumen */}
                        <td className="px-6 py-4 max-w-md">
                          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                            {call.shortSummary || call.summary || "Llamada sin resumen registrado."}
                          </p>
                        </td>

                        {/* Botón Acción */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                            className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          >
                            Ver Detalle
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Slide-over Call Detail Drawer */}
      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
