"use client";

import { motion } from "framer-motion";
import { ArrowUp, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";

interface StatCardGlowProps {
  label: string;
  value: number;
  delta: string;
  icon: LucideIcon;
  /**
   * Disposition en ligne, pour la tuile qui occupe toute la largeur.
   *
   * Trois tuiles dans une grille à deux colonnes laissent la troisième seule
   * face à un vide de la moitié de l'écran. Elle prend donc la largeur
   * entière, et se recompose horizontalement — empilée, elle serait deux fois
   * plus haute que ses voisines pour la même quantité d'information.
   */
  large?: boolean;
}

/**
 * Une tuile de chiffre.
 *
 * Toutes portent la même teinte. Chacune recevait auparavant une couleur libre
 * — dont un violet qui n'existe nulle part ailleurs dans le produit — et trois
 * couleurs sans signification côte à côte se lisent comme un code que le
 * commerçant cherche à déchiffrer. Ce qui distingue ces tuiles, c'est leur
 * chiffre, pas leur pastille.
 */
export default function StatCardGlow({
  label,
  value,
  delta,
  icon: Icon,
  large = false,
}: StatCardGlowProps) {
  const count = useCountUp(value);

  const pastille = (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
    >
      <Icon size={16} />
    </span>
  );

  /* Le pourcentage tient sur une ligne, la comparaison passe dessous.
     « +8% vs mois précédent » d'un seul tenant se coupait n'importe où dans
     une colonne de 125 px. */
  const evolution = (
    <>
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "var(--success-soft)", color: "var(--success)" }}
      >
        <ArrowUp size={11} />
        {delta}
      </span>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
        vs mois précédent
      </p>
    </>
  );

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 16px 32px -12px var(--accent-glow)" }}
      className={`rounded-2xl border p-5 ${large ? "col-span-2 lg:col-span-1" : ""}`}
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      {large ? (
        <div className="flex items-center gap-4 lg:block">
          {pastille}
          <div className="min-w-0 flex-1 lg:mt-4">
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {count.toLocaleString("fr-FR")}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
              {label}
            </p>
          </div>
          <div className="shrink-0 text-right lg:mt-3 lg:text-left">{evolution}</div>
        </div>
      ) : (
        <>
          {pastille}
          <p className="mt-4 text-2xl font-bold" style={{ color: "var(--text)" }}>
            {count.toLocaleString("fr-FR")}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
            {label}
          </p>
          <div className="mt-3">{evolution}</div>
        </>
      )}
    </motion.div>
  );
}
