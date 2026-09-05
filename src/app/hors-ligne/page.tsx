import Link from "next/link";
import { WifiOff, Users, CreditCard, ScanLine } from "lucide-react";

export const metadata = { title: "Hors ligne · FidiCard" };

/**
 * Page servie par le service worker quand une navigation échoue.
 *
 * Elle dit ce qui reste utilisable, pas seulement ce qui ne marche plus :
 * un commerçant hors réseau a besoin de savoir s'il peut continuer à
 * travailler ou s'il doit s'arrêter.
 */
export default function HorsLignePage() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="grid h-16 w-16 place-items-center rounded-2xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <WifiOff size={28} style={{ color: "var(--text-dim)" }} />
      </div>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Pas de connexion
        </h1>
        <p className="mt-2 max-w-sm" style={{ color: "var(--text-dim)" }}>
          FidiCard fonctionne en partie sans réseau. Voici ce qui reste
          disponible.
        </p>
      </div>

      <ul className="w-full max-w-sm space-y-2 text-left">
        {[
          { icon: Users, texte: "La liste de vos clients, telle qu'à la dernière connexion" },
          { icon: CreditCard, texte: "Vos cartes et vos modèles" },
        ].map(({ icon: Icone, texte }) => (
          <li
            key={texte}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <Icone size={18} style={{ color: "var(--accent-1)" }} />
            <span className="text-sm" style={{ color: "var(--text)" }}>
              {texte}
            </span>
          </li>
        ))}
        <li
          className="flex items-start gap-3 rounded-xl p-3"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          <ScanLine size={18} className="mt-0.5" style={{ color: "var(--text-dim)" }} />
          <span className="text-sm" style={{ color: "var(--text-dim)" }}>
            <strong style={{ color: "var(--text)" }}>Le scan est indisponible.</strong> Les
            compteurs de fidélité ne sont jamais gardés en mémoire : mieux vaut
            ne rien afficher qu&apos;un total faux.
          </span>
        </li>
      </ul>

      <Link
        href="/accueil"
        className="flex h-12 items-center rounded-xl px-6 font-semibold text-white"
        style={{ background: "var(--accent-1)" }}
      >
        Réessayer
      </Link>
    </div>
  );
}
