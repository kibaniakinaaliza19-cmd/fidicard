// Lecture de code-barres depuis un flux vidéo.
//
// Deux chemins, dans cet ordre :
//   1. BarcodeDetector, natif, présent sur Chrome Android et Edge. Rapide,
//      sans dépendance, sans téléchargement.
//   2. jsQR en repli, chargé À LA DEMANDE depuis node_modules seulement si le
//      natif manque — c'est le cas de Safari iOS aujourd'hui.
//
// Le repli n'est pas une dépendance obligatoire : si le paquet n'est pas
// installé, le scanner bascule sur la saisie manuelle au lieu de tomber.

export type MoteurScan = "natif" | "repli" | "aucun";

interface DetecteurNatif {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

interface FenetreAvecDetecteur {
  BarcodeDetector?: new (options?: { formats?: string[] }) => DetecteurNatif;
}

/** Formats utiles au comptoir : le code client, quel que soit son support. */
const FORMATS = ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "itf", "pdf417"];

export interface Scanner {
  readonly moteur: MoteurScan;
  /** Renvoie le contenu lu, ou null si rien n'est visible sur cette image. */
  lire(source: HTMLVideoElement): Promise<string | null>;
}

async function creerNatif(): Promise<Scanner | null> {
  const w = globalThis as unknown as FenetreAvecDetecteur;
  if (!w.BarcodeDetector) return null;
  try {
    const detecteur = new w.BarcodeDetector({ formats: FORMATS });
    return {
      moteur: "natif",
      async lire(video) {
        const codes = await detecteur.detect(video);
        return codes[0]?.rawValue ?? null;
      },
    };
  } catch {
    // Certains navigateurs exposent la classe mais refusent nos formats.
    return null;
  }
}

async function creerRepli(): Promise<Scanner | null> {
  try {
    const mod = (await import("jsqr")).default;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    return {
      moteur: "repli",
      async lire(video) {
        const l = video.videoWidth;
        const h = video.videoHeight;
        if (!l || !h) return null;
        // On analyse une image réduite : à pleine résolution, jsQR fait
        // tomber la cadence sous 5 images par seconde sur un téléphone
        // d'entrée de gamme, et le viseur devient inutilisable.
        const echelle = Math.min(1, 640 / Math.max(l, h));
        canvas.width = Math.round(l * echelle);
        canvas.height = Math.round(h * echelle);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = mod(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        return code?.data ?? null;
      },
    };
  } catch {
    return null;
  }
}

/**
 * Choisit le meilleur moteur disponible. Ne lève jamais : un scanner absent
 * est un cas normal, traité par la saisie manuelle.
 */
export async function creerScanner(): Promise<Scanner> {
  return (
    (await creerNatif()) ??
    (await creerRepli()) ?? { moteur: "aucun", async lire() { return null; } }
  );
}
