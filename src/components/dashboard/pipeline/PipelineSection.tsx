import React from "react";
import { getPipelineData } from "@/lib/actions/pipeline";
import { PipelineManager } from "./PipelineManager";
import type { AnalyticsFilters } from "@/lib/actions/analytics";

export function PipelineSkeleton() {
  return (
    <div className="w-full rounded-[32px] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl animate-pulse">
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white/5" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 rounded-lg bg-white/10" />
            <div className="h-3 w-64 rounded-lg bg-white/5" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-48 rounded-2xl bg-white/5" />
          <div className="h-10 w-10 rounded-2xl bg-white/5" />
        </div>
      </div>
      <div className="mt-6 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col min-w-[280px] w-full rounded-3xl border border-white/5 bg-white/[0.02] p-4 h-[420px]"
          >
            <div className="h-4 w-28 rounded-lg bg-white/10 mb-4" />
            <div className="space-y-3">
              <div className="h-24 w-full rounded-2xl bg-white/5" />
              <div className="h-24 w-full rounded-2xl bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function PipelineSection({
  from,
  to,
  isAdmin,
  filters,
}: {
  from?: string;
  to?: string;
  isAdmin: boolean;
  filters?: AnalyticsFilters;
}) {
  const result = await getPipelineData({
    from,
    to,
    campaign: filters?.campana,
  });

  if (!result.success || !result.tenantId) {
    return null;
  }

  return (
    <div className="w-full my-8">
      <PipelineManager
        initialStages={result.stages}
        initialLeads={result.leads}
        tenantId={result.tenantId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
