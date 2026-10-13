"use client";

import type { KpiCampanas, CampanaRow } from "@/lib/actions/analytics";
import { formatDuration, cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ─── PALETTE ──────────────────────────────────────────────────────────────────

const PALETTE_CLASSES = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#8b5cf6]",
  "bg-[#10b981]",
  "bg-[#f59e0b]",
  "bg-[#ef4444]",
  "bg-[#ec4899]",
];

// ─── TOOLTIPS ─────────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; color?: string; name?: string }>;
  label?: string;
}

function TooltipLead({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3 text-xs shadow-xl">
      <p className="text-card-foreground mb-1 font-bold">{label}</p>
      <p className="text-primary font-black">{payload[0].value?.toLocaleString("es-ES")} leads</p>
    </div>
  );
}

function TooltipBar({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3 text-xs shadow-xl">
      <p className="text-card-foreground mb-1 font-bold">{label}</p>
      <p className="text-primary font-black">{payload[0].value?.toLocaleString("es-ES")}</p>
    </div>
  );
}

// ─── CHART CARD ───────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border bg-card rounded-3xl border p-7 shadow-sm">
      <h3 className="text-muted-foreground mb-6 text-sm font-black tracking-widest uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-muted-foreground/40 flex h-[200px] items-center justify-center text-sm font-bold">
      Sin datos para el período seleccionado
    </div>
  );
}

// ─── TABLA MAESTRA DE CAMPAÑAS ────────────────────────────────────────────────

function CampanasTable({ campanas }: { campanas: CampanaRow[] }) {
  if (campanas.length === 0) return <Empty />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-border border-b">
            {[
              "Campaña",
              "Leads",
              "Llamadas",
              "Contactados",
              "Tasa %",
              "Minutos",
              "Dur. Media",
              "Cualificados",
              "Agendados",
            ].map((h) => (
              <th
                key={h}
                className="text-muted-foreground pr-4 pb-3 text-left text-[10px] font-black tracking-widest whitespace-nowrap uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border/50 divide-y">
          {campanas.map((c, i) => (
            <tr key={c.nombre} className="hover:bg-muted/50 transition-colors">
              <td className="text-card-foreground max-w-[160px] truncate py-3 pr-4 font-bold">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 flex-shrink-0 rounded-full",
                      PALETTE_CLASSES[i % PALETTE_CLASSES.length]
                    )}
                  />
                  {c.nombre}
                </div>
              </td>
              <td className="text-card-foreground py-3 pr-4 font-black">
                {c.total_leads.toLocaleString("es-ES")}
              </td>
              <td className="text-muted-foreground py-3 pr-4">
                {c.total_llamadas.toLocaleString("es-ES")}
              </td>
              <td className="py-3 pr-4 font-bold text-emerald-600 dark:text-emerald-400">
                {c.contactados.toLocaleString("es-ES")}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                    c.tasa_contacto >= 60
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : c.tasa_contacto >= 30
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {c.tasa_contacto}%
                </span>
              </td>
              <td className="text-primary py-3 pr-4 font-bold">
                {formatDuration(c.total_segundos)}
              </td>
              <td className="text-muted-foreground/80 py-3 pr-4">
                {formatDuration(c.duracion_media_seg)}
              </td>
              <td className="py-3 pr-4 font-bold text-violet-600 dark:text-violet-400">
                {c.cualificados.toLocaleString("es-ES")}
              </td>
              <td className="py-3 pr-4 font-bold text-teal-600 dark:text-teal-400">
                {c.agendados.toLocaleString("es-ES")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

interface Props {
  data: KpiCampanas;
}

export function CampanasCharts({ data }: Props) {
  const {
    campanas,
    leads_por_campana,
    contactados_por_campana,
    cualif_por_campana,
    agendados_por_campana,
    minutos_por_campana,
    leads_por_dia,
  } = data;

  const diasFmt = leads_por_dia.map((r) => ({
    ...r,
    label: r.label.slice(5).replace("-", "/"),
  }));

  return (
    <div className="space-y-6">
      {/* Tabla maestra */}
      <ChartCard title="Desempeño por Campaña">
        <CampanasTable campanas={campanas} />
      </ChartCard>

      {/* Gráficos en grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Leads por día – Área fullwidth */}
        <div className="lg:col-span-2">
          <ChartCard title="Evolución de Leads por Día">
            {diasFmt.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={diasFmt} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="campGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="text-border"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TooltipLead />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Leads"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#campGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* 2. Leads por campaña – barras horiz */}
        <ChartCard title="Leads por Campaña">
          {leads_por_campana.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leads_por_campana} layout="vertical" margin={{ left: 8, right: 16 }}>
                <defs>
                  <linearGradient id="leadsGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                  className="text-card-foreground"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<TooltipBar />}
                  cursor={{ fill: "rgba(59,130,246,0.04)", radius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#leadsGrad)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 3. Contactados por campaña */}
        <ChartCard title="Contactados por Campaña">
          {contactados_por_campana.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={contactados_por_campana}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <defs>
                  <linearGradient id="contGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                  className="text-card-foreground"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<TooltipBar />}
                  cursor={{ fill: "rgba(16,185,129,0.04)", radius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#contGrad)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 4. Cualificados por campaña */}
        <ChartCard title="Cualificados por Campaña">
          {cualif_por_campana.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cualif_por_campana} layout="vertical" margin={{ left: 8, right: 16 }}>
                <defs>
                  <linearGradient id="cualGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                  className="text-card-foreground"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<TooltipBar />}
                  cursor={{ fill: "rgba(139,92,246,0.04)", radius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#cualGrad)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5. Agendados por campaña */}
        <ChartCard title="Agendados por Campaña">
          {agendados_por_campana.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={agendados_por_campana}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <defs>
                  <linearGradient id="agGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                  className="text-card-foreground"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<TooltipBar />}
                  cursor={{ fill: "rgba(14,165,233,0.04)", radius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#agGrad)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 6. Minutos por campaña – fullwidth */}
        <div className="lg:col-span-2">
          <ChartCard title="Minutos IA por Campaña">
            {minutos_por_campana.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={minutos_por_campana}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                >
                  <defs>
                    <linearGradient id="minCampGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatDuration(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
                    className="text-card-foreground"
                    width={110}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<TooltipBar />}
                    cursor={{ fill: "rgba(245,158,11,0.04)", radius: 8 }}
                    formatter={(v: any) => formatDuration(Number(v) || 0)}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={32}
                    fill="url(#minCampGrad)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
