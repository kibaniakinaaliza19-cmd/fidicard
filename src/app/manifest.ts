import type { MetadataRoute } from "next";

/**
 * Manifeste d'application installable.
 *
 * Route Next (app/manifest.ts), pas un fichier statique : les valeurs restent
 * typées, donc une faute de frappe casse la compilation au lieu de casser
 * silencieusement l'installation.
 *
 * `start_url` pointe sur /accueil : c'est le tableau de bord du commerçant.
 * Le brief demandait /dashboard, qui n'existe pas dans ce projet — les routes
 * sont à la racine.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FidiCard",
    short_name: "FidiCard",
    description: "Vos cartes de fidélité digitales, et le scan au comptoir.",
    lang: "fr",
    start_url: "/accueil",
    // Le commerçant doit voir l'application, pas un navigateur avec une barre
    // d'adresse : c'est ce qui fait la différence entre un site et un outil.
    display: "standalone",
    orientation: "portrait",
    theme_color: "#2B1E1A",
    background_color: "#2B1E1A",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android rogne l'icône jusqu'à 20 % de chaque bord selon le lanceur.
      // Une icône « any » y perdrait ses coins ; la maskable est dessinée pour.
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Appui long sur l'icône : on va droit à l'écran qui sert au comptoir.
    shortcuts: [
      {
        name: "Encaisser un passage",
        short_name: "Scanner",
        url: "/scanner/camera",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Mes clients",
        short_name: "Clients",
        url: "/clients",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
