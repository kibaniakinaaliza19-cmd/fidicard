"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ScanLine, CreditCard, Settings } from "lucide-react";

/**
 * Navigation basse, mobile uniquement.
 *
 * Cinq entrées, pas six : au-delà, les cibles passent sous le seuil du pouce
 * sur un écran de 360 px. Analyse et Notifications restent accessibles depuis
 * l'accueil et la barre latérale du bureau.
 *
 * Le scanner est au centre : c'est le geste qu'on répète cinquante fois par
 * jour, et le centre est le seul endroit qu'un pouce atteint sans se tordre,
 * quelle que soit la main.
 */
const items = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/scanner/camera", label: "Scanner", icon: ScanLine, central: true },
  { href: "/carte", label: "Carte", icon: CreditCard },
  { href: "/reglages", label: "Réglages", icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex md:hidden"
      style={{
        background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border)",
        // La barre gestuelle d'iOS mange les 34 derniers pixels : sans ça,
        // « Réglages » n'est jamais atteignable.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Navigation principale"
    >
      {items.map((item) => {
        const actif =
          item.href === "/scanner/camera"
            ? pathname?.startsWith("/scanner")
            : pathname?.startsWith(item.href);
        const Icone = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            // 56 px de haut : au-dessus des 44 px minimum, parce qu'on vise
            // en marchant et sans regarder.
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            style={{ minHeight: 56, color: actif ? "var(--accent-1)" : "var(--text-dim)" }}
          >
            {"central" in item && item.central ? (
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl"
                style={{ background: "var(--accent-1)" }}
              >
                <Icone size={22} color="#fff" />
              </span>
            ) : (
              <Icone size={21} />
            )}
            <span className="text-[11px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
