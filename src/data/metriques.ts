import { Repeat, Award, Gift, Stamp, Bell, Users, type LucideIcon } from "lucide-react";
import type { DonutSegment } from "@/data/analytics";

/**
 * Les six mesures de l'accueil.
 *
 * Six, et pas quatorze. La page d'analyse en affiche huit plus quatre panneaux ;
 * l'accueil n'est pas cette page. Ce qui a été écarté et pourquoi :
 *
 *   Notifications envoyées  un volume d'envoi ne dit rien de ce qu'il produit.
 *   Avis Google             hors du programme de fidélité.
 *   Cartes actives          doublon de « clients actifs », déjà en haut.
 *
 * Chaque mesure porte son propre identifiant d'URL : la vue détaillée vit à
 * /analyse/<id>, sans onglet supplémentaire dans la barre du bas.
 */

/* Rampe des camemberts.
 *
 * Les segments partaient sur du violet, du bleu ciel et du rose — trois
 * familles étrangères à la marque, dans une interface qui n'en compte qu'une.
 * La rampe descend maintenant de l'orange vers le gris : la part dominante
 * porte la couleur de la marque, la dernière n'en a plus. L'ordre des teintes
 * porte donc l'ordre des valeurs, ce qu'un arc-en-ciel ne fait pas. */
export const RAMPE = ["#ff5a1f", "#ff8a5c", "#c9502a", "#7a4232", "#4a4a50"] as const;

export type Tendance = "hausse" | "baisse";

export interface Metrique {
  id: string;
  titre: string;
  valeur: string;
  delta: string;
  tendance: Tendance;
  icone: LucideIcon;
  /** Ce que la mesure veut dire. Affiché en tête de la vue détaillée. */
  definition: string;
  /** Progression 0-100 : la mesure s'affiche en anneau plutôt qu'en chiffre. */
  anneau?: number;
  /** Série mensuelle, pour la courbe de la vue détaillée. */
  serie?: number[];
  /** Répartition, pour les mesures qui se lisent en parts. */
  segments?: DonutSegment[];
  /** Unité de la série, en légende de la courbe. */
  uniteSerie?: string;
}

export const METRIQUES: Metrique[] = [
  {
    id: "taux-de-retour",
    titre: "Taux de retour",
    valeur: "64 %",
    // Un taux qui passe de 61,7 % à 64 % gagne 2,3 POINTS, pas 2,3 %.
    // L'écart n'est pas cosmétique : en pourcentage relatif, ce serait +3,7 %.
    delta: "+2,3 pt",
    tendance: "hausse",
    icone: Repeat,
    anneau: 64,
    definition:
      "Part de vos clients inscrits qui sont revenus au moins une fois ce mois-ci. C'est la mesure la plus directe de ce que le programme produit.",
    serie: [55, 57, 54, 58, 60, 59, 61, 60, 62, 61, 63, 64],
    uniteSerie: "%",
  },
  {
    id: "fidelite-moyenne",
    titre: "Fidélité moyenne",
    valeur: "6,2 / 10",
    delta: "+0,4",
    tendance: "hausse",
    icone: Award,
    definition:
      "Nombre moyen de tampons détenus par un client actif, sur les dix que compte votre carte. Au-dessus de la moitié, vos clients visent la récompense.",
    serie: [5, 5.2, 5.1, 5.4, 5.6, 5.5, 5.8, 5.9, 6, 6.1, 6.1, 6.2],
    uniteSerie: "tampons",
  },
  {
    id: "conversion-recompense",
    titre: "Conversion en récompense",
    valeur: "18 %",
    delta: "+4,1 pt",
    tendance: "hausse",
    icone: Gift,
    definition:
      "Part des cartes complètes dont la récompense a réellement été retirée. Une carte pleine qu'on ne vient pas encaisser est une promesse non tenue.",
    serie: [9, 10, 11, 10, 12, 13, 12, 14, 15, 16, 17, 18],
    uniteSerie: "%",
  },
  {
    id: "tampons-semaine",
    titre: "Tampons cette semaine",
    valeur: "495",
    delta: "+6 %",
    tendance: "hausse",
    icone: Stamp,
    definition:
      "Tampons distribués sur les sept derniers jours. C'est le pouls du programme : il bouge avant toutes les autres mesures.",
    serie: [400, 440, 420, 500, 480, 460, 550, 520, 600, 580, 620, 495],
    uniteSerie: "tampons",
  },
  {
    id: "notifications-performance",
    titre: "Performance des notifications",
    valeur: "1 245",
    delta: "+12 %",
    tendance: "hausse",
    icone: Bell,
    definition:
      "Répartition des ouvertures par type de campagne. Ce qui compte n'est pas le nombre de messages envoyés, mais lesquels sont lus.",
    segments: [
      { label: "Promotions", value: 1245, color: RAMPE[0] },
      { label: "Offres fidélité", value: 845, color: RAMPE[1] },
      { label: "Événements", value: 320, color: RAMPE[2] },
      { label: "Rappels de récompense", value: 235, color: RAMPE[3] },
      { label: "Autres", value: 200, color: RAMPE[4] },
    ],
  },
  {
    id: "repartition-clients",
    titre: "Répartition des clients",
    valeur: "940",
    delta: "+8 %",
    tendance: "hausse",
    icone: Users,
    definition:
      "Vos clients par état de fidélité. Les deux dernières parts — inactifs et perdus — sont celles sur lesquelles une relance a un effet.",
    segments: [
      { label: "Fidèles", value: 410, color: RAMPE[0] },
      { label: "Inactifs", value: 228, color: RAMPE[1] },
      { label: "Nouveaux", value: 142, color: RAMPE[2] },
      { label: "VIP", value: 86, color: RAMPE[3] },
      { label: "Perdus", value: 74, color: RAMPE[4] },
    ],
  },
];

export function metriqueParId(id: string): Metrique | undefined {
  return METRIQUES.find((m) => m.id === id);
}

/**
 * La couleur d'un anneau, selon le niveau atteint.
 *
 * Vert au-dessus de 70, ambre entre 50 et 70, rouge en dessous. Les seuils
 * sont ici, en un seul endroit, et non recopiés dans le composant : le jour
 * où le métier les révise, c'est cette fonction qu'on ouvre.
 */
export function couleurNiveau(pourcentage: number): string {
  if (pourcentage >= 70) return "var(--success)";
  if (pourcentage >= 50) return "var(--warning)";
  return "var(--danger)";
}

export function libelleNiveau(pourcentage: number): string {
  if (pourcentage >= 70) return "Bon";
  if (pourcentage >= 50) return "À surveiller";
  return "Faible";
}
