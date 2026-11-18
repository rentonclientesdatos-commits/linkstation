"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronDown, RotateCcw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { label: "Hoy", value: "today" },
  { label: "Ayer", value: "yesterday" },
  { label: "Últimos 7 días", value: "7d" },
  { label: "Últimos 30 días", value: "30d" },
  { label: "Este mes", value: "this_month" },
  { label: "Este año", value: "this_year" },
  { label: "Todos", value: "all" },
];

export function FilterBar({ availableCampaigns = [] }: { availableCampaigns?: string[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // Local states for inputs
  const [draftPreset, setDraftPreset] = useState(searchParams.get("preset") || "30d");
  const [draftFrom, setDraftFrom] = useState(searchParams.get("from") || "");
  const [draftTo, setDraftTo] = useState(searchParams.get("to") || "");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [curso, setCurso] = useState(searchParams.get("curso") || "");
  const [pais, setPais] = useState(searchParams.get("pais") || "");
  const [origen, setOrigen] = useState(searchParams.get("origen") || "");
  const [campana, setCampana] = useState(searchParams.get("campana") || "");

  const [isExpanded, setIsExpanded] = useState(false);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (draftPreset) params.set("preset", draftPreset);
    else params.delete("preset");

    if (draftFrom) params.set("from", draftFrom);
    else params.delete("from");

    if (draftTo) params.set("to", draftTo);
    else params.delete("to");

    if (search) params.set("q", search);
    else params.delete("q");

    if (curso) params.set("curso", curso);
    else params.delete("curso");

    if (pais) params.set("pais", pais);
    else params.delete("pais");

    if (origen) params.set("origen", origen);
    else params.delete("origen");

    if (campana) params.set("campana", campana);
    else params.delete("campana");

    params.set("page", "1"); // Reset pagination

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setDraftPreset("30d");
    setDraftFrom("");
    setDraftTo("");
    setSearch("");
    setCurso("");
    setPais("");
    setOrigen("");
    setCampana("");
    router.push(pathname);
  }

  return (
    <div className="relative mb-6 flex flex-col gap-3 rounded-2xl border border-[#23252e] bg-[#121317] p-3.5 shadow-sm transition-all duration-200 md:p-4">
      {/* Row 1: Quick Presets */}
      <div className="custom-scrollbar no-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl border border-[#23252e] bg-[#0d0e12] p-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              setDraftPreset(p.value);
              setDraftFrom("");
              setDraftTo("");
            }}
            className={cn(
              "flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150",
              draftPreset === p.value
                ? "bg-[#1c1d25] border border-[#2e313d] text-white shadow-sm"
                : "text-[#8a8f9d] hover:bg-white/[0.04] hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Row 2: Search + actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8a8f9d]" />
          <input
            type="text"
            placeholder="Buscar teléfono / ID..."
            title="Buscar teléfono o ID de lead"
            aria-label="Buscar teléfono o ID de lead"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="w-full rounded-xl border border-[#272935] bg-[#181920] py-2 pr-4 pl-10 text-xs font-medium text-white placeholder:text-[#52525b] transition-all outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-150",
            isExpanded
              ? "border-[#2e313d] bg-[#1c1d25] text-white shadow-sm"
              : "border-[#272935] bg-[#181920] text-[#8a8f9d] hover:border-[#383a48] hover:text-white"
          )}
        >
          <Filter className="h-3.5 w-3.5 text-[#8a8f9d]" />
          <span className="hidden sm:inline">Filtros</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", isExpanded && "rotate-180")} />
        </button>
        <button
          onClick={applyFilters}
          className="flex-shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-95 sm:px-5"
        >
          Aplicar
        </button>
      </div>

      {/* Row 3: Advanced filters (Collapsible) */}
      {isExpanded && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[rgba(0,229,255,0.08)] pt-5 duration-200 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 animate-in fade-in slide-in-from-top-2">
          {/* Custom Dates - Takes 2 columns on larger screens */}
          <div className="flex flex-col space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="ml-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Rango Personalizado
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  title="Fecha desde"
                  aria-label="Fecha desde"
                  value={draftFrom}
                  onChange={(e) => {
                    setDraftFrom(e.target.value);
                    setDraftPreset("");
                  }}
                  className="w-full rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-xs font-semibold text-slate-200 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                />
              </div>
              <span className="text-xs font-bold text-slate-600">a</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  title="Fecha hasta"
                  aria-label="Fecha hasta"
                  value={draftTo}
                  onChange={(e) => {
                    setDraftTo(e.target.value);
                    setDraftPreset("");
                  }}
                  className="w-full rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-xs font-semibold text-slate-200 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                />
              </div>
            </div>
          </div>

          {/* Curso / Interés */}
          <div className="flex flex-col space-y-1.5">
            <label className="ml-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Curso / Interés
            </label>
            <input
              type="text"
              placeholder="Ej: Manejo..."
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
              className="w-full rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            />
          </div>

          {/* País */}
          <div className="flex flex-col space-y-1.5">
            <label className="ml-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              País
            </label>
            <input
              type="text"
              placeholder="Ej: Chile..."
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="w-full rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            />
          </div>

          {/* Origen */}
          <div className="flex flex-col space-y-1.5">
            <label className="ml-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Origen
            </label>
            <input
              type="text"
              placeholder="Ej: Facebook..."
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="w-full rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            />
          </div>

          {/* Campaña */}
          <div className="flex flex-col justify-between space-y-1.5">
            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                Campaña
              </label>
              {availableCampaigns.length > 0 ? (
                <select
                  value={campana}
                  title="Seleccionar campaña"
                  aria-label="Seleccionar campaña"
                  onChange={(e) => setCampana(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.9)] px-3 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                >
                  <option value="">Todas las campañas</option>
                  {availableCampaigns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ej: Invierno 2024..."
                  value={campana}
                  onChange={(e) => setCampana(e.target.value)}
                  className="w-full rounded-xl border border-[rgba(0,229,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm font-medium text-slate-100 placeholder:text-slate-500 shadow-sm transition-all outline-none focus:border-[#00e5ff] focus:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                />
              )}
            </div>
            <button
              onClick={clearFilters}
              className="mt-2 flex items-center justify-center gap-2 text-[9px] font-bold tracking-[0.2em] uppercase text-slate-500 transition-colors hover:text-[#ff2d55]"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
