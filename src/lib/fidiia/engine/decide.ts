// Le moteur de décision : quelle est la prochaine étape.
//
// Attention au vocabulaire : une ÉTAPE (NextStep) n'est pas une ACTION. Une
// étape décrit ce que FidiIA fait maintenant ; une action est ce qu'elle émet
// vers le produit (validation/schemas.ts).
//
// Règles reprises de 06 - CONVERSATION IA :
//   ne jamais poser une question dont la réponse est déjà dans l'état
//   déduire avant de demander
//   au-delà d'une dizaine d'échanges, générer avec ce qu'on a
//   une correction validée ne se perd jamais

import type { ChampRequis, ConversationState } from "../state/conversationState.ts";
import { informationsManquantes } from "../state/conversationState.ts";
import type { SessionMemory } from "../state/sessionMemory.ts";

export type NextStep =
  | "QUESTION"
  | "ANALYSE"
  | "CREATION"
  | "MODIFICATION"
  | "VALIDATION";

/** Au-delà, on génère avec ce qu'on a plutôt que continuer à interroger. */
export const MAX_TOURS_AVANT_CREATION = 10;

export interface ContexteDecision {
  /** Nombre d'échanges déjà consommés. */
  tours: number;
  /** Des propositions ont-elles déjà été affichées ? */
  carteProposee: boolean;
  /** Le dernier message demande-t-il une modification ciblée ? */
  demandeModification: boolean;
  /** Une carte complète existe-t-elle déjà ? */
  carteExiste?: boolean;
}

export interface Decision {
  step: NextStep;
  motif: string;
  /** Renseigné uniquement pour QUESTION : ce qu'il faut demander. */
  champ?: ChampRequis;
}

export function decide(
  etat: ConversationState,
  _memory: SessionMemory,
  ctx: ContexteDecision,
): Decision {
  // 1. Une carte fournie s'analyse AVANT toute question. Analyser remplace une
  //    dizaine de questions : c'est toujours le meilleur premier geste.
  if (etat.carteExistante && !etat.carteAnalysee) {
    return { step: "ANALYSE", motif: "une carte a été fournie et n'a pas encore été analysée" };
  }

  // 2. Une demande de modification porte sur la carte déjà proposée. On ne
  //    repart jamais d'une nouvelle création.
  if (ctx.demandeModification && ctx.carteProposee) {
    return { step: "MODIFICATION", motif: "le commerçant demande une modification ciblée" };
  }

  // 3. Tout est connu : on crée. Continuer à interroger serait du remplissage.
  if (etat.creationAutorisee && !ctx.carteExiste) {
    return { step: "CREATION", motif: "les informations minimales sont réunies" };
  }

  // 4. La carte existe et rien à modifier : on attend le choix du commerçant.
  //    Des propositions affichées ne suffisent pas : tant que le programme est
  //    incomplet, on continue à collecter plutôt que d'attendre dans le vide.
  if (ctx.carteExiste) {
    return { step: "VALIDATION", motif: "la carte est prête, le commerçant choisit" };
  }

  // 5. Conversation trop longue : on génère avec ce qu'on a. Un commerçant qui
  //    a répondu dix fois n'acceptera pas une onzième question.
  if (ctx.tours >= MAX_TOURS_AVANT_CREATION) {
    return {
      step: "CREATION",
      motif: `${ctx.tours} échanges atteints : on génère avec ce qu'on a`,
    };
  }

  // 6. Sinon : une question, et une seule, sur la première info manquante.
  const manquantes = informationsManquantes(etat);
  return {
    step: "QUESTION",
    motif: `information manquante : ${manquantes[0]}`,
    champ: manquantes[0],
  };
}

/** Formulation de la question associée à un champ manquant. */
export function formulerQuestion(champ: ChampRequis): string {
  switch (champ) {
    case "secteur":
      return "Quel est votre commerce ?";
    case "nomCommerce":
      return "Quel nom apparaît sur la carte ?";
    case "systemeFidelite":
      return "Vous préférez des tampons ou des points ?";
    case "objectif":
      return "Au bout de combien de passages le client est-il récompensé ?";
    case "recompense":
      return "Que gagne votre client une fois la carte complète ?";
  }
}
