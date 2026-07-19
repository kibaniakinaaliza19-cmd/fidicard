// Clients du commerce — état de fidélité individuel + historique des passages.
// Chaque client possède un code UNIQUE (le QR de sa carte) : c'est lui que le
// commerçant scanne pour créditer un passage. Mode démo : localStorage ; en
// production, tables `clients` (code_client, tampons, points, paliers_atteints)
// et `passages` — voir db/schema.sql.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { appliquerScan, type LoyaltyConfig, type ScanResult } from "@/lib/loyalty";

export interface PassageEvent {
  date: number;
  type: "tampon" | "points" | "palier" | "reset";
  label: string;
}

export interface LoyaltyClient {
  id: string;
  nom: string;
  /** identifiant unique du QR de la carte client — jamais partagé */
  code: string;
  tampons: number;
  points: number;
  paliersAtteints: number[];
  historique: PassageEvent[];
  createdAt: number;
}

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `FIDI-${s}`;
}

function seedClients(): LoyaltyClient[] {
  const now = Date.now();
  return [
    { id: "c1", nom: "Jean D.", code: "FIDI-JEAND1", tampons: 0, points: 0, paliersAtteints: [], historique: [], createdAt: now - 86400000 * 12 },
    { id: "c2", nom: "Sarah M.", code: "FIDI-SARAM2", tampons: 4, points: 180, paliersAtteints: [], historique: [{ date: now - 86400000 * 2, type: "tampon", label: "+1 tampon (4/10)" }], createdAt: now - 86400000 * 30 },
    { id: "c3", nom: "Karim B.", code: "FIDI-KARIB3", tampons: 8, points: 420, paliersAtteints: [3, 6], historique: [{ date: now - 86400000 * 5, type: "palier", label: "Récompense -15% débloquée" }], createdAt: now - 86400000 * 60 },
  ];
}

interface ClientsState {
  clients: LoyaltyClient[];
  addClient: (nom: string) => LoyaltyClient;
  findByCode: (code: string) => LoyaltyClient | undefined;
  /**
   * Applique un scan au client via le moteur de règles, persiste le nouvel
   * état + l'historique, et retourne le résultat pour l'écran de confirmation.
   */
  scan: (clientId: string, config: LoyaltyConfig, montant?: number) => ScanResult | null;
  resetDemo: () => void;
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      clients: seedClients(),

      addClient: (nom) => {
        const client: LoyaltyClient = {
          id: `c-${Date.now().toString(36)}`,
          nom: nom.trim() || "Client",
          code: makeCode(),
          tampons: 0,
          points: 0,
          paliersAtteints: [],
          historique: [],
          createdAt: Date.now(),
        };
        set((s) => ({ clients: [client, ...s.clients] }));
        return client;
      },

      findByCode: (code) =>
        get().clients.find((c) => c.code.toUpperCase() === code.trim().toUpperCase()),

      scan: (clientId, config, montant) => {
        const client = get().clients.find((c) => c.id === clientId);
        if (!client) return null;
        const result = appliquerScan(
          config,
          { tampons: client.tampons, points: client.points, paliersAtteints: client.paliersAtteints },
          montant,
        );
        if (!result.ok) return result;

        const events: PassageEvent[] = [];
        const now = Date.now();
        if (config.mode === "stamps") {
          const gained = (result.carteCompletee ? config.totalStamps : result.tamponsApres) - result.tamponsAvant;
          events.push({
            date: now,
            type: "tampon",
            label: `+${gained} tampon${gained > 1 ? "s" : ""} (${result.carteCompletee ? config.totalStamps : result.tamponsApres}/${config.totalStamps})`,
          });
        } else {
          events.push({
            date: now,
            type: "points",
            label: `+${result.pointsApres - result.pointsAvant} points (${result.pointsApres})`,
          });
        }
        for (const p of result.paliersDeclenches) {
          events.push({ date: now, type: "palier", label: `Récompense débloquée : ${p.label} — ${p.description}` });
        }
        if (result.carteCompletee) {
          events.push({ date: now, type: "reset", label: "Carte complétée — nouveau cycle" });
        }

        set((s) => ({
          clients: s.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  tampons: result.tamponsApres,
                  points: result.pointsApres,
                  paliersAtteints: result.carteCompletee
                    ? []
                    : [...c.paliersAtteints, ...result.paliersDeclenches.map((p) => p.position)],
                  historique: [...events, ...c.historique].slice(0, 50),
                }
              : c,
          ),
        }));
        return result;
      },

      resetDemo: () => set({ clients: seedClients() }),
    }),
    { name: "fidicard-clients" },
  ),
);
