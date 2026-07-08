import type { CardDoc, Layer } from "@/types/layer";
import {
  createBarcodeLayer,
  createIconLayer,
  createQrCodeLayer,
  createShapeLayer,
  createTextLayer,
  makeId,
} from "@/lib/layerFactory";

export interface CardTemplateMeta {
  id: string;
  name: string;
  category: string;
  build: () => CardDoc;
}

let z = 0;
const nz = () => ++z;

function text(content: string, o: Partial<Layer> = {}) {
  return createTextLayer(nz(), { content, ...o } as never);
}
function icon(name: string, o: Partial<Layer> = {}) {
  return createIconLayer(nz(), name, o as never);
}
function shape(kind: "rect" | "circle" | "line" | "triangle", o: Partial<Layer> = {}) {
  return createShapeLayer(nz(), kind, o as never);
}

function stampRow(count: number, filled: number, iconName: string, y: number, color: string) {
  const layers: Layer[] = [];
  const startX = 8;
  const gap = 15;
  for (let i = 0; i < count; i++) {
    layers.push(
      shape("circle", {
        id: makeId("stamp-bg"),
        name: `Tampon ${i + 1}`,
        x: startX + i * gap,
        y,
        width: 10,
        height: 16,
        fill: i < filled ? color : "rgba(255,255,255,0.12)",
      })
    );
    layers.push(
      icon(iconName, {
        id: makeId("stamp-ic"),
        name: `Icône ${i + 1}`,
        x: startX + i * gap + 2,
        y: y + 3,
        width: 6,
        height: 10,
        color: i < filled ? "#ffffff" : "rgba(255,255,255,0.4)",
      })
    );
  }
  return layers;
}

function build(
  name: string,
  category: string,
  bg: CardDoc["background"],
  layers: Layer[]
): CardDoc {
  z = 0;
  return {
    id: makeId("tpl"),
    name,
    category,
    background: bg,
    layers,
    published: false,
    updatedAt: Date.now(),
  };
}

const gradient = (from: string, to: string, angle = 135): CardDoc["background"] => ({
  kind: "gradient",
  color: "#0a0a0a",
  gradientFrom: from,
  gradientTo: to,
  gradientAngle: angle,
  pattern: "dots",
  patternColor: "#ffffff",
  image: null,
  imageDim: 30,
});

const solid = (color: string): CardDoc["background"] => ({
  kind: "color",
  color,
  gradientFrom: color,
  gradientTo: color,
  gradientAngle: 135,
  pattern: "dots",
  patternColor: "#ffffff",
  image: null,
  imageDim: 30,
});

export const cardTemplates: CardTemplateMeta[] = [
  {
    id: "cafe-premium",
    name: "Café Premium",
    category: "Café",
    build: () =>
      build("Café Premium", "Café", gradient("#3a1a10", "#0a0402"), [
        text("COFFEE HOUSE", { x: 8, y: 26, width: 55, height: 10, fontSize: 20, fontWeight: 800, color: "#f5e6d8" }),
        text("Votre pause, notre passion", { x: 8, y: 37, width: 55, height: 6, fontSize: 9, color: "#c9a98f" }),
        ...stampRow(5, 3, "Coffee", 52, "#f0653e"),
        text("Une boisson offerte à la 10ᵉ visite", { x: 8, y: 76, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#f0c8b4" }),
        createQrCodeLayer(nz(), { id: makeId("qr"), name: "QR Code", x: 76, y: 24, width: 16, height: 27 }),
      ]),
  },
  {
    id: "resto-luxe",
    name: "Restaurant Luxe",
    category: "Restaurant",
    build: () =>
      build("Restaurant Luxe", "Restaurant", gradient("#1a0505", "#0c0202"), [
        icon("UtensilsCrossed", { x: 8, y: 24, width: 8, height: 12, color: "#d4af37" }),
        text("LA MAISON DORÉE", { x: 18, y: 26, width: 55, height: 9, fontSize: 17, fontWeight: 700, color: "#d4af37" }),
        text("Gastronomie d'exception", { x: 18, y: 36, width: 55, height: 6, fontSize: 9, color: "#e6c15c" }),
        shape("line", { x: 8, y: 50, width: 84, height: 2, fill: "#d4af37", opacity: 50 }),
        text("Membre privilège", { x: 8, y: 60, width: 40, height: 6, fontSize: 9, color: "#c9a227" }),
        text("Dessert offert à 200 points", { x: 8, y: 78, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#e6c15c" }),
        createQrCodeLayer(nz(), { id: makeId("qr"), name: "QR Code", x: 76, y: 58, width: 16, height: 27 }),
      ]),
  },
  {
    id: "salon-coiffure",
    name: "Salon de coiffure",
    category: "Salon de coiffure",
    build: () =>
      build("Salon de coiffure", "Salon de coiffure", gradient("#2a0715", "#12030a"), [
        icon("Scissors", { x: 8, y: 24, width: 8, height: 12, color: "#fb7185" }),
        text("SALON PRESTIGE", { x: 18, y: 26, width: 55, height: 9, fontSize: 17, fontWeight: 700, color: "#ffffff" }),
        text("Sublimez votre style", { x: 18, y: 36, width: 55, height: 6, fontSize: 9, color: "#fda4af" }),
        ...stampRow(6, 2, "Star", 52, "#fb7185"),
        text("Une coupe offerte toutes les 6 visites", { x: 8, y: 78, width: 64, height: 6, fontSize: 8, fontWeight: 500, color: "#fecdd3" }),
      ]),
  },
  {
    id: "institut-beaute",
    name: "Institut de beauté",
    category: "Institut de beauté",
    build: () =>
      build("Institut de beauté", "Institut de beauté", gradient("#2a0722", "#0f0410"), [
        icon("Flower", { x: 8, y: 24, width: 8, height: 12, color: "#f5b8dd" }),
        text("LUXE BEAUTÉ", { x: 18, y: 26, width: 55, height: 9, fontSize: 17, fontWeight: 700, color: "#ffffff" }),
        text("Révélez votre éclat", { x: 18, y: 36, width: 55, height: 6, fontSize: 9, color: "#f5b8dd" }),
        ...stampRow(5, 2, "Heart", 52, "#e879b9"),
        text("Soin visage offert à 8 tampons", { x: 8, y: 78, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#fce7f3" }),
      ]),
  },
  {
    id: "boulangerie",
    name: "Boulangerie",
    category: "Boulangerie",
    build: () =>
      build("Boulangerie", "Boulangerie", solid("#c9a883"), [
        text("Carte de fidélité", { x: 8, y: 14, width: 60, height: 12, fontSize: 22, fontWeight: 700, font: "playfair", color: "#3a2a18" }),
        icon("Croissant", { x: 80, y: 12, width: 12, height: 16, color: "#6b4a2a" }),
        ...stampRow(5, 4, "Cookie", 40, "#8a5a34"),
        text("UNE VIENNOISERIE OFFERTE À LA 10ᵉ", { x: 8, y: 82, width: 80, height: 6, fontSize: 8, fontWeight: 600, color: "#3a2a18" }),
      ]),
  },
  {
    id: "fitness",
    name: "Salle de sport",
    category: "Sport & Fitness",
    build: () =>
      build("Salle de sport", "Sport & Fitness", gradient("#04140a", "#020a04"), [
        icon("Dumbbell", { x: 8, y: 22, width: 9, height: 13, color: "#22c55e" }),
        text("POWER GYM", { x: 19, y: 24, width: 55, height: 10, fontSize: 19, fontWeight: 800, color: "#ffffff" }),
        text("Dépasse tes limites", { x: 19, y: 35, width: 55, height: 6, fontSize: 9, color: "#86efac" }),
        shape("rect", { x: 8, y: 54, width: 84, height: 8, fill: "#22c55e", opacity: 25, radius: 4 }),
        shape("rect", { x: 8, y: 54, width: 50, height: 8, fill: "#22c55e", radius: 4 }),
        text("240 / 500 points", { x: 8, y: 66, width: 40, height: 6, fontSize: 9, color: "#bbf7d0" }),
        text("1 séance coaching à 500 points", { x: 8, y: 80, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#bbf7d0" }),
      ]),
  },
  {
    id: "boutique",
    name: "Boutique mode",
    category: "Boutique",
    build: () =>
      build("Boutique mode", "Boutique", gradient("#1a0f2e", "#0a0614"), [
        text("ATELIER MODE", { x: 8, y: 24, width: 55, height: 9, fontSize: 18, fontWeight: 700, color: "#c4b5fd" }),
        text("Style & caractère", { x: 8, y: 34, width: 55, height: 6, fontSize: 9, color: "#a78bfa" }),
        icon("ShoppingBag", { x: 80, y: 22, width: 10, height: 14, color: "#a78bfa" }),
        text("-20% sur un article à 150 points", { x: 8, y: 78, width: 62, height: 6, fontSize: 9, fontWeight: 500, color: "#ede9fe" }),
        createBarcodeLayer(nz(), { id: makeId("bc"), name: "Code-barres", x: 8, y: 55, width: 45, height: 16 }),
      ]),
  },
  {
    id: "pharmacie",
    name: "Pharmacie",
    category: "Pharmacie",
    build: () =>
      build("Pharmacie", "Pharmacie", gradient("#04231a", "#02120d"), [
        icon("Pill", { x: 8, y: 22, width: 9, height: 13, color: "#34d399" }),
        text("PHARMA CARE", { x: 19, y: 24, width: 55, height: 9, fontSize: 18, fontWeight: 700, color: "#ffffff" }),
        text("Votre santé, notre priorité", { x: 19, y: 35, width: 60, height: 6, fontSize: 9, color: "#6ee7b7" }),
        ...stampRow(5, 1, "Heart", 54, "#34d399"),
        createQrCodeLayer(nz(), { id: makeId("qr"), name: "QR Code", x: 76, y: 22, width: 16, height: 27 }),
      ]),
  },
  {
    id: "garage",
    name: "Garage auto",
    category: "Garage",
    build: () =>
      build("Garage auto", "Garage", gradient("#1a1d22", "#050608"), [
        icon("Car", { x: 8, y: 22, width: 10, height: 14, color: "#ef4444" }),
        text("AUTO SERVICE PRO", { x: 20, y: 25, width: 60, height: 9, fontSize: 16, fontWeight: 800, color: "#ffffff" }),
        text("Votre garage de confiance", { x: 20, y: 35, width: 60, height: 6, fontSize: 9, color: "#fca5a5" }),
        ...stampRow(5, 1, "Wrench", 54, "#ef4444"),
        text("Vidange offerte à 5 tampons", { x: 8, y: 80, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#fecaca" }),
      ]),
  },
  {
    id: "merci-fidelite",
    name: "Merci fidélité (or)",
    category: "Autres",
    build: () =>
      build("Merci fidélité", "Autres", gradient("#141414", "#000000"), [
        text("MERCI POUR", { x: 8, y: 22, width: 55, height: 8, fontSize: 16, fontWeight: 700, color: "#ffffff" }),
        text("votre fidélité", { x: 8, y: 31, width: 55, height: 12, fontSize: 24, fontWeight: 400, font: "great-vibes", color: "#d4af37" }),
        text("CHAQUE ACHAT VOUS RAPPROCHE D'UNE RÉCOMPENSE", { x: 8, y: 50, width: 55, height: 8, fontSize: 7, fontWeight: 500, color: "#cbb78f" }),
        ...stampRow(5, 4, "Gift", 66, "#d4af37"),
        createQrCodeLayer(nz(), { id: makeId("qr"), name: "QR Code", x: 74, y: 30, width: 18, height: 30 }),
      ]),
  },
  {
    id: "hotel",
    name: "Hôtel",
    category: "Autres",
    build: () =>
      build("Hôtel", "Autres", gradient("#0a1628", "#020610"), [
        icon("BedDouble", { x: 8, y: 22, width: 9, height: 13, color: "#d4af37" }),
        text("HÔTEL AZUR", { x: 19, y: 24, width: 55, height: 9, fontSize: 18, fontWeight: 700, color: "#d4af37" }),
        text("L'excellence de l'accueil", { x: 19, y: 35, width: 60, height: 6, fontSize: 9, color: "#7dd3fc" }),
        text("1 nuit offerte à 1000 points", { x: 8, y: 78, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#bae6fd" }),
        createQrCodeLayer(nz(), { id: makeId("qr"), name: "QR Code", x: 76, y: 50, width: 16, height: 30 }),
      ]),
  },
  {
    id: "minimal-clair",
    name: "Minimal clair",
    category: "Autres",
    build: () =>
      build("Minimal clair", "Autres", solid("#f5f2ec"), [
        text("VOTRE MARQUE", { x: 8, y: 20, width: 55, height: 9, fontSize: 17, fontWeight: 800, color: "#1a1a1a" }),
        text("Carte de fidélité", { x: 8, y: 30, width: 55, height: 6, fontSize: 9, color: "#6b6b68" }),
        ...stampRow(5, 2, "Star", 50, "#1a1a1a"),
        text("Récompense à la 10ᵉ visite", { x: 8, y: 80, width: 60, height: 6, fontSize: 9, fontWeight: 500, color: "#3a3a3a" }),
      ]),
  },
];

export const templateCategories = [
  "Tous",
  ...Array.from(new Set(cardTemplates.map((t) => t.category))),
];
