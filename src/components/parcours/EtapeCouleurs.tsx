"use client";

import { useState } from "react";
import type { BrouillonCommerce } from "./types";

type Couleurs = BrouillonCommerce["couleurs"];

const CHAMPS: { cle: keyof Couleurs; label: string }[] = [
  { cle: "accent", label: "Accent — vos tampons, vos boutons" },
  { cle: "fond", label: "Fond de la carte" },
  { cle: "texte", label: "Texte" },
];

export default function EtapeCouleurs({
  valeur,
  proposeesParImage,
  onSuivant,
  onPasser,
}: {
  valeur: Couleurs;
  /** Vrai si ces couleurs viennent d'une analyse de logo — sinon ce sont de
   *  simples couleurs par défaut, à le dire clairement plutôt que de laisser
   *  croire à une déduction qui n'a pas eu lieu. */
  proposeesParImage: boolean;
  onSuivant: (couleurs: Couleurs) => void;
  onPasser: () => void;
}) {
  const [couleurs, setCouleurs] = useState<Couleurs>(valeur);

  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Vos couleurs</h2>
      <p className="mt-1 text-[13px]" style={{ color: "var(--text-dim)" }}>
        {proposeesParImage
          ? "Reprises de votre logo — modifiez-les si besoin."
          : "Des couleurs par défaut, en attendant les vôtres — modifiez-les si besoin."}
      </p>

      <div className="mt-4 space-y-3">
        {CHAMPS.map((c) => (
          <div
            key={c.cle}
            className="flex items-center gap-3 rounded-2xl p-3"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <label className="relative shrink-0">
              <span
                className="block h-10 w-10 rounded-full"
                style={{ background: couleurs[c.cle], border: "1px solid var(--border-strong)" }}
              />
              <input
                type="color"
                value={couleurs[c.cle]}
                onChange={(e) => setCouleurs((prev) => ({ ...prev, [c.cle]: e.target.value }))}
                className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
              />
            </label>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{c.label}</p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{couleurs[c.cle]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aperçu grossier : une carte n'est pas nécessaire ici, seulement de
          quoi juger si le texte reste lisible sur le fond choisi. */}
      <div
        className="mt-4 rounded-2xl p-4"
        style={{ background: couleurs.fond, border: "1px solid var(--border)" }}
      >
        <p className="text-[13px] font-semibold" style={{ color: couleurs.texte }}>Votre commerce</p>
        <p className="mt-1 text-[11px]" style={{ color: couleurs.texte, opacity: 0.75 }}>Aperçu du fond et du texte</p>
        <span
          className="mt-2 inline-block h-6 w-6 rounded-full"
          style={{ background: couleurs.accent }}
        />
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <button onClick={onPasser} className="btn btn-secondary flex-1">Passer</button>
        <button onClick={() => onSuivant(couleurs)} className="btn btn-primary flex-1">Continuer</button>
      </div>
    </div>
  );
}
