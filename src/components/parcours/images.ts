// Lecture des images du parcours (logo, photo intérieure, photo extérieure).
//
// Copié depuis AssistantChat.tsx plutôt qu'importé de là-bas : le parcours ne
// doit toucher à aucun fichier du chat existant, pour ne rien risquer sur un
// chemin qui fonctionne déjà. La duplication est petite (une trentaine de
// lignes) et volontaire.

import type { CardDoc } from "@/types/layer";

export const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_TAILLE_IMAGE_OCTETS = 8 * 1024 * 1024;

export function lireCommeDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Le moteur (`lib/fidiia`) ne connaît l'image que par son analyse de
 * couleurs — jamais le fichier réel, qui ne quitte pas le navigateur pour
 * rien d'autre que l'appel à `provider.vision()`. C'est ce correctif qui pose
 * le VRAI logo et la VRAIE photo sur la carte renvoyée par le serveur, à la
 * place des calques vides que `toCardDoc.ts` prévoit pour eux.
 */
export function integrerImagesReelles(doc: CardDoc, logo: string | null, photo: string | null): CardDoc {
  let out = doc;
  if (logo && doc.layers.some((l) => l.type === "image" && l.name === "Logo")) {
    out = { ...out, layers: out.layers.map((l) => (l.type === "image" && l.name === "Logo" ? { ...l, src: logo } : l)) };
  }
  if (photo) {
    const aUneCoucheDePhoto = out.layers.some((l) => l.type === "image" && l.name === "Photo de l'établissement");
    if (aUneCoucheDePhoto) {
      out = {
        ...out,
        layers: out.layers.map((l) =>
          l.type === "image" && l.name === "Photo de l'établissement" ? { ...l, src: photo } : l,
        ),
      };
    } else if (out.background.kind === "image") {
      out = { ...out, background: { ...out.background, image: photo } };
    }
  }
  return out;
}
