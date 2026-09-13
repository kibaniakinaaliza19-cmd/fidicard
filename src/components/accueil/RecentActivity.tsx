"use client";

import Link from "next/link";
import { Stamp, Gift, ScanLine, UserPlus, ChevronRight } from "lucide-react";
import { recentActivity, type ActivityKind } from "@/data/activity";

const ICONE: Record<ActivityKind, typeof Stamp> = {
  stamp: Stamp,
  reward: Gift,
  scan: ScanLine,
  signup: UserPlus,
};

/** Au-delà d'un quart d'heure, ce n'est plus « en direct », c'est de l'historique. */
const SEUIL_DIRECT = 15;

/**
 * Activité en temps réel.
 *
 * Le point qui pulse n'est pas une décoration : il ne s'allume que sur les
 * événements de moins d'un quart d'heure. Un indicateur « live » allumé en
 * permanence ne veut plus rien dire, et le commerçant cesse de le regarder au
 * bout d'une journée.
 */
export default function RecentActivity() {
  const enDirect = recentActivity.some((a) => a.minutes <= SEUIL_DIRECT);

  return (
    <section
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-dim)" }}
        >
          {enDirect && (
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: "var(--success)" }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--success)" }}
              />
            </span>
          )}
          Activité en temps réel
        </h2>
        <Link
          href="/clients"
          className="flex items-center gap-0.5 text-xs font-medium"
          style={{ color: "var(--accent)" }}
        >
          Voir tout
          <ChevronRight size={13} strokeWidth={2.2} />
        </Link>
      </div>

      <ul className="-mx-1.5">
        {recentActivity.map((item, i) => {
          const Icone = ICONE[item.kind];
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 px-1.5 py-2.5"
              style={{
                // Séparateur entre les lignes, jamais après la dernière : un
                // trait qui pend sous le dernier élément trahit la boucle.
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span
                className="grid shrink-0 place-items-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent-tint)",
                  color: "var(--accent)",
                }}
              >
                <Icone size={17} strokeWidth={1.9} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm" style={{ color: "var(--text)" }}>
                  <span className="font-semibold">{item.name}</span> {item.action}
                </span>
                <span className="mt-0.5 block text-xs" style={{ color: "var(--text-faint)" }}>
                  {item.initials} · carte de fidélité
                </span>
              </span>

              <span
                className="shrink-0 whitespace-nowrap text-xs"
                style={{ color: "var(--text-faint)" }}
              >
                {item.time}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
