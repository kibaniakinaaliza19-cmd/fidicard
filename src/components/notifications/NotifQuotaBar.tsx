"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Zap, Sparkles } from "lucide-react";
import { usePlan } from "@/lib/usePlan";
import { useNotificationsLogStore, useSentThisMonth } from "@/store/notificationsLogStore";

export default function NotifQuotaBar() {
  const { limits } = usePlan();
  const hydrate = useNotificationsLogStore((s) => s.hydrate);
  const sent = useSentThisMonth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const unlimited = limits.notifsParMois === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((sent / limits.notifsParMois) * 100));
  const reached = !unlimited && sent >= limits.notifsParMois;

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: reached ? "rgba(232,80,61,0.35)" : "var(--border)",
        background: reached ? "rgba(232,80,61,0.06)" : "var(--panel)",
      }}
    >
      {unlimited ? (
        <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text)" }}>
          <Sparkles size={15} className="text-[var(--accent-1)]" /> Notifications illimitées — plan {limits.label}
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text)" }}>
            <Zap size={15} className="text-[var(--accent-1)]" />
            {sent} / {limits.notifsParMois} notifications ce mois
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full" style={{ background: "rgba(245,245,244,0.10)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: reached ? "#E8503D" : "linear-gradient(90deg, var(--accent-1), var(--accent-2))",
              }}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>plan {limits.label}</span>
          {reached && (
            <span className="flex items-center gap-2 text-xs font-medium" style={{ color: "#E8503D" }}>
              Limite atteinte —
              <Link href="/reglages?tab=subscription" className="underline underline-offset-2 hover:opacity-80">
                passez au plan supérieur
              </Link>
            </span>
          )}
        </>
      )}
    </div>
  );
}
