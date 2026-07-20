"use client";

import { useEffect } from "react";
import { Trophy, Plus, X, AlertTriangle, Check, Wand2, RefreshCw, Info } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { usePublishStore } from "@/store/publishStore";
import {
  PROGRAM_PRESETS,
  validerProgramme,
  describeProgram,
  pointsToEuros,
  type LoyaltyMode,
  type Palier,
  type TierType,
  type LoyaltyConfig,
} from "@/lib/loyalty";
import { applyTiersToLayers, getStampLayers, regenerateStampGrid } from "@/lib/stampLayers";

const TIER_TYPES: { id: TierType; label: string }[] = [
  { id: "montant", label: "Montant (€)" },
  { id: "pourcentage", label: "Pourcentage (%)" },
  { id: "produit_offert", label: "Produit offert" },
  { id: "autre", label: "Autre" },
];

const STAMP_COUNTS = [3, 5, 6, 8, 10, 12, 15, 20];

export default function FideliteDrawer() {
  const config = useLoyaltyStore((s) => s.config);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const setPaliers = useLoyaltyStore((s) => s.setPaliers);
  const setTotalStamps = useLoyaltyStore((s) => s.setTotalStamps);
  const setMode = useLoyaltyStore((s) => s.setMode);
  const applyPreset = useLoyaltyStore((s) => s.applyPreset);
  const lastCascade = useLoyaltyStore((s) => s.lastCascade);
  const clearCascade = useLoyaltyStore((s) => s.clearCascade);
  const replaceLayers = useCardStore((s) => s.replaceLayers);
  const cardStamps = useCardStore((s) => getStampLayers(s.card.layers).length);
  // v2 : la carte rend sa grille depuis la config — aucune synchro manuelle
  const isZoneCard = useCardStore((s) => s.card.version === 2);
  const pushToast = useUIStore((s) => s.pushToast);
  const published = usePublishStore((s) => s.published);

  const errors = validerProgramme(config);
  const isStamps = config.mode === "stamps";
  const summary = describeProgram(config);

  // les cascades (palier retiré, conversion) sont signalées en toast
  useEffect(() => {
    if (lastCascade) {
      pushToast(lastCascade);
      clearCascade();
    }
  }, [lastCascade, pushToast, clearCascade]);

  function patchPalier(i: number, patch: Partial<Palier>) {
    setPaliers(config.paliers.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function syncToCard(cfg: LoyaltyConfig = config) {
    if (isZoneCard) return;
    if (cardStamps === 0) {
      replaceLayers((layers) => regenerateStampGrid(layers, cfg));
      pushToast(`Grille de ${cfg.totalStamps} tampons ajoutée à la carte, paliers affichés.`);
    } else {
      replaceLayers((layers) => applyTiersToLayers(layers, cfg));
      pushToast("Paliers affichés dans les tampons de la carte.");
    }
  }

  return (
    <DrawerShell title="Fonctionnalités de la carte">
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Ici se définit le <strong>comportement</strong> de votre carte — séparé du design. C&rsquo;est ce
        moteur qui s&rsquo;exécute à chaque scan : ajout du tampon ou des points, déblocage des
        récompenses, mise à jour de la carte du client.
      </p>

      {/* type de programme */}
      <Section label="Type de programme">
        <div className="flex gap-2">
          {(
            [
              ["stamps", "Tampons"],
              ["points", "Points"],
            ] as [LoyaltyMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className="flex-1 cursor-pointer rounded-lg border py-2.5 text-xs font-semibold transition-colors"
              style={{
                borderColor: config.mode === mode ? "var(--accent-1)" : "var(--border)",
                background: config.mode === mode ? "var(--accent-glow)" : "var(--panel-soft)",
                color: config.mode === mode ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {isStamps ? (
        <>
          <Section label="Nombre de tampons">
            <div className="flex flex-wrap gap-1.5">
              {STAMP_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalStamps(n)}
                  className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: config.totalStamps === n ? "var(--accent-1)" : "var(--border)",
                    background: config.totalStamps === n ? "var(--accent-glow)" : "transparent",
                    color: config.totalStamps === n ? "var(--accent-1)" : "var(--text-dim)",
                  }}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={24}
                value={config.totalStamps}
                onChange={(e) => setTotalStamps(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                className="w-16 rounded-lg border bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              />
            </div>
            {cardStamps > 0 && cardStamps !== config.totalStamps && (
              <button
                onClick={() => {
                  replaceLayers((layers) => regenerateStampGrid(layers, config));
                  pushToast(`Grille régénérée : ${config.totalStamps} tampons.`);
                }}
                className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium hover:underline"
                style={{ color: "#F4B942" }}
              >
                <RefreshCw size={11} /> La carte affiche {cardStamps} tampons — mettre la carte à jour
              </button>
            )}
          </Section>

          <Section label="Règle d'attribution">
            <div className="space-y-1.5">
              <Radio
                on={config.regle.type === "passage"}
                onClick={() => setConfig({ regle: { type: "passage" } })}
                label="1 passage = 1 tampon"
              />
              <Radio
                on={config.regle.type === "montant_minimum"}
                onClick={() => setConfig({ regle: { type: "montant_minimum", seuil: 10 } })}
                label="1 tampon à partir d'un montant minimum"
              />
              {config.regle.type === "montant_minimum" && (
                <MoneyInput
                  label="Montant minimum"
                  value={config.regle.seuil}
                  onChange={(v) => setConfig({ regle: { type: "montant_minimum", seuil: v } })}
                />
              )}
              <Radio
                on={config.regle.type === "montant_palier"}
                onClick={() => setConfig({ regle: { type: "montant_palier", tranche: 15 } })}
                label="1 tampon par tranche de X €"
              />
              {config.regle.type === "montant_palier" && (
                <MoneyInput
                  label="Tranche"
                  value={config.regle.tranche}
                  onChange={(v) => setConfig({ regle: { type: "montant_palier", tranche: v } })}
                />
              )}
            </div>
          </Section>
        </>
      ) : (
        <Section label="Conversion">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
            1 € =
            <input
              type="number"
              min={1}
              value={config.tauxConversion}
              onChange={(e) => setConfig({ tauxConversion: Math.max(1, Number(e.target.value) || 1) })}
              className="w-20 rounded-lg border bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            />
            points
          </div>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
            Ex. : un client paie 15 € → il gagne {15 * config.tauxConversion} points.
          </p>
        </Section>
      )}

      {/* paliers */}
      <Section
        label={`Paliers de récompense (${config.paliers.length})`}
        hint={
          isStamps
            ? "Position = numéro du tampon. Le libellé (max 8 car.) s'affiche DANS le tampon."
            : "Position = seuil de points à atteindre."
        }
      >
        <div className="space-y-2.5">
          {config.paliers
            .map((p, i) => ({ p, i }))
            .sort((a, b) => a.p.position - b.p.position)
            .map(({ p, i }) => (
              <div key={i} className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {isStamps ? "au" : "dès"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={isStamps ? config.totalStamps : undefined}
                    value={p.position}
                    onChange={(e) => patchPalier(i, { position: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 rounded-lg border bg-transparent px-1.5 py-1.5 text-center text-xs outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {isStamps ? "ᵉ tampon" : "points"}
                  </span>
                  <input
                    value={p.label}
                    maxLength={8}
                    placeholder="-5€"
                    onChange={(e) => patchPalier(i, { label: e.target.value })}
                    className="w-20 rounded-lg border bg-transparent px-2 py-1.5 text-xs font-semibold outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <select
                    value={p.type}
                    onChange={(e) => patchPalier(i, { type: e.target.value as TierType })}
                    className="min-w-0 flex-1 cursor-pointer rounded-lg border bg-transparent px-1.5 py-1.5 text-[11px] outline-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-dim)", background: "var(--panel)" }}
                  >
                    {TIER_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPaliers(config.paliers.filter((_, idx) => idx !== i))}
                    className="shrink-0 cursor-pointer rounded-md p-1 hover:text-[#E8503D]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <input
                  value={p.description}
                  placeholder="Description montrée au client (ex. 5 € de réduction sur la prestation)"
                  onChange={(e) => patchPalier(i, { description: e.target.value })}
                  className="mt-2 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-[11px] outline-none focus:border-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                />
                {!isStamps && (
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {p.position} points ≈ {pointsToEuros(p.position, config.tauxConversion)} € dépensés
                  </p>
                )}
              </div>
            ))}
          <button
            onClick={() =>
              setPaliers([
                ...config.paliers,
                {
                  position: isStamps ? config.totalStamps : 250,
                  label: "",
                  description: "",
                  type: "montant",
                },
              ])
            }
            className="flex cursor-pointer items-center gap-1 text-[11px] font-medium hover:text-[var(--accent-1)]"
            style={{ color: "var(--text-dim)" }}
          >
            <Plus size={12} /> Ajouter un palier
          </button>
        </div>

        {errors.length > 0 && (
          <div
            className="mt-3 space-y-1 rounded-xl border px-3 py-2 text-[11px] leading-relaxed"
            style={{ borderColor: "rgba(244,185,66,0.35)", background: "rgba(244,185,66,0.07)", color: "#F4B942" }}
          >
            {errors.map((e) => (
              <p key={e} className="flex items-start gap-1.5">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}
        {errors.length === 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "#4CAF7D" }}>
            <Check size={12} /> Programme valide — publiable.
            {published && " Programme publié : les scans appliquent ces règles."}
          </p>
        )}

        {isStamps && !isZoneCard && (
          <button
            onClick={() => syncToCard()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white transition-transform hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            <Trophy size={14} /> Afficher les paliers sur la carte
          </button>
        )}
      </Section>

      {/* résumé en langage naturel, régénéré à chaque modification */}
      <div
        className="mb-5 flex items-start gap-2 rounded-xl border px-3.5 py-3"
        style={{ borderColor: "var(--accent-1)", background: "var(--accent-glow)" }}
      >
        <Info size={14} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent-1)" }}>
            Votre programme, en clair
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
            {summary}
          </p>
        </div>
      </div>

      {/* presets */}
      <Section label="Programmes prêts à l'emploi" hint="Mécanismes éprouvés du commerce de proximité — un clic remplit tout et recalcule les paliers, modifiable ensuite.">
        <div className="space-y-2">
          {PROGRAM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                const hasCustom = config.paliers.length > 0;
                if (hasCustom && !window.confirm("Appliquer ce programme remplacera vos paliers actuels. Continuer ?")) return;
                applyPreset(preset);
                const cfg = { ...config, ...preset.config };
                syncToCard(cfg);
                pushToast(`Programme « ${preset.nom} » appliqué.`);
              }}
              className="block w-full cursor-pointer rounded-xl border p-2.5 text-left transition-colors hover:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text)" }}>
                <Wand2 size={12} className="text-[var(--accent-1)]" /> {preset.nom}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                {preset.description}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
                {preset.config.mode === "stamps"
                  ? `${preset.config.totalStamps} tampons · ${preset.config.paliers.map((p) => `${p.position}ᵉ → ${p.label}`).join(" · ")}`
                  : `1 € = ${preset.config.tauxConversion} pts · ${preset.config.paliers.map((p) => `${p.position} pts → ${p.label}`).join(" · ")}`}
              </p>
            </button>
          ))}
        </div>
      </Section>
    </DrawerShell>
  );
}

/* ------------------------------------------------------------- primitives */

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {label}
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

function Radio({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors"
      style={{
        borderColor: on ? "var(--accent-1)" : "var(--border)",
        background: on ? "var(--accent-glow)" : "transparent",
        color: on ? "var(--text)" : "var(--text-dim)",
      }}
    >
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: on ? "var(--accent-1)" : "var(--border-strong)" }}
      >
        {on && <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-1)" }} />}
      </span>
      {label}
    </button>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="ml-6 flex items-center gap-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
      {label}
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-16 rounded-lg border bg-transparent px-1.5 py-1 text-center text-xs outline-none focus:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      />
      €
    </div>
  );
}
