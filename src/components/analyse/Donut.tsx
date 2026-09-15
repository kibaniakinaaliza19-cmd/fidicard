"use client";

import { useState } from "react";
import type { DonutSegment } from "@/data/analytics";

export default function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 180,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stroke = size * 0.14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // precompute each segment's dash length and cumulative offset (no outer mutation)
  const dashes = segments.map((seg) => (seg.value / total) * c);
  const arcs = segments.map((seg, i) => ({
    seg,
    dash: dashes[i],
    start: dashes.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        {arcs.map(({ seg, dash, start }, i) => (
          <circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={hover === i ? stroke + 3 : stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-start}
            strokeLinecap="butt"
            style={{ transition: "stroke-width 0.15s", cursor: "pointer", opacity: hover === null || hover === i ? 1 : 0.45 }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <g className="rotate-90" style={{ transformOrigin: "center" }}>
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" style={{ fill: "var(--text)", fontSize: size * 0.15, fontWeight: 700 }}>
            {centerValue}
          </text>
          <text x={size / 2} y={size / 2 + size * 0.11} textAnchor="middle" style={{ fill: "var(--text-faint)", fontSize: size * 0.065 }}>
            {centerLabel}
          </text>
        </g>
      </svg>

      <div className="w-full space-y-1.5">
        {segments.map((seg, i) => {
          const pct = ((seg.value / total) * 100).toFixed(1).replace(".", ",");
          return (
            <button
              key={seg.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-[var(--panel-soft)]"
              style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
              <span className="flex-1 truncate text-xs" style={{ color: "var(--text-dim)" }}>{seg.label}</span>
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                {seg.value.toLocaleString("fr-FR")} <span style={{ color: "var(--text-faint)" }}>({pct}%)</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
