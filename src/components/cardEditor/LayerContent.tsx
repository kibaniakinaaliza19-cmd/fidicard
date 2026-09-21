"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PDF417 } from "pdf417-generator";
import type { Layer } from "@/types/layer";
import { getIcon } from "@/lib/icons";
import { getFontCssVar } from "@/lib/fonts";

// Le code retenu par FIDICARD est À MODULES (PDF417) : de petits blocs
// empilés sur plusieurs rangées, jamais un jeu de grosses barres verticales.
// Source : dossier FidiIA, « 04 - SYSTEMES FIDELITE / 05 ». Le cartouche
// blanc à coins arrondis et la mention « Propulsé par FidiCard » qu'il porte
// font partie de ce même calque — les dessiner ailleurs les ferait
// disparaître dès que ce calque manque (repli gabarit, aperçu isolé…).
//
// La signature réelle de la lib est (code, canvas, aspectRatio, ecl,
// devicePixelRatio) — AUCUN paramètre de couleur (source :
// node_modules/pdf417-generator/README.md). `PDF417.draw` fixe le BUFFER du
// canvas (canvas.width/height, en pixels réels) ; ça ne dit rien de sa taille
// AFFICHÉE — un canvas est un élément remplacé, sa taille CSS se règle
// séparément.
//
// Ce cartouche est une bande COURTE et LARGE (~11-14 % de la hauteur de
// carte, cas réel Maison Ferrand/Maison Auric). Sur une forme aussi
// disproportionnée, les unités CSS relatives (%, cqw, cqh) se sont toutes
// révélées piégeuses : un padding vertical en `%` se calcule sur la LARGEUR
// du bloc englobant (règle CSS historique, haut ET bas compris), et
// `container-type:size` réintroduit un autre lot de surprises de layout. On
// mesure donc la hauteur RÉELLE en pixels (ResizeObserver) et on calcule
// tout — padding, légende, code — en pixels : plus aucune ambiguïté d'axe.
function BarcodeCartouche({ value, background }: { value: string; lineColor: string; background: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hauteur, setHauteur] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entree]) => setHauteur(entree.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || hauteur === 0) return;
    try {
      PDF417.draw(value || "0", canvasRef.current, 2.5, -1);
    } catch {}
  }, [value, hauteur]);

  const padY = Math.max(2, hauteur * 0.06);
  const legende = Math.max(7, hauteur * 0.16);
  const gap = Math.max(1, hauteur * 0.05);
  const canvasH = Math.max(0, hauteur - padY * 2 - gap - legende);

  return (
    <div
      ref={wrapRef}
      className="flex h-full w-full flex-col items-center justify-center overflow-hidden"
      style={{ background, borderRadius: "10%", paddingBlock: padY, paddingInline: "8%", gap }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: canvasH, objectFit: "contain" }} />
      <span
        style={{
          height: legende,
          lineHeight: `${legende}px`,
          fontSize: legende * 0.82,
          letterSpacing: "0.08em",
          color: "#9a9a9a",
          whiteSpace: "nowrap",
        }}
      >
        Propulsé par FidiCard
      </span>
    </div>
  );
}

export default function LayerContent({ layer, editing }: { layer: Layer; editing?: boolean }) {
  switch (layer.type) {
    case "text":
      return (
        <div
          className="h-full w-full select-none whitespace-pre-wrap break-words"
          style={{
            fontFamily: getFontCssVar(layer.font),
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight,
            fontStyle: layer.italic ? "italic" : "normal",
            textDecoration: layer.underline ? "underline" : "none",
            color: layer.color,
            textAlign: layer.align,
            letterSpacing: layer.letterSpacing,
            lineHeight: layer.lineHeight,
            visibility: editing ? "hidden" : "visible",
          }}
        >
          {layer.content}
        </div>
      );

    case "shape": {
      if (layer.shape === "rect") {
        return (
          <div
            className="h-full w-full"
            style={{ background: layer.fill, border: layer.strokeWidth ? `${layer.strokeWidth}px solid ${layer.stroke}` : undefined, borderRadius: layer.radius }}
          />
        );
      }
      if (layer.shape === "circle") {
        return (
          <div
            className="h-full w-full rounded-full"
            style={{ background: layer.fill, border: layer.strokeWidth ? `${layer.strokeWidth}px solid ${layer.stroke}` : undefined }}
          />
        );
      }
      if (layer.shape === "line") {
        return (
          <div className="flex h-full w-full items-center">
            <div className="w-full" style={{ height: Math.max(2, layer.strokeWidth), background: layer.fill }} />
          </div>
        );
      }
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
          <polygon points="50,0 100,100 0,100" fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />
        </svg>
      );
    }

    case "icon": {
      const Icon = getIcon(layer.icon);
      return (
        <div className="flex h-full w-full items-center justify-center">
          {/* eslint-disable-next-line react-hooks/static-components -- icon resolved dynamically from layer data */}
          <Icon size="100%" color={layer.color} strokeWidth={1.75} />
        </div>
      );
    }

    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layer.src}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
          style={{
            filter: `brightness(${layer.brightness}%) contrast(${layer.contrast}%) saturate(${layer.saturate}%)`,
            borderRadius: layer.radius,
          }}
        />
      );

    case "qrcode":
      return (
        <div className="h-full w-full p-0.5" style={{ background: layer.bgColor }}>
          <QRCodeSVG value={layer.value || "https://fidicard.app"} fgColor={layer.fgColor} bgColor={layer.bgColor} className="h-full w-full" />
        </div>
      );

    case "barcode":
      return <BarcodeCartouche value={layer.value} lineColor={layer.lineColor} background={layer.background} />;

    default:
      return null;
  }
}
