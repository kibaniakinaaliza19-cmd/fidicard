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
      {/* Une seule colonne sous lg : à 400 px, deux colonnes réduisent chaque
          bloc à une largeur où les mots se coupent un par ligne. */}
      <div className="grid grid-cols-1 gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-5 lg:col-span-2">
          <ImpactHero />

          {/* Trois tuiles côte à côte tronquent leurs libellés sur mobile.
              Deux tiennent, la troisième passe dessous. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
