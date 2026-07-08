"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Download, Wallet, Smartphone, Check, Rocket } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useUIStore } from "@/store/uiStore";
import { useCardStore } from "@/store/cardStore";

export default function PublishModal() {
  const open = useUIStore((s) => s.publishModalOpen);
  const setOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const card = useCardStore((s) => s.card);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);

  const shareUrl = useMemo(() => {
    const slug = card.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `https://fidicard.app/c/${slug || "ma-carte"}`;
  }, [card.name]);

  function handleCopy() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    pushToast("Lien copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${card.name || "carte"}-fidicard.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Configuration téléchargée");
  }

  function handlePublish() {
    setPublished(true);
    pushToast("Carte publiée avec succès");
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Publier la carte"
      subtitle="Partage ta carte de fidélité avec tes clients"
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={shareUrl} size={148} bgColor="#ffffff" fgColor="#0a0a0a" />
          </div>
          <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
            Les clients scannent ce QR code pour ajouter la carte à leur téléphone
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-strong)" }}>
          <Link2 size={14} style={{ color: "var(--text-faint)" }} />
          <span className="flex-1 truncate text-xs" style={{ color: "var(--text-dim)" }}>
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
            style={{ background: "var(--border)", color: "var(--text)" }}
          >
            {copied ? <Check size={12} /> : "Copier"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            title="Nécessite une configuration backend (certificat Apple Wallet)"
            className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium opacity-50"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <Wallet size={14} />
            Apple Wallet
          </button>
          <button
            title="Nécessite une configuration backend (compte Google Wallet)"
            className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium opacity-50"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <Smartphone size={14} />
            Google Wallet
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Download size={14} />
          Télécharger la configuration (JSON)
        </button>

        <button
          onClick={handlePublish}
          disabled={published}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-default disabled:opacity-70"
          style={{
            background: published
              ? "linear-gradient(135deg, #16a34a, #15803d)"
              : "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
            boxShadow: "0 10px 24px -8px var(--accent-glow)",
          }}
        >
          {published ? (
            <>
              <Check size={16} /> Carte publiée
            </>
          ) : (
            <>
              <Rocket size={16} /> Confirmer la publication
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
