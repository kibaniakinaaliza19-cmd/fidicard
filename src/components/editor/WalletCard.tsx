"use client";

import { Info, X, Coffee } from "lucide-react";
import { getIcon } from "@/lib/icons";
import { useEditorStore, type ToolId } from "@/store/editorStore";
import type { CardDesign, StampShape } from "@/types/card";

const shapeIcons: Record<StampShape, ReturnType<typeof getIcon>> = {
  drop: getIcon("Droplet"),
  star: getIcon("Star"),
  badge: getIcon("Award"),
  heart: getIcon("Heart"),
};

function StampGrid({ design }: { design: CardDesign }) {
  const { stampsCount, stampsFilled, stampShape, stampColor } = design.loyalty;
  const ShapeIcon = shapeIcons[stampShape];
  const stamps = Array.from({ length: stampsCount });

  return (
    <div className="flex flex-wrap gap-2.5">
      {stamps.map((_, i) => {
        const filled = i < stampsFilled;
        return (
          <span
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
            style={{
              background: filled ? stampColor : "rgba(255,255,255,0.06)",
              borderColor: filled ? stampColor : "rgba(255,255,255,0.25)",
            }}
          >
            <ShapeIcon
              size={14}
              strokeWidth={2}
              style={{ color: filled ? design.colors.secondary : "rgba(255,255,255,0.35)" }}
              fill={filled ? design.colors.secondary : "none"}
            />
          </span>
        );
      })}
    </div>
  );
}

function PointsBar({ design }: { design: CardDesign }) {
  const { currentPoints, pointsForReward } = design.loyalty;
  const pct = Math.min(100, (currentPoints / pointsForReward) * 100);
  return (
    <div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: design.colors.accent }}
        />
      </div>
      <p className="text-xs text-white/70">
        {currentPoints} / {pointsForReward} points
      </p>
    </div>
  );
}

interface WalletCardProps {
  onSelect?: (tool: ToolId) => void;
  size?: "normal" | "large";
}

export default function WalletCard({ onSelect, size = "normal" }: WalletCardProps) {
  const design = useEditorStore((s) => s.design);
  const flipped = useEditorStore((s) => s.flipped);
  const setFlipped = useEditorStore((s) => s.setFlipped);

  const RewardIcon = getIcon(design.reward.icon);
  const radius = design.style.borderRadius;
  const scale = size === "large" ? "text-base" : "text-sm";

  const backgroundStyle: React.CSSProperties = design.background.imageUrl
    ? {
        backgroundImage: `url(${design.background.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `radial-gradient(circle at 30% 20%, ${design.colors.primary}55, transparent 60%), radial-gradient(circle at 80% 90%, ${design.colors.accent}40, transparent 55%), ${design.colors.background}`,
      };

  return (
    <div className="[perspective:1600px]">
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <div
          className={`relative w-full overflow-hidden border shadow-2xl ${scale}`}
          style={{
            borderRadius: radius,
            borderColor: "rgba(255,255,255,0.1)",
            backfaceVisibility: "hidden",
          }}
        >
          <button
            onClick={() => onSelect?.("name")}
            className="relative flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left"
            style={{
              background: `linear-gradient(120deg, ${design.colors.primary}, ${design.colors.secondary})`,
            }}
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.("logo");
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-inner"
              style={{
                transform: `rotate(${design.logo.rotation}deg)`,
                boxShadow: design.logo.glow ? `0 0 16px 2px ${design.colors.accent}` : undefined,
              }}
            >
              {design.logo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={design.logo.url} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <span style={{ color: design.colors.primary }}>
                  <Coffee size={18} strokeWidth={2} />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold uppercase tracking-wide text-white">
                {design.companyName}
              </span>
              <span className="block truncate text-xs text-white/80">{design.tagline}</span>
            </span>
          </button>

          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.("background")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.("background")}
            className="relative block w-full cursor-pointer px-4 pb-5 pt-4 text-left"
            style={backgroundStyle}
          >
            <div
              className="absolute inset-0"
              style={{ background: `rgba(0,0,0,${design.background.dim / 100})` }}
            />
            <div className="relative z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.("loyalty");
                }}
                className="mb-3 flex w-full cursor-pointer items-center justify-between text-left"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  Votre fidélité
                </span>
                <span className="text-sm font-bold text-white">
                  {design.loyalty.type === "stamps"
                    ? `${design.loyalty.stampsFilled} / ${design.loyalty.stampsCount}`
                    : `${design.loyalty.currentPoints} pts`}
                </span>
              </button>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.("loyalty");
                }}
                className="cursor-pointer"
              >
                {design.loyalty.type === "stamps" ? (
                  <StampGrid design={design} />
                ) : (
                  <PointsBar design={design} />
                )}
              </div>
              <div className="mt-8 h-10" />
            </div>
          </div>

          <button
            onClick={() => onSelect?.("reward")}
            className="relative flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left"
            style={{
              background: `linear-gradient(120deg, ${design.colors.secondary}, ${design.colors.primary}cc)`,
            }}
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.("icon");
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15"
            >
              {/* eslint-disable-next-line react-hooks/static-components -- icon resolved dynamically by reward.icon */}
              <RewardIcon size={16} className="text-white" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/70">
                Récompense
              </span>
              <span className="block truncate text-sm font-bold text-white">
                {design.reward.title}
              </span>
              <span className="block truncate text-xs text-white/70">{design.reward.subtitle}</span>
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.("info");
              setFlipped(true);
            }}
            className="absolute bottom-3 right-3 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/60"
          >
            <Info size={12} />
          </button>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden border p-5"
          style={{
            borderRadius: radius,
            borderColor: "rgba(255,255,255,0.1)",
            background: design.colors.secondary,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Informations
            </p>
            <button
              onClick={() => setFlipped(false)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
            >
              <X size={12} />
            </button>
          </div>
          <div className="space-y-2.5 text-xs text-white/85">
            <InfoRow label="Téléphone" value={design.info.phone} />
            <InfoRow label="Email" value={design.info.email} />
            <InfoRow label="Site web" value={design.info.website} />
            <InfoRow label="Adresse" value={design.info.address} />
            <InfoRow label="Horaires" value={design.info.hours} />
            <InfoRow label="WhatsApp" value={design.info.whatsapp} />
          </div>
          <p className="mt-auto text-center text-[10px] text-white/40">Propulsé par FidiCard</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
      <span className="text-white/50">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
