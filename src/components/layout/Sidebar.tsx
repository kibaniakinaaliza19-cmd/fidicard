"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CreditCard,
  Home,
  Users,
  ScanLine,
  BarChart3,
  Bell,
  Settings,
  Crown,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import FidiLogo from "@/components/ui/FidiLogo";

const navItems: { href: string; label: string; icon: typeof Home; badge?: string }[] = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/carte", label: "Carte", icon: CreditCard },
  { href: "/scanner", label: "Scanner", icon: ScanLine },
  { href: "/analyse", label: "Analyse", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/reglages", label: "Réglages", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <aside
      className="relative z-20 hidden h-full w-[260px] shrink-0 flex-col border-r px-4 py-6 md:flex"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <Link href="/accueil" className="mb-8 flex items-center gap-2.5 px-2">
        <FidiLogo size={34} />
        <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          FidiCard
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200"
              style={{
                color: active ? "var(--text)" : "var(--text-dim)",
                background: active ? "var(--panel-soft)" : "transparent",
              }}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, var(--accent-1), var(--accent-2))",
                    boxShadow: "0 0 12px var(--accent-glow)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={18}
                strokeWidth={2}
                className="transition-transform duration-200 group-hover:scale-110 group-hover:text-[var(--accent-1)]"
              />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
                >
                  {item.badge}
                </span>
              )}
              <span
                className="pointer-events-none absolute inset-0 -z-10 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: "var(--border)" }}
              />
            </Link>
          );
        })}
      </nav>

      <div
        className="relative mb-4 overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: "var(--border-strong)",
          background:
            "linear-gradient(145deg, rgba(224,52,44,0.25), rgba(8,8,8,0.6))",
        }}
      >
        <div
          className="glow-blob h-24 w-24 -right-6 -top-6"
          style={{ background: "var(--accent-1)" }}
        />
        <Crown size={20} className="mb-2 text-[var(--accent-1)]" />
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Passez à Premium
        </p>
        <p className="mt-1 text-xs leading-snug" style={{ color: "var(--text-dim)" }}>
          Débloquez toutes les fonctionnalités premium
        </p>
        <button
          onClick={() => pushToast("La page Premium arrive bientôt.")}
          className="mt-3 w-full cursor-pointer rounded-lg py-2 text-xs font-semibold text-white transition-transform duration-150 hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
            boxShadow: "0 6px 16px -4px var(--accent-glow)",
          }}
        >
          Découvrir
        </button>
      </div>

      <Link
        href="/reglages"
        className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 hover:bg-[var(--panel-soft)]"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
        >
          CM
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>
            Café Madeleine
          </span>
          <span className="block truncate text-xs" style={{ color: "var(--text-faint)" }}>
            Propriétaire
          </span>
        </span>
        <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
      </Link>
    </aside>
  );
}
