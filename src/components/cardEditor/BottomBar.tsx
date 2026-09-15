"use client";

import {
  Undo2,
  Redo2,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Copy,
  Group,
  Ungroup,
  CheckCircle2,
  Maximize,
} from "lucide-react";
import { useCardStore } from "@/store/cardStore";

function Btn({ onClick, title, active, disabled, children }: { onClick: () => void; title: string; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--panel-soft)] disabled:cursor-not-allowed disabled:opacity-30"
      style={{ color: active ? "var(--accent-1)" : "var(--text-dim)", cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}

export default function BottomBar() {
  const undo = useCardStore((s) => s.undo);
  const redo = useCardStore((s) => s.redo);
  const historyIndex = useCardStore((s) => s.historyIndex);
  const historyLen = useCardStore((s) => s.history.length);
  const showGrid = useCardStore((s) => s.showGrid);
  const toggleGrid = useCardStore((s) => s.toggleGrid);
  const zoom = useCardStore((s) => s.zoom);
  const zoomIn = useCardStore((s) => s.zoomIn);
  const zoomOut = useCardStore((s) => s.zoomOut);
  const setZoom = useCardStore((s) => s.setZoom);
  const duplicateSelected = useCardStore((s) => s.duplicateSelected);
  const groupSelected = useCardStore((s) => s.groupSelected);
  const ungroupSelected = useCardStore((s) => s.ungroupSelected);
  const selectedIds = useCardStore((s) => s.selectedIds);
  const lastSavedAt = useCardStore((s) => s.lastSavedAt);

  return (
    <div
      className="flex h-[46px] shrink-0 items-center gap-1 px-3"
      style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}
    >
      <Btn onClick={undo} title="Annuler (Ctrl+Z)" disabled={historyIndex <= 0}><Undo2 size={14} /> Annuler</Btn>
      <Btn onClick={redo} title="Rétablir (Ctrl+Y)" disabled={historyIndex >= historyLen - 1}><Redo2 size={14} /> Rétablir</Btn>
      <div className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
      <Btn onClick={toggleGrid} title="Grille & repères" active={showGrid}><Grid3x3 size={14} /> Grille</Btn>
      <Btn onClick={duplicateSelected} title="Dupliquer (Ctrl+D)" disabled={selectedIds.length === 0}><Copy size={14} /> Copier</Btn>
      <Btn onClick={groupSelected} title="Grouper" disabled={selectedIds.length < 2}><Group size={14} /> Grouper</Btn>
      <Btn onClick={ungroupSelected} title="Dégrouper" disabled={selectedIds.length === 0}><Ungroup size={14} /> Dégrouper</Btn>

      <div className="ml-auto flex items-center gap-2">
        {lastSavedAt && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
            <CheckCircle2 size={12} className="text-green-500" /> Sauvegarde auto
          </span>
        )}
        <div className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
        <button onClick={zoomOut} className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--panel-soft)]" title="Dézoomer"><ZoomOut size={14} style={{ color: "var(--text-dim)" }} /></button>
        <button onClick={() => setZoom(1)} className="w-12 cursor-pointer text-center text-xs font-medium" style={{ color: "var(--text-dim)" }} title="Réinitialiser le zoom">{Math.round(zoom * 100)}%</button>
        <button onClick={zoomIn} className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--panel-soft)]" title="Zoomer"><ZoomIn size={14} style={{ color: "var(--text-dim)" }} /></button>
        <button onClick={() => setZoom(1)} className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--panel-soft)]" title="Ajuster"><Maximize size={14} style={{ color: "var(--text-dim)" }} /></button>
      </div>
    </div>
  );
}
