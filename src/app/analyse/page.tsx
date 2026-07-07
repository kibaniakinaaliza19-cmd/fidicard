import { Users, Stamp, TrendingUp, Repeat } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatTile from "@/components/ui/StatTile";

const weekly = [
  { day: "Lun", value: 42 },
  { day: "Mar", value: 58 },
  { day: "Mer", value: 51 },
  { day: "Jeu", value: 74 },
  { day: "Ven", value: 90 },
  { day: "Sam", value: 112 },
  { day: "Dim", value: 68 },
];

const max = Math.max(...weekly.map((w) => w.value));

export default function AnalysePage() {
  return (
    <div>
      <PageHeader title="Analyse" subtitle="Suivez la performance de votre programme de fidélité" />
      <div className="px-8 pb-10">
        <div className="grid grid-cols-4 gap-4">
          <StatTile label="Nouveaux clients" value="38" delta="+14%" icon={Users} />
          <StatTile label="Tampons / semaine" value="495" delta="+6%" icon={Stamp} />
          <StatTile label="Taux de retour" value="64%" delta="+2.3%" icon={Repeat} />
          <StatTile label="Croissance mensuelle" value="18%" delta="+4.1%" icon={TrendingUp} />
        </div>

        <div className="mt-6 rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <h2 className="mb-6 text-sm font-semibold" style={{ color: "var(--text)" }}>
            Visites cette semaine
          </h2>
          <div className="flex h-48 items-end gap-4">
            {weekly.map((w) => (
              <div key={w.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${(w.value / max) * 100}%`,
                    background: "linear-gradient(180deg, var(--accent-1), var(--accent-2))",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  {w.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
