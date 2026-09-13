// Local-only client store (demo). Persists QR sign-ups to localStorage so the
// merchant's Clients page can show them. No backend / Supabase involved.

export interface LocalClient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthday: string;
  businessCode: string;
  createdAt: number;
}

const KEY = "fidicard-local-clients";

export function getLocalClients(): LocalClient[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as LocalClient[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// ---- useSyncExternalStore helpers (stable snapshot, reacts to other tabs) ----
const EMPTY: LocalClient[] = [];
let cache: LocalClient[] = EMPTY;
let cacheRaw: string | null = null;

export function localClientsSnapshot(): LocalClient[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      cache = raw ? (JSON.parse(raw) as LocalClient[]) : EMPTY;
    }
    return cache;
  } catch {
    return EMPTY;
  }
}

export function localClientsServerSnapshot(): LocalClient[] {
  return EMPTY;
}

export function subscribeLocalClients(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function addLocalClient(client: Omit<LocalClient, "id" | "createdAt">): LocalClient {
  const entry: LocalClient = {
    ...client,
    id: `lc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
    createdAt: Date.now(),
  };
  try {
    const list = getLocalClients();
    list.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
  return entry;
}
