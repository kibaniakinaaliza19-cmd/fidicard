"use client";

import { useEditorStore } from "@/store/editorStore";
import Slider from "@/components/ui/Slider";

const presets = [8, 12, 16, 20, 24, 28];

export default function StyleSection() {
  const borderRadius = useEditorStore((s) => s.design.style.borderRadius);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          Coins arrondis
        </p>
        <select
          value={borderRadius}
          onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })}
          className="cursor-pointer rounded-lg border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          {presets.map((p) => (
            <option key={p} value={p} style={{ background: "var(--panel)" }}>
              {p} px
            </option>
          ))}
        </select>
      </div>
      <Slider value={borderRadius} min={0} max={32} unit="px" onChange={(v) => updateStyle({ borderRadius: v })} />
    </div>
  );
}
