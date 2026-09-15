"use client";

import { Square, Circle, Minus, Triangle } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { createShapeLayer } from "@/lib/layerFactory";
import type { ShapeKind } from "@/types/layer";

const shapes: { kind: ShapeKind; label: string; icon: typeof Square }[] = [
  { kind: "rect", label: "Rectangle", icon: Square },
  { kind: "circle", label: "Cercle", icon: Circle },
  { kind: "line", label: "Ligne", icon: Minus },
  { kind: "triangle", label: "Triangle", icon: Triangle },
];

const colors = ["#f0653e", "#e0342c", "#d4af37", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#0a0a0a"];

export default function ShapesDrawer() {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);

  function add(kind: ShapeKind, fill: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createShapeLayer(z, kind, { fill, height: kind === "line" ? 3 : 20 }));
  }

  return (
    <DrawerShell title="Formes">
      <div className="grid grid-cols-2 gap-2">
        {shapes.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.kind}
              onClick={() => add(s.kind, "#f0653e")}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border transition-colors hover:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            >
              <Icon size={30} />
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>{s.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Ajout rapide coloré
      </p>
      <div className="grid grid-cols-4 gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => add("rect", c)}
            className="aspect-square cursor-pointer rounded-lg border transition-transform hover:scale-105"
            style={{ background: c, borderColor: "var(--border-strong)" }}
          />
        ))}
      </div>
    </DrawerShell>
  );
}
