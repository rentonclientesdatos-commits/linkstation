"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface BubbleItem {
  name: string;
  value: number;
  pct?: number;
  color?: string;
  secondaryColor?: string;
}

export const BUBBLE_PALETTE = [
  {
    name: "coral",
    solid: "#ff4b4b",
    gradient: ["#ff6363", "#e11d48"],
    glow: "rgba(244, 63, 94, 0.45)",
    legendText: "#ff6363",
  },
  {
    name: "magenta",
    solid: "#a81d6d",
    gradient: ["#d946ef", "#831843"],
    glow: "rgba(217, 70, 239, 0.45)",
    legendText: "#d946ef",
  },
  {
    name: "amber",
    solid: "#f59e0b",
    gradient: ["#fbbf24", "#ea580c"],
    glow: "rgba(245, 158, 11, 0.45)",
    legendText: "#f59e0b",
  },
  {
    name: "purple",
    solid: "#7c3aed",
    gradient: ["#8b5cf6", "#4c1d95"],
    glow: "rgba(139, 92, 246, 0.45)",
    legendText: "#a78bfa",
  },
  {
    name: "cyan",
    solid: "#00e5ff",
    gradient: ["#38bdf8", "#0284c7"],
    glow: "rgba(0, 229, 255, 0.45)",
    legendText: "#38bdf8",
  },
  {
    name: "emerald",
    solid: "#10b981",
    gradient: ["#34d399", "#047857"],
    glow: "rgba(16, 185, 129, 0.45)",
    legendText: "#34d399",
  },
];

// Deterministic layout positions based on bubble count (replicates "Streams Sources" organic cluster)
const CLUSTER_LAYOUTS: Record<number, { cx: number; cy: number }[]> = {
  1: [{ cx: 190, cy: 100 }],
  2: [
    { cx: 140, cy: 100 },
    { cx: 240, cy: 100 },
  ],
  3: [
    { cx: 130, cy: 100 },
    { cx: 215, cy: 75 },
    { cx: 265, cy: 125 },
  ],
  4: [
    { cx: 112, cy: 100 }, // Largest bubble (left center)
    { cx: 198, cy: 68 },  // 2nd bubble (top right of bubble 0)
    { cx: 288, cy: 102 }, // 3rd bubble (far right)
    { cx: 220, cy: 148 }, // 4th bubble (bottom center-right)
  ],
  5: [
    { cx: 110, cy: 98 },
    { cx: 196, cy: 66 },
    { cx: 288, cy: 98 },
    { cx: 224, cy: 150 },
    { cx: 80, cy: 150 },
  ],
  6: [
    { cx: 110, cy: 95 },
    { cx: 194, cy: 64 },
    { cx: 288, cy: 95 },
    { cx: 232, cy: 152 },
    { cx: 155, cy: 162 },
    { cx: 72, cy: 68 },
  ],
};

interface BubbleClusterChartProps {
  title?: string;
  subtitle?: string;
  data: BubbleItem[];
  className?: string;
  footerNote?: React.ReactNode;
  height?: number;
}

export function BubbleClusterChart({
  title = "Distribución por Canal",
  subtitle = "Este mes",
  data,
  className,
  footerNote,
  height = 210,
}: BubbleClusterChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute total
  const rawTotal = data.reduce((s, r) => s + (r.value > 0 ? r.value : 0), 0);
  const total = rawTotal > 0 ? rawTotal : 0;

  // Separate active items (value > 0) sorted descending for natural cluster hierarchy
  const activeData = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // If there are active items, render active bubbles. If none, keep data for empty display.
  const sourceItems = activeData.length > 0 ? activeData.slice(0, 6) : data.slice(0, 4);

  const items = sourceItems.map((d, i) => {
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    const colorScheme = BUBBLE_PALETTE[i % BUBBLE_PALETTE.length];
    return {
      ...d,
      pct,
      color: d.color || colorScheme.solid,
      gradient: colorScheme.gradient,
      glow: colorScheme.glow,
      legendText: colorScheme.legendText,
    };
  });

  const count = items.length;
  const layout = CLUSTER_LAYOUTS[count] || CLUSTER_LAYOUTS[4];

  // Dynamic radius scaling based on sqrt of value (proportional circle area)
  const maxVal = Math.max(...items.map((it) => it.value), 1);
  const minR = count <= 2 ? 38 : count <= 4 ? 26 : 22;
  const maxR = count <= 2 ? 68 : count <= 4 ? 60 : 52;

  const circles = items.map((item, i) => {
    const pos = layout[i] || { cx: 190, cy: 100 };
    // Ratio between 0.15 and 1 so smaller bubbles stay pleasantly readable
    const sqrtRatio =
      item.value > 0 ? Math.sqrt(item.value) / Math.sqrt(maxVal) : 0;
    const r =
      item.value > 0
        ? Math.round(minR + sqrtRatio * (maxR - minR))
        : 0;

    return {
      ...item,
      cx: pos.cx,
      cy: pos.cy,
      r,
    };
  });

  const activeCircle =
    hoveredIdx !== null && circles[hoveredIdx]?.r > 0 ? circles[hoveredIdx] : null;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-[#23252e] bg-[#121317] p-6 shadow-sm transition-all duration-300 hover:border-[#2e313d]",
        className
      )}
    >
      {/* Top Header: Title (left) & Subtitle / Period (right) */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
        {subtitle && (
          <span className="text-xs font-medium text-[#8a8f9d]">{subtitle}</span>
        )}
      </div>

      {/* Bubble Chart Canvas Area */}
      <div className="relative flex flex-1 items-center justify-center py-2">
        {total === 0 && items.every((it) => it.value === 0) ? (
          <div className="flex h-[180px] flex-col items-center justify-center text-center">
            <p className="text-xs text-[#8a8f9d]">Sin datos en el período seleccionado</p>
          </div>
        ) : (
          <div className="relative w-full">
            {/* SVG Visual Graphic */}
            <svg
              viewBox="0 0 380 200"
              className="h-auto w-full select-none overflow-visible"
              style={{ maxHeight: height }}
            >
              <defs>
                {circles.map((c, i) => (
                  <linearGradient
                    key={`grad-${i}`}
                    id={`bubble-grad-${i}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={c.gradient[0]} />
                    <stop offset="100%" stopColor={c.gradient[1]} />
                  </linearGradient>
                ))}
                {/* Soft drop shadow filter */}
                <filter id="bubble-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="10"
                    floodColor="#000000"
                    floodOpacity="0.5"
                  />
                </filter>
              </defs>

              {circles.map((c, i) => {
                if (c.r <= 0) return null;
                const isHovered = hoveredIdx === i;
                const isDimmed = hoveredIdx !== null && hoveredIdx !== i;

                return (
                  <g
                    key={`circle-${i}`}
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      transformOrigin: `${c.cx}px ${c.cy}px`,
                      transform: isHovered ? "scale(1.06)" : "scale(1)",
                      opacity: isDimmed ? 0.45 : 1,
                    }}
                  >
                    {/* Ambient Glow on hover */}
                    {isHovered && (
                      <circle
                        cx={c.cx}
                        cy={c.cy}
                        r={c.r + 6}
                        fill="none"
                        stroke={c.color}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        className="animate-spin-slow opacity-60"
                      />
                    )}

                    {/* Main Bubble Circle */}
                    <circle
                      cx={c.cx}
                      cy={c.cy}
                      r={c.r}
                      fill={`url(#bubble-grad-${i})`}
                      filter="url(#bubble-shadow)"
                      className="transition-all duration-300"
                    />

                    {/* Subtle internal shine highlight */}
                    <circle
                      cx={c.cx - c.r * 0.28}
                      cy={c.cy - c.r * 0.28}
                      r={c.r * 0.35}
                      fill="white"
                      opacity={0.12}
                    />

                    {/* Optional percentage label for larger circles */}
                    {c.r >= 36 && (
                      <text
                        x={c.cx}
                        y={c.cy + 4}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={c.r >= 52 ? 15 : 12}
                        fontWeight="800"
                        className="pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                      >
                        {c.pct}%
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Info Tooltip when hovered */}
            {activeCircle && (
              <div
                className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-[#272935] bg-[#161720]/95 px-3 py-1.5 text-xs shadow-2xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeCircle.color }}
                />
                <span className="font-semibold text-white">{activeCircle.name}:</span>
                <span className="font-bold text-white tabular-nums">
                  {activeCircle.value.toLocaleString()}
                </span>
                <span className="text-[11px] font-medium text-[#8a8f9d]">
                  ({activeCircle.pct}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Horizontal Legend (Matching "Streams Sources" layout) */}
      <div className="mt-3 pt-3 border-t border-[#1e2027]/80">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {circles.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <button
                key={`legend-${idx}`}
                type="button"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={cn(
                  "group flex items-center gap-2 text-xs font-medium transition-all duration-200 outline-none",
                  isHovered ? "text-white scale-105" : "text-[#8a8f9d] hover:text-white"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: isHovered ? `0 0 8px ${item.color}` : "none",
                  }}
                />
                <span>{item.name}</span>
                {total > 0 && (
                  <span className="text-[11px] font-semibold text-zinc-400 tabular-nums">
                    {item.pct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {footerNote && (
          <div className="mt-3 text-center">{footerNote}</div>
        )}
      </div>
    </div>
  );
}
