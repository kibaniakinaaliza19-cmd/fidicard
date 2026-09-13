// Sélection du fournisseur par variable d'environnement.
//
// Brancher un vrai moteur = ajouter un fichier à côté de mock.ts et une branche
// dans ce switch. Aucun autre fichier de FidiIA ne change.

import type { LLMProvider } from "./types.ts";
import { creerMockProvider } from "./mock.ts";
import { creerOpenAIProvider } from "./openai.ts";

export type NomProvider = "mock" | "openai";

const CONNUS: NomProvider[] = ["mock", "openai"];

export function nomProviderConfigure(): NomProvider {
  const brut = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.FIDIIA_PROVIDER;
  const nom = (brut ?? "mock").trim().toLowerCase();
  if ((CONNUS as string[]).includes(nom)) return nom as NomProvider;
  // Un nom inconnu ne doit pas faire tomber le produit en silence : on retombe
  // sur le simulé et on le dit dans la console serveur.
  console.warn(
    `[fidiia] fournisseur « ${nom} » inconnu (connus : ${CONNUS.join(", ")}), repli sur « mock ».`,
  );
  return "mock";
}

export function getProvider(nom: NomProvider = nomProviderConfigure()): LLMProvider {
  switch (nom) {
    case "mock":
      return creerMockProvider();
    case "openai":
      // Volontairement bruyant : si la clé ou le modèle manque, mieux vaut une
      // erreur au démarrage qu'un repli silencieux sur le simulé — on croirait
      // parler à un modèle alors qu'on parle à une table de règles.
      return creerOpenAIProvider();
  }
}

export type { LLMProvider };
export { creerOpenAIProvider, listerModeles, configurationManquante } from "./openai.ts";
