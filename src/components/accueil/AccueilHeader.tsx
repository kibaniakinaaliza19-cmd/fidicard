"use client";

/**
 * Salutation.
 *
 * Il n'y a plus de boutons ici. « Ajouter un tampon » a été retiré : le tampon
 * s'ajoute en scannant la carte du client, geste qui a déjà son bouton — celui
 * du centre de la barre basse, le plus atteignable de l'écran. Un second
 * chemin, en haut, sans client scanné, ne menait qu'à un formulaire.
 *
 * « Afficher QR » n'est plus un bouton non plus : le code lui-même est affiché
 * juste en dessous. Voir QrCarte.
 *
 * Le « 👋 » qui suivait le nom est parti aussi. Un emoji dans le chrome d'une
 * application professionnelle la fait passer pour un prototype : il change de
 * dessin sur chaque plateforme, n'a pas la graisse du texte qui l'entoure, et
 * ne dit rien que la phrase ne dise déjà.
 */
export default function AccueilHeader() {
  return (
    <header className="px-4 pb-5 pt-6 sm:px-6 lg:px-8">
      <h1
        className="text-[26px] font-bold leading-tight tracking-tight sm:text-3xl"
        style={{ color: "var(--text)" }}
      >
        Bonjour, Café Madeleine
      </h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--text-dim)" }}>
        Voici votre activité de ce mois.
      </p>
    </header>
  );
}
