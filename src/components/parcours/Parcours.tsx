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
import EtapePersonnalisation from "./EtapePersonnalisation";
import EtapeActivation from "./EtapeActivation";
import { integrerImagesReelles } from "./images";
import { ETAPES, type NomEtape } from "./types";

type FidiiaSession = Record<string, unknown> | null;

/** Même vocabulaire que route.ts:codeErreur — un code stable, jamais le
 *  détail technique. "RESEAU" est ajouté ici : côté client, une requête qui
 *  échoue avant même d'atteindre le serveur (coupure, DNS…) n'a pas de code
 *  serveur à relayer. */
export type CodeErreur = "INDISPONIBLE" | "CREDITS_EPUISES" | "SATURE" | "SERVEUR" | "RESEAU";

/** Une phrase par code, jamais un message générique — partagée par tous les
 *  écrans qui parlent à FidiIA (EtapeConversation, EtapePersonnalisation). */
export const MESSAGES_ERREUR: Record<CodeErreur, string> = {
  INDISPONIBLE: "FidiIA est temporairement indisponible.",
  CREDITS_EPUISES: "FidiIA ne peut pas générer votre carte pour le moment.",
  SATURE: "Trop de demandes en ce moment — réessayez dans un instant.",
  SERVEUR: "Je n'ai pas pu répondre à l'instant. Réessayez.",
  RESEAU: "Connexion impossible — vérifiez votre réseau et réessayez.",
};

type ReponseEnvoi =
  | { ok: true; reply: string; carte: CardDoc | null; config: Partial<LoyaltyConfig> | null; session: FidiiaSession }
  | { ok: false; code: CodeErreur };

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
    async (message: string, image?: string, imageRole?: "logo" | "photo", silencieux = false): Promise<ReponseEnvoi> => {
      let r: Response;
      try {
        r = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, session: session.current, image, imageRole, silencieux }),
        });
      } catch {
        // La requête n'a même pas atteint le serveur : coupure réseau, pas
        // une réponse d'erreur à décoder.
        return { ok: false, code: "RESEAU" };
      }
      const data = await r.json().catch(() => null);
      if (!r.ok || !data) {
        const code: CodeErreur = data?.code ?? "SERVEUR";
        return { ok: false, code };
      }
      session.current = data.session ?? null;
      avancer(candidatDepuisEtat(etatDe(session.current)));
      if (data.carte) {
        const carte = integrerImagesReelles(data.carte as CardDoc, logoReel.current, photoReelle.current);
        applyTemplate(carte);
        if (data.config) setConfig(data.config as Partial<LoyaltyConfig>);
        setCarteCreee(true);
        avancer("carte");
      }
      return { ok: true, reply: data.reply ?? "", carte: data.carte ?? null, config: data.config ?? null, session: session.current };
    },
    [applyTemplate, setConfig, avancer],
  );

  async function demarrer() {
    setDemarre(true);
    avancer("commerce");
    const r = await envoyer("Bonjour, je veux créer ma carte de fidélité.");
    if (r.ok) setDerniereReponse(r.reply);
  }

  /**
   * Point d'appel de EtapeConversation. `image`/`imageRole` viennent des deux
   * boutons de dépôt ; `silencieux` reste false ici — c'est
   * EtapeConversation qui décide, décision 2 : un texte écrit ou une puce
   * cliquée comptent comme un tour, une photo seule ne compte pas.
   */
  async function onEnvoyerConversation(
    texte: string,
    image?: string,
    imageRole?: "logo" | "photo",
    silencieux?: boolean,
  ): Promise<{ ok: true; reply: string; carte: CardDoc | null; creationAutorisee: boolean } | { ok: false; code: CodeErreur }> {
    if (imageRole === "logo") logoReel.current = image ?? logoReel.current;
    if (imageRole === "photo") photoReelle.current = image ?? photoReelle.current;
    const r = await envoyer(texte, image, imageRole, silencieux);
    if (!r.ok) return r;
    const etat = etatDe(r.session);
    return { ok: true, reply: r.reply, carte: r.carte, creationAutorisee: Boolean(etat.creationAutorisee) };
  }

  /**
   * carteCreee ne distingue que "avant/après la première carte" ; une fois
   * vrai, il reste vrai pour toujours (Carte, Personnalisation, Activation
   * sont trois écrans différents dans cet état). C'est `etape` qui choisit
   * lequel des trois, puisque c'est déjà lui que EtapeGeneration.onSuivant
   * et EtapePersonnalisation.onSuivant font avancer.
   */
  const ecranApresCreation = etape === "activation" ? "activation" : etape === "personnalisation" ? "personnalisation" : "carte";

  return (
    <div className="mx-auto flex h-full max-w-[420px] flex-col">
      {demarre && <BarreProgression etape={etape} />}

      {!demarre && <EtapeAccueil onSuivant={demarrer} />}

      {demarre && !carteCreee && (
        <EtapeConversation
          premiereReponse={derniereReponse}
          aiLive={aiLive}
          onEnvoyer={onEnvoyerConversation}
          onCreationPossible={() => setCarteCreee(true)}
        />
      )}

      {carteCreee && ecranApresCreation === "carte" && (
        <EtapeGeneration onSuivant={() => avancer("personnalisation")} />
      )}

      {carteCreee && ecranApresCreation === "personnalisation" && (
        <EtapePersonnalisation
          aiLive={aiLive}
          onEnvoyer={onEnvoyerConversation}
          onSuivant={() => avancer("activation")}
        />
      )}

      {carteCreee && ecranApresCreation === "activation" && <EtapeActivation />}
    </div>
  );
}
