"use client";

import Modal from "@/components/ui/Modal";
import { useUIStore } from "@/store/uiStore";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";

export default function WalletPreviewModal() {
  const open = useUIStore((s) => s.walletPreviewOpen);
  const setOpen = useUIStore((s) => s.setWalletPreviewOpen);
  const card = useCardStore((s) => s.card);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Aperçu Wallet"
      subtitle="Rendu de la carte dans Apple Wallet et Google Wallet"
      wide
    >
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Apple Wallet</p>
          <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "#000" }}>
            <MiniCard doc={card} width={300} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Google Wallet</p>
          <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "#1a1a1a" }}>
            <MiniCard doc={card} width={300} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
