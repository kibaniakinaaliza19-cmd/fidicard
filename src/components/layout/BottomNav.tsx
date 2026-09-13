"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, ScanLine, CreditCard, Settings } from "lucide-react";

/**
 * Navigation basse, mobile uniquement.
 *
 * Cinq entrées, pas six : au-delà, les cibles passent sous le seuil du pouce
 * sur un écran de 360 px. Analyse et Notifications vivent dans le menu de
 * l'en-tête, et dans la barre latérale du bureau.
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
      className="fixed inset-x-0 bottom-0 flex items-end md:hidden"
      style={{
        zIndex: "var(--z-nav)",
        // Translucide et flouté : le contenu qui passe dessous reste deviné,
        // ce qui donne l'épaisseur d'une barre native plutôt que d'un bandeau
        // opaque posé sur la page.
        background: "rgba(11,11,12,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
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
        // rangée : à l'intérieur, la pastille poussait son libellé hors de la
        // barre. Débordant, il ne prend la place de personne, et sa forme
        // suffit à le nommer — c'est la seule cible ronde et pleine.
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
                className="mb-2 grid h-14 w-14 -translate-y-3 place-items-center rounded-full transition-transform active:scale-95"
                style={{
                  background: "var(--accent)",
                  boxShadow: "var(--shadow-scan)",
                  // L'anneau sombre détache la pastille de la barre au moment
                  // où elle la chevauche.
                  border: "3px solid var(--surface-1)",
                  transitionDuration: "var(--t-fast)",
                  transitionTimingFunction: "var(--ease)",
                }}
              >
                <ScanLine size={24} color="var(--text)" strokeWidth={2} />
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
            style={{
              minHeight: 60,
              transition: "color var(--t-fast) var(--ease)",
            }}
          >
            {/* Icône et libellé ne portent pas la même teinte au repos :
                l'icône descend d'un cran (tertiaire), le mot reste lisible
                (secondaire). C'est ce qui fait qu'on lit la barre au lieu de
                la déchiffrer. */}
            <Icone
              size={21}
              strokeWidth={actif ? 2.2 : 1.8}
              style={{ color: actif ? "var(--accent)" : "var(--text-faint)" }}
            />
            <span
              className="text-[11px] font-medium leading-none"
              style={{ color: actif ? "var(--accent)" : "var(--text-dim)" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
