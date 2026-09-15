import { test } from "node:test";
import assert from "node:assert/strict";

import { creerEtat } from "../state/conversationState.ts";
import { creerMemoire, poserVerrou } from "../state/sessionMemory.ts";
import { decide, MAX_TOURS_AVANT_CREATION } from "../engine/decide.ts";
import {
  appliquerAction,
  appliquerVerrousDetectes,
  detecterLevees,
  detecterModificationCiblee,
  detecterVerrous,
} from "../engine/actions.ts";

const ctx = (o: Partial<Parameters<typeof decide>[2]> = {}) => ({
  tours: 1,
  carteProposee: false,
  demandeModification: false,
  ...o,
});

/* ------------------------------------------------------ décision */

test("une carte fournie s'analyse avant toute question", () => {
  const e = creerEtat({ carteExistante: true, carteAnalysee: false });
  assert.equal(decide(e, creerMemoire(), ctx()).step, "ANALYSE");
});

test("on ne repose pas une question dont la réponse est connue", () => {
  const e = creerEtat({ secteur: "Café", nomCommerce: "Le Comptoir" });
  const d = decide(e, creerMemoire(), ctx());
  assert.equal(d.step, "QUESTION");
  assert.equal(d.champ, "systemeFidelite");
  assert.notEqual(d.champ, "secteur");
});

test("état complet : on crée, on n'interroge plus", () => {
  const e = creerEtat({
    secteur: "Café",
    nomCommerce: "Le Comptoir",
    systemeFidelite: "stamps",
    objectif: 10,
    recompense: { texte: "Un café offert", libelleCourt: "Offert" },
  });
  assert.equal(decide(e, creerMemoire(), ctx()).step, "CREATION");
});

test("au-delà d'une dizaine d'échanges, on génère avec ce qu'on a", () => {
  const e = creerEtat({ secteur: "Café" });
  const d = decide(e, creerMemoire(), ctx({ tours: MAX_TOURS_AVANT_CREATION }));
  assert.equal(d.step, "CREATION");
  assert.match(d.motif, /échanges atteints/);
});

test("une demande de modification porte sur la carte déjà proposée", () => {
  const e = creerEtat({ secteur: "Café" });
  const d = decide(e, creerMemoire(), ctx({ carteProposee: true, demandeModification: true }));
  assert.equal(d.step, "MODIFICATION");
});

test("carte construite, rien à modifier : on attend le choix", () => {
  const e = creerEtat({ secteur: "Café" });
  assert.equal(
    decide(e, creerMemoire(), ctx({ carteProposee: true, carteExiste: true })).step,
    "VALIDATION",
  );
});

test("propositions affichées mais programme incomplet : on continue à collecter", () => {
  // Des vignettes à l'écran ne remplacent pas une récompense inconnue :
  // attendre un choix ici bloquerait la conversation dans le vide.
  const e = creerEtat({ secteur: "Café" });
  const d = decide(e, creerMemoire(), ctx({ carteProposee: true, carteExiste: false }));
  assert.equal(d.step, "QUESTION");
});

/* ----------------------------------------- langage naturel : verrous */

test("« ne touche pas au logo » pose un verrou sur le logo", () => {
  assert.deepEqual(detecterVerrous("Ne touche pas au logo"), ["logo"]);
  assert.deepEqual(detecterVerrous("ne touche plus au LOGO"), ["logo"]);
  assert.deepEqual(detecterVerrous("Garde ça, ne change pas les couleurs"), ["couleurs"]);
});

test("une phrase sans marqueur de verrou ne verrouille rien", () => {
  assert.deepEqual(detecterVerrous("Le logo est joli"), []);
  assert.deepEqual(detecterVerrous("Change le logo"), []);
});

test("« garde ça » sans cible nommée ne verrouille rien : on ne devine pas", () => {
  assert.deepEqual(detecterVerrous("Garde ça"), []);
});

test("une levée de verrou demande une formulation explicite", () => {
  assert.deepEqual(detecterLevees("Tu peux changer le logo"), ["logo"]);
  assert.deepEqual(detecterLevees("Le logo me plaît"), []);
});

test("« change seulement » est détecté comme modification ciblée", () => {
  assert.deepEqual(detecterModificationCiblee("Change seulement les couleurs"), ["couleurs"]);
  assert.deepEqual(detecterModificationCiblee("Change uniquement le logo"), ["logo"]);
  assert.deepEqual(detecterModificationCiblee("Refais tout"), []);
});

test("les verrous se posent avant tout appel au modèle", () => {
  const { memory, poses } = appliquerVerrousDetectes("Ne touche pas au logo", creerMemoire());
  assert.deepEqual(poses, ["logo"]);
  assert.deepEqual(memory.verrous, ["logo"]);
});

/* ------------------------------------------- application des actions */

test("une modification sur une cible verrouillée est REJETÉE en code", () => {
  const m = poserVerrou(creerMemoire(), "logo");
  const r = appliquerAction({ type: "modifier", cible: "logo" }, creerEtat(), m);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, "VERROU");
    assert.match(r.motif, /verrouillé/);
  }
});

test("une modification sur une cible libre passe", () => {
  const m = poserVerrou(creerMemoire(), "logo");
  const r = appliquerAction({ type: "modifier", cible: "couleurs" }, creerEtat(), m);
  assert.equal(r.ok, true);
});

test("réduire l'objectif remet les paliers à l'échelle plutôt que de les perdre", () => {
  const e = creerEtat({
    objectif: 10,
    paliers: [
      { position: 5, label: "-10%", description: "Dix pour cent" },
      { position: 10, label: "Offert", description: "Café offert" },
    ],
  });
  const r = appliquerAction({ type: "objectif", valeur: 6 }, e, creerMemoire());
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.etat.objectif, 6);
    assert.deepEqual(r.etat.paliers?.map((p) => p.position), [5]);
  }
});

test("des paliers au-delà de l'objectif sont refusés à l'application", () => {
  const e = creerEtat({ objectif: 10 });
  const r = appliquerAction(
    { type: "paliers", paliers: [{ position: 12, label: "X", description: "trop loin" }] },
    e,
    creerMemoire(),
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "INVALIDE");
});

test("deux paliers à la même position sont refusés à l'application", () => {
  const e = creerEtat({ objectif: 10 });
  const r = appliquerAction(
    {
      type: "paliers",
      paliers: [
        { position: 5, label: "A", description: "un" },
        { position: 5, label: "B", description: "deux" },
      ],
    },
    e,
    creerMemoire(),
  );
  assert.equal(r.ok, false);
});
