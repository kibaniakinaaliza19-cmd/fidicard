"use client";

import { Signal, Wifi, BatteryFull } from "lucide-react";
import NotificationCard from "./NotificationCard";
import type { PushSample } from "@/data/notifications";

export function IphonePreview({ push, extra = [] }: { push: PushSample; extra?: PushSample[] }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[280px] rounded-[38px] border-[6px] p-2"
      style={{ borderColor: "#1c1c1e", background: "#000", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.7)" }}
    >
      <div className="absolute left-1/2 top-3 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div
        className="relative overflow-hidden rounded-[30px] px-3 pb-6 pt-3"
        style={{
          minHeight: 380,
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, #3a1205 0%, #150803 40%, #000 100%)",
        }}
      >
        <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-white">
          <span>9:41</span>
          <div className="flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></div>
        </div>

        <div className="mt-6 text-center text-white">
          <p className="text-[13px] font-medium text-white/80">Mardi 21 mai</p>
          <p className="text-[52px] font-semibold leading-none tracking-tight">9:41</p>
        </div>

        <div className="mt-6 space-y-2">
          <NotificationCard push={push} platform="ios" />
          {extra.map((p, i) => (
            <NotificationCard key={i} push={p} platform="ios" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AndroidPreview({ push }: { push: PushSample }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[280px] rounded-[26px] border-[5px] p-2"
      style={{ borderColor: "#2a2a2a", background: "#0d0d0d", boxShadow: "0 24px 48px -20px rgba(0,0,0,0.6)" }}
    >
      <div
        className="overflow-hidden rounded-[20px] px-3 pb-4 pt-3"
        style={{ background: "linear-gradient(180deg, #101014, #050505)", minHeight: 150 }}
      >
        <div className="mb-3 flex items-center justify-between px-1 text-[11px] font-medium text-white/70">
          <span>12:30</span>
          <div className="flex items-center gap-1"><Signal size={10} /><Wifi size={10} /><BatteryFull size={12} /></div>
        </div>
        <NotificationCard push={push} platform="android" />
      </div>
    </div>
  );
}
