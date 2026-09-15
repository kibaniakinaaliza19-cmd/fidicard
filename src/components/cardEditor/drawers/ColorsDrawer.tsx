"use client";

import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import type { Layer } from "@/types/layer";

const palette = [
  "#f0653e", "#e0342c", "#d4af37", "#ffb703", "#22c55e", "#2dd4bf",
  "#3b82f6", "#a855f7", "#ec4899", "#fb7185", "#ffffff", "#e5e5e5",
  "#9a9a97", "#3a3a3a", "#1a1a1a", "#0a0a0a",
];

function colorKey(layer: Layer): "color" | "fill" | null {
  if (layer.type === "text" || layer.type === "icon") return "color";
  if (layer.type === "shape") return "fill";
  return null;
}

export default function ColorsDrawer() {
  const selectedIds = useCardStore((s) => s.selectedIds);
  const layers = useCardStore((s) => s.card.layers);
  const recentColors = useCardStore((s) => s.recentColors);
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const pushRecentColor = useCardStore((s) => s.pushRecentColor);

  const selected = layers.filter((l) => selectedIds.includes(l.id));
  const editable = selected.filter((l) => colorKey(l));

  function apply(color: string) {
    if (editable.length === 0) return;
    editable.forEach((l) => {
      const key = colorKey(l);
      if (key) updateLayerLive(l.id, { [key]: color } as Partial<Layer>);
    });
    commit();
    pushRecentColor(color);
  }

  return (
    <DrawerShell title="Couleurs">
      {editable.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
          Sélectionnez un texte, une forme ou une icône sur la carte pour changer sa couleur.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Palette
          </p>
          <div className="grid grid-cols-6 gap-2">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => apply(c)}
                className="aspect-square cursor-pointer rounded-lg border transition-transform hover:scale-110"
                style={{ background: c, borderColor: "var(--border-strong)" }}
              />
            ))}
            <label className="relative flex aspect-square cursor-pointer items-center justify-center rounded-lg border text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
              +
              <input type="color" onChange={(e) => apply(e.target.value)} className="absolute inset-0 opacity-0" />
            </label>
          </div>

          {recentColors.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Récentes
              </p>
              <div className="grid grid-cols-6 gap-2">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => apply(c)}
                    className="aspect-square cursor-pointer rounded-lg border transition-transform hover:scale-110"
                    style={{ background: c, borderColor: "var(--border-strong)" }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </DrawerShell>
  );
}
