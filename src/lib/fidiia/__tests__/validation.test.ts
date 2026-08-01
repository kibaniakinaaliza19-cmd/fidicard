import { test } from "node:test";
import assert from "node:assert/strict";

import { validerAction, validerCarte, type Carte } from "../validation/schemas.ts";
import {
  aucunCalqueTampon,
  aucunDoublonPalier,
  controlerCarte,
  dernierPalierRecompense,
  libelleCourtLisible,
  motifsEchec,
  paliersSousObjectif,
  toutValide,
  uneSeuleZoneFidelite,
  verrousRespectes,
} from "../validation/quality.ts";
import { creerMemoire, poserVerrou } from "../state/sessionMemory.ts";
import { construireCarte } from "../index.ts";
import { creerEtat } from "../state/conversationState.ts";

/* -------------------------------------------------- contrat de sortie */

test("les six actions valides sont acceptées", () => {
  const valides: unknown[] = [
    { type: "proposer", secteur: "Café", ambiance: "chaud" },
    { type: "mode", mode: "points" },
    { type: "objectif", valeur: 10 },
    { type: "paliers", paliers: [{ position: 5, label: "-10%", description: "Dix pour cent" }] },
    { type: "recompense", recompense: { texte: "Un café offert", libelleCourt: "Offert" } },
    { type: "modifier", cible: "couleurs" },
  ];
  for (const a of valides) {
    assert.equal(validerAction(a).ok, true, JSON.stringify(a));
  }
});

test("un objectif hors bornes est rejeté avec un motif", () => {
  const r = validerAction({ type: "objectif", valeur: 99 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motif, /valeur/);
});

test("un libellé court de plus de 8 caractères est rejeté", () => {
  const r = validerAction({
    type: "recompense",
    recompense: { texte: "Une coupe offerte", libelleCourt: "COUPE OFFERTE" },
  });
  assert.equal(r.ok, false);
});

test("une action inconnue est rejetée, jamais interprétée", () => {
  assert.equal(validerAction({ type: "publier" }).ok, false);
  assert.equal(validerAction({ type: "supprimer_client" }).ok, false);
  assert.equal(validerAction(null).ok, false);
  assert.equal(validerAction("objectif").ok, false);
});

test("une cible de modification hors liste est rejetée", () => {
  assert.equal(validerAction({ type: "modifier", cible: "base_de_donnees" }).ok, false);
});

/* ------------------------------------------------- contrôles qualité */

function carteValide(): Carte {
  return construireCarte(
    creerEtat({
      secteur: "Café",
      nomCommerce: "Le Comptoir",
      systemeFidelite: "stamps",
      objectif: 10,
      recompense: { texte: "Un café offert", libelleCourt: "Offert" },
    }),
  );
}

test("une carte construite par le moteur passe tous les contrôles", () => {
  const verdicts = controlerCarte(carteValide(), creerMemoire());
  assert.equal(toutValide(verdicts), true, motifsEchec(verdicts).join(" | "));
});

test("deux zones de fidélité sont refusées", () => {
  const c = { ...carteValide(), zonesFidelite: ["a", "b"] };
  assert.equal(uneSeuleZoneFidelite(c).ok, false);
});

test("aucune zone de fidélité est refusé", () => {
  const c = { ...carteValide(), zonesFidelite: [] };
  assert.equal(uneSeuleZoneFidelite(c).ok, false);
});

test("un calque nommé comme un tampon est refusé", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    calques: [...base.calques, { id: "x", nom: "Tampon 3", type: "icone" }],
  };
  const v = aucunCalqueTampon(c);
  assert.equal(v.ok, false);
  assert.match(v.motif, /à la main/);
});

test("un palier au-delà de l'objectif est refusé", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    programme: {
      ...base.programme,
      paliers: [{ position: 12, label: "Offert", description: "Café offert" }],
    },
  };
  assert.equal(paliersSousObjectif(c).ok, false);
});

test("deux paliers à la même position sont refusés", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    programme: {
      ...base.programme,
      paliers: [
        { position: 5, label: "-10%", description: "Dix pour cent" },
        { position: 5, label: "-20%", description: "Vingt pour cent" },
      ],
    },
  };
  assert.equal(aucunDoublonPalier(c).ok, false);
});

test("le dernier palier doit porter une récompense", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    programme: {
      ...base.programme,
      paliers: [{ position: 5, label: "-10%", description: "Dix pour cent" }],
    },
  };
  assert.equal(dernierPalierRecompense(c).ok, false);
});

test("un libellé trop long est refusé au niveau carte", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    programme: {
      ...base.programme,
      recompense: { texte: "Une coupe offerte", libelleCourt: "BEAUCOUPTROPLONG" },
    },
  };
  assert.equal(libelleCourtLisible(c).ok, false);
});

test("modifier un élément verrouillé fait échouer le contrôle", () => {
  const m = poserVerrou(creerMemoire(), "logo");
  const c: Carte = { ...carteValide(), ciblesModifiees: ["logo"] };
  const v = verrousRespectes(c, m);
  assert.equal(v.ok, false);
  assert.match(v.motif, /verrouillé/);
});

test("modifier un élément non verrouillé passe", () => {
  const m = poserVerrou(creerMemoire(), "logo");
  const c: Carte = { ...carteValide(), ciblesModifiees: ["couleurs"] };
  assert.equal(verrousRespectes(c, m).ok, true);
});

test("une carte structurellement fausse est rejetée par le schéma", () => {
  assert.equal(validerCarte({ nomCommerce: "" }).ok, false);
});
