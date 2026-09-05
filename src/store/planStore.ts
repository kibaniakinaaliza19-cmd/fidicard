import { create } from "zustand";
import type { Plan } from "@/lib/plans";

const KEY = "fidicard-demo-plan";

interface PlanState {
  plan: Plan;
  hydrated: boolean;
  setPlan: (p: Plan) => void;
  hydrate: () => void;
}

function isPlan(v: unknown): v is Plan {
  return v === "starter" || v === "pro" || v === "business";
}

/**
 * Demo-mode plan store: stands in for `commerces.plan` while there is no
 * Supabase session to read it from. Persisted so the choice sticks, and
 * switchable from Réglages > Abonnement so the gating can be demonstrated.
 */
export const usePlanStore = create<PlanState>((set, get) => ({
  plan: "starter",
  hydrated: false,

  setPlan: (plan) => {
    set({ plan });
    try {
      localStorage.setItem(KEY, plan);
    } catch {}
  },

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (isPlan(raw)) {
        set({ plan: raw, hydrated: true });
        return;
      }
    } catch {}
    set({ hydrated: true });
  },
}));
