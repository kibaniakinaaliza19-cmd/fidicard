// Interface du fournisseur de modèle. Le reste de FidiIA ne doit JAMAIS savoir
// quel moteur est derrière : ni son nom, ni son format de requête, ni ses
// codes d'erreur. Brancher un vrai fournisseur = ajouter un fichier à côté de
// mock.ts et une ligne dans index.ts.

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

/** Description d'un outil exposé au modèle (function calling). */
export interface Tool {
  name: string;
  description: string;
  /** Schéma des paramètres, forme JSON Schema. Opaque pour le moteur. */
  parameters: Record<string, unknown>;
}

/** Appel d'outil renvoyé par le modèle. `arguments` n'est PAS encore validé. */
export interface ToolCall {
  name: string;
  arguments: unknown;
}

export interface ChatResult {
  /** Texte affiché au commerçant. */
  reply: string;
  /** Actions demandées par le modèle, brutes. Validation obligatoire ensuite.
   *  Un tour peut en contenir plusieurs — voir schemas.ts:MAX_ACTIONS_PAR_TOUR
   *  et prompts/contract.ts : c'est ce qui permet à `composer` d'arriver au
   *  même tour que l'action qui complète les informations minimales. */
  toolCalls?: ToolCall[];
  /** Tokens de sortie réellement facturés par ce tour, quand le fournisseur
   *  les communique. Sert à mesurer le coût de `composer` — voir index.ts. */
  tokensSortie?: number;
}

export interface VisionResult {
  /** Description structurée d'une image, brute. Validation obligatoire. */
  data: unknown;
}

export interface ImageResult {
  /** Data URL de l'image produite (`data:image/png;base64,…`). */
  dataUrl: string;
  /** Tokens de sortie facturés, quand le fournisseur les communique. */
  tokensSortie?: number;
}

export interface LLMProvider {
  /** Identifiant technique, utilisé pour la journalisation uniquement. */
  readonly id: string;
  chat(messages: Message[], tools: Tool[]): Promise<ChatResult>;
  vision(image: string, prompt: string): Promise<VisionResult>;
  /**
   * Génère l'HABILLAGE de la carte : fond, photo fondue, textures, typographie
   * de marque, pictogrammes — tout ce qui fait la qualité visuelle et qu'un
   * moteur de calques ne sait pas produire (polices display, script, photo
   * composite, coups de pinceau).
   *
   * Ne produit JAMAIS les éléments fonctionnels : la grille de tampons doit
   * refléter l'état réel du client, et le code-barres doit être scannable.
   * Ces deux-là restent déterministes et se superposent par-dessus — voir
   * adapters/toCardDoc.ts.
   */
  image(prompt: string, format: FormatImage): Promise<ImageResult>;
}

/** Formats acceptés par l'API d'images. `paysage` ≈ ratio d'une carte. */
export type FormatImage = "paysage" | "portrait" | "carre";
