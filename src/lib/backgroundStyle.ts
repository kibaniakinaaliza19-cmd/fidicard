import type { CardBackground } from "@/types/layer";

export function backgroundToCss(bg: CardBackground): React.CSSProperties {
  if (bg.kind === "image" && bg.image) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,${bg.imageDim / 100}), rgba(0,0,0,${bg.imageDim / 100})), url(${bg.image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (bg.kind === "gradient") {
    return {
      background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`,
    };
  }
  if (bg.kind === "pattern") {
    const c = bg.patternColor;
    const patterns: Record<CardBackground["pattern"], string> = {
      dots: `radial-gradient(${c}33 1.5px, transparent 1.5px)`,
      diagonal: `repeating-linear-gradient(45deg, ${c}22 0, ${c}22 2px, transparent 2px, transparent 10px)`,
      grid: `linear-gradient(${c}22 1px, transparent 1px), linear-gradient(90deg, ${c}22 1px, transparent 1px)`,
    };
    return {
      backgroundColor: bg.color,
      backgroundImage: patterns[bg.pattern],
      backgroundSize: bg.pattern === "dots" ? "14px 14px" : bg.pattern === "grid" ? "18px 18px" : undefined,
    };
  }
  return { backgroundColor: bg.color };
}
