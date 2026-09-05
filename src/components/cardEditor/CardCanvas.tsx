"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { renderZones } from "@/lib/loyalty/renderLayer";
import type { Layer, TextLayer, Zone } from "@/types/layer";
import { CARD_RATIO } from "@/types/layer";
import { backgroundToCss } from "@/lib/backgroundStyle";
import LayerContent from "@/components/cardEditor/LayerContent";
import FidiLogo from "@/components/ui/FidiLogo";

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
  const selectedZoneId = useCardStore((s) => s.selectedZoneId);
  const selectZone = useCardStore((s) => s.selectZone);
  const updateZoneLive = useCardStore((s) => s.updateZoneLive);
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

  // v2 : calques éphémères des zones fonctionnelles, rendus depuis la config
  // de fidélité — affichés au-dessus du design, non interactifs (étape 5)
  const loyaltyConfig = useLoyaltyStore((s) => s.config);
  const zoneLayers = useMemo(() => {
    if (card.version !== 2 || !card.zones?.length) return [];
    const zBase = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    return renderZones(card.zones, loyaltyConfig, { zBase });
  }, [card.version, card.zones, card.layers, loyaltyConfig]);
  const zoneLayerIds = useMemo(() => new Set(zoneLayers.map((l) => l.id)), [zoneLayers]);

  const sortedLayers = [...card.layers, ...zoneLayers].sort((a, b) => a.zIndex - b.zIndex);
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
            const isZone = zoneLayerIds.has(layer.id);
            const selected = !isZone && selectedIds.includes(layer.id);
            return (
              <div
                key={layer.id}
                onPointerDown={isZone ? undefined : (e) => handleLayerPointerDown(e, layer)}
                onDoubleClick={isZone ? undefined : () => layer.type === "text" && setEditingId(layer.id)}
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
                  pointerEvents: isZone ? "none" : undefined,
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

          {/* zones fonctionnelles (v2) : bloc unique, déplaçable/redimensionnable */}
          {card.version === 2 &&
            card.zones?.map((zone) => (
              <ZoneBox
                key={zone.id}
                zone={zone}
                cardRef={cardRef}
                selected={selectedZoneId === zone.id}
                onSelect={() => selectZone(zone.id)}
                updateLive={updateZoneLive}
                commit={commit}
              />
            ))}

          {/* FidiCard fixed watermark (imposed, non-editable) */}
          <div
            className="pointer-events-none absolute left-[4%] top-[7%] z-[999] flex items-center gap-1"
            style={{ opacity: 0.92 }}
          >
            <FidiLogo size={16} glow={false} />
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

const clampN = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// La zone de fidélité se manipule comme UN objet : on déplace/redimensionne le
// conteneur (frame), jamais les tampons individuels — ceux-ci sont rendus par
// le moteur. « Détacher la grille » (panneau Calques) reste la porte de sortie.
function ZoneBox({
  zone,
  cardRef,
  selected,
  onSelect,
  updateLive,
  commit,
}: {
  zone: Zone;
  cardRef: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
  onSelect: () => void;
  updateLive: (id: string, patch: Partial<Zone>) => void;
  commit: () => void;
}) {
  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; frame: Zone["frame"]; rw: number; rh: number } | null>(null);

  const begin = useCallback(
    (e: React.PointerEvent, mode: "move" | "resize") => {
      e.stopPropagation();
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      onSelect();
      drag.current = { mode, sx: e.clientX, sy: e.clientY, frame: { ...zone.frame }, rw: rect.width, rh: rect.height };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [cardRef, onSelect, zone.frame],
  );

  useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const dx = ((e.clientX - d.sx) / d.rw) * 100;
      const dy = ((e.clientY - d.sy) / d.rh) * 100;
      const f = { ...d.frame };
      if (d.mode === "move") {
        f.x = clampN(d.frame.x + dx, 0, 100 - d.frame.w);
        f.y = clampN(d.frame.y + dy, 0, 100 - d.frame.h);
      } else {
        f.w = clampN(d.frame.w + dx, 14, 100 - d.frame.x);
        f.h = clampN(d.frame.h + dy, 8, 100 - d.frame.y);
      }
      updateLive(zone.id, { frame: f });
    }
    function up() {
      if (drag.current) {
        drag.current = null;
        commit();
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [zone.id, updateLive, commit]);

  return (
    <div
      onPointerDown={(e) => begin(e, "move")}
      className="absolute z-[1002]"
      style={{
        left: `${zone.frame.x}%`,
        top: `${zone.frame.y}%`,
        width: `${zone.frame.w}%`,
        height: `${zone.frame.h}%`,
        cursor: "move",
        outline: selected ? "1.5px dashed var(--accent-1)" : "1px dashed rgba(240,101,62,0.35)",
        outlineOffset: 3,
        borderRadius: 6,
      }}
    >
      {selected && (
        <>
          <span
            className="pointer-events-none absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
            style={{ background: "var(--accent-1)" }}
          >
            🔒 Grille de fidélité — gérée automatiquement
          </span>
          <div
            onPointerDown={(e) => begin(e, "resize")}
            className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 bg-white"
            style={{ borderColor: "var(--accent-1)", cursor: "nwse-resize" }}
          />
        </>
      )}
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
