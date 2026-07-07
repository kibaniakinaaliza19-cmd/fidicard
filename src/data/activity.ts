export type ActivityKind = "stamp" | "reward" | "scan";

export interface ActivityItem {
  id: string;
  name: string;
  initials: string;
  color: string;
  action: string;
  kind: ActivityKind;
  time: string;
}

export const recentActivity: ActivityItem[] = [
  { id: "a1", name: "Jean D.", initials: "JD", color: "#e0342c", action: "a reçu 1 tampon", kind: "stamp", time: "Il y a 2 min" },
  { id: "a2", name: "Marie L.", initials: "ML", color: "#f0653e", action: "a débloqué une récompense", kind: "reward", time: "Il y a 1 h" },
  { id: "a3", name: "Lucas M.", initials: "LM", color: "#d4af37", action: "vient de scanner sa carte", kind: "scan", time: "Il y a 3 h" },
  { id: "a4", name: "Sophie R.", initials: "SR", color: "#e0342c", action: "a reçu 1 tampon", kind: "stamp", time: "Il y a 5 h" },
];
