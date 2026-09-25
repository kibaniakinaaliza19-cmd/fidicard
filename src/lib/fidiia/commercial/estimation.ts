// Le gain estimé annoncé au prospect (§ 5 du parcours commercial).
//
// Un chiffre de gain ne doit jamais sortir du modèle : guardrails.ts l'interdit
// déjà en général (« tu ne cites jamais un chiffre que tu n'as pas reçu »), et
// un chiffre commercial faux est pire qu'un chiffre absent — c'est la première
// chose qu'un commerçant vérifiera contre son expérience. Ce module calcule le
// gain une fois, en code, à partir des chiffres que LUI a donnés ; le prompt
// (prompts/build.ts:resumerEtat) le montre au modèle comme un FAIT à annoncer
// tel quel, jamais à recalculer.
//
// L'hypothèse est délibérément prudente et déclarée en toutes lettres : un
// commerçant qui découvre plus tard qu'elle était optimiste ne fait plus
// confiance au reste du chiffrage.

/** Part des clients qui reviennent en plus grâce au programme — hypothèse
 *  volontairement basse. Un vrai programme de fidélité bien mené fait
 *  souvent mieux ; annoncer le haut de fourchette expose à la déception. */
export const TAUX_RETOUR_PRUDENT = 0.08;

/** Semaines par mois — moyenne calendaire, pas 4 pile. */
const SEMAINES_PAR_MOIS = 4.33;

export interface HypotheseGain {
  clientsParSemaine?: number;
  nbPointsVente?: number;
}

export interface EstimationGain {
  /** Nombre de visites supplémentaires estimées par mois, arrondi. */
  visitesSupplementairesParMois: number;
  /** Phrase d'hypothèse, à citer telle quelle : le taux y est en toutes lettres. */
  hypotheseTexte: string;
}

/**
 * `null` tant qu'aucun chiffre exploitable n'est connu : pas d'estimation
 * inventée sur un commerce dont on ne sait rien.
 */
export function estimerGain(h: HypotheseGain): EstimationGain | null {
  if (!h.clientsParSemaine || h.clientsParSemaine <= 0) return null;
  // Un commerçant qui ne connaît que le total tous points de vente confondus
  // ne doit pas voir son chiffre multiplié par un nombre de vitrines qu'il
  // n'a pas donné : 1 par défaut, jamais deviné à la hausse.
  const pointsVente = h.nbPointsVente && h.nbPointsVente > 0 ? h.nbPointsVente : 1;
  const visitesParMois = h.clientsParSemaine * SEMAINES_PAR_MOIS * pointsVente;
  const visitesSupplementairesParMois = Math.round(visitesParMois * TAUX_RETOUR_PRUDENT);
  return {
    visitesSupplementairesParMois,
    hypotheseTexte: `hypothèse prudente : ${Math.round(TAUX_RETOUR_PRUDENT * 100)} % de visites en plus grâce au programme de fidélité`,
  };
}
