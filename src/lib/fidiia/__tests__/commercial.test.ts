// Le calcul de gain ne doit jamais inventer un chiffre sur un commerce dont
// on ne sait rien, et son hypothèse doit rester visible en toutes lettres —
// voir commercial/estimation.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { estimerGain, TAUX_RETOUR_PRUDENT } from "../commercial/estimation.ts";
import { creerEtat } from "../state/conversationState.ts";
import { creerMemoire } from "../state/sessionMemory.ts";
import { appliquerAction } from "../engine/actions.ts";
import { formulerQuestion } from "../engine/decide.ts";
import { construirePrompt } from "../prompts/build.ts";
import { validerAction } from "../validation/schemas.ts";

test("aucun chiffre de clients connu : pas d'estimation", () => {
  assert.equal(estimerGain({}), null);
  assert.equal(estimerGain({ clientsParSemaine: 0 }), null);
  assert.equal(estimerGain({ nbPointsVente: 3 }), null);
});

test("un seul point de vente par défaut, jamais deviné à la hausse", () => {
  const seul = estimerGain({ clientsParSemaine: 100 });
  const avecUnSeul = estimerGain({ clientsParSemaine: 100, nbPointsVente: 1 });
  assert.deepEqual(seul, avecUnSeul);
});

test("le nombre de points de vente augmente le volume", () => {
  // Pas d'égalité stricte avec un facteur ×3 : l'arrondi final ne commute pas
  // exactement avec la multiplication (100×4.33×3×8 % arrondi ≠ 3× l'arrondi
  // de 100×4.33×1×8 %). Seul le sens de variation est une garantie réelle.
  const un = estimerGain({ clientsParSemaine: 100, nbPointsVente: 1 });
  const trois = estimerGain({ clientsParSemaine: 100, nbPointsVente: 3 });
  assert.ok(un && trois);
  assert.ok(trois.visitesSupplementairesParMois > un.visitesSupplementairesParMois);
});

test("l'hypothèse est déclarée en toutes lettres, avec le bon taux", () => {
  const r = estimerGain({ clientsParSemaine: 200 });
  assert.ok(r);
  assert.match(r.hypotheseTexte, /prudente/);
  assert.match(r.hypotheseTexte, new RegExp(`${Math.round(TAUX_RETOUR_PRUDENT * 100)}\\s*%`));
});

test("le résultat est un entier arrondi, jamais une fraction de visite", () => {
  const r = estimerGain({ clientsParSemaine: 37, nbPointsVente: 2 });
  assert.ok(r);
  assert.equal(Number.isInteger(r.visitesSupplementairesParMois), true);
});

/* ------------------------------------------------ le panier moyen, en euros */

test("sans panier moyen, aucun gain en euros n'est produit", () => {
  const r = estimerGain({ clientsParSemaine: 100 });
  assert.ok(r);
  assert.equal(r.gainEuroParMois, undefined);
});

test("avec un panier moyen, le gain en euros est le nombre de visites × le panier", () => {
  const r = estimerGain({ clientsParSemaine: 100, panierMoyen: 12 });
  assert.ok(r);
  assert.equal(r.gainEuroParMois, Math.round(r.visitesSupplementairesParMois * 12));
});

test("un panier moyen nul ou négatif est ignoré, pas transformé en gain négatif", () => {
  const r = estimerGain({ clientsParSemaine: 100, panierMoyen: 0 });
  assert.ok(r);
  assert.equal(r.gainEuroParMois, undefined);
});

/* -------------------------------------- l'action, de bout en bout */

test("l'action qualifier valide un sous-ensemble de champs", () => {
  const v = validerAction({ type: "qualifier", clientsParSemaine: 80, prenom: "Nadia" });
  assert.equal(v.ok, true);
});

test("appliquerAction(qualifier) n'écrit que les champs transmis, jamais les autres", () => {
  const etat = creerEtat({ nomCommerce: "Le Spot" });
  const r = appliquerAction(
    { type: "qualifier", clientsParSemaine: 150, contact: "06 00 00 00 00" },
    etat,
    creerMemoire(),
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.etat.clientsParSemaine, 150);
  assert.equal(r.etat.contact, "06 00 00 00 00");
  assert.equal(r.etat.nbPointsVente, undefined);
  // Le nom du commerce, connu avant l'action, n'a pas été perdu au passage.
  assert.equal(r.etat.nomCommerce, "Le Spot");
});

test("qualifier n'entre jamais dans les champs requis à la création", () => {
  const sansQualif = creerEtat({
    secteur: "Café", nomCommerce: "Le Spot", systemeFidelite: "stamps",
    objectif: 8, recompense: { texte: "Un café offert", libelleCourt: "Offert" },
  });
  assert.equal(sansQualif.creationAutorisee, true, "aucun champ de qualification n'a été fourni, la carte doit rester constructible");
});

test("la question de fidélité n'oppose plus deux mots techniques", () => {
  const q = formulerQuestion("systemeFidelite");
  assert.doesNotMatch(q, /tampons? ou points?/i);
});

/* --------------------------------------- le gain dans le prompt assemblé */

function texteSysteme(etat: ReturnType<typeof creerEtat>): string {
  const messages = construirePrompt({ etat, memory: creerMemoire(), historique: [] });
  return messages[0].content;
}

// Le bloc commercial.ts contient toujours le titre « ## Le gain estimé » —
// c'est l'instruction donnée au modèle, présente qu'il y ait ou non un
// chiffre à annoncer. Seule la ligne « gain estimé (calculé, … » vient de
// resumerEtat() : c'est elle, et seulement elle, qui doit dépendre de l'état.
const LIGNE_GAIN_CALCULE = /gain estimé \(calculé/;

test("sans clients/semaine connus, aucun gain calculé n'est glissé dans l'état connu", () => {
  const etat = creerEtat({ nomCommerce: "Le Spot" });
  assert.doesNotMatch(texteSysteme(etat), LIGNE_GAIN_CALCULE);
});

test("dès que les clients/semaine sont connus, le prompt porte un gain calculé", () => {
  const etat = creerEtat({ nomCommerce: "Le Spot", clientsParSemaine: 120 });
  const r = estimerGain({ clientsParSemaine: 120 });
  assert.ok(r);
  assert.match(texteSysteme(etat), LIGNE_GAIN_CALCULE);
  assert.match(texteSysteme(etat), new RegExp(String(r.visitesSupplementairesParMois)));
});

test("sans panier moyen, le prompt ne mentionne aucun montant en euros", () => {
  const etat = creerEtat({ nomCommerce: "Le Spot", clientsParSemaine: 120 });
  assert.doesNotMatch(texteSysteme(etat), /€ de plus par mois/);
});

test("avec un panier moyen, le prompt porte le gain converti en euros", () => {
  const etat = creerEtat({ nomCommerce: "Le Spot", clientsParSemaine: 120, panierMoyen: 15 });
  const r = estimerGain({ clientsParSemaine: 120, panierMoyen: 15 });
  assert.ok(r?.gainEuroParMois !== undefined);
  const texte = texteSysteme(etat);
  assert.match(texte, /€ de plus par mois/);
  assert.match(texte, new RegExp(String(r.gainEuroParMois)));
});
