"use client";

import { Wifi, BatteryFull, Signal } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";

export default function WalletPreviewMini() {
  const card = useCardStore((s) => s.card);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
          Apple Wallet
        </p>
        <div className="overflow-hidden rounded-2xl border p-2.5" style={{ borderColor: "var(--border)", background: "#000" }}>
          <div className="mb-1.5 flex items-center justify-between px-1 text-[9px] text-white/80">
            <span>9:41</span>
            <div className="flex items-center gap-1"><Signal size={9} /><Wifi size={9} /><BatteryFull size={11} /></div>
          </div>
          <MiniCard doc={card} width={220} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
          Google Wallet
        </p>
        <div className="overflow-hidden rounded-2xl border p-2.5" style={{ borderColor: "var(--border)", background: "#1a1a1a" }}>
          <MiniCard doc={card} width={220} />
        </div>
      </div>
    </div>
  );
}
