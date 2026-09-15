// Single source of truth for what each subscription plan unlocks.
// The plan is stored on the commerce (`commerces.plan`) — see usePlan().

export type Plan = "starter" | "pro" | "business";

export const PLAN_LIMITS = {
  starter: {
    label: "Starter",
    prix: "39,99 €",
    notifsParMois: 4,
    avisGoogleAuto: false,
    automatisations: false, // relance inactif, anniversaire
    statsAvancees: false,
    multiEtablissements: false,
  },
  pro: {
    label: "Pro",
    prix: "69,90 €",
    notifsParMois: 50,
    avisGoogleAuto: true,
    automatisations: true,
    statsAvancees: true,
    multiEtablissements: false,
  },
  business: {
    label: "Business",
    prix: "130,98 €",
    notifsParMois: -1, // illimité
    avisGoogleAuto: true,
    automatisations: true,
    statsAvancees: true,
    multiEtablissements: true,
  },
} as const;

export function planLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

export const PLAN_ORDER: Plan[] = ["starter", "pro", "business"];

export function nextPlan(plan: Plan): Plan | null {
  const i = PLAN_ORDER.indexOf(plan);
  return i >= 0 && i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1] : null;
}

/** True once `plan` is at or above `required` in capability order. */
export function planAtLeast(plan: Plan, required: Plan): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(required);
}
