"use client";

import { QrCode, Plus } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export default function AccueilHeader() {
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <header className="flex items-start justify-between px-8 pb-6 pt-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Bonjour, Café Madeleine <span className="inline-block">👋</span>
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
          onClick={() => pushToast("Tampon ajouté au client")}
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
