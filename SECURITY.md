# FidiCard — Audit de sécurité

> **Audit en lecture seule** réalisé le 20 juillet 2026 sur la branche
> `claude/fidicard-studio-editor-okzamb` (commit `7548eaa`). Aucun correctif
> n'a été appliqué dans le cadre de cet audit : ce document constate, il ne
> modifie rien. Les remédiations sont renvoyées aux chantiers 3, 4 et 5.

---

## 1. Verdict d'ensemble

**Aucune fuite de données n'est active aujourd'hui.** L'application tourne en
mode démo : aucune base de données n'est branchée (`supabase.ts` retourne
`null` sans variables d'environnement), aucune donnée client n'existe côté
serveur, et toutes les données (carte, programme, clients de démonstration)
vivent dans le `localStorage` du navigateur du commerçant. Il n'y a rien à
exfiltrer côté serveur.

En revanche, l'audit relève :

- **1 vulnérabilité serveur qui devient active au premier déploiement avec une
  clé API** : la route `/api/analyze-card` est appelable sans authentification,
  sans quota et sans limite de taille (§3.1). Risque : détournement de
  ressources (coût API), pas fuite de données.
- **2 bombes à retardement** qui transformeraient la mise en production en
  incident de données si elles ne sont pas traitées AVANT le branchement d'une
  vraie base : le schéma SQL **sans aucune politique RLS** (§3.2) et
  **l'absence totale d'authentification** applicative (§3.3).

| Réf. | Constat | Gravité | Actif aujourd'hui ? |
|------|---------|---------|---------------------|
| 3.1 | `/api/analyze-card` sans auth, ni quota, ni limite de taille | Élevée | **Oui, dès qu'une clé est configurée et l'app exposée** |
| 3.2 | `db/schema.sql` sans RLS ni GRANT restrictif | Critique *à la mise en prod* | Non (aucune DB branchée) |
| 3.3 | Aucune authentification (dashboard, scanner, réglages) | Critique *à la mise en prod* | Non (app locale mono-poste) |
| 3.4 | Aucun en-tête de sécurité HTTP (CSP, X-Frame-Options…) | Moyenne | Oui (impact faible en démo) |
| 3.5 | SVG importés stockés sans assainissement | Moyenne *si partage futur* | Non (rendu `<img>`, localStorage local) |
| 3.6 | Sortie du modèle de vision non validée par schéma | Faible | Oui (impact faible) |
| 3.7 | GET `/api/analyze-card` divulgue disponibilité + nom du modèle | Faible | Oui |
| 3.8 | 2 vulnérabilités npm modérées (postcss transitif via next) | Faible | Oui (outillage build) |

Points **vérifiés sains** : aucun secret dans l'historique git (recherche
`sk-ant` sur toutes les révisions : néant ; `.env.local` jamais commité) ;
`ANTHROPIC_API_KEY` lue uniquement côté serveur via `process.env`, jamais
préfixée `NEXT_PUBLIC_`, jamais renvoyée au client ; `.gitignore` correct
(`.env*` ignoré, seul `.env.local.example` — champs vides — est suivi) ;
aucun `dangerouslySetInnerHTML` / `innerHTML` / `eval` dans `src/` ; les
messages d'erreur de la route API ne relaient ni stack trace ni contenu de la
clé.

---

## 2. Surface d'attaque actuelle

| Surface | État |
|---------|------|
| Routes API serveur | **Une seule** : `/api/analyze-card` (GET disponibilité, POST analyse) |
| Base de données | Aucune connectée. `src/lib/supabase.ts` est un scaffold qui retourne `null` |
| Authentification | Inexistante — toutes les pages sont publiques |
| Middleware | Aucun (`src/middleware.ts` absent) |
| Données persistées | `localStorage` uniquement (carte, programme, clients démo, réglages) |
| `/join/[code]` | Page 100 % client : données démo statiques (`joinBusinesses`), inscription écrite en `localStorage` |
| Fichiers uploadés | Tampons (PNG/SVG ≤ 2 Mo), images de fond, photos de carte — tous convertis en data-URL, jamais envoyés à un serveur (sauf la photo de carte → route d'analyse) |

---

## 3. Constats détaillés

### 3.1 — `/api/analyze-card` : détournement de ressources (Élevée, active au déploiement)

`src/app/api/analyze-card/route.ts` :

- **Aucune authentification** : toute personne connaissant l'URL peut poster
  une image et consommer la clé Anthropic du commerçant.
- **Aucune limitation de débit** : un script en boucle épuise le quota API et
  génère un coût direct (le modèle par défaut est le plus onéreux).
- **Aucune limite de taille** : `req.json()` accepte un `imageBase64`
  arbitrairement grand (la limite de 2 Mo du panneau Tampons ne s'applique pas
  ici ; le modal d'import ne borne pas non plus la taille avant envoi).
  Mémoire serveur + coût token en conséquence.
- Le type MIME est correctement validé (liste blanche), mais le contenu
  base64 n'est pas vérifié (décodabilité, magic bytes).

Scénario concret : l'app est déployée avec `ANTHROPIC_API_KEY` ; un tiers
découvre l'endpoint (il est appelé depuis le navigateur, donc visible dans
l'onglet réseau de n'importe quel visiteur) et l'utilise comme proxy gratuit
vers le modèle de vision, aux frais du commerçant.

**Remédiation (chantier 5)** : session requise sur POST, quota d'imports par
plan, limite de taille du corps (~8 Mo), vérification base64/magic bytes,
rate-limit par IP.

### 3.2 — `db/schema.sql` : aucun RLS (Critique à la mise en production)

Le schéma crée `users`, `commerces`, `notifications`, `templates`, `cards`,
`clients`, `passages` — dont des tables de données personnelles (`users.email`,
`clients.nom/email/telephone`) — **sans une seule ligne**
`alter table … enable row level security`, sans politique, sans révocation de
GRANT. Le commentaire d'en-tête du fichier prévoit explicitement une connexion
via `NEXT_PUBLIC_SUPABASE_ANON_KEY`, c'est-à-dire une clé **publiée dans le
bundle JavaScript**.

Conséquence si ce schéma est appliqué tel quel à un projet Supabase et branché :
sur Supabase, une table du schéma `public` accessible à l'anon key **sans RLS
activé** est lisible **et modifiable** par n'importe qui. Concrètement :
lecture de tous les emails/téléphones de tous les clients de tous les
commerces, auto-attribution de tampons, falsification de `passages`.

À noter aussi (chantier 3, qualité de schéma, incidence sécurité) :

- `users` ne référence pas `auth.users` de Supabase — pas de lien possible
  avec une identité authentifiée, donc pas de politique RLS exprimable.
- Aucune contrainte `check` de borne (`points >= 0`, `tampons >= 0`,
  `objectif_tampons between 1 and 24`) : la falsification ne serait même pas
  freinée par le schéma.
- `clients.code_client` est `unique` mais nullable et sans format imposé.

**Remédiation (chantiers 3+4)** : migrations `supabase/migrations/` avec RLS
activé sur TOUTES les tables, politiques par `owner_id = auth.uid()`, insertion
anonyme sur `/join` limitée à `insert` seul, et RPC `security definer`
`get_public_commerce(code)` ne retournant que les champs d'affichage — jamais
de `select` anon sur `commerces` ou `clients`.

### 3.3 — Absence d'authentification applicative (Critique à la mise en production)

Aucun système de session : `/carte`, `/clients`, `/scanner`, `/reglages`,
`/notifications` sont des pages publiques. En démo mono-poste c'est un choix
assumé ; déployée telle quelle sur une URL publique, l'application expose le
dashboard complet (dont l'export JSON des clients de `/reglages`) à quiconque
a l'URL. Toute la conception RLS du §3.2 présuppose une identité — ce chantier
est donc le prérequis de tous les autres.

### 3.4 — Aucun en-tête de sécurité HTTP (Moyenne)

`next.config.ts` est vide : pas de `Content-Security-Policy` (même en
report-only), pas de `X-Frame-Options`/`frame-ancestors` (clickjacking du
futur dashboard authentifié), pas de `X-Content-Type-Options`, pas de
`Referrer-Policy`. Impact réel faible tant que l'app est une démo locale sans
session à voler ; à traiter avec le chantier 4.

### 3.5 — SVG importés non assainis (Moyenne, conditionnelle)

Les tampons importés (`TamponsDrawer`, accepte `image/svg+xml`) sont stockés
en data-URL dans `localStorage` et rendus via `<img src=…>`
(`LayerContent.tsx`). Dans un `<img>`, les scripts d'un SVG **ne s'exécutent
pas** — il n'y a donc **pas de XSS exploitable aujourd'hui**, d'autant que le
fichier ne quitte jamais le navigateur de son propre auteur.

Le risque naît le jour où une carte publiée (et ses tampons) est servie à
d'autres utilisateurs (`/join`, wallets) : un SVG malveillant deviendrait du
contenu inter-utilisateurs. **Remédiation (chantier 6 révisé)** : rasteriser
les SVG importés en PNG via canvas au moment de l'import, ou les assainir
(suppression `<script>`, gestionnaires `on*`, `<foreignObject>`).

### 3.6 — Sortie du modèle de vision non validée (Faible)

`extractJson()` de la route caste le JSON du modèle en `VisionAnalysis` sans
validation de forme (seuls `elements`/`loyaltyProgram` sont défaut-és). Une
image adversariale (carte photographiée portant un texte de type injection de
prompt) peut influencer le contenu du JSON — donc les textes/paliers proposés
dans l'écran de révision. L'impact reste faible : le rendu est du texte React
(échappé), les nombres passent par `Math.round`/bornes côté client, et
l'utilisateur revalide tout dans l'écran de révision. Une validation zod
côté serveur (types, bornes, longueurs, nombre d'éléments) fermerait ce
résidu (chantier 5).

### 3.7 — Divulgation d'information mineure (Faible)

`GET /api/analyze-card` répond `{ available, model }` à quiconque : un tiers
apprend qu'une clé est configurée et quel modèle est utilisé. Utile au client
de l'app, mais combiné au §3.1 cela facilite le repérage de l'endpoint à
abuser. À restreindre aux sessions authentifiées en même temps que le POST.

### 3.8 — Dépendances (Faible)

`npm audit` : 2 vulnérabilités **modérées**, toutes deux le même postcss
transitif embarqué par `next@16.2.10` (GHSA-qx2v-qp2m-jg93, échappement
`</style>` dans la sortie du stringifier). C'est de l'outillage de build, pas
du code servi ; se résorbe en suivant les patchs de Next. Aucune vulnérabilité
haute ou critique.

---

## 4. Huit scénarios d'attaque examinés

| # | Scénario | Aujourd'hui (démo) | Après branchement DB sans correctifs |
|---|----------|--------------------|--------------------------------------|
| 1 | Lire les clients d'autres commerces via l'anon key | Impossible — aucune DB | **Réussit** (§3.2, aucun RLS) |
| 2 | S'auto-attribuer des tampons / falsifier `passages` | Sans objet (localStorage de son propre navigateur) | **Réussit** (update/insert anon non bloqués) |
| 3 | Énumérer les `code_client` pour usurper des cartes | Impossible | **Réussit** (select anon + index sur `code_client`) |
| 4 | Vider le quota API via `/api/analyze-card` | **Réussit dès déploiement avec clé** (§3.1) | Idem |
| 5 | Injection de prompt via la photo de carte | Contenu trompeur possible, pas d'exécution (§3.6) | Idem |
| 6 | XSS par SVG de tampon | Échoue (`<img>`, pas d'inline) (§3.5) | Échoue tant que non partagé inline |
| 7 | Extraction de secrets (repo, bundle, réponses API) | Échoue (vérifié : historique git propre, clé server-only) | — |
| 8 | Clickjacking / framing du dashboard | Sans intérêt (rien à voler sans session) | Facilité par l'absence d'en-têtes (§3.4) |

---

## 5. Ordre de remédiation recommandé

1. **Avant tout déploiement public, même démo** : protéger `/api/analyze-card`
   (limite de taille + rate-limit a minima) — seul point actif (§3.1).
2. **Avant tout branchement Supabase** : chantier 3 (migrations) livré
   conjointement avec le chantier 4 (RLS + politiques + RPC
   `get_public_commerce`) — jamais l'un sans l'autre, et authentification
   d'abord (§3.3) car les politiques RLS reposent sur `auth.uid()`.
3. Avec le chantier 4 : en-têtes de sécurité (§3.4).
4. Avec le chantier 5 : validation zod de la sortie vision (§3.6), auth+quota
   sur la route (§3.1 complet).
5. Avec le chantier 6 révisé : rasterisation/assainissement des SVG (§3.5).

## 6. Contraintes permanentes (à ne jamais régresser)

- `ANTHROPIC_API_KEY` : côté serveur uniquement, jamais `NEXT_PUBLIC_`,
  jamais en dur, `.env.local` jamais commité.
- RLS activé sur **chaque** table dès la première migration — une table créée
  sans RLS est un incident, pas une dette.
- Le flux anonyme `/join` : `insert` seulement, jamais de lecture des clients
  d'autrui ; lecture des infos commerce via RPC dédiée aux champs publics.
- Jamais de mise en cache de l'état de fidélité vivant d'un client.
- Tout fichier uploadé : taille bornée, type vérifié, SVG assaini ou
  rasterisé avant tout usage inter-utilisateurs.
