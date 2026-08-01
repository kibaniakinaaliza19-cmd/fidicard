// Le contrat de sortie, traduit en schémas Zod.
//
// Règle absolue : aucune sortie de fournisseur n'est appliquée sans être
// passée par ces schémas. Une sortie invalide n'est jamais « rattrapée » en
// devinant l'intention — elle est rejetée avec un motif.

import { z } from "zod";

/* ------------------------------------------------------------- primitives */

export const AmbianceSchema = z.enum(["chaud", "neutre", "froid"]);
export type Ambiance = z.infer<typeof AmbianceSchema>;

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

/** Bornes reprises du moteur de fidélité : objectif entre 1 et 30. */
export const OBJECTIF_MIN = 1;
export const OBJECTIF_MAX = 30;
/** Le libellé court s'écrit DANS le tampon : 8 caractères au maximum. */
export const LIBELLE_COURT_MAX = 8;

export const PalierSchema = z.object({
  position: z.number().int().min(1).max(OBJECTIF_MAX),
  label: z.string().min(1).max(LIBELLE_COURT_MAX),
  description: z.string().min(1).max(120),
});
export type Palier = z.infer<typeof PalierSchema>;

export const RecompenseSchema = z.object({
  texte: z.string().min(1).max(120),
  libelleCourt: z.string().min(1).max(LIBELLE_COURT_MAX),
});
export type Recompense = z.infer<typeof RecompenseSchema>;

/* ---------------------------------------------------------- les 6 actions */

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("proposer"),
    secteur: z.string().min(2).max(60),
    ambiance: AmbianceSchema,
  }),
  z.object({
    type: z.literal("mode"),
    mode: ModeFideliteSchema,
  }),
  z.object({
    type: z.literal("objectif"),
    valeur: z.number().int().min(OBJECTIF_MIN).max(OBJECTIF_MAX),
  }),
  z.object({
    type: z.literal("paliers"),
    paliers: z.array(PalierSchema).min(1).max(5),
  }),
  z.object({
    type: z.literal("recompense"),
    recompense: RecompenseSchema,
  }),
  z.object({
    type: z.literal("modifier"),
    cible: CibleSchema,
    valeur: z.string().max(120).optional(),
  }),
]);
export type Action = z.infer<typeof ActionSchema>;

/** Noms d'outils exposés au modèle. Un nom hors de cette liste est ignoré. */
export const NOMS_ACTIONS = [
  "proposer",
  "mode",
  "objectif",
  "paliers",
  "recompense",
  "modifier",
] as const;

/* -------------------------------------------------------- sortie complète */

export const SortieAssistantSchema = z.object({
  reply: z.string().min(1).max(2000),
  action: ActionSchema.nullable(),
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
  nom: z.string().min(1).max(60),
  type: TypeCalqueSchema,
});
export type Calque = z.infer<typeof CalqueSchema>;

export const ProgrammeSchema = z.object({
  mode: ModeFideliteSchema,
  objectif: z.number().int().min(OBJECTIF_MIN).max(OBJECTIF_MAX),
  paliers: z.array(PalierSchema).max(5),
  recompense: RecompenseSchema,
});
export type Programme = z.infer<typeof ProgrammeSchema>;

/**
 * Structure produite par FidiIA. Volontairement indépendante du CardDoc de
 * l'application : le moteur décrit, l'adaptateur convertit. Cette séparation
 * garde `lib/fidiia` testable sans rien charger de l'interface.
 */
export const CarteSchema = z.object({
  nomCommerce: z.string().min(1).max(60),
  calques: z.array(CalqueSchema),
  /** Identifiants des zones de fidélité. Il doit y en avoir exactement une. */
  zonesFidelite: z.array(z.string().min(1)),
  programme: ProgrammeSchema,
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
