"use client";

import { useId } from "react";

/**
 * L'orbe de FidiIA.
 *
 * Une matière qui se déforme lentement, deux arcs qui font un regard. C'est le
 * seul endroit de l'application où l'on se permet un objet purement expressif :
 * il donne un interlocuteur à qui parler, ce qu'un champ de saisie seul ne fait
 * pas.
 *
 * L'animation est en SMIL, dans le SVG, et non pilotée par React : la
 * déformation tourne en continu sans provoquer un seul rendu, et le composant
 * ne coûte rien pendant que la conversation vit à côté. La règle globale
 * prefers-reduced-motion la fige pour qui l'a demandé.
 *
 * Palette orange, pas violette. Les deux références envoyées ne demandaient
 * pas la même chose : la première pour la matière et la façon dont les
 * couleurs se fondent, la seconde pour les couleurs elles-mêmes.
 */

/* Trois silhouettes proches, entre lesquelles la forme fait l'aller-retour.
   Assez différentes pour qu'on voie que ça bouge, assez proches pour qu'aucune
   image ne soit un « moment raté » de l'animation. */
const FORMES = [
  "M100,26 C142,26 174,58 174,100 C174,142 142,174 100,174 C58,174 26,142 26,100 C26,58 58,26 100,26 Z",
  "M100,22 C148,30 178,62 172,106 C166,150 132,178 92,172 C52,166 22,134 28,92 C34,50 60,20 100,22 Z",
  "M100,28 C138,20 180,54 176,98 C172,142 138,180 96,176 C54,172 20,138 24,96 C28,54 62,36 100,28 Z",
];

export default function OrbeIA({
  taille = 96,
  actif = false,
}: {
  taille?: number;
  /** l'assistant travaille : le regard se ferme, la matière s'accélère */
  actif?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const matiere = `orbe-matiere-${uid}`;
  const lueur = `orbe-lueur-${uid}`;
  const decoupe = `orbe-decoupe-${uid}`;

  const duree = actif ? "3s" : "7s";

  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 200 200"
      role="img"
      aria-label={actif ? "FidiIA réfléchit" : "FidiIA"}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id={matiere} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ff8a5c" />
          <stop offset="45%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="#8a2c0d" />
        </radialGradient>

        <radialGradient id={lueur} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>

        {/* La forme sert de masque : la matière ne déborde jamais du contour,
            quelle que soit l'étape de la déformation. */}
        <clipPath id={decoupe}>
          <path d={FORMES[0]}>
            <animate
              attributeName="d"
              dur={duree}
              repeatCount="indefinite"
              values={`${FORMES[0]};${FORMES[1]};${FORMES[2]};${FORMES[0]}`}
              calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
            />
          </path>
        </clipPath>
      </defs>

      {/* Halo. Large, très faible : il pose l'objet dans le noir sans
          l'entourer d'un cercle net. */}
      <circle cx="100" cy="100" r="98" fill={`url(#${lueur})`} />

      <path
        d={FORMES[0]}
        fill={`url(#${matiere})`}
        style={{ filter: "saturate(1.05)" }}
      >
        <animate
          attributeName="d"
          dur={duree}
          repeatCount="indefinite"
          values={`${FORMES[0]};${FORMES[1]};${FORMES[2]};${FORMES[0]}`}
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </path>

      {/* Deux gouttes claires qui dérivent à l'intérieur : c'est ce qui fait
          lire la surface comme une matière et non comme un aplat. */}
      <g clipPath={`url(#${decoupe})`} opacity="0.55">
        <circle cx="70" cy="70" r="34" fill="#ffb08c" opacity="0.5">
          <animate attributeName="cx" dur="9s" repeatCount="indefinite" values="70;120;70" />
          <animate attributeName="cy" dur="11s" repeatCount="indefinite" values="70;118;70" />
        </circle>
        <circle cx="130" cy="120" r="26" fill="#ffd0b8" opacity="0.35">
          <animate attributeName="cx" dur="13s" repeatCount="indefinite" values="130;72;130" />
          <animate attributeName="cy" dur="8s" repeatCount="indefinite" values="120;74;120" />
        </circle>
      </g>

      {/* Le regard. Deux arcs, pas deux points : un arc a une expression, un
          point n'en a pas. Ils se ferment quand l'assistant travaille. */}
      <g
        stroke="#2a0f05"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      >
        <path d={actif ? "M74,104 Q84,98 94,104" : "M74,106 Q84,92 94,106"} />
        <path d={actif ? "M106,104 Q116,98 126,104" : "M106,106 Q116,92 126,106"} />
      </g>

      {/* L'étincelle : le seul repère fixe, en haut à droite, qui signe
          l'objet comme une marque plutôt qu'une bulle générique. */}
      <g transform="translate(158 44)">
        <path
          d="M0,-13 L3.4,-3.4 L13,0 L3.4,3.4 L0,13 L-3.4,3.4 L-13,0 L-3.4,-3.4 Z"
          fill="#ffd0b8"
        >
          <animate
            attributeName="opacity"
            dur="4s"
            repeatCount="indefinite"
            values="0.5;1;0.5"
          />
        </path>
      </g>
    </svg>
  );
}
