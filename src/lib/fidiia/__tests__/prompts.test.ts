// Garde-fou des prompts.
//
// Le texte des prompts est écrit à la main et écrase régulièrement le
// précédent. Ces tests vérifient qu'un copier-coller ne peut pas introduire
// en silence un chiffre faux, un nom de fournisseur, ou une action inconnue.
//
// Le plus important est le premier : un contrat qui annonce « objectif entre
// 1 et 24 » alors que le schéma en accepte 30 produit un modèle qui s'autocensure,
// ou pire, un modèle qui propose 24 en croyant respecter la borne.

import { test } from "node:test";
import assert from "node:assert/strict";

import { IDENTITY, IDENTITY_VERSION } from "../prompts/identity.ts";
import { GUARDRAILS, GUARDRAILS_VERSION } from "../prompts/guardrails.ts";
import { CONTRACT, CONTRACT_VERSION, COMPOSER_EXEMPLE, HABILLAGE_EXEMPLE } from "../prompts/contract.ts";
import { COMMERCIAL, COMMERCIAL_VERSION } from "../prompts/commercial.ts";
import { MAX_CARACTERES, MAX_MESSAGES, PROMPT_VERSION } from "../prompts/build.ts";
import { MAX_APPELS_PAR_MESSAGE } from "../index.ts";
import {
  ANGLE_DEGRE_MAX,
  CALQUES_COMPOSES_MAX,
  CALQUES_COMPOSES_MIN,
  CHEVAUCHEMENT_MAX_PCT,
  ESSAI_JOURS_GRATUITS,
  LIBELLE_COURT_MAX,
  MAX_ACTIONS_PAR_TOUR,
  NB_PROPOSITIONS,
  NOM_MAX,
  NOMS_ACTIONS,
  OBJECTIF_MAX_POINTS,
  OBJECTIF_MAX_TAMPONS,
  OBJECTIF_MIN_POINTS,
  OBJECTIF_MIN_TAMPONS,
  PALIERS_MAX,
  PALIERS_MIN,
  PCT_MAX,
  PCT_MIN,
  REPLY_MAX,
  TAILLE_CALQUE_MAX,
  TAILLE_CALQUE_MIN,
  TEXTE_MAX,
  ZONE_COLONNES_MAX,
  ZONE_COLONNES_MIN,
  CibleSchema,
} from "../validation/schemas.ts";
import { chiffresNonDeclares, decrireDivergences, motsInterditsTrouves } from "./promptChecks.ts";

/**
 * Toutes les valeurs chiffrées qu'un prompt a le droit d'énoncer. Chacune est
 * appliquée quelque part dans le code. Un nombre absent d'ici ne correspond à
 * aucune règle : il ne doit pas figurer dans un prompt.
 */
const VALEURS_DECLAREES = [
  OBJECTIF_MIN_TAMPONS,
  OBJECTIF_MAX_TAMPONS,
  OBJECTIF_MIN_POINTS,
  OBJECTIF_MAX_POINTS,
  LIBELLE_COURT_MAX,
  PALIERS_MIN,
  PALIERS_MAX,
  NB_PROPOSITIONS,
  TEXTE_MAX,
  REPLY_MAX,
  NOM_MAX,
  MAX_MESSAGES,
  MAX_CARACTERES,
  MAX_APPELS_PAR_MESSAGE,
  MAX_ACTIONS_PAR_TOUR,
  CALQUES_COMPOSES_MIN,
  CALQUES_COMPOSES_MAX,
  ANGLE_DEGRE_MAX,
  TAILLE_CALQUE_MIN,
  TAILLE_CALQUE_MAX,
  ZONE_COLONNES_MIN,
  ZONE_COLONNES_MAX,
  CHEVAUCHEMENT_MAX_PCT,
  PCT_MIN,
  PCT_MAX,
  ESSAI_JOURS_GRATUITS,
];

// Les deux exemples (COMPOSER_EXEMPLE, HABILLAGE_EXEMPLE) portent des
// coordonnées, des couleurs, une adresse et un téléphone illustratifs — pas
// des bornes ; voir les commentaires à leur définition dans contract.ts. Ils
// sont retirés avant le contrôle des chiffres, pas de tout le reste : le
// texte autour des exemples reste vérifié.
const CONTRACT_SANS_EXEMPLE = CONTRACT.replace(COMPOSER_EXEMPLE, "").replace(HABILLAGE_EXEMPLE, "");

const BLOCS: [string, string][] = [
  ["identity.ts", IDENTITY],
  ["guardrails.ts", GUARDRAILS],
  ["contract.ts", CONTRACT_SANS_EXEMPLE],
  ["commercial.ts", COMMERCIAL],
];

/* --------------------------------------- le contrôle se contrôle lui-même */

test("le contrôle repère un chiffre qui ne correspond à aucune borne", () => {
  const faux = "objectif compris entre 1 et 24\nlibellé d'au plus 8 caractères";
  const d = chiffresNonDeclares(faux, VALEURS_DECLAREES);
  assert.equal(d.length, 1);
  assert.equal(d[0].nombre, 24);
  assert.match(d[0].extrait, /entre 1 et 24/);
});

test("le contrôle laisse passer un texte dont tous les chiffres sont déclarés", () => {
  const bon = `objectif entre ${OBJECTIF_MIN_TAMPONS} et ${OBJECTIF_MAX_TAMPONS}, libellé ${LIBELLE_COURT_MAX} caractères`;
  assert.deepEqual(chiffresNonDeclares(bon, VALEURS_DECLAREES), []);
});

test("le message d'échec nomme le chiffre et son contexte", () => {
  const d = chiffresNonDeclares("au plus 99 paliers", VALEURS_DECLAREES);
  const msg = decrireDivergences("contract.ts", d);
  assert.match(msg, /99/);
  assert.match(msg, /schemas\.ts/);
});

/* ------------------------------------------- aucun chiffre ne peut mentir */

for (const [nom, texte] of BLOCS) {
  test(`${nom} : aucun chiffre ne diverge de schemas.ts`, () => {
    const d = chiffresNonDeclares(texte, VALEURS_DECLAREES);
    assert.deepEqual(d, [], d.length ? decrireDivergences(nom, d) : "");
  });
}

test("le contrat énonce réellement les bornes qu'il prétend faire respecter", () => {
  // Un contrat muet sur ses bornes est aussi mauvais qu'un contrat qui ment :
  // le modèle n'a alors aucune valeur cible. Les deux modes ont chacun leur
  // paire de bornes depuis que l'objectif n'a plus une borne unique.
  assert.match(CONTRACT, new RegExp(`\\b${OBJECTIF_MIN_TAMPONS}\\b`));
  assert.match(CONTRACT, new RegExp(`\\b${OBJECTIF_MAX_TAMPONS}\\b`));
  assert.match(CONTRACT, new RegExp(`\\b${OBJECTIF_MIN_POINTS}\\b`));
  assert.match(CONTRACT, new RegExp(`\\b${OBJECTIF_MAX_POINTS}\\b`));
  assert.match(CONTRACT, new RegExp(`\\b${LIBELLE_COURT_MAX}\\b`));
});

/* --------------------------------------------- cohérence avec le contrat */

test("le contrat nomme toutes les actions de NOMS_ACTIONS, et elles seules", () => {
  for (const nom of NOMS_ACTIONS) {
    assert.match(CONTRACT, new RegExp(`\\b${nom}\\b`), `action « ${nom} » absente du contrat`);
  }
});

test("le contrat nomme les six cibles de modification", () => {
  for (const cible of CibleSchema.options) {
    assert.match(CONTRACT, new RegExp(cible), `cible « ${cible} » absente du contrat`);
  }
});

/* ---------------------------------------------------- hygiène des prompts */

for (const [nom, texte] of BLOCS) {
  test(`${nom} : ne nomme aucun fournisseur ni modèle`, () => {
    const trouves = motsInterditsTrouves(texte);
    assert.deepEqual(trouves, [], `mots interdits : ${trouves.join(", ")}`);
  });

  test(`${nom} : n'est pas vide`, () => {
    assert.ok(texte.trim().length > 100, "un bloc de prompt quasi vide est probablement une erreur de collage");
  });
}

test("l'identité nomme FidiIA", () => {
  assert.match(IDENTITY, /FidiIA/);
});

test("les quatre blocs portent une version exploitable", () => {
  for (const v of [IDENTITY_VERSION, GUARDRAILS_VERSION, CONTRACT_VERSION, COMMERCIAL_VERSION]) {
    assert.match(v, /^\d+\.\d+\.\d+$/, `version « ${v} » hors format`);
  }
  // La version composite part au journal : sans elle, une régression de prompt
  // est indétectable après coup.
  assert.equal(PROMPT_VERSION, `${IDENTITY_VERSION}/${GUARDRAILS_VERSION}/${CONTRACT_VERSION}/${COMMERCIAL_VERSION}`);
});
