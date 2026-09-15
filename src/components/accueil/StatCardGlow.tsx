"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";
import ProgressRing from "@/components/ui/ProgressRing";

interface StatCardGlowProps {
  label: string;
  value: number;
  delta: string;
  icon: LucideIcon;
  /** true si la variation est une baisse — la couleur seule ne suffit pas. */
  baisse?: boolean;
  /**
   * Disposition en ligne, sur toute la largeur.
   *
   * Trois tuiles dans une grille à deux colonnes laissent la troisième seule
   * face à un vide d'un demi-écran. Elle prend la largeur entière et se
   * recompose horizontalement — empilée, elle serait deux fois plus haute que
   * ses voisines pour la même quantité d'information.
   */
  large?: boolean;
  /** progression vers l'objectif du mois, affichée en anneau (0-100) */
  objectif?: number;
}

/**
 * Une tuile de chiffre.
 *
 * Hiérarchie imposée, dans cet ordre : la valeur, le libellé, la variation,
 * puis le contexte de la variation. Chacun descend d'un cran en taille et
 * monte d'un cran en discrétion — c'est ce qui permet de lire la tuile en un
 * coup d'œil au lieu de la déchiffrer.
 *
 * Toutes portent la même teinte. Chacune recevait auparavant une couleur libre
 * — dont un violet absent du reste du produit — et trois couleurs sans
 * signification côte à côte se lisent comme un code qu'on cherche à percer.
 */
export default function StatCardGlow({
  label,
  value,
  delta,
  icon: Icon,
  baisse = false,
  large = false,
  objectif,
}: StatCardGlowProps) {
  const compte = useCountUp(value);
  const Fleche = baisse ? ArrowDown : ArrowUp;

  const pastille = (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: "var(--radius-md)",
        background: "var(--accent-tint)",
        color: "var(--accent)",
      }}
    >
      <Icon size={18} strokeWidth={1.9} />
    </span>
  );

  const chiffre = (
    <>
      <p className="kpi-number text-[26px]" style={{ color: "var(--text)" }}>
        {compte.toLocaleString("fr-FR")}
      </p>
      <p className="mt-1.5 text-[13px] leading-tight" style={{ color: "var(--text-dim)" }}>
        {label}
      </p>
    </>
  );

  /* Le pourcentage tient sur une ligne, la comparaison passe dessous.
     « +8 % vs mois précédent » d'un seul tenant se coupait n'importe où dans
     une colonne de 125 px. La flèche double la couleur : un daltonien ne doit
     pas dépendre du vert pour savoir si le chiffre monte. */
  const evolution = (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        background: baisse ? "var(--danger-soft)" : "var(--success-soft)",
        color: baisse ? "var(--danger)" : "var(--success)",
      }}
    >
      <Fleche size={11} strokeWidth={2.6} />
      {delta}
    </span>
  );

  const contexte = (
    <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
      vs mois précédent
    </span>
  );

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={large ? "col-span-2 lg:col-span-1" : undefined}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      {large ? (
        /* En rangée sur téléphone, empilé dès que la carte redevient une
           colonne de grille : à 235 px de large, l'anneau et « Récompenses
           débloquées » se disputaient les mêmes pixels. */
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
          <div className="min-w-0 flex-1 lg:w-full">
            <div className="flex items-center gap-3">
              {pastille}
              <div className="min-w-0">{chiffre}</div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {evolution}
              {contexte}
            </div>
          </div>
          {objectif !== undefined && (
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <ProgressRing valeur={objectif} libelle="Objectif mensuel" taille={68} />
              <span
                className="text-[10px] leading-none"
                style={{ color: "var(--text-faint)" }}
                aria-hidden
              >
                Objectif
              </span>
            </div>
          )}
        </div>
      ) : (
        <>
          {pastille}
          <div className="mt-4">{chiffre}</div>
          <div className="mt-3">{evolution}</div>
          <p className="mt-1">{contexte}</p>
        </>
      )}
    </motion.div>
  );
}
