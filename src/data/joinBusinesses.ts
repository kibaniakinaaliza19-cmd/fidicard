export interface JoinBusiness {
  name: string;
  tagline: string;
  emoji: string;
}

// Demo mapping code -> business. Any unknown code falls back to a generic name.
const businesses: Record<string, JoinBusiness> = {
  "7F8K92": { name: "Café Madeleine", tagline: "Votre pause, notre passion", emoji: "☕" },
  BELLE10: { name: "Institut Belle & Soi", tagline: "Révélez votre éclat", emoji: "🌸" },
  NAPOLI7: { name: "Pizza Napoli", tagline: "La vraie pizza napolitaine", emoji: "🍕" },
};

export function getJoinBusiness(code: string): JoinBusiness {
  return businesses[code?.toUpperCase()] ?? { name: "Votre enseigne", tagline: "Programme de fidélité", emoji: "🎁" };
}
