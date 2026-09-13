"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settingsStore";

/** Loads persisted settings from localStorage once on mount and applies the accent. */
export function useSettingsHydration() {
  const hydrate = useSettingsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
