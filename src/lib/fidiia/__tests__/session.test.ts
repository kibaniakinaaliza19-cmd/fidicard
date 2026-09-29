import { test } from "node:test";
import assert from "node:assert/strict";

import { creerSession, envoyerMessage, MAX_APPELS_PAR_MESSAGE } from "../index.ts";
import { estVerrouille } from "../state/sessionMemory.ts";
import { creerMockProvider } from "../provider/mock.ts";
import { getProvider, nomProviderConfigure } from "../provider/index.ts";
import { DECLENCHEURS_INVALIDES, SCENARIOS } from "./scenarios.ts";

/* ---------------------------------------------------- fournisseur */

test("le fournisseur par défaut est le simulé — aucun réseau", () => {
  assert.equal(nomProviderConfigure(), "mock");
  assert.equal(getProvider().id, "mock");
});

test("le fournisseur simulé est déterministe", async () => {
  const p = creerMockProvider();
  const a = await p.chat([{ role: "user", content: "Je suis coiffeur" }], []);
  const b = await p.chat([{ role: "user", content: "Je suis coiffeur" }], []);
  assert.deepEqual(a, b);
});

/* ------------------------------------------------- les 12 scénarios */

for (const s of SCENARIOS) {
  test(`scénario « ${s.titre} »`, async () => {
    const session = creerSession({ etat: s.depart });
    let refus = false;
    let repli = false;
    let appels = 0;

    for (const message of s.messages) {
      const r = await envoyerMessage(session, message);
      if (r.refus) refus = true;
      if (r.repli) repli = true;
      appels += r.appels;
      assert.ok(
        r.appels <= MAX_APPELS_PAR_MESSAGE,
        `${r.appels} appels pour un seul message : le budget est dépassé`,
      );
      assert.ok(r.reply.length > 0, "toute réponse doit avoir un texte affichable");
    }

    const a = s.attendu;
    if (a.secteur !== undefined) assert.equal(session.etat.secteur, a.secteur);
    if (a.nomCommerce !== undefined) assert.equal(session.etat.nomCommerce, a.nomCommerce);
    if (a.mode !== undefined) assert.equal(session.etat.systemeFidelite, a.mode);
    if (a.objectif !== undefined) assert.equal(session.etat.objectif, a.objectif);
    if (a.creationAutorisee !== undefined) {
      assert.equal(session.etat.creationAutorisee, a.creationAutorisee);
    }
    if (a.verrous !== undefined) {
      assert.deepEqual([...session.memory.verrous].sort(), [...a.verrous].sort());
    }
    if (a.refusAttendu !== undefined) assert.equal(refus, a.refusAttendu);
    if (a.repliAttendu !== undefined) assert.equal(repli, a.repliAttendu);
    if (a.appelsMax !== undefined) assert.ok(appels <= a.appelsMax, `${appels} appels`);
  });
}

/* ------------------------------------------- les deux tests critiques */

test("VERROU : « ne touche pas au logo » tient face à une demande directe", async () => {
  const session = creerSession();
  await envoyerMessage(session, "Je suis fleuriste");
  await envoyerMessage(session, "Ne touche pas au logo");
  assert.equal(estVerrouille(session.memory, "logo"), true);

  const r = await envoyerMessage(session, "Change seulement le logo");
  assert.deepEqual(r.actions, [], "aucune action ne doit être appliquée sur un élément verrouillé");
  assert.equal(r.refus?.code, "VERROU");
  assert.equal(estVerrouille(session.memory, "logo"), true, "le verrou survit à la tentative");
});

test("VERROU : il survit à plusieurs tours et à d'autres modifications", async () => {
  const session = creerSession();
  await envoyerMessage(session, "Je suis boucher");
  await envoyerMessage(session, "Ne touche plus au logo");
  await envoyerMessage(session, "Change uniquement les couleurs");
  await envoyerMessage(session, "10 tampons");
  assert.equal(estVerrouille(session.memory, "logo"), true);

  const r = await envoyerMessage(session, "Change seulement le logo");
  assert.equal(r.refus?.code, "VERROU");
});

/**
 * Règle d'honnêteté demandée après un défaut observé en réel : un modèle
 * réel (pas le simulé) avait répondu « Je réduis le logo de 30 %, sans
 * toucher au reste » alors que la géométrie du calque, mesurée dans le vrai
 * DOM, n'avait pas bougé d'un pixel. Une retouche que le moteur ne sait pas
 * appliquer ne doit JAMAIS produire une réponse qui prétend l'inverse — et
 * la carte elle-même ne doit pas bouger.
 */
test("HONNÊTETÉ : une retouche de taille/position est refusée, jamais confirmée", async () => {
  const session = creerSession();
  await envoyerMessage(session, "Je suis fleuriste");
  const avant = session.carte;

  const r = await envoyerMessage(session, "Change seulement le logo");
  assert.equal(r.refus?.code, "INVALIDE");
  assert.match(r.reply, /Wallet/);
  assert.doesNotMatch(r.reply, /(c'est fait|c’est fait|réglé|réduit|déplacé|appliqué)/i);
  assert.equal(session.carte, avant, "la carte ne doit pas changer quand la retouche est refusée");
});

test("HONNÊTETÉ : la carte n'a pas bougé après un refus, comparée avant/après", async () => {
  const session = creerSession();
  await envoyerMessage(session, "Je suis coiffeur, ambiance chaleureuse");
  await envoyerMessage(session, "Ça s'appelle Chez Test");
  await envoyerMessage(session, "10 tampons");
  await envoyerMessage(session, "Une coupe offerte");
  assert.ok(session.carte, "la carte doit déjà exister pour tester une retouche dessus");
  const carteAvant = JSON.stringify(session.carte);

  const r = await envoyerMessage(session, "Change seulement le logo");
  assert.equal(r.refus?.code, "INVALIDE");
  assert.doesNotMatch(r.reply, /(c'est fait|c’est fait|réglé|réduit|déplacé|appliqué)/i);
  assert.equal(JSON.stringify(session.carte), carteAvant, "aucun octet de la carte ne doit changer");
});

test("MODIFICATION CIBLÉE : une autre cible n'est pas bloquée par un verrou", async () => {
  // "couleurs" ne convient plus de témoin : modifier() la refuse désormais
  // toujours (redirection vers "design", aucun changement réel possible
  // depuis une phrase libre — voir engine/actions.ts). "photo" reste le seul
  // cas où modifier a un effet réel, et vérifie la même chose : un verrou
  // sur "logo" ne doit pas déborder sur une cible sans rapport.
  const session = creerSession();
  await envoyerMessage(session, "Je suis barbier");
  await envoyerMessage(session, "Ne touche pas au logo");
  const r = await envoyerMessage(session, "Change seulement la photo");
  assert.equal(r.refus, undefined);
  assert.equal(r.actions[0]?.type, "modifier");
});

test("le verrou se lève sur demande explicite, et seulement là", async () => {
  const session = creerSession();
  await envoyerMessage(session, "Je suis coiffeur");
  await envoyerMessage(session, "Ne touche pas au logo");
  await envoyerMessage(session, "Le logo est vraiment bien");
  assert.equal(estVerrouille(session.memory, "logo"), true);

  await envoyerMessage(session, "Finalement tu peux modifier le logo");
  assert.equal(estVerrouille(session.memory, "logo"), false);
});

/* ------------------------------------------------ rejet et repli */

test("une sortie invalide n'est jamais appliquée", async () => {
  const session = creerSession({ etat: { secteur: "Garage" } });
  const r = await envoyerMessage(session, DECLENCHEURS_INVALIDES.objectifHorsBornes);
  assert.deepEqual(r.actions, []);
  assert.equal(session.etat.objectif, undefined, "l'objectif invalide n'a pas été écrit");
});

test("un libellé trop long est rejeté, la récompense n'est pas enregistrée", async () => {
  const session = creerSession({ etat: { secteur: "Salon de coiffure" } });
  const r = await envoyerMessage(session, DECLENCHEURS_INVALIDES.libelleTropLong);
  assert.deepEqual(r.actions, []);
  assert.equal(session.etat.recompense, undefined);
});

test("une action inconnue est ignorée, jamais interprétée", async () => {
  const session = creerSession({ etat: { secteur: "Café" } });
  const r = await envoyerMessage(session, DECLENCHEURS_INVALIDES.actionInconnue);
  assert.deepEqual(r.actions, []);
});

test("le modèle se corrige à la relance : deux appels, action appliquée", async () => {
  const session = creerSession({ etat: { secteur: "Café" } });
  const r = await envoyerMessage(session, DECLENCHEURS_INVALIDES.invalidePuisValide);
  assert.equal(r.appels, 2);
  assert.equal(r.repli, false);
  assert.equal(r.actions[0]?.type, "objectif");
  assert.equal(session.etat.objectif, 10);
});

test("après deux échecs, repli sans troisième appel", async () => {
  const session = creerSession({ etat: { secteur: "Garage" } });
  const r = await envoyerMessage(session, DECLENCHEURS_INVALIDES.objectifHorsBornes);
  assert.equal(r.repli, true);
  assert.equal(r.appels, MAX_APPELS_PAR_MESSAGE);
});

/* ------------------------------------------- retoucher une carte composée */
//
// Le bug trouvé en réel : « modifier » était journalisé comme appliqué sur
// une carte composée sans jamais changer un seul champ — une fausse
// confirmation. Ces tests passent par `envoyerMessage` en entier (pas
// `appliquerAction` isolément) : c'est le chemin réel, celui qui construit
// aussi le `CardDoc` final via `session.carte`.

const ETAT_COMPLET = {
  secteur: "Café",
  nomCommerce: "Le Petit Grain",
  systemeFidelite: "stamps" as const,
  objectif: 10,
  recompense: { texte: "Un café offert", libelleCourt: "Offert" },
};

test("composer envoyé une seconde fois change réellement session.carte (avant ≠ après)", async () => {
  const session = creerSession({ etat: ETAT_COMPLET });
  await envoyerMessage(session, "__composer_seul__");
  const largeurAvant = session.carte?.composition?.calques[0].largeur;
  assert.ok(largeurAvant, "la première composition doit avoir été construite");

  await envoyerMessage(session, "__composer_retouche__");
  const largeurApres = session.carte?.composition?.calques[0].largeur;

  assert.notEqual(largeurApres, largeurAvant, "avant === après : la retouche n'a rien changé sur la carte réelle");
  assert.equal(largeurApres, (largeurAvant ?? 0) / 2);
});

test("modifier sur une carte composée est refusé — pas de fausse confirmation dans la réponse", async () => {
  const session = creerSession({ etat: ETAT_COMPLET });
  await envoyerMessage(session, "__composer_seul__");
  const compositionAvant = JSON.stringify(session.carte?.composition);

  const r = await envoyerMessage(session, "__modifier_sur_composition__");

  assert.equal(r.refus?.code, "INVALIDE");
  assert.equal(JSON.stringify(session.carte?.composition), compositionAvant, "la composition n'a pas bougé");
  // Le mock répond « C'est fait, le nom est réduit. » : ce texte ne doit
  // jamais atteindre le commerçant tel quel, sous peine de fausse confirmation.
  assert.doesNotMatch(r.reply, /c'est fait/i);
});

/* ----------------------------------------------------- journal */

test("le journal ne contient aucun contenu de conversation", async () => {
  const session = creerSession();
  await envoyerMessage(session, "Je suis coiffeur et mon client s'appelle Paul Durand");
  const brut = JSON.stringify(session.journal);
  assert.ok(!brut.includes("Paul"), "le journal ne doit contenir aucune donnée personnelle");
  assert.ok(!brut.includes("coiffeur"));
  assert.ok(session.journal[0].versionPrompt.length > 0);
});
