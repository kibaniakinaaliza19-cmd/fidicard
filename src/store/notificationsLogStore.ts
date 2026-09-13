import { create } from "zustand";

// Local-only log of sent/scheduled notifications (demo). Stands in for the
// `notifications` table (db/schema.sql) — powers the monthly quota until a
// backend is wired.

interface SentEntry {
  id: string;
  message: string;
  createdAt: number;
}

const KEY = "fidicard-sent-notifications";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function persist(entries: SentEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-500)));
  } catch {}
}

interface LogState {
  entries: SentEntry[];
  hydrated: boolean;
  hydrate: () => void;
  logSend: (message: string) => void;
}

export const useNotificationsLogStore = create<LogState>((set, get) => ({
  entries: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as SentEntry[]) : [];
      set({ entries: Array.isArray(parsed) ? parsed : [], hydrated: true });
      return;
    } catch {}
    set({ hydrated: true });
  },

  logSend: (message) => {
    const entry: SentEntry = {
      id: `sn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      message,
      createdAt: Date.now(),
    };
    const entries = [...get().entries, entry];
    set({ entries });
    persist(entries);
  },
}));

/** Reactive count of notifications sent/scheduled this calendar month. */
export function useSentThisMonth(): number {
  const entries = useNotificationsLogStore((s) => s.entries);
  const mk = monthKey(new Date());
  return entries.filter((e) => monthKey(new Date(e.createdAt)) === mk).length;
}
