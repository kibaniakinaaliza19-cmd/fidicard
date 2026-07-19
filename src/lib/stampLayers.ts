// Pont entre la couche Fonctionnalités (loyaltyStore) et la couche Design
// (calques de la carte). Les tampons de la carte sont des calques nommés
// « Tampon N » ; les libellés de paliers sont des calques « Palier N — … ».
// Ces helpers savent les retrouver, les régénérer et les resynchroniser sans
// toucher au reste du design.

import type { Layer, ShapeLayer } from "@/types/layer";
import { createShapeLayer, createTextLayer, makeId } from "@/lib/layerFactory";
import type { LoyaltyConfig } from "@/lib/loyalty";

const STAMP_RE = /^Tampon (\d+)$/;
const TIER_RE = /^Palier /;

export type StampShape = "cercle" | "arrondi" | "carre";

export function getStampLayers(layers: Layer[]): ShapeLayer[] {
  return layers
    .filter((l): l is ShapeLayer => l.type === "shape" && STAMP_RE.test(l.name))
    .sort((a, b) => Number(STAMP_RE.exec(a.name)![1]) - Number(STAMP_RE.exec(b.name)![1]));
}

/** rayon (%) selon la forme choisie */
export function radiusFor(shape: StampShape): number {
  return shape === "cercle" ? 50 : shape === "arrondi" ? 25 : 6;
}

export function shapeOf(stamp: ShapeLayer): StampShape {
  if (stamp.shape === "circle" || stamp.radius >= 45) return "cercle";
  return stamp.radius >= 15 ? "arrondi" : "carre";
}

/**
 * (Re)génère la grille de tampons : supprime les anciens tampons + paliers et
 * pose une grille centrée de `config.totalStamps` éléments. Le reste du design
 * (fond, textes, logos…) n'est pas touché.
 */
export function regenerateStampGrid(
  layers: Layer[],
  config: LoyaltyConfig,
  opts: { shape: StampShape; size: number } = { shape: "cercle", size: 9 },
): Layer[] {
  const existing = getStampLayers(layers);
  // zone verticale : on reste là où étaient les tampons existants
  const avgY =
    existing.length > 0
      ? existing.reduce((s, l) => s + l.y, 0) / existing.length
      : undefined;

  const kept = layers.filter(
    (l) => !STAMP_RE.test(l.name) && !TIER_RE.test(l.name) && !/^Icône \d+$/.test(l.name),
  );

  const size = Math.max(5, Math.min(14, opts.size));
  const shown = Math.max(1, Math.min(24, config.totalStamps));
  const perRow = shown <= 6 ? shown : Math.ceil(shown / 2);
  const rows = Math.ceil(shown / perRow);
  const gap = perRow > 1 ? Math.min(14, (84 - size) / (perRow - 1)) : 0;
  const rowWidth = (perRow - 1) * gap + size;
  const startX = 8 + (84 - rowWidth) / 2;
  const hSize = size * 1.55; // hauteur % ≈ carré visuel (ratio carte)
  const rowGap = hSize + 3;
  const startY =
    avgY !== undefined ? Math.max(8, avgY) : rows === 1 ? 52 : 46;

  const stamps: Layer[] = [];
  let z = kept.length;
  for (let i = 0; i < shown; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    stamps.push(
      createShapeLayer(++z, "circle", {
        id: makeId("stamp"),
        name: `Tampon ${i + 1}`,
        x: startX + c * gap,
        y: startY + r * rowGap,
        width: size,
        height: hSize,
        radius: radiusFor(opts.shape),
        shape: opts.shape === "cercle" ? "circle" : "rect",
        fill: config.stampStyle.empty,
        stroke: config.stampStyle.border,
        strokeWidth: 1,
      }),
    );
  }
  return applyTiersToLayers([...kept, ...stamps], config);
}

/**
 * Resynchronise les paliers du programme sur les tampons de la carte :
 * libellé écrit DANS le tampon, contour accentué. Idempotent — les anciens
 * calques « Palier … » sont remplacés.
 */
export function applyTiersToLayers(layers: Layer[], config: LoyaltyConfig): Layer[] {
  const kept = layers.filter((l) => !TIER_RE.test(l.name));
  const stamps = getStampLayers(kept);
  if (stamps.length === 0) return kept;

  const out: Layer[] = kept.map((l) => {
    if (l.type === "shape" && STAMP_RE.test(l.name)) {
      const n = Number(STAMP_RE.exec(l.name)![1]);
      const isTier =
        config.mode === "stamps" && config.paliers.some((p) => p.position === n);
      return {
        ...l,
        stroke: l.stroke === "transparent" && !isTier ? l.stroke : config.stampStyle.border,
        strokeWidth: isTier ? 2 : Math.min(l.strokeWidth || 1, 1),
      };
    }
    return l;
  });

  if (config.mode !== "stamps") return out;

  let z = out.length;
  for (const palier of config.paliers) {
    const s = stamps[palier.position - 1];
    if (!s) continue;
    const stampPx = (s.width / 100) * 520;
    out.push(
      createTextLayer(++z, {
        id: makeId("tier"),
        name: `Palier ${palier.position} — ${palier.label}`.slice(0, 30),
        content: palier.label,
        x: s.x - s.width * 0.25,
        y: s.y + s.height * 0.32,
        width: s.width * 1.5,
        height: s.height * 0.4,
        fontSize: Math.max(8, Math.min(16, Math.round(stampPx * (palier.label.length > 4 ? 0.26 : 0.34)))),
        fontWeight: 700,
        color: config.stampStyle.filled,
        align: "center",
      }),
    );
  }
  return out;
}

/** applique uniquement le style (couleurs / forme / taille) aux tampons existants */
export function restyleStamps(
  layers: Layer[],
  config: LoyaltyConfig,
  opts: { shape?: StampShape; size?: number },
): Layer[] {
  const stamps = getStampLayers(layers);
  if (stamps.length === 0) return layers;
  const mutated = layers.map((l) => {
    if (l.type !== "shape" || !STAMP_RE.test(l.name)) return l;
    const next: ShapeLayer = { ...l, fill: config.stampStyle.empty, stroke: config.stampStyle.border };
    if (opts.shape) {
      next.radius = radiusFor(opts.shape);
      next.shape = opts.shape === "cercle" ? "circle" : "rect";
    }
    if (opts.size) {
      const cx = l.x + l.width / 2;
      const cy = l.y + l.height / 2;
      const hSize = opts.size * (l.height / l.width || 1.55);
      next.x = cx - opts.size / 2;
      next.y = cy - hSize / 2;
      next.width = opts.size;
      next.height = hSize;
    }
    return next;
  });
  return applyTiersToLayers(mutated, config);
}
