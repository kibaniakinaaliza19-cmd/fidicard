// Application des sept actions du contrat de sortie.
//
// Deux principes :
//   1. Une action n'est appliquée qu'après validation par les schémas.
//   2. Une action qui touche un élément verrouillé est REJETÉE ici, en code.
//      Le prompt le décourage ; ce fichier l'empêche.

import type { Action, Cible } from "../validation/schemas.ts";
import { bornesObjectif, CibleSchema } from "../validation/schemas.ts";
import { nettoyerContraste } from "../validation/quality.ts";
import type { ConversationState } from "../state/conversationState.ts";
import { majEtat } from "../state/conversationState.ts";
import type { SessionMemory } from "../state/sessionMemory.ts";
import { estVerrouille, noterDecision, noterPreference, poserVerrou } from "../state/sessionMemory.ts";

export type CodeRefus = "VERROU" | "INVALIDE" | "INCONNU";

export type ResultatAction =
  | { ok: true; etat: ConversationState; memory: SessionMemory; effet: string }
  | { ok: false; code: CodeRefus; motif: string };

/**
 * Applique une action déjà validée. Aucune action ne produit d'effet hors de
 * l'écran de conception : ni publication, ni envoi, ni suppression.
 */
export function appliquerAction(
  action: Action,
  etat: ConversationState,
  memory: SessionMemory,
): ResultatAction {
  switch (action.type) {
    case "design": {
      // Le contraste se corrige, il ne se rejette pas : voir quality.ts. Les
      // deux autres contraintes (icône du catalogue, couleur bien formée)
      // sont déjà tranchées par le schéma — une valeur qui arrive ici est
      // déjà propre sur ces deux points.
      const { texte, corrige } = nettoyerContraste(action.fond, action.texte);
      const design = { accent: action.accent, fond: action.fond, texte, icone: action.icone, ambiance: action.ambiance };
      const e = majEtat(etat, { design, ambiance: action.ambiance });
      const m = noterDecision(memory, "design", { ...design, contrasteCorrige: corrige });
      return {
        ok: true,
        etat: e,
        memory: m,
        effet: corrige
          ? `design appliqué (texte réajusté pour le contraste : ${texte})`
          : "design appliqué",
      };
    }

    case "proposer": {
      const e = majEtat(etat, { secteur: action.secteur, ambiance: action.ambiance });
      const m = noterPreference(noterDecision(memory, "ambiance", action.ambiance), `ambiance ${action.ambiance}`);
      return { ok: true, etat: e, memory: m, effet: `trois propositions ${action.secteur} / ${action.ambiance}` };
    }

    case "nom": {
      const e = majEtat(etat, { nomCommerce: action.valeur });
      const m = noterDecision(memory, "nom", action.valeur);
      return { ok: true, etat: e, memory: m, effet: `nom réglé sur « ${action.valeur} »` };
    }

    case "mode": {
      const e = majEtat(etat, { systemeFidelite: action.mode });
      const m = noterDecision(memory, "mode", action.mode);
      return { ok: true, etat: e, memory: m, effet: `système réglé sur ${action.mode}` };
    }

    case "objectif": {
      // Déduire avant de demander : parler d'un nombre de passages implique un
      // programme à tampons, mode par défaut documenté. Une demande explicite
      // de points l'emporte, et ne repasse jamais en tampons toute seule.
      const modeResolu = etat.systemeFidelite ?? "stamps";
      // Le schéma Zod accepte la réunion des deux bornes (1 à 1000) : il ne
      // connaît pas le mode déjà choisi. La borne précise du mode, elle,
      // dépend de l'état — donc vérifiée ici, pas dans schemas.ts.
      const { min, max } = bornesObjectif(modeResolu);
      if (action.valeur < min || action.valeur > max) {
        return {
          ok: false,
          code: "INVALIDE",
          motif: `objectif ${action.valeur} hors de l'intervalle ${min}-${max} pour le mode ${modeResolu}`,
        };
      }
      // Les paliers déjà posés au-delà du nouvel objectif deviendraient
      // invalides : on les remet à l'échelle plutôt que de les perdre.
      const paliers = (etat.paliers ?? []).filter((p) => p.position <= action.valeur);
      const e = majEtat(etat, { objectif: action.valeur, paliers, systemeFidelite: modeResolu });
      const m = noterDecision(memory, "objectif", action.valeur);
      return { ok: true, etat: e, memory: m, effet: `objectif à ${action.valeur}` };
    }

    case "paliers": {
      const objectif = etat.objectif;
      if (objectif === undefined) {
        return { ok: false, code: "INVALIDE", motif: "objectif inconnu : impossible de poser des paliers" };
      }
      const horsBornes = action.paliers.find((p) => p.position > objectif);
      if (horsBornes) {
        return {
          ok: false,
          code: "INVALIDE",
          motif: `palier en position ${horsBornes.position} au-delà de l'objectif ${objectif}`,
        };
      }
      const positions = action.paliers.map((p) => p.position);
      if (new Set(positions).size !== positions.length) {
        return { ok: false, code: "INVALIDE", motif: "deux paliers visent la même position" };
      }
      const e = majEtat(etat, { paliers: action.paliers });
      const m = noterDecision(memory, "paliers", action.paliers.length);
      return { ok: true, etat: e, memory: m, effet: `${action.paliers.length} palier(s)` };
    }

    case "recompense": {
      const e = majEtat(etat, { recompense: action.recompense });
      const m = noterDecision(memory, "recompense", action.recompense.texte);
      return { ok: true, etat: e, memory: m, effet: `récompense « ${action.recompense.texte} »` };
    }

    case "modifier": {
      // LE point de rejet. Une modification sur une cible verrouillée
      // n'aboutit jamais, quelle que soit la formulation du modèle.
      if (estVerrouille(memory, action.cible)) {
        return {
          ok: false,
          code: "VERROU",
          motif: `« ${action.cible} » est verrouillé par le commerçant : modification refusée.`,
        };
      }
      const m = noterDecision(memory, `modif:${action.cible}`, action.valeur ?? true);
      return { ok: true, etat, memory: m, effet: `modification de ${action.cible}` };
    }
  }
}

/* ------------------------------------------- lecture du langage naturel */

const CIBLES: Cible[] = ["logo", "couleurs", "texte", "icone", "disposition", "photo"];

const SYNONYMES: Record<string, Cible> = {
  logo: "logo",
  couleur: "couleurs",
  couleurs: "couleurs",
  palette: "couleurs",
  texte: "texte",
  textes: "texte",
  titre: "texte",
  icone: "icone",
  "icône": "icone",
  tampon: "icone",
  tampons: "icone",
  disposition: "disposition",
  mise: "disposition",
  photo: "photo",
  image: "photo",
};

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function ciblesCitees(texte: string): Cible[] {
  const t = normaliser(texte);
  const trouvees = new Set<Cible>();
  for (const [mot, cible] of Object.entries(SYNONYMES)) {
    if (t.includes(normaliser(mot))) trouvees.add(cible);
  }
  return [...trouvees];
}

/**
 * Détecte une demande de verrouillage. Volontairement déterministe : un verrou
 * ne doit pas dépendre de l'humeur d'un modèle. « Ne touche plus au logo »
 * pose le verrou même si le fournisseur est indisponible.
 */
export function detecterVerrous(texte: string): Cible[] {
  const t = normaliser(texte);
  const marqueurs = [
    "ne touche pas",
    "ne touche plus",
    "touche pas",
    "n y touche pas",
    "laisse le",
    "laisse la",
    "laisse ca",
    "garde ca",
    "garde le",
    "garde la",
    "on garde",
    "ne change pas",
    "ne modifie pas",
    "pas toucher",
  ];
  if (!marqueurs.some((m) => t.includes(m))) return [];
  const cibles = ciblesCitees(texte);
  // « garde ça » sans cible nommée : on ne devine pas quoi verrouiller.
  return cibles.length ? cibles : [];
}

/** Détecte une levée de verrou explicite : « tu peux retoucher au logo ». */
export function detecterLevees(texte: string): Cible[] {
  const t = normaliser(texte);
  const marqueurs = [
    "tu peux changer",
    "tu peux modifier",
    "tu peux toucher",
    "tu peux retoucher",
    "finalement change",
    "finalement modifie",
    "deverrouille",
    "je t autorise",
  ];
  if (!marqueurs.some((m) => t.includes(m))) return [];
  return ciblesCitees(texte);
}

/** Détecte une demande de modification ciblée : « change seulement le haut ». */
export function detecterModificationCiblee(texte: string): Cible[] {
  const t = normaliser(texte);
  const marqueurs = [
    "change seulement",
    "change uniquement",
    "modifie seulement",
    "modifie uniquement",
    "juste le",
    "juste la",
    "seulement le",
    "seulement la",
    "uniquement le",
    "uniquement la",
  ];
  if (!marqueurs.some((m) => t.includes(m))) return [];
  return ciblesCitees(texte);
}

/** Applique les verrous détectés dans un message du commerçant. */
export function appliquerVerrousDetectes(
  texte: string,
  memory: SessionMemory,
): { memory: SessionMemory; poses: Cible[] } {
  const poses = detecterVerrous(texte);
  let m = memory;
  for (const c of poses) m = poserVerrou(m, c);
  return { memory: m, poses };
}

/** Garde-fou : n'accepte que les cibles de la liste fermée. */
export function estCibleConnue(valeur: unknown): valeur is Cible {
  return CibleSchema.safeParse(valeur).success && CIBLES.includes(valeur as Cible);
}
