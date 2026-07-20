"use client";

import type { CardDoc } from "@/types/layer";
import { CARD_RATIO } from "@/types/layer";
import { backgroundToCss } from "@/lib/backgroundStyle";
import LayerContent from "@/components/cardEditor/LayerContent";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { renderZones, type RenderClientState } from "@/lib/loyalty/renderLayer";

export default function MiniCard({
  doc,
  width = 240,
  client,
}: {
  doc: CardDoc;
  width?: number;
  /** état de fidélité à afficher (tampons remplis) — carte vierge sinon */
  client?: RenderClientState;
}) {
  // v2 : la grille sort de la config de fidélité au moment du rendu.
  // Sélecteur null stable pour les docs v1 → la galerie de modèles ne se
  // re-rend pas quand la config change.
  const config = useLoyaltyStore((s) => (doc.version === 2 ? s.config : null));
  const zBase = doc.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
  const zoneLayers =
    doc.version === 2 && config ? renderZones(doc.zones, config, { client, zBase }) : [];
  const sorted = [...doc.layers, ...zoneLayers].sort((a, b) => a.zIndex - b.zIndex);
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
