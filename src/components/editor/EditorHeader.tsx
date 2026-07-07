"use client";

import { Eye, Save, Rocket } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";

export default function EditorHeader() {
  const setWalletPreviewOpen = useUIStore((s) => s.setWalletPreviewOpen);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const design = useEditorStore((s) => s.design);

  function handleSave() {
    try {
      localStorage.setItem("fidicard-saved-design", JSON.stringify(design));
      pushToast("Carte enregistrée");
    } catch {
      pushToast("Impossible d'enregistrer");
    }
  }

  return (
    <header className="flex items-start justify-between px-8 pb-4 pt-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Éditeur de carte
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
          Créez et personnalisez votre carte de fidélité
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setWalletPreviewOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Eye size={15} />
          Aperçu Wallet
        </button>
        <button
          onClick={handleSave}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Save size={15} />
          Enregistrer
        </button>
        <button
          onClick={() => setPublishModalOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
            boxShadow: "0 10px 24px -8px var(--accent-glow)",
          }}
        >
          <Rocket size={15} />
          Publier la carte
        </button>
      </div>
    </header>
  );
}
