"use client";

import { ScanLine, Bell } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useUIStore } from "@/store/uiStore";

export default function ScannerPage() {
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <div>
      <PageHeader title="Scanner" subtitle="Scannez les cartes de vos clients en boutique" />
      <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <div
          className="float-slow mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{ background: "var(--accent-glow)" }}
        >
          <ScanLine size={32} className="text-[var(--accent-1)]" />
        </div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Le scanner arrive bientôt
        </h2>
        <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--text-dim)" }}>
          Scannez le QR code Wallet d&rsquo;un client directement depuis votre téléphone ou votre
          tablette pour ajouter un tampon ou des points en une seconde.
        </p>
        <button
          onClick={() => pushToast("Nous vous préviendrons au lancement du Scanner")}
          className="mt-6 flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
        >
          <Bell size={15} />
          Me prévenir au lancement
        </button>
      </div>
    </div>
  );
}
