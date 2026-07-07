"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Bot, User } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { generateDesignFromPrompt } from "@/lib/ai-heuristic";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const suggestions = [
  "Carte premium noire pour un restaurant italien avec effet doré",
  "Je suis une boulangerie haut de gamme",
  "Rends cette carte plus luxueuse",
  "Salon de coiffure moderne en violet",
];

let msgId = 0;

export default function FidiAI() {
  const open = useUIStore((s) => s.aiAssistantOpen);
  const setOpen = useUIStore((s) => s.setAiAssistantOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const applyPatch = useEditorStore((s) => s.applyPatch);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: ++msgId,
      role: "assistant",
      text: "Salut, je suis Fidi AI. Décris ton commerce ou l'ambiance voulue et je génère un design pour toi.",
    },
  ]);
  const [thinking, setThinking] = useState(false);

  function handleSend(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || thinking) return;
    setMessages((m) => [...m, { id: ++msgId, role: "user", text: prompt }]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      const result = generateDesignFromPrompt(prompt);
      applyPatch(result.patch);
      setMessages((m) => [...m, { id: ++msgId, role: "assistant", text: result.reply }]);
      setThinking(false);
      pushToast("Design appliqué par Fidi AI");
    }, 700);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed bottom-24 right-6 z-[90] flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ background: "var(--panel)", borderColor: "var(--border-strong)" }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
                >
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Fidi AI
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    Assistant design
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[var(--panel-soft)]"
              >
                <X size={16} style={{ color: "var(--text-dim)" }} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background:
                        m.role === "assistant" ? "var(--accent-glow)" : "var(--border-strong)",
                    }}
                  >
                    {m.role === "assistant" ? (
                      <Bot size={13} className="text-[var(--accent-1)]" />
                    ) : (
                      <User size={13} style={{ color: "var(--text-dim)" }} />
                    )}
                  </span>
                  <p
                    className="max-w-[240px] rounded-xl px-3 py-2 text-xs leading-relaxed"
                    style={{
                      background: m.role === "assistant" ? "var(--panel-soft)" : "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {m.text}
                  </p>
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 px-1">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "var(--accent-glow)" }}>
                    <Bot size={13} className="text-[var(--accent-1)]" />
                  </span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--text-faint)" }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 border-t px-3 py-2" style={{ borderColor: "var(--border)" }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="cursor-pointer rounded-full border px-2.5 py-1 text-[10px] transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
                >
                  {s.length > 34 ? s.slice(0, 34) + "…" : s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Décris ta carte idéale..."
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-xs outline-none focus:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              />
              <button
                onClick={() => handleSend()}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white shadow-2xl"
        style={{
          background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
          boxShadow: "0 10px 30px -6px var(--accent-glow)",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
