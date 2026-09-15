"use client";

import AccueilHeader from "@/components/accueil/AccueilHeader";
import QrCarte from "@/components/accueil/QrCarte";
import ImpactHero from "@/components/accueil/ImpactHero";
import MetriquesCles from "@/components/accueil/MetriquesCles";
import VisitsChart from "@/components/accueil/VisitsChart";
import LoyaltyCardPreview from "@/components/accueil/LoyaltyCardPreview";
import RecentActivity from "@/components/accueil/RecentActivity";

/**
 * L'accueil, en cockpit.
 *
 * L'ordre suit ce qu'on vient y chercher, du plus fréquent au plus rare :
 * inscrire un client (tous les jours, surtout les premières semaines), voir
 * si le mois est bon, juger la santé du programme, puis le détail.
 *
 * Les tuiles de « Santé du programme » mènent à /analyse/<mesure>. Cette vue
 * n'ajoute pas d'onglet en bas : on y entre par une tuile, on en sort par
 * « Accueil ».
 *
 * La bannière d'invitation a disparu : elle proposait d'afficher le QR code
 * que la page montre désormais en entier, trois blocs plus haut.
 */
export default function AccueilPage() {
  return (
    <div>
      <AccueilHeader />

      {/* Une seule colonne sous lg : à 400 px, deux colonnes réduisent chaque
          bloc à une largeur où les mots se coupent un par ligne. */}
      <div className="grid grid-cols-1 gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-5 lg:col-span-2">
          <QrCarte />
          <ImpactHero />
          <MetriquesCles />
          <VisitsChart />
        </div>

        <div className="space-y-5">
          <LoyaltyCardPreview />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
