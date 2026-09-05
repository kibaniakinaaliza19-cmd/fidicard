// Copie les ressources OCR (tesseract.js) de node_modules vers public/ocr,
// pour que la lecture des textes de l'import de carte fonctionne en local,
// sans dépendre d'un CDN externe. Lancé automatiquement après `npm install`.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "ocr");

const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // cœurs WASM (variantes LSTM — le worker choisit selon le navigateur)
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm", "core/tesseract-core-lstm.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm", "core/tesseract-core-simd-lstm.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm", "core/tesseract-core-relaxedsimd-lstm.wasm"],
  // modèles de langue français + anglais
  ["node_modules/@tesseract.js-data/fra/4.0.0/fra.traineddata.gz", "lang/fra.traineddata.gz"],
  ["node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];

let copied = 0;
for (const [src, dst] of files) {
  const from = join(root, src);
  if (!existsSync(from)) {
    console.warn(`[setup-ocr] introuvable : ${src} (l'import utilisera le CDN)`);
    continue;
  }
  const to = join(out, dst);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  copied++;
}
console.log(`[setup-ocr] ${copied}/${files.length} fichiers OCR prêts dans public/ocr`);
