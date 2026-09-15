"use client";

import { useState } from "react";
import { weekDays, heatmapRows, heatmap } from "@/data/analytics";

export default function Heatmap() {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(...heatmap.flat());

  function color(v: number) {
    const t = v / max;
    // interpolate from faint panel to accent orange
    const a = 0.06 + t * 0.94;
    return `rgba(255, 106, 61, ${a})`;
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
          {heatmapRows.map((h) => (
            <span key={h} className="flex h-6 items-center">{h}</span>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid gap-1.5" style={{ gridTemplateRows: `repeat(${heatmapRows.length}, 1fr)` }}>
            {heatmap.map((row, r) => (
              <div key={r} className="grid grid-cols-7 gap-1.5">
                {row.map((v, c) => (
                  <div
                    key={c}
                    onMouseEnter={() => setHover({ r, c })}
                    onMouseLeave={() => setHover(null)}
                    className="relative h-6 cursor-pointer rounded-md transition-transform hover:scale-110"
                    style={{ background: color(v), outline: hover?.r === r && hover?.c === c ? "1.5px solid var(--accent-1)" : "none" }}
                  >
                    {hover?.r === r && hover?.c === c && (
                      <div className="pointer-events-none absolute -top-11 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] shadow-xl" style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)", color: "var(--text)" }}>
                        <div className="font-semibold">{weekDays[c]} · {heatmapRows[r]}</div>
                        <div style={{ color: "var(--text-faint)" }}>{Math.round((v / max) * 124)} visites</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px]" style={{ color: "var(--text-faint)" }}>
            {weekDays.map((d) => (<span key={d}>{d}</span>))}
          </div>
        </div>
      </div>
    </div>
  );
}
