"use client";

import { QrCode } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export default function InviteBanner() {
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);

  return (
    <div
      className="flex items-center gap-4 rounded-2xl border p-5"
      style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
      >
        <QrCode size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Invitez plus de clients à vous rejoindre !
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-dim)" }}>
          Affichez votre QR code en caisse ou partagez-le sur vos réseaux.
        </p>
      </div>
      <button
        onClick={() => setPublishModalOpen(true)}
        className="shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
        style={{
          background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
          boxShadow: "0 10px 24px -8px var(--accent-glow)",
        }}
      >
        Afficher mon QR
      </button>
    </div>
  );
}
