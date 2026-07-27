"use client";

import { useMemo, useSyncExternalStore } from "react";
import MiniCard from "@/components/cardEditor/MiniCard";
import type { CardDoc } from "@/types/layer";

const BARCODE_TOTAL = 160;

// Génération pure, hors composant : même code → mêmes barres, sans état de
// rendu qui traînerait d'un affichage à l'autre.
function buildBars(value: string): { x: number; w: number }[] {
  let seed = 0;
  for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: { x: number; w: number }[] = [];
  let x = 2;
  while (x < BARCODE_TOTAL - 2) {
    const w = 1 + Math.floor(next() * 3);
    if (next() > 0.42) out.push({ x, w });
    x += w + (next() > 0.5 ? 1 : 0);
  }
  return out;
}

// Vrai après hydratation, faux au rendu serveur — sans setState dans un effet.
const noSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(noSubscribe, () => true, () => false);

// Code-barres SVG déterministe (jamais de QR — FidiCard utilise le code-barres
// des Wallet). Les barres sont dérivées du code client, stable d'un rendu à
// l'autre.
function Barcode({ value, width, height = 44 }: { value: string; width: number; height: number }) {
  const bars = useMemo(() => buildBars(value), [value]);

  return (
    <svg viewBox={`0 0 ${BARCODE_TOTAL} ${height}`} width={width} height={height} preserveAspectRatio="none" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#141414" />
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
          </>
        )}
      </div>
    </div>
  );
}
