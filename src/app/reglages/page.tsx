"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Info,
  Pencil,
  BadgeCheck,
  Lock,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Bell,
  Puzzle,
  Database,
  Radio,
  FileText,
  HelpCircle,
  CreditCard,
  Users,
  QrCode,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useUIStore } from "@/store/uiStore";
import { supabase } from "@/lib/supabase";

const GOLD = "#F4B942";
const SUCCESS = "#4CAF7D";

/** Small "Bientôt" pill for anything not yet wired. */
function SoonBadge() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: "rgba(245,245,244,0.08)", color: "var(--text-faint)" }}
    >
      Bientôt
    </span>
  );
}

const devFeatures = [
  { icon: Bell, label: "Notifications automatiques" },
  { icon: Puzzle, label: "Intégrations (Google Business, Apple / Google Wallet)" },
  { icon: Database, label: "Import / export de données" },
  { icon: Radio, label: "Lecteur NFC" },
  { icon: FileText, label: "Facturation & documents" },
  { icon: HelpCircle, label: "Centre d'aide" },
];

const quickStats = [
  { label: "Clients actifs", value: "312", delta: "+8%" },
  { label: "Tampons distribués", value: "1 847", delta: "+15%" },
  { label: "Récompenses", value: "89", delta: "+5%" },
];

const shortcuts = [
  { icon: CreditCard, label: "Ma carte", href: "/carte" },
  { icon: Users, label: "Mes clients", href: "/clients" },
  { icon: QrCode, label: "Mon QR d'inscription", href: "/scanner" },
];

export default function ReglagesPage() {
  const router = useRouter();
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleLogout() {
    try {
      // Real action (inert tant que Supabase n'est pas configuré).
      await supabase?.auth.signOut();
    } catch {
      /* no-op en mode démo */
    }
    pushToast("Vous avez été déconnecté.");
    router.push("/");
  }

  return (
    <div>
      <PageHeader title="Réglages" subtitle="Gérez votre compte et vos préférences" />

      <div className="px-8 pb-10">
        {/* demo banner */}
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs"
          style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
        >
          <Info size={14} className="text-[var(--accent-1)]" />
          Mode démonstration — données fictives. Seule la déconnexion est réellement active.
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ============ MAIN COLUMN ============ */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* Compte */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Compte
              </h2>
              <div className="flex items-center gap-4">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{ background: `linear-gradient(135deg, var(--accent-1), ${GOLD})`, color: "#1A1210" }}
                >
                  CM
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" style={{ color: "var(--text)" }}>
                    Café Madeleine
                  </p>
                  <p className="truncate text-sm" style={{ color: "rgba(245,245,244,0.5)" }}>
                    contact@cafemadeleine.fr
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium opacity-70"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                >
                  <Pencil size={14} /> Modifier <SoonBadge />
                </button>
              </div>
            </section>

            {/* Abonnement */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: `${GOLD}0F`, borderColor: `${GOLD}40` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck size={22} style={{ color: GOLD }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold" style={{ color: "var(--text)" }}>
                        Plan Pro
                      </p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ background: `${SUCCESS}26`, color: SUCCESS }}
                      >
                        Actif
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                      69,90 €/mois — Statistiques avancées, notifications personnalisées, avis Google automatisés.
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                      Offres disponibles : Starter · Pro · Business
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium opacity-70"
                  style={{ borderColor: `${GOLD}55`, color: "var(--text)" }}
                >
                  Gérer mon abonnement <SoonBadge />
                </button>
              </div>
            </section>

            {/* Sécurité */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Sécurité
              </h2>
              <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3 py-3">
                  <Lock size={16} style={{ color: "var(--text-dim)" }} />
                  <span className="text-sm" style={{ color: "var(--text)" }}>
                    Mot de passe
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="tracking-widest" style={{ color: "var(--text-faint)" }}>
                      ••••••••
                    </span>
                    <SoonBadge />
                    <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
                  </span>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <ShieldCheck size={16} style={{ color: "var(--text-dim)" }} />
                  <span className="text-sm" style={{ color: "var(--text)" }}>
                    Authentification à deux facteurs
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <SoonBadge />
                    <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
                  </span>
                </div>
              </div>
            </section>

            {/* Fonctionnalités en développement */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Fonctionnalités en développement
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text-faint)" }}>
                Ces modules arrivent dans une prochaine brique.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {devFeatures.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                    style={{ borderColor: "var(--border)", background: "transparent" }}
                  >
                    <Icon size={16} style={{ color: "rgba(245,245,244,0.45)" }} />
                    <span className="flex-1 text-sm" style={{ color: "rgba(245,245,244,0.45)" }}>
                      {label}
                    </span>
                    <SoonBadge />
                  </div>
                ))}
              </div>
            </section>

            {/* Se déconnecter */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition-colors"
              style={{ borderColor: "rgba(232,80,61,0.25)", color: "#E8503D", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,80,61,0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>

          {/* ============ SIDE COLUMN ============ */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Utilisation */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                  Scans ce mois
                </h2>
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  670 / 1000
                </span>
              </div>
              <div
                className="mt-3 h-2.5 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(245,245,244,0.10)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: "67%", background: `linear-gradient(90deg, var(--accent-1), ${GOLD})` }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                Réinitialisé chaque mois
              </p>
            </section>

            {/* Statistiques rapides */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Statistiques rapides
              </h2>
              <div className="flex flex-col gap-4">
                {quickStats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                      {s.label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {s.value}
                      </span>
                      <span className="text-xs font-medium" style={{ color: SUCCESS }}>
                        {s.delta}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Raccourcis */}
            <section
              className="rounded-3xl border p-6"
              style={{ background: "rgba(245,245,244,0.04)", borderColor: "var(--border)" }}
            >
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                Raccourcis
              </h2>
              <div className="flex flex-col gap-1">
                {shortcuts.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--panel-soft)]"
                  >
                    <Icon size={16} className="text-[var(--accent-1)]" />
                    <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>
                      {label}
                    </span>
                    <ChevronRight
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5"
                      style={{ color: "var(--text-faint)" }}
                    />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
