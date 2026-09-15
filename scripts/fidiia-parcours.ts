// Parcours complet de FidiIA en simulation. Aucun réseau, aucune clé.
//
//   node scripts/fidiia-parcours.ts
//
// Démontre : conversation → trois propositions → choix → carte structurée →
// ajustement respectant un verrou.

import { creerSession, envoyerMessage } from "../src/lib/fidiia/index.ts";
import { estVerrouille } from "../src/lib/fidiia/state/sessionMemory.ts";
import { controlerCarte, motifsEchec, toutValide } from "../src/lib/fidiia/validation/quality.ts";

const SEP = "─".repeat(72);

function bloc(titre: string): void {
  console.log(`\n${SEP}\n${titre}\n${SEP}`);
}

async function dire(session: ReturnType<typeof creerSession>, texte: string): Promise<void> {
  const r = await envoyerMessage(session, texte);
  console.log(`\n  commerçant  ${texte}`);
  console.log(`  FidiIA      ${r.reply}`);
  const details = [
    `étape ${r.decision.step}`,
    `appels ${r.appels}`,
    r.action ? `action ${r.action.type}` : "action —",
  ];
  if (r.verrousPoses.length) details.push(`verrou posé : ${r.verrousPoses.join(", ")}`);
  if (r.refus) details.push(`REFUS ${r.refus.code}`);
  if (r.repli) details.push("REPLI");
  console.log(`              [${details.join(" · ")}]`);
}

// Le nom du commerce vient du compte, pas de la conversation : FidiIA n'a pas
// à le demander, et aucune des six actions ne l'écrit.
const session = creerSession({ etat: { nomCommerce: "Atelier Nord" } });

bloc("1. CONVERSATION — FidiIA ne demande que ce qu'elle ignore");
await dire(session, "Je suis coiffeur");
await dire(session, "Plutôt élégant, haut de gamme");

bloc("2. TROIS PROPOSITIONS — même identité, styles différents");
console.log(`\n  secteur retenu : ${session.etat.secteur}`);
console.log(`  ambiance       : ${String(session.memory.decisions.ambiance)}`);
console.log(`  carte proposée : ${session.carteProposee ? "oui" : "non"}`);

bloc("3. CHOIX ET RÉGLAGES — le programme se complète");
await dire(session, "Je prends la deuxième. 10 passages");
await dire(session, "Une coupe offerte");

console.log(`\n  création autorisée : ${session.etat.creationAutorisee ? "oui" : "non"}`);
console.log(`  informations       : secteur=${session.etat.secteur} · nom=${session.etat.nomCommerce}`);
console.log(`                       mode=${session.etat.systemeFidelite} · objectif=${session.etat.objectif}`);
console.log(`                       récompense=${session.etat.recompense?.texte}`);

bloc("4. RECONSTRUCTION STRUCTURÉE — zone déclarative, aucun tampon dessiné");
await dire(session, "Vas-y, crée la carte");

if (session.carte) {
  const c = session.carte;
  console.log(`\n  nom            ${c.nomCommerce}`);
  console.log(`  calques        ${c.calques.map((l) => l.nom).join(" · ")}`);
  console.log(`  zones fidélité ${c.zonesFidelite.length} (${c.zonesFidelite.join(", ")})`);
  console.log(`  programme      ${c.programme.mode} · objectif ${c.programme.objectif}`);
  console.log(`  paliers        ${c.programme.paliers.map((p) => `${p.position}:${p.label}`).join(" · ")}`);

  const verdicts = controlerCarte(c, session.memory);
  console.log(`\n  contrôles qualité : ${verdicts.filter((v) => v.ok).length}/${verdicts.length} au vert`);
  if (!toutValide(verdicts)) console.log(`  ÉCHECS : ${motifsEchec(verdicts).join(" | ")}`);
} else {
  console.log("\n  aucune carte produite");
}

bloc("5. VERROU — « ne touche pas au logo », puis tentative de le modifier");
await dire(session, "Ne touche pas au logo");
console.log(`\n  logo verrouillé : ${estVerrouille(session.memory, "logo") ? "oui" : "non"}`);

await dire(session, "Change seulement le logo");
console.log(`  logo toujours verrouillé : ${estVerrouille(session.memory, "logo") ? "oui" : "non"}`);

bloc("6. AJUSTEMENT AUTORISÉ — une autre cible passe");
await dire(session, "Change uniquement les couleurs");

bloc("7. JOURNAL — aucun contenu de conversation, aucune donnée personnelle");
for (const e of session.journal) {
  console.log(
    `  tour ${String(e.tour).padStart(2)} · ${e.step.padEnd(12)} · ${e.appels} appel(s) · ` +
      `action ${e.action ?? "—"}${e.repli ? " · REPLI" : ""} · prompt ${e.versionPrompt}`,
  );
}

const appelsTotal = session.journal.reduce((s, e) => s + e.appels, 0);
console.log(`\n  ${session.journal.length} tours, ${appelsTotal} appels simulés, 0 appel réseau.`);
console.log(`  fournisseur : ${session.provider.id}\n`);
