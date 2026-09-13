"use client";

import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { createTextLayer } from "@/lib/layerFactory";
import { fontOptions } from "@/lib/fonts";

const presets = [
  { label: "Ajouter un titre", fontSize: 26, fontWeight: 800, height: 12 },
  { label: "Ajouter un sous-titre", fontSize: 16, fontWeight: 600, height: 9 },
  { label: "Ajouter du texte courant", fontSize: 11, fontWeight: 400, height: 7 },
];

export default function TextDrawer() {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);

  function add(preset: (typeof presets)[number], font: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(
      createTextLayer(z, {
        content: preset.label.replace("Ajouter ", "").replace("un ", "").replace("du ", ""),
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        height: preset.height,
        font,
      })
    );
  }

  return (
    <DrawerShell title="Ajouter du texte">
      <div className="space-y-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => add(p, "geist")}
            className="w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)", fontSize: p.fontSize / 1.6, fontWeight: p.fontWeight }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Polices
      </p>
      <div className="space-y-1">
        {fontOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => add({ label: "Votre texte", fontSize: 18, fontWeight: 600, height: 9 }, f.value)}
            className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-base transition-colors hover:bg-[var(--panel-soft)]"
            style={{ fontFamily: f.cssVar, color: "var(--text)" }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </DrawerShell>
  );
}
