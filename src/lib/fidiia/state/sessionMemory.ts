// La mémoire de session : quatre catégories, jamais mélangées.
//
//   informations  ce que le commerçant POSSÈDE (logo, carte, couleurs)
//   decisions     ce qu'il a CHOISI (mode, objectif, récompense)
//   preferences   ce qu'il AIME (style sobre, tons chauds)
//   verrous       ce qu'il a INTERDIT de modifier
//
// Les verrous sont la pièce critique. Une règle de prompt se contourne ; un
// rejet en code ne se contourne pas. Un verrou ne se lève que sur demande
// explicite du commerçant.

import type { Cible } from "../validation/schemas.ts";

export interface SessionMemory {
  readonly informations: Readonly<Record<string, unknown>>;
  readonly decisions: Readonly<Record<string, unknown>>;
  readonly preferences: readonly string[];
  readonly verrous: readonly Cible[];
}

export function creerMemoire(init: Partial<SessionMemory> = {}): SessionMemory {
  return Object.freeze({
    informations: Object.freeze({ ...(init.informations ?? {}) }),
    decisions: Object.freeze({ ...(init.decisions ?? {}) }),
    preferences: Object.freeze([...(init.preferences ?? [])]),
    verrous: Object.freeze([...(init.verrous ?? [])]),
  });
}

export function noterInformation(
  m: SessionMemory,
  cle: string,
  valeur: unknown,
): SessionMemory {
  return creerMemoire({ ...m, informations: { ...m.informations, [cle]: valeur } });
}

export function noterDecision(
  m: SessionMemory,
  cle: string,
  valeur: unknown,
): SessionMemory {
  return creerMemoire({ ...m, decisions: { ...m.decisions, [cle]: valeur } });
}

export function noterPreference(m: SessionMemory, texte: string): SessionMemory {
  const t = texte.trim();
  if (!t || m.preferences.includes(t)) return m;
  return creerMemoire({ ...m, preferences: [...m.preferences, t] });
}

/* ----------------------------------------------------------------- verrous */

export function estVerrouille(m: SessionMemory, cible: Cible): boolean {
  return m.verrous.includes(cible);
}

export function poserVerrou(m: SessionMemory, cible: Cible): SessionMemory {
  if (estVerrouille(m, cible)) return m;
  return creerMemoire({ ...m, verrous: [...m.verrous, cible] });
}

export type LeveeVerrou =
  | { ok: true; memory: SessionMemory }
  | { ok: false; motif: string };

/**
 * Un verrou ne se lève QUE sur demande explicite du commerçant. Appeler cette
 * fonction sans `explicite` est refusé — c'est le point où une IA trop zélée
 * se ferait arrêter.
 */
export function leverVerrou(
  m: SessionMemory,
  cible: Cible,
  explicite: boolean,
): LeveeVerrou {
  if (!explicite) {
    return {
      ok: false,
      motif: `« ${cible} » est verrouillé : seul le commerçant peut lever ce verrou.`,
    };
  }
  if (!estVerrouille(m, cible)) return { ok: true, memory: m };
  return {
    ok: true,
    memory: creerMemoire({ ...m, verrous: m.verrous.filter((v) => v !== cible) }),
  };
}
