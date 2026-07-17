"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import DrawerShell from "./DrawerShell";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import {
  templateCatalog,
  templateSectors,
  templateCount,
  type TemplateEntry,
  type TemplateTag,
} from "@/data/templateCatalog";
import type { CardDoc } from "@/types/layer";

const TAG_STYLE: Record<TemplateTag, { label: string; bg: string; color: string }> = {
  populaire: { label: "Populaire", bg: "rgba(240,101,62,0.18)", color: "#ff8a5c" },
  nouveau: { label: "Nouveau", bg: "rgba(76,175,125,0.18)", color: "#4CAF7D" },
};

// Build each template's CardDoc once (memoized across the module) so scrolling
// the gallery stays smooth even with the full catalog.
const builtCache = new Map<string, CardDoc>();
function docFor(t: TemplateEntry): CardDoc {
  let doc = builtCache.get(t.id);
  if (!doc) {
    doc = t.build();
    builtCache.set(t.id, doc);
  }
  return doc;
}

export default function TemplatesDrawer() {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const pushToast = useUIStore((s) => s.pushToast);
  const [sector, setSector] = useState("Tous");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return templateCatalog.filter((t) => {
      if (sector !== "Tous" && t.sector !== sector) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.sector.toLowerCase().includes(q);
    });
  }, [sector, q]);

  // group by sector, preserving catalog (sector-ordered) order
  const groups = useMemo(() => {
    const map = new Map<string, TemplateEntry[]>();
    for (const t of filtered) {
      const list = map.get(t.sector) ?? [];
      list.push(t);
      map.set(t.sector, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const chips = ["Tous", ...templateSectors];

  function apply(t: TemplateEntry) {
    applyTemplate(docFor(t));
    pushToast(`Modèle « ${t.name} » chargé`);
  }

  return (
    <DrawerShell title="Modèles de cartes">
      <div className="mb-3 flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: "var(--border-strong)" }}>
        <Search size={14} style={{ color: "var(--text-faint)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher parmi ${templateCount} modèles...`}
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: "var(--text)" }}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setSector(c)}
            className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              borderColor: sector === c ? "var(--accent-1)" : "var(--border)",
              background: sector === c ? "var(--accent-glow)" : "transparent",
              color: sector === c ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-xs" style={{ color: "var(--text-faint)" }}>
          Aucun modèle ne correspond à « {query} ».
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(([sectorName, items]) => (
            <div key={sectorName}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{sectorName}</p>
                <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => apply(t)}
                    className="relative block w-full cursor-pointer overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 hover:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {t.tags?.[0] && (
                      <span
                        className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                        style={{ background: TAG_STYLE[t.tags[0]].bg, color: TAG_STYLE[t.tags[0]].color }}
                      >
                        {TAG_STYLE[t.tags[0]].label}
                      </span>
                    )}
                    <MiniCard doc={docFor(t)} width={248} />
                    <div className="px-2.5 py-1.5 text-left" style={{ background: "var(--panel-soft)" }}>
                      <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{t.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{t.sector}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DrawerShell>
  );
}
