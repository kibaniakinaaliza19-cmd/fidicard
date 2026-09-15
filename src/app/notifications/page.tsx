"use client";

import { useState } from "react";
import { Bell, LayoutGrid, Plus } from "lucide-react";
import KpiRow from "@/components/notifications/KpiRow";
import NotifQuotaBar from "@/components/notifications/NotifQuotaBar";
import ImpactCard from "@/components/notifications/ImpactCard";
import PreviewColumn from "@/components/notifications/PreviewColumn";
import TabsSection from "@/components/notifications/TabsSection";
import ScheduledCard from "@/components/notifications/ScheduledCard";
import CreateNotificationDrawer from "@/components/notifications/CreateNotificationDrawer";

export default function NotificationsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3 px-8 pb-6 pt-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            <Bell size={22} className="text-[var(--accent-1)]" /> Notifications
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
            Gérez, personnalisez et programmez vos notifications
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <LayoutGrid size={15} /> Importer un modèle
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", boxShadow: "0 10px 24px -8px var(--accent-glow)" }}
          >
            <Plus size={15} /> Créer une notification
          </button>
        </div>
      </header>

      <div className="space-y-5 px-8 pb-10">
        <NotifQuotaBar />
        <KpiRow />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <ImpactCard />
            <TabsSection />
          </div>
          <div className="space-y-5">
            <PreviewColumn />
            <ScheduledCard onOpenDrawer={() => setDrawerOpen(true)} />
          </div>
        </div>
      </div>

      <CreateNotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
