"use client";

import { QrCode } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export default function InviteBanner() {
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);

  return (
    /* Empilé sous sm, en ligne au-delà.
     *
     * Les trois éléments tenaient sur une seule ligne quelle que soit la
     * largeur : à 390 px, le titre se retrouvait dans une colonne de six
     * caractères — « Invitez plus / de clients à / vous / rejoindre ! » — et
     * la phrase d'explication descendait sur six lignes. Le bouton, lui,
     * gardait sa largeur entière. */
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center"
      style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}
    >
      <div className="flex items-start gap-4">
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
      </div>
      <button
        onClick={() => setPublishModalOpen(true)}
        // Pleine largeur sur téléphone : c'est l'action de la carte, elle doit
        // être atteignable au pouce sans viser.
        className="h-12 w-full shrink-0 cursor-pointer rounded-xl px-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] sm:h-auto sm:w-auto sm:py-2.5"
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
