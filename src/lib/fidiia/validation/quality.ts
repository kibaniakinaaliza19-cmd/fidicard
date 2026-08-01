// Contrôles qualité, repris de 07 - CONTROLES QUALITE / 01.
//
// Chaque contrôle est une fonction pure : mêmes entrées, même verdict, aucun
// effet de bord, aucun appel réseau. Ils s'exécutent AVANT toute présentation
// au commerçant. Une carte qui échoue n'est pas présentée avec un
// avertissement : elle est corrigée ou remplacée.

import type { Carte } from "./schemas.ts";
import { LIBELLE_COURT_MAX, OBJECTIF_MAX, OBJECTIF_MIN } from "./schemas.ts";
import type { SessionMemory } from "../state/sessionMemory.ts";
import { estVerrouille } from "../state/sessionMemory.ts";

export interface Verdict {
  id: string;
  ok: boolean;
  /** Vide si ok. Sinon, dit ce qui ne va pas, en français, sans jargon. */
  motif: string;
}

const ok = (id: string): Verdict => ({ id, ok: true, motif: "" });
const ko = (id: string, motif: string): Verdict => ({ id, ok: false, motif });

/** Un calque ne doit jamais porter le nom d'un tampon : la grille est
 *  déclarative, elle n'est pas dessinée calque par calque. */
const NOM_TAMPON = /^(tampon|icône \d|icone \d|palier)\b/i;

export function commerceIdentifiable(c: Carte): Verdict {
  return c.nomCommerce.trim().length > 0
    ? ok("commerce-identifiable")
    : ko("commerce-identifiable", "le nom du commerce est vide");
}

export function uneSeuleZoneFidelite(c: Carte): Verdict {
  if (c.zonesFidelite.length === 1) return ok("zone-unique");
  return ko(
    "zone-unique",
    `${c.zonesFidelite.length} zone(s) de fidélité au lieu d'une seule`,
  );
}

export function aucunCalqueTampon(c: Carte): Verdict {
  const fautif = c.calques.find((l) => NOM_TAMPON.test(l.nom));
  return fautif
    ? ko("aucun-calque-tampon", `le calque « ${fautif.nom} » dessine un tampon à la main`)
    : ok("aucun-calque-tampon");
}

export function objectifDansBornes(c: Carte): Verdict {
  const o = c.programme.objectif;
  return o >= OBJECTIF_MIN && o <= OBJECTIF_MAX
    ? ok("objectif-bornes")
    : ko("objectif-bornes", `objectif ${o} hors de l'intervalle ${OBJECTIF_MIN}-${OBJECTIF_MAX}`);
}

export function paliersSousObjectif(c: Carte): Verdict {
  const o = c.programme.objectif;
  const fautif = c.programme.paliers.find((p) => p.position > o);
  return fautif
    ? ko("paliers-sous-objectif", `palier en position ${fautif.position} au-delà de l'objectif ${o}`)
    : ok("paliers-sous-objectif");
}

export function aucunDoublonPalier(c: Carte): Verdict {
  const positions = c.programme.paliers.map((p) => p.position);
  const doublon = positions.find((p, i) => positions.indexOf(p) !== i);
  return doublon === undefined
    ? ok("paliers-sans-doublon")
    : ko("paliers-sans-doublon", `deux paliers visent la position ${doublon}`);
}

export function dernierPalierRecompense(c: Carte): Verdict {
  const { objectif, paliers } = c.programme;
  const final = paliers.find((p) => p.position === objectif);
  if (!final) {
    return ko("dernier-palier-recompense", `aucun palier ne marque l'objectif ${objectif}`);
  }
  return final.description.trim().length > 0
    ? ok("dernier-palier-recompense")
    : ko("dernier-palier-recompense", "le palier final ne porte aucune récompense");
}

export function libelleCourtLisible(c: Carte): Verdict {
  const trop = [c.programme.recompense.libelleCourt, ...c.programme.paliers.map((p) => p.label)]
    .find((l) => l.length > LIBELLE_COURT_MAX);
  return trop === undefined
    ? ok("libelle-court")
    : ko("libelle-court", `« ${trop} » dépasse ${LIBELLE_COURT_MAX} caractères`);
}

export function codeBarresPresent(c: Carte): Verdict {
  const a = c.calques.some((l) => l.type === "codebarres");
  return a ? ok("code-barres") : ko("code-barres", "aucun code-barres sur la carte");
}

export function recompenseNonVide(c: Carte): Verdict {
  return c.programme.recompense.texte.trim().length > 0
    ? ok("recompense-non-vide")
    : ko("recompense-non-vide", "la récompense est vide : elle ne s'invente pas");
}

/** Le contrôle qui compte le plus : rien de verrouillé n'a été touché. */
export function verrousRespectes(c: Carte, m: SessionMemory): Verdict {
  const viole = c.ciblesModifiees.find((cible) => estVerrouille(m, cible));
  return viole === undefined
    ? ok("verrous-respectes")
    : ko("verrous-respectes", `« ${viole} » est verrouillé et a pourtant été modifié`);
}

/** Exécute tous les contrôles. L'ordre n'a pas d'importance : ils sont purs. */
export function controlerCarte(c: Carte, m: SessionMemory): Verdict[] {
  return [
    commerceIdentifiable(c),
    uneSeuleZoneFidelite(c),
    aucunCalqueTampon(c),
    objectifDansBornes(c),
    paliersSousObjectif(c),
    aucunDoublonPalier(c),
    dernierPalierRecompense(c),
    libelleCourtLisible(c),
    codeBarresPresent(c),
    recompenseNonVide(c),
    verrousRespectes(c, m),
  ];
}

export function toutValide(verdicts: Verdict[]): boolean {
  return verdicts.every((v) => v.ok);
}

export function motifsEchec(verdicts: Verdict[]): string[] {
  return verdicts.filter((v) => !v.ok).map((v) => `${v.id} : ${v.motif}`);
}
