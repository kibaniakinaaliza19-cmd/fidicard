"use client";

import { useMemo, useState } from "react";
import DrawerShell from "./DrawerShell";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import { cardTemplates, templateCategories } from "@/data/cardTemplates";

export default function TemplatesDrawer() {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const pushToast = useUIStore((s) => s.pushToast);
  const [category, setCategory] = useState("Tous");

  const filtered = useMemo(
    () => (category === "Tous" ? cardTemplates : cardTemplates.filter((t) => t.category === category)),
    [category]
  );

  return (
    <DrawerShell title="Modèles de cartes">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {templateCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              borderColor: category === c ? "var(--accent-1)" : "var(--border)",
              background: category === c ? "var(--accent-glow)" : "transparent",
              color: category === c ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              applyTemplate(t.build());
              pushToast(`Modèle « ${t.name} » chargé`);
            }}
            className="block w-full cursor-pointer overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border)" }}
          >
            <MiniCard doc={t.build()} width={248} />
            <div className="px-2 py-1.5 text-left" style={{ background: "var(--panel-soft)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{t.name}</p>
              <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{t.category}</p>
            </div>
          </button>
        ))}
      </div>
    </DrawerShell>
  );
}
