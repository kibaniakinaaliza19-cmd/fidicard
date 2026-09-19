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
  FormatImage,
  ImageResult,
  LLMProvider,
  Message,
  Tool,
  VisionResult,
} from "./types.ts";

const URL_BASE = "https://api.openai.com/v1";
const TIMEOUT_MS = 60_000;
/** La génération d'image est lente (30 à 60 s observées) : son propre délai. */
const TIMEOUT_IMAGE_MS = 180_000;

/** Tailles acceptées par l'API d'images. Le paysage 1536×1024 (ratio 1.5) est
 *  le plus proche du ratio d'une carte (85.6/53.98 ≈ 1.586). */
const TAILLES: Record<FormatImage, string> = {
  paysage: "1536x1024",
  portrait: "1024x1536",
  carre: "1024x1024",
};

function env(nom: string): string | undefined {
  const v = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.[nom];
  const t = v?.trim();
  return t ? t : undefined;
}

// Journal minimal, aligné sur celui de la route /api/assistant : jamais la
// clé, jamais le contenu de la conversation.
function journaliser(
  appel: "chat" | "vision" | "image",
  event: "start" | "success" | "error",
  modele: string,
  details: Record<string, unknown> = {},
) {
  console.log(
    JSON.stringify({ scope: `fidiia.openai.${appel}`, event, model: modele, at: new Date().toISOString(), ...details }),
  );
}

export interface OptionsOpenAI {
  cle?: string;
  modele?: string;
  /** Modèle distinct pour l'analyse d'image. Par défaut, le même. */
  modeleVision?: string;
  /**
   * Modèle de GÉNÉRATION d'image (famille gpt-image), distinct du modèle de
   * raisonnement : un modèle de chat ne sait pas produire d'image, et un
   * modèle d'image ne sait pas tenir une conversation. Les deux sont
   * nécessaires — voir la méthode `image()`.
   */
  modeleImage?: string;
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
  usage?: { completion_tokens?: number };
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

/**
 * `demanderAuModele` (index.ts) appelle toujours `chat(messages, [])` : le
 * contrat de sortie (prompts/contract.ts) ne passe pas par le function
 * calling natif d'OpenAI, il demande au modèle un objet `{ reply, action }`
 * écrit dans le texte de la réponse — exactement le format que produit déjà
 * le fournisseur simulé. Sans ce décodage, `action` resterait toujours
 * absent et la carte ne se construirait jamais qu'avec des champs vides.
 */
function decoderContenu(texte: string): { reply: string; action: unknown } {
  const nettoye = texte.replace(/```(?:json)?/g, "").trim();
  const debut = nettoye.indexOf("{");
  const fin = nettoye.lastIndexOf("}");
  if (debut === -1 || fin <= debut) return { reply: texte, action: null };
  try {
    const p = JSON.parse(nettoye.slice(debut, fin + 1)) as Record<string, unknown>;
    return { reply: typeof p.reply === "string" ? p.reply : texte, action: p.action ?? null };
  } catch {
    return { reply: texte, action: null };
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
  // Pas de repli sur `modele` ici, contrairement à la vision : un modèle de
  // raisonnement appelé sur /images/generations renvoie une erreur, pas une
  // image. Absent = l'habillage est simplement désactivé (voir `image()`).
  const modeleImage = options.modeleImage ?? env("FIDIIA_OPENAI_MODEL_IMAGE");
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
      journaliser("chat", "start", modele, { messages: messages.length });
      let data: ReponseChat;
      try {
        data = await poster({
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
      } catch (err) {
        journaliser("chat", "error", modele, { reason: (err as Error).message.slice(0, 300) });
        throw err;
      }
      journaliser("chat", "success", modele, { tokensSortie: data.usage?.completion_tokens });

      const msg = data.choices?.[0]?.message;
      const tokensSortie = data.usage?.completion_tokens;

      // Chemin natif : conservé pour le jour où `tools` ne sera plus vide.
      // Plusieurs appels natifs sont possibles dans une même réponse — on les
      // garde tous, pas seulement le premier.
      const appelsNatifs = (msg?.tool_calls ?? [])
        .map((tc) => tc.function)
        .filter((f): f is { name: string; arguments?: string } => typeof f?.name === "string");
      if (appelsNatifs.length) {
        return {
          reply: msg?.content ?? "",
          toolCalls: appelsNatifs.map((f) => ({ name: f.name, arguments: lireArguments(f.arguments) })),
          tokensSortie,
        };
      }

      // Chemin réel aujourd'hui : le contrat (prompts/contract.ts) demande un
      // objet `{ reply, action }` dans le texte de la réponse. `action` est un
      // objet unique OU un tableau d'objets (schemas.ts:MAX_ACTIONS_PAR_TOUR).
      const { reply, action } = decoderContenu(msg?.content ?? "");
      const bruts = action === null ? [] : Array.isArray(action) ? action : [action];
      const toolCalls = bruts
        .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
        .map((a) => ({ name: a.type, arguments: a as unknown }))
        .filter((tc): tc is { name: string; arguments: unknown } => typeof tc.name === "string");
      return { reply, ...(toolCalls.length ? { toolCalls } : {}), tokensSortie };
    },

    async vision(image: string, prompt: string): Promise<VisionResult> {
      // `image` est une URL ou une data: URL — les deux sont acceptées telles
      // quelles par l'API.
      journaliser("vision", "start", modeleVision);
      let data: ReponseChat;
      try {
        data = await poster({
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
      } catch (err) {
        journaliser("vision", "error", modeleVision, { reason: (err as Error).message.slice(0, 300) });
        throw err;
      }
      journaliser("vision", "success", modeleVision);

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

    async image(prompt: string, format: FormatImage): Promise<ImageResult> {
      if (!modeleImage) {
        throw new Error(
          "[fidiia] FIDIIA_OPENAI_MODEL_IMAGE non défini : l'habillage visuel " +
            "est désactivé. Listez les modèles d'image disponibles avec " +
            "« npm run fidiia:modeles » (famille gpt-image) et renseignez-en un.",
        );
      }
      journaliser("image", "start", modeleImage, { format });
      const ctrl = new AbortController();
      const minuteur = setTimeout(() => ctrl.abort(), TIMEOUT_IMAGE_MS);
      try {
        const r = await appeler(`${urlBase}/images/generations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
          body: JSON.stringify({ model: modeleImage, prompt, size: TAILLES[format], n: 1 }),
          signal: ctrl.signal,
        });
        if (!r.ok) {
          const detail = (await r.text().catch(() => "")).slice(0, 500);
          throw new Error(`[fidiia] openai ${r.status} : ${detail}`);
        }
        const data = (await r.json()) as {
          data?: { b64_json?: string; url?: string }[];
          usage?: { output_tokens?: number };
        };
        const b64 = data.data?.[0]?.b64_json;
        const url = data.data?.[0]?.url;
        let dataUrl: string;
        if (b64) {
          dataUrl = `data:image/png;base64,${b64}`;
        } else if (url) {
          // Certains modèles renvoient une URL temporaire : on la matérialise
          // tout de suite, sinon elle expire avant que le client l'affiche.
          const img = await appeler(url, { signal: ctrl.signal });
          const buf = Buffer.from(await img.arrayBuffer());
          dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
        } else {
          throw new Error("[fidiia] openai : réponse image sans b64_json ni url");
        }
        journaliser("image", "success", modeleImage, { tokensSortie: data.usage?.output_tokens });
        return { dataUrl, tokensSortie: data.usage?.output_tokens };
      } catch (err) {
        journaliser("image", "error", modeleImage, { reason: (err as Error).message.slice(0, 300) });
        throw err;
      } finally {
        clearTimeout(minuteur);
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
