// Phase 1 de l'import : trouver la carte dans la photo et la redresser.
//
// Une photo de carte contient presque toujours autre chose : la table, une
// main, une ombre, un mur. On ne veut importer QUE la carte. Approche :
//   1. estimer la couleur du fond (bords de l'image) ;
//   2. retirer le fond par remplissage depuis les bords (flood fill) ;
//   3. la plus grande composante restante = la carte ;
//   4. ses 4 coins extrêmes forment un quadrilatère ;
//   5. homographie 3×3 → carte redressée, plein cadre, au ratio exact.
//
// Si la détection n'est pas fiable (carte plein cadre, fond trop proche de la
// carte…), on renvoie detected:false et l'appelant garde l'image entière —
// l'utilisateur peut aussi ajuster les 4 coins à la main dans l'interface.

export interface CardCorners {
  /** 4 points en % de l'image source, ordre TL, TR, BR, BL */
  points: { x: number; y: number }[];
}

export interface CardDetection {
  detected: boolean;
  corners: CardCorners | null;
  confidence: number; // 0..1
}

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
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return { canvas, ctx };
}

/* ------------------------------------------------------------- détection */

export async function detectCard(dataUrl: string): Promise<CardDetection> {
  try {
    const img = await loadImage(dataUrl);
    const W = 320;
    const H = Math.max(60, Math.round((W * img.height) / img.width));
    const { ctx } = makeCanvas(W, H);
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    // le fond = tout ce qui est joignable depuis les bords avec une couleur
    // localement continue (tolérance entre pixels voisins, pas couleur fixe :
    // gère les tables en bois, dégradés, ombres douces)
    const bg = new Uint8Array(W * H);
    const stack: number[] = [];
    const push = (p: number) => {
      if (!bg[p]) {
        bg[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < W; x++) {
      push(x);
      push((H - 1) * W + x);
    }
    for (let y = 0; y < H; y++) {
      push(y * W);
      push(y * W + W - 1);
    }
    const tol = 26; // tolérance entre voisins
    while (stack.length) {
      const p = stack.pop()!;
      const o = p * 4;
      const x = p % W;
      const nb: number[] = [];
      if (x > 0) nb.push(p - 1);
      if (x < W - 1) nb.push(p + 1);
      if (p - W >= 0) nb.push(p - W);
      if (p + W < W * H) nb.push(p + W);
      for (const q of nb) {
        if (bg[q]) continue;
        const qo = q * 4;
        const d =
          Math.abs(data[o] - data[qo]) +
          Math.abs(data[o + 1] - data[qo + 1]) +
          Math.abs(data[o + 2] - data[qo + 2]);
        if (d < tol * 3) {
          bg[q] = 1;
          stack.push(q);
        }
      }
    }

    // plus grande composante non-fond = la carte
    const label = new Int32Array(W * H).fill(-1);
    let best: number[] | null = null;
    for (let start = 0; start < W * H; start++) {
      if (bg[start] || label[start] !== -1) continue;
      const comp: number[] = [];
      const st = [start];
      label[start] = 1;
      while (st.length) {
        const p = st.pop()!;
        comp.push(p);
        const x = p % W;
        const nb: number[] = [];
        if (x > 0) nb.push(p - 1);
        if (x < W - 1) nb.push(p + 1);
        if (p - W >= 0) nb.push(p - W);
        if (p + W < W * H) nb.push(p + W);
        for (const q of nb) {
          if (!bg[q] && label[q] === -1) {
            label[q] = 1;
            st.push(q);
          }
        }
      }
      if (!best || comp.length > best.length) best = comp;
    }
    if (!best) return { detected: false, corners: null, confidence: 0 };

    const areaFrac = best.length / (W * H);
    // trop petit = bruit ; trop grand = la carte occupe déjà tout le cadre
    if (areaFrac < 0.12 || areaFrac > 0.93) {
      return { detected: false, corners: null, confidence: 0 };
    }

    // coins extrêmes (robustes pour un rectangle même légèrement tourné)
    let tl = best[0], tr = best[0], br = best[0], bl = best[0];
    let tlV = Infinity, trV = -Infinity, brV = -Infinity, blV = Infinity;
    for (const p of best) {
      const x = p % W, y = (p / W) | 0;
      if (x + y < tlV) { tlV = x + y; tl = p; }
      if (x - y > trV) { trV = x - y; tr = p; }
      if (x + y > brV) { brV = x + y; br = p; }
      if (x - y < blV) { blV = x - y; bl = p; }
    }
    const pt = (p: number) => ({ x: ((p % W) / W) * 100, y: (((p / W) | 0) / H) * 100 });
    const corners = { points: [pt(tl), pt(tr), pt(br), pt(bl)] };

    // vraisemblance : le quadrilatère doit couvrir la composante (forme pleine)
    // et avoir un ratio crédible de carte
    const [a, b, c, d] = corners.points;
    const quadArea =
      Math.abs(
        (a.x * b.y - b.x * a.y) + (b.x * c.y - c.x * b.y) +
        (c.x * d.y - d.x * c.y) + (d.x * a.y - a.x * d.y),
      ) / 2 / (100 * 100);
    const fill = areaFrac / Math.max(0.0001, quadArea);
    const wTop = Math.hypot(((b.x - a.x) * img.width) / 100, ((b.y - a.y) * img.height) / 100);
    const hLeft = Math.hypot(((d.x - a.x) * img.width) / 100, ((d.y - a.y) * img.height) / 100);
    const ratio = wTop / Math.max(1, hLeft);
    const ratioOk = ratio > 1.15 && ratio < 2.1;
    const confidence = Math.max(0, Math.min(1, fill * (ratioOk ? 1 : 0.4)));

    return { detected: confidence > 0.6, corners, confidence };
  } catch {
    return { detected: false, corners: null, confidence: 0 };
  }
}

/* ---------------------------------------------------------- homographie */

/** résout le système 8×8 de l'homographie src→dst (élimination de Gauss) */
function homography(src: { x: number; y: number }[], dst: { x: number; y: number }[]): number[] | null {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // Gauss avec pivot partiel
  for (let col = 0; col < 8; col++) {
    let piv = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-9) return null;
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let c = col; c < 9; c++) A[r][c] -= f * A[col][c];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  return [...h, 1]; // h33 = 1
}

/**
 * Redresse le quadrilatère `corners` (en % de l'image) vers un rectangle
 * plein cadre de `outW` × `outH` px. Échantillonnage bilinéaire via
 * l'homographie inverse (dst → src).
 */
export async function rectifyCard(
  dataUrl: string,
  corners: CardCorners,
  outW = 1400,
  outH = Math.round(1400 / (85.6 / 53.98)),
): Promise<string | null> {
  const img = await loadImage(dataUrl);
  const sw = img.width, sh = img.height;
  const srcPts = corners.points.map((p) => ({ x: (p.x / 100) * sw, y: (p.y / 100) * sh }));
  const dstPts = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ];
  // homographie inverse : dst → src
  const Hinv = homography(dstPts, srcPts);
  if (!Hinv) return null;

  const srcC = makeCanvas(sw, sh);
  srcC.ctx.drawImage(img, 0, 0);
  const src = srcC.ctx.getImageData(0, 0, sw, sh).data;

  const out = makeCanvas(outW, outH);
  const dstImg = out.ctx.createImageData(outW, outH);
  const dd = dstImg.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w = Hinv[6] * x + Hinv[7] * y + Hinv[8];
      const sx = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / w;
      const sy = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / w;
      const o = (y * outW + x) * 4;
      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        dd[o] = dd[o + 1] = dd[o + 2] = 20;
        dd[o + 3] = 255;
        continue;
      }
      // bilinéaire
      const x0 = sx | 0, y0 = sy | 0;
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + sw * 4;
      const i11 = i01 + 4;
      for (let ch = 0; ch < 3; ch++) {
        dd[o + ch] =
          src[i00 + ch] * (1 - fx) * (1 - fy) +
          src[i10 + ch] * fx * (1 - fy) +
          src[i01 + ch] * (1 - fx) * fy +
          src[i11 + ch] * fx * fy;
      }
      dd[o + 3] = 255;
    }
  }
  out.ctx.putImageData(dstImg, 0, 0);
  return out.canvas.toDataURL("image/jpeg", 0.92);
}
