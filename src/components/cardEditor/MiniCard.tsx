"use client";

import type { CardDoc } from "@/types/layer";
import { CARD_RATIO } from "@/types/layer";
import { backgroundToCss } from "@/lib/backgroundStyle";
import LayerContent from "@/components/cardEditor/LayerContent";

export default function MiniCard({ doc, width = 240 }: { doc: CardDoc; width?: number }) {
  const sorted = [...doc.layers].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ width, aspectRatio: `${CARD_RATIO}`, ...backgroundToCss(doc.background) }}
    >
      {sorted.map((layer) => {
        if (layer.hidden) return null;
        return (
          <div
            key={layer.id}
            className="absolute"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              transform: `rotate(${layer.rotation}deg)`,
              opacity: layer.opacity / 100,
              zIndex: layer.zIndex,
            }}
          >
            <LayerContent layer={scaleLayer(layer, width)} />
          </div>
        );
      })}
    </div>
  );
}

// text fontSize is in px at full canvas (520px). Scale down for the mini.
function scaleLayer(layer: CardDoc["layers"][number], width: number) {
  if (layer.type !== "text") return layer;
  const factor = width / 520;
  return { ...layer, fontSize: layer.fontSize * factor, letterSpacing: layer.letterSpacing * factor };
}
