/**
 * Le lien que scanne un client pour rejoindre le programme.
 *
 * Il existait en deux versions divergentes dans l'application : la fenêtre de
 * publication produisait `https://fidicard.app/c/<slug-du-nom>`, l'écran
 * scanner `https://fidicard.com/join/<code>`. Deux domaines, deux formes, pour
 * la même chose — et une seule des deux correspond à une route réelle,
 * /join/[code]. C'est celle-ci qui fait foi.
 */

/** Code de démonstration, en attendant que le commerce soit en base. */
export const CODE_COMMERCE = "7F8K92";

export const LIEN_INSCRIPTION = `https://fidicard.com/join/${CODE_COMMERCE}`;
