"use client";

import { Droplet, Star, Award, Heart } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import Stepper from "@/components/ui/Stepper";
import ColorSwatches from "@/components/ui/ColorSwatches";
import type { LoyaltyType, StampShape } from "@/types/card";

const shapes: { id: StampShape; icon: typeof Droplet }[] = [
  { id: "drop", icon: Droplet },
  { id: "star", icon: Star },
  { id: "badge", icon: Award },
  { id: "heart", icon: Heart },
];

const stampColorPresets = ["#fdf3e7", "#ffffff", "#fce7f3", "#e6c15c", "#bbf7d0"];

export default function LoyaltySection() {
  const loyalty = useEditorStore((s) => s.design.loyalty);
  const updateLoyalty = useEditorStore((s) => s.updateLoyalty);

  return (
    <div className="space-y-4">
      <div
        className="flex rounded-full border p-1"
        style={{ borderColor: "var(--border-strong)" }}
      >
        {(["stamps", "points"] as LoyaltyType[]).map((type) => (
          <button
            key={type}
            onClick={() => updateLoyalty({ type })}
            className="flex-1 cursor-pointer rounded-full py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: loyalty.type === type ? "linear-gradient(135deg, var(--accent-1), var(--accent-2))" : "transparent",
              color: loyalty.type === type ? "#fff" : "var(--text-dim)",
            }}
          >
            {type === "stamps" ? "Tampons" : "Points"}
          </button>
        ))}
      </div>

      {loyalty.type === "stamps" ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Nombre de tampons
            </p>
            <Stepper
              value={loyalty.stampsCount}
              min={2}
              max={20}
              onChange={(v) =>
                updateLoyalty({ stampsCount: v, stampsFilled: Math.min(loyalty.stampsFilled, v) })
              }
            />
          </div>

          <div>
            <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
              Style des tampons
            </p>
            <div className="flex gap-2">
              {shapes.map((s) => {
                const Icon = s.icon;
                const active = loyalty.stampShape === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => updateLoyalty({ stampShape: s.id })}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors"
                    style={{
                      borderColor: active ? "var(--accent-1)" : "var(--border-strong)",
                      background: active ? "var(--accent-glow)" : "transparent",
                      color: active ? "var(--accent-1)" : "var(--text-dim)",
                    }}
                  >
                    <Icon size={15} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
              Couleur des tampons
            </p>
            <ColorSwatches
              value={loyalty.stampColor}
              presets={stampColorPresets}
              onChange={(c) => updateLoyalty({ stampColor: c })}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Points par euro dépensé
            </p>
            <Stepper
              value={loyalty.pointsPerEuro}
              min={1}
              max={20}
              onChange={(v) => updateLoyalty({ pointsPerEuro: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Points pour récompense
            </p>
            <input
              type="number"
              value={loyalty.pointsForReward}
              onChange={(e) => updateLoyalty({ pointsForReward: Math.max(10, Number(e.target.value)) })}
              className="w-24 rounded-lg border bg-transparent px-2 py-1.5 text-right text-sm outline-none focus:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Points actuels (aperçu)
            </p>
            <input
              type="number"
              value={loyalty.currentPoints}
              onChange={(e) => updateLoyalty({ currentPoints: Math.max(0, Number(e.target.value)) })}
              className="w-24 rounded-lg border bg-transparent px-2 py-1.5 text-right text-sm outline-none focus:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
