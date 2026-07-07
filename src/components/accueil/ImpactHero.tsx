"use client";

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useCountUp } from "@/lib/useCountUp";

export default function ImpactHero() {
  const clients = useCountUp(47);
  const revenue = useCountUp(2340);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}
    >
      <div
        className="glow-blob left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "var(--accent-1)" }}
      />
      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Impact FidiCard ce mois-ci
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--accent-1)", textShadow: "0 0 40px var(--accent-glow)" }}
          >
            {clients}
          </span>
          <span className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            clients sont revenus
          </span>
        </div>
        <p className="mt-2 text-base" style={{ color: "var(--text-dim)" }}>
          ≈ +{revenue.toLocaleString("fr-FR")} € de CA estimé
        </p>
        <span
          className="mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: "rgba(74, 222, 128, 0.15)", color: "#4ade80" }}
        >
          <ArrowUp size={11} />
          +12% vs mois précédent
        </span>
      </div>
    </motion.div>
  );
}
