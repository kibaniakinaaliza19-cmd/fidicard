"use client";

/**
 * FidiCard brand mark — two interlocking "C" hooks (commerçant + client)
 * woven into a chain link, tilted, with a gold→orange gradient.
 * Scalable SVG (no raster asset) so it stays crisp at any size.
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
      style={glow ? { filter: "drop-shadow(0 1px 5px rgba(240,101,62,0.5))" } : undefined}
      aria-label="FidiCard"
      role="img"
    >
      <defs>
        <linearGradient id="fidiGrad" x1="24" y1="3" x2="24" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffc21e" />
          <stop offset="48%" stopColor="#ff7a1f" />
          <stop offset="100%" stopColor="#f0441a" />
        </linearGradient>
        {/* hides the top hook where the bottom hook passes in front → woven link */}
        <mask id="fidiWeave">
          <rect width="48" height="48" fill="white" />
          <circle cx="27.5" cy="30" r="7.9" fill="black" />
        </mask>
      </defs>

      <g transform="rotate(-14 24 24)">
        {/* client hook (bottom), opens up-left */}
        <circle
          cx="27.5" cy="30" r="11"
          fill="none" stroke="url(#fidiGrad)" strokeWidth="7.4" strokeLinecap="round"
          strokeDasharray="42.24 26.88" transform="rotate(-35 27.5 30)"
        />
        {/* commerçant hook (top), opens down-right, tucked behind at the crossing */}
        <g mask="url(#fidiWeave)">
          <circle
            cx="20.5" cy="18" r="11"
            fill="none" stroke="url(#fidiGrad)" strokeWidth="7.4" strokeLinecap="round"
            strokeDasharray="42.24 26.88" transform="rotate(145 20.5 18)"
          />
        </g>
      </g>
    </svg>
  );
}
