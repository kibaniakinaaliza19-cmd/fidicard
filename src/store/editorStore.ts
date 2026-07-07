import { create } from "zustand";
import type {
  CardBackground,
  CardColors,
  CardDesign,
  CardFormat,
  CardInfo,
  CardLogo,
  CardLoyalty,
  CardReward,
  CardStyle,
} from "@/types/card";
import { templates } from "@/data/templates";

export const TOOL_IDS = [
  "background",
  "logo",
  "name",
  "colors",
  "loyalty",
  "reward",
  "icon",
  "info",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

const defaultDesign: CardDesign = {
  templateId: "coffee-premium",
  companyName: "COFFEE HOUSE",
  tagline: "Votre pause, notre passion",
  logo: { url: null, size: 48, rotation: 0, glow: false, position: "left" },
  background: { imageUrl: null, dim: 25 },
  colors: { primary: "#f0653e", secondary: "#1a0a02", accent: "#ffb703", background: "#0f0603" },
  loyalty: {
    type: "stamps",
    stampsCount: 10,
    stampsFilled: 6,
    stampShape: "drop",
    stampColor: "#fdf3e7",
    pointsPerEuro: 1,
    pointsForReward: 100,
    currentPoints: 60,
  },
  reward: { title: "1 café offert", subtitle: "à 10 tampons", icon: "Gift" },
  info: {
    phone: "",
    email: "",
    website: "",
    address: "",
    hours: "",
    whatsapp: "",
  },
  style: { borderRadius: 16 },
};

interface EditorState {
  design: CardDesign;
  selectedTool: ToolId | null;
  format: CardFormat;
  flipped: boolean;
  dirty: boolean;
  setSelectedTool: (tool: ToolId | null) => void;
  toggleTool: (tool: ToolId) => void;
  setFormat: (format: CardFormat) => void;
  setFlipped: (flipped: boolean) => void;
  applyTemplate: (templateId: string) => void;
  setCompanyName: (name: string) => void;
  setTagline: (tagline: string) => void;
  updateLogo: (patch: Partial<CardLogo>) => void;
  updateBackground: (patch: Partial<CardBackground>) => void;
  updateColors: (patch: Partial<CardColors>) => void;
  updateLoyalty: (patch: Partial<CardLoyalty>) => void;
  updateReward: (patch: Partial<CardReward>) => void;
  updateInfo: (patch: Partial<CardInfo>) => void;
  updateStyle: (patch: Partial<CardStyle>) => void;
  applyPatch: (patch: Partial<CardDesign>) => void;
  loadDesign: (design: CardDesign) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  design: defaultDesign,
  selectedTool: null,
  format: "iphone",
  flipped: false,
  dirty: false,

  setSelectedTool: (tool) => set({ selectedTool: tool }),
  toggleTool: (tool) =>
    set((state) => ({ selectedTool: state.selectedTool === tool ? null : tool })),
  setFormat: (format) => set({ format }),
  setFlipped: (flipped) => set({ flipped }),

  applyTemplate: (templateId) =>
    set((state) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return state;
      return {
        design: {
          ...defaultDesign,
          ...template.config,
          templateId: template.id,
          logo: { ...defaultDesign.logo, ...template.config.logo },
          background: { ...defaultDesign.background, ...template.config.background },
          colors: { ...defaultDesign.colors, ...template.config.colors },
          loyalty: { ...defaultDesign.loyalty, ...template.config.loyalty },
          reward: { ...defaultDesign.reward, ...template.config.reward },
          info: { ...defaultDesign.info, ...template.config.info },
          style: { ...defaultDesign.style, ...template.config.style },
        },
        dirty: true,
      };
    }),

  setCompanyName: (name) =>
    set((state) => ({ design: { ...state.design, companyName: name }, dirty: true })),
  setTagline: (tagline) =>
    set((state) => ({ design: { ...state.design, tagline }, dirty: true })),
  updateLogo: (patch) =>
    set((state) => ({
      design: { ...state.design, logo: { ...state.design.logo, ...patch } },
      dirty: true,
    })),
  updateBackground: (patch) =>
    set((state) => ({
      design: { ...state.design, background: { ...state.design.background, ...patch } },
      dirty: true,
    })),
  updateColors: (patch) =>
    set((state) => ({
      design: { ...state.design, colors: { ...state.design.colors, ...patch } },
      dirty: true,
    })),
  updateLoyalty: (patch) =>
    set((state) => ({
      design: { ...state.design, loyalty: { ...state.design.loyalty, ...patch } },
      dirty: true,
    })),
  updateReward: (patch) =>
    set((state) => ({
      design: { ...state.design, reward: { ...state.design.reward, ...patch } },
      dirty: true,
    })),
  updateInfo: (patch) =>
    set((state) => ({
      design: { ...state.design, info: { ...state.design.info, ...patch } },
      dirty: true,
    })),
  updateStyle: (patch) =>
    set((state) => ({
      design: { ...state.design, style: { ...state.design.style, ...patch } },
      dirty: true,
    })),

  applyPatch: (patch) =>
    set((state) => {
      const design = { ...state.design };
      if (patch.colors) design.colors = { ...design.colors, ...patch.colors };
      if (patch.loyalty) design.loyalty = { ...design.loyalty, ...patch.loyalty };
      if (patch.reward) design.reward = { ...design.reward, ...patch.reward };
      if (patch.style) design.style = { ...design.style, ...patch.style };
      if (patch.logo) design.logo = { ...design.logo, ...patch.logo };
      if (patch.background) design.background = { ...design.background, ...patch.background };
      if (patch.info) design.info = { ...design.info, ...patch.info };
      if (patch.companyName) design.companyName = patch.companyName;
      if (patch.tagline) design.tagline = patch.tagline;
      return { design, dirty: true };
    }),

  loadDesign: (design) => set({ design, dirty: false }),
  reset: () => set({ design: defaultDesign, selectedTool: null, dirty: false }),
}));

export { defaultDesign };
