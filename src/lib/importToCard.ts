// Phase 3 : transforme une ImportAnalysis validée en CardDoc de l'éditeur.
// Chaque élément détecté devient un vrai calque — sélectionnable, déplaçable,
// supprimable — posé exactement sur l'image d'origine (nettoyée) en fond.
// Ordre d'empilement : fond < logos < tampons < textes/paliers < QR/code-barres.
//
// Fidélité d'abord : les logos sont des découpes de l'image posées pile à leur
// position d'origine (rendu identique), les paliers (-5€, -15 %…) sont réécrits
// DANS leurs tampons comme sur la carte d'origine.

import type { CardDoc, Layer } from "@/types/layer";
import {
  createTextLayer,
  createShapeLayer,
  createImageLayer,
  createQrCodeLayer,
  createBarcodeLayer,
  makeId,
} from "@/lib/layerFactory";
import type { ImportAnalysis, ImportProgram, ImportTier } from "@/lib/cardImport";

export interface TextChoice {
  id: string;
  keep: boolean;
  content: string;
}

export interface ImportChoices {
  cardName: string;
  texts: TextChoice[];
  /** ids des logos à recréer en calques images */
  keepLogos: string[];
  /** recréer les tampons détectés en composants FidiCard modifiables */
  convertStamps: boolean;
  stampsFilled: number;
  stampAccent: string;
  /** paliers validés/corrigés par le commerçant (Phase 4) */
  tiers: ImportTier[];
  qrMode: "keep" | "fidicard";
  addFidiQr: boolean;
  addBarcode: boolean;
}

export function defaultChoices(a: ImportAnalysis): ImportChoices {
  const inStamp = (t: { x: number; y: number; w: number; h: number }) =>
    a.stamps.some((s) => boxOverlap(s, t) > 0.5);
  return {
    cardName: guessCardName(a),
    // on ne recrée par défaut que les textes proprement effacés du fond ;
    // les textes situés dans un tampon deviennent des paliers, pas des textes
    texts: a.texts.map((t) => ({ id: t.id, keep: t.masked && !inStamp(t), content: t.content })),
    keepLogos: a.logos.map((l) => l.id),
    convertStamps: a.stamps.length >= 3,
    stampsFilled: 0,
    stampAccent: a.theme.accent,
    tiers: (a.program?.tiers ?? []).map((t) => ({ ...t })),
    qrMode: "keep",
    addFidiQr: false,
    addBarcode: false,
  };
}

function guessCardName(a: ImportAnalysis): string {
  const biggest = [...a.texts].sort((x, y) => y.fontSize - x.fontSize)[0];
  return biggest ? `Carte ${biggest.content}` : "Carte importée";
}

function boxOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const min = Math.min(a.w * a.h, b.w * b.h);
  return min > 0 ? inter / min : 0;
}

/** programme final après corrections de l'écran de révision */
export function finalProgram(a: ImportAnalysis, c: ImportChoices): ImportProgram | null {
  if (!a.program && c.tiers.length === 0) return null;
  return {
    type: a.program?.type ?? "tampons",
    totalStamps: a.stamps.length || a.program?.totalStamps || 10,
    tiers: [...c.tiers].sort((x, y) => x.position - y.position),
    instructions: a.program?.instructions,
    social: a.program?.social,
    website: a.program?.website,
  };
}

export function importToCard(a: ImportAnalysis, c: ImportChoices): CardDoc {
  let zc = 0;
  const z = () => ++zc;
  const layers: Layer[] = [];

  // logos : découpes de l'image posées à l'identique — déplaçables,
  // redimensionnables, supprimables même sans fichier source
  for (const lg of a.logos) {
    if (!c.keepLogos.includes(lg.id)) continue;
    layers.push(
      createImageLayer(z(), lg.dataUrl, {
        id: makeId("imp-logo"),
        name: lg.description.slice(0, 24) || "Logo",
        x: lg.x,
        y: lg.y,
        width: lg.w,
        height: lg.h,
        radius: 0,
      }),
    );
  }

  // tampons : un cercle par tampon détecté, posé pile sur l'original
  if (c.convertStamps) {
    a.stamps.forEach((s, i) => {
      const on = i < c.stampsFilled;
      const isTier = c.tiers.some((t) => t.position === i + 1);
      layers.push(
        createShapeLayer(z(), "circle", {
          id: makeId("imp-stamp"),
          name: `Tampon ${i + 1}`,
          x: s.x,
          y: s.y,
          width: s.w,
          height: s.h,
          fill: on ? c.stampAccent : a.stampFill,
          stroke: c.stampAccent,
          strokeWidth: isTier ? 2 : on ? 0 : 1,
        }),
      );
    });

    // Phase 4 visible : les paliers réécrits DANS leurs tampons, comme sur
    // l'original (-5€ au 3ᵉ, -15 % au 6ᵉ…) — chacun est un calque texte
    for (const tier of c.tiers) {
      const s = a.stamps[tier.position - 1];
      if (!s) continue;
      const stampPx = (s.w / 100) * 520; // largeur du tampon sur le canvas 520
      layers.push(
        createTextLayer(z(), {
          id: makeId("imp-tier"),
          name: `Palier ${tier.position} — ${tier.reward}`.slice(0, 30),
          content: tier.reward,
          x: s.x - s.w * 0.25,
          y: s.y + s.h * 0.32,
          width: s.w * 1.5,
          height: s.h * 0.4,
          fontSize: Math.max(8, Math.min(16, Math.round(stampPx * (tier.reward.length > 4 ? 0.26 : 0.34)))),
          fontWeight: 700,
          color: c.stampAccent,
          align: "center",
        }),
      );
    }
  }

  // textes recréés exactement aux positions détectées
  for (const t of a.texts) {
    const choice = c.texts.find((x) => x.id === t.id);
    if (!choice?.keep) continue;
    layers.push(
      createTextLayer(z(), {
        id: makeId("imp-txt"),
        name: choice.content.slice(0, 24) || "Texte",
        content: choice.content,
        x: t.x,
        y: t.y,
        width: Math.min(100 - t.x, t.w + 2),
        height: Math.max(4, t.h + 1),
        fontSize: t.fontSize,
        fontWeight: t.fontSize >= 18 ? 700 : 500,
        color: t.color,
        align: "left",
      }),
    );
  }

  // QR : remplacé par le composant FidiCard à la position détectée…
  if (a.qr && c.qrMode === "fidicard") {
    layers.push(
      createQrCodeLayer(z(), {
        id: makeId("imp-qr"),
        name: "QR FidiCard",
        x: a.qr.x,
        y: a.qr.y,
        width: a.qr.w,
        height: a.qr.h,
        value: "https://fidicard.app/rejoindre",
      }),
    );
  }
  // … ou ajouté discrètement s'il n'y en avait pas
  if (!a.qr && c.addFidiQr) {
    layers.push(
      createQrCodeLayer(z(), {
        id: makeId("imp-qr"),
        name: "QR FidiCard",
        x: 84,
        y: 70,
        width: 12,
        height: 12 * (a.frameWidth / a.frameHeight),
        value: "https://fidicard.app/rejoindre",
      }),
    );
  }

  if (c.addBarcode) {
    layers.push(
      createBarcodeLayer(z(), {
        id: makeId("imp-bar"),
        name: "Code-barres FidiCard",
        x: 6,
        y: 82,
        width: 26,
        height: 12,
      }),
    );
  }

  return {
    id: makeId("card"),
    name: c.cardName || "Carte importée",
    category: "Importée",
    background: {
      kind: "image",
      color: a.theme.bg,
      gradientFrom: a.theme.bg,
      gradientTo: a.theme.bg,
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      image: a.backgroundDataUrl,
      imageDim: 0, // aucune altération : l'image d'origine reste intacte
    },
    layers,
    published: false,
    updatedAt: Date.now(),
  };
}
