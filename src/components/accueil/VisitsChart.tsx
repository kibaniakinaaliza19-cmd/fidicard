"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, TrendingUp } from "lucide-react";
import { generateVisits } from "@/lib/visitsData";

/* Deux libellés par période.
 *
 * « 30 derniers jours » et « Évolution des visites » ne tiennent pas ensemble
 * sur une ligne de 390 px : les deux passaient sur deux lignes et l'en-tête
 * doublait de hauteur. Le déclencheur porte la forme courte, le menu déroulant
 * — qui a toute la largeur qu'il veut — garde la forme complète. */
const PERIODES = [
  { id: 7, court: "7 jours", label: "7 derniers jours" },
  { id: 30, court: "30 jours", label: "30 derniers jours" },
  { id: 90, court: "90 jours", label: "90 derniers jours" },
] as const;

const LARGEUR = 640;
const HAUTEUR = 200;
const HAUT = 14;
const BAS = 22;

/**
 * Évolution des visites.
 *
 * Un graphique sans graduation ni valeur au doigt n'est qu'une décoration :
 * on voit que ça monte, jamais de combien. Trois choses le rendent lisible —
 * une échelle verticale, une grille assez faible pour disparaître quand on
 * regarde la courbe, et une valeur exacte sous le doigt.
 */
export default function VisitsChart() {
  const [periode, setPeriode] = useState<number>(30);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [actif, setActif] = useState<number | null>(null);
  const zone = useRef<HTMLDivElement>(null);

  const points = useMemo(() => generateVisits(periode), [periode]);

  const { coords, ligne, aire, maxRond, hauteurTrace } = useMemo(() => {
    const max = Math.max(...points.map((p) => p.value));
    const maxRond = Math.ceil(max / 20) * 20;
    const hauteurTrace = HAUTEUR - HAUT - BAS;
    const coords = points.map((p, i) => ({
      x: (i / (points.length - 1)) * LARGEUR,
      y: HAUT + hauteurTrace - (p.value / maxRond) * hauteurTrace,
      ...p,
    }));
    const ligne = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");
    return {
      coords,
      ligne,
      aire: `${ligne} L ${LARGEUR} ${HAUT + hauteurTrace} L 0 ${HAUT + hauteurTrace} Z`,
      maxRond,
      hauteurTrace,
    };
  }, [points]);

  // Le point le plus proche du doigt, pas celui qu'on a touché : sur un
  // graphique de 90 points, viser une abscisse au pixel près est impossible.
  const viser = (clientX: number) => {
    const r = zone.current?.getBoundingClientRect();
    if (!r) return;
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setActif(Math.round(ratio * (points.length - 1)));
  };

  const p = actif !== null ? coords[actif] : null;
  const precedent = actif !== null && actif > 0 ? coords[actif - 1] : null;
  const variation =
    p && precedent && precedent.value > 0
      ? Math.round(((p.value - precedent.value) / precedent.value) * 100)
      : null;

  const abscisses = Array.from({ length: 6 }, (_, i) => {
    const idx = Math.round((i / 5) * (points.length - 1));
    return points[idx];
  });

  return (
    <section
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-dim)" }}
        >
          <TrendingUp size={14} className="shrink-0" style={{ color: "var(--accent)" }} strokeWidth={2.2} />
          Évolution des visites
        </h2>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOuvert((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={menuOuvert}
            className="flex cursor-pointer items-center gap-1.5 px-3 text-xs font-medium"
            style={{
              // 40 déclarés ; la règle tactile globale les porte à 44 sur un
              // écran au doigt, ce qui est le seuil visé. Déclarer 34 donnait
              // une valeur que le rendu ne respectait jamais.
              height: 40,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-3)",
              color: "var(--text)",
            }}
          >
            {PERIODES.find((r) => r.id === periode)?.court}
            <ChevronDown
              size={13}
              style={{
                color: "var(--text-faint)",
                transform: menuOuvert ? "rotate(180deg)" : "none",
                transition: "transform var(--t-fast) var(--ease)",
              }}
            />
          </button>

          <AnimatePresence>
            {menuOuvert && (
              <motion.ul
                role="listbox"
                initial={{ opacity: 0, scale: 0.98, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full mt-1.5 w-44 overflow-hidden"
                style={{
                  zIndex: "var(--z-dropdown)",
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-2)",
                }}
              >
                {PERIODES.map((r) => {
                  const choisi = r.id === periode;
                  return (
                    <li key={r.id}>
                      <button
                        role="option"
                        aria-selected={choisi}
                        onClick={() => {
                          setPeriode(r.id);
                          setActif(null);
                          setMenuOuvert(false);
                        }}
                        className="flex w-full cursor-pointer items-center justify-between px-3 text-left text-xs"
                        style={{
                          minHeight: 40,
                          color: choisi ? "var(--accent)" : "var(--text-dim)",
                          background: choisi ? "var(--accent-wash)" : "transparent",
                        }}
                      >
                        {r.label}
                        {choisi && <Check size={13} strokeWidth={2.5} />}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        ref={zone}
        className="relative pl-7"
        onPointerMove={(e) => viser(e.clientX)}
        onPointerDown={(e) => viser(e.clientX)}
        onPointerLeave={() => setActif(null)}
      >
        {/* Échelle verticale, en HTML : le SVG est étiré horizontalement
            (preserveAspectRatio="none") et déformerait les caractères. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-7 text-[10px]"
          style={{ color: "var(--text-faint)" }}
          aria-hidden
        >
          {[0, 0.5, 1].map((f) => (
            <span
              key={f}
              className="absolute right-1.5 -translate-y-1/2"
              style={{ top: HAUT + hauteurTrace * f }}
            >
              {Math.round(maxRond * (1 - f))}
            </span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
          className="w-full"
          style={{ height: HAUTEUR }}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Visites sur ${periode} jours, de ${points[0].label} à ${points[points.length - 1].label}`}
        >
          <defs>
            <linearGradient id="visitesAire" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-light)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={LARGEUR}
              y1={HAUT + hauteurTrace * f}
              y2={HAUT + hauteurTrace * f}
              stroke="var(--grid)"
              strokeWidth={1}
            />
          ))}

          <motion.path
            key={`aire-${periode}`}
            d={aire}
            fill="url(#visitesAire)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          />
          <motion.path
            key={`ligne-${periode}`}
            d={ligne}
            fill="none"
            stroke="var(--accent-light)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {p && (
            <>
              <line
                x1={p.x}
                x2={p.x}
                y1={HAUT}
                y2={HAUT + hauteurTrace}
                stroke="var(--border-hover)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {/* vectorEffect garde le cercle rond malgré l'étirement du SVG */}
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="var(--accent-light)"
                stroke="var(--surface-1)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {/* Infobulle en HTML, positionnée en pourcentage : dans le SVG étiré
            elle serait écrasée horizontalement. */}
        {p && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap px-3 py-2"
            style={{
              zIndex: "var(--z-sticky)",
              left: `calc(28px + ${(p.x / LARGEUR) * 100}% - ${(p.x / LARGEUR) * 28}px)`,
              top: 0,
              background: "var(--surface-3)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
              {p.label}
            </p>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              {p.value} visites
            </p>
            {variation !== null && (
              <p
                className="text-[10px] font-medium"
                style={{ color: variation < 0 ? "var(--danger)" : "var(--success)" }}
              >
                {variation > 0 ? "+" : ""}
                {variation}&nbsp;% vs la veille
              </p>
            )}
          </div>
        )}

        <div
          className="mt-2 flex justify-between text-[10px]"
          style={{ color: "var(--text-faint)" }}
          aria-hidden
        >
          {abscisses.map((t, i) => (
            <span key={i}>{t.label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
