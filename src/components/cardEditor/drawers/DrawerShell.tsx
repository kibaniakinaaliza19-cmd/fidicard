"use client";

import { X } from "lucide-react";
import { useCardStore } from "@/store/cardStore";

export default function DrawerShell({ title, children }: { title: string; children: React.ReactNode }) {
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);
  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-r" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
        <button
          onClick={() => setActiveDrawer(null)}
          className="cursor-pointer rounded-lg p-1 transition-colors hover:bg-[var(--panel-soft)]"
        >
          <X size={15} style={{ color: "var(--text-dim)" }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}
