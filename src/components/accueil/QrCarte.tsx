"use client";

import Link from "next/link";
import { QrCode, ChevronRight } from "lucide-react";

/**
 * L'accès au QR d'inscription, depuis l'accueil.
 *
 * Une tuile, pas le code lui-même. Le QR affiché en permanence occupait le
 * tiers du premier écran pour un geste qu'on ne fait pas à chaque ouverture de
 * l'application : la place est rendue au chiffre du mois et aux mesures.
 *
 * Le code vit sur son écran, /scanner, qui existait déjà sous le titre
 * « Votre QR d'inscription ». On y trouve toujours le code, son plein écran,
 * le lien à copier et le téléchargement en PNG — un seul endroit, où l'on sait
 * qu'il se trouve.
 */
export default function QrCarte() {
  return (
    <Link
      href="/scanner"
      className="flex items-center gap-3"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
      }}
    >
      <span
        className="grid shrink-0 place-items-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-md)",
          background: "var(--accent-soft)",
          color: "var(--accent)",
        }}
      >
        <QrCode size={19} strokeWidth={1.9} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
          Inscrire un client
        </span>
        <span className="mt-0.5 block text-xs" style={{ color: "var(--text-dim)" }}>
          Votre QR code, à présenter en caisse
        </span>
      </span>

      <ChevronRight size={16} className="shrink-0" style={{ color: "var(--text-faint)" }} />
    </Link>
  );
}
