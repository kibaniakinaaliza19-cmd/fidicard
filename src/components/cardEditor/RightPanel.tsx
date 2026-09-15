"use client";

import { useState } from "react";
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
} from "lucide-react";
import { useCardStore, type AlignType } from "@/store/cardStore";
import type { Layer } from "@/types/layer";
import WalletPreviewMini from "@/components/cardEditor/WalletPreviewMini";
import CalquesList from "@/components/cardEditor/CalquesList";

type Tab = "wallet" | "position" | "calques";

function NumField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--border-strong)" }}>
      <span className="text-[11px] font-medium" style={{ color: "var(--text-faint)" }}>{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent text-xs outline-none"
        style={{ color: "var(--text)" }}
      />
      {suffix && <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{suffix}</span>}
    </label>
  );
}

function AlignBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="flex h-8 flex-1 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
      {children}
    </button>
  );
}

export default function RightPanel() {
  const [tab, setTab] = useState<Tab>("wallet");
  const selectedIds = useCardStore((s) => s.selectedIds);
  const layers = useCardStore((s) => s.card.layers);
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const align = useCardStore((s) => s.align);

  const primary = layers.find((l) => l.id === selectedIds[0]);

  function patch(p: Partial<Layer>) {
    if (!primary) return;
    updateLayerLive(primary.id, p);
    commit();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "wallet", label: "Aperçu wallet" },
    { id: "position", label: "Position" },
    { id: "calques", label: "Calques" },
  ];

  return (
    <div className="flex h-full w-[290px] shrink-0 flex-col border-l" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="flex gap-1 border-b px-3 pt-3" style={{ borderColor: "var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative cursor-pointer pb-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors"
            style={{ color: tab === t.id ? "var(--accent-1)" : "var(--text-faint)", flex: 1 }}
          >
            {t.label}
            {tab === t.id && <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--accent-1)" }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "wallet" && <WalletPreviewMini />}
        {tab === "calques" && <CalquesList />}
        {tab === "position" && (
          primary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <NumField label="X" value={primary.x} suffix="%" onChange={(v) => patch({ x: v })} />
                <NumField label="Y" value={primary.y} suffix="%" onChange={(v) => patch({ y: v })} />
                <NumField label="L" value={primary.width} suffix="%" onChange={(v) => patch({ width: v })} />
                <NumField label="H" value={primary.height} suffix="%" onChange={(v) => patch({ height: v })} />
              </div>
              <NumField label="Rotation" value={primary.rotation} suffix="°" onChange={(v) => patch({ rotation: v })} />

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Aligner sur la carte</p>
                <div className="flex gap-1.5">
                  <AlignBtn title="Gauche" onClick={() => align("left" as AlignType)}><AlignStartVertical size={15} /></AlignBtn>
                  <AlignBtn title="Centre horizontal" onClick={() => align("centerH")}><AlignHorizontalJustifyCenter size={15} /></AlignBtn>
                  <AlignBtn title="Droite" onClick={() => align("right")}><AlignEndVertical size={15} /></AlignBtn>
                  <AlignBtn title="Haut" onClick={() => align("top")}><AlignStartHorizontal size={15} /></AlignBtn>
                  <AlignBtn title="Centre vertical" onClick={() => align("centerV")}><AlignVerticalJustifyCenter size={15} /></AlignBtn>
                  <AlignBtn title="Bas" onClick={() => align("bottom")}><AlignEndHorizontal size={15} /></AlignBtn>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>Sélectionnez un élément pour ajuster sa position, sa taille et sa rotation.</p>
          )
        )}
      </div>
    </div>
  );
}
