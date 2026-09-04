// Assemblage du prompt : identité + garde-fous + contrat + état + historique.
//
// L'historique est borné ici, et pas ailleurs : c'est le seul endroit qui
// décide de ce qui part réellement au fournisseur.

import type { Message } from "../provider/types.ts";
import type { ConversationState } from "../state/conversationState.ts";
import { informationsManquantes } from "../state/conversationState.ts";
import type { SessionMemory } from "../state/sessionMemory.ts";
import { IDENTITY, IDENTITY_VERSION } from "./identity.ts";
import { GUARDRAILS, GUARDRAILS_VERSION } from "./guardrails.ts";
import { CONTRACT, CONTRACT_VERSION } from "./contract.ts";
import { referencesDistinctes, trouverSecteur } from "../corpus/index.ts";

/** Bornes reprises du cahier des charges (gestion du contexte). */
export const MAX_MESSAGES = 40;
export const MAX_CARACTERES = 4000;

export const PROMPT_VERSION = `${IDENTITY_VERSION}/${GUARDRAILS_VERSION}/${CONTRACT_VERSION}`;

/** Partie stable du prompt : candidate à la mise en cache d'un fournisseur. */
export function partieStable(): string {
  return [IDENTITY, GUARDRAILS, CONTRACT].join("\n\n---\n\n");
}

function resumerEtat(etat: ConversationState, memory: SessionMemory): string {
  const connu: string[] = [];
  if (etat.secteur) connu.push(`secteur : ${etat.secteur}`);
  if (etat.nomCommerce) connu.push(`nom : ${etat.nomCommerce}`);
  if (etat.systemeFidelite) connu.push(`système : ${etat.systemeFidelite}`);
  if (etat.objectif !== undefined) connu.push(`objectif : ${etat.objectif}`);
  if (etat.recompense) connu.push(`récompense : ${etat.recompense.texte}`);
  if (etat.logo) connu.push("logo : fourni");
  if (etat.carteExistante) {
    connu.push(etat.carteAnalysee ? "carte existante : analysée" : "carte existante : à analyser");
  }

  const manque = informationsManquantes(etat);
  const lignes = [
    "CE QUE TU SAIS DÉJÀ (ne le redemande pas)",
    connu.length ? connu.map((l) => `  ${l}`).join("\n") : "  rien pour l'instant",
    "",
    "CE QUI TE MANQUE",
    manque.length ? manque.map((m) => `  ${m}`).join("\n") : "  rien : tu peux créer",
  ];

  // Ce que le corpus sait déjà de ce métier. Le modèle n'a plus à inventer une
  // récompense plausible : il en a trois, écrites à la main pour ce secteur.
  // Ce sont des EXEMPLES, jamais des données du commerçant — le prompt le dit,
  // sinon le modèle les recopierait comme des faits.
  const refs = referencesDistinctes(
    trouverSecteur(etat.secteur ?? ""),
    etat.systemeFidelite ?? "stamps",
  );
  if (refs.length) {
    lignes.push(
      "",
      `CE QUI MARCHE DANS CE MÉTIER (${refs[0].secteur}) — exemples du corpus`,
      "  Inspire-t'en pour proposer. Ne les présente jamais comme les données",
      "  de ce commerçant : ces noms et ces chiffres ne sont pas les siens.",
      ...refs.map((r) => `  ${r.objectif} → ${r.recompense}`),
    );
  }

  if (memory.preferences.length) {
    lignes.push("", "PRÉFÉRENCES DU COMMERÇANT", ...memory.preferences.map((p) => `  ${p}`));
  }
  if (memory.verrous.length) {
    lignes.push(
      "",
      "ÉLÉMENTS VERROUILLÉS — tu n'y touches sous aucun prétexte",
      ...memory.verrous.map((v) => `  ${v}`),
    );
  }
  return lignes.join("\n");
}

function bornerHistorique(historique: Message[]): Message[] {
  return historique
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));
}

export interface EntreePrompt {
  etat: ConversationState;
  memory: SessionMemory;
  historique: Message[];
  /** Motif de rejet de la tentative précédente, le cas échéant. */
  motifRejet?: string;
}

export function construirePrompt(entree: EntreePrompt): Message[] {
  const systeme: Message = {
    role: "system",
    content: `${partieStable()}\n\n---\n\n${resumerEtat(entree.etat, entree.memory)}`,
  };
  const messages: Message[] = [systeme, ...bornerHistorique(entree.historique)];
  if (entree.motifRejet) {
    messages.push({
      role: "system",
      content:
        `Ta réponse précédente a été REJETÉE : ${entree.motifRejet}\n` +
        "Corrige exactement ce point. Ne change rien d'autre.",
    });
  }
  return messages;
}
