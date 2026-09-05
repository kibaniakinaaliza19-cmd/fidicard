"use client";

import { Eye, EyeOff, Lock, LockOpen, ChevronUp, ChevronDown, Type, Square, Image as ImageIcon, QrCode, Barcode, Smile, Grid3x3, Scissors } from "lucide-react";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useUIStore } from "@/store/uiStore";
import { renderLoyaltyLayer } from "@/lib/loyalty/renderLayer";
import type { Layer } from "@/types/layer";

const typeIcon: Record<Layer["type"], typeof Type> = {
  text: Type,
  shape: Square,
  icon: Smile,
  image: ImageIcon,
  qrcode: QrCode,
  barcode: Barcode,
};

export default function CalquesList() {
  const layers = useCardStore((s) => s.card.layers);
  const zones = useCardStore((s) => (s.card.version === 2 ? s.card.zones : undefined));
  const selectedIds = useCardStore((s) => s.selectedIds);
  const selectedZoneId = useCardStore((s) => s.selectedZoneId);
  const selectLayer = useCardStore((s) => s.selectLayer);
  const selectZone = useCardStore((s) => s.selectZone);
  const detachZone = useCardStore((s) => s.detachZone);
  const toggleHidden = useCardStore((s) => s.toggleHidden);
  const toggleLock = useCardStore((s) => s.toggleLock);
  const reorderLayer = useCardStore((s) => s.reorderLayer);
  const config = useLoyaltyStore((s) => s.config);
  const pushToast = useUIStore((s) => s.pushToast);

  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  function detach(zoneId: string) {
    const zone = zones?.find((z) => z.id === zoneId);
    if (!zone) return;
    if (!window.confirm("Détacher la grille la convertit en tampons individuels que vous placez à la main. Le remplissage automatique au fil des scans reste actif, mais la grille ne se reconstruira plus toute seule si vous changez le nombre de tampons. Continuer ?")) return;
    const built = renderLoyaltyLayer(zone, config);
    detachZone(zoneId, built);
    pushToast("Grille détachée — tampons éditables un par un.");
  }

  return (
    <div className="space-y-1">
      {zones?.map((zone) => {
        const selected = selectedZoneId === zone.id;
        return (
          <div
            key={zone.id}
            onClick={() => selectZone(zone.id)}
            className="group flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors"
            style={{
              borderColor: selected ? "var(--accent-1)" : "var(--border-strong)",
              background: selected ? "var(--accent-glow)" : "var(--panel-soft)",
            }}
            title="Zone fonctionnelle gérée automatiquement (tampons rendus depuis la config de fidélité)."
          >
            <Grid3x3 size={13} style={{ color: "var(--accent-1)" }} />
            <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text)" }}>Grille de fidélité</span>
            <button
              onClick={(e) => { e.stopPropagation(); detach(zone.id); }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity hover:bg-[var(--border)] group-hover:opacity-100"
              style={{ color: "var(--text-dim)" }}
              title="Détacher la grille (placement manuel)"
            >
              <Scissors size={11} /> Détacher
            </button>
            <Lock size={12} style={{ color: "var(--accent-1)" }} />
          </div>
        );
      })}
      {sorted.map((layer) => {
        const Icon = typeIcon[layer.type];
        const selected = selectedIds.includes(layer.id);
        return (
          <div
            key={layer.id}
            onClick={() => selectLayer(layer.id)}
            className="group flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors"
            style={{
              borderColor: selected ? "var(--accent-1)" : "var(--border)",
              background: selected ? "var(--accent-glow)" : "var(--panel-soft)",
            }}
          >
            <Icon size={13} style={{ color: selected ? "var(--accent-1)" : "var(--text-dim)" }} />
            <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text)" }}>
              {layer.name}
            </span>
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, "forward"); }} className="cursor-pointer rounded p-0.5 hover:bg-[var(--border)]" title="Monter"><ChevronUp size={12} style={{ color: "var(--text-dim)" }} /></button>
              <button onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, "backward"); }} className="cursor-pointer rounded p-0.5 hover:bg-[var(--border)]" title="Descendre"><ChevronDown size={12} style={{ color: "var(--text-dim)" }} /></button>
            </div>
            <button onClick={(e) => { e.stopPropagation(); toggleHidden(layer.id); }} className="cursor-pointer rounded p-0.5 hover:bg-[var(--border)]" title={layer.hidden ? "Afficher" : "Masquer"}>
              {layer.hidden ? <EyeOff size={12} style={{ color: "var(--text-faint)" }} /> : <Eye size={12} style={{ color: "var(--text-dim)" }} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }} className="cursor-pointer rounded p-0.5 hover:bg-[var(--border)]" title={layer.locked ? "Déverrouiller" : "Verrouiller"}>
              {layer.locked ? <Lock size={12} style={{ color: "var(--accent-1)" }} /> : <LockOpen size={12} style={{ color: "var(--text-dim)" }} />}
            </button>
          </div>
        );
      })}
      {sorted.length === 0 && (!zones || zones.length === 0) && (
        <p className="py-4 text-center text-xs" style={{ color: "var(--text-faint)" }}>Aucun élément sur la carte.</p>
      )}
    </div>
  );
}
