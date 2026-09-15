"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Home,
  Users,
  CreditCard,
  ScanLine,
  ChartNoAxesCombined,
  Settings,
  ChevronRight,
} from "lucide-react";
import FidiLogo from "@/components/ui/FidiLogo";
import BottomSheet from "@/components/ui/BottomSheet";

/**
 * En-tête mobile.
 *
 * Trois zones, un alignement : menu à gauche, identité au centre-gauche,
 * outils à droite. La barre reste collée en haut et floute ce qui passe
 * dessous — c'est ce qui distingue une application d'une page qui défile.
 *
 * Le menu ne double pas la navigation basse : il donne accès à ce qui n'y
 * tient pas. Cinq onglets en bas, le reste ici.
 */

const TOUTES_LES_PAGES = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/carte", label: "Ma carte", icon: CreditCard },
  { href: "/scanner/camera", label: "Scanner", icon: ScanLine },
  { href: "/analyse", label: "Analyse", icon: ChartNoAxesCombined },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/reglages", label: "Réglages", icon: Settings },
] as const;

export default function MobileHeader({ nonLues = 0 }: { nonLues?: number }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header
        className="sticky top-0 flex items-center gap-3 px-4 md:hidden"
        style={{
          zIndex: "var(--z-header)",
          height: 56,
          paddingTop: "env(safe-area-inset-top, 0px)",
          // La hauteur inclut l'encoche : sans ça, le contenu passe dessous
          // sur un iPhone à encoche et le titre devient illisible.
          boxSizing: "content-box",
          background: "rgba(11,11,12,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          className="-ml-2 grid h-11 w-11 place-items-center rounded-xl transition-colors"
          style={{ color: "var(--text-dim)" }}
        >
          <Menu size={20} />
        </button>

        <Link href="/accueil" className="flex items-center gap-2" aria-label="FidiCard, accueil">
          <FidiLogo size={24} />
          <span className="text-[17px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            FidiCard
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/notifications"
            aria-label={
              nonLues > 0 ? `Notifications, ${nonLues} non lues` : "Notifications"
            }
            className="relative grid h-11 w-11 place-items-center rounded-xl"
            style={{ color: "var(--text-dim)" }}
          >
            <Bell size={20} />
            {nonLues > 0 && (
              /* Une pastille sans chiffre : à cette taille un nombre serait
                 illisible, et le compte exact se lit sur la page elle-même.
                 Le libellé accessible, lui, le donne. */
              <span
                className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full"
                style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--surface-1)" }}
                aria-hidden
              />
            )}
          </Link>

          <Link
            href="/reglages"
            aria-label="Mon établissement"
            className="grid h-11 w-11 place-items-center rounded-xl"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold"
              style={{
                background: "var(--surface-4)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
              }}
            >
              CM
            </span>
          </Link>
        </div>
      </header>

      <BottomSheet open={menuOuvert} onClose={() => setMenuOuvert(false)} title="Navigation">
        <nav className="px-2 pb-2">
          {TOUTES_LES_PAGES.map(({ href, label, icon: Icone }) => {
            const actif = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOuvert(false)}
                aria-current={actif ? "page" : undefined}
                className="flex items-center gap-3 rounded-xl px-3"
                style={{
                  minHeight: 52,
                  background: actif ? "var(--accent-wash)" : "transparent",
                  color: actif ? "var(--accent)" : "var(--text)",
                }}
              >
                <Icone size={19} />
                <span className="flex-1 text-[15px] font-medium">{label}</span>
                <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
              </Link>
            );
          })}
        </nav>
      </BottomSheet>
    </>
  );
}
