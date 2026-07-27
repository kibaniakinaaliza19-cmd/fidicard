"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Mic, Paperclip, Wand2, RefreshCw } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useUIStore } from "@/store/uiStore";
import { inferTierType } from "@/lib/loyalty";
import {
  detectSector,
  detectMode,
  proposalsFor,
  TONES,
  type Tone,
} from "@/lib/aiDesigner/conversation";
import type { TemplateEntry } from "@/data/templateCatalog";

type Chip = { label: string; kind: "sector" | "tone"; value: string };
interface Msg {
  id: string;
  role: "assistant" | "user";
  text?: string;
  chips?: Chip[];
  proposals?: TemplateEntry[];
}

let mid = 0;
const nextId = () => `m${++mid}`;

// libellé court à écrire DANS le tampon du dernier palier
function shortReward(reward: string): string {
  const m = reward.match(/-?\d+\s*[€%]/);
  if (m) return m[0].replace(/\s/g, "");
  if (/offert|gratuit|free/i.test(reward)) return "Offert";
  return reward.split(/\s+/)[0].slice(0, 8);
}

const SECTOR_CHIPS = [
  "Café", "Boulangerie", "Restaurant", "Salon de coiffure",
  "Institut de beauté", "Bar", "Fleuriste", "Garage",
];

// Suggestions rapides sous la conversation. Déclarées hors du composant : les
// actions sont décrites en données, jamais en fermetures créées au rendu.
const QUICK: { label: string; send?: string; open?: "import" }[] = [
  { label: "Importer une carte", open: "import" },
  { label: "Café à tampons", send: "Je tiens un café, je veux une carte à tampons" },
  { label: "Salon premium", send: "Salon de coiffure haut de gamme" },
];

export default function AssistantChat({ onStep }: { onStep: (n: number) => void }) {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const pushToast = useUIStore((s) => s.pushToast);
  const setImportCardOpen = useUIStore((s) => s.setImportCardOpen);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nextId(),
      role: "assistant",
      text:
        "Bonjour ! Je suis votre assistant FidiCard. Décrivez-moi votre activité, et je créerai pour vous une carte de fidélité professionnelle et unique.",
    },
  ]);
  const [phase, setPhase] = useState<"activity" | "tone" | "proposals" | "done">("activity");
  const [sector, setSector] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  // null tant que le commerçant n'a pas exprimé de préférence : dans ce cas
  // c'est le modèle appliqué qui décide. S'il a demandé « des points »,
  // sa demande l'emporte sur le réglage du modèle.
  const [mode, setMode] = useState<"stamps" | "points" | null>(null);
  const [input, setInput] = useState("");
  // null = pas encore su ; true = vrai modèle branché ; false = repli local
  const [aiLive, setAiLive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // détecte si un vrai modèle est configuré côté serveur
  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => setAiLive(Boolean(d.available)))
      .catch(() => setAiLive(false));
  }, []);

  const add = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { id: nextId(), ...m }]);

  function askTone(sec: string) {
    add({
      role: "assistant",
      text: `Parfait ! Une activité « ${sec} », j'adore. Je vais créer une carte adaptée. Quelle ambiance souhaitez-vous transmettre ?`,
      chips: TONES.map((t) => ({ label: t.label, kind: "tone", value: t.id })),
    });
    setPhase("tone");
    onStep(1);
  }

  function handleActivity(text: string) {
    const sec = detectSector(text);
    const m = detectMode(text);
    if (m) setMode(m);
    if (sec) {
      setSector(sec);
      askTone(sec);
    } else {
      add({
        role: "assistant",
        text: "Dites-m'en un peu plus — quel est votre métier ? Vous pouvez aussi choisir ci-dessous.",
        chips: SECTOR_CHIPS.map((s) => ({ label: s, kind: "sector", value: s })),
      });
    }
  }

  function generate(sec: string, toneId: string, intro: string) {
    const proposals = proposalsFor(sec, toneId, shown.current);
    proposals.forEach((p) => shown.current.add(p.id));
    add({ role: "assistant", text: intro, proposals });
    setPhase("proposals");
    onStep(2);
  }

  function chooseTone(t: Tone) {
    if (!sector) return;
    add({ role: "user", text: t.label });
    setTone(t.id);
    generate(sector, t.id, "Voici 3 propositions générées pour votre activité 👇 Cliquez-en une pour l'appliquer.");
  }

  function regenerate() {
    if (!sector || !tone) return;
    generate(sector, tone, "Voici d'autres versions 👇");
  }

  function modifyWithAi() {
    add({
      role: "assistant",
      text: "Bien sûr. Sur quelle ambiance voulez-vous partir ?",
      chips: TONES.map((t) => ({ label: t.label, kind: "tone", value: t.id })),
    });
    setPhase("tone");
  }

  function applyProposal(entry: TemplateEntry) {
    applyTemplate(entry.build());
    const L = entry.loyalty;
    if (L) {
      setConfig({
        mode: mode ?? (L.mode === "points" ? "points" : "stamps"),
        totalStamps: L.total,
        paliers: [
          {
            position: L.total,
            label: shortReward(L.reward),
            description: L.reward,
            type: inferTierType(L.reward),
          },
        ],
      });
    }
    add({ role: "user", text: `J'aime « ${entry.name} »` });
    add({
      role: "assistant",
      text:
        `Votre carte « ${entry.name} » est prête ✨ Les tampons, la récompense et le QR code sont gérés automatiquement. ` +
        "Ajustez la à droite, ou dites-moi quoi changer (couleur, nombre de tampons, récompense).",
    });
    setPhase("done");
    onStep(3);
    pushToast(`Carte « ${entry.name} » appliquée.`);
  }

  // --- mode « vrai modèle » : le serveur mène la conversation ---
  type Action =
    | { type: "propose"; sector: string; tone: string }
    | { type: "set_stamps"; count: number }
    | { type: "set_reward"; text: string }
    | null;

  function execAction(action: Action) {
    if (!action) return;
    if (action.type === "propose") {
      const proposals = proposalsFor(action.sector, action.tone, shown.current);
      proposals.forEach((p) => shown.current.add(p.id));
      setSector(action.sector);
      setTone(action.tone);
      add({ role: "assistant", proposals });
      setPhase("proposals");
      onStep(2);
    } else if (action.type === "set_stamps") {
      useLoyaltyStore.getState().setTotalStamps(action.count);
    } else if (action.type === "set_reward") {
      const cfg = useLoyaltyStore.getState().config;
      const pos = cfg.paliers.length ? cfg.paliers[cfg.paliers.length - 1].position : cfg.totalStamps;
      setConfig({
        paliers: [{ position: pos, label: shortReward(action.text), description: action.text, type: inferTierType(action.text) }],
      });
    }
  }

  async function runAi(userText: string) {
    const history = messages.filter((m) => m.text).map((m) => ({ role: m.role, content: m.text as string }));
    history.push({ role: "user", content: userText });
    setBusy(true);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await r.json();
      if (!r.ok || typeof data.reply !== "string") {
        add({ role: "assistant", text: data.error || "Je n'ai pas pu répondre — réessayez." });
        return;
      }
      add({ role: "assistant", text: data.reply });
      execAction(data.action ?? null);
      if (phase === "activity") onStep(1);
    } catch {
      add({ role: "assistant", text: "Connexion à l'assistant impossible. Réessayez dans un instant." });
    } finally {
      setBusy(false);
    }
  }

  function submit(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    add({ role: "user", text });
    // « je veux des points » doit être entendu dans les deux régimes
    // (vrai modèle ou repli local), et à n'importe quel moment.
    const asked = detectMode(text);
    if (asked) {
      setMode(asked);
      if (phase === "done") useLoyaltyStore.getState().setMode(asked);
    }
    if (aiLive) {
      runAi(text);
      return;
    }
    if (phase === "activity") handleActivity(text);
    else if (phase === "tone") {
      const t = TONES.find((x) => text.toLowerCase().includes(x.label.split(" ")[0].toLowerCase()));
      if (t) chooseTone(t);
      else add({ role: "assistant", text: "Choisissez une ambiance parmi les propositions au-dessus 🙂" });
    } else if (phase === "proposals") {
      add({ role: "assistant", text: "Cliquez sur l'une des trois cartes proposées pour l'appliquer." });
    } else {
      // done : petites intentions d'édition reconnues
      handleEdit(text);
    }
  }

  function handleEdit(text: string) {
    const t = text.toLowerCase();
    const num = t.match(/\b(\d{1,2})\b/);
    if (/tampon|case/.test(t) && num) {
      const n = Math.max(1, Math.min(24, Number(num[1])));
      useLoyaltyStore.getState().setTotalStamps(n);
      add({ role: "assistant", text: `C'est fait : ${n} tampons. La grille s'est reconstruite automatiquement.` });
      return;
    }
    add({
      role: "assistant",
      text: "Pour un réglage précis, utilisez les onglets Tampons / Récompenses à droite, ou ouvrez l'éditeur avancé via « Personnalisation ».",
    });
  }

  function onChip(c: Chip) {
    if (c.kind === "sector") {
      setSector(c.value);
      add({ role: "user", text: c.value });
      askTone(c.value);
    } else {
      const t = TONES.find((x) => x.id === c.value);
      if (t) chooseTone(t);
    }
  }

  function startVoice() {
    type SR = { new (): { lang: string; onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void; start: () => void } };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      pushToast("La saisie vocale n'est pas disponible sur ce navigateur.");
      return;
    }
    const rec = new Rec();
    rec.lang = "fr-FR";
    rec.onresult = (e) => submit(e.results[0][0].transcript);
    rec.start();
    pushToast("Parlez…");
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
        >
          <Sparkles size={20} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            Assistant FidiCard
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}>IA</span>
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Votre expert fidélité</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: "#4CAF7D" }} /> connecté
        </span>
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%]">
              {m.text && (
                <div
                  className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", color: "#fff" }
                      : { background: "var(--panel-soft)", color: "var(--text)" }
                  }
                >
                  {m.text}
                </div>
              )}

              {m.chips && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.chips.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => onChip(c)}
                      className="cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {m.proposals && (
                <>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {m.proposals.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyProposal(p)}
                        className="group overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 hover:border-[var(--accent-1)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <MiniCard doc={p.build()} width={130} preview />
                        <span className="block truncate px-1.5 py-1 text-left text-[10px]" style={{ background: "var(--panel-soft)", color: "var(--text-dim)" }}>
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={regenerate}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      <RefreshCw size={12} /> Générer d&apos;autres versions
                    </button>
                    <button
                      onClick={modifyWithAi}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      <Wand2 size={12} /> Modifier avec l&apos;IA
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5" style={{ background: "var(--panel-soft)" }}>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--accent-1)", animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--accent-1)", animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: "var(--accent-1)", animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* suggestions rapides */}
      <div className="flex flex-wrap gap-1.5 border-t px-5 pt-3" style={{ borderColor: "var(--border)" }}>
        {QUICK.map((s) => (
          <button
            key={s.label}
            onClick={() => (s.open === "import" ? setImportCardOpen(true) : submit(s.send))}
            className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
            style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* saisie */}
      <div className="flex items-center gap-2 px-5 py-4">
        <button onClick={() => setImportCardOpen(true)} className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]" title="Joindre / importer">
          <Paperclip size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={busy}
          placeholder={busy ? "L'assistant réfléchit…" : "Décrivez votre entreprise…"}
          className="flex-1 rounded-xl border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-1)] disabled:opacity-60"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
        <button onClick={startVoice} className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]" title="Parler">
          <Mic size={18} />
        </button>
        <button
          onClick={() => submit()}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          title="Envoyer"
        >
          {phase === "activity" ? <Wand2 size={17} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
