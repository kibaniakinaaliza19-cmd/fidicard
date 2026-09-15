// Catalogue de tampons — un tampon est une icône. Les données sont générées
// (scripts/gen-stamp-catalog.mjs) à partir des icônes réellement présentes
// dans lucide-react, donc chaque `lucide` existe. Ce fichier ajoute les types,
// les libellés de catégories, la recherche (insensible aux accents/casse) et
// la résolution nom → composant.

import type { LucideIcon } from "lucide-react";
import { HelpCircle } from "lucide-react";
import { STAMP_CATALOG_DATA, STAMP_ICON_REGISTRY } from "@/data/stampCatalog.generated";

export type StampCategory =
  | "cafe" | "restaurant" | "fastfood" | "pizzeria" | "boulangerie"
  | "patisserie" | "bar" | "coiffure" | "barbershop" | "institut"
  | "onglerie" | "spa" | "sport" | "fitness" | "hotel" | "garage"
  | "fleuriste" | "formation" | "pharmacie" | "opticien" | "boutique"
  | "animalerie" | "librairie" | "tattoo" | "autre";

export interface StampIcon {
  id: string;
  lucide: string;
  label: string;
  aliases: string[];
  categories: StampCategory[];
}

export const STAMP_CATALOG = STAMP_CATALOG_DATA as StampIcon[];

export const CATEGORY_LABELS: Record<StampCategory, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  fastfood: "Fast-food",
  pizzeria: "Pizzeria",
  boulangerie: "Boulangerie",
  patisserie: "Pâtisserie",
  bar: "Bar",
  coiffure: "Coiffure",
  barbershop: "Barbier",
  institut: "Institut",
  onglerie: "Onglerie",
  spa: "Spa",
  sport: "Sport",
  fitness: "Fitness",
  hotel: "Hôtel",
  garage: "Garage",
  fleuriste: "Fleuriste",
  formation: "Formation",
  pharmacie: "Pharmacie",
  opticien: "Opticien",
  boutique: "Boutique",
  animalerie: "Animalerie",
  librairie: "Librairie",
  tattoo: "Tattoo",
  autre: "Autres",
};

export const STAMP_CATEGORIES = Object.keys(CATEGORY_LABELS) as StampCategory[];

export function getStampIcon(lucide: string): LucideIcon {
  return STAMP_ICON_REGISTRY[lucide] ?? HelpCircle;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** index de recherche pré-calculé (accent/casse-insensible) */
const SEARCH_INDEX = STAMP_CATALOG.map((s) => ({
  icon: s,
  hay: norm([s.label, s.lucide, ...s.aliases].join(" ")),
}));

export function searchStamps(query: string, category: StampCategory | "all"): StampIcon[] {
  const q = norm(query.trim());
  let base = SEARCH_INDEX;
  if (category !== "all") base = base.filter((e) => e.icon.categories.includes(category));
  if (!q) return base.map((e) => e.icon);
  const terms = q.split(/\s+/);
  return base.filter((e) => terms.every((t) => e.hay.includes(t))).map((e) => e.icon);
}

export const STAMP_COUNT = STAMP_CATALOG.length;
