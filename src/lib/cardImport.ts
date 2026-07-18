// Moteur d'import de carte — analyse réelle, 100 % côté navigateur.
//
// Réel dès aujourd'hui :
//   • palette extraite des pixels (quantification + histogramme) ;
//   • OCR des textes avec positions exactes (tesseract.js, fra+eng) ;
//   • détection des tampons ronds (composantes connexes) ;
//   • détection du QR code (jsQR) ;
//   • effacement des textes du fond quand la zone est unie (masquage sûr).
//
// Règle d'or : ne jamais dégrader le rendu. Chaque étape est isolée dans un
// try/catch — si une détection échoue, on continue sans elle et on l'explique
// dans `warnings`. Le pire résultat possible reste « l'image en fond, rien
// détecté », jamais un visuel abîmé.
//
// Alternatives serveur si un jour la qualité client ne suffit plus (clé API +
// coût par appel) : Google Cloud Vision (OCR + logos), AWS Textract, remove.bg.
// Ce fichier est le seul point d'entrée à remplacer — l'UI ne change pas.

import { CARD_RATIO } from "@/types/layer";

/* ------------------------------------------------------------------ types */

export interface DetectedText {
  id: string;
  content: string;
  /** position en % du cadre carte (déjà paddé au ratio 85,6 × 53,98) */
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

export interface DetectedQr {
  x: number;
  y: number;
  w: number;
  h: number;
  value: string;
}

export interface ImportAnalysis {
  /** image paddée au ratio carte, textes effacés quand c'était sûr */
  backgroundDataUrl: string;
  /** image paddée, non nettoyée (pour l'écran de révision) */
  originalDataUrl: string;
  frameWidth: number;
  frameHeight: number;
  /** 6 couleurs dominantes, de la plus présente à la moins présente */
  palette: string[];
  theme: { bg: string; accent: string; text: string; sub: string };
  texts: DetectedText[];
  stamps: DetectedStamp[];
  /** couleur intérieure des tampons détectés */
  stampFill: string;
  qr: DetectedQr | null;
  lowQuality: boolean;
  warnings: string[];
}

export const ANALYSIS_STEPS = [
  "Téléversement de l'image…",
  "Cadrage & préparation…",
  "Analyse des couleurs…",
  "Lecture des textes (OCR)…",
  "Détection des tampons…",
  "Détection du QR code…",
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

/* ------------------------------------------------- normalisation & cadrage */

/** couleur moyenne du bord de l'image (pour remplir padding et rotation) */
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
  /** zone réellement occupée par la photo dans le cadre paddé */
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
}

/** pivote finement puis padde l'image au ratio exact de la carte */
function normalize(img: HTMLImageElement, fineDeg: number): Frame {
  // 1. redimensionner (l'OCR n'a pas besoin de plus de 1400 px)
  const scale = Math.min(1, 1400 / img.width);
  let w = Math.round(img.width * scale);
  let h = Math.round(img.height * scale);

  let src: HTMLCanvasElement;
  {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.drawImage(img, 0, 0, w, h);
    src = canvas;
  }

  // 2. rotation fine éventuelle (photo de travers)
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

  // 3. padding au ratio carte — indispensable : le fond est rendu en `cover`,
  //    donc seule une image déjà au bon ratio garantit l'alignement exact des
  //    calques posés par-dessus.
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

  // garder jusqu'à 6 couleurs mutuellement distinctes
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
  // accent = couleur la plus saturée nettement différente du fond
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

/* --------------------------------------------------------------- OCR réel */

interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

async function runOcr(frame: Frame): Promise<OcrLine[]> {
  const { createWorker } = await import("tesseract.js");
  // ressources auto-hébergées (copiées par scripts/setup-ocr.mjs) : pas de
  // dépendance CDN. Si elles manquent, second essai avec les CDN par défaut.
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
  // fond clair → texte = décile le plus sombre ; fond sombre → le plus clair
  const slice = ring.lum > 0.5 ? px.slice(0, Math.max(1, Math.floor(px.length * 0.1)))
                               : px.slice(-Math.max(1, Math.floor(px.length * 0.1)));
  let r = 0, g = 0, bl = 0;
  for (const p of slice) { r += p.r; g += p.g; bl += p.b; }
  return rgbToHex(r / slice.length, g / slice.length, bl / slice.length);
}

/** stats de l'anneau de pixels autour d'une bbox (pour couleur + uniformité) */
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
      if (inside) continue; // seulement l'anneau
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

/* ------------------------------------------------ tampons (blobs ronds) */

function detectStamps(frame: Frame, bgHex: string): { stamps: DetectedStamp[]; fill: string } {
  const down = 300;
  const dh = Math.round((down * frame.H) / frame.W);
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, 0, 0, down, dh);
  const { data } = ctx.getImageData(0, 0, down, dh);
  const [br, bg_, bb] = hexToRgb(bgHex);

  // 1 = pixel qui tranche avec le fond dominant
  const fg = new Uint8Array(down * dh);
  for (let i = 0; i < down * dh; i++) {
    const o = i * 4;
    if (colorDist(data[o], data[o + 1], data[o + 2], br, bg_, bb) > 65) fg[i] = 1;
  }

  // composantes connexes (flood fill itératif)
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
      // voisins 4-connexes sans wrap horizontal
      if (x > 0 && fg[p - 1] && label[p - 1] === -1) { label[p - 1] = id; stack.push(p - 1); }
      if (x < down - 1 && fg[p + 1] && label[p + 1] === -1) { label[p + 1] = id; stack.push(p + 1); }
      if (p - down >= 0 && fg[p - down] && label[p - down] === -1) { label[p - down] = id; stack.push(p - down); }
      if (p + down < down * dh && fg[p + down] && label[p + down] === -1) { label[p + down] = id; stack.push(p + down); }
    }
    comps.push(c);
  }

  // filtres « ça ressemble à un tampon » : quasi carré, bien rempli, taille plausible
  const cands = comps.filter((c) => {
    const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
    if (w < down * 0.04 || w > down * 0.17) return false;
    const ar = w / h;
    if (ar < 0.65 || ar > 1.5) return false;
    const fillRatio = c.n / (w * h);
    return fillRatio > 0.55;
  });
  if (cands.length < 3) return { stamps: [], fill: "#ffffff" };

  // ne garder que les blobs de taille homogène autour de la médiane
  const areas = cands.map((c) => (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1)).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)];
  const kept = cands.filter((c) => {
    const a = (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1);
    return a > median * 0.55 && a < median * 1.8;
  });
  if (kept.length < 3 || kept.length > 24) return { stamps: [], fill: "#ffffff" };

  // ordre de lecture (lignes puis colonnes)
  kept.sort((a, b) => {
    const ay = (a.minY + a.maxY) / 2, by = (b.minY + b.maxY) / 2;
    if (Math.abs(ay - by) > a.maxY - a.minY) return ay - by;
    return (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2;
  });

  let fr = 0, fgc = 0, fb = 0;
  for (const c of kept) { fr += c.r / c.n; fgc += c.g / c.n; fb += c.b / c.n; }
  const sx = frame.W / down, sy = frame.H / dh;
  return {
    stamps: kept.map((c) => ({
      x: ((c.minX * sx) / frame.W) * 100,
      y: ((c.minY * sy) / frame.H) * 100,
      w: (((c.maxX - c.minX + 1) * sx) / frame.W) * 100,
      h: (((c.maxY - c.minY + 1) * sy) / frame.H) * 100,
    })),
    fill: rgbToHex(fr / kept.length, fgc / kept.length, fb / kept.length),
  };
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
  const sx = frame.W / down, sy = frame.H / dh;
  const x0 = Math.min(...xs) * sx, x1 = Math.max(...xs) * sx;
  const y0 = Math.min(...ys) * sy, y1 = Math.max(...ys) * sy;
  return {
    x: (x0 / frame.W) * 100,
    y: (y0 / frame.H) * 100,
    w: ((x1 - x0) / frame.W) * 100,
    h: ((y1 - y0) / frame.H) * 100,
    value: code.data || "https://fidicard.app",
  };
}

/* --------------------------------------------------------------- analyse */

export interface AnalyzeOptions {
  /** rotation fine en degrés (-15 … 15) choisie à l'écran de cadrage */
  fineRotation?: number;
}

export async function analyzeCardImage(
  dataUrl: string,
  onStep: (stepIndex: number) => void,
  options: AnalyzeOptions = {},
): Promise<ImportAnalysis> {
  const warnings: string[] = [];
  const tick = async (i: number) => {
    onStep(i);
    // laisser l'UI respirer entre deux étapes lourdes
    await new Promise((r) => setTimeout(r, 60));
  };

  await tick(0);
  const img = await loadImage(dataUrl);

  await tick(1);
  const frame = normalize(img, options.fineRotation ?? 0);
  const lowQuality = frame.imgW < 450;
  if (lowQuality) warnings.push("Image de faible résolution — les détections peuvent être approximatives.");
  const imgRatio = frame.imgW / frame.imgH;
  if (imgRatio < CARD_RATIO * 0.72 || imgRatio > CARD_RATIO * 1.38) {
    warnings.push(
      "Le cadrage est éloigné du format carte — des bandes ont été ajoutées autour. Recadrez la photo au plus près de la carte pour un meilleur résultat.",
    );
  }
  const originalDataUrl = frame.canvas.toDataURL("image/jpeg", 0.92);

  await tick(2);
  let palette: string[] = ["#241812", "#f0653e"];
  try {
    palette = extractPalette(frame);
  } catch {
    warnings.push("Analyse des couleurs impossible sur cette image.");
  }
  const theme = themeFromPalette(palette);

  await tick(3);
  let ocrLines: OcrLine[] = [];
  try {
    ocrLines = await runOcr(frame);
  } catch {
    warnings.push(
      "Lecture des textes indisponible (le module OCR n'a pas pu se charger — vérifiez la connexion). Les textes restent dans l'image de fond.",
    );
  }

  await tick(4);
  // tampons d'abord : ils priment sur l'OCR, car une rangée de cercles vides
  // est très souvent « lue » comme du texte (OOOOO) par tesseract.
  let stampResult: { stamps: DetectedStamp[]; fill: string } = { stamps: [], fill: "#ffffff" };
  try {
    stampResult = detectStamps(frame, palette[0]);
  } catch {
    warnings.push("Détection des tampons impossible sur cette image.");
  }

  // filtrage des textes : confiance, taille plausible, contenu réel,
  // et rejet des fausses lectures de tampons
  const circleLike = /^[\sOoQq0©°()·.,_—-]+$/;
  const texts: DetectedText[] = [];
  for (const line of ocrLines) {
    const bh = line.bbox.y1 - line.bbox.y0;
    const bw = line.bbox.x1 - line.bbox.x0;
    if (line.confidence < 55) continue;
    if (bh < frame.H * 0.018 || bh > frame.H * 0.24) continue;
    if (bw < frame.W * 0.03) continue;
    if (!/[a-zA-Z0-9À-ÿ€%]{2,}/.test(line.text)) continue;
    const box = {
      x: (line.bbox.x0 / frame.W) * 100,
      y: (line.bbox.y0 / frame.H) * 100,
      w: (bw / frame.W) * 100,
      h: (bh / frame.H) * 100,
    };
    // une « ligne » qui recouvre ≥ 2 tampons est une rangée de cercles mal lue
    const stampsHit = stampResult.stamps.filter((s) => overlap(s, box) > 0.5).length;
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
  if (ocrLines.length > 0 && texts.length === 0 && stampResult.stamps.length === 0) {
    warnings.push("Aucun texte n'a pu être lu avec assez de confiance — photographiez la carte bien à plat et nette.");
  }

  await tick(5);
  let qr: DetectedQr | null = null;
  try {
    qr = await detectQr(frame);
  } catch {
    // jsQR indisponible : pas bloquant
  }

  await tick(6);
  // masquage des textes : uniquement quand l'anneau autour est uni, et jamais
  // à l'intérieur d'un tampon (le composant tampon recouvrira l'original).
  const clean = makeCanvas(frame.W, frame.H);
  clean.ctx.drawImage(frame.canvas, 0, 0);
  for (const t of texts) {
    if (stampResult.stamps.some((s) => overlap(s, t) > 0.3)) continue;
    const b = {
      x0: Math.round((t.x / 100) * frame.W) - 3,
      y0: Math.round((t.y / 100) * frame.H) - 3,
      x1: Math.round(((t.x + t.w) / 100) * frame.W) + 3,
      y1: Math.round(((t.y + t.h) / 100) * frame.H) + 3,
    };
    const ring = ringStats(frame, b);
    if (ring.std < 14) {
      clean.ctx.fillStyle = rgbToHex(ring.r, ring.g, ring.b);
      clean.ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      t.masked = true;
    }
  }
  const unmasked = texts.filter((t) => !t.masked);
  if (unmasked.length > 0) {
    warnings.push(
      `${unmasked.length} texte(s) n'ont pas pu être séparés du fond (zone non unie) — ils restent dans l'image et ne sont pas recréés par défaut, pour éviter un doublon visuel.`,
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
    stamps: stampResult.stamps,
    stampFill: stampResult.fill,
    qr,
    lowQuality,
    warnings,
  };
}

function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const min = Math.min(a.w * a.h, b.w * b.h);
  return min > 0 ? inter / min : 0;
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
