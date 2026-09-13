// Point d'entrée de FidiIA.
//
// Une session enchaîne : détection des verrous (déterministe, hors modèle) →
// décision → appel éventuel du fournisseur → validation → application →
// contrôle qualité.
//
// Budget d'appels : DEUX au maximum par message. Un appel, une relance si la
// sortie est rejetée, puis un repli sans appel. Aucun troisième essai.

import type { ChatResult, LLMProvider, Message } from "./provider/types.ts";
import { getProvider } from "./provider/index.ts";
import type { ConversationState, EtatBrut } from "./state/conversationState.ts";
import { creerEtat, majEtat } from "./state/conversationState.ts";
import type { SessionMemory } from "./state/sessionMemory.ts";
import { creerMemoire, leverVerrou, noterInformation } from "./state/sessionMemory.ts";
import { construirePrompt, PROMPT_VERSION } from "./prompts/build.ts";
import { decide, formulerQuestion, type Decision, type NextStep } from "./engine/decide.ts";
import {
  appliquerAction,
  appliquerVerrousDetectes,
  detecterLevees,
  detecterModificationCiblee,
} from "./engine/actions.ts";
import type { Action, Carte, Cible } from "./validation/schemas.ts";
import { validerAction } from "./validation/schemas.ts";
import { controlerCarte, motifsEchec, toutValide, type Verdict } from "./validation/quality.ts";
import { suggestionPour, trouverSecteur } from "./corpus/index.ts";

export const MAX_APPELS_PAR_MESSAGE = 2;

export interface Session {
  readonly provider: LLMProvider;
  etat: ConversationState;
  memory: SessionMemory;
  historique: Message[];
  tours: number;
  carteProposee: boolean;
  carte?: Carte;
  /** Journal minimal : ni contenu de conversation, ni secret. */
  journal: EntreeJournal[];
}

export interface EntreeJournal {
  tour: number;
  step: NextStep;
  appels: number;
  action: string | null;
  rejet?: string;
  repli?: boolean;
  versionPrompt: string;
}

export interface Reponse {
  reply: string;
  decision: Decision;
  action: Action | null;
  /** Renseigné quand une action a été refusée (verrou, sortie invalide). */
  refus?: { code: string; motif: string };
  verrousPoses: Cible[];
  verdicts: Verdict[];
  appels: number;
  repli: boolean;
}

export function creerSession(
  init: { etat?: EtatBrut; memory?: SessionMemory; provider?: LLMProvider } = {},
): Session {
  return {
    provider: init.provider ?? getProvider(),
    etat: creerEtat(init.etat ?? {}),
    memory: init.memory ?? creerMemoire(),
    historique: [],
    tours: 0,
    carteProposee: false,
    journal: [],
  };
}

/* ------------------------------------------------------ carte déterministe */

/**
 * Construction de carte sans modèle. Sert à deux choses : produire la carte
 * quand la décision est CREATION, et servir de repli quand le fournisseur
 * renvoie deux fois une sortie invalide. Une carte issue d'ici est valide par
 * construction.
 */
export function construireCarte(etat: ConversationState, ciblesModifiees: Cible[] = []): Carte {
  const mode = etat.systemeFidelite ?? "stamps";

  // Le corpus avant l'invention. 864 modèles écrits secteur par secteur : pour
  // un fast-food, il sait dire « Le 8ᵉ tacos offert » là où un défaut générique
  // dirait « Une prestation offerte ». Une suggestion du corpus ne s'impose
  // jamais : elle ne sert que si le commerçant n'a rien dit.
  const suggestion = suggestionPour(trouverSecteur(etat.secteur ?? ""), mode);

  const objectif = etat.objectif ?? suggestion?.objectif ?? 10;
  const recompense =
    etat.recompense ??
    // On ne reprend la récompense du corpus que si l'objectif vient du corpus
    // aussi. Greffer « Le 10ᵉ café offert » sur un objectif de 6 donnerait une
    // carte qui se contredit elle-même.
    (etat.objectif === undefined ? suggestion?.recompense : undefined) ??
    { texte: "Une prestation offerte", libelleCourt: "Offert" };
  const paliersExistants = (etat.paliers ?? []).filter((p) => p.position < objectif);

  // Un seul système par carte. En mode points, aucune zone de tampons n'est
  // produite : c'est un compteur qui porte la progression. Mélanger les deux
  // rendrait la carte incompréhensible pour le client au comptoir.
  const enTampons = mode === "stamps";

  return {
    nomCommerce: etat.nomCommerce ?? "Mon commerce",
    calques: [
      { id: "fond", nom: "Fond", type: "fond" },
      // La photo de l'établissement passe avant le reste : c'est elle qui fait
      // reconnaître le commerce. Elle n'apparaît que si le commerçant en a
      // fourni une — jamais inventée.
      ...(etat.photo ? [{ id: "photo", nom: "Photo de l'établissement", type: "image" as const }] : []),
      { id: "nom", nom: "Nom du commerce", type: "texte" as const },
      { id: "regle", nom: "Règle du programme", type: "texte" as const },
      ...(etat.logo ? [{ id: "logo", nom: "Logo", type: "image" as const }] : []),
      ...(enTampons ? [] : [{ id: "compteur", nom: "Compteur de points", type: "texte" as const }]),
      { id: "instruction", nom: "Instruction de scan", type: "texte" as const },
      { id: "code", nom: "Code-barres", type: "codebarres" as const },
    ],
    zonesFidelite: enTampons ? ["zone-fidelite"] : [],
    programme: {
      mode,
      objectif,
      paliers: [
        ...paliersExistants,
        {
          position: objectif,
          label: recompense.libelleCourt,
          description: recompense.texte,
        },
      ],
      recompense,
    },
    ciblesModifiees,
  };
}

/* ------------------------------------------------------------ appel modèle */

async function demanderAuModele(
  session: Session,
  motifRejet?: string,
): Promise<ChatResult> {
  const messages = construirePrompt({
    etat: session.etat,
    memory: session.memory,
    historique: session.historique,
    motifRejet,
  });
  return session.provider.chat(messages, []);
}

interface SortieModele {
  reply: string;
  action: Action | null;
  appels: number;
  rejet?: string;
  repli: boolean;
}

/**
 * Un appel, une relance si la sortie est rejetée, puis un repli. Jamais de
 * troisième essai. Ce chemin est le MÊME quelle que soit l'étape : une sortie
 * invalide pendant une question doit être traitée comme une sortie invalide
 * pendant une création.
 */
async function obtenirActionValidee(session: Session): Promise<SortieModele> {
  const premier = await demanderAuModele(session);
  if (!premier.toolCall) {
    return { reply: premier.reply, action: null, appels: 1, repli: false };
  }

  const v1 = validerAction(premier.toolCall.arguments);
  if (v1.ok) {
    return { reply: premier.reply, action: v1.valeur, appels: 1, repli: false };
  }

  // Une relance, une seule, avec le motif exact du rejet.
  const second = await demanderAuModele(session, v1.motif);
  const v2 = second.toolCall ? validerAction(second.toolCall.arguments) : null;
  if (v2?.ok) {
    return { reply: second.reply || premier.reply, action: v2.valeur, appels: 2, repli: false };
  }

  // Deux échecs : repli. Aucun troisième appel.
  return {
    reply:
      "Je n'ai pas réussi à appliquer ça proprement. Je pars sur une base sûre, dites-moi ce que vous voulez changer.",
    action: null,
    appels: 2,
    rejet: v2?.motif ?? v1.motif,
    repli: true,
  };
}

/* --------------------------------------------------------------- traitement */

export async function envoyerMessage(session: Session, texte: string): Promise<Reponse> {
  session.tours += 1;
  session.historique.push({ role: "user", content: texte });

  // 1. Les verrous se posent AVANT tout appel : ils ne dépendent pas du modèle.
  const { memory: memApresVerrous, poses } = appliquerVerrousDetectes(texte, session.memory);
  session.memory = memApresVerrous;

  // 2. Levée de verrou : uniquement sur demande explicite du commerçant.
  for (const cible of detecterLevees(texte)) {
    const r = leverVerrou(session.memory, cible, true);
    if (r.ok) session.memory = r.memory;
  }

  const demandeModification = detecterModificationCiblee(texte).length > 0;
  const decision = decide(session.etat, session.memory, {
    tours: session.tours,
    carteProposee: session.carteProposee,
    demandeModification,
    carteExiste: session.carte !== undefined,
  });

  let appels = 0;
  let repli = false;
  let action: Action | null = null;
  let refus: Reponse["refus"];
  let reply = "";
  let rejet: string | undefined;

  if (decision.step === "ANALYSE") {
    // L'analyse d'image ne passe pas par le contrat d'actions : elle alimente
    // directement l'état, puis la conversation reprend son cours.
    const source = String(session.etat.logo ?? "carte.jpg");
    const res = await session.provider.vision(source, "analyse de carte");
    appels = 1;
    const data = res.data as Record<string, unknown> | null;
    if (data && typeof data === "object" && !("erreur" in data)) {
      session.etat = majEtat(session.etat, {
        carteAnalysee: true,
        nomCommerce: typeof data.nomCommerce === "string" ? data.nomCommerce : undefined,
        systemeFidelite: data.systemeFidelite === "points" ? "points" : "stamps",
        objectif: typeof data.objectif === "number" ? data.objectif : undefined,
        recompense:
          data.recompense && typeof data.recompense === "object"
            ? (data.recompense as { texte: string; libelleCourt: string })
            : undefined,
        logo: typeof data.logo === "string" ? data.logo : undefined,
      });
      session.memory = noterInformation(session.memory, "carteAnalysee", true);
      reply = "J'ai lu votre carte. Je reprends ce qui existe déjà.";
    } else {
      session.etat = majEtat(session.etat, { carteAnalysee: true });
      reply =
        "Je n'arrive pas à lire cette photo. Recadrez-la, ou dites-moi simplement votre métier.";
    }
  } else {
    const sortie = await obtenirActionValidee(session);
    appels = sortie.appels;
    action = sortie.action;
    repli = sortie.repli;
    rejet = sortie.rejet;
    // Le champ manquant est connu en code : si le modèle ne dit rien d'utile,
    // la question part quand même.
    reply =
      sortie.reply ||
      (decision.step === "QUESTION" && decision.champ ? formulerQuestion(decision.champ) : "");
    if (repli) refus = { code: "INVALIDE", motif: rejet ?? "sortie invalide" };
  }

  // 3. Application de l'action, si elle a survécu à la validation.
  if (action) {
    const r = appliquerAction(action, session.etat, session.memory);
    if (r.ok) {
      session.etat = r.etat;
      session.memory = r.memory;
      if (action.type === "proposer") session.carteProposee = true;
    } else {
      refus = { code: r.code, motif: r.motif };
      action = null;
      if (r.code === "VERROU") {
        reply = `${r.motif} Dites-moi si vous voulez que je le déverrouille.`;
      }
    }
  }

  // 4. Carte et contrôle qualité.
  let verdicts: Verdict[] = [];
  if (decision.step === "CREATION" || repli) {
    const cibles = decision.step === "MODIFICATION" ? detecterModificationCiblee(texte) : [];
    const carte = construireCarte(session.etat, cibles);
    verdicts = controlerCarte(carte, session.memory, { photoFournie: Boolean(session.etat.photo) });
    if (toutValide(verdicts)) {
      session.carte = carte;
      session.carteProposee = true;
      // La confirmation vient du produit, pas du modèle : elle décrit ce qui a
      // réellement été construit, donc elle ne peut pas mentir.
      if (!repli) {
        reply = `Votre carte est prête : ${carte.programme.objectif} ${
          carte.programme.mode === "points" ? "points" : "passages"
        }, ${carte.programme.recompense.texte.toLowerCase()}. Dites-moi ce que vous voulez ajuster.`;
      }
    }
  } else if (decision.step === "MODIFICATION" && session.carte) {
    const carte: Carte = { ...session.carte, ciblesModifiees: detecterModificationCiblee(texte) };
    verdicts = controlerCarte(carte, session.memory, { photoFournie: Boolean(session.etat.photo) });
    if (toutValide(verdicts)) session.carte = carte;
    else refus = { code: "VERROU", motif: motifsEchec(verdicts).join(" ; ") };
  }

  // Un verrou posé se confirme toujours au commerçant : une interdiction
  // silencieuse ne se distingue pas d'une interdiction ignorée.
  if (poses.length && !refus) {
    reply = `C'est noté : je ne touche plus à ${poses.join(", ")}. ${reply}`.trim();
  }

  session.historique.push({ role: "assistant", content: reply });
  session.journal.push({
    tour: session.tours,
    step: decision.step,
    appels,
    action: action ? action.type : null,
    rejet,
    repli: repli || undefined,
    versionPrompt: PROMPT_VERSION,
  });

  return { reply, decision, action, refus, verrousPoses: poses, verdicts, appels, repli };
}

export { creerEtat, majEtat } from "./state/conversationState.ts";
export { creerMemoire, estVerrouille, poserVerrou } from "./state/sessionMemory.ts";
export { decide } from "./engine/decide.ts";
export { controlerCarte, toutValide } from "./validation/quality.ts";
export type { Action, Carte, Cible } from "./validation/schemas.ts";
export type { ConversationState } from "./state/conversationState.ts";
export type { SessionMemory } from "./state/sessionMemory.ts";
export type { Verdict } from "./validation/quality.ts";
