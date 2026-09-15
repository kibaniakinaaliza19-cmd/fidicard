"use client";

import { useState } from "react";
import { BarChart3, Calendar, SlidersHorizontal, Download, ChevronDown, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { dateRanges } from "@/data/analytics";

export default function AnalyseHeader() {
  const pushToast = useUIStore((s) => s.pushToast);
  const [rangeMenu, setRangeMenu] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [range, setRange] = useState("12 mai – 18 mai 2025");

  return (
    <header className="flex flex-wrap items-start justify-between gap-3 px-8 pb-6 pt-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          <BarChart3 size={22} className="text-[var(--accent-1)]" /> Analyse
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
          Suivez et améliorez la performance de votre programme de fidélité.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative">
          <button onClick={() => setRangeMenu((v) => !v)} className="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}>
            <Calendar size={15} /> {range} <ChevronDown size={13} style={{ color: "var(--text-faint)" }} />
          </button>
          {rangeMenu && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border shadow-2xl" style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)" }}>
              {dateRanges.map((r) => (
                <button key={r} onClick={() => { setRange(r); setRangeMenu(false); pushToast(`Période : ${r}`); }} className="block w-full cursor-pointer px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--border)]" style={{ color: "var(--text-dim)" }}>{r}</button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => pushToast("Filtres avancés")} className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}>
          <SlidersHorizontal size={15} /> Filtres
        </button>

        <div className="relative">
          <button onClick={() => setExportMenu((v) => !v)} className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}>
            <Download size={15} /> Exporter
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-40 overflow-hidden rounded-xl border shadow-2xl" style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)" }}>
              {[["PDF", FileText], ["Excel", FileSpreadsheet], ["CSV", FileDown]].map(([label, Icon]) => {
                const I = Icon as typeof FileText;
                return (
                  <button key={label as string} onClick={() => { setExportMenu(false); pushToast(`Export ${label} généré`); }} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--border)]" style={{ color: "var(--text-dim)" }}>
                    <I size={13} /> {label as string}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
