"use client";

import { useMemo, useState } from "react";
import { CircleDot, Grid3x3, Info, Search, UploadCloud, Trash2 } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useCustomStampsStore } from "@/store/customStampsStore";
import { createIconLayer, createImageLayer } from "@/lib/layerFactory";
import {
  getStampLayers,
  regenerateStampGrid,
  restyleStamps,
  shapeOf,
  type StampShape,
} from "@/lib/stampLayers";
import {
  searchStamps,
  STAMP_CATEGORIES,
  CATEGORY_LABELS,
  getStampIcon,
  STAMP_COUNT,
  type StampCategory,
} from "@/lib/stampCatalog";

const COUNTS = [3, 5, 6, 8, 10, 12, 15, 20];
const SHAPES: { id: StampShape; label: string }[] = [
  { id: "cercle", label: "Cercle" },
  { id: "arrondi", label: "Arrondi" },
  { id: "carre", label: "Carré" },
];
const PAGE = 60;

export default function TamponsDrawer() {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);
  const replaceLayers = useCardStore((s) => s.replaceLayers);
  const pushToast = useUIStore((s) => s.pushToast);
  const config = useLoyaltyStore((s) => s.config);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const customStamps = useCustomStampsStore((s) => s.stamps);
  const addCustom = useCustomStampsStore((s) => s.add);
  const removeCustom = useCustomStampsStore((s) => s.remove);

  const stamps = getStampLayers(card.layers);
  const currentShape: StampShape = stamps[0] ? shapeOf(stamps[0]) : "cercle";
  const [size, setSize] = useState(stamps[0]?.width ?? 9);

  // bibliothèque d'icônes-tampons
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<StampCategory | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => searchStamps(query, cat), [query, cat]);
  const shown = results.slice(0, limit);

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
  function addIconAsLayer(lucide: string, name: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createIconLayer(z, lucide, { name, color: config.stampStyle.filled, width: 10, height: 10 * 1.55 }));
    pushToast(`Tampon « ${name} » ajouté.`);
  }
  function addCustomAsLayer(dataUrl: string, name: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createImageLayer(z, dataUrl, { name, width: 12, height: 12, radius: 50 }));
    pushToast(`Tampon importé « ${name} » ajouté.`);
  }
  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      pushToast("Image trop lourde (2 Mo max pour un tampon).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const stamp = addCustom(file.name.replace(/\.[^.]+$/, ""), reader.result as string);
      addCustomAsLayer(stamp.dataUrl, stamp.name);
    };
    reader.readAsDataURL(file);
  }

  return (
    <DrawerShell title="Tampons">
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Un tampon est une icône. Choisissez-en parmi <strong>{STAMP_COUNT}</strong> classées par métier,
        ou <strong>importez la vôtre</strong>. La grille et son remplissage automatique se règlent plus
        bas ; le comportement (paliers, récompenses) est dans l&rsquo;onglet <strong>Fidélité</strong>.
      </p>

      {/* import */}
      <label
        className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors hover:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", background: "var(--accent-glow)" }}
      >
        <UploadCloud size={20} className="shrink-0 text-[var(--accent-1)]" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Importer un tampon</span>
          <span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>PNG ou SVG · 2 Mo max</span>
        </span>
        <input type="file" accept="image/png,image/svg+xml,image/*" className="hidden" onChange={importFile} />
      </label>

      {/* mes tampons importés */}
      {customStamps.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Mes tampons ({customStamps.length})
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {customStamps.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => addCustomAsLayer(s.dataUrl, s.name)}
                  className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border p-1 transition-colors hover:border-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)" }}
                  title={s.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.dataUrl} alt={s.name} className="max-h-full max-w-full object-contain" />
                </button>
                <button
                  onClick={() => removeCustom(s.id)}
                  className="absolute -right-1 -top-1 hidden cursor-pointer rounded-full bg-[#E8503D] p-0.5 text-white group-hover:block"
                >
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* recherche */}
      <div className="mb-2.5 flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: "var(--border-strong)" }}>
        <Search size={14} style={{ color: "var(--text-faint)" }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          placeholder={`Rechercher un tampon (ciseaux, café, patte…)`}
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* pills catégories */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...STAMP_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setLimit(PAGE); }}
            className="shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              borderColor: cat === c ? "var(--accent-1)" : "var(--border)",
              background: cat === c ? "var(--accent-glow)" : "transparent",
              color: cat === c ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {c === "all" ? "Tous" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* grille d'icônes-tampons */}
      {shown.length === 0 ? (
        <p className="py-6 text-center text-xs" style={{ color: "var(--text-faint)" }}>
          Aucun tampon pour « {query} ».
        </p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {shown.map((s) => {
              const Icon = getStampIcon(s.lucide);
              return (
                <button
                  key={s.id}
                  onClick={() => addIconAsLayer(s.lucide, s.label)}
                  className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)", contentVisibility: "auto", containIntrinsicSize: "44px" }}
                  title={s.label}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
          {limit < results.length && (
            <button
              onClick={() => setLimit((l) => l + PAGE)}
              className="mt-2 w-full cursor-pointer rounded-lg border border-dashed py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
            >
              Voir plus ({results.length - limit} restants)
            </button>
          )}
        </>
      )}

      {/* ---------------- design de la grille ---------------- */}
      <div className="my-5 h-px" style={{ background: "var(--border)" }} />

      {stamps.length === 0 ? (
        <button
          onClick={() => regen(config.totalStamps)}
          className="mb-5 flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed py-6 transition-colors hover:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Grid3x3 size={24} className="text-[var(--accent-1)]" />
          <span className="text-sm font-semibold">Ajouter la grille de tampons ({config.totalStamps})</span>
        </button>
      ) : (
        <p className="mb-4 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
          <CircleDot size={12} className="text-[var(--accent-1)]" />
          {stamps.length} tampons sur la carte — chacun est sélectionnable.
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
          <ColorRow label="Tampon validé / palier" value={config.stampStyle.filled} onChange={(v) => setStyleColor("filled", v)} />
        </div>
      </Section>

      <div
        className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed"
        style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
      >
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
        <span>
          Sur la carte du client, les tampons se remplissent au fil des scans et les paliers atteints
          débloquent leurs récompenses — testez depuis la page <strong>Scanner</strong>.
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
      <span className="relative h-8 w-12 overflow-hidden rounded-lg border" style={{ background: value, borderColor: "var(--border-strong)" }}>
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
    </label>
  );
}
