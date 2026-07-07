import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  positive?: boolean;
}

export default function StatTile({ label, value, delta, icon: Icon, positive = true }: StatTileProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
        >
          <Icon size={16} />
        </span>
        {delta && (
          <span
            className="text-xs font-semibold"
            style={{ color: positive ? "#4ade80" : "#f87171" }}
          >
            {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold" style={{ color: "var(--text)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
    </div>
  );
}
