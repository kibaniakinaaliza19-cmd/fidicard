"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCardStore } from "@/store/cardStore";
import type { Layer, TextLayer } from "@/types/layer";
import { CARD_RATIO } from "@/types/layer";
import { backgroundToCss } from "@/lib/backgroundStyle";
import LayerContent from "@/components/cardEditor/LayerContent";
import { CreditCard } from "lucide-react";

const HANDLES = [
  { id: "nw", cx: 0, cy: 0 },
  { id: "n", cx: 0.5, cy: 0 },
  { id: "ne", cx: 1, cy: 0 },
  { id: "e", cx: 1, cy: 0.5 },
  { id: "se", cx: 1, cy: 1 },
  { id: "s", cx: 0.5, cy: 1 },
  { id: "sw", cx: 0, cy: 1 },
  { id: "w", cx: 0, cy: 0.5 },
] as const;

type DragMode =
  | { kind: "move" }
  | { kind: "resize"; handle: string }
  | { kind: "rotate" }
  | { kind: "marquee"; startX: number; startY: number }
  | null;

const SNAP = 1.2;

export default function CardCanvas() {
  const card = useCardStore((s) => s.card);
  const selectedIds = useCardStore((s) => s.selectedIds);
  const zoom = useCardStore((s) => s.zoom);
  const showGrid = useCardStore((s) => s.showGrid);
  const guides = useCardStore((s) => s.guides);
  const selectLayer = useCardStore((s) => s.selectLayer);
  const selectMany = useCardStore((s) => s.selectMany);
  const clearSelection = useCardStore((s) => s.clearSelection);
  const updateLayersLive = useCardStore((s) => s.updateLayersLive);
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const setGuides = useCardStore((s) => s.setGuides);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startClientX: number;
    startClientY: number;
    origin: Record<string, Layer>;
    rectW: number;
    rectH: number;
    centerClientX: number;
    centerClientY: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedLayers = [...card.layers].sort((a, b) => a.zIndex - b.zIndex);
  const selectedLayers = card.layers.filter((l) => selectedIds.includes(l.id));
  const primary = selectedLayers.length === 1 ? selectedLayers[0] : null;

  const beginDrag = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const origin: Record<string, Layer> = {};
      selectedLayers.forEach((l) => (origin[l.id] = { ...l }));
      dragRef.current = {
        mode,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origin,
        rectW: rect.width,
        rectH: rect.height,
        centerClientX: rect.left,
        centerClientY: rect.top,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [selectedLayers]
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || !drag.mode) return;
      const dxPct = ((e.clientX - drag.startClientX) / drag.rectW) * 100;
      const dyPct = ((e.clientY - drag.startClientY) / drag.rectH) * 100;

      if (drag.mode.kind === "move") {
        let snapX: number | null = null;
        let snapY: number | null = null;
        const patches: Record<string, Partial<Layer>> = {};
        Object.values(drag.origin).forEach((l) => {
          let nx = l.x + dxPct;
          let ny = l.y + dyPct;
          const centerX = nx + l.width / 2;
          const centerY = ny + l.height / 2;
          if (Math.abs(centerX - 50) < SNAP) {
            nx = 50 - l.width / 2;
            snapX = 50;
          }
          if (Math.abs(centerY - 50) < SNAP) {
            ny = 50 - l.height / 2;
            snapY = 50;
          }
          patches[l.id] = { x: nx, y: ny };
        });
        setGuides({ x: snapX, y: snapY });
        updateLayersLive(patches);
      } else if (drag.mode.kind === "resize") {
        const l = Object.values(drag.origin)[0];
        if (!l) return;
        const h = drag.mode.handle;
        let { x, y, width, height } = l;
        if (h.includes("e")) width = Math.max(3, l.width + dxPct);
        if (h.includes("s")) height = Math.max(3, l.height + dyPct);
        if (h.includes("w")) {
          width = Math.max(3, l.width - dxPct);
          x = l.x + (l.width - width);
        }
        if (h.includes("n")) {
          height = Math.max(3, l.height - dyPct);
          y = l.y + (l.height - height);
        }
        updateLayerLive(l.id, { x, y, width, height });
      } else if (drag.mode.kind === "rotate") {
        const l = Object.values(drag.origin)[0];
        if (!l) return;
        const cx = drag.centerClientX + ((l.x + l.width / 2) / 100) * drag.rectW;
        const cy = drag.centerClientY + ((l.y + l.height / 2) / 100) * drag.rectH;
        const angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
        const snapped = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
        updateLayerLive(l.id, { rotation: snapped });
      } else if (drag.mode.kind === "marquee") {
        // marquee handled on up via bounds
        const curX = ((e.clientX - drag.centerClientX) / drag.rectW) * 100;
        const curY = ((e.clientY - drag.centerClientY) / drag.rectH) * 100;
        setGuides({ x: null, y: null });
        drag.mode = { kind: "marquee", startX: drag.mode.startX, startY: drag.mode.startY };
        marqueeSelect(drag.mode.startX, drag.mode.startY, curX, curY);
      }
    }

    function marqueeSelect(x1: number, y1: number, x2: number, y2: number) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const hits = card.layers
        .filter((l) => !l.locked && !l.hidden)
        .filter((l) => {
          const lcx = l.x + l.width / 2;
          const lcy = l.y + l.height / 2;
          return lcx >= minX && lcx <= maxX && lcy >= minY && lcy <= maxY;
        })
        .map((l) => l.id);
      selectMany(hits);
    }

    function onUp() {
      const drag = dragRef.current;
      if (drag && drag.mode && drag.mode.kind !== "marquee") {
        commit();
      }
      setGuides({ x: null, y: null });
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [card.layers, commit, selectMany, setGuides, updateLayerLive, updateLayersLive]);

  function handleCanvasPointerDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return;
    clearSelection();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = ((e.clientX - rect.left) / rect.width) * 100;
    const sy = ((e.clientY - rect.top) / rect.height) * 100;
    dragRef.current = {
      mode: { kind: "marquee", startX: sx, startY: sy },
      startClientX: e.clientX,
      startClientY: e.clientY,
      origin: {},
      rectW: rect.width,
      rectH: rect.height,
      centerClientX: rect.left,
      centerClientY: rect.top,
    };
  }

  function handleLayerPointerDown(e: React.PointerEvent, layer: Layer) {
    if (layer.locked) return;
    e.stopPropagation();
    if (!selectedIds.includes(layer.id)) {
      selectLayer(layer.id, e.shiftKey);
    } else if (e.shiftKey) {
      selectLayer(layer.id, true);
      return;
    }
    beginDrag(e, { kind: "move" });
  }

  const BASE_W = 520;
  const BASE_H = BASE_W / CARD_RATIO;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
      <div style={{ width: BASE_W * zoom, height: BASE_H * zoom, position: "relative" }}>
        <div
          ref={cardRef}
          onPointerDown={handleCanvasPointerDown}
          className="absolute left-0 top-0 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: BASE_W,
            height: BASE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            ...backgroundToCss(card.background),
            touchAction: "none",
          }}
        >
          {showGrid && (
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                backgroundSize: "10% 10%",
              }}
            />
          )}

          {sortedLayers.map((layer) => {
            if (layer.hidden) return null;
            const selected = selectedIds.includes(layer.id);
            return (
              <div
                key={layer.id}
                onPointerDown={(e) => handleLayerPointerDown(e, layer)}
                onDoubleClick={() => layer.type === "text" && setEditingId(layer.id)}
                className="absolute"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  transform: `rotate(${layer.rotation}deg)`,
                  opacity: layer.opacity / 100,
                  zIndex: layer.zIndex,
                  cursor: layer.locked ? "default" : "move",
                  outline: selected ? "1.5px solid var(--accent-1)" : "none",
                  outlineOffset: 1,
                }}
              >
                <LayerContent layer={layer} editing={editingId === layer.id} />
                {editingId === layer.id && layer.type === "text" && (
                  <InlineTextEditor
                    layer={layer as TextLayer}
                    onDone={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}

          {/* FidiCard fixed watermark (imposed, non-editable) */}
          <div
            className="pointer-events-none absolute left-[4%] top-[7%] z-[999] flex items-center gap-1"
            style={{ opacity: 0.9 }}
          >
            <span
              className="flex items-center justify-center rounded-md"
              style={{
                width: 15,
                height: 15,
                background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
              }}
            >
              <CreditCard size={9} className="text-white" />
            </span>
            <span className="font-semibold text-white" style={{ fontSize: 9, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
              FidiCard
            </span>
          </div>

          {/* center guides */}
          {guides.x !== null && (
            <div className="pointer-events-none absolute left-1/2 top-0 z-[1000] h-full w-px -translate-x-1/2" style={{ background: "var(--accent-1)" }} />
          )}
          {guides.y !== null && (
            <div className="pointer-events-none absolute left-0 top-1/2 z-[1000] h-px w-full -translate-y-1/2" style={{ background: "var(--accent-1)" }} />
          )}

          {/* selection handles for single layer */}
          {primary && !primary.locked && (
            <SelectionOverlay
              layer={primary}
              onResizeStart={(e, handle) => {
                e.stopPropagation();
                beginDrag(e, { kind: "resize", handle });
              }}
              onRotateStart={(e) => {
                e.stopPropagation();
                beginDrag(e, { kind: "rotate" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SelectionOverlay({
  layer,
  onResizeStart,
  onRotateStart,
}: {
  layer: Layer;
  onResizeStart: (e: React.PointerEvent, handle: string) => void;
  onRotateStart: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[1001]"
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.width}%`,
        height: `${layer.height}%`,
        transform: `rotate(${layer.rotation}deg)`,
      }}
    >
      <div className="absolute inset-0 border border-[var(--accent-1)]" />
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => onResizeStart(e, h.id)}
          className="pointer-events-auto absolute h-2.5 w-2.5 rounded-full border bg-white"
          style={{
            left: `${h.cx * 100}%`,
            top: `${h.cy * 100}%`,
            transform: "translate(-50%, -50%)",
            borderColor: "var(--accent-1)",
            cursor: "nwse-resize",
          }}
        />
      ))}
      <div
        onPointerDown={onRotateStart}
        className="pointer-events-auto absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-white"
        style={{ top: "-22px", borderColor: "var(--accent-1)", cursor: "grab" }}
      />
      <div className="absolute left-1/2 top-0 h-[22px] w-px -translate-x-1/2 -translate-y-full" style={{ background: "var(--accent-1)" }} />
    </div>
  );
}

function InlineTextEditor({ layer, onDone }: { layer: TextLayer; onDone: () => void }) {
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={layer.content}
      onChange={(e) => updateLayerLive(layer.id, { content: e.target.value })}
      onBlur={() => {
        commit();
        onDone();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          commit();
          onDone();
        }
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 h-full w-full resize-none border-none bg-transparent outline-none"
      style={{
        fontFamily: "inherit",
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        fontStyle: layer.italic ? "italic" : "normal",
        color: layer.color,
        textAlign: layer.align,
        letterSpacing: layer.letterSpacing,
        lineHeight: layer.lineHeight,
      }}
    />
  );
}
