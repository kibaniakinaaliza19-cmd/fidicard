"use client";

export default function BusinessLogo({
  emoji,
  from,
  to,
  size = 40,
  radius = 11,
}: {
  emoji: string;
  from: string;
  to: string;
  size?: number;
  radius?: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center shadow-lg"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(140deg, ${from}, ${to})`,
        fontSize: size * 0.5,
        lineHeight: 1,
        boxShadow: `0 4px 12px -3px ${from}66`,
      }}
    >
      <span style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>{emoji}</span>
    </span>
  );
}
