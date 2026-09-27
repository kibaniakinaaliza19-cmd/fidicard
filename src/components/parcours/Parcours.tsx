"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import type { CardDoc } from "@/types/layer";
import type { LoyaltyConfig } from "@/lib/loyalty";
import BarreProgression from "./BarreProgression";
import EtapeAccueil from "./EtapeAccueil";
import EtapeConversation from "./EtapeConversation";
import EtapeGeneration from "./EtapeGeneration";
import { integrerImagesReelles } from "./images";
import { ETAPES, type NomEtape } from "./types";

type FidiiaSession = Record<string, unknown> | null;

interface ReponseServeur {
  reply: string;
  carte: CardDoc | null;
  config: Partial<LoyaltyConfig> | null;
  session: FidiiaSession;
}

function etatDe(session: FidiiaSession): Record<string, unknown> {
  return (session as { etat?: Record<string, unknown> } | null)?.etat ?? {};
}

/**
 * Le cran le plus avancé jamais atteint pour cette session, jamais un cran
 * en arrière : le moteur ne suit pas un ordre fixe (identity.ts), la même
 * question peut revenir sous un angle différent une fois qu'on croit
 * l'avoir dépassée — la barre ne doit jamais donner l'impression de reculer
 * pour autant.
 */
function candidatDepuisEtat(etat: Record<string, unknown>): NomEtape {
  if (!etat.secteur || !etat.nomCommerce) return "commerce";
  if (!etat.ambiance) return "identite";
  if (!etat.systemeFidelite || etat.objectif === undefined || !etat.recompense) return "fidelite";
  return "fidelite";
}

const ORDRE = ETAPES.map((e) => e.id);

export default function Parcours() {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const setConfig = useLoyaltyStore((s) => s.setConfig);

  const [demarre, setDemarre] = useState(false);
  const [etape, setEtape] = useState<NomEtape>("accueil");
  const [aiLive, setAiLive] = useState<boolean | null>(null);
  const [derniereReponse, setDerniereReponse] = useState("");
  const [carteCreee, setCarteCreee] = useState(false);

  const session = useRef<FidiiaSession>(null);
  const logoReel = useRef<string | null>(null);
  const photoReelle = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => setAiLive(Boolean(d.available)))
      .catch(() => setAiLive(false));
  }, []);

  const avancer = useCallback((candidat: NomEtape) => {
    setEtape((actuel) => (ORDRE.indexOf(candidat) > ORDRE.indexOf(actuel) ? candidat : actuel));
  }, []);

  const envoyer = useCallback(
    async (message: string, image?: string, imageRole?: "logo" | "photo", silencieux = false): Promise<ReponseServeur | null> => {
      try {
        const r = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, session: session.current, image, imageRole, silencieux }),
        });
        const data = await r.json();
        if (!r.ok) return null;
        session.current = data.session ?? null;
        avancer(candidatDepuisEtat(etatDe(session.current)));
        if (data.carte) {
          const carte = integrerImagesReelles(data.carte as CardDoc, logoReel.current, photoReelle.current);
          applyTemplate(carte);
          if (data.config) setConfig(data.config as Partial<LoyaltyConfig>);
          setCarteCreee(true);
          avancer("carte");
        }
        return { reply: data.reply ?? "", carte: data.carte ?? null, config: data.config ?? null, session: session.current };
      } catch {
        return null;
      }
    },
    [applyTemplate, setConfig, avancer],
  );

  async function demarrer() {
    setDemarre(true);
    avancer("commerce");
    const r = await envoyer("Bonjour, je veux créer ma carte de fidélité.");
    if (r?.reply) setDerniereReponse(r.reply);
  }

  async function onEnvoyerConversation(texte: string) {
    const r = await envoyer(texte);
    if (!r) return null;
    const etat = etatDe(r.session);
    return { reply: r.reply, carte: r.carte, creationAutorisee: Boolean(etat.creationAutorisee) };
  }

  return (
    <div className="mx-auto flex h-full max-w-[420px] flex-col">
      {demarre && !carteCreee && <BarreProgression etape={etape} />}

      {!demarre && <EtapeAccueil onSuivant={demarrer} />}

      {demarre && !carteCreee && (
        <EtapeConversation
          premiereReponse={derniereReponse}
          aiLive={aiLive}
          onEnvoyer={onEnvoyerConversation}
          onCreationPossible={() => setCarteCreee(true)}
        />
      )}

      {carteCreee && <EtapeGeneration onSuivant={() => avancer("personnalisation")} />}
    </div>
  );
}
