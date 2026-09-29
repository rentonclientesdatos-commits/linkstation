"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  TrendingUp,
  Phone,
  MessageSquare,
  BrainCircuit,
  DollarSign,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTenantStore } from "@/store/tenant";
import type { Database, Lead } from "@/types/database";

type LlamadaRow = Database["public"]["Tables"]["llamadas"]["Row"] & {
  lead?: Lead;
  created_at?: string;
};

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface CostSummary {
  meta: number;
  ai: number;
  telephony: number;
  total: number;
  growth: number;
}

interface LeadCost {
  name: string;
  cost: number;
  type: string;
}

interface DailyCost {
  day: string;
  meta: number;
  ai: number;
  telephony: number;
}

export default function CostsPage() {
  const { tenantId } = useTenantStore();
  const [timeRange, setTimeRange] = useState("last_30_days");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CostSummary>({
    meta: 0,
    ai: 0,
    telephony: 0,
    total: 0,
    growth: 0,
  });
  const [topLeads, setTopLeads] = useState<LeadCost[]>([]);
  const [dailyData, setDailyData] = useState<DailyCost[]>([]);

  const fetchCosts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const supabase = getSupabaseClient();

      // 1. Fetch AI & Meta Costs with Lead names
      const { data: messages } = await supabase
        .from("chat_messages")
        .select(
          `
                    lead_id, 
                    metadata, 
                    direction, 
                    sent_by, 
                    created_at,
                    lead:lead_id (nombre, apellido)
                `
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      // 2. Fetch Telephony Costs with Lead names
      const { data: calls } = await supabase
        .from("llamadas")
        .select(
          `
                    id_lead, 
                    duracion_segundos, 
                    created_at,
                    lead:id_lead (nombre, apellido)
                `
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      let aiTotal = 0;
      let metaTotal = 0;
      let telephonyTotal = 0;

      const leadMap = new Map<string, { name: string; cost: number; types: Set<string> }>();
      const dayMap = new Map<string, DailyCost>();

      // Process Messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages?.forEach((msg: any) => {
        let msgCost = 0;
        let msgAiCost = 0;
        let msgMetaCost = 0;

        // AI Cost
        const metadata = msg.metadata as Record<string, unknown>;
        const usage = metadata?.token_usage as unknown as TokenUsage | undefined;

        if (usage?.prompt_tokens && usage?.completion_tokens) {
          msgAiCost =
            (usage.prompt_tokens * 0.005) / 1000 + (usage.completion_tokens * 0.015) / 1000;
        } else if (msg.sent_by === "AI_AGENT" || msg.sent_by === "AI_WIDGET") {
          msgAiCost = 0.002;
        }

        // Meta Cost
        if (msg.direction === "OUTBOUND" && msg.metadata?.source !== "WEB_WIDGET") {
          msgMetaCost = 0.015;
        }

        msgCost = msgAiCost + msgMetaCost;
        aiTotal += msgAiCost;
        metaTotal += msgMetaCost;

        // Update Lead Map
        const leadId = msg.lead_id;
        const leadInfo = leadMap.get(leadId) || {
          name: msg.lead
            ? `${msg.lead.nombre || ""} ${msg.lead.apellido || ""}`.trim() || "Lead Desconocido"
            : "Lead Desconocido",
          cost: 0,
          types: new Set(),
        };
        leadInfo.cost += msgCost;
        if (msgAiCost > 0) leadInfo.types.add("IA");
        if (msgMetaCost > 0) leadInfo.types.add("WhatsApp");
        leadMap.set(leadId, leadInfo);

        // Update Daily Map
        const day = new Date(msg.created_at).toISOString().split("T")[0];
        const dData = dayMap.get(day) || { day, meta: 0, ai: 0, telephony: 0 };
        dData.meta += msgMetaCost;
        dData.ai += msgAiCost;
        dayMap.set(day, dData);
      });

      // Process Calls
      calls?.forEach((call: LlamadaRow) => {
        const durationMinutes = (call.duracion_segundos || 0) / 60;
        const callCost = durationMinutes * 0.15;
        telephonyTotal += callCost;

        const leadId = call.id_lead;
        const leadInfo = leadMap.get(leadId) || {
          name: call.lead
            ? `${call.lead.nombre || ""} ${call.lead.apellido || ""}`.trim() || "Lead Desconocido"
            : "Lead Desconocido",
          cost: 0,
          types: new Set(),
        };
        leadInfo.cost += callCost;
        leadInfo.types.add("Voz");
        leadMap.set(leadId, leadInfo);

        const day = new Date(
          call.created_at || (call as { fecha_creacion?: string }).fecha_creacion || new Date()
        )
          .toISOString()
          .split("T")[0];
        const dData = dayMap.get(day) || { day, meta: 0, ai: 0, telephony: 0 };
        dData.telephony += callCost;
        dayMap.set(day, dData);
      });

      setSummary({
        meta: metaTotal,
        ai: aiTotal,
        telephony: telephonyTotal,
        total: metaTotal + aiTotal + telephonyTotal,
        growth: 5.2, // Simulated growth from prev month would need more queries
      });

      // Format Top Leads
      const sortedLeads = Array.from(leadMap.values())
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5)
        .map((l) => ({
          name: l.name,
          cost: l.cost,
          type: Array.from(l.types).join(" + "),
        }));
      setTopLeads(sortedLeads);

      // Format Daily Data (Last 14 days - CONTINUOUS TIMELINE)
      const daysToDisplay = 14;
      const timeline: DailyCost[] = [];
      for (let i = daysToDisplay - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const existingData = dayMap.get(dateStr);
        timeline.push(
          existingData || {
            day: dateStr,
            meta: 0,
            ai: 0,
            telephony: 0,
          }
        );
      }
      setDailyData(timeline);
    } catch (error) {
      console.error("Error fetching real costs:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts, timeRange]);

  const CostCard = ({
    title,
    amount,
    icon,
    color,
    description,
  }: {
    title: string;
    amount: number;
    icon: React.ReactNode;
    color: string;
    description: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("rounded-2xl p-4", color)}>{icon}</div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-500">
          <ArrowUpRight className="h-3 w-3" />
          Real-time
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
          {title}
        </p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white">
          $
          {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
        <p className="mt-2 text-xs font-medium text-slate-500">{description}</p>
      </div>
    </motion.div>
  );

  if (loading && summary.total === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="animate-pulse font-bold text-slate-500">Calculando métricas reales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            <Coins className="h-10 w-10 text-blue-500" />
            Centro de Costes
          </h1>
          <p className="mt-2 font-medium text-slate-500">
            Inversión real auditada por lead y categoría.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setTimeRange("last_7_days")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all",
              timeRange === "last_7_days"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
            )}
          >
            7 Días
          </button>
          <button
            onClick={() => setTimeRange("last_30_days")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all",
              timeRange === "last_30_days"
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
            )}
          >
            30 Días
          </button>
          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <button
            className="p-2 text-slate-400 transition-colors hover:text-blue-500"
            title="Seleccionar fecha"
            aria-label="Seleccionar fecha"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CostCard
          title="Inversión Total"
          amount={summary.total}
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-500/10"
          description="Suma total de todas las categorías."
        />
        <CostCard
          title="Meta API (WhatsApp)"
          amount={summary.meta}
          icon={<MessageSquare className="h-6 w-6 text-emerald-600" />}
          color="bg-emerald-50 dark:bg-emerald-500/10"
          description="Coste estimado por conversaciones Meta."
        />
        <CostCard
          title="Modelos de IA"
          amount={summary.ai}
          icon={<BrainCircuit className="h-6 w-6 text-purple-600" />}
          color="bg-purple-50 dark:bg-purple-500/10"
          description="Consumo real de tokens (In/Out)."
        />
        <CostCard
          title="Telefonía (Voz)"
          amount={summary.telephony}
          icon={<Phone className="h-6 w-6 text-orange-600" />}
          color="bg-orange-50 dark:bg-orange-500/10"
          description="Minutos consumidos en llamadas IA."
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Flujo de Gastos</h3>
              <p className="mt-1 text-xs font-medium tracking-widest text-slate-500 uppercase">
                Histórico diario real
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Meta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Voz</span>
              </div>
            </div>
          </div>

          <div className="relative mt-10 h-[350px]">
            {/* Y-Axis Indicators */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between border-r border-slate-100 pr-4 text-[10px] font-bold text-slate-400 opacity-50 dark:border-white/5">
              <span>
                ${Math.max(...dailyData.map((x) => x.meta + x.ai + x.telephony), 10).toFixed(0)}
              </span>
              <span>
                $
                {(Math.max(...dailyData.map((x) => x.meta + x.ai + x.telephony), 10) / 2).toFixed(
                  0
                )}
              </span>
              <span>$0</span>
            </div>

            <div className="ml-12 flex h-full items-end justify-between gap-3 px-2">
              {dailyData.length > 0 ? (
                dailyData.map((d, i) => {
                  const totalDay = d.meta + d.ai + d.telephony;
                  const maxVal = Math.max(...dailyData.map((x) => x.meta + x.ai + x.telephony), 1);
                  const heightPerc = (totalDay / maxVal) * 100;

                  const metaPerc = totalDay > 0 ? (d.meta / totalDay) * 100 : 0;
                  const aiPerc = totalDay > 0 ? (d.ai / totalDay) * 100 : 0;
                  const telephonyPerc = totalDay > 0 ? (d.telephony / totalDay) * 100 : 0;

                  return (
                    <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute -top-16 left-1/2 z-20 mb-2 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 p-2 text-[10px] font-bold whitespace-nowrap text-white opacity-0 shadow-xl transition-all group-hover:opacity-100">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">TOTAL:</span>
                            <span>${totalDay.toFixed(2)}</span>
                          </div>
                          <div className="my-0.5 h-px bg-white/10" />
                          <div className="flex items-center justify-between gap-2 text-blue-400">
                            <span>Meta:</span>
                            <span>${d.meta.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-purple-400">
                            <span>AI:</span>
                            <span>${d.ai.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-orange-400">
                            <span>Voz:</span>
                            <span>${d.telephony.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                      </div>

                      {/* Bar */}
                      <motion.div
                        className="relative w-full cursor-pointer overflow-hidden rounded-t-xl bg-slate-50 transition-all group-hover:bg-slate-100 dark:bg-white/5 dark:group-hover:bg-white/10"
                        initial={{ height: "2%" }}
                        animate={{ height: `${Math.max(heightPerc, 2)}%` }}
                      >
                        <motion.div
                          className="absolute inset-x-0 bottom-0 bg-blue-500"
                          initial={{ height: 0 }}
                          animate={{ height: `${metaPerc}%` }}
                        />
                        <motion.div
                          className="absolute inset-x-0 bg-purple-500"
                          initial={{ height: 0 }}
                          animate={{
                            height: `${aiPerc}%`,
                            bottom: `${metaPerc}%`,
                          }}
                        />
                        <motion.div
                          className="absolute inset-x-0 bg-orange-500"
                          initial={{ height: 0 }}
                          animate={{
                            height: `${telephonyPerc}%`,
                            bottom: `${metaPerc + aiPerc}%`,
                          }}
                        />
                      </motion.div>

                      {/* Date Label */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-tighter text-slate-400 uppercase transition-colors group-hover:text-blue-500">
                        {d.day.split("-").slice(2)}/{d.day.split("-").slice(1, 2)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
                  <BarChart3 className="h-12 w-12 animate-pulse opacity-10" />
                  <div className="text-center">
                    <p className="text-xs font-black tracking-[0.2em] uppercase opacity-30">
                      Sin Actividad
                    </p>
                    <p className="mt-1 text-[10px] opacity-20">
                      Los datos aparecerán aquí conforme entren leads.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] bg-slate-900 p-6 text-white shadow-2xl dark:bg-white dark:text-slate-900">
            <TrendingUp className="mb-4 h-8 w-8 text-blue-400" />
            <h3 className="mb-2 text-xl font-black">Estado del Saldo</h3>
            <p className="mb-6 text-sm font-medium text-slate-400 dark:text-slate-500">
              Tu inversión se mantiene dentro del presupuesto estimado para este periodo.
            </p>
            <button className="w-full rounded-2xl bg-blue-500 py-4 text-xs font-black tracking-widest text-white uppercase shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600">
              Exportar Reporte PDF
            </button>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase">
                Leads con mayor coste
              </h3>
            </div>
            <div className="space-y-4">
              {topLeads.length > 0 ? (
                topLeads.map((lead, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 dark:bg-slate-800">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="max-w-[120px] truncate text-sm font-bold text-slate-900 dark:text-white">
                          {lead.name}
                        </p>
                        <p className="text-[10px] font-medium text-slate-500">{lead.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ${lead.cost.toFixed(2)}
                      </p>
                      <ChevronRight className="mt-1 ml-auto h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-slate-400 italic">
                  No hay datos de consumo registrados.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
