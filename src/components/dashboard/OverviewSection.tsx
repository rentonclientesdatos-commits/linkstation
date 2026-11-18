import {
  getKpiGenerales,
  getDynamicKpis,
  getDynamicChartSeries,
  type AnalyticsFilters,
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { ChartManager } from "@/components/dashboard/ChartManager";
import { OverviewCanalDistribution } from "@/components/dashboard/OverviewCanalDistribution";
import { DEFAULT_OVERVIEW_KPIS, DEFAULT_OVERVIEW_CHARTS } from "@/lib/constants/kpi-defaults";
import type { KpiConfig, ChartConfig } from "@/types/tenant";
import { LayoutDashboard } from "lucide-react";

// TODO Sprint 3 hardening: cuando se añadan trend badges (+12%, -3%) a los
// KPI cards del overview, deben incluir aria-label descriptivo + icono
// direccional (TrendingUp/TrendingDown). Color no puede ser único indicador
// (WCAG 2.2 AA criterion 1.4.1). Patrón en phase-06 plan.

/**
 * Sprint 2B — Sección Overview cross-canal del /dashboard.
 * Reusa SummaryManager con configKey="overview_kpis" y DEFAULT_OVERVIEW_KPIS
 * como fallback. Persistencia: tenants.config.overview_kpis JSONB (zero-migration).
 *
 * Filtros del FilterBar (rango fechas, campaña, origen, etc.) se aplican.
 * KPI Builder (phase-05) edita esta sección vía configKey="overview_kpis".
 */
export async function OverviewSection({
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

  const tenantOverviewKpis =
    ((tenantConfig.config as Record<string, unknown>)?.overview_kpis as KpiConfig[]) || [];
  const mergedKpis = tenantOverviewKpis.length > 0 ? tenantOverviewKpis : DEFAULT_OVERVIEW_KPIS;

  const tenantOverviewCharts =
    ((tenantConfig.config as Record<string, unknown>)?.overview_charts as ChartConfig[]) || [];
  const mergedCharts =
    tenantOverviewCharts.length > 0 ? tenantOverviewCharts : DEFAULT_OVERVIEW_CHARTS;

  const [kpi, dynamicValues, chartData] = await Promise.all([
    getKpiGenerales(from, to, filters),
    getDynamicKpis(
      from,
      to,
      mergedKpis.filter((k) => !k.staticKey),
      filters
    ),
    getDynamicChartSeries(mergedCharts, from, to, filters),
  ]);

  return (
    <section aria-labelledby="overview-heading" className="mt-2 mb-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2
            id="overview-heading"
            className="text-base font-semibold tracking-tight text-white md:text-lg"
          >
            Resumen General
          </h2>
          <p className="text-xs text-[#8a8f9d]">
            Métricas consolidadas de llamadas, WhatsApp y canales web
          </p>
        </div>
      </div>
      <SummaryManager
        tenant={tenantConfig}
        initialKpis={mergedKpis}
        values={kpi}
        dynamicValues={dynamicValues}
        isAdmin={isAdmin}
        configKey="overview_kpis"
        from={from}
        to={to}
        filters={filters}
        title={false}
        editButtonLabel="Personalizar Overview"
      />

      {/* 4 charts default: 3 dynamic vía ChartManager + 1 custom canal distribution
       * inyectado vía `extraSlot` para que viva en el MISMO grid 12-col (forma
       * un 2x2 limpio en desktop). Antes la canal-distribution iba en un grid
       * externo aparte y quedaba siempre debajo (UX feedback Bloque A 25-05).
       * title={false} oculta el h1 "Análisis Visual" interno (fix BUG-2B-05).
       * editButtonLabel evita duplicado con el "Personalizar Gráficos" del
       * Análisis Visual (fix BUG-2B-04). */}
      <div className="mt-8">
        <ChartManager
          tenant={tenantConfig}
          initialCharts={mergedCharts}
          data={chartData}
          isAdmin={isAdmin}
          configKey="overview_charts"
          filters={filters}
          title={false}
          editButtonLabel="Personalizar Overview Gráficos"
          extraSlot={
            <div className="h-full">
              <OverviewCanalDistribution kpi={kpi} />
            </div>
          }
          extraSlotSize="6"
        />
      </div>
    </section>
  );
}
