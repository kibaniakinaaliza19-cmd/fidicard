import { notFound } from "next/navigation";
import { METRIQUES, metriqueParId } from "@/data/metriques";
import VueMesure from "@/components/analyse/VueMesure";

/**
 * La vue détaillée d'une mesure de l'accueil.
 *
 * Elle vit sous /analyse pour une raison précise : la barre du bas garde ses
 * cinq onglets et n'en gagne pas un sixième. On arrive ici en touchant une
 * tuile de l'accueil, on en repart par « Accueil ». Aucune autre entrée n'y
 * mène, et c'est voulu — c'est un approfondissement, pas une destination.
 */

export function generateStaticParams() {
  return METRIQUES.map((m) => ({ mesure: m.id }));
}

export default async function PageMesure({
  params,
}: {
  params: Promise<{ mesure: string }>;
}) {
  // Next 16 livre les paramètres de route de façon asynchrone.
  const { mesure } = await params;

  // On valide ici, mais on ne transmet que l'identifiant : chaque mesure porte
  // un composant d'icône, donc une fonction, et une fonction ne franchit pas
  // la frontière serveur → client. Le composant client relit la mesure.
  if (!metriqueParId(mesure)) notFound();

  return <VueMesure id={mesure} />;
}
