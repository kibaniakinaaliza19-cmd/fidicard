"use client";

import MiniCard from "@/components/cardEditor/MiniCard";
import type { CardDoc } from "@/types/layer";

/**
 * La carte telle qu'elle apparaît dans le Wallet. Le code-barres n'est pas
 * ajouté ici : chaque CardDoc porte déjà son propre calque « barcode »
 * (cartouche blanc, mention FidiCard incluse — voir LayerContent.tsx), quel
 * que soit le régime qui l'a produit (habillage, composition, gabarit). Une
 * bande ajoutée par-dessus dupliquerait ce code, avec un second motif
 * purement décoratif et non scannable : exactement le défaut relevé sur les
 * cartes générées.
 */
export default function WalletCard({ doc, width = 300 }: { doc: CardDoc; width?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl shadow-xl" style={{ width }}>
      <MiniCard doc={doc} width={width} />
    </div>
  );
}
