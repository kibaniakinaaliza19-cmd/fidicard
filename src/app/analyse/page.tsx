"use client";

import AnalyseHeader from "@/components/analyse/AnalyseHeader";
import KpiCard from "@/components/analyse/KpiCard";
import VisitsChart from "@/components/analyse/VisitsChart";
import Heatmap from "@/components/analyse/Heatmap";
import Donut from "@/components/analyse/Donut";
import { PeriodSummary, TopCampaigns, Objectives, Alerts, SmartInsights } from "@/components/analyse/Panels";
import { kpiCards, extraKpis, notifTypes, clientsBreakdown } from "@/data/analytics";
import { usePlan } from "@/lib/usePlan";
import { PlanLockOverlay } from "@/components/plan/PlanLock";

export default function AnalysePage() {
  const { limits } = usePlan();
  const statsAvancees = limits.statsAvancees;
  const notifTotal = notifTypes.reduce((s, n) => s + n.value, 0);
  const clientsTotal = clientsBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div>
      <AnalyseHeader />

      <div className="space-y-5 px-8 pb-10">
        {/* KPI rows */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...kpiCards, ...extraKpis].map((k, i) => <KpiCard key={k.label} kpi={k} index={i} />)}
        </div>

        {/* main chart + period summary */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <VisitsChart />
          <PeriodSummary />
        </div>

        {/* heatmap + doughnut + top campaigns — statistiques avancées (Pro+) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <PlanLockOverlay unlocked={statsAvancees} label="Heures les plus fréquentées">
            <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <h2 className="mb-5 text-sm font-semibold" style={{ color: "var(--text)" }}>Heures les plus fréquentées</h2>
              <Heatmap />
            </div>
          </PlanLockOverlay>
          <PlanLockOverlay unlocked={statsAvancees} label="Performances par notification">
            <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Performances par type de notification</h2>
              <Donut segments={notifTypes} centerValue={notifTotal.toLocaleString("fr-FR")} centerLabel="Notifications" />
            </div>
          </PlanLockOverlay>
          <PlanLockOverlay unlocked={statsAvancees} label="Top campagnes">
            <TopCampaigns />
          </PlanLockOverlay>
        </div>

        {/* clients breakdown + objectives + alerts — statistiques avancées (Pro+) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <PlanLockOverlay unlocked={statsAvancees} label="Répartition des clients">
            <div className="rounded-2xl border p-6" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text)" }}>Répartition des clients</h2>
              <Donut segments={clientsBreakdown} centerValue={clientsTotal.toLocaleString("fr-FR")} centerLabel="Clients" size={160} />
            </div>
          </PlanLockOverlay>
          <PlanLockOverlay unlocked={statsAvancees} label="Objectifs">
            <Objectives />
          </PlanLockOverlay>
          <PlanLockOverlay unlocked={statsAvancees} label="Alertes">
            <Alerts />
          </PlanLockOverlay>
        </div>

        <PlanLockOverlay unlocked={statsAvancees} label="Analyse intelligente">
          <SmartInsights />
        </PlanLockOverlay>
      </div>
    </div>
  );
}
