import { Suspense } from "react";
import { Target } from "lucide-react";
import {
  getKpiCampanas,
  getDynamicKpis,
  getDynamicChartSeries,
  getUniqueCampaigns,
  type AnalyticsFilters,
  type KpiGenerales,
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton, ChartSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { ChartManager } from "@/components/dashboard/ChartManager";
import { TenantSetupBanner } from "@/components/layout/TenantSetupBanner";
import { CAMPANAS_KPIS, CAMPANAS_CHARTS, CAMPANAS_FUNNEL } from "@/lib/constants/kpi-defaults";
import { KpiConfig, ChartConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";
import { CampaignSelector } from "@/components/dashboard/CampaignSelector";
import { fetchCalls } from "@/lib/actions/calls";
import { CampaignLeadsTable } from "@/components/campanas/CampaignLeadsTable";

export const dynamic = "force-dynamic";

// ─── HERO STAT ────────────────────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  color,
  glowColor,
}: {
  label: string;
  value: string;
  color: string;
  glowColor?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(0,229,255,0.12)] bg-[rgba(6,10,25,0.7)] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.25)] to-transparent" />
      <p className="mb-1 text-[10px] font-black tracking-widest uppercase text-slate-400">
        {label}
      </p>
      <p
        className={`text-3xl leading-none font-black tracking-tighter ${color}`}
        style={glowColor ? { textShadow: `0 0 12px ${glowColor}` } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// ─── KPIs SECTION ─────────────────────────────────────────────────────────────

async function CampanasKpis({
  from,
  to,
  isAdmin,
  filters,
  availableCampaigns = [],
}: {
  from: string;
  to: string;
  isAdmin: boolean;
  filters: AnalyticsFilters;
  availableCampaigns?: string[];
}) {
  const tenantConfig = await getActiveTenantConfig();
  if (!tenantConfig) return null;

  const currentKpis =
    ((tenantConfig.config as Record<string, unknown>)?.kpis_campanas as KpiConfig[]) || [];
  const mergedKpis = currentKpis.length > 0 ? currentKpis : CAMPANAS_KPIS;

  const [kpi, dynamicValues] = await Promise.all([
    getKpiCampanas(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedKpis.filter((k) => !k.staticKey),
      filters
    ),
  ]);

  // Pad to KpiGenerales shape (SummaryManager is agnostic via staticKey)
  const values = {
    total_leads: kpi.total_leads,
    total_llamadas: kpi.total_llamadas,
    total_leads_alcanzados: kpi.total_leads_alcanzados,
    total_contactados: kpi.total_contactados,
    total_agendados: kpi.total_agendados,
    total_cualificados: kpi.total_cualificados,
    total_minutos: kpi.total_segundos,
    total_segundos: kpi.total_segundos,
    // unused fields
    total_no_contacto: 0,
    tasa_contacto: 0,
    duracion_media_segundos: 0,
    tiempo_respuesta_promedio_minutos: null,
    total_no_cualificados: 0,
    por_estado_llamada: [],
    por_razon_termino: [],
    por_origen: [],
    por_tipo_lead: [],
    por_cualificacion: [],
    por_motivo_anulacion: [],
    agendados_por_fecha: [],
    primer_contacto_por_fecha: [],
  } as unknown as KpiGenerales;

  const formattedMinutos = (() => {
    const m = Math.floor(kpi.total_segundos / 60);
    const s = Math.round(kpi.total_segundos % 60);
    return s > 0 ? `${m} min ${s} seg` : `${m} min`;
  })();

  return (
    <SummaryManager
      tenant={tenantConfig}
      initialKpis={mergedKpis}
      values={values}
      dynamicValues={dynamicValues}
      isAdmin={isAdmin}
      configKey="kpis_campanas"
      from={from}
      to={to}
      filters={filters}
      title={
        <div className="mb-2">
          <h1 className="mb-1 text-3xl font-black tracking-tight text-white">
            Campañas <span className="text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">IA</span>
          </h1>
          <p className="text-xs font-bold tracking-widest uppercase text-[#00e5ff]/70">
            Rendimiento y conversión por campaña en el período seleccionado
          </p>
          <CampaignSelector campaigns={availableCampaigns} currentCampaign={filters.campana} />
          {/* Hero metrics */}
          <div className="mt-6 flex flex-wrap gap-4">
            <HeroStat
              label="Total Leads"
              value={kpi.total_leads.toLocaleString("es-ES")}
              color="text-white"
            />
            <HeroStat
              label="Llamadas"
              value={kpi.total_llamadas.toLocaleString("es-ES")}
              color="text-[#00e5ff]"
              glowColor="rgba(0,229,255,0.4)"
            />
            <HeroStat
              label="Contactados"
              value={kpi.total_contactados.toLocaleString("es-ES")}
              color="text-[#34d399]"
              glowColor="rgba(52,211,153,0.4)"
            />
            <HeroStat
              label="Agendados"
              value={kpi.total_agendados.toLocaleString("es-ES")}
              color="text-[#2dd4bf]"
              glowColor="rgba(45,212,191,0.4)"
            />
            <HeroStat
              label="Cualificados"
              value={kpi.total_cualificados.toLocaleString("es-ES")}
              color="text-[#c084fc]"
              glowColor="rgba(192,132,252,0.4)"
            />
            <HeroStat
              label="Minutos IA"
              value={formattedMinutos}
              color="text-[#fbbf24]"
              glowColor="rgba(251,191,36,0.4)"
            />
            <HeroStat
              label="Campañas"
              value={kpi.campanas.length.toString()}
              color="text-slate-400"
            />
          </div>
        </div>
      }
    />
  );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function CampanasChartsSection({
  from,
  to,
  isAdmin,
  filters,
}: {
  from: string;
  to: string;
  isAdmin: boolean;
  filters: AnalyticsFilters;
}) {
  const tenantConfig = await getActiveTenantConfig();
  if (!tenantConfig) return null;

  const savedCharts =
    ((tenantConfig.config as Record<string, unknown>)?.charts_campanas as ChartConfig[]) || [];
  const mergedCharts = savedCharts.length > 0 ? savedCharts : CAMPANAS_CHARTS;

  const chartData = await getDynamicChartSeries(mergedCharts, from, to, filters);

  return (
    <ChartManager
      tenant={tenantConfig}
      initialCharts={mergedCharts}
      data={chartData}
      isAdmin={isAdmin}
      configKey="charts_campanas"
      filters={filters}
      title="Análisis de Campañas"
    />
  );
}

// ─── FUNNEL SECTION ───────────────────────────────────────────────────────────

async function CampanasFunnel({
  from,
  to,
  isAdmin,
  filters,
}: {
  from: string;
  to: string;
  isAdmin: boolean;
  filters: AnalyticsFilters;
}) {
  const tenantConfig = await getActiveTenantConfig();
  if (!tenantConfig) return null;

  const currentFunnel =
    ((tenantConfig.config as Record<string, unknown>)?.funnel_campanas as KpiConfig[]) || [];
  const mergedFunnel = currentFunnel.length > 0 ? currentFunnel : CAMPANAS_FUNNEL;

  const [kpi, dynamicValues] = await Promise.all([
    getKpiCampanas(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedFunnel.filter((k) => !k.staticKey),
      filters
    ),
  ]);

  const values = {
    total_leads: kpi.total_leads,
    total_leads_alcanzados: kpi.total_leads_alcanzados,
    total_contactados: kpi.total_contactados,
    total_agendados: kpi.total_agendados,
    total_cualificados: kpi.total_cualificados,
    total_segundos: kpi.total_segundos,
  } as unknown as KpiGenerales;

  return (
    <div className="mt-12 mb-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.1)] p-3 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Target className="h-8 w-8 text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
        </div>
        <div>
          <h2 className="text-[32px] leading-tight font-bold tracking-tight text-white">
            Embudo de <span className="text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">Conversión</span>
          </h2>
          <p className="text-[15px] font-medium text-slate-400">
            Tasa de conversión y progreso por etapa de campaña
          </p>
        </div>
      </div>
      <SummaryManager
        tenant={tenantConfig}
        initialKpis={mergedFunnel}
        values={values}
        dynamicValues={dynamicValues}
        isAdmin={isAdmin}
        configKey="funnel_campanas"
        layout="funnel"
        from={from}
        to={to}
        filters={filters}
      />
    </div>
  );
}

// ─── LEADS TABLE SECTION ──────────────────────────────────────────────────────

async function CampanasLeadsSection({
  from,
  to,
  filters,
}: {
  from: string;
  to: string;
  filters: AnalyticsFilters;
}) {
  const res = await fetchCalls({
    page: 1,
    fromDate: from,
    toDate: to,
    campana: filters.campana,
    origen: filters.origen,
    pais: filters.pais,
    pageSize: 10,
  });

  return (
    <div className="mt-10">
      <CampaignLeadsTable data={res.data} total={res.count} />
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function CampanasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { from, to, filters } = parseFilters(params);
  const availableCampaigns = await getUniqueCampaigns();
  const isAdmin = await getAdminStatus();

  return (
    <div className="w-full space-y-6 pb-10">
      {isAdmin && <TenantSetupBanner />}

      <FilterBar availableCampaigns={availableCampaigns} />

      {/* KPI Cards */}
      <Suspense
        key={`camp-kpis-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        }
      >
        <CampanasKpis
          from={from}
          to={to}
          isAdmin={isAdmin}
          filters={filters}
          availableCampaigns={availableCampaigns}
        />
      </Suspense>

      {/* Charts */}
      <Suspense
        key={`camp-charts-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        }
      >
        <CampanasChartsSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      {/* Funnel */}
      <Suspense
        key={`camp-funnel-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={<div className="bg-muted/20 h-[400px] w-full animate-pulse rounded-[40px]" />}
      >
        <CampanasFunnel from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      {/* Leads Table */}
      <Suspense
        key={`camp-leads-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={<div className="bg-muted/20 h-64 w-full animate-pulse rounded-[32px]" />}
      >
        <CampanasLeadsSection from={from} to={to} filters={filters} />
      </Suspense>
    </div>
  );
}
