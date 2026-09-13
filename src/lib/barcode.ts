// Motif du code-barres FIDICARD.
//
// Le code retenu est À MODULES : de petits blocs empilés sur plusieurs
// rangées, encadrés à gauche et à droite par deux barres pleines — la famille
// qu'utilisent les portefeuilles mobiles. Ce n'est PAS un jeu de grosses
// barres verticales décoratives.
// Source : dossier FidiIA, « 04 - SYSTEMES FIDELITE / 05 ».
//
// Fonction pure : même code → mêmes modules, à chaque rendu.

export const BARCODE_TOTAL = 160;
export const BARCODE_ROWS = 5;

const GARDE = 3; // barre pleine encadrant le motif, à gauche et à droite
const MODULE = 1.6; // largeur d'un module élémentaire
const MODULES_MAX = 4; // un run va de 1 à 4 modules

export type Module = { x: number; y: number; w: number; h: number };

export function buildModules(value: string, height: number): Module[] {
  let seed = 0;
  for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const rowH = height / BARCODE_ROWS;
  const debut = GARDE + MODULE;
  const fin = BARCODE_TOTAL - GARDE - MODULE;
  const out: Module[] = [
    { x: 0, y: 0, w: GARDE, h: height },
    { x: BARCODE_TOTAL - GARDE, y: 0, w: GARDE, h: height },
  ];

  for (let r = 0; r < BARCODE_ROWS; r++) {
    let x = debut;
    let sombre = true; // une rangée commence toujours par un module sombre
    while (x < fin) {
      const w = Math.min((1 + Math.floor(next() * MODULES_MAX)) * MODULE, fin - x);
      if (sombre) out.push({ x, y: r * rowH, w, h: rowH });
      x += w;
      sombre = !sombre;
    }
  }
  return out;
}
