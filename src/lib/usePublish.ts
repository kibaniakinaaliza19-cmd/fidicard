"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePublishStore } from "@/store/publishStore";
import { hasSavedCard } from "@/lib/configSteps";

function subscribeCard(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("focus", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("focus", cb);
  };
}

/** Hydration-safe "has the merchant saved a card?" flag. */
export function useCardCreated(): boolean {
  return useSyncExternalStore(subscribeCard, hasSavedCard, () => false);
}

/** Loads the persisted publish flag once on mount. */
export function usePublishHydration() {
  const hydrate = usePublishStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
