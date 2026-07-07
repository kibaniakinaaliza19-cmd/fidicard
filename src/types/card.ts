export type LoyaltyType = "stamps" | "points";
export type StampShape = "drop" | "star" | "badge" | "heart";
export type CardFormat = "iphone" | "android" | "wallet";
export type TemplateCategory =
  | "cafe"
  | "restaurant"
  | "beaute"
  | "fitness"
  | "boulangerie"
  | "boutique"
  | "hotel"
  | "salon"
  | "automobile"
  | "immobilier"
  | "entreprise";

export interface CardColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface CardLoyalty {
  type: LoyaltyType;
  stampsCount: number;
  stampsFilled: number;
  stampShape: StampShape;
  stampColor: string;
  pointsPerEuro: number;
  pointsForReward: number;
  currentPoints: number;
}

export interface CardReward {
  title: string;
  subtitle: string;
  icon: string;
}

export interface CardInfo {
  phone: string;
  email: string;
  website: string;
  address: string;
  hours: string;
  whatsapp: string;
}

export interface CardStyle {
  borderRadius: number;
}

export interface CardLogo {
  url: string | null;
  size: number;
  rotation: number;
  glow: boolean;
  position: "left" | "center" | "right";
}

export interface CardBackground {
  imageUrl: string | null;
  dim: number;
}

export interface CardDesign {
  templateId: string;
  companyName: string;
  tagline: string;
  logo: CardLogo;
  background: CardBackground;
  colors: CardColors;
  loyalty: CardLoyalty;
  reward: CardReward;
  info: CardInfo;
  style: CardStyle;
}

export interface CardTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  categoryLabel: string;
  premium: boolean;
  preview: {
    gradient: [string, string];
    icon: string;
  };
  config: Partial<CardDesign>;
}
