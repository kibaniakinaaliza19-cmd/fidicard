// Fournisseur simulé. Aucun réseau, aucune clé, aucun coût.
//
// Il ne fait pas semblant d'être intelligent : il applique une table de règles
// sur le dernier message et renvoie une réponse déterministe. Deux appels
// identiques donnent le même résultat — c'est ce qui rend les tests fiables.
//
// Il produit délibérément des sorties INVALIDES sur certains déclencheurs :
// sans ça, on ne testerait jamais que la validation rejette.

import type { ChatResult, LLMProvider, Message, Tool, VisionResult } from "./types.ts";

function normaliser(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const SECTEURS: Record<string, string> = {
  coiffeur: "Salon de coiffure",
  coiffure: "Salon de coiffure",
  salon: "Salon de coiffure",
  boulanger: "Boulangerie",
  boulangerie: "Boulangerie",
  boucher: "Boucherie",
  boucherie: "Boucherie",
  cafe: "Café",
  restaurant: "Restaurant",
  pizzeria: "Pizzeria",
  fleuriste: "Fleuriste",
  institut: "Institut de beauté",
  cils: "Institut de beauté",
  barbier: "Barbier",
  garage: "Garage",
};

function detecterSecteur(t: string): string | undefined {
  const n = normaliser(t);
  for (const [mot, secteur] of Object.entries(SECTEURS)) {
    if (n.includes(mot)) return secteur;
  }
  return undefined;
}

function detecterAmbiance(t: string): "chaud" | "neutre" | "froid" | undefined {
  const n = normaliser(t);
  if (/chaleureu|chaud|convivial|familial/.test(n)) return "chaud";
  if (/elegant|premium|haut de gamme|neutre|sobre/.test(n)) return "neutre";
  if (/moderne|froid|epure|minimal/.test(n)) return "froid";
  return undefined;
}

function detecterNombre(t: string): number | undefined {
  const m = normaliser(t).match(/\b(\d{1,2})\b/);
  return m ? Number(m[1]) : undefined;
}

/**
 * Sur le texte BRUT, pas normalisé : le nom doit garder sa casse et ses
 * accents d'origine — c'est ce qui s'affiche sur la carte, pas une clé de
 * recherche.
 */
const RE_NOM_COMMERCE = /(?:s'appelle|se nomme|le nom (?:est|de la carte est))\s+([^,.;!?]{2,60})/i;

function detecterNomCommerce(texteBrut: string): string | undefined {
  const m = texteBrut.match(RE_NOM_COMMERCE);
  return m ? m[1].trim() : undefined;
}

/** Une composition valide, pour les scénarios de test qui déclenchent
 *  l'action `composer` sans dépendre d'un vrai modèle génératif. */
function compositionExemple() {
  return {
    fond: { type: "degrade" as const, de: "#1b4d3e", vers: "#0d2a21", angle: 135 },
    calques: [
      {
        role: "nom" as const,
        texte: "Le Petit Grain",
        x: 8, y: 10, largeur: 60, hauteur: 8,
        police: "playfair", graisse: "bold" as const, taille: 8,
        couleur: "#fff5e1", alignement: "gauche" as const,
      },
      {
        role: "recompense" as const,
        texte: "10 passages = un café offert",
        x: 8, y: 24, largeur: 70, hauteur: 5,
        police: "geist", graisse: "normal" as const, taille: 4,
        couleur: "#e8dcc4", alignement: "gauche" as const,
      },
    ],
    zoneFidelite: {
      x: 10, y: 55, largeur: 80, hauteur: 20,
      forme: "cercle" as const, colonnes: 5,
      icone: "Coffee", couleurRempli: "#1b4d3e", couleurVide: "#3a5850",
    },
  };
}

/** Réponses figées, indexées par déclencheur. L'ordre compte : première règle
 *  qui matche.
 *
 *  `contexte` est l'ensemble des messages du commerçant : un vrai modèle voit
 *  l'historique, le simulé aussi. C'est ce qui lui permet de retrouver le
 *  secteur cité trois messages plus tôt. */
function repondre(dernier: string, contexte: string): ChatResult {
  const n = normaliser(dernier);

  // --- déclencheurs de test : sorties volontairement invalides -------------
  // 1500 dépasse même la borne large du mode points (1000, schemas.ts) :
  // invalide au niveau du schéma, quel que soit le mode — c'est ce niveau
  // que ces déclencheurs testent. Un objectif refusé pour SON mode (ex. 99
  // en tampons) est une autre famille de rejet, testée dans engine.test.ts.
  if (n.includes("__invalide_objectif__")) {
    return {
      reply: "Voilà, j'ai réglé l'objectif.",
      toolCalls: [{ name: "objectif", arguments: { type: "objectif", valeur: 1500 } }],
    };
  }
  if (n.includes("__invalide_libelle__")) {
    return {
      reply: "Récompense enregistrée.",
      toolCalls: [
        {
          name: "recompense",
          arguments: {
            type: "recompense",
            recompense: { texte: "Une coupe offerte", libelleCourt: "COUPE OFFERTE" },
          },
        },
      ],
    };
  }
  if (n.includes("__action_inconnue__")) {
    return {
      reply: "Je publie la carte.",
      toolCalls: [{ name: "publier", arguments: { type: "publier" } }],
    };
  }
  if (n.includes("__invalide_puis_valide__")) {
    return {
      reply: "Objectif réglé.",
      toolCalls: [{ name: "objectif", arguments: { type: "objectif", valeur: 1500 } }],
    };
  }
  // Une composition valide, seule — teste le chemin `composer` isolé.
  if (n.includes("__composer_seul__")) {
    return {
      reply: "Voici une composition.",
      toolCalls: [{ name: "composer", arguments: { type: "composer", ...compositionExemple() } }],
    };
  }
  // Composition ET récompense dans le MÊME tour — teste le tableau d'actions
  // qui débloque `composer` : sans lui, la carte se construirait avant que le
  // modèle ait pu transmettre sa composition (une seule action par tour).
  if (n.includes("__composer_et_recompense__")) {
    return {
      reply: "Récompense et composition enregistrées.",
      toolCalls: [
        { name: "recompense", arguments: { type: "recompense", recompense: { texte: "Un café offert", libelleCourt: "Offert" } } },
        { name: "composer", arguments: { type: "composer", ...compositionExemple() } },
      ],
    };
  }
  // Retouche d'une composition déjà transmise — nom réduit de moitié. Teste
  // qu'un second `composer` change réellement l'état, pas seulement qu'il
  // est journalisé (voir __tests__/session.test.ts).
  if (n.includes("__composer_retouche__")) {
    const c = compositionExemple();
    c.calques[0].largeur = c.calques[0].largeur / 2;
    return {
      reply: "Nom réduit.",
      toolCalls: [{ name: "composer", arguments: { type: "composer", ...c } }],
    };
  }
  // `modifier` sur une carte déjà composée — doit être refusé par le moteur
  // (engine/actions.ts), pas silencieusement accepté.
  if (n.includes("__modifier_sur_composition__")) {
    return {
      reply: "C'est fait, le nom est réduit.",
      toolCalls: [{ name: "modifier", arguments: { type: "modifier", cible: "texte" } }],
    };
  }
  // Trop d'actions dans un seul tour — teste le refus MAX_ACTIONS_PAR_TOUR.
  if (n.includes("__trop_actions__")) {
    return {
      reply: "Tout est réglé.",
      toolCalls: [
        { name: "mode", arguments: { type: "mode", mode: "points" } },
        { name: "objectif", arguments: { type: "objectif", valeur: 100 } },
        { name: "recompense", arguments: { type: "recompense", recompense: { texte: "Offert", libelleCourt: "Offert" } } },
        { name: "nom", arguments: { type: "nom", valeur: "Chez Test" } },
        { name: "proposer", arguments: { type: "proposer", secteur: "Café", ambiance: "chaud" } },
      ],
    };
  }

  // --- modification ciblée -------------------------------------------------
  if (/change (seulement|uniquement)|modifie (seulement|uniquement)|juste (le|la)/.test(n)) {
    const cible = /logo/.test(n)
      ? "logo"
      : /couleur|palette/.test(n)
        ? "couleurs"
        : /photo|image/.test(n)
          ? "photo"
          : /icone|tampon/.test(n)
            ? "icone"
            : "texte";
    return {
      reply: "C'est fait, je n'ai touché qu'à cette partie.",
      toolCalls: [{ name: "modifier", arguments: { type: "modifier", cible } }],
    };
  }

  // --- mode ----------------------------------------------------------------
  if (/\bpoints?\b/.test(n)) {
    return {
      reply: "Je passe votre programme en points.",
      toolCalls: [{ name: "mode", arguments: { type: "mode", mode: "points" } }],
    };
  }

  // --- ambiance → trois propositions ---------------------------------------
  // Passe AVANT la récompense et l'objectif : quand le commerçant donne tout
  // d'un coup (« pizzeria, chaleureuse, 10 passages, la dixième offerte »),
  // proposer est le geste le plus utile. Le reste se règle au tour suivant —
  // une seule action par tour, c'est le contrat.
  const ambiance = detecterAmbiance(n);
  if (ambiance) {
    const secteur = detecterSecteur(dernier) ?? detecterSecteur(contexte) ?? "Commerce";
    return {
      reply: "Voici trois propositions. Cliquez celle qui vous parle.",
      toolCalls: [{ name: "proposer", arguments: { type: "proposer", secteur, ambiance } }],
    };
  }

  // --- nom du commerce -------------------------------------------------
  // Après l'ambiance : quand les deux arrivent dans le même message,
  // « proposer » reste le geste le plus utile, le nom peut attendre le tour
  // suivant.
  const nomCommerce = detecterNomCommerce(dernier);
  if (nomCommerce) {
    return {
      reply: `Noté : « ${nomCommerce} » sera le nom affiché sur la carte.`,
      toolCalls: [{ name: "nom", arguments: { type: "nom", valeur: nomCommerce } }],
    };
  }

  // --- récompense ----------------------------------------------------------
  if (/offert|gratuit|cadeau|reduction|%|euro/.test(n)) {
    const pourcent = n.match(/-?(\d{1,2})\s*%/);
    const texte = pourcent ? `${pourcent[1]} % de réduction` : "Une prestation offerte";
    const libelleCourt = pourcent ? `-${pourcent[1]}%` : "Offert";
    return {
      reply: `Parfait. J'enregistre : ${texte}.`,
      toolCalls: [
        {
          name: "recompense",
          arguments: { type: "recompense", recompense: { texte, libelleCourt } },
        },
      ],
    };
  }

  // --- objectif ------------------------------------------------------------
  if (/tampon|passage|case|visite/.test(n)) {
    const valeur = detecterNombre(n) ?? 10;
    return {
      reply: `Très bien : ${valeur} passages avant la récompense.`,
      toolCalls: [{ name: "objectif", arguments: { type: "objectif", valeur } }],
    };
  }

  // --- secteur seul → question suivante ------------------------------------
  const secteur = detecterSecteur(n);
  if (secteur) {
    return {
      reply: `${secteur}, très bien. Quelle ambiance voulez-vous : chaleureuse, élégante ou moderne ?`,
    };
  }

  // --- hors périmètre ------------------------------------------------------
  if (/meteo|politique|recette|blague/.test(n)) {
    return {
      reply:
        "Je m'occupe uniquement de votre carte de fidélité. Dites-moi votre métier et je m'en charge.",
    };
  }

  return { reply: "Dites-m'en un peu plus sur votre commerce." };
}

export interface OptionsMock {
  /** Compteur d'appels : sert aux scénarios « invalide puis valide ». */
  memoirePartagee?: Map<string, number>;
}

export function creerMockProvider(options: OptionsMock = {}): LLMProvider {
  const compteurs = options.memoirePartagee ?? new Map<string, number>();

  return {
    id: "mock",

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async chat(messages: Message[], _tools: Tool[]): Promise<ChatResult> {
      const messagesUtilisateur = messages.filter((m) => m.role === "user");
      const texte = messagesUtilisateur.at(-1)?.content ?? "";
      const contexte = messagesUtilisateur.map((m) => m.content).join(" ");
      const relance = messages.some((m) => m.role === "system" && m.content.includes("REJETÉE"));

      // Scénario « invalide puis valide » : à la relance, le mock se corrige.
      if (normaliser(texte).includes("__invalide_puis_valide__") && relance) {
        const n = (compteurs.get(texte) ?? 0) + 1;
        compteurs.set(texte, n);
        return {
          reply: "Pardon, je corrige : objectif à 10.",
          toolCalls: [{ name: "objectif", arguments: { type: "objectif", valeur: 10 } }],
        };
      }

      return repondre(texte, contexte);
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async vision(image: string, _prompt: string): Promise<VisionResult> {
      // Analyse simulée d'une carte existante. Déterministe : le nom du fichier
      // pilote le résultat, ce qui permet de scénariser sans image réelle.
      const n = normaliser(image);
      if (n.includes("sans-logo")) {
        return {
          data: {
            nomCommerce: "Chez Martine",
            logo: null,
            systemeFidelite: "stamps",
            objectif: 10,
            recompense: { texte: "Une prestation offerte", libelleCourt: "Offert" },
          },
        };
      }
      if (n.includes("points")) {
        return {
          data: {
            nomCommerce: "Institut Éclat",
            logo: "logo-eclat.png",
            systemeFidelite: "points",
            objectif: 20,
            recompense: { texte: "10 % de réduction", libelleCourt: "-10%" },
          },
        };
      }
      if (n.includes("illisible")) {
        return { data: { erreur: "image illisible" } };
      }
      return {
        data: {
          nomCommerce: "Boulangerie du Pont",
          logo: "logo-pont.png",
          systemeFidelite: "stamps",
          objectif: 10,
          recompense: { texte: "Une viennoiserie offerte", libelleCourt: "Offert" },
        },
      };
    },
  };
}
