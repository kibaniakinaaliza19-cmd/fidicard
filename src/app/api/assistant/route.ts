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
}

type ValidationCorps = { ok: true; valeur: PostBody } | { ok: false; motif: string };

// Un seul message « Requête invalide. » côté client masquait laquelle des
// conditions avait échoué — indiagnosticable depuis le navigateur. Le motif
// précis part maintenant dans le journal serveur (jamais dans la réponse :
// on ne débogue pas le client avec la forme exacte du contrat serveur).
function validerCorps(brut: unknown): ValidationCorps {
  if (!brut || typeof brut !== "object") return { ok: false, motif: "corps absent ou non objet" };
  const o = brut as Record<string, unknown>;
  if (typeof o.message !== "string") return { ok: false, motif: "message absent ou non chaîne (ancien format « messages[] » ?)" };
  if (!o.message.trim()) return { ok: false, motif: "message vide" };
  if (o.message.length > 4000) return { ok: false, motif: `message trop long (${o.message.length} car.)` };
  const session = o.session;
  if (session !== undefined && (typeof session !== "object" || session === null)) {
    return { ok: false, motif: "session présente mais non objet" };
  }
  const s = session as SessionBlob | undefined;
  if (s?.historique !== undefined) {
    if (!Array.isArray(s.historique)) return { ok: false, motif: "session.historique non tableau" };
    if (s.historique.length > 60) return { ok: false, motif: `session.historique trop long (${s.historique.length} messages)` };
    for (const [i, m] of s.historique.entries()) {
      if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || m.content.length > 4000) {
        return { ok: false, motif: `session.historique[${i}] invalide` };
      }
    }
  }
  return { ok: true, valeur: { message: o.message, session: s } };
}

/** Extrait le code HTTP OpenAI embarqué dans le message d'erreur du provider. */
function statutDepuisErreur(err: unknown): number | null {
  const m = err instanceof Error ? err.message.match(/openai (\d{3})/) : null;
  return m ? Number(m[1]) : null;
}

export async function POST(req: Request) {
  let validation: ValidationCorps;
  try {
    validation = validerCorps(await req.json());
  } catch (err) {
    validation = { ok: false, motif: `JSON illisible : ${err instanceof Error ? err.message : "erreur"}` };
  }
  if (!validation.ok) {
    console.log(JSON.stringify({ scope: "assistant.validation", event: "rejet", motif: validation.motif, at: new Date().toISOString() }));
    return Response.json({ error: "Requête invalide." }, { status: 400 });
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
    resultat = await envoyerMessage(session, corps.message);
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
