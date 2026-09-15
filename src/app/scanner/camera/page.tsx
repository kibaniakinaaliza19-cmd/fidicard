"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Keyboard, ArrowLeft, Check, Gift, CircleAlert } from "lucide-react";
import { useClientsStore, type LoyaltyClient } from "@/store/clientsStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { creerScanner, type Scanner } from "@/lib/barcodeScanner";
import type { ScanResult } from "@/lib/loyalty";

/**
 * Encaissement d'un passage, à une main, debout, derrière un comptoir.
 *
 * Tout est dimensionné pour être lu à bout de bras et actionné sans regarder :
 * viseur plein écran, confirmation en très gros, retour automatique au viseur.
 * Le commerçant ne doit jamais avoir à chercher un bouton pendant qu'un client
 * attend.
 */

type Etape = "explication" | "viseur" | "resultat" | "manuel";
type Permission = "inconnue" | "accordee" | "refusee" | "indisponible";

/** Deux scans du même code à une seconde d'intervalle, c'est un rebond. */
const ANTI_REBOND_MS = 2500;
const RETOUR_AUTO_MS = 3000;

interface Issue {
  client: LoyaltyClient | null;
  resultat: ScanResult | null;
  code: string;
}

export default function ScannerCameraPage() {
  const [etape, setEtape] = useState<Etape>("explication");
  const [permission, setPermission] = useState<Permission>("inconnue");
  const [moteur, setMoteur] = useState<string>("");
  const [issue, setIssue] = useState<Issue | null>(null);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const boucleRef = useRef<number | null>(null);
  const dernierRef = useRef<{ code: string; a: number }>({ code: "", a: 0 });

  const config = useLoyaltyStore((s) => s.config);
  const findByCode = useClientsStore((s) => s.findByCode);
  const scan = useClientsStore((s) => s.scan);

  /* ------------------------------------------------------------- traitement */

  const traiter = useCallback(
    (code: string) => {
      const propre = code.trim().toUpperCase();
      if (!propre) return;

      const maintenant = Date.now();
      if (dernierRef.current.code === propre && maintenant - dernierRef.current.a < ANTI_REBOND_MS) {
        return;
      }
      dernierRef.current = { code: propre, a: maintenant };

      const client = findByCode(propre);
      if (!client) {
        setIssue({ client: null, resultat: null, code: propre });
        setEtape("resultat");
        return;
      }
      const resultat = scan(client.id, config);
      // Le client vient d'être modifié : on relit l'état à jour pour afficher
      // le compteur réel, pas celui d'avant le scan.
      const apres = useClientsStore.getState().clients.find((c) => c.id === client.id) ?? client;
      setIssue({ client: apres, resultat, code: propre });
      setEtape("resultat");

      if (resultat?.ok && typeof navigator !== "undefined" && "vibrate" in navigator) {
        // En milieu bruyant, c'est le seul retour que le commerçant perçoit.
        navigator.vibrate(resultat.paliersDeclenches.length ? [40, 60, 120] : 40);
      }
    },
    [config, findByCode, scan],
  );

  /* ---------------------------------------------------------------- caméra */

  const arreterCamera = useCallback(() => {
    if (boucleRef.current !== null) {
      cancelAnimationFrame(boucleRef.current);
      boucleRef.current = null;
    }
    fluxRef.current?.getTracks().forEach((t) => t.stop());
    fluxRef.current = null;
  }, []);

  const demarrerCamera = useCallback(async () => {
    setErreur(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermission("indisponible");
      setEtape("manuel");
      return;
    }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        // La caméra arrière : celle qu'on pointe vers la carte du client.
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      fluxRef.current = flux;
      setPermission("accordee");
      setEtape("viseur");

      const scanner = scannerRef.current ?? (await creerScanner());
      scannerRef.current = scanner;
      setMoteur(scanner.moteur);

      if (scanner.moteur === "aucun") {
        setErreur("Aucun lecteur de code disponible sur ce navigateur.");
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = flux;
      await video.play().catch(() => undefined);

      let occupe = false;
      const boucle = () => {
        boucleRef.current = requestAnimationFrame(boucle);
        if (occupe || video.readyState < 2) return;
        occupe = true;
        scanner
          .lire(video)
          .then((valeur) => {
            if (valeur) traiter(valeur);
          })
          .catch(() => undefined)
          .finally(() => {
            occupe = false;
          });
      };
      boucle();
    } catch (e) {
      const nom = (e as { name?: string }).name;
      setPermission(nom === "NotAllowedError" ? "refusee" : "indisponible");
      setEtape("manuel");
    }
  }, [traiter]);

  // Le flux vidéo se coupe dès qu'on quitte l'écran : une caméra qui reste
  // allumée en arrière-plan vide la batterie et inquiète, à juste titre.
  useEffect(() => arreterCamera, [arreterCamera]);

  useEffect(() => {
    if (etape !== "resultat") return;
    const t = setTimeout(() => {
      if (permission === "accordee") setEtape("viseur");
      else setEtape("manuel");
    }, RETOUR_AUTO_MS);
    return () => clearTimeout(t);
  }, [etape, permission]);

  /* ------------------------------------------------------------- rendu */

  const palier = issue?.resultat?.paliersDeclenches[0];
  const enTampons = config.mode === "stamps";

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{
        background: "#000",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* La vidéo occupe tout le fond, sous les couches d'interface. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: etape === "viseur" ? 1 : 0 }}
        aria-hidden
      />

      <header className="relative z-20 flex items-center justify-between p-3">
        <Link
          href="/scanner"
          aria-label="Retour"
          className="grid h-11 w-11 place-items-center rounded-full"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          <ArrowLeft size={20} />
        </Link>
        {etape === "viseur" && (
          <button
            onClick={() => {
              arreterCamera();
              setEtape("manuel");
            }}
            className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
          >
            <Keyboard size={16} /> Saisir le code
          </button>
        )}
      </header>

      <div className="relative z-10 flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          {/* --------------------------------------------- explication */}
          {etape === "explication" && (
            <motion.div
              key="explication"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col justify-end gap-4 p-6"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--accent-1)" }}>
                <Camera size={26} color="#fff" />
              </div>
              <h1 className="text-2xl font-bold text-white">Scanner la carte du client</h1>
              <p className="text-white/70">
                FidiCard va ouvrir la caméra pour lire le code de la carte. Rien n&apos;est
                enregistré ni envoyé : l&apos;image reste sur votre téléphone.
              </p>
              <button
                onClick={demarrerCamera}
                className="h-14 rounded-2xl text-lg font-semibold text-white"
                style={{ background: "var(--accent-1)" }}
              >
                Autoriser la caméra
              </button>
              <button
                onClick={() => setEtape("manuel")}
                className="h-12 rounded-2xl font-medium text-white/70"
              >
                Saisir le code à la main
              </button>
            </motion.div>
          )}

          {/* -------------------------------------------------- viseur */}
          {etape === "viseur" && (
            <motion.div
              key="viseur"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 p-6"
            >
              <div
                className="relative aspect-square w-full max-w-[300px] rounded-3xl"
                style={{ boxShadow: "0 0 0 100vmax rgba(0,0,0,0.55)" }}
              >
                {(["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl",
                   "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
                   "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl",
                   "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl"] as const).map((c) => (
                  <span key={c} className={`absolute h-10 w-10 ${c}`} style={{ borderColor: "var(--accent-1)" }} />
                ))}
              </div>
              <p className="text-center text-white/80">
                Placez le code dans le cadre.
                {moteur === "repli" && <span className="block text-sm text-white/50">Lecture logicielle</span>}
              </p>
              {erreur && <p className="text-center text-sm text-red-300">{erreur}</p>}
            </motion.div>
          )}

          {/* ------------------------------------------------ résultat */}
          {etape === "resultat" && issue && (
            <motion.div
              key="resultat"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center"
              style={{ background: palier ? "var(--accent-1)" : "rgba(0,0,0,0.88)" }}
            >
              {!issue.client ? (
                <>
                  <CircleAlert size={64} className="text-white/90" />
                  <p className="text-2xl font-bold text-white">Code inconnu</p>
                  <p className="text-white/70">
                    {issue.code} ne correspond à aucun client.
                  </p>
                </>
              ) : palier ? (
                <>
                  <Gift size={72} className="text-white" />
                  <p className="text-lg font-semibold uppercase tracking-wide text-white/80">
                    Récompense débloquée
                  </p>
                  {/* Le moment que le client regarde par-dessus l'épaule. */}
                  <p className="text-4xl font-black leading-tight text-white">{palier.description}</p>
                  <p className="text-xl font-semibold text-white/90">{issue.client.nom}</p>
                </>
              ) : issue.resultat?.ok ? (
                <>
                  <Check size={72} className="text-white" strokeWidth={3} />
                  <p className="text-4xl font-black text-white">
                    +1 {enTampons ? "tampon" : "point"}
                  </p>
                  <p className="text-2xl font-semibold text-white/90">{issue.client.nom}</p>
                  <p className="text-3xl font-bold" style={{ color: "var(--accent-1)" }}>
                    {enTampons
                      ? `${issue.client.tampons}/${config.totalStamps}`
                      : `${issue.client.points} points`}
                  </p>
                </>
              ) : (
                <>
                  <CircleAlert size={64} className="text-white/90" />
                  <p className="text-2xl font-bold text-white">Scan refusé</p>
                  <p className="text-white/70">{issue.resultat?.raison ?? "Règle non remplie."}</p>
                </>
              )}
            </motion.div>
          )}

          {/* -------------------------------------------------- manuel */}
          {etape === "manuel" && (
            <motion.div
              key="manuel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col justify-end gap-4 p-6"
              style={{ background: "rgba(0,0,0,0.9)" }}
            >
              <h1 className="text-2xl font-bold text-white">Saisir le code</h1>
              {permission === "refusee" && (
                <p className="text-white/70">
                  L&apos;accès à la caméra a été refusé. Vous pouvez l&apos;autoriser dans
                  les réglages du navigateur, ou saisir le code imprimé sur la carte.
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  traiter(saisie);
                  setSaisie("");
                }}
                className="flex flex-col gap-3"
              >
                <input
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value.toUpperCase())}
                  // Clavier majuscules sans correction : un code n'est pas un mot.
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="7F8K92"
                  aria-label="Code de la carte"
                  className="h-16 rounded-2xl px-4 text-center text-2xl font-bold tracking-[0.3em] text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <button
                  type="submit"
                  disabled={!saisie.trim()}
                  className="h-14 rounded-2xl text-lg font-semibold text-white disabled:opacity-40"
                  style={{ background: "var(--accent-1)" }}
                >
                  Valider
                </button>
              </form>
              {permission !== "indisponible" && (
                <button onClick={demarrerCamera} className="h-12 rounded-2xl font-medium text-white/70">
                  Réessayer avec la caméra
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
