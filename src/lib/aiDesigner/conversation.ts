// Cerveau local de FidiIA (Designer IA) — repli déterministe sans clé.
//
// Déterministe et sans réseau : il comprend le secteur et le type de programme
// à partir du langage naturel, puis sélectionne de VRAIS modèles du catalogue.
// Aucune génération factice — chaque proposition est une carte réelle que le
// clic applique au moteur (cardStore + loyaltyStore). Le jour où l'on branche
// un vrai LLM, seule cette couche change ; l'UI et le câblage restent.

import { templateCatalog, type TemplateEntry } from "@/data/templateCatalog";
import type { StyleFamily } from "@/data/templateCatalog";

/* --- détection du secteur à partir de mots-clés (FR) --- */
const SECTOR_KEYWORDS: { sector: string; words: string[] }[] = [
  { sector: "Café", words: ["cafe", "café", "coffee", "torref", "brasserie a cafe", "salon de the", "the"] },
  { sector: "Boulangerie", words: ["boulang", "pain", "baguette", "viennois"] },
  { sector: "Pâtisserie", words: ["patiss", "pâtiss", "gateau", "dessert", "macaron", "chocolat"] },
  { sector: "Restaurant", words: ["restau", "resto", "bistro", "gastro", "traiteur", "cuisine"] },
  { sector: "Pizzeria", words: ["pizz"] },
  { sector: "Fast-food", words: ["fast", "burger", "kebab", "tacos", "snack", "friterie"] },
  { sector: "Bar", words: ["bar", "pub", "cocktail", "biere", "bière", "cave", "vin"] },
  { sector: "Salon de coiffure", words: ["coiff", "cheveux", "salon de coiffure"] },
  { sector: "Barbier", words: ["barbier", "barber", "barbe", "rasage"] },
  { sector: "Institut de beauté", words: ["institut", "beaute", "beauté", "esthet", "soin", "epilation", "épilation"] },
  { sector: "Onglerie", words: ["ongle", "manucure", "vernis", "nail"] },
  { sector: "Spa", words: ["spa", "massage", "hammam", "sauna", "bien-etre", "bien-être", "detente"] },
  { sector: "Sport & Fitness", words: ["sport", "fitness", "gym", "muscu", "coach", "yoga", "crossfit"] },
  { sector: "Hôtel", words: ["hotel", "hôtel", "chambre", "hebergement"] },
  { sector: "Garage", words: ["garage", "auto", "voiture", "mecani", "pneu", "lavage"] },
  { sector: "Fleuriste", words: ["fleur", "bouquet", "fleuriste"] },
  { sector: "Pharmacie", words: ["pharmac", "parapharma"] },
  { sector: "Opticien", words: ["opticien", "lunette", "optique", "vue"] },
  { sector: "Librairie", words: ["librairie", "livre", "bouquin"] },
  { sector: "Animalerie", words: ["animal", "animalerie", "toilettage", "chien", "chat"] },
  { sector: "Tattoo", words: ["tattoo", "tatouage", "piercing"] },
  { sector: "Boutique", words: ["boutique", "magasin", "concept store", "pret-a-porter", "vetement", "vêtement", "mode"] },
  { sector: "Formations", words: ["formation", "cours", "ecole", "école", "atelier"] },
];

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function detectSector(text: string): string | null {
  const t = strip(text);
  for (const { sector, words } of SECTOR_KEYWORDS) {
    if (words.some((w) => t.includes(strip(w)))) return sector;
  }
  return null;
}

/** le commerçant a-t-il évoqué points plutôt que tampons ? */
export function detectMode(text: string): "stamps" | "points" | null {
  const t = strip(text);
  if (/\bpoint/.test(t)) return "points";
  if (/tampon|cachet|carte a tampon/.test(t)) return "stamps";
  return null;
}

/* --- tons : chaque ton privilégie certaines familles de style --- */
export interface Tone {
  id: string;
  label: string;
  families: StyleFamily[];
}

export const TONES: Tone[] = [
  { id: "chaud", label: "Chaleureux (tons chauds)", families: ["vintage", "colore", "photo", "premium"] },
  { id: "neutre", label: "Élégant (tons neutres)", families: ["premium", "minimal", "bancaire"] },
  { id: "froid", label: "Moderne (tons froids)", families: ["gradient", "bancaire", "motif", "minimal"] },
];

/**
 * Trois propositions RÉELLES pour un secteur + un ton. On privilégie des
 * familles distinctes pour offrir un vrai choix visuel, puis on complète.
 */
export function proposalsFor(
  sector: string,
  toneId: string,
  exclude?: Set<string>,
): TemplateEntry[] {
  const tone = TONES.find((t) => t.id === toneId) ?? TONES[0];
  const inSector = templateCatalog.filter((t) => t.sector === sector && t.loyalty);
  const base = inSector.length >= 3 ? inSector : templateCatalog.filter((t) => t.loyalty);
  // « Générer d'autres versions » : on écarte les modèles déjà montrés ;
  // si le vivier est épuisé, on repart de zéro.
  let pool = exclude ? base.filter((t) => !exclude.has(t.id)) : base;
  if (pool.length < 3) pool = base;

  const rank = (t: TemplateEntry) => {
    const i = t.family ? tone.families.indexOf(t.family) : -1;
    return i === -1 ? 99 : i;
  };
  const sorted = [...pool].sort((a, b) => rank(a) - rank(b));

  // une par famille d'abord, pour maximiser la diversité visuelle
  const picked: TemplateEntry[] = [];
  const seenFamily = new Set<string>();
  for (const t of sorted) {
    const fam = t.family ?? "_";
    if (seenFamily.has(fam)) continue;
    seenFamily.add(fam);
    picked.push(t);
    if (picked.length === 3) break;
  }
  for (const t of sorted) {
    if (picked.length === 3) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked.slice(0, 3);
}
