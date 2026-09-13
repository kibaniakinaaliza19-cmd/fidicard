// FidiIA conversationnelle — vrai modèle OpenAI (ChatGPT), côté
// serveur. La clé reste dans .env.local (OPENAI_API_KEY) et n'est JAMAIS
// exposée au navigateur : le client poste l'historique, cette route interroge
// l'API OpenAI et renvoie { reply, action? }. Le client exécute l'action sur
// le moteur (appliquer un modèle, régler les tampons, la récompense).
//
// GET  → { available: boolean }  (sans clé, le client bascule sur l'assistant
//         déterministe local — l'app fonctionne quand même).
// POST → { reply: string, action?: AssistantAction } | { error }

// Modèle par défaut ; surclassable via OPENAI_ASSISTANT_MODEL (ex. "gpt-5",
// "gpt-4o", "gpt-4.1"). "gpt-4o-mini" est rapide et économique pour le chat.
const MODEL = process.env.OPENAI_ASSISTANT_MODEL || "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SECTORS = [
  "Café", "Boulangerie", "Pâtisserie", "Restaurant", "Pizzeria", "Fast-food",
  "Bar", "Salon de coiffure", "Barbier", "Institut de beauté", "Onglerie",
  "Spa", "Sport & Fitness", "Hôtel", "Garage", "Fleuriste", "Pharmacie",
  "Opticien", "Librairie", "Animalerie", "Tattoo", "Boutique", "Formations",
];

const SYSTEM = `Tu es FidiIA, l'experte en cartes de fidélité, branding et fidélisation client de FidiCard. Tu crées avec le commerçant sa carte de fidélité digitale.

RÈGLES DE STYLE — elles priment sur tout le reste
- Français, chaleureux, professionnel. PHRASES COURTES. Jamais plus de deux phrases par réponse, sauf pour lister deux options.
- UNE seule question à la fois. Jamais deux questions dans la même réponse.
- Tu ne répètes JAMAIS une question déjà posée, ni une information déjà donnée par le commerçant. Relis l'historique avant de parler. S'il a dit "café", tu ne redemandes pas son activité.
- Pas de récapitulatif, pas de "comme vous me l'avez dit", pas de reformulation de ce qu'il vient d'écrire.
- Tu ne dis JAMAIS que tu es une IA générique, ChatGPT ou OpenAI. Tu es "FidiIA".
- Tu ne parles que de : cartes de fidélité, design, tampons/points, récompenses, Wallet, marketing local. Tu recentres poliment si on s'écarte.

L'ENTRETIEN — dans cet ordre, une question par tour
1. L'activité (café, salon, garage…).
2. Le système de fidélité : tampons ou points ? TU NE CHOISIS PAS À SA PLACE. Tu expliques la différence en une phrase, puis tu demandes. Les tampons : une case par passage, simple et visuel. Les points : un point par euro dépensé, plus fin pour les paniers variables. Dès qu'il répond, déclenche set_mode.
3. La récompense au bout, et après combien de passages ou de points.
4. Les couleurs de son commerce, ou l'ambiance qu'il veut transmettre.
5. S'il a un logo et des photos de son commerce à utiliser. Tu demandes AVANT de proposer un visuel — une carte à sa marque vaut mieux qu'une carte générique.
Quand ces points sont couverts, déclenche "propose".

TON RÔLE TECHNIQUE
Tu dialogues, ET tu déclenches les actions concrètes. Tu réponds TOUJOURS avec un objet JSON valide, sans texte autour :
{
  "reply": "<ta réponse au commerçant, courte et naturelle>",
  "action": <null ou une action ci-dessous>
}

ACTIONS possibles :
- Proposer 3 cartes, une fois l'entretien couvert :
  {"type":"propose","sector":"<un secteur de la liste>","tone":"chaud|neutre|froid"}
  chaud = chaleureux/tons chauds, neutre = élégant/tons neutres, froid = moderne/tons froids.
- APPLIQUER une carte, c'est-à-dire la fabriquer pour de bon :
  {"type":"apply","choice":<1, 2 ou 3>}
  choice désigne l'une des trois propositions affichées, dans l'ordre.
- Enregistrer le système choisi PAR LE COMMERÇANT : {"type":"set_mode","mode":"stamps|points"}
- Régler le nombre de tampons :  {"type":"set_stamps","count":<1-24>}
- Définir la récompense :        {"type":"set_reward","text":"<ex: Un café offert>"}
Sinon : "action": null.

FAIRE LA CARTE
Quand le commerçant demande sa carte — "fais-moi la carte", "vas-y", "crée-la", "je te laisse choisir" —, tu ne te contentes pas de proposer : tu déclenches "apply". Si aucune proposition n'est encore affichée, "apply" en fabrique une directement à partir du secteur ; ajoute alors "sector" et "tone" à l'action :
  {"type":"apply","choice":1,"sector":"Café","tone":"chaud"}
Une demande de carte doit toujours se terminer par une carte, jamais par une question de plus.

Secteurs valides : ${SECTORS.join(", ")}.

Au premier message, souhaite la bienvenue en une phrase et demande l'activité.`;

interface InMsg { role: "user" | "assistant"; content: string }

/** Limites d'OpenAI, pas les nôtres : on tronque pour les respecter. */
const MAX_MESSAGES = 40;
const MAX_CARACTERES = 4000;

/** Un corps illisible n'est pas une erreur fatale : c'est un corps vide. */
async function lireCorps(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function texte(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/**
 * Tout ce qui ressemble à un historique en devient un.
 *
 * Chaque entrée est réparée plutôt qu'examinée : le rôle inconnu devient
 * « user » — c'est le commerçant qui parle, par défaut —, le contenu est
 * converti en texte et tronqué, et ce qui reste vide est simplement écarté.
 * Seuls les derniers messages sont gardés : couper la tête d'une conversation
 * trop longue vaut mieux que la refuser en entier.
 */
function normaliserHistorique(corps: unknown): InMsg[] {
  let brut: unknown = corps;

  if (corps && typeof corps === "object" && !Array.isArray(corps)) {
    const o = corps as Record<string, unknown>;
    brut = o.messages ?? o.message ?? o.texte ?? o.text ?? o.historique ?? o.history;

    // Dernier recours : aucun nom connu ne correspond. Plutôt que de refuser,
    // on prend la première valeur qui ressemble à quelque chose à dire. Un
    // client qui renomme son champ ne doit pas casser la conversation.
    if (brut === undefined) {
      brut =
        Object.values(o).find((v) => Array.isArray(v) && v.length > 0) ??
        Object.values(o).find((v) => typeof v === "string" && v.trim());
    }
  }

  // Une simple phrase vaut un historique d'un seul message.
  if (typeof brut === "string") {
    const t = brut.trim().slice(0, MAX_CARACTERES);
    return t ? [{ role: "user", content: t }] : [];
  }

  if (!Array.isArray(brut)) return [];

  const propres: InMsg[] = [];
  for (const e of brut) {
    if (typeof e === "string") {
      const t = e.trim().slice(0, MAX_CARACTERES);
      if (t) propres.push({ role: "user", content: t });
      continue;
    }
    if (!e || typeof e !== "object") continue;

    const o = e as Record<string, unknown>;
    const contenu = texte(o.content ?? o.text ?? o.texte).trim().slice(0, MAX_CARACTERES);
    if (!contenu) continue;

    propres.push({
      role: o.role === "assistant" ? "assistant" : "user",
      content: contenu,
    });
  }

  return propres.slice(-MAX_MESSAGES);
}

export function GET() {
  return Response.json({ available: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_API_KEY ? MODEL : null });
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Assistant IA non configuré (OPENAI_API_KEY absente)." }, { status: 503 });
  }

  /* On répare, on ne rejette pas.
   *
   * Cette route renvoyait « Requête invalide. » dès qu'un détail du corps ne
   * lui plaisait pas : un rôle inattendu, un historique d'un message de trop,
   * un champ nommé autrement. Six conditions, un seul message, et le
   * commerçant face à un mur — alors que dans tous ces cas il y avait bien une
   * phrase exploitable dans la requête.
   *
   * Une route de conversation n'a aucune raison d'être pointilleuse sur la
   * forme. Elle prend ce qui ressemble à un historique, jette ce qui est
   * inutilisable, tronque ce qui dépasse, et parle au modèle. Elle ne refuse
   * que s'il ne reste littéralement rien à dire — cas où le motif est écrit en
   * clair plutôt que caché derrière un mot générique.
   *
   * Les formes acceptées : { messages: [...] }, { message: "..." },
   * { messages: "..." }, et un tableau nu. Un client qui change de convention
   * ne casse plus la conversation. */
  const messages = normaliserHistorique(await lireCorps(req));

  if (messages.length === 0) {
    console.warn("[assistant] aucun message exploitable dans le corps reçu");
    return Response.json(
      { error: "Aucun message reçu — retapez votre phrase." },
      { status: 400 },
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.status === 401) return Response.json({ error: "Clé OpenAI invalide côté serveur." }, { status: 503 });
    if (res.status === 429) return Response.json({ error: "Quota OpenAI atteint — réessayez dans un instant." }, { status: 429 });
    if (!res.ok) return Response.json({ error: `Erreur du service (${res.status}).` }, { status: 502 });

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text);
    if (!parsed) return Response.json({ reply: text.slice(0, 500) || "…", action: null });
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "L'assistant n'a pas répondu." }, { status: 502 });
  }
}

type Tonalite = "chaud" | "neutre" | "froid";

type AssistantAction =
  | { type: "propose"; sector: string; tone: Tonalite }
  | { type: "apply"; choice: number; sector?: string; tone?: Tonalite }
  | { type: "set_mode"; mode: "stamps" | "points" }
  | { type: "set_stamps"; count: number }
  | { type: "set_reward"; text: string }
  | null;

const estTon = (v: unknown): v is Tonalite =>
  v === "chaud" || v === "neutre" || v === "froid";

function extractJson(text: string): { reply: string; action: AssistantAction } | null {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const p = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof p.reply !== "string") return null;
    return { reply: p.reply, action: normalizeAction(p.action) };
  } catch {
    return null;
  }
}

function normalizeAction(a: unknown): AssistantAction {
  if (!a || typeof a !== "object") return null;
  const o = a as Record<string, unknown>;
  if (o.type === "propose" && typeof o.sector === "string" && estTon(o.tone)) {
    return { type: "propose", sector: o.sector, tone: o.tone };
  }
  /* « Fais-moi la carte » doit aboutir à une carte.
   *
   * Le rang est ramené dans 1..3 plutôt que refusé : un modèle qui répond
   * "choice": 0 demande la première, pas rien. Le secteur et l'ambiance sont
   * facultatifs — ils ne servent qu'au cas où aucune proposition n'est encore
   * affichée, et le client sait s'en passer s'il en a déjà. */
  if (o.type === "apply") {
    const rang = typeof o.choice === "number" && Number.isFinite(o.choice) ? o.choice : 1;
    return {
      type: "apply",
      choice: Math.max(1, Math.min(3, Math.round(rang))),
      ...(typeof o.sector === "string" && o.sector ? { sector: o.sector } : {}),
      ...(estTon(o.tone) ? { tone: o.tone } : {}),
    };
  }
  if (o.type === "set_mode" && (o.mode === "stamps" || o.mode === "points")) {
    return { type: "set_mode", mode: o.mode };
  }
  if (o.type === "set_stamps" && typeof o.count === "number") {
    return { type: "set_stamps", count: Math.max(1, Math.min(24, Math.round(o.count))) };
  }
  if (o.type === "set_reward" && typeof o.text === "string" && o.text.trim()) {
    return { type: "set_reward", text: o.text.trim().slice(0, 60) };
  }
  return null;
}
