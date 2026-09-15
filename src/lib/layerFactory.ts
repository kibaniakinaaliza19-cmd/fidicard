import type {
  BarcodeLayer,
  IconLayer,
  ImageLayer,
  Layer,
  QrCodeLayer,
  ShapeKind,
  ShapeLayer,
  TextLayer,
} from "@/types/layer";

let counter = 0;
export function makeId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

const base = (name: string, zIndex: number) => ({
  id: makeId("layer"),
  name,
  x: 30,
  y: 35,
  rotation: 0,
  opacity: 100,
  zIndex,
  locked: false,
  hidden: false,
  groupId: null,
});

export function createTextLayer(zIndex: number, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    ...base("Texte", zIndex),
    type: "text",
    width: 40,
    height: 10,
    content: "Votre texte",
    font: "geist",
    fontSize: 20,
    fontWeight: 600,
    italic: false,
    underline: false,
    color: "#ffffff",
    align: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
    ...overrides,
  };
}

export function createShapeLayer(zIndex: number, shape: ShapeKind, overrides: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    ...base("Forme", zIndex),
    type: "shape",
    width: 20,
    height: 20,
    shape,
    fill: "#f0653e",
    stroke: "transparent",
    strokeWidth: 0,
    radius: shape === "circle" ? 50 : 8,
    ...overrides,
  };
}

export function createIconLayer(zIndex: number, icon: string, overrides: Partial<IconLayer> = {}): IconLayer {
  return {
    ...base("Icône", zIndex),
    type: "icon",
    width: 10,
    height: 10,
    icon,
    color: "#ffffff",
    ...overrides,
  };
}

export function createImageLayer(zIndex: number, src: string, overrides: Partial<ImageLayer> = {}): ImageLayer {
  return {
    ...base("Image", zIndex),
    type: "image",
    width: 35,
    height: 35,
    src,
    brightness: 100,
    contrast: 100,
    saturate: 100,
    radius: 8,
    ...overrides,
  };
}

export function createQrCodeLayer(zIndex: number, overrides: Partial<QrCodeLayer> = {}): QrCodeLayer {
  return {
    ...base("QR Code", zIndex),
    type: "qrcode",
    width: 20,
    height: 35,
    value: "https://fidicard.app",
    fgColor: "#0a0a0a",
    bgColor: "#ffffff",
    ...overrides,
  };
}

export function createBarcodeLayer(zIndex: number, overrides: Partial<BarcodeLayer> = {}): BarcodeLayer {
  return {
    ...base("Code-barres", zIndex),
    type: "barcode",
    width: 35,
    height: 18,
    value: "1234567890",
    lineColor: "#0a0a0a",
    background: "#ffffff",
    ...overrides,
  };
}

export function cloneLayer(layer: Layer, zIndex: number): Layer {
  return {
    ...layer,
    id: makeId("layer"),
    name: `${layer.name} (copie)`,
    x: Math.min(90, layer.x + 4),
    y: Math.min(90, layer.y + 4),
    zIndex,
    groupId: null,
  };
}
