"use client";

import { useMemo, useState } from "react";
import { Search, ScanSearch } from "lucide-react";
import DrawerShell from "./DrawerShell";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import {
  templateCatalog,
  templateSectors,
  templateFamilies,
  templateCount,
  type TemplateEntry,
  type TemplateTag,
  type StyleFamily,
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
  const setImportCardOpen = useUIStore((s) => s.setImportCardOpen);
  const [sector, setSector] = useState("Tous");
  const [family, setFamily] = useState<StyleFamily | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return templateCatalog.filter((t) => {
      if (sector !== "Tous" && t.sector !== sector) return false;
      if (family !== "all" && t.family !== family) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.sector.toLowerCase().includes(q);
    });
  }, [sector, family, q]);

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
      {/* main action: AI import of an existing card */}
      <button
        onClick={() => setImportCardOpen(true)}
        className="mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", background: "var(--accent-glow)" }}
      >
        <ScanSearch size={20} className="shrink-0 text-[var(--accent-1)]" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
            Importer ma carte existante
          </span>
          <span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>
            Photo ou image — reconstruite par IA
          </span>
        </span>
      </button>

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

      {/* familles de style */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Style
      </p>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {([["all", "Tous les styles"], ...templateFamilies.map((f) => [f.id, f.label] as const)] as const).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setFamily(id as StyleFamily | "all")}
              className="shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{
                borderColor: family === id ? "var(--accent-1)" : "var(--border)",
                background: family === id ? "var(--accent-glow)" : "transparent",
                color: family === id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* secteurs */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Secteur
      </p>
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
          {groups.map(([sectorName, items]) => {
            // en vue « Tous » sans recherche : 4 modèles par secteur, le reste à la demande
            const collapsed = sector === "Tous" && family === "all" && !q && !expanded.has(sectorName) && items.length > 4;
            const visible = collapsed ? items.slice(0, 4) : items;
            return (
              <div key={sectorName}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{sectorName}</p>
                  <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{items.length}</span>
                </div>
                <div className="space-y-3">
                  {visible.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => apply(t)}
                      className="relative block w-full cursor-pointer overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 hover:border-[var(--accent-1)]"
                      style={{
                        borderColor: "var(--border)",
                        // ne rendre le contenu que lorsqu'il approche du viewport
                        contentVisibility: "auto",
                        containIntrinsicSize: "auto 196px",
                      }}
                    >
                      {t.tags?.[0] && (
                        <span
                          className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                          style={{ background: TAG_STYLE[t.tags[0]].bg, color: TAG_STYLE[t.tags[0]].color }}
                        >
                          {TAG_STYLE[t.tags[0]].label}
                        </span>
                      )}
                      <MiniCard doc={docFor(t)} width={248} preview />
                      <div className="px-2.5 py-1.5 text-left" style={{ background: "var(--panel-soft)" }}>
                        <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{t.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{t.sector}</p>
                      </div>
                    </button>
                  ))}
                  {collapsed && (
                    <button
                      onClick={() => setExpanded((s) => new Set(s).add(sectorName))}
                      className="w-full cursor-pointer rounded-xl border border-dashed py-2 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      Voir les {items.length - 4} autres modèles {sectorName}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DrawerShell>
  );
}
