// Configuration du programme de fidélité du commerce (couche Fonctionnalités).
// Persistée en localStorage en mode démo ; en production ces champs
// correspondent aux colonnes de `commerces` (mode_fidelite, objectif_tampons,
// regle_attribution, taux_conversion, paliers, programme_publie) — voir
// db/schema.sql. Alimentée soit à la main (panneau Fidélité de l'éditeur),
// soit automatiquement par l'import IA d'une carte existante.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_LOYALTY_CONFIG,
  inferTierType,
  type LoyaltyConfig,
  type Palier,
  type ProgramPreset,
} from "@/lib/loyalty";
import type { ImportProgram } from "@/lib/cardImport";

interface LoyaltyState {
  config: LoyaltyConfig;
  /** consigne / réseau social compris depuis une carte importée */
  consigne: string | null;
  social: string | null;
  setConfig: (patch: Partial<LoyaltyConfig>) => void;
  setPaliers: (paliers: Palier[]) => void;
  applyPreset: (preset: ProgramPreset) => void;
  /** Phase 4 de l'import : la logique lue sur la carte remplit le moteur */
  applyImportedProgram: (p: ImportProgram | null) => void;
  reset: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>()(
  persist(
    (set) => ({
      config: DEFAULT_LOYALTY_CONFIG,
      consigne: null,
      social: null,

      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setPaliers: (paliers) => set((s) => ({ config: { ...s.config, paliers } })),
      applyPreset: (preset) =>
        set((s) => ({ config: { ...s.config, ...preset.config } })),

      applyImportedProgram: (p) => {
        if (!p) return;
        set((s) => ({
          config: {
            ...s.config,
            mode: p.type === "points" ? "points" : "stamps",
            totalStamps: p.totalStamps || s.config.totalStamps,
            paliers: p.tiers.map((t) => ({
              position: t.position,
              label: t.reward.slice(0, 8),
              description: t.reward,
              type: inferTierType(t.reward),
            })),
          },
          consigne: p.instructions ?? s.consigne,
          social: p.social ?? s.social,
        }));
      },

      reset: () => set({ config: DEFAULT_LOYALTY_CONFIG, consigne: null, social: null }),
    }),
    { name: "fidicard-loyalty" },
  ),
);
