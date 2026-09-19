import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ACTIONS_PAR_TOUR,
  validerAction,
  validerCarte,
  validerLotActions,
  type Carte,
  type Composition,
} from "../validation/schemas.ts";
import {
  aucunCalqueTampon,
  aucunDoublonPalier,
  chevauchementExcessif,
  chevauchementRatio,
  controlerCarte,
  corrigerComposition,
  dernierPalierRecompense,
  libelleCourtLisible,
  motifsEchec,
  paliersSousObjectif,
  recadrerRect,
  toutValide,
  zoneCoherenteAvecLeMode,
  aucunMelangePointsTampons,
  uneSeuleFace,
  aucunQrCode,
  photoIntegree,
  verrousRespectes,
} from "../validation/quality.ts";
import { creerMemoire, poserVerrou } from "../state/sessionMemory.ts";
import { construireCarte } from "../index.ts";
import { creerEtat } from "../state/conversationState.ts";
import { appliquerAction } from "../engine/actions.ts";

/* -------------------------------------------------- contrat de sortie */

/** Composition minimale mais valide, réutilisée par plusieurs tests. */
function compositionValide(): Composition {
  return {
    fond: { type: "uni", couleur: "#183F32" },
    calques: [
      {
        role: "nom",
        texte: "Le Petit Grain",
        x: 8, y: 10, largeur: 60, hauteur: 8,
        police: "geist", graisse: "bold", taille: 8,
        couleur: "#FFF5E3", alignement: "gauche",
      },
    ],
    zoneFidelite: {
      x: 10, y: 55, largeur: 80, hauteur: 20,
      forme: "cercle", colonnes: 5,
      icone: "Coffee", couleurRempli: "#1B4D3E", couleurVide: "#3A5850",
    },
  };
}

test("les huit actions valides sont acceptées, composer compris", () => {
  const valides: unknown[] = [
    { type: "proposer", secteur: "Café", ambiance: "chaud" },
    { type: "nom", valeur: "Le Petit Grain" },
    { type: "mode", mode: "points" },
    { type: "objectif", valeur: 10 },
    { type: "paliers", paliers: [{ position: 5, label: "-10%", description: "Dix pour cent" }] },
    { type: "recompense", recompense: { texte: "Un café offert", libelleCourt: "Offert" } },
    { type: "modifier", cible: "couleurs" },
    { type: "composer", ...compositionValide() },
  ];
  for (const a of valides) {
    assert.equal(validerAction(a).ok, true, JSON.stringify(a));
  }
});

test("un lot de deux actions valides est accepté dans l'ordre", () => {
  const r = validerLotActions([
    { type: "recompense", recompense: { texte: "Un café offert", libelleCourt: "Offert" } },
    { type: "composer", ...compositionValide() },
  ]);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.valeur.length, 2);
    assert.equal(r.valeur[0].type, "recompense");
    assert.equal(r.valeur[1].type, "composer");
  }
});

test("un lot où une seule action est invalide invalide le lot entier", () => {
  const r = validerLotActions([
    { type: "recompense", recompense: { texte: "Un café offert", libelleCourt: "Offert" } },
    { type: "objectif", valeur: 1500 },
  ]);
  assert.equal(r.ok, false);
});

test(`un lot de plus de ${MAX_ACTIONS_PAR_TOUR} actions est refusé avant même d'être lu`, () => {
  const trop = Array.from({ length: MAX_ACTIONS_PAR_TOUR + 1 }, () => ({ type: "objectif", valeur: 10 }));
  const r = validerLotActions(trop);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motif, /trop d'actions/);
});

test("un objectif hors du schéma (union des deux modes) est rejeté avec un motif", () => {
  // 1500 dépasse même la borne large du mode points (1000) : invalide quel
  // que soit le mode. Le schéma ne connaît pas le mode — voir
  // appliquerAction pour le rejet PROPRE À un mode (ex. 99 en tampons).
  const r = validerAction({ type: "objectif", valeur: 1500 });
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

test("carte à tampons : deux zones de fidélité sont refusées", () => {
  const c = { ...carteValide(), zonesFidelite: ["a", "b"] };
  assert.equal(zoneCoherenteAvecLeMode(c).ok, false);
});

test("carte à tampons : aucune zone est refusé", () => {
  const c = { ...carteValide(), zonesFidelite: [] };
  assert.equal(zoneCoherenteAvecLeMode(c).ok, false);
});

/* ------------------------------------- un seul système, une seule face */

test("carte à points : une grille de tampons est refusée", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    zonesFidelite: ["zone-fidelite"],
    programme: { ...base.programme, mode: "points" },
  };
  const v = zoneCoherenteAvecLeMode(c);
  assert.equal(v.ok, false);
  assert.match(v.motif, /aucune/);
});

test("carte à points : aucune grille, c'est correct", () => {
  const c = construireCarte(
    creerEtat({
      secteur: "Institut de beauté",
      nomCommerce: "Éclat",
      systemeFidelite: "points",
      objectif: 20,
      recompense: { texte: "10 % de réduction", libelleCourt: "-10%" },
    }),
  );
  assert.deepEqual(c.zonesFidelite, []);
  assert.equal(zoneCoherenteAvecLeMode(c).ok, true);
});

test("carte à tampons : un compteur de points est refusé", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    calques: [...base.calques, { id: "pts", nom: "Compteur de points", type: "texte" }],
  };
  const v = aucunMelangePointsTampons(c);
  assert.equal(v.ok, false);
  assert.match(v.motif, /points/);
});

test("carte à points : une grille de tampons nommée est refusée", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    zonesFidelite: [],
    programme: { ...base.programme, mode: "points" },
    calques: [...base.calques, { id: "t", nom: "Grille de tampons", type: "forme" }],
  };
  assert.equal(aucunMelangePointsTampons(c).ok, false);
});

test("un calque de verso est refusé : la carte a une seule face", () => {
  const base = carteValide();
  for (const nom of ["Verso", "Dos de la carte", "Face arrière"]) {
    const c: Carte = { ...base, calques: [...base.calques, { id: "v", nom, type: "texte" }] };
    assert.equal(uneSeuleFace(c).ok, false, nom);
  }
});

test("un code QR sur la carte est refusé", () => {
  const base = carteValide();
  const c: Carte = {
    ...base,
    calques: [...base.calques, { id: "q", nom: "QR code", type: "image" }],
  };
  const v = aucunQrCode(c);
  assert.equal(v.ok, false);
  assert.match(v.motif, /QR/);
});

test("une photo fournie doit apparaître sur la carte", () => {
  const sansPhoto = carteValide();
  assert.equal(photoIntegree(sansPhoto, true).ok, false);
  assert.equal(photoIntegree(sansPhoto, false).ok, true);

  const avecPhoto = construireCarte(
    creerEtat({
      secteur: "Fast-food",
      nomCommerce: "Le Comptoir",
      systemeFidelite: "stamps",
      objectif: 10,
      recompense: { texte: "Un menu offert", libelleCourt: "Offert" },
      photo: "devanture.jpg",
    }),
  );
  assert.equal(photoIntegree(avecPhoto, true).ok, true);
});

test("une carte fast-food à tampons ne porte aucun élément de points", () => {
  // Cas signalé : la démo fast-food affichait « Points : 0 » au-dessus d'une
  // grille de dix cases. Les deux systèmes ne cohabitent jamais.
  const c = construireCarte(
    creerEtat({
      secteur: "Fast-food",
      nomCommerce: "Burger Nord",
      systemeFidelite: "stamps",
      objectif: 10,
      recompense: { texte: "Un menu offert", libelleCourt: "Offert" },
      photo: "interieur.jpg",
    }),
  );
  assert.equal(c.programme.mode, "stamps");
  assert.equal(c.zonesFidelite.length, 1);
  assert.ok(!c.calques.some((l) => /point/i.test(l.nom)));
  const verdicts = controlerCarte(c, creerMemoire(), { photoFournie: true });
  assert.equal(toutValide(verdicts), true, motifsEchec(verdicts).join(" | "));
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

/* -------------------------------------------------------- composition */

test("un rectangle hors cadre est ramené dedans", () => {
  const r = recadrerRect({ x: 90, y: -5, largeur: 30, hauteur: 200 });
  assert.equal(r.corrige, true);
  assert.equal(r.hauteur, 100, "une hauteur au-delà de 100 est plafonnée");
  assert.ok(r.x + r.largeur <= 100, "le calque ne déborde plus à droite");
  assert.ok(r.y >= 0, "le calque ne déborde plus en haut");
});

test("un rectangle déjà dans le cadre n'est pas signalé comme corrigé", () => {
  const r = recadrerRect({ x: 10, y: 10, largeur: 50, hauteur: 20 });
  assert.equal(r.corrige, false);
});

test("chevauchementRatio mesure la part du plus petit rectangle recouverte", () => {
  const a = { x: 0, y: 0, largeur: 20, hauteur: 10 };
  const b = { x: 10, y: 0, largeur: 20, hauteur: 10 }; // moitié de a recouverte par b
  assert.equal(chevauchementRatio(a, b), 0.5);
  const c = { x: 100, y: 100, largeur: 5, hauteur: 5 };
  assert.equal(chevauchementRatio(a, c), 0, "aucun recouvrement");
});

test("deux calques de texte qui se recouvrent trop font échouer la composition", () => {
  const comp = compositionValide();
  comp.calques.push({
    role: "slogan",
    texte: "Juste à côté",
    x: comp.calques[0].x,
    y: comp.calques[0].y,
    largeur: comp.calques[0].largeur,
    hauteur: comp.calques[0].hauteur,
    police: "geist",
    graisse: "normal",
    taille: 4,
    couleur: "#ffffff",
    alignement: "gauche",
  });
  const motif = chevauchementExcessif(comp);
  assert.ok(motif, "un recouvrement total doit être détecté");
  assert.match(motif ?? "", /nom/);
  assert.match(motif ?? "", /slogan/);
});

test("corrigerComposition répare le contraste sans jamais rejeter", () => {
  const comp = compositionValide();
  comp.fond = { type: "uni", couleur: "#F0D060" }; // or/jaune clair
  comp.calques[0].couleur = "#FFFFFF"; // blanc sur or : interdit
  const { composition, corrections } = corrigerComposition(comp);
  assert.equal(composition.calques[0].couleur, "#241812", "le texte devient anthracite");
  assert.ok(corrections.length > 0);
});

test("appliquerAction(composer) commet la composition validée dans l'état", () => {
  const e = creerEtat({});
  const r = appliquerAction({ type: "composer", ...compositionValide() }, e, creerMemoire());
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.etat.composition?.calques.length, 1);
});

test("appliquerAction(composer) refuse un chevauchement de texte excessif", () => {
  const comp = compositionValide();
  comp.calques.push({ ...comp.calques[0], role: "slogan" }); // exactement au même endroit
  const r = appliquerAction({ type: "composer", ...comp }, creerEtat({}), creerMemoire());
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, "INVALIDE");
    assert.match(r.motif, /recouvr/);
  }
});

/* ------------------------------------- retoucher une composition existante */
//
// Le bug trouvé en réel : « modifier » était accepté (ok:true) sur une carte
// composée sans jamais toucher un seul champ — une fausse confirmation. Ces
// tests comparent l'état AVANT/APRÈS, pas seulement le code de retour : un
// test qui ne vérifierait que `ok === true` aurait laissé passer ce bug.

test("composer envoyé une seconde fois change réellement la composition (avant ≠ après)", () => {
  const r1 = appliquerAction({ type: "composer", ...compositionValide() }, creerEtat({}), creerMemoire());
  assert.equal(r1.ok, true);
  if (!r1.ok) return;
  const largeurAvant = r1.etat.composition?.calques[0].largeur;

  const compo2 = compositionValide();
  compo2.calques[0].largeur = (largeurAvant ?? 60) - 20;
  const r2 = appliquerAction({ type: "composer", ...compo2 }, r1.etat, creerMemoire());
  assert.equal(r2.ok, true);
  if (!r2.ok) return;

  const largeurApres = r2.etat.composition?.calques[0].largeur;
  assert.notEqual(largeurApres, largeurAvant, "avant === après : la retouche n'a rien changé");
  assert.equal(largeurApres, (largeurAvant ?? 60) - 20);
});

test("modifier est REFUSÉ sur une carte composée — pas de fausse confirmation", () => {
  const r1 = appliquerAction({ type: "composer", ...compositionValide() }, creerEtat({}), creerMemoire());
  assert.equal(r1.ok, true);
  if (!r1.ok) return;
  const avant = JSON.stringify(r1.etat.composition);

  const r2 = appliquerAction({ type: "modifier", cible: "logo" }, r1.etat, creerMemoire());
  assert.equal(r2.ok, false, "modifier ne doit jamais renvoyer ok:true sur une composition");
  if (!r2.ok) {
    assert.equal(r2.code, "INVALIDE");
    assert.match(r2.motif, /composer/);
  }
  // et la composition elle-même n'a évidemment pas bougé
  assert.equal(JSON.stringify(r1.etat.composition), avant);
});

test("modifier « photo » reste accepté sur une carte composée (hors composition)", () => {
  const r1 = appliquerAction({ type: "composer", ...compositionValide() }, creerEtat({}), creerMemoire());
  assert.equal(r1.ok, true);
  if (!r1.ok) return;
  const r2 = appliquerAction({ type: "modifier", cible: "photo" }, r1.etat, creerMemoire());
  assert.equal(r2.ok, true);
});
