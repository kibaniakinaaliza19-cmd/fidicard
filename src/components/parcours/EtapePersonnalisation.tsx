"use client";

import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import EtapeConversation from "./EtapeConversation";
import type { CodeErreur } from "./Parcours";

type Resultat =
  | { ok: true; reply: string; carte: unknown; creationAutorisee: boolean }
  | { ok: false; code: CodeErreur };

/**
 * La carte existe déjà ; cet écran ne la crée plus, il la retouche.
 *
 * La conversation en dessous EST EtapeConversation — pas une seconde
 * interface à maintenir en double. `dejaCree` change une seule chose dans
 * son comportement : une réponse qui porte une carte est montrée comme une
 * mise à jour plutôt que traitée comme la naissance qui déclenche l'écran de
 * confirmation. Le store (useCardStore) est déjà à jour quand ce composant se
 * redessine — Parcours.envoyer() y applique `data.carte` avant même que la
 * réponse ne redescende ici — donc la carte affichée en haut change au même
 * rythme que la conversation, sans code de synchronisation supplémentaire.
 */
export default function EtapePersonnalisation({
  aiLive,
  onEnvoyer,
  onSuivant,
}: {
  aiLive: boolean | null;
  onEnvoyer: (texte: string, image?: string, imageRole?: "logo" | "photo", silencieux?: boolean) => Promise<Resultat>;
  onSuivant: () => void;
}) {
  const card = useCardStore((s) => s.card);

  return (
    // min-h-0 : sans lui, un enfant flex-1 refuse de rétrécir sous la
    // hauteur naturelle de son contenu (carte + conversation + bouton).
    // Le bloc entier débordait alors du cadre visible, et le bouton
    // « C'est parfait, continuer » se retrouvait sous la barre de
    // navigation fixe — cliquable nulle part, un test Playwright l'a
    // confirmé avant que quiconque ne le remarque à l'œil.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col items-center px-6 pb-3 pt-4">
        <div className="w-full max-w-[360px] overflow-hidden rounded-[22px] shadow-lg">
          <MiniCard doc={card} width={360} />
        </div>
      </div>

      {/* flex, pas un simple bloc : EtapeConversation porte elle-même
          "flex flex-1 flex-col", une classe qui n'a aucun effet hors d'un
          parent flex. Sans ça, elle s'affichait à sa hauteur de contenu
          plutôt que de se contraindre à l'espace restant — elle débordait
          et le bouton "C'est parfait, continuer" chevauchait son dernier
          message au lieu de s'afficher après. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <EtapeConversation
          premiereReponse="Votre carte est prête. Vous pouvez me demander n'importe quelle modification — le logo, les couleurs, la récompense, tout ce que vous voulez ajuster."
          aiLive={aiLive}
          onEnvoyer={onEnvoyer}
          onCreationPossible={() => {}}
          dejaCree
        />
      </div>

      <div className="px-4 pb-4">
        <button onClick={onSuivant} className="btn btn-primary w-full">
          C&apos;est parfait, continuer
        </button>
      </div>
    </div>
  );
}
