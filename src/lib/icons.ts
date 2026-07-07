import {
  Gift,
  Sparkles,
  Trophy,
  Tag,
  Coffee,
  UtensilsCrossed,
  Dumbbell,
  Cookie,
  ShoppingBag,
  BedDouble,
  Scissors,
  Car,
  Building2,
  Briefcase,
  Star,
  Heart,
  Droplet,
  Award,
  Crown,
  type LucideIcon,
} from "lucide-react";

export const iconRegistry: Record<string, LucideIcon> = {
  Gift,
  Sparkles,
  Trophy,
  Tag,
  Coffee,
  UtensilsCrossed,
  Dumbbell,
  Cookie,
  ShoppingBag,
  BedDouble,
  Scissors,
  Car,
  Building2,
  Briefcase,
  Star,
  Heart,
  Droplet,
  Award,
  Crown,
};

export const rewardIconOptions = [
  "Gift",
  "Sparkles",
  "Trophy",
  "Tag",
  "Award",
  "Crown",
  "Star",
  "Heart",
];

export function getIcon(name: string): LucideIcon {
  return iconRegistry[name] ?? Gift;
}
