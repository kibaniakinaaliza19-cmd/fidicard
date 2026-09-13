"use client";

import { Coffee, Sparkles, Pizza, Gift, type LucideIcon } from "lucide-react";
import FidiLogo from "@/components/ui/FidiLogo";
import type { JoinBusiness } from "@/data/joinBusinesses";

const ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  sparkles: Sparkles,
  pizza: Pizza,
  gift: Gift,
};

/**
 * The loyalty card exactly as the client will receive it: bank-card ratio,
 * the business's own colour preset, empty stamps (the client has none yet),
 * and the reward at the bottom. No QR — the client has no card yet.
 */
export default function JoinCard({ business, width = 320 }: { business: JoinBusiness; width?: number }) {
  const Icon = ICONS[business.stampIcon] ?? Gift;
  const { text, accent } = business.card;
  const stamps = Array.from({ length: business.stampGoal });
  const perRow = Math.min(5, Math.ceil(business.stampGoal / 2));

  return (
    <div
      className="flex flex-col justify-between overflow-hidden rounded-2xl"
      style={{
        width,
        aspectRatio: "1.586",
        background: business.card.bg,
        color: text,
        padding: width * 0.055,
      }}
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight" style={{ color: text }}>
            {business.name}
          </p>
          <p className="truncate text-[10px] leading-tight" style={{ color: `${text}99` }}>
            {business.tagline}
          </p>
        </div>
        <span className="ml-2 shrink-0 opacity-60">
          <FidiLogo size={18} />
        </span>
      </div>

      {/* stamps */}
      <div className="flex flex-wrap justify-center" style={{ gap: width * 0.022, maxWidth: perRow * (width * 0.088 + width * 0.022) }}>
        {stamps.map((_, i) => (
          <span
            key={i}
            className="flex items-center justify-center rounded-full"
            style={{
              width: width * 0.088,
              height: width * 0.088,
              border: `1.5px solid ${accent}66`,
              background: `${accent}12`,
            }}
          >
            <Icon size={width * 0.05} style={{ color: `${accent}77` }} strokeWidth={2} />
          </span>
        ))}
      </div>

      {/* reward */}
      <div className="flex items-center gap-2">
        <span
          className="flex shrink-0 items-center justify-center rounded-lg"
          style={{ width: width * 0.085, height: width * 0.085, background: `${accent}22` }}
        >
          <Gift size={width * 0.05} style={{ color: accent }} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-tight" style={{ color: text }}>
            {business.reward}
          </p>
          <p className="truncate text-[10px] leading-tight" style={{ color: `${text}88` }}>
            {business.rewardSubtext}
          </p>
        </div>
      </div>
    </div>
  );
}
