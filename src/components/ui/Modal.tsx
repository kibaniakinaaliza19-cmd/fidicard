"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, subtitle, children, wide }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-3xl border shadow-2xl ${
              wide ? "max-w-3xl" : "max-w-md"
            }`}
            style={{ background: "var(--panel)", borderColor: "var(--border-strong)" }}
          >
            <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-dim)" }}>
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--panel-soft)]"
              >
                <X size={18} style={{ color: "var(--text-dim)" }} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
