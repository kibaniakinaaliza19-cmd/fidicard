"use client";

import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Building2,
  Type,
  Palette,
  Sparkles,
  Gift as GiftIcon,
  CircleDot,
  Phone,
  Squircle,
} from "lucide-react";
import Section from "@/components/ui/Section";
import { useEditorStore, type ToolId } from "@/store/editorStore";
import BackgroundSection from "@/components/editor/sections/BackgroundSection";
import LogoSection from "@/components/editor/sections/LogoSection";
import NameSection from "@/components/editor/sections/NameSection";
import ColorsSection from "@/components/editor/sections/ColorsSection";
import LoyaltySection from "@/components/editor/sections/LoyaltySection";
import RewardSection from "@/components/editor/sections/RewardSection";
import IconSection from "@/components/editor/sections/IconSection";
import InfoSection from "@/components/editor/sections/InfoSection";
import StyleSection from "@/components/editor/sections/StyleSection";

type SectionId = ToolId | "style";

const sectionMeta: { id: SectionId; title: string; icon: typeof ImageIcon; Content: React.ComponentType }[] = [
  { id: "background", title: "Image de fond", icon: ImageIcon, Content: BackgroundSection },
  { id: "logo", title: "Logo", icon: Building2, Content: LogoSection },
  { id: "name", title: "Nom de l'entreprise", icon: Type, Content: NameSection },
  { id: "colors", title: "Couleurs", icon: Palette, Content: ColorsSection },
  { id: "loyalty", title: "Système de fidélité", icon: Sparkles, Content: LoyaltySection },
  { id: "reward", title: "Récompense", icon: GiftIcon, Content: RewardSection },
  { id: "icon", title: "Icône", icon: CircleDot, Content: IconSection },
  { id: "info", title: "Infos supplémentaires", icon: Phone, Content: InfoSection },
  { id: "style", title: "Coins & style", icon: Squircle, Content: StyleSection },
];

const defaultOpen: Record<SectionId, boolean> = {
  background: true,
  logo: false,
  name: false,
  colors: true,
  loyalty: true,
  reward: true,
  icon: false,
  info: false,
  style: true,
};

export default function PropertiesPanel() {
  const selectedTool = useEditorStore((s) => s.selectedTool);
  const [openMap, setOpenMap] = useState<Record<SectionId, boolean>>(defaultOpen);
  const refs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (!selectedTool) return;
    const el = refs.current[selectedTool];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedTool]);

  return (
    <div className="space-y-3">
      {sectionMeta.map(({ id, title, icon, Content }) => (
        <Section
          key={id}
          ref={(el) => {
            refs.current[id] = el;
          }}
          title={title}
          icon={icon}
          open={openMap[id] || selectedTool === id}
          highlighted={selectedTool === id}
          onToggle={() => setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }))}
        >
          <Content />
        </Section>
      ))}
    </div>
  );
}
