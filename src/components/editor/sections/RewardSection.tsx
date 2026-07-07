"use client";

import { useEditorStore } from "@/store/editorStore";

export default function RewardSection() {
  const reward = useEditorStore((s) => s.design.reward);
  const updateReward = useEditorStore((s) => s.updateReward);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
          Texte de récompense
        </p>
        <input
          value={reward.title}
          onChange={(e) => updateReward({ title: e.target.value })}
          maxLength={32}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
      </div>
      <div>
        <p className="mb-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
          Sous texte
        </p>
        <input
          value={reward.subtitle}
          onChange={(e) => updateReward({ subtitle: e.target.value })}
          maxLength={32}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
      </div>
    </div>
  );
}
