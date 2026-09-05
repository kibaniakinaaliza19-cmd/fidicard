// Liste les modèles auxquels VOTRE clé OpenAI donne réellement accès.
//
//     npm run fidiia:modeles
//
// À utiliser avant de renseigner FIDIIA_OPENAI_MODEL. Aucune documentation,
// aucun article et aucune supposition ne remplace cette liste : elle vient de
// l'API, avec la clé qui servira en production.

import { readFileSync } from "node:fs";
import { listerModeles } from "../src/lib/fidiia/provider/openai.ts";

function chargerEnvLocal(): void {
  // .env.local est gitignoré et n'est pas chargé hors de Next : on le lit à la
  // main pour que le script marche comme le reste du produit.
  try {
    const texte = readFileSync(".env.local", "utf8");
    for (const ligne of texte.split(/\r?\n/)) {
      const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const valeur = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = valeur;
    }
  } catch {
    // pas de .env.local : les variables viennent peut-être de l'environnement
  }
}

async function main(): Promise<void> {
  chargerEnvLocal();

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY n'est pas défini.");
    console.error("Ajoutez-le dans .env.local (jamais NEXT_PUBLIC_, jamais commité) :");
    console.error("    OPENAI_API_KEY=sk-...");
    process.exitCode = 1;
    return;
  }

  const modeles = await listerModeles();
  console.log(`${modeles.length} modèles accessibles avec cette clé :\n`);
  for (const m of modeles) {
    console.log(`  ${m.id.padEnd(44)} ${m.cree ?? ""}`);
  }

  console.log("\nChoisissez-en un, puis dans .env.local :");
  console.log("    FIDIIA_PROVIDER=openai");
  console.log("    FIDIIA_OPENAI_MODEL=<l'identifiant exact ci-dessus>");
  console.log("\nRien n'est écrit en dur dans le code : c'est cette liste qui fait autorité.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
