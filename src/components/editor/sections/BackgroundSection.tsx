"use client";

import { useRef } from "react";
import { Trash2, Upload } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import Slider from "@/components/ui/Slider";

export default function BackgroundSection() {
  const background = useEditorStore((s) => s.design.background);
  const updateBackground = useEditorStore((s) => s.updateBackground);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBackground({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-cover bg-center"
          style={{
            borderColor: "var(--border-strong)",
            backgroundImage: background.imageUrl ? `url(${background.imageUrl})` : undefined,
            background: background.imageUrl ? undefined : "var(--border)",
          }}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <Upload size={12} />
            Changer l&rsquo;image
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        <button
          onClick={() => updateBackground({ imageUrl: null })}
          disabled={!background.imageUrl}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-red-500 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <Slider
        label="Assombrir le fond"
        value={background.dim}
        min={0}
        max={90}
        unit="%"
        onChange={(v) => updateBackground({ dim: v })}
      />
    </div>
  );
}
