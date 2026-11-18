"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Target, Kanban, BarChart3, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabKey = "overview" | "pipeline" | "funnel" | "analytics" | "all";

interface TabItem {
  id: TabKey;
  label: string;
  icon: typeof LayoutDashboard;
  tag?: string;
}

const TABS: TabItem[] = [
  {
    id: "overview",
    label: "Resumen General",
    icon: LayoutDashboard,
  },
  {
    id: "pipeline",
    label: "Pipeline CRM",
    icon: Kanban,
    tag: "Leads",
  },
  {
    id: "funnel",
    label: "Embudo de Conversión",
    icon: Target,
  },
  {
    id: "analytics",
    label: "Analítica & Gráficos",
    icon: BarChart3,
  },
  {
    id: "all",
    label: "Vista Completa",
    icon: Eye,
  },
];

interface DashboardTabsProps {
  overviewSlot: ReactNode;
  summarySlot: ReactNode;
  pipelineSlot: ReactNode;
  funnelSlot: ReactNode;
  chartsSlot: ReactNode;
  initialTab?: TabKey;
}

export function DashboardTabs({
  overviewSlot,
  summarySlot,
  pipelineSlot,
  funnelSlot,
  chartsSlot,
  initialTab = "overview",
}: DashboardTabsProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const searchParams = useSearchParams();

  // Inicializar leyendo query param ?tab= o fallback al inicial
  const paramTab = searchParams?.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (paramTab && TABS.some((t) => t.id === paramTab)) {
      return paramTab;
    }
    return initialTab;
  });

  // Sincronizar si cambia el param en la URL externamente
  useEffect(() => {
    if (paramTab && TABS.some((t) => t.id === paramTab) && paramTab !== activeTab) {
      setActiveTab(paramTab);
    }
  }, [paramTab, activeTab]);

  function handleSelectTab(tabId: TabKey) {
    setActiveTab(tabId);
    try {
      const current = new URLSearchParams(searchParams ? searchParams.toString() : "");
      if (tabId === "overview") {
        current.delete("tab");
      } else {
        current.set("tab", tabId);
      }
      const search = current.toString();
      const query = search ? `?${search}` : "";
      window.history.replaceState(null, "", `${pathname}${query}`);
    } catch (e) {
      // Ignorar si el navegador restringe replaceState
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Linear / Vercel Charcoal Minimalist Segmented Tabs Bar ── */}
      <div className="relative flex flex-col gap-2 rounded-2xl border border-[#23252e] bg-[#121317] p-1.5 shadow-sm">
        <div className="custom-scrollbar no-scrollbar flex items-center gap-1 overflow-x-auto p-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                type="button"
                className={cn(
                  "group relative flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 select-none",
                  isActive
                    ? "bg-[#1c1d25] border border-[#2e313d] text-white shadow-sm"
                    : "border border-transparent text-[#8a8f9d] hover:bg-white/[0.04] hover:text-[#f4f4f5]"
                )}
                aria-selected={isActive}
                role="tab"
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-white" : "text-[#8a8f9d] group-hover:text-[#f4f4f5]"
                  )}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span>{tab.label}</span>

                {tab.tag && (
                  <span
                    className={cn(
                      "ml-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
                      isActive
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        : "bg-white/5 text-[#8a8f9d] group-hover:text-zinc-300"
                    )}
                  >
                    {tab.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content Panels ── */}
      <div className="transition-all duration-300">
        {/* Tab: Resumen General */}
        <div
          className={cn(
            "space-y-6 transition-all duration-300",
            activeTab === "overview" || activeTab === "all" ? "block" : "hidden"
          )}
        >
          {overviewSlot}
        </div>

        {/* Tab: Pipeline CRM */}
        <div
          className={cn(
            "space-y-6 transition-all duration-300",
            activeTab === "pipeline" || activeTab === "all" ? "block" : "hidden"
          )}
        >
          {pipelineSlot}
        </div>

        {/* Tab: Embudo de Conversión */}
        <div
          className={cn(
            "space-y-6 transition-all duration-300",
            activeTab === "funnel" || activeTab === "all" ? "block" : "hidden"
          )}
        >
          {funnelSlot}
        </div>

        {/* Tab: Analítica & Gráficos Detallados */}
        <div
          className={cn(
            "space-y-6 transition-all duration-300",
            activeTab === "analytics" || activeTab === "all" ? "block" : "hidden"
          )}
        >
          {summarySlot}
          {chartsSlot}
        </div>
      </div>
    </div>
  );
}
