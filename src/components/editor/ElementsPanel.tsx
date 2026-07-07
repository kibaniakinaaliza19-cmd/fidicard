"use client";

import {
  Image as ImageIcon,
  Building2,
  Type,
  Sparkles,
  Gift as GiftIcon,
  CircleDot,
  Phone,
} from "lucide-react";
import { useEditorStore, type ToolId } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

const layers: { id: ToolId; label: string; icon: typeof ImageIcon }[] = [
  { id: "background", label: "Fond", icon: ImageIcon },
  { id: "logo", label: "Logo", icon: Building2 },
  { id: "name", label: "Nom & slogan", icon: Type },
  { id: "loyalty", label: "Système de fidélité", icon: Sparkles },
  { id: "reward", label: "Récompense", icon: GiftIcon },
  { id: "icon", label: "Icône récompense", icon: CircleDot },
  { id: "info", label: "Infos supplémentaires", icon: Phone },
];

export default function ElementsPanel() {
  const selectedTool = useEditorStore((s) => s.selectedTool);
  const setSelectedTool = useEditorStore((s) => s.setSelectedTool);
  const setRightTab = useUIStore((s) => s.setRightTab);

  return (
    <div className="space-y-1.5">
      <p className="mb-2 text-xs" style={{ color: "var(--text-faint)" }}>
        Sélectionne un élément pour voir ses réglages.
      </p>
      {layers.map((layer) => {
        const Icon = layer.icon;
        const active = selectedTool === layer.id;
        return (
          <button
            key={layer.id}
            onClick={() => {
              setSelectedTool(layer.id);
              setRightTab("proprietes");
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
            style={{
              borderColor: active ? "var(--accent-1)" : "var(--border)",
              background: active ? "var(--accent-glow)" : "var(--panel-soft)",
            }}
          >
            <Icon size={15} style={{ color: active ? "var(--accent-1)" : "var(--text-dim)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {layer.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
