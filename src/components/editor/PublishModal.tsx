"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Download, Wallet, Smartphone, Check, Rocket, Trophy, AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useUIStore } from "@/store/uiStore";
import { useCardStore } from "@/store/cardStore";
import { usePublishStore } from "@/store/publishStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { validerProgramme } from "@/lib/loyalty";

export default function PublishModal() {
  const open = useUIStore((s) => s.publishModalOpen);
  const setOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const card = useCardStore((s) => s.card);
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);
  const published = usePublishStore((s) => s.published);
  const publish = usePublishStore((s) => s.publish);
  const config = useLoyaltyStore((s) => s.config);
  const [copied, setCopied] = useState(false);

  // « Publier » ne valide plus aveuglément : le programme doit être complet.
  const programErrors = validerProgramme(config);
  const canPublish = programErrors.length === 0;

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
    publish();
    pushToast("Programme publié — votre QR d'inscription est actif.");
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Publier la carte"
      subtitle="Partage ta carte de fidélité avec tes clients"
    >
      <div className="space-y-5">
        {/* les fonctionnalités de la carte, visibles AVANT de publier */}
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            <Trophy size={13} className="text-[var(--accent-1)]" /> Fonctionnalités de la carte
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {config.mode === "stamps"
              ? `Programme tampons · ${config.totalStamps} tampons`
              : `Programme points · 1 € = ${config.tauxConversion} pts`}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
            {config.mode === "stamps"
              ? config.regle.type === "passage"
                ? "1 passage scanné = 1 tampon"
                : config.regle.type === "montant_minimum"
                  ? `1 tampon dès ${config.regle.seuil} € d'achat`
                  : `1 tampon par tranche de ${config.regle.tranche} €`
              : "Les points suivent le montant payé à chaque scan"}
          </p>
          <div className="mt-2 space-y-1">
            {config.paliers
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((p) => (
                <p key={p.position} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
                  <Check size={11} style={{ color: "#4CAF7D" }} />
                  {config.mode === "stamps" ? `Au ${p.position}ᵉ tampon` : `Dès ${p.position} points`} →{" "}
                  <strong style={{ color: "var(--text)" }}>{p.label}</strong>
                  {p.description && p.description !== p.label ? ` (${p.description})` : ""}
                </p>
              ))}
            {config.paliers.length === 0 && (
              <p className="text-[11px]" style={{ color: "#F4B942" }}>
                Aucune récompense définie.
              </p>
            )}
          </div>
        </div>

        {programErrors.length > 0 && (
          <div
            className="space-y-1.5 rounded-2xl border px-4 py-3 text-[11px] leading-relaxed"
            style={{ borderColor: "rgba(244,185,66,0.4)", background: "rgba(244,185,66,0.07)", color: "#F4B942" }}
          >
            <p className="text-xs font-semibold">Publication bloquée — à corriger :</p>
            {programErrors.map((e) => (
              <p key={e} className="flex items-start gap-1.5">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {e}
              </p>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                setActiveDrawer("fidelite");
              }}
              className="mt-1 cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
            >
              Ouvrir le panneau Fidélité
            </button>
          </div>
        )}

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
          disabled={published || !canPublish}
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
