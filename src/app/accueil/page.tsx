import Link from "next/link";
import { Users, CreditCard, Stamp, Gift, ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatTile from "@/components/ui/StatTile";
import { mockClients } from "@/data/clients";

const activity = [
  { text: "Sofia Rossi a obtenu son 10ème tampon", time: "Il y a 12 min" },
  { text: "Nouvelle cliente inscrite : Lucie Petit", time: "Il y a 1 h" },
  { text: "Karim Benali a échangé une récompense", time: "Il y a 3 h" },
  { text: "Carte « Coffee House » publiée", time: "Hier" },
];

export default function AccueilPage() {
  return (
    <div>
      <PageHeader title="Accueil" subtitle="Vue d'ensemble de votre programme de fidélité" />
      <div className="px-8 pb-10">
        <div className="grid grid-cols-4 gap-4">
          <StatTile label="Clients totaux" value={String(mockClients.length * 38)} delta="+8.2%" icon={Users} />
          <StatTile label="Cartes actives" value="212" delta="+3.1%" icon={CreditCard} />
          <StatTile label="Tampons distribués" value="1 840" delta="+12%" icon={Stamp} />
          <StatTile label="Récompenses échangées" value="96" delta="-1.4%" icon={Gift} positive={false} />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div
            className="col-span-2 rounded-2xl border p-6"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Activité récente
              </h2>
            </div>
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between border-b pb-3 text-sm" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--text)" }}>{a.text}</span>
                  <span className="shrink-0 text-xs" style={{ color: "var(--text-faint)" }}>
                    {a.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="flex flex-col justify-between overflow-hidden rounded-2xl border p-6"
            style={{
              borderColor: "var(--border-strong)",
              background: "linear-gradient(150deg, rgba(224,52,44,0.25), var(--panel))",
            }}
          >
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Continuez la personnalisation
              </h2>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                Ouvrez l&rsquo;éditeur pour ajuster les couleurs, le système de fidélité et publier
                votre carte.
              </p>
            </div>
            <Link
              href="/carte"
              className="mt-6 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
            >
              Ouvrir l&rsquo;éditeur
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
