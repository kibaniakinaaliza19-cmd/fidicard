// Adaptateur OpenAI.
//
// AUCUN identifiant de modèle n'est écrit en dur ici. Le nom du modèle est lu
// dans FIDIIA_OPENAI_MODEL et rien d'autre. Raison : un identifiant deviné qui
// n'existe pas produit une erreur 404 au premier appel réel, et un identifiant
// qui existe mais n'est pas celui qu'on croit coûte de l'argent en silence.
//
// Pour savoir ce que VOTRE clé peut réellement appeler :
//     npm run fidiia:modeles
// La liste vient de l'API, pas d'une documentation ni d'une supposition.
//
// La clé ne sort jamais d'ici : ni dans une réponse, ni dans un log, ni dans
// un message d'erreur. Elle est lue côté serveur uniquement — jamais de
// NEXT_PUBLIC_.

import type {
  ChatResult,
  LLMProvider,
  Message,
  Tool,
  VisionResult,
} from "./types.ts";

const URL_BASE = "https://api.openai.com/v1";
const TIMEOUT_MS = 60_000;

function env(nom: string): string | undefined {
  const v = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[nom];
  const t = v?.trim();
  return t ? t : undefined;
}

export interface OptionsOpenAI {
  cle?: string;
  modele?: string;
  /** Modèle distinct pour l'analyse d'image. Par défaut, le même. */
  modeleVision?: string;
  urlBase?: string;
  fetchImpl?: typeof fetch;
}

/** Ce qui manque pour appeler OpenAI, en clair. Vide si tout est là. */
export function configurationManquante(o: OptionsOpenAI = {}): string[] {
  const manque: string[] = [];
  if (!(o.cle ?? env("OPENAI_API_KEY"))) manque.push("OPENAI_API_KEY");
  if (!(o.modele ?? env("FIDIIA_OPENAI_MODEL"))) manque.push("FIDIIA_OPENAI_MODEL");
  return manque;
}

/* ------------------------------------------------------------- réponse API */

interface ReponseChat {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: { function?: { name?: string; arguments?: string } }[];
    };
  }[];
}

/**
 * `arguments` arrive en JSON sérialisé. Un modèle produit parfois du JSON
 * cassé : on renvoie la chaîne brute plutôt que de lever. La validation Zod
 * qui suit rejettera proprement, avec un motif exploitable pour la relance.
 */
function lireArguments(brut: string | undefined): unknown {
  if (!brut) return {};
  try {
    return JSON.parse(brut);
  } catch {
    return brut;
  }
}

/* --------------------------------------------------------------- provider */

export function creerOpenAIProvider(options: OptionsOpenAI = {}): LLMProvider {
  const manque = configurationManquante(options);
  if (manque.length) {
    throw new Error(
      `[fidiia] fournisseur openai : ${manque.join(" et ")} non défini(e). ` +
        "Le modèle ne doit pas être deviné — listez ceux auxquels votre clé " +
        "donne accès avec « npm run fidiia:modeles », puis renseignez " +
        "FIDIIA_OPENAI_MODEL dans .env.local.",
    );
  }

  const cle = options.cle ?? env("OPENAI_API_KEY")!;
  const modele = options.modele ?? env("FIDIIA_OPENAI_MODEL")!;
  const modeleVision = options.modeleVision ?? env("FIDIIA_OPENAI_MODEL_VISION") ?? modele;
  const urlBase = options.urlBase ?? env("FIDIIA_OPENAI_BASE_URL") ?? URL_BASE;
  const appeler = options.fetchImpl ?? fetch;

  async function poster(corps: unknown): Promise<ReponseChat> {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await appeler(`${urlBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cle}`,
        },
        body: JSON.stringify(corps),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        // Le corps d'erreur d'OpenAI ne contient pas la clé, mais on le tronque
        // par prudence : un message d'erreur finit toujours par être collé
        // quelque part.
        const detail = (await r.text().catch(() => "")).slice(0, 500);
        throw new Error(`[fidiia] openai ${r.status} : ${detail}`);
      }
      return (await r.json()) as ReponseChat;
    } finally {
      clearTimeout(minuteur);
    }
  }

  return {
    // Le modèle apparaît dans l'id : le journal doit permettre d'attribuer une
    // régression à un changement de modèle. Jamais la clé.
    id: `openai:${modele}`,

    async chat(messages: Message[], tools: Tool[]): Promise<ChatResult> {
      const data = await poster({
        model: modele,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        ...(tools.length
          ? {
              tools: tools.map((t) => ({
                type: "function",
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                },
              })),
            }
          : {}),
      });

      const msg = data.choices?.[0]?.message;
      const appel = msg?.tool_calls?.[0]?.function;

      return {
        reply: msg?.content ?? "",
        ...(appel?.name
          ? { toolCall: { name: appel.name, arguments: lireArguments(appel.arguments) } }
          : {}),
      };
    },

    async vision(image: string, prompt: string): Promise<VisionResult> {
      // `image` est une URL ou une data: URL — les deux sont acceptées telles
      // quelles par l'API.
      const data = await poster({
        model: modeleVision,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      });

      const texte = data.choices?.[0]?.message?.content ?? "";
      // La sortie vision n'est pas contrainte par un outil : elle peut être du
      // texte libre. On tente le JSON, et on renvoie une erreur exploitable
      // sinon — le moteur sait déjà traiter `{ erreur }`.
      try {
        return { data: JSON.parse(texte) };
      } catch {
        return { data: { erreur: "sortie vision illisible", texte: texte.slice(0, 2000) } };
      }
    },
  };
}

/* ---------------------------------------------------- liste des modèles */

export interface ModeleDisponible {
  id: string;
  cree?: string;
}

/**
 * Ce à quoi la clé donne réellement accès. C'est la seule source d'autorité :
 * ni une documentation, ni un article, ni une supposition.
 */
export async function listerModeles(options: OptionsOpenAI = {}): Promise<ModeleDisponible[]> {
  const cle = options.cle ?? env("OPENAI_API_KEY");
  if (!cle) throw new Error("[fidiia] OPENAI_API_KEY non défini.");
  const urlBase = options.urlBase ?? env("FIDIIA_OPENAI_BASE_URL") ?? URL_BASE;
  const appeler = options.fetchImpl ?? fetch;

  const r = await appeler(`${urlBase}/models`, {
    headers: { Authorization: `Bearer ${cle}` },
  });
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).slice(0, 500);
    throw new Error(`[fidiia] openai ${r.status} : ${detail}`);
  }
  const data = (await r.json()) as { data?: { id?: string; created?: number }[] };
  return (data.data ?? [])
    .filter((m): m is { id: string; created?: number } => typeof m.id === "string")
    .map((m) => ({
      id: m.id,
      cree: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
