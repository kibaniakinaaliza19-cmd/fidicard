"use client";

import { useState } from "react";
import { BellRing, Check, CreditCard } from "lucide-react";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ESSAI_JOURS_GRATUITS } from "@/lib/fidiia/validation/schemas.ts";

/**
 * Dernier écran du parcours : notifications, récapitulatif, compte, paiement.
 *
 * Le paiement n'est délibérément PAS branché ici (§10 du brief) : l'écran
 * "Paiement bientôt disponible" prend sa place, sans rien facturer et sans
 * prétendre qu'un moyen de paiement a été enregistré.
 */
export default function EtapeActivation() {
  const card = useCardStore((s) => s.card);
  const config = useLoyaltyStore((s) => s.config);

  const [notifsActivees, setNotifsActivees] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<"recap" | "compte" | "paiement">("recap");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [compteCree, setCompteCree] = useState(false);

  async function activerNotifications() {
    // Une vraie demande de permission, pas une case cochée pour la forme :
    // si le navigateur ne sait pas le faire (pas de fenêtre, API absente),
    // on le dit plutôt que de prétendre que c'est activé.
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifsActivees(false);
      return;
    }
    try {
      const reponse = await Notification.requestPermission();
      setNotifsActivees(reponse === "granted");
    } catch {
      setNotifsActivees(false);
    }
  }

  const recompense = config.paliers[config.paliers.length - 1]?.description || "votre récompense";
  const mecanique = config.mode === "points" ? `${config.totalStamps} points` : `${config.totalStamps} passages`;

  async function creerCompte() {
    setErreur(null);
    if (!email.trim() || motDePasse.length < 8) {
      setErreur("Une adresse email et un mot de passe d'au moins 8 caractères.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setErreur("La création de compte n'est pas encore configurée sur cet environnement.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password: motDePasse });
      if (error) {
        setErreur(error.message);
        return;
      }
      setCompteCree(true);
      setPhase("paiement");
    } catch {
      setErreur("La création de compte a échoué. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
      {phase === "recap" && (
        <div className="flex flex-1 flex-col items-center text-center">
          <span
            className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--accent-soft, rgba(255,90,31,0.15))", color: "var(--accent-1)" }}
          >
            <BellRing size={24} />
          </span>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Faites revenir vos clients
          </h2>
          <p className="mt-1 max-w-[280px] text-[13px]" style={{ color: "var(--text-dim)" }}>
            Activez les notifications pour prévenir vos clients quand une récompense approche.
          </p>

          <button
            onClick={activerNotifications}
            className="btn btn-primary mt-6 w-full max-w-[280px]"
            disabled={notifsActivees === true}
          >
            {notifsActivees === true ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={16} /> Notifications activées
              </span>
            ) : (
              "Activer les notifications"
            )}
          </button>
          {notifsActivees === false && (
            <p className="mt-2 text-[11px]" style={{ color: "var(--text-faint)" }}>
              Pas activées pour l&apos;instant — vous pourrez le faire plus tard dans les réglages.
            </p>
          )}

          <div
            className="mt-8 w-full max-w-[320px] rounded-2xl border p-4 text-left"
            style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>
              La carte « {card.name} » est prête : {mecanique} pour obtenir {recompense.toLowerCase()}.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>
              Essayez FidiCard {ESSAI_JOURS_GRATUITS} jours, sans engagement.
            </p>
          </div>

          <button onClick={() => setPhase("compte")} className="btn btn-primary mt-6 w-full max-w-[280px]">
            Activer ma carte
          </button>
        </div>
      )}

      {phase === "compte" && (
        <div className="flex flex-1 flex-col">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Créez votre compte
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-dim)" }}>
            Pour retrouver votre carte et vos clients à tout moment.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              autoComplete="email"
              className="champ"
            />
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe (8 caractères minimum)"
              autoComplete="new-password"
              className="champ"
            />
            {erreur && (
              <p className="text-[12px]" style={{ color: "var(--danger, #e5484d)" }}>
                {erreur}
              </p>
            )}
            <button onClick={creerCompte} disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
              {busy ? "Création…" : "Créer mon compte"}
            </button>
          </div>
        </div>
      )}

      {phase === "paiement" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--accent-soft, rgba(255,90,31,0.15))", color: "var(--accent-1)" }}
          >
            <CreditCard size={24} />
          </span>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Paiement bientôt disponible
          </h2>
          <p className="mt-1 max-w-[280px] text-[13px]" style={{ color: "var(--text-dim)" }}>
            {compteCree ? "Votre compte est créé. " : ""}
            Votre essai de {ESSAI_JOURS_GRATUITS} jours démarre dès maintenant — aucun moyen de paiement
            n&apos;est requis pour l&apos;instant.
          </p>
        </div>
      )}
    </div>
  );
}
