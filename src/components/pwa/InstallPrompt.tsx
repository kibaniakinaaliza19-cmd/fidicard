"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, Plus, X } from "lucide-react";

/**
 * Invite d'installation, discrète et tardive.
 *
 * Elle n'apparaît jamais à la première visite : demander l'installation à
 * quelqu'un qui ne sait pas encore ce que fait le produit, c'est se faire
 * refuser une fois pour toutes. Android ne redonne pas facilement une
 * seconde chance.
 */

const CLE_VISITES = "fidicard-visites";
const CLE_REFUS = "fidicard-install-refuse";
const VISITES_AVANT_INVITE = 2;

interface EvenementInstall extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // navigation privée, stockage bloqué : l'invite ne s'affichera pas, et
    // c'est préférable à un plantage.
  }
}

/** Déjà installée ? Alors il n'y a rien à proposer. */
function dejaInstallee(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS ne suit pas le standard et expose son propre drapeau.
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

function estIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Décision prise UNE fois, au premier rendu client, et mémorisée.
 *
 * Elle passe par un store externe plutôt que par un état posé dans un effet :
 * le compteur de visites doit s'incrémenter exactement une fois, et la valeur
 * lue pendant le rendu doit rester stable d'un rendu à l'autre.
 */
type Decision = { eligible: boolean; ios: boolean };

const AVANT_HYDRATATION: Decision = { eligible: false, ios: false };
let decision: Decision | null = null;

function evaluer(): Decision {
  if (decision) return decision;
  if (dejaInstallee() || lire(CLE_REFUS) === "1") {
    decision = AVANT_HYDRATATION;
    return decision;
  }
  const visites = Number(lire(CLE_VISITES) ?? "0") + 1;
  ecrire(CLE_VISITES, String(visites));
  decision = { eligible: visites >= VISITES_AVANT_INVITE, ios: estIOS() };
  return decision;
}

const sansAbonnement = () => () => {};

export default function InstallPrompt() {
  const { eligible, ios } = useSyncExternalStore(sansAbonnement, evaluer, () => AVANT_HYDRATATION);
  const [refuse, setRefuse] = useState(false);
  const [evenement, setEvenement] = useState<EvenementInstall | null>(null);

  useEffect(() => {
    if (!eligible) return;
    // Android confie l'invite native au site : on la garde pour la déclencher
    // au moment choisi, plutôt qu'au chargement.
    const surInvite = (e: Event) => {
      e.preventDefault();
      setEvenement(e as EvenementInstall);
    };
    window.addEventListener("beforeinstallprompt", surInvite);
    return () => window.removeEventListener("beforeinstallprompt", surInvite);
  }, [eligible]);

  // iOS n'émet jamais beforeinstallprompt : il faut expliquer le geste. Ailleurs,
  // on attend que le navigateur ait confirmé que l'installation est possible.
  const visible = eligible && !refuse && (ios || evenement !== null);
  if (!visible) return null;

  const refuser = () => {
    ecrire(CLE_REFUS, "1");
    setRefuse(true);
  };

  const installer = async () => {
    if (!evenement) return;
    await evenement.prompt();
    const { outcome } = await evenement.userChoice;
    if (outcome === "dismissed") ecrire(CLE_REFUS, "1");
    setRefuse(true);
  };

  return (
    <div
      className="fixed inset-x-3 z-[60] rounded-2xl border p-4 shadow-2xl"
      style={{
        // Au-dessus de la navigation basse, et au-dessus de la barre gestuelle.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
        background: "var(--bg-elevated)",
        borderColor: "var(--border)",
      }}
      role="dialog"
      aria-label="Installer FidiCard"
    >
      <button
        onClick={refuser}
        aria-label="Ne plus proposer"
        className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-lg"
        style={{ color: "var(--text-dim)" }}
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 pr-10">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: "var(--accent-1)" }}
        >
          <Download size={20} color="#fff" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: "var(--text)" }}>
            Installer FidiCard
          </p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-dim)" }}>
            Plein écran, démarrage instantané, scanner accessible d&apos;un geste.
          </p>

          {ios ? (
            <p
              className="mt-3 flex flex-wrap items-center gap-1.5 text-sm"
              style={{ color: "var(--text-dim)" }}
            >
              Appuyez sur
              <Share size={15} className="inline" aria-label="Partager" />
              <span style={{ color: "var(--text)" }}>Partager</span>
              puis
              <Plus size={15} className="inline" aria-hidden />
              <span style={{ color: "var(--text)" }}>Sur l&apos;écran d&apos;accueil</span>.
            </p>
          ) : (
            <button
              onClick={installer}
              className="mt-3 h-11 w-full rounded-xl px-4 font-semibold text-white"
              style={{ background: "var(--accent-1)" }}
            >
              Installer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
