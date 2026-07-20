// Migration v1 → v2 d'un document de carte (chantier 2).
//
// Un document v1 stocke sa grille de fidélité en calques concrets
// (« Tampon N », « Icône N », « Palier … »). La migration les regroupe en UNE
// StampGridZone déclarative dont la géométrie et les couleurs sont relevées
// sur les calques existants — le rendu (lib/loyalty/renderLayer.ts) reproduit
// alors la carte à l'identique. Les calques retirés sont conservés dans
// design_json_v1 : design + design_json_v1 = document v1 complet (rollback).
//
// Idempotente : un document v2 ressort inchangé.

import type { CardDoc, IconLayer, StampGridZone, TextLayer } from "@/types/layer";
import { getStampLayers, shapeOf } from "@/lib/stampLayers";
import { makeId } from "@/lib/layerFactory";

const TIER_RE = /^Palier /;
const ICON_RE = /^Icône (\d+)$/;

export function migrateCardDoc(doc: CardDoc): CardDoc {
  if (doc.version === 2) return doc;

  const stamps = getStampLayers(doc.layers);
  if (stamps.length === 0) {
    return { ...doc, version: 2, zones: doc.zones ?? [] };
  }

  const total = stamps.length;
  const gridIcons = doc.layers
    .filter((l): l is IconLayer => l.type === "icon" && ICON_RE.test(l.name))
    .sort((a, b) => Number(ICON_RE.exec(a.name)![1]) - Number(ICON_RE.exec(b.name)![1]));
  const iconsMatch = gridIcons.length === total;

  // géométrie relevée sur les calques. Le cadre est reconstruit depuis le PAS
  // observé (1ᵉʳ intervalle), pas depuis la boîte englobante brute : les
  // largeurs détectées sur photo varient de quelques dixièmes de % (bruit
  // d'arrondi) et pollueraient le pas — la grille physique, elle, est uniforme.
  const size = stamps[0].width;
  const stampHeight = stamps[0].height;
  const firstRowY = stamps[0].y;
  const observedPerRow = stamps.filter((s) => Math.abs(s.y - firstRowY) < stampHeight / 2).length;
  const autoPerRow = total <= 6 ? total : Math.ceil(total / 2);
  const rows = Math.ceil(total / observedPerRow);
  const stepX = observedPerRow > 1 ? stamps[1].x - stamps[0].x : 0;
  const rowStep = rows > 1 ? stamps[observedPerRow].y - stamps[0].y : 0;
  const frame = {
    x: stamps[0].x,
    y: stamps[0].y,
    w: (observedPerRow - 1) * stepX + size,
    h: (rows - 1) * rowStep + stampHeight,
  };

  // remplissage décoratif : les grilles v1 remplissent en tête de série
  const emptyFill = stamps[total - 1].fill;
  const previewFilled = stamps.filter((s) => s.fill !== emptyFill).length;
  const filledColor = stamps.find((s) => s.fill !== emptyFill)?.fill;

  // contour relevé sur un tampon non-palier (les paliers sont sur-lignés)
  const plainStamp = stamps.find((s) => s.strokeWidth < 2) ?? stamps[0];
  const border = plainStamp.stroke;
  // v1 écrivait libellés de palier et tampons validés de la même couleur
  const tierText = doc.layers.find(
    (l): l is TextLayer => l.type === "text" && TIER_RE.test(l.name),
  );

  const zone: StampGridZone = {
    id: makeId("zone"),
    kind: "stampGrid",
    frame,
    size,
    ...(Math.abs(stampHeight - size * 1.55) > 0.001 ? { stampHeight } : {}),
    shape: shapeOf(stamps[0]),
    perRow: observedPerRow === autoPerRow ? "auto" : Math.max(1, observedPerRow),
    // le document v1 n'affichait des libellés que s'il avait des calques Palier
    showTierLabels: doc.layers.some((l) => TIER_RE.test(l.name)),
    ...(iconsMatch
      ? {
          icon: gridIcons[0].icon,
          iconColor: (gridIcons[previewFilled] ?? gridIcons[0]).color,
          iconBox: {
            dx: gridIcons[0].x - stamps[0].x,
            dy: gridIcons[0].y - stamps[0].y,
            w: gridIcons[0].width,
            h: gridIcons[0].height,
          },
        }
      : {}),
    ...(previewFilled > 0 ? { previewFilled } : {}),
    styleOverride: {
      empty: emptyFill,
      border,
      ...(filledColor ?? tierText?.color ? { filled: filledColor ?? tierText?.color } : {}),
    },
  };

  const removedIconIds = new Set(iconsMatch ? gridIcons.map((i) => i.id) : []);
  const isGridLayer = (l: CardDoc["layers"][number]) =>
    /^Tampon \d+$/.test(l.name) || TIER_RE.test(l.name) || removedIconIds.has(l.id);

  return {
    ...doc,
    layers: doc.layers.filter((l) => !isGridLayer(l)),
    zones: [zone],
    version: 2,
    design_json_v1: { layers: doc.layers.filter(isGridLayer) },
  };
}

/** reconstitue le document v1 d'origine depuis un document migré */
export function rollbackCardDoc(doc: CardDoc): CardDoc {
  if (doc.version !== 2 || !doc.design_json_v1) return doc;
  const { design_json_v1, zones: _zones, version: _version, ...rest } = doc;
  return {
    ...rest,
    layers: [...doc.layers, ...design_json_v1.layers].sort((a, b) => a.zIndex - b.zIndex),
  };
}
