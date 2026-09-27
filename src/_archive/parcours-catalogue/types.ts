// Types partagés du parcours en 7 étapes (voir Parcours.tsx).

export type NomEtape =
  | "accueil"
  | "commerce"
  | "images"
  | "couleurs"
  | "conversation"
  | "generation"
  | "activation";

export const ETAPES: { id: NomEtape; label: string }[] = [
  { id: "accueil", label: "Bonjour" },
  { id: "commerce", label: "Commerce" },
  { id: "images", label: "Images" },
  { id: "couleurs", label: "Couleurs" },
  { id: "conversation", label: "Programme" },
  { id: "generation", label: "Carte" },
  { id: "activation", label: "Lancement" },
];

/** Ce que les étapes 2 à 4 accumulent avant la première vraie question posée
 *  à voix haute (étape 5). Purement local : rien ici n'est un champ du
 *  moteur `lib/fidiia`, qui ne connaît chaque information qu'une fois
 *  transmise dans un message. */
export interface BrouillonCommerce {
  nom: string;
  secteur: string;
  prenom: string;
  contact: string;
  logo: string | null;
  photoInterieure: string | null;
  photoExterieure: string | null;
  /** Couleurs proposées puis éventuellement retouchées à l'étape 4. */
  couleurs: { accent: string; fond: string; texte: string };
}

export const BROUILLON_VIDE: BrouillonCommerce = {
  nom: "",
  secteur: "",
  prenom: "",
  contact: "",
  logo: null,
  photoInterieure: null,
  photoExterieure: null,
  couleurs: { accent: "#e0492f", fond: "#241108", texte: "#ffffff" },
};
