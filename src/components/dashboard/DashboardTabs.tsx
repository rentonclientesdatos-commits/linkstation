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
      {/* ── Modern Futuristic Segmented Tabs Bar ── */}
      <div className="relative flex flex-col gap-3 rounded-[24px] border border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.65)] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-2.5">
        {/* Subtle cyan glow line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.3)] to-transparent" />

        <div className="custom-scrollbar no-scrollbar flex items-center gap-1.5 overflow-x-auto p-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                type="button"
                className={cn(
                  "group relative flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 select-none",
                  isActive
                    ? "border border-[rgba(0,229,255,0.35)] bg-gradient-to-r from-[rgba(0,229,255,0.16)] via-[rgba(0,229,255,0.08)] to-transparent text-[#00e5ff] shadow-[0_0_16px_rgba(0,229,255,0.2)]"
                    : "border border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-100"
                )}
                aria-selected={isActive}
                role="tab"
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-[#00e5ff]" : "text-slate-400 group-hover:text-slate-200"
                  )}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                <span>{tab.label}</span>

                {tab.tag && (
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase",
                      isActive
                        ? "bg-[#00e5ff]/20 text-[#00e5ff]"
                        : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-300"
                    )}
                  >
                    {tab.tag}
                  </span>
                )}

                {/* Active bottom micro-indicator */}
                {isActive && (
                  <span className="pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
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
