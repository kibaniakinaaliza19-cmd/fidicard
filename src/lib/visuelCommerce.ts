/**
 * Les visuels que le commerçant joint à la conversation : son logo, une photo
 * de son enseigne ou de sa vitrine.
 *
 * Tout est rematérialisé avant d'entrer dans l'application. Le fichier reçu
 * n'est jamais réutilisé tel quel : il est décodé en image, redessiné sur un
 * canevas aux dimensions voulues, puis réencodé. Ce détour n'est pas un confort
 * de taille de fichier, c'est la barrière de sécurité — un SVG est un document
 * qui peut porter du script, et redessiner une image sur un canevas ne garde
 * que des pixels. Les types vectoriels sont refusés en amont, et le passage par
 * le canevas rattrape ce qu'un type déclaré à tort laisserait passer.
 *
 * Rien ne quitte le navigateur : l'image vit dans la carte, en data-URL. Elle
 * n'est pas envoyée au modèle.
 */

/** Ce que le navigateur sait décoder sans risque de document actif. */
const TYPES_ACCEPTES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

/** Au-delà, c'est une photo d'appareil non retouchée : on refuse avant de lire. */
const POIDS_MAX = 12 * 1024 * 1024;

export type SorteVisuel = "logo" | "photo";

export interface Visuel {
  sorte: SorteVisuel;
  /** image rematérialisée, prête à être posée sur la carte */
  dataUrl: string;
  /** nom d'origine, pour le dire au commerçant */
  nom: string;
}

export class VisuelRefuse extends Error {}

/* Un logo reste petit et doit garder sa transparence : PNG.
   Une photo de fond couvre la carte et n'en a pas besoin : JPEG, bien plus
   léger à poids d'écran égal. */
const RENDU: Record<SorteVisuel, { cote: number; type: string; qualite: number }> = {
  logo: { cote: 512, type: "image/png", qualite: 0.92 },
  photo: { cote: 1280, type: "image/jpeg", qualite: 0.82 },
};

function chargerImage(fichier: File): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resoudre(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rejeter(new VisuelRefuse("Ce fichier n'est pas une image que je sais lire."));
    };
    img.src = url;
  });
}

/**
 * Le fichier choisi, ramené à une image sûre et à la bonne taille.
 *
 * @throws VisuelRefuse — le message porté est destiné au commerçant, tel quel.
 */
export async function lireVisuel(fichier: File, sorte: SorteVisuel): Promise<Visuel> {
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    throw new VisuelRefuse(
      "Je prends les images en PNG, JPEG, WEBP, GIF ou AVIF. Les fichiers vectoriels et les PDF ne passent pas.",
    );
  }
  if (fichier.size > POIDS_MAX) {
    throw new VisuelRefuse("Cette image dépasse 12 Mo. Une version plus légère fera très bien l'affaire.");
  }

  const img = await chargerImage(fichier);
  const { cote, type, qualite } = RENDU[sorte];

  // On ne grandit jamais une image : agrandir n'ajoute aucun détail et ne
  // produit que du flou sur la carte imprimée à l'écran.
  const facteur = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
  const largeur = Math.max(1, Math.round(img.naturalWidth * facteur));
  const hauteur = Math.max(1, Math.round(img.naturalHeight * facteur));

  const canevas = document.createElement("canvas");
  canevas.width = largeur;
  canevas.height = hauteur;

  const ctx = canevas.getContext("2d");
  if (!ctx) throw new VisuelRefuse("Votre navigateur n'a pas pu préparer l'image.");

  // Un JPEG n'a pas de transparence : sans ce fond, les zones transparentes
  // d'un PNG ressortent en noir.
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largeur, hauteur);
  }
  ctx.drawImage(img, 0, 0, largeur, hauteur);

  return {
    sorte,
    dataUrl: canevas.toDataURL(type, qualite),
    nom: fichier.name.slice(0, 60),
  };
}
