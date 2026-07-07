"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Image as ImageIcon,
  Type,
  Building2,
  Palette,
  Sparkles,
  Gift as GiftIcon,
  CircleDot,
  Phone,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useEditorStore, type ToolId } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

const tools: { id: ToolId; label: string; sublabel: string; icon: typeof ImageIcon }[] = [
  { id: "background", label: "Image de fond", sublabel: "Importez ou choisissez", icon: ImageIcon },
  { id: "logo", label: "Logo", sublabel: "Importez votre logo", icon: Building2 },
  { id: "name", label: "Nom de l'entreprise", sublabel: "Personnalisez le nom", icon: Type },
  { id: "colors", label: "Couleurs", sublabel: "Changez les couleurs", icon: Palette },
  { id: "loyalty", label: "Système de fidélité", sublabel: "Points ou tampons", icon: Sparkles },
  { id: "reward", label: "Récompense", sublabel: "Définissez la récompense", icon: GiftIcon },
  { id: "icon", label: "Icône", sublabel: "Ajoutez une icône", icon: CircleDot },
  { id: "info", label: "Infos supplémentaires", sublabel: "Téléphone, site web, etc.", icon: Phone },
];

export default function ToolsList() {
  const selectedTool = useEditorStore((s) => s.selectedTool);
  const toggleTool = useEditorStore((s) => s.toggleTool);
  const reset = useEditorStore((s) => s.reset);
  const setRightTab = useUIStore((s) => s.setRightTab);
  const pushToast = useUIStore((s) => s.pushToast);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
        Outils
      </h3>

      <div className="flex flex-col gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = selectedTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setRightTab("proprietes");
                toggleTool(tool.id);
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150"
              style={{ background: active ? "var(--panel-soft)" : "transparent" }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150"
                style={{
                  background: active ? "var(--accent-glow)" : "var(--border)",
                  color: active ? "var(--accent-1)" : "var(--text-dim)",
                }}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                  {tool.label}
                </span>
                <span className="block truncate text-xs" style={{ color: "var(--text-faint)" }}>
                  {tool.sublabel}
                </span>
              </span>
              <ChevronRight
                size={15}
                className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                style={{ color: "var(--text-faint)" }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <AnimatePresence mode="wait">
          {confirmReset ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                  pushToast("Carte réinitialisée");
                }}
                className="flex-1 cursor-pointer rounded-lg py-2 text-xs font-semibold text-white"
                style={{ background: "var(--accent-2)" }}
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
              >
                Annuler
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="reset"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmReset(true)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent-2)" }}
            >
              <RotateCcw size={13} />
              Réinitialiser la carte
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
