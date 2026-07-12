"use client";

/**
 * FidiCard brand mark — an interlaced orange "knot" emblem.
 * Recreated as a scalable SVG (no raster asset) so it stays crisp at any size.
 * Two overlapping rounded-square loops (woven over/under) around a square core.
 */
export default function FidiLogo({
  size = 36,
  glow = true,
  className,
}: {
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 5px rgba(240,101,62,0.5))" } : undefined}
      aria-label="FidiCard"
      role="img"
    >
      <defs>
        <linearGradient id="fidiGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffc24d" />
          <stop offset="50%" stopColor="#ff7a2f" />
          <stop offset="100%" stopColor="#e5391b" />
        </linearGradient>
        {/* mask that punches small gaps where the second loop passes UNDER the first,
            to fake the woven over/under crossings */}
        <mask id="fidiWeave">
          <rect x="0" y="0" width="48" height="48" fill="white" />
          <g fill="black">
            <circle cx="24" cy="7.5" r="3.6" />
            <circle cx="24" cy="40.5" r="3.6" />
          </g>
        </mask>
      </defs>

      {/* loop A (rotated 45°) — drawn first, partially hidden at crossings by the mask */}
      <g mask="url(#fidiWeave)">
        <rect
          x="8.5" y="8.5" width="31" height="31" rx="3.5"
          transform="rotate(45 24 24)"
          fill="none" stroke="url(#fidiGrad)" strokeWidth="5" strokeLinejoin="round"
        />
      </g>

      {/* loop B (upright) — drawn on top, so it reads as passing OVER at the gaps */}
      <rect
        x="8.5" y="8.5" width="31" height="31" rx="3.5"
        fill="none" stroke="url(#fidiGrad)" strokeWidth="5" strokeLinejoin="round"
      />

      {/* square core */}
      <rect
        x="17.5" y="17.5" width="13" height="13" rx="2.5"
        transform="rotate(45 24 24)"
        fill="none" stroke="url(#fidiGrad)" strokeWidth="4" strokeLinejoin="round"
      />
    </svg>
  );
}
