"use client";

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";

/**
 * Le chiffre du mois, sur une surface orange pleine.
 *
 * C'est la seule carte de l'application qui soit entièrement colorée, et c'est
 * volontaire : il n'y a qu'un chiffre par mois qui décide si le commerçant
 * renouvelle son abonnement, et c'est celui-là. Tout le reste de l'écran est
 * noir et gris pour que celui-ci porte.
 *
 * Le dégradé va du rouge profond vers l'orange, et non l'inverse, parce que le
 * texte est en haut à gauche : c'est le seul sens qui laisse le blanc sur la
 * partie sombre de la rampe. Voir --accent-deep dans globals.css.
 */
export default function ImpactHero() {
  const clients = useCountUp(47);
  const revenue = useCountUp(2340);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background:
          "linear-gradient(135deg, var(--accent-deep) 0%, var(--accent-2) 45%, var(--accent-1) 100%)",
        boxShadow: "0 18px 40px -20px var(--accent-glow)",
      }}
    >
      {/* Vague décorative, en bas à droite, là où il n'y a pas de texte. */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full"
        viewBox="0 0 400 96"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 62 C 70 20, 130 88, 200 54 S 330 12, 400 46 L400 96 L0 96 Z"
          fill="rgba(255,255,255,0.10)"
        />
        <path
          d="M0 78 C 80 44, 140 100, 210 72 S 340 40, 400 66 L400 96 L0 96 Z"
          fill="rgba(255,255,255,0.08)"
        />
      </svg>

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-white">
          Impact FidiCard ce mois-ci
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-5xl font-extrabold tracking-tight text-white">{clients}</span>
          <span className="text-xl font-semibold text-white">clients sont revenus</span>
        </div>
        <p className="mt-2 text-base text-white/90">
          ≈ +{revenue.toLocaleString("fr-FR")} € de CA estimé
        </p>
        <span
          className="mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ background: "rgba(0, 0, 0, 0.22)" }}
        >
          <ArrowUp size={11} />
          +12% vs mois précédent
        </span>
      </div>
    </motion.div>
  );
}
