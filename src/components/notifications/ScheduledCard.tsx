"use client";

import { CalendarClock, MoreHorizontal, Plus } from "lucide-react";
import { scheduled } from "@/data/notifications";
import { useUIStore } from "@/store/uiStore";

const statusColor: Record<string, string> = {
  Programmée: "#38bdf8",
  Active: "#32d583",
  Brouillon: "#9a9a97",
};

export default function ScheduledCard({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <div className="flex flex-col rounded-2xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <CalendarClock size={15} className="text-[var(--accent-1)]" /> Prochaines notifications programmées
        </h2>
        <button onClick={() => pushToast("Toutes les campagnes programmées")} className="cursor-pointer text-xs font-medium transition-colors hover:text-[var(--accent-1)]" style={{ color: "var(--text-faint)" }}>
          Voir tout
        </button>
      </div>

      <div className="space-y-1.5">
        {scheduled.map((s) => (
          <div key={s.id} className="group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:border-[var(--border-strong)]" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ background: "var(--border)" }}>{s.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{s.title}</p>
              <p className="truncate text-[11px]" style={{ color: "var(--text-faint)" }}>{s.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium" style={{ color: "var(--text-dim)" }}>{s.when}</p>
              <span className="text-[10px] font-semibold" style={{ color: statusColor[s.status] }}>{s.status}</span>
            </div>
            <button onClick={() => pushToast(`« ${s.title} »`)} className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100">
              <MoreHorizontal size={15} style={{ color: "var(--text-faint)" }} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onOpenDrawer}
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      >
        <Plus size={14} /> Voir toutes les notifications
      </button>
    </div>
  );
}
