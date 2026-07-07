"use client";

import { Users, Stamp, Gift } from "lucide-react";
import AccueilHeader from "@/components/accueil/AccueilHeader";
import ImpactHero from "@/components/accueil/ImpactHero";
import StatCardGlow from "@/components/accueil/StatCardGlow";
import VisitsChart from "@/components/accueil/VisitsChart";
import InviteBanner from "@/components/accueil/InviteBanner";
import LoyaltyCardPreview from "@/components/accueil/LoyaltyCardPreview";
import RecentActivity from "@/components/accueil/RecentActivity";

export default function AccueilPage() {
  return (
    <div>
      <AccueilHeader />
      <div className="grid grid-cols-3 gap-5 px-8 pb-10">
        <div className="col-span-2 space-y-5">
          <ImpactHero />

          <div className="grid grid-cols-3 gap-4">
            <StatCardGlow label="Clients actifs" value={312} delta="+8%" icon={Users} color="#a78bfa" />
            <StatCardGlow label="Tampons distribués" value={1847} delta="+15%" icon={Stamp} color="#e0342c" />
            <StatCardGlow label="Récompenses débloquées" value={89} delta="+5%" icon={Gift} color="#f0653e" />
          </div>

          <VisitsChart />
          <InviteBanner />
        </div>

        <div className="space-y-5">
          <LoyaltyCardPreview />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
