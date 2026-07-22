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
  IconLayer,
  Layer,
  ShapeLayer,
  StampGridZone,
  StampShape,
  TextLayer,
  Zone,
} from "@/types/layer";
import { DEFAULT_LOYALTY_CONFIG, type LoyaltyConfig } from "@/lib/loyalty";

/** hauteur d'un tampon (en % de la hauteur carte) pour une largeur donnée */
export const STAMP_HEIGHT_RATIO = 1.55;

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

/** zone neuve avec la géométrie classique (pas 14 %, 1 ou 2 rangées centrées) */
export function createDefaultStampGridZone(id: string, total: number, size = 9): StampGridZone {
  const shown = clamp(Math.round(total), 1, 24);
  const perRow = shown <= 6 ? shown : Math.ceil(shown / 2);
  const rows = Math.ceil(shown / perRow);
  const hSize = size * STAMP_HEIGHT_RATIO;
  const step = perRow > 1 ? Math.min(14, (84 - size) / (perRow - 1)) : 0;
  const gridW = (perRow - 1) * step + size;
  const gridH = (rows - 1) * (hSize + 3) + hSize;
  return {
    id,
    kind: "stampGrid",
    frame: { x: 8 + (84 - gridW) / 2, y: rows === 1 ? 52 : 46, w: gridW, h: gridH },
    size,
    shape: "cercle",
    perRow: "auto",
    showTierLabels: true,
  };
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
  const hSize = zone.stampHeight ?? size * STAMP_HEIGHT_RATIO;
  // la grille épouse exactement son cadre : le pas se déduit de la largeur
  const step = perRow > 1 ? (zone.frame.w - size) / (perRow - 1) : 0;
  const startX = perRow > 1 ? zone.frame.x : zone.frame.x + (zone.frame.w - size) / 2;
  const rowStep = rows > 1 ? (zone.frame.h - hSize) / (rows - 1) : 0;
  const startY = rows > 1 ? zone.frame.y : zone.frame.y + (zone.frame.h - hSize) / 2;
  const r = Math.floor(i / perRow);
  const c = i % perRow;
  return { x: startX + c * step, y: startY + r * rowStep, w: size, h: hSize };
}

function renderStampGrid(zone: StampGridZone, config: LoyaltyConfig, opts: RenderOptions): Layer[] {
  if (config.mode !== "stamps") return [];
  const total = clamp(Math.round(config.totalStamps), 1, 24);
  const filled = clamp(Math.round(opts.client?.tampons ?? zone.previewFilled ?? 0), 0, total);
  const style = { ...config.stampStyle, ...zone.styleOverride };
  let z = opts.zBase ?? 1000;
  const layers: Layer[] = [];

  for (let i = 0; i < total; i++) {
    const p = stampPosition(zone, total, i);
    const on = i < filled;
    // l'emphase de palier (anneau + libellé) forme un tout : masquée ensemble
    const isTier = zone.showTierLabels && config.paliers.some((t) => t.position === i + 1);
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
      stroke: isTier && style.border === "transparent" ? config.stampStyle.border : style.border,
      strokeWidth: isTier ? 2 : style.border === "transparent" ? 0 : 1,
    } satisfies ShapeLayer);

    if (zone.icon) {
      const ib = zone.iconBox ?? { dx: p.w * 0.2, dy: p.h * 0.19, w: p.w * 0.6, h: p.h * 0.63 };
      layers.push({
        id: `${zone.id}:icone:${i + 1}`,
        type: "icon",
        name: `Icône ${i + 1}`,
        x: p.x + ib.dx,
        y: p.y + ib.dy,
        width: ib.w,
        height: ib.h,
        rotation: 0,
        opacity: 100,
        zIndex: z++,
        locked: false,
        hidden: false,
        groupId: zone.id,
        icon: zone.icon,
        color: on ? "#ffffff" : zone.iconColor ?? "rgba(255,255,255,0.4)",
      } satisfies IconLayer);
    }
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

/**
 * Rendu de VIGNETTE (galerie de modèles) : chaque zone se dessine à SON propre
 * compteur de démonstration (previewTotal) et avec ses couleurs, sans dépendre
 * de la config de fidélité du commerçant. Deux modèles voisins gardent ainsi
 * des grilles distinctes dans la galerie.
 */
export function renderZonesPreview(zones: Zone[] | undefined, opts: RenderOptions = {}): Layer[] {
  if (!zones || zones.length === 0) return [];
  const out: Layer[] = [];
  let zBase = opts.zBase ?? 1000;
  for (const zone of zones) {
    const total = zone.kind === "stampGrid" ? zone.previewTotal : undefined;
    const config: LoyaltyConfig = {
      ...DEFAULT_LOYALTY_CONFIG,
      totalStamps: total ?? DEFAULT_LOYALTY_CONFIG.totalStamps,
      paliers: [],
    };
    const layers = renderLoyaltyLayer(zone, config, { zBase });
    zBase += layers.length;
    out.push(...layers);
  }
  return out;
}
