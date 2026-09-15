"use client";

import { useState } from "react";
import { Eye, Rocket, Check } from "lucide-react";
import AssistantChat from "@/components/aiDesigner/AssistantChat";
import CardStage from "@/components/aiDesigner/CardStage";
import ImportCardModal from "@/components/cardEditor/importFlow/ImportCardModal";
import { useAutosaveCard } from "@/lib/useAutosaveCard";
import { useUIStore } from "@/store/uiStore";

const STEPS = ["Décrire mon activité", "Création IA", "Personnalisation", "Aperçu & Publication"];

export default function AiDesigner() {
  useAutosaveCard();
  const setWalletPreviewOpen = useUIStore((s) => s.setWalletPreviewOpen);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const [step, setStep] = useState(1);

  return (
    /* Sur téléphone, la page ne tenait pas : deux panneaux côte à côte, dont
     * un de 420 px fixes, dans une fenêtre de 390. La scène débordait à
     * droite, la conversation sortait entièrement de l'écran — et c'est
     * pourtant elle, désormais, qui fabrique la carte. La barre supérieure
     * passe donc en colonne, et les deux panneaux s'empilent : conversation
     * d'abord, aperçu en dessous. */
    <div className="flex h-full flex-col px-4 py-4 sm:px-6 sm:py-5">
      {/* barre supérieure */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-5">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Ma carte</h1>
          <div className="hidden items-center gap-1.5 lg:flex">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const active = n === step;
              const done = n < step;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: active || done ? "var(--accent-1)" : "var(--panel-soft)",
                      color: active || done ? "#fff" : "var(--text-faint)",
                    }}
                  >
                    {done ? <Check size={11} /> : n}
                  </span>
                  <span className="text-[11px]" style={{ color: active ? "var(--text)" : "var(--text-faint)" }}>{label}</span>
                  {i < STEPS.length - 1 && <span className="mx-1 h-px w-6" style={{ background: "var(--border)" }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWalletPreviewOpen(true)}
            className="btn btn-secondary flex-1 sm:flex-none"
          >
            <Eye size={15} /> Aperçu Wallet
          </button>
          <button
            onClick={() => { setStep(4); setPublishModalOpen(true); }}
            className="btn btn-primary flex-1 sm:flex-none"
          >
            <Rocket size={15} /> Enregistrer & Publier
          </button>
        </div>
      </div>

      {/* corps : conversation | scène carte */}
      {/* Empilé sous lg, côte à côte au-delà. La conversation vient en
          premier : c'est le seul moyen de modifier la carte. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
        {/* Hauteur explicite sur téléphone.
            La conversation se dimensionne avec flex-1 ; empilée dans une
            colonne de hauteur automatique, sa base valait zéro et le panneau
            se réduisait à un trait — la scène en dessous occupait tout
            l'écran, et il n'y avait plus rien à quoi parler. */}
        <div className="flex min-h-[70dvh] flex-col lg:min-h-0 lg:flex-1">
          <AssistantChat onStep={setStep} />
        </div>
        <CardStage />
      </div>

      {/* Le lien « éditeur avancé » est retiré : la carte se façonne par la
          conversation, pas à la main. */}
      <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-faint)" }}>
        FidiIA · FidiCard
      </p>

      <ImportCardModal />
    </div>
  );
}
