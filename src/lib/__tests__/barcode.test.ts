import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModules, BARCODE_TOTAL, BARCODE_ROWS } from "../barcode.ts";

const H = 42;

test("le motif est déterministe : même code, mêmes modules", () => {
  assert.deepEqual(buildModules("FIDICARD0001", H), buildModules("FIDICARD0001", H));
});

test("deux codes différents donnent deux motifs différents", () => {
  const a = buildModules("FIDICARD0001", H);
  const b = buildModules("BOULANGERIE1", H);
  assert.notDeepEqual(a, b);
});

test("le motif est encadré par deux barres pleines", () => {
  const m = buildModules("FIDICARD0001", H);
  const pleines = m.filter((r) => r.h === H);
  assert.equal(pleines.length, 2, "exactement deux barres de garde");
  assert.equal(pleines[0].x, 0);
  assert.equal(pleines[1].x + pleines[1].w, BARCODE_TOTAL);
});

test("c'est un code à MODULES, pas à barres : plusieurs rangées empilées", () => {
  const m = buildModules("FIDICARD0001", H);
  const rangees = new Set(m.filter((r) => r.h !== H).map((r) => r.y));
  assert.equal(rangees.size, BARCODE_ROWS);

  // aucun module de contenu ne traverse toute la hauteur — sinon on aurait
  // redessiné des bâtons verticaux, ce que le dossier FidiIA interdit
  assert.ok(m.filter((r) => r.h === H).every((r) => r.x === 0 || r.x + r.w === BARCODE_TOTAL));
});

test("aucun module ne déborde du cadre", () => {
  for (const code of ["FIDICARD0001", "A", "SALONCILS42X", "000000000000"]) {
    for (const r of buildModules(code, H)) {
      assert.ok(r.x >= 0 && r.x + r.w <= BARCODE_TOTAL, `${code} : débordement horizontal`);
      assert.ok(r.y >= 0 && r.y + r.h <= H + 1e-9, `${code} : débordement vertical`);
      assert.ok(r.w > 0 && r.h > 0, `${code} : module vide`);
    }
  }
});

test("chaque rangée porte des modules", () => {
  const m = buildModules("FIDICARD0001", H);
  const rowH = H / BARCODE_ROWS;
  for (let r = 0; r < BARCODE_ROWS; r++) {
    assert.ok(m.some((x) => x.y === r * rowH && x.h !== H), `rangée ${r} vide`);
  }
});
