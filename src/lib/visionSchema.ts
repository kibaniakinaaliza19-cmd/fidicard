// Contrat partagé client ↔ route serveur pour l'analyse vision d'une carte.
// Le modèle de vision retourne ce JSON ; le client le convertit en calques.
// Toutes les coordonnées sont normalisées 0..1 par rapport à la carte redressée.

export interface VisionBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VisionElement {
  kind: "text" | "logo" | "icon" | "shape";
  content?: string; // texte exact si kind=text
  description?: string; // ex: "logo Instagram", "couronne stylisée"
  bbox: VisionBBox;
  color?: string;
  /** taille de police relative à la hauteur de carte (kind=text) */
  fontSize?: number;
  fontStyle?: "normal" | "italic" | "script" | "bold";
  rotation?: number;
}

export interface VisionTier {
  position: number;
  reward: string;
  rewardType?: "amount" | "percent" | "free_item" | "other";
}

export interface VisionProgram {
  detected: boolean;
  type?: "stamps" | "points";
  totalStamps?: number;
  stampShape?: "circle" | "square" | "rounded";
  stampLayout?: "grid" | "staggered" | "path";
  stampArea?: VisionBBox;
  stampPositions?: { index: number; x: number; y: number; r: number }[];
  tiers?: VisionTier[];
  instructions?: string;
  socialHandles?: string[];
  website?: string;
}

export interface VisionAnalysis {
  design?: {
    backgroundStyle?: "solid" | "gradient" | "photo" | "pattern";
    dominantColors?: string[];
    primaryTextColor?: string;
    accentColor?: string;
    overallStyle?: string;
  };
  elements: VisionElement[];
  loyaltyProgram: VisionProgram | null;
  warnings?: string[];
}

export const ANALYSIS_PROMPT = `Analyse cette carte de fidélité et retourne UNIQUEMENT un objet JSON valide,
sans texte avant ni après, sans balises markdown.

Tu dois identifier DEUX choses :
(A) tous les éléments visuels et leur position exacte
(B) la LOGIQUE du programme de fidélité

Pour (B), c'est le plus important : regarde les emplacements de tampons.
Certains contiennent du texte (ex: "-5€", "-15%", "1 offert", "50%").
Ce sont des PALIERS DE RÉCOMPENSE. Note leur position exacte dans la
séquence (le 1er tampon = position 1, en lisant de gauche à droite puis
de haut en bas) et le texte exact de la récompense.

Format attendu — toutes les coordonnées sont normalisées entre 0 et 1
(0,0 = coin haut-gauche de la carte ; 1,1 = coin bas-droit) :

{
  "design": {
    "backgroundStyle": "solid" | "gradient" | "photo" | "pattern",
    "dominantColors": ["#hex"],
    "primaryTextColor": "#hex",
    "accentColor": "#hex",
    "overallStyle": "premium" | "minimal" | "colore" | "sombre" | "vintage"
  },
  "elements": [
    {
      "kind": "text" | "logo" | "icon" | "shape",
      "content": "texte exact si kind=text",
      "description": "ex: 'logo Instagram', 'couronne stylisée'",
      "bbox": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
      "color": "#hex",
      "fontSize": 0.0,
      "fontStyle": "normal" | "italic" | "script" | "bold",
      "rotation": 0
    }
  ],
  "loyaltyProgram": {
    "detected": true,
    "type": "stamps" | "points",
    "totalStamps": 10,
    "stampShape": "circle" | "square" | "rounded",
    "stampLayout": "grid" | "staggered" | "path",
    "stampArea": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
    "stampPositions": [{ "index": 1, "x": 0.0, "y": 0.0, "r": 0.0 }],
    "tiers": [
      { "position": 3, "reward": "-5€", "rewardType": "amount" }
    ],
    "instructions": "texte de consigne s'il y en a un",
    "socialHandles": ["@handle"],
    "website": "url si présente"
  },
  "warnings": ["ce qui n'a pas pu être lu avec certitude"]
}

Règles :
- "stampPositions": x,y = CENTRE du tampon, r = rayon relatif à la largeur de carte.
- Ne recense PAS les tampons comme "elements" — ils vont uniquement dans loyaltyProgram.
- Les textes de palier écrits DANS un tampon ne vont pas non plus dans "elements" — uniquement dans "tiers".
- Si un texte est illisible ou incertain, ne l'invente pas : mets-le dans warnings.
- N'omets AUCUN autre élément visible, même les petits logos ou icônes.
- Les paliers sont la donnée la plus importante : vérifie deux fois leur position.
- "elements" bbox doivent être serrées autour de l'élément, pas approximatives.`;
