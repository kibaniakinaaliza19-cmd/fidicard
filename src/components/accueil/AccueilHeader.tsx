"use client";

import { QrCode, Plus } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

/**
 * Salutation et actions principales.
 *
 * Le « 👋 » qui suivait le nom est parti. Un emoji dans le chrome d'une
 * application professionnelle la fait passer pour un prototype : il change de
 * dessin sur chaque plateforme, n'a pas la graisse du texte qui l'entoure, et
 * ne dit rien que la phrase ne dise déjà.
 *
 * Deux actions, une seule pleine. « Ajouter un tampon » est le geste du
 * métier ; « Afficher QR » l'accompagne, en retrait.
 */
export default function AccueilHeader() {
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <header className="px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <h1
        className="text-[26px] font-bold leading-tight tracking-tight sm:text-3xl"
        style={{ color: "var(--text)" }}
      >
        Bonjour, Café Madeleine
      </h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--text-dim)" }}>
        Voici votre activité de ce mois.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => setPublishModalOpen(true)}
          className="btn btn-secondary flex-1 sm:flex-none"
        >
          <QrCode size={17} strokeWidth={1.9} />
          Afficher QR
        </button>

        <button
          onClick={() => pushToast("Tampon ajouté au client")}
          className="btn btn-primary cta-rangee"
        >
          <Plus size={17} strokeWidth={2.4} />
          Ajouter un tampon
        </button>
      </div>
    </header>
  );
}
