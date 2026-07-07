"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { mockClients } from "@/data/clients";

export default function ClientsPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      mockClients.filter((c) =>
        `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <div>
      <PageHeader title="Clients" subtitle="Suivez la fidélité de vos clients en un coup d'œil" />
      <div className="px-8 pb-10">
        <div className="mb-4 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}>
          <Search size={15} style={{ color: "var(--text-faint)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
            style={{ color: "var(--text)" }}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ background: "var(--panel-soft)" }}>
                {["Client", "Téléphone", "Tampons", "Points", "Inscrit le", "Dernière visite"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t transition-colors hover:bg-[var(--panel-soft)]" style={{ borderColor: "var(--border)" }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
                      >
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-medium" style={{ color: "var(--text)" }}>{c.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-faint)" }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-dim)" }}>{c.phone}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-dim)" }}>{c.stamps}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-dim)" }}>{c.points}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-dim)" }}>{c.joined}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-dim)" }}>{c.lastVisit}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-faint)" }}>
                    Aucun client trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
