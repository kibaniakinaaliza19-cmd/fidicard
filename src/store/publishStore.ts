import { create } from "zustand";

/**
 * Publish state for the merchant's loyalty program.
 * The QR sign-up is only active once the program is published — persisted so
 * the Scanner page, the editor and Réglages all agree. Demo-only (localStorage).
 */

const KEY = "fidicard-published";

interface PublishState {
  published: boolean;
  publishedAt: number | null;
  hydrated: boolean;
  publish: () => void;
  unpublish: () => void;
  hydrate: () => void;
}

function save(published: boolean, publishedAt: number | null) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ published, publishedAt }));
  } catch {}
}

export const usePublishStore = create<PublishState>((set, get) => ({
  published: false,
  publishedAt: null,
  hydrated: false,

  publish: () => {
    const publishedAt = Date.now();
    set({ published: true, publishedAt });
    save(true, publishedAt);
  },
  unpublish: () => {
    set({ published: false, publishedAt: null });
    save(false, null);
  },
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as { published?: boolean; publishedAt?: number | null };
        set({ published: !!p.published, publishedAt: p.publishedAt ?? null, hydrated: true });
        return;
      }
    } catch {}
    set({ hydrated: true });
  },
}));
