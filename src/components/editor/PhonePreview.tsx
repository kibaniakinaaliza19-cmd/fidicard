"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Signal, Wifi, BatteryFull, Plus, Smartphone, Tablet, CreditCard as WalletIcon } from "lucide-react";
import WalletCard from "@/components/editor/WalletCard";
import { useEditorStore, type ToolId } from "@/store/editorStore";
import type { CardFormat } from "@/types/card";

const formats: { id: CardFormat; label: string; icon: typeof Smartphone }[] = [
  { id: "iphone", label: "iPhone", icon: Smartphone },
  { id: "android", label: "Android", icon: Tablet },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
];

export default function PhonePreview() {
  const format = useEditorStore((s) => s.format);
  const setFormat = useEditorStore((s) => s.setFormat);
  const setSelectedTool = useEditorStore((s) => s.setSelectedTool);
  const design = useEditorStore((s) => s.design);

  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 150,
    damping: 20,
  });

  function handleMouseMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  function handleSelect(tool: ToolId) {
    setSelectedTool(tool);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
      <div
        className="flex items-center gap-1 rounded-full border p-1"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        {formats.map((f) => {
          const Icon = f.icon;
          const active = format === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200"
              style={{
                background: active ? "linear-gradient(135deg, var(--accent-1), var(--accent-2))" : "transparent",
                color: active ? "#fff" : "var(--text-dim)",
              }}
            >
              <Icon size={13} />
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative [perspective:1800px]"
      >
        <motion.div
          style={{ rotateX, rotateY }}
          className="relative"
        >
          {format === "wallet" ? (
            <div className="w-[300px]">
              <div className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                Aperçu Apple Wallet
              </div>
              <WalletCard onSelect={handleSelect} size="large" />
            </div>
          ) : (
            <div
              className="phone-shadow relative w-[300px] rounded-[52px] border-[6px] p-2.5"
              style={{
                borderColor: "#1c1c1e",
                background: "#000",
              }}
            >
              {format === "iphone" ? (
                <div className="absolute left-1/2 top-4 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
              ) : (
                <div className="absolute left-1/2 top-3.5 z-30 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black ring-2 ring-[#1c1c1e]" />
              )}

              <div
                className="relative overflow-hidden rounded-[42px] px-4 pb-6"
                style={{ background: "linear-gradient(180deg, #0d0d0d, #050505)", minHeight: 620 }}
              >
                <div className="flex items-center justify-between pb-2 pt-3 text-[13px] font-semibold text-white">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <Signal size={13} />
                    <Wifi size={13} />
                    <BatteryFull size={15} />
                  </div>
                </div>

                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Wallet</h2>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                    <Plus size={16} />
                  </button>
                </div>

                <WalletCard onSelect={handleSelect} />

                <div className="mt-4 flex justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                </div>

                <div
                  className="float-slow mt-6 h-16 w-full rounded-3xl opacity-80"
                  style={{
                    background: `linear-gradient(120deg, ${design.colors.accent}, ${design.colors.primary}, ${design.colors.secondary})`,
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
