"use client";

import { useEditorStore } from "@/store/editorStore";

export default function NameSection() {
  const companyName = useEditorStore((s) => s.design.companyName);
  const tagline = useEditorStore((s) => s.design.tagline);
  const setCompanyName = useEditorStore((s) => s.setCompanyName);
  const setTagline = useEditorStore((s) => s.setTagline);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
          Nom de l&rsquo;entreprise
        </p>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
          maxLength={28}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
      </div>
      <div>
        <p className="mb-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
          Slogan / sous-titre
        </p>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={48}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
      </div>
    </div>
  );
}
