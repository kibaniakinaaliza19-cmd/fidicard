"use client";

import { ETAPES, type NomEtape } from "./types";

/**
 * Sept points, un libellé au-dessus. L'étape affichée est un cran haut, elle
 * ne recule jamais (voir Parcours.tsx:calculerEtape) : même si le moteur
 * répond dans un ordre différent de celui attendu, la barre ne donne jamais
 * l'impression de revenir en arrière.
 */
export default function BarreProgression({ etape }: { etape: NomEtape }) {
  const index = ETAPES.findIndex((e) => e.id === etape);

  return (
    <div className="px-4 pt-3">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Étape {index + 1} sur {ETAPES.length} · {ETAPES[index]?.label}
      </p>
      <div className="flex items-center gap-1.5">
        {ETAPES.map((e, i) => (
          <span
            key={e.id}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i <= index ? "var(--accent)" : "var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}
