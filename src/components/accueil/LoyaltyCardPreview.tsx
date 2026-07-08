"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Maximize2 } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useUIStore } from "@/store/uiStore";
import { useCardStore } from "@/store/cardStore";

export default function LoyaltyCardPreview() {
  const [menuOpen, setMenuOpen] = useState(false);
  const setWalletPreviewOpen = useUIStore((s) => s.setWalletPreviewOpen);
  const card = useCardStore((s) => s.card);
  const loadCard = useCardStore((s) => s.loadCard);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fidicard-card-doc");
      if (raw) loadCard(JSON.parse(raw));
    } catch {}
  }, [loadCard]);

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Ma carte de fidélité
        </h2>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--panel-soft)]"
          >
            <MoreHorizontal size={16} style={{ color: "var(--text-faint)" }} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-xl border shadow-2xl"
              style={{ background: "var(--panel-soft)", borderColor: "var(--border-strong)" }}
            >
              <Link
                href="/carte"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-[var(--border)]"
                style={{ color: "var(--text)" }}
              >
                <Pencil size={13} />
                Modifier la carte
              </Link>
              <button
                onClick={() => {
                  setWalletPreviewOpen(true);
                  setMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[var(--border)]"
                style={{ color: "var(--text)" }}
              >
                <Maximize2 size={13} />
                Aperçu plein écran
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="float-slow flex justify-center">
        <MiniCard doc={card} width={300} />
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === 0 ? 16 : 6,
              background: i === 0 ? "var(--accent-1)" : "var(--border-strong)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
