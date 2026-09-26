"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import OrbeIA from "@/components/aiDesigner/OrbeIA";

interface Msg {
  id: number;
  role: "assistant" | "user";
  text: string;
}

let mid = 0;
const nextId = () => ++mid;

/**
 * Le seul écran du parcours qui ressemble à un chat — et volontairement
 * court : les étapes 2 à 4 ont déjà transmis nom, secteur, logo, photo et
 * couleurs en silence, donc FidiIA n'a plus qu'à demander ce qui reste
 * (comment le commerçant récompense ses clients, la récompense exacte,
 * l'objectif, ses clients par semaine, son panier moyen). L'entretien
 * complet existe toujours dans /carte pour qui préfère tout dérouler en
 * discutant.
 */
export default function EtapeConversation({
  premiereReponse,
  onEnvoyer,
  onCreationPossible,
}: {
  /** Ce que FidiIA a déjà répondu au dernier message silencieux des étapes 2
   *  à 4 (présentation, logo/photos, couleurs) — affiché tel quel comme
   *  première bulle, sans nouvel appel : elle a déjà posé la question qui
   *  compte, la reposer serait la redire pour rien. */
  premiereReponse: string;
  onEnvoyer: (texte: string) => Promise<{ reply: string; carte: unknown; creationAutorisee: boolean } | null>;
  /** Une carte est arrivée : le parcours avance vers la génération. */
  onCreationPossible: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>(() =>
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
