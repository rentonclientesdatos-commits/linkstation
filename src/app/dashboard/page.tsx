import { Suspense } from "react";
import {
  getKpiGenerales,
  getDynamicKpis,
  getDynamicChartSeries,
  AnalyticsFilters,
  getUniqueCampaigns,
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiConfig, ChartConfig } from "@/types/tenant";
import { ChartSkeleton, KpiSkeleton } from "@/components/charts/DashboardCharts";
import { TenantSetupBanner } from "@/components/layout/TenantSetupBanner";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { ChartManager } from "@/components/dashboard/ChartManager";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { DEFAULT_SUMMARY_KPIS, DEFAULT_CHARTS, DEFAULT_FUNNEL } from "@/lib/constants/kpi-defaults";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";
import { Filter } from "lucide-react";
import { PipelineSection, PipelineSkeleton } from "@/components/dashboard/pipeline/PipelineSection";

// ─── KPI SUMMARY SECTION ──────────────────────────────────────────────────────

async function SummarySection({
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

  // Use per-client KPIs from config, fallback to defaults
  const currentConfigKpis =
    ((tenantConfig.config as Record<string, unknown>)?.kpis as KpiConfig[]) || [];
  const mergedKpis = currentConfigKpis.length > 0 ? currentConfigKpis : DEFAULT_SUMMARY_KPIS;

  // Dynamic (custom) KPIs and static KPIs in parallel
  const [kpi, dynamicValues] = await Promise.all([
    getKpiGenerales(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedKpis.filter((k) => !k.staticKey),
      filters
    ),
  ]);

  return (
    <SummaryManager
      tenant={tenantConfig}
      initialKpis={mergedKpis}
      values={kpi}
      dynamicValues={dynamicValues}
      isAdmin={isAdmin}
      configKey="kpis"
      from={from}
      to={to}
      filters={filters}
    />
  );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function ChartsSection({
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

  const currentCharts =
    ((tenantConfig.config as Record<string, unknown>)?.charts as ChartConfig[]) || [];
  const mergedCharts = currentCharts.length > 0 ? currentCharts : DEFAULT_CHARTS;

  const chartData = await getDynamicChartSeries(mergedCharts, from, to, filters);

  return (
    <ChartManager
      tenant={tenantConfig}
      initialCharts={mergedCharts}
      data={chartData}
      isAdmin={isAdmin}
      filters={filters}
    />
  );
}

// ─── FUNNEL SECTION ───────────────────────────────────────────────────────────

async function FunnelSection({
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

  const currentFunnelKpis =
    ((tenantConfig.config as Record<string, unknown>)?.funnel as KpiConfig[]) || [];
  const mergedFunnel = currentFunnelKpis.length > 0 ? currentFunnelKpis : DEFAULT_FUNNEL;

  const [kpi, dynamicValues] = await Promise.all([
    getKpiGenerales(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedFunnel.filter((k: KpiConfig) => !k.staticKey),
      filters
    ),
  ]);

  return (
    <div className="mt-8 mb-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="bg-primary/10 rounded-[20px] p-3">
          <Filter className="text-primary h-8 w-8" />
        </div>
        <div>
          <h2 className="text-foreground text-[32px] leading-tight font-bold tracking-tight">
            Embudo de <span className="text-primary">Conversi&#xF3;n</span>
          </h2>
          <p className="text-muted-foreground text-[15px] font-medium">
            Tasa de conversi&#xF3;n y progreso por etapa
          </p>
        </div>
      </div>
      <SummaryManager
        tenant={tenantConfig}
        initialKpis={mergedFunnel}
        values={kpi}
        dynamicValues={dynamicValues}
        isAdmin={isAdmin}
        configKey="funnel"
        layout="funnel"
        from={from}
        to={to}
        filters={filters}
        title={null}
      />
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { from, to, filters } = parseFilters(params);
  const [availableCampaigns, isAdmin] = await Promise.all([getUniqueCampaigns(), getAdminStatus()]);

  return (
    <div className="w-full space-y-6 pb-10">
      {isAdmin && <TenantSetupBanner />}

      <FilterBar availableCampaigns={availableCampaigns} />

      {/* Sprint 2B: Overview cross-canal (NUEVO, encima de SummarySection) */}
      <Suspense
        key={`overview-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        }
      >
        <OverviewSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      <Suspense
        key={`summary-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        }
      >
        <SummarySection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      <Suspense
        key={`pipeline-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={<PipelineSkeleton />}
      >
        <PipelineSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      <Suspense
        key={`funnel-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={<ChartSkeleton />}
      >
        <FunnelSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>

      <Suspense
        key={`charts-${from}-${to}-${JSON.stringify(filters)}`}
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ChartsSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
      </Suspense>
    </div>
  );
}
