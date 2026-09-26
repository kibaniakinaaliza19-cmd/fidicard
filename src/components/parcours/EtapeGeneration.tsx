"use client";

import { Sparkles } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";

/**
 * La carte est déjà construite au moment où cet écran s'affiche — le moteur
 * (lib/fidiia) l'a produite pendant le dernier tour de l'étape 5, comme
 * toujours. Cet écran ne génère rien : il montre le résultat, pour que le
 * commerçant s'y arrête un instant avant d'enchaîner sur l'activation.
 */
export default function EtapeGeneration({ onSuivant }: { onSuivant: () => void }) {
  const card = useCardStore((s) => s.card);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
        style={{ background: "var(--success-soft, rgba(34,197,94,0.15))", color: "var(--success, #22c55e)" }}
      >
        <Sparkles size={12} /> Carte prête
      </span>
      <MiniCard doc={card} width={260} />
      <p className="mt-5 max-w-[280px] text-[13px]" style={{ color: "var(--text-dim)" }}>
        Votre carte de fidélité est prête. Vous pourrez toujours ajuster le texte, les couleurs ou la récompense.
      </p>
      <button onClick={onSuivant} className="btn btn-primary mt-6 w-full max-w-[280px]">
        Continuer
      </button>
    </div>
  );
}
