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

/**
 * Normalise un nom de calque avant de le confronter aux motifs interdits.
 *
 * Sans ça, tout nom en snake_case passe au travers : `\b` ne s'amorce pas
 * contre un souligné, qui est un caractère de mot. « points_counter »,
 * « stamp_grid » et « qr_code » échappaient ainsi à des contrôles écrits
 * précisément pour eux. Le contrat de carte nomme ces formes : elles doivent
 * être attrapées, quelle que soit la convention d'écriture du calque.
 */
function normaliser(nom: string): string {
  return nom.replace(/[_\-.·|/\\]+/g, " ");
}

/** Un calque ne doit jamais porter le nom d'un tampon : la grille est
 *  déclarative, elle n'est pas dessinée calque par calque. */
const NOM_TAMPON = /^(tampon|icône \d|icone \d|palier)\b/i;

export function commerceIdentifiable(c: Carte): Verdict {
  return c.nomCommerce.trim().length > 0
    ? ok("commerce-identifiable")
    : ko("commerce-identifiable", "le nom du commerce est vide");
}

/**
 * Une carte à tampons porte exactement une grille. Une carte à points n'en
 * porte aucune — sa progression est un compteur. Un seul système par carte.
 */
export function zoneCoherenteAvecLeMode(c: Carte): Verdict {
  const n = c.zonesFidelite.length;
  if (c.programme.mode === "stamps") {
    return n === 1
      ? ok("zone-mode")
      : ko("zone-mode", `carte à tampons : ${n} zone(s) de fidélité au lieu d'une seule`);
  }
  return n === 0
    ? ok("zone-mode")
    : ko("zone-mode", `carte à points : ${n} grille(s) de tampons alors qu'il n'en faut aucune`);
}

/** Vocabulaire de l'autre système : le mélange se voit d'abord dans les mots. */
const MOTS_POINTS = /\bpoints?\b/i;
const MOTS_TAMPONS = /\btampons?\b|\bcases?\b|\bstamps?\b/i;

/**
 * Le mélange points + tampons est la faute la plus visible pour le client :
 * une carte qui affiche « Points : 0 » au-dessus d'une grille de dix cases ne
 * dit pas comment on progresse.
 */
export function aucunMelangePointsTampons(c: Carte): Verdict {
  const noms = c.calques.map((l) => normaliser(l.nom)).join(" · ");
  if (c.programme.mode === "stamps" && MOTS_POINTS.test(noms)) {
    return ko("un-seul-systeme", `carte à tampons, mais un élément parle de points : « ${noms} »`);
  }
  if (c.programme.mode === "points" && MOTS_TAMPONS.test(noms)) {
    return ko("un-seul-systeme", `carte à points, mais un élément parle de tampons : « ${noms} »`);
  }
  return ok("un-seul-systeme");
}

/** Une carte FIDICARD a un recto, et rien d'autre. */
const NOM_VERSO =
  /\b(verso|dos|face arrière|face arriere|recto verso|back|backside|rear|second face|second side)\b/i;

export function uneSeuleFace(c: Carte): Verdict {
  const fautif = c.calques.find((l) => NOM_VERSO.test(normaliser(l.nom)));
  return fautif
    ? ko("une-seule-face", `le calque « ${fautif.nom} » suppose un verso`)
    : ok("une-seule-face");
}

/** Le code QR est réservé à l'affichage en boutique. Jamais sur la carte. */
const NOM_QR = /\bqr\b|qr[- ]?code/i;

export function aucunQrCode(c: Carte): Verdict {
  const fautif = c.calques.find((l) => NOM_QR.test(normaliser(l.nom)));
  return fautif
    ? ko("aucun-qr", `le calque « ${fautif.nom} » place un code QR sur la carte`)
    : ok("aucun-qr");
}

export function aucunCalqueTampon(c: Carte): Verdict {
  const fautif = c.calques.find((l) => NOM_TAMPON.test(normaliser(l.nom)));
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

/**
 * La photo de l'établissement, quand le commerçant en a fourni une, doit
 * apparaître dans la composition. Une photo reçue puis ignorée donne au
 * commerçant l'impression de ne pas avoir été écouté.
 */
export function photoIntegree(c: Carte, photoFournie: boolean): Verdict {
  if (!photoFournie) return ok("photo-integree");
  return c.calques.some((l) => l.type === "image" && /photo/i.test(l.nom))
    ? ok("photo-integree")
    : ko("photo-integree", "une photo a été fournie mais n'apparaît pas sur la carte");
}

/** Exécute tous les contrôles. L'ordre n'a pas d'importance : ils sont purs. */
export function controlerCarte(
  c: Carte,
  m: SessionMemory,
  opts: { photoFournie?: boolean } = {},
): Verdict[] {
  return [
    commerceIdentifiable(c),
    uneSeuleFace(c),
    aucunQrCode(c),
    zoneCoherenteAvecLeMode(c),
    aucunMelangePointsTampons(c),
    photoIntegree(c, opts.photoFournie ?? false),
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
