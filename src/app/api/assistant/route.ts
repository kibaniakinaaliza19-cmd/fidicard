// Assistant FidiCard conversationnel — vrai modèle de langage, côté serveur.
//
// La clé API reste dans .env.local (ANTHROPIC_API_KEY) et n'est JAMAIS exposée
// au navigateur : le client poste l'historique de conversation ici, cette route
// interroge le modèle et renvoie { reply, action? }. Le client exécute l'action
// sur le moteur (appliquer un modèle, régler les tampons, la récompense).
//
// GET  → { available: boolean }  (sans clé, le client bascule sur l'assistant
//         déterministe local — l'app fonctionne quand même).
// POST → { reply: string, action?: AssistantAction } | { error }

import Anthropic from "@anthropic-ai/sdk";

// Modèle rapide adapté au dialogue ; surclassable via ANTHROPIC_ASSISTANT_MODEL.
const MODEL = process.env.ANTHROPIC_ASSISTANT_MODEL || "claude-haiku-4-5-20251001";

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
- Tu ne dis JAMAIS que tu es une IA générique, ChatGPT, Claude ou OpenAI. Tu es "l'Assistant FidiCard".
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

Au premier message, souhaite la bienvenue et demande l'activité. Dès que tu as l'activité, propose une ambiance puis déclenche "propose". Après application, propose des ajustements (nombre de tampons, récompense, couleurs).`;

interface InMsg { role: "user" | "assistant"; content: string }

export function GET() {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY), model: process.env.ANTHROPIC_API_KEY ? MODEL : null });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Assistant IA non configuré (ANTHROPIC_API_KEY absente)." }, { status: 503 });
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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ reply: "Je préfère rester sur la création de votre carte 🙂", action: null });
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsed = extractJson(text);
    if (!parsed) return Response.json({ reply: text.slice(0, 500) || "…", action: null });
    return Response.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Trop de demandes — réessayez dans un instant." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Clé API invalide côté serveur." }, { status: 503 });
    }
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
