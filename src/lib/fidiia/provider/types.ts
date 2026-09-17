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

export interface LLMProvider {
  /** Identifiant technique, utilisé pour la journalisation uniquement. */
  readonly id: string;
  chat(messages: Message[], tools: Tool[]): Promise<ChatResult>;
  vision(image: string, prompt: string): Promise<VisionResult>;
}
