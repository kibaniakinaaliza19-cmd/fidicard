"use client";

import { useState } from "react";
import { CircleDot, Grid3x3, Info } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import {
  getStampLayers,
  regenerateStampGrid,
  restyleStamps,
  shapeOf,
  type StampShape,
} from "@/lib/stampLayers";

const COUNTS = [3, 5, 6, 8, 10, 12, 15, 20];
const SHAPES: { id: StampShape; label: string }[] = [
  { id: "cercle", label: "Cercle" },
  { id: "arrondi", label: "Arrondi" },
  { id: "carre", label: "Carré" },
];

export default function TamponsDrawer() {
  const card = useCardStore((s) => s.card);
  const replaceLayers = useCardStore((s) => s.replaceLayers);
  const pushToast = useUIStore((s) => s.pushToast);
  const config = useLoyaltyStore((s) => s.config);
  const setConfig = useLoyaltyStore((s) => s.setConfig);

  const stamps = getStampLayers(card.layers);
  const currentShape: StampShape = stamps[0] ? shapeOf(stamps[0]) : "cercle";
  const [size, setSize] = useState(stamps[0]?.width ?? 9);

  function regen(total: number, shape: StampShape = currentShape) {
    const cfg = { ...config, totalStamps: total };
    setConfig({ totalStamps: total });
    replaceLayers((layers) => regenerateStampGrid(layers, cfg, { shape, size }));
    pushToast(`Grille de ${total} tampons posée sur la carte.`);
  }

  function restyle(opts: { shape?: StampShape; size?: number }, style = config.stampStyle) {
    const cfg = { ...config, stampStyle: style };
    replaceLayers((layers) => restyleStamps(layers, cfg, opts));
  }

  function setStyleColor(key: keyof typeof config.stampStyle, value: string) {
    const style = { ...config.stampStyle, [key]: value };
    setConfig({ stampStyle: style });
    restyle({}, style);
  }

  return (
    <DrawerShell title="Tampons">
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Le <strong>design</strong> des tampons. Leur comportement (règles, paliers, récompenses) se
        règle dans l&rsquo;onglet <strong>Fidélité</strong> — et leur remplissage se fait
        automatiquement à chaque scan du client.
      </p>

      {stamps.length === 0 ? (
        <button
          onClick={() => regen(config.totalStamps)}
          className="mb-5 flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed py-8 transition-colors hover:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Grid3x3 size={26} className="text-[var(--accent-1)]" />
          <span className="text-sm font-semibold">Ajouter la grille de tampons ({config.totalStamps})</span>
          <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
            Chaque tampon devient un calque indépendant
          </span>
        </button>
      ) : (
        <p className="mb-4 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
          <CircleDot size={12} className="text-[var(--accent-1)]" />
          {stamps.length} tampons sur la carte — chacun est sélectionnable individuellement.
        </p>
      )}

      <Section label="Nombre de tampons">
        <div className="flex flex-wrap gap-1.5">
          {COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => regen(n)}
              className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: config.totalStamps === n && stamps.length === n ? "var(--accent-1)" : "var(--border)",
                background: config.totalStamps === n && stamps.length === n ? "var(--accent-glow)" : "transparent",
                color: config.totalStamps === n && stamps.length === n ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
          Régénère la grille en conservant le reste du design. Les paliers sont réappliqués.
        </p>
      </Section>

      <Section label="Forme">
        <div className="flex gap-2">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => restyle({ shape: s.id })}
              className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: currentShape === s.id ? "var(--accent-1)" : "var(--border)",
                background: currentShape === s.id ? "var(--accent-glow)" : "var(--panel-soft)",
                color: currentShape === s.id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label={`Taille (${Math.round(size * 10) / 10} %)`}>
        <input
          type="range"
          min={6}
          max={13}
          step={0.5}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          onPointerUp={() => restyle({ size })}
          className="w-full accent-[var(--accent-1)]"
        />
      </Section>

      <Section label="Couleurs">
        <div className="space-y-2">
          <ColorRow label="Tampon vide" value={config.stampStyle.empty} onChange={(v) => setStyleColor("empty", v)} />
          <ColorRow label="Contour" value={config.stampStyle.border} onChange={(v) => setStyleColor("border", v)} />
          <ColorRow
            label="Tampon validé / palier"
            value={config.stampStyle.filled}
            onChange={(v) => setStyleColor("filled", v)}
          />
        </div>
      </Section>

      <div
        className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed"
        style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
      >
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
        <span>
          Sur la carte du client, les tampons se remplissent en couleur « validé » au fil des scans,
          et les paliers atteints débloquent leurs récompenses — testez depuis la page{" "}
          <strong>Scanner</strong> une fois le programme publié.
        </span>
      </div>
    </DrawerShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#e8503d";
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-xs" style={{ color: "var(--text-dim)" }}>
      {label}
      <span
        className="relative h-8 w-12 overflow-hidden rounded-lg border"
        style={{ background: value, borderColor: "var(--border-strong)" }}
      >
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}
