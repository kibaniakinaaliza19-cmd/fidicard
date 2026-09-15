"use client";

import { useId } from "react";

/**
 * FidiCard brand mark — original vector interpretation of a "link":
 * two interlocking stadium loops (commerçant + client) woven together, tilted,
 * with the FidiCard gold→orange gradient. Scales cleanly from 16px up.
 */
export default function FidiLogo({
  size = 36,
  className,
}: {
  size?: number;
  /** kept for API compatibility */
  glow?: boolean;
  className?: string;
}) {
  /* Identifiants uniques par instance.
   *
   * Le dégradé et le masque s'appelaient « fidiGrad » et « fidiWeave » en dur.
   * Dès que deux logos coexistent — la barre latérale, masquée sous md, et
   * l'en-tête mobile — les deux SVG déclarent les mêmes identifiants, et la
   * référence url(#fidiGrad) résout vers la première déclaration du document :
   * celle qui se trouve dans le sous-arbre masqué. Le logo de l'en-tête
   * perdait alors son dégradé et se peignait en noir sur noir : invisible. */
  const uid = useId().replace(/:/g, "");
  const grad = `fidiGrad-${uid}`;
  const weave = `fidiWeave-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-24 -24 48 48"
      fill="none"
      className={className}
      aria-label="FidiCard"
      role="img"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="-14" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD54A" />
          <stop offset="45%" stopColor="#FF8A3D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <mask id={weave}>
          <rect x="-24" y="-24" width="48" height="48" fill="white" />
          <circle cx="4.91" cy="3.44" r="9.8" fill="black" />
        </mask>
      </defs>

      {/* client link (down-right) */}
      <g transform="translate(4.91 3.44) rotate(35)">
        <rect x="-12" y="-7" width="24" height="14" rx="7" fill="none" stroke={`url(#${grad})`} strokeWidth="4.6" />
      </g>
      {/* commerçant link (up-left), tucked behind at the crossing */}
      <g mask={`url(#${weave})`}>
        <g transform="translate(-4.91 -3.44) rotate(35)">
          <rect x="-12" y="-7" width="24" height="14" rx="7" fill="none" stroke={`url(#${grad})`} strokeWidth="4.6" />
        </g>
      </g>
    </svg>
  );
}
