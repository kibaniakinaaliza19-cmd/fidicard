// Les douze scénarios de référence. Données seules, aucune assertion : les
// fichiers .test.ts les consomment.
//
// Tous tournent avec le fournisseur simulé. Aucun réseau, aucune clé.
//
// Les deux scénarios de verrou sont les plus importants du lot : un échec
// là-dessus est vécu par le commerçant comme une trahison, pas comme un bug.

import type { EtatBrut } from "../state/conversationState.ts";
import type { Cible } from "../validation/schemas.ts";

export interface Scenario {
  id: string;
  titre: string;
  /** État de départ. Vide dans la plupart des cas : on part de rien. */
  depart?: EtatBrut;
  /** Messages du commerçant, dans l'ordre. */
  messages: string[];
  /** Ce qu'on attend à la fin. */
  attendu: {
    creationAutorisee?: boolean;
    secteur?: string;
    mode?: "stamps" | "points";
    objectif?: number;
    verrous?: Cible[];
    /** Une action a-t-elle été refusée au moins une fois ? */
    refusAttendu?: boolean;
    /** Un repli a-t-il été déclenché ? */
    repliAttendu?: boolean;
    /** Nombre d'appels au fournisseur, cumulé. */
    appelsMax?: number;
  };
}

export const SCENARIOS: Scenario[] = [
  {
    id: "sans-carte",
    titre: "Commerçant sans carte existante",
    messages: [
      "Je suis coiffeur",
      "Plutôt élégant",
      "10 passages",
      "Une coupe offerte",
    ],
    attendu: { secteur: "Salon de coiffure", objectif: 10, creationAutorisee: false },
  },
  {
    id: "avec-carte",
    titre: "Commerçant avec carte existante : analyse avant question",
    depart: { carteExistante: true, logo: "carte-boulangerie.jpg" },
    messages: ["Voilà ma carte"],
    attendu: { objectif: 10, appelsMax: 1 },
  },
  {
    id: "tampons",
    titre: "Système à tampons",
    messages: ["Je suis boulanger", "12 tampons"],
    attendu: { mode: undefined, objectif: 12 },
  },
  {
    id: "points",
    titre: "Système à points",
    messages: ["Institut de beauté", "Je veux un système de points"],
    attendu: { mode: "points" },
  },
  {
    id: "sans-logo",
    titre: "Carte existante sans logo",
    depart: { carteExistante: true, logo: "carte-sans-logo.jpg" },
    messages: ["Voilà ma carte"],
    attendu: { objectif: 10 },
  },
  {
    id: "avec-logo",
    titre: "Carte existante avec logo",
    depart: { carteExistante: true, logo: "carte-points.jpg" },
    messages: ["Voilà ma carte"],
    attendu: { mode: "points", objectif: 20 },
  },
  {
    id: "reponses-courtes",
    titre: "Réponses très courtes",
    messages: ["Café", "Chaud", "10", "Offert"],
    attendu: { secteur: "Café" },
  },
  {
    id: "reponses-fournies",
    titre: "Réponses très fournies : tout dans un message",
    messages: [
      "Bonjour, je tiens une pizzeria de quartier, ambiance chaleureuse, je voudrais 10 passages et la dixième pizza offerte",
    ],
    attendu: { secteur: "Pizzeria" },
  },
  {
    id: "changement-avis",
    titre: "Changement d'avis en cours de route",
    messages: ["Je suis boucher", "10 tampons", "Finalement je préfère 8 tampons"],
    attendu: { objectif: 8 },
  },
  {
    id: "verrou-pose",
    titre: "« Ne touche pas à ça » — le verrou est posé et tenu",
    messages: [
      "Je suis fleuriste",
      "Ne touche pas au logo",
      "Change seulement le logo",
    ],
    attendu: { verrous: ["logo"], refusAttendu: true },
  },
  {
    id: "modification-ciblee",
    titre: "« Change uniquement ça » — rien d'autre ne bouge",
    messages: [
      "Je suis barbier",
      "Change uniquement les couleurs",
    ],
    attendu: { verrous: [], refusAttendu: false },
  },
  {
    id: "demande-contradictoire",
    titre: "Demande contradictoire : sortie invalide, rejet puis repli",
    messages: ["Je suis garagiste", "__invalide_objectif__"],
    // 1 appel pour le premier message, 2 pour le second (appel + relance).
    // Le budget par message reste à 2 : c'est ce que vérifie la boucle de test.
    attendu: { repliAttendu: true, appelsMax: 3 },
  },
];

/** Déclencheurs de sortie invalide, exposés pour les tests de validation. */
export const DECLENCHEURS_INVALIDES = {
  objectifHorsBornes: "__invalide_objectif__",
  libelleTropLong: "__invalide_libelle__",
  actionInconnue: "__action_inconnue__",
  invalidePuisValide: "__invalide_puis_valide__",
} as const;
