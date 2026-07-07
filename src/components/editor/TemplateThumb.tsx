"use client";

import { Lock } from "lucide-react";
import { getIcon } from "@/lib/icons";
import type { CardTemplate } from "@/types/card";

interface TemplateThumbProps {
  template: CardTemplate;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}

export default function TemplateThumb({ template, active, onClick, compact }: TemplateThumbProps) {
  const Icon = getIcon(template.preview.icon);
  return (
    <button
      onClick={onClick}
      className="group relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        width: compact ? "100%" : 88,
        borderColor: active ? "var(--accent-1)" : "var(--border)",
        boxShadow: active ? "0 0 0 1px var(--accent-1), 0 6px 20px -6px var(--accent-glow)" : "none",
      }}
    >
      <div
        className="relative flex h-16 w-full items-center justify-center"
        style={{
          background: `linear-gradient(145deg, ${template.preview.gradient[0]}, ${template.preview.gradient[1]})`,
        }}
      >
        {/* eslint-disable-next-line react-hooks/static-components -- icon resolved dynamically by template name */}
        <Icon size={22} className="text-white/90" strokeWidth={1.6} />
        {template.premium && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/40 backdrop-blur">
            <Lock size={9} className="text-amber-300" />
          </span>
        )}
      </div>
      <div className="px-1.5 py-1.5" style={{ background: "var(--panel-soft)" }}>
        <p className="truncate text-[10px] font-medium" style={{ color: "var(--text)" }}>
          {template.name}
        </p>
        {compact && (
          <p className="truncate text-[9px]" style={{ color: "var(--text-faint)" }}>
            {template.categoryLabel}
          </p>
        )}
      </div>
    </button>
  );
}
