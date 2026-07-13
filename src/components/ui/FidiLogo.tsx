"use client";

/**
 * FidiCard brand mark — original abstract symbol.
 * Two monoline ribbons (commerçant + client) that reach toward each other and
 * connect, with 2-fold rotational symmetry. Constant stroke, subtle gold→orange
 * gradient, no glow. Scales cleanly from 16px to 2000px.
 */
export default function FidiLogo({
  size = 36,
  className,
}: {
  size?: number;
  /** kept for API compatibility; the mark intentionally has no glow */
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
      aria-label="FidiCard"
      role="img"
    >
      <defs>
        <linearGradient id="fidiGrad" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD54A" />
          <stop offset="45%" stopColor="#FF8A3D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#fidiGrad)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 14 H26 a8 8 0 0 1 8 8" />
        <path d="M35 34 H22 a8 8 0 0 1 -8 -8" />
      </g>
    </svg>
  );
}
