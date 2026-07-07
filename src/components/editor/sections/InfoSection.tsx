"use client";

import { Eye } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";

const fields: { key: keyof ReturnType<typeof useFields>; label: string; placeholder: string }[] = [
  { key: "phone", label: "Téléphone", placeholder: "06 12 34 56 78" },
  { key: "email", label: "Email", placeholder: "contact@monentreprise.fr" },
  { key: "website", label: "Site web", placeholder: "www.monentreprise.fr" },
  { key: "address", label: "Adresse", placeholder: "12 rue de la Paix, Paris" },
  { key: "hours", label: "Horaires", placeholder: "Lun-Sam 9h-19h" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "06 12 34 56 78" },
];

function useFields() {
  return useEditorStore((s) => s.design.info);
}

export default function InfoSection() {
  const info = useFields();
  const updateInfo = useEditorStore((s) => s.updateInfo);
  const setFlipped = useEditorStore((s) => s.setFlipped);

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <p className="mb-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
            {f.label}
          </p>
          <input
            value={info[f.key]}
            placeholder={f.placeholder}
            onChange={(e) => updateInfo({ [f.key]: e.target.value })}
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          />
        </div>
      ))}
      <button
        onClick={() => setFlipped(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
      >
        <Eye size={13} />
        Voir au dos de la carte
      </button>
    </div>
  );
}
