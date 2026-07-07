"use client";

import { useRef } from "react";
import { Trash2, Upload, Zap } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import Slider from "@/components/ui/Slider";
import type { CardLogo } from "@/types/card";

const positions: { id: CardLogo["position"]; label: string }[] = [
  { id: "left", label: "Gauche" },
  { id: "center", label: "Centre" },
  { id: "right", label: "Droite" },
];

export default function LogoSection() {
  const logo = useEditorStore((s) => s.design.logo);
  const updateLogo = useEditorStore((s) => s.updateLogo);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateLogo({ url: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white/5"
          style={{ borderColor: "var(--border-strong)" }}
        >
          {logo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.url} alt="logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
              Aucun
            </span>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Upload size={12} />
          Importer un logo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => updateLogo({ url: null })}
          disabled={!logo.url}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <Slider label="Taille" value={logo.size} min={28} max={72} unit="px" onChange={(v) => updateLogo({ size: v })} />
      <Slider label="Rotation" value={logo.rotation} min={0} max={360} unit="°" onChange={(v) => updateLogo({ rotation: v })} />

      <div>
        <p className="mb-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
          Position
        </p>
        <div className="flex gap-1.5">
          {positions.map((p) => (
            <button
              key={p.id}
              onClick={() => updateLogo({ position: p.id })}
              className="flex-1 cursor-pointer rounded-lg border py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: logo.position === p.id ? "var(--accent-1)" : "var(--border-strong)",
                background: logo.position === p.id ? "var(--accent-glow)" : "transparent",
                color: logo.position === p.id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => updateLogo({ glow: !logo.glow })}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      >
        <span className="flex items-center gap-1.5">
          <Zap size={13} className="text-[var(--accent-1)]" />
          Effet lumineux
        </span>
        <span
          className="relative h-5 w-9 rounded-full transition-colors"
          style={{ background: logo.glow ? "var(--accent-1)" : "var(--border-strong)" }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
            style={{ transform: logo.glow ? "translateX(18px)" : "translateX(2px)" }}
          />
        </span>
      </button>
    </div>
  );
}
