"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

function ToastItem({ id, message }: { id: number; message: string }) {
  const dismissToast = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(id), 2800);
    return () => clearTimeout(timer);
  }, [id, dismissToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl"
      style={{
        background: "var(--panel-soft)",
        borderColor: "var(--border-strong)",
        color: "var(--text)",
      }}
    >
      <CheckCircle2 size={16} className="text-[var(--accent-1)]" />
      {message}
    </motion.div>
  );
}

export default function Toaster() {
  const toasts = useUIStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem id={t.id} message={t.message} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
