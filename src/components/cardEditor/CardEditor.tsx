"use client";

import { useEffect } from "react";
import EditorTopBar from "@/components/cardEditor/EditorTopBar";
import LeftRail from "@/components/cardEditor/LeftRail";
import TopToolbar from "@/components/cardEditor/TopToolbar";
import CardCanvas from "@/components/cardEditor/CardCanvas";
import BottomBar from "@/components/cardEditor/BottomBar";
import RightPanel from "@/components/cardEditor/RightPanel";
import ImportCardModal from "@/components/cardEditor/importFlow/ImportCardModal";
import { useCardShortcuts } from "@/lib/useCardShortcuts";
import { useAutosaveCard } from "@/lib/useAutosaveCard";
import { useCardStore } from "@/store/cardStore";

export default function CardEditor() {
  useCardShortcuts();
  useAutosaveCard();
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);

  useEffect(() => {
    setActiveDrawer("modeles");
  }, [setActiveDrawer]);

  return (
    <div className="flex h-screen w-full flex-col" style={{ background: "var(--bg)" }}>
      <EditorTopBar />
      <div className="flex min-h-0 flex-1">
        <LeftRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopToolbar />
          <div className="min-h-0 flex-1" style={{ background: "var(--bg-elevated)" }}>
            <CardCanvas />
          </div>
          <BottomBar />
        </div>
        <RightPanel />
      </div>
      <ImportCardModal />
    </div>
  );
}
