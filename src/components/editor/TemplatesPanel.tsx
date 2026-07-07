"use client";

import { Sparkles } from "lucide-react";
import { templates } from "@/data/templates";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";
import TemplateThumb from "@/components/editor/TemplateThumb";

export default function TemplatesPanel() {
  const activeTemplateId = useEditorStore((s) => s.design.templateId);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const setTemplateGalleryOpen = useUIStore((s) => s.setTemplateGalleryOpen);
  const setAiAssistantOpen = useUIStore((s) => s.setAiAssistantOpen);
  const pushToast = useUIStore((s) => s.pushToast);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Modèles
        </h3>
        <button
          onClick={() => setTemplateGalleryOpen(true)}
          className="cursor-pointer text-xs font-medium transition-colors hover:text-[var(--accent-1)]"
          style={{ color: "var(--text-faint)" }}
        >
          Voir tout
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {templates.slice(0, 3).map((t) => (
          <TemplateThumb
            key={t.id}
            template={t}
            active={t.id === activeTemplateId}
            onClick={() => {
              applyTemplate(t.id);
              pushToast(`Modèle « ${t.name} » appliqué`);
            }}
          />
        ))}
      </div>

      <button
        onClick={() => setAiAssistantOpen(true)}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-all hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      >
        <Sparkles size={14} />
        Créer avec IA
      </button>
    </div>
  );
}
