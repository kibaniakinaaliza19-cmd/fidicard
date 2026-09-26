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
import { COMMERCIAL, COMMERCIAL_VERSION } from "./commercial.ts";
import { referencesDistinctes, trouverSecteur } from "../corpus/index.ts";
import { estimerGain } from "../commercial/estimation.ts";

/** Bornes reprises du cahier des charges (gestion du contexte). */
export const MAX_MESSAGES = 40;
export const MAX_CARACTERES = 4000;

export const PROMPT_VERSION = `${IDENTITY_VERSION}/${GUARDRAILS_VERSION}/${CONTRACT_VERSION}/${COMMERCIAL_VERSION}`;

/** Partie stable du prompt : candidate à la mise en cache d'un fournisseur. */
export function partieStable(): string {
  return [IDENTITY, GUARDRAILS, CONTRACT, COMMERCIAL].join("\n\n---\n\n");
}

function resumerEtat(etat: ConversationState, memory: SessionMemory): string {
  const connu: string[] = [];
  if (etat.secteur) connu.push(`secteur : ${etat.secteur}`);
  if (etat.nomCommerce) connu.push(`nom : ${etat.nomCommerce}`);
  if (etat.systemeFidelite) connu.push(`système : ${etat.systemeFidelite}`);
  if (etat.objectif !== undefined) connu.push(`objectif : ${etat.objectif}`);
  if (etat.recompense) connu.push(`récompense : ${etat.recompense.texte}`);
  if (etat.logo) connu.push("logo : fourni — tu peux le placer via un calque de rôle « logo »");
  if (etat.photo) connu.push("photo de l'établissement : fournie — tu peux la placer via un calque de rôle « photo », ou en fond plein cadre (fond de type « image »)");
  if (etat.ambiance) connu.push(`ambiance : ${etat.ambiance}`);
  if (etat.analyseImage) {
    const a = etat.analyseImage;
    connu.push(
      `image analysée — couleurs : ${a.couleurs.join(", ")}` +
        (a.style ? `, style : ${a.style}` : "") +
        (a.ambiance ? `, ambiance perçue : ${a.ambiance}` : "") +
        (a.gamme ? `, gamme : ${a.gamme}` : ""),
    );
  }
  // La composition/le design déjà transmis sont montrés EN CLAIR, pas juste
  // signalés comme « déjà fait » : sans le JSON exact, le modèle ne peut pas
  // répondre à une retouche (« le logo plus petit ») en renvoyant la même
  // composition avec seulement ce champ changé — il devrait la réinventer,
  // et perdrait tout le reste au passage. Observé en réel : c'est justement
  // ce qui manquait pour que les modifications marchent.
  if (etat.composition) {
    connu.push(
      "composition déjà transmise — pour une retouche, renvoie l'action « composer » avec CET " +
        "OBJET repris à l'identique, en ne changeant QUE le ou les champs demandés :\n" +
        JSON.stringify(etat.composition),
    );
  } else if (etat.design) {
    connu.push(`design déjà transmis, à reprendre à l'identique si retouché : ${JSON.stringify(etat.design)}`);
  }
  if (etat.carteExistante) {
    connu.push(etat.carteAnalysee ? "carte existante : analysée" : "carte existante : à analyser");
  }

  // Qualification commerciale (§ prompts/commercial.ts). Hors de CHAMPS_REQUIS
  // à dessein : elle s'affiche dès qu'un champ est connu, elle ne bloque rien.
  if (etat.clientsParSemaine !== undefined) connu.push(`clients/semaine : ${etat.clientsParSemaine}`);
  if (etat.nbPointsVente !== undefined) connu.push(`points de vente : ${etat.nbPointsVente}`);
  if (etat.panierMoyen !== undefined) connu.push(`panier moyen : ${etat.panierMoyen} €`);
  if (etat.objectifPrincipal) connu.push(`objectif principal du prospect : ${etat.objectifPrincipal}`);
  if (etat.prenom) connu.push(`prénom : ${etat.prenom}`);
  if (etat.contact) connu.push(`contact : ${etat.contact}`);

  // Le gain, calculé une fois ici et jamais par le modèle — voir
  // commercial/estimation.ts et guardrails.ts (aucun chiffre inventé).
  const gain = estimerGain({
    clientsParSemaine: etat.clientsParSemaine,
    nbPointsVente: etat.nbPointsVente,
    panierMoyen: etat.panierMoyen,
  });
  if (gain) {
    // L'euro ne s'ajoute que si le panier moyen est connu : jamais de
    // montant sans le chiffre qui l'a produit.
    const euro =
      gain.gainEuroParMois !== undefined
        ? `, soit environ ${gain.gainEuroParMois} € de plus par mois (panier moyen ${etat.panierMoyen} €)`
        : "";
    connu.push(
      `gain estimé (calculé, ${gain.hypotheseTexte}) : environ ${gain.visitesSupplementairesParMois} ` +
        `visites de plus par mois grâce au programme${euro} — annonce EXACTEMENT ce ou ces chiffres si tu en parles (§ Le gain estimé du bloc commercial), ne les recalcule jamais toi-même`,
    );
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
