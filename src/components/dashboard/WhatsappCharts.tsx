"use client";

import type { KpiWhatsapp } from "@/lib/actions/analytics";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ─── PALETTE ──────────────────────────────────────────────────────────────────

const PALETTE = [
  "#25d366",
  "#128c7e",
  "#075e54",
  "#34b7f1",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

// ─── TOOLTIPS ─────────────────────────────────────────────────────────────────

interface TooltipEntry {
  value: number;
  name?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function TooltipConv({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3 text-xs shadow-xl">
      <p className="text-card-foreground mb-1 font-bold">{label}</p>
      <p className="font-black text-green-600 dark:text-green-400">
        {payload[0].value?.toLocaleString("es-ES")} conversaciones
      </p>
    </div>
  );
}

function TooltipBar({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3 text-xs shadow-xl">
      <p className="text-card-foreground mb-1 font-bold">{label}</p>
      <p className="font-black text-emerald-600 dark:text-emerald-400">
        {payload[0].value?.toLocaleString("es-ES")}
      </p>
    </div>
  );
}

function TooltipPie({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3 text-xs shadow-xl">
      <p className="text-card-foreground font-bold">{payload[0].name}</p>
      <p className="font-black text-emerald-600 dark:text-emerald-400">
        {payload[0].value?.toLocaleString("es-ES")}
      </p>
    </div>
  );
}

// ─── CHART CARD ───────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[rgba(0,229,255,0.08)] bg-[rgba(10,15,30,0.6)] p-7 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 hover:border-[rgba(0,229,255,0.2)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.25)] to-transparent" />
      <h3 className="mb-6 text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-muted-foreground/50 flex h-[200px] items-center justify-center text-sm font-bold">
      Sin datos para el período seleccionado
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

interface Props {
  data: KpiWhatsapp;
}

export function WhatsappCharts({ data }: Props) {
  const { conversaciones_por_dia, por_estado_conversacion, por_tipo_lead, por_origen } = data;

  // Format X-axis dates
  const diasFmt = conversaciones_por_dia.map((r) => ({
    ...r,
    label: r.label.slice(5).replace("-", "/"),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Conversaciones por día – Área full width */}
      <div className="lg:col-span-2">
        <ChartCard title="Conversaciones WhatsApp por Día">
          {diasFmt.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={diasFmt} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="wpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25d366" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#25d366" stopOpacity={0} />
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
                <Tooltip content={<TooltipConv />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Conversaciones"
                  stroke="#25d366"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#wpGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 4. Estado de conversación – barras verticales */}
      <ChartCard title="Estado de Conversación">
        {por_estado_conversacion.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={por_estado_conversacion}
              margin={{ top: 10, right: 8, bottom: 50, left: 0 }}
            >
              <defs>
                <linearGradient id="estConvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#128c7e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#128c7e" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "currentColor", fontSize: 9, fontWeight: 600 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 10, fontWeight: 700 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<TooltipBar />}
                cursor={{ fill: "rgba(18,140,126,0.04)", radius: 8 }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80} fill="url(#estConvGrad)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 5. Tipo Lead – donut */}
      <ChartCard title="Tipo de Lead (WhatsApp)">
        {por_tipo_lead.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={por_tipo_lead.map((r) => ({ ...r, name: r.label }))}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="#ffffff"
                strokeWidth={3}
              >
                {por_tipo_lead.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<TooltipPie />} />
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
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 6. Por origen – barras horizontales */}
      <ChartCard title="Leads por Origen (WhatsApp)">
        {por_origen.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={por_origen} layout="vertical" margin={{ left: 8, right: 16 }}>
              <defs>
                <linearGradient id="origenWp" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
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
                cursor={{ fill: "rgba(99,102,241,0.04)", radius: 8 }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#origenWp)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
