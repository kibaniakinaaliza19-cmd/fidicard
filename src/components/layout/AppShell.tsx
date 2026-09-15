"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import BottomNav from "@/components/layout/BottomNav";
import Toaster from "@/components/ui/Toaster";
import PublishModal from "@/components/editor/PublishModal";
import WalletPreviewModal from "@/components/editor/WalletPreviewModal";
import { useUIStore } from "@/store/uiStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const pathname = usePathname();
  // seul l'éditeur avancé est plein écran ; le Designer IA garde la sidebar
  // Plein écran : l'éditeur avancé, et le scanner qui occupe toute la vitre.
  const fullBleed =
    pathname?.startsWith("/carte/editeur") || pathname?.startsWith("/scanner/camera");
  const publicPage = pathname?.startsWith("/join");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setTheme(current);
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("fidicard-theme", theme);
    } catch {}
  }, [theme]);

  // Public, chrome-less pages (client QR signup) — no sidebar, no dashboard modals.
  if (publicPage) {
    return <>{children}</>;
  }

  if (fullBleed) {
    return (
      <div className="h-screen w-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        {children}
        <Toaster />
        <PublishModal />
        <WalletPreviewModal />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen w-screen overflow-hidden"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Profondeur du fond.
       *
       * Deux voiles orange de 400 px couvraient auparavant toute la fenêtre et
       * repeignaient les pages en brun : les cartes cessaient de s'en détacher
       * et le texte secondaire passait sous le seuil de contraste. Ce qui reste
       * est d'un ordre de grandeur plus faible (0,05 contre 0,5 d'opacité) et
       * ancré dans les angles. On ne doit pas se dire « tiens, un dégradé » —
       * seulement sentir que le fond n'est pas une surface morte. */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 40% at 100% 0%, rgba(255,90,31,0.05), transparent 60%)," +
            "radial-gradient(50% 35% at 0% 100%, rgba(255,90,31,0.035), transparent 60%)",
        }}
      />

      <Sidebar />
      <main
        className="relative flex-1 overflow-y-auto"
        style={{
          zIndex: "var(--z-content)",
          // La navigation basse recouvre le bas de l'écran sur mobile : sans
          // cette réserve, le dernier élément de chaque page est inatteignable.
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
        }}
      >
        <MobileHeader />
        {children}
      </main>
      <BottomNav />
      <Toaster />
      <PublishModal />
      <WalletPreviewModal />
    </div>
  );
}
