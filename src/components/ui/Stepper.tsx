"use client";

import { Minus, Plus } from "lucide-react";

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export default function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] disabled:cursor-not-allowed disabled:opacity-30"
        style={{ borderColor: "var(--border)" }}
      >
        <Minus size={14} style={{ color: "var(--text)" }} />
      </button>
      <span
        className="flex h-8 min-w-[40px] items-center justify-center rounded-lg text-sm font-semibold"
        style={{ background: "var(--border)", color: "var(--text)" }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] disabled:cursor-not-allowed disabled:opacity-30"
        style={{ borderColor: "var(--border)" }}
      >
        <Plus size={14} style={{ color: "var(--text)" }} />
      </button>
    </div>
  );
}
