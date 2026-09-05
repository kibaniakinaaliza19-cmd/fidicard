"use client";

import { Barcode } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { createBarcodeLayer } from "@/lib/layerFactory";

// La carte FidiCard identifie le client par un CODE-BARRES. Le code QR reste
// réservé à l'affichage en boutique pour l'inscription (PublishModal, page
// d'accueil) : il n'a rien à faire sur la carte elle-même.
export default function CodesDrawer() {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);

  function addBarcode() {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createBarcodeLayer(z));
  }

  return (
    <DrawerShell title="Code-barres">
      <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Pour les systèmes de caisse basés sur un code-barres classique (format CODE128).
      </p>
      <button
        onClick={addBarcode}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border py-6 transition-colors hover:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      >
        <Barcode size={40} />
        <span className="text-sm font-medium">Ajouter un code-barres</span>
      </button>
    </DrawerShell>
  );
}
