"use client";

interface SliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, unit = "", onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: "var(--text-dim)" }}>
          <span>{label}</span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{ background: "var(--border)", color: "var(--text)" }}
          >
            {value}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background: `linear-gradient(90deg, var(--accent-1) ${pct}%, var(--border) ${pct}%)`,
        }}
      />
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 9999px;
          background: var(--accent-1);
          box-shadow: 0 0 0 3px var(--accent-glow);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border: none;
          border-radius: 9999px;
          background: var(--accent-1);
          box-shadow: 0 0 0 3px var(--accent-glow);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
