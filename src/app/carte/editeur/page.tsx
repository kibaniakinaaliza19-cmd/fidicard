import CardEditor from "@/components/cardEditor/CardEditor";
import EditeurMobile from "@/components/cardEditor/EditeurMobile";

/**
 * L'éditeur avancé demande de la place. Sous 1024 px, on montre l'aperçu et
 * on dit où faire le reste, plutôt qu'une interface présente mais inutilisable.
 *
 * La bascule est faite en CSS et non en JavaScript : pas de mesure de fenêtre,
 * donc pas de saut visible entre le rendu serveur et l'hydratation.
 */
export default function CarteEditeurPage() {
  return (
    <>
      <div className="lg:hidden">
        <EditeurMobile />
      </div>
      <div className="hidden lg:block lg:h-full">
        <CardEditor />
      </div>
    </>
  );
}
