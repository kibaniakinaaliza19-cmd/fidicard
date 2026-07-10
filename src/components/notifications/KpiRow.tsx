"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { kpis } from "@/data/notifications";

export default function KpiRow() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border p-4"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${k.color}22`, color: k.color }}
            >
              <Icon size={16} />
            </span>
            <p className="mt-3 text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{k.value}</p>
            <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{k.label}</p>
            <span
              className="mt-1.5 flex items-center gap-0.5 text-[11px] font-semibold"
              style={{ color: k.positive ? "#32d583" : "#f87171" }}
            >
              {k.positive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {k.delta}
              <span className="ml-1 font-normal" style={{ color: "var(--text-faint)" }}>vs mois préc.</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
