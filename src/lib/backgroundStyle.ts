import type { CardBackground } from "@/types/layer";

/**
 * Le fond de la carte, en CSS.
 *
 * Jamais la propriété raccourcie `background` : React avertit dès qu'un rendu
 * la retire alors qu'une propriété détaillée du même groupe est encore posée.
 * C'est exactement ce qui arrivait en passant d'un fond dégradé à un fond à
 * motif — et le commerçant voyait « 1 Issue » s'allumer en changeant de style.
 *
 * Les quatre clés sont toujours renvoyées, à `undefined` quand elles ne
 * servent pas : le diff n'a alors jamais à en supprimer une.
 */
export function backgroundToCss(bg: CardBackground): React.CSSProperties {
  const fond: React.CSSProperties = {
    backgroundColor: bg.color,
    backgroundImage: undefined,
    backgroundSize: undefined,
    backgroundPosition: undefined,
  };

  if (bg.kind === "image" && bg.image) {
    const voile = `rgba(0,0,0,${bg.imageDim / 100})`;
    return {
      ...fond,
      backgroundImage: `linear-gradient(${voile}, ${voile}), url(${bg.image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  if (bg.kind === "gradient") {
    return {
      ...fond,
      backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`,
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
      ...fond,
      backgroundImage: patterns[bg.pattern],
      backgroundSize:
        bg.pattern === "dots" ? "14px 14px" : bg.pattern === "grid" ? "18px 18px" : undefined,
    };
  }

  return fond;
}
