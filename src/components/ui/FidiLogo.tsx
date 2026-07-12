"use client";

/**
 * FidiCard brand mark — two interlocking "C" hooks (commerçant + client)
 * that link together, forming a chain-link / bond. Scalable SVG, no raster.
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
          <stop offset="50%" stopColor="#ff7a1f" />
          <stop offset="100%" stopColor="#f0441a" />
        </linearGradient>
        {/* hide the far end of the top hook where the bottom hook passes in front */}
        <mask id="fidiOverlap">
          <rect width="48" height="48" fill="white" />
          <circle cx="30" cy="30" r="6.6" fill="black" />
        </mask>
      </defs>

      {/* bottom hook (client) — opens up-left */}
      <circle
        cx="29" cy="29" r="11.5"
        fill="none" stroke="url(#fidiGrad)" strokeWidth="8.5" strokeLinecap="round"
        strokeDasharray="52 74" transform="rotate(-45 29 29)"
      />
      {/* top hook (commerçant) — opens down-right, tucked behind the bottom hook at the crossing */}
      <g mask="url(#fidiOverlap)">
        <circle
          cx="19" cy="19" r="11.5"
          fill="none" stroke="url(#fidiGrad)" strokeWidth="8.5" strokeLinecap="round"
          strokeDasharray="52 74" transform="rotate(135 19 19)"
        />
      </g>
    </svg>
  );
}
