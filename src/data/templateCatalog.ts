import type { CardDoc, CardBackground, Layer } from "@/types/layer";
import {
  createTextLayer,
  createShapeLayer,
  createIconLayer,
  makeId,
} from "@/lib/layerFactory";
import { cardTemplates } from "@/data/cardTemplates";
import { generatedSpecs } from "@/data/templateFactory";

/* -------------------------------------------------------------------------- */
/*  Declarative template catalog                                              */
/*                                                                            */
/*  Templates are plain data. Adding one = adding a TemplateSpec object below  */
/*  (or, later, loading more specs from JSON / a remote source) — no editor or */
/*  builder code changes required. buildFromSpec() turns a spec into a full    */
/*  editable CardDoc so every element stays movable once loaded.               */
/* -------------------------------------------------------------------------- */

export type LoyaltyKind = "tampons" | "points";
export type TemplateTag = "populaire" | "nouveau";
export type TemplateLayout = "classic" | "centered" | "split" | "banner";

export interface TemplateSpec {
  id: string;
  name: string; // template display name
  business: string; // brand name printed on the card
  tagline: string;
  sector: string;
  loyalty: LoyaltyKind;
  goal: number; // stamps to fill, or points target
  filled: number; // stamps shown filled (preview), or current points
  reward: string;
  icon: string; // lucide name (header + stamps), see src/lib/icons.ts
  bg: [string, string] | string; // gradient pair or a solid colour
  fg: string; // title colour
  sub: string; // subtitle / reward colour
  accent: string; // stamp & progress colour
  layout?: TemplateLayout; // composition — defaults to "classic"
  tags?: TemplateTag[];
}

export interface TemplateEntry {
  id: string;
  name: string;
  sector: string;
  tags?: TemplateTag[];
  build: () => CardDoc;
}

/* ---- background helpers ---- */

function background(bg: [string, string] | string): CardBackground {
  if (Array.isArray(bg)) {
    return {
      kind: "gradient",
      color: "#0a0a0a",
      gradientFrom: bg[0],
      gradientTo: bg[1],
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      image: null,
      imageDim: 30,
    };
  }
  return {
    kind: "color",
    color: bg,
    gradientFrom: bg,
    gradientTo: bg,
    gradientAngle: 135,
    pattern: "dots",
    patternColor: "#ffffff",
    image: null,
    imageDim: 30,
  };
}

/* ---- stamp grid (wraps to 2 rows past 6 stamps) ---- */

interface StampArea {
  x: number;
  w: number;
  /** center rows horizontally inside the area (layouts ≠ classic) */
  center?: boolean;
  y?: number;
}

function stampGrid(
  z: () => number,
  goal: number,
  filled: number,
  iconName: string,
  accent: string,
  area: StampArea = { x: 8, w: 84 },
): Layer[] {
  const layers: Layer[] = [];
  const size = 9;
  const shown = Math.min(goal, 10);
  const perRow = shown <= 6 ? shown : Math.ceil(shown / 2);
  const rows = Math.ceil(shown / perRow);
  const gap = perRow > 1 ? Math.min(14, (area.w - size) / (perRow - 1)) : 0;
  const rowWidth = (perRow - 1) * gap + size;
  const startX = area.center ? area.x + (area.w - rowWidth) / 2 : area.x;
  const startY = area.y ?? (rows === 1 ? 52 : 46);
  const rowGap = 16;

  for (let i = 0; i < shown; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const x = startX + c * gap;
    const y = startY + r * rowGap;
    const on = i < filled;
    layers.push(
      createShapeLayer(z(), "circle", {
        id: makeId("stamp-bg"),
        name: `Tampon ${i + 1}`,
        x,
        y,
        width: size,
        height: 14,
        fill: on ? accent : "rgba(255,255,255,0.12)",
      }),
    );
    layers.push(
      createIconLayer(z(), iconName, {
        id: makeId("stamp-ic"),
        name: `Icône ${i + 1}`,
        x: x + 1.8,
        y: y + 2.6,
        width: 5.4,
        height: 8.8,
        color: on ? "#ffffff" : "rgba(255,255,255,0.4)",
      }),
    );
  }
  return layers;
}

/* ---- generic builder (4 compositions) ---- */

function hexLum(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return 0;
  return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255;
}

export function buildFromSpec(spec: TemplateSpec): CardDoc {
  const layout = spec.layout ?? "classic";
  let zc = 0;
  const z = () => ++zc;
  const layers: Layer[] = [];

  // geometry of the content column, per composition
  const contentX = layout === "split" ? 31 : 8;
  const contentW = layout === "split" ? 61 : 84;
  const centered = layout === "centered";

  /* — structural decor first (below everything else) — */
  if (layout === "split") {
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("side-band"),
        name: "Bande latérale",
        x: 0,
        y: 0,
        width: 27,
        height: 100,
        fill: spec.accent,
        opacity: 16,
        radius: 0,
      }),
    );
  }
  if (layout === "banner") {
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("banner"),
        name: "Bandeau",
        x: 0,
        y: 0,
        width: 100,
        height: 26,
        fill: spec.accent,
        opacity: 96,
        radius: 0,
      }),
    );
  }

  /* — header: icon + business + tagline — */
  const longName = spec.business.length > 15;
  const bannerText = hexLum(spec.accent) > 0.55 ? "#221610" : "#ffffff";

  if (layout === "classic") {
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 7, y: 20, width: 9, height: 14, color: spec.accent }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 18, y: 21, width: 66, height: 10,
        fontSize: longName ? 15 : 18, fontWeight: 800, color: spec.fg,
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 18, y: longName ? 33 : 34, width: 66, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub,
      }),
    );
  } else if (layout === "centered") {
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 45.5, y: 6, width: 9, height: 14, color: spec.accent }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 10, y: 23, width: 80, height: 10,
        fontSize: longName ? 15 : 18, fontWeight: 800, color: spec.fg, align: "center",
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 10, y: longName ? 35 : 36, width: 80, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub, align: "center",
      }),
    );
  } else if (layout === "split") {
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 9, y: 36, width: 9, height: 14, color: spec.accent }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 31, y: 20, width: 60, height: 10,
        fontSize: longName ? 14 : 17, fontWeight: 800, color: spec.fg,
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 31, y: longName ? 32 : 33, width: 60, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub,
      }),
    );
  } else {
    // banner
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 8, y: 6, width: 76, height: 10,
        fontSize: longName ? 14 : 17, fontWeight: 800, color: bannerText,
      }),
    );
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 86, y: 5, width: 8, height: 13, color: bannerText }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 8, y: 30, width: 76, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub,
      }),
    );
  }

  /* — loyalty visual — */
  if (spec.loyalty === "tampons") {
    layers.push(
      ...stampGrid(z, spec.goal, spec.filled, spec.icon, spec.accent, {
        x: contentX,
        w: contentW,
        center: centered || layout === "split" || layout === "banner",
        y: layout === "banner" ? (Math.min(spec.goal, 10) <= 6 ? 56 : 48) : undefined,
      }),
    );
  } else {
    const barY = layout === "banner" ? 56 : 54;
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("bar-bg"), name: "Jauge",
        x: contentX, y: barY, width: contentW, height: 7,
        fill: spec.accent, opacity: 22, radius: 4,
      }),
    );
    const ratio = Math.max(0.08, Math.min(1, spec.filled / spec.goal));
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("bar-fill"), name: "Progression",
        x: contentX, y: barY, width: Math.round(contentW * ratio), height: 7,
        fill: spec.accent, radius: 4,
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("points"), name: "Points",
        content: `${spec.filled} / ${spec.goal} points`,
        x: centered ? 25 : contentX, y: barY + 10, width: 50, height: 6,
        fontSize: 9, fontWeight: 600, color: spec.sub,
        align: centered ? "center" : "left",
      }),
    );
  }

  /* — reward — */
  layers.push(
    createTextLayer(z(), {
      id: makeId("reward"), name: "Récompense", content: spec.reward,
      x: centered ? 9 : contentX, y: layout === "banner" ? 80 : 79,
      width: centered ? 82 : Math.min(82, contentW + 21), height: 7,
      fontSize: 9, fontWeight: 600, color: spec.sub,
      align: centered ? "center" : "left",
    }),
  );

  return {
    id: makeId("tpl"),
    name: spec.name,
    category: spec.sector,
    background: background(spec.bg),
    layers,
    published: false,
    updatedAt: Date.now(),
  };
}

/* -------------------------------------------------------------------------- */
/*  The catalog data                                                          */
/* -------------------------------------------------------------------------- */

const specs: TemplateSpec[] = [
  // Café
  { id: "cafe-espresso", name: "Espresso Noir", business: "CAFÉ RISTRETTO", tagline: "L'art du café", sector: "Café", loyalty: "tampons", goal: 10, filled: 6, reward: "Le 10ᵉ café offert", icon: "Coffee", bg: ["#3a2417", "#150a05"], fg: "#f5e6d8", sub: "#c9a98f", accent: "#e08a3d", tags: ["populaire"] },
  { id: "cafe-latte", name: "Latte Doux", business: "MAISON LATTE", tagline: "Douceur à emporter", sector: "Café", loyalty: "tampons", goal: 8, filled: 3, reward: "Une pâtisserie offerte à 8 visites", icon: "Coffee", bg: ["#4a3524", "#241609"], fg: "#fbeede", sub: "#d8b892", accent: "#c98a4a" },
  { id: "cafe-vert", name: "Café Botanique", business: "GREEN BEANS", tagline: "Café & plantes", sector: "Café", loyalty: "points", goal: 300, filled: 180, reward: "Boisson offerte à 300 points", icon: "Leaf", bg: ["#12291b", "#06120b"], fg: "#eafff0", sub: "#9fd8b4", accent: "#34d17e", tags: ["nouveau"] },

  // Restaurant
  { id: "resto-or", name: "Maison Dorée", business: "LA MAISON DORÉE", tagline: "Gastronomie d'exception", sector: "Restaurant", loyalty: "points", goal: 200, filled: 120, reward: "Dessert offert à 200 points", icon: "UtensilsCrossed", bg: ["#1a0a06", "#0c0403"], fg: "#e6c15c", sub: "#c9a227", accent: "#d4af37", tags: ["populaire"] },
  { id: "resto-bistro", name: "Bistrot de Quartier", business: "LE BISTROT", tagline: "Cuisine maison", sector: "Restaurant", loyalty: "tampons", goal: 8, filled: 5, reward: "Un plat offert toutes les 8 visites", icon: "UtensilsCrossed", bg: ["#2a1408", "#120802"], fg: "#ffe9cf", sub: "#e0b483", accent: "#e2743b" },
  { id: "resto-vin", name: "Table & Vin", business: "TABLE & VIN", tagline: "Accords parfaits", sector: "Restaurant", loyalty: "points", goal: 500, filled: 220, reward: "Une bouteille offerte à 500 points", icon: "Wine", bg: ["#2a0713", "#12030a"], fg: "#f6d9e2", sub: "#d68fa5", accent: "#c2415f" },

  // Fast-food
  { id: "ff-burger", name: "Burger Club", business: "BURGER CLUB", tagline: "Le goût, le vrai", sector: "Fast-food", loyalty: "tampons", goal: 10, filled: 7, reward: "Un menu offert à 10 tampons", icon: "UtensilsCrossed", bg: ["#3a1204", "#170701"], fg: "#ffe7c4", sub: "#f0b27a", accent: "#f97316", tags: ["populaire"] },
  { id: "ff-tacos", name: "Street Tacos", business: "STREET TACOS", tagline: "Fait sur le pouce", sector: "Fast-food", loyalty: "tampons", goal: 8, filled: 4, reward: "Le 8ᵉ tacos offert", icon: "Flame", bg: ["#2a1a04", "#120b01"], fg: "#fff0cf", sub: "#e6c485", accent: "#eab308" },

  // Pizzeria
  { id: "pizza-napoli", name: "Napoli Vera", business: "PIZZA NAPOLI", tagline: "La vraie napolitaine", sector: "Pizzeria", loyalty: "tampons", goal: 8, filled: 5, reward: "Une pizza offerte toutes les 8", icon: "Pizza", bg: ["#8f2f22", "#3a0f0a"], fg: "#fff2e6", sub: "#f4b59a", accent: "#f4b942", tags: ["populaire"] },
  { id: "pizza-forno", name: "Al Forno", business: "AL FORNO", tagline: "Cuite au feu de bois", sector: "Pizzeria", loyalty: "points", goal: 250, filled: 90, reward: "Pizza offerte à 250 points", icon: "Flame", bg: ["#1e0a06", "#0d0402"], fg: "#ffe3d0", sub: "#e39a72", accent: "#e2542b" },

  // Boulangerie
  { id: "boul-tradition", name: "Tradition", business: "BOULANGERIE MARTIN", tagline: "Pain & tradition", sector: "Boulangerie", loyalty: "tampons", goal: 10, filled: 8, reward: "Une viennoiserie offerte à 10", icon: "Croissant", bg: "#c9a883", fg: "#3a2a18", sub: "#5c452a", accent: "#8a5a34", tags: ["populaire"] },
  { id: "boul-grains", name: "Aux Grains", business: "AUX BONS GRAINS", tagline: "Cuit ce matin", sector: "Boulangerie", loyalty: "tampons", goal: 8, filled: 3, reward: "Une baguette offerte à 8 achats", icon: "Croissant", bg: ["#4a3216", "#241708"], fg: "#f7e4c4", sub: "#d8b483", accent: "#d99a4a" },

  // Pâtisserie
  { id: "patis-sucre", name: "Sucré Fin", business: "SUCRÉ FIN", tagline: "L'art du dessert", sector: "Pâtisserie", loyalty: "tampons", goal: 6, filled: 2, reward: "Une pâtisserie offerte à 6", icon: "CakeSlice", bg: ["#2a0722", "#120410"], fg: "#ffe6f5", sub: "#f0aad4", accent: "#ec4899", tags: ["nouveau"] },
  { id: "patis-glace", name: "Douceur Glacée", business: "GLACIER AMORE", tagline: "Glaces artisanales", sector: "Pâtisserie", loyalty: "tampons", goal: 8, filled: 5, reward: "Une glace offerte toutes les 8", icon: "IceCream", bg: ["#0a1e2a", "#040c12"], fg: "#dff3ff", sub: "#96cbe6", accent: "#38bdf8" },

  // Bar
  { id: "bar-craft", name: "Craft & Co", business: "CRAFT & CO", tagline: "Bières de caractère", sector: "Bar", loyalty: "tampons", goal: 10, filled: 6, reward: "La 10ᵉ pinte offerte", icon: "Beer", bg: ["#2a1c04", "#120c01"], fg: "#ffeeb8", sub: "#e6c766", accent: "#eab308", tags: ["populaire"] },
  { id: "bar-cocktail", name: "Speakeasy", business: "LE SPEAKEASY", tagline: "Cocktails d'auteur", sector: "Bar", loyalty: "points", goal: 300, filled: 150, reward: "Un cocktail offert à 300 points", icon: "Wine", bg: ["#160a24", "#080310"], fg: "#e9ddff", sub: "#b69ce6", accent: "#8b5cf6" },

  // Salon de coiffure
  { id: "coif-prestige", name: "Prestige", business: "SALON PRESTIGE", tagline: "Sublimez votre style", sector: "Salon de coiffure", loyalty: "tampons", goal: 6, filled: 2, reward: "Une coupe offerte toutes les 6", icon: "Scissors", bg: ["#2a0715", "#12030a"], fg: "#ffffff", sub: "#fda4af", accent: "#fb7185", tags: ["populaire"] },
  { id: "coif-studio", name: "Studio Hair", business: "STUDIO HAIR", tagline: "Votre coiffeur créatif", sector: "Salon de coiffure", loyalty: "points", goal: 400, filled: 260, reward: "-20% à 400 points", icon: "Scissors", bg: ["#1a0a24", "#0a0410"], fg: "#f2e6ff", sub: "#c9a5e6", accent: "#a855f7" },
  { id: "coif-nature", name: "Éclat Naturel", business: "ÉCLAT NATUREL", tagline: "Beauté responsable", sector: "Salon de coiffure", loyalty: "tampons", goal: 8, filled: 4, reward: "Un soin offert à 8 visites", icon: "Flower2", bg: ["#12291f", "#06120b"], fg: "#eafff2", sub: "#9fd8bc", accent: "#34d17e" },

  // Barbier
  { id: "barbe-classic", name: "Barber Classic", business: "THE BARBER", tagline: "L'art du rasage", sector: "Barbier", loyalty: "tampons", goal: 8, filled: 6, reward: "Une coupe offerte à 8", icon: "Scissors", bg: ["#1a1410", "#0a0705"], fg: "#f0e6d8", sub: "#c2a888", accent: "#b8895a", tags: ["populaire"] },
  { id: "barbe-noir", name: "Gentleman", business: "GENTLEMAN'S", tagline: "Style & précision", sector: "Barbier", loyalty: "tampons", goal: 10, filled: 3, reward: "Barbe offerte toutes les 10", icon: "Scissors", bg: ["#12100e", "#050403"], fg: "#e8e2d8", sub: "#b0a48f", accent: "#d4af37" },

  // Institut de beauté
  { id: "inst-luxe", name: "Luxe Beauté", business: "LUXE BEAUTÉ", tagline: "Révélez votre éclat", sector: "Institut de beauté", loyalty: "tampons", goal: 8, filled: 4, reward: "Soin visage offert à 8 tampons", icon: "Flower", bg: ["#2a0722", "#0f0410"], fg: "#ffffff", sub: "#f5b8dd", accent: "#e879b9", tags: ["populaire"] },
  { id: "inst-zen", name: "Zen Institut", business: "ZEN INSTITUT", tagline: "Prenez soin de vous", sector: "Institut de beauté", loyalty: "points", goal: 500, filled: 300, reward: "Un modelage offert à 500 pts", icon: "Sparkles", bg: ["#0a2422", "#04100f"], fg: "#dffbf6", sub: "#8fd6cc", accent: "#2dd4bf" },

  // Onglerie
  { id: "ongle-glam", name: "Nail Glam", business: "NAIL GLAM", tagline: "Des ongles parfaits", sector: "Onglerie", loyalty: "tampons", goal: 6, filled: 3, reward: "Une pose offerte toutes les 6", icon: "Sparkles", bg: ["#2a0720", "#12030e"], fg: "#ffe6f7", sub: "#f0a8d8", accent: "#f472b6", tags: ["nouveau"] },

  // Spa
  { id: "spa-serenite", name: "Sérénité", business: "SPA SÉRÉNITÉ", tagline: "Évasion & détente", sector: "Spa", loyalty: "points", goal: 600, filled: 280, reward: "Accès spa offert à 600 pts", icon: "Droplet", bg: ["#0a1e2a", "#040c12"], fg: "#dff1ff", sub: "#93c5e0", accent: "#38bdf8" },
  { id: "spa-thermes", name: "Les Thermes", business: "LES THERMES", tagline: "Bien-être absolu", sector: "Spa", loyalty: "tampons", goal: 8, filled: 5, reward: "Un soin corps offert à 8", icon: "Droplet", bg: ["#0a2422", "#04100f"], fg: "#e0fbf6", sub: "#8fd6cc", accent: "#2dd4bf" },

  // Salle de sport
  { id: "gym-power", name: "Power Gym", business: "POWER GYM", tagline: "Dépasse tes limites", sector: "Sport & Fitness", loyalty: "points", goal: 500, filled: 240, reward: "1 séance coaching à 500 pts", icon: "Dumbbell", bg: ["#04140a", "#020a04"], fg: "#ffffff", sub: "#bbf7d0", accent: "#22c55e", tags: ["populaire"] },
  { id: "gym-cross", name: "Cross Box", business: "CROSS BOX", tagline: "Plus fort chaque jour", sector: "Sport & Fitness", loyalty: "tampons", goal: 10, filled: 7, reward: "Un mois offert à 10 passages", icon: "Flame", bg: ["#1a0604", "#0a0201"], fg: "#ffe0d8", sub: "#f0a08f", accent: "#ef4444" },
  { id: "gym-yoga", name: "Studio Yoga", business: "STUDIO YOGA", tagline: "Équilibre & énergie", sector: "Sport & Fitness", loyalty: "tampons", goal: 8, filled: 3, reward: "Un cours offert toutes les 8", icon: "Sun", bg: ["#241a04", "#100b01"], fg: "#fff2cf", sub: "#e6cd85", accent: "#f59e0b" },

  // Hôtel
  { id: "hotel-palace", name: "Le Palace", business: "HÔTEL LE PALACE", tagline: "Membre privilège", sector: "Hôtel", loyalty: "points", goal: 1000, filled: 420, reward: "Une nuit offerte à 1000 pts", icon: "BedDouble", bg: ["#0a0f24", "#040610"], fg: "#e6ecff", sub: "#a5b4e6", accent: "#6366f1", tags: ["populaire"] },
  { id: "hotel-riviera", name: "Riviera", business: "HÔTEL RIVIERA", tagline: "Votre escale d'exception", sector: "Hôtel", loyalty: "points", goal: 800, filled: 500, reward: "Surclassement à 800 points", icon: "Crown", bg: ["#0a1a24", "#040c10"], fg: "#dff0ff", sub: "#93c5e0", accent: "#0ea5e9" },

  // Garage
  { id: "garage-auto", name: "Auto Expert", business: "AUTO EXPERT", tagline: "Votre garage de confiance", sector: "Garage", loyalty: "points", goal: 500, filled: 300, reward: "Vidange offerte à 500 points", icon: "Wrench", bg: ["#0c1420", "#04080e"], fg: "#e2ecf5", sub: "#93aec2", accent: "#3b82f6", tags: ["populaire"] },
  { id: "garage-pneu", name: "Speed Pneus", business: "SPEED PNEUS", tagline: "Rapide & fiable", sector: "Garage", loyalty: "tampons", goal: 6, filled: 2, reward: "Contrôle offert toutes les 6 visites", icon: "Car", bg: ["#1a1204", "#0a0701"], fg: "#ffeec4", sub: "#e0c07a", accent: "#f59e0b" },

  // Fleuriste
  { id: "fleur-atelier", name: "Atelier Floral", business: "ATELIER FLORAL", tagline: "Fleurs de saison", sector: "Fleuriste", loyalty: "tampons", goal: 8, filled: 4, reward: "Un bouquet offert à 8 achats", icon: "Flower2", bg: ["#12291b", "#06120b"], fg: "#eafff0", sub: "#a5e0b8", accent: "#22c55e", tags: ["nouveau"] },
  { id: "fleur-rose", name: "Rose & Pivoine", business: "ROSE & PIVOINE", tagline: "L'élégance florale", sector: "Fleuriste", loyalty: "points", goal: 300, filled: 160, reward: "-15% à 300 points", icon: "Flower", bg: ["#2a0718", "#12030c"], fg: "#ffe6f0", sub: "#f0a8c8", accent: "#ec4899" },

  // Pharmacie
  { id: "pharma-sante", name: "Pharmacie Santé", business: "PHARMACIE CENTRALE", tagline: "Votre santé, notre priorité", sector: "Pharmacie", loyalty: "points", goal: 400, filled: 210, reward: "-10% parapharmacie à 400 pts", icon: "Pill", bg: ["#04241c", "#02100c"], fg: "#dffbf0", sub: "#8fd6bc", accent: "#10b981", tags: ["populaire"] },
  { id: "pharma-bien", name: "Bien-Être", business: "PHARMA BIEN-ÊTRE", tagline: "Conseils & soin", sector: "Pharmacie", loyalty: "tampons", goal: 10, filled: 5, reward: "Un cadeau offert à 10 visites", icon: "Stethoscope", bg: ["#041a24", "#020c10"], fg: "#dff0ff", sub: "#8fc5e0", accent: "#0ea5e9" },

  // Opticien
  { id: "optic-vision", name: "Vision Pro", business: "OPTIQUE VISION", tagline: "Voyez la différence", sector: "Opticien", loyalty: "points", goal: 500, filled: 180, reward: "2ᵉ paire offerte à 500 pts", icon: "Sparkles", bg: ["#0a1424", "#040810"], fg: "#e2ecff", sub: "#9fb4e6", accent: "#6366f1" },

  // Boutique
  { id: "shop-mode", name: "Dressing Chic", business: "DRESSING CHIC", tagline: "Votre style, notre passion", sector: "Boutique", loyalty: "points", goal: 500, filled: 320, reward: "-20% à 500 points", icon: "ShoppingBag", bg: ["#1a0a24", "#0a0410"], fg: "#f2e6ff", sub: "#c9a5e6", accent: "#a855f7", tags: ["populaire"] },
  { id: "shop-concept", name: "Concept Store", business: "CONCEPT STORE", tagline: "Objets d'exception", sector: "Boutique", loyalty: "tampons", goal: 8, filled: 3, reward: "Un cadeau offert à 8 achats", icon: "Gift", bg: ["#14141a", "#070709"], fg: "#eceaf0", sub: "#b0acc2", accent: "#f472b6" },

  // Animalerie
  { id: "animal-compagnon", name: "Mon Compagnon", business: "MON COMPAGNON", tagline: "Tout pour vos animaux", sector: "Animalerie", loyalty: "tampons", goal: 8, filled: 5, reward: "Un sachet offert à 8 achats", icon: "PawPrint", bg: ["#24160a", "#100a04"], fg: "#ffe9cf", sub: "#e0b488", accent: "#f59e0b", tags: ["nouveau"] },
  { id: "animal-aqua", name: "Aqua Zen", business: "AQUA ZEN", tagline: "L'univers aquatique", sector: "Animalerie", loyalty: "points", goal: 300, filled: 140, reward: "-10% à 300 points", icon: "Fish", bg: ["#0a1e2a", "#040c12"], fg: "#dff1ff", sub: "#8fc8e6", accent: "#38bdf8" },

  // Librairie
  { id: "livre-plume", name: "La Plume", business: "LIBRAIRIE LA PLUME", tagline: "Voyagez en lisant", sector: "Librairie", loyalty: "tampons", goal: 10, filled: 6, reward: "Un livre offert à 10 achats", icon: "Star", bg: ["#1a1206", "#0a0702"], fg: "#f7ead0", sub: "#d8bc88", accent: "#d4a24a" },

  // Tattoo
  { id: "tattoo-ink", name: "Ink Studio", business: "INK STUDIO", tagline: "L'art sur la peau", sector: "Tattoo", loyalty: "points", goal: 600, filled: 250, reward: "-15% à 600 points", icon: "Palette", bg: ["#0f0f12", "#050506"], fg: "#ececf0", sub: "#a8a8b8", accent: "#e11d48", tags: ["nouveau"] },
];

/* ---- canonical sector order ---- */
const SECTOR_ORDER = [
  "Café", "Restaurant", "Fast-food", "Pizzeria", "Boulangerie", "Pâtisserie", "Bar",
  "Salon de coiffure", "Barbier", "Institut de beauté", "Onglerie", "Spa",
  "Sport & Fitness", "Hôtel", "Garage", "Fleuriste", "Formations", "Pharmacie", "Opticien",
  "Boutique", "Animalerie", "Librairie", "Tattoo", "Autres",
];

function sectorRank(sector: string) {
  const i = SECTOR_ORDER.indexOf(sector);
  return i === -1 ? SECTOR_ORDER.length : i;
}

/* ---- unified catalog (curated specs + generated matrix + legacy) ---- */

const specEntries: TemplateEntry[] = [...specs, ...generatedSpecs].map((s) => ({
  id: s.id,
  name: s.name,
  sector: s.sector,
  tags: s.tags,
  build: () => buildFromSpec(s),
}));

const legacyEntries: TemplateEntry[] = cardTemplates.map((t) => ({
  id: `legacy-${t.id}`,
  name: t.name,
  sector: t.category === "Autres" ? "Autres" : t.category,
  build: t.build,
}));

export const templateCatalog: TemplateEntry[] = [...specEntries, ...legacyEntries].sort(
  (a, b) => sectorRank(a.sector) - sectorRank(b.sector),
);

export const templateSectors: string[] = Array.from(
  new Set(templateCatalog.map((t) => t.sector)),
).sort((a, b) => sectorRank(a) - sectorRank(b));

export const templateCount = templateCatalog.length;
