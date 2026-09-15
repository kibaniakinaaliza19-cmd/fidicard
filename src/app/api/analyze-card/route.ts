// Analyse vision d'une carte de fidélité — côté serveur uniquement.
// La clé API reste dans .env.local (ANTHROPIC_API_KEY) et n'est jamais
// exposée au navigateur : le client poste l'image ici, cette route interroge
// le modèle de vision et renvoie le JSON structuré (éléments + programme).
//
// GET  → { available: boolean }  (le client choisit vision ou moteur local)
// POST → { analysis: VisionAnalysis } | { error: string }

import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_PROMPT, type VisionAnalysis } from "@/lib/visionSchema";

// Modèle par défaut : le plus capable en compréhension d'image + logique
// métier. Surclassable via ANTHROPIC_VISION_MODEL (ex. "claude-sonnet-4-6"
// pour réduire le coût par import).
const VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || "claude-opus-4-8";

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET() {
  return Response.json({
    available: Boolean(process.env.ANTHROPIC_API_KEY),
    model: process.env.ANTHROPIC_API_KEY ? VISION_MODEL : null,
  });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Clé API absente côté serveur (ANTHROPIC_API_KEY dans .env.local)." },
      { status: 503 },
    );
  }

  let imageBase64: string, mediaType: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mediaType = body.mediaType;
    if (typeof imageBase64 !== "string" || !ALLOWED_MEDIA.has(mediaType)) {
      throw new Error("bad payload");
    }
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30_000, // 30 s par tentative
    maxRetries: 1, // un seul retry, puis le client bascule en mode local
  });

  try {
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "Le modèle a refusé d'analyser cette image." }, { status: 422 });
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const analysis = extractJson(text);
    if (!analysis) {
      return Response.json({ error: "Réponse du modèle illisible (JSON invalide)." }, { status: 502 });
    }
    return Response.json({ analysis });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Quota API atteint — réessayez dans un instant." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Clé API invalide côté serveur." }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Erreur du service d'analyse (${err.status ?? "réseau"}).` }, { status: 502 });
    }
    return Response.json({ error: "L'analyse a expiré ou échoué." }, { status: 502 });
  }
}

/** tolère prose/fences autour : extrait le premier objet JSON plausible */
function extractJson(text: string): VisionAnalysis | null {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed.elements)) parsed.elements = [];
    if (parsed.loyaltyProgram === undefined) parsed.loyaltyProgram = null;
    return parsed as VisionAnalysis;
  } catch {
    return null;
  }
}
