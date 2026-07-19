// Moteur de fidélité FidiCard — TOUTE la logique métier vit ici.
//
// Deux couches strictement séparées dans l'app :
//   • Design  = les calques de la carte (éditeur graphique) ;
//   • Fonctionnalités = ce fichier + loyaltyStore : type de programme, règles
//     de progression, paliers de récompense, et ce qui se passe à chaque scan.
//
// `appliquerScan` est une fonction PURE (aucun accès store/réseau) : elle
// prend la config du commerce + l'état du client + un montant éventuel, et
// retourne le résultat complet du passage. Les stores/l'API ne font que
// persister ce résultat — aucune règle métier ne doit être écrite ailleurs.

/* ------------------------------------------------------------------ types */

export type LoyaltyMode = "stamps" | "points";

export type TierType = "pourcentage" | "montant" | "produit_offert" | "autre";

export interface Palier {
  /** n° du tampon (mode stamps) ou seuil en points (mode points) */
  position: number;
  /** libellé court affiché DANS le tampon — max ~6 caractères */
  label: string;
  /** description longue, montrée au client et au commerçant lors du scan */
  description: string;
  type: TierType;
}

export type RegleAttribution =
  | { type: "passage" } // 1 scan = 1 tampon
  | { type: "montant_minimum"; seuil: number } // 1 tampon si montant ≥ seuil
  | { type: "montant_palier"; tranche: number }; // 1 tampon par tranche de X €

export interface StampStyle {
  /** couleur d'un tampon non validé */
  empty: string;
  /** couleur de contour */
  border: string;
  /** couleur d'un tampon validé / d'un palier atteint */
  filled: string;
}

export interface LoyaltyConfig {
  mode: LoyaltyMode;
  totalStamps: number;
  regle: RegleAttribution;
  /** mode points : 1 € = N points */
  tauxConversion: number;
  paliers: Palier[];
  stampStyle: StampStyle;
}

export interface ClientLoyaltyState {
  tampons: number;
  points: number;
  /** positions des paliers déjà débloqués dans le cycle en cours */
  paliersAtteints: number[];
}

export interface ScanResult {
  ok: boolean;
  /** explication quand ok=false (ex. montant sous le seuil) */
  raison?: string;
  tamponsAvant: number;
  tamponsApres: number;
  pointsAvant: number;
  pointsApres: number;
  /** récompenses débloquées par CE scan (souvent 0 ou 1) */
  paliersDeclenches: Palier[];
  /** le prochain palier à atteindre, pour l'affichage */
  prochainPalier: Palier | null;
  /** tampons (ou points) restants avant le prochain palier */
  restantAvantPalier: number;
  /** dernier palier atteint → le cycle repart de zéro */
  carteCompletee: boolean;
}

export const DEFAULT_STAMP_STYLE: StampStyle = {
  empty: "rgba(255,255,255,0.92)",
  border: "#E8503D",
  filled: "#E8503D",
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  mode: "stamps",
  totalStamps: 10,
  regle: { type: "passage" },
  tauxConversion: 10,
  paliers: [
    { position: 10, label: "Offert", description: "Une récompense offerte à la carte complète", type: "produit_offert" },
  ],
  stampStyle: DEFAULT_STAMP_STYLE,
};

/* ----------------------------------------------------------------- moteur */

const byPosition = (a: Palier, b: Palier) => a.position - b.position;

export function appliquerScan(
  config: LoyaltyConfig,
  client: ClientLoyaltyState,
  montant?: number,
): ScanResult {
  const base: Omit<ScanResult, "ok"> = {
    tamponsAvant: client.tampons,
    tamponsApres: client.tampons,
    pointsAvant: client.points,
    pointsApres: client.points,
    paliersDeclenches: [],
    prochainPalier: null,
    restantAvantPalier: 0,
    carteCompletee: false,
  };

  if (config.mode === "stamps") {
    // — progression —
    let gain = 0;
    if (config.regle.type === "passage") {
      gain = 1;
    } else if (config.regle.type === "montant_minimum") {
      if (montant === undefined) {
        return { ok: false, raison: "Montant requis pour ce programme.", ...base };
      }
      if (montant < config.regle.seuil) {
        return {
          ok: false,
          raison: `Montant sous le seuil de ${config.regle.seuil} € — aucun tampon ajouté.`,
          ...base,
        };
      }
      gain = 1;
    } else {
      if (montant === undefined) {
        return { ok: false, raison: "Montant requis pour ce programme.", ...base };
      }
      gain = Math.floor(montant / config.regle.tranche);
      if (gain <= 0) {
        return {
          ok: false,
          raison: `Moins de ${config.regle.tranche} € — aucun tampon ajouté.`,
          ...base,
        };
      }
    }

    const total = Math.max(1, config.totalStamps);
    const apres = Math.min(total, client.tampons + gain);

    // — paliers franchis par ce scan —
    const declenches = config.paliers
      .filter((p) => p.position > client.tampons && p.position <= apres)
      .filter((p) => !client.paliersAtteints.includes(p.position))
      .sort(byPosition);

    const complete = apres >= total;
    const prochain =
      config.paliers.filter((p) => p.position > apres).sort(byPosition)[0] ?? null;

    return {
      ok: true,
      ...base,
      tamponsApres: complete ? 0 : apres, // carte complète → nouveau cycle
      paliersDeclenches: declenches,
      prochainPalier: complete
        ? config.paliers.slice().sort(byPosition)[0] ?? null
        : prochain,
      restantAvantPalier: complete
        ? (config.paliers.slice().sort(byPosition)[0]?.position ?? total)
        : prochain
          ? prochain.position - apres
          : total - apres,
      carteCompletee: complete,
    };
  }

  // — mode points —
  if (montant === undefined) {
    return { ok: false, raison: "Montant requis pour créditer des points.", ...base };
  }
  const gainPts = Math.round(montant * config.tauxConversion);
  const apresPts = client.points + gainPts;
  const declenches = config.paliers
    .filter((p) => p.position > client.points && p.position <= apresPts)
    .sort(byPosition);
  const prochain = config.paliers.filter((p) => p.position > apresPts).sort(byPosition)[0] ?? null;

  return {
    ok: true,
    ...base,
    pointsApres: apresPts,
    paliersDeclenches: declenches,
    prochainPalier: prochain,
    restantAvantPalier: prochain ? prochain.position - apresPts : 0,
    carteCompletee: false,
  };
}

/* ------------------------------------------------------------- validation */

/** Erreurs bloquant la publication du programme (liste vide = publiable). */
export function validerProgramme(config: LoyaltyConfig): string[] {
  const errs: string[] = [];
  if (config.paliers.length === 0) {
    errs.push("Aucun palier de récompense défini — la carte ne récompense rien.");
  }
  const positions = config.paliers.map((p) => p.position);
  if (new Set(positions).size !== positions.length) {
    errs.push("Deux paliers occupent la même position.");
  }
  if (config.mode === "stamps") {
    if (config.paliers.some((p) => p.position < 1 || p.position > config.totalStamps)) {
      errs.push(`Un palier dépasse le nombre de tampons (${config.totalStamps}).`);
    }
    if (config.paliers.length > 0 && !positions.includes(config.totalStamps)) {
      errs.push(
        `Le dernier tampon (${config.totalStamps}ᵉ) doit porter une récompense — sinon compléter la carte n'apporte rien.`,
      );
    }
  }
  if (config.paliers.some((p) => !p.label.trim())) {
    errs.push("Chaque palier doit avoir un libellé (ex. « -5€ », « Offert »).");
  }
  if (config.mode === "points" && config.tauxConversion <= 0) {
    errs.push("Le taux de conversion doit être positif (ex. 1 € = 10 points).");
  }
  if (
    (config.regle.type === "montant_minimum" && config.regle.seuil <= 0) ||
    (config.regle.type === "montant_palier" && config.regle.tranche <= 0)
  ) {
    errs.push("La règle d'attribution a un montant invalide.");
  }
  return errs;
}

/* ------------------------------------------------- aide à l'import (IA) */

/** « -5€ » → montant ; « -15% » → pourcentage ; « offert » → produit_offert */
export function inferTierType(label: string): TierType {
  if (/%/.test(label)) return "pourcentage";
  if (/[€$]|\beuros?\b/i.test(label)) return "montant";
  if (/offert|gratuit|free|cadeau/i.test(label)) return "produit_offert";
  return "autre";
}

/* ---------------------------------------------------------------- presets */

export interface ProgramPreset {
  id: string;
  nom: string;
  description: string;
  config: Omit<LoyaltyConfig, "stampStyle">;
}

// Mécanismes éprouvés de la restauration et du commerce de proximité —
// décrits par leur fonctionnement, sans nom d'enseigne.
export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    id: "classique-10",
    nom: "Classique · 10 passages",
    description: "Le plus répandu. Simple à comprendre pour le client.",
    config: {
      mode: "stamps",
      totalStamps: 10,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 10, label: "Offert", description: "Le 10ᵉ est offert", type: "produit_offert" },
      ],
    },
  },
  {
    id: "paliers-progressifs",
    nom: "Paliers progressifs",
    description: "Récompenses intermédiaires : réduit l'abandon en cours de carte.",
    config: {
      mode: "stamps",
      totalStamps: 10,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 3, label: "-5€", description: "5 € de réduction", type: "montant" },
        { position: 6, label: "-15%", description: "15 % de réduction", type: "pourcentage" },
        { position: 10, label: "-50%", description: "50 % de réduction", type: "pourcentage" },
      ],
    },
  },
  {
    id: "rapide-5",
    nom: "Cycle court · 5 passages",
    description: "Récompense rapide. Idéal pour créer l'habitude.",
    config: {
      mode: "stamps",
      totalStamps: 5,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 5, label: "Offert", description: "Le 5ᵉ est offert", type: "produit_offert" },
      ],
    },
  },
  {
    id: "prestation-8",
    nom: "Prestation · 8 passages",
    description: "Pensé pour coiffure, esthétique, instituts, barbiers.",
    config: {
      mode: "stamps",
      totalStamps: 8,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 4, label: "-10%", description: "10 % sur la prestation", type: "pourcentage" },
        { position: 8, label: "Offert", description: "Une prestation offerte", type: "produit_offert" },
      ],
    },
  },
  {
    id: "panier-15",
    nom: "1 tampon par 15 € d'achat",
    description: "La progression suit le panier — adapté aux tickets variables.",
    config: {
      mode: "stamps",
      totalStamps: 10,
      regle: { type: "montant_palier", tranche: 15 },
      tauxConversion: 10,
      paliers: [
        { position: 5, label: "-5€", description: "5 € de réduction", type: "montant" },
        { position: 10, label: "-20€", description: "20 € de réduction", type: "montant" },
      ],
    },
  },
  {
    id: "points-standard",
    nom: "Points · 1 € = 10 pts",
    description: "Chaque euro compte. Paliers atteints selon la dépense totale.",
    config: {
      mode: "points",
      totalStamps: 10,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 250, label: "-5€", description: "5 € de réduction dès 250 points", type: "montant" },
        { position: 500, label: "Offert", description: "Un produit offert dès 500 points", type: "produit_offert" },
        { position: 1000, label: "-50%", description: "50 % de réduction dès 1000 points", type: "pourcentage" },
      ],
    },
  },
];
