// FidiIA conversationnelle — délègue entièrement à `lib/fidiia` : c'est le
// moteur qui décide, valide et construit la carte. Cette route ne fait que
// quatre choses : reconstruire la session à partir du blob renvoyé par le
// client (aucun état ne vit côté serveur entre deux requêtes), appeler
// `envoyerMessage`, enregistrer un prospect nouvellement qualifié dans
// Supabase (§ enregistrerProspect, best-effort, jamais bloquant), et
// convertir la carte éventuelle en `CardDoc` pour l'éditeur. La clé OpenAI
// reste dans .env.local et n'est JAMAIS exposée au navigateur, ni renvoyée,
// ni journalisée.
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
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabaseAdmin";

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
  /** Identifie la conversation pour le CRM (§ enregistrerProspect), pas le
   *  commerçant : purement un jeton d'UPSERT, jamais lu ni interprété. */
  sessionId?: string;
}

interface PostBody {
  message: string;
  session?: SessionBlob;
  /** Logo ou photo envoyé dans le chat — data URL déjà vérifiée (taille, type). */
  image?: string;
  /** Quel des deux — décide si `image` alimente etat.logo ou etat.photo. */
  imageRole?: "logo" | "photo";
  /** Un message qui pré-remplit l'état sans compter dans le budget de tours
   *  avant génération forcée — voir lib/fidiia/index.ts:envoyerMessage. */
  silencieux?: boolean;
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

/** Un UUID v4 valide, ou rien : un jeton mal formé se remplace, il ne casse
 *  jamais la requête. Voir POST — un sessionId absent ou invalide en reçoit
 *  un nouveau, généré côté serveur. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    sessionId: typeof o.sessionId === "string" && UUID_RE.test(o.sessionId) ? o.sessionId : undefined,
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
    valeur: {
      message,
      session: normaliserSession(o.session),
      image: normaliserImage(o.image),
      imageRole: o.imageRole === "photo" ? "photo" : "logo",
      silencieux: o.silencieux === true,
    },
  };
}

/* -------------------------------------------------------- prospect (§ CRM) */
//
// Prénom et contact, captés par l'action `qualifier` (lib/fidiia), ne
// vivaient jusqu'ici que dans le blob de session renvoyé au navigateur : rien
// ne les conservait côté serveur, un prospect qui fermait l'onglet sans aller
// jusqu'au bout de la conversation ne laissait aucune trace exploitable.
//
// UPSERT sur `session_id`, pas INSERT : un prénom donné à un tour puis un
// contact donné cinq tours plus tard doivent finir sur LA MÊME ligne, jamais
// deux. `session_id` identifie la conversation (un jeton, généré une fois par
// POST — voir plus bas), pas le prospect lui-même. Rejoué à chaque tour une
// fois qu'un prénom ou un contact est connu : les champs de qualification
// arrivés plus tard (panier moyen, objectif…) se posent sur la même ligne.
//
// Clé `service_role`, jamais la clé anonyme : cette table n'a AUCUNE policy
// RLS pour `anon` (voir db/schema.sql) — un visiteur ne peut ni la lire ni y
// écrire directement. Seule cette route, côté serveur, y touche.
//
// Ni Supabase indisponible ni la table absente ne doivent casser la
// conversation : un prospect perdu pour le CRM reste préférable à une
// réponse qui échoue pour une raison que le commerçant ne peut pas voir.
async function enregistrerProspect(sessionId: string, etat: EtatBrut): Promise<void> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  if (!etat.prenom && !etat.contact) return;

  try {
    const { error } = await supabaseAdmin.from("prospects").upsert(
      {
        session_id: sessionId,
        prenom: etat.prenom ?? null,
        contact: etat.contact ?? null,
        secteur: etat.secteur ?? null,
        clients_par_semaine: etat.clientsParSemaine ?? null,
        nb_points_vente: etat.nbPointsVente ?? null,
        panier_moyen: etat.panierMoyen ?? null,
        objectif_principal: etat.objectifPrincipal ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );
    if (error) {
      console.log(JSON.stringify({ scope: "assistant.prospect", event: "echec_enregistrement", motif: error.message, at: new Date().toISOString() }));
    }
  } catch (err) {
    console.log(JSON.stringify({ scope: "assistant.prospect", event: "erreur_reseau", motif: err instanceof Error ? err.message : "inconnue", at: new Date().toISOString() }));
  }
}

/** Extrait le code HTTP OpenAI embarqué dans le message d'erreur du provider. */
function statutDepuisErreur(err: unknown): number | null {
  const m = err instanceof Error ? err.message.match(/openai (\d{3})/) : null;
  return m ? Number(m[1]) : null;
}

/**
 * Code stable que le client peut distinguer sans jamais voir le détail
 * technique — voir components/parcours/EtapeConversation.tsx. Un même
 * statut HTTP 429 recouvre deux réalités très différentes chez OpenAI (une
 * limite de fréquence passagère, ou un compte à court de crédit) : le corps
 * de la réponse le dit, mais seulement dans un texte libre destiné aux
 * développeurs, jamais montré au commerçant tel quel.
 */
type CodeErreurAssistant = "INDISPONIBLE" | "CREDITS_EPUISES" | "SATURE" | "SERVEUR";

function codeErreur(err: unknown, statut: number | null): CodeErreurAssistant {
  const message = err instanceof Error ? err.message : "";
  if (statut === 401) return "INDISPONIBLE";
  if (statut === 429 && /insufficient_quota/i.test(message)) return "CREDITS_EPUISES";
  if (statut === 429) return "SATURE";
  return "SERVEUR";
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

  // Un jeton par conversation, généré une seule fois : le premier message
  // n'en porte aucun, le serveur en crée un et le client le réutilise à
  // chaque tour suivant (round-trip dans `session`, voir la réponse
  // ci-dessous — AssistantChat.tsx transmet déjà ce blob tel quel, aucun
  // changement d'interface n'était nécessaire pour ce chantier).
  const sessionId = corps.session?.sessionId ?? crypto.randomUUID();

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
    resultat = await envoyerMessage(session, corps.message, corps.image, corps.imageRole, corps.silencieux);
  } catch (err) {
    const statut = statutDepuisErreur(err);
    const code = codeErreur(err, statut);
    // Le motif technique part dans le journal serveur, jamais dans la
    // réponse : "openai 429 : insufficient_quota…" ne dit rien d'actionnable
    // à un commerçant, et révèle l'infrastructure pour rien.
    console.warn(JSON.stringify({ scope: "assistant.erreur", code, statut, at: new Date().toISOString() }));
    if (code === "SATURE") return Response.json({ error: "Trop de demandes en ce moment.", code }, { status: 429 });
    return Response.json({ error: "L'assistant n'a pas répondu.", code }, { status: statut === 401 ? 503 : 502 });
  }

  await enregistrerProspect(sessionId, session.etat);

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
      sessionId,
      carte: session.carte ?? null,
    },
  });
}
