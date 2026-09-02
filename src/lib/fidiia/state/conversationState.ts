// Ce que FidiIA sait, et ce qui lui manque.
//
// `creationAutorisee` n'est pas un champ : c'est un calcul exposé en lecture
// seule. Impossible de le forcer à la main, donc impossible de créer une carte
// sans les cinq informations minimales du contrat de sortie.

import type { ModeFidelite, Palier, Recompense } from "../validation/schemas.ts";

export type NiveauStyle = "connu" | "partiel" | "inconnu";

/** Champs réellement stockés. Tout est optionnel : on part de rien. */
export interface EtatBrut {
  secteur?: string;
  nomCommerce?: string;
  carteExistante?: boolean;
  carteAnalysee?: boolean;
  logo?: string;
  /** Photo de l'établissement fournie par le commerçant, s'il en a une. */
  photo?: string;
  systemeFidelite?: ModeFidelite;
  objectif?: number;
  paliers?: Palier[];
  recompense?: Recompense;
  style?: NiveauStyle;
}

export interface ConversationState extends EtatBrut {
  /** Dérivé. Lecture seule : toute écriture directe lève une erreur. */
  readonly creationAutorisee: boolean;
}

/** Les cinq informations sans lesquelles aucune carte ne peut être produite. */
export const CHAMPS_REQUIS = [
  "secteur",
  "nomCommerce",
  "systemeFidelite",
  "objectif",
  "recompense",
] as const;

export type ChampRequis = (typeof CHAMPS_REQUIS)[number];

function estRenseigne(etat: EtatBrut, champ: ChampRequis): boolean {
  const v = etat[champ];
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}

/** Informations requises encore absentes, dans l'ordre où les demander. */
export function informationsManquantes(etat: EtatBrut): ChampRequis[] {
  return CHAMPS_REQUIS.filter((c) => !estRenseigne(etat, c));
}

/**
 * Construit un état immuable. `creationAutorisee` est un accesseur sans
 * setter : en mode strict, `etat.creationAutorisee = true` lève une TypeError.
 * C'est voulu — la règle doit être impossible à contourner, pas seulement
 * déconseillée.
 */
export function creerEtat(brut: EtatBrut = {}): ConversationState {
  const copie: EtatBrut = { ...brut };
  const etat = copie as ConversationState;
  Object.defineProperty(etat, "creationAutorisee", {
    get: () => informationsManquantes(copie).length === 0,
    enumerable: true,
    configurable: false,
  });
  return Object.freeze(etat);
}

/** Applique un correctif et renvoie un NOUVEL état. L'ancien reste intact. */
export function majEtat(
  etat: ConversationState,
  patch: Partial<EtatBrut>,
): ConversationState {
  const brut: EtatBrut = {};
  for (const cle of Object.keys(etat) as (keyof EtatBrut)[]) {
    if (cle === ("creationAutorisee" as unknown as keyof EtatBrut)) continue;
    const v = etat[cle];
    if (v !== undefined) (brut as Record<string, unknown>)[cle] = v;
  }
  for (const [cle, valeur] of Object.entries(patch)) {
    if (valeur !== undefined) (brut as Record<string, unknown>)[cle] = valeur;
  }
  return creerEtat(brut);
}

/** Vrai si l'information est déjà connue : sert à ne jamais la redemander. */
export function connait(etat: EtatBrut, champ: ChampRequis): boolean {
  return estRenseigne(etat, champ);
}
