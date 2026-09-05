"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Search, Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { mockClients, type Client } from "@/data/clients";
import { localClientsSnapshot, localClientsServerSnapshot, subscribeLocalClients } from "@/lib/localClients";

interface Row extends Client {
  isNew?: boolean;
}

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const local = useSyncExternalStore(subscribeLocalClients, localClientsSnapshot, localClientsServerSnapshot);

  const signups: Row[] = useMemo(
    () =>
      local.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
        stamps: 0,
        points: 0,
        joined: "Aujourd'hui",
        lastVisit: "Inscription QR",
        isNew: true,
      })),
    [local]
  );

  const allClients: Row[] = useMemo(() => [...signups, ...mockClients], [signups]);

  const filtered = useMemo(
    () => allClients.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase())),
    [allClients, query]
  );

  return (
    <div>
      <PageHeader title="Clients" subtitle="Suivez la fidélité de vos clients en un coup d'œil" />
      <div className="px-8 pb-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-strong)", background: "var(--panel)" }}>
            <Search size={15} style={{ color: "var(--text-faint)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
              style={{ color: "var(--text)" }}
            />
          </div>
          <span className="shrink-0 rounded-xl border px-4 py-2.5 text-sm" style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}>
            <span className="font-semibold" style={{ color: "var(--text)" }}>{allClients.length}</span> clients
          </span>
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
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 font-medium" style={{ color: "var(--text)" }}>
                          {c.name || "Sans nom"}
                          {c.isNew && (
                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(76,175,125,0.15)", color: "#4CAF7D" }}>
                              <Sparkles size={9} /> Nouveau · Carte active
                            </span>
                          )}
                        </p>
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
