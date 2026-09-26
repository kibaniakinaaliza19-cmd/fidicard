"use client";

import OrbeIA from "@/components/aiDesigner/OrbeIA";

export default function EtapeAccueil({ onSuivant }: { onSuivant: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <OrbeIA taille={104} />
      <h1 className="mt-5 text-xl font-semibold" style={{ color: "var(--text)" }}>
        Créons votre carte ensemble
      </h1>
      <p className="mt-2 max-w-[280px] text-[13px]" style={{ color: "var(--text-dim)" }}>
        Quelques écrans rapides, et votre carte de fidélité est prête — vous pourrez tout ajuster ensuite.
      </p>
      <button onClick={onSuivant} className="btn btn-primary mt-6 w-full max-w-[280px]">
        Commencer
      </button>
    </div>
  );
}
