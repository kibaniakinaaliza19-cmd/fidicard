import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* La pastille « N » de Next, en bas à gauche, se posait sur l'onglet
     « Accueil » et venait s'ajouter à l'interface sans rien vouloir dire pour
     un commerçant. Elle n'apparaît qu'en développement, mais c'est justement là
     qu'on regarde l'application pour la juger. Les erreurs de compilation et
     d'exécution restent signalées. */
  devIndicators: false,
};

export default nextConfig;
