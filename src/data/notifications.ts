import type { LucideIcon } from "lucide-react";
import {
  Send,
  CalendarClock,
  FileText,
  Eye,
  MousePointerClick,
  Euro,
} from "lucide-react";

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: LucideIcon;
  color: string;
}

export const kpis: Kpi[] = [
  { label: "Envoyées", value: "18 532", delta: "+12%", positive: true, icon: Send, color: "#ff6a3d" },
  { label: "Programmées", value: "54", delta: "+18%", positive: true, icon: CalendarClock, color: "#f0653e" },
  { label: "Brouillons", value: "19", delta: "-5%", positive: false, icon: FileText, color: "#e0342c" },
  { label: "Taux d'ouverture", value: "67,8 %", delta: "+8,3%", positive: true, icon: Eye, color: "#38bdf8" },
  { label: "Taux de clics", value: "32,4 %", delta: "+6,1%", positive: true, icon: MousePointerClick, color: "#a78bfa" },
  { label: "CA généré", value: "12 740 €", delta: "+15%", positive: true, icon: Euro, color: "#22c55e" },
];

export interface ImpactMetric {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  emoji: string;
}

export const impactMetrics: ImpactMetric[] = [
  { label: "Chiffre d'affaires généré", value: "12 740 €", delta: "+5%", positive: true, emoji: "💶" },
  { label: "Clients revenus", value: "1 248", delta: "+1%", positive: true, emoji: "🧑‍🤝‍🧑" },
  { label: "Offres utilisées", value: "843", delta: "-9%", positive: false, emoji: "🎟️" },
  { label: "Avis Google obtenus", value: "52", delta: "+13%", positive: true, emoji: "⭐" },
];

// hourly opens distribution (0h -> 23h), used by the "best send hour" mini chart
export const hourlyOpens = [
  3, 2, 1, 1, 1, 2, 4, 8, 12, 14, 16, 20, 26, 24, 22, 26, 34, 46, 62, 58, 40, 24, 14, 7,
];

export interface AutoNotif {
  id: string;
  emoji: string;
  title: string;
  description: string;
  enabled: boolean;
}

export const autoNotifs: AutoNotif[] = [
  { id: "birthday", emoji: "🎂", title: "Anniversaire client", description: "Souhaitez un joyeux anniversaire", enabled: true },
  { id: "google", emoji: "⭐", title: "Demande d'avis Google", description: "Demander un avis après la visite", enabled: true },
  { id: "reward", emoji: "🎁", title: "Récompense disponible", description: "Informer quand une récompense est dispo", enabled: true },
  { id: "cart", emoji: "🛒", title: "Panier abandonné", description: "Relancez vos clients", enabled: false },
  { id: "new", emoji: "👋", title: "Nouveau client", description: "Bienvenue au nouveau client", enabled: true },
  { id: "inactive", emoji: "⏰", title: "Client inactif", description: "Relancez les clients inactifs", enabled: false },
  { id: "visit", emoji: "🚪", title: "Après une visite", description: "Message automatique après le passage", enabled: false },
  { id: "purchase", emoji: "🛍️", title: "Après un achat", description: "Remerciez après chaque achat", enabled: false },
  { id: "referral", emoji: "🤝", title: "Après un parrainage", description: "Récompensez le parrainage", enabled: false },
  { id: "expiring", emoji: "⌛", title: "Offre expirant bientôt", description: "Créez l'urgence avant expiration", enabled: false },
];

export interface TemplateCard {
  id: string;
  emoji: string;
  title: string;
  perf: string;
  action: "Activer" | "Configurer";
}

export const templateCards: TemplateCard[] = [
  { id: "pizza", emoji: "🍕", title: "Une pizza achetée = une offerte", perf: "+18% de retours", action: "Activer" },
  { id: "coffee", emoji: "☕", title: "Café offert au 10ᵉ passage", perf: "+22% de fidélité", action: "Activer" },
  { id: "ucl", emoji: "⚽", title: "Match de Ligue des Champions", perf: "+31% d'ouvertures", action: "Configurer" },
  { id: "birthday", emoji: "🎂", title: "Offre anniversaire", perf: "+25% de ventes", action: "Activer" },
  { id: "contest", emoji: "🎉", title: "Jeu concours", perf: "+40% d'engagement", action: "Activer" },
  { id: "private", emoji: "🛍️", title: "Vente privée", perf: "+27% de ventes", action: "Activer" },
  { id: "happy", emoji: "🔥", title: "Happy Hour", perf: "+33% d'ouvertures", action: "Configurer" },
  { id: "review", emoji: "⭐", title: "Avis Google", perf: "+52% d'avis obtenus", action: "Activer" },
];

export interface ScheduledItem {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  when: string;
  status: "Programmée" | "Active" | "Brouillon";
}

export const scheduled: ScheduledItem[] = [
  { id: "s1", emoji: "⚽", title: "Match Ligue des Champions", subtitle: "Rappel du match", when: "13 mai · 18:00", status: "Programmée" },
  { id: "s2", emoji: "🔥", title: "Happy Hour", subtitle: "-30% sur les boissons", when: "14 mai · 17:30", status: "Programmée" },
  { id: "s3", emoji: "🎂", title: "Offre anniversaire", subtitle: "Joyeux anniversaire 🎉", when: "15 mai · 09:00", status: "Programmée" },
  { id: "s4", emoji: "⭐", title: "Avis Google", subtitle: "Votre avis compte !", when: "16 mai · 12:00", status: "Programmée" },
  { id: "s5", emoji: "🥐", title: "Petit-déjeuner offert", subtitle: "Pour vous remercier ❤️", when: "18 mai · 08:00", status: "Programmée" },
];

// Businesses shown as app-icon logos (like the reference), replacing letter avatars.
export interface PushSample {
  business: string;
  emoji: string;
  logoFrom: string;
  logoTo: string;
  title: string;
  body: string;
  time: string;
  badge?: string;
}

export const featuredPush: PushSample = {
  business: "Café Madeleine",
  emoji: "☕",
  logoFrom: "#ff6a3d",
  logoTo: "#e0342c",
  title: "Grand soir Ligue des Champions ⚽",
  body: "Match sur écran géant dès 21h — réservez votre table et profitez de l'ambiance 🏆🍻",
  time: "maintenant",
};

export const pushWall: PushSample[] = [
  { business: "Institut Belle & Soi", emoji: "🌸", logoFrom: "#ec4899", logoTo: "#be185d", title: "Offre exclusive ✨", body: "-10% sur tous les soins aujourd'hui seulement !", time: "maintenant", badge: "-10%" },
  { business: "L'Atelier Coiffure", emoji: "✂️", logoFrom: "#3b82f6", logoTo: "#1e3a8a", title: "Merci pour votre visite ⭐", body: "Donnez votre avis sur Google et aidez-nous à nous améliorer.", time: "il y a 3 min", badge: "G" },
  { business: "Pizza Napoli", emoji: "🍕", logoFrom: "#ef4444", logoTo: "#991b1b", title: "1 pizza achetée = 1 offerte 😍", body: "Profitez-en vite, ce week-end seulement !", time: "il y a 8 min", badge: "1+1" },
  { business: "Café de la Place", emoji: "⚽", logoFrom: "#7c3aed", logoTo: "#3730a3", title: "Ligue des Champions ce soir 🏆", body: "Diffusion du match sur grand écran à partir de 21h !", time: "il y a 15 min" },
];

export const notifTypes = [
  { id: "promo", emoji: "🔥", label: "Promotion" },
  { id: "event", emoji: "⚽", label: "Événement" },
  { id: "birthday", emoji: "🎂", label: "Anniversaire" },
  { id: "review", emoji: "⭐", label: "Avis Google" },
  { id: "reward", emoji: "🎁", label: "Récompense" },
  { id: "announce", emoji: "📢", label: "Annonce" },
  { id: "happy", emoji: "🍻", label: "Happy Hour" },
  { id: "contest", emoji: "🎉", label: "Jeu concours" },
];

export const recipientSegments = [
  { id: "all", label: "Tous les clients", count: "1 312" },
  { id: "vip", label: "Clients VIP", count: "86" },
  { id: "new", label: "Nouveaux", count: "142" },
  { id: "loyal", label: "Clients fidèles", count: "410" },
  { id: "inactive", label: "Inactifs", count: "228" },
  { id: "reward", label: "Récompense disponible", count: "63" },
  { id: "review", label: "Ont laissé un avis", count: "197" },
  { id: "points", label: "+200 points", count: "51" },
];

export const emojiPalette = ["🍕", "☕", "🎁", "🎂", "⚽", "🔥", "⭐", "💈", "💅", "🚗", "🥐", "🎉", "🍻", "🏆", "❤️", "✨", "🛍️", "🎟️"];
