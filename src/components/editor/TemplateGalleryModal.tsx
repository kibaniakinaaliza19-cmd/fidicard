"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import TemplateThumb from "@/components/editor/TemplateThumb";
import { templates, categoryLabels } from "@/data/templates";
import { useEditorStore } from "@/store/editorStore";
import { useUIStore } from "@/store/uiStore";

export default function TemplateGalleryModal() {
  const open = useUIStore((s) => s.templateGalleryOpen);
  const setOpen = useUIStore((s) => s.setTemplateGalleryOpen);
  const pushToast = useUIStore((s) => s.pushToast);
  const activeTemplateId = useEditorStore((s) => s.design.templateId);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(
    () => (category === "all" ? templates : templates.filter((t) => t.category === category)),
    [category]
  );

  const categories = ["all", ...Object.keys(categoryLabels)];

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Bibliothèque de modèles"
      subtitle="Choisis un point de départ pour ta carte de fidélité"
      wide
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor: category === c ? "var(--accent-1)" : "var(--border)",
              background: category === c ? "var(--accent-glow)" : "transparent",
              color: category === c ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {c === "all" ? "Tous" : categoryLabels[c]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {filtered.map((t) => (
          <TemplateThumb
            key={t.id}
            template={t}
            active={t.id === activeTemplateId}
            compact
            onClick={() => {
              applyTemplate(t.id);
              setOpen(false);
              pushToast(`Modèle « ${t.name} » appliqué`);
            }}
          />
        ))}
      </div>
    </Modal>
  );
}
