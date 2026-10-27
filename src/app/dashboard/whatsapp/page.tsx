import { Suspense } from "react";
import {
  getKpiWhatsapp,
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
import { WHATSAPP_KPIS, DEFAULT_CHARTS_WHATSAPP } from "@/lib/constants/kpi-defaults";
import { KpiConfig, ChartConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";

export const dynamic = "force-dynamic";

// ─── KPIs SECTION ─────────────────────────────────────────────────────────────

async function WhatsappKpis({
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

  const currentKpis =
    ((tenantConfig.config as Record<string, unknown>)?.kpis_whatsapp as KpiConfig[]) || [];
  const mergedKpis = currentKpis.length > 0 ? currentKpis : WHATSAPP_KPIS;

  const [kpi, dynamicValues] = await Promise.all([
    getKpiWhatsapp(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedKpis.filter((k) => !k.staticKey),
      filters
    ),
  ]);

  // Build compatible values object (staticKey names from kpi-defaults)
  const values = {
    total_leads: kpi.total_leads_unicos,
    total_leads_unicos: kpi.total_leads_unicos,
    total_agendados: kpi.total_agendados,
    total_cualificados: kpi.total_cualificados,
    tasa_agendamiento: kpi.tasa_agendamiento,
    tasa_conversion: kpi.tasa_conversion,
    tasa_ilocalizables: kpi.tasa_ilocalizables,
    // pad remaining fields for SummaryManager
    total_llamadas: 0,
    total_contactados: 0,
    total_no_contacto: 0,
    tasa_contacto: 0,
    total_minutos: 0,
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
    total_segundos: 0,
    total_leads_alcanzados: 0,
    minutos_ahorrados: 0,
    horas_ahorradas: 0,
    tiempo_ahorrado_formateado: "0h 0m",
    total_whatsapp_conversaciones: 0,
  } as KpiGenerales;

  return (
    <SummaryManager
      tenant={tenantConfig}
      initialKpis={mergedKpis}
      values={values}
      dynamicValues={dynamicValues}
      isAdmin={isAdmin}
      configKey="kpis_whatsapp"
      from={from}
      to={to}
      filters={filters}
      title={
        <div className="mb-2">
          {/* Header */}
          <div className="mb-1 flex items-center gap-3">
            {/* WhatsApp green icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#25d366]/40 bg-[rgba(37,211,102,0.15)] shadow-[0_0_15px_rgba(37,211,102,0.3)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#25d366] drop-shadow-[0_0_8px_rgba(37,211,102,0.8)]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.12 1.528 5.853L0 24l6.327-1.496C8.047 23.457 9.985 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.637-.51-5.14-1.397l-.368-.218-3.754.887.929-3.654-.24-.376C2.51 15.612 2 13.862 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                WhatsApp <span className="text-[#25d366] drop-shadow-[0_0_12px_rgba(37,211,102,0.6)]">Leads</span>
              </h1>
              <p className="text-xs font-bold tracking-widest uppercase text-[#25d366]/70">
                Gestión y conversiones vía WhatsApp
              </p>
            </div>
          </div>

          {/* Hero metrics */}
          <div className="mt-6 flex flex-wrap gap-4">
            <HeroStat
              key="hero-conv"
              label="Conversaciones"
              value={kpi.total_conversaciones.toLocaleString("es-ES")}
              color="text-white"
            />
            <HeroStat
              key="hero-leads"
              label="Leads únicos"
              value={kpi.total_leads_unicos.toLocaleString("es-ES")}
              color="text-[#25d366]"
              glowColor="rgba(37,211,102,0.5)"
            />
          </div>
        </div>
      }
    />
  );
}

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

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function WhatsappChartsSection({
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
    ((tenantConfig.config as Record<string, unknown>)?.charts_whatsapp as ChartConfig[]) || [];
  const mergedCharts = savedCharts.length > 0 ? savedCharts : DEFAULT_CHARTS_WHATSAPP;

  const chartData = await getDynamicChartSeries(mergedCharts, from, to, filters);

  return (
    <ChartManager
      tenant={tenantConfig}
      initialCharts={mergedCharts}
      data={chartData}
      isAdmin={isAdmin}
      configKey="charts_whatsapp"
      filters={filters}
      title="Análisis WhatsApp"
    />
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { from, to, filters } = parseFilters(params);
  const isAdmin = await getAdminStatus();

  return (
    <div className="w-full space-y-6 pb-10">
      <FilterBar />

      {/* KPI Cards */}
      <Suspense
        key={`wp-kpis-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        }
      >
        <WhatsappKpis from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      {/* Charts */}
      <Suspense
        key={`wp-charts-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        }
      >
        <WhatsappChartsSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>
    </div>
  );
}
