/* FidiCard — service worker.
 *
 * Écrit à la main plutôt qu'engendré par next-pwa, pour une raison précise :
 * la règle « ne jamais mettre en cache l'état de fidélité d'un client » doit
 * être lisible et vérifiable dans un seul fichier. Un compteur de tampons
 * périmé affiché au comptoir détruit la confiance du commerçant, et c'est
 * exactement le genre de bug qu'une configuration engendrée rend invisible.
 *
 * Quatre stratégies, dans cet ordre de priorité :
 *
 *   1. RÉSEAU SEUL     état de fidélité, scan, API      jamais de cache
 *   2. CACHE D'ABORD   coquille, CSS, polices, images   démarrage instantané
 *   3. RÉSEAU PUIS CACHE  listes, statistiques          lisible hors ligne
 *   4. repli hors ligne pour toute navigation qui échoue
 */

const VERSION = "v4";
const CACHE_COQUILLE = `fidicard-coquille-${VERSION}`;
const CACHE_ASSETS = `fidicard-assets-${VERSION}`;
const CACHE_DONNEES = `fidicard-donnees-${VERSION}`;
const TOUS = [CACHE_COQUILLE, CACHE_ASSETS, CACHE_DONNEES];

const PAGE_HORS_LIGNE = "/hors-ligne";

/* --------------------------------------------------------- ne jamais cacher */

/**
 * Tout ce qui porte l'état de fidélité d'un client.
 *
 * Distinction qui compte : la PAGE /clients est une coquille, elle peut être
 * gardée et consultée hors ligne. Ce sont ses DONNÉES qui ne le peuvent pas.
 * Un compteur de tampons périmé affiché au comptoir détruit la confiance ;
 * une liste de noms d'hier ne fait de mal à personne.
 *
 * En cas de doute sur une nouvelle route de données, l'ajouter ici.
 */
function estDonneeVivante(url) {
  const c = url.pathname;

  // Toute donnée passe par /api : compteurs, scans, clients. Rien de ce qui
  // sort de là ne doit être conservé.
  if (c.startsWith("/api/")) return true;

  // La page publique d'inscription montre l'état réel d'un client à l'instant
  // où il la regarde. Une version en cache lui montrerait un faux total.
  if (c.startsWith("/join/")) return true;

  return false;
}

/** Ressources stables : on les sert depuis le cache sans hésiter. */
function estAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/ocr/") ||
    /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|gif)$/i.test(url.pathname) ||
    url.origin === "https://fonts.gstatic.com"
  );
}

/* ------------------------------------------------------------- installation */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_COQUILLE)
      .then((cache) => cache.addAll([PAGE_HORS_LIGNE]))
      // Une pré-mise en cache qui échoue ne doit pas empêcher l'installation :
      // le service worker sert encore à quelque chose sans page hors ligne.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => !TOUS.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/* ------------------------------------------------------------- stratégies */

async function cacheDAbord(request, nomCache) {
  const cache = await caches.open(nomCache);
  const enCache = await cache.match(request);
  if (enCache) return enCache;
  const reponse = await fetch(request);
  if (reponse.ok) cache.put(request, reponse.clone());
  return reponse;
}

async function reseauPuisCache(request, nomCache) {
  const cache = await caches.open(nomCache);
  try {
    const reponse = await fetch(request);
    if (reponse.ok) cache.put(request, reponse.clone());
    return reponse;
  } catch (e) {
    const enCache = await cache.match(request);
    if (enCache) return enCache;
    throw e;
  }
}

/**
 * Clé de cache d'une page : le chemin seul.
 *
 * Next ajoute un paramètre `_rsc` à ses préchargements, et sa valeur change à
 * chaque build. Sans normalisation, la même page s'empile indéfiniment — on a
 * mesuré six entrées pour /carte après quelques minutes de navigation — et
 * aucune ne ressort au moment où on en a besoin.
 */
function clePage(url) {
  return new Request(new URL(url).pathname, { method: "GET" });
}

/** Une page rendue, sous quelque forme que ce soit : document ou payload RSC. */
function estPage(request, url) {
  if (request.mode === "navigate") return true;
  if (url.origin !== self.location.origin) return false;
  if (estAsset(url)) return false;
  return request.destination === "" || request.destination === "document";
}

/**
 * Le cache de pages ne doit pas grandir sans fin : un commerçant qui garde
 * l'application installée des mois ne doit pas y laisser des dizaines de
 * mégaoctets. On garde les entrées les plus récentes.
 */
const MAX_PAGES = 40;

async function limiter(nomCache, maximum) {
  const cache = await caches.open(nomCache);
  const cles = await cache.keys();
  if (cles.length <= maximum) return;
  // Les clés sortent dans l'ordre d'insertion : les premières sont les plus
  // anciennes.
  await Promise.all(cles.slice(0, cles.length - maximum).map((c) => cache.delete(c)));
}

async function navigation(request) {
  const cache = await caches.open(CACHE_DONNEES);
  try {
    const reponse = await fetch(request);
    // On garde la page visitée : c'est ce qui la rend consultable hors ligne.
    if (reponse.ok) {
      await cache.put(clePage(request.url), reponse.clone());
      await limiter(CACHE_DONNEES, MAX_PAGES);
    }
    return reponse;
  } catch {
    const enCache = await cache.match(clePage(request.url));
    if (enCache) return enCache;
    const horsLigne = await caches.match(PAGE_HORS_LIGNE);
    if (horsLigne) return horsLigne;
    return new Response("Hors ligne.", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Une extension de navigateur ou un domaine tiers ne nous regarde pas.
  if (url.origin !== self.location.origin && !estAsset(url)) return;

  // 1. Données vivantes : on ne touche à rien. Pas de cache, pas de repli.
  //    Mieux vaut une erreur réseau visible qu'un compteur faux.
  if (estDonneeVivante(url)) return;

  // 2. Pages — navigation directe comme préchargement. Les deux passent par
  //    la même clé normalisée, sinon le cache se remplit de doublons.
  if (estPage(request, url)) {
    event.respondWith(navigation(request));
    return;
  }

  // 3. Ressources stables.
  if (estAsset(url)) {
    event.respondWith(cacheDAbord(request, CACHE_ASSETS));
    return;
  }

  // 4. Le reste : frais si possible, sinon la dernière version connue.
  event.respondWith(reseauPuisCache(request, CACHE_DONNEES));
});

/* ------------------------------------------------------------------- push */

/* L'infrastructure est en place, mais AUCUNE notification n'est envoyée
 * aujourd'hui : le moteur d'automatisations n'existe pas. Ce gestionnaire
 * existe pour que la souscription soit testable de bout en bout. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let charge = {};
  try {
    charge = event.data.json();
  } catch {
    charge = { title: "FidiCard", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(charge.title || "FidiCard", {
      body: charge.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: charge.url || "/accueil" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = event.notification.data?.url || "/accueil";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      for (const client of liste) {
        if (client.url.includes(cible) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(cible);
    }),
  );
});
