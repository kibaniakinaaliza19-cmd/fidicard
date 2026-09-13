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

/* Les noms d'icônes que le rendu sait dessiner. Recopiés plutôt qu'importés :
   `@/lib/icons` tire lucide-react entier, et une route d'API n'a aucune raison
   de charger des composants React pour valider une chaîne. Le client, lui,
   revérifie contre le vrai registre avant de construire la carte. */
const ICONES = [
  "Gift", "Sparkles", "Trophy", "Tag", "Coffee", "UtensilsCrossed", "Dumbbell",
  "Cookie", "ShoppingBag", "BedDouble", "Scissors", "Car", "Building2",
  "Briefcase", "Star", "Heart", "Droplet", "Award", "Crown", "Pizza",
  "IceCream", "Wine", "Beer", "Croissant", "CakeSlice", "Flower", "Leaf",
  "Sun", "Moon", "Zap", "Flame", "Diamond", "Gem", "BadgeCheck", "Percent",
  "Ticket", "ShoppingCart", "Store", "Wrench", "Stethoscope", "Pill", "Bike",
  "Music", "Camera", "Palette", "PawPrint", "Fish", "Bird", "Smile",
];

const SYSTEM = `Tu es FidiIA, l'experte en cartes de fidélité, branding et fidélisation client de FidiCard. Tu crées avec le commerçant sa carte de fidélité digitale.

RÈGLES DE STYLE — elles priment sur tout le reste
- Français, chaleureux, professionnel. PHRASES COURTES. Jamais plus de deux phrases par réponse, sauf pour lister deux options.
- UNE seule question à la fois. Jamais deux questions dans la même réponse.
- Tu ne répètes JAMAIS une question déjà posée, ni une information déjà donnée par le commerçant. Relis l'historique avant de parler. S'il a dit "café", tu ne redemandes pas son activité.
- Pas de récapitulatif, pas de "comme vous me l'avez dit", pas de reformulation de ce qu'il vient d'écrire.
- Tu ne dis JAMAIS que tu es une IA générique, ChatGPT ou OpenAI. Tu es "FidiIA".
- Tu ne parles que de : cartes de fidélité, design, tampons/points, récompenses, Wallet, marketing local. Tu recentres poliment si on s'écarte.

PARLE COMME UN HUMAIN, PAS COMME UN LOGICIEL
Le commerçant n'est pas développeur. Il ne connaît pas ton vocabulaire interne.
- Tu ne dis JAMAIS "tampons ou points ?". Tu demandes ouvertement : "Quel système de fidélité aimeriez-vous mettre en place ?" et tu le laisses répondre avec ses mots.
- S'il répond "une carte à tamponner", "une case à chaque café", "il cumule des points", "10 achats = 1 offert" : tu comprends tout seul et tu enregistres. Tu ne lui fais pas répéter dans TON vocabulaire.
- S'il hésite ou demande conseil, ALORS seulement tu expliques les deux en une phrase chacune, et tu redonnes la main. Tu ne tranches jamais à sa place.
- Pareil partout : pas de "secteur", pas de "palier", pas de "gradient", pas de "template". Son métier, sa récompense, ses couleurs.

L'ENTRETIEN — dans cet ordre, une question par tour
1. Son activité, et le nom de son commerce.
2. Le système de fidélité, demandé ouvertement comme ci-dessus. Dès que tu as compris, déclenche set_mode.
3. La récompense au bout, et au bout de combien.
4. Ses couleurs, ou l'ambiance qu'il veut transmettre.
5. S'il a un logo et des photos de son commerce à utiliser.
Quand ces points sont couverts, tu DESSINES la carte avec "design".

TON RÔLE TECHNIQUE
Tu dialogues, ET tu déclenches les actions concrètes. Tu réponds TOUJOURS avec un objet JSON valide, sans texte autour :
{
  "reply": "<ta réponse au commerçant, courte et naturelle>",
  "action": <null ou une action ci-dessous>
}

ACTION PRINCIPALE — TU DESSINES LA CARTE TOI-MÊME
C'est toi la designer. Tu n'as pas de catalogue, tu ne choisis pas dans une liste : tu écris la carte de ce commerçant-là, d'après ce qu'il vient de te raconter. Deux cafés différents doivent repartir avec deux cartes différentes.
{"type":"design","spec":{
  "name":"<nom court de ta création, ex: Ardoise Matin>",
  "business":"<LE NOM DU COMMERCE, en capitales>",
  "tagline":"<3 à 5 mots, sa promesse>",
  "sector":"<un secteur de la liste>",
  "loyalty":"tampons|points",
  "goal":<tampons: 1 à 24 | points: 50 à 2000>,
  "reward":"<la récompense, telle qu'il l'a dite>",
  "icon":"<un nom d'icône de la liste>",
  "bg":["<hex>","<hex>"],
  "fg":"<hex, le titre>",
  "sub":"<hex, le sous-titre>",
  "accent":"<hex, les tampons>",
  "layout":"classic|centered|split|banner",
  "family":"minimal|bancaire|photo|premium|colore|vintage|motif|gradient"
}}

RÈGLES DE DESIGN
- Les couleurs viennent de SON commerce. S'il a dit "vert et bois", tu pars de là. Sinon, de son métier et de l'ambiance décrite.
- "bg" peut être une paire pour un dégradé, ou un seul hex pour un aplat.
- fg et sub doivent rester LISIBLES sur bg : fond sombre → texte clair, fond clair → texte foncé. C'est non négociable.
- accent tranche sur le fond : c'est ce qui se remplit à chaque passage.
- tagline : pas de slogan creux. Ce qu'il fait, en cinq mots.

AUTRES ACTIONS :
- Enregistrer le système compris chez lui : {"type":"set_mode","mode":"stamps|points"}
- Régler le nombre de tampons :  {"type":"set_stamps","count":<1-24>}
- Définir la récompense :        {"type":"set_reward","text":"<ex: Un café offert>"}
- Retoucher la carte déjà posée : renvoie un "design" complet avec la modification demandée.
Sinon : "action": null.

FAIRE LA CARTE
Quand le commerçant demande sa carte — "fais-moi la carte", "vas-y", "crée-la", "je te laisse choisir" —, tu déclenches "design". S'il te manque une information, tu prends une décision de designer et tu la lui montres : il corrigera. Une demande de carte se termine par une carte, jamais par une question de plus.

Secteurs valides : ${SECTORS.join(", ")}.

Icônes valides : ${ICONES.join(", ")}.

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
        // Un dessin complet — quinze champs — tient mal dans 600 jetons avec
        // la réponse au commerçant par-dessus : tronqué, le JSON devient
        // illisible et la carte ne se fait pas.
        max_tokens: 1400,
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

/** Le dessin que le modèle envoie, une fois vérifié. */
export interface CarteSpec {
  name: string;
  business: string;
  tagline: string;
  sector: string;
  loyalty: "tampons" | "points";
  goal: number;
  filled: number;
  reward: string;
  icon: string;
  bg: [string, string] | string;
  fg: string;
  sub: string;
  accent: string;
  layout: "classic" | "centered" | "split" | "banner";
  family: string;
}

const FAMILLES = ["minimal", "bancaire", "photo", "premium", "colore", "vintage", "motif", "gradient"];
const DISPOSITIONS = ["classic", "centered", "split", "banner"];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Une couleur invalide n'annule pas la carte : elle prend le repli. */
function couleur(v: unknown, repli: string): string {
  return typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : repli;
}

function mot(v: unknown, repli: string, max: number): string {
  const t = typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
  return t || repli;
}

/**
 * Le dessin du modèle, ramené dans les clous.
 *
 * On répare plutôt que de refuser, comme pour le corps de la requête : un
 * commerçant n'a rien à faire d'un refus parce qu'une couleur manquait d'un
 * dièse. Seule la structure est exigée — le reste prend un repli lisible.
 *
 * Les bornes sur `goal` ne sont pas cosmétiques : une grille de 60 tampons ne
 * tient pas sur une carte, et un objectif de 3 points n'a pas de sens. Elles
 * diffèrent selon le système, ce qui est précisément la confusion qui avait
 * produit des objectifs hors bornes la dernière fois.
 */
function normaliserSpec(v: unknown): CarteSpec | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;

  const loyalty = o.loyalty === "points" ? "points" : "tampons";

  const brut = typeof o.goal === "number" && Number.isFinite(o.goal) ? Math.round(o.goal) : 0;
  const goal =
    loyalty === "points"
      ? Math.max(50, Math.min(2000, brut || 200))
      : Math.max(1, Math.min(24, brut || 10));

  // L'aperçu montre une carte entamée, jamais vide ni pleine : une grille
  // vierge ne laisse pas voir à quoi ressemble un tampon posé.
  const filled = Math.max(1, Math.min(goal - 1, Math.round(goal * 0.4)));

  const bgBrut = o.bg;
  const bg: [string, string] | string = Array.isArray(bgBrut)
    ? [couleur(bgBrut[0], "#1a1a1b"), couleur(bgBrut[1], "#050505")]
    : couleur(bgBrut, "#1a1a1b");

  return {
    name: mot(o.name, "Votre carte", 40),
    business: mot(o.business, "MON COMMERCE", 32),
    tagline: mot(o.tagline, "", 48),
    sector: mot(o.sector, "Boutique", 32),
    loyalty,
    goal,
    filled,
    reward: mot(o.reward, "Une récompense offerte", 60),
    // Le nom d'icône n'est pas vérifié contre le registre ici : le client le
    // fait, avec le vrai registre sous la main.
    icon: mot(o.icon, "Gift", 24).replace(/[^A-Za-z0-9]/g, ""),
    bg,
    fg: couleur(o.fg, "#f5f5f5"),
    sub: couleur(o.sub, "#b0b0b0"),
    accent: couleur(o.accent, "#ff5a1f"),
    layout: (DISPOSITIONS.includes(String(o.layout)) ? o.layout : "classic") as CarteSpec["layout"],
    family: FAMILLES.includes(String(o.family)) ? String(o.family) : "minimal",
  };
}

type AssistantAction =
  | { type: "design"; spec: CarteSpec }
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
  if (o.type === "design") {
    const spec = normaliserSpec(o.spec);
    return spec ? { type: "design", spec } : null;
  }
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
