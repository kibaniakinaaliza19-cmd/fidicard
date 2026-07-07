"use client";

import { useEditorStore } from "@/store/editorStore";
import ColorSwatches from "@/components/ui/ColorSwatches";

const primaryPresets = ["#f0653e", "#e0342c", "#f59e0b", "#d4af37", "#fdf3e7"];
const secondaryPresets = ["#0f0603", "#1a0a02", "#020a04", "#0a0303", "#050505"];
const accentPresets = ["#ffb703", "#d4af37", "#e6c15c", "#7dd3fc", "#f5b8dd"];
const bgPresets = ["#080808", "#0f0603", "#0a0303", "#020610", "#12030a"];

function Row({ label, value, presets, onChange }: { label: string; value: string; presets: string[]; onChange: (c: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
        {label}
      </p>
      <ColorSwatches value={value} presets={presets} onChange={onChange} />
    </div>
  );
}

export default function ColorsSection() {
  const colors = useEditorStore((s) => s.design.colors);
  const updateColors = useEditorStore((s) => s.updateColors);

  return (
    <div className="space-y-4">
      <Row label="Couleur principale" value={colors.primary} presets={primaryPresets} onChange={(c) => updateColors({ primary: c })} />
      <Row label="Couleur secondaire" value={colors.secondary} presets={secondaryPresets} onChange={(c) => updateColors({ secondary: c })} />
      <Row label="Couleur d'accent" value={colors.accent} presets={accentPresets} onChange={(c) => updateColors({ accent: c })} />
      <Row label="Fond" value={colors.background} presets={bgPresets} onChange={(c) => updateColors({ background: c })} />
    </div>
  );
}
