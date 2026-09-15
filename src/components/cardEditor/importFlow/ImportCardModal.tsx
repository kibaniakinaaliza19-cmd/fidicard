"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  RotateCw,
  ScanSearch,
  Check,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  Type,
  CircleDot,
  Barcode,
  ImageIcon,
  Crop,
  Trophy,
  Plus,
  X,
  Brain,
  Cpu,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useUIStore } from "@/store/uiStore";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { CARD_RATIO } from "@/types/layer";
import {
  analyzeCardImage,
  ANALYSIS_STEPS,
  rotateImage,
  type ImportAnalysis,
} from "@/lib/cardImport";
import { detectCard, rectifyCard, type CardCorners } from "@/lib/cardDetect";
import {
  defaultChoices,
  finalProgram,
  importToCard,
  type ImportChoices,
} from "@/lib/importToCard";
import type { VisionAnalysis } from "@/lib/visionSchema";

type Step = "upload" | "adjust" | "analyzing" | "review";

const MAX_SIZE = 8 * 1024 * 1024; // 8 Mo

export default function ImportCardModal() {
  const open = useUIStore((s) => s.importCardOpen);
  const setOpen = useUIStore((s) => s.setImportCardOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const applyImportedProgram = useLoyaltyStore((s) => s.applyImportedProgram);

  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [fineDeg, setFineDeg] = useState(0);
  const [corners, setCorners] = useState<CardCorners | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [choices, setChoices] = useState<ImportChoices | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [visionAvailable, setVisionAvailable] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // le moteur IA (vision) est-il configuré côté serveur ?
  useEffect(() => {
    if (!open || visionAvailable !== null) return;
    fetch("/api/analyze-card")
      .then((r) => r.json())
      .then((d) => setVisionAvailable(Boolean(d.available)))
      .catch(() => setVisionAvailable(false));
  }, [open, visionAvailable]);

  function reset() {
    setStep("upload");
    setImage(null);
    setFineDeg(0);
    setCorners(null);
    setAutoDetected(false);
    setError(null);
    setProgress(0);
    setAnalysis(null);
    setChoices(null);
    setShowOverlay(true);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 250);
  }

  const runDetection = useCallback(async (url: string) => {
    const det = await detectCard(url);
    if (det.detected && det.corners) {
      setCorners(det.corners);
      setAutoDetected(true);
    } else {
      setCorners(null);
      setAutoDetected(false);
    }
  }, []);

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
      const url = reader.result as string;
      setImage(url);
      setStep("adjust");
      void runDetection(url); // Phase 1 : détourage automatique de la carte
    };
    reader.readAsDataURL(file);
  }

  async function quarterTurn() {
    if (!image) return;
    const rotated = await rotateImage(image);
    setImage(rotated);
    setCorners(null);
    setAutoDetected(false);
    void runDetection(rotated);
  }

  async function launchAnalysis() {
    if (!image) return;
    setStep("analyzing");
    setProgress(0);
    setError(null);
    try {
      // Phase 1 : redresser d'abord (la vision analyse la carte détourée)
      let workImage = image;
      if (corners) {
        const rectified = await rectifyCard(image, corners);
        if (rectified) workImage = rectified;
      }

      // Phase 2 : modèle de vision si disponible, sinon moteur local
      let visionData: VisionAnalysis | null = null;
      if (visionAvailable) {
        setProgress(3);
        visionData = await callVision(workImage);
      }

      const result = await analyzeCardImage(workImage, (i) => setProgress(i), {
        fineRotation: corners ? 0 : fineDeg,
        visionData,
      });
      if (visionAvailable && !visionData) {
        result.warnings.unshift(
          "L'analyse IA n'a pas répondu — résultat obtenu avec le moteur local (moins précis sur les textes).",
        );
      }
      setAnalysis(result);
      setChoices(defaultChoices(result));
      setStep("review");
    } catch {
      setError("L'analyse a échoué — l'image semble illisible. Reprenez une photo plus nette et bien éclairée.");
      setStep("upload");
    }
  }

  const previewDoc = useMemo(() => {
    if (!analysis || !choices) return null;
    return importToCard(analysis, choices);
  }, [analysis, choices]);

  const elementCount = previewDoc?.layers.length ?? 0;

  function createCard() {
    if (!analysis || !choices) return;
    applyTemplate(importToCard(analysis, choices));
    // Phase 4 : la logique lue sur la carte alimente le moteur de fidélité —
    // le panneau « Fidélité » est pré-rempli, rien à ressaisir.
    applyImportedProgram(finalProgram(analysis, choices));
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
        keepLogos: [],
        convertStamps: false,
        tiers: [],
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
      subtitle="Votre carte est détourée, comprise (paliers, récompenses) et reconstruite en éléments modifiables."
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
            {visionAvailable ? (
              <>
                <Brain size={14} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
                <span>
                  <strong>Analyse IA activée</strong> : la carte est détourée de la photo, ses textes, logos, tampons et
                  surtout ses <strong>paliers de récompense</strong> (-5 €, -15 %…) sont compris et recréés en éléments
                  modifiables. L&rsquo;image est analysée via votre serveur — la clé API n&rsquo;est jamais exposée.
                </span>
              </>
            ) : (
              <>
                <Cpu size={14} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
                <span>
                  <strong>Moteur local</strong> : détourage, couleurs, OCR, tampons, paliers et QR sont analysés dans
                  votre navigateur. Pour l&rsquo;analyse IA complète (logos et textes bien plus fiables), ajoutez{" "}
                  <code>ANTHROPIC_API_KEY</code> dans <code>.env.local</code>.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------------- 2 · cadrage (Phase 1) ---------------- */}
      {step === "adjust" && image && (
        <CornerAdjust
          image={image}
          corners={corners}
          autoDetected={autoDetected}
          fineDeg={fineDeg}
          onCorners={(c) => { setCorners(c); setAutoDetected(false); }}
          onAutoDetect={() => void runDetection(image)}
          onFineDeg={setFineDeg}
          onQuarterTurn={() => void quarterTurn()}
          onBack={() => { setStep("upload"); setImage(null); }}
          onAnalyze={() => void launchAnalysis()}
        />
      )}

      {/* ---------------- 3 · analyse ---------------- */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center py-6">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--accent-glow)" }}>
            <ScanSearch size={28} className="animate-pulse text-[var(--accent-1)]" />
          </span>
          <span
            className="mb-5 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: "var(--panel-soft)", color: "var(--text-dim)" }}
          >
            {visionAvailable ? <Brain size={12} /> : <Cpu size={12} />}
            {visionAvailable ? "Analyse par IA de vision" : "Analyse locale (OCR)"}
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
          {progress === 3 && !visionAvailable && (
            <p className="mt-5 max-w-sm text-center text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
              Première analyse : le module de lecture des textes se charge, cela peut prendre un moment.
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
                  {analysis.logos.map((l) => (
                    <span
                      key={l.id}
                      className="absolute border-2 border-dashed"
                      style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, height: `${l.h}%`, borderColor: "#fb7185" }}
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

            <div className="flex w-full items-center gap-1.5">
              {analysis.palette.map((c) => (
                <span key={c} title={c} className="h-6 flex-1 rounded-md border" style={{ background: c, borderColor: "var(--border)" }} />
              ))}
            </div>
            <p className="flex items-center gap-1 self-start text-[11px]" style={{ color: "#4CAF7D" }}>
              <Check size={12} /> Palette réellement extraite de votre image
            </p>
            <span
              className="flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: "var(--panel-soft)", color: "var(--text-dim)" }}
            >
              {analysis.engine === "vision" ? <Brain size={11} /> : <Cpu size={11} />}
              {analysis.engine === "vision" ? "Compris par IA de vision" : "Moteur local (OCR)"}
            </span>
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

            {/* Phase 4 : programme détecté */}
            {(analysis.stamps.length >= 3 || choices.tiers.length > 0) && (
              <Field
                label={`Programme détecté — ${analysis.stamps.length} tampons`}
                icon={<Trophy size={13} />}
                hint="La logique de votre carte, comprise et modifiable : chaque palier s'affiche dans son tampon et alimente vos récompenses FidiCard."
              >
                <div className="space-y-1.5">
                  {choices.tiers.map((tier, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>au</span>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, analysis.stamps.length)}
                        value={tier.position}
                        onChange={(e) =>
                          patch({
                            tiers: choices.tiers.map((t, i) =>
                              i === ti ? { ...t, position: Math.max(1, Number(e.target.value) || 1) } : t,
                            ),
                          })
                        }
                        className="w-14 rounded-lg border bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:border-[var(--accent-1)]"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      />
                      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>ᵉ tampon →</span>
                      <input
                        value={tier.reward}
                        onChange={(e) =>
                          patch({ tiers: choices.tiers.map((t, i) => (i === ti ? { ...t, reward: e.target.value } : t)) })
                        }
                        placeholder="-5€, 1 offert…"
                        className="w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-[var(--accent-1)]"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      />
                      <button
                        onClick={() => patch({ tiers: choices.tiers.filter((_, i) => i !== ti) })}
                        className="shrink-0 cursor-pointer rounded-md p-1 hover:text-[#E8503D]"
                        style={{ color: "var(--text-faint)" }}
                        title="Supprimer ce palier"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      patch({
                        tiers: [
                          ...choices.tiers,
                          { position: Math.min(analysis.stamps.length || 10, choices.tiers.length + 1), reward: "" },
                        ],
                      })
                    }
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-medium hover:text-[var(--accent-1)]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    <Plus size={12} /> Ajouter un palier
                  </button>
                </div>
              </Field>
            )}

            {/* logos détectés */}
            {analysis.logos.length > 0 && (
              <Field
                label={`Logos & graphiques (${analysis.logos.length})`}
                icon={<ImageIcon size={13} />}
                hint="Chaque logo est découpé de l'image : il devient un calque déplaçable et redimensionnable."
              >
                <div className="flex flex-wrap gap-2">
                  {analysis.logos.map((l) => {
                    const on = choices.keepLogos.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() =>
                          patch({
                            keepLogos: on ? choices.keepLogos.filter((id) => id !== l.id) : [...choices.keepLogos, l.id],
                          })
                        }
                        className="relative cursor-pointer overflow-hidden rounded-lg border p-1 transition-colors"
                        style={{
                          borderColor: on ? "var(--accent-1)" : "var(--border)",
                          background: "var(--panel-soft)",
                          opacity: on ? 1 : 0.45,
                        }}
                        title={l.description}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.dataUrl} alt={l.description} className="h-10 w-auto max-w-[90px] object-contain" />
                        {on && (
                          <span className="absolute right-0.5 top-0.5 rounded-full bg-[var(--accent-1)] p-0.5 text-white">
                            <Check size={9} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* textes détectés */}
            <Field
              label={`Textes détectés (${analysis.texts.length})`}
              icon={<Type size={13} />}
              hint={analysis.texts.length ? "Corrigez la lecture si besoin ; décochez pour ne pas recréer un texte." : "Aucun texte lu — ils restent dans l'image de fond."}
            >
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
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
                        title={t.masked ? "Texte isolé du fond — recréé sans doublon" : "Encore visible dans l'image de fond"}
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
                label={`Tampons (${analysis.stamps.length})`}
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
                      Couleur accent
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

            <Field label="Code-barres" icon={<Barcode size={13} />}>
              <Toggle on={choices.addBarcode} onChange={(v) => patch({ addBarcode: v })} label="Ajouter le code-barres FidiCard" />
            </Field>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
              <button
                onClick={createCard}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 10px 24px -8px var(--accent-glow)" }}
              >
                <Sparkles size={16} /> Valider et éditer ({elementCount} élément{elementCount > 1 ? "s" : ""})
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
                ← Recadrer manuellement
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------ appel du modèle de vision */

async function callVision(dataUrl: string): Promise<VisionAnalysis | null> {
  try {
    const [prefix, base64] = dataUrl.split(",");
    const mediaType = /data:(image\/[a-z+]+);/.exec(prefix)?.[1] ?? "image/jpeg";
    const res = await fetch("/api/analyze-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mediaType }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.analysis as VisionAnalysis) ?? null;
  } catch {
    return null;
  }
}

/* --------------------------------------- Phase 1 : ajustement des 4 coins */

function CornerAdjust({
  image,
  corners,
  autoDetected,
  fineDeg,
  onCorners,
  onAutoDetect,
  onFineDeg,
  onQuarterTurn,
  onBack,
  onAnalyze,
}: {
  image: string;
  corners: CardCorners | null;
  autoDetected: boolean;
  fineDeg: number;
  onCorners: (c: CardCorners | null) => void;
  onAutoDetect: () => void;
  onFineDeg: (d: number) => void;
  onQuarterTurn: () => void;
  onBack: () => void;
  onAnalyze: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragIdx = useRef(-1);

  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } | null {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragIdx.current < 0 || !corners) return;
    const p = pointFromEvent(e);
    if (!p) return;
    onCorners({ points: corners.points.map((pt, i) => (i === dragIdx.current ? p : pt)) });
  }

  const labels = ["haut-gauche", "haut-droit", "bas-droit", "bas-gauche"];

  return (
    <div className="flex flex-col items-center">
      <div
        ref={boxRef}
        className="relative w-fit touch-none select-none overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border-strong)" }}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragIdx.current = -1)}
        onPointerLeave={() => (dragIdx.current = -1)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt="Votre carte"
          className="block max-h-[300px] w-auto max-w-full object-contain"
          style={{ transform: corners ? undefined : `rotate(${fineDeg}deg)` }}
          draggable={false}
        />
        {corners && (
          <>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={corners.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="rgba(232,80,61,0.10)"
                stroke="#E8503D"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {corners.points.map((p, i) => (
              <span
                key={i}
                title={`Coin ${labels[i]}`}
                onPointerDown={(e) => {
                  dragIdx.current = i;
                  (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId);
                }}
                className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 bg-white shadow-md active:cursor-grabbing"
                style={{ left: `${p.x}%`, top: `${p.y}%`, borderColor: "#E8503D" }}
              />
            ))}
          </>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: corners ? "#4CAF7D" : "var(--text-faint)" }}>
        {corners ? (
          <>
            <Check size={12} />
            {autoDetected ? "Carte détectée automatiquement" : "Recadrage manuel"} — seul l&rsquo;intérieur du cadre sera
            importé (la table, les doigts et le fond sont exclus). Déplacez les poignées pour ajuster.
          </>
        ) : (
          "Photo entière conservée. Si la carte est posée sur un fond, activez le recadrage pour la détourer."
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => {
            if (corners) onCorners(null);
            else onAutoDetect();
          }}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium"
          style={{ borderColor: corners ? "var(--accent-1)" : "var(--border-strong)", color: corners ? "var(--accent-1)" : "var(--text)" }}
        >
          <Crop size={14} /> {corners ? "Utiliser la photo entière" : "Détourer la carte"}
        </button>
        {!corners && (
          <button
            onClick={() =>
              onCorners({
                points: [
                  { x: 10, y: 10 },
                  { x: 90, y: 10 },
                  { x: 90, y: 90 },
                  { x: 10, y: 90 },
                ],
              })
            }
            className="cursor-pointer rounded-xl border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            Recadrer manuellement
          </button>
        )}
        {!corners && (
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-dim)" }}>
            Redresser {fineDeg !== 0 ? `(${fineDeg}°)` : ""}
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={fineDeg}
              onChange={(e) => onFineDeg(Number(e.target.value))}
              className="w-28 accent-[var(--accent-1)]"
            />
          </label>
        )}
      </div>

      <div className="mt-5 flex w-full items-center gap-2">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <ArrowLeft size={15} /> Changer
        </button>
        <button
          onClick={onQuarterTurn}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <RotateCw size={15} /> Pivoter 90°
        </button>
        <button
          onClick={onAnalyze}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 8px 20px -8px var(--accent-glow)" }}
        >
          <ScanSearch size={16} /> Analyser ma carte
        </button>
      </div>
    </div>
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
