"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, TrendingUp } from "lucide-react";
import { generateVisits } from "@/lib/visitsData";

const ranges = [
  { id: 7, label: "7 derniers jours" },
  { id: 30, label: "30 derniers jours" },
  { id: 90, label: "90 derniers jours" },
];

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export default function VisitsChart() {
  const [range, setRange] = useState(30);
  const [menuOpen, setMenuOpen] = useState(false);
  const points = useMemo(() => generateVisits(range), [range]);

  const max = Math.max(...points.map((p) => p.value));
  const niceMax = Math.ceil(max / 30) * 30;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * WIDTH,
    y: PADDING_TOP + plotHeight - (p.value / niceMax) * plotHeight,
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT - PADDING_BOTTOM} L 0 ${HEIGHT - PADDING_BOTTOM} Z`;

  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const idx = Math.round((i / (tickCount - 1)) * (points.length - 1));
    return points[idx];
  });

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <TrendingUp size={15} className="text-[var(--accent-1)]" />
          Évolution des visites
        </h2>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
          >
            {ranges.find((r) => r.id === range)?.label}
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-xl border shadow-2xl"
              style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)" }}
            >
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRange(r.id);
                    setMenuOpen(false);
                  }}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--border)]"
                  style={{ color: r.id === range ? "var(--accent-1)" : "var(--text-dim)" }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: 220 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent-1)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="visitsStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent-2)" />
              <stop offset="100%" stopColor="var(--accent-1)" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              x2={WIDTH}
              y1={PADDING_TOP + plotHeight * f}
              y2={PADDING_TOP + plotHeight * f}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}

          <motion.path
            key={`area-${range}`}
            d={areaPath}
            fill="url(#visitsFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
          <motion.path
            key={`line-${range}`}
            d={linePath}
            fill="none"
            stroke="url(#visitsStroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          <motion.circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r={5}
            fill="var(--accent-1)"
            stroke="var(--panel)"
            strokeWidth={2}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
          />
        </svg>

        <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--text-faint)" }}>
          {ticks.map((t, i) => (
            <span key={i}>{t.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
