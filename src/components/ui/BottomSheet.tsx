"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Feuille basse.
 *
 * Sur téléphone, une fenêtre centrée oblige le pouce à remonter au milieu de
 * l'écran et laisse le contenu flotter sans attache. Une feuille qui monte
 * depuis le bas arrive là où la main se trouve déjà, et garde le contexte
 * visible derrière elle.
 *
 * Sur grand écran, le même composant se recentre : c'est là que la fenêtre
 * classique redevient la bonne forme.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panneau = useRef<HTMLDivElement>(null);

  // Échap ferme, et le défilement de la page derrière est bloqué : sans ça,
  // le doigt fait glisser le fond au lieu du contenu de la feuille.
  useEffect(() => {
    if (!open) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", surTouche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = avant;
    };
  }, [open, onClose]);

  // Le focus entre dans la feuille à l'ouverture : sinon le clavier reste
  // derrière, sur une page qu'on ne voit plus.
  useEffect(() => {
    if (open) panneau.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: "var(--z-modal)" }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: "var(--overlay)", backdropFilter: "blur(2px)" }}
          />

          <motion.div
            ref={panneau}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto outline-none sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2"
            style={{
              background: "var(--surface-3)",
              borderTop: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + var(--space-4))",
              boxShadow: "var(--shadow-2)",
            }}
          >
            {/* Poignée : elle dit « ça se tire », avant même qu'on essaie. */}
            <div className="flex justify-center pb-1 pt-3">
              <span
                className="h-1 w-9 rounded-full"
                style={{ background: "var(--text-faint)" }}
                aria-hidden
              />
            </div>

            <p
              className="px-5 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-faint)" }}
            >
              {title}
            </p>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
