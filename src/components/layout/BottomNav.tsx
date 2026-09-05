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
      className="fixed inset-x-0 bottom-0 z-50 flex items-end md:hidden"
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

        const central = "central" in item && item.central;

        // Le bouton central déborde vers le haut plutôt que de tenir dans la
        // rangée : à l'intérieur, la pastille de 44 px poussait son libellé
        // hors de la barre, et « Scanner » se retrouvait coupé par le bord de
        // l'écran. Débordant, il ne prend la place de personne, et sa forme
        // suffit à le nommer — l'icône de scan est la seule ronde et pleine.
        if (central) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={actif ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ minHeight: 60 }}
            >
              <span
                className="mb-2 grid h-14 w-14 -translate-y-3 place-items-center rounded-full"
                style={{
                  background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
                  boxShadow: "0 8px 20px -6px var(--accent-glow)",
                  border: "3px solid var(--bg-elevated)",
                }}
              >
                <Icone size={24} color="#fff" />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            // 60 px de haut : au-dessus des 44 px minimum, parce qu'on vise
            // en marchant et sans regarder.
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            style={{ minHeight: 60, color: actif ? "var(--accent-1)" : "var(--text-dim)" }}
          >
            <Icone size={21} />
            <span className="text-[11px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
