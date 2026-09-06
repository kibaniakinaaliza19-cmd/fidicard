"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Maximize2 } from "lucide-react";
import { LIEN_INSCRIPTION } from "@/lib/lienInscription";
import { useUIStore } from "@/store/uiStore";
import BottomSheet from "@/components/ui/BottomSheet";

/**
 * Le QR d'inscription, montré et non caché derrière un bouton.
 *
 * C'est le geste des premières semaines : on le tend au client pendant qu'il
 * paie. Une fenêtre à ouvrir avant de pouvoir le présenter ajoute un temps
 * mort au comptoir, et le comptoir est le seul endroit où ce produit se joue.
 *
 * Le code est donc rendu à même la page, à une taille où un téléphone
 * l'attrape à trente centimètres. Le plein écran reste disponible pour le
 * poser en vitrine — là, c'est la distance de lecture qui commande.
 */
export default function QrCarte() {
  const [pleinEcran, setPleinEcran] = useState(false);
  const [copie, setCopie] = useState(false);
  const pushToast = useUIStore((s) => s.pushToast);

  const copier = () => {
    navigator.clipboard
      ?.writeText(LIEN_INSCRIPTION)
      .then(() => {
        setCopie(true);
        pushToast("Lien d'inscription copié");
        setTimeout(() => setCopie(false), 2000);
      })
      .catch(() => pushToast("Copie impossible sur cet appareil"));
  };

  return (
    <>
      <section
        aria-labelledby="qr-titre"
        className="flex flex-col gap-4"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
        }}
      >
        {/* Fond blanc obligatoire : un QR sombre sur sombre n'est pas lu par
            les appareils photo, qui cherchent un fort contraste local. */}
        <div className="flex items-center gap-4">
        <button
          onClick={() => setPleinEcran(true)}
          aria-label="Afficher le QR code en plein écran"
          className="shrink-0 cursor-pointer transition-transform active:scale-[0.97]"
          style={{
            background: "#ffffff",
            padding: 10,
            borderRadius: "var(--radius-md)",
            transitionDuration: "var(--t-fast)",
            transitionTimingFunction: "var(--ease)",
          }}
        >
          <QRCodeSVG value={LIEN_INSCRIPTION} size={92} bgColor="#ffffff" fgColor="#050505" level="M" />
        </button>

        <div className="min-w-0 flex-1">
          <h2
            id="qr-titre"
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            Inscrire un client
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text)" }}>
            Présentez ce code, le client rejoint votre programme en un scan.
          </p>
        </div>
        </div>

        {/* Les deux actions sur leur propre rangée : dans la colonne de 198 px
            laissée par le QR, elles s'empilaient et doublaient la hauteur. */}
        <div className="flex gap-2">
            <button
              onClick={() => setPleinEcran(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 text-xs font-medium"
            style={{
              minHeight: 44,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              color: "var(--text)",
            }}
          >
            <Maximize2 size={13} />
            Plein écran
          </button>
            <button
              onClick={copier}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 text-xs font-medium"
            style={{
              minHeight: 44,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-dim)",
            }}
          >
              {copie ? <Check size={13} style={{ color: "var(--success)" }} /> : <Copy size={13} />}
            {copie ? "Copié" : "Copier le lien"}
          </button>
        </div>
      </section>

      <BottomSheet
        open={pleinEcran}
        onClose={() => setPleinEcran(false)}
        title="À présenter au client"
      >
        <div className="flex flex-col items-center gap-4 px-5 pb-4">
          <div style={{ background: "#ffffff", padding: 16, borderRadius: "var(--radius-md)" }}>
            <QRCodeSVG
              value={LIEN_INSCRIPTION}
              size={232}
              bgColor="#ffffff"
              fgColor="#050505"
              level="M"
            />
          </div>
          <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
            {LIEN_INSCRIPTION}
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
