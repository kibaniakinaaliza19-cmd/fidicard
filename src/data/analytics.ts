import type { LucideIcon } from "lucide-react";
import { Users, Stamp, Repeat, Gift, Euro, Star, Send, TrendingUp, CreditCard, Award } from "lucide-react";

export interface KpiCardData {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: LucideIcon;
  color: string;
  spark: number[];
}

export const kpiCards: KpiCardData[] = [
  { label: "Nouveaux clients", value: "38", delta: "+16%", positive: true, icon: Users, color: "#ff6a3d", spark: [12, 14, 11, 18, 16, 22, 20, 26, 24, 30, 28, 38] },
  { label: "Tampons / semaine", value: "495", delta: "+6%", positive: true, icon: Stamp, color: "#f0653e", spark: [40, 44, 42, 50, 48, 46, 55, 52, 60, 58, 62, 66] },
  { label: "Taux de retour", value: "64%", delta: "+2,3%", positive: true, icon: Repeat, color: "#a78bfa", spark: [55, 57, 54, 58, 60, 59, 61, 60, 62, 61, 63, 64] },
  { label: "Conversion en récompense", value: "18%", delta: "+4,1%", positive: true, icon: TrendingUp, color: "#22c55e", spark: [9, 10, 11, 10, 12, 13, 12, 14, 15, 16, 17, 18] },
];

export const extraKpis: KpiCardData[] = [
  { label: "Cartes actives", value: "212", delta: "+3,1%", positive: true, icon: CreditCard, color: "#38bdf8", spark: [180, 185, 190, 188, 195, 198, 200, 205, 208, 210, 211, 212] },
  { label: "Avis Google", value: "27", delta: "+23%", positive: true, icon: Star, color: "#eab308", spark: [10, 12, 11, 14, 16, 15, 18, 20, 22, 24, 25, 27] },
  { label: "Notifications envoyées", value: "2 845", delta: "+12%", positive: true, icon: Send, color: "#f472b6", spark: [1800, 1950, 2100, 2050, 2200, 2350, 2400, 2500, 2600, 2700, 2780, 2845] },
  { label: "Fidélité moyenne", value: "6,2 / 10", delta: "+0,4", positive: true, icon: Award, color: "#c9a227", spark: [5, 5.2, 5.1, 5.4, 5.6, 5.5, 5.8, 5.9, 6.0, 6.1, 6.1, 6.2] },
];

export const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export interface VisitSeries {
  id: string;
  label: string;
  color: string;
  data: number[];
}

export const visitSeries: VisitSeries[] = [
  { id: "visites", label: "Visites", color: "#ff6a3d", data: [58, 62, 78, 120, 150, 215, 168] },
  { id: "clients", label: "Clients", color: "#a78bfa", data: [40, 44, 55, 82, 96, 140, 110] },
  { id: "ca", label: "CA (€)", color: "#22c55e", data: [180, 210, 260, 380, 440, 620, 500] },
  { id: "notifs", label: "Notifications", color: "#38bdf8", data: [90, 120, 110, 160, 140, 200, 130] },
];

export interface SummaryRow {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: LucideIcon;
}

export const periodSummary: SummaryRow[] = [
  { label: "Visites totales", value: "1 247", delta: "+12%", positive: true, icon: Users },
  { label: "Clients actifs", value: "312", delta: "+8%", positive: true, icon: Users },
  { label: "Récompenses débloquées", value: "89", delta: "+15%", positive: true, icon: Gift },
  { label: "CA estimé généré", value: "2 340 €", delta: "+18%", positive: true, icon: Euro },
  { label: "Avis Google obtenus", value: "27", delta: "+23%", positive: true, icon: Star },
];

// heatmap: rows are 3h buckets (6h..24h), columns are days Lun..Dim, value 0..100
export const heatmapRows = ["6h", "9h", "12h", "15h", "18h", "21h", "24h"];
export const heatmap: number[][] = [
  [8, 10, 9, 12, 14, 22, 6],
  [22, 26, 24, 28, 30, 44, 18],
  [55, 48, 52, 50, 46, 70, 40],
  [30, 34, 32, 38, 42, 58, 36],
  [72, 66, 78, 82, 96, 100, 74],
  [40, 44, 46, 52, 62, 88, 60],
  [12, 14, 16, 18, 20, 34, 22],
];

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export const notifTypes: DonutSegment[] = [
  { label: "Promotions", value: 1245, color: "#ff6a3d" },
  { label: "Offres fidélité", value: 845, color: "#a78bfa" },
  { label: "Avis Google", value: 320, color: "#22c55e" },
  { label: "Événements", value: 235, color: "#38bdf8" },
  { label: "Autres", value: 200, color: "#6b6b68" },
];

export interface Campaign {
  rank: number;
  emoji: string;
  title: string;
  date: string;
  opens: number;
  clicks: number;
}

export const topCampaigns: Campaign[] = [
  { rank: 1, emoji: "🍕", title: "Une pizza achetée = une offerte", date: "Envoyée le 10 mai", opens: 512, clicks: 243 },
  { rank: 2, emoji: "🍻", title: "Happy Hour – 17h à 19h", date: "Envoyée le 12 mai", opens: 432, clicks: 198 },
  { rank: 3, emoji: "⚽", title: "Match LDC – Ce soir !", date: "Envoyée le 13 mai", opens: 389, clicks: 176 },
  { rank: 4, emoji: "⭐", title: "Avis Google – Merci !", date: "Envoyée le 11 mai", opens: 312, clicks: 89 },
  { rank: 5, emoji: "🎂", title: "Offre anniversaire", date: "Envoyée le 14 mai", opens: 201, clicks: 67 },
];

export const clientsBreakdown: DonutSegment[] = [
  { label: "Fidèles", value: 410, color: "#ff6a3d" },
  { label: "Nouveaux", value: 142, color: "#38bdf8" },
  { label: "VIP", value: 86, color: "#eab308" },
  { label: "Inactifs", value: 228, color: "#a78bfa" },
  { label: "Perdus", value: 74, color: "#6b6b68" },
];

export interface Objective {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

export const objectives: Objective[] = [
  { label: "Visites ce mois", current: 1247, target: 1500, unit: "", color: "#ff6a3d" },
  { label: "CA estimé", current: 2340, target: 3000, unit: " €", color: "#22c55e" },
  { label: "Avis Google", current: 27, target: 40, unit: "", color: "#eab308" },
  { label: "Nouveaux clients", current: 38, target: 50, unit: "", color: "#38bdf8" },
];

export interface Alert {
  level: "warn" | "info";
  text: string;
}

export const alerts: Alert[] = [
  { level: "warn", text: "Beaucoup de récompenses expirent cette semaine." },
  { level: "warn", text: "Peu d'avis Google collectés ces 7 derniers jours." },
  { level: "info", text: "Le taux de retour progresse (+2,3%)." },
];

export const smartInsights = [
  { emoji: "📈", title: "Samedi est votre meilleur jour", text: "Vous recevez 37% de visites en plus que la moyenne hebdomadaire." },
  { emoji: "🕘", title: "Vos clients sont les plus actifs entre 18h et 21h", text: "Pensez à envoyer vos offres à cette heure." },
  { emoji: "🍕", title: "La campagne « Pizza offerte »", text: "a généré +18% de CA cette semaine par rapport aux autres campagnes." },
];

export const dateRanges = ["Aujourd'hui", "7 derniers jours", "30 derniers jours", "90 derniers jours", "1 an", "Personnalisé"];
