"use client";

import { useEffect, useRef } from "react";
import { useCardStore } from "@/store/cardStore";

const STORAGE_KEY = "fidicard-card-doc";

export function useAutosaveCard() {
  const card = useCardStore((s) => s.card);
  const loadCard = useCardStore((s) => s.loadCard);
  const markSaved = useCardStore((s) => s.markSaved);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loadCard(JSON.parse(raw));
    } catch {}
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(card));
        markSaved();
      } catch {}
    }, 700);
    return () => clearTimeout(timer);
  }, [card, markSaved]);
}
