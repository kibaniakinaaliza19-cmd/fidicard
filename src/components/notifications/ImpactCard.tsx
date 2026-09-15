"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Trophy, Clock, ChevronDown } from "lucide-react";
import { impactMetrics, hourlyOpens } from "@/data/notifications";

const periods = ["7 derniers jours", "30 derniers jours", "90 derniers jours", "1 an"];

export default function ImpactCard() {
  const [period, setPeriod] = useState("30 derniers jours");
  const [open, setOpen] = useState(false);
  const max = Math.max(...hourlyOpens);

  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Ce que vos notifications vous rapportent
        </h2>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
          >
            {period} <ChevronDown size={13} />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border shadow-2xl" style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)" }}>
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setOpen(false); }}
                  className="block w-full cursor-pointer px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--border)]"
                  style={{ color: p === period ? "var(--accent-1)" : "var(--text-dim)" }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {impactMetrics.map((m) => (
          <div key={m.label} className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
            <span className="text-lg">{m.emoji}</span>
            <p className="mt-1.5 text-lg font-bold" style={{ color: "var(--text)" }}>{m.value}</p>
            <p className="text-[11px] leading-tight" style={{ color: "var(--text-faint)" }}>{m.label}</p>
            <span className="mt-1 flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: m.positive ? "#32d583" : "#f87171" }}>
              {m.positive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{m.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div
          className="flex items-center justify-between overflow-hidden rounded-xl border p-4"
          style={{ borderColor: "var(--border-strong)", background: "linear-gradient(135deg, rgba(255,106,61,0.16), var(--panel-soft))" }}
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Meilleure campagne</p>
            <p className="mt-1 text-sm font-bold" style={{ color: "var(--text)" }}>🍕 Une pizza offerte</p>
            <p className="text-xs" style={{ color: "var(--accent-1)" }}>4 320 € générés</p>
          </div>
          <Trophy size={30} className="text-amber-400" />
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                <Clock size={12} /> Meilleure heure d&rsquo;envoi
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: "var(--text)" }}>18h – 20h</p>
            </div>
            <p className="text-xs font-semibold" style={{ color: "#32d583" }}>67,8% d&rsquo;ouvertures</p>
          </div>
          <div className="flex h-10 items-end gap-[2px]">
            {hourlyOpens.map((v, i) => {
              const peak = i >= 17 && i <= 20;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${(v / max) * 100}%`,
                    background: peak ? "var(--accent-1)" : "var(--border-strong)",
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[9px]" style={{ color: "var(--text-faint)" }}>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
