"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Info } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";
import { generateVisits } from "@/lib/visitsData";
import BottomSheet from "@/components/ui/BottomSheet";

/**
 * La pièce maîtresse du tableau de bord.
 *
 * Il n'y a qu'un chiffre par mois qui décide si le commerçant renouvelle son
 * abonnement, et c'est celui-là. Toute la hiérarchie de l'écran est construite
 * autour : c'est la seule carte à porter un dégradé orange, et le seul chiffre
 * en 56 px.
 *
 * Le fond reste sombre. Une surface orange pleine paraît plus riche sur une
 * maquette, mais du blanc sur #ff5a1f ne donne que 3,12:1 — sous le seuil de
 * lisibilité pour du texte de taille normale, et une carte de fidélité se
 * consulte au comptoir, souvent en pleine lumière.
 */

const LARGEUR = 400;
/* La courbe n'occupe que la bande basse de la carte. À 130 px elle remontait
   jusque sur la pastille « +12 % » et sur « vs mois précédent » : deux traits
   orange passaient derrière le texte, qui devenait tacheté. */
const HAUTEUR = 64;

export default function ImpactHero() {
  const clients = useCountUp(47);
  const revenu = useCountUp(2340);
  const [expliqueOuvert, setExpliqueOuvert] = useState(false);

  // La courbe de fond vient des mêmes données que le graphique principal :
  // une décoration inventée trahirait le produit à la première comparaison.
  const courbe = useMemo(() => {
    const points = generateVisits(30);
    const max = Math.max(...points.map((p) => p.value)) || 1;
    const min = Math.min(...points.map((p) => p.value));
    const etendue = max - min || 1;
    const coords = points.map((p, i) => ({
      x: (i / (points.length - 1)) * LARGEUR,
      y: HAUTEUR - 6 - ((p.value - min) / etendue) * (HAUTEUR * 0.62),
    }));
    const ligne = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");
    return {
      ligne,
      aire: `${ligne} L ${LARGEUR} ${HAUTEUR} L 0 ${HAUTEUR} Z`,
      fin: coords[coords.length - 1],
    };
  }, []);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="impact-titre"
        className="relative overflow-hidden"
        style={{
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--border-strong)",
          background:
            "radial-gradient(circle at 80% 20%, rgba(255,90,31,0.18), transparent 50%)," +
            "radial-gradient(circle at 20% 100%, rgba(255,107,44,0.08), transparent 45%)," +
            "var(--surface-1)",
          boxShadow: "var(--shadow-1)",
          padding: "var(--space-6)",
          // Réserve sous le texte pour la bande où vit la courbe. Sans elle,
          // le tracé passe derrière la pastille « +12 % » et le texte devient
          // tacheté d'orange.
          paddingBottom: 76,
        }}
      >
        {/* La courbe vit sous le texte, à 20 % d'opacité : elle donne le
            mouvement du mois sans jamais disputer la lecture du chiffre. */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
          viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
          preserveAspectRatio="none"
          style={{ height: HAUTEUR }}
          aria-hidden
        >
          <defs>
            <linearGradient id="impactAire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-light)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={courbe.aire} fill="url(#impactAire)" />
          <motion.path
            d={courbe.ligne}
            fill="none"
            stroke="var(--accent-light)"
            strokeWidth={1.5}
            strokeOpacity={0.55}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <circle cx={courbe.fin.x - 2} cy={courbe.fin.y} r={3} fill="var(--accent-light)" />
        </svg>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p
              id="impact-titre"
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-dim)" }}
            >
              Impact FidiCard ce mois-ci
            </p>
            <button
              onClick={() => setExpliqueOuvert(true)}
              aria-label="Comment ce chiffre est calculé"
              className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors"
              style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
            >
              <Info size={14} />
            </button>
          </div>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-2.5">
            <span className="kpi-number text-[56px]" style={{ color: "var(--text)" }}>
              {clients}
            </span>
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              clients sont revenus
            </span>
          </p>

          <p className="mt-2 text-[15px]" style={{ color: "var(--text-dim)" }}>
            ≈ +{revenu.toLocaleString("fr-FR")}&nbsp;€ de CA estimé
          </p>

          <p className="mt-5 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
              style={{ background: "var(--success-soft)", color: "var(--success)" }}
            >
              <ArrowUp size={12} strokeWidth={2.5} />
              +12&nbsp;%
            </span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              vs mois précédent
            </span>
          </p>
        </div>
      </motion.section>

      {/* Un chiffre estimé doit pouvoir dire comment il a été obtenu. Sans
          cela, le commerçant ne sait pas s'il peut le citer à son comptable. */}
      <BottomSheet
        open={expliqueOuvert}
        onClose={() => setExpliqueOuvert(false)}
        title="Comment ce chiffre est calculé"
      >
        <div className="space-y-3 px-5 pb-4 text-sm" style={{ color: "var(--text-dim)" }}>
          <p>
            <span style={{ color: "var(--text)" }}>Clients revenus</span> : nombre de
            clients ayant scanné leur carte au moins deux fois ce mois-ci.
          </p>
          <p>
            <span style={{ color: "var(--text)" }}>CA estimé</span> : ce nombre multiplié
            par votre panier moyen déclaré dans les réglages. C&apos;est une estimation,
            pas un relevé comptable.
          </p>
          <p>
            <span style={{ color: "var(--text)" }}>Comparaison</span> : même calcul sur le
            mois précédent, à durée écoulée égale.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
