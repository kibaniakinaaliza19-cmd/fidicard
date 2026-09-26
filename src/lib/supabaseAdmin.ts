// Client Supabase de confiance — clé `service_role`, PAS la clé anonyme.
//
// N'IMPORTER CE FICHIER QUE DEPUIS DU CODE SERVEUR (route handlers, actions
// serveur). `SUPABASE_SERVICE_ROLE_KEY` n'est jamais préfixée `NEXT_PUBLIC_` :
// elle n'atteint jamais le bundle envoyé au navigateur tant qu'aucun composant
// client ne l'importe. Ce module ne fait rien pour l'empêcher techniquement —
// il n'y a pas de garde `import "server-only"` dans ce projet — la discipline
// est de ne l'utiliser que depuis src/app/api/**/route.ts.
//
// Cette clé contourne RLS par conception (voir db/schema.sql:prospects) :
// c'est le rôle de confiance du serveur, jamais celui d'un visiteur. Utiliser
// ce client pour écrire dans une table publique par erreur annule sa RLS —
// à réserver aux tables qui n'ont explicitement aucune policy `anon`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseAdminConfigured = Boolean(url && serviceRoleKey);

let client: SupabaseClient | null = null;
if (isSupabaseAdminConfigured) {
  client = createClient(url as string, serviceRoleKey as string, {
    auth: { persistSession: false },
  });
}

/** `null` tant que SUPABASE_SERVICE_ROLE_KEY n'est pas renseignée — les
 *  appelants doivent se comporter en repli silencieux, jamais en panne. */
export const supabaseAdmin = client;
