// Notifications push — infrastructure seulement.
//
// AUCUNE notification n'est envoyée aujourd'hui : le moteur d'automatisations
// n'existe pas. Ce module existe pour que la souscription soit en place et
// testable le jour où il arrivera.
//
// Règle de moment : la permission n'est JAMAIS demandée au lancement. Elle
// l'est quand le commerçant active une fonction qui en dépend — sinon il
// refuse par réflexe, et le navigateur ne redemande plus.

export type EtatPush =
  | "non-supporte"
  | "non-demandee"
  | "accordee"
  | "refusee"
  | "souscrite";

export function pushSupporte(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function etatPush(): Promise<EtatPush> {
  if (!pushSupporte()) return "non-supporte";
  if (Notification.permission === "denied") return "refusee";
  if (Notification.permission === "default") return "non-demandee";
  const reg = await navigator.serviceWorker.ready;
  const abonnement = await reg.pushManager.getSubscription();
  return abonnement ? "souscrite" : "accordee";
}

/** La clé publique VAPID. Absente aujourd'hui : rien n'est encore envoyé. */
function clePublique(): string | undefined {
  // Publique par nature — elle peut être exposée au client, contrairement à
  // la clé privée, qui ne doit jamais quitter le serveur.
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function base64VersUint8(base64: string): Uint8Array<ArrayBuffer> {
  const complement = "=".repeat((4 - (base64.length % 4)) % 4);
  const propre = (base64 + complement).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(propre);
  // Tampon explicite : `applicationServerKey` exige un ArrayBuffer, pas un
  // SharedArrayBuffer, et Uint8Array.from ne le garantit pas au type.
  const octets = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
  return octets;
}

/**
 * Demande la permission puis souscrit. À n'appeler que depuis un geste
 * explicite du commerçant, jamais au chargement d'une page.
 */
export async function souscrirePush(): Promise<
  { ok: true; abonnement: PushSubscription } | { ok: false; motif: string }
> {
  if (!pushSupporte()) return { ok: false, motif: "Navigateur sans notifications push." };

  const cle = clePublique();
  if (!cle) {
    return {
      ok: false,
      motif:
        "Aucune clé VAPID configurée. L'envoi de notifications n'est pas encore actif.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, motif: "Permission refusée." };

  const reg = await navigator.serviceWorker.ready;
  const existant = await reg.pushManager.getSubscription();
  if (existant) return { ok: true, abonnement: existant };

  const abonnement = await reg.pushManager.subscribe({
    // Sans ce drapeau, le navigateur refuse la souscription : on s'engage à
    // n'envoyer que des notifications visibles, jamais de push silencieux.
    userVisibleOnly: true,
    applicationServerKey: base64VersUint8(cle),
  });

  await enregistrerAbonnement(abonnement);
  return { ok: true, abonnement };
}

export async function desabonnerPush(): Promise<void> {
  if (!pushSupporte()) return;
  const reg = await navigator.serviceWorker.ready;
  const abonnement = await reg.pushManager.getSubscription();
  await abonnement?.unsubscribe();
}

/**
 * Transmet l'abonnement au serveur.
 *
 * La route n'existe pas encore : tant qu'elle manque, on garde l'abonnement
 * en local pour ne pas perdre la souscription, et on ne fait rien d'autre.
 */
async function enregistrerAbonnement(abonnement: PushSubscription): Promise<void> {
  try {
    localStorage.setItem("fidicard-push-abonnement", JSON.stringify(abonnement.toJSON()));
  } catch {
    // stockage indisponible : sans conséquence, la souscription vit dans le
    // navigateur de toute façon.
  }
}
