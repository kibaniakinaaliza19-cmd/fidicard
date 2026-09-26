"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Mic, Paperclip, Camera, Wand2, RefreshCw, X } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import OrbeIA from "@/components/aiDesigner/OrbeIA";
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
import type { CardDoc } from "@/types/layer";
import type { LoyaltyConfig } from "@/lib/loyalty";

type Chip = { label: string; kind: "sector" | "tone"; value: string };
interface Msg {
  id: string;
  role: "assistant" | "user";
  text?: string;
  chips?: Chip[];
  proposals?: TemplateEntry[];
  /** Carte conçue par FidiIA (moteur `lib/fidiia`), déjà appliquée. Aperçu
   *  en lecture seule — contrairement à `proposals`, il n'y a rien à
   *  choisir : le modèle a conçu une carte, pas trois options. */
  cardApplied?: CardDoc;
  /** Les informations minimales sont réunies mais aucune carte n'est encore
   *  sortie ce tour-ci : un bouton pour la déclencher sans dépendre de ce
   *  que le modèle choisit de faire du message suivant. */
  proposerCreation?: boolean;
}

/** Blob de session `lib/fidiia`, opaque ici : le client le stocke et le
 *  renvoie tel quel à chaque requête. Aucun état ne vit côté serveur entre
 *  deux messages. */
type FidiiaSession = Record<string, unknown> | null;

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
/* Les quatre demandes qui reviennent, proposées tant que la conversation est
   vierge. Ce ne sont pas des fonctionnalités : chacune n'écrit qu'une phrase
   dans la conversation. L'assistant reste un interlocuteur, pas un menu
   déguisé en tableau de bord. */
/* La première tuile n'envoie plus de message : elle ouvre le parcours en
 * étapes (/carte/nouvelle) — visuel plutôt qu'un long chat, voir
 * src/components/parcours/Parcours.tsx. Les trois autres continuent
 * d'ouvrir directement la conversation, pour ce qui reste conversationnel
 * par nature (modifier, relancer, comprendre des chiffres). */
const DEMANDES = [
  { titre: "Créer ma carte", detail: "Un parcours guidé, en quelques écrans", href: "/carte/nouvelle" },
  { titre: "Modifier ma carte", detail: "Dites ce que vous voulez changer", envoi: "Je veux modifier ma carte" },
  { titre: "Faire revenir mes clients", detail: "Une offre à envoyer", envoi: "Fais une offre pour faire revenir mes clients" },
  { titre: "Comprendre mes résultats", detail: "Ce que disent vos chiffres", envoi: "Pourquoi mes récompenses sont-elles moins utilisées ?" },
] as const;

const QUICK: { label: string; send?: string; open?: "import" }[] = [
  { label: "Importer une carte", open: "import" },
  { label: "Café à tampons", send: "Je tiens un café, je veux une carte à tampons" },
  { label: "Salon premium", send: "Salon de coiffure haut de gamme" },
];

/** Mêmes bornes que côté serveur (route.ts) : inutile de faire attendre un
 *  aller-retour réseau au commerçant pour un fichier qui sera refusé. */
const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const MAX_TAILLE_IMAGE_OCTETS = 8 * 1024 * 1024;

/**
 * FidiIA décide où et à quelle taille placer le logo et la photo (calques
 * nommés "Logo" / "Photo de l'établissement", voir adapters/toCardDoc.ts —
 * ou le fond lui-même si le modèle a choisi la photo en plein cadre) mais
 * n'a jamais les fichiers réels — seulement leur analyse de couleurs. Ces
 * fichiers existent côté client (l'upload les a lus en data URL) : c'est ce
 * qui referme la boucle, sans repasser par le serveur.
 */
function integrerImagesReelles(doc: CardDoc, logo: string | null, photo: string | null): CardDoc {
  let out = doc;
  if (logo && doc.layers.some((l) => l.type === "image" && l.name === "Logo")) {
    out = { ...out, layers: out.layers.map((l) => (l.type === "image" && l.name === "Logo" ? { ...l, src: logo } : l)) };
  }
  if (photo) {
    const aUneCoucheDePhoto = out.layers.some((l) => l.type === "image" && l.name === "Photo de l'établissement");
    if (aUneCoucheDePhoto) {
      out = {
        ...out,
        layers: out.layers.map((l) =>
          l.type === "image" && l.name === "Photo de l'établissement" ? { ...l, src: photo } : l,
        ),
      };
    } else if (out.background.kind === "image") {
      // Le modèle a choisi la photo en plein fond plutôt qu'en calque.
      out = { ...out, background: { ...out.background, image: photo } };
    }
  }
  return out;
}

function lireCommeDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AssistantChat({ onStep }: { onStep: (n: number) => void }) {
  const router = useRouter();
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const pushToast = useUIStore((s) => s.pushToast);
  const setImportCardOpen = useUIStore((s) => s.setImportCardOpen);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nextId(),
      role: "assistant",
      text:
        "Bonjour ! Je suis FidiIA. Décrivez-moi votre activité, et je créerai pour vous une carte de fidélité professionnelle et unique.",
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
  // Nom du modèle réellement configuré côté serveur (ex. "gpt-6-astra"),
  // affiché tel quel : la preuve que la carte vient de ce modèle, pas d'un
  // catalogue local, doit être visible sans avoir à lire les logs serveur.
  const [aiModel, setAiModel] = useState<string | null>(null);
  // true seulement quand une clé est configurée côté serveur mais que
  // l'appel de contrôle échoue quand même (clé révoquée, modèle retiré...) :
  // une vraie panne, à distinguer du repli local voulu (pas de clé du tout).
  const [aiDown, setAiDown] = useState(false);
  const [busy, setBusy] = useState(false);
  // Logo ou photo choisi mais pas encore envoyé : une data URL, prête à
  // partir avec le prochain message. `null` tant que rien n'est sélectionné.
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  // Quel bouton a déclenché la sélection de fichier — logo ou photo de
  // l'établissement. Décide où le fichier ira dans etat.logo/etat.photo côté
  // serveur, et lequel des deux refs ci-dessous le récupère au retour.
  const [pendingImageRole, setPendingImageRole] = useState<"logo" | "photo">("logo");
  const roleImageChoisi = useRef<"logo" | "photo">("logo");
  const shown = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Session `lib/fidiia` en cours, renvoyée à chaque requête. Une ref, pas un
  // state : elle ne pilote aucun rendu, elle ne fait que voyager.
  const fidiiaSession = useRef<FidiiaSession>(null);
  // Dernier logo / dernière photo envoyés, gardés côté client. Le serveur ne
  // connaît chacun que le temps d'un appel vision (couleurs/style) : il ne
  // les stocke nulle part, renvoyer l'image à chaque tour alourdirait chaque
  // requête FidiIA de plusieurs Mo pour rien. FidiIA décide où et à quelle
  // taille les placer (calques "Logo" / "Photo de l'établissement", ou le
  // fond lui-même) ; c'est le client qui y met le fichier réel.
  const dernierLogo = useRef<string | null>(null);
  const dernierePhoto = useRef<string | null>(null);
  // La promesse de la sonde, gardée telle quelle — pas seulement son
  // résultat dans `aiLive`. `aiLive` vaut `null` tant qu'elle n'a pas
  // répondu, et `null` est faux : un message envoyé pendant ce laps
  // basculerait sur le scénario local en silence, alors qu'un modèle est
  // peut-être bien branché. En développement, ce GET peut prendre plusieurs
  // secondes (Next compile la route à la première requête) — largement le
  // temps de lire l'écran et taper une phrase. `submit` attend cette
  // promesse plutôt que de trancher sur un état encore inconnu.
  const sonde = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    // Pas de défilement tant que la conversation n'a pas commencé : sinon
    // l'écran d'accueil — l'orbe et les quatre entrées en matière — se
    // retrouve poussé hors du cadre à l'ouverture de la page, et l'on arrive
    // sur un champ de saisie seul.
    if (messages.length <= 1) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // détecte si un vrai modèle est configuré côté serveur ET qu'il répond
  // réellement (pas seulement qu'une clé existe). Une clé configurée mais
  // qui ne répond pas est une panne : elle doit se voir à l'écran, pas
  // basculer en silence sur le scénario local comme si de rien n'était.
  useEffect(() => {
    sonde.current = fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => {
        const vivant = Boolean(d.available);
        setAiLive(vivant);
        setAiModel(typeof d.model === "string" ? d.model : null);
        if (d.configured && !d.available) {
          setAiDown(true);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text:
                "⚠️ L'assistant IA est configuré mais ne répond pas actuellement (clé ou modèle invalide côté serveur). " +
                "Je continue avec l'assistant local le temps que ce soit rétabli.",
            },
          ]);
        }
        return vivant;
      })
      .catch(() => {
        setAiLive(false);
        return false;
      });
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
    const proposals = proposalsFor(sec, toneId, shown.current, mode);
    proposals.forEach((p) => shown.current.add(p.id));
    add({ role: "assistant", text: intro, proposals });
    setPhase("proposals");
    onStep(2);
  }

  function chooseTone(t: Tone) {
    if (!sector) return;
    add({ role: "user", text: t.label });
    setTone(t.id);
    generate(sector, t.id, "Mode démo — voici 3 exemples de notre catalogue pour votre activité 👇 Cliquez-en un pour l'appliquer.");
  }

  function regenerate() {
    if (!sector || !tone) return;
    generate(sector, tone, "Mode démo — d'autres exemples du catalogue 👇");
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
      // Le visuel du modèle décide du système : un modèle à tampons dessine une
      // grille, un modèle à points une jauge. Forcer l'autre mode ici ferait
      // cohabiter les deux sur la même carte. La préférence du commerçant est
      // respectée en amont, dans le filtrage des propositions.
      const modeCarte = L.mode === "points" ? "points" : "stamps";
      setConfig({
        mode: modeCarte,
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
        `Votre carte « ${entry.name} » est prête ✨ Les tampons, la récompense et le code-barres sont gérés automatiquement. ` +
        "Ajustez la à droite, ou dites-moi quoi changer (couleur, nombre de tampons, récompense).",
    });
    setPhase("done");
    onStep(3);
    pushToast(`Carte « ${entry.name} » appliquée.`);
  }

  // --- mode « vrai modèle » : le moteur `lib/fidiia` mène la conversation ---

  async function runFidiia(userText: string, image?: string, imageRole?: "logo" | "photo") {
    if (image) {
      if (imageRole === "photo") dernierePhoto.current = image;
      else dernierLogo.current = image;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: userText, session: fidiiaSession.current, image, imageRole }),
      });
      const data = await r.json();
      if (!r.ok) {
        // Le motif technique ("Requête invalide.", "Clé OpenAI invalide
        // côté serveur."…) va dans la console du développeur, jamais dans
        // la conversation : ça ne dit rien d'actionnable au commerçant.
        if (data?.error) console.warn("[FidiIA]", data.error);
        add({
          role: "assistant",
          text:
            r.status === 429
              ? "Trop de demandes en ce moment — réessayez dans quelques instants."
              : "Je n'ai pas pu répondre à l'instant. Reformulez, ou réessayez dans quelques secondes.",
        });
        return;
      }
      fidiiaSession.current = data.session ?? null;
      // La carte conçue par FidiIA remplace celle de l'éditeur dès qu'elle
      // existe : le moteur ne propose pas un choix, il livre une carte prête.
      if (data.carte) {
        const carte = integrerImagesReelles(data.carte as CardDoc, dernierLogo.current, dernierePhoto.current);
        applyTemplate(carte);
        if (data.config) setConfig(data.config as Partial<LoyaltyConfig>);
        add({ role: "assistant", text: data.reply, cardApplied: carte });
        setPhase("done");
        onStep(3);
      } else if (data.reply) {
        // Les informations minimales sont réunies mais ce tour-ci n'a
        // produit aucune carte (le moteur ne crée qu'au tour SUIVANT une
        // fois creationAutorisee vrai) : le bouton permet de la déclencher
        // tout de suite plutôt que d'attendre que le modèle y pense.
        const pret = Boolean(
          (fidiiaSession.current as { etat?: { creationAutorisee?: boolean } } | null)?.etat
            ?.creationAutorisee,
        );
        add({ role: "assistant", text: data.reply, proposerCreation: pret });
      }
      if (phase === "activity") onStep(1);
    } catch {
      add({ role: "assistant", text: "Connexion à l'assistant impossible. Réessayez dans un instant." });
    } finally {
      setBusy(false);
    }
  }

  // Filet de sécurité : les cinq informations minimales sont réunies, mais
  // la production de la carte ne doit pas dépendre du bon vouloir du
  // modèle au tour suivant. Le message est neutre — le moteur décide de la
  // suite, ce bouton ne fait que provoquer ce tour suivant tout de suite.
  function creerCarteMaintenant() {
    if (busy) return;
    const text = "Crée la carte maintenant.";
    add({ role: "user", text });
    runFidiia(text);
  }

  // « Régénérer » : le moteur ne garde pas de « autres versions » en réserve
  // — il conçoit une carte à la fois. On efface la carte du blob de session
  // renvoyé au serveur pour que la prochaine requête reparte d'une création,
  // avec le même secteur/programme mais une nouvelle passe du modèle.
  function regenerateFidiia() {
    if (busy) return;
    if (fidiiaSession.current) {
      fidiiaSession.current = { ...fidiiaSession.current, carte: null, carteProposee: false };
    }
    const text = "Propose une autre version de la carte.";
    add({ role: "user", text });
    runFidiia(text);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES_IMAGE_ACCEPTES.includes(file.type)) {
      pushToast("Format non pris en charge — utilisez un JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_TAILLE_IMAGE_OCTETS) {
      pushToast("Image trop lourde (8 Mo maximum).");
      return;
    }
    try {
      setPendingImage(await lireCommeDataUrl(file));
      setPendingImageRole(roleImageChoisi.current);
    } catch {
      pushToast("Impossible de lire cette image.");
    }
  }

  async function submit(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    const image = pendingImage ?? undefined;
    const imageRole = pendingImageRole;
    setPendingImage(null);
    add({ role: "user", text });
    // « je veux des points » doit être entendu dans les deux régimes
    // (vrai modèle ou repli local), et à n'importe quel moment.
    const asked = detectMode(text);
    if (asked) {
      setMode(asked);
      if (phase === "done") useLoyaltyStore.getState().setMode(asked);
    }

    // On attend de SAVOIR avant de choisir le régime. `aiLive` à `null`
    // signifie « pas encore su », pas « pas de modèle » : y répondre par le
    // scénario local ferait perdre la course à un modèle pourtant branché,
    // en silence. Mieux vaut un court instant d'attente visible (`busy`)
    // qu'une réponse scriptée qui fait illusion.
    let vivant = aiLive;
    if (vivant === null) {
      setBusy(true);
      vivant = (await sonde.current) ?? false;
      setBusy(false);
    }

    if (vivant) {
      runFidiia(text, image, image ? imageRole : undefined);
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
      {/* En-tête. L'orbe réagit : elle s'accélère et ferme les yeux pendant
          que l'assistant travaille — l'état du système se lit sur lui, pas
          seulement sur trois points qui rebondissent plus bas. */}
      <div
        className="flex items-center gap-3 border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <OrbeIA taille={40} actif={busy} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Fidi<span style={{ color: "var(--accent)" }}>IA</span>
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {busy ? "Réfléchit…" : "Votre assistant intelligent"}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
          style={{ border: "1px solid var(--border-strong)", color: "var(--text-dim)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: aiDown ? "var(--danger)" : aiLive ? "var(--success)" : "var(--warning, #b8860b)" }}
          />
          {aiDown ? "IA indisponible" : aiLive ? `En ligne · ${aiModel ?? "modèle"}` : "Mode démo — catalogue local"}
        </span>
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {/* Conversation vierge : l'orbe en grand et quatre entrées en matière.
            Une page de discussion vide devant un curseur qui clignote ne dit
            pas ce qu'on peut demander, et le commerçant referme. */}
        {messages.length <= 1 && (
          <div className="pb-1">
            <div className="flex flex-col items-center text-center">
              <OrbeIA taille={88} actif={busy} />
              <p className="mt-3 text-lg font-semibold" style={{ color: "var(--text)" }}>
                Fidi<span style={{ color: "var(--accent)" }}>IA</span>
              </p>
              <p className="mt-1 max-w-[280px] text-[13px]" style={{ color: "var(--text-dim)" }}>
                Décrivez votre activité, et je fabrique votre carte de fidélité.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {DEMANDES.map((d) => (
                <button
                  key={d.titre}
                  onClick={() => ("href" in d ? router.push(d.href) : submit(d.envoi))}
                  className="cursor-pointer text-left transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3)",
                  }}
                >
                  <span
                    className="block text-[13px] font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {d.titre}
                  </span>
                  <span
                    className="mt-1 block text-[11px] leading-tight"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {d.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Le premier message répète mot pour mot ce que l'orbe vient de
            dire. On ne le montre qu'une fois la conversation engagée, où il
            reprend sa place d'ouverture de fil. */}
        {(messages.length <= 1 ? [] : messages).map((m) => (
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

              {m.proposerCreation && (
                <button
                  onClick={creerCarteMaintenant}
                  className="mt-2 cursor-pointer rounded-full px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
                >
                  Créer ma carte
                </button>
              )}

              {m.proposals && (
                <>
                  <p
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
                    style={{ color: "var(--warning, #b8860b)" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                    Catalogue local — mode démo, aucun appel IA
                  </p>
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
                      <RefreshCw size={12} /> Voir d&apos;autres exemples
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

              {m.cardApplied && (
                <div className="mt-2.5">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--success)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                    Conçue par FidiIA{aiModel ? ` · ${aiModel}` : ""}
                  </p>
                  <div className="w-[140px] overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    <MiniCard doc={m.cardApplied} width={140} preview />
                  </div>
                  <button
                    onClick={regenerateFidiia}
                    className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                    style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                  >
                    <RefreshCw size={12} /> Régénérer
                  </button>
                </div>
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

      {/* Le bloc de saisie.
          Suggestions et champ vivaient dans deux zones séparées par un trait ;
          réunis dans un seul cadre cerclé d'orange, ils se lisent comme
          l'endroit où l'on parle — c'est le centre de gravité de l'écran, et
          la seule chose qui fabrique la carte. */}
      <div
        className="m-3 mt-0 overflow-hidden"
        style={{
          border: "1px solid var(--accent)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-2)",
          boxShadow: "0 0 0 3px var(--accent-soft)",
        }}
      >
      {/* Les puces disparaissent tant que l'écran d'accueil est affiché : ses
          quatre cartes proposent déjà d'entrer en matière, et deux séries de
          raccourcis empilées poussaient le tout hors de l'écran. */}
      <div className={`flex-wrap gap-1.5 px-3 pt-3 ${messages.length <= 1 ? "hidden" : "flex"}`}>
        {QUICK.map((s) => (
          <button
            key={s.label}
            onClick={() => (s.open === "import" ? setImportCardOpen(true) : submit(s.send))}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {pendingImage && (
        <div className="flex items-center gap-2 px-3 pb-1">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage} alt={pendingImageRole === "photo" ? "Photo à envoyer" : "Logo à envoyer"} className="h-full w-full object-cover" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -right-1 -top-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-white"
              style={{ background: "var(--danger)" }}
              title="Retirer"
            >
              <X size={10} />
            </button>
          </div>
          <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {pendingImageRole === "photo" ? "Photo de l'établissement" : "Logo"} prêt(e) à envoyer avec votre prochain message.
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={TYPES_IMAGE_ACCEPTES.join(",")}
          onChange={onPickImage}
          className="hidden"
        />
        <button
          onClick={() => {
            roleImageChoisi.current = "logo";
            fileInputRef.current?.click();
          }}
          className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]"
          title="Envoyer le logo"
        >
          <Paperclip size={18} />
        </button>
        <button
          onClick={() => {
            roleImageChoisi.current = "photo";
            fileInputRef.current?.click();
          }}
          className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]"
          title="Envoyer une photo de l'établissement"
        >
          <Camera size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={busy}
          placeholder={busy ? "L'assistant réfléchit…" : "Décrivez votre entreprise…"}
          className="flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
          style={{ color: "var(--text)" }}
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
    </div>
  );
}
