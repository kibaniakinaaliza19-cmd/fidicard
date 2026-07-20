// Tampons importés par le commerçant (PNG/SVG). Persistés localement en mode
// démo ; en production → colonne commerces.tampons_perso jsonb.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomStamp {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

interface CustomStampsState {
  stamps: CustomStamp[];
  add: (name: string, dataUrl: string) => CustomStamp;
  remove: (id: string) => void;
}

export const useCustomStampsStore = create<CustomStampsState>()(
  persist(
    (set) => ({
      stamps: [],
      add: (name, dataUrl) => {
        const stamp: CustomStamp = {
          id: `custom-${Date.now().toString(36)}`,
          name: name.trim() || "Mon tampon",
          dataUrl,
          createdAt: Date.now(),
        };
        set((s) => ({ stamps: [stamp, ...s.stamps].slice(0, 60) }));
        return stamp;
      },
      remove: (id) => set((s) => ({ stamps: s.stamps.filter((x) => x.id !== id) })),
    }),
    { name: "fidicard-custom-stamps" },
  ),
);
