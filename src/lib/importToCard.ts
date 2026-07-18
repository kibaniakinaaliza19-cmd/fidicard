// Reconstruction : transforme une ImportAnalysis validée par le commerçant en
// CardDoc de l'éditeur. Chaque élément détecté devient un vrai calque —
// sélectionnable, déplaçable, supprimable — posé sur l'image d'origine
// (nettoyée) en fond. Fidélité d'abord : les calques recréés se superposent
// exactement aux positions détectées, le design n'est jamais réinterprété.

import type { CardDoc, Layer } from "@/types/layer";
import {
  createTextLayer,
  createShapeLayer,
  createQrCodeLayer,
  createBarcodeLayer,
  makeId,
} from "@/lib/layerFactory";
import type { ImportAnalysis } from "@/lib/cardImport";

export interface TextChoice {
  id: string;
  keep: boolean;
  content: string;
}

export interface ImportChoices {
  cardName: string;
  texts: TextChoice[];
  /** recréer les tampons détectés en composants FidiCard modifiables */
  convertStamps: boolean;
  /** nombre de tampons considérés « déjà remplis » sur l'aperçu */
  stampsFilled: number;
  stampAccent: string;
  /** QR détecté : le conserver tel quel (dans l'image) ou le remplacer par le QR FidiCard */
  qrMode: "keep" | "fidicard";
  /** aucun QR détecté : en ajouter un discret pour le système FidiCard */
  addFidiQr: boolean;
  /** ajouter un code-barres FidiCard discret (offre Starter) */
  addBarcode: boolean;
}

export function defaultChoices(a: ImportAnalysis): ImportChoices {
  return {
    cardName: guessCardName(a),
    // par défaut on ne recrée que les textes proprement effacés du fond :
    // recréer un texte encore visible dans l'image créerait un doublon décalé.
    texts: a.texts.map((t) => ({ id: t.id, keep: t.masked, content: t.content })),
    convertStamps: a.stamps.length >= 3,
    stampsFilled: 0,
    stampAccent: a.theme.accent,
    qrMode: "keep",
    addFidiQr: false,
    addBarcode: false,
  };
}

function guessCardName(a: ImportAnalysis): string {
  // le texte le plus grand est presque toujours le nom du commerce
  const biggest = [...a.texts].sort((x, y) => y.fontSize - x.fontSize)[0];
  return biggest ? `Carte ${biggest.content}` : "Carte importée";
}

export function importToCard(a: ImportAnalysis, c: ImportChoices): CardDoc {
  let zc = 0;
  const z = () => ++zc;
  const layers: Layer[] = [];

  // tampons d'abord (sous les textes) : un cercle par tampon détecté, posé
  // pile sur l'original — le recouvrement à l'identique préserve le visuel
  // tout en rendant chaque tampon indépendant (couleur, position, suppression).
  if (c.convertStamps) {
    a.stamps.forEach((s, i) => {
      const on = i < c.stampsFilled;
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
          strokeWidth: on ? 0 : 1,
        }),
      );
    });
  }

  // textes recréés exactement aux positions OCR (au-dessus des tampons, pour
  // que les paliers écrits dans un tampon — « -15 % » — restent lisibles)
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
  // … ou ajouté discrètement en bas à droite s'il n'y en avait pas
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
