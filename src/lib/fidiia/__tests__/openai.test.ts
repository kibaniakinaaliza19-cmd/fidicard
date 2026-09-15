// Tests de l'adaptateur OpenAI. Aucun appel réseau : `fetch` est fourni.
//
// Ce qui compte ici n'est pas qu'on sache parler à OpenAI — c'est qu'on refuse
// de le faire sur un identifiant de modèle deviné, et que la clé ne fuie nulle
// part.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  configurationManquante,
  creerOpenAIProvider,
  listerModeles,
} from "../provider/openai.ts";

const CLE = "sk-test-000";
const MODELE = "modele-de-test";

/** fetch simulé : mémorise l'appel, renvoie la charge utile demandée. */
function faussetFetch(charge: unknown, ok = true, statut = 200) {
  const appels: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: unknown, init?: RequestInit) => {
    appels.push({ url: String(url), init });
    return {
      ok,
      status: statut,
      json: async () => charge,
      text: async () => JSON.stringify(charge),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, appels };
}

const REPONSE_TEXTE = { choices: [{ message: { content: "Bonjour" } }] };

/* ------------------------------------------------ refus de deviner */

test("aucun modèle deviné : sans FIDIIA_OPENAI_MODEL, la création échoue", () => {
  assert.throws(
    () => creerOpenAIProvider({ cle: CLE }),
    /FIDIIA_OPENAI_MODEL/,
    "un modèle absent doit lever, pas prendre une valeur par défaut",
  );
});

test("sans clé, la création échoue aussi", () => {
  assert.throws(() => creerOpenAIProvider({ modele: MODELE }), /OPENAI_API_KEY/);
});

test("configurationManquante nomme précisément ce qui manque", () => {
  assert.deepEqual(configurationManquante({ cle: CLE, modele: MODELE }), []);
  assert.deepEqual(configurationManquante({ cle: CLE }), ["FIDIIA_OPENAI_MODEL"]);
  assert.deepEqual(configurationManquante({ modele: MODELE }), ["OPENAI_API_KEY"]);
});

test("le message d'erreur oriente vers la liste réelle des modèles", () => {
  try {
    creerOpenAIProvider({ cle: CLE });
    assert.fail("aurait dû lever");
  } catch (e) {
    assert.match((e as Error).message, /fidiia:modeles/);
  }
});

/* ------------------------------------------------------- appel chat */

test("le modèle configuré est celui envoyé, sans substitution", async () => {
  const f = faussetFetch(REPONSE_TEXTE);
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });
  await p.chat([{ role: "user", content: "salut" }], []);

  const corps = JSON.parse(String(f.appels[0].init?.body));
  assert.equal(corps.model, MODELE);
  assert.equal(f.appels[0].url, "https://api.openai.com/v1/chat/completions");
});

test("un appel d'outil est remonté, ses arguments désérialisés", async () => {
  const f = faussetFetch({
    choices: [
      {
        message: {
          content: "Voilà",
          tool_calls: [
            { function: { name: "objectif", arguments: '{"type":"objectif","valeur":10}' } },
          ],
        },
      },
    ],
  });
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });
  const r = await p.chat([{ role: "user", content: "10 tampons" }], []);

  assert.equal(r.reply, "Voilà");
  assert.equal(r.toolCall?.name, "objectif");
  assert.deepEqual(r.toolCall?.arguments, { type: "objectif", valeur: 10 });
});

test("des arguments en JSON cassé ne font pas tomber l'appel", async () => {
  // Le moteur doit pouvoir REJETER proprement puis relancer : lever ici
  // consommerait le budget d'appels sans motif exploitable.
  const f = faussetFetch({
    choices: [{ message: { content: "", tool_calls: [{ function: { name: "x", arguments: "{pas du json" } }] } }],
  });
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });
  const r = await p.chat([{ role: "user", content: "?" }], []);
  assert.equal(r.toolCall?.arguments, "{pas du json");
});

test("les outils sont traduits au format attendu", async () => {
  const f = faussetFetch(REPONSE_TEXTE);
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });
  await p.chat(
    [{ role: "user", content: "x" }],
    [{ name: "mode", description: "choisit le mode", parameters: { type: "object" } }],
  );
  const corps = JSON.parse(String(f.appels[0].init?.body));
  assert.equal(corps.tools[0].type, "function");
  assert.equal(corps.tools[0].function.name, "mode");
});

/* ------------------------------------------------------------ vision */

test("vision : une sortie illisible devient une erreur exploitable", async () => {
  const f = faussetFetch({ choices: [{ message: { content: "je ne sais pas lire ça" } }] });
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });
  const r = await p.vision("data:image/png;base64,AAA", "analyse");
  assert.equal((r.data as { erreur?: string }).erreur, "sortie vision illisible");
});

/* --------------------------------------------------------- la clé */

test("la clé ne sort ni dans l'id du provider, ni dans un message d'erreur", async () => {
  const f = faussetFetch({ error: { message: "modèle inconnu" } }, false, 404);
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });

  assert.equal(p.id, `openai:${MODELE}`);
  assert.ok(!p.id.includes(CLE), "l'id ne doit pas porter la clé");

  await assert.rejects(
    () => p.chat([{ role: "user", content: "x" }], []),
    (e: Error) => {
      assert.match(e.message, /404/);
      assert.ok(!e.message.includes(CLE), "la clé ne doit jamais figurer dans une erreur");
      return true;
    },
  );
});

test("la clé part en en-tête Authorization, jamais dans le corps ni l'URL", async () => {
  const f = faussetFetch(REPONSE_TEXTE);
  const p = creerOpenAIProvider({ cle: CLE, modele: MODELE, fetchImpl: f.impl });
  await p.chat([{ role: "user", content: "x" }], []);

  const { url, init } = f.appels[0];
  assert.ok(!url.includes(CLE));
  assert.ok(!String(init?.body).includes(CLE));
  assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${CLE}`);
});

/* ------------------------------------------------ liste des modèles */

test("listerModeles renvoie les identifiants tels quels, triés", async () => {
  const f = faussetFetch({
    data: [
      { id: "zeta-1", created: 1_700_000_000 },
      { id: "alpha-2", created: 1_600_000_000 },
      { sans_id: true },
    ],
  });
  const modeles = await listerModeles({ cle: CLE, fetchImpl: f.impl });

  assert.deepEqual(
    modeles.map((m) => m.id),
    ["alpha-2", "zeta-1"],
    "les entrées sans id sont ignorées, le reste est trié",
  );
  assert.match(modeles[0].cree ?? "", /^\d{4}-\d{2}-\d{2}$/);
});
