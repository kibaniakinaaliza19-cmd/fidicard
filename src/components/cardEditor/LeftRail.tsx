"use client";

import {
  LayoutTemplate,
  Type,
  ImagePlus,
  Smile,
  Shapes,
  QrCode,
  Barcode,
  UploadCloud,
  Palette,
  Wallpaper,
} from "lucide-react";
import { useCardStore, type DrawerId } from "@/store/cardStore";
import TemplatesDrawer from "./drawers/TemplatesDrawer";
import TextDrawer from "./drawers/TextDrawer";
import UploadDrawer from "./drawers/UploadDrawer";
import IconsDrawer from "./drawers/IconsDrawer";
import ShapesDrawer from "./drawers/ShapesDrawer";
import CodesDrawer from "./drawers/CodesDrawer";
import ColorsDrawer from "./drawers/ColorsDrawer";
import BackgroundDrawer from "./drawers/BackgroundDrawer";

const rail: { id: DrawerId; label: string; icon: typeof Type }[] = [
  { id: "modeles", label: "Modèles", icon: LayoutTemplate },
  { id: "texte", label: "Texte", icon: Type },
  { id: "images", label: "Images", icon: ImagePlus },
  { id: "icones", label: "Icônes", icon: Smile },
  { id: "formes", label: "Formes", icon: Shapes },
  { id: "qrcode", label: "QR Code", icon: QrCode },
  { id: "codebarres", label: "Code-barres", icon: Barcode },
  { id: "upload", label: "Upload", icon: UploadCloud },
  { id: "couleurs", label: "Couleurs", icon: Palette },
  { id: "arriereplan", label: "Fond", icon: Wallpaper },
];

export default function LeftRail() {
  const activeDrawer = useCardStore((s) => s.activeDrawer);
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);

  return (
    <div className="flex h-full">
      <div
        className="flex h-full w-[76px] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r py-3"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        {rail.map((item) => {
          const Icon = item.icon;
          const active = activeDrawer === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveDrawer(item.id)}
              className="flex w-[64px] cursor-pointer flex-col items-center gap-1 rounded-xl py-2 transition-colors"
              style={{
                background: active ? "var(--accent-glow)" : "transparent",
                color: active ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              <Icon size={19} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      {activeDrawer === "modeles" && <TemplatesDrawer />}
      {activeDrawer === "texte" && <TextDrawer />}
      {activeDrawer === "images" && <UploadDrawer title="Images" />}
      {activeDrawer === "icones" && <IconsDrawer />}
      {activeDrawer === "formes" && <ShapesDrawer />}
      {activeDrawer === "qrcode" && <CodesDrawer mode="qr" />}
      {activeDrawer === "codebarres" && <CodesDrawer mode="barcode" />}
      {activeDrawer === "upload" && <UploadDrawer title="Upload" />}
      {activeDrawer === "couleurs" && <ColorsDrawer />}
      {activeDrawer === "arriereplan" && <BackgroundDrawer />}
    </div>
  );
}
