// Programme de fidélité du commerce — alimenté par l'import de carte (Phase 4)
// ou modifiable à la main. Persisté en localStorage en mode démo ; en
// production ces champs correspondent aux colonnes de `commerces`
// (mode_fidelite, objectif_tampons, paliers, consigne, reseau_social) — voir
// db/schema.sql.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ImportProgram } from "@/lib/cardImport";

interface ProgramState {
  program: ImportProgram | null;
  setProgram: (p: ImportProgram | null) => void;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      program: null,
      setProgram: (program) => set({ program }),
    }),
    { name: "fidicard-program" },
  ),
);
