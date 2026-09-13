// Non-régression du CONTRAT DE CARTE, § 19.
//
// Le contrat énonce six règles qu'aucune évolution ultérieure ne doit
// permettre de contourner :
//
//     UNE SEULE FACE
//     AUCUN CODE QR
//     CODE-BARRES
//     POINTS OU TAMPONS
//     PHOTO DU COMMERCE SI FOURNIE ET DEMANDÉE
//     AUCUNE INFORMATION CLIENT INVENTÉE
//
// Une règle écrite dans un document se contourne sans s'en apercevoir. Ce
// fichier la rend exécutable : c'est `npm test` qui refuse la régression,
// pas la bonne volonté du prochain développeur.
//
// Le contrat nomme aussi des formes précises — `points_counter`, `stamp_grid`,
// `qr_code`, `second_face`. Elles sont testées telles quelles : elles
// passaient toutes avant la normalisation des noms de calque.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aucunMelangePointsTampons,
  aucunQrCode,
  codeBarresPresent,
  photoIntegree,
  uneSeuleFace,
  zoneCoherenteAvecLeMode,
} from "../validation/quality.ts";
import { CarteSchema, type Carte } from "../validation/schemas.ts";

const CODE_BARRES = { id: "code", nom: "Code-barres", type: "codebarres" as const };

function carte(partiel: Partial<Carte> = {}): Carte {
  return {
    nomCommerce: "Le Petit Four",
    calques: [CODE_BARRES],
    zonesFidelite: ["zone-fidelite"],
    ciblesModifiees: [],
    programme: {
      mode: "stamps",
      objectif: 10,
      paliers: [{ position: 10, label: "Offert", description: "Un café offert" }],
      recompense: { texte: "Un café offert", libelleCourt: "Offert" },
    },
    ...partiel,
  };
}

/* --------------------------------------------------------- § 3 · une face */

test("§3 — aucun calque ne peut supposer un verso", () => {
  for (const nom of [
    "verso",
    "dos",
    "face arrière",
    "recto-verso",
    "back",
    "backside",
    "second_face",
    "second_side",
  ]) {
    const c = carte({ calques: [CODE_BARRES, { id: "v", nom, type: "texte" }] });
    assert.equal(uneSeuleFace(c).ok, false, `« ${nom} » devrait être refusé`);
  }
});

test("§3 — un recto seul passe", () => {
  assert.equal(uneSeuleFace(carte()).ok, true);
});

/* ------------------------------------------------------------ § 4 · pas de QR */

test("§4 — aucun code QR sur la carte, quelle que soit l'écriture", () => {
  for (const nom of ["qr", "QR code", "qr-code", "qrcode", "qr_code", "Zone QR"]) {
    const c = carte({ calques: [CODE_BARRES, { id: "q", nom, type: "forme" }] });
    assert.equal(aucunQrCode(c).ok, false, `« ${nom} » devrait être refusé`);
  }
});

/* -------------------------------------------------------- § 5 · code-barres */

test("§5 — une carte sans code-barres est refusée", () => {
  assert.equal(codeBarresPresent(carte({ calques: [] })).ok, false);
  assert.equal(codeBarresPresent(carte()).ok, true);
});

/* ------------------------------------------- § 9 à 11 · exclusivité du mode */

test("§9 — mode tampons : aucun élément de points", () => {
  for (const nom of [
    "points",
    "Points : 0",
    "points_counter",
    "points_remaining",
    "points_progress",
    "points_threshold",
  ]) {
    const c = carte({ calques: [CODE_BARRES, { id: "p", nom, type: "texte" }] });
    assert.equal(aucunMelangePointsTampons(c).ok, false, `« ${nom} » devrait être refusé`);
  }
});

test("§10 — mode points : aucun élément de tampons", () => {
  for (const nom of ["tampons", "cases", "stamp_grid", "stamp_count", "stamp_icons"]) {
    const c = carte({
      zonesFidelite: [],
      programme: { ...carte().programme, mode: "points" },
      calques: [CODE_BARRES, { id: "s", nom, type: "forme" }],
    });
    assert.equal(aucunMelangePointsTampons(c).ok, false, `« ${nom} » devrait être refusé`);
  }
});

test("§11 — la zone de fidélité suit le mode, et lui seul", () => {
  // tampons : exactement une grille
  assert.equal(zoneCoherenteAvecLeMode(carte()).ok, true);
  assert.equal(zoneCoherenteAvecLeMode(carte({ zonesFidelite: [] })).ok, false);
  // points : aucune grille
  const enPoints = (zones: string[]) =>
    carte({ zonesFidelite: zones, programme: { ...carte().programme, mode: "points" } });
  assert.equal(zoneCoherenteAvecLeMode(enPoints([])).ok, true);
  assert.equal(zoneCoherenteAvecLeMode(enPoints(["zone-fidelite"])).ok, false);
});

/* ------------------------------------------------------------- § 7 · photo */

test("§7 — une photo fournie et demandée apparaît sur la carte", () => {
  assert.equal(photoIntegree(carte(), true).ok, false);
  const avec = carte({
    calques: [CODE_BARRES, { id: "ph", nom: "Photo de l'établissement", type: "image" }],
  });
  assert.equal(photoIntegree(avec, true).ok, true);
  // sans photo fournie, rien n'est exigé
  assert.equal(photoIntegree(carte(), false).ok, true);
});

/* ------------------------------------------- § 13 et 14 · non-invention */

test("§13-14 — la carte n'a aucun champ où loger une coordonnée inventée", () => {
  // La garantie la plus forte du contrat n'est pas une règle, c'est une
  // absence : le schéma n'expose ni adresse, ni téléphone, ni réseau social,
  // ni site, ni horaires. Il n'y a nulle part où en inventer une.
  const champs = Object.keys(CarteSchema.shape);
  for (const interdit of ["adresse", "telephone", "téléphone", "reseaux", "site", "horaires"]) {
    assert.ok(
      !champs.some((c) => c.toLowerCase().includes(interdit)),
      `le schéma expose « ${interdit} » : l'invention redevient possible`,
    );
  }
});

test("§18 — une sortie non conforme est rejetée par le schéma", () => {
  assert.equal(CarteSchema.safeParse({ ...carte(), nomCommerce: "" }).success, false);
  assert.equal(CarteSchema.safeParse(carte()).success, true);
});
