// Adaptateur : la carte décrite par FidiIA → le document de carte de
// l'application.
//
// C'est le seul point de contact entre le moteur et le reste du produit.
// FidiIA décrit ; cet adaptateur convertit. La séparation garde `lib/fidiia`
// testable sans rien charger de l'interface.
//
// Il s'appuie sur le chantier 2 : la grille de fidélité sort en ZONE
// déclarative (`zones`), jamais en calques « Tampon 1 », « Tampon 2 »…

// Note d'exécution : ce fichier est le SEUL de `lib/fidiia` à importer le
// reste de l'application. Il utilise donc l'alias `@/`, comme tout le code de
// l'app — ce qui le rend non exécutable par `node --test`. C'est voulu : les
// tests de FidiIA ne doivent charger ni l'éditeur ni le moteur de rendu.

import type { BarcodeLayer, CardDoc, ImageLayer, Layer, TextLayer } from "@/types/layer";
import { createDefaultStampGridZone } from "@/lib/loyalty/renderLayer";
import type { LoyaltyConfig } from "@/lib/loyalty";
import type { Carte } from "../validation/schemas.ts";

let compteur = 0;
function id(prefixe: string): string {
  compteur += 1;
  return `${prefixe}-${compteur}`;
}

const socle = (nom: string, z: number) => ({
  id: id("layer"),
  name: nom,
  rotation: 0,
  opacity: 100,
  zIndex: z,
  locked: false,
  hidden: false,
  groupId: null,
});

function texte(nom: string, contenu: string, z: number, o: Partial<TextLayer> = {}): TextLayer {
  return {
    ...socle(nom, z),
    type: "text",
    x: 8,
    y: 12,
    width: 60,
    height: 8,
    content: contenu,
    font: "geist",
    fontSize: 16,
    fontWeight: 700,
    italic: false,
    underline: false,
    color: "#ffffff",
    align: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
    ...o,
  };
}

/**
 * Convertit une carte FidiIA en CardDoc.
 *
 * Invariant : exactement une zone de fidélité, aucun calque nommé comme un
 * tampon. Les contrôles de validation/quality.ts vérifient déjà ces deux
 * points en amont ; l'adaptateur ne peut donc pas les casser sans qu'un test
 * le voie.
 */
export function versCardDoc(carte: Carte): { doc: CardDoc; config: Partial<LoyaltyConfig> } {
  const layers: Layer[] = [
    texte("Nom du commerce", carte.nomCommerce, 1, { y: 10, fontSize: 18 }),
    texte("Règle du programme", regleLisible(carte), 2, {
      y: 24,
      fontSize: 9,
      fontWeight: 400,
      color: "#e8e8e8",
    }),
    texte("Instruction de scan", "PRÉSENTEZ CE CODE EN CAISSE POUR SCANNER VOTRE CARTE", 3, {
      y: 74,
      width: 84,
      height: 5,
      fontSize: 6,
      fontWeight: 600,
      align: "center",
      letterSpacing: 0.4,
      color: "#f5f5f5",
    }),
  ];

  // Photo de l'établissement : elle occupe le haut de la carte, sous les
  // textes, jamais posée par-dessus une information.
  if (carte.calques.some((c) => c.type === "image" && /photo/i.test(c.nom))) {
    const photo: ImageLayer = {
      ...socle("Photo de l'établissement", 0),
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 42,
      src: "",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      radius: 0,
    };
    layers.unshift(photo);
  }

  if (carte.calques.some((c) => c.type === "image" && /logo/i.test(c.nom))) {
    const logo: ImageLayer = {
      ...socle("Logo", 4),
      type: "image",
      x: 72,
      y: 8,
      width: 18,
      height: 18,
      src: "",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      radius: 0,
    };
    layers.push(logo);
  }

  const codeBarres: BarcodeLayer = {
    ...socle("Code-barres", 5),
    type: "barcode",
    x: 14,
    y: 80,
    width: 72,
    height: 14,
    value: carte.nomCommerce.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) || "FIDICARD",
    lineColor: "#141414",
    background: "#ffffff",
  };
  layers.push(codeBarres);

  const doc: CardDoc = {
    id: id("carte"),
    name: carte.nomCommerce,
    category: "fidiia",
    background: {
      kind: "gradient",
      color: "#1a1a1a",
      gradientFrom: "#2a1a12",
      gradientTo: "#120d0a",
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      image: null,
      imageDim: 0,
    },
    layers,
    published: false,
    updatedAt: Date.now(),
    version: 2,
    // Une zone de tampons UNIQUEMENT en mode tampons. En mode points, la
    // progression est un compteur : poser une grille ici mélangerait les deux
    // systèmes sur la même carte.
    zones:
      carte.programme.mode === "stamps"
        ? [createDefaultStampGridZone(id("zone"), carte.programme.objectif)]
        : [],
  };

  const config: Partial<LoyaltyConfig> = {
    mode: carte.programme.mode,
    totalStamps: carte.programme.objectif,
    paliers: carte.programme.paliers.map((p) => ({
      position: p.position,
      label: p.label,
      description: p.description,
      type: "autre" as const,
    })),
  };

  return { doc, config };
}

function regleLisible(carte: Carte): string {
  const { mode, objectif, recompense } = carte.programme;
  return mode === "points"
    ? `${objectif} points = ${recompense.texte}`
    : `${objectif} passages = ${recompense.texte}`;
}
