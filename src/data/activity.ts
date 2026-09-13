export type ActivityKind = "stamp" | "reward" | "scan" | "signup";

export interface ActivityItem {
  id: string;
  name: string;
  initials: string;
  action: string;
  kind: ActivityKind;
  time: string;
  /** minutes écoulées — sert à décider ce qui est « en direct » */
  minutes: number;
}

/* Les couleurs par événement ont disparu.
 *
 * Chaque ligne portait sa propre teinte — rouge, orange, or — sans qu'aucune
 * ne veuille dire quoi que ce soit. Quatre couleurs dans une liste de quatre
 * éléments se lisent comme un code qu'on cherche à percer. Le type d'événement
 * est maintenant porté par l'icône, qui, elle, le dit vraiment. */
export const recentActivity: ActivityItem[] = [
  { id: "a1", name: "Jean D.", initials: "JD", action: "a reçu 1 tampon", kind: "stamp", time: "Il y a 2 min", minutes: 2 },
  { id: "a2", name: "Marie L.", initials: "ML", action: "a débloqué une récompense", kind: "reward", time: "Il y a 12 min", minutes: 12 },
  { id: "a3", name: "Lucas M.", initials: "LM", action: "vient de scanner sa carte", kind: "scan", time: "Il y a 1 h", minutes: 60 },
  { id: "a4", name: "Sophie R.", initials: "SR", action: "a rejoint votre programme", kind: "signup", time: "Il y a 3 h", minutes: 180 },
];
