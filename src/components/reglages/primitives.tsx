"use client";

import { useEffect, useRef, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Badges                                                                     */
/* -------------------------------------------------------------------------- */

export function SoonBadge({ label = "Bientôt" }: { label?: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: "rgba(245,245,244,0.08)", color: "var(--text-faint)" }}
    >
      {label}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
    >
      Démo
    </span>
  );
}

export function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        background: ok ? "#4CAF7D" : "var(--text-faint)",
        boxShadow: ok ? "0 0 8px #4CAF7D" : "none",
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Toggle                                                                     */
/* -------------------------------------------------------------------------- */

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
      style={{
        background: checked ? "var(--accent-1)" : "var(--border-strong)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout cards / rows                                                        */
/* -------------------------------------------------------------------------- */

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border p-6 ${className ?? ""}`}
      style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
    >
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function SettingRow({
  icon: Icon,
  label,
  hint,
  control,
  muted,
}: {
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  hint?: string;
  control: React.ReactNode;
  muted?: boolean;
}) {
  const color = muted ? "rgba(245,245,244,0.45)" : "var(--text)";
  return (
    <div className="flex items-center gap-3 py-3">
      {Icon && <Icon size={16} style={{ color: muted ? "rgba(245,245,244,0.45)" : "var(--text-dim)" }} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" style={{ color }}>
          {label}
        </p>
        {hint && (
          <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>
            {hint}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Animated counter                                                          */
/* -------------------------------------------------------------------------- */

export function AnimatedCounter({
  value,
  duration = 1100,
  reduceMotion,
}: {
  value: number;
  duration?: number;
  reduceMotion?: boolean;
}) {
  const [display, setDisplay] = useState(() => (reduceMotion ? value : 0));
  const started = useRef(false);

  useEffect(() => {
    // Jump straight to the value (no intro animation) when motion is reduced
    // or the count-up already played once. rAF keeps the set out of the effect body.
    if (reduceMotion || started.current) {
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }
    started.current = true;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduceMotion]);

  return <>{display.toLocaleString("fr-FR")}</>;
}
