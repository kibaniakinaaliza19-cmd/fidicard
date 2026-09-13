// Tests du branchement de FidiIA sur le corpus existant.
//
// Le corpus, c'est `src/data/templateFactory.ts` : 864 modèles sur 24 secteurs.
// FidiIA l'ignorait complètement et inventait des récompenses génériques.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  corpusComplet,
  objectifAnnonce,
  referencesDistinctes,
  secteursConnus,
  suggestionPour,
  trouverSecteur,
} from "../corpus/index.ts";
import { construireCarte } from "../index.ts";
import { creerEtat } from "../state/conversationState.ts";
import { CarteSchema } from "../validation/schemas.ts";

/* ------------------------------------------------------------- secteurs */

test("les 24 secteurs du corpus sont exposés", () => {
  const s = secteursConnus();
  assert.equal(s.length, 24);
  for (const attendu of ["Café", "Fast-food", "Boulangerie", "Salon de coiffure"]) {
    assert.ok(s.includes(attendu), `secteur manquant : ${attendu}`);
  }
});

test("les mots du commerçant se rattachent au bon secteur", () => {
  const cas: [string, string][] = [
    ["je tiens un fast-food", "Fast-food"],
    ["boulangerie artisanale", "Boulangerie"],
    ["j'ai un salon de coiffure", "Salon de coiffure"],
    ["barbier depuis 10 ans", "Barbier"],
    ["mon bar à cocktails", "Bar"],
    ["une PÂTISSERIE", "Pâtisserie"],
    ["patisserie sans accent", "Pâtisserie"],
  ];
  for (const [texte, attendu] of cas) {
    assert.equal(trouverSecteur(texte), attendu, `« ${texte} »`);
  }
});

test("le mot le plus long gagne : « salon de coiffure » n'est pas « salon »", () => {
  assert.equal(trouverSecteur("salon de coiffure"), "Salon de coiffure");
});

test("un secteur inconnu renvoie undefined plutôt qu'un secteur au hasard", () => {
  // Un mauvais secteur donne des récompenses hors sujet — pire que rien.
  assert.equal(trouverSecteur("je vends des trucs"), undefined);
  assert.equal(trouverSecteur(""), undefined);
  assert.equal(suggestionPour(undefined, "stamps"), undefined);
});

/* --------------------------------------------- cohérence objectif/récompense */

test("objectifAnnonce lit le nombre de la phrase, pas celui de la remise", () => {
  assert.equal(objectifAnnonce("Le 10ᵉ café offert"), 10);
  assert.equal(objectifAnnonce("Une pâtisserie offerte à 8 visites"), 8);
  assert.equal(objectifAnnonce("-10 % dès 150 points"), 150);
  assert.equal(objectifAnnonce("-5 € tous les 250 points"), 250);
  assert.equal(objectifAnnonce("-50 % sur la 10ᵉ boisson"), 10);
  assert.equal(objectifAnnonce("Boisson + frites offertes à 6"), 6);
  // « V60 » est un nom de matériel, pas un objectif : c'est « à 12 » qui compte
  assert.equal(objectifAnnonce("Un filtre V60 offert à 12 visites"), 12);
});

test("toute suggestion accorde son objectif et sa récompense", () => {
  // Le corpus se contredit sur 719 de ses 864 entrées : le champ `goal` et la
  // phrase `reward` viennent de deux rotations d'index différentes. Une carte
  // annonçant « offert à 6 » avec un objectif de 12 serait fausse.
  for (const secteur of secteursConnus()) {
    for (const mode of ["stamps", "points"] as const) {
      const s = suggestionPour(secteur, mode);
      if (!s) continue;
      const annonce = objectifAnnonce(s.recompense.texte);
      assert.equal(
        annonce,
        s.objectif,
        `${secteur}/${mode} : objectif ${s.objectif} contre « ${s.recompense.texte} »`,
      );
    }
  }
});

test("chaque référence du corpus accorde objectif et récompense", () => {
  for (const r of corpusComplet()) {
    const annonce = objectifAnnonce(r.recompense);
    if (annonce === null) continue;
    assert.equal(annonce, r.objectif, `${r.id} : ${r.objectif} contre « ${r.recompense} »`);
  }
});

/* ----------------------------------------------------------- références */

test("les trois références proposées ont des dispositions distinctes", () => {
  const refs = referencesDistinctes("Fast-food", "stamps");
  assert.equal(refs.length, 3);
  assert.equal(new Set(refs.map((r) => r.disposition)).size, 3);
});

test("un secteur inconnu ne fabrique aucune référence", () => {
  assert.deepEqual(referencesDistinctes(undefined, "stamps"), []);
});

/* --------------------------------------------- branchement sur la carte */

test("sans secteur, la carte garde son défaut générique", () => {
  const c = construireCarte(creerEtat({ nomCommerce: "Chez Test" }));
  assert.equal(c.programme.objectif, 10);
  assert.equal(c.programme.recompense.texte, "Une prestation offerte");
});

test("avec un secteur, la carte part du corpus au lieu d'inventer", () => {
  const c = construireCarte(
    creerEtat({ nomCommerce: "Le Spot", secteur: "fast-food", systemeFidelite: "stamps" }),
  );
  assert.notEqual(
    c.programme.recompense.texte,
    "Une prestation offerte",
    "le corpus a une récompense écrite pour ce métier",
  );
  assert.equal(
    objectifAnnonce(c.programme.recompense.texte),
    c.programme.objectif,
    "la carte ne doit pas se contredire",
  );
  assert.equal(CarteSchema.safeParse(c).success, true);
});

test("ce que dit le commerçant prime toujours sur le corpus", () => {
  const c = construireCarte(
    creerEtat({
      nomCommerce: "Le Spot",
      secteur: "fast-food",
      systemeFidelite: "stamps",
      objectif: 7,
      recompense: { texte: "Un dessert offert", libelleCourt: "Offert" },
    }),
  );
  assert.equal(c.programme.objectif, 7);
  assert.equal(c.programme.recompense.texte, "Un dessert offert");
});

test("un objectif donné sans récompense n'emprunte pas celle du corpus", () => {
  // Sinon on collerait « Le 8ᵉ tacos offert » sur un objectif de 5.
  const c = construireCarte(
    creerEtat({ nomCommerce: "Le Spot", secteur: "fast-food", systemeFidelite: "stamps", objectif: 5 }),
  );
  assert.equal(c.programme.objectif, 5);
  assert.equal(c.programme.recompense.texte, "Une prestation offerte");
});

test("le corpus respecte le mode : une carte à points n'a pas de grille", () => {
  const c = construireCarte(
    creerEtat({ nomCommerce: "La Pharma", secteur: "pharmacie", systemeFidelite: "points" }),
  );
  assert.equal(c.programme.mode, "points");
  assert.deepEqual(c.zonesFidelite, [], "aucune grille de tampons en mode points");
  assert.ok(c.programme.objectif > 50, "un objectif en points, pas en passages");
});
