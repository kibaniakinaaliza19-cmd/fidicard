import type { CardDesign } from "@/types/card";
import { templates } from "@/data/templates";

export interface AIResult {
  patch: Partial<CardDesign>;
  reply: string;
  templateName: string;
}

const businessKeywords: { keys: string[]; templateId: string }[] = [
  { keys: ["café", "coffee", "cafe"], templateId: "coffee-premium" },
  { keys: ["restaurant", "italien", "gastronom", "cuisine"], templateId: "restaurant-luxe" },
  { keys: ["boulangerie", "pain", "boulanger"], templateId: "boulangerie" },
  { keys: ["beauté", "beaute", "beauty", "esthé", "esthe"], templateId: "beauty" },
  { keys: ["salon", "coiffure", "coiffeur", "barbier"], templateId: "salon" },
  { keys: ["fitness", "sport", "gym", "musculation", "coach"], templateId: "fitness" },
  { keys: ["hôtel", "hotel"], templateId: "hotel" },
  { keys: ["boutique", "mode", "vêtement", "vetement", "shop"], templateId: "boutique" },
  { keys: ["automobile", "garage", "voiture", "auto"], templateId: "automobile" },
  { keys: ["immobilier", "immo"], templateId: "immobilier" },
];

const colorWords: Record<string, string> = {
  rouge: "#e0342c",
  bleu: "#3b82f6",
  vert: "#22c55e",
  rose: "#ec4899",
  violet: "#a855f7",
  orange: "#f0653e",
  jaune: "#eab308",
  turquoise: "#2dd4bf",
};

export function generateDesignFromPrompt(prompt: string): AIResult {
  const lower = prompt.toLowerCase();

  const matched = businessKeywords.find((b) => b.keys.some((k) => lower.includes(k)));
  const template = templates.find((t) => t.id === (matched?.templateId ?? "entreprise")) ?? templates[0];

  const patch: Partial<CardDesign> = JSON.parse(JSON.stringify(template.config));

  const isLuxury = /luxe|premium|luxueux|haut de gamme|prestige|chic|elegant|élégant/.test(lower);
  const isGold = /doré|dore|gold|or\b/.test(lower);

  if (isLuxury && patch.colors) {
    patch.colors.background = "#060403";
    patch.colors.secondary = "#0d0705";
  }
  if (isGold && patch.colors) {
    patch.colors.accent = "#d4af37";
  }

  const colorMatch = Object.keys(colorWords).find((c) => lower.includes(c));
  if (colorMatch && patch.colors) {
    patch.colors.primary = colorWords[colorMatch];
  }

  if (isLuxury) {
    patch.style = { ...(patch.style ?? { borderRadius: 16 }), borderRadius: 20 };
  }

  const luxuryLabel = isLuxury ? " premium" : "";
  const reply = `J'ai généré une carte${luxuryLabel} inspirée de « ${template.name} »${
    colorMatch ? `, teintée de ${colorMatch}` : ""
  }${isGold ? " avec une touche dorée" : ""}. Ajuste chaque détail dans le panneau Propriétés à droite.`;

  return { patch, reply, templateName: template.name };
}
