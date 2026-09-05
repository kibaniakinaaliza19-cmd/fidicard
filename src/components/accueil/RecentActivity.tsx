"use client";

import Link from "next/link";
import { Stamp, Gift, ScanLine } from "lucide-react";
import { recentActivity, type ActivityKind } from "@/data/activity";

const kindIcon: Record<ActivityKind, typeof Stamp> = {
  stamp: Stamp,
  reward: Gift,
  scan: ScanLine,
};

export default function RecentActivity() {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Activité récente
        </h2>
        <Link
          href="/clients"
          className="text-xs font-medium transition-colors hover:text-[var(--accent-1)]"
          style={{ color: "var(--text-faint)" }}
        >
          Voir tout
        </Link>
      </div>

      <ul className="space-y-1">
        {recentActivity.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-[var(--panel-soft)]"
            >
              <span className="relative shrink-0">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: item.color }}
                >
                  {item.initials}
                </span>
                <span
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2"
                  style={{ background: item.color, borderColor: "var(--panel)" }}
                >
                  <Icon size={9} className="text-white" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm" style={{ color: "var(--text)" }}>
                  <span className="font-semibold">{item.name}</span> {item.action}
                </span>
              </span>
              <span className="shrink-0 text-xs" style={{ color: "var(--text-faint)" }}>
                {item.time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
