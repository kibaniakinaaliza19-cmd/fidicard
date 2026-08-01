import { test } from "node:test";
import assert from "node:assert/strict";

import {
  connait,
  creerEtat,
  informationsManquantes,
  majEtat,
} from "../state/conversationState.ts";
import {
  creerMemoire,
  estVerrouille,
  leverVerrou,
  noterDecision,
  noterInformation,
  noterPreference,
  poserVerrou,
} from "../state/sessionMemory.ts";

/* -------------------------------------------------------------- état */

test("un état vide n'autorise pas la création", () => {
  const e = creerEtat();
  assert.equal(e.creationAutorisee, false);
  assert.equal(informationsManquantes(e).length, 5);
});

test("les cinq informations minimales autorisent la création", () => {
  const e = creerEtat({
    secteur: "Café",
    nomCommerce: "Le Comptoir",
    systemeFidelite: "stamps",
    objectif: 10,
    recompense: { texte: "Un café offert", libelleCourt: "Offert" },
  });
  assert.equal(e.creationAutorisee, true);
  assert.deepEqual(informationsManquantes(e), []);
});

test("creationAutorisee ne peut pas être forcé à la main", () => {
  const e = creerEtat({ secteur: "Café" });
  assert.throws(() => {
    (e as unknown as { creationAutorisee: boolean }).creationAutorisee = true;
  });
  assert.equal(e.creationAutorisee, false);
});

test("une chaîne vide ne compte pas comme renseignée", () => {
  const e = creerEtat({ secteur: "   ", nomCommerce: "X" });
  assert.equal(connait(e, "secteur"), false);
  assert.equal(connait(e, "nomCommerce"), true);
});

test("majEtat renvoie un nouvel état sans muter l'ancien", () => {
  const a = creerEtat({ secteur: "Café" });
  const b = majEtat(a, { objectif: 10 });
  assert.equal(a.objectif, undefined);
  assert.equal(b.objectif, 10);
  assert.equal(b.secteur, "Café");
});

test("majEtat recalcule creationAutorisee", () => {
  let e = creerEtat({ secteur: "Café", nomCommerce: "Le Comptoir" });
  assert.equal(e.creationAutorisee, false);
  e = majEtat(e, { systemeFidelite: "stamps", objectif: 10 });
  assert.equal(e.creationAutorisee, false);
  e = majEtat(e, { recompense: { texte: "Un café offert", libelleCourt: "Offert" } });
  assert.equal(e.creationAutorisee, true);
});

/* ----------------------------------------------------------- mémoire */

test("les quatre catégories de mémoire restent séparées", () => {
  let m = creerMemoire();
  m = noterInformation(m, "logo", "logo.png");
  m = noterDecision(m, "mode", "stamps");
  m = noterPreference(m, "tons chauds");
  m = poserVerrou(m, "logo");

  assert.equal(m.informations.logo, "logo.png");
  assert.equal(m.decisions.mode, "stamps");
  assert.deepEqual(m.preferences, ["tons chauds"]);
  assert.deepEqual(m.verrous, ["logo"]);
  assert.equal(m.decisions.logo, undefined);
});

test("une préférence n'est pas enregistrée deux fois", () => {
  let m = creerMemoire();
  m = noterPreference(m, "sobre");
  m = noterPreference(m, "sobre");
  assert.equal(m.preferences.length, 1);
});

test("un verrou posé deux fois ne se duplique pas", () => {
  let m = creerMemoire();
  m = poserVerrou(m, "logo");
  m = poserVerrou(m, "logo");
  assert.deepEqual(m.verrous, ["logo"]);
});

test("un verrou ne se lève PAS sans demande explicite", () => {
  const m = poserVerrou(creerMemoire(), "logo");
  const r = leverVerrou(m, "logo", false);
  assert.equal(r.ok, false);
  assert.equal(estVerrouille(m, "logo"), true);
});

test("un verrou se lève sur demande explicite", () => {
  const m = poserVerrou(creerMemoire(), "logo");
  const r = leverVerrou(m, "logo", true);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(estVerrouille(r.memory, "logo"), false);
});
