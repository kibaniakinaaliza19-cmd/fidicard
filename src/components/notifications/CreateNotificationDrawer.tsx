"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Smartphone, Send, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { IphonePreview } from "./PushPreview";
import {
  notifTypes,
  recipientSegments,
  emojiPalette,
  type PushSample,
} from "@/data/notifications";
import { useUIStore } from "@/store/uiStore";
import { usePlan } from "@/lib/usePlan";
import { useNotificationsLogStore, useSentThisMonth } from "@/store/notificationsLogStore";

type Schedule = "now" | "date" | "repeat";

export default function CreateNotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pushToast = useUIStore((s) => s.pushToast);
  const { limits } = usePlan();
  const hydrateLog = useNotificationsLogStore((s) => s.hydrate);
  const logSend = useNotificationsLogStore((s) => s.logSend);
  const sentThisMonth = useSentThisMonth();

  useEffect(() => {
    hydrateLog();
  }, [hydrateLog]);

  const quotaReached = limits.notifsParMois !== -1 && sentThisMonth >= limits.notifsParMois;

  const [type, setType] = useState("event");
  const [emoji, setEmoji] = useState("⚽");
  const [title, setTitle] = useState("Grand soir Ligue des Champions ⚽");
  const [body, setBody] = useState("Match sur écran géant dès 21h — réservez votre table 🍻");
  const [recipients, setRecipients] = useState<string[]>(["all"]);
  const [schedule, setSchedule] = useState<Schedule>("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");

  const preview: PushSample = {
    business: "Café Madeleine",
    emoji,
    logoFrom: "#ff6a3d",
    logoTo: "#e0342c",
    title: title || "Titre de la notification",
    body: body || "Votre message apparaîtra ici.",
    time: "maintenant",
  };

  const checklist = useMemo(
    () => [
      { label: "Texte du message", ok: title.trim().length > 0 && body.trim().length > 0 },
      { label: "Au moins un destinataire", ok: recipients.length > 0 },
      { label: "Programmation valide", ok: schedule === "now" || time.length > 0 },
      { label: "Emoji / visuel", ok: !!emoji },
    ],
    [title, body, recipients, schedule, time, emoji]
  );
  const allOk = checklist.every((c) => c.ok);

  function toggleRecipient(id: string) {
    setRecipients((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  }

  function insertVar(v: string) {
    setBody((b) => `${b}${b.endsWith(" ") || b.length === 0 ? "" : " "}${v}`);
  }

  function handleSend() {
    if (quotaReached) {
      pushToast("Limite de notifications atteinte pour ce mois");
      return;
    }
    if (!allOk) {
      pushToast("Complétez la campagne avant l'envoi");
      return;
    }
    logSend(title);
    pushToast(schedule === "now" ? "Campagne envoyée 🚀" : "Campagne programmée ✅");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[95]"
            style={{ background: "rgba(0,0,0,0.6)" }}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-[96] flex h-full w-full max-w-[860px] flex-col border-l shadow-2xl"
            style={{ background: "var(--panel)", borderColor: "var(--border-strong)" }}
          >
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Nouvelle campagne</h2>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>Créez une notification performante en moins de 2 minutes.</p>
              </div>
              <button onClick={onClose} className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--panel-soft)]">
                <X size={18} style={{ color: "var(--text-dim)" }} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
              {/* form */}
              <div className="overflow-y-auto px-6 py-5">
                <Section label="Type de campagne">
                  <div className="grid grid-cols-4 gap-2">
                    {notifTypes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setType(t.id); setEmoji(t.emoji); }}
                        className="flex flex-col items-center gap-1 rounded-xl border py-3 text-[11px] font-medium transition-colors"
                        style={{
                          borderColor: type === t.id ? "var(--accent-1)" : "var(--border)",
                          background: type === t.id ? "var(--accent-glow)" : "var(--panel-soft)",
                          color: type === t.id ? "var(--accent-1)" : "var(--text-dim)",
                        }}
                      >
                        <span className="text-lg">{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="Message">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre"
                    className="mb-2 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Votre message..."
                    rows={3}
                    className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {emojiPalette.map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-base transition-transform hover:scale-110"
                        style={{ borderColor: emoji === e ? "var(--accent-1)" : "var(--border)", background: "var(--panel-soft)" }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>Variables automatiques</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["{prenom}", "{nomEntreprise}", "{points}", "{récompense}", "{ville}"].map((v) => (
                        <button
                          key={v}
                          onClick={() => insertVar(v)}
                          className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                          style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section label="Destinataires">
                  <div className="grid grid-cols-2 gap-2">
                    {recipientSegments.map((s) => {
                      const active = recipients.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleRecipient(s.id)}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
                          style={{ borderColor: active ? "var(--accent-1)" : "var(--border)", background: active ? "var(--accent-glow)" : "var(--panel-soft)" }}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: active ? "var(--accent-1)" : "var(--border-strong)", background: active ? "var(--accent-1)" : "transparent" }}>
                            {active && <Check size={11} className="text-white" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium" style={{ color: "var(--text)" }}>{s.label}</span>
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{s.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section label="Programmation">
                  <div className="flex gap-2">
                    {([["now", "Immédiatement"], ["date", "Date & heure"], ["repeat", "Répéter"]] as [Schedule, string][]).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setSchedule(id)}
                        className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors"
                        style={{ borderColor: schedule === id ? "var(--accent-1)" : "var(--border)", background: schedule === id ? "var(--accent-glow)" : "var(--panel-soft)", color: schedule === id ? "var(--accent-1)" : "var(--text-dim)" }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {schedule !== "now" && (
                    <div className="mt-2 flex gap-2">
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }} />
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]" style={{ borderColor: "var(--border-strong)", color: "var(--text)" }} />
                    </div>
                  )}
                  {schedule === "repeat" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["Tous les jours", "Chaque semaine", "Chaque mois", "Week-end", "Jours ouvrés"].map((r) => (
                        <span key={r} className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>{r}</span>
                      ))}
                    </div>
                  )}
                </Section>

                <Section label="Validation">
                  <div className="space-y-1.5">
                    {checklist.map((c) => (
                      <div key={c.label} className="flex items-center gap-2 text-xs">
                        {c.ok ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-amber-500" />}
                        <span style={{ color: c.ok ? "var(--text-dim)" : "var(--text)" }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>

              {/* live preview */}
              <div className="hidden border-l lg:block" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
                <div className="sticky top-0 p-5">
                  <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Aperçu en direct</p>
                  <IphonePreview push={preview} />
                </div>
              </div>
            </div>

            {quotaReached && (
              <div
                className="mx-6 mb-3 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs"
                style={{ borderColor: "rgba(232,80,61,0.35)", background: "rgba(232,80,61,0.08)", color: "#E8503D" }}
              >
                <Lock size={14} />
                Limite atteinte — passez au plan supérieur pour en envoyer plus.
                <Link href="/reglages?tab=subscription" onClick={onClose} className="ml-auto shrink-0 underline underline-offset-2">
                  Voir les plans
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => pushToast("Notification test envoyée 📲")}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              >
                <Smartphone size={15} /> Envoyer un test
              </button>
              <button
                onClick={handleSend}
                disabled={quotaReached}
                className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: quotaReached ? "var(--border-strong)" : allOk ? "linear-gradient(135deg, var(--accent-1), var(--accent-2))" : "var(--border-strong)",
                  boxShadow: allOk && !quotaReached ? "0 8px 20px -8px var(--accent-glow)" : "none",
                  opacity: quotaReached ? 0.7 : 1,
                }}
              >
                {quotaReached ? <Lock size={15} /> : <Send size={15} />}
                {quotaReached ? "Limite atteinte" : schedule === "now" ? "Envoyer maintenant" : "Programmer"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{label}</p>
      {children}
    </div>
  );
}
