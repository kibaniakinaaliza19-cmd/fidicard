"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePlanStore } from "@/store/planStore";
import { planLimits, type Plan } from "@/lib/plans";

/**
 * Resolves the connected commerce's plan and its capability limits.
 *
 * Real path (once Supabase is configured): reads `commerces.plan` for the
 * signed-in owner. Demo path (no backend configured, or no commerce row
 * found yet): falls back to a locally persisted plan, defaulting to
 * "starter" — same fallback the real lookup would use for a commerce that
 * hasn't finished onboarding. Switchable from Réglages > Abonnement.
 */
export function usePlan() {
  const plan = usePlanStore((s) => s.plan);
  const hydrated = usePlanStore((s) => s.hydrated);
  const hydrate = usePlanStore((s) => s.hydrate);
  const setPlan = usePlanStore((s) => s.setPlan);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const ownerId = auth?.user?.id;
        if (!ownerId) return;
        const { data } = await supabase
          .from("commerces")
          .select("plan")
          .eq("owner_id", ownerId)
          .single();
        const remotePlan = data?.plan as Plan | undefined;
        if (!cancelled && remotePlan) setPlan(remotePlan);
      } catch {
        // No commerce row yet (or table not provisioned) — keep the demo/local plan.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setPlan]);

  return { plan, hydrated, limits: planLimits(plan), setPlan };
}
