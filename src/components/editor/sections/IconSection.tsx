"use client";

import { useEditorStore } from "@/store/editorStore";
import { getIcon, rewardIconOptions } from "@/lib/icons";

export default function IconSection() {
  const icon = useEditorStore((s) => s.design.reward.icon);
  const updateReward = useEditorStore((s) => s.updateReward);

  return (
    <div>
      <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
        Icône de la récompense
      </p>
      <div className="grid grid-cols-4 gap-2">
        {rewardIconOptions.map((name) => {
          const Icon = getIcon(name);
          const active = icon === name;
          return (
            <button
              key={name}
              onClick={() => updateReward({ icon: name })}
              className="flex h-11 cursor-pointer items-center justify-center rounded-lg border transition-colors"
              style={{
                borderColor: active ? "var(--accent-1)" : "var(--border-strong)",
                background: active ? "var(--accent-glow)" : "transparent",
                color: active ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
