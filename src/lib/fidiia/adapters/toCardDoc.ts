// Adaptateur : la carte décrite par FidiIA → le document de carte de
// l'application.
//
// C'est le seul point de contact entre le moteur et le reste du produit.
// FidiIA décrit ; cet adaptateur convertit. La séparation garde `lib/fidiia`
// testable sans rien charger de l'interface.
//
// Il s'appuie sur le chantier 2 : la grille de fidélité sort en ZONE
// déclarative (`zones`), jamais en calques « Tampon 1 », « Tampon 2 »…
//
// Chantier composition : cet adaptateur ne DÉCIDE plus de la disposition —
// calques, positions, polices, traitement du fond. Il TRADUIT la composition
// transmise par le modèle (action `composer`, validation/schemas.ts). Les
// valeurs codées en dur ci-dessous (`depuisGabarit`) ne servent plus que de
// repli, quand `carte.composition` est absente — modèle en échec après deux
// essais, ou tour n'ayant jamais transmis de composition.

// Note d'exécution : ce fichier est le SEUL de `lib/fidiia` à importer le
// reste de l'application. Il utilise donc l'alias `@/`, comme tout le code de
// l'app — ce qui le rend non exécutable par `node --test`. C'est voulu : les
// tests de FidiIA ne doivent charger ni l'éditeur ni le moteur de rendu.

import type {
  BarcodeLayer,
  CardBackground,
  IconLayer,
  ImageLayer,
  CardDoc,
  Layer,
  ProgressBarZone,
  ShapeKind,
  ShapeLayer,
  StampGridZone,
  TextLayer,
  Zone,
} from "@/types/layer";
import { createDefaultStampGridZone } from "@/lib/loyalty/renderLayer";
import type { LoyaltyConfig } from "@/lib/loyalty";
import type { CalqueCompose, Carte, Composition, ZoneReservee } from "../validation/schemas.ts";

let compteur = 0;
function id(prefixe: string): string {
  compteur += 1;
  return `${prefixe}-${compteur}`;
}

const socle = (nom: string, z: number) => ({
  id: id("layer"),
  name: nom,
  rotation: 0,
  opacity: 100,
  zIndex: z,
  locked: false,
  hidden: false,
  groupId: null,
});

/**
 * Convertit une carte FidiIA en CardDoc.
 *
 * Invariant : exactement une zone de fidélité, aucun calque nommé comme un
 * tampon. Les contrôles de validation/quality.ts vérifient déjà ces deux
 * points en amont ; l'adaptateur ne peut donc pas les casser sans qu'un test
 * le voie.
 */
export function versCardDoc(carte: Carte): { doc: CardDoc; config: Partial<LoyaltyConfig> } {
  // Trois régimes, du plus beau au plus sûr :
  //   habillage    une image peinte par le modèle d'image porte tout le
  //                décor ; seuls tampons et code-barres se superposent.
  //   composition  le modèle a composé des calques (pas de photo fondue, pas
  //                de typographie display, mais une vraie mise en page).
  //   gabarit      ni l'un ni l'autre : le filet de sécurité codé en dur.
  if (carte.habillage) return depuisHabillage(carte, carte.habillage);
  return carte.composition ? depuisComposition(carte, carte.composition) : depuisGabarit(carte);
}

/* ------------------------------------------------- traduction : habillage */
//
// Le rendu HTML ne sait pas peindre une photo fondue dans un fond noir, une
// typographie patinée ou un coup de pinceau. Un modèle d'image, si. Cette
// fonction ne fait donc presque rien : elle pose l'image en fond et replace
// par-dessus les deux seuls éléments qui ne peuvent PAS être peints —
//   la grille de tampons, qui doit refléter les passages réels du client ;
//   le code-barres, qui doit se scanner.
// Tout le reste (nom, slogan, récompense, pictogrammes, coordonnées) est déjà
// DANS l'image : le redessiner en calques le ferait apparaître en double.

/**
 * L'image d'habillage sort en 1536×1024 (ratio 1.5) ; une carte a le ratio
 * d'une carte bancaire (85.6/53.98 ≈ 1.586). Le fond est affiché en
 * `cover` (lib/backgroundStyle.ts) : l'image est donc mise à la largeur, puis
 * ROGNÉE de 2,7 % en haut et 2,7 % en bas.
 *
 * Les zones réservées sont exprimées par le modèle dans le repère de
 * l'IMAGE. Sans cette conversion, la grille de tampons et le code-barres
 * tomberaient 2,7 % trop haut et seraient 5,4 % trop grands — assez pour
 * déborder des cadres visibles peints dans l'habillage.
 */
const RATIO_IMAGE = 1536 / 1024;
const RATIO_CARTE = 85.6 / 53.98;
/** Part de la hauteur d'image réellement visible une fois le `cover` appliqué. */
const VISIBLE = RATIO_IMAGE / RATIO_CARTE;
const ROGNE_HAUT = (1 - VISIBLE) / 2;

function versRepereCarte(z: ZoneReservee): ZoneReservee {
  // `x` et `largeur` sont inchangés : le `cover` conserve toute la largeur.
  const y = (z.y / 100 - ROGNE_HAUT) / VISIBLE;
  const hauteur = z.hauteur / 100 / VISIBLE;
  return {
    x: z.x,
    largeur: z.largeur,
    y: Math.max(0, Math.min(100, y * 100)),
    hauteur: Math.max(0, Math.min(100, hauteur * 100)),
  };
}

function depuisHabillage(
  carte: Carte,
  habillage: NonNullable<Carte["habillage"]>,
): { doc: CardDoc; config: Partial<LoyaltyConfig> } {
  const zc = versRepereCarte(habillage.zoneCode);
  const codeBarres: BarcodeLayer = {
    ...socle("Code-barres", 100),
    type: "barcode",
    x: zc.x,
    y: zc.y,
    width: zc.largeur,
    height: zc.hauteur,
    value: carte.nomCommerce.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) || "FIDICARD",
    lineColor: "#141414",
    background: "#ffffff",
  };

  const zt = versRepereCarte(habillage.zoneTampons);
  const zones: Zone[] =
    carte.programme.mode === "stamps"
      ? [
          zoneDepuisComposition({
            x: zt.x,
            y: zt.y,
            largeur: zt.largeur,
            hauteur: zt.hauteur,
            // La grille reprend la forme et les couleurs du design quand il
            // existe : l'habillage ne les transmet pas, et des tampons gris
            // sur une carte orange se verraient immédiatement.
            forme: "cercle",
            colonnes: Math.min(10, Math.max(1, Math.ceil(carte.programme.objectif / 2))),
            icone: carte.design?.icone ?? "Gift",
            couleurRempli: carte.design?.accent ?? "#ffffff",
            couleurVide: "#00000055",
          },
          // Le libellé du dernier palier (« OFFERT ») est écrit DANS le
          // tampon, en couleur d'accent sur un tampon vide donc sombre :
          // illisible, et surtout redondant — l'habillage annonce déjà la
          // récompense en toutes lettres, bien plus lisiblement.
          { libellesPaliers: false }),
        ]
      : [zoneProgressionDepuisRect(zt, carte.design?.accent)];

  const doc: CardDoc = {
    id: id("carte"),
    name: carte.nomCommerce,
    category: "fidiia",
    background: {
      kind: "image",
      color: "#0d0d0d",
      gradientFrom: "#0d0d0d",
      gradientTo: "#0d0d0d",
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#0d0d0d",
      image: habillage.image,
      // Aucun assombrissement : l'image EST le design fini, le voiler
      // reviendrait à abîmer ce qu'on vient de payer pour produire.
      imageDim: 0,
    },
    layers: [codeBarres],
    published: false,
    updatedAt: Date.now(),
    version: 2,
    zones,
  };

  return { doc, config: configDepuisCarte(carte) };
}

function configDepuisCarte(carte: Carte): Partial<LoyaltyConfig> {
  return {
    mode: carte.programme.mode,
    totalStamps: carte.programme.objectif,
    paliers: carte.programme.paliers.map((p) => ({
      position: p.position,
      label: p.label,
      description: p.description,
      type: "autre" as const,
    })),
  };
}

function codeBarresDepuisCarte(carte: Carte, z: number): BarcodeLayer {
  return {
    ...socle("Code-barres", z),
    type: "barcode",
    x: 14,
    y: 80,
    width: 72,
    height: 14,
    value: carte.nomCommerce.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) || "FIDICARD",
    lineColor: "#141414",
    background: "#ffffff",
  };
}

function regleLisible(carte: Carte): string {
  const { mode, objectif, recompense } = carte.programme;
  return mode === "points"
    ? `${objectif} points = ${recompense.texte}`
    : `${objectif} passages = ${recompense.texte}`;
}

/* --------------------------------------------------- traduction : composé */
//
// Deux commerces différents composés par le modèle ne doivent jamais donner
// le même CardDoc — c'est tout le sens du chantier. Cette fonction ne fait
// aucun choix esthétique : elle place ce que le modèle a décidé.

const GRAISSE_VERS_POIDS: Record<string, number> = {
  normal: 400,
  medium: 500,
  bold: 700,
  extrabold: 800,
};

const ALIGNEMENT_VERS_ALIGN: Record<string, TextLayer["align"]> = {
  gauche: "left",
  centre: "center",
  droite: "right",
};

const LIBELLE_ROLE: Record<CalqueCompose["role"], string> = {
  nom: "Nom du commerce",
  logo: "Logo",
  photo: "Photo de l'établissement",
  slogan: "Slogan",
  titre: "Titre de section",
  recompense: "Règle du programme",
  mention: "Mention légale",
  info: "Informations",
  explication: "Comment ça marche",
  code: "Instruction de scan",
  decoration: "Décoration",
  pictogramme: "Pictogramme",
};

const FORME_VERS_SHAPE: Record<string, ShapeKind> = {
  rect: "rect",
  cercle: "circle",
  ligne: "line",
  triangle: "triangle",
};

// Appelée uniquement pour les rôles textuels (voir depuisComposition) : le
// schéma garantit alors police/graisse/taille/couleur/alignement (superRefine,
// schemas.ts:CalqueComposeSchema). Les replis ci-dessous ne servent qu'à
// satisfaire le type — ils ne devraient jamais s'activer en pratique.
function calqueTexteDepuisComposition(c: CalqueCompose, z: number, contenu: string): TextLayer {
  return {
    ...socle(LIBELLE_ROLE[c.role], z),
    type: "text",
    x: c.x,
    y: c.y,
    width: c.largeur,
    height: c.hauteur,
    content: contenu,
    font: c.police ?? "geist",
    fontSize: c.taille ?? 6,
    fontWeight: GRAISSE_VERS_POIDS[c.graisse ?? "normal"] ?? 400,
    italic: false,
    underline: false,
    color: c.couleur ?? "#ffffff",
    align: ALIGNEMENT_VERS_ALIGN[c.alignement ?? "gauche"] ?? "left",
    letterSpacing: 0,
    lineHeight: 1.2,
  };
}

const MOTIF_VERS_PATTERN: Record<string, CardBackground["pattern"]> = {
  points: "dots",
  lignes: "diagonal",
  grille: "grid",
  vagues: "waves",
};

function fondDepuisComposition(fond: Composition["fond"]): CardBackground {
  if (fond.type === "uni") {
    return {
      kind: "color",
      color: fond.couleur,
      gradientFrom: fond.couleur,
      gradientTo: fond.couleur,
      gradientAngle: 135,
      pattern: "dots",
      patternColor: fond.couleur,
      image: null,
      imageDim: 0,
    };
  }
  if (fond.type === "degrade") {
    return {
      kind: "gradient",
      color: fond.de,
      gradientFrom: fond.de,
      gradientTo: fond.vers,
      gradientAngle: fond.angle,
      pattern: "dots",
      patternColor: fond.vers,
      image: null,
      imageDim: 0,
    };
  }
  if (fond.type === "motif") {
    // `intensite` n'a pas d'équivalent dans CardBackground (l'opacité du
    // motif y est fixe, voir lib/backgroundStyle.ts) : traduite au mieux,
    // pas perdue silencieusement, mais pas paramétrable finement ici.
    return {
      kind: "pattern",
      color: fond.base,
      gradientFrom: fond.base,
      gradientTo: fond.base,
      gradientAngle: 135,
      pattern: MOTIF_VERS_PATTERN[fond.motif] ?? "dots",
      patternColor: fond.accent,
      image: null,
      imageDim: 0,
    };
  }
  // fond.type === "image" : la vraie photo, en plein fond. `image` reste
  // vide ici — comme pour le logo, seul le client a le fichier réel (voir
  // AssistantChat.tsx:integrerImagesReelles). Sans photo reçue, ce fond se
  // rabat sur un noir uni plutôt que de rester cassé (image: null).
  return {
    kind: "image",
    color: "#0d0d0d",
    gradientFrom: "#0d0d0d",
    gradientTo: "#0d0d0d",
    gradientAngle: 135,
    pattern: "dots",
    patternColor: "#0d0d0d",
    image: null,
    imageDim: Math.round(fond.assombrissement * 100),
  };
}

/**
 * La grille de tampons épouse exactement son cadre (voir
 * lib/loyalty/renderLayer.ts:stampPosition) : donner `frame` et `perRow`
 * suffit, la taille d'un tampon n'a besoin d'être qu'une fraction cohérente
 * de la largeur disponible, jamais une valeur qui déborderait.
 */
function zoneDepuisComposition(
  zc: Composition["zoneFidelite"],
  opts: { libellesPaliers?: boolean } = {},
): StampGridZone {
  const size = Math.max(2, Math.min(30, (zc.largeur / zc.colonnes) * 0.7));
  return {
    id: id("zone"),
    kind: "stampGrid",
    frame: { x: zc.x, y: zc.y, w: zc.largeur, h: zc.hauteur },
    size,
    shape: zc.forme,
    perRow: zc.colonnes,
    showTierLabels: opts.libellesPaliers ?? true,
    icon: zc.icone,
    styleOverride: { filled: zc.couleurRempli, empty: zc.couleurVide },
  };
}

/** Barre de progression (mode points) à partir d'un rectangle x/y/largeur/hauteur (%). */
function zoneProgressionDepuisRect(
  r: { x: number; y: number; largeur: number; hauteur: number },
  accent?: string,
): ProgressBarZone {
  return {
    id: id("zone"),
    kind: "progressBar",
    frame: { x: r.x, y: r.y, w: r.largeur, h: r.hauteur },
    styleOverride: accent ? { fill: accent } : undefined,
  };
}

function depuisComposition(carte: Carte, composition: Composition): { doc: CardDoc; config: Partial<LoyaltyConfig> } {
  const aLogo = carte.calques.some((c) => c.type === "image" && /logo/i.test(c.nom));
  const aPhoto = carte.calques.some((c) => c.type === "image" && /photo/i.test(c.nom));

  const layers: Layer[] = [];
  let z = 0;
  let logoPlace = false;
  let photoPlacee = false;

  for (const calque of composition.calques) {
    z += 1;
    if (calque.role === "logo" || calque.role === "photo") {
      // Composé même sans fichier réel (le modèle ne sait pas toujours qu'il
      // n'a rien reçu) : sans image à placer, le calque est ignoré plutôt que
      // de laisser un cadre vide sur la carte.
      const disponible = calque.role === "logo" ? aLogo : aPhoto;
      if (!disponible) continue;
      const img: ImageLayer = {
        ...socle(LIBELLE_ROLE[calque.role], z),
        type: "image",
        x: calque.x,
        y: calque.y,
        width: calque.largeur,
        height: calque.hauteur,
        src: "",
        brightness: 100,
        contrast: 100,
        saturate: 100,
        radius: calque.arrondi ?? 0,
      };
      layers.push(img);
      if (calque.role === "logo") logoPlace = true;
      else photoPlacee = true;
      continue;
    }
    if (calque.role === "decoration") {
      const forme: ShapeLayer = {
        ...socle(LIBELLE_ROLE.decoration, z),
        type: "shape",
        x: calque.x,
        y: calque.y,
        width: calque.largeur,
        height: calque.hauteur,
        shape: FORME_VERS_SHAPE[calque.forme ?? "rect"] ?? "rect",
        fill: calque.couleur ?? "#000000",
        stroke: calque.couleurBordure ?? "transparent",
        strokeWidth: calque.epaisseurBordure ?? 0,
        radius: calque.forme === "rect" || !calque.forme ? 8 : 0,
      };
      layers.push(forme);
      continue;
    }
    if (calque.role === "pictogramme") {
      const icone: IconLayer = {
        ...socle(LIBELLE_ROLE.pictogramme, z),
        type: "icon",
        x: calque.x,
        y: calque.y,
        width: calque.largeur,
        height: calque.hauteur,
        icon: calque.icone ?? "Sparkles",
        color: calque.couleur ?? "#ffffff",
      };
      layers.push(icone);
      continue;
    }
    // Rôles textuels. Nom et récompense ont un repli déterministe (les
    // données existent déjà ailleurs sur la carte) ; les autres sont de
    // pures additions du modèle — vides, ils n'ont rien à afficher.
    const repli =
      calque.role === "nom" ? carte.nomCommerce : calque.role === "recompense" ? regleLisible(carte) : "";
    const contenu = calque.texte || repli;
    if (!contenu) continue;
    layers.push(calqueTexteDepuisComposition(calque, z, contenu));
  }

  // Filet de sécurité : un commerçant qui a fourni un logo ou une photo ne
  // doit jamais les voir disparaître simplement parce que le modèle a oublié
  // de leur donner un calque — même position fixe qu'avant ce chantier.
  if (aPhoto && !photoPlacee) {
    layers.unshift({
      ...socle(LIBELLE_ROLE.photo, 0),
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 42,
      src: "",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      radius: 0,
    });
  }
  if (aLogo && !logoPlace) {
    layers.push({
      ...socle(LIBELLE_ROLE.logo, ++z),
      type: "image",
      x: 72,
      y: 8,
      width: 18,
      height: 18,
      src: "",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      radius: 0,
    });
  }

  layers.push(codeBarresDepuisCarte(carte, ++z));

  const zones: Zone[] =
    carte.programme.mode === "stamps"
      ? [zoneDepuisComposition(composition.zoneFidelite)]
      : [zoneProgressionDepuisRect(composition.zoneFidelite, carte.design?.accent)];

  const doc: CardDoc = {
    id: id("carte"),
    name: carte.nomCommerce,
    category: "fidiia",
    background: fondDepuisComposition(composition.fond),
    layers,
    published: false,
    updatedAt: Date.now(),
    version: 2,
    zones,
  };

  return { doc, config: configDepuisCarte(carte) };
}

/* ---------------------------------------------------- repli : le gabarit */
//
// Utilisé uniquement quand `carte.composition` est absente (le modèle n'a
// transmis aucune composition valide ce tour, ou aucun tour). Comportement
// inchangé par rapport à avant ce chantier — c'est le filet de sécurité, pas
// le chemin normal.

function texte(nom: string, contenu: string, z: number, o: Partial<TextLayer> = {}): TextLayer {
  return {
    ...socle(nom, z),
    type: "text",
    x: 8,
    y: 12,
    width: 60,
    height: 8,
    content: contenu,
    font: "geist",
    fontSize: 16,
    fontWeight: 700,
    italic: false,
    underline: false,
    color: "#ffffff",
    align: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
    ...o,
  };
}

function depuisGabarit(carte: Carte): { doc: CardDoc; config: Partial<LoyaltyConfig> } {
  // Le design vient du modèle (action `design`) quand il l'a transmis, sinon
  // du corpus, sinon des valeurs par défaut — `construireCarte` (fidiia/index.ts)
  // a déjà tranché : à ce stade, `carte.design` porte toujours une palette
  // complète et un couple fond/texte déjà vérifié pour le contraste.
  const design = carte.design;
  const accent = design?.accent;
  const fond = design?.fond ?? "#2a1a12";
  const texteCouleur = design?.texte ?? "#ffffff";
  // Textes secondaires : la même couleur que le titre, légèrement rapprochée
  // du fond — jamais une teinte inventée, un mélange entre deux couleurs déjà
  // vérifiées lisibles ensemble reste lisible.
  const texteAttenue = melanger(texteCouleur, fond, 0.15);
  const texteDiscret = melanger(texteCouleur, fond, 0.25);

  const layers: Layer[] = [
    texte("Nom du commerce", carte.nomCommerce, 1, { y: 10, fontSize: 18, color: texteCouleur }),
    texte("Règle du programme", regleLisible(carte), 2, {
      y: 24,
      fontSize: 9,
      fontWeight: 400,
      color: texteAttenue,
    }),
    texte("Instruction de scan", "PRÉSENTEZ CE CODE EN CAISSE POUR SCANNER VOTRE CARTE", 3, {
      y: 74,
      width: 84,
      height: 5,
      fontSize: 6,
      fontWeight: 600,
      align: "center",
      letterSpacing: 0.4,
      color: texteDiscret,
    }),
  ];

  // Photo de l'établissement : elle occupe le haut de la carte, sous les
  // textes, jamais posée par-dessus une information.
  if (carte.calques.some((c) => c.type === "image" && /photo/i.test(c.nom))) {
    const photo: ImageLayer = {
      ...socle("Photo de l'établissement", 0),
      type: "image",
      x: 0,
      y: 0,
      width: 100,
      height: 42,
      src: "",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      radius: 0,
    };
    layers.unshift(photo);
  }

  if (carte.calques.some((c) => c.type === "image" && /logo/i.test(c.nom))) {
    const logo: ImageLayer = {
      ...socle("Logo", 4),
      type: "image",
      x: 72,
      y: 8,
      width: 18,
      height: 18,
      src: "",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      radius: 0,
    };
    layers.push(logo);
  }

  layers.push(codeBarresDepuisCarte(carte, 5));

  // Une zone de tampons en mode tampons, une barre de progression en mode
  // points : deux systèmes différents, jamais mélangés sur la même carte.
  const zones: Zone[] =
    carte.programme.mode === "stamps"
      ? [createDefaultStampGridZone(id("zone"), carte.programme.objectif)]
      : [zoneProgressionDepuisRect({ x: 8, y: 46, largeur: 84, hauteur: 18 }, accent)];

  // Accent (du modèle ou du corpus) : porté par les tampons et le liseré du
  // dégradé, jamais par le fond lui-même — le fond, c'est `design.fond`.
  const grille = zones[0];
  if (accent && grille?.kind === "stampGrid") {
    grille.icon = design?.icone;
    grille.iconColor = accent;
    grille.styleOverride = { filled: accent, border: accent };
  }

  const doc: CardDoc = {
    id: id("carte"),
    name: carte.nomCommerce,
    category: "fidiia",
    background: {
      kind: "gradient",
      color: "#1a1a1a",
      gradientFrom: fond,
      gradientTo: assombrir(fond, 0.55),
      gradientAngle: 135,
      pattern: "dots",
      patternColor: texteCouleur,
      image: null,
      imageDim: 0,
    },
    layers,
    published: false,
    updatedAt: Date.now(),
    version: 2,
    zones,
  };

  return { doc, config: configDepuisCarte(carte) };
}

/** Ramène une couleur vive à une teinte plus sombre — sert à creuser le
 *  dégradé de fond à partir de sa propre couleur, sans en inventer une autre. */
function assombrir(hex: string, facteur: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "#2a1a12";
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => Math.round(parseInt(c, 16) * facteur));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Mélange deux couleurs déjà vérifiées lisibles ensemble (texte/fond) : le
 * résultat reste dans l'intervalle de contraste validé par `nettoyerContraste`,
 * ce n'est jamais une teinte inventée pour l'occasion.
 */
function melanger(hexA: string, hexB: string, versB: number): string {
  const a = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexA);
  const b = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexB);
  if (!a || !b) return hexA;
  const canaux = [0, 1, 2].map((i) => {
    const ca = parseInt(a[i + 1], 16);
    const cb = parseInt(b[i + 1], 16);
    return Math.round(ca + (cb - ca) * versB);
  });
  return `#${canaux.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
