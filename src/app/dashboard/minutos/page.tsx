import { Suspense } from "react";
import {
  getKpiMinutos,
  getDynamicKpis,
  getDynamicChartSeries,
  type AnalyticsFilters,
  type KpiGenerales,
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton, ChartSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { ChartManager } from "@/components/dashboard/ChartManager";
import { Bot } from "lucide-react";
import { LLAMADAS_KPIS, DEFAULT_CHARTS_LLAMADAS } from "@/lib/constants/kpi-defaults";
import { KpiConfig, ChartConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";

export const dynamic = "force-dynamic";

// ─── KPIs SECTION ─────────────────────────────────────────────────────────────

async function MinutosKpis({
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

  const config = (tenantConfig.config || {}) as Record<string, unknown>;
  const currentKpis = (config.kpis_llamadas as KpiConfig[]) || [];
  const mergedKpis = currentKpis.length > 0 ? currentKpis : LLAMADAS_KPIS;

  const [kpi, dynamicValues] = await Promise.all([
    getKpiMinutos(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedKpis.filter((k) => !k.staticKey),
      filters
    ),
  ]);

  // Build values compatible with KpiGenerales staticKey names
  const values = {
    total_llamadas: kpi.total_llamadas,
    total_contactados: kpi.total_contactadas,
    total_minutos: kpi.total_segundos,
    total_segundos: kpi.total_segundos,
    duracion_media_segundos: kpi.duracion_media_segundos,
    tasa_agendamiento: kpi.tasa_agendamiento,
    tasa_conversion: kpi.tasa_conversion,
    // pad unused fields so SummaryManager doesn't break
    total_leads: 0,
    total_no_contacto: 0,
    tasa_contacto: 0,
    total_agendados: 0,
    tiempo_respuesta_promedio_minutos: null,
    total_cualificados: 0,
    total_no_cualificados: 0,
    tasa_ilocalizables: 0,
    por_estado_llamada: [],
    por_razon_termino: [],
    por_origen: [],
    por_tipo_lead: [],
    por_cualificacion: [],
    por_motivo_anulacion: [],
    agendados_por_fecha: [],
    primer_contacto_por_fecha: [],
  } as unknown as KpiGenerales;

  return (
    <SummaryManager
      tenant={tenantConfig}
      initialKpis={mergedKpis}
      values={values}
      dynamicValues={dynamicValues}
      isAdmin={isAdmin}
      configKey="kpis_llamadas"
      from={from}
      to={to}
      filters={filters}
      title={
        <div className="mb-2">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-[20px] border border-blue-500/20 bg-blue-500/10 p-3">
              <Bot className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white">
                Agente de <span className="text-blue-400">voz</span>
              </h1>
              <p className="text-[15px] font-medium text-slate-400">
                Rendimiento del ciclo de contacto automatizado
              </p>
            </div>
          </div>

          {/* Hero metric */}
          <div className="mt-6 flex flex-wrap items-end gap-10">
            <div>
              <p className="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Total minutos
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl leading-none font-black tracking-tighter text-white">
                  {Math.floor(kpi.total_segundos / 60).toLocaleString("es-ES")}
                </span>
                <span className="text-2xl font-black text-slate-400">min</span>
                {kpi.total_segundos % 60 > 0 && (
                  <>
                    <span className="ml-2 text-4xl font-black tracking-tighter text-slate-300">
                      {kpi.total_segundos % 60}
                    </span>
                    <span className="text-lg font-bold text-slate-400">seg</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-10 pb-2">
              <div>
                <p className="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  Duración media
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-400">
                    {Math.floor(kpi.duracion_media_segundos / 60)}
                  </span>
                  <span className="text-sm font-bold text-slate-400">min</span>
                  {kpi.duracion_media_segundos % 60 > 0 && (
                    <>
                      <span className="ml-1 text-xl font-black text-blue-400/80">
                        {kpi.duracion_media_segundos % 60}
                      </span>
                      <span className="text-xs font-bold text-slate-400">seg</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  Llamadas
                </p>
                <p className="text-2xl font-black text-slate-200">
                  {kpi.total_llamadas.toLocaleString("es-ES")}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  Contactadas
                </p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {kpi.total_contactadas.toLocaleString("es-ES")}
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function MinutosChartsSection({
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

  const config = (tenantConfig.config || {}) as Record<string, unknown>;
  const savedCharts = (config.charts_llamadas as ChartConfig[]) || [];
  const mergedCharts = savedCharts.length > 0 ? savedCharts : DEFAULT_CHARTS_LLAMADAS;

  const chartData = await getDynamicChartSeries(mergedCharts, from, to, filters);

  return (
    <ChartManager
      tenant={tenantConfig}
      initialCharts={mergedCharts}
      data={chartData}
      isAdmin={isAdmin}
      configKey="charts_llamadas"
      filters={filters}
      title="Análisis de Llamadas"
    />
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function MinutosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { from, to, filters } = parseFilters(params);
  const isAdmin = await getAdminStatus();

  return (
    <div className="w-full space-y-6 pb-10">
      <FilterBar />

      {/* KPI Cards */}
      <Suspense
        key={`min-kpis-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MinutosKpis from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      {/* Charts */}
      <Suspense
        key={`min-charts-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MinutosChartsSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>
    </div>
  );
}
