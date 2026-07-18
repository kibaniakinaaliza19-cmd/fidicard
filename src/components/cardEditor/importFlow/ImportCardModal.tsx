"use client";

import { useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  RotateCw,
  ScanSearch,
  Check,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Info,
  Eye,
  EyeOff,
  Type,
  CircleDot,
  QrCode,
  Barcode,
  ImageIcon,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useUIStore } from "@/store/uiStore";
import { useCardStore } from "@/store/cardStore";
import { CARD_RATIO } from "@/types/layer";
import {
  analyzeCardImage,
  ANALYSIS_STEPS,
  rotateImage,
  type ImportAnalysis,
} from "@/lib/cardImport";
import { defaultChoices, importToCard, type ImportChoices } from "@/lib/importToCard";

type Step = "upload" | "adjust" | "analyzing" | "review";

const MAX_SIZE = 8 * 1024 * 1024; // 8 Mo

export default function ImportCardModal() {
  const open = useUIStore((s) => s.importCardOpen);
  const setOpen = useUIStore((s) => s.setImportCardOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const applyTemplate = useCardStore((s) => s.applyTemplate);

  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [fineDeg, setFineDeg] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [choices, setChoices] = useState<ImportChoices | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setImage(null);
    setFineDeg(0);
    setError(null);
    setProgress(0);
    setAnalysis(null);
    setChoices(null);
    setShowOverlay(true);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 250); // laisser l'animation de sortie se jouer
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError("Ce fichier dépasse 8 Mo. Choisissez une image plus légère ou reprenez la photo.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Impossible de lire ce fichier. Essayez une autre image (JPG, PNG, WebP).");
    reader.onload = () => {
      setError(null);
      setFineDeg(0);
      setImage(reader.result as string);
      setStep("adjust");
    };
    reader.readAsDataURL(file);
  }

  async function quarterTurn() {
    if (!image) return;
    setImage(await rotateImage(image));
  }

  async function launchAnalysis() {
    if (!image) return;
    setStep("analyzing");
    setProgress(0);
    setError(null);
    try {
      const result = await analyzeCardImage(image, (i) => setProgress(i), { fineRotation: fineDeg });
      setAnalysis(result);
      setChoices(defaultChoices(result));
      setStep("review");
    } catch {
      setError("L'analyse a échoué — l'image semble illisible. Reprenez une photo plus nette et bien éclairée.");
      setStep("upload");
    }
  }

  // aperçu en direct de la carte reconstruite, recalculé à chaque choix
  const previewDoc = useMemo(() => {
    if (!analysis || !choices) return null;
    return importToCard(analysis, choices);
  }, [analysis, choices]);

  const elementCount = previewDoc?.layers.length ?? 0;

  function createCard() {
    if (!analysis || !choices) return;
    applyTemplate(importToCard(analysis, choices));
    pushToast(
      elementCount > 0
        ? `Carte importée — ${elementCount} élément(s) sélectionnables + le fond.`
        : "Carte importée en fond — ajoutez vos éléments par-dessus.",
    );
    close();
  }

  function importAsBackground() {
    if (!analysis) return;
    applyTemplate(
      importToCard(analysis, {
        ...defaultChoices(analysis),
        texts: analysis.texts.map((t) => ({ id: t.id, keep: false, content: t.content })),
        convertStamps: false,
        qrMode: "keep",
        addFidiQr: false,
        addBarcode: false,
      }),
    );
    pushToast("Image importée en fond de carte.");
    close();
  }

  const patch = (p: Partial<ImportChoices>) => setChoices((c) => (c ? { ...c, ...p } : c));

  return (
    <Modal
      open={open}
      onClose={close}
      title="Importer ma carte existante"
      subtitle="Votre carte devient une carte FidiCard : chaque élément détecté est recréé, sélectionnable et modifiable."
      wide
    >
      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "rgba(232,80,61,0.35)", background: "rgba(232,80,61,0.08)", color: "#E8503D" }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ---------------- 1 · téléversement ---------------- */}
      {step === "upload" && (
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed py-12 transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <UploadCloud size={36} className="text-[var(--accent-1)]" />
            <span className="text-sm font-semibold">Choisir une image ou prendre une photo</span>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              JPG, PNG, WebP · 8 Mo maximum
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <div
            className="mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed"
            style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
          >
            <Info size={14} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
            <span>
              L&rsquo;analyse tourne <strong>entièrement dans votre navigateur</strong> : couleurs, textes (OCR), tampons
              et QR code sont détectés puis recréés en éléments modifiables. Rien n&rsquo;est envoyé sur un serveur.
              Conseil : photographiez la carte à plat, bien éclairée, sans reflet.
            </span>
          </div>
        </div>
      )}

      {/* ---------------- 2 · cadrage ---------------- */}
      {step === "adjust" && image && (
        <div className="flex flex-col items-center">
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-strong)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Votre carte"
              className="max-h-[280px] w-auto max-w-full object-contain transition-transform"
              style={{ transform: `rotate(${fineDeg}deg)` }}
            />
          </div>

          <label className="mt-4 flex w-full max-w-sm items-center gap-3 text-xs" style={{ color: "var(--text-dim)" }}>
            <span className="w-24 shrink-0">Redresser {fineDeg !== 0 ? `(${fineDeg}°)` : ""}</span>
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={fineDeg}
              onChange={(e) => setFineDeg(Number(e.target.value))}
              className="w-full accent-[var(--accent-1)]"
            />
            <button
              onClick={() => setFineDeg(0)}
              className="cursor-pointer text-[11px] font-medium hover:text-[var(--accent-1)]"
              style={{ color: "var(--text-faint)" }}
            >
              0°
            </button>
          </label>

          <div className="mt-5 flex w-full items-center gap-2">
            <button
              onClick={() => { setStep("upload"); setImage(null); }}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              <ArrowLeft size={15} /> Changer
            </button>
            <button
              onClick={quarterTurn}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              <RotateCw size={15} /> Pivoter 90°
            </button>
            <button
              onClick={launchAnalysis}
              className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 8px 20px -8px var(--accent-glow)" }}
            >
              <ScanSearch size={16} /> Analyser ma carte
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 3 · analyse ---------------- */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center py-6">
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--accent-glow)" }}>
            <ScanSearch size={28} className="animate-pulse text-[var(--accent-1)]" />
          </span>
          <div className="w-full max-w-sm space-y-2.5">
            {ANALYSIS_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2.5 text-sm">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: i < progress ? "rgba(76,175,125,0.15)" : i === progress ? "var(--accent-glow)" : "rgba(245,245,244,0.06)",
                    color: i < progress ? "#4CAF7D" : i === progress ? "var(--accent-1)" : "var(--text-faint)",
                  }}
                >
                  {i < progress ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span style={{ color: i <= progress ? "var(--text)" : "var(--text-faint)" }}>{label}</span>
              </div>
            ))}
          </div>
          {progress === 3 && (
            <p className="mt-5 max-w-sm text-center text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
              Première analyse : le module de lecture des textes se télécharge (~15 Mo), cela peut prendre un moment.
              Les analyses suivantes seront bien plus rapides.
            </p>
          )}
        </div>
      )}

      {/* ---------------- 4 · révision ---------------- */}
      {step === "review" && analysis && choices && previewDoc && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          {/* colonne visuelle */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
              Carte reconstruite (en direct)
            </p>
            <MiniCard doc={previewDoc} width={280} />

            <div className="mt-2 flex w-full items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Détections sur l&rsquo;original
              </p>
              <button
                onClick={() => setShowOverlay((v) => !v)}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-medium hover:text-[var(--accent-1)]"
                style={{ color: "var(--text-dim)" }}
              >
                {showOverlay ? <EyeOff size={12} /> : <Eye size={12} />}
                {showOverlay ? "Masquer" : "Afficher"}
              </button>
            </div>
            <div
              className="relative w-[280px] overflow-hidden rounded-lg border"
              style={{ aspectRatio: `${CARD_RATIO}`, borderColor: "var(--border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={analysis.originalDataUrl} alt="Carte d'origine" className="absolute inset-0 h-full w-full object-cover" />
              {showOverlay && (
                <>
                  {analysis.texts.map((t) => (
                    <span
                      key={t.id}
                      className="absolute rounded-sm border"
                      style={{
                        left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%`,
                        borderColor: t.masked ? "#4CAF7D" : "#F4B942",
                        background: t.masked ? "rgba(76,175,125,0.12)" : "rgba(244,185,66,0.10)",
                      }}
                    />
                  ))}
                  {analysis.stamps.map((s, i) => (
                    <span
                      key={i}
                      className="absolute rounded-full border-2"
                      style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`, borderColor: "#38bdf8" }}
                    />
                  ))}
                  {analysis.qr && (
                    <span
                      className="absolute border-2"
                      style={{ left: `${analysis.qr.x}%`, top: `${analysis.qr.y}%`, width: `${analysis.qr.w}%`, height: `${analysis.qr.h}%`, borderColor: "#a855f7" }}
                    />
                  )}
                </>
              )}
            </div>

            {/* palette extraite */}
            <div className="flex w-full items-center gap-1.5">
              {analysis.palette.map((c) => (
                <span key={c} title={c} className="h-6 flex-1 rounded-md border" style={{ background: c, borderColor: "var(--border)" }} />
              ))}
            </div>
            <p className="flex items-center gap-1 self-start text-[11px]" style={{ color: "#4CAF7D" }}>
              <Check size={12} /> Palette réellement extraite de votre image
            </p>
          </div>

          {/* colonne choix */}
          <div className="min-w-0 space-y-4">
            {analysis.warnings.length > 0 && (
              <div
                className="space-y-1 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed"
                style={{ borderColor: "rgba(244,185,66,0.35)", background: "rgba(244,185,66,0.07)", color: "#F4B942" }}
              >
                {analysis.warnings.map((w) => (
                  <p key={w} className="flex items-start gap-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            )}

            <Field label="Nom de la carte">
              <input
                value={choices.cardName}
                onChange={(e) => patch({ cardName: e.target.value })}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              />
            </Field>

            {/* textes détectés */}
            <Field
              label={`Textes détectés (${analysis.texts.length})`}
              icon={<Type size={13} />}
              hint={analysis.texts.length ? "Corrigez la lecture si besoin ; décochez pour ne pas recréer un texte." : "Aucun texte lu — ils restent dans l'image de fond."}
            >
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {analysis.texts.map((t) => {
                  const tc = choices.texts.find((x) => x.id === t.id)!;
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tc.keep}
                        onChange={(e) =>
                          patch({ texts: choices.texts.map((x) => (x.id === t.id ? { ...x, keep: e.target.checked } : x)) })
                        }
                        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-1)]"
                      />
                      <input
                        value={tc.content}
                        onChange={(e) =>
                          patch({ texts: choices.texts.map((x) => (x.id === t.id ? { ...x, content: e.target.value } : x)) })
                        }
                        className="w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-[var(--accent-1)]"
                        style={{ borderColor: "var(--border)", color: "var(--text)", opacity: tc.keep ? 1 : 0.5 }}
                      />
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                        style={{
                          background: t.masked ? "rgba(76,175,125,0.15)" : "rgba(244,185,66,0.15)",
                          color: t.masked ? "#4CAF7D" : "#F4B942",
                        }}
                        title={t.masked ? "Texte isolé du fond — recréé sans doublon" : "Encore visible dans l'image de fond — le recréer peut doubler le texte"}
                      >
                        {t.masked ? "isolé" : "dans le fond"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Field>

            {/* tampons */}
            {analysis.stamps.length >= 3 && (
              <Field
                label={`Tampons détectés (${analysis.stamps.length})`}
                icon={<CircleDot size={13} />}
                hint="Chaque tampon devient un composant indépendant, posé exactement sur l'original."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Toggle
                    on={choices.convertStamps}
                    onChange={(v) => patch({ convertStamps: v })}
                    label="Convertir en tampons modifiables"
                  />
                  {choices.convertStamps && (
                    <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--text-dim)" }}>
                      Couleur tampon validé
                      <span className="relative h-7 w-7 overflow-hidden rounded-md border" style={{ background: choices.stampAccent, borderColor: "var(--border-strong)" }}>
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(choices.stampAccent) ? choices.stampAccent : "#e8503d"}
                          onChange={(e) => patch({ stampAccent: e.target.value })}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </span>
                    </label>
                  )}
                </div>
              </Field>
            )}

            {/* QR */}
            <Field label="QR code" icon={<QrCode size={13} />}>
              {analysis.qr ? (
                <div className="flex gap-2">
                  {([
                    ["keep", "Conserver l'original"],
                    ["fidicard", "Remplacer par le QR FidiCard"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => patch({ qrMode: mode })}
                      className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors"
                      style={{
                        borderColor: choices.qrMode === mode ? "var(--accent-1)" : "var(--border)",
                        background: choices.qrMode === mode ? "var(--accent-glow)" : "var(--panel-soft)",
                        color: choices.qrMode === mode ? "var(--accent-1)" : "var(--text-dim)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <Toggle on={choices.addFidiQr} onChange={(v) => patch({ addFidiQr: v })} label="Ajouter le QR FidiCard (discret, déplaçable)" />
              )}
            </Field>

            <Field label="Code-barres" icon={<Barcode size={13} />}>
              <Toggle on={choices.addBarcode} onChange={(v) => patch({ addBarcode: v })} label="Ajouter le code-barres FidiCard (offre Starter)" />
            </Field>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
              <button
                onClick={createCard}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 10px 24px -8px var(--accent-glow)" }}
              >
                <Sparkles size={16} /> Créer ma carte ({elementCount} élément{elementCount > 1 ? "s" : ""} + fond)
              </button>
              <button
                onClick={importAsBackground}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium transition-colors hover:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
              >
                <ImageIcon size={14} /> Importer comme fond simple
              </button>
              <button
                onClick={() => setStep("adjust")}
                className="cursor-pointer text-xs font-medium transition-colors hover:text-[var(--accent-1)] sm:ml-auto"
                style={{ color: "var(--text-faint)" }}
              >
                ← Revenir à l&rsquo;image
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------- primitives */

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {icon} {label}
      </p>
      {hint && (
        <p className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex cursor-pointer items-center gap-2 text-xs font-medium"
      style={{ color: on ? "var(--text)" : "var(--text-dim)" }}
    >
      <span
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{ background: on ? "var(--accent-1)" : "rgba(148,148,148,0.35)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: on ? "18px" : "2px" }}
        />
      </span>
      {label}
    </button>
  );
}
