"use client";

import { useMemo, useSyncExternalStore } from "react";
import MiniCard from "@/components/cardEditor/MiniCard";
import type { CardDoc } from "@/types/layer";
import { BARCODE_TOTAL, buildModules } from "@/lib/barcode";

// Vrai après hydratation, faux au rendu serveur — sans setState dans un effet.
const noSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(noSubscribe, () => true, () => false);

// Code-barres SVG déterministe (jamais de QR — FidiCard utilise le code-barres
// des Wallet). Les modules sont dérivés du code client, stables d'un rendu à
// l'autre.
function Barcode({ value, width, height = 44 }: { value: string; width: number; height: number }) {
  const modules = useMemo(() => buildModules(value, height), [value, height]);

  return (
    <svg viewBox={`0 0 ${BARCODE_TOTAL} ${height}`} width={width} height={height} preserveAspectRatio="none" aria-hidden>
      {modules.map((m, i) => (
        <rect key={i} x={m.x} y={m.y} width={m.w} height={m.h} fill="#141414" />
      ))}
    </svg>
  );
}

/**
 * La carte telle qu'elle apparaît dans le Wallet : la face (design + tampons,
 * rendue par MiniCard) surmonte une bande blanche avec le code-barres. Format
 * légèrement plus haut qu'une carte bancaire, à la manière d'Apple/Google
 * Wallet.
 */
export default function WalletCard({ doc, width = 300 }: { doc: CardDoc; width?: number }) {
  // le code dérive de l'id de la carte (non déterministe au SSR) → on ne rend
  // le code-barres qu'après montage pour éviter tout décalage d'hydratation
  const mounted = useHydrated();

  const code = useMemo(() => {
    const raw = (doc.id || "FIDICARD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return (raw + "000000000000").slice(0, 12);
  }, [doc.id]);
  const pretty = code.replace(/(.{4})(?=.)/g, "$1 ");

  return (
    <div className="overflow-hidden rounded-2xl shadow-xl" style={{ width }}>
      <MiniCard doc={doc} width={width} />
      <div className="flex flex-col items-center gap-1 px-3 py-2.5" style={{ background: "#ffffff", minHeight: 62 }}>
        {mounted && (
          <>
            <Barcode value={code} width={width - 28} height={42} />
            <span className="text-[10px] font-medium tracking-[0.25em]" style={{ color: "#8a8a8a" }}>{pretty}</span>
            {/* seule marque FidiCard tolérée sur une carte : une mention texte
                discrète sous le code, dans le cartouche blanc. Jamais de logo. */}
            <span className="text-[8px] tracking-[0.12em]" style={{ color: "#b4b4b4" }}>Propulsé par FidiCard</span>
          </>
        )}
      </div>
    </div>
  );
}
