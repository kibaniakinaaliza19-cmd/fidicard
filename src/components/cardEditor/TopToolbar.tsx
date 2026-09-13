"use client";

import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Lock,
  LockOpen,
  BringToFront,
  SendToBack,
  Minus,
  Plus,
} from "lucide-react";
import { useCardStore } from "@/store/cardStore";
import type { Layer, TextLayer, ShapeLayer, ImageLayer } from "@/types/layer";
import { fontOptions } from "@/lib/fonts";

function IconBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--panel-soft)]"
      style={{ background: active ? "var(--accent-glow)" : "transparent", color: active ? "var(--accent-1)" : "var(--text-dim)" }}
    >
      {children}
    </button>
  );
}

export default function TopToolbar() {
  const selectedIds = useCardStore((s) => s.selectedIds);
  const layers = useCardStore((s) => s.card.layers);
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const duplicateSelected = useCardStore((s) => s.duplicateSelected);
  const deleteSelected = useCardStore((s) => s.deleteSelected);
  const toggleLock = useCardStore((s) => s.toggleLock);
  const reorderLayer = useCardStore((s) => s.reorderLayer);

  const selected = layers.filter((l) => selectedIds.includes(l.id));
  const primary = selected[0] as Layer | undefined;

  if (!primary) {
    return (
      <div
        className="flex h-[52px] shrink-0 items-center px-4 text-xs"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-faint)" }}
      >
        Sélectionnez un élément sur la carte pour le modifier, ou ajoutez-en un depuis le rail de gauche.
      </div>
    );
  }

  const isText = primary.type === "text";
  const isShape = primary.type === "shape";
  const isImage = primary.type === "image";
  const t = primary as TextLayer;

  function patchText(patch: Partial<TextLayer>) {
    selected.forEach((l) => l.type === "text" && updateLayerLive(l.id, patch as Partial<Layer>));
    commit();
  }

  return (
    <div
      className="flex h-[52px] shrink-0 items-center gap-1.5 overflow-x-auto px-3"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
    >
      {isText && (
        <>
          <select
            value={t.font}
            onChange={(e) => patchText({ font: e.target.value })}
            className="h-8 cursor-pointer rounded-lg border bg-transparent px-2 text-xs outline-none"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            {fontOptions.map((f) => (
              <option key={f.value} value={f.value} style={{ background: "var(--panel)" }}>{f.label}</option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border" style={{ borderColor: "var(--border-strong)" }}>
            <button onClick={() => patchText({ fontSize: Math.max(6, t.fontSize - 1) })} className="flex h-8 w-7 cursor-pointer items-center justify-center" style={{ color: "var(--text-dim)" }}><Minus size={12} /></button>
            <input
              type="number"
              value={Math.round(t.fontSize)}
              onChange={(e) => patchText({ fontSize: Number(e.target.value) })}
              className="h-8 w-10 bg-transparent text-center text-xs outline-none"
              style={{ color: "var(--text)" }}
            />
            <button onClick={() => patchText({ fontSize: t.fontSize + 1 })} className="flex h-8 w-7 cursor-pointer items-center justify-center" style={{ color: "var(--text-dim)" }}><Plus size={12} /></button>
          </div>

          <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border" style={{ borderColor: "var(--border-strong)" }} title="Couleur du texte">
            <span className="h-4 w-4 rounded" style={{ background: t.color }} />
            <input type="color" value={t.color} onChange={(e) => patchText({ color: e.target.value })} className="absolute h-0 w-0 opacity-0" />
          </label>

          <div className="mx-1 h-6 w-px" style={{ background: "var(--border)" }} />

          <IconBtn title="Gras" active={t.fontWeight >= 700} onClick={() => patchText({ fontWeight: t.fontWeight >= 700 ? 400 : 700 })}><Bold size={15} /></IconBtn>
          <IconBtn title="Italique" active={t.italic} onClick={() => patchText({ italic: !t.italic })}><Italic size={15} /></IconBtn>
          <IconBtn title="Souligné" active={t.underline} onClick={() => patchText({ underline: !t.underline })}><Underline size={15} /></IconBtn>

          <div className="mx-1 h-6 w-px" style={{ background: "var(--border)" }} />

          <IconBtn title="Aligner à gauche" active={t.align === "left"} onClick={() => patchText({ align: "left" })}><AlignLeft size={15} /></IconBtn>
          <IconBtn title="Centrer" active={t.align === "center"} onClick={() => patchText({ align: "center" })}><AlignCenter size={15} /></IconBtn>
          <IconBtn title="Aligner à droite" active={t.align === "right"} onClick={() => patchText({ align: "right" })}><AlignRight size={15} /></IconBtn>
        </>
      )}

      {isShape && (
        <>
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }} title="Remplissage">
            Remplissage
            <span className="h-4 w-4 rounded" style={{ background: (primary as ShapeLayer).fill }} />
            <input type="color" value={(primary as ShapeLayer).fill} onChange={(e) => { updateLayerLive(primary.id, { fill: e.target.value } as Partial<Layer>); commit(); }} className="absolute h-0 w-0 opacity-0" />
          </label>
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }} title="Contour">
            Contour
            <span className="h-4 w-4 rounded" style={{ background: (primary as ShapeLayer).stroke }} />
            <input type="color" value={(primary as ShapeLayer).stroke} onChange={(e) => { updateLayerLive(primary.id, { stroke: e.target.value, strokeWidth: Math.max(1, (primary as ShapeLayer).strokeWidth) } as Partial<Layer>); commit(); }} className="absolute h-0 w-0 opacity-0" />
          </label>
        </>
      )}

      {primary.type === "icon" && (
        <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }} title="Couleur de l'icône">
          Couleur
          <span className="h-4 w-4 rounded" style={{ background: (primary as { color: string }).color }} />
          <input type="color" value={(primary as { color: string }).color} onChange={(e) => { updateLayerLive(primary.id, { color: e.target.value } as Partial<Layer>); commit(); }} className="absolute h-0 w-0 opacity-0" />
        </label>
      )}

      {isImage && (
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-dim)" }}>
          <span className="flex items-center gap-1.5">Lum.
            <input type="range" min={40} max={160} value={(primary as ImageLayer).brightness} onChange={(e) => { updateLayerLive(primary.id, { brightness: Number(e.target.value) } as Partial<Layer>); }} onPointerUp={commit} className="w-16 cursor-pointer accent-[var(--accent-1)]" />
          </span>
          <span className="flex items-center gap-1.5">Contr.
            <input type="range" min={40} max={160} value={(primary as ImageLayer).contrast} onChange={(e) => { updateLayerLive(primary.id, { contrast: Number(e.target.value) } as Partial<Layer>); }} onPointerUp={commit} className="w-16 cursor-pointer accent-[var(--accent-1)]" />
          </span>
          <span className="flex items-center gap-1.5">Sat.
            <input type="range" min={0} max={200} value={(primary as ImageLayer).saturate} onChange={(e) => { updateLayerLive(primary.id, { saturate: Number(e.target.value) } as Partial<Layer>); }} onPointerUp={commit} className="w-16 cursor-pointer accent-[var(--accent-1)]" />
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <span className="flex items-center gap-1.5 pr-1 text-xs" style={{ color: "var(--text-faint)" }}>
          Opacité
          <input
            type="range"
            min={0}
            max={100}
            value={primary.opacity}
            onChange={(e) => updateLayerLive(primary.id, { opacity: Number(e.target.value) } as Partial<Layer>)}
            onPointerUp={commit}
            className="w-16 cursor-pointer accent-[var(--accent-1)]"
          />
        </span>
        <div className="mx-1 h-6 w-px" style={{ background: "var(--border)" }} />
        <IconBtn title="Mettre au premier plan" onClick={() => reorderLayer(primary.id, "front")}><BringToFront size={15} /></IconBtn>
        <IconBtn title="Mettre en arrière-plan" onClick={() => reorderLayer(primary.id, "back")}><SendToBack size={15} /></IconBtn>
        <IconBtn title={primary.locked ? "Déverrouiller" : "Verrouiller"} active={primary.locked} onClick={() => toggleLock(primary.id)}>
          {primary.locked ? <Lock size={15} /> : <LockOpen size={15} />}
        </IconBtn>
        <IconBtn title="Dupliquer" onClick={duplicateSelected}><Copy size={15} /></IconBtn>
        <IconBtn title="Supprimer" onClick={deleteSelected}><Trash2 size={15} /></IconBtn>
      </div>
    </div>
  );
}
