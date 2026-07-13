"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Info,
  Lock,
  Rocket,
  Download,
  CreditCard,
  PartyPopper,
  RefreshCw,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { usePublishStore } from "@/store/publishStore";
import { usePublishHydration, useCardCreated } from "@/lib/usePublish";
import { getConfigSteps, configProgress } from "@/lib/configSteps";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";

const DEMO_CODE = "7F8K92";
const JOIN_URL = `https://fidicard.com/join/${DEMO_CODE}`;

/* Serialize the on-screen QR <svg> to a downloadable PNG. */
function downloadQrPng(svg: SVGSVGElement | null, filename: string, onDone: () => void) {
  if (!svg) return;
  const size = 720;
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
    onDone();
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
}

export default function ScannerPage() {
  usePublishHydration();
  const published = usePublishStore((s) => s.published);
  const publish = usePublishStore((s) => s.publish);
  const unpublish = usePublishStore((s) => s.unpublish);
  const cardCreated = useCardCreated();
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const pushToast = useUIStore((s) => s.pushToast);

  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  const steps = getConfigSteps(published, cardCreated);
  const pct = configProgress(steps);
  const preSteps = steps.filter((s) => s.key !== "publish");
  const canPublish = preSteps.every((s) => s.done);

  function copyLink() {
    navigator.clipboard?.writeText(JOIN_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePublish() {
    if (!canPublish || publishing) return;
    setPublishing(true);
    setTimeout(() => {
      publish();
      setPublishing(false);
      setJustPublished(true);
      pushToast("Votre programme est en ligne 🎉");
      setTimeout(() => setJustPublished(false), 2600);
    }, 1100);
  }

  function downloadPng() {
    downloadQrPng(qrRef.current, `fidicard-qr-${DEMO_CODE}.png`, () => pushToast("QR code téléchargé (PNG)."));
  }

  return (
    <div>
      <PageHeader
        title="Votre QR d'inscription"
        subtitle="Affichez ce QR code en caisse. Vos clients le scannent pour rejoindre votre programme."
      />

      <div className="px-8 pb-12">
        {/* demo banner */}
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs"
          style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
        >
          <Info size={14} className="text-[var(--accent-1)]" />
          Le NFC deviendra le système principal ; le QR Code reste la solution alternative. L&rsquo;inscription client
          fonctionne en démo — la synchronisation Wallet arrive dans une prochaine brique.
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* -------- QR card (locked / active) -------- */}
          <div
            className="relative flex flex-col items-center overflow-hidden rounded-3xl border p-8"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <div className="relative">
              <div className="rounded-2xl bg-white p-5 shadow-2xl" style={{ filter: published ? "none" : "blur(7px)" }}>
                <QRCodeSVG ref={qrRef} value={JOIN_URL} size={220} bgColor="#ffffff" fgColor="#1A1210" level="M" />
              </div>

              {!published && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl" style={{ background: "rgba(10,10,10,0.35)" }}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--panel)", border: "1px solid var(--border-strong)" }}>
                    <Lock size={20} className="text-[var(--accent-1)]" />
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--panel)", color: "var(--text)" }}>
                    QR verrouillé
                  </span>
                </div>
              )}
            </div>

            {published ? (
              <span className="mt-5 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(76,175,125,0.15)", color: "#4CAF7D" }}>
                <Check size={13} /> Programme publié
              </span>
            ) : (
              <span className="mt-5 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(245,245,244,0.06)", color: "var(--text-faint)" }}>
                <Lock size={12} /> Non publié
              </span>
            )}

            <p className="mt-2 text-sm" style={{ color: "var(--text-faint)" }}>
              fidicard.com/join/{DEMO_CODE}
            </p>

            <div className="mt-5 flex w-full flex-col gap-2">
              <button
                onClick={published ? downloadPng : undefined}
                disabled={!published}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-transform disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: published ? "0 8px 20px -8px var(--accent-glow)" : "none" }}
              >
                <Download size={15} /> Télécharger le QR (PNG)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={published ? copyLink : undefined}
                  disabled={!published}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--border-strong)] disabled:hover:text-[var(--text)]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                >
                  {copied ? <><Check size={15} className="text-green-500" /> Copié</> : <><Copy size={15} /> Copier</>}
                </button>
                <Link
                  href={`/join/${DEMO_CODE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                >
                  <ExternalLink size={15} /> Aperçu
                </Link>
              </div>
            </div>
          </div>

          {/* -------- right column: gate or how-it-works -------- */}
          <AnimatePresence mode="wait">
            {!published ? (
              <motion.div
                key="gate"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border p-8"
                style={{ borderColor: "var(--border)", background: "var(--panel)" }}
              >
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Configuration du commerce</h2>
                <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                  Votre QR Code est généré automatiquement une fois toutes les étapes terminées.
                </p>

                <div className="mt-5 mb-5 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(245,245,244,0.10)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, var(--accent-1), var(--accent-2))" }}
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>{pct}%</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {steps.map((step) => (
                    <div key={step.key} className="flex items-center gap-2.5 text-sm">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: step.done ? "rgba(76,175,125,0.15)" : "rgba(245,245,244,0.06)",
                          color: step.done ? "#4CAF7D" : "var(--text-faint)",
                        }}
                      >
                        {step.done ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <span style={{ color: step.done ? "var(--text)" : "var(--text-dim)" }}>{step.label}</span>
                      {step.key === "card" && !step.done && (
                        <Link href="/carte" className="ml-auto flex items-center gap-1 text-xs font-medium text-[var(--accent-1)]">
                          <CreditCard size={13} /> Créer
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handlePublish}
                  disabled={!canPublish || publishing}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 10px 24px -8px var(--accent-glow)" }}
                >
                  {publishing ? <RefreshCw size={16} className="animate-spin" /> : <Rocket size={16} />}
                  {publishing ? "Publication…" : "Publier mon programme"}
                </button>
                {!canPublish && (
                  <p className="mt-2 text-center text-xs" style={{ color: "var(--text-faint)" }}>
                    Terminez la création de votre carte pour publier.
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="how"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border p-8"
                style={{ borderColor: "var(--border)", background: "var(--panel)" }}
              >
                <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                  <QrCode size={16} className="text-[var(--accent-1)]" /> Comment ça marche
                </h2>
                <ol className="mt-5 space-y-5">
                  {[
                    { t: "Le client scanne le QR", d: "Avec l'appareil photo de son téléphone — aucune application à installer." },
                    { t: "Il remplit ses infos en 30 secondes", d: "Prénom, nom, téléphone, email, anniversaire. Pas de mot de passe." },
                    { t: "Sa carte est créée", d: "Il apparaît aussitôt dans votre fichier client, carte active." },
                    { t: "Il ajoute la carte à son Wallet", d: "Apple Wallet / Google Wallet (bientôt disponible)." },
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(140deg, var(--accent-1), var(--accent-2))" }}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{step.t}</p>
                        <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--text-dim)" }}>{step.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={() => { unpublish(); pushToast("Programme dépublié — le QR est de nouveau verrouillé."); }}
                  className="mt-6 text-xs font-medium transition-colors hover:text-[#E8503D]"
                  style={{ color: "var(--text-faint)" }}
                >
                  Dépublier le programme
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* success flash */}
      <AnimatePresence>
        {justPublished && !reduceMotion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              className="flex items-center gap-3 rounded-2xl border px-6 py-4 shadow-2xl"
              style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}
            >
              <PartyPopper size={22} className="text-[var(--accent-1)]" />
              <span className="text-base font-semibold" style={{ color: "var(--text)" }}>
                Votre programme est prêt !
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
