"use client";

import type { KpiGenerales } from "@/lib/actions/analytics";
import { BubbleClusterChart, BubbleItem } from "@/components/charts/BubbleClusterChart";
import { Info } from "lucide-react";

/**
 * Distribución por Canal — Bubble Cluster Chart
 * Reemplaza la dona estática por un gráfico de burbujas proporcionales ("Streams Sources" style)
 * con agrupamiento orgánico, gradientes vibrantes y tooltip interactivo.
 */
export function OverviewCanalDistribution({ kpi }: { kpi: KpiGenerales }) {
  const llamadas = kpi.total_llamadas || 0;
  const whatsapp = kpi.total_whatsapp_conversaciones || 0;
  const totalLeads = kpi.total_leads || 0;
  const directLeads = Math.max(0, totalLeads - (llamadas + whatsapp));

  let data: BubbleItem[] = [];

  if (kpi.por_origen && kpi.por_origen.filter((o) => o.value > 0).length > 1) {
    data = kpi.por_origen
      .filter((o) => o.value > 0)
      .map((o) => ({ name: o.label, value: o.value }));
  } else {
    data = [
      { name: "Llamadas", value: llamadas },
      { name: "WhatsApp", value: whatsapp },
      ...(directLeads > 0 ? [{ name: "Campañas / Web", value: directLeads }] : []),
      { name: "Web Chat", value: 0 },
    ];
  }

  return (
    <BubbleClusterChart
      title="Distribución por Canal"
      subtitle="Este período"
      data={data}
      footerNote={
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#8a8f9d]">
          <Info className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
          Web tracking en desarrollo (disponible post-MVP)
        </p>
      }
    />
  );
}
