"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrbeIA from "@/components/aiDesigner/OrbeIA";

interface NotifAuto {
  id: string;
  emoji: string;
  titre: string;
  detail: string;
}

// Mêmes identifiants que src/data/notifications.ts (autoNotifs: "birthday",
// "google", "inactive") — pour que ces trois-là, une fois la vraie page
// Notifications branchée sur un compte, désignent la même chose qu'ici.
const NOTIFS: NotifAuto[] = [
  { id: "inactive", emoji: "⏰", titre: "Client inactif", detail: "Un message quand un client ne revient pas" },
  { id: "birthday", emoji: "🎂", titre: "Anniversaire", detail: "Un mot le jour J, avec ou sans petit geste" },
  { id: "google", emoji: "⭐", titre: "Avis Google", detail: "Une demande d'avis après la visite" },
];

export default function EtapeActivation({ nomCommerce }: { nomCommerce: string }) {
  const router = useRouter();
  const [actives, setActives] = useState<Record<string, boolean>>({ inactive: true, birthday: true, google: true });

  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <div className="flex items-center gap-3">
        <OrbeIA taille={40} />
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>FidiIA</p>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {nomCommerce ? `${nomCommerce} est prêt à fidéliser.` : "Votre carte est prête."}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Trois messages peuvent partir tout seuls, sans que vous y pensiez : un client qui ne revient plus reçoit une
        relance, un client fête son anniversaire, et un client qui vient de passer reçoit une demande d&apos;avis Google.
        Vous pouvez les couper à tout moment.
      </p>

      <div className="mt-4 space-y-2.5">
        {NOTIFS.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-3 rounded-2xl p-3"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <span className="text-lg">{n.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{n.titre}</p>
              <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{n.detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={actives[n.id]}
              onClick={() => setActives((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
              className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
              style={{ background: actives[n.id] ? "var(--accent)" : "var(--border-strong)" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                style={{ transform: actives[n.id] ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Honnête sur ce qui existe déjà : ces trois notifications ne partent
          pas réellement tant qu'aucun compte n'est créé — l'envoi programmé
          vit dans la vraie page Notifications, pas ici. */}
      <p className="mt-3 text-[11px]" style={{ color: "var(--text-faint)" }}>
        Elles s&apos;activeront dès que votre compte sera créé.
      </p>

      <div className="mt-auto pt-4">
        <button onClick={() => router.push("/reglages")} className="btn btn-primary w-full">
          Créer mon compte
        </button>
        <button onClick={() => router.push("/carte")} className="btn btn-secondary mt-2 w-full">
          Continuer sans compte
        </button>
      </div>
    </div>
  );
}
