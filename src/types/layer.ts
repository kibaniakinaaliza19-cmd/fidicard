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

export interface CardDoc {
  id: string;
  name: string;
  category: string;
  background: CardBackground;
  layers: Layer[];
  published: boolean;
  updatedAt: number;
}

export const CARD_RATIO = 85.6 / 53.98;
