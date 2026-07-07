"use client";

import Modal from "@/components/ui/Modal";
import { useUIStore } from "@/store/uiStore";
import WalletCard from "@/components/editor/WalletCard";

export default function WalletPreviewModal() {
  const open = useUIStore((s) => s.walletPreviewOpen);
  const setOpen = useUIStore((s) => s.setWalletPreviewOpen);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Aperçu Apple Wallet"
      subtitle="Voici le rendu final de la carte sur l'écran de verrouillage"
    >
      <div className="mx-auto max-w-[280px]">
        <WalletCard size="large" />
      </div>
    </Modal>
  );
}
