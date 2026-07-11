"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { visitSeries, weekDays } from "@/data/analytics";

const W = 720;
const H = 300;
const PT = 20;
const PB = 34;
const PL = 8;

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const periods = ["Cette semaine", "Semaine dernière", "30 jours"];

export default function VisitsChart() {
  const [active, setActive] = useState<string[]>(["visites"]);
  const [hover, setHover] = useState<number | null>(null);
  const [period, setPeriod] = useState("Cette semaine");
  const [menu, setMenu] = useState(false);

  const activeSeries = visitSeries.filter((s) => active.includes(s.id));
  const allVals = activeSeries.flatMap((s) => s.data);
  const max = Math.max(...allVals, 10);
  const niceMax = Math.ceil(max / 50) * 50;
  const plotH = H - PT - PB;
  const n = weekDays.length;

  const xFor = (i: number) => PL + (i / (n - 1)) * (W - PL * 2);
  const yFor = (v: number) => PT + plotH - (v / niceMax) * plotH;

  function toggle(id: string) {
    setActive((a) => (a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : [...a, id]));
  }

  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Visites cette semaine</h2>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
            {period} <ChevronDown size={13} />
          </button>
          {menu && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-xl border shadow-2xl" style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)" }}>
              {periods.map((p) => (
                <button key={p} onClick={() => { setPeriod(p); setMenu(false); }} className="block w-full cursor-pointer px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--border)]" style={{ color: p === period ? "var(--accent-1)" : "var(--text-dim)" }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {visitSeries.map((s) => {
          const on = active.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)} className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors" style={{ borderColor: on ? s.color : "var(--border)", background: on ? `${s.color}1f` : "transparent", color: on ? s.color : "var(--text-faint)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 300 }} onMouseLeave={() => setHover(null)}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={PT + plotH * (1 - f)} y2={PT + plotH * (1 - f)} stroke="var(--border)" strokeWidth={1} />
          ))}

          {activeSeries.map((s, si) => {
            const pts = s.data.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
            const line = smoothPath(pts);
            const area = `${line} L ${pts[pts.length - 1].x} ${H - PB} L ${pts[0].x} ${H - PB} Z`;
            const gid = `vc-${s.id}`;
            return (
              <g key={s.id}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={si === 0 ? 0.32 : 0.12} />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gid})`} />
                <motion.path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeInOut" }} />
              </g>
            );
          })}

          {/* hover columns */}
          {weekDays.map((_, i) => (
            <rect key={i} x={xFor(i) - (W / n) / 2} y={0} width={W / n} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}

          {hover !== null && (
            <>
              <line x1={xFor(hover)} x2={xFor(hover)} y1={PT} y2={H - PB} stroke="var(--accent-1)" strokeWidth={1} strokeDasharray="3 3" />
              {activeSeries.map((s) => (
                <circle key={s.id} cx={xFor(hover)} cy={yFor(s.data[hover])} r={4} fill={s.color} stroke="var(--panel)" strokeWidth={2} />
              ))}
            </>
          )}

          {weekDays.map((d, i) => (
            <text key={d} x={xFor(i)} y={H - 10} textAnchor="middle" style={{ fill: "var(--text-faint)", fontSize: 11 }}>{d}</text>
          ))}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl border px-3 py-2 text-xs shadow-2xl"
            style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)", left: `${(xFor(hover) / W) * 100}%`, top: 4 }}
          >
            <div className="mb-1 font-semibold" style={{ color: "var(--text)" }}>{weekDays[hover]}</div>
            {activeSeries.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 whitespace-nowrap" style={{ color: "var(--text-dim)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}: <span className="font-semibold" style={{ color: "var(--text)" }}>{s.data[hover]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
