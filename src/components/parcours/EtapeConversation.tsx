"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import OrbeIA from "@/components/aiDesigner/OrbeIA";

export interface MsgChat {
  id: number;
  role: "assistant" | "user";
  text?: string;
}

let mid = 0;
const nextId = () => ++mid;

/**
 * Version 1 de la conversation : texte seul, chaîne IA réelle, badge d'état
 * réel (pas encore de nuance d'erreur — ajoutée à l'étape suivante du
 * chantier). Les vignettes d'image et les puces de suggestion arrivent dans
 * un commit séparé (§ plan validé, étape 3) pour garder chaque commit lisible.
 */
export default function EtapeConversation({
  premiereReponse,
  aiLive,
  onEnvoyer,
  onCreationPossible,
}: {
  premiereReponse: string;
  /** null = pas encore su, true = en ligne, false = indisponible. */
  aiLive: boolean | null;
  onEnvoyer: (texte: string) => Promise<{ reply: string; carte: unknown; creationAutorisee: boolean } | null>;
  onCreationPossible: () => void;
}) {
  const [messages, setMessages] = useState<MsgChat[]>(() =>
    premiereReponse ? [{ id: nextId(), role: "assistant", text: premiereReponse }] : [],
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pretACreer, setPretACreer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function tour(texte: string) {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: texte }]);
    setBusy(true);
    try {
      const r = await onEnvoyer(texte);
      if (!r) {
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: "Je n'ai pas pu répondre à l'instant. Réessayez." }]);
        return;
      }
      if (r.carte) {
        onCreationPossible();
        return;
      }
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: r.reply }]);
      setPretACreer(r.creationAutorisee);
    } finally {
      setBusy(false);
    }
  }

  function envoyer() {
    const texte = input.trim();
    if (!texte || busy) return;
    setInput("");
    tour(texte);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <OrbeIA taille={36} actif={busy} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Fidi<span style={{ color: "var(--accent)" }}>IA</span>
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
          style={{ border: "1px solid var(--border-strong)", color: "var(--text-dim)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: aiLive === true ? "var(--success)" : aiLive === false ? "var(--danger)" : "var(--text-faint)" }}
          />
          {aiLive === true ? "En ligne" : aiLive === false ? "Indisponible" : "Connexion…"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <OrbeIA taille={64} actif={busy} />
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
              style={
                m.role === "user"
                  ? { background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", color: "#fff" }
                  : { background: "var(--panel-soft)", color: "var(--text)" }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {pretACreer && !busy && (
          <button onClick={() => tour("Crée la carte maintenant.")} className="btn btn-primary w-full">
            Créer ma carte
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && envoyer()}
          disabled={busy}
          placeholder={busy ? "FidiIA réfléchit…" : "Votre réponse…"}
          className="champ flex-1 disabled:opacity-60"
        />
        <button
          onClick={envoyer}
          disabled={busy || !input.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
