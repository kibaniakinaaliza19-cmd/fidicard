// Card-import analysis engine (demo brick).
//
// What is REAL today: the colour palette is genuinely extracted from the
// uploaded image (canvas pixel sampling + quantization), plus basic quality
// checks. What is NOT real yet: OCR of texts, logo extraction and loyalty-rule
// detection need a vision AI backend — analyzeCardImage() is the single entry
// point to swap for that API call later; the whole UI flow stays unchanged.

export interface ImportPalette {
  bg: string; // dominant background colour
  bg2: string; // darker companion for the gradient
  accent: string; // most saturated distinct colour
  text: string; // readable title colour for that background
  sub: string; // softer secondary text colour
}

export interface ImportAnalysis {
  palette: ImportPalette;
  width: number;
  height: number;
  lowQuality: boolean;
  /** Pre-filled suggestions the merchant MUST verify (not real OCR yet). */
  suggested: {
    business: string;
    tagline: string;
    loyalty: "tampons" | "points";
    goal: number;
    reward: string;
    icon: string;
  };
}

export const ANALYSIS_STEPS = [
  "Téléversement de l'image…",
  "Analyse des couleurs…",
  "Détection du logo…",
  "Détection des textes…",
  "Analyse des tampons…",
  "Détection des récompenses…",
  "Reconstruction de la carte…",
  "Préparation de l'éditeur…",
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

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => n.toString(16).padStart(2, "0");
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

function darken(r: number, g: number, b: number, f: number) {
  return rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f));
}

/* ------------------------------------------------------- palette extraction */

function extractPalette(img: HTMLImageElement): ImportPalette {
  const W = 72;
  const H = Math.max(24, Math.round((W * img.height) / img.width));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  // Quantize to a 32-step grid and histogram the colours.
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue; // skip transparency
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const e = buckets.get(key);
    if (e) {
      e.n += 1; e.r += r; e.g += g; e.b += b;
    } else {
      buckets.set(key, { n: 1, r, g, b });
    }
  }
  const ranked = Array.from(buckets.values())
    .map((e) => ({ n: e.n, r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n) }))
    .sort((a, b) => b.n - a.n);

  const dominant = ranked[0] ?? { n: 1, r: 24, g: 16, b: 10 };

  // Accent = most saturated colour clearly different from the background.
  const accentCand = ranked
    .filter((c) => {
      const dr = c.r - dominant.r, dg = c.g - dominant.g, db = c.b - dominant.b;
      return Math.sqrt(dr * dr + dg * dg + db * db) > 60 && c.n > 3;
    })
    .sort((a, b) => saturation(b.r, b.g, b.b) - saturation(a.r, a.g, a.b))[0];

  const bgLum = luminance(dominant.r, dominant.g, dominant.b);
  const text = bgLum > 0.55 ? "#241812" : "#FFF6EC";
  const sub = bgLum > 0.55 ? "#241812aa" : "#FFF6ECaa";

  return {
    bg: rgbToHex(dominant.r, dominant.g, dominant.b),
    bg2: darken(dominant.r, dominant.g, dominant.b, 0.45),
    accent: accentCand ? rgbToHex(accentCand.r, accentCand.g, accentCand.b) : "#f0653e",
    text,
    sub,
  };
}

/* --------------------------------------------------------------- analysis */

export async function analyzeCardImage(
  dataUrl: string,
  onStep: (stepIndex: number) => void,
): Promise<ImportAnalysis> {
  const stepDelay = 320; // staged so the merchant sees what the system does
  const img = await loadImage(dataUrl);

  for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
    onStep(i);
    await new Promise((r) => setTimeout(r, stepDelay));
  }

  const palette = extractPalette(img);
  const lowQuality = img.width < 300 || img.height < 200;

  return {
    palette,
    width: img.width,
    height: img.height,
    lowQuality,
    suggested: {
      business: "MON COMMERCE",
      tagline: "Carte de fidélité",
      loyalty: "tampons",
      goal: 10,
      reward: "Une récompense offerte à la 10ᵉ visite",
      icon: "Gift",
    },
  };
}

/* ----------------------------------------------------------------- rotate */

export async function rotateImage(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.height;
  canvas.height = img.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return canvas.toDataURL("image/jpeg", 0.92);
}
