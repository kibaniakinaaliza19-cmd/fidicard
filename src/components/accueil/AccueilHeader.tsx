"use client";

import { QrCode, Plus } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

export default function AccueilHeader() {
  const design = useEditorStore((s) => s.design);
  const updateLoyalty = useEditorStore((s) => s.updateLoyalty);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);

  const displayName = design.companyName
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

  function handleAddStamp() {
    if (design.loyalty.type === "stamps") {
      const next = Math.min(design.loyalty.stampsCount, design.loyalty.stampsFilled + 1);
      updateLoyalty({ stampsFilled: next });
      if (next === design.loyalty.stampsCount) {
        pushToast("Carte complète ! Récompense débloquée 🎉");
      } else {
        pushToast("Tampon ajouté");
      }
    } else {
      updateLoyalty({ currentPoints: design.loyalty.currentPoints + design.loyalty.pointsPerEuro * 10 });
      pushToast("Points ajoutés");
    }
  }

  return (
    <header className="flex items-start justify-between px-8 pb-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Bonjour, {displayName} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
          Avec FidiCard, une fidélité sans effort.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setPublishModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <QrCode size={15} />
          Afficher QR
        </button>
        <button
          onClick={handleAddStamp}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
            boxShadow: "0 10px 24px -8px var(--accent-glow)",
          }}
        >
          <Plus size={15} />
          Ajouter un tampon
        </button>
      </div>
    </header>
  );
}
