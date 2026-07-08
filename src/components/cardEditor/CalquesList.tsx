"use client";

import { Eye, EyeOff, Lock, LockOpen, ChevronUp, ChevronDown, Type, Square, Image as ImageIcon, QrCode, Barcode, Smile } from "lucide-react";
import { useCardStore } from "@/store/cardStore";
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
  const selectedIds = useCardStore((s) => s.selectedIds);
  const selectLayer = useCardStore((s) => s.selectLayer);
  const toggleHidden = useCardStore((s) => s.toggleHidden);
  const toggleLock = useCardStore((s) => s.toggleLock);
  const reorderLayer = useCardStore((s) => s.reorderLayer);

  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="space-y-1">
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
      {sorted.length === 0 && (
        <p className="py-4 text-center text-xs" style={{ color: "var(--text-faint)" }}>Aucun élément sur la carte.</p>
      )}
    </div>
  );
}
