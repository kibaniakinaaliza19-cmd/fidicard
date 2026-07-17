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
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useUIStore } from "@/store/uiStore";
import { useCardStore } from "@/store/cardStore";
import {
  analyzeCardImage,
  rotateImage,
  ANALYSIS_STEPS,
  type ImportAnalysis,
} from "@/lib/cardImport";
import { buildFromSpec, type TemplateSpec } from "@/data/templateCatalog";
import { rewardIconOptions, getIcon } from "@/lib/icons";

type Step = "upload" | "preview" | "analyzing" | "review";

const MAX_SIZE = 8 * 1024 * 1024; // 8 Mo

interface ReviewFields {
  business: string;
  tagline: string;
  loyalty: "tampons" | "points";
  goal: number;
  reward: string;
  icon: string;
  bg: string;
  accent: string;
}

export default function ImportCardModal() {
  const open = useUIStore((s) => s.importCardOpen);
  const setOpen = useUIStore((s) => s.setImportCardOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const applyTemplate = useCardStore((s) => s.applyTemplate);

  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [fields, setFields] = useState<ReviewFields | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setImage(null);
    setError(null);
    setProgress(0);
    setAnalysis(null);
    setFields(null);
  }

  function close() {
    setOpen(false);
    // let the exit animation play before wiping state
    setTimeout(reset, 250);
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
      setImage(reader.result as string);
      setStep("preview");
    };
    reader.readAsDataURL(file);
  }

  async function rotate() {
    if (!image) return;
    setImage(await rotateImage(image));
  }

  async function launchAnalysis() {
    if (!image) return;
    setStep("analyzing");
    setProgress(0);
    try {
      const result = await analyzeCardImage(image, (i) => setProgress(i));
      setAnalysis(result);
      setFields({
        business: result.suggested.business,
        tagline: result.suggested.tagline,
        loyalty: result.suggested.loyalty,
        goal: result.suggested.goal,
        reward: result.suggested.reward,
        icon: result.suggested.icon,
        bg: result.palette.bg,
        accent: result.palette.accent,
      });
      setStep("review");
    } catch {
      setError("L'analyse a échoué — l'image semble illisible. Reprenez une photo plus nette et bien éclairée.");
      setStep("upload");
    }
  }

  // live preview of the reconstructed card, rebuilt from the verified fields
  const previewDoc = useMemo(() => {
    if (!fields || !analysis) return null;
    return buildFromSpec(specFrom(fields, analysis));
  }, [fields, analysis]);

  function createCard() {
    if (!fields || !analysis) return;
    applyTemplate(buildFromSpec(specFrom(fields, analysis)));
    pushToast("Carte importée — chaque élément est modifiable.");
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Importer ma carte existante"
      subtitle="Transformez votre carte papier en carte FidiCard modifiable."
      wide
    >
      {/* honest demo note */}
      <div
        className="mb-5 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed"
        style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
      >
        <Info size={14} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
        <span>
          Démo : les <strong>couleurs</strong> sont réellement extraites de votre image. La lecture des textes, du logo
          et des règles arrive avec le moteur IA — vérifiez et complétez les champs proposés.
        </span>
      </div>

      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs"
          style={{ borderColor: "rgba(232,80,61,0.35)", background: "rgba(232,80,61,0.08)", color: "#E8503D" }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ---------------- upload ---------------- */}
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
          <p className="mt-4 text-center text-xs" style={{ color: "var(--text-faint)" }}>
            Conseil : photographiez la carte à plat, bien éclairée, sans reflet.
          </p>
        </div>
      )}

      {/* ---------------- preview / rotate ---------------- */}
      {step === "preview" && image && (
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Votre carte"
            className="max-h-[300px] w-auto max-w-full rounded-xl border object-contain"
            style={{ borderColor: "var(--border-strong)" }}
          />
          <div className="mt-5 flex w-full items-center gap-2">
            <button
              onClick={() => { setStep("upload"); setImage(null); }}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              <ArrowLeft size={15} /> Changer
            </button>
            <button
              onClick={rotate}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              <RotateCw size={15} /> Pivoter
            </button>
            <button
              onClick={launchAnalysis}
              className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 8px 20px -8px var(--accent-glow)" }}
            >
              <ScanSearch size={16} /> Lancer l&rsquo;analyse
            </button>
          </div>
        </div>
      )}

      {/* ---------------- analyzing ---------------- */}
      {step === "analyzing" && (
        <div className="flex flex-col items-center py-6">
          <span
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "var(--accent-glow)" }}
          >
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
        </div>
      )}

      {/* ---------------- review ---------------- */}
      {step === "review" && fields && analysis && previewDoc && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {analysis.lowQuality && (
              <div
                className="flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs"
                style={{ borderColor: "rgba(244,185,66,0.35)", background: "rgba(244,185,66,0.08)", color: "#F4B942" }}
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Image de faible résolution — les couleurs extraites peuvent être approximatives. Vous pouvez reprendre
                une photo plus nette, ou continuer et ajuster à la main.
              </div>
            )}

            <Field label="Nom du commerce">
              <input value={fields.business} onChange={(e) => setFields({ ...fields, business: e.target.value })} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }} />
            </Field>
            <Field label="Slogan">
              <input value={fields.tagline} onChange={(e) => setFields({ ...fields, tagline: e.target.value })} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }} />
            </Field>

            <Field label="Programme de fidélité détecté">
              <div className="flex gap-2">
                {(["tampons", "points"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFields({ ...fields, loyalty: mode })}
                    className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium capitalize transition-colors"
                    style={{
                      borderColor: fields.loyalty === mode ? "var(--accent-1)" : "var(--border)",
                      background: fields.loyalty === mode ? "var(--accent-glow)" : "var(--panel-soft)",
                      color: fields.loyalty === mode ? "var(--accent-1)" : "var(--text-dim)",
                    }}
                  >
                    {mode}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={fields.loyalty === "tampons" ? 10 : 10000}
                  value={fields.goal}
                  onChange={(e) => setFields({ ...fields, goal: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-20 rounded-lg border bg-transparent px-2 py-2 text-center text-sm outline-none focus:border-[var(--accent-1)]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                  title={fields.loyalty === "tampons" ? "Nombre de tampons" : "Objectif de points"}
                />
              </div>
            </Field>

            <Field label="Récompense détectée">
              <input value={fields.reward} onChange={(e) => setFields({ ...fields, reward: e.target.value })} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }} />
            </Field>

            <Field label="Couleurs extraites de votre carte">
              <div className="flex items-center gap-3">
                <ColorSwatch label="Fond" value={fields.bg} onChange={(v) => setFields({ ...fields, bg: v })} />
                <ColorSwatch label="Accent" value={fields.accent} onChange={(v) => setFields({ ...fields, accent: v })} />
                <span className="ml-auto flex items-center gap-1 text-[11px]" style={{ color: "#4CAF7D" }}>
                  <Check size={12} /> extraites de l&rsquo;image
                </span>
              </div>
            </Field>

            <Field label="Icône des tampons">
              <div className="flex flex-wrap gap-1.5">
                {rewardIconOptions.map((name) => {
                  const Icon = getIcon(name);
                  const on = fields.icon === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setFields({ ...fields, icon: name })}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors"
                      style={{
                        borderColor: on ? "var(--accent-1)" : "var(--border)",
                        background: on ? "var(--accent-glow)" : "var(--panel-soft)",
                        color: on ? "var(--accent-1)" : "var(--text-dim)",
                      }}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {/* live preview */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
              Carte reconstruite
            </p>
            <MiniCard doc={previewDoc} width={260} />
            {image && (
              <>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                  Votre carte d&rsquo;origine
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Original" className="max-h-[120px] w-auto max-w-full rounded-lg border object-contain opacity-80" style={{ borderColor: "var(--border)" }} />
              </>
            )}
            <button
              onClick={createCard}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 10px 24px -8px var(--accent-glow)" }}
            >
              <Sparkles size={16} /> Créer ma carte
            </button>
            <button
              onClick={() => { setStep("preview"); }}
              className="cursor-pointer text-xs font-medium transition-colors hover:text-[var(--accent-1)]"
              style={{ color: "var(--text-faint)" }}
            >
              ← Revenir à l&rsquo;image
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function specFrom(f: ReviewFields, a: ImportAnalysis): TemplateSpec {
  return {
    id: "import",
    name: f.business ? `Carte ${f.business}` : "Carte importée",
    business: f.business || "MON COMMERCE",
    tagline: f.tagline,
    sector: "Autres",
    loyalty: f.loyalty,
    goal: f.goal,
    filled: f.loyalty === "tampons" ? Math.min(f.goal, Math.round(f.goal / 2)) : Math.round(f.goal / 2),
    reward: f.reward,
    icon: f.icon,
    bg: [f.bg, a.palette.bg2],
    fg: a.palette.text,
    sub: a.palette.sub,
    accent: f.accent,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span
        className="relative h-9 w-9 overflow-hidden rounded-lg border"
        style={{ background: value, borderColor: "var(--border-strong)" }}
      >
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#333333"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      <span className="text-xs" style={{ color: "var(--text-dim)" }}>{label}</span>
    </label>
  );
}
