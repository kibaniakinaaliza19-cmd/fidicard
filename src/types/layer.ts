export type LayerType = "text" | "shape" | "icon" | "image" | "qrcode" | "barcode";
export type ShapeKind = "rect" | "circle" | "line" | "triangle";
export type BackgroundKind = "color" | "gradient" | "pattern" | "image";

export interface LayerBase {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  groupId: string | null;
}

export interface TextLayer extends LayerBase {
  type: "text";
  content: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
}

export interface ShapeLayer extends LayerBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface IconLayer extends LayerBase {
  type: "icon";
  icon: string;
  color: string;
}

export interface ImageLayer extends LayerBase {
  type: "image";
  src: string;
  brightness: number;
  contrast: number;
  saturate: number;
  radius: number;
}

export interface QrCodeLayer extends LayerBase {
  type: "qrcode";
  value: string;
  fgColor: string;
  bgColor: string;
}

export interface BarcodeLayer extends LayerBase {
  type: "barcode";
  value: string;
  lineColor: string;
  background: string;
}

export type Layer = TextLayer | ShapeLayer | IconLayer | ImageLayer | QrCodeLayer | BarcodeLayer;

export interface CardBackground {
  kind: BackgroundKind;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  pattern: "dots" | "diagonal" | "grid";
  patternColor: string;
  image: string | null;
  imageDim: number;
}

/* ------------------------------------------------------------------ zones */
// v2 : la partie fonctionnelle de la carte n'est plus stockée en calques
// concrets mais déclarée en « zones ». Leurs calques sont produits à chaque
// affichage par lib/loyalty/renderLayer.ts à partir de la config de fidélité
// (et de l'état du client) — jamais persistés.

export type StampShape = "cercle" | "arrondi" | "carre";

export interface ZoneFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StampGridZone {
  id: string;
  kind: "stampGrid";
  /** boîte englobante en % du canvas — la zone se manipule comme UN objet */
  frame: ZoneFrame;
  /** largeur d'un tampon en % (hauteur dérivée du ratio carte) */
  size: number;
  shape: StampShape;
  /** tampons par rangée ; "auto" = 1 rangée jusqu'à 6, sinon 2 */
  perRow: number | "auto";
  /** écrire les libellés de paliers DANS leurs tampons */
  showTierLabels: boolean;
}

export type Zone = StampGridZone;

export interface CardDoc {
  id: string;
  name: string;
  category: string;
  background: CardBackground;
  /** calques de design ; en v2 ils n'incluent plus la grille de tampons */
  layers: Layer[];
  published: boolean;
  updatedAt: number;
  /** absent ou 1 = document historique tout-en-calques */
  version?: 1 | 2;
  zones?: Zone[];
  /** copie intégrale du document d'avant migration v1→v2 (rollback) */
  design_json_v1?: CardDocV1;
}

export type CardDocV1 = Omit<CardDoc, "version" | "zones" | "design_json_v1">;

export const CARD_RATIO = 85.6 / 53.98;
