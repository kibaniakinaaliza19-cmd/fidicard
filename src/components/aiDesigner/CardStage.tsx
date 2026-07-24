"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock, Stamp, Gift, Barcode, Building2, Box, Apple, Smartphone,
  Wifi, BatteryFull, Signal, Trophy, ImageIcon, Type, Palette, Sparkles, UploadCloud,
} from "lucide-react";
import WalletCard from "@/components/aiDesigner/WalletCard";
import { useCardStore, type DrawerId } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useUIStore } from "@/store/uiStore";
import { PROGRAM_PRESETS } from "@/lib/loyalty";
import { searchStamps, getStampIcon } from "@/lib/stampCatalog";

type Tab = "carte" | "tampons" | "recompenses" | "parametres";
type View = "3d" | "apple" | "google";

const STAMP_COUNTS = [5, 6, 8, 10, 12, 15];
// jeu compact de tampons pour le carrousel (icônes lucide réelles)
const CAROUSEL_STAMPS = searchStamps("", "all").slice(0, 60);

export default function CardStage() {
  const card = useCardStore((s) => s.card);
  const setCardName = useCardStore((s) => s.setCardName);
  const updateZone = useCardStore((s) => s.updateZone);
  const config = useLoyaltyStore((s) => s.config);
  const setTotalStamps = useLoyaltyStore((s) => s.setTotalStamps);
  const setMode = useLoyaltyStore((s) => s.setMode);
  const applyPreset = useLoyaltyStore((s) => s.applyPreset);
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("carte");
  const [view, setView] = useState<View>("3d");
  const fileRef = useRef<HTMLInputElement>(null);

  // zone de tampons (v2) — pour choisir/importer l'icône du tampon
  const zone = useMemo(
    () => (card.version === 2 ? card.zones?.find((z) => z.kind === "stampGrid") : undefined),
    [card],
  );
  function setZoneIcon(lucide: string) {
    if (zone) updateZone(zone.id, { icon: lucide, iconImage: undefined });
  }
  function importStamp(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !zone) return;
    if (file.size > 2 * 1024 * 1024) { pushToast("Image trop lourde (2 Mo max)."); return; }
    const reader = new FileReader();
    reader.onload = () => { updateZone(zone.id, { iconImage: reader.result as string }); pushToast("Tampon importé appliqué."); };
    reader.readAsDataURL(file);
  }

  // raccourcis « Mode édition » : ouvrent l'éditeur avancé sur le bon tiroir
  function openEditor(drawer: DrawerId) {
    setActiveDrawer(drawer);
    router.push("/carte/editeur");
  }
  const QUICK_TOOLS: { id: DrawerId; label: string; icon: typeof ImageIcon }[] = [
    { id: "upload", label: "Logo", icon: ImageIcon },
    { id: "images", label: "Image", icon: ImageIcon },
    { id: "texte", label: "Texte", icon: Type },
    { id: "tampons", label: "Tampons", icon: Stamp },
    { id: "couleurs", label: "Couleurs", icon: Palette },
  ];

  const nameLayer = card.layers.find((l) => l.type === "text" && l.name === "Nom du commerce");
  const business = nameLayer && nameLayer.type === "text" ? nameLayer.content : undefined;
  const lastTier = config.paliers.length ? config.paliers[config.paliers.length - 1] : null;

  return (
    <div
      className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-3xl border"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {/* tabs */}
      <div className="flex items-center gap-1 border-b px-3 pt-3" style={{ borderColor: "var(--border)" }}>
        {([
          ["carte", "Ma carte"],
          ["tampons", "Tampons"],
          ["recompenses", "Récompenses"],
          ["parametres", "Paramètres"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="relative cursor-pointer px-3 py-2 text-xs font-medium transition-colors"
            style={{ color: tab === id ? "var(--accent-1)" : "var(--text-dim)" }}
          >
            {label}
            {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent-1)" }} />}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* Mode édition + outils rapides */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/carte/editeur")}
            className="flex cursor-pointer items-center gap-2 text-xs font-medium"
            style={{ color: "var(--text-dim)" }}
            title="Ouvrir l'éditeur avancé"
          >
            <Sparkles size={13} className="text-[var(--accent-1)]" /> Mode édition
          </button>
          <div className="flex gap-1">
            {QUICK_TOOLS.map((t) => (
              <button
                key={t.label}
                onClick={() => openEditor(t.id)}
                title={t.label}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
              >
                <t.icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* --- aperçu carte : commun à tous les onglets --- */}
        <div
          className="relative mb-4 flex items-center justify-center overflow-hidden rounded-2xl py-6"
          style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(240,101,62,0.12), transparent 70%), var(--bg-elevated)" }}
        >
          {view === "3d" && (
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.5))" }}
            >
              <WalletCard doc={card} width={300} />
            </motion.div>
          )}
          {view === "apple" && (
            <div className="rounded-[2rem] border-4 p-2" style={{ borderColor: "#222", background: "#000", width: 300 }}>
              <div className="mb-2 flex items-center justify-between px-2 text-[10px] text-white/80">
                <span>9:41</span>
                <span className="flex items-center gap-1"><Signal size={10} /><Wifi size={10} /><BatteryFull size={12} /></span>
              </div>
              <WalletCard doc={card} width={272} />
            </div>
          )}
          {view === "google" && (
            <div className="rounded-[1.5rem] border-4 p-2.5" style={{ borderColor: "#222", background: "#1a1a1a", width: 300 }}>
              <p className="mb-2 px-1 text-[11px] font-medium text-white/70">Google Wallet</p>
              <WalletCard doc={card} width={268} />
            </div>
          )}
        </div>

        {/* bascule d'aperçu */}
        <div className="mb-4 flex gap-1.5">
          {([
            ["3d", "3D", Box],
            ["apple", "Apple Wallet", Apple],
            ["google", "Google Wallet", Smartphone],
          ] as [View, string, typeof Box][]).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-medium transition-colors"
              style={{
                borderColor: view === id ? "var(--accent-1)" : "var(--border)",
                background: view === id ? "var(--accent-glow)" : "transparent",
                color: view === id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* --- contenu par onglet --- */}
        {tab === "carte" && (
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Éléments fonctionnels <span style={{ color: "var(--text-faint)" }}>(verrouillés)</span></p>
            <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
              Gérés automatiquement pour garantir le bon fonctionnement de votre carte.
            </p>
            <LockedRow icon={Stamp} label="Zone des tampons" value={config.mode === "points" ? "Points" : `${config.totalStamps} tampons`} />
            <LockedRow icon={Gift} label="Récompense" value={lastTier?.description ?? "À définir"} />
            <LockedRow icon={Barcode} label="Code-barres" value="Position automatique" />
            <LockedRow icon={Building2} label="Informations de base" value={business ?? "Entreprise"} />
          </div>
        )}

        {tab === "tampons" && (
          <div>
            {/* type de programme : tampons ou points */}
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Système de fidélité</p>
            <div className="mb-4 flex gap-2">
              {([["stamps", "Tampons"], ["points", "Points"]] as ["stamps" | "points", string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: config.mode === m ? "var(--accent-1)" : "var(--border)",
                    background: config.mode === m ? "var(--accent-glow)" : "var(--panel-soft)",
                    color: config.mode === m ? "var(--accent-1)" : "var(--text-dim)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {config.mode === "stamps" && (
              <>
                <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>Nombre de tampons</p>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {STAMP_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setTotalStamps(n)}
                      className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        borderColor: config.totalStamps === n ? "var(--accent-1)" : "var(--border)",
                        background: config.totalStamps === n ? "var(--accent-glow)" : "transparent",
                        color: config.totalStamps === n ? "var(--accent-1)" : "var(--text-dim)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* carrousel compact de tampons (défilement horizontal) */}
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Choisir un tampon</p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-medium transition-colors hover:text-[var(--accent-1)]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    <UploadCloud size={12} /> Importer
                  </button>
                  <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/*" className="hidden" onChange={importStamp} />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                  {CAROUSEL_STAMPS.map((s) => {
                    const Icon = getStampIcon(s.lucide);
                    const active = zone?.icon === s.lucide && !zone?.iconImage;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setZoneIcon(s.lucide)}
                        title={s.label}
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                        style={{
                          borderColor: active ? "var(--accent-1)" : "var(--border)",
                          background: active ? "var(--accent-glow)" : "transparent",
                          color: active ? "var(--accent-1)" : "var(--text-dim)",
                        }}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
                  La grille se reconstruit automatiquement. Le tampon choisi s&rsquo;applique à toutes les cases.
                </p>
              </>
            )}

            {config.mode === "points" && (
              <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                En mode Points, vos clients cumulent des points (1 € = {config.tauxConversion} pts) au lieu de tampons.
                Définissez la récompense dans l&rsquo;onglet Récompenses.
              </p>
            )}
            <EditorLink />
          </div>
        )}

        {tab === "recompenses" && (
          <div>
            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>Programme de fidélité</p>
            <div className="mb-3 space-y-1.5">
              {config.paliers.length === 0 && (
                <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Aucune récompense définie.</p>
              )}
              {config.paliers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
                  <Trophy size={13} className="text-[var(--accent-1)]" />
                  <span style={{ color: "var(--text)" }}>
                    Au {config.mode === "points" ? `${p.position} pts` : `${p.position}ᵉ tampon`}
                  </span>
                  <span className="ml-auto font-medium" style={{ color: "var(--text-dim)" }}>{p.description}</span>
                </div>
              ))}
            </div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Programmes prêts à l'emploi</p>
            <div className="flex flex-wrap gap-1.5">
              {PROGRAM_PRESETS.slice(0, 5).map((preset) => (
                <button
                  key={preset.nom}
                  onClick={() => applyPreset(preset)}
                  className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                >
                  {preset.nom}
                </button>
              ))}
            </div>
            <EditorLink />
          </div>
        )}

        {tab === "parametres" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Nom de la carte</label>
              <input
                value={card.name}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              />
            </div>
            <button
              onClick={() => setPublishModalOpen(true)}
              className="w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
            >
              Vérifier & publier
            </button>
            <EditorLink />
          </div>
        )}
      </div>
    </div>
  );
}

function LockedRow({ icon: Icon, label, value }: { icon: typeof Stamp; label: string; value: string }) {
  return (
    <div
      className="mb-2 flex items-center gap-3 rounded-xl border px-3.5 py-3"
      style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}
      title="Cet élément est géré automatiquement par FidiCard pour garantir le bon fonctionnement de votre carte."
    >
      <Icon size={16} className="text-[var(--accent-1)]" />
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
      <span className="ml-auto truncate text-xs" style={{ color: "var(--text-dim)", maxWidth: 150 }}>{value}</span>
      <Lock size={13} style={{ color: "var(--text-faint)" }} />
    </div>
  );
}

function EditorLink() {
  return (
    <Link
      href="/carte/editeur"
      className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
    >
      Personnalisation avancée (éditeur)
    </Link>
  );
}
