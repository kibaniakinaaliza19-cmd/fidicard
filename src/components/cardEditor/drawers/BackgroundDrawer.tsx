"use client";

import { useRef } from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import type { BackgroundKind, CardBackground } from "@/types/layer";

const solidColors = ["#0f0603", "#080808", "#1a0a02", "#12030a", "#020610", "#3a1a10", "#7c2d12", "#134e4a", "#4c1d95", "#9d174d", "#ffffff", "#f5f4f2"];
const gradients: [string, string][] = [
  ["#3a1a10", "#0a0402"], ["#7a1f1f", "#0c0202"], ["#4c1d95", "#0a0414"],
  ["#134e4a", "#010a09"], ["#9d174d", "#160207"], ["#1e3a5f", "#020814"],
  ["#f0653e", "#e0342c"], ["#d4af37", "#3a2c05"],
];
const patterns: CardBackground["pattern"][] = ["dots", "diagonal", "grid"];

export default function BackgroundDrawer() {
  const bg = useCardStore((s) => s.card.background);
  const setBackground = useCardStore((s) => s.setBackground);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackground({ kind: "image", image: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const kinds: { id: BackgroundKind; label: string }[] = [
    { id: "color", label: "Couleur" },
    { id: "gradient", label: "Dégradé" },
    { id: "pattern", label: "Motif" },
    { id: "image", label: "Image" },
  ];

  return (
    <DrawerShell title="Arrière-plan">
      <div className="mb-4 flex rounded-lg border p-0.5" style={{ borderColor: "var(--border-strong)" }}>
        {kinds.map((k) => (
          <button
            key={k.id}
            onClick={() => setBackground({ kind: k.id })}
            className="flex-1 cursor-pointer rounded-md py-1.5 text-[11px] font-medium transition-colors"
            style={{
              background: bg.kind === k.id ? "var(--accent-glow)" : "transparent",
              color: bg.kind === k.id ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {bg.kind === "color" && (
        <div className="grid grid-cols-4 gap-2">
          {solidColors.map((c) => (
            <button
              key={c}
              onClick={() => setBackground({ color: c })}
              className="aspect-square cursor-pointer rounded-lg border transition-transform hover:scale-105"
              style={{ background: c, borderColor: bg.color === c ? "var(--accent-1)" : "var(--border)" }}
            />
          ))}
          <label className="relative flex aspect-square cursor-pointer items-center justify-center rounded-lg border text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
            +
            <input type="color" value={bg.color} onChange={(e) => setBackground({ color: e.target.value })} className="absolute inset-0 opacity-0" />
          </label>
        </div>
      )}

      {bg.kind === "gradient" && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {gradients.map(([from, to]) => (
              <button
                key={from + to}
                onClick={() => setBackground({ gradientFrom: from, gradientTo: to })}
                className="aspect-square cursor-pointer rounded-lg border transition-transform hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})`, borderColor: "var(--border)" }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>Couleur 1</span>
              <input type="color" value={bg.gradientFrom} onChange={(e) => setBackground({ gradientFrom: e.target.value })} className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>Couleur 2</span>
              <input type="color" value={bg.gradientTo} onChange={(e) => setBackground({ gradientTo: e.target.value })} className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
                <span>Angle</span><span>{bg.gradientAngle}°</span>
              </div>
              <input type="range" min={0} max={360} value={bg.gradientAngle} onChange={(e) => setBackground({ gradientAngle: Number(e.target.value) })} className="w-full cursor-pointer accent-[var(--accent-1)]" />
            </div>
          </div>
        </>
      )}

      {bg.kind === "pattern" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {patterns.map((p) => (
              <button
                key={p}
                onClick={() => setBackground({ pattern: p })}
                className="aspect-square cursor-pointer rounded-lg border text-[10px] capitalize transition-colors hover:border-[var(--accent-1)]"
                style={{ borderColor: bg.pattern === p ? "var(--accent-1)" : "var(--border)", color: "var(--text-dim)", background: "var(--panel-soft)" }}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>Couleur du fond</span>
            <input type="color" value={bg.color} onChange={(e) => setBackground({ color: e.target.value })} className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent" />
          </div>
        </>
      )}

      {bg.kind === "image" && (
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed py-6 transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <UploadCloud size={26} className="text-[var(--accent-1)]" />
            <span className="text-xs font-medium">Importer une image de fond</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          {bg.image && (
            <>
              <div>
                <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
                  <span>Assombrir</span><span>{bg.imageDim}%</span>
                </div>
                <input type="range" min={0} max={90} value={bg.imageDim} onChange={(e) => setBackground({ imageDim: Number(e.target.value) })} className="w-full cursor-pointer accent-[var(--accent-1)]" />
              </div>
              <button
                onClick={() => setBackground({ image: null, kind: "gradient" })}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-colors hover:border-red-500 hover:text-red-500"
                style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
              >
                <Trash2 size={12} /> Retirer l&rsquo;image
              </button>
            </>
          )}
        </div>
      )}
    </DrawerShell>
  );
}
