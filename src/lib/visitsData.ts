export interface VisitPoint {
  label: string;
  value: number;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
}

export function generateVisits(days: number): VisitPoint[] {
  const points: VisitPoint[] = [];
  const today = new Date();
  let seed = days * 9301 + 49297;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const progress = (days - i) / days;
    const base = 30 + progress * 80;
    const noise = (rand() - 0.5) * 30;
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 15 : 0;
    const value = Math.max(8, Math.round(base + noise + weekend));
    points.push({ label: formatDate(d), value });
  }
  return points;
}
