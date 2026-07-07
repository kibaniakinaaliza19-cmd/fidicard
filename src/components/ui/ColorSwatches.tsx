"use client";

interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
  presets: string[];
  allowCustom?: boolean;
}

export default function ColorSwatches({ value, onChange, presets, allowCustom = true }: ColorSwatchesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="h-7 w-7 cursor-pointer rounded-full transition-transform duration-150 hover:scale-110"
          style={{
            background: color,
            boxShadow:
              value.toLowerCase() === color.toLowerCase()
                ? "0 0 0 2px var(--panel-soft), 0 0 0 4px var(--accent-1)"
                : "0 0 0 1px var(--border-strong)",
          }}
          aria-label={color}
        />
      ))}
      {allowCustom && (
        <label
          className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border overflow-hidden"
          style={{ borderColor: "var(--border-strong)", background: value }}
          title="Couleur personnalisée"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      )}
    </div>
  );
}
