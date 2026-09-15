"use client";

import BusinessLogo from "./BusinessLogo";
import type { PushSample } from "@/data/notifications";

export default function NotificationCard({ push, platform }: { push: PushSample; platform: "ios" | "android" }) {
  const radius = platform === "ios" ? 18 : 22;
  return (
    <div
      className="flex items-start gap-2.5 p-3 backdrop-blur-xl"
      style={{
        borderRadius: radius,
        background: platform === "ios" ? "rgba(40,40,42,0.72)" : "rgba(28,28,30,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <BusinessLogo emoji={push.emoji} from={push.logoFrom} to={push.logoTo} size={34} radius={9} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-white">{push.business}</span>
          <span className="shrink-0 text-[10px] text-white/50">{push.time}</span>
        </div>
        <p className="mt-0.5 text-[12px] font-medium leading-snug text-white/90">{push.title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/65">{push.body}</p>
      </div>
      {push.badge && (
        <span
          className="shrink-0 self-center rounded-lg px-2 py-1 text-[11px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${push.logoFrom}, ${push.logoTo})` }}
        >
          {push.badge}
        </span>
      )}
    </div>
  );
}
