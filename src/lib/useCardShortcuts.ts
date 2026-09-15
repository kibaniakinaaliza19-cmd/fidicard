"use client";

import { useEffect } from "react";
import { useCardStore } from "@/store/cardStore";

export function useCardShortcuts() {
  const undo = useCardStore((s) => s.undo);
  const redo = useCardStore((s) => s.redo);
  const copySelected = useCardStore((s) => s.copySelected);
  const pasteClipboard = useCardStore((s) => s.pasteClipboard);
  const duplicateSelected = useCardStore((s) => s.duplicateSelected);
  const deleteSelected = useCardStore((s) => s.deleteSelected);
  const moveSelectedBy = useCardStore((s) => s.moveSelectedBy);
  const clearSelection = useCardStore((s) => s.clearSelection);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (typing) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        clearSelection();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelectedBy(0, e.shiftKey ? -5 : -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelectedBy(0, e.shiftKey ? 5 : 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveSelectedBy(e.shiftKey ? -5 : -1, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveSelectedBy(e.shiftKey ? 5 : 1, 0);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, copySelected, pasteClipboard, duplicateSelected, deleteSelected, moveSelectedBy, clearSelection]);
}
