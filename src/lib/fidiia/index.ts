// Point d'entrée de FidiIA.
//
// Une session enchaîne : détection des verrous (déterministe, hors modèle) →
// décision → appel éventuel du fournisseur → validation → application →
// contrôle qualité.
//
// Budget d'appels : DEUX au maximum par message. Un appel, une relance si la
// sortie est rejetée, puis un repli sans appel. Aucun troisième essai.

import type { ChatResult, LLMProvider, Message } from "./provider/types.ts";
import { getProvider } from "./provider/index.ts";
import type { AnalyseImage, ConversationState, EtatBrut } from "./state/conversationState.ts";
import { creerEtat, majEtat } from "./state/conversationState.ts";
import type { SessionMemory } from "./state/sessionMemory.ts";
import { creerMemoire, leverVerrou, noterInformation } from "./state/sessionMemory.ts";
import { construirePrompt, PROMPT_VERSION } from "./prompts/build.ts";
import { decide, formulerQuestion, type Decision, type NextStep } from "./engine/decide.ts";
import {
  appliquerAction,
  appliquerVerrousDetectes,
  detecterLevees,
  detecterModificationCiblee,
} from "./engine/actions.ts";
import type { Action, Carte, Cible, Design } from "./validation/schemas.ts";
import { validerLotActions } from "./validation/schemas.ts";
import { controlerCarte, motifsEchec, toutValide, type Verdict } from "./validation/quality.ts";
import { suggestionPour, trouverSecteur } from "./corpus/index.ts";

export const MAX_APPELS_PAR_MESSAGE = 2;

/** Utilisé seulement quand ni le modèle ni le corpus n'ont de design à
 *  proposer (secteur non reconnu) — le dernier filet, pas le premier. */
const DESIGN_PAR_DEFAUT: Design = {
  accent: "#e0492f",
  fond: "#2a1a12",
  texte: "#ffffff",
  icone: "Gift",
  ambiance: "chaud",
};

export interface Session {
  readonly provider: LLMProvider;
  etat: ConversationState;
  memory: SessionMemory;
  historique: Message[];
  tours: number;
  carteProposee: boolean;
  carte?: Carte;
  /** Journal minimal : ni contenu de conversation, ni secret. */
  journal: EntreeJournal[];
}

export interface EntreeJournal {
  tour: number;
  step: NextStep;
  appels: number;
  /** Types des actions transmises ce tour, dans l'ordre — vide si aucune.
   *  Plusieurs sont possibles depuis que `composer` doit pouvoir arriver au
   *  même tour que l'action qui complète les informations minimales. */
  actions: string[];
  rejet?: string;
  repli?: boolean;
  versionPrompt: string;
}

export interface Reponse {
  reply: string;
  decision: Decision;
  actions: Action[];
  /** Renseigné quand une action a été refusée (verrou, sortie invalide). */
  refus?: { code: string; motif: string };
  verrousPoses: Cible[];
  verdicts: Verdict[];
  appels: number;
  repli: boolean;
}

export function creerSession(
  init: { etat?: EtatBrut; memory?: SessionMemory; provider?: LLMProvider } = {},
): Session {
  return {
    provider: init.provider ?? getProvider(),
    etat: creerEtat(init.etat ?? {}),
    memory: init.memory ?? creerMemoire(),
    historique: [],
    tours: 0,
    carteProposee: false,
    journal: [],
  };
}

/* ------------------------------------------------------ carte déterministe */

/**
 * Construction de carte sans modèle. Sert à deux choses : produire la carte
 * quand la décision est CREATION, et servir de repli quand le fournisseur
 * renvoie deux fois une sortie invalide. Une carte issue d'ici est valide par
 * construction.
 */
export function construireCarte(etat: ConversationState, ciblesModifiees: Cible[] = []): Carte {
  const mode = etat.systemeFidelite ?? "stamps";

  // Le corpus avant l'invention. 864 modèles écrits secteur par secteur : pour
  // un fast-food, il sait dire « Le 8ᵉ tacos offert » là où un défaut générique
  // dirait « Une prestation offerte ». Une suggestion du corpus ne s'impose
  // jamais : elle ne sert que si le commerçant n'a rien dit.
  const suggestion = suggestionPour(trouverSecteur(etat.secteur ?? ""), mode);

  // Le défaut générique dépend du mode : 10 est un nombre de passages
  // raisonnable, mais un programme de points ne descend pas sous 50.
  const objectif = etat.objectif ?? suggestion?.objectif ?? (mode === "points" ? 100 : 10);
  const recompense =
    etat.recompense ??
    // On ne reprend la récompense du corpus que si l'objectif vient du corpus
    // aussi. Greffer « Le 10ᵉ café offert » sur un objectif de 6 donnerait une
    // carte qui se contredit elle-même.
    (etat.objectif === undefined ? suggestion?.recompense : undefined) ??
    { texte: "Une prestation offerte", libelleCourt: "Offert" };
  const paliersExistants = (etat.paliers ?? []).filter((p) => p.position < objectif);

  // Un seul système par carte. En mode points, aucune zone de tampons n'est
  // produite : c'est un compteur qui porte la progression. Mélanger les deux
  // rendrait la carte incompréhensible pour le client au comptoir.
  const enTampons = mode === "stamps";

  return {
    nomCommerce: etat.nomCommerce ?? "Mon commerce",
    calques: [
      { id: "fond", nom: "Fond", type: "fond" },
      // La photo de l'établissement passe avant le reste : c'est elle qui fait
      // reconnaître le commerce. Elle n'apparaît que si le commerçant en a
      // fourni une — jamais inventée.
      ...(etat.photo ? [{ id: "photo", nom: "Photo de l'établissement", type: "image" as const }] : []),
      { id: "nom", nom: "Nom du commerce", type: "texte" as const },
      { id: "regle", nom: "Règle du programme", type: "texte" as const },
      ...(etat.logo ? [{ id: "logo", nom: "Logo", type: "image" as const }] : []),
      ...(enTampons ? [] : [{ id: "compteur", nom: "Compteur de points", type: "texte" as const }]),
      { id: "instruction", nom: "Instruction de scan", type: "texte" as const },
      { id: "code", nom: "Code-barres", type: "codebarres" as const },
    ],
    zonesFidelite: enTampons ? ["zone-fidelite"] : [],
    // Le modèle décide s'il a transmis un design (action `design`, déjà
    // validé et corrigé pour le contraste — voir engine/actions.ts). Sinon,
    // et seulement sinon, le corpus comble : c'est le filet de sécurité
    // annoncé, pas le chemin normal.
    design:
      etat.design ??
      (suggestion
        ? { accent: suggestion.accent, fond: DESIGN_PAR_DEFAUT.fond, texte: DESIGN_PAR_DEFAUT.texte, icone: suggestion.icone, ambiance: etat.ambiance ?? DESIGN_PAR_DEFAUT.ambiance }
        : { ...DESIGN_PAR_DEFAUT, ambiance: etat.ambiance ?? DESIGN_PAR_DEFAUT.ambiance }),
    // Composition transmise par le modèle (action `composer`). Absente :
    // toCardDoc.ts applique son repli codé en dur — ce fichier ne synthétise
    // aucune composition de secours, ça n'a jamais été demandé au corpus.
    composition: etat.composition,
    // L'habillage ne compte que si l'image a réellement été produite : une
    // demande sans image n'est pas affichable, la carte retombe alors sur la
    // composition de calques.
    habillage: etat.habillage?.image ? { ...etat.habillage, image: etat.habillage.image } : undefined,
    programme: {
      mode,
      objectif,
      paliers: [
        ...paliersExistants,
        {
          position: objectif,
          label: recompense.libelleCourt,
          description: recompense.texte,
        },
      ],
      recompense,
    },
    ciblesModifiees,
  };
}

/* ------------------------------------------------------------ appel modèle */

async function demanderAuModele(
  session: Session,
  motifRejet?: string,
): Promise<ChatResult> {
  const messages = construirePrompt({
    etat: session.etat,
    memory: session.memory,
    historique: session.historique,
    motifRejet,
  });
  return session.provider.chat(messages, []);
}

interface SortieModele {
  reply: string;
  actions: Action[];
  appels: number;
  rejet?: string;
  repli: boolean;
  /** Tokens de sortie de l'appel qui a produit ces actions, si le fournisseur
   *  les communique — sert à mesurer le coût de `composer` (voir plus bas). */
  tokensSortie?: number;
}

function bruts(resultat: ChatResult): unknown[] {
  return resultat.toolCalls?.map((tc) => tc.arguments) ?? [];
}

/**
 * Un appel, une relance si la sortie est rejetée, puis un repli. Jamais de
 * troisième essai. Ce chemin est le MÊME quelle que soit l'étape : une sortie
 * invalide pendant une question doit être traitée comme une sortie invalide
 * pendant une création.
 *
 * Le modèle peut transmettre plusieurs actions dans le même tour (schemas.ts:
 * MAX_ACTIONS_PAR_TOUR) — la seule façon pour `composer` d'arriver à temps
 * pour la première construction de la carte, vu que le contrat ne permettait
 * jusqu'ici qu'une action par tour. Un lot invalide, même partiellement,
 * invalide le tour entier : pas d'application à moitié d'un tour mal formé.
 */
async function obtenirActionValidee(session: Session): Promise<SortieModele> {
  const premier = await demanderAuModele(session);
  const bruts1 = bruts(premier);
  if (!bruts1.length) {
    return { reply: premier.reply, actions: [], appels: 1, repli: false, tokensSortie: premier.tokensSortie };
  }

  const v1 = validerLotActions(bruts1);
  if (v1.ok) {
    return { reply: premier.reply, actions: v1.valeur, appels: 1, repli: false, tokensSortie: premier.tokensSortie };
  }

  // Une relance, une seule, avec le motif exact du rejet.
  const second = await demanderAuModele(session, v1.motif);
  const bruts2 = bruts(second);
  const v2 = bruts2.length ? validerLotActions(bruts2) : null;
  if (v2?.ok) {
    return {
      reply: second.reply || premier.reply,
      actions: v2.valeur,
      appels: 2,
      repli: false,
      tokensSortie: second.tokensSortie,
    };
  }

  // Deux échecs : repli. Aucun troisième appel.
  return {
    reply:
      "Je n'ai pas réussi à appliquer ça proprement. Je pars sur une base sûre, dites-moi ce que vous voulez changer.",
    actions: [],
    appels: 2,
    rejet: v2?.motif ?? v1.motif,
    repli: true,
  };
}

/* --------------------------------------------------------------- traitement */

// Trace minimale de chaque étape qui peut faire disparaître une carte sans
// que rien ne le dise. Jamais le texte de la conversation, jamais la clé —
// seulement l'événement et son motif quand il y en a un.
function journaliser(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ scope: "fidiia.envoyerMessage", event, at: new Date().toISOString(), ...details }));
}

const PROMPT_VISION_IMAGE =
  'Analyse ce logo ou cette photo de commerce. Réponds UNIQUEMENT avec un objet JSON : ' +
  '{"couleurs":["#rrggbb", ...], "style":"<en quelques mots>", "ambiance":"<en quelques mots>", "gamme":"<niveau perçu>"}. ' +
  "2 à 4 couleurs dominantes, en hexadécimal.";

function analyseImageValide(brut: unknown): AnalyseImage | null {
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  const couleurs = Array.isArray(o.couleurs)
    ? o.couleurs.filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 4)
    : [];
  if (couleurs.length === 0) return null;
  return {
    couleurs,
    style: typeof o.style === "string" ? o.style.slice(0, 120) : "",
    ambiance: typeof o.ambiance === "string" ? o.ambiance.slice(0, 120) : "",
    gamme: typeof o.gamme === "string" ? o.gamme.slice(0, 120) : "",
  };
}

export async function envoyerMessage(
  session: Session,
  texte: string,
  image?: string,
  imageRole: "logo" | "photo" = "logo",
): Promise<Reponse> {
  session.tours += 1;
  session.historique.push({ role: "user", content: texte });

  // 1. Les verrous se posent AVANT tout appel : ils ne dépendent pas du modèle.
  const { memory: memApresVerrous, poses } = appliquerVerrousDetectes(texte, session.memory);
  session.memory = memApresVerrous;

  // 2. Levée de verrou : uniquement sur demande explicite du commerçant.
  for (const cible of detecterLevees(texte)) {
    const r = leverVerrou(session.memory, cible, true);
    if (r.ok) session.memory = r.memory;
  }

  // 2bis. Un logo ou une photo envoyé dans le chat s'analyse tout de suite,
  // avant la décision : le modèle doit voir « couleurs de l'image » dans son
  // prochain prompt, pas au tour d'après. Distinct de l'étape ANALYSE
  // (photo d'une carte EXISTANTE, plus bas) : ici c'est une simple image de
  // marque, pas un document à décoder champ par champ.
  if (image) {
    try {
      const res = await session.provider.vision(image, PROMPT_VISION_IMAGE);
      const analyse = analyseImageValide(res.data);
      if (analyse) {
        session.etat = majEtat(session.etat, {
          analyseImage: analyse,
          logo: imageRole === "logo" ? (session.etat.logo ?? "reçu") : session.etat.logo,
          photo: imageRole === "photo" ? (session.etat.photo ?? "reçu") : session.etat.photo,
        });
        session.memory = noterInformation(session.memory, "image", `analysée (${imageRole})`);
        journaliser("image_analysee", { couleurs: analyse.couleurs.length, role: imageRole });
      } else {
        journaliser("image_illisible");
      }
    } catch (err) {
      journaliser("image_erreur", { reason: (err as Error).message?.slice(0, 200) });
    }
  }

  const demandeModification = detecterModificationCiblee(texte).length > 0;
  const decision = decide(session.etat, session.memory, {
    tours: session.tours,
    carteProposee: session.carteProposee,
    demandeModification,
    carteExiste: session.carte !== undefined,
  });

  let appels = 0;
  let repli = false;
  let actions: Action[] = [];
  let refus: Reponse["refus"];
  let reply = "";
  let rejet: string | undefined;

  if (decision.step === "ANALYSE") {
    // L'analyse d'image ne passe pas par le contrat d'actions : elle alimente
    // directement l'état, puis la conversation reprend son cours.
    const source = String(session.etat.logo ?? "carte.jpg");
    const res = await session.provider.vision(source, "analyse de carte");
    appels = 1;
    const data = res.data as Record<string, unknown> | null;
    if (data && typeof data === "object" && !("erreur" in data)) {
      session.etat = majEtat(session.etat, {
        carteAnalysee: true,
        nomCommerce: typeof data.nomCommerce === "string" ? data.nomCommerce : undefined,
        systemeFidelite: data.systemeFidelite === "points" ? "points" : "stamps",
        objectif: typeof data.objectif === "number" ? data.objectif : undefined,
        recompense:
          data.recompense && typeof data.recompense === "object"
            ? (data.recompense as { texte: string; libelleCourt: string })
            : undefined,
        logo: typeof data.logo === "string" ? data.logo : undefined,
      });
      session.memory = noterInformation(session.memory, "carteAnalysee", true);
      reply = "J'ai lu votre carte. Je reprends ce qui existe déjà.";
    } else {
      session.etat = majEtat(session.etat, { carteAnalysee: true });
      reply =
        "Je n'arrive pas à lire cette photo. Recadrez-la, ou dites-moi simplement votre métier.";
    }
  } else {
    const sortie = await obtenirActionValidee(session);
    appels = sortie.appels;
    actions = sortie.actions;
    repli = sortie.repli;
    rejet = sortie.rejet;
    // Le champ manquant est connu en code : si le modèle ne dit rien d'utile,
    // la question part quand même.
    reply =
      sortie.reply ||
      (decision.step === "QUESTION" && decision.champ ? formulerQuestion(decision.champ) : "");
    if (repli) refus = { code: "INVALIDE", motif: rejet ?? "sortie invalide" };
    journaliser("action_recue", {
      step: decision.step,
      appels,
      actions: actions.map((a) => a.type),
      repli,
      rejet,
    });
    // Mesure du coût de `composer` : les tokens de sortie de CET appel ont
    // servi à produire la composition, pas seulement une phrase — c'est ce
    // chiffre qui dit si le modèle est tenable en production pour ce geste.
    if (actions.some((a) => a.type === "composer") && sortie.tokensSortie !== undefined) {
      journaliser("composer_cout", { tokensSortie: sortie.tokensSortie, modele: session.provider.id });
    }
  }

  // 3. Application des actions, dans l'ordre, tant qu'aucune n'est refusée.
  // Un refus arrête le lot : les actions déjà appliquées avant lui restent
  // acquises (chacune est indépendante), mais on ne continue pas d'appliquer
  // une suite dont le motif de refus a changé le contexte.
  const appliquees: Action[] = [];
  // Une correction automatique (contraste, recadrage) ne doit jamais rester
  // silencieuse pour le commerçant — seulement dans les logs. Voir
  // engine/actions.ts:ResultatAction.noteCommercante.
  const notesCorrections: string[] = [];
  for (const action of actions) {
    const r = appliquerAction(action, session.etat, session.memory);
    if (r.ok) {
      session.etat = r.etat;
      session.memory = r.memory;
      appliquees.push(action);
      if (action.type === "proposer") session.carteProposee = true;
      if (r.noteCommercante) notesCorrections.push(r.noteCommercante);
      journaliser("action_appliquee", { type: action.type, effet: r.effet });
    } else {
      refus = { code: r.code, motif: r.motif };
      journaliser("action_refusee", { type: action.type, code: r.code, motif: r.motif });
      if (r.code === "VERROU") {
        reply = `${r.motif} Dites-moi si vous voulez que je le déverrouille.`;
      } else if (action.type === "modifier") {
        // Le modèle a pu répondre comme si la retouche avait eu lieu (voir
        // engine/actions.ts, cas `modifier` sur une composition) : ce texte
        // ne doit jamais rester affiché, une fausse confirmation est pire
        // qu'une absence de réponse.
        reply = "Je n'ai pas pu appliquer cette retouche directement. Redites-le-moi et je recompose la carte avec ce changement.";
      }
      break;
    }
  }
  actions = appliquees;

  // 3ter. L'habillage vient d'être demandé mais l'image n'existe pas encore :
  // c'est ici qu'on appelle le modèle d'image, hors de `appliquerAction` qui
  // est pure. Un échec ne fait pas tomber le tour — la carte se rendra par la
  // composition de calques, en moins beau mais en état de marche.
  if (session.etat.habillage && !session.etat.habillage.image) {
    const demande = session.etat.habillage;
    try {
      const res = await session.provider.image(demande.prompt, "paysage");
      session.etat = majEtat(session.etat, { habillage: { ...demande, image: res.dataUrl } });
      journaliser("habillage_genere", {
        tokensSortie: res.tokensSortie,
        modele: session.provider.id,
        caracteresPrompt: demande.prompt.length,
      });
    } catch (err) {
      journaliser("habillage_echec", { reason: (err as Error).message?.slice(0, 200) });
      // La demande est retirée : la garder ferait retenter l'appel à chaque
      // tour suivant, et le commerçant paierait plusieurs fois le même échec.
      session.etat = majEtat(session.etat, { habillage: undefined });
      notesCorrections.push(
        "Je n'ai pas réussi à produire l'habillage visuel ; la carte est rendue dans un style plus sobre.",
      );
    }
  }

  // Un design ou une composition transmis APRÈS la création de la carte (rare
  // maintenant que `composer` peut arriver dans le même tour que le dernier
  // champ requis, mais toujours possible sur un ajustement ultérieur) doivent
  // quand même se voir. On ne reconstruit pas toute la carte : seuls ces deux
  // champs changent, jamais la structure décidée à la création.
  if (session.carte) {
    if (actions.some((a) => a.type === "design")) {
      session.carte = { ...session.carte, design: session.etat.design };
    }
    if (actions.some((a) => a.type === "composer")) {
      session.carte = { ...session.carte, composition: session.etat.composition };
    }
    // Même raison pour l'habillage — mais on ne le pose que si l'image a
    // réellement été produite : un habillage sans image n'est pas affichable.
    const h = session.etat.habillage;
    if (actions.some((a) => a.type === "habillage") && h?.image) {
      session.carte = { ...session.carte, habillage: { ...h, image: h.image } };
    }
  }

  // 3bis. `decide()` a jugé sur l'état d'AVANT ce tour : si l'action qu'on
  // vient d'appliquer vient de réunir la dernière information manquante,
  // `creationAutorisee` bascule à `true` maintenant, pas au tour prochain.
  // Sans ce rattrapage, la carte n'apparaît qu'au message suivant — et si le
  // commerçant n'en envoie pas d'autre qui déclenche une action, elle
  // n'apparaît jamais. On ne re-décide que QUESTION → CREATION : les autres
  // étapes (MODIFICATION, VALIDATION, ANALYSE) restent celles calculées par
  // `decide()`, elles ne dépendent pas de `creationAutorisee`.
  const decisionEffective: Decision =
    decision.step === "QUESTION" && session.etat.creationAutorisee && session.carte === undefined
      ? { step: "CREATION", motif: "les informations minimales ont été réunies pendant ce tour" }
      : decision;

  // 4. Carte et contrôle qualité.
  let verdicts: Verdict[] = [];
  if (decisionEffective.step === "CREATION" || repli) {
    const cibles = decisionEffective.step === "MODIFICATION" ? detecterModificationCiblee(texte) : [];
    let carte = construireCarte(session.etat, cibles);
    verdicts = controlerCarte(carte, session.memory, { photoFournie: Boolean(session.etat.photo) });

    // Un échec ici ne doit JAMAIS rester muet : construireCarte est
    // déterministe, donc rejouer avec le même état produirait le même
    // échec. Le seul repli sûr est de reconstruire sans secteur — la
    // configuration générique, prouvée valide par construction — plutôt
    // que de laisser le commerçant devant une carte qui n'arrive jamais.
    if (!toutValide(verdicts)) {
      journaliser("carte_rejetee", { motifs: motifsEchec(verdicts) });
      carte = construireCarte({ ...session.etat, secteur: undefined }, cibles);
      verdicts = controlerCarte(carte, session.memory, { photoFournie: Boolean(session.etat.photo) });
      journaliser("carte_repli_generique", { valide: toutValide(verdicts) });
    }

    if (toutValide(verdicts)) {
      session.carte = carte;
      session.carteProposee = true;
      journaliser("carte_construite", {
        mode: carte.programme.mode,
        objectif: carte.programme.objectif,
      });
      // La confirmation vient du produit, pas du modèle : elle décrit ce qui a
      // réellement été construit, donc elle ne peut pas mentir.
      if (!repli) {
        reply = `Votre carte est prête : ${carte.programme.objectif} ${
          carte.programme.mode === "points" ? "points" : "passages"
        }, ${carte.programme.recompense.texte.toLowerCase()}. Dites-moi ce que vous voulez ajuster.`;
        // Le corpus ne doit jamais se substituer en silence au modèle pour le
        // visuel : si ni `design` ni `composer` n'ont été transmis, la palette
        // vient du corpus ou du défaut générique (construireCarte) — le
        // commerçant doit le savoir, pas croire que c'est un choix d'Astra.
        if (session.etat.design === undefined && session.etat.composition === undefined) {
          reply += " J'ai choisi une palette générique en attendant vos préférences — dites-moi vos couleurs ou votre logo pour que je personnalise le design.";
        }
      }
    } else {
      // Même le repli générique a échoué : ça n'arrive dans aucun test
      // connu, mais si ça arrive un jour, le commerçant doit le savoir au
      // lieu d'attendre une carte qui ne vient jamais.
      journaliser("carte_repli_echec", { motifs: motifsEchec(verdicts) });
      refus = { code: "INVALIDE", motif: motifsEchec(verdicts).join(" ; ") };
      reply = "Je n'arrive pas à finaliser la carte pour l'instant. Dites-moi votre secteur autrement, ou réessayez.";
    }
  } else if (decisionEffective.step === "MODIFICATION" && session.carte) {
    const carte: Carte = { ...session.carte, ciblesModifiees: detecterModificationCiblee(texte) };
    verdicts = controlerCarte(carte, session.memory, { photoFournie: Boolean(session.etat.photo) });
    if (toutValide(verdicts)) session.carte = carte;
    else refus = { code: "VERROU", motif: motifsEchec(verdicts).join(" ; ") };
  }

  // Une correction automatique se voit dans la conversation, pas seulement
  // dans les logs serveur — voir engine/actions.ts:noteCommercante.
  if (notesCorrections.length && !refus) {
    reply = `${reply} ${notesCorrections.join(" ")}`.trim();
  }

  // Un verrou posé se confirme toujours au commerçant : une interdiction
  // silencieuse ne se distingue pas d'une interdiction ignorée.
  if (poses.length && !refus) {
    reply = `C'est noté : je ne touche plus à ${poses.join(", ")}. ${reply}`.trim();
  }

  session.historique.push({ role: "assistant", content: reply });
  session.journal.push({
    tour: session.tours,
    step: decisionEffective.step,
    appels,
    actions: actions.map((a) => a.type),
    rejet,
    repli: repli || undefined,
    versionPrompt: PROMPT_VERSION,
  });

  return { reply, decision: decisionEffective, actions, refus, verrousPoses: poses, verdicts, appels, repli };
}

export { creerEtat, majEtat } from "./state/conversationState.ts";
export { creerMemoire, estVerrouille, poserVerrou } from "./state/sessionMemory.ts";
export { decide } from "./engine/decide.ts";
export { controlerCarte, toutValide } from "./validation/quality.ts";
export type { Action, Carte, Cible } from "./validation/schemas.ts";
export type { ConversationState } from "./state/conversationState.ts";
export type { SessionMemory } from "./state/sessionMemory.ts";
export type { Verdict } from "./validation/quality.ts";
