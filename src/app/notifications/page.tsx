"use client";

import { useState } from "react";
import { Gift, UserPlus, Stamp, Megaphone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const initial = [
  { id: 1, icon: Gift, text: "Sofia Rossi a échangé sa récompense « 1 café offert »", time: "Il y a 10 min", read: false },
  { id: 2, icon: UserPlus, text: "Lucie Petit a rejoint votre carte de fidélité", time: "Il y a 1 h", read: false },
  { id: 3, icon: Stamp, text: "Karim Benali a reçu un nouveau tampon", time: "Il y a 4 h", read: true },
  { id: 4, icon: Megaphone, text: "Votre carte « Coffee House » a été publiée avec succès", time: "Hier", read: true },
];

export default function NotificationsPage() {
  const [items, setItems] = useState(initial);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Restez informé de l'activité de vos clients" />
      <div className="px-8 pb-10">
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors hover:bg-[var(--panel-soft)]"
                style={{
                  borderColor: "var(--border)",
                  background: n.read ? "var(--panel)" : "var(--panel-soft)",
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm" style={{ color: "var(--text)" }}>
                    {n.text}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--text-faint)" }}>
                    {n.time}
                  </span>
                </span>
                {!n.read && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent-1)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
