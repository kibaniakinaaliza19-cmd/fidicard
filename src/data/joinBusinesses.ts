// Demo business config for the public sign-up page (keyed by QR code).
// Stands in for a `commerces` row until Supabase is wired: the card the client
// sees here mirrors couleur_preset / icone_tampon / objectif_tampons /
// recompense / recompense_sous_texte / mode_fidelite.

export type LoyaltyMode = "tampons" | "points";
export type StampIcon = "coffee" | "sparkles" | "pizza" | "gift" | "scissors" | "croissant";

export interface JoinBusiness {
  name: string;
  tagline: string;
  emoji: string;
  stampIcon: StampIcon;
  stampGoal: number;
  reward: string;
  rewardSubtext: string;
  loyaltyMode: LoyaltyMode;
  /** couleur_preset — the card's own palette. */
  card: { bg: string; text: string; accent: string };
}

const businesses: Record<string, JoinBusiness> = {
  "7F8K92": {
    name: "Café Madeleine",
    tagline: "Votre pause, notre passion",
    emoji: "☕",
    stampIcon: "coffee",
    stampGoal: 10,
    reward: "Un café offert",
    rewardSubtext: "à votre 10ᵉ visite",
    loyaltyMode: "tampons",
    card: { bg: "linear-gradient(145deg, #3a2419 0%, #241109 58%, #180b05 100%)", text: "#FFF8EF", accent: "#F4B942" },
  },
  BELLE10: {
    name: "Institut Belle & Soi",
    tagline: "Révélez votre éclat",
    emoji: "🌸",
    stampIcon: "sparkles",
    stampGoal: 6,
    reward: "Un soin offert",
    rewardSubtext: "après 6 rendez-vous",
    loyaltyMode: "tampons",
    card: { bg: "linear-gradient(145deg, #7a3b5a 0%, #4a2036 60%, #2f1223 100%)", text: "#FFF8EF", accent: "#F7C9DA" },
  },
  NAPOLI7: {
    name: "Pizza Napoli",
    tagline: "La vraie pizza napolitaine",
    emoji: "🍕",
    stampIcon: "pizza",
    stampGoal: 8,
    reward: "Une pizza offerte",
    rewardSubtext: "toutes les 8 pizzas",
    loyaltyMode: "tampons",
    card: { bg: "linear-gradient(145deg, #8f2f22 0%, #5c1a12 60%, #3a0f0a 100%)", text: "#FFF8EF", accent: "#F4B942" },
  },
};

/** Returns the demo business for a code, or undefined for an unknown code. */
export function findJoinBusiness(code: string): JoinBusiness | undefined {
  return businesses[code?.toUpperCase()];
}
