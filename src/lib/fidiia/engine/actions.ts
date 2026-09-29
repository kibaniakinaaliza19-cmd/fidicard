// Application des sept actions du contrat de sortie.
//
// Deux principes :
//   1. Une action n'est appliquée qu'après validation par les schémas.
//   2. Une action qui touche un élément verrouillé est REJETÉE ici, en code.
//      Le prompt le décourage ; ce fichier l'empêche.

import type { Action, Cible, Composition } from "../validation/schemas.ts";
import { bornesObjectif, CibleSchema } from "../validation/schemas.ts";
import { chevauchementExcessif, corrigerComposition, nettoyerContraste, recadrerRect } from "../validation/quality.ts";
import type { ConversationState } from "../state/conversationState.ts";
import { majEtat } from "../state/conversationState.ts";
import type { SessionMemory } from "../state/sessionMemory.ts";
import { estVerrouille, noterDecision, noterPreference, poserVerrou } from "../state/sessionMemory.ts";

export type CodeRefus = "VERROU" | "INVALIDE" | "INCONNU";

/**
 * Ce que dit une carte Wallet, en clair, pour chaque cible que « modifier »
 * ne peut pas appliquer elle-même. Utilisé uniquement pour rediriger vers le
 * vrai chemin (l'action « design ») — jamais pour laisser croire qu'un
 * changement a eu lieu.
 */
const LIBELLE_REDIRECTION: Record<"couleurs" | "texte" | "icone", string> = {
  couleurs: "la couleur que vous voulez (par exemple « fond noir » ou « accent orange »)",
  texte: "le texte à changer et sa nouvelle valeur",
  icone: "l'icône que vous préférez",
};

/** `recadrerRect` ajoute un drapeau `corrige` utile au journal mais qui n'a
 *  rien à faire dans l'état : il le retire avant stockage. */
function sansMarqueur(r: { x: number; y: number; largeur: number; hauteur: number }) {
  return { x: r.x, y: r.y, largeur: r.largeur, hauteur: r.hauteur };
}

// En dessous de ces bornes, le code à modules (PDF417) et sa légende
// n'ont plus la place de se dessiner lisiblement (LayerContent.tsx:
// BarcodeCartouche) — un rectangle valide selon le schéma (n'importe quel
// % > 0) peut pourtant être illisible une fois peint. On l'agrandit plutôt
// que de laisser passer une carte dont le code ne scanne pas.
const HAUTEUR_MIN_CODE = 8;
const LARGEUR_MIN_CODE = 15;

function assurerTailleCode<T extends { x: number; y: number; largeur: number; hauteur: number; corrige: boolean }>(
  r: T,
): T {
  const largeur = Math.max(r.largeur, LARGEUR_MIN_CODE);
  const hauteur = Math.max(r.hauteur, HAUTEUR_MIN_CODE);
  if (largeur === r.largeur && hauteur === r.hauteur) return r;
  return {
    ...r,
    largeur,
    hauteur,
    x: Math.min(r.x, 100 - largeur),
    y: Math.min(r.y, 100 - hauteur),
    corrige: true,
  };
}

export type ResultatAction =
  | {
      ok: true;
      etat: ConversationState;
      memory: SessionMemory;
      effet: string;
      /** Phrase à montrer au commerçant quand une correction automatique a
       *  changé ce qu'Astra avait transmis — jamais silencieuse, voir
       *  fidiia/index.ts. Absent quand rien n'a été corrigé. */
      noteCommercante?: string;
    }
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
        noteCommercante: corrige ? "J'ai ajusté la couleur du texte pour qu'il reste lisible." : undefined,
      };
    }

    case "proposer": {
      const e = majEtat(etat, { secteur: action.secteur, ambiance: action.ambiance });
      const m = noterPreference(noterDecision(memory, "ambiance", action.ambiance), `ambiance ${action.ambiance}`);
      return { ok: true, etat: e, memory: m, effet: `trois propositions ${action.secteur} / ${action.ambiance}` };
    }

    case "composer": {
      // Le prompt enseigne de reprendre la composition À L'IDENTIQUE sauf le
      // champ demandé (prompts/contract.ts) — mais un prompt se contourne,
      // par erreur ou par un modèle mal luné. Le logo est le seul calque pour
      // lequel ce fichier fait respecter la règle en code : sa taille et sa
      // position ne sont pas un réglage de la carte, ce sont celles du
      // gabarit Wallet. Si une composition existait déjà et que celle-ci
      // déplace ou redimensionne le logo, elle est refusée entière — pas
      // seulement corrigée sur ce calque, pour que le refus se voie et que la
      // réponse ne prétende jamais qu'un changement a eu lieu.
      if (etat.composition) {
        const logoAvant = etat.composition.calques.find((c) => c.role === "logo");
        const logoApres = action.calques.find((c) => c.role === "logo");
        if (
          logoAvant &&
          logoApres &&
          (logoAvant.x !== logoApres.x ||
            logoAvant.y !== logoApres.y ||
            logoAvant.largeur !== logoApres.largeur ||
            logoAvant.hauteur !== logoApres.hauteur)
        ) {
          return {
            ok: false,
            code: "INVALIDE",
            motif:
              "La taille et la position du logo sont fixées par le format Wallet, pas réglables au cas par cas. " +
              "Je peux en revanche vous en poser un nouveau si vous voulez le remplacer.",
          };
        }
      }
      // Deux calques de texte qui se recouvrent trop ne se corrigent pas :
      // déplacer arbitrairement l'un des deux romprait la composition voulue
      // par le modèle plus sûrement qu'un refus qui lui laisse recomposer.
      const brute: Composition = { fond: action.fond, calques: action.calques, zoneFidelite: action.zoneFidelite };
      const motifChevauchement = chevauchementExcessif(brute);
      if (motifChevauchement) {
        return { ok: false, code: "INVALIDE", motif: `composition refusée : ${motifChevauchement}` };
      }
      // Le reste se corrige : calques hors cadre ramenés dedans, contraste
      // texte/fond réparé calque par calque — voir quality.ts.
      const { composition, corrections } = corrigerComposition(brute);
      const e = majEtat(etat, { composition });
      const m = noterDecision(memory, "composition", {
        calques: composition.calques.length,
        corrections: corrections.length,
      });
      return {
        ok: true,
        etat: e,
        memory: m,
        effet: corrections.length ? `composition appliquée (${corrections.join(", ")})` : "composition appliquée",
        noteCommercante: corrections.length
          ? "J'ai fait quelques ajustements automatiques pour que tout reste lisible et dans le cadre."
          : undefined,
      };
    }

    case "habillage": {
      // L'image elle-même n'est PAS produite ici : cette fonction est pure et
      // n'a pas de fournisseur. On n'enregistre que la demande ; c'est
      // `envoyerMessage` (fidiia/index.ts) qui appelle le modèle d'image et
      // vient compléter `image` juste après.
      const demande = {
        prompt: action.prompt,
        zoneTampons: recadrerRect(action.zoneTampons),
        zoneCode: assurerTailleCode(recadrerRect(action.zoneCode)),
      };
      const e = majEtat(etat, {
        habillage: {
          prompt: demande.prompt,
          zoneTampons: sansMarqueur(demande.zoneTampons),
          zoneCode: sansMarqueur(demande.zoneCode),
        },
      });
      const m = noterDecision(memory, "habillage", { caracteres: action.prompt.length });
      const recadre = demande.zoneTampons.corrige || demande.zoneCode.corrige;
      return {
        ok: true,
        etat: e,
        memory: m,
        effet: recadre ? "habillage demandé (zone réservée recadrée)" : "habillage demandé",
        noteCommercante: recadre
          ? "J'ai légèrement recadré une zone réservée pour qu'elle tienne dans la carte."
          : undefined,
      };
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
      // `modifier` ne touche RÉELLEMENT aucun champ de la carte, composée ou
      // non — observé en réel : le modèle répondait « c'est fait » et la
      // carte restait identique, sur les deux formes. La photo est la seule
      // exception, un remplacement d'image plutôt qu'une retouche de mise
      // en page (voir adapters/toCardDoc.ts).
      //
      // Deux cibles sont refusées EN TOUTE CIRCONSTANCE, verrou ou pas,
      // composition ou pas : la taille et la position ne sont pas des
      // réglages que la carte porte — Apple/Google Wallet fixe la place du
      // logo dans son gabarit, et FidiCard ne construit pas de déplacement
      // libre des autres éléments. Le refus est honnête et propose la seule
      // chose qui existe vraiment à la place.
      if (action.cible === "logo") {
        return {
          ok: false,
          code: "INVALIDE",
          motif:
            "La taille et la position du logo sont fixées par le format Wallet, pas réglables au cas par cas. " +
            "Je peux en revanche vous en poser un nouveau si vous voulez le remplacer.",
        };
      }
      if (action.cible === "disposition") {
        return {
          ok: false,
          code: "INVALIDE",
          motif:
            "Je ne déplace pas librement les éléments d'une carte Wallet. " +
            "Dites-moi une couleur, un texte ou une récompense à changer, et je m'en occupe.",
        };
      }
      // La photo est le seul cas où « modifier » a un effet réel : le
      // commerçant vient de déposer une image, appliquée ailleurs dans le
      // pipeline (integrerImagesReelles) — remplacer une image n'est pas une
      // retouche de mise en page.
      if (action.cible === "photo") {
        const m = noterDecision(memory, "modif:photo", action.valeur ?? true);
        return { ok: true, etat, memory: m, effet: "photo mise à jour" };
      }
      // Les cibles restantes (couleurs, texte, icone) ont un vrai chemin —
      // l'action « design » — mais « modifier » ne peut pas s'y substituer :
      // sa valeur est une phrase libre, jamais une couleur ou un texte
      // exploitable tel quel. Rediriger dit la vérité ; renvoyer ok:true ne
      // le ferait pas.
      return {
        ok: false,
        code: "INVALIDE",
        motif: `Dites-moi directement ${LIBELLE_REDIRECTION[action.cible]}, et je l'applique tout de suite.`,
      };
    }

    case "qualifier": {
      // Chaque champ est indépendant : on ne patch que ceux réellement
      // transmis, jamais un `undefined` qui écraserait une valeur déjà
      // connue (majEtat ignore déjà les clés undefined, mais construire le
      // patch explicitement documente l'intention).
      const patch: Partial<ConversationState> = {};
      const captes: string[] = [];
      if (action.clientsParSemaine !== undefined) { patch.clientsParSemaine = action.clientsParSemaine; captes.push("clients/semaine"); }
      if (action.nbPointsVente !== undefined) { patch.nbPointsVente = action.nbPointsVente; captes.push("points de vente"); }
      if (action.panierMoyen !== undefined) { patch.panierMoyen = action.panierMoyen; captes.push("panier moyen"); }
      if (action.objectifPrincipal !== undefined) { patch.objectifPrincipal = action.objectifPrincipal; captes.push("objectif"); }
      if (action.prenom !== undefined) { patch.prenom = action.prenom; captes.push("prénom"); }
      if (action.contact !== undefined) { patch.contact = action.contact; captes.push("contact"); }
      const e = majEtat(etat, patch);
      const m = noterDecision(memory, "qualification", captes.join(", ") || "vide");
      return {
        ok: true,
        etat: e,
        memory: m,
        effet: captes.length ? `qualification : ${captes.join(", ")}` : "qualification sans champ",
      };
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
