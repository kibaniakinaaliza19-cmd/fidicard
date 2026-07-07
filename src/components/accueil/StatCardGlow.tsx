"use client";

import { motion } from "framer-motion";
import { ArrowUp, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";

interface StatCardGlowProps {
  label: string;
  value: number;
  delta: string;
  icon: LucideIcon;
  color: string;
}

export default function StatCardGlow({ label, value, delta, icon: Icon, color }: StatCardGlowProps) {
  const count = useCountUp(value);

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: `0 16px 32px -12px ${color}55` }}
      className="rounded-2xl border p-5"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `${color}22`, color }}
      >
        <Icon size={16} />
      </span>
      <p className="mt-4 text-2xl font-bold" style={{ color: "var(--text)" }}>
        {count.toLocaleString("fr-FR")}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
      <span className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: "#4ade80" }}>
        <ArrowUp size={11} />
        {delta} vs mois précédent
      </span>
    </motion.div>
  );
}
