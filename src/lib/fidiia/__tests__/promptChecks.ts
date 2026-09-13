// Outillage de test des prompts. Pas un fichier .test.ts : il n'est pas
// exécuté seul, il est consommé par prompts.test.ts.
//
// Raison d'être : le texte des prompts écrit ses chiffres en clair, pour
// pouvoir être rédigé librement. Rien ne garantit alors qu'ils correspondent
// aux bornes réellement appliquées par les schémas — sauf ce contrôle.

export interface Divergence {
  nombre: number;
  /** Le passage où le nombre apparaît, pour retrouver la ligne fautive. */
  extrait: string;
}

/**
 * Renvoie tous les nombres d'un texte qui ne figurent pas dans la liste des
 * valeurs déclarées. Un tableau vide signifie : aucun chiffre ne ment.
 */
export function chiffresNonDeclares(texte: string, autorises: number[]): Divergence[] {
  const permis = new Set(autorises);
  const divergences: Divergence[] = [];
  const motif = /\d+/g;
  let m: RegExpExecArray | null;

  while ((m = motif.exec(texte)) !== null) {
    const nombre = Number(m[0]);
    if (permis.has(nombre)) continue;
    const debut = Math.max(0, m.index - 40);
    const fin = Math.min(texte.length, m.index + m[0].length + 40);
    divergences.push({
      nombre,
      extrait: texte.slice(debut, fin).replace(/\s+/g, " ").trim(),
    });
  }
  return divergences;
}

/** Message d'échec directement actionnable : le nombre, et où le corriger. */
export function decrireDivergences(bloc: string, d: Divergence[]): string {
  return [
    `${bloc} contient ${d.length} chiffre(s) qui ne correspondent à aucune borne`,
    "déclarée dans validation/schemas.ts :",
    ...d.map((x) => `  ${x.nombre} → « …${x.extrait}… »`),
    "",
    "Corrigez le texte du prompt, ou déclarez la valeur dans schemas.ts si",
    "elle est réellement appliquée quelque part.",
  ].join("\n");
}

/** Fournisseurs et modèles qu'un prompt ne doit jamais nommer. */
export const MOTS_INTERDITS = [
  "openai",
  "anthropic",
  "chatgpt",
  "gpt-",
  "claude",
  "gemini",
  "mistral",
  "llama",
];

export function motsInterditsTrouves(texte: string): string[] {
  const n = texte.toLowerCase();
  return MOTS_INTERDITS.filter((mot) => n.includes(mot));
}
