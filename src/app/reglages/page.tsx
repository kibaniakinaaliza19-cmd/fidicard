"use client";

import { Moon, Sun, LogOut, Crown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useUIStore } from "@/store/uiStore";

export default function ReglagesPage() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <div>
      <PageHeader title="Réglages" subtitle="Gérez votre compte et vos préférences" />
      <div className="grid max-w-2xl grid-cols-1 gap-4 px-8 pb-10">
        <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>
            Compte
          </h2>
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
            >
              CM
            </span>
            <div>
              <p className="font-medium" style={{ color: "var(--text)" }}>Café Madeleine</p>
              <p className="text-sm" style={{ color: "var(--text-faint)" }}>contact@cafemadeleine.fr</p>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between rounded-2xl border p-6"
          style={{ borderColor: "var(--border-strong)", background: "linear-gradient(150deg, rgba(224,52,44,0.2), var(--panel))" }}
        >
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-[var(--accent-1)]" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Plan Gratuit</p>
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>Passez au plan Premium pour débloquer tous les modèles</p>
            </div>
          </div>
          <button
            onClick={() => pushToast("La page Premium arrive bientôt.")}
            className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            Mettre à niveau
          </button>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>
            Apparence
          </h2>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              Mode {theme === "dark" ? "nuit" : "jour"}
            </span>
            <button
              onClick={toggleTheme}
              className="relative h-6 w-11 cursor-pointer rounded-full transition-colors"
              style={{ background: theme === "dark" ? "var(--accent-1)" : "var(--border-strong)" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                style={{ transform: theme === "dark" ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        </div>

        <button
          onClick={() => pushToast("Déconnexion simulée")}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition-colors hover:border-red-500 hover:text-red-500"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
        >
          <LogOut size={15} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
