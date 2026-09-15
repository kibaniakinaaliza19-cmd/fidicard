// Accès de FidiIA au corpus de modèles existant.
//
// Le corpus vit dans `src/data/templateFactory.ts` : 864 modèles répartis sur
// 24 secteurs, chacun portant un objectif, une récompense, une palette, une
// icône et une disposition — tous écrits à la main, secteur par secteur.
//
// FidiIA construisait ses cartes de zéro et ignorait complètement ce corpus.
// Résultat : elle inventait « Une prestation offerte » là où le corpus dit
// « Le 10ᵉ café offert ». Ce module est le pont.
//
// Il ne décide de rien : il propose des valeurs issues du corpus, que le
// commerçant reste libre de remplacer. Une donnée du corpus n'est pas une
// donnée du commerçant — elle sert de point de départ, jamais de vérité.

import { familySpecs, generatedSpecs } from "../../../data/templateFactory.ts";
import type { ModeFidelite } from "../validation/schemas.ts";

/** Un modèle du corpus, réduit à ce dont FidiIA a besoin. */
export interface ReferenceCorpus {
  id: string;
  secteur: string;
  mode: ModeFidelite;
  objectif: number;
  recompense: string;
  icone: string;
  accent: string;
  disposition: string;
  /** Nom fictif du corpus. Ne doit JAMAIS être présenté comme un vrai commerce. */
  exempleNom: string;
  exempleSlogan: string;
}

/** Le corpus dit « tampons », FidiIA dit « stamps ». Un seul mot en sortie. */
function versMode(loyalty: string): ModeFidelite {
  return loyalty === "points" ? "points" : "stamps";
}

/**
 * Lit l'objectif ANNONCÉ par le texte de la récompense.
 *
 * Nécessaire parce que le corpus se contredit : le champ `goal` et la phrase
 * `reward` sont tirés de deux rotations d'index différentes, si bien que
 * 719 modèles sur 864 annoncent un nombre qui n'est pas leur objectif —
 * objectif 12 pour « Boisson + frites offertes à 6 ».
 *
 * Quand les deux divergent, c'est la PHRASE qui gagne : c'est elle qui sera
 * imprimée sur la carte et lue par le client. Un objectif qui contredit sa
 * propre récompense est une carte fausse.
 */
export function objectifAnnonce(recompense: string): number | null {
  // Les remises ne sont pas des objectifs : « -10 % » ne vaut pas 10.
  const sansRemise = recompense.replace(/-\s?\d+\s?[%€]/g, " ");

  // « la 10ᵉ boisson », « le 8ᵉ tacos »
  const ordinal = sansRemise.match(/(\d+)\s*(?:ᵉ|ème|eme|e)\b/);
  if (ordinal) return Number(ordinal[1]);

  // « à 12 visites », « dès 150 points », « toutes les 8 visites »
  const introduit = sansRemise.match(
    /(?:à|a|dès|des|toutes les|tous les|chaque)\s+(\d+)\b/i,
  );
  if (introduit) return Number(introduit[1]);

  const nu = sansRemise.match(/\b(\d+)\b/);
  return nu ? Number(nu[1]) : null;
}

const CORPUS: ReferenceCorpus[] = [...generatedSpecs, ...familySpecs].map((s) => {
  const annonce = objectifAnnonce(s.reward);
  return {
    id: s.id,
    secteur: s.sector,
    mode: versMode(s.loyalty),
    // La phrase fait foi. `goal` ne sert que si la phrase ne chiffre rien.
    objectif: annonce ?? s.goal,
    recompense: s.reward,
    icone: s.icon,
    accent: s.accent,
    // `layout` est optionnel dans le corpus ; le constructeur retombe sur
    // « classic ». On fait pareil, pour que le regroupement reste stable.
    disposition: s.layout ?? "classic",
    exempleNom: s.business,
    exempleSlogan: s.tagline,
  };
});

export function corpusComplet(): readonly ReferenceCorpus[] {
  return CORPUS;
}

/** Les 24 secteurs du corpus, dans l'ordre où ils y sont écrits. */
export function secteursConnus(): string[] {
  const vus = new Set<string>();
  const out: string[] = [];
  for (const r of CORPUS) {
    if (!vus.has(r.secteur)) {
      vus.add(r.secteur);
      out.push(r.secteur);
    }
  }
  return out;
}

/* ------------------------------------------------------ reconnaissance */

/** Mots que le commerçant emploie, rattachés à un secteur du corpus. */
const SYNONYMES: Record<string, string[]> = {
  "Café": ["cafe", "coffee", "torrefaction", "brulerie", "salon de the"],
  "Restaurant": ["restaurant", "resto", "brasserie", "bistrot", "table"],
  "Fast-food": ["fast food", "fastfood", "burger", "tacos", "friterie", "kebab", "snack"],
  "Pizzeria": ["pizzeria", "pizza", "pizzaiolo"],
  "Boulangerie": ["boulangerie", "boulanger", "fournil", "pain"],
  "Pâtisserie": ["patisserie", "patissier", "gateau", "chocolaterie"],
  "Bar": ["bar", "pub", "cocktail", "taproom", "cave a biere"],
  "Salon de coiffure": ["coiffure", "coiffeur", "coiffeuse", "salon de coiffure"],
  "Barbier": ["barbier", "barber", "barbe", "rasage"],
  "Institut de beauté": ["institut", "beaute", "esthetique", "esthreticienne", "epilation", "cils"],
  "Onglerie": ["onglerie", "ongles", "manucure", "nail"],
  "Spa": ["spa", "massage", "hammam", "sauna", "bien-etre", "bien etre"],
  "Sport & Fitness": ["salle de sport", "fitness", "musculation", "gym", "yoga", "crossfit", "coach"],
  "Hôtel": ["hotel", "auberge", "chambre d'hote", "gite"],
  "Garage": ["garage", "garagiste", "mecanique", "carrosserie", "pneu", "lavage auto"],
  "Fleuriste": ["fleuriste", "fleurs", "bouquet"],
  "Formations": ["formation", "cours", "ecole", "auto-ecole", "auto ecole"],
  "Opticien": ["opticien", "lunettes", "optique"],
  "Boutique": ["boutique", "magasin", "pret a porter", "vetements", "concept store"],
  "Animalerie": ["animalerie", "animaux", "toilettage", "veterinaire"],
  "Librairie": ["librairie", "livres", "bouquiniste", "papeterie"],
  "Tattoo": ["tattoo", "tatouage", "tatoueur", "piercing"],
  "Pharmacie": ["pharmacie", "parapharmacie", "pharmacien"],
};

/** Minuscules, sans accents : « Pâtisserie » et « patisserie » se valent. */
function normaliser(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rattache ce que dit le commerçant à un secteur du corpus.
 *
 * Renvoie `undefined` plutôt que de deviner : un mauvais secteur donnerait des
 * récompenses hors sujet, ce qui est pire que pas de secteur du tout.
 */
export function trouverSecteur(texte: string): string | undefined {
  const t = normaliser(texte);
  if (!t) return undefined;

  let meilleur: { secteur: string; longueur: number } | undefined;
  for (const [secteur, mots] of Object.entries(SYNONYMES)) {
    for (const mot of mots) {
      // Le mot le plus long l'emporte : « salon de coiffure » avant « salon ».
      if (t.includes(mot) && (!meilleur || mot.length > meilleur.longueur)) {
        meilleur = { secteur, longueur: mot.length };
      }
    }
  }
  return meilleur?.secteur;
}

/* --------------------------------------------------------- suggestions */

export interface SuggestionCorpus {
  secteur: string;
  mode: ModeFidelite;
  objectif: number;
  recompense: { texte: string; libelleCourt: string };
  references: ReferenceCorpus[];
}

/** Coupe une récompense en libellé court, celui qui tient dans un tampon. */
function libelleCourt(recompense: string): string {
  const t = recompense.toLowerCase();
  if (t.includes("offert")) return "Offert";
  const remise = recompense.match(/-\s?(\d+)\s?%/);
  if (remise) return `-${remise[1]} %`;
  const euros = recompense.match(/-\s?(\d+)\s?€/);
  if (euros) return `-${euros[1]} €`;
  return "Cadeau";
}

/** L'objectif le plus fréquent du secteur : le corpus vote, on ne moyenne pas. */
function objectifDominant(refs: ReferenceCorpus[]): number {
  const compte = new Map<number, number>();
  for (const r of refs) compte.set(r.objectif, (compte.get(r.objectif) ?? 0) + 1);
  let meilleur = refs[0].objectif;
  let max = 0;
  for (const [objectif, n] of compte) {
    // À égalité, le plus petit objectif gagne : plus atteignable pour le client.
    if (n > max || (n === max && objectif < meilleur)) {
      meilleur = objectif;
      max = n;
    }
  }
  return meilleur;
}

/**
 * Ce que le corpus propose pour un secteur et un mode donnés.
 *
 * `undefined` si le secteur est inconnu : on ne fabrique pas de suggestion à
 * partir de rien.
 */
export function suggestionPour(
  secteur: string | undefined,
  mode: ModeFidelite,
): SuggestionCorpus | undefined {
  if (!secteur) return undefined;
  const refs = CORPUS.filter((r) => r.secteur === secteur && r.mode === mode);
  if (refs.length === 0) return undefined;

  const objectif = objectifDominant(refs);
  // La récompense vient d'une référence qui porte cet objectif : objectif et
  // récompense doivent se tenir. « Le 10ᵉ café offert » avec un objectif de 8
  // serait un mensonge sur la carte.
  const accordee = refs.find((r) => r.objectif === objectif) ?? refs[0];

  return {
    secteur,
    mode,
    objectif,
    recompense: {
      texte: accordee.recompense,
      libelleCourt: libelleCourt(accordee.recompense),
    },
    references: refs.slice(0, 3),
  };
}

/**
 * Trois références réellement distinctes, pour nourrir les trois propositions.
 * On écarte les doublons de disposition : trois fois la même mise en page ne
 * donne pas trois propositions, mais une seule en trois couleurs.
 */
export function referencesDistinctes(
  secteur: string | undefined,
  mode: ModeFidelite,
  combien = 3,
): ReferenceCorpus[] {
  if (!secteur) return [];
  const refs = CORPUS.filter((r) => r.secteur === secteur && r.mode === mode);
  const out: ReferenceCorpus[] = [];
  const dispositionsVues = new Set<string>();
  for (const r of refs) {
    if (dispositionsVues.has(r.disposition)) continue;
    dispositionsVues.add(r.disposition);
    out.push(r);
    if (out.length === combien) break;
  }
  // Moins de dispositions distinctes que demandé : on complète sans mentir sur
  // la variété plutôt que de renvoyer une liste trop courte.
  for (const r of refs) {
    if (out.length >= combien) break;
    if (!out.includes(r)) out.push(r);
  }
  return out;
}
