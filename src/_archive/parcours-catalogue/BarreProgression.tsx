"use client";

import { ETAPES, type NomEtape } from "./types";

/**
 * Sept points, pas sept libellés en toutes lettres : sur 390 px de large,
 * sept mots ne tiennent pas côte à côte. Le libellé de l'étape en cours
 * s'affiche seul, au-dessus des points — assez pour se repérer, sans que la
 * barre ne déborde.
 */
export default function BarreProgression({ etape }: { etape: NomEtape }) {
  const index = ETAPES.findIndex((e) => e.id === etape);

  return (
    <div className="px-4 pt-3">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Étape {index + 1} sur {ETAPES.length} · {ETAPES[index]?.label}
      </p>
      <div className="flex items-center gap-1.5">
        {ETAPES.map((e, i) => {
          const fait = i < index;
          const actif = i === index;
          return (
            <span
              key={e.id}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: fait || actif ? "var(--accent)" : "var(--border)" }}
            />
          );
        })}
      </div>
    </div>
  );
}
