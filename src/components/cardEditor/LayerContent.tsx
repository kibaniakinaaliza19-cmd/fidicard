"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import JsBarcode from "jsbarcode";
import type { Layer } from "@/types/layer";
import { getIcon } from "@/lib/icons";
import { getFontCssVar } from "@/lib/fonts";

function BarcodeSvg({ value, lineColor, background }: { value: string; lineColor: string; background: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value || "0", {
        format: "CODE128",
        lineColor,
        background,
        displayValue: true,
        fontSize: 14,
        margin: 4,
        height: 40,
      });
    } catch {}
  }, [value, lineColor, background]);

  return <svg ref={ref} className="h-full w-full" />;
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
      return <BarcodeSvg value={layer.value} lineColor={layer.lineColor} background={layer.background} />;

    default:
      return null;
  }
}
