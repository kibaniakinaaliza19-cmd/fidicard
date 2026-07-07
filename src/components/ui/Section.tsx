"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  highlighted?: boolean;
}

const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ title, icon: Icon, open, onToggle, children, highlighted }, ref) => {
    return (
      <div
        ref={ref}
        className="overflow-hidden rounded-2xl border transition-colors duration-300"
        style={{
          borderColor: highlighted ? "var(--accent-1)" : "var(--border)",
          background: "var(--panel-soft)",
          boxShadow: highlighted ? "0 0 0 1px var(--accent-1), 0 0 24px -6px var(--accent-glow)" : "none",
        }}
      >
        <button
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5"
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            {Icon && <Icon size={14} className="text-[var(--accent-1)]" />}
            {title}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} style={{ color: "var(--text-faint)" }} />
          </motion.span>
        </button>
        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="space-y-3 px-4 pb-4">{children}</div>
        </motion.div>
      </div>
    );
  }
);

Section.displayName = "Section";
export default Section;
