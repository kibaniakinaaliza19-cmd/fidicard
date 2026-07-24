import { create } from "zustand";
import type { CardBackground, CardDoc, Layer, Zone } from "@/types/layer";
import { cloneLayer, makeId } from "@/lib/layerFactory";
import { createBlankCard } from "@/data/blankCard";
import { migrateCardDoc } from "@/lib/migrateCard";

export type DrawerId =
  | "fidelite"
  | "modeles"
  | "tampons"
  | "texte"
  | "images"
  | "formes"
  | "qrcode"
  | "codebarres"
  | "upload"
  | "couleurs"
  | "arriereplan";

export type AlignType = "left" | "centerH" | "right" | "top" | "centerV" | "bottom";

const HISTORY_LIMIT = 60;

function cloneCard(card: CardDoc): CardDoc {
  return JSON.parse(JSON.stringify(card));
}

function nextZIndex(layers: Layer[]) {
  return layers.reduce((max, l) => Math.max(max, l.zIndex), 0) + 1;
}

interface CardState {
  card: CardDoc;
  selectedIds: string[];
  /** zone fonctionnelle sélectionnée (v2) — exclusif avec selectedIds */
  selectedZoneId: string | null;
  clipboard: Layer[];
  history: CardDoc[];
  historyIndex: number;
  zoom: number;
  showGrid: boolean;
  activeDrawer: DrawerId | null;
  recentColors: string[];
  guides: { x: number | null; y: number | null };
  lastSavedAt: number | null;

  selectLayer: (id: string, additive?: boolean) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;
  selectZone: (id: string | null) => void;
  /** déplacement/redimensionnement live d'une zone (sans point d'historique) */
  updateZoneLive: (id: string, patch: Partial<Zone>) => void;
  /** convertit une zone en calques concrets (« Détacher la grille ») */
  detachZone: (zoneId: string, layers: Layer[]) => void;

  addLayer: (layer: Layer) => void;
  /** transformation en masse des calques (grille de tampons, paliers…) — un seul point d'historique */
  replaceLayers: (mutate: (layers: Layer[]) => Layer[]) => void;
  /** patch d'une zone fonctionnelle (v2) — un point d'historique */
  updateZone: (id: string, patch: Partial<Zone>) => void;
  addZone: (zone: Zone) => void;
  updateLayerLive: (id: string, patch: Partial<Layer>) => void;
  updateLayersLive: (patches: Record<string, Partial<Layer>>) => void;
  commitLayerChange: (id: string, patch: Partial<Layer>) => void;
  commit: () => void;
  setGuides: (guides: { x: number | null; y: number | null }) => void;

  deleteSelected: () => void;
  duplicateSelected: () => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  reorderLayer: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  reorderLayerToIndex: (id: string, targetIndex: number) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  align: (type: AlignType) => void;
  moveSelectedBy: (dx: number, dy: number) => void;

  setBackground: (patch: Partial<CardBackground>) => void;

  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;

  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleGrid: () => void;
  setActiveDrawer: (id: DrawerId | null) => void;

  applyTemplate: (doc: CardDoc) => void;
  loadCard: (doc: CardDoc) => void;
  resetCard: () => void;
  setCardName: (name: string) => void;

  pushRecentColor: (color: string) => void;
  markSaved: () => void;
}

const initialCard = createBlankCard();

export const useCardStore = create<CardState>((set, get) => ({
  card: initialCard,
  selectedIds: [],
  selectedZoneId: null,
  clipboard: [],
  history: [cloneCard(initialCard)],
  historyIndex: 0,
  zoom: 1,
  showGrid: true,
  activeDrawer: null,
  recentColors: [],
  guides: { x: null, y: null },
  lastSavedAt: null,

  selectLayer: (id, additive) =>
    set((state) => {
      if (additive) {
        const exists = state.selectedIds.includes(id);
        return { selectedZoneId: null, selectedIds: exists ? state.selectedIds.filter((i) => i !== id) : [...state.selectedIds, id] };
      }
      return { selectedIds: [id], selectedZoneId: null };
    }),
  selectMany: (ids) => set({ selectedIds: ids, selectedZoneId: null }),
  clearSelection: () => set({ selectedIds: [], selectedZoneId: null }),
  selectZone: (id) => set({ selectedZoneId: id, selectedIds: [] }),

  updateZoneLive: (id, patch) =>
    set((state) => ({
      card: {
        ...state.card,
        zones: (state.card.zones ?? []).map((z) => (z.id === id ? ({ ...z, ...patch } as Zone) : z)),
      },
    })),

  detachZone: (zoneId, layers) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.zones = (card.zones ?? []).filter((z) => z.id !== zoneId);
      let z = nextZIndex(card.layers);
      const fresh = layers.map((l) => ({ ...l, id: makeId("layer"), groupId: null, zIndex: z++ } as Layer));
      card.layers = [...card.layers, ...fresh];
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, selectedZoneId: null, selectedIds: [], history: next, historyIndex: next.length - 1 };
    }),

  addLayer: (layer) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers.push(layer);
      card.updatedAt = Date.now();
      return { card, selectedIds: [layer.id] };
    }),

  replaceLayers: (mutate) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers = mutate(card.layers);
      card.layers.forEach((l, i) => (l.zIndex = i + 1));
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, selectedIds: [], history: next, historyIndex: next.length - 1 };
    }),

  addZone: (zone) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.version = 2;
      card.zones = [...(card.zones ?? []), zone];
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  updateZone: (id, patch) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.zones = (card.zones ?? []).map((z) => (z.id === id ? ({ ...z, ...patch } as Zone) : z));
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  updateLayerLive: (id, patch) =>
    set((state) => ({
      card: {
        ...state.card,
        layers: state.card.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
      },
    })),

  updateLayersLive: (patches) =>
    set((state) => ({
      card: {
        ...state.card,
        layers: state.card.layers.map((l) => (patches[l.id] ? ({ ...l, ...patches[l.id] } as Layer) : l)),
      },
    })),

  commitLayerChange: (id, patch) => {
    get().updateLayerLive(id, patch);
    get().commit();
  },

  setGuides: (guides) => set({ guides }),

  commit: () =>
    set((state) => {
      const card = { ...state.card, updatedAt: Date.now() };
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  deleteSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) return state;
      const card = cloneCard(state.card);
      card.layers = card.layers.filter((l) => !state.selectedIds.includes(l.id));
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, selectedIds: [], history: next, historyIndex: next.length - 1 };
    }),

  duplicateSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) return state;
      const card = cloneCard(state.card);
      const clones = card.layers
        .filter((l) => state.selectedIds.includes(l.id))
        .map((l) => cloneLayer(l, nextZIndex(card.layers)));
      card.layers.push(...clones);
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return {
        card,
        selectedIds: clones.map((c) => c.id),
        history: next,
        historyIndex: next.length - 1,
      };
    }),

  toggleLock: (id) => {
    const layer = get().card.layers.find((l) => l.id === id);
    if (!layer) return;
    get().commitLayerChange(id, { locked: !layer.locked });
  },
  toggleHidden: (id) => {
    const layer = get().card.layers.find((l) => l.id === id);
    if (!layer) return;
    get().commitLayerChange(id, { hidden: !layer.hidden });
  },
  renameLayer: (id, name) => get().commitLayerChange(id, { name }),

  reorderLayer: (id, direction) =>
    set((state) => {
      const card = cloneCard(state.card);
      const sorted = [...card.layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      if (idx === -1) return state;

      if (direction === "front") sorted.push(sorted.splice(idx, 1)[0]);
      else if (direction === "back") sorted.unshift(sorted.splice(idx, 1)[0]);
      else if (direction === "forward" && idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      } else if (direction === "backward" && idx > 0) {
        [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
      }

      sorted.forEach((l, i) => (l.zIndex = i + 1));
      card.layers = sorted;
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  reorderLayerToIndex: (id, targetIndex) =>
    set((state) => {
      const card = cloneCard(state.card);
      const sorted = [...card.layers].sort((a, b) => a.zIndex - b.zIndex);
      const from = sorted.findIndex((l) => l.id === id);
      if (from === -1) return state;
      const [moved] = sorted.splice(from, 1);
      sorted.splice(targetIndex, 0, moved);
      sorted.forEach((l, i) => (l.zIndex = i + 1));
      card.layers = sorted;
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  groupSelected: () =>
    set((state) => {
      if (state.selectedIds.length < 2) return state;
      const groupId = makeId("group");
      const card = cloneCard(state.card);
      card.layers = card.layers.map((l) =>
        state.selectedIds.includes(l.id) ? { ...l, groupId } : l
      );
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  ungroupSelected: () =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers = card.layers.map((l) =>
        state.selectedIds.includes(l.id) ? { ...l, groupId: null } : l
      );
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  align: (type) =>
    set((state) => {
      const card = cloneCard(state.card);
      const targets = card.layers.filter((l) => state.selectedIds.includes(l.id));
      targets.forEach((l) => {
        if (type === "left") l.x = 0;
        if (type === "right") l.x = 100 - l.width;
        if (type === "centerH") l.x = (100 - l.width) / 2;
        if (type === "top") l.y = 0;
        if (type === "bottom") l.y = 100 - l.height;
        if (type === "centerV") l.y = (100 - l.height) / 2;
      });
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  moveSelectedBy: (dx, dy) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers = card.layers.map((l) =>
        state.selectedIds.includes(l.id) && !l.locked ? { ...l, x: l.x + dx, y: l.y + dy } : l
      );
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  setBackground: (patch) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.background = { ...card.background, ...patch };
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { card: cloneCard(state.history[idx]), historyIndex: idx, selectedIds: [] };
    }),
  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { card: cloneCard(state.history[idx]), historyIndex: idx, selectedIds: [] };
    }),

  copySelected: () =>
    set((state) => ({
      clipboard: state.card.layers.filter((l) => state.selectedIds.includes(l.id)),
    })),
  pasteClipboard: () =>
    set((state) => {
      if (state.clipboard.length === 0) return state;
      const card = cloneCard(state.card);
      const clones = state.clipboard.map((l) => cloneLayer(l, nextZIndex(card.layers)));
      card.layers.push(...clones);
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return {
        card,
        selectedIds: clones.map((c) => c.id),
        history: next,
        historyIndex: next.length - 1,
      };
    }),

  setZoom: (z) => set({ zoom: Math.min(2, Math.max(0.4, z)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(2, Math.round((state.zoom + 0.1) * 100) / 100) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.4, Math.round((state.zoom - 0.1) * 100) / 100) })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setActiveDrawer: (id) => set((state) => ({ activeDrawer: state.activeDrawer === id ? null : id })),

  applyTemplate: (doc) =>
    set(() => {
      // tout document entrant passe en v2 : la grille devient une zone
      const card = migrateCardDoc(cloneCard(doc));
      card.id = makeId("card");
      card.updatedAt = Date.now();
      const next = [cloneCard(card)];
      return { card, selectedIds: [], history: next, historyIndex: 0 };
    }),

  loadCard: (doc) => {
    const card = migrateCardDoc(doc);
    set({ card, selectedIds: [], history: [cloneCard(card)], historyIndex: 0 });
  },

  resetCard: () => {
    const fresh = createBlankCard();
    set({ card: fresh, selectedIds: [], history: [cloneCard(fresh)], historyIndex: 0 });
  },

  setCardName: (name) =>
    set((state) => ({ card: { ...state.card, name, updatedAt: Date.now() } })),

  pushRecentColor: (color) =>
    set((state) => ({
      recentColors: [color, ...state.recentColors.filter((c) => c !== color)].slice(0, 10),
    })),

  markSaved: () => set({ lastSavedAt: Date.now() }),
}));
