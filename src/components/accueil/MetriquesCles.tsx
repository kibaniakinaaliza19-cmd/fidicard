"use client";

import Link from "next/link";
import { ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { METRIQUES, couleurNiveau, libelleNiveau, type Metrique } from "@/data/metriques";
import ProgressRing from "@/components/ui/ProgressRing";

/**
 * Les mesures de l'accueil.
 *
 * Chaque tuile est un lien, pas une carte morte : le détail vit à
 * /analyse/<id>, d'où l'on revient à l'accueil. Aucun onglet ne s'ajoute en
 * bas — la barre reste à cinq entrées, et « Analyse » n'y figure toujours pas.
 *
 * La première tuile porte un anneau plutôt qu'un chiffre. Le taux de retour
 * est la seule mesure qui ait un « bon » et un « mauvais » niveau absolus :
 * 495 tampons ne se juge pas dans l'absolu, 64 % de retour si.
 */

function Tuile({ m, large }: { m: Metrique; large?: boolean }) {
  const Icone = m.icone;
  const Fleche = m.tendance === "baisse" ? ArrowDown : ArrowUp;
  const baisse = m.tendance === "baisse";

  return (
    <Link
      href={`/analyse/${m.id}`}
      className={`group flex flex-col ${large ? "col-span-2" : ""}`}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        transition: "border-color var(--t-fast) var(--ease)",
      }}
    >
      {/* L'icône occupe sa propre ligne, le titre a toute la largeur de la
          tuile. Côte à côte, la pastille et le chevron laissaient 105 px au
          libellé et « Performance des notifications » tombait sur trois
          lignes, un mot par ligne. */}
      <div className="flex items-start justify-between">
        <span
          className="grid shrink-0 place-items-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          <Icone size={17} strokeWidth={1.9} />
        </span>
        <ChevronRight size={15} className="shrink-0" style={{ color: "var(--text-faint)" }} />
      </div>

      <span
        className="mt-2.5 block text-[12px] leading-tight"
        style={{ color: "var(--text-dim)" }}
      >
        {m.titre}
      </span>

      {m.anneau !== undefined ? (
        <div className="mt-2 flex items-center gap-4">
          <ProgressRing
            valeur={m.anneau}
            taille={72}
            libelle={m.titre}
            couleur={couleurNiveau(m.anneau)}
          />
          <span className="min-w-0">
            <span
              className="block text-[13px] font-semibold"
              style={{ color: couleurNiveau(m.anneau) }}
            >
              {libelleNiveau(m.anneau)}
            </span>
            <span
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: baisse ? "var(--danger)" : "var(--success)" }}
            >
              <Fleche size={11} strokeWidth={2.6} />
              {m.delta}
            </span>
            <span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-faint)" }}>
              vs mois précédent
            </span>
          </span>
        </div>
      ) : (
        <>
          <p className="kpi-number mt-2 text-[22px]" style={{ color: "var(--text)" }}>
            {m.valeur}
          </p>
          <p className="mt-2 flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: baisse ? "var(--danger-soft)" : "var(--success-soft)",
                color: baisse ? "var(--danger)" : "var(--success)",
              }}
            >
              <Fleche size={10} strokeWidth={2.6} />
              {m.delta}
            </span>
          </p>
        </>
      )}
    </Link>
  );
}

export default function MetriquesCles() {
  // L'anneau ouvre, les quatre chiffres se rangent en deux colonnes, et la
  // dernière reprend la largeur : à six tuiles dans une grille de deux, la
  // sixième restait seule face à un demi-écran vide.
  const [anneau, ...suite] = METRIQUES;
  const derniere = suite[suite.length - 1];
  const milieu = suite.slice(0, -1);

  return (
    <section aria-labelledby="mesures-titre">
      <h2
        id="mesures-titre"
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-dim)" }}
      >
        Santé du programme
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {/* L'anneau prend la largeur : à 165 px, l'arc et son verdict se
            marchent dessus. */}
        <Tuile m={anneau} large />
        {milieu.map((m) => (
          <Tuile key={m.id} m={m} />
        ))}
        <Tuile m={derniere} large />
      </div>
    </section>
  );
}
