"use client";

import { IphonePreview, AndroidPreview } from "./PushPreview";
import { featuredPush } from "@/data/notifications";

export default function PreviewColumn() {
  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>
        Aperçu de la notification
      </h2>

      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--text-dim)" }}>
        <span className="h-2 w-2 rounded-full" style={{ background: "#32d583" }} /> iPhone
      </div>
      <IphonePreview push={featuredPush} />

      <div className="mb-2 mt-5 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--text-dim)" }}>
        <span className="h-2 w-2 rounded-full" style={{ background: "#32d583" }} /> Android
      </div>
      <AndroidPreview push={featuredPush} />
    </div>
  );
}
