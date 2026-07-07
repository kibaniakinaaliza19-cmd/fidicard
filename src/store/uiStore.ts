import { create } from "zustand";

export type Theme = "dark" | "light";
export type RightTab = "proprietes" | "elements";

interface Toast {
  id: number;
  message: string;
}

interface UIState {
  theme: Theme;
  rightTab: RightTab;
  templateGalleryOpen: boolean;
  walletPreviewOpen: boolean;
  publishModalOpen: boolean;
  aiAssistantOpen: boolean;
  toasts: Toast[];
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setRightTab: (tab: RightTab) => void;
  setTemplateGalleryOpen: (open: boolean) => void;
  setWalletPreviewOpen: (open: boolean) => void;
  setPublishModalOpen: (open: boolean) => void;
  setAiAssistantOpen: (open: boolean) => void;
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  rightTab: "proprietes",
  templateGalleryOpen: false,
  walletPreviewOpen: false,
  publishModalOpen: false,
  aiAssistantOpen: false,
  toasts: [],

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  setRightTab: (tab) => set({ rightTab: tab }),
  setTemplateGalleryOpen: (open) => set({ templateGalleryOpen: open }),
  setWalletPreviewOpen: (open) => set({ walletPreviewOpen: open }),
  setPublishModalOpen: (open) => set({ publishModalOpen: open }),
  setAiAssistantOpen: (open) => set({ aiAssistantOpen: open }),
  pushToast: (message) =>
    set((state) => ({ toasts: [...state.toasts, { id: ++toastId, message }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
