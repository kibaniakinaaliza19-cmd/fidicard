"use client";

import { ArrowUp, ArrowDown, Trophy, ChevronRight, AlertTriangle, Info, Sparkles } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import {
  periodSummary,
  topCampaigns,
  objectives,
  alerts,
  smartInsights,
} from "@/data/analytics";

export function PeriodSummary() {
  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Résumé de la période</h2>
      <div className="space-y-1">
        {periodSummary.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-[var(--panel-soft)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--border)", color: "var(--text-dim)" }}>
                <Icon size={15} />
              </span>
              <span className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>{row.label}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{row.value}</span>
              <span className="flex w-12 items-center justify-end gap-0.5 text-[11px] font-semibold" style={{ color: row.positive ? "#32d583" : "#f87171" }}>
                {row.positive ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{row.delta}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TopCampaigns() {
  const pushToast = useUIStore((s) => s.pushToast);
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <Trophy size={15} className="text-amber-400" /> Top campagnes
        </h2>
        <button onClick={() => pushToast("Toutes les campagnes")} className="cursor-pointer text-xs font-medium transition-colors hover:text-[var(--accent-1)]" style={{ color: "var(--text-faint)" }}>Voir tout</button>
      </div>
      <div className="space-y-1">
        {topCampaigns.map((c) => (
          <button key={c.rank} onClick={() => pushToast(`Stats : « ${c.title} »`)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[var(--panel-soft)]">
            <span className="w-5 shrink-0 text-center text-sm font-bold" style={{ color: "var(--text-faint)" }}>{medal[c.rank - 1] ?? c.rank}</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: "var(--border)" }}>{c.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>{c.title}</span>
              <span className="block truncate text-[11px]" style={{ color: "var(--text-faint)" }}>{c.date}</span>
            </span>
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>{c.opens}</span>
              <span className="block text-[10px]" style={{ color: "var(--text-faint)" }}>Ouvertures</span>
            </span>
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>{c.clicks}</span>
              <span className="block text-[10px]" style={{ color: "var(--text-faint)" }}>Clics</span>
            </span>
            <ChevronRight size={15} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--text-faint)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Objectives() {
  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Objectifs du mois</h2>
      <div className="space-y-4">
        {objectives.map((o) => {
          const pct = Math.min(100, Math.round((o.current / o.target) * 100));
          return (
            <div key={o.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-dim)" }}>{o.label}</span>
                <span style={{ color: "var(--text)" }}>
                  <span className="font-semibold">{o.current.toLocaleString("fr-FR")}{o.unit}</span>
                  <span style={{ color: "var(--text-faint)" }}> / {o.target.toLocaleString("fr-FR")}{o.unit}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${o.color}, ${o.color}cc)` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Alerts() {
  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Alertes</h2>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
            {a.level === "warn" ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /> : <Info size={15} className="mt-0.5 shrink-0 text-sky-400" />}
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SmartInsights() {
  const pushToast = useUIStore((s) => s.pushToast);
  return (
    <div className="relative overflow-hidden rounded-2xl border p-6" style={{ borderColor: "var(--border-strong)", background: "linear-gradient(135deg, rgba(255,106,61,0.12), var(--panel))" }}>
      <div className="glow-blob -right-10 -top-10 h-40 w-40" style={{ background: "var(--accent-1)" }} />
      <div className="relative z-10">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <Sparkles size={15} className="text-[var(--accent-1)]" /> Analyse intelligente Fidi
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {smartInsights.map((s) => (
            <div key={s.title} className="flex items-start gap-2.5">
              <span className="text-xl">{s.emoji}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.title}</p>
                <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--text-dim)" }}>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => pushToast("Recommandations Fidi affichées")}
          className="mt-5 flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 8px 20px -8px var(--accent-glow)" }}
        >
          <Sparkles size={15} /> Voir les recommandations
        </button>
      </div>
    </div>
  );
}
