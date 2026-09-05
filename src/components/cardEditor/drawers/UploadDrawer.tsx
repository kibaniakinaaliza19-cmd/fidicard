"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { createImageLayer } from "@/lib/layerFactory";

export default function UploadDrawer({ title }: { title: string }) {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<string[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        setUploads((u) => [src, ...u]);
        place(src);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function place(src: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height || 1;
      const width = 30;
      addLayer(createImageLayer(z, src, { width, height: width / ratio / (85.6 / 53.98) }));
    };
    img.onerror = () => addLayer(createImageLayer(z, src));
    img.src = src;
  }

  return (
    <DrawerShell title={title}>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed py-8 transition-colors hover:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      >
        <UploadCloud size={32} className="text-[var(--accent-1)]" />
        <span className="text-sm font-medium">Importer un fichier</span>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>PNG, JPG, SVG</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

      {uploads.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Mes fichiers
          </p>
          <div className="grid grid-cols-3 gap-2">
            {uploads.map((src, i) => (
              <button
                key={i}
                onClick={() => place(src)}
                className="aspect-square overflow-hidden rounded-lg border transition-transform hover:scale-105"
                style={{ borderColor: "var(--border)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </DrawerShell>
  );
}
