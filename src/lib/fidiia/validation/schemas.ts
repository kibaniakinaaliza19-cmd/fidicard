// Le contrat de sortie, traduit en schémas Zod.
//
// Règle absolue : aucune sortie de fournisseur n'est appliquée sans être
// passée par ces schémas. Une sortie invalide n'est jamais « rattrapée » en
// devinant l'intention — elle est rejetée avec un motif.

import { z } from "zod";
import { STAMP_CATALOG_DATA } from "../../../data/stampCatalog.generated.ts";
import { fontOptions } from "../../fonts.ts";
import { ICONES_DECORATIVES } from "../../icons.ts";

/* ------------------------------------------------------------- primitives */

export const AmbianceSchema = z.enum(["chaud", "neutre", "froid"]);
export type Ambiance = z.infer<typeof AmbianceSchema>;

/** Couleur hexadécimale à 6 chiffres. Rien d'autre n'est une couleur valide ici. */
export const CouleurHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "couleur hexadécimale attendue (#rrggbb)");

/**
 * Le vrai catalogue de tampons (777 icônes lucide, voir
 * src/data/stampCatalog.generated.ts), pas une liste inventée pour
 * l'occasion. Une icône hors de cet ensemble n'existe pas dans l'éditeur :
 * elle ne s'afficherait pas.
 */
const ICONES_CATALOGUE = new Set(STAMP_CATALOG_DATA.map((i) => i.lucide));
export function iconeConnue(valeur: string): boolean {
  return ICONES_CATALOGUE.has(valeur);
}

/** Catalogue distinct des tampons (lib/icons.ts, ~60 icônes) : c'est lui, pas
 *  le catalogue des 777 icônes de tampon, que `getIcon()` sait réellement
 *  rendre pour un calque décoratif. Un pictogramme validé contre le mauvais
 *  catalogue s'afficherait comme un cadeau générique sans avertissement. */
const ICONES_DECOR_CATALOGUE = new Set(ICONES_DECORATIVES);
export function iconeDecorConnue(valeur: string): boolean {
  return ICONES_DECOR_CATALOGUE.has(valeur);
}

/**
 * Les polices que l'app charge RÉELLEMENT (voir src/lib/fonts.ts, chargées
 * dans app/layout.tsx via next/font). Le modèle ne doit jamais pouvoir en
 * nommer une absente : elle ne s'afficherait pas, silencieusement remplacée
 * par la police système du navigateur.
 */
export const POLICES_DISPONIBLES = fontOptions.map((f) => f.value) as [string, ...string[]];
export const PoliceSchema = z.enum(POLICES_DISPONIBLES);

export const ModeFideliteSchema = z.enum(["stamps", "points"]);
export type ModeFidelite = z.infer<typeof ModeFideliteSchema>;

/** Cibles qu'une action `modifier` peut toucher. Liste fermée. */
export const CibleSchema = z.enum([
  "logo",
  "couleurs",
  "texte",
  "icone",
  "disposition",
  "photo",
]);
export type Cible = z.infer<typeof CibleSchema>;

/* --------------------------------------------------------------- bornes */
//
// Toute valeur chiffrée que FidiIA peut produire est déclarée ici, et nulle
// part ailleurs. Le texte des prompts a le droit d'écrire ces nombres en
// clair — un test vérifie qu'aucun chiffre du contrat ne diverge de cette
// liste. Voir __tests__/prompts.test.ts.

/**
 * Bornes de l'objectif, par mode — pas une seule borne pour les deux : un
 * programme à tampons compte des passages, peu nombreux, lisibles sur une
 * grille (1 à 30) ; un programme à points cumule un montant, nécessairement
 * plus grand (50 à 1000). Un programme de points à 30 points n'existe pas
 * dans la réalité du corpus. Une borne unique a longtemps fait rejeter en
 * silence toute carte à points construite depuis une suggestion du corpus
 * (272 des 864 modèles annoncent plusieurs centaines de points).
 */
export const OBJECTIF_MIN_TAMPONS = 1;
export const OBJECTIF_MAX_TAMPONS = 30;
export const OBJECTIF_MIN_POINTS = 50;
export const OBJECTIF_MAX_POINTS = 1000;

export function bornesObjectif(mode: ModeFidelite): { min: number; max: number } {
  return mode === "points"
    ? { min: OBJECTIF_MIN_POINTS, max: OBJECTIF_MAX_POINTS }
    : { min: OBJECTIF_MIN_TAMPONS, max: OBJECTIF_MAX_TAMPONS };
}
/** Le libellé court s'écrit DANS le tampon : 8 caractères au maximum. */
export const LIBELLE_COURT_MAX = 8;
/** Nombre de paliers acceptés dans une action `paliers`. */
export const PALIERS_MIN = 1;
export const PALIERS_MAX = 5;
/** Nombre de propositions montrées au commerçant. Règle produit. */
export const NB_PROPOSITIONS = 3;
/** Longueur maximale d'une description de palier ou d'une récompense. */
export const TEXTE_MAX = 120;
/** Longueur maximale du texte affiché au commerçant. */
export const REPLY_MAX = 2000;
/** Longueur maximale d'un nom de secteur ou de calque. */
export const NOM_MAX = 60;
/** Position ou dimension d'un calque composé, en % du canvas de la carte. */
export const PCT_MIN = 0;
export const PCT_MAX = 100;
export const PctSchema = z.number().min(PCT_MIN).max(PCT_MAX);
/** Bornes du chantier composition — voir CompositionSchema plus bas. Toute
 *  valeur chiffrée que le contrat annonce sur `composer` vient d'ici, comme
 *  pour les autres actions (voir __tests__/prompts.test.ts). */
export const CALQUES_COMPOSES_MIN = 1;
export const CALQUES_COMPOSES_MAX = 12;
export const ANGLE_DEGRE_MAX = 360;
export const TAILLE_CALQUE_MIN = 1;
export const TAILLE_CALQUE_MAX = 20;
export const ZONE_COLONNES_MIN = 1;
export const ZONE_COLONNES_MAX = 10;
/** Au-delà, deux calques de texte se recouvrent trop pour rester lisibles
 *  l'un et l'autre — voir validation/quality.ts:chevauchementExcessif. */
export const CHEVAUCHEMENT_MAX_PCT = 30;
/**
 * Qualification commerciale — pas de contenu de carte. Des plages larges :
 * ce ne sont pas des tampons ni des points, ce sont les chiffres réels du
 * commerce (nombre de vitrines, clients hebdomadaires), qui peuvent
 * légitimement dépasser les bornes du programme de fidélité.
 */
export const CLIENTS_SEMAINE_MAX = 100000;
export const POINTS_VENTE_MAX = 500;
/** Panier moyen en euros — sert à chiffrer le gain estimé en euros, pas
 *  seulement en visites (commercial/estimation.ts). */
export const PANIER_MOYEN_MAX = 10000;
/** Durée de l'essai proposé au closing (§ prompts/commercial.ts). */
export const ESSAI_JOURS_GRATUITS = 14;

/** Une seule action par tour a longtemps bloqué la composition : elle arrive
 *  toujours après le dernier champ requis (contrat une-action-par-tour), donc
 *  jamais à temps pour la première construction de la carte. `action` accepte
 *  maintenant aussi un tableau — borné, pour ne pas transformer un tour de
 *  conversation en salve d'actions incontrôlée. */
export const MAX_ACTIONS_PAR_TOUR = 4;

export const PalierSchema = z.object({
  // Plafond large (le max des deux modes) : la borne précise selon le mode
  // se vérifie face à l'objectif réel, pas ici — voir paliersSousObjectif.
  position: z.number().int().min(1).max(OBJECTIF_MAX_POINTS),
  label: z.string().min(1).max(LIBELLE_COURT_MAX),
  description: z.string().min(1).max(TEXTE_MAX),
});
export type Palier = z.infer<typeof PalierSchema>;

export const RecompenseSchema = z.object({
  texte: z.string().min(1).max(TEXTE_MAX),
  libelleCourt: z.string().min(1).max(LIBELLE_COURT_MAX),
});
export type Recompense = z.infer<typeof RecompenseSchema>;

/**
 * Design d'une carte : palette, icône de tampon, ambiance. Rempli soit par
 * le modèle (action `design`), soit par le corpus quand le modèle ne
 * transmet rien — jamais les deux en même temps, voir fidiia/index.ts.
 *
 * Volontairement strict sur la forme (couleur hexadécimale, icône du vrai
 * catalogue) : une valeur malformée fait échouer TOUTE l'action `design`,
 * exactement comme les sept autres actions. Le modèle reçoit le motif
 * exact, se corrige à la relance, et si la relance échoue aussi,
 * `construireCarte` retombe sur le corpus — sans code de repli séparé à
 * écrire ni à tester en double : c'est le même chemin que toute sortie
 * invalide.
 */
export const DesignSchema = z.object({
  accent: CouleurHexSchema,
  fond: CouleurHexSchema,
  texte: CouleurHexSchema,
  icone: z.string().min(1).max(NOM_MAX).refine(iconeConnue, {
    message: "icône absente du catalogue (777 icônes disponibles, voir stampCatalog)",
  }),
  ambiance: AmbianceSchema,
});
export type Design = z.infer<typeof DesignSchema>;

/* ------------------------------------------------------------ composition */
//
// Avant ce schéma, le modèle ne transmettait que des couleurs et une icône :
// `toCardDoc.ts` décidait seul des calques, des positions, des polices et du
// traitement du fond, et produisait la même structure pour toutes les
// cartes. Ici, c'est le modèle qui compose ; le code ne fait plus que
// valider, corriger ce qui se corrige, et refuser ce qui ne se corrige pas.

/**
 * Rôles de calque fermés : un rôle hors de cette liste est une composition
 * refusée, pas une composition partiellement acceptée.
 *
 * Six rôles au départ (texte + logo) ne suffisaient qu'à des cartes pauvres :
 * un nom, une règle, une mention. `photo`, `decoration` et `pictogramme`
 * portent la vraie richesse graphique (photo intégrée, panneaux, badges,
 * séparateurs, pictogrammes de secteur) — pas une nouvelle disposition figée,
 * juste plus de matière pour composer. `titre`, `info` et `explication`
 * couvrent la hiérarchie de texte qui manquait (un grand titre de section,
 * une ligne d'adresse/téléphone, un bloc « comment ça marche »).
 */
export const RoleCalqueSchema = z.enum([
  "nom",
  "logo",
  "photo",
  "slogan",
  "titre",
  "recompense",
  "mention",
  "info",
  "explication",
  "code",
  "decoration",
  "pictogramme",
]);
export type RoleCalque = z.infer<typeof RoleCalqueSchema>;

/** Rôles qui portent du texte réel — police/graisse/taille/couleur/alignement
 *  et le champ `texte` lui-même y sont exigés. Les autres (logo, photo,
 *  decoration, pictogramme) ont chacun leurs propres champs, voir plus bas. */
export const ROLES_CALQUE_TEXTE = [
  "nom",
  "slogan",
  "titre",
  "recompense",
  "mention",
  "info",
  "explication",
  "code",
] as const;

export const GraisseSchema = z.enum(["normal", "medium", "bold", "extrabold"]);
export const AlignementSchema = z.enum(["gauche", "centre", "droite"]);
/** Mêmes valeurs que StampShape (types/layer.ts) — redéfinies ici plutôt
 *  qu'importées : lib/fidiia ne dépend jamais du reste de l'app. */
export const FormeZoneSchema = z.enum(["cercle", "arrondi", "carre"]);
/** Mêmes formes que ShapeKind (types/layer.ts), en français. */
export const FormeDecorSchema = z.enum(["rect", "cercle", "ligne", "triangle"]);

export const FondSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("uni"), couleur: CouleurHexSchema }),
  z.object({
    type: z.literal("degrade"),
    de: CouleurHexSchema,
    vers: CouleurHexSchema,
    angle: z.number().min(0).max(ANGLE_DEGRE_MAX),
  }),
  z.object({
    type: z.literal("motif"),
    base: CouleurHexSchema,
    accent: CouleurHexSchema,
    motif: z.enum(["points", "lignes", "grille", "vagues"]),
    intensite: z.number().min(0).max(1),
  }),
  // La vraie photo du commerçant en plein fond — assombrissement pour que le
  // texte posé par-dessus reste lisible, jamais une couleur inventée : la
  // photo elle-même porte déjà la couleur.
  z.object({ type: z.literal("image"), assombrissement: z.number().min(0).max(1) }),
]);
export type Fond = z.infer<typeof FondSchema>;

/**
 * Chaque champ au-delà de position/taille est optionnel dans le schéma de
 * base, mais exigé par le `superRefine` ci-dessous selon le RÔLE : un logo ou
 * une photo n'ont ni police ni couleur de texte (les rendre obligatoires pour
 * eux n'a fait que produire un rejet à chaque fois que le modèle omettait, à
 * raison, ces champs — observé en réel : `calques.N.police : expected ...
 * received undefined`) ; une décoration ou un pictogramme ont leurs propres
 * champs, pas ceux du texte.
 */
export const CalqueComposeSchema = z
  .object({
    role: RoleCalqueSchema,
    texte: z.string().max(TEXTE_MAX).optional(),
    x: PctSchema,
    y: PctSchema,
    largeur: PctSchema,
    hauteur: PctSchema,
    // rôles textuels
    police: PoliceSchema.optional(),
    graisse: GraisseSchema.optional(),
    taille: z.number().min(TAILLE_CALQUE_MIN).max(TAILLE_CALQUE_MAX).optional(),
    couleur: CouleurHexSchema.optional(),
    alignement: AlignementSchema.optional(),
    // logo / photo — coins arrondis, en % du plus petit côté (0 = carré net)
    arrondi: z.number().min(0).max(50).optional(),
    // decoration
    forme: FormeDecorSchema.optional(),
    couleurBordure: CouleurHexSchema.optional(),
    epaisseurBordure: z.number().min(0).max(10).optional(),
    // pictogramme — `couleur` (déjà déclaré ci-dessus) sert aussi ici
    icone: z.string().min(1).max(NOM_MAX).optional(),
  })
  .superRefine((val, ctx) => {
    if ((ROLES_CALQUE_TEXTE as readonly string[]).includes(val.role)) {
      if (!val.texte) {
        ctx.addIssue({ code: "custom", path: ["texte"], message: `texte requis pour un calque de rôle « ${val.role} »` });
      }
      for (const champ of ["police", "graisse", "taille", "couleur", "alignement"] as const) {
        if (val[champ] === undefined) {
          ctx.addIssue({ code: "custom", path: [champ], message: `requis pour un calque de rôle « ${val.role} »` });
        }
      }
    } else if (val.role === "decoration") {
      if (!val.forme) ctx.addIssue({ code: "custom", path: ["forme"], message: "« forme » requise pour une décoration" });
      if (!val.couleur) ctx.addIssue({ code: "custom", path: ["couleur"], message: "« couleur » requise pour une décoration" });
    } else if (val.role === "pictogramme") {
      if (!val.icone) {
        ctx.addIssue({ code: "custom", path: ["icone"], message: "« icone » requise pour un pictogramme" });
      } else if (!iconeDecorConnue(val.icone)) {
        ctx.addIssue({ code: "custom", path: ["icone"], message: "icône absente du catalogue décoratif" });
      }
      if (!val.couleur) ctx.addIssue({ code: "custom", path: ["couleur"], message: "« couleur » requise pour un pictogramme" });
    }
    // logo / photo : rien de plus requis, `arrondi` est optionnel.
  });
export type CalqueCompose = z.infer<typeof CalqueComposeSchema>;

export const ZoneComposeSchema = z.object({
  x: PctSchema,
  y: PctSchema,
  largeur: PctSchema,
  hauteur: PctSchema,
  forme: FormeZoneSchema,
  colonnes: z.number().int().min(ZONE_COLONNES_MIN).max(ZONE_COLONNES_MAX),
  icone: z.string().min(1).max(NOM_MAX).refine(iconeConnue, {
    message: "icône absente du catalogue (777 icônes disponibles, voir stampCatalog)",
  }),
  couleurRempli: CouleurHexSchema,
  couleurVide: CouleurHexSchema,
});
export type ZoneCompose = z.infer<typeof ZoneComposeSchema>;

/**
 * Deux commerces différents ne doivent jamais recevoir la même composition :
 * c'est tout l'objet de ce schéma. `calques` est volontairement large (1 à
 * 12) — un slogan ou une mention légale sont optionnels, mais nom et zone de
 * fidélité structurent forcément la carte.
 */
export const CompositionSchema = z.object({
  fond: FondSchema,
  calques: z.array(CalqueComposeSchema).min(CALQUES_COMPOSES_MIN).max(CALQUES_COMPOSES_MAX),
  zoneFidelite: ZoneComposeSchema,
});
export type Composition = z.infer<typeof CompositionSchema>;

/* -------------------------------------------------------------- habillage */
//
// Le moteur de calques (ci-dessus) est plafonné par ce que le rendu HTML sait
// dessiner : 8 polices web, des icônes au trait, des aplats. Les cartes de
// référence du projet sont d'une autre nature — photo fondue dans le fond,
// coups de pinceau texturés, typographie display patinée, script manuscrit,
// illustration de marque. Aucune de ces qualités n'est atteignable en
// composant des <div>.
//
// L'habillage comble exactement cet écart : un modèle d'image produit le
// DÉCOR de la carte, et seulement le décor. Les deux éléments qui doivent
// rester vrais — la grille de tampons (elle reflète les passages réels du
// client) et le code-barres (il doit se scanner) — restent déterministes et
// se superposent par-dessus, dans les zones que le modèle déclare ici avoir
// laissées vides.

/** Longueur maximale d'un prompt d'habillage. Large : c'est une description
 *  de direction artistique complète, pas une phrase. */
export const PROMPT_HABILLAGE_MAX = 4000;
export const PROMPT_HABILLAGE_MIN = 120;

/** Rectangle en % du canvas, laissé vide par l'habillage pour recevoir un
 *  élément fonctionnel. */
export const ZoneReserveeSchema = z.object({
  x: PctSchema,
  y: PctSchema,
  largeur: PctSchema,
  hauteur: PctSchema,
});
export type ZoneReservee = z.infer<typeof ZoneReserveeSchema>;

export const HabillageSchema = z.object({
  /** Description de la carte à peindre, SANS tampons ni code-barres. */
  prompt: z.string().min(PROMPT_HABILLAGE_MIN).max(PROMPT_HABILLAGE_MAX),
  /** Où la grille de tampons sera posée — doit rester vide dans l'habillage. */
  zoneTampons: ZoneReserveeSchema,
  /** Où le code-barres sera posé — doit rester vide dans l'habillage. */
  zoneCode: ZoneReserveeSchema,
});
export type Habillage = z.infer<typeof HabillageSchema>;

/* --------------------------------------------------------- les 10 actions */

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("design"),
    ...DesignSchema.shape,
  }),
  z.object({
    type: z.literal("proposer"),
    secteur: z.string().min(2).max(NOM_MAX),
    ambiance: AmbianceSchema,
  }),
  z.object({
    type: z.literal("nom"),
    valeur: z.string().min(1).max(NOM_MAX),
  }),
  z.object({
    type: z.literal("mode"),
    mode: ModeFideliteSchema,
  }),
  z.object({
    type: z.literal("objectif"),
    // Borne large ici (union des deux modes) : la validation Zod ne connaît
    // pas le mode déjà choisi par le commerçant. La borne précise du mode
    // se vérifie dans engine/actions.ts, qui a accès à l'état.
    valeur: z.number().int().min(OBJECTIF_MIN_TAMPONS).max(OBJECTIF_MAX_POINTS),
  }),
  z.object({
    type: z.literal("paliers"),
    paliers: z.array(PalierSchema).min(PALIERS_MIN).max(PALIERS_MAX),
  }),
  z.object({
    type: z.literal("recompense"),
    recompense: RecompenseSchema,
  }),
  z.object({
    type: z.literal("modifier"),
    cible: CibleSchema,
    valeur: z.string().max(TEXTE_MAX).optional(),
  }),
  z.object({
    type: z.literal("composer"),
    ...CompositionSchema.shape,
  }),
  z.object({
    type: z.literal("habillage"),
    ...HabillageSchema.shape,
  }),
  /**
   * Qualification commerciale : ce que le prospect est, pas ce que sera sa
   * carte. Chaque champ est optionnel et indépendant des autres — le
   * commercial envoie l'action dès qu'IL CONNAÎT une information, sans
   * attendre d'avoir les cinq. Rien ici n'entre dans `CHAMPS_REQUIS` : un
   * prospect qui refuse de donner son contact doit quand même pouvoir voir
   * sa carte, la qualification ne bloque jamais la création.
   */
  z.object({
    type: z.literal("qualifier"),
    clientsParSemaine: z.number().int().min(1).max(CLIENTS_SEMAINE_MAX).optional(),
    nbPointsVente: z.number().int().min(1).max(POINTS_VENTE_MAX).optional(),
    /** En euros. Décimales acceptées (ex. 12.5) : un panier moyen n'est pas
     *  toujours un nombre rond. */
    panierMoyen: z.number().positive().max(PANIER_MOYEN_MAX).optional(),
    objectifPrincipal: z.string().min(1).max(TEXTE_MAX).optional(),
    prenom: z.string().min(1).max(NOM_MAX).optional(),
    contact: z.string().min(3).max(120).optional(),
  }),
]);
export type Action = z.infer<typeof ActionSchema>;

/** Noms d'outils exposés au modèle. Un nom hors de cette liste est ignoré. */
export const NOMS_ACTIONS = [
  "design",
  "proposer",
  "nom",
  "mode",
  "objectif",
  "paliers",
  "recompense",
  "modifier",
  "composer",
  "habillage",
  "qualifier",
] as const;

/* -------------------------------------------------------- sortie complète */

/** `action` accepte un objet unique ou un tableau (borné) : voir la note sur
 *  MAX_ACTIONS_PAR_TOUR — c'est ce qui permet à `composer` d'arriver dans le
 *  même tour que l'action qui complète les informations minimales. */
export const ActionOuActionsSchema = z.union([
  ActionSchema,
  z.array(ActionSchema).min(1).max(MAX_ACTIONS_PAR_TOUR),
]);

export const SortieAssistantSchema = z.object({
  reply: z.string().min(1).max(REPLY_MAX),
  action: ActionOuActionsSchema.nullable(),
});
export type SortieAssistant = z.infer<typeof SortieAssistantSchema>;

/* ------------------------------------------------- structure d'une carte */

export const TypeCalqueSchema = z.enum([
  "fond",
  "texte",
  "image",
  "forme",
  "icone",
  "codebarres",
]);

export const CalqueSchema = z.object({
  id: z.string().min(1),
  nom: z.string().min(1).max(NOM_MAX),
  type: TypeCalqueSchema,
});
export type Calque = z.infer<typeof CalqueSchema>;

export const ProgrammeSchema = z.object({
  mode: ModeFideliteSchema,
  // Borne large ici aussi : la borne précise selon le mode est un contrôle
  // qualité (quality.ts:objectifDansBornes, déjà mode-aware), pas une règle
  // de forme — même séparation que zoneCoherenteAvecLeMode.
  objectif: z.number().int().min(OBJECTIF_MIN_TAMPONS).max(OBJECTIF_MAX_POINTS),
  paliers: z.array(PalierSchema).max(PALIERS_MAX),
  recompense: RecompenseSchema,
});
export type Programme = z.infer<typeof ProgrammeSchema>;

/**
 * Structure produite par FidiIA. Volontairement indépendante du CardDoc de
 * l'application : le moteur décrit, l'adaptateur convertit. Cette séparation
 * garde `lib/fidiia` testable sans rien charger de l'interface.
 */
export const CarteSchema = z.object({
  nomCommerce: z.string().min(1).max(NOM_MAX),
  calques: z.array(CalqueSchema),
  /** Identifiants des zones de fidélité. Il doit y en avoir exactement une. */
  zonesFidelite: z.array(z.string().min(1)),
  programme: ProgrammeSchema,
  design: DesignSchema.optional(),
  /** Composition transmise par le modèle (action `composer`). Absente : les
   *  valeurs codées en dur de toCardDoc.ts servent de repli — voir ce fichier. */
  composition: CompositionSchema.optional(),
  /** Habillage demandé par le modèle (action `habillage`), une fois l'image
   *  réellement produite. Présent : il devient le fond de la carte et la
   *  composition de calques s'efface derrière lui — seuls les tampons et le
   *  code-barres restent posés par-dessus. */
  habillage: HabillageSchema.extend({
    /** Data URL de l'image produite par le modèle d'image. */
    image: z.string().min(1),
  }).optional(),
  /** Cibles réellement touchées par cette génération. Sert au test de verrou. */
  ciblesModifiees: z.array(CibleSchema).default([]),
});
export type Carte = z.infer<typeof CarteSchema>;

/* ------------------------------------------------------------- validation */

export type Validation<T> =
  | { ok: true; valeur: T }
  | { ok: false; motif: string };

/** Valide une sortie brute de fournisseur. Le motif est réutilisé tel quel
 *  dans la relance : le modèle doit savoir POURQUOI il a été rejeté. */
export function validerSortie(brut: unknown): Validation<SortieAssistant> {
  const r = SortieAssistantSchema.safeParse(brut);
  if (r.success) return { ok: true, valeur: r.data };
  return { ok: false, motif: resumerErreur(r.error) };
}

export function validerAction(brut: unknown): Validation<Action> {
  const r = ActionSchema.safeParse(brut);
  if (r.success) return { ok: true, valeur: r.data };
  return { ok: false, motif: resumerErreur(r.error) };
}

/**
 * Valide un lot d'actions brutes une par une, dans l'ordre : la première qui
 * échoue invalide le lot entier — pas d'application partielle d'un tour
 * encore mal formé, voir fidiia/index.ts. Un lot trop long est refusé avant
 * même d'examiner son contenu, avec un motif que le modèle peut corriger à
 * la relance.
 */
export function validerLotActions(bruts: unknown[]): Validation<Action[]> {
  if (bruts.length > MAX_ACTIONS_PAR_TOUR) {
    return {
      ok: false,
      motif: `trop d'actions en un seul tour : ${bruts.length}, ${MAX_ACTIONS_PAR_TOUR} au maximum`,
    };
  }
  const valeurs: Action[] = [];
  for (const brut of bruts) {
    const r = validerAction(brut);
    if (!r.ok) return { ok: false, motif: r.motif };
    valeurs.push(r.valeur);
  }
  return { ok: true, valeur: valeurs };
}

export function validerCarte(brut: unknown): Validation<Carte> {
  const r = CarteSchema.safeParse(brut);
  if (r.success) return { ok: true, valeur: r.data };
  return { ok: false, motif: resumerErreur(r.error) };
}

function resumerErreur(err: z.ZodError): string {
  return err.issues
    .slice(0, 4)
    .map((i) => {
      const chemin = i.path.length ? i.path.join(".") : "racine";
      return `${chemin} : ${i.message}`;
    })
    .join(" ; ");
}
