"use client";

import { Sparkles } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";

/**
 * La carte est déjà construite quand cet écran s'affiche (le moteur l'a
 * produite pendant le dernier tour de la conversation) : cet écran ne
 * génère rien, il montre le résultat dans le conteneur carte du parcours
 * (360px, coins 22px — voir Parcours.tsx).
 */
export default function EtapeGeneration({ onSuivant }: { onSuivant: () => void }) {
  const card = useCardStore((s) => s.card);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
        style={{ background: "var(--success-soft, rgba(34,197,94,0.15))", color: "var(--success, #22c55e)" }}
      >
        <Sparkles size={12} /> Votre carte est prête
      </span>
      <div className="w-full max-w-[360px] overflow-hidden rounded-[22px] shadow-lg">
        <MiniCard doc={card} width={360} />
      </div>
      <button onClick={onSuivant} className="btn btn-primary mt-6 w-full max-w-[280px]">
        Continuer
      </button>
    </div>
  );
}
