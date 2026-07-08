"use client";

import { QrCode, Barcode } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { createBarcodeLayer, createQrCodeLayer } from "@/lib/layerFactory";

export default function CodesDrawer({ mode }: { mode: "qr" | "barcode" }) {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);

  function addQr() {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createQrCodeLayer(z));
  }
  function addBarcode() {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createBarcodeLayer(z));
  }

  if (mode === "qr") {
    return (
      <DrawerShell title="QR Code">
        <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
          Le QR code permet à vos clients d&rsquo;ajouter la carte à leur wallet. Un code unique est généré à la publication.
        </p>
        <button
          onClick={addQr}
          className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border py-6 transition-colors hover:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <QrCode size={40} />
          <span className="text-sm font-medium">Ajouter un QR code</span>
        </button>
      </DrawerShell>
    );
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
