"use client";

import Link from "next/link";
import { Monitor, Eye, ArrowLeft } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";

/**
 * Ce que l'éditeur affiche sous 1024 px.
 *
 * L'éditeur avancé fait cohabiter trois panneaux et un canevas manipulable au
 * pixel. Sur un écran de téléphone, ils se réduisent à des colonnes de deux
 * centimètres et le canevas sort de l'écran : l'interface est présente mais
 * inutilisable, ce qui est pire qu'absente — on croit pouvoir travailler.
 *
 * On montre donc ce qui a du sens ici : la carte telle qu'elle est, et une
 * phrase qui dit où faire le reste.
 */
export default function EditeurMobile() {
  const card = useCardStore((s) => s.card);

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center gap-6 px-5 py-8"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex w-full items-center">
        <Link
          href="/carte"
          className="flex h-11 items-center gap-2 rounded-xl pr-3 text-sm font-medium"
          style={{ color: "var(--text-dim)" }}
        >
          <ArrowLeft size={18} /> Ma carte
        </Link>
      </div>

      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-dim)" }}>
        <Eye size={16} /> Aperçu de votre carte
      </div>

      {/* La carte reste consultable : c'est ce qu'on vient vérifier sur son
          téléphone entre deux clients. */}
      <div className="w-full max-w-[320px]">
        <MiniCard doc={card} width={320} />
      </div>

      <div
        className="w-full max-w-md rounded-2xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: "var(--accent-glow)" }}
          >
            <Monitor size={18} style={{ color: "var(--accent-1)" }} />
          </span>
          <div>
            <p className="font-semibold" style={{ color: "var(--text)" }}>
              L&apos;édition détaillée se fait sur ordinateur
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
              Déplacer un calque au pixel près demande de la place. Ouvrez
              FidiCard sur un ordinateur pour composer, revenez ici pour
              vérifier et pour scanner.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        <Link
          href="/carte"
          className="flex h-12 items-center justify-center rounded-xl font-semibold text-white"
          style={{ background: "var(--accent-1)" }}
        >
          Réglages simples de la carte
        </Link>
        <Link
          href="/scanner/camera"
          className="flex h-12 items-center justify-center rounded-xl font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Scanner un client
        </Link>
      </div>
    </div>
  );
}
