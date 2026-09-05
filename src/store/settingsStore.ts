import { create } from "zustand";

/* -------------------------------------------------------------------------- */
/*  Accent presets — applied live to the CSS custom properties.               */
/* -------------------------------------------------------------------------- */

export type AccentKey = "orange" | "violet" | "blue" | "green" | "rose";

export const ACCENTS: Record<
  AccentKey,
  { label: string; a1: string; a2: string; glow: string }
> = {
  orange: { label: "Orange", a1: "#ff6a3d", a2: "#e0342c", glow: "rgba(240,101,62,0.35)" },
  violet: { label: "Violet", a1: "#8b5cf6", a2: "#6d28d9", glow: "rgba(139,92,246,0.35)" },
  blue: { label: "Bleu", a1: "#3b82f6", a2: "#2563eb", glow: "rgba(59,130,246,0.35)" },
  green: { label: "Vert", a1: "#22c55e", a2: "#16a34a", glow: "rgba(34,197,94,0.35)" },
  rose: { label: "Rose", a1: "#f43f5e", a2: "#e11d48", glow: "rgba(244,63,94,0.35)" },
};

export function applyAccent(key: AccentKey) {
  if (typeof document === "undefined") return;
  const a = ACCENTS[key] ?? ACCENTS.orange;
  const root = document.documentElement.style;
  root.setProperty("--accent-1", a.a1);
  root.setProperty("--accent-2", a.a2);
  root.setProperty("--accent-glow", a.glow);
}

/* -------------------------------------------------------------------------- */
/*  Preference toggles — persisted, functional (demo: no backend side-effect). */
/* -------------------------------------------------------------------------- */

export type NotifPrefKey =
  | "push"
  | "email"
  | "sms"
  | "birthday"
  | "loyal"
  | "cardCreated"
  | "cardUsed"
  | "promos"
  | "campaigns"
  | "googleReviews";

export type Language = "fr" | "en" | "es" | "de";

interface SettingsState {
  accent: AccentKey;
  reduceMotion: boolean;
  autosave: boolean;
  developerMode: boolean;
  language: Language;
  notif: Record<NotifPrefKey, boolean>;
  hydrated: boolean;
  setAccent: (a: AccentKey) => void;
  setReduceMotion: (v: boolean) => void;
  setAutosave: (v: boolean) => void;
  setDeveloperMode: (v: boolean) => void;
  setLanguage: (l: Language) => void;
  toggleNotif: (k: NotifPrefKey) => void;
  hydrate: () => void;
}

const STORAGE_KEY = "fidicard-settings";

const defaultNotif: Record<NotifPrefKey, boolean> = {
  push: true,
  email: true,
  sms: false,
  birthday: true,
  loyal: true,
  cardCreated: true,
  cardUsed: false,
  promos: true,
  campaigns: true,
  googleReviews: false,
};

type Persisted = Pick<
  SettingsState,
  "accent" | "reduceMotion" | "autosave" | "developerMode" | "language" | "notif"
>;

function persist(s: SettingsState) {
  try {
    const data: Persisted = {
      accent: s.accent,
      reduceMotion: s.reduceMotion,
      autosave: s.autosave,
      developerMode: s.developerMode,
      language: s.language,
      notif: s.notif,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  accent: "orange",
  reduceMotion: false,
  autosave: true,
  developerMode: false,
  language: "fr",
  notif: defaultNotif,
  hydrated: false,

  setAccent: (accent) => {
    applyAccent(accent);
    set({ accent });
    persist(get());
  },
  setReduceMotion: (reduceMotion) => {
    if (typeof document !== "undefined")
      document.documentElement.setAttribute("data-reduce-motion", String(reduceMotion));
    set({ reduceMotion });
    persist(get());
  },
  setAutosave: (autosave) => {
    set({ autosave });
    persist(get());
  },
  setDeveloperMode: (developerMode) => {
    set({ developerMode });
    persist(get());
  },
  setLanguage: (language) => {
    set({ language });
    persist(get());
  },
  toggleNotif: (k) => {
    set((s) => ({ notif: { ...s.notif, [k]: !s.notif[k] } }));
    persist(get());
  },

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>;
        set({
          accent: p.accent ?? "orange",
          reduceMotion: p.reduceMotion ?? false,
          autosave: p.autosave ?? true,
          developerMode: p.developerMode ?? false,
          language: p.language ?? "fr",
          notif: { ...defaultNotif, ...(p.notif ?? {}) },
          hydrated: true,
        });
        applyAccent(p.accent ?? "orange");
        if (p.reduceMotion)
          document.documentElement.setAttribute("data-reduce-motion", "true");
        return;
      }
    } catch {}
    set({ hydrated: true });
  },
}));
