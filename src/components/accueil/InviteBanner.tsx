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
      className="flex flex-col gap-4 border p-5 sm:flex-row sm:items-center"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-1)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center"
          style={{
            borderRadius: "var(--radius-md)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}
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
        // être atteignable au pouce sans viser. Le bouton passe par la classe
        // du système : sa géométrie était la seule de l'application à ne pas
        // sortir de l'échelle de rayons, et il se lisait comme une gélule à
        // côté d'un CTA à 14 px de rayon.
        className="btn btn-primary w-full shrink-0 sm:w-auto"
      >
        Afficher mon QR
      </button>
    </div>
  );
}
