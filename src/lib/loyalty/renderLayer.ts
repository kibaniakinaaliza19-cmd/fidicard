// Rendu dynamique des zones fonctionnelles (chantier 2, couche 3).
//
// Une zone (types/layer.ts) est une DÉCLARATION : « ici, une grille de
// tampons ». Le nombre de tampons, les paliers et les couleurs viennent de la
// config de fidélité ; le remplissage vient de l'état du client. Cette
// fonction pure transforme le tout en calques ordinaires au moment de
// l'affichage — ils ne sont JAMAIS persistés. Tous les rendus (éditeur,
// galerie, /join, aperçus Wallet) passent par ici : une seule source, aucune
// copie qui puisse dériver.
//
// Parité géométrique : les formules (pas ≤ 14, hauteur ×1.55, centrage,
// libellés de paliers) reproduisent à l'identique l'ancienne grille en
// calques de lib/stampLayers.ts, pour que la migration v1→v2 soit invisible.

import type {
  Layer,
  ShapeLayer,
  StampGridZone,
  StampShape,
  TextLayer,
  Zone,
} from "@/types/layer";
import type { LoyaltyConfig } from "@/lib/loyalty";

/** hauteur d'un tampon (en % de la hauteur carte) pour une largeur donnée */
export const STAMP_HEIGHT_RATIO = 1.55;
/** pas horizontal maximal entre deux tampons (%) — grille aérée */
const MAX_STEP = 14;

export interface RenderClientState {
  tampons?: number;
  points?: number;
  paliersAtteints?: number[];
}

export interface RenderOptions {
  /** état du client à afficher (tampons remplis) ; absent = carte vierge */
  client?: RenderClientState;
  /** zIndex du premier calque produit (au-dessus du design) */
  zBase?: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function radiusOf(shape: StampShape): number {
  return shape === "cercle" ? 50 : shape === "arrondi" ? 25 : 6;
}

/** position (x, y) du tampon d'index i (0-based) dans la zone */
export function stampPosition(
  zone: StampGridZone,
  total: number,
  i: number,
): { x: number; y: number; w: number; h: number } {
  const perRow =
    zone.perRow === "auto" ? (total <= 6 ? total : Math.ceil(total / 2)) : clamp(zone.perRow, 1, total);
  const rows = Math.ceil(total / perRow);
  const size = clamp(zone.size, 2, 30);
  const hSize = size * STAMP_HEIGHT_RATIO;
  const step = perRow > 1 ? Math.min(MAX_STEP, (zone.frame.w - size) / (perRow - 1)) : 0;
  const gridW = (perRow - 1) * step + size;
  const startX = zone.frame.x + (zone.frame.w - gridW) / 2;
  const rowStep = rows > 1 ? (zone.frame.h - hSize) / (rows - 1) : 0;
  const startY = rows > 1 ? zone.frame.y : zone.frame.y + (zone.frame.h - hSize) / 2;
  const r = Math.floor(i / perRow);
  const c = i % perRow;
  return { x: startX + c * step, y: startY + r * rowStep, w: size, h: hSize };
}

function renderStampGrid(zone: StampGridZone, config: LoyaltyConfig, opts: RenderOptions): Layer[] {
  if (config.mode !== "stamps") return [];
  const total = clamp(Math.round(config.totalStamps), 1, 24);
  const filled = clamp(Math.round(opts.client?.tampons ?? 0), 0, total);
  const style = config.stampStyle;
  let z = opts.zBase ?? 1000;
  const layers: Layer[] = [];

  for (let i = 0; i < total; i++) {
    const p = stampPosition(zone, total, i);
    const on = i < filled;
    const isTier = config.paliers.some((t) => t.position === i + 1);
    layers.push({
      id: `${zone.id}:tampon:${i + 1}`,
      type: "shape",
      name: `Tampon ${i + 1}`,
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
      rotation: 0,
      opacity: 100,
      zIndex: z++,
      locked: false,
      hidden: false,
      groupId: zone.id,
      shape: zone.shape === "cercle" ? "circle" : "rect",
      radius: radiusOf(zone.shape),
      fill: on ? style.filled : style.empty,
      stroke: style.border,
      strokeWidth: isTier ? 2 : 1,
    } satisfies ShapeLayer);
  }

  if (zone.showTierLabels) {
    for (const palier of config.paliers) {
      const i = palier.position - 1;
      if (i < 0 || i >= total) continue;
      const p = stampPosition(zone, total, i);
      const stampPx = (p.w / 100) * 520;
      layers.push({
        id: `${zone.id}:palier:${palier.position}`,
        type: "text",
        name: `Palier ${palier.position} — ${palier.label}`.slice(0, 30),
        content: palier.label,
        x: p.x - p.w * 0.25,
        y: p.y + p.h * 0.32,
        width: p.w * 1.5,
        height: p.h * 0.4,
        rotation: 0,
        opacity: 100,
        zIndex: z++,
        locked: false,
        hidden: false,
        groupId: zone.id,
        font: "geist",
        fontSize: Math.max(8, Math.min(16, Math.round(stampPx * (palier.label.length > 4 ? 0.26 : 0.34)))),
        fontWeight: 700,
        italic: false,
        underline: false,
        color: style.filled,
        align: "center",
        letterSpacing: 0,
        lineHeight: 1.2,
      } satisfies TextLayer);
    }
  }

  return layers;
}

/**
 * Calques éphémères d'une zone fonctionnelle. Déterministe : mêmes entrées →
 * mêmes calques, ids stables (`<zoneId>:tampon:N`) pour que la sélection et
 * les clés React survivent aux re-rendus.
 */
export function renderLoyaltyLayer(zone: Zone, config: LoyaltyConfig, opts: RenderOptions = {}): Layer[] {
  switch (zone.kind) {
    case "stampGrid":
      return renderStampGrid(zone, config, opts);
  }
}

/** toutes les zones d'un document, empilées au-dessus des calques de design */
export function renderZones(
  zones: Zone[] | undefined,
  config: LoyaltyConfig,
  opts: RenderOptions = {},
): Layer[] {
  if (!zones || zones.length === 0) return [];
  const out: Layer[] = [];
  let zBase = opts.zBase ?? 1000;
  for (const zone of zones) {
    const layers = renderLoyaltyLayer(zone, config, { ...opts, zBase });
    zBase += layers.length;
    out.push(...layers);
  }
  return out;
}
