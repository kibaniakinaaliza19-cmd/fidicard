"use client";

import { useState } from "react";
import Link from "next/link";
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
    <div className="flex h-full flex-col px-6 py-5">
      {/* barre supérieure */}
      <div className="mb-5 flex items-center justify-between gap-4">
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
            className="flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <Eye size={15} /> Aperçu Wallet
          </button>
          <button
            onClick={() => { setStep(4); setPublishModalOpen(true); }}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            <Rocket size={15} /> Enregistrer & Publier
          </button>
        </div>
      </div>

      {/* corps : conversation | scène carte */}
      <div className="flex min-h-0 flex-1 gap-5">
        <AssistantChat onStep={setStep} />
        <CardStage />
      </div>

      <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-faint)" }}>
        FidiIA · FidiCard ·{" "}
        <Link href="/carte/editeur" className="underline hover:text-[var(--accent-1)]">éditeur avancé</Link>
      </p>

      <ImportCardModal />
    </div>
  );
}
