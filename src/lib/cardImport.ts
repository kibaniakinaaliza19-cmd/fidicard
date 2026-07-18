// Moteur d'import de carte — pipeline en 4 phases.
//
//   Phase 1  Détection & redressement de la carte (cardDetect.ts) : la photo
//            est détourée de son environnement (table, doigts, mur) puis
//            redressée par homographie. Coins ajustables à la main dans l'UI.
//   Phase 2  Compréhension : soit le modèle de vision via /api/analyze-card
//            (textes, logos, ET logique du programme : paliers -5€/-15%/-50%),
//            soit le moteur local (OCR tesseract + détection de formes) quand
//            aucune clé API n'est configurée. Les deux produisent la même
//            structure — l'UI ne change pas.
//   Phase 3  Reconstruction : chaque élément devient un calque indépendant
//            (importToCard.ts) posé pile sur l'original. Les logos sont
//            découpés de l'image (crop) pour devenir déplaçables.
//   Phase 4  Logique métier : le programme détecté (type, objectif, paliers,
//            consigne, réseau social) alimente les données FidiCard.
//
// Règle d'or : ne jamais dégrader le rendu. Chaque étape est isolée — si une
// détection échoue on continue sans elle et on l'explique dans `warnings`.
//
// Alternatives non implémentées (documentées à dessein) :
//   • Google Cloud Vision — OCR + logos plus précis sur texte pur, mais ne
//     comprend pas la logique métier d'une carte ; facturé à l'image.
//   • OpenCV.js — détection de contours plus robuste que notre canvas maison,
//     au prix d'un WASM de ~8 Mo.
//   • remove.bg — isolation de sujet, API payante.
// Le modèle de vision reste supérieur ici : il est le seul à comprendre le
// SENS de la carte (paliers, récompenses, consignes), pas juste ses pixels.

import { CARD_RATIO } from "@/types/layer";
import { rectifyCard, type CardCorners } from "@/lib/cardDetect";
import type { VisionAnalysis } from "@/lib/visionSchema";

/* ------------------------------------------------------------------ types */

export interface DetectedText {
  id: string;
  content: string;
  /** position en % du cadre carte */
  x: number;
  y: number;
  w: number;
  h: number;
  /** taille de police en px à l'échelle du canvas 520 px de large */
  fontSize: number;
  color: string;
  confidence: number;
  /** true = le texte a pu être effacé du fond (zone unie) */
  masked: boolean;
}

export interface DetectedStamp {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedLogo {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** découpe de l'image d'origine — devient un calque image déplaçable */
  dataUrl: string;
  description: string;
  masked: boolean;
}

export interface DetectedQr {
  x: number;
  y: number;
  w: number;
  h: number;
  value: string;
}

export interface ImportTier {
  position: number;
  reward: string;
}

/** La logique métier comprise depuis la carte (Phase 4). */
export interface ImportProgram {
  type: "tampons" | "points";
  totalStamps: number;
  tiers: ImportTier[];
  instructions?: string;
  social?: string;
  website?: string;
}

export interface ImportAnalysis {
  /** image de la carte (redressée), textes effacés quand c'était sûr */
  backgroundDataUrl: string;
  /** image de la carte (redressée), non nettoyée — pour l'écran de révision */
  originalDataUrl: string;
  frameWidth: number;
  frameHeight: number;
  palette: string[];
  theme: { bg: string; accent: string; text: string; sub: string };
  texts: DetectedText[];
  stamps: DetectedStamp[];
  stampFill: string;
  logos: DetectedLogo[];
  qr: DetectedQr | null;
  program: ImportProgram | null;
  engine: "vision" | "local";
  lowQuality: boolean;
  warnings: string[];
}

export const ANALYSIS_STEPS = [
  "Téléversement de l'image…",
  "Détection & redressement de la carte…",
  "Analyse des couleurs…",
  "Lecture des textes…",
  "Tampons & paliers de récompense…",
  "Logos & QR code…",
  "Nettoyage du fond…",
  "Reconstruction des calques…",
] as const;

/* ---------------------------------------------------------------- helpers */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  return { canvas, ctx };
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

let idc = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${++idc}`;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlap(a: Box, b: Box) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const min = Math.min(a.w * a.h, b.w * b.h);
  return min > 0 ? inter / min : 0;
}

/* ------------------------------------------------- normalisation & cadrage */

function edgeColor(ctx: CanvasRenderingContext2D, w: number, h: number): [number, number, number] {
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0, g = 0, b = 0, n = 0;
  const push = (i: number) => { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; };
  const step = Math.max(1, Math.floor(w / 60));
  for (let x = 0; x < w; x += step) { push(x * 4); push(((h - 1) * w + x) * 4); }
  const stepY = Math.max(1, Math.floor(h / 60));
  for (let y = 0; y < h; y += stepY) { push(y * w * 4); push((y * w + (w - 1)) * 4); }
  return n ? [r / n, g / n, b / n] : [20, 20, 20];
}

interface Frame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
}

/** pivote finement puis padde l'image au ratio exact de la carte */
function normalize(img: HTMLImageElement, fineDeg: number): Frame {
  const scale = Math.min(1, 1400 / img.width);
  let w = Math.round(img.width * scale);
  let h = Math.round(img.height * scale);

  let src: HTMLCanvasElement;
  {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.drawImage(img, 0, 0, w, h);
    src = canvas;
  }

  if (fineDeg !== 0) {
    const rad = (fineDeg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const rw = Math.round(w * cos + h * sin);
    const rh = Math.round(w * sin + h * cos);
    const { canvas, ctx } = makeCanvas(rw, rh);
    const [er, eg, eb] = edgeColor(src.getContext("2d", { willReadFrequently: true })!, w, h);
    ctx.fillStyle = rgbToHex(er, eg, eb);
    ctx.fillRect(0, 0, rw, rh);
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate(rad);
    ctx.drawImage(src, -w / 2, -h / 2);
    src = canvas;
    w = rw;
    h = rh;
  }

  // padding au ratio carte — le fond est rendu en `cover`, donc seule une
  // image déjà au bon ratio garantit l'alignement exact des calques.
  const ratio = w / h;
  let W = w, H = h, imgX = 0, imgY = 0;
  if (ratio > CARD_RATIO) {
    H = Math.round(w / CARD_RATIO);
    imgY = Math.round((H - h) / 2);
  } else if (ratio < CARD_RATIO) {
    W = Math.round(h * CARD_RATIO);
    imgX = Math.round((W - w) / 2);
  }
  const { canvas, ctx } = makeCanvas(W, H);
  const [er, eg, eb] = edgeColor(src.getContext("2d", { willReadFrequently: true })!, w, h);
  ctx.fillStyle = rgbToHex(er, eg, eb);
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(src, imgX, imgY);
  return { canvas, ctx, W, H, imgX, imgY, imgW: w, imgH: h };
}

/* ------------------------------------------------------- palette (réelle) */

function extractPalette(frame: Frame): string[] {
  const down = 84;
  const dh = Math.max(24, Math.round((down * frame.imgH) / frame.imgW));
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, frame.imgX, frame.imgY, frame.imgW, frame.imgH, 0, 0, down, dh);
  const { data } = ctx.getImageData(0, 0, down, dh);

  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const e = buckets.get(key);
    if (e) { e.n++; e.r += r; e.g += g; e.b += b; }
    else buckets.set(key, { n: 1, r, g, b });
  }
  const ranked = Array.from(buckets.values())
    .map((e) => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }))
    .sort((a, b) => b.n - a.n);

  const out: { r: number; g: number; b: number }[] = [];
  for (const c of ranked) {
    if (out.length >= 6) break;
    if (out.every((o) => colorDist(c.r, c.g, c.b, o.r, o.g, o.b) > 42)) out.push(c);
  }
  if (out.length === 0) out.push({ r: 24, g: 18, b: 14 });
  return out.map((c) => rgbToHex(c.r, c.g, c.b));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function themeFromPalette(palette: string[]) {
  const [br, bg_, bb] = hexToRgb(palette[0]);
  const bgLum = luminance(br, bg_, bb);
  let accent = palette[1] ?? "#f0653e";
  let best = -1;
  for (const hex of palette.slice(1)) {
    const [r, g, b] = hexToRgb(hex);
    if (colorDist(r, g, b, br, bg_, bb) < 60) continue;
    const s = saturation(r, g, b);
    if (s > best) { best = s; accent = hex; }
  }
  return {
    bg: palette[0],
    accent,
    text: bgLum > 0.55 ? "#221610" : "#FFF7EE",
    sub: bgLum > 0.55 ? "#221610aa" : "#FFF7EEaa",
  };
}

/* --------------------------------------------------------------- OCR local */

interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

async function runOcr(frame: Frame): Promise<OcrLine[]> {
  const { createWorker } = await import("tesseract.js");
  // ressources auto-hébergées (scripts/setup-ocr.mjs) ; repli CDN sinon
  let worker;
  try {
    worker = await createWorker(["fra", "eng"], undefined, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
    });
  } catch {
    worker = await createWorker(["fra", "eng"]);
  }
  try {
    const { data } = await worker.recognize(frame.canvas, {}, { blocks: true, text: true });
    const lines: OcrLine[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          lines.push({ text: line.text.replace(/\s+/g, " ").trim(), confidence: line.confidence, bbox: line.bbox });
        }
      }
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}

/** couleur du texte : les pixels qui tranchent le plus avec l'anneau autour */
function sampleTextColor(frame: Frame, b: { x0: number; y0: number; x1: number; y1: number }): string {
  const x0 = Math.max(0, b.x0), y0 = Math.max(0, b.y0);
  const w = Math.min(frame.W, b.x1) - x0, h = Math.min(frame.H, b.y1) - y0;
  if (w < 2 || h < 2) return "#ffffff";
  const { data } = frame.ctx.getImageData(x0, y0, w, h);
  const ring = ringStats(frame, b);
  const px: { l: number; r: number; g: number; b: number }[] = [];
  for (let i = 0; i < data.length; i += 4) {
    px.push({ l: luminance(data[i], data[i + 1], data[i + 2]), r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  px.sort((a, c) => a.l - c.l);
  const slice = ring.lum > 0.5 ? px.slice(0, Math.max(1, Math.floor(px.length * 0.1)))
                               : px.slice(-Math.max(1, Math.floor(px.length * 0.1)));
  let r = 0, g = 0, bl = 0;
  for (const p of slice) { r += p.r; g += p.g; bl += p.b; }
  return rgbToHex(r / slice.length, g / slice.length, bl / slice.length);
}

/** stats de l'anneau de pixels autour d'une bbox (couleur + uniformité) */
function ringStats(frame: Frame, b: { x0: number; y0: number; x1: number; y1: number }) {
  const pad = 5;
  const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
  const x1 = Math.min(frame.W, b.x1 + pad), y1 = Math.min(frame.H, b.y1 + pad);
  if (x1 - x0 < 2 || y1 - y0 < 2) return { r: 128, g: 128, b: 128, std: 999, lum: 0.5 };
  const { data } = frame.ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const w = x1 - x0, h = y1 - y0;
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = x >= b.x0 - x0 && x < b.x1 - x0 && y >= b.y0 - y0 && y < b.y1 - y0;
      if (inside) continue;
      const i = (y * w + x) * 4;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  if (rs.length === 0) return { r: 128, g: 128, b: 128, std: 999, lum: 0.5 };
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const r = mean(rs), g = mean(gs), bl = mean(bs);
  const dev = (a: number[], m: number) => Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length);
  const std = (dev(rs, r) + dev(gs, g) + dev(bs, bl)) / 3;
  return { r, g, b: bl, std, lum: luminance(r, g, bl) };
}

/* ------------------------------------- formes locales : tampons + logos */

interface BlobResult {
  stamps: DetectedStamp[];
  fill: string;
  /** grandes zones graphiques non-tampon : candidates logo (bboxes en %) */
  logoBoxes: Box[];
}

function detectBlobs(frame: Frame, bgHex: string): BlobResult {
  const down = 300;
  const dh = Math.round((down * frame.H) / frame.W);
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, 0, 0, down, dh);
  const { data } = ctx.getImageData(0, 0, down, dh);
  const [br, bg_, bb] = hexToRgb(bgHex);

  const fg = new Uint8Array(down * dh);
  for (let i = 0; i < down * dh; i++) {
    const o = i * 4;
    if (colorDist(data[o], data[o + 1], data[o + 2], br, bg_, bb) > 65) fg[i] = 1;
  }

  const label = new Int32Array(down * dh).fill(-1);
  interface Comp { minX: number; maxX: number; minY: number; maxY: number; n: number; r: number; g: number; b: number }
  const comps: Comp[] = [];
  const stack: number[] = [];
  for (let start = 0; start < down * dh; start++) {
    if (!fg[start] || label[start] !== -1) continue;
    const id = comps.length;
    const c: Comp = { minX: down, maxX: 0, minY: dh, maxY: 0, n: 0, r: 0, g: 0, b: 0 };
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % down, y = (p / down) | 0;
      c.n++;
      c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x);
      c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
      const o = p * 4;
      c.r += data[o]; c.g += data[o + 1]; c.b += data[o + 2];
      if (x > 0 && fg[p - 1] && label[p - 1] === -1) { label[p - 1] = id; stack.push(p - 1); }
      if (x < down - 1 && fg[p + 1] && label[p + 1] === -1) { label[p + 1] = id; stack.push(p + 1); }
      if (p - down >= 0 && fg[p - down] && label[p - down] === -1) { label[p - down] = id; stack.push(p - down); }
      if (p + down < down * dh && fg[p + down] && label[p + down] === -1) { label[p + down] = id; stack.push(p + down); }
    }
    comps.push(c);
  }

  const boxPct = (c: Comp): Box => ({
    x: (c.minX / down) * 100,
    y: (c.minY / dh) * 100,
    w: ((c.maxX - c.minX + 1) / down) * 100,
    h: ((c.maxY - c.minY + 1) / dh) * 100,
  });

  // tampons : quasi carrés, bien remplis, taille plausible et homogène
  const cands = comps.filter((c) => {
    const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
    if (w < down * 0.04 || w > down * 0.17) return false;
    const ar = w / h;
    if (ar < 0.65 || ar > 1.5) return false;
    return c.n / (w * h) > 0.55;
  });

  let stamps: DetectedStamp[] = [];
  let fill = "#ffffff";
  let kept: Comp[] = [];
  if (cands.length >= 3) {
    const areas = cands.map((c) => (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1)).sort((a, b) => a - b);
    const median = areas[Math.floor(areas.length / 2)];
    kept = cands.filter((c) => {
      const a = (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1);
      return a > median * 0.55 && a < median * 1.8;
    });
    // cohérence de grille : les tampons vont toujours par rangées — un
    // candidat sans aucun voisin aligné horizontalement est un logo ou une
    // décoration, pas un tampon
    if (kept.length >= 3) {
      const rowMates = (c: Comp) =>
        kept.filter(
          (o) =>
            o !== c &&
            Math.abs((o.minY + o.maxY) / 2 - (c.minY + c.maxY) / 2) < (c.maxY - c.minY) * 0.7,
        ).length;
      const grid = kept.filter((c) => rowMates(c) >= 1);
      if (grid.length >= 3) kept = grid;
    }
    if (kept.length >= 3 && kept.length <= 24) {
      kept.sort((a, b) => {
        const ay = (a.minY + a.maxY) / 2, by = (b.minY + b.maxY) / 2;
        if (Math.abs(ay - by) > a.maxY - a.minY) return ay - by;
        return (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2;
      });
      stamps = kept.map(boxPct);
      let fr = 0, fgc = 0, fb = 0;
      for (const c of kept) { fr += c.r / c.n; fgc += c.g / c.n; fb += c.b / c.n; }
      fill = rgbToHex(fr / kept.length, fgc / kept.length, fb / kept.length);
    } else {
      kept = [];
    }
  }

  // candidats logo : grandes zones graphiques qui ne sont pas des tampons
  const keptSet = new Set(kept);
  const logoBoxes = comps
    .filter((c) => !keptSet.has(c))
    .filter((c) => {
      const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
      if (w < down * 0.06 || w > down * 0.5) return false;
      if (h < dh * 0.06 || h > dh * 0.7) return false;
      return c.n > w * h * 0.18; // assez dense pour être un vrai graphique
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map(boxPct);

  return { stamps, fill, logoBoxes };
}

/**
 * Paliers écrits dans les tampons (« -5€ », « -15% », « offert »…) : le
 * passage OCR global rate ces petits textes. On découpe donc l'intérieur de
 * chaque tampon, agrandi ×3, et on le lit en mode ligne unique — bien plus
 * fiable pour comprendre le programme de la carte.
 */
async function ocrStampTiers(frame: Frame, stamps: DetectedStamp[]): Promise<ImportTier[]> {
  if (stamps.length === 0 || stamps.length > 24) return [];
  const { createWorker, PSM } = await import("tesseract.js");
  let worker;
  try {
    worker = await createWorker(["fra", "eng"], undefined, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
    });
  } catch {
    worker = await createWorker(["fra", "eng"]);
  }
  const tiers: ImportTier[] = [];
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
    for (let i = 0; i < stamps.length; i++) {
      const s = stamps[i];
      const x = (s.x / 100) * frame.W;
      const y = (s.y / 100) * frame.H;
      const w = (s.w / 100) * frame.W;
      const h = (s.h / 100) * frame.H;
      const ix = x + w * 0.1, iy = y + h * 0.1, iw = w * 0.8, ih = h * 0.8;
      if (iw < 8 || ih < 8) continue;
      const { canvas, ctx } = makeCanvas(iw * 3, ih * 3);
      ctx.imageSmoothingEnabled = true;
      // aplatir le pourtour : les coins du crop dépassent du cercle (fond de
      // carte sombre) et font lire « © » ou des barres à l'OCR. On remplit
      // tout à la couleur intérieure puis on ne dessine QUE l'ellipse inscrite.
      const cpx = frame.ctx.getImageData(
        Math.max(0, Math.round(x + w / 2)),
        Math.max(0, Math.round(y + h / 2)),
        1,
        1,
      ).data;
      ctx.fillStyle = rgbToHex(cpx[0], cpx[1], cpx[2]);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        canvas.width / 2,
        canvas.height / 2,
        ((w * 3) / 2) * 0.9,
        ((h * 3) / 2) * 0.9,
        0,
        0,
        Math.PI * 2,
      );
      ctx.clip();
      ctx.drawImage(frame.canvas, ix, iy, iw, ih, 0, 0, iw * 3, ih * 3);
      ctx.restore();

      const looksLikeReward = (t: string) => /[-−+]?\s*\d{1,3}\s*[€%$]|offert|gratuit|free/i.test(t);
      let { data } = await worker.recognize(canvas);
      let text = (data.text ?? "").replace(/\s+/g, " ").trim();
      if (!looksLikeReward(text)) {
        // second essai en mode « mot unique » — meilleur sur les très courts
        // libellés comme « -5€ »
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_WORD });
        ({ data } = await worker.recognize(canvas));
        const retry = (data.text ?? "").replace(/\s+/g, " ").trim();
        if (looksLikeReward(retry)) text = retry;
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
      }
      if (text && looksLikeReward(text)) {
        tiers.push({ position: i + 1, reward: text.replace(/[|_]/g, "").trim().slice(0, 20) });
      }
    }
  } finally {
    await worker.terminate();
  }
  return tiers;
}

/** découpe une zone de la carte en dataURL (calque image déplaçable) */
function cropBox(frame: Frame, b: Box): string {
  const x = Math.max(0, Math.round((b.x / 100) * frame.W));
  const y = Math.max(0, Math.round((b.y / 100) * frame.H));
  const w = Math.min(frame.W - x, Math.round((b.w / 100) * frame.W));
  const h = Math.min(frame.H - y, Math.round((b.h / 100) * frame.H));
  const { canvas, ctx } = makeCanvas(Math.max(2, w), Math.max(2, h));
  ctx.drawImage(frame.canvas, x, y, w, h, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

/* ----------------------------------------------------------------- QR code */

async function detectQr(frame: Frame): Promise<DetectedQr | null> {
  const jsQR = (await import("jsqr")).default;
  const down = Math.min(900, frame.W);
  const dh = Math.round((down * frame.H) / frame.W);
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, 0, 0, down, dh);
  const img = ctx.getImageData(0, 0, down, dh);
  const code = jsQR(img.data, down, dh);
  if (!code) return null;
  const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = code.location;
  const xs = [topLeftCorner.x, topRightCorner.x, bottomLeftCorner.x, bottomRightCorner.x];
  const ys = [topLeftCorner.y, topRightCorner.y, bottomLeftCorner.y, bottomRightCorner.y];
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  return {
    x: (x0 / down) * 100,
    y: (y0 / dh) * 100,
    w: ((x1 - x0) / down) * 100,
    h: ((y1 - y0) / dh) * 100,
    value: code.data || "https://fidicard.app",
  };
}

/* --------------------------------------------------------------- analyse */

export interface AnalyzeOptions {
  /** rotation fine en degrés (-15 … 15) */
  fineRotation?: number;
  /** coins de la carte dans la photo (Phase 1) — déclenche le redressement */
  corners?: CardCorners | null;
  /** résultat du modèle de vision (Phase 2 « IA ») — sinon moteur local */
  visionData?: VisionAnalysis | null;
}

export async function analyzeCardImage(
  dataUrl: string,
  onStep: (stepIndex: number) => void,
  options: AnalyzeOptions = {},
): Promise<ImportAnalysis> {
  const warnings: string[] = [];
  const vision = options.visionData ?? null;
  const tick = async (i: number) => {
    onStep(i);
    await new Promise((r) => setTimeout(r, 60));
  };

  await tick(0);

  /* — Phase 1 : redressement — */
  await tick(1);
  let workUrl = dataUrl;
  if (options.corners) {
    const rectified = await rectifyCard(dataUrl, options.corners);
    if (rectified) workUrl = rectified;
    else warnings.push("Redressement impossible — la photo entière a été conservée.");
  }
  const img = await loadImage(workUrl);
  const frame = normalize(img, options.fineRotation ?? 0);
  const lowQuality = frame.imgW < 450;
  if (lowQuality) warnings.push("Image de faible résolution — les détections peuvent être approximatives.");
  if (!options.corners) {
    const imgRatio = frame.imgW / frame.imgH;
    if (imgRatio < CARD_RATIO * 0.72 || imgRatio > CARD_RATIO * 1.38) {
      warnings.push("Le cadrage est éloigné du format carte — ajustez les coins pour détourer la carte.");
    }
  }
  const originalDataUrl = frame.canvas.toDataURL("image/jpeg", 0.92);

  /* — couleurs (toujours locales : extraction pixel exacte) — */
  await tick(2);
  let palette: string[] = ["#241812", "#f0653e"];
  try {
    palette = extractPalette(frame);
  } catch {
    warnings.push("Analyse des couleurs impossible sur cette image.");
  }
  const theme = themeFromPalette(palette);
  if (vision?.design?.accentColor && /^#[0-9a-f]{6}$/i.test(vision.design.accentColor)) {
    theme.accent = vision.design.accentColor;
  }

  /* — Phase 2 : compréhension (vision ou locale) — */
  const texts: DetectedText[] = [];
  let stamps: DetectedStamp[] = [];
  let stampFill = "#ffffff";
  let logos: DetectedLogo[] = [];
  let program: ImportProgram | null = null;

  if (vision) {
    await tick(3);
    for (const el of vision.elements ?? []) {
      if (el.kind !== "text" || !el.content?.trim() || !el.bbox) continue;
      const b: Box = { x: el.bbox.x * 100, y: el.bbox.y * 100, w: el.bbox.w * 100, h: el.bbox.h * 100 };
      const pxBox = {
        x0: (b.x / 100) * frame.W, y0: (b.y / 100) * frame.H,
        x1: ((b.x + b.w) / 100) * frame.W, y1: ((b.y + b.h) / 100) * frame.H,
      };
      texts.push({
        id: nextId("txt"),
        content: el.content.trim(),
        ...b,
        fontSize: Math.max(6, Math.round((el.fontSize ?? el.bbox.h * 0.8) * (520 / CARD_RATIO) * 0.9)),
        color: el.color && /^#[0-9a-f]{6}$/i.test(el.color) ? el.color : sampleTextColor(frame, pxBox),
        confidence: 92,
        masked: false,
      });
    }

    await tick(4);
    const prog = vision.loyaltyProgram;
    if (prog?.detected) {
      const positions = prog.stampPositions ?? [];
      // x,y = centre normalisé ; r = rayon relatif à la LARGEUR de carte.
      // En % : largeur = 2r×100 ; hauteur = 2r×100×(W/H) car l'axe vertical
      // est normalisé sur la hauteur (W/H = ratio carte).
      const ratio = frame.W / frame.H;
      stamps = positions
        .sort((a, b) => a.index - b.index)
        .map((p) => {
          const r = Math.max(0.015, Math.min(0.12, p.r ?? 0.04));
          return {
            x: (p.x - r) * 100,
            y: (p.y - r * ratio) * 100,
            w: r * 2 * 100,
            h: r * 2 * ratio * 100,
          };
        });
      // couleur intérieure réelle mesurée au centre du premier tampon
      if (stamps[0]) {
        const c = stamps[0];
        const cx = Math.round(((c.x + c.w / 2) / 100) * frame.W);
        const cy = Math.round(((c.y + c.h / 2) / 100) * frame.H);
        const d = frame.ctx.getImageData(Math.max(0, cx - 2), Math.max(0, cy - 2), 4, 4).data;
        stampFill = rgbToHex(d[0], d[1], d[2]);
      }
      program = {
        type: prog.type === "points" ? "points" : "tampons",
        totalStamps: prog.totalStamps ?? stamps.length,
        tiers: (prog.tiers ?? [])
          .filter((t) => t.position >= 1 && t.reward?.trim())
          .map((t) => ({ position: Math.round(t.position), reward: t.reward.trim() })),
        instructions: prog.instructions?.trim() || undefined,
        social: prog.socialHandles?.[0]?.trim() || undefined,
        website: prog.website?.trim() || undefined,
      };
    }

    await tick(5);
    for (const el of vision.elements ?? []) {
      if ((el.kind !== "logo" && el.kind !== "icon" && el.kind !== "shape") || !el.bbox) continue;
      const b: Box = { x: el.bbox.x * 100, y: el.bbox.y * 100, w: el.bbox.w * 100, h: el.bbox.h * 100 };
      if (b.w < 1 || b.h < 1) continue;
      if (stamps.some((s) => overlap(s, b) > 0.6)) continue; // les tampons sont gérés à part
      try {
        logos.push({
          id: nextId("logo"),
          ...b,
          dataUrl: cropBox(frame, b),
          description: el.description || (el.kind === "shape" ? "Forme" : "Logo"),
          masked: false,
        });
      } catch { /* crop impossible : on ignore ce logo */ }
    }
    logos = logos.slice(0, 8);
    for (const w of vision.warnings ?? []) warnings.push(`Lecture incertaine : ${w}`);
  } else {
    /* — moteur local : OCR + formes — */
    await tick(3);
    let ocrLines: OcrLine[] = [];
    try {
      ocrLines = await runOcr(frame);
    } catch {
      warnings.push(
        "Lecture des textes indisponible (module OCR non chargé). Les textes restent dans l'image de fond.",
      );
    }

    await tick(4);
    let blobs: BlobResult = { stamps: [], fill: "#ffffff", logoBoxes: [] };
    try {
      blobs = detectBlobs(frame, palette[0]);
    } catch {
      warnings.push("Détection des tampons impossible sur cette image.");
    }
    stamps = blobs.stamps;
    stampFill = blobs.fill;

    // filtrage OCR : confiance, taille plausible, et rejet des fausses
    // lectures de rangées de tampons (« OOOOO »)
    const circleLike = /^[\sOoQq0©°()·.,_—-]+$/;
    for (const line of ocrLines) {
      const bh = line.bbox.y1 - line.bbox.y0;
      const bw = line.bbox.x1 - line.bbox.x0;
      if (line.confidence < 55) continue;
      if (bh < frame.H * 0.018 || bh > frame.H * 0.24) continue;
      if (bw < frame.W * 0.03) continue;
      if (!/[a-zA-Z0-9À-ÿ€%]{2,}/.test(line.text)) continue;
      const box: Box = {
        x: (line.bbox.x0 / frame.W) * 100,
        y: (line.bbox.y0 / frame.H) * 100,
        w: (bw / frame.W) * 100,
        h: (bh / frame.H) * 100,
      };
      const stampsHit = stamps.filter((s) => overlap(s, box) > 0.5).length;
      if (stampsHit >= 2) continue;
      if (circleLike.test(line.text)) continue;
      texts.push({
        id: nextId("txt"),
        content: line.text,
        ...box,
        fontSize: Math.max(6, Math.round((bh / frame.H) * (520 / CARD_RATIO) * 0.74)),
        color: sampleTextColor(frame, line.bbox),
        confidence: Math.round(line.confidence),
        masked: false,
      });
    }
    if (ocrLines.length > 0 && texts.length === 0 && stamps.length === 0) {
      warnings.push("Aucun texte lu avec assez de confiance — photographiez la carte bien à plat et nette.");
    }

    // Phase 4 locale : les textes situés DANS un tampon sont des paliers
    const tiers: ImportTier[] = [];
    for (const t of texts) {
      const idx = stamps.findIndex((s) => overlap(s, t) > 0.5);
      if (idx !== -1) tiers.push({ position: idx + 1, reward: t.content });
    }
    // passe ciblée dans chaque tampon (les petits « -5€ » échappent à l'OCR global)
    try {
      const stampTiers = await ocrStampTiers(frame, stamps);
      for (const t of stampTiers) {
        if (!tiers.some((x) => x.position === t.position)) tiers.push(t);
      }
    } catch {
      warnings.push("Lecture des paliers à l'intérieur des tampons impossible.");
    }
    const social = texts.find((t) => t.content.startsWith("@"))?.content;
    if (stamps.length >= 3) {
      program = {
        type: "tampons",
        totalStamps: stamps.length,
        tiers: tiers.sort((a, b) => a.position - b.position),
        social,
      };
    }

    await tick(5);
    // logos locaux : grandes zones graphiques hors tampons et hors textes
    try {
      logos = blobs.logoBoxes
        .filter((b) => !texts.some((t) => overlap(b, t) > 0.5))
        .map((b) => ({
          id: nextId("logo"),
          ...b,
          dataUrl: cropBox(frame, b),
          description: "Zone graphique",
          masked: false,
        }));
    } catch { /* best effort */ }
  }

  // QR : toujours local (jsQR décode la vraie valeur, la vision non)
  let qr: DetectedQr | null = null;
  try {
    qr = await detectQr(frame);
  } catch { /* non bloquant */ }

  /* — Phase 3 : masquage sûr du fond — */
  await tick(6);
  const clean = makeCanvas(frame.W, frame.H);
  clean.ctx.drawImage(frame.canvas, 0, 0);
  const tryMask = (box: Box, pad = 3): boolean => {
    const b = {
      x0: Math.round((box.x / 100) * frame.W) - pad,
      y0: Math.round((box.y / 100) * frame.H) - pad,
      x1: Math.round(((box.x + box.w) / 100) * frame.W) + pad,
      y1: Math.round(((box.y + box.h) / 100) * frame.H) + pad,
    };
    const ring = ringStats(frame, b);
    if (ring.std >= 14) return false;
    clean.ctx.fillStyle = rgbToHex(ring.r, ring.g, ring.b);
    clean.ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    return true;
  };
  for (const t of texts) {
    if (stamps.some((s) => overlap(s, t) > 0.3)) continue; // jamais dans un tampon
    t.masked = tryMask(t);
  }
  for (const lg of logos) {
    lg.masked = tryMask(lg, 2);
  }
  const unmaskedTexts = texts.filter((t) => !t.masked && !stamps.some((s) => overlap(s, t) > 0.3));
  if (unmaskedTexts.length > 0) {
    warnings.push(
      `${unmaskedTexts.length} texte(s) n'ont pas pu être séparés du fond (zone non unie) — non recréés par défaut pour éviter un doublon.`,
    );
  }
  const unmaskedLogos = logos.filter((l) => !l.masked);
  if (unmaskedLogos.length > 0) {
    warnings.push(
      `${unmaskedLogos.length} logo(s) n'ont pas pu être détachés du fond — si vous les déplacez, l'original restera visible dessous. Vous pouvez le recouvrir manuellement.`,
    );
  }

  await tick(7);
  const backgroundDataUrl = clean.canvas.toDataURL("image/jpeg", 0.92);

  return {
    backgroundDataUrl,
    originalDataUrl,
    frameWidth: frame.W,
    frameHeight: frame.H,
    palette,
    theme,
    texts,
    stamps,
    stampFill,
    logos,
    qr,
    program,
    engine: vision ? "vision" : "local",
    lowQuality,
    warnings,
  };
}

/* ----------------------------------------------------------------- rotate */

export async function rotateImage(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const { canvas, ctx } = makeCanvas(img.height, img.width);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return canvas.toDataURL("image/jpeg", 0.92);
}
