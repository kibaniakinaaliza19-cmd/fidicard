"use client";

import Link from "next/link";
import { CreditCard, Eye, Save, Rocket, ChevronLeft } from "lucide-react";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";

export default function EditorTopBar() {
  const cardName = useCardStore((s) => s.card.name);
  const setCardName = useCardStore((s) => s.setCardName);
  const card = useCardStore((s) => s.card);
  const markSaved = useCardStore((s) => s.markSaved);
  const setWalletPreviewOpen = useUIStore((s) => s.setWalletPreviewOpen);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);

  function handleSave() {
    try {
      localStorage.setItem("fidicard-card-doc", JSON.stringify(card));
      markSaved();
      pushToast("Carte enregistrée");
    } catch {
      pushToast("Impossible d'enregistrer");
    }
  }

  return (
    <header
      className="flex h-[56px] shrink-0 items-center gap-3 px-4"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
    >
      <Link href="/accueil" className="flex items-center gap-2.5 pr-2" title="Retour à l'accueil">
        <ChevronLeft size={18} style={{ color: "var(--text-faint)" }} />
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}>
          <CreditCard size={16} />
        </span>
        <span className="text-base font-semibold tracking-tight" style={{ color: "var(--text)" }}>FidiCard</span>
      </Link>

      <div className="mx-auto">
        <input
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className="rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-center text-sm font-medium outline-none transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent-1)]"
          style={{ color: "var(--text)", minWidth: 200 }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setWalletPreviewOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Eye size={15} /> Aperçu Wallet
        </button>
        <button
          onClick={handleSave}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Save size={15} /> Enregistrer
        </button>
        <button
          onClick={() => setPublishModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 8px 20px -8px var(--accent-glow)" }}
        >
          <Rocket size={15} /> Publier
        </button>
      </div>
    </header>
  );
}
