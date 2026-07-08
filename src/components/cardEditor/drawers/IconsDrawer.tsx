"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { createIconLayer } from "@/lib/layerFactory";
import { editorIconCategories, getIcon } from "@/lib/icons";

export default function IconsDrawer() {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);
  const [query, setQuery] = useState("");

  function add(icon: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createIconLayer(z, icon));
  }

  const q = query.toLowerCase();

  return (
    <DrawerShell title="Icônes">
      <div className="mb-4 flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: "var(--border-strong)" }}>
        <Search size={14} style={{ color: "var(--text-faint)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une icône..."
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: "var(--text)" }}
        />
      </div>

      <div className="space-y-4">
        {editorIconCategories.map((cat) => {
          const icons = cat.icons.filter((i) => !q || i.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q));
          if (icons.length === 0) return null;
          return (
            <div key={cat.label}>
              <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>{cat.label}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {icons.map((name) => {
                  const Icon = getIcon(name);
                  return (
                    <button
                      key={name}
                      onClick={() => add(name)}
                      className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </DrawerShell>
  );
}
