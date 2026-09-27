"use client";

import { useCallback, useRef, useState } from "react";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import type { CardDoc } from "@/types/layer";
import type { LoyaltyConfig } from "@/lib/loyalty";
import BarreProgression from "./BarreProgression";
import EtapeAccueil from "./EtapeAccueil";
import EtapeCommerce from "./EtapeCommerce";
import EtapeImages from "./EtapeImages";
import EtapeCouleurs from "./EtapeCouleurs";
import EtapeConversation from "./EtapeConversation";
import EtapeGeneration from "./EtapeGeneration";
import EtapeActivation from "./EtapeActivation";
import { integrerImagesReelles } from "./images";
import { BROUILLON_VIDE, type BrouillonCommerce, type NomEtape } from "./types";

/** Blob de session `lib/fidiia`, opaque ici — comme dans AssistantChat.tsx. */
type FidiiaSession = Record<string, unknown> | null;

interface ReponseServeur {
  reply: string;
  carte: CardDoc | null;
  config: Partial<LoyaltyConfig> | null;
  session: FidiiaSession;
}

function etatCreationAutorisee(session: FidiiaSession): boolean {
  const etat = (session as { etat?: { creationAutorisee?: boolean } } | null)?.etat;
  return Boolean(etat?.creationAutorisee);
}

function couleursAnalyseImage(session: FidiiaSession): string[] {
  const analyse = (session as { etat?: { analyseImage?: { couleurs?: string[] } } } | null)?.etat?.analyseImage;
  return analyse?.couleurs ?? [];
}

export default function Parcours() {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const setConfig = useLoyaltyStore((s) => s.setConfig);

  const [etape, setEtape] = useState<NomEtape>("accueil");
  const [brouillon, setBrouillon] = useState<BrouillonCommerce>(BROUILLON_VIDE);
  const [coloreesParImage, setColoreesParImage] = useState(false);
  const [derniereReponse, setDerniereReponse] = useState("");
  const [chargement, setChargement] = useState(false);

  const session = useRef<FidiiaSession>(null);
  // Les vrais fichiers, jamais renvoyés par le serveur (lui ne connaît que
  // leur analyse de couleurs) — c'est ce qui referme la boucle sur la carte
  // reçue, exactement comme dans AssistantChat.tsx.
  const logoReel = useRef<string | null>(null);
  const photoReelle = useRef<string | null>(null);

  /**
   * Point d'appel unique vers le moteur. Toutes les étapes y passent, qu'un
   * message soit affiché au commerçant (étape 5) ou resté silencieux
   * (étapes 2 à 4, qui traduisent un formulaire en une phrase avant de
   * l'envoyer) — c'est la même conversation `lib/fidiia`, jamais deux.
   */
  const envoyer = useCallback(
    async (
      message: string,
      image?: string,
      imageRole?: "logo" | "photo",
      /** true pour les messages des étapes 2 à 4 : ils pré-remplissent
       *  l'état mais ne doivent pas consommer le budget de tours réservé à
       *  la vraie conversation de l'étape 5 (voir lib/fidiia/index.ts). */
      silencieux = false,
    ): Promise<ReponseServeur | null> => {
      try {
        const r = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, session: session.current, image, imageRole, silencieux }),
        });
        const data = await r.json();
        if (!r.ok) return null;
        session.current = data.session ?? null;
        if (data.carte) {
          const carte = integrerImagesReelles(data.carte as CardDoc, logoReel.current, photoReelle.current);
          applyTemplate(carte);
          if (data.config) setConfig(data.config as Partial<LoyaltyConfig>);
        }
        return { reply: data.reply ?? "", carte: data.carte ?? null, config: data.config ?? null, session: session.current };
      } catch {
        return null;
      }
    },
    [applyTemplate, setConfig],
  );

  async function surSuivantCommerce(patch: Pick<BrouillonCommerce, "nom" | "secteur" | "prenom" | "contact">) {
    setChargement(true);
    setBrouillon((prev) => ({ ...prev, ...patch }));

    const parties = [`Mon commerce s'appelle ${patch.nom}. Mon activité : ${patch.secteur}.`];
    if (patch.prenom) parties.push(`Je m'appelle ${patch.prenom}.`);
    if (patch.contact) parties.push(`Vous pouvez me joindre au ${patch.contact}.`);
    const r = await envoyer(parties.join(" "), undefined, undefined, true);
    if (r?.reply) setDerniereReponse(r.reply);

    setChargement(false);
    setEtape("images");
  }

  async function surEnvoyerImage(cle: "logo" | "photoInterieure" | "photoExterieure", dataUrl: string) {
    const imageRole: "logo" | "photo" = cle === "logo" ? "logo" : "photo";
    if (cle === "logo") logoReel.current = dataUrl;
    // La photo intérieure l'emporte sur l'extérieure si les deux sont
    // fournies : c'est elle qui se pose sur la carte (voir images.ts). Les
    // deux sont analysées pour leurs couleurs, une seule est gardée en image.
    if (cle === "photoInterieure") photoReelle.current = dataUrl;
    if (cle === "photoExterieure" && !photoReelle.current) photoReelle.current = dataUrl;

    const phrase =
      cle === "logo"
        ? "Voici mon logo."
        : cle === "photoInterieure"
          ? "Voici une photo de l'intérieur de mon commerce."
          : "Voici une photo de la devanture de mon commerce.";
    const r = await envoyer(phrase, dataUrl, imageRole, true);
    if (r?.reply) setDerniereReponse(r.reply);
  }

  function surSuivantImages(patch: Pick<BrouillonCommerce, "logo" | "photoInterieure" | "photoExterieure">) {
    setBrouillon((prev) => ({ ...prev, ...patch }));
    const proposees = couleursAnalyseImage(session.current);
    if (proposees.length >= 2) {
      setBrouillon((prev) => ({
        ...prev,
        couleurs: { accent: proposees[0], fond: proposees[1], texte: proposees[2] ?? "#ffffff" },
      }));
      setColoreesParImage(true);
    }
    setEtape("couleurs");
  }

  async function surSuivantCouleurs(couleurs: BrouillonCommerce["couleurs"]) {
    setChargement(true);
    setBrouillon((prev) => ({ ...prev, couleurs }));
    const r = await envoyer(`Mes couleurs : accent ${couleurs.accent}, fond ${couleurs.fond}, texte ${couleurs.texte}.`, undefined, undefined, true);
    if (r?.reply) setDerniereReponse(r.reply);
    setChargement(false);
    setEtape("conversation");
  }

  async function onEnvoyerConversation(texte: string) {
    const r = await envoyer(texte);
    if (!r) return null;
    return { reply: r.reply, carte: r.carte, creationAutorisee: etatCreationAutorisee(r.session) };
  }

  return (
    <div className="mx-auto flex h-full max-w-[420px] flex-col">
      {etape !== "accueil" && etape !== "activation" && <BarreProgression etape={etape} />}

      {etape === "accueil" && <EtapeAccueil onSuivant={() => setEtape("commerce")} />}

      {etape === "commerce" && (
        <EtapeCommerce valeur={brouillon} onSuivant={surSuivantCommerce} />
      )}

      {etape === "images" && (
        <EtapeImages
          valeur={brouillon}
          onEnvoyerImage={surEnvoyerImage}
          onSuivant={surSuivantImages}
          onPasser={() => setEtape("couleurs")}
        />
      )}

      {etape === "couleurs" && (
        <EtapeCouleurs
          valeur={brouillon.couleurs}
          proposeesParImage={coloreesParImage}
          onSuivant={surSuivantCouleurs}
          onPasser={() => setEtape("conversation")}
        />
      )}

      {etape === "conversation" && (
        <EtapeConversation
          premiereReponse={derniereReponse}
          onEnvoyer={onEnvoyerConversation}
          onCreationPossible={() => setEtape("generation")}
        />
      )}

      {etape === "generation" && <EtapeGeneration onSuivant={() => setEtape("activation")} />}

      {etape === "activation" && <EtapeActivation nomCommerce={brouillon.nom} />}

      {chargement && (
        <div
          className="pointer-events-none fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <div className="rounded-full px-4 py-2 text-[12px]" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
            Un instant…
          </div>
        </div>
      )}
    </div>
  );
}
