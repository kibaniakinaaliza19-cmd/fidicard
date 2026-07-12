"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ExternalLink, QrCode, Info } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const DEMO_CODE = "7F8K92";
const JOIN_URL = `https://fidicard.com/join/${DEMO_CODE}`;

export default function ScannerPage() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard?.writeText(JOIN_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <PageHeader title="Votre QR d'inscription" subtitle="Affichez ce QR code en caisse. Vos clients le scannent pour rejoindre votre programme." />

      <div className="px-8 pb-10">
        {/* demo banner */}
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs"
          style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
        >
          <Info size={14} className="text-[var(--accent-1)]" />
          Mode démonstration — l&rsquo;inscription client fonctionne, la création réelle en base et l&rsquo;ajout Wallet arrivent dans une prochaine brique.
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* QR card */}
          <div className="flex flex-col items-center rounded-3xl border p-8" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <div className="rounded-2xl bg-white p-5 shadow-2xl">
              <QRCodeSVG value={JOIN_URL} size={220} bgColor="#ffffff" fgColor="#1A1210" level="M" />
            </div>

            <p className="mt-5 text-sm font-medium" style={{ color: "var(--text)" }}>
              Scannez pour rejoindre le programme
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>
              fidicard.com/join/{DEMO_CODE}
            </p>

            <div className="mt-5 flex w-full gap-2">
              <button
                onClick={copyLink}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              >
                {copied ? <><Check size={15} className="text-green-500" /> Copié</> : <><Copy size={15} /> Copier le lien</>}
              </button>
              <a
                href={`/join/${DEMO_CODE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              >
                <ExternalLink size={15} /> Aperçu client
              </a>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-3xl border p-8" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
              <QrCode size={16} className="text-[var(--accent-1)]" /> Comment ça marche
            </h2>
            <ol className="mt-5 space-y-5">
              {[
                { t: "Le client scanne le QR", d: "Avec l'appareil photo de son téléphone — aucune application à installer." },
                { t: "Il remplit ses infos en 30 secondes", d: "Prénom, nom, téléphone, email, anniversaire. Pas de mot de passe." },
                { t: "Sa carte est créée", d: "Il apparaît aussitôt dans votre fichier client, carte active." },
                { t: "Il ajoute la carte à son Wallet", d: "Apple Wallet / Google Wallet (bientôt disponible)." },
              ].map((step, i) => (
                <li key={i} className="flex gap-3.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(140deg, #E8503D, #F4B942)" }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{step.t}</p>
                    <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--text-dim)" }}>{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
