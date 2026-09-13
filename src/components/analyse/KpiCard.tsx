"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import Sparkline from "./Sparkline";
import type { KpiCardData } from "@/data/analytics";

export default function KpiCard({ kpi, index }: { kpi: KpiCardData; index: number }) {
  const Icon = kpi.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -3, boxShadow: `0 16px 34px -14px ${kpi.color}55` }}
      className="rounded-2xl border p-5"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${kpi.color}22`, color: kpi.color }}>
          <Icon size={16} />
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>{kpi.label}</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{kpi.value}</p>
          <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: kpi.positive ? "#32d583" : "#f87171" }}>
            {kpi.positive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{kpi.delta}
            <span className="ml-1 font-normal" style={{ color: "var(--text-faint)" }}>vs sem. préc.</span>
          </span>
        </div>
        <div className="w-24">
          <Sparkline data={kpi.spark} color={kpi.color} />
        </div>
      </div>
    </motion.div>
  );
}
