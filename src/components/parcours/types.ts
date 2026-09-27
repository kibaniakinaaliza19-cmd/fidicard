// Les 7 étapes du parcours conversationnel (voir Parcours.tsx).
//
// Contrairement à la version précédente (src/_archive/parcours-catalogue),
// ce ne sont plus 7 ÉCRANS : à partir de « commerce », tout se déroule dans
// UNE seule conversation. Ces identifiants ne servent qu'à la barre de
// progression — ils avancent d'après ce que le moteur sait déjà, jamais
// d'après un numéro d'écran.

export type NomEtape =
  | "accueil"
  | "commerce"
  | "identite"
  | "fidelite"
  | "carte"
  | "personnalisation"
  | "activation";

export const ETAPES: { id: NomEtape; label: string }[] = [
  { id: "accueil", label: "Bonjour" },
  { id: "commerce", label: "Commerce" },
  { id: "identite", label: "Identité" },
  { id: "fidelite", label: "Fidélité" },
  { id: "carte", label: "Carte" },
  { id: "personnalisation", label: "Personnalisation" },
  { id: "activation", label: "Activation" },
];
