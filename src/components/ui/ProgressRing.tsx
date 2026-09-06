"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Anneau de progression.
 *
 * Le cercle est fin — 10 % du rayon. Un anneau épais lit comme un camembert
 * et suggère une part d'un tout ; ici on montre une avancée vers un objectif,
 * ce qui n'est pas la même idée.
 *
 * L'arc démarre à midi et tourne dans le sens des aiguilles, parce que c'est
 * le sens dans lequel on lit une jauge sans avoir à y penser.
 */
export default function ProgressRing({
  valeur,
  taille = 76,
  epaisseur = 5,
  libelle,
}: {
  /** progression, de 0 à 100 */
  valeur: number;
  taille?: number;
  epaisseur?: number;
  libelle?: string;
}) {
  const reduit = useReducedMotion();
  const borne = Math.max(0, Math.min(100, valeur));
  const rayon = (taille - epaisseur) / 2;
  const perimetre = 2 * Math.PI * rayon;

  return (
    <div
      className="relative shrink-0"
      style={{ width: taille, height: taille }}
      role="img"
      aria-label={libelle ? `${borne} % — ${libelle}` : `${borne} %`}
    >
      <svg width={taille} height={taille} className="-rotate-90">
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke="var(--border)"
          strokeWidth={epaisseur}
        />
        <motion.circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={perimetre}
          initial={{ strokeDashoffset: reduit ? perimetre * (1 - borne / 100) : perimetre }}
          animate={{ strokeDashoffset: perimetre * (1 - borne / 100) }}
          transition={{ duration: reduit ? 0 : 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>

      {/* Centrage optique : `inset-0` + grid place le texte sur le centre
          géométrique exact, quelle que soit la taille de l'anneau.
          Seul le pourcentage tient à l'intérieur. Le libellé complet y
          débordait sur l'arc — il vit désormais sous l'anneau, et reste porté
          par l'aria-label pour les lecteurs d'écran. */}
      <div className="absolute inset-0 grid place-items-center leading-none">
        <span className="kpi-number text-[16px]" style={{ color: "var(--text)" }} aria-hidden>
          {borne}&nbsp;%
        </span>
      </div>
    </div>
  );
}
