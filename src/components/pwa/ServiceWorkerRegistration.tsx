"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker après le premier rendu.
 *
 * En développement on ne l'enregistre pas, et on désinscrit celui qui
 * traînerait : un service worker qui sert une version en cache pendant qu'on
 * code fait perdre des heures à chercher un bug qui n'existe plus.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }

    const enregistrer = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Un échec d'enregistrement n'est pas une panne : l'application
        // fonctionne, elle perd seulement le hors-ligne.
      });
    };

    // Après le chargement : l'enregistrement ne doit pas concurrencer
    // l'affichage de la première page.
    if (document.readyState === "complete") enregistrer();
    else {
      window.addEventListener("load", enregistrer);
      return () => window.removeEventListener("load", enregistrer);
    }
  }, []);

  return null;
}
