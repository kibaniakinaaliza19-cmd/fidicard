"use client";

import { motion } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import ElementsPanel from "@/components/editor/ElementsPanel";

const tabs: { id: "proprietes" | "elements"; label: string }[] = [
  { id: "proprietes", label: "Propriétés" },
  { id: "elements", label: "Éléments" },
];

export default function RightPanel() {
  const rightTab = useUIStore((s) => s.rightTab);
  const setRightTab = useUIStore((s) => s.setRightTab);

  return (
    <div
      className="flex h-full w-[340px] shrink-0 flex-col border-l"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="flex gap-6 border-b px-5 pt-5" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => {
          const active = rightTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              className="relative cursor-pointer pb-3 text-xs font-semibold uppercase tracking-wide transition-colors"
              style={{ color: active ? "var(--accent-1)" : "var(--text-faint)" }}
            >
              {tab.label}
              {active && (
                <motion.span
                  layoutId="right-tab-underline"
                  className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full"
                  style={{ background: "linear-gradient(90deg, var(--accent-1), var(--accent-2))" }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {rightTab === "proprietes" ? <PropertiesPanel /> : <ElementsPanel />}
      </div>
    </div>
  );
}
