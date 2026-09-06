"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import Donut from "@/components/analyse/Donut";
import ProgressRing from "@/components/ui/ProgressRing";
import { couleurNiveau, libelleNiveau, metriqueParId } from "@/data/metriques";

const MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const LARGEUR = 640;
const HAUTEUR = 190;
const HAUT = 16;
const BAS = 24;

/**
 * Une mesure, en grand.
 *
 * Trois choses, dans cet ordre : ce que le chiffre vaut, ce qu'il veut dire,
 * comment il a évolué. La définition n'est pas une politesse — « conversion en
 * récompense » ne se devine pas, et un commerçant qui ne sait pas ce qu'il
 * regarde ne s'en sert pas.
 */
export default function VueMesure({ id }: { id: string }) {
  // La page serveur a déjà validé l'identifiant ; s'il manquait ici, c'est un
  // bug d'appel, pas une URL inconnue.
  const mesure = metriqueParId(id);
  if (!mesure) return null;

  const Icone = mesure.icone;
  const baisse = mesure.tendance === "baisse";
  const Fleche = baisse ? ArrowDown : ArrowUp;

  const serie = mesure.serie;
  let ligne = "";
  let aire = "";
  let maxRond = 0;
  const hauteurTrace = HAUTEUR - HAUT - BAS;

  if (serie) {
    const max = Math.max(...serie);
    maxRond = Math.ceil(max / (max > 100 ? 100 : max > 20 ? 10 : 1)) * (max > 100 ? 100 : max > 20 ? 10 : 1);
    const coords = serie.map((v, i) => ({
      x: (i / (serie.length - 1)) * LARGEUR,
      y: HAUT + hauteurTrace - (v / maxRond) * hauteurTrace,
    }));
    ligne = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    aire = `${ligne} L ${LARGEUR} ${HAUT + hauteurTrace} L 0 ${HAUT + hauteurTrace} Z`;
  }

  const total = mesure.segments?.reduce((s, seg) => s + seg.value, 0) ?? 0;

  return (
    <div>
      {/* En-tête : « Analyse », et un retour qui ramène à l'accueil. */}
      <header className="flex items-center gap-2 px-4 pb-5 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/accueil"
          className="-ml-2 flex items-center gap-1.5 pr-2 text-sm font-medium"
          style={{ minHeight: 44, color: "var(--text-dim)" }}
        >
          <ArrowLeft size={18} />
          Accueil
        </Link>
        <span
          className="ml-auto text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-faint)" }}
        >
          Analyse
        </span>
      </header>

      <div className="space-y-5 px-4 pb-10 sm:px-6 lg:px-8">
        <section
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="grid shrink-0 place-items-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              <Icone size={18} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                {mesure.titre}
              </h1>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-5">
            {mesure.anneau !== undefined ? (
              <ProgressRing
                valeur={mesure.anneau}
                taille={92}
                epaisseur={6}
                libelle={mesure.titre}
                couleur={couleurNiveau(mesure.anneau)}
              />
            ) : (
              <p className="kpi-number text-[40px]" style={{ color: "var(--text)" }}>
                {mesure.valeur}
              </p>
            )}

            <div>
              {mesure.anneau !== undefined && (
                <p
                  className="text-sm font-semibold"
                  style={{ color: couleurNiveau(mesure.anneau) }}
                >
                  {libelleNiveau(mesure.anneau)}
                </p>
              )}
              <p className="mt-1 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: baisse ? "var(--danger-soft)" : "var(--success-soft)",
                    color: baisse ? "var(--danger)" : "var(--success)",
                  }}
                >
                  <Fleche size={11} strokeWidth={2.6} />
                  {mesure.delta}
                </span>
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  vs mois précédent
                </span>
              </p>
            </div>
          </div>

          <p
            className="mt-5 border-t pt-4 text-sm leading-relaxed"
            style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
          >
            {mesure.definition}
          </p>
        </section>

        {serie && (
          <section
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
            }}
          >
            <h2
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-dim)" }}
            >
              Sur douze mois{mesure.uniteSerie ? ` · en ${mesure.uniteSerie}` : ""}
            </h2>

            <div className="relative pl-7">
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
                aria-label={`${mesure.titre} sur douze mois`}
              >
                <defs>
                  <linearGradient id="mesureAire" x1="0" y1="0" x2="0" y2="1">
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
                <path d={aire} fill="url(#mesureAire)" />
                <path
                  d={ligne}
                  fill="none"
                  stroke="var(--accent-light)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                className="mt-2 flex justify-between text-[10px]"
                style={{ color: "var(--text-faint)" }}
                aria-hidden
              >
                {MOIS.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {mesure.segments && (
          <section
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
            }}
          >
            <h2
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-dim)" }}
            >
              Répartition
            </h2>
            <Donut
              segments={mesure.segments}
              centerValue={total.toLocaleString("fr-FR")}
              centerLabel={mesure.titre.split(" ").pop() ?? ""}
              size={168}
            />
          </section>
        )}
      </div>
    </div>
  );
}
