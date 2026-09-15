"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

/** Small "🔒 Pro" chip for a single locked row/control. Visible, not hidden. */
export function PlanLockBadge({ requiredPlan = "pro" as Plan }: { requiredPlan?: Plan }) {
  const label = PLAN_LIMITS[requiredPlan].label;
  return (
    <Link
      href="/reglages?tab=subscription"
      title={`Disponible avec le plan ${label}`}
      className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:opacity-80"
      style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
    >
      <Lock size={10} /> {label}
    </Link>
  );
}

/**
 * Wraps a whole block (card/section). If the plan doesn't unlock it, the
 * content stays visible but blurred/disabled, with a centered upsell overlay.
 * Seeing the feature — not hiding it — is the point.
 */
export function PlanLockOverlay({
  unlocked,
  requiredPlan = "pro",
  label,
  children,
}: {
  unlocked: boolean;
  requiredPlan?: Plan;
  label?: string;
  children: React.ReactNode;
}) {
  if (unlocked) return <>{children}</>;
  const planLabel = PLAN_LIMITS[requiredPlan].label;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" style={{ filter: "blur(4px)", opacity: 0.55 }} aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="flex max-w-[240px] flex-col items-center gap-2 rounded-2xl border px-5 py-4 text-center shadow-2xl"
          style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--accent-glow)" }}>
            <Lock size={16} className="text-[var(--accent-1)]" />
          </span>
          <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
            {label ?? "Fonctionnalité verrouillée"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
            Disponible avec le plan {planLabel}
          </p>
          <Link
            href="/reglages?tab=subscription"
            className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            <Sparkles size={12} /> Débloquer
          </Link>
        </div>
      </div>
    </div>
  );
}
