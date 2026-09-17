// FidiIA conversationnelle — délègue entièrement à `lib/fidiia` : c'est le
// moteur qui décide, valide et construit la carte. Cette route ne fait que
// trois choses : reconstruire la session à partir du blob renvoyé par le
// client (aucun état ne vit côté serveur entre deux requêtes), appeler
// `envoyerMessage`, et convertir la carte éventuelle en `CardDoc` pour
// l'éditeur. La clé reste dans .env.local et n'est JAMAIS exposée au
// navigateur, ni renvoyée, ni journalisée.
//
// GET  → { available, configured, model }
//         configured=false            : pas de vrai modèle branché (repli
//                                        local voulu, pas une panne)
//         configured=true, available=false : branché mais en panne réelle
// POST → { reply, carte?, config?, refus?, verrousPoses, repli, session }
//         | { error }

import { creerMemoire, creerSession, envoyerMessage } from "@/lib/fidiia/index.ts";
import type { EtatBrut } from "@/lib/fidiia/state/conversationState.ts";
import type { SessionMemory } from "@/lib/fidiia/state/sessionMemory.ts";
import type { Carte } from "@/lib/fidiia/validation/schemas.ts";
import { configurationManquante } from "@/lib/fidiia/provider/openai.ts";
import { versCardDoc } from "@/lib/fidiia/adapters/toCardDoc.ts";

const OPENAI_BASE = "https://api.openai.com/v1";

function fidiiaProviderEstOpenAI(): boolean {
  return (process.env.FIDIIA_PROVIDER ?? "mock").trim().toLowerCase() === "openai";
}

// Vérifie que la clé fonctionne VRAIMENT (pas juste qu'elle existe) : une clé
// révoquée ou un modèle retiré doit se voir. Appel gratuit (métadonnées, pas
// de complétion), mis en cache quelques minutes pour ne pas payer ce contrôle
// à chaque chargement de page.
const HEALTH_TTL_MS = 5 * 60_000;
let healthCache: { available: boolean; checkedAt: number } | null = null;

async function checkFidiiaHealth(modele: string): Promise<boolean> {
  if (healthCache && Date.now() - healthCache.checkedAt < HEALTH_TTL_MS) {
    return healthCache.available;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(`${OPENAI_BASE}/models/${encodeURIComponent(modele)}`, {
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    healthCache = { available: res.ok, checkedAt: Date.now() };
    console.log(JSON.stringify({ scope: "assistant.health", event: "health_check", model: modele, ok: res.ok, status: res.status, at: new Date().toISOString() }));
    return res.ok;
  } catch (err) {
    healthCache = { available: false, checkedAt: Date.now() };
    console.log(JSON.stringify({ scope: "assistant.health", event: "health_check", model: modele, ok: false, status: 0, reason: err instanceof Error ? err.message : "erreur réseau", at: new Date().toISOString() }));
    return false;
  }
}

export async function GET() {
  const modele = process.env.FIDIIA_OPENAI_MODEL;
  const configured =
    fidiiaProviderEstOpenAI() &&
    configurationManquante({ cle: process.env.OPENAI_API_KEY, modele }).length === 0;
  const available = configured && modele ? await checkFidiiaHealth(modele) : false;
  return Response.json({ available, configured, model: available ? modele : null });
}

/* --------------------------------------------------------- session client */
//
// Aucun état ne vit côté serveur entre deux requêtes : le client reçoit ce
// blob dans chaque réponse et le renvoie tel quel dans la suivante. Toutes
// les pièces de `Session` (hors fournisseur, hors journal) sont des données
// JSON pures — pas de fonction à sérialiser.

interface SessionBlob {
  etat?: EtatBrut;
  memory?: {
    informations?: Record<string, unknown>;
    decisions?: Record<string, unknown>;
    preferences?: string[];
    verrous?: SessionMemory["verrous"];
  };
  historique?: { role: "user" | "assistant"; content: string }[];
  tours?: number;
  carteProposee?: boolean;
  carte?: Carte | null;
}

interface PostBody {
  message: string;
  session?: SessionBlob;
  /** Logo ou photo envoyé dans le chat — data URL déjà vérifiée (taille, type). */
  image?: string;
}

const MAX_HISTORIQUE = 60;
const MAX_CARACTERES = 4000;
/** 8 Mo décodés, comme partout ailleurs dans l'app (voir ImportCardModal). */
const MAX_TAILLE_IMAGE_BASE64 = 11 * 1024 * 1024;
const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Une image mal formée, trop lourde ou d'un type non accepté n'annule pas le
 * message : elle est simplement ignorée, et le motif part dans le journal.
 * Le commerçant garde sa conversation, il retente l'envoi s'il le souhaite.
 */
function normaliserImage(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const m = /^data:([a-z0-9+.-]+\/[a-z0-9+.-]+);base64,/i.exec(v);
  if (!m || !TYPES_IMAGE_ACCEPTES.includes(m[1].toLowerCase())) {
    console.log(JSON.stringify({ scope: "assistant.image", event: "type_refuse", type: m?.[1] ?? "inconnu", at: new Date().toISOString() }));
    return undefined;
  }
  if (v.length > MAX_TAILLE_IMAGE_BASE64) {
    console.log(JSON.stringify({ scope: "assistant.image", event: "taille_refusee", octets: v.length, at: new Date().toISOString() }));
    return undefined;
  }
  return v;
}

/** Coerce en texte exploitable, ou chaîne vide. Jamais d'exception. */
function normaliserTexte(v: unknown): string {
  if (typeof v === "string") return v.trim().slice(0, MAX_CARACTERES);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/**
 * Répare l'historique plutôt que de l'examiner : un rôle inconnu devient
 * « user » — c'est le commerçant qui parle par défaut —, un contenu non
 * textuel ou vide est écarté, un contenu trop long est tronqué, et seuls les
 * derniers messages sont gardés. Une conversation trop longue perd sa tête,
 * elle n'est jamais refusée.
 */
function normaliserHistorique(brut: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(brut)) return [];
  const propre: { role: "user" | "assistant"; content: string }[] = [];
  for (const e of brut) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const content = normaliserTexte(o.content);
    if (!content) continue;
    propre.push({ role: o.role === "assistant" ? "assistant" : "user", content });
  }
  return propre.slice(-MAX_HISTORIQUE);
}

function normaliserSession(brut: unknown): SessionBlob | undefined {
  if (!brut || typeof brut !== "object") return undefined;
  const o = brut as Record<string, unknown>;
  return {
    etat: o.etat && typeof o.etat === "object" ? (o.etat as EtatBrut) : undefined,
    memory: o.memory && typeof o.memory === "object" ? (o.memory as SessionBlob["memory"]) : undefined,
    historique: normaliserHistorique(o.historique),
    tours: typeof o.tours === "number" ? o.tours : undefined,
    carteProposee: typeof o.carteProposee === "boolean" ? o.carteProposee : undefined,
    carte: o.carte && typeof o.carte === "object" ? (o.carte as Carte) : undefined,
  };
}

type ValidationCorps = { ok: true; valeur: PostBody } | { ok: false; motif: string };

/**
 * Répare le corps reçu plutôt que de le rejeter : un rôle inconnu, un
 * contenu vide, un historique trop long se corrigent, ils ne bloquent rien.
 * Un seul refus reste possible — il n'y a littéralement rien à dire — et il
 * ne dépend d'aucune forme précise du corps, seulement de son contenu utile.
 * Le motif part dans le journal serveur, jamais dans la réponse.
 */
function validerCorps(brut: unknown): ValidationCorps {
  const o = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  const message = normaliserTexte(o.message);
  if (!message) return { ok: false, motif: "aucun texte exploitable dans le message" };
  return {
    ok: true,
    valeur: { message, session: normaliserSession(o.session), image: normaliserImage(o.image) },
  };
}

/** Extrait le code HTTP OpenAI embarqué dans le message d'erreur du provider. */
function statutDepuisErreur(err: unknown): number | null {
  const m = err instanceof Error ? err.message.match(/openai (\d{3})/) : null;
  return m ? Number(m[1]) : null;
}

export async function POST(req: Request) {
  // Un corps illisible n'est pas une panne, c'est un corps vide : la seule
  // conséquence est qu'il n'y aura rien à en tirer, traité plus bas comme
  // n'importe quel corps sans texte exploitable.
  const brut = await req.json().catch(() => null);
  const validation = validerCorps(brut);
  if (!validation.ok) {
    console.log(JSON.stringify({ scope: "assistant.validation", event: "rejet", motif: validation.motif, at: new Date().toISOString() }));
    return Response.json({ error: "Aucun message reçu — retapez votre phrase." }, { status: 400 });
  }
  const corps = validation.valeur;

  let session;
  try {
    session = creerSession({
      etat: corps.session?.etat,
      memory: corps.session?.memory ? creerMemoire(corps.session.memory) : undefined,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Assistant IA mal configuré côté serveur." },
      { status: 503 },
    );
  }
  session.historique = corps.session?.historique ?? [];
  session.tours = corps.session?.tours ?? 0;
  session.carteProposee = corps.session?.carteProposee ?? false;
  session.carte = corps.session?.carte ?? undefined;

  let resultat;
  try {
    resultat = await envoyerMessage(session, corps.message, corps.image);
  } catch (err) {
    const statut = statutDepuisErreur(err);
    if (statut === 401) return Response.json({ error: "Clé OpenAI invalide côté serveur." }, { status: 503 });
    if (statut === 429) return Response.json({ error: "Quota OpenAI atteint — réessayez dans un instant." }, { status: 429 });
    return Response.json({ error: "L'assistant n'a pas répondu." }, { status: 502 });
  }

  const conversion = session.carte ? versCardDoc(session.carte) : null;

  return Response.json({
    reply: resultat.reply,
    carte: conversion?.doc ?? null,
    config: conversion?.config ?? null,
    refus: resultat.refus ?? null,
    verrousPoses: resultat.verrousPoses,
    repli: resultat.repli,
    session: {
      etat: session.etat,
      memory: session.memory,
      historique: session.historique,
      tours: session.tours,
      carteProposee: session.carteProposee,
      carte: session.carte ?? null,
    },
  });
}
