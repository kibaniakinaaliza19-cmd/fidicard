// Sélection du fournisseur par variable d'environnement.
//
// Brancher un vrai moteur plus tard = ajouter un fichier à côté de mock.ts et
// une branche dans ce switch. Aucun autre fichier de FidiIA ne change.

import type { LLMProvider } from "./types.ts";
import { creerMockProvider } from "./mock.ts";

export type NomProvider = "mock";

export function nomProviderConfigure(): NomProvider {
  const brut = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.FIDIIA_PROVIDER;
  const nom = (brut ?? "mock").trim().toLowerCase();
  if (nom === "mock") return "mock";
  // Un nom inconnu ne doit pas faire tomber le produit en silence : on retombe
  // sur le simulé et on le dit dans la console serveur.
  console.warn(`[fidiia] fournisseur « ${nom} » inconnu, repli sur « mock ».`);
  return "mock";
}

export function getProvider(nom: NomProvider = nomProviderConfigure()): LLMProvider {
  switch (nom) {
    case "mock":
      return creerMockProvider();
  }
}

export type { LLMProvider };
