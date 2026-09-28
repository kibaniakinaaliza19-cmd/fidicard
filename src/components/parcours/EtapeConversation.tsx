"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Paperclip, Send, X } from "lucide-react";
import OrbeIA from "@/components/aiDesigner/OrbeIA";
import { MESSAGES_ERREUR, type CodeErreur } from "./Parcours";

export interface MsgChat {
  id: number;
  role: "assistant" | "user";
  text?: string;
  /** Vignette jointe à ce message — envoyée (rôle user) ou évoquée dans la
   *  réponse (aucun cas pour l'instant côté assistant). */
  image?: string;
  /** Puces de réponse rapide, en plus du champ libre — jamais à sa place. */
  suggestions?: string[];
}

let mid = 0;
const nextId = () => ++mid;

const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const MAX_TAILLE_IMAGE_OCTETS = 8 * 1024 * 1024;

function lireCommeDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Puces de réponse rapide déduites du texte de FidiIA — un repérage de
 * quelques mots-clés, pas une compréhension du langage. Volontairement
 * modeste (point 1 : « quand c'est utile », pas partout) : l'ambiance est le
 * seul cas qu'on nous a explicitement demandé de couvrir ; le reste du
 * temps, le champ libre suffit et c'est très bien ainsi.
 */
function suggestionsPour(reply: string): string[] | undefined {
  const t = reply.toLowerCase();
  if (t.includes("ambiance")) return ["Chaleureuse", "Sobre", "Haut de gamme"];
  if (t.includes("logo")) return ["Oui, je l'envoie", "Pas pour l'instant"];
  return undefined;
}

type Resultat =
  | { ok: true; reply: string; carte: unknown; creationAutorisee: boolean }
  | { ok: false; code: CodeErreur };

export default function EtapeConversation({
  premiereReponse,
  aiLive,
  onEnvoyer,
  onCreationPossible,
  dejaCree = false,
}: {
  premiereReponse: string;
  aiLive: boolean | null;
  onEnvoyer: (texte: string, image?: string, imageRole?: "logo" | "photo", silencieux?: boolean) => Promise<Resultat>;
  onCreationPossible: () => void;
  /**
   * true en personnalisation : la carte existe déjà, donc une réponse qui en
   * porte une nouvelle est une RETOUCHE (le logo réduit, une couleur changée),
   * pas une naissance. Sans ce drapeau, `tour()` traitait toute carte reçue
   * comme le signal "c'est fait, quitte la conversation" — la première
   * retouche demandée après coup renvoyait tout droit vers l'écran de
   * confirmation au lieu de rester dans l'échange.
   */
  dejaCree?: boolean;
}) {
  const [messages, setMessages] = useState<MsgChat[]>([]);

  /**
   * Le premier message n'est jamais stocké dans `messages` : Parcours.tsx
   * affiche cet écran avant même que le premier appel au serveur ait
   * répondu (demarrer() fait setDemarre(true) puis attend envoyer()), donc
   * premiereReponse vaut encore "" au montage. Un useState initialisé une
   * fois pour toutes ne l'aurait jamais rattrapée ; le dériver au rendu,
   * chaque fois, le fait sans effet ni synchronisation. L'identifiant 0 est
   * stable d'un rendu à l'autre et ne collisionne jamais avec nextId(), qui
   * démarre à 1.
   */
  const tousLesMessages: MsgChat[] = useMemo(
    () =>
      premiereReponse
        ? [{ id: 0, role: "assistant", text: premiereReponse, suggestions: suggestionsPour(premiereReponse) }, ...messages]
        : messages,
    [premiereReponse, messages],
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pretACreer, setPretACreer] = useState(false);
  const [imageEnAttente, setImageEnAttente] = useState<{ dataUrl: string; role: "logo" | "photo" } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roleChoisi = useRef<"logo" | "photo">("logo");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [tousLesMessages, busy]);

  /**
   * Décision 2 : une photo seule ne compte pas comme un tour ; un texte
   * écrit ou une suggestion cliquée en compte un — que cette photo
   * l'accompagne ou non. `compteCommeUnTour` distingue les deux cas au lieu
   * de traiter chaque envoi comme silencieux par défaut.
   */
  async function tour(texte: string, image?: string, imageRole?: "logo" | "photo", compteCommeUnTour = true) {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: texte, image }]);
    setBusy(true);
    try {
      const r = await onEnvoyer(texte, image, imageRole, !compteCommeUnTour);
      if (!r.ok) {
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: MESSAGES_ERREUR[r.code] }]);
        return;
      }
      if (r.carte) {
        if (dejaCree) {
          // La carte existait déjà : ceci est une retouche, pas une naissance.
          // Le store est mis à jour par Parcours.envoyer() avant même que
          // cette réponse n'arrive ici — il ne reste qu'à le dire.
          setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: r.reply || "C'est fait — la carte est mise à jour." }]);
        } else {
          onCreationPossible();
        }
        return;
      }
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: r.reply, suggestions: suggestionsPour(r.reply) }]);
      setPretACreer(r.creationAutorisee);
    } finally {
      setBusy(false);
    }
  }

  function envoyer() {
    const texte = input.trim();
    if (busy) return;
    if (!texte && !imageEnAttente) return;
    setInput("");
    if (imageEnAttente) {
      const legende = texte || (imageEnAttente.role === "logo" ? "Voici mon logo." : "Voici une photo de mon commerce.");
      // La photo seule ne compte pas comme un tour (décision 2) ; si le
      // commerçant a aussi écrit une phrase, ce texte-là compte, c'est donc
      // lui qui décide — jamais la photo qui l'accompagne.
      tour(legende, imageEnAttente.dataUrl, imageEnAttente.role, Boolean(texte));
      setImageEnAttente(null);
      return;
    }
    tour(texte, undefined, undefined, true);
  }

  function suggestionCliquee(s: string) {
    if (busy) return;
    tour(s, undefined, undefined, true);
  }

  async function onFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Un fichier refusé ne doit pas disparaître en silence : le commerçant
    // qui vient de choisir une photo doit savoir pourquoi rien ne se passe.
    if (!TYPES_IMAGE_ACCEPTES.includes(file.type)) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: "Ce format d'image n'est pas pris en charge — utilisez un JPEG, un PNG ou un WEBP." },
      ]);
      return;
    }
    if (file.size > MAX_TAILLE_IMAGE_OCTETS) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: "Cette image dépasse 8 Mo — une version plus légère fera très bien l'affaire." },
      ]);
      return;
    }
    try {
      setImageEnAttente({ dataUrl: await lireCommeDataUrl(file), role: roleChoisi.current });
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: "Je n'ai pas réussi à lire cette image. Réessayez avec un autre fichier." },
      ]);
    }
  }

  return (
    // min-h-0 : utilisée seule (Parcours.tsx) cette racine reçoit sa hauteur
    // d'un ancêtre déjà contraint et le défaut ne se voyait pas. Imbriquée
    // une fois de plus (EtapePersonnalisation), rien au-dessus ne forçait
    // plus sa hauteur : elle grandissait à celle de son contenu — tous les
    // messages, jamais rétrécie — et débordait sur ce qui suit dans le flux.
    <div className="flex min-h-0 flex-1 flex-col">
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

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {tousLesMessages.length === 0 && (
          // Cet écran n'apparaît que dans l'instant qui sépare "Commencer" de
          // la première réponse du serveur (Parcours.tsx porte cet appel) :
          // il n'y a jamais de vide "au repos" ici, donc l'orbe réfléchit
          // toujours pendant qu'il est seul à l'écran.
          <div className="flex flex-col items-center pt-6 text-center">
            <OrbeIA taille={64} actif />
          </div>
        )}
        {tousLesMessages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%]">
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt=""
                  className="mb-1.5 ml-auto block h-24 w-24 rounded-xl object-cover"
                  style={{ border: "1px solid var(--border-strong)" }}
                />
              )}
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
              {m.suggestions && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => suggestionCliquee(s)}
                      disabled={busy}
                      className="cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {pretACreer && !busy && !dejaCree && (
          <button onClick={() => tour("Crée la carte maintenant.", undefined, undefined, true)} className="btn btn-primary w-full">
            Créer ma carte
          </button>
        )}
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

      {imageEnAttente && (
        <div className="flex items-center gap-2 border-t px-3 pt-2" style={{ borderColor: "var(--border)" }}>
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageEnAttente.dataUrl} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => setImageEnAttente(null)}
              className="absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-white"
              style={{ background: "var(--danger)" }}
            >
              <X size={10} />
            </button>
          </div>
          <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {imageEnAttente.role === "logo" ? "Logo" : "Photo"} prêt(e) à envoyer.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 border-t px-3 py-3" style={{ borderColor: imageEnAttente ? "transparent" : "var(--border)" }}>
        <input ref={fileInputRef} type="file" accept={TYPES_IMAGE_ACCEPTES.join(",")} onChange={onFichier} className="hidden" />
        <button
          onClick={() => { roleChoisi.current = "logo"; fileInputRef.current?.click(); }}
          className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]"
          title="Envoyer le logo"
        >
          <Paperclip size={18} />
        </button>
        <button
          onClick={() => { roleChoisi.current = "photo"; fileInputRef.current?.click(); }}
          className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]"
          title="Envoyer une photo du commerce"
        >
          <Camera size={18} />
        </button>
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
          disabled={busy || (!input.trim() && !imageEnAttente)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
