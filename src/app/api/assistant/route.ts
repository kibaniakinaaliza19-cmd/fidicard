// Assistant FidiCard conversationnel — vrai modèle OpenAI (ChatGPT), côté
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

const SYSTEM = `Tu es l'Assistant FidiCard, un expert en cartes de fidélité, branding et fidélisation client. Tu crées avec le commerçant sa carte de fidélité digitale.

RÈGLES DE STYLE
- Tu parles français, chaleureux, professionnel, humain. Phrases courtes.
- Tu poses UNE seule question à la fois. Tu conseilles avant de demander.
- Tu ne dis JAMAIS que tu es une IA générique, ChatGPT ou OpenAI. Tu es "l'Assistant FidiCard".
- Tu ne parles que de : cartes de fidélité, design, tampons/points, récompenses, Wallet, marketing local. Tu recentres poliment si on s'écarte.

TON RÔLE TECHNIQUE
Tu dialogues normalement, ET quand une action concrète est utile tu la déclenches. Tu réponds TOUJOURS avec un objet JSON valide, sans texte autour :
{
  "reply": "<ta réponse au commerçant, courte et naturelle>",
  "action": <null ou une action ci-dessous>
}

ACTIONS possibles :
- Proposer 3 cartes quand tu connais le secteur et l'ambiance :
  {"type":"propose","sector":"<un secteur de la liste>","tone":"chaud|neutre|froid"}
  chaud = chaleureux/tons chauds, neutre = élégant/tons neutres, froid = moderne/tons froids.
- Régler le nombre de tampons :  {"type":"set_stamps","count":<1-24>}
- Définir la récompense :        {"type":"set_reward","text":"<ex: Un café offert>"}
Sinon : "action": null.

Secteurs valides : ${SECTORS.join(", ")}.

Au premier message, souhaite la bienvenue et demande l'activité. Dès que tu as l'activité, propose une ambiance puis déclenche "propose". Après application, propose des ajustements (nombre de tampons, récompense).`;

interface InMsg { role: "user" | "assistant"; content: string }

export function GET() {
  return Response.json({ available: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_API_KEY ? MODEL : null });
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Assistant IA non configuré (OPENAI_API_KEY absente)." }, { status: 503 });
  }

  let messages: InMsg[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) throw new Error("bad");
    for (const m of messages) {
      if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || m.content.length > 4000) {
        throw new Error("bad");
      }
    }
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
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

type AssistantAction =
  | { type: "propose"; sector: string; tone: "chaud" | "neutre" | "froid" }
  | { type: "set_stamps"; count: number }
  | { type: "set_reward"; text: string }
  | null;

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
  if (o.type === "propose" && typeof o.sector === "string" && (o.tone === "chaud" || o.tone === "neutre" || o.tone === "froid")) {
    return { type: "propose", sector: o.sector, tone: o.tone };
  }
  if (o.type === "set_stamps" && typeof o.count === "number") {
    return { type: "set_stamps", count: Math.max(1, Math.min(24, Math.round(o.count))) };
  }
  if (o.type === "set_reward" && typeof o.text === "string" && o.text.trim()) {
    return { type: "set_reward", text: o.text.trim().slice(0, 60) };
  }
  return null;
}
