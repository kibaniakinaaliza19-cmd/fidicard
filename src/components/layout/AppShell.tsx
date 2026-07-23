"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Toaster from "@/components/ui/Toaster";
import PublishModal from "@/components/editor/PublishModal";
import WalletPreviewModal from "@/components/editor/WalletPreviewModal";
import { useUIStore } from "@/store/uiStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const pathname = usePathname();
  // seul l'éditeur avancé est plein écran ; le Designer IA garde la sidebar
  const fullBleed = pathname?.startsWith("/carte/editeur");
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
    <div className="relative flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <div
        className="glow-blob left-[-10%] top-[-10%] h-[420px] w-[420px]"
        style={{ background: "var(--accent-2)" }}
      />
      <div
        className="glow-blob bottom-[-15%] right-[-5%] h-[520px] w-[520px]"
        style={{ background: "var(--accent-1)" }}
      />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto">{children}</main>
      <Toaster />
      <PublishModal />
      <WalletPreviewModal />
    </div>
  );
}
