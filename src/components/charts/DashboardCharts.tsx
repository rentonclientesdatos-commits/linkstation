"use client";

import { ReactNode, cloneElement, isValidElement } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import type { ChartRow } from "@/lib/actions/analytics";
import { cn } from "@/lib/utils";

// Professional B2B SaaS color palette
const PALETTE = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Teal
  "#6366f1", // Indigo
  "#38bdf8", // Sky
];

import type { TooltipProps } from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipBar = ({ active, payload, label }: TooltipProps<number, string> | any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#272935] bg-[#16171d] px-3.5 py-2.5 text-xs shadow-xl">
      <p className="mb-0.5 font-medium text-[#8a8f9d]">{label}</p>
      <p className="font-bold text-white">
        {payload[0].value?.toLocaleString()} llamadas
      </p>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipPie = ({ active, payload }: TooltipProps<number, string> | any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#272935] bg-[#16171d] px-3.5 py-2.5 text-xs shadow-xl">
      <p className="font-medium text-[#8a8f9d]">{payload[0].name}</p>
      <p className="font-bold text-white">
        {payload[0].value?.toLocaleString()} ({payload[0].payload?.pct}%)
      </p>
    </div>
  );
};

function withPct(data: ChartRow[]) {
  const total = data.reduce((s, r) => s + r.value, 0);
  return data.map((r) => ({
    ...r,
    name: r.label,
    pct: total > 0 ? Math.round((r.value / total) * 100) : 0,
  }));
}

/* ── KPI Card ──────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function KpiCard({ label, value, sub, color = "text-slate-100" }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(0,229,255,0.1)] bg-[rgba(10,15,30,0.6)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 hover:border-[rgba(0,229,255,0.25)] hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]">
      <p className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-black tracking-tight", color)}>{value}</p>
      {sub && <p className="mt-1.5 text-xs font-semibold text-slate-500">{sub}</p>}
    </div>
  );
}

/* ── Dark Score Card (Total Leads Campañas) ───────────────── */
interface DarkScoreCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

export function DarkScoreCard({
  label,
  value,
  valueColor = "text-slate-100",
}: DarkScoreCardProps) {
  return (
    <div className="flex min-h-[105px] flex-col justify-center rounded-2xl border border-[rgba(0,229,255,0.12)] bg-[rgba(10,15,30,0.6)] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:border-[rgba(0,229,255,0.3)]">
      <div className="mb-2 text-[10px] font-black tracking-[0.2em] uppercase text-[#00e5ff] drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]">
        {label}
      </div>
      <div className={`text-2xl font-black tracking-tighter ${valueColor}`}>{value}</div>
    </div>
  );
}

/* ── Summary Card ──────────────────────────── */
interface SummaryCardProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}

export function SummaryCard({ label, value, sub, icon }: SummaryCardProps) {
  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#23252e] bg-[#121317] p-5 shadow-sm transition-all duration-200 hover:border-[#2e313d]">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-xs font-semibold tracking-wider text-[#8a8f9d] uppercase">
          {label}
        </p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#272935] bg-[#181920] text-zinc-300 transition-colors group-hover:border-[#3b82f6]/30 group-hover:text-white">
          {isValidElement(icon) ? (
            <div className="flex items-center justify-center">
              {cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: cn(
                  (icon as React.ReactElement<{ className?: string }>).props?.className,
                  "h-4 w-4"
                ),
              })}
            </div>
          ) : (
            icon
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          {value}
        </div>
        {sub && (
          <p className="mt-1 text-xs font-medium text-[#71717a]">{sub}</p>
        )}
      </div>

      {/* Subtle bottom sparkline curve accent (Linear / Modern SaaS style) */}
      <div className="pointer-events-none mt-3 -mx-5 -mb-5 h-6 overflow-hidden opacity-25 transition-opacity group-hover:opacity-40">
        <svg viewBox="0 0 100 25" preserveAspectRatio="none" className="h-full w-full">
          <path
            d="M0 20 Q 25 5, 50 15 T 100 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-500"
          />
        </svg>
      </div>
    </div>
  );
}

/* ── Horizontal Bar ────────────────────────── */
export function HorizontalBarChart({ title, data }: { title: string; data: ChartRow[] }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: -10, right: 20 }}>
          <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
            width={120}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltipBar />}
            cursor={{ fill: "rgba(59, 130, 246, 0.04)", radius: 4 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ── Vertical Bar ──────────────────────────── */
// Sprint 2B mejora UX (Bloque A feedback 25-05):
//  - cada barra con color distinto (Cell + PALETTE)
//  - barSize dinámico (más anchas cuando hay pocas categorías)
//  - leyenda lateral con label + color (LegendList custom)
//  - animación de entrada gestionada por Recharts (isAnimationActive).
export function VerticalBarChart({ title, data }: { title: string; data: ChartRow[] }) {
  // barSize dinámico: 1-3 categorías → 56px, 4-6 → 36px, 7+ → 22px.
  const dynamicBarSize = data.length <= 3 ? 56 : data.length <= 6 ? 36 : 22;
  return (
    <ChartCard title={title}>
      <div className="flex h-full min-h-[260px] gap-3">
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, bottom: 40, left: -20 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltipBar />}
                cursor={{ fill: "rgba(81, 162, 177, 0.05)", radius: 4 }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                barSize={dynamicBarSize}
                isAnimationActive={true}
                animationBegin={120}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={`v-bar-${i}`} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="hidden w-[140px] shrink-0 flex-col gap-1.5 overflow-y-auto py-2 pr-1 text-xs lg:flex">
          {data.map((row, i) => (
            <li key={`v-bar-legend-${i}`} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span
                className="text-muted-foreground truncate text-[11px] font-medium"
                title={row.label}
              >
                {row.label}
              </span>
              <span className="text-card-foreground ml-auto text-[11px] font-bold tabular-nums">
                {row.value.toLocaleString("es-ES")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

/* ── Pie / Donut ───────────────────────────── */
export function DonutChart({
  title,
  data,
  centerLabel,
  isDonut = true,
}: {
  title: string;
  data: ChartRow[];
  centerLabel?: string;
  isDonut?: boolean;
}) {
  const pie = withPct(data);
  const total = data.reduce((s, r) => s + r.value, 0);

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <PieChart>
          <Pie
            data={pie}
            cx="50%"
            cy="50%"
            innerRadius={isDonut ? 75 : 0}
            outerRadius={100}
            paddingAngle={isDonut ? 3 : 0}
            dataKey="value"
            nameKey="name"
            stroke={isDonut ? "transparent" : "#ffffff"}
            strokeWidth={2}
          >
            {pie.map((_, i) => (
              <Cell key={`cell-${i}`} fill={PALETTE[i % PALETTE.length]} radius={4} />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltipPie />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            iconSize={8}
            formatter={(val) => (
              <span className="text-muted-foreground ml-1 text-xs font-bold">{val}</span>
            )}
          />
          {isDonut && centerLabel && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-card-foreground font-black"
              fontSize={24}
            >
              {centerLabel === "total" ? total.toLocaleString() : centerLabel}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ── Area Chart ────────────────────────────── */
export function AreaChartComponent({ title, data }: { title: string; data: ChartRow[] }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v === 0 ? "0" : v)}
          />
          <Tooltip
            content={<CustomTooltipBar />}
            cursor={{ stroke: "rgba(59, 130, 246, 0.1)", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Valor"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            dot={{ r: 4, fill: "white", stroke: "#2563eb", strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ── Funnel Chart ──────────────────────────── */
export function FunnelChartComponent({
  title,
  data,
  effectiveness,
}: {
  title: string;
  data: ChartRow[];
  effectiveness?: number;
}) {
  // Custom colors matching the image
  const colors = ["#1e60c3", "#69a1e0", "#5eaa6b", "#81c17b", "#d2dce9"];

  return (
    <ChartCard title={title}>
      {effectiveness !== undefined && (
        <div className="absolute top-6 right-7 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 shadow-sm">
          Efectividad: {effectiveness.toFixed(1)}%
        </div>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <FunnelChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }} style={{ background: 'transparent' }}>
          <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "transparent" }} />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList
              position="center"
              fill="#ffffff"
              stroke="none"
              dataKey="displayLabel"
              style={
                {
                  fontWeight: "bold",
                  fontSize: "13px",
                  textShadow: "0px 1px 2px rgba(0,0,0,0.5)",
                } as React.CSSProperties
              }
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ── Heatmap Chart (Calendar Density) ───────── */
export function HeatmapChartComponent({
  title,
  data = [],
}: {
  title: string;
  data?: { day: number; hour: number; value: number }[];
}) {
  const days = ["D", "L", "M", "X", "J", "V", "S"]; // Sunday to Saturday (standard JS Date.getDay)

  // Pre-calculate max value for normalization
  const maxVal = data && data.length > 0 ? Math.max(...data.map((d) => d.value), 1) : 1;

  return (
    <ChartCard title={title}>
      <div className="flex w-full flex-col gap-1 overflow-hidden">
        {/* Hours Labels */}
        <div className="mb-2 flex pr-1 pl-6 text-[9px] font-black tracking-tighter text-slate-400 uppercase">
          <div className="flex-1 text-left">12a</div>
          <div className="flex-1 text-center">6a</div>
          <div className="flex-1 text-center">12p</div>
          <div className="flex-1 text-center">6p</div>
          <div className="flex-1 text-right">11p</div>
        </div>

        {days.map((dayLabel, dIdx) => (
          <div key={`${dayLabel}-${dIdx}`} className="flex w-full items-center gap-2">
            <div className="w-4 shrink-0 text-center text-[10px] font-black text-slate-400 uppercase dark:text-slate-500">
              {dayLabel}
            </div>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px] sm:gap-[4px]">
              {Array.from({ length: 24 }).map((_, hIdx) => {
                const entry = data.find((item) => item.day === dIdx && item.hour === hIdx);
                const val = entry?.value || 0;

                // Color ramp: Very light grey/blue for 0, then scales to deep indigo
                const intensity = val === 0 ? 0 : val / maxVal;

                // Map intensity to discrete Tailwind opacity classes to avoid dynamic style prop
                const opacityClass =
                  val === 0
                    ? "opacity-100"
                    : intensity > 0.8
                      ? "opacity-100"
                      : intensity > 0.6
                        ? "opacity-80"
                        : intensity > 0.4
                          ? "opacity-60"
                          : intensity > 0.2
                            ? "opacity-40"
                            : "opacity-20";

                return (
                  <div
                    key={`${dIdx}-${hIdx}`}
                    className={cn(
                      "h-2 rounded-sm transition-all duration-300 sm:h-3",
                      val === 0 ? "bg-slate-100/30 dark:bg-slate-800/20" : "bg-blue-600",
                      opacityClass
                    )}
                    title={`${val} llamadas a las ${hIdx}:00`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── Chart Card wrapper (Linear Minimalist) ────────────────────── */
function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#23252e] bg-[#121317] p-6 shadow-sm transition-all duration-200 hover:border-[#2e313d]">
      <h3 className="mb-5 text-xs font-semibold tracking-wider uppercase text-[#8a8f9d]">
        {title}
      </h3>
      <div className="min-h-[260px] flex-1">{children}</div>
    </div>
  );
}

/* ── Skeleton ──────────────────────────────── */
export function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#23252e] bg-[#121317] p-6 shadow-sm">
      <div className="mb-5 h-4 w-40 rounded-lg bg-white/5" />
      <div className="h-[220px] rounded-xl bg-white/[0.02]" />
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#23252e] bg-[#121317] p-5 shadow-sm">
      <div className="h-3 w-24 rounded-lg bg-white/5" />
      <div className="mt-4 h-9 w-20 rounded-xl bg-white/[0.04]" />
      <div className="mt-3 h-3 w-32 rounded-lg bg-white/[0.02]" />
    </div>
  );
}
