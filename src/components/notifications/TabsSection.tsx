"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { autoNotifs, templateCards, scheduled } from "@/data/notifications";
import { useUIStore } from "@/store/uiStore";

const tabs = ["Notifications automatiques", "Modèles proposés", "Mes notifications", "Programmées", "Brouillons"];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors"
      style={{ background: on ? "var(--accent-1)" : "var(--border-strong)" }}
    >
      <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

function TemplateGrid({ onAction }: { onAction: (title: string, action: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {templateCards.map((t) => (
        <div key={t.id} className="flex flex-col items-center rounded-xl border p-4 text-center transition-colors hover:border-[var(--border-strong)]" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
          <span className="text-2xl">{t.emoji}</span>
          <p className="mt-2 text-xs font-medium leading-tight" style={{ color: "var(--text)" }}>{t.title}</p>
          <p className="mt-1 text-[10px] font-semibold" style={{ color: "#32d583" }}>{t.perf}</p>
          <button
            onClick={() => onAction(t.title, t.action)}
            className="mt-3 w-full cursor-pointer rounded-lg py-1.5 text-[11px] font-semibold transition-transform hover:scale-[1.03]"
            style={
              t.action === "Activer"
                ? { background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", color: "#fff" }
                : { border: "1px solid var(--border-strong)", color: "var(--text)" }
            }
          >
            {t.action}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function TabsSection() {
  const [tab, setTab] = useState(tabs[0]);
  const [toggles, setToggles] = useState(() => Object.fromEntries(autoNotifs.map((n) => [n.id, n.enabled])));
  const pushToast = useUIStore((s) => s.pushToast);

  function toggle(id: string, title: string) {
    setToggles((t) => {
      const next = !t[id];
      pushToast(`${title} : ${next ? "activé" : "désactivé"}`);
      return { ...t, [id]: next };
    });
  }

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative whitespace-nowrap pb-3 text-xs font-semibold transition-colors"
            style={{ color: tab === t ? "var(--accent-1)" : "var(--text-faint)" }}
          >
            {t}
            {tab === t && (
              <motion.span layoutId="notif-tab" className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, var(--accent-1), var(--accent-2))" }} />
            )}
          </button>
        ))}
      </div>

      {tab === "Notifications automatiques" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-1">
            {autoNotifs.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--panel-soft)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-base" style={{ background: "var(--border)" }}>{n.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{n.title}</p>
                  <p className="truncate text-[11px]" style={{ color: "var(--text-faint)" }}>{n.description}</p>
                </div>
                <Toggle on={toggles[n.id]} onChange={() => toggle(n.id, n.title)} />
              </div>
            ))}
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Performance estimée</p>
            <TemplateGrid onAction={(title, action) => pushToast(`${action} : « ${title} »`)} />
          </div>
        </div>
      )}

      {tab === "Modèles proposés" && <TemplateGrid onAction={(title) => pushToast(`Modèle « ${title} » sélectionné`)} />}

      {tab === "Mes notifications" && (
        <div className="space-y-1.5">
          {scheduled.concat({ id: "done1", emoji: "🍻", title: "Happy Hour", subtitle: "Terminée · 438 € générés", when: "Hier", status: "Active" }).map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ background: "var(--border)" }}>{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{s.title}</p>
                <p className="truncate text-[11px]" style={{ color: "var(--text-faint)" }}>{s.subtitle}</p>
              </div>
              <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>{s.when}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Programmées" && (
        <div className="space-y-1.5">
          {scheduled.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base" style={{ background: "var(--border)" }}>{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{s.title}</p>
                <p className="truncate text-[11px]" style={{ color: "var(--text-faint)" }}>{s.subtitle}</p>
              </div>
              <span className="text-[11px] font-medium" style={{ color: "#38bdf8" }}>{s.when}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Brouillons" && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl">📝</span>
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--text)" }}>19 brouillons en attente</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>Reprenez une campagne là où vous l&rsquo;avez laissée.</p>
        </div>
      )}
    </div>
  );
}
