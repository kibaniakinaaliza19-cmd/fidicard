# ============================================================================
#  FidiCard — mise en place : page DESIGNER IA + architecture 3 couches
# ----------------------------------------------------------------------------
#  Ce script depose TOUT le travail de cette session (deja pousse sur la PR),
#  pour mettre ton dossier LOCAL a jour sans passer par git :
#
#   1) CORRECTIF du bug des grilles de tampons superposees a l'import.
#   2) CHANTIER 2 (architecture 3 couches design / zones / rendu dynamique),
#      etapes 1 a 4 : les tampons/paliers ne sont plus des calques de design
#      mais une ZONE declarative, rendue depuis la config de fidelite. Les 920
#      modeles et la carte vierge emettent des zones nativement.
#   3) NOUVELLE PAGE /carte = DESIGNER IA (assistant conversationnel + apercu
#      carte + elements fonctionnels verrouilles + bascule Wallet). L'ancien
#      editeur complet est deplace sur /carte/editeur (rien de perdu).
#
#  IMPORTANT : la logique de fidelite a DEMENAGE de src/lib/loyalty.ts vers
#  src/lib/loyalty/index.ts. Le script supprime l'ancien fichier.
#
#  USAGE : ouvrir PowerShell DANS le dossier racine du projet (celui qui
#  contient package.json), puis :
#     .\mise-en-place-designer-ia.ps1
#  Si l'execution est bloquee :
#     powershell -ExecutionPolicy Bypass -File .\mise-en-place-designer-ia.ps1
#  Puis : npm run build  et  npm run dev
# ============================================================================

$ErrorActionPreference = "Stop"
$racine = Get-Location

if (-not (Test-Path (Join-Path $racine "package.json"))) {
  Write-Host "ATTENTION : package.json introuvable ici." -ForegroundColor Yellow
  Write-Host "Place-toi dans le dossier racine du projet FidiCard puis relance." -ForegroundColor Yellow
  $rep = Read-Host "Continuer quand meme ? (o/N)"
  if ($rep -ne "o") { exit 1 }
}

function Ecrire-Fichier([string]$chemin, [string]$contenu) {
  $abs = Join-Path $racine $chemin
  $dossier = Split-Path $abs -Parent
  if (-not (Test-Path $dossier)) { New-Item -ItemType Directory -Path $dossier -Force | Out-Null }
  $enc = New-Object System.Text.UTF8Encoding($false)  # UTF-8 sans BOM
  [System.IO.File]::WriteAllText($abs, $contenu, $enc)
  Write-Host "  ecrit    $chemin" -ForegroundColor Green
}

$ancien = Join-Path $racine "src/lib/loyalty.ts"
if (Test-Path $ancien) {
  Remove-Item $ancien -Force
  Write-Host "  supprime src/lib/loyalty.ts (deplace vers src/lib/loyalty/index.ts)" -ForegroundColor DarkYellow
}

Write-Host "Depot des fichiers..." -ForegroundColor Cyan

$SECURITY_md = @'
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
'@
Ecrire-Fichier "SECURITY.md" $SECURITY_md

$src_types_layer_ts = @'
export type LayerType = "text" | "shape" | "icon" | "image" | "qrcode" | "barcode";
export type ShapeKind = "rect" | "circle" | "line" | "triangle";
export type BackgroundKind = "color" | "gradient" | "pattern" | "image";

export interface LayerBase {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  groupId: string | null;
}

export interface TextLayer extends LayerBase {
  type: "text";
  content: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
}

export interface ShapeLayer extends LayerBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface IconLayer extends LayerBase {
  type: "icon";
  icon: string;
  color: string;
}

export interface ImageLayer extends LayerBase {
  type: "image";
  src: string;
  brightness: number;
  contrast: number;
  saturate: number;
  radius: number;
}

export interface QrCodeLayer extends LayerBase {
  type: "qrcode";
  value: string;
  fgColor: string;
  bgColor: string;
}

export interface BarcodeLayer extends LayerBase {
  type: "barcode";
  value: string;
  lineColor: string;
  background: string;
}

export type Layer = TextLayer | ShapeLayer | IconLayer | ImageLayer | QrCodeLayer | BarcodeLayer;

export interface CardBackground {
  kind: BackgroundKind;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  pattern: "dots" | "diagonal" | "grid";
  patternColor: string;
  image: string | null;
  imageDim: number;
}

/* ------------------------------------------------------------------ zones */
// v2 : la partie fonctionnelle de la carte n'est plus stockée en calques
// concrets mais déclarée en « zones ». Leurs calques sont produits à chaque
// affichage par lib/loyalty/renderLayer.ts à partir de la config de fidélité
// (et de l'état du client) — jamais persistés.

export type StampShape = "cercle" | "arrondi" | "carre";

export interface ZoneFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StampGridZone {
  id: string;
  kind: "stampGrid";
  /** boîte englobante en % du canvas — la zone se manipule comme UN objet */
  frame: ZoneFrame;
  /** largeur d'un tampon en % (hauteur dérivée du ratio carte) */
  size: number;
  /** hauteur exacte d'un tampon (%) quand elle diffère de size × 1.55 */
  stampHeight?: number;
  shape: StampShape;
  /** tampons par rangée ; "auto" = 1 rangée jusqu'à 6, sinon 2 */
  perRow: number | "auto";
  /** écrire les libellés de paliers DANS leurs tampons */
  showTierLabels: boolean;
  /** icône dessinée dans chaque tampon (nom lucide du catalogue) */
  icon?: string;
  /** couleur de l'icône d'un tampon non validé */
  iconColor?: string;
  /** géométrie d'icône héritée d'une migration : offset/taille en % */
  iconBox?: { dx: number; dy: number; w: number; h: number };
  /** remplissage de démonstration dans l'éditeur — jamais l'état d'un client */
  previewFilled?: number;
  /** compteur de démonstration pour la vignette de galerie (jamais le live) */
  previewTotal?: number;
  /** couleurs héritées d'un document migré — priorité sur config.stampStyle */
  styleOverride?: { empty?: string; border?: string; filled?: string };
}

export type Zone = StampGridZone;

export interface CardDoc {
  id: string;
  name: string;
  category: string;
  background: CardBackground;
  /** calques de design ; en v2 ils n'incluent plus la grille de tampons */
  layers: Layer[];
  published: boolean;
  updatedAt: number;
  /** absent ou 1 = document historique tout-en-calques */
  version?: 1 | 2;
  zones?: Zone[];
  /**
   * calques retirés par la migration v1→v2 — le reste du document étant
   * inchangé, design (layers) + design_json_v1.layers reconstituent le
   * document v1 à l'identique (rollback)
   */
  design_json_v1?: { layers: Layer[] };
}

export const CARD_RATIO = 85.6 / 53.98;
'@
Ecrire-Fichier "src/types/layer.ts" $src_types_layer_ts

$src_lib_cardImport_ts = @'
// Moteur d'import de carte — pipeline en 4 phases.
//
//   Phase 1  Détection & redressement de la carte (cardDetect.ts) : la photo
//            est détourée de son environnement (table, doigts, mur) puis
//            redressée par homographie. Coins ajustables à la main dans l'UI.
//   Phase 2  Compréhension : soit le modèle de vision via /api/analyze-card
//            (textes, logos, ET logique du programme : paliers -5€/-15%/-50%),
//            soit le moteur local (OCR tesseract + détection de formes) quand
//            aucune clé API n'est configurée. Les deux produisent la même
//            structure — l'UI ne change pas.
//   Phase 3  Reconstruction : chaque élément devient un calque indépendant
//            (importToCard.ts) posé pile sur l'original. Les logos sont
//            découpés de l'image (crop) pour devenir déplaçables.
//   Phase 4  Logique métier : le programme détecté (type, objectif, paliers,
//            consigne, réseau social) alimente les données FidiCard.
//
// Règle d'or : ne jamais dégrader le rendu. Chaque étape est isolée — si une
// détection échoue on continue sans elle et on l'explique dans `warnings`.
//
// Alternatives non implémentées (documentées à dessein) :
//   • Google Cloud Vision — OCR + logos plus précis sur texte pur, mais ne
//     comprend pas la logique métier d'une carte ; facturé à l'image.
//   • OpenCV.js — détection de contours plus robuste que notre canvas maison,
//     au prix d'un WASM de ~8 Mo.
//   • remove.bg — isolation de sujet, API payante.
// Le modèle de vision reste supérieur ici : il est le seul à comprendre le
// SENS de la carte (paliers, récompenses, consignes), pas juste ses pixels.

import { CARD_RATIO } from "@/types/layer";
import { rectifyCard, type CardCorners } from "@/lib/cardDetect";
import type { VisionAnalysis } from "@/lib/visionSchema";

/* ------------------------------------------------------------------ types */

export interface DetectedText {
  id: string;
  content: string;
  /** position en % du cadre carte */
  x: number;
  y: number;
  w: number;
  h: number;
  /** taille de police en px à l'échelle du canvas 520 px de large */
  fontSize: number;
  color: string;
  confidence: number;
  /** true = le texte a pu être effacé du fond (zone unie) */
  masked: boolean;
}

export interface DetectedStamp {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedLogo {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** découpe de l'image d'origine — devient un calque image déplaçable */
  dataUrl: string;
  description: string;
  masked: boolean;
}

export interface DetectedQr {
  x: number;
  y: number;
  w: number;
  h: number;
  value: string;
}

export interface ImportTier {
  position: number;
  reward: string;
}

/** La logique métier comprise depuis la carte (Phase 4). */
export interface ImportProgram {
  type: "tampons" | "points";
  totalStamps: number;
  tiers: ImportTier[];
  instructions?: string;
  social?: string;
  website?: string;
}

export interface ImportAnalysis {
  /** image de la carte (redressée), textes effacés quand c'était sûr */
  backgroundDataUrl: string;
  /**
   * même fond avec les tampons imprimés effacés en plus — à utiliser quand les
   * tampons sont recréés en calques, sinon la grille d'origine reste sous les
   * calques et réapparaît en double dès que la grille est régénérée
   */
  backgroundNoStampsDataUrl: string;
  /** image de la carte (redressée), non nettoyée — pour l'écran de révision */
  originalDataUrl: string;
  frameWidth: number;
  frameHeight: number;
  palette: string[];
  theme: { bg: string; accent: string; text: string; sub: string };
  texts: DetectedText[];
  stamps: DetectedStamp[];
  stampFill: string;
  logos: DetectedLogo[];
  qr: DetectedQr | null;
  program: ImportProgram | null;
  engine: "vision" | "local";
  lowQuality: boolean;
  warnings: string[];
}

export const ANALYSIS_STEPS = [
  "Téléversement de l'image…",
  "Détection & redressement de la carte…",
  "Analyse des couleurs…",
  "Lecture des textes…",
  "Tampons & paliers de récompense…",
  "Logos & QR code…",
  "Nettoyage du fond…",
  "Reconstruction des calques…",
] as const;

/* ---------------------------------------------------------------- helpers */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  return { canvas, ctx };
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

let idc = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${++idc}`;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlap(a: Box, b: Box) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const min = Math.min(a.w * a.h, b.w * b.h);
  return min > 0 ? inter / min : 0;
}

/* ------------------------------------------------- normalisation & cadrage */

function edgeColor(ctx: CanvasRenderingContext2D, w: number, h: number): [number, number, number] {
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0, g = 0, b = 0, n = 0;
  const push = (i: number) => { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; };
  const step = Math.max(1, Math.floor(w / 60));
  for (let x = 0; x < w; x += step) { push(x * 4); push(((h - 1) * w + x) * 4); }
  const stepY = Math.max(1, Math.floor(h / 60));
  for (let y = 0; y < h; y += stepY) { push(y * w * 4); push((y * w + (w - 1)) * 4); }
  return n ? [r / n, g / n, b / n] : [20, 20, 20];
}

interface Frame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
}

/** pivote finement puis padde l'image au ratio exact de la carte */
function normalize(img: HTMLImageElement, fineDeg: number): Frame {
  const scale = Math.min(1, 1400 / img.width);
  let w = Math.round(img.width * scale);
  let h = Math.round(img.height * scale);

  let src: HTMLCanvasElement;
  {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.drawImage(img, 0, 0, w, h);
    src = canvas;
  }

  if (fineDeg !== 0) {
    const rad = (fineDeg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const rw = Math.round(w * cos + h * sin);
    const rh = Math.round(w * sin + h * cos);
    const { canvas, ctx } = makeCanvas(rw, rh);
    const [er, eg, eb] = edgeColor(src.getContext("2d", { willReadFrequently: true })!, w, h);
    ctx.fillStyle = rgbToHex(er, eg, eb);
    ctx.fillRect(0, 0, rw, rh);
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate(rad);
    ctx.drawImage(src, -w / 2, -h / 2);
    src = canvas;
    w = rw;
    h = rh;
  }

  // padding au ratio carte — le fond est rendu en `cover`, donc seule une
  // image déjà au bon ratio garantit l'alignement exact des calques.
  const ratio = w / h;
  let W = w, H = h, imgX = 0, imgY = 0;
  if (ratio > CARD_RATIO) {
    H = Math.round(w / CARD_RATIO);
    imgY = Math.round((H - h) / 2);
  } else if (ratio < CARD_RATIO) {
    W = Math.round(h * CARD_RATIO);
    imgX = Math.round((W - w) / 2);
  }
  const { canvas, ctx } = makeCanvas(W, H);
  const [er, eg, eb] = edgeColor(src.getContext("2d", { willReadFrequently: true })!, w, h);
  ctx.fillStyle = rgbToHex(er, eg, eb);
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(src, imgX, imgY);
  return { canvas, ctx, W, H, imgX, imgY, imgW: w, imgH: h };
}

/* ------------------------------------------------------- palette (réelle) */

function extractPalette(frame: Frame): string[] {
  const down = 84;
  const dh = Math.max(24, Math.round((down * frame.imgH) / frame.imgW));
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, frame.imgX, frame.imgY, frame.imgW, frame.imgH, 0, 0, down, dh);
  const { data } = ctx.getImageData(0, 0, down, dh);

  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const e = buckets.get(key);
    if (e) { e.n++; e.r += r; e.g += g; e.b += b; }
    else buckets.set(key, { n: 1, r, g, b });
  }
  const ranked = Array.from(buckets.values())
    .map((e) => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }))
    .sort((a, b) => b.n - a.n);

  const out: { r: number; g: number; b: number }[] = [];
  for (const c of ranked) {
    if (out.length >= 6) break;
    if (out.every((o) => colorDist(c.r, c.g, c.b, o.r, o.g, o.b) > 42)) out.push(c);
  }
  if (out.length === 0) out.push({ r: 24, g: 18, b: 14 });
  return out.map((c) => rgbToHex(c.r, c.g, c.b));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function themeFromPalette(palette: string[]) {
  const [br, bg_, bb] = hexToRgb(palette[0]);
  const bgLum = luminance(br, bg_, bb);
  let accent = palette[1] ?? "#f0653e";
  let best = -1;
  for (const hex of palette.slice(1)) {
    const [r, g, b] = hexToRgb(hex);
    if (colorDist(r, g, b, br, bg_, bb) < 60) continue;
    const s = saturation(r, g, b);
    if (s > best) { best = s; accent = hex; }
  }
  return {
    bg: palette[0],
    accent,
    text: bgLum > 0.55 ? "#221610" : "#FFF7EE",
    sub: bgLum > 0.55 ? "#221610aa" : "#FFF7EEaa",
  };
}

/* --------------------------------------------------------------- OCR local */

interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

async function runOcr(frame: Frame): Promise<OcrLine[]> {
  const { createWorker } = await import("tesseract.js");
  // ressources auto-hébergées (scripts/setup-ocr.mjs) ; repli CDN sinon
  let worker;
  try {
    worker = await createWorker(["fra", "eng"], undefined, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
    });
  } catch {
    worker = await createWorker(["fra", "eng"]);
  }
  try {
    const { data } = await worker.recognize(frame.canvas, {}, { blocks: true, text: true });
    const lines: OcrLine[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          lines.push({ text: line.text.replace(/\s+/g, " ").trim(), confidence: line.confidence, bbox: line.bbox });
        }
      }
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}

/** couleur du texte : les pixels qui tranchent le plus avec l'anneau autour */
function sampleTextColor(frame: Frame, b: { x0: number; y0: number; x1: number; y1: number }): string {
  const x0 = Math.max(0, b.x0), y0 = Math.max(0, b.y0);
  const w = Math.min(frame.W, b.x1) - x0, h = Math.min(frame.H, b.y1) - y0;
  if (w < 2 || h < 2) return "#ffffff";
  const { data } = frame.ctx.getImageData(x0, y0, w, h);
  const ring = ringStats(frame, b);
  const px: { l: number; r: number; g: number; b: number }[] = [];
  for (let i = 0; i < data.length; i += 4) {
    px.push({ l: luminance(data[i], data[i + 1], data[i + 2]), r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  px.sort((a, c) => a.l - c.l);
  const slice = ring.lum > 0.5 ? px.slice(0, Math.max(1, Math.floor(px.length * 0.1)))
                               : px.slice(-Math.max(1, Math.floor(px.length * 0.1)));
  let r = 0, g = 0, bl = 0;
  for (const p of slice) { r += p.r; g += p.g; bl += p.b; }
  return rgbToHex(r / slice.length, g / slice.length, bl / slice.length);
}

/** stats de l'anneau de pixels autour d'une bbox (couleur + uniformité) */
function ringStats(frame: Frame, b: { x0: number; y0: number; x1: number; y1: number }) {
  const pad = 5;
  const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
  const x1 = Math.min(frame.W, b.x1 + pad), y1 = Math.min(frame.H, b.y1 + pad);
  if (x1 - x0 < 2 || y1 - y0 < 2) return { r: 128, g: 128, b: 128, std: 999, lum: 0.5 };
  const { data } = frame.ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const w = x1 - x0, h = y1 - y0;
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = x >= b.x0 - x0 && x < b.x1 - x0 && y >= b.y0 - y0 && y < b.y1 - y0;
      if (inside) continue;
      const i = (y * w + x) * 4;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  if (rs.length === 0) return { r: 128, g: 128, b: 128, std: 999, lum: 0.5 };
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const r = mean(rs), g = mean(gs), bl = mean(bs);
  const dev = (a: number[], m: number) => Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length);
  const std = (dev(rs, r) + dev(gs, g) + dev(bs, bl)) / 3;
  return { r, g, b: bl, std, lum: luminance(r, g, bl) };
}

/* ------------------------------------- formes locales : tampons + logos */

interface BlobResult {
  stamps: DetectedStamp[];
  fill: string;
  /** grandes zones graphiques non-tampon : candidates logo (bboxes en %) */
  logoBoxes: Box[];
}

function detectBlobs(frame: Frame, bgHex: string): BlobResult {
  const down = 300;
  const dh = Math.round((down * frame.H) / frame.W);
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, 0, 0, down, dh);
  const { data } = ctx.getImageData(0, 0, down, dh);
  const [br, bg_, bb] = hexToRgb(bgHex);

  const fg = new Uint8Array(down * dh);
  for (let i = 0; i < down * dh; i++) {
    const o = i * 4;
    if (colorDist(data[o], data[o + 1], data[o + 2], br, bg_, bb) > 65) fg[i] = 1;
  }

  const label = new Int32Array(down * dh).fill(-1);
  interface Comp { minX: number; maxX: number; minY: number; maxY: number; n: number; r: number; g: number; b: number }
  const comps: Comp[] = [];
  const stack: number[] = [];
  for (let start = 0; start < down * dh; start++) {
    if (!fg[start] || label[start] !== -1) continue;
    const id = comps.length;
    const c: Comp = { minX: down, maxX: 0, minY: dh, maxY: 0, n: 0, r: 0, g: 0, b: 0 };
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % down, y = (p / down) | 0;
      c.n++;
      c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x);
      c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
      const o = p * 4;
      c.r += data[o]; c.g += data[o + 1]; c.b += data[o + 2];
      if (x > 0 && fg[p - 1] && label[p - 1] === -1) { label[p - 1] = id; stack.push(p - 1); }
      if (x < down - 1 && fg[p + 1] && label[p + 1] === -1) { label[p + 1] = id; stack.push(p + 1); }
      if (p - down >= 0 && fg[p - down] && label[p - down] === -1) { label[p - down] = id; stack.push(p - down); }
      if (p + down < down * dh && fg[p + down] && label[p + down] === -1) { label[p + down] = id; stack.push(p + down); }
    }
    comps.push(c);
  }

  const boxPct = (c: Comp): Box => ({
    x: (c.minX / down) * 100,
    y: (c.minY / dh) * 100,
    w: ((c.maxX - c.minX + 1) / down) * 100,
    h: ((c.maxY - c.minY + 1) / dh) * 100,
  });

  // tampons : quasi carrés, bien remplis, taille plausible et homogène
  const cands = comps.filter((c) => {
    const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
    if (w < down * 0.04 || w > down * 0.17) return false;
    const ar = w / h;
    if (ar < 0.65 || ar > 1.5) return false;
    return c.n / (w * h) > 0.55;
  });

  let stamps: DetectedStamp[] = [];
  let fill = "#ffffff";
  let kept: Comp[] = [];
  if (cands.length >= 3) {
    const areas = cands.map((c) => (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1)).sort((a, b) => a - b);
    const median = areas[Math.floor(areas.length / 2)];
    kept = cands.filter((c) => {
      const a = (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1);
      return a > median * 0.55 && a < median * 1.8;
    });
    // cohérence de grille : les tampons vont toujours par rangées — un
    // candidat sans aucun voisin aligné horizontalement est un logo ou une
    // décoration, pas un tampon
    if (kept.length >= 3) {
      const rowMates = (c: Comp) =>
        kept.filter(
          (o) =>
            o !== c &&
            Math.abs((o.minY + o.maxY) / 2 - (c.minY + c.maxY) / 2) < (c.maxY - c.minY) * 0.7,
        ).length;
      const grid = kept.filter((c) => rowMates(c) >= 1);
      if (grid.length >= 3) kept = grid;
    }
    if (kept.length >= 3 && kept.length <= 24) {
      kept.sort((a, b) => {
        const ay = (a.minY + a.maxY) / 2, by = (b.minY + b.maxY) / 2;
        if (Math.abs(ay - by) > a.maxY - a.minY) return ay - by;
        return (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2;
      });
      stamps = kept.map(boxPct);
      let fr = 0, fgc = 0, fb = 0;
      for (const c of kept) { fr += c.r / c.n; fgc += c.g / c.n; fb += c.b / c.n; }
      fill = rgbToHex(fr / kept.length, fgc / kept.length, fb / kept.length);
    } else {
      kept = [];
    }
  }

  // candidats logo : grandes zones graphiques qui ne sont pas des tampons
  const keptSet = new Set(kept);
  const logoBoxes = comps
    .filter((c) => !keptSet.has(c))
    .filter((c) => {
      const w = c.maxX - c.minX + 1, h = c.maxY - c.minY + 1;
      if (w < down * 0.06 || w > down * 0.5) return false;
      if (h < dh * 0.06 || h > dh * 0.7) return false;
      return c.n > w * h * 0.18; // assez dense pour être un vrai graphique
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map(boxPct);

  return { stamps, fill, logoBoxes };
}

/**
 * Paliers écrits dans les tampons (« -5€ », « -15% », « offert »…) : le
 * passage OCR global rate ces petits textes. On découpe donc l'intérieur de
 * chaque tampon, agrandi ×3, et on le lit en mode ligne unique — bien plus
 * fiable pour comprendre le programme de la carte.
 */
async function ocrStampTiers(frame: Frame, stamps: DetectedStamp[]): Promise<ImportTier[]> {
  if (stamps.length === 0 || stamps.length > 24) return [];
  const { createWorker, PSM } = await import("tesseract.js");
  let worker;
  try {
    worker = await createWorker(["fra", "eng"], undefined, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
    });
  } catch {
    worker = await createWorker(["fra", "eng"]);
  }
  const tiers: ImportTier[] = [];
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
    for (let i = 0; i < stamps.length; i++) {
      const s = stamps[i];
      const x = (s.x / 100) * frame.W;
      const y = (s.y / 100) * frame.H;
      const w = (s.w / 100) * frame.W;
      const h = (s.h / 100) * frame.H;
      const ix = x + w * 0.1, iy = y + h * 0.1, iw = w * 0.8, ih = h * 0.8;
      if (iw < 8 || ih < 8) continue;
      const { canvas, ctx } = makeCanvas(iw * 3, ih * 3);
      ctx.imageSmoothingEnabled = true;
      // aplatir le pourtour : les coins du crop dépassent du cercle (fond de
      // carte sombre) et font lire « © » ou des barres à l'OCR. On remplit
      // tout à la couleur intérieure puis on ne dessine QUE l'ellipse inscrite.
      const cpx = frame.ctx.getImageData(
        Math.max(0, Math.round(x + w / 2)),
        Math.max(0, Math.round(y + h / 2)),
        1,
        1,
      ).data;
      ctx.fillStyle = rgbToHex(cpx[0], cpx[1], cpx[2]);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        canvas.width / 2,
        canvas.height / 2,
        ((w * 3) / 2) * 0.9,
        ((h * 3) / 2) * 0.9,
        0,
        0,
        Math.PI * 2,
      );
      ctx.clip();
      ctx.drawImage(frame.canvas, ix, iy, iw, ih, 0, 0, iw * 3, ih * 3);
      ctx.restore();

      const looksLikeReward = (t: string) => /[-−+]?\s*\d{1,3}\s*[€%$]|offert|gratuit|free/i.test(t);
      let { data } = await worker.recognize(canvas);
      let text = (data.text ?? "").replace(/\s+/g, " ").trim();
      if (!looksLikeReward(text)) {
        // second essai en mode « mot unique » — meilleur sur les très courts
        // libellés comme « -5€ »
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_WORD });
        ({ data } = await worker.recognize(canvas));
        const retry = (data.text ?? "").replace(/\s+/g, " ").trim();
        if (looksLikeReward(retry)) text = retry;
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
      }
      if (text && looksLikeReward(text)) {
        tiers.push({ position: i + 1, reward: text.replace(/[|_]/g, "").trim().slice(0, 20) });
      }
    }
  } finally {
    await worker.terminate();
  }
  return tiers;
}

/** découpe une zone de la carte en dataURL (calque image déplaçable) */
function cropBox(frame: Frame, b: Box): string {
  const x = Math.max(0, Math.round((b.x / 100) * frame.W));
  const y = Math.max(0, Math.round((b.y / 100) * frame.H));
  const w = Math.min(frame.W - x, Math.round((b.w / 100) * frame.W));
  const h = Math.min(frame.H - y, Math.round((b.h / 100) * frame.H));
  const { canvas, ctx } = makeCanvas(Math.max(2, w), Math.max(2, h));
  ctx.drawImage(frame.canvas, x, y, w, h, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

/* ----------------------------------------------------------------- QR code */

async function detectQr(frame: Frame): Promise<DetectedQr | null> {
  const jsQR = (await import("jsqr")).default;
  const down = Math.min(900, frame.W);
  const dh = Math.round((down * frame.H) / frame.W);
  const { ctx } = makeCanvas(down, dh);
  ctx.drawImage(frame.canvas, 0, 0, down, dh);
  const img = ctx.getImageData(0, 0, down, dh);
  const code = jsQR(img.data, down, dh);
  if (!code) return null;
  const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = code.location;
  const xs = [topLeftCorner.x, topRightCorner.x, bottomLeftCorner.x, bottomRightCorner.x];
  const ys = [topLeftCorner.y, topRightCorner.y, bottomLeftCorner.y, bottomRightCorner.y];
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  return {
    x: (x0 / down) * 100,
    y: (y0 / dh) * 100,
    w: ((x1 - x0) / down) * 100,
    h: ((y1 - y0) / dh) * 100,
    value: code.data || "https://fidicard.app",
  };
}

/* --------------------------------------------------------------- analyse */

export interface AnalyzeOptions {
  /** rotation fine en degrés (-15 … 15) */
  fineRotation?: number;
  /** coins de la carte dans la photo (Phase 1) — déclenche le redressement */
  corners?: CardCorners | null;
  /** résultat du modèle de vision (Phase 2 « IA ») — sinon moteur local */
  visionData?: VisionAnalysis | null;
}

export async function analyzeCardImage(
  dataUrl: string,
  onStep: (stepIndex: number) => void,
  options: AnalyzeOptions = {},
): Promise<ImportAnalysis> {
  const warnings: string[] = [];
  const vision = options.visionData ?? null;
  const tick = async (i: number) => {
    onStep(i);
    await new Promise((r) => setTimeout(r, 60));
  };

  await tick(0);

  /* — Phase 1 : redressement — */
  await tick(1);
  let workUrl = dataUrl;
  if (options.corners) {
    const rectified = await rectifyCard(dataUrl, options.corners);
    if (rectified) workUrl = rectified;
    else warnings.push("Redressement impossible — la photo entière a été conservée.");
  }
  const img = await loadImage(workUrl);
  const frame = normalize(img, options.fineRotation ?? 0);
  const lowQuality = frame.imgW < 450;
  if (lowQuality) warnings.push("Image de faible résolution — les détections peuvent être approximatives.");
  if (!options.corners) {
    const imgRatio = frame.imgW / frame.imgH;
    if (imgRatio < CARD_RATIO * 0.72 || imgRatio > CARD_RATIO * 1.38) {
      warnings.push("Le cadrage est éloigné du format carte — ajustez les coins pour détourer la carte.");
    }
  }
  const originalDataUrl = frame.canvas.toDataURL("image/jpeg", 0.92);

  /* — couleurs (toujours locales : extraction pixel exacte) — */
  await tick(2);
  let palette: string[] = ["#241812", "#f0653e"];
  try {
    palette = extractPalette(frame);
  } catch {
    warnings.push("Analyse des couleurs impossible sur cette image.");
  }
  const theme = themeFromPalette(palette);
  if (vision?.design?.accentColor && /^#[0-9a-f]{6}$/i.test(vision.design.accentColor)) {
    theme.accent = vision.design.accentColor;
  }

  /* — Phase 2 : compréhension (vision ou locale) — */
  const texts: DetectedText[] = [];
  let stamps: DetectedStamp[] = [];
  let stampFill = "#ffffff";
  let logos: DetectedLogo[] = [];
  let program: ImportProgram | null = null;

  if (vision) {
    await tick(3);
    for (const el of vision.elements ?? []) {
      if (el.kind !== "text" || !el.content?.trim() || !el.bbox) continue;
      const b: Box = { x: el.bbox.x * 100, y: el.bbox.y * 100, w: el.bbox.w * 100, h: el.bbox.h * 100 };
      const pxBox = {
        x0: (b.x / 100) * frame.W, y0: (b.y / 100) * frame.H,
        x1: ((b.x + b.w) / 100) * frame.W, y1: ((b.y + b.h) / 100) * frame.H,
      };
      texts.push({
        id: nextId("txt"),
        content: el.content.trim(),
        ...b,
        fontSize: Math.max(6, Math.round((el.fontSize ?? el.bbox.h * 0.8) * (520 / CARD_RATIO) * 0.9)),
        color: el.color && /^#[0-9a-f]{6}$/i.test(el.color) ? el.color : sampleTextColor(frame, pxBox),
        confidence: 92,
        masked: false,
      });
    }

    await tick(4);
    const prog = vision.loyaltyProgram;
    if (prog?.detected) {
      const positions = prog.stampPositions ?? [];
      // x,y = centre normalisé ; r = rayon relatif à la LARGEUR de carte.
      // En % : largeur = 2r×100 ; hauteur = 2r×100×(W/H) car l'axe vertical
      // est normalisé sur la hauteur (W/H = ratio carte).
      const ratio = frame.W / frame.H;
      stamps = positions
        .sort((a, b) => a.index - b.index)
        .map((p) => {
          const r = Math.max(0.015, Math.min(0.12, p.r ?? 0.04));
          return {
            x: (p.x - r) * 100,
            y: (p.y - r * ratio) * 100,
            w: r * 2 * 100,
            h: r * 2 * ratio * 100,
          };
        });
      // couleur intérieure réelle mesurée au centre du premier tampon
      if (stamps[0]) {
        const c = stamps[0];
        const cx = Math.round(((c.x + c.w / 2) / 100) * frame.W);
        const cy = Math.round(((c.y + c.h / 2) / 100) * frame.H);
        const d = frame.ctx.getImageData(Math.max(0, cx - 2), Math.max(0, cy - 2), 4, 4).data;
        stampFill = rgbToHex(d[0], d[1], d[2]);
      }
      program = {
        type: prog.type === "points" ? "points" : "tampons",
        totalStamps: prog.totalStamps ?? stamps.length,
        tiers: (prog.tiers ?? [])
          .filter((t) => t.position >= 1 && t.reward?.trim())
          .map((t) => ({ position: Math.round(t.position), reward: t.reward.trim() })),
        instructions: prog.instructions?.trim() || undefined,
        social: prog.socialHandles?.[0]?.trim() || undefined,
        website: prog.website?.trim() || undefined,
      };
    }

    await tick(5);
    for (const el of vision.elements ?? []) {
      if ((el.kind !== "logo" && el.kind !== "icon" && el.kind !== "shape") || !el.bbox) continue;
      const b: Box = { x: el.bbox.x * 100, y: el.bbox.y * 100, w: el.bbox.w * 100, h: el.bbox.h * 100 };
      if (b.w < 1 || b.h < 1) continue;
      if (stamps.some((s) => overlap(s, b) > 0.6)) continue; // les tampons sont gérés à part
      try {
        logos.push({
          id: nextId("logo"),
          ...b,
          dataUrl: cropBox(frame, b),
          description: el.description || (el.kind === "shape" ? "Forme" : "Logo"),
          masked: false,
        });
      } catch { /* crop impossible : on ignore ce logo */ }
    }
    logos = logos.slice(0, 8);
    for (const w of vision.warnings ?? []) warnings.push(`Lecture incertaine : ${w}`);
  } else {
    /* — moteur local : OCR + formes — */
    await tick(3);
    let ocrLines: OcrLine[] = [];
    try {
      ocrLines = await runOcr(frame);
    } catch {
      warnings.push(
        "Lecture des textes indisponible (module OCR non chargé). Les textes restent dans l'image de fond.",
      );
    }

    await tick(4);
    let blobs: BlobResult = { stamps: [], fill: "#ffffff", logoBoxes: [] };
    try {
      blobs = detectBlobs(frame, palette[0]);
    } catch {
      warnings.push("Détection des tampons impossible sur cette image.");
    }
    stamps = blobs.stamps;
    stampFill = blobs.fill;

    // filtrage OCR : confiance, taille plausible, et rejet des fausses
    // lectures de rangées de tampons (« OOOOO »)
    const circleLike = /^[\sOoQq0©°()·.,_—-]+$/;
    for (const line of ocrLines) {
      const bh = line.bbox.y1 - line.bbox.y0;
      const bw = line.bbox.x1 - line.bbox.x0;
      if (line.confidence < 55) continue;
      if (bh < frame.H * 0.018 || bh > frame.H * 0.24) continue;
      if (bw < frame.W * 0.03) continue;
      if (!/[a-zA-Z0-9À-ÿ€%]{2,}/.test(line.text)) continue;
      const box: Box = {
        x: (line.bbox.x0 / frame.W) * 100,
        y: (line.bbox.y0 / frame.H) * 100,
        w: (bw / frame.W) * 100,
        h: (bh / frame.H) * 100,
      };
      const stampsHit = stamps.filter((s) => overlap(s, box) > 0.5).length;
      if (stampsHit >= 2) continue;
      if (circleLike.test(line.text)) continue;
      texts.push({
        id: nextId("txt"),
        content: line.text,
        ...box,
        fontSize: Math.max(6, Math.round((bh / frame.H) * (520 / CARD_RATIO) * 0.74)),
        color: sampleTextColor(frame, line.bbox),
        confidence: Math.round(line.confidence),
        masked: false,
      });
    }
    if (ocrLines.length > 0 && texts.length === 0 && stamps.length === 0) {
      warnings.push("Aucun texte lu avec assez de confiance — photographiez la carte bien à plat et nette.");
    }

    // Phase 4 locale : les textes situés DANS un tampon sont des paliers
    const tiers: ImportTier[] = [];
    for (const t of texts) {
      const idx = stamps.findIndex((s) => overlap(s, t) > 0.5);
      if (idx !== -1) tiers.push({ position: idx + 1, reward: t.content });
    }
    // passe ciblée dans chaque tampon (les petits « -5€ » échappent à l'OCR global)
    try {
      const stampTiers = await ocrStampTiers(frame, stamps);
      for (const t of stampTiers) {
        if (!tiers.some((x) => x.position === t.position)) tiers.push(t);
      }
    } catch {
      warnings.push("Lecture des paliers à l'intérieur des tampons impossible.");
    }
    const social = texts.find((t) => t.content.startsWith("@"))?.content;
    if (stamps.length >= 3) {
      program = {
        type: "tampons",
        totalStamps: stamps.length,
        tiers: tiers.sort((a, b) => a.position - b.position),
        social,
      };
    }

    await tick(5);
    // logos locaux : grandes zones graphiques hors tampons et hors textes
    try {
      logos = blobs.logoBoxes
        .filter((b) => !texts.some((t) => overlap(b, t) > 0.5))
        .map((b) => ({
          id: nextId("logo"),
          ...b,
          dataUrl: cropBox(frame, b),
          description: "Zone graphique",
          masked: false,
        }));
    } catch { /* best effort */ }
  }

  // QR : toujours local (jsQR décode la vraie valeur, la vision non)
  let qr: DetectedQr | null = null;
  try {
    qr = await detectQr(frame);
  } catch { /* non bloquant */ }

  /* — Phase 3 : masquage sûr du fond — */
  await tick(6);
  const clean = makeCanvas(frame.W, frame.H);
  clean.ctx.drawImage(frame.canvas, 0, 0);
  const tryMask = (box: Box, pad = 3, ctx: CanvasRenderingContext2D = clean.ctx): boolean => {
    const b = {
      x0: Math.round((box.x / 100) * frame.W) - pad,
      y0: Math.round((box.y / 100) * frame.H) - pad,
      x1: Math.round(((box.x + box.w) / 100) * frame.W) + pad,
      y1: Math.round(((box.y + box.h) / 100) * frame.H) + pad,
    };
    const ring = ringStats(frame, b);
    if (ring.std >= 14) return false;
    ctx.fillStyle = rgbToHex(ring.r, ring.g, ring.b);
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    return true;
  };
  for (const t of texts) {
    if (stamps.some((s) => overlap(s, t) > 0.3)) continue; // jamais dans un tampon
    t.masked = tryMask(t);
  }
  for (const lg of logos) {
    lg.masked = tryMask(lg, 2);
  }
  const unmaskedTexts = texts.filter((t) => !t.masked && !stamps.some((s) => overlap(s, t) > 0.3));
  if (unmaskedTexts.length > 0) {
    warnings.push(
      `${unmaskedTexts.length} texte(s) n'ont pas pu être séparés du fond (zone non unie) — non recréés par défaut pour éviter un doublon.`,
    );
  }
  const unmaskedLogos = logos.filter((l) => !l.masked);
  if (unmaskedLogos.length > 0) {
    warnings.push(
      `${unmaskedLogos.length} logo(s) n'ont pas pu être détachés du fond — si vous les déplacez, l'original restera visible dessous. Vous pouvez le recouvrir manuellement.`,
    );
  }

  // second fond « sans tampons » : la grille imprimée est effacée pour que les
  // calques « Tampon N » soient la seule grille visible, même après régénération
  const cleanNoStamps = makeCanvas(frame.W, frame.H);
  cleanNoStamps.ctx.drawImage(clean.canvas, 0, 0);
  let stampsNotErased = 0;
  for (const s of stamps) {
    const padPx = Math.max(3, Math.round((s.w / 100) * frame.W * 0.08));
    if (!tryMask(s, padPx, cleanNoStamps.ctx)) stampsNotErased++;
  }
  if (stampsNotErased > 0) {
    warnings.push(
      `${stampsNotErased} tampon(s) n'ont pas pu être effacés du fond (zone non unie) — si vous régénérez la grille, l'ancienne peut rester visible dessous.`,
    );
  }

  await tick(7);
  const backgroundDataUrl = clean.canvas.toDataURL("image/jpeg", 0.92);
  const backgroundNoStampsDataUrl =
    stamps.length > 0 ? cleanNoStamps.canvas.toDataURL("image/jpeg", 0.92) : backgroundDataUrl;

  return {
    backgroundDataUrl,
    backgroundNoStampsDataUrl,
    originalDataUrl,
    frameWidth: frame.W,
    frameHeight: frame.H,
    palette,
    theme,
    texts,
    stamps,
    stampFill,
    logos,
    qr,
    program,
    engine: vision ? "vision" : "local",
    lowQuality,
    warnings,
  };
}

/* ----------------------------------------------------------------- rotate */

export async function rotateImage(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const { canvas, ctx } = makeCanvas(img.height, img.width);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return canvas.toDataURL("image/jpeg", 0.92);
}
'@
Ecrire-Fichier "src/lib/cardImport.ts" $src_lib_cardImport_ts

$src_lib_importToCard_ts = @'
// Phase 3 : transforme une ImportAnalysis validée en CardDoc de l'éditeur.
// Chaque élément détecté devient un vrai calque — sélectionnable, déplaçable,
// supprimable — posé exactement sur l'image d'origine (nettoyée) en fond.
// Ordre d'empilement : fond < logos < tampons < textes/paliers < QR/code-barres.
//
// Fidélité d'abord : les logos sont des découpes de l'image posées pile à leur
// position d'origine (rendu identique), les paliers (-5€, -15 %…) sont réécrits
// DANS leurs tampons comme sur la carte d'origine.

import type { CardDoc, Layer } from "@/types/layer";
import {
  createTextLayer,
  createShapeLayer,
  createImageLayer,
  createQrCodeLayer,
  createBarcodeLayer,
  makeId,
} from "@/lib/layerFactory";
import type { ImportAnalysis, ImportProgram, ImportTier } from "@/lib/cardImport";

export interface TextChoice {
  id: string;
  keep: boolean;
  content: string;
}

export interface ImportChoices {
  cardName: string;
  texts: TextChoice[];
  /** ids des logos à recréer en calques images */
  keepLogos: string[];
  /** recréer les tampons détectés en composants FidiCard modifiables */
  convertStamps: boolean;
  stampsFilled: number;
  stampAccent: string;
  /** paliers validés/corrigés par le commerçant (Phase 4) */
  tiers: ImportTier[];
  qrMode: "keep" | "fidicard";
  addFidiQr: boolean;
  addBarcode: boolean;
}

export function defaultChoices(a: ImportAnalysis): ImportChoices {
  const inStamp = (t: { x: number; y: number; w: number; h: number }) =>
    a.stamps.some((s) => boxOverlap(s, t) > 0.5);
  return {
    cardName: guessCardName(a),
    // on ne recrée par défaut que les textes proprement effacés du fond ;
    // les textes situés dans un tampon deviennent des paliers, pas des textes
    texts: a.texts.map((t) => ({ id: t.id, keep: t.masked && !inStamp(t), content: t.content })),
    keepLogos: a.logos.map((l) => l.id),
    convertStamps: a.stamps.length >= 3,
    stampsFilled: 0,
    stampAccent: a.theme.accent,
    tiers: (a.program?.tiers ?? []).map((t) => ({ ...t })),
    qrMode: "keep",
    addFidiQr: false,
    addBarcode: false,
  };
}

function guessCardName(a: ImportAnalysis): string {
  const biggest = [...a.texts].sort((x, y) => y.fontSize - x.fontSize)[0];
  return biggest ? `Carte ${biggest.content}` : "Carte importée";
}

function boxOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const min = Math.min(a.w * a.h, b.w * b.h);
  return min > 0 ? inter / min : 0;
}

/** programme final après corrections de l'écran de révision */
export function finalProgram(a: ImportAnalysis, c: ImportChoices): ImportProgram | null {
  if (!a.program && c.tiers.length === 0) return null;
  return {
    type: a.program?.type ?? "tampons",
    totalStamps: a.stamps.length || a.program?.totalStamps || 10,
    tiers: [...c.tiers].sort((x, y) => x.position - y.position),
    instructions: a.program?.instructions,
    social: a.program?.social,
    website: a.program?.website,
  };
}

export function importToCard(a: ImportAnalysis, c: ImportChoices): CardDoc {
  let zc = 0;
  const z = () => ++zc;
  const layers: Layer[] = [];

  // logos : découpes de l'image posées à l'identique — déplaçables,
  // redimensionnables, supprimables même sans fichier source
  for (const lg of a.logos) {
    if (!c.keepLogos.includes(lg.id)) continue;
    layers.push(
      createImageLayer(z(), lg.dataUrl, {
        id: makeId("imp-logo"),
        name: lg.description.slice(0, 24) || "Logo",
        x: lg.x,
        y: lg.y,
        width: lg.w,
        height: lg.h,
        radius: 0,
      }),
    );
  }

  // tampons : un cercle par tampon détecté, posé pile sur l'original
  if (c.convertStamps) {
    a.stamps.forEach((s, i) => {
      const on = i < c.stampsFilled;
      const isTier = c.tiers.some((t) => t.position === i + 1);
      layers.push(
        createShapeLayer(z(), "circle", {
          id: makeId("imp-stamp"),
          name: `Tampon ${i + 1}`,
          x: s.x,
          y: s.y,
          width: s.w,
          height: s.h,
          fill: on ? c.stampAccent : a.stampFill,
          stroke: c.stampAccent,
          strokeWidth: isTier ? 2 : on ? 0 : 1,
        }),
      );
    });

    // Phase 4 visible : les paliers réécrits DANS leurs tampons, comme sur
    // l'original (-5€ au 3ᵉ, -15 % au 6ᵉ…) — chacun est un calque texte
    for (const tier of c.tiers) {
      const s = a.stamps[tier.position - 1];
      if (!s) continue;
      const stampPx = (s.w / 100) * 520; // largeur du tampon sur le canvas 520
      layers.push(
        createTextLayer(z(), {
          id: makeId("imp-tier"),
          name: `Palier ${tier.position} — ${tier.reward}`.slice(0, 30),
          content: tier.reward,
          x: s.x - s.w * 0.25,
          y: s.y + s.h * 0.32,
          width: s.w * 1.5,
          height: s.h * 0.4,
          fontSize: Math.max(8, Math.min(16, Math.round(stampPx * (tier.reward.length > 4 ? 0.26 : 0.34)))),
          fontWeight: 700,
          color: c.stampAccent,
          align: "center",
        }),
      );
    }
  }

  // textes recréés exactement aux positions détectées
  for (const t of a.texts) {
    const choice = c.texts.find((x) => x.id === t.id);
    if (!choice?.keep) continue;
    layers.push(
      createTextLayer(z(), {
        id: makeId("imp-txt"),
        name: choice.content.slice(0, 24) || "Texte",
        content: choice.content,
        x: t.x,
        y: t.y,
        width: Math.min(100 - t.x, t.w + 2),
        height: Math.max(4, t.h + 1),
        fontSize: t.fontSize,
        fontWeight: t.fontSize >= 18 ? 700 : 500,
        color: t.color,
        align: "left",
      }),
    );
  }

  // QR : remplacé par le composant FidiCard à la position détectée…
  if (a.qr && c.qrMode === "fidicard") {
    layers.push(
      createQrCodeLayer(z(), {
        id: makeId("imp-qr"),
        name: "QR FidiCard",
        x: a.qr.x,
        y: a.qr.y,
        width: a.qr.w,
        height: a.qr.h,
        value: "https://fidicard.app/rejoindre",
      }),
    );
  }
  // … ou ajouté discrètement s'il n'y en avait pas
  if (!a.qr && c.addFidiQr) {
    layers.push(
      createQrCodeLayer(z(), {
        id: makeId("imp-qr"),
        name: "QR FidiCard",
        x: 84,
        y: 70,
        width: 12,
        height: 12 * (a.frameWidth / a.frameHeight),
        value: "https://fidicard.app/rejoindre",
      }),
    );
  }

  if (c.addBarcode) {
    layers.push(
      createBarcodeLayer(z(), {
        id: makeId("imp-bar"),
        name: "Code-barres FidiCard",
        x: 6,
        y: 82,
        width: 26,
        height: 12,
      }),
    );
  }

  return {
    id: makeId("card"),
    name: c.cardName || "Carte importée",
    category: "Importée",
    background: {
      kind: "image",
      color: a.theme.bg,
      gradientFrom: a.theme.bg,
      gradientTo: a.theme.bg,
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      // tampons convertis en calques → fond SANS la grille imprimée, sinon
      // elle réapparaît en double dès que la grille est régénérée
      image: c.convertStamps ? a.backgroundNoStampsDataUrl || a.backgroundDataUrl : a.backgroundDataUrl,
      imageDim: 0, // aucune altération : l'image d'origine reste intacte
    },
    layers,
    published: false,
    updatedAt: Date.now(),
  };
}
'@
Ecrire-Fichier "src/lib/importToCard.ts" $src_lib_importToCard_ts

$src_lib_stampLayers_ts = @'
// Pont entre la couche Fonctionnalités (loyaltyStore) et la couche Design
// (calques de la carte). Les tampons de la carte sont des calques nommés
// « Tampon N » ; les libellés de paliers sont des calques « Palier N — … ».
// Ces helpers savent les retrouver, les régénérer et les resynchroniser sans
// toucher au reste du design.

import type { Layer, ShapeLayer, StampShape } from "@/types/layer";
import { createShapeLayer, createTextLayer, makeId } from "@/lib/layerFactory";
import type { LoyaltyConfig } from "@/lib/loyalty";

const STAMP_RE = /^Tampon (\d+)$/;
const TIER_RE = /^Palier /;

export type { StampShape } from "@/types/layer";

export function getStampLayers(layers: Layer[]): ShapeLayer[] {
  return layers
    .filter((l): l is ShapeLayer => l.type === "shape" && STAMP_RE.test(l.name))
    .sort((a, b) => Number(STAMP_RE.exec(a.name)![1]) - Number(STAMP_RE.exec(b.name)![1]));
}

/** rayon (%) selon la forme choisie */
export function radiusFor(shape: StampShape): number {
  return shape === "cercle" ? 50 : shape === "arrondi" ? 25 : 6;
}

export function shapeOf(stamp: ShapeLayer): StampShape {
  if (stamp.shape === "circle" || stamp.radius >= 45) return "cercle";
  return stamp.radius >= 15 ? "arrondi" : "carre";
}

/**
 * (Re)génère la grille de tampons : supprime les anciens tampons + paliers et
 * pose une grille centrée de `config.totalStamps` éléments. Le reste du design
 * (fond, textes, logos…) n'est pas touché.
 */
export function regenerateStampGrid(
  layers: Layer[],
  config: LoyaltyConfig,
  opts: { shape: StampShape; size: number } = { shape: "cercle", size: 9 },
): Layer[] {
  const existing = getStampLayers(layers);
  // zone verticale : on reste là où étaient les tampons existants
  const avgY =
    existing.length > 0
      ? existing.reduce((s, l) => s + l.y, 0) / existing.length
      : undefined;

  const kept = layers.filter(
    (l) => !STAMP_RE.test(l.name) && !TIER_RE.test(l.name) && !/^Icône \d+$/.test(l.name),
  );

  const size = Math.max(5, Math.min(14, opts.size));
  const shown = Math.max(1, Math.min(24, config.totalStamps));
  const perRow = shown <= 6 ? shown : Math.ceil(shown / 2);
  const rows = Math.ceil(shown / perRow);
  const gap = perRow > 1 ? Math.min(14, (84 - size) / (perRow - 1)) : 0;
  const rowWidth = (perRow - 1) * gap + size;
  const startX = 8 + (84 - rowWidth) / 2;
  const hSize = size * 1.55; // hauteur % ≈ carré visuel (ratio carte)
  const rowGap = hSize + 3;
  const startY =
    avgY !== undefined ? Math.max(8, avgY) : rows === 1 ? 52 : 46;

  const stamps: Layer[] = [];
  let z = kept.length;
  for (let i = 0; i < shown; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    stamps.push(
      createShapeLayer(++z, "circle", {
        id: makeId("stamp"),
        name: `Tampon ${i + 1}`,
        x: startX + c * gap,
        y: startY + r * rowGap,
        width: size,
        height: hSize,
        radius: radiusFor(opts.shape),
        shape: opts.shape === "cercle" ? "circle" : "rect",
        fill: config.stampStyle.empty,
        stroke: config.stampStyle.border,
        strokeWidth: 1,
      }),
    );
  }
  return applyTiersToLayers([...kept, ...stamps], config);
}

/**
 * Resynchronise les paliers du programme sur les tampons de la carte :
 * libellé écrit DANS le tampon, contour accentué. Idempotent — les anciens
 * calques « Palier … » sont remplacés.
 */
export function applyTiersToLayers(layers: Layer[], config: LoyaltyConfig): Layer[] {
  const kept = layers.filter((l) => !TIER_RE.test(l.name));
  const stamps = getStampLayers(kept);
  if (stamps.length === 0) return kept;

  const out: Layer[] = kept.map((l) => {
    if (l.type === "shape" && STAMP_RE.test(l.name)) {
      const n = Number(STAMP_RE.exec(l.name)![1]);
      const isTier =
        config.mode === "stamps" && config.paliers.some((p) => p.position === n);
      return {
        ...l,
        stroke: l.stroke === "transparent" && !isTier ? l.stroke : config.stampStyle.border,
        strokeWidth: isTier ? 2 : Math.min(l.strokeWidth || 1, 1),
      };
    }
    return l;
  });

  if (config.mode !== "stamps") return out;

  let z = out.length;
  for (const palier of config.paliers) {
    const s = stamps[palier.position - 1];
    if (!s) continue;
    const stampPx = (s.width / 100) * 520;
    out.push(
      createTextLayer(++z, {
        id: makeId("tier"),
        name: `Palier ${palier.position} — ${palier.label}`.slice(0, 30),
        content: palier.label,
        x: s.x - s.width * 0.25,
        y: s.y + s.height * 0.32,
        width: s.width * 1.5,
        height: s.height * 0.4,
        fontSize: Math.max(8, Math.min(16, Math.round(stampPx * (palier.label.length > 4 ? 0.26 : 0.34)))),
        fontWeight: 700,
        color: config.stampStyle.filled,
        align: "center",
      }),
    );
  }
  return out;
}

/** applique uniquement le style (couleurs / forme / taille) aux tampons existants */
export function restyleStamps(
  layers: Layer[],
  config: LoyaltyConfig,
  opts: { shape?: StampShape; size?: number },
): Layer[] {
  const stamps = getStampLayers(layers);
  if (stamps.length === 0) return layers;
  const mutated = layers.map((l) => {
    if (l.type !== "shape" || !STAMP_RE.test(l.name)) return l;
    const next: ShapeLayer = { ...l, fill: config.stampStyle.empty, stroke: config.stampStyle.border };
    if (opts.shape) {
      next.radius = radiusFor(opts.shape);
      next.shape = opts.shape === "cercle" ? "circle" : "rect";
    }
    if (opts.size) {
      const cx = l.x + l.width / 2;
      const cy = l.y + l.height / 2;
      const hSize = opts.size * (l.height / l.width || 1.55);
      next.x = cx - opts.size / 2;
      next.y = cy - hSize / 2;
      next.width = opts.size;
      next.height = hSize;
    }
    return next;
  });
  return applyTiersToLayers(mutated, config);
}
'@
Ecrire-Fichier "src/lib/stampLayers.ts" $src_lib_stampLayers_ts

$src_lib_loyalty_index_ts = @'
// Moteur de fidélité FidiCard — TOUTE la logique métier vit ici.
//
// Deux couches strictement séparées dans l'app :
//   • Design  = les calques de la carte (éditeur graphique) ;
//   • Fonctionnalités = ce fichier + loyaltyStore : type de programme, règles
//     de progression, paliers de récompense, et ce qui se passe à chaque scan.
//
// `appliquerScan` est une fonction PURE (aucun accès store/réseau) : elle
// prend la config du commerce + l'état du client + un montant éventuel, et
// retourne le résultat complet du passage. Les stores/l'API ne font que
// persister ce résultat — aucune règle métier ne doit être écrite ailleurs.

/* ------------------------------------------------------------------ types */

export type LoyaltyMode = "stamps" | "points";

export type TierType = "pourcentage" | "montant" | "produit_offert" | "autre";

export interface Palier {
  /** n° du tampon (mode stamps) ou seuil en points (mode points) */
  position: number;
  /** libellé court affiché DANS le tampon — max ~6 caractères */
  label: string;
  /** description longue, montrée au client et au commerçant lors du scan */
  description: string;
  type: TierType;
}

export type RegleAttribution =
  | { type: "passage" } // 1 scan = 1 tampon
  | { type: "montant_minimum"; seuil: number } // 1 tampon si montant ≥ seuil
  | { type: "montant_palier"; tranche: number }; // 1 tampon par tranche de X €

export interface StampStyle {
  /** couleur d'un tampon non validé */
  empty: string;
  /** couleur de contour */
  border: string;
  /** couleur d'un tampon validé / d'un palier atteint */
  filled: string;
}

export interface LoyaltyConfig {
  mode: LoyaltyMode;
  totalStamps: number;
  regle: RegleAttribution;
  /** mode points : 1 € = N points */
  tauxConversion: number;
  paliers: Palier[];
  stampStyle: StampStyle;
}

export interface ClientLoyaltyState {
  tampons: number;
  points: number;
  /** positions des paliers déjà débloqués dans le cycle en cours */
  paliersAtteints: number[];
}

export interface ScanResult {
  ok: boolean;
  /** explication quand ok=false (ex. montant sous le seuil) */
  raison?: string;
  tamponsAvant: number;
  tamponsApres: number;
  pointsAvant: number;
  pointsApres: number;
  /** récompenses débloquées par CE scan (souvent 0 ou 1) */
  paliersDeclenches: Palier[];
  /** le prochain palier à atteindre, pour l'affichage */
  prochainPalier: Palier | null;
  /** tampons (ou points) restants avant le prochain palier */
  restantAvantPalier: number;
  /** dernier palier atteint → le cycle repart de zéro */
  carteCompletee: boolean;
}

export const DEFAULT_STAMP_STYLE: StampStyle = {
  empty: "rgba(255,255,255,0.92)",
  border: "#E8503D",
  filled: "#E8503D",
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  mode: "stamps",
  totalStamps: 10,
  regle: { type: "passage" },
  tauxConversion: 10,
  paliers: [
    { position: 10, label: "Offert", description: "Une récompense offerte à la carte complète", type: "produit_offert" },
  ],
  stampStyle: DEFAULT_STAMP_STYLE,
};

/* ----------------------------------------------------------------- moteur */

const byPosition = (a: Palier, b: Palier) => a.position - b.position;

export function appliquerScan(
  config: LoyaltyConfig,
  client: ClientLoyaltyState,
  montant?: number,
): ScanResult {
  const base: Omit<ScanResult, "ok"> = {
    tamponsAvant: client.tampons,
    tamponsApres: client.tampons,
    pointsAvant: client.points,
    pointsApres: client.points,
    paliersDeclenches: [],
    prochainPalier: null,
    restantAvantPalier: 0,
    carteCompletee: false,
  };

  if (config.mode === "stamps") {
    // — progression —
    let gain = 0;
    if (config.regle.type === "passage") {
      gain = 1;
    } else if (config.regle.type === "montant_minimum") {
      if (montant === undefined) {
        return { ok: false, raison: "Montant requis pour ce programme.", ...base };
      }
      if (montant < config.regle.seuil) {
        return {
          ok: false,
          raison: `Montant sous le seuil de ${config.regle.seuil} € — aucun tampon ajouté.`,
          ...base,
        };
      }
      gain = 1;
    } else {
      if (montant === undefined) {
        return { ok: false, raison: "Montant requis pour ce programme.", ...base };
      }
      gain = Math.floor(montant / config.regle.tranche);
      if (gain <= 0) {
        return {
          ok: false,
          raison: `Moins de ${config.regle.tranche} € — aucun tampon ajouté.`,
          ...base,
        };
      }
    }

    const total = Math.max(1, config.totalStamps);
    const apres = Math.min(total, client.tampons + gain);

    // — paliers franchis par ce scan —
    const declenches = config.paliers
      .filter((p) => p.position > client.tampons && p.position <= apres)
      .filter((p) => !client.paliersAtteints.includes(p.position))
      .sort(byPosition);

    const complete = apres >= total;
    const prochain =
      config.paliers.filter((p) => p.position > apres).sort(byPosition)[0] ?? null;

    return {
      ok: true,
      ...base,
      tamponsApres: complete ? 0 : apres, // carte complète → nouveau cycle
      paliersDeclenches: declenches,
      prochainPalier: complete
        ? config.paliers.slice().sort(byPosition)[0] ?? null
        : prochain,
      restantAvantPalier: complete
        ? (config.paliers.slice().sort(byPosition)[0]?.position ?? total)
        : prochain
          ? prochain.position - apres
          : total - apres,
      carteCompletee: complete,
    };
  }

  // — mode points —
  if (montant === undefined) {
    return { ok: false, raison: "Montant requis pour créditer des points.", ...base };
  }
  const gainPts = Math.round(montant * config.tauxConversion);
  const apresPts = client.points + gainPts;
  const declenches = config.paliers
    .filter((p) => p.position > client.points && p.position <= apresPts)
    .sort(byPosition);
  const prochain = config.paliers.filter((p) => p.position > apresPts).sort(byPosition)[0] ?? null;

  return {
    ok: true,
    ...base,
    pointsApres: apresPts,
    paliersDeclenches: declenches,
    prochainPalier: prochain,
    restantAvantPalier: prochain ? prochain.position - apresPts : 0,
    carteCompletee: false,
  };
}

/* ------------------------------------------------------------- validation */

/** Erreurs bloquant la publication du programme (liste vide = publiable). */
export function validerProgramme(config: LoyaltyConfig): string[] {
  const errs: string[] = [];
  if (config.paliers.length === 0) {
    errs.push("Aucun palier de récompense défini — la carte ne récompense rien.");
  }
  const positions = config.paliers.map((p) => p.position);
  if (new Set(positions).size !== positions.length) {
    errs.push("Deux paliers occupent la même position.");
  }
  if (config.mode === "stamps") {
    if (config.paliers.some((p) => p.position < 1 || p.position > config.totalStamps)) {
      errs.push(`Un palier dépasse le nombre de tampons (${config.totalStamps}).`);
    }
    if (config.paliers.length > 0 && !positions.includes(config.totalStamps)) {
      errs.push(
        `Le dernier tampon (${config.totalStamps}ᵉ) doit porter une récompense — sinon compléter la carte n'apporte rien.`,
      );
    }
  }
  if (config.paliers.some((p) => !p.label.trim())) {
    errs.push("Chaque palier doit avoir un libellé (ex. « -5€ », « Offert »).");
  }
  if (config.mode === "points" && config.tauxConversion <= 0) {
    errs.push("Le taux de conversion doit être positif (ex. 1 € = 10 points).");
  }
  if (
    (config.regle.type === "montant_minimum" && config.regle.seuil <= 0) ||
    (config.regle.type === "montant_palier" && config.regle.tranche <= 0)
  ) {
    errs.push("La règle d'attribution a un montant invalide.");
  }
  return errs;
}

/* ------------------------------------------- réactivité en cascade */

/** repositionne les paliers proportionnellement quand le total change ;
 *  retourne aussi les libellés des paliers retirés (au-delà du nouveau total) */
export function rescalePaliers(
  paliers: Palier[],
  oldTotal: number,
  newTotal: number,
): { paliers: Palier[]; dropped: Palier[] } {
  if (oldTotal === newTotal || oldTotal <= 0) return { paliers, dropped: [] };
  const kept: Palier[] = [];
  const dropped: Palier[] = [];
  const seen = new Set<number>();
  for (const p of [...paliers].sort(byPosition)) {
    let pos = Math.round((p.position / oldTotal) * newTotal);
    pos = Math.max(1, Math.min(newTotal, pos));
    while (seen.has(pos) && pos < newTotal) pos++;
    if (seen.has(pos)) { dropped.push(p); continue; }
    seen.add(pos);
    kept.push({ ...p, position: pos });
  }
  return { paliers: kept, dropped };
}

/** convertit les paliers entre tampons (positions) et points (seuils).
 *  stamps→points : position × (points d'une carte complète / total).
 *  points→stamps : seuil ramené sur l'échelle des tampons. */
export function convertPaliersMode(
  paliers: Palier[],
  from: LoyaltyMode,
  to: LoyaltyMode,
  totalStamps: number,
  tauxConversion: number,
  pointsCap = 500,
): Palier[] {
  if (from === to) return paliers;
  if (from === "stamps" && to === "points") {
    // une carte complète ≈ pointsCap points ; chaque tampon vaut donc pointsCap/total
    const per = Math.max(1, Math.round(pointsCap / Math.max(1, totalStamps)));
    return paliers.map((p) => ({ ...p, position: p.position * per }));
  }
  // points → stamps : on répartit les seuils sur [1..total]
  const max = Math.max(...paliers.map((p) => p.position), 1);
  const seen = new Set<number>();
  const out: Palier[] = [];
  for (const p of [...paliers].sort(byPosition)) {
    let pos = Math.max(1, Math.min(totalStamps, Math.round((p.position / max) * totalStamps)));
    while (seen.has(pos) && pos < totalStamps) pos++;
    if (seen.has(pos)) continue;
    seen.add(pos);
    out.push({ ...p, position: pos });
  }
  return out;
}

/** points ↔ euros dépensés, pour la lisibilité côté client */
export function pointsToEuros(points: number, tauxConversion: number): number {
  return tauxConversion > 0 ? Math.round(points / tauxConversion) : 0;
}

/** Résumé du programme en langage naturel — régénéré à chaque modification. */
export function describeProgram(config: LoyaltyConfig): string {
  const tiers = [...config.paliers].sort(byPosition);
  if (config.mode === "stamps") {
    const gain =
      config.regle.type === "passage"
        ? "1 tampon par passage"
        : config.regle.type === "montant_minimum"
          ? `1 tampon dès ${config.regle.seuil} € d'achat`
          : `1 tampon par tranche de ${config.regle.tranche} €`;
    if (tiers.length === 0) return `Vos clients gagnent ${gain}. Aucune récompense définie pour l'instant.`;
    const parts = tiers.map((t, i) => {
      const last = i === tiers.length - 1;
      return `${last ? "Au " : "au "}${t.position}ᵉ : ${t.description || t.label}`;
    });
    const complete = tiers.some((t) => t.position === config.totalStamps)
      ? " puis la carte redémarre."
      : ".";
    return `Vos clients gagnent ${gain}. ${capitalize(parts.join(", "))}${complete}`;
  }
  const parts = tiers.map(
    (t) => `à ${t.position} points (≈ ${pointsToEuros(t.position, config.tauxConversion)} € dépensés) : ${t.description || t.label}`,
  );
  if (tiers.length === 0) return `Vos clients gagnent ${config.tauxConversion} points par euro dépensé. Aucun palier défini.`;
  return `Vos clients gagnent ${config.tauxConversion} points par euro dépensé. Récompenses : ${parts.join(", ")}.`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------------------- aide à l'import (IA) */

/** « -5€ » → montant ; « -15% » → pourcentage ; « offert » → produit_offert */
export function inferTierType(label: string): TierType {
  if (/%/.test(label)) return "pourcentage";
  if (/[€$]|\beuros?\b/i.test(label)) return "montant";
  if (/offert|gratuit|free|cadeau/i.test(label)) return "produit_offert";
  return "autre";
}

/* ---------------------------------------------------------------- presets */

export interface ProgramPreset {
  id: string;
  nom: string;
  description: string;
  config: Omit<LoyaltyConfig, "stampStyle">;
}

// Mécanismes éprouvés de la restauration et du commerce de proximité —
// décrits par leur fonctionnement, sans nom d'enseigne.
export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    id: "classique-10",
    nom: "Classique · 10 passages",
    description: "Le plus répandu. Simple à comprendre pour le client.",
    config: {
      mode: "stamps",
      totalStamps: 10,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 10, label: "Offert", description: "Le 10ᵉ est offert", type: "produit_offert" },
      ],
    },
  },
  {
    id: "paliers-progressifs",
    nom: "Paliers progressifs",
    description: "Récompenses intermédiaires : réduit l'abandon en cours de carte.",
    config: {
      mode: "stamps",
      totalStamps: 10,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 3, label: "-5€", description: "5 € de réduction", type: "montant" },
        { position: 6, label: "-15%", description: "15 % de réduction", type: "pourcentage" },
        { position: 10, label: "-50%", description: "50 % de réduction", type: "pourcentage" },
      ],
    },
  },
  {
    id: "rapide-5",
    nom: "Cycle court · 5 passages",
    description: "Récompense rapide. Idéal pour créer l'habitude.",
    config: {
      mode: "stamps",
      totalStamps: 5,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 5, label: "Offert", description: "Le 5ᵉ est offert", type: "produit_offert" },
      ],
    },
  },
  {
    id: "prestation-8",
    nom: "Prestation · 8 passages",
    description: "Pensé pour coiffure, esthétique, instituts, barbiers.",
    config: {
      mode: "stamps",
      totalStamps: 8,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 4, label: "-10%", description: "10 % sur la prestation", type: "pourcentage" },
        { position: 8, label: "Offert", description: "Une prestation offerte", type: "produit_offert" },
      ],
    },
  },
  {
    id: "panier-15",
    nom: "1 tampon par 15 € d'achat",
    description: "La progression suit le panier — adapté aux tickets variables.",
    config: {
      mode: "stamps",
      totalStamps: 10,
      regle: { type: "montant_palier", tranche: 15 },
      tauxConversion: 10,
      paliers: [
        { position: 5, label: "-5€", description: "5 € de réduction", type: "montant" },
        { position: 10, label: "-20€", description: "20 € de réduction", type: "montant" },
      ],
    },
  },
  {
    id: "points-standard",
    nom: "Points · 1 € = 10 pts",
    description: "Chaque euro compte. Paliers atteints selon la dépense totale.",
    config: {
      mode: "points",
      totalStamps: 10,
      regle: { type: "passage" },
      tauxConversion: 10,
      paliers: [
        { position: 250, label: "-5€", description: "5 € de réduction dès 250 points", type: "montant" },
        { position: 500, label: "Offert", description: "Un produit offert dès 500 points", type: "produit_offert" },
        { position: 1000, label: "-50%", description: "50 % de réduction dès 1000 points", type: "pourcentage" },
      ],
    },
  },
];
'@
Ecrire-Fichier "src/lib/loyalty/index.ts" $src_lib_loyalty_index_ts

$src_lib_loyalty_renderLayer_ts = @'
// Rendu dynamique des zones fonctionnelles (chantier 2, couche 3).
//
// Une zone (types/layer.ts) est une DÉCLARATION : « ici, une grille de
// tampons ». Le nombre de tampons, les paliers et les couleurs viennent de la
// config de fidélité ; le remplissage vient de l'état du client. Cette
// fonction pure transforme le tout en calques ordinaires au moment de
// l'affichage — ils ne sont JAMAIS persistés. Tous les rendus (éditeur,
// galerie, /join, aperçus Wallet) passent par ici : une seule source, aucune
// copie qui puisse dériver.
//
// Parité géométrique : les formules (pas ≤ 14, hauteur ×1.55, centrage,
// libellés de paliers) reproduisent à l'identique l'ancienne grille en
// calques de lib/stampLayers.ts, pour que la migration v1→v2 soit invisible.

import type {
  IconLayer,
  Layer,
  ShapeLayer,
  StampGridZone,
  StampShape,
  TextLayer,
  Zone,
} from "@/types/layer";
import { DEFAULT_LOYALTY_CONFIG, type LoyaltyConfig } from "@/lib/loyalty";

/** hauteur d'un tampon (en % de la hauteur carte) pour une largeur donnée */
export const STAMP_HEIGHT_RATIO = 1.55;

export interface RenderClientState {
  tampons?: number;
  points?: number;
  paliersAtteints?: number[];
}

export interface RenderOptions {
  /** état du client à afficher (tampons remplis) ; absent = carte vierge */
  client?: RenderClientState;
  /** zIndex du premier calque produit (au-dessus du design) */
  zBase?: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function radiusOf(shape: StampShape): number {
  return shape === "cercle" ? 50 : shape === "arrondi" ? 25 : 6;
}

/** zone neuve avec la géométrie classique (pas 14 %, 1 ou 2 rangées centrées) */
export function createDefaultStampGridZone(id: string, total: number, size = 9): StampGridZone {
  const shown = clamp(Math.round(total), 1, 24);
  const perRow = shown <= 6 ? shown : Math.ceil(shown / 2);
  const rows = Math.ceil(shown / perRow);
  const hSize = size * STAMP_HEIGHT_RATIO;
  const step = perRow > 1 ? Math.min(14, (84 - size) / (perRow - 1)) : 0;
  const gridW = (perRow - 1) * step + size;
  const gridH = (rows - 1) * (hSize + 3) + hSize;
  return {
    id,
    kind: "stampGrid",
    frame: { x: 8 + (84 - gridW) / 2, y: rows === 1 ? 52 : 46, w: gridW, h: gridH },
    size,
    shape: "cercle",
    perRow: "auto",
    showTierLabels: true,
  };
}

/** position (x, y) du tampon d'index i (0-based) dans la zone */
export function stampPosition(
  zone: StampGridZone,
  total: number,
  i: number,
): { x: number; y: number; w: number; h: number } {
  const perRow =
    zone.perRow === "auto" ? (total <= 6 ? total : Math.ceil(total / 2)) : clamp(zone.perRow, 1, total);
  const rows = Math.ceil(total / perRow);
  const size = clamp(zone.size, 2, 30);
  const hSize = zone.stampHeight ?? size * STAMP_HEIGHT_RATIO;
  // la grille épouse exactement son cadre : le pas se déduit de la largeur
  const step = perRow > 1 ? (zone.frame.w - size) / (perRow - 1) : 0;
  const startX = perRow > 1 ? zone.frame.x : zone.frame.x + (zone.frame.w - size) / 2;
  const rowStep = rows > 1 ? (zone.frame.h - hSize) / (rows - 1) : 0;
  const startY = rows > 1 ? zone.frame.y : zone.frame.y + (zone.frame.h - hSize) / 2;
  const r = Math.floor(i / perRow);
  const c = i % perRow;
  return { x: startX + c * step, y: startY + r * rowStep, w: size, h: hSize };
}

function renderStampGrid(zone: StampGridZone, config: LoyaltyConfig, opts: RenderOptions): Layer[] {
  if (config.mode !== "stamps") return [];
  const total = clamp(Math.round(config.totalStamps), 1, 24);
  const filled = clamp(Math.round(opts.client?.tampons ?? zone.previewFilled ?? 0), 0, total);
  const style = { ...config.stampStyle, ...zone.styleOverride };
  let z = opts.zBase ?? 1000;
  const layers: Layer[] = [];

  for (let i = 0; i < total; i++) {
    const p = stampPosition(zone, total, i);
    const on = i < filled;
    // l'emphase de palier (anneau + libellé) forme un tout : masquée ensemble
    const isTier = zone.showTierLabels && config.paliers.some((t) => t.position === i + 1);
    layers.push({
      id: `${zone.id}:tampon:${i + 1}`,
      type: "shape",
      name: `Tampon ${i + 1}`,
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
      rotation: 0,
      opacity: 100,
      zIndex: z++,
      locked: false,
      hidden: false,
      groupId: zone.id,
      shape: zone.shape === "cercle" ? "circle" : "rect",
      radius: radiusOf(zone.shape),
      fill: on ? style.filled : style.empty,
      stroke: isTier && style.border === "transparent" ? config.stampStyle.border : style.border,
      strokeWidth: isTier ? 2 : style.border === "transparent" ? 0 : 1,
    } satisfies ShapeLayer);

    if (zone.icon) {
      const ib = zone.iconBox ?? { dx: p.w * 0.2, dy: p.h * 0.19, w: p.w * 0.6, h: p.h * 0.63 };
      layers.push({
        id: `${zone.id}:icone:${i + 1}`,
        type: "icon",
        name: `Icône ${i + 1}`,
        x: p.x + ib.dx,
        y: p.y + ib.dy,
        width: ib.w,
        height: ib.h,
        rotation: 0,
        opacity: 100,
        zIndex: z++,
        locked: false,
        hidden: false,
        groupId: zone.id,
        icon: zone.icon,
        color: on ? "#ffffff" : zone.iconColor ?? "rgba(255,255,255,0.4)",
      } satisfies IconLayer);
    }
  }

  if (zone.showTierLabels) {
    for (const palier of config.paliers) {
      const i = palier.position - 1;
      if (i < 0 || i >= total) continue;
      const p = stampPosition(zone, total, i);
      const stampPx = (p.w / 100) * 520;
      layers.push({
        id: `${zone.id}:palier:${palier.position}`,
        type: "text",
        name: `Palier ${palier.position} — ${palier.label}`.slice(0, 30),
        content: palier.label,
        x: p.x - p.w * 0.25,
        y: p.y + p.h * 0.32,
        width: p.w * 1.5,
        height: p.h * 0.4,
        rotation: 0,
        opacity: 100,
        zIndex: z++,
        locked: false,
        hidden: false,
        groupId: zone.id,
        font: "geist",
        fontSize: Math.max(8, Math.min(16, Math.round(stampPx * (palier.label.length > 4 ? 0.26 : 0.34)))),
        fontWeight: 700,
        italic: false,
        underline: false,
        color: style.filled,
        align: "center",
        letterSpacing: 0,
        lineHeight: 1.2,
      } satisfies TextLayer);
    }
  }

  return layers;
}

/**
 * Calques éphémères d'une zone fonctionnelle. Déterministe : mêmes entrées →
 * mêmes calques, ids stables (`<zoneId>:tampon:N`) pour que la sélection et
 * les clés React survivent aux re-rendus.
 */
export function renderLoyaltyLayer(zone: Zone, config: LoyaltyConfig, opts: RenderOptions = {}): Layer[] {
  switch (zone.kind) {
    case "stampGrid":
      return renderStampGrid(zone, config, opts);
  }
}

/** toutes les zones d'un document, empilées au-dessus des calques de design */
export function renderZones(
  zones: Zone[] | undefined,
  config: LoyaltyConfig,
  opts: RenderOptions = {},
): Layer[] {
  if (!zones || zones.length === 0) return [];
  const out: Layer[] = [];
  let zBase = opts.zBase ?? 1000;
  for (const zone of zones) {
    const layers = renderLoyaltyLayer(zone, config, { ...opts, zBase });
    zBase += layers.length;
    out.push(...layers);
  }
  return out;
}

/**
 * Rendu de VIGNETTE (galerie de modèles) : chaque zone se dessine à SON propre
 * compteur de démonstration (previewTotal) et avec ses couleurs, sans dépendre
 * de la config de fidélité du commerçant. Deux modèles voisins gardent ainsi
 * des grilles distinctes dans la galerie.
 */
export function renderZonesPreview(zones: Zone[] | undefined, opts: RenderOptions = {}): Layer[] {
  if (!zones || zones.length === 0) return [];
  const out: Layer[] = [];
  let zBase = opts.zBase ?? 1000;
  for (const zone of zones) {
    const total = zone.kind === "stampGrid" ? zone.previewTotal : undefined;
    const config: LoyaltyConfig = {
      ...DEFAULT_LOYALTY_CONFIG,
      totalStamps: total ?? DEFAULT_LOYALTY_CONFIG.totalStamps,
      paliers: [],
    };
    const layers = renderLoyaltyLayer(zone, config, { zBase });
    zBase += layers.length;
    out.push(...layers);
  }
  return out;
}
'@
Ecrire-Fichier "src/lib/loyalty/renderLayer.ts" $src_lib_loyalty_renderLayer_ts

$src_lib_migrateCard_ts = @'
// Migration v1 → v2 d'un document de carte (chantier 2).
//
// Un document v1 stocke sa grille de fidélité en calques concrets
// (« Tampon N », « Icône N », « Palier … »). La migration les regroupe en UNE
// StampGridZone déclarative dont la géométrie et les couleurs sont relevées
// sur les calques existants — le rendu (lib/loyalty/renderLayer.ts) reproduit
// alors la carte à l'identique. Les calques retirés sont conservés dans
// design_json_v1 : design + design_json_v1 = document v1 complet (rollback).
//
// Idempotente : un document v2 ressort inchangé.

import type { CardDoc, IconLayer, StampGridZone, TextLayer } from "@/types/layer";
import { getStampLayers, shapeOf } from "@/lib/stampLayers";
import { makeId } from "@/lib/layerFactory";

const TIER_RE = /^Palier /;
const ICON_RE = /^Icône (\d+)$/;

export function migrateCardDoc(doc: CardDoc): CardDoc {
  if (doc.version === 2) return doc;

  const stamps = getStampLayers(doc.layers);
  if (stamps.length === 0) {
    return { ...doc, version: 2, zones: doc.zones ?? [] };
  }

  const total = stamps.length;
  const gridIcons = doc.layers
    .filter((l): l is IconLayer => l.type === "icon" && ICON_RE.test(l.name))
    .sort((a, b) => Number(ICON_RE.exec(a.name)![1]) - Number(ICON_RE.exec(b.name)![1]));
  const iconsMatch = gridIcons.length === total;

  // géométrie relevée sur les calques. Le cadre est reconstruit depuis le PAS
  // observé (1ᵉʳ intervalle), pas depuis la boîte englobante brute : les
  // largeurs détectées sur photo varient de quelques dixièmes de % (bruit
  // d'arrondi) et pollueraient le pas — la grille physique, elle, est uniforme.
  const size = stamps[0].width;
  const stampHeight = stamps[0].height;
  const firstRowY = stamps[0].y;
  const observedPerRow = stamps.filter((s) => Math.abs(s.y - firstRowY) < stampHeight / 2).length;
  const autoPerRow = total <= 6 ? total : Math.ceil(total / 2);
  const rows = Math.ceil(total / observedPerRow);
  const stepX = observedPerRow > 1 ? stamps[1].x - stamps[0].x : 0;
  const rowStep = rows > 1 ? stamps[observedPerRow].y - stamps[0].y : 0;
  const frame = {
    x: stamps[0].x,
    y: stamps[0].y,
    w: (observedPerRow - 1) * stepX + size,
    h: (rows - 1) * rowStep + stampHeight,
  };

  // remplissage décoratif : les grilles v1 remplissent en tête de série
  const emptyFill = stamps[total - 1].fill;
  const previewFilled = stamps.filter((s) => s.fill !== emptyFill).length;
  const filledColor = stamps.find((s) => s.fill !== emptyFill)?.fill;

  // contour relevé sur un tampon non-palier (les paliers sont sur-lignés)
  const plainStamp = stamps.find((s) => s.strokeWidth < 2) ?? stamps[0];
  const border = plainStamp.stroke;
  // v1 écrivait libellés de palier et tampons validés de la même couleur
  const tierText = doc.layers.find(
    (l): l is TextLayer => l.type === "text" && TIER_RE.test(l.name),
  );

  const zone: StampGridZone = {
    id: makeId("zone"),
    kind: "stampGrid",
    frame,
    size,
    ...(Math.abs(stampHeight - size * 1.55) > 0.001 ? { stampHeight } : {}),
    shape: shapeOf(stamps[0]),
    perRow: observedPerRow === autoPerRow ? "auto" : Math.max(1, observedPerRow),
    // le document v1 n'affichait des libellés que s'il avait des calques Palier
    showTierLabels: doc.layers.some((l) => TIER_RE.test(l.name)),
    ...(iconsMatch
      ? {
          icon: gridIcons[0].icon,
          iconColor: (gridIcons[previewFilled] ?? gridIcons[0]).color,
          iconBox: {
            dx: gridIcons[0].x - stamps[0].x,
            dy: gridIcons[0].y - stamps[0].y,
            w: gridIcons[0].width,
            h: gridIcons[0].height,
          },
        }
      : {}),
    ...(previewFilled > 0 ? { previewFilled } : {}),
    styleOverride: {
      empty: emptyFill,
      border,
      ...(filledColor ?? tierText?.color ? { filled: filledColor ?? tierText?.color } : {}),
    },
  };

  const removedIconIds = new Set(iconsMatch ? gridIcons.map((i) => i.id) : []);
  const isGridLayer = (l: CardDoc["layers"][number]) =>
    /^Tampon \d+$/.test(l.name) || TIER_RE.test(l.name) || removedIconIds.has(l.id);

  return {
    ...doc,
    layers: doc.layers.filter((l) => !isGridLayer(l)),
    zones: [zone],
    version: 2,
    design_json_v1: { layers: doc.layers.filter(isGridLayer) },
  };
}

/** reconstitue le document v1 d'origine depuis un document migré */
export function rollbackCardDoc(doc: CardDoc): CardDoc {
  if (doc.version !== 2 || !doc.design_json_v1) return doc;
  const { design_json_v1, zones: _zones, version: _version, ...rest } = doc;
  return {
    ...rest,
    layers: [...doc.layers, ...design_json_v1.layers].sort((a, b) => a.zIndex - b.zIndex),
  };
}
'@
Ecrire-Fichier "src/lib/migrateCard.ts" $src_lib_migrateCard_ts

$src_lib_aiDesigner_conversation_ts = @'
// Cerveau de l'Assistant FidiCard (Designer IA).
//
// Déterministe et sans réseau : il comprend le secteur et le type de programme
// à partir du langage naturel, puis sélectionne de VRAIS modèles du catalogue.
// Aucune génération factice — chaque proposition est une carte réelle que le
// clic applique au moteur (cardStore + loyaltyStore). Le jour où l'on branche
// un vrai LLM, seule cette couche change ; l'UI et le câblage restent.

import { templateCatalog, type TemplateEntry } from "@/data/templateCatalog";
import type { StyleFamily } from "@/data/templateCatalog";

/* --- détection du secteur à partir de mots-clés (FR) --- */
const SECTOR_KEYWORDS: { sector: string; words: string[] }[] = [
  { sector: "Café", words: ["cafe", "café", "coffee", "torref", "brasserie a cafe", "salon de the", "the"] },
  { sector: "Boulangerie", words: ["boulang", "pain", "baguette", "viennois"] },
  { sector: "Pâtisserie", words: ["patiss", "pâtiss", "gateau", "dessert", "macaron", "chocolat"] },
  { sector: "Restaurant", words: ["restau", "resto", "bistro", "gastro", "traiteur", "cuisine"] },
  { sector: "Pizzeria", words: ["pizz"] },
  { sector: "Fast-food", words: ["fast", "burger", "kebab", "tacos", "snack", "friterie"] },
  { sector: "Bar", words: ["bar", "pub", "cocktail", "biere", "bière", "cave", "vin"] },
  { sector: "Salon de coiffure", words: ["coiff", "cheveux", "salon de coiffure"] },
  { sector: "Barbier", words: ["barbier", "barber", "barbe", "rasage"] },
  { sector: "Institut de beauté", words: ["institut", "beaute", "beauté", "esthet", "soin", "epilation", "épilation"] },
  { sector: "Onglerie", words: ["ongle", "manucure", "vernis", "nail"] },
  { sector: "Spa", words: ["spa", "massage", "hammam", "sauna", "bien-etre", "bien-être", "detente"] },
  { sector: "Sport & Fitness", words: ["sport", "fitness", "gym", "muscu", "coach", "yoga", "crossfit"] },
  { sector: "Hôtel", words: ["hotel", "hôtel", "chambre", "hebergement"] },
  { sector: "Garage", words: ["garage", "auto", "voiture", "mecani", "pneu", "lavage"] },
  { sector: "Fleuriste", words: ["fleur", "bouquet", "fleuriste"] },
  { sector: "Pharmacie", words: ["pharmac", "parapharma"] },
  { sector: "Opticien", words: ["opticien", "lunette", "optique", "vue"] },
  { sector: "Librairie", words: ["librairie", "livre", "bouquin"] },
  { sector: "Animalerie", words: ["animal", "animalerie", "toilettage", "chien", "chat"] },
  { sector: "Tattoo", words: ["tattoo", "tatouage", "piercing"] },
  { sector: "Boutique", words: ["boutique", "magasin", "concept store", "pret-a-porter", "vetement", "vêtement", "mode"] },
  { sector: "Formations", words: ["formation", "cours", "ecole", "école", "atelier"] },
];

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function detectSector(text: string): string | null {
  const t = strip(text);
  for (const { sector, words } of SECTOR_KEYWORDS) {
    if (words.some((w) => t.includes(strip(w)))) return sector;
  }
  return null;
}

/** le commerçant a-t-il évoqué points plutôt que tampons ? */
export function detectMode(text: string): "stamps" | "points" | null {
  const t = strip(text);
  if (/\bpoint/.test(t)) return "points";
  if (/tampon|cachet|carte a tampon/.test(t)) return "stamps";
  return null;
}

/* --- tons : chaque ton privilégie certaines familles de style --- */
export interface Tone {
  id: string;
  label: string;
  families: StyleFamily[];
}

export const TONES: Tone[] = [
  { id: "chaud", label: "Chaleureux (tons chauds)", families: ["vintage", "colore", "photo", "premium"] },
  { id: "neutre", label: "Élégant (tons neutres)", families: ["premium", "minimal", "bancaire"] },
  { id: "froid", label: "Moderne (tons froids)", families: ["gradient", "bancaire", "motif", "minimal"] },
];

/**
 * Trois propositions RÉELLES pour un secteur + un ton. On privilégie des
 * familles distinctes pour offrir un vrai choix visuel, puis on complète.
 */
export function proposalsFor(
  sector: string,
  toneId: string,
  exclude?: Set<string>,
): TemplateEntry[] {
  const tone = TONES.find((t) => t.id === toneId) ?? TONES[0];
  const inSector = templateCatalog.filter((t) => t.sector === sector && t.loyalty);
  const base = inSector.length >= 3 ? inSector : templateCatalog.filter((t) => t.loyalty);
  // « Générer d'autres versions » : on écarte les modèles déjà montrés ;
  // si le vivier est épuisé, on repart de zéro.
  let pool = exclude ? base.filter((t) => !exclude.has(t.id)) : base;
  if (pool.length < 3) pool = base;

  const rank = (t: TemplateEntry) => {
    const i = t.family ? tone.families.indexOf(t.family) : -1;
    return i === -1 ? 99 : i;
  };
  const sorted = [...pool].sort((a, b) => rank(a) - rank(b));

  // une par famille d'abord, pour maximiser la diversité visuelle
  const picked: TemplateEntry[] = [];
  const seenFamily = new Set<string>();
  for (const t of sorted) {
    const fam = t.family ?? "_";
    if (seenFamily.has(fam)) continue;
    seenFamily.add(fam);
    picked.push(t);
    if (picked.length === 3) break;
  }
  for (const t of sorted) {
    if (picked.length === 3) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked.slice(0, 3);
}
'@
Ecrire-Fichier "src/lib/aiDesigner/conversation.ts" $src_lib_aiDesigner_conversation_ts

$src_store_cardStore_ts = @'
import { create } from "zustand";
import type { CardBackground, CardDoc, Layer, Zone } from "@/types/layer";
import { cloneLayer, makeId } from "@/lib/layerFactory";
import { createBlankCard } from "@/data/blankCard";
import { migrateCardDoc } from "@/lib/migrateCard";

export type DrawerId =
  | "fidelite"
  | "modeles"
  | "tampons"
  | "texte"
  | "images"
  | "formes"
  | "qrcode"
  | "codebarres"
  | "upload"
  | "couleurs"
  | "arriereplan";

export type AlignType = "left" | "centerH" | "right" | "top" | "centerV" | "bottom";

const HISTORY_LIMIT = 60;

function cloneCard(card: CardDoc): CardDoc {
  return JSON.parse(JSON.stringify(card));
}

function nextZIndex(layers: Layer[]) {
  return layers.reduce((max, l) => Math.max(max, l.zIndex), 0) + 1;
}

interface CardState {
  card: CardDoc;
  selectedIds: string[];
  clipboard: Layer[];
  history: CardDoc[];
  historyIndex: number;
  zoom: number;
  showGrid: boolean;
  activeDrawer: DrawerId | null;
  recentColors: string[];
  guides: { x: number | null; y: number | null };
  lastSavedAt: number | null;

  selectLayer: (id: string, additive?: boolean) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;

  addLayer: (layer: Layer) => void;
  /** transformation en masse des calques (grille de tampons, paliers…) — un seul point d'historique */
  replaceLayers: (mutate: (layers: Layer[]) => Layer[]) => void;
  /** patch d'une zone fonctionnelle (v2) — un point d'historique */
  updateZone: (id: string, patch: Partial<Zone>) => void;
  addZone: (zone: Zone) => void;
  updateLayerLive: (id: string, patch: Partial<Layer>) => void;
  updateLayersLive: (patches: Record<string, Partial<Layer>>) => void;
  commitLayerChange: (id: string, patch: Partial<Layer>) => void;
  commit: () => void;
  setGuides: (guides: { x: number | null; y: number | null }) => void;

  deleteSelected: () => void;
  duplicateSelected: () => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  reorderLayer: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  reorderLayerToIndex: (id: string, targetIndex: number) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  align: (type: AlignType) => void;
  moveSelectedBy: (dx: number, dy: number) => void;

  setBackground: (patch: Partial<CardBackground>) => void;

  undo: () => void;
  redo: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;

  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleGrid: () => void;
  setActiveDrawer: (id: DrawerId | null) => void;

  applyTemplate: (doc: CardDoc) => void;
  loadCard: (doc: CardDoc) => void;
  resetCard: () => void;
  setCardName: (name: string) => void;

  pushRecentColor: (color: string) => void;
  markSaved: () => void;
}

const initialCard = createBlankCard();

export const useCardStore = create<CardState>((set, get) => ({
  card: initialCard,
  selectedIds: [],
  clipboard: [],
  history: [cloneCard(initialCard)],
  historyIndex: 0,
  zoom: 1,
  showGrid: true,
  activeDrawer: null,
  recentColors: [],
  guides: { x: null, y: null },
  lastSavedAt: null,

  selectLayer: (id, additive) =>
    set((state) => {
      if (additive) {
        const exists = state.selectedIds.includes(id);
        return { selectedIds: exists ? state.selectedIds.filter((i) => i !== id) : [...state.selectedIds, id] };
      }
      return { selectedIds: [id] };
    }),
  selectMany: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  addLayer: (layer) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers.push(layer);
      card.updatedAt = Date.now();
      return { card, selectedIds: [layer.id] };
    }),

  replaceLayers: (mutate) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers = mutate(card.layers);
      card.layers.forEach((l, i) => (l.zIndex = i + 1));
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, selectedIds: [], history: next, historyIndex: next.length - 1 };
    }),

  addZone: (zone) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.version = 2;
      card.zones = [...(card.zones ?? []), zone];
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  updateZone: (id, patch) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.zones = (card.zones ?? []).map((z) => (z.id === id ? ({ ...z, ...patch } as Zone) : z));
      card.updatedAt = Date.now();
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  updateLayerLive: (id, patch) =>
    set((state) => ({
      card: {
        ...state.card,
        layers: state.card.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
      },
    })),

  updateLayersLive: (patches) =>
    set((state) => ({
      card: {
        ...state.card,
        layers: state.card.layers.map((l) => (patches[l.id] ? ({ ...l, ...patches[l.id] } as Layer) : l)),
      },
    })),

  commitLayerChange: (id, patch) => {
    get().updateLayerLive(id, patch);
    get().commit();
  },

  setGuides: (guides) => set({ guides }),

  commit: () =>
    set((state) => {
      const card = { ...state.card, updatedAt: Date.now() };
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  deleteSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) return state;
      const card = cloneCard(state.card);
      card.layers = card.layers.filter((l) => !state.selectedIds.includes(l.id));
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, selectedIds: [], history: next, historyIndex: next.length - 1 };
    }),

  duplicateSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) return state;
      const card = cloneCard(state.card);
      const clones = card.layers
        .filter((l) => state.selectedIds.includes(l.id))
        .map((l) => cloneLayer(l, nextZIndex(card.layers)));
      card.layers.push(...clones);
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return {
        card,
        selectedIds: clones.map((c) => c.id),
        history: next,
        historyIndex: next.length - 1,
      };
    }),

  toggleLock: (id) => {
    const layer = get().card.layers.find((l) => l.id === id);
    if (!layer) return;
    get().commitLayerChange(id, { locked: !layer.locked });
  },
  toggleHidden: (id) => {
    const layer = get().card.layers.find((l) => l.id === id);
    if (!layer) return;
    get().commitLayerChange(id, { hidden: !layer.hidden });
  },
  renameLayer: (id, name) => get().commitLayerChange(id, { name }),

  reorderLayer: (id, direction) =>
    set((state) => {
      const card = cloneCard(state.card);
      const sorted = [...card.layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      if (idx === -1) return state;

      if (direction === "front") sorted.push(sorted.splice(idx, 1)[0]);
      else if (direction === "back") sorted.unshift(sorted.splice(idx, 1)[0]);
      else if (direction === "forward" && idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      } else if (direction === "backward" && idx > 0) {
        [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
      }

      sorted.forEach((l, i) => (l.zIndex = i + 1));
      card.layers = sorted;
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  reorderLayerToIndex: (id, targetIndex) =>
    set((state) => {
      const card = cloneCard(state.card);
      const sorted = [...card.layers].sort((a, b) => a.zIndex - b.zIndex);
      const from = sorted.findIndex((l) => l.id === id);
      if (from === -1) return state;
      const [moved] = sorted.splice(from, 1);
      sorted.splice(targetIndex, 0, moved);
      sorted.forEach((l, i) => (l.zIndex = i + 1));
      card.layers = sorted;
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  groupSelected: () =>
    set((state) => {
      if (state.selectedIds.length < 2) return state;
      const groupId = makeId("group");
      const card = cloneCard(state.card);
      card.layers = card.layers.map((l) =>
        state.selectedIds.includes(l.id) ? { ...l, groupId } : l
      );
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  ungroupSelected: () =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers = card.layers.map((l) =>
        state.selectedIds.includes(l.id) ? { ...l, groupId: null } : l
      );
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  align: (type) =>
    set((state) => {
      const card = cloneCard(state.card);
      const targets = card.layers.filter((l) => state.selectedIds.includes(l.id));
      targets.forEach((l) => {
        if (type === "left") l.x = 0;
        if (type === "right") l.x = 100 - l.width;
        if (type === "centerH") l.x = (100 - l.width) / 2;
        if (type === "top") l.y = 0;
        if (type === "bottom") l.y = 100 - l.height;
        if (type === "centerV") l.y = (100 - l.height) / 2;
      });
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  moveSelectedBy: (dx, dy) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.layers = card.layers.map((l) =>
        state.selectedIds.includes(l.id) && !l.locked ? { ...l, x: l.x + dx, y: l.y + dy } : l
      );
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  setBackground: (patch) =>
    set((state) => {
      const card = cloneCard(state.card);
      card.background = { ...card.background, ...patch };
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return { card, history: next, historyIndex: next.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { card: cloneCard(state.history[idx]), historyIndex: idx, selectedIds: [] };
    }),
  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { card: cloneCard(state.history[idx]), historyIndex: idx, selectedIds: [] };
    }),

  copySelected: () =>
    set((state) => ({
      clipboard: state.card.layers.filter((l) => state.selectedIds.includes(l.id)),
    })),
  pasteClipboard: () =>
    set((state) => {
      if (state.clipboard.length === 0) return state;
      const card = cloneCard(state.card);
      const clones = state.clipboard.map((l) => cloneLayer(l, nextZIndex(card.layers)));
      card.layers.push(...clones);
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, cloneCard(card)].slice(-HISTORY_LIMIT);
      return {
        card,
        selectedIds: clones.map((c) => c.id),
        history: next,
        historyIndex: next.length - 1,
      };
    }),

  setZoom: (z) => set({ zoom: Math.min(2, Math.max(0.4, z)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(2, Math.round((state.zoom + 0.1) * 100) / 100) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.4, Math.round((state.zoom - 0.1) * 100) / 100) })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setActiveDrawer: (id) => set((state) => ({ activeDrawer: state.activeDrawer === id ? null : id })),

  applyTemplate: (doc) =>
    set(() => {
      // tout document entrant passe en v2 : la grille devient une zone
      const card = migrateCardDoc(cloneCard(doc));
      card.id = makeId("card");
      card.updatedAt = Date.now();
      const next = [cloneCard(card)];
      return { card, selectedIds: [], history: next, historyIndex: 0 };
    }),

  loadCard: (doc) => {
    const card = migrateCardDoc(doc);
    set({ card, selectedIds: [], history: [cloneCard(card)], historyIndex: 0 });
  },

  resetCard: () => {
    const fresh = createBlankCard();
    set({ card: fresh, selectedIds: [], history: [cloneCard(fresh)], historyIndex: 0 });
  },

  setCardName: (name) =>
    set((state) => ({ card: { ...state.card, name, updatedAt: Date.now() } })),

  pushRecentColor: (color) =>
    set((state) => ({
      recentColors: [color, ...state.recentColors.filter((c) => c !== color)].slice(0, 10),
    })),

  markSaved: () => set({ lastSavedAt: Date.now() }),
}));
'@
Ecrire-Fichier "src/store/cardStore.ts" $src_store_cardStore_ts

$src_data_blankCard_ts = @'
import type { CardDoc } from "@/types/layer";
import { createTextLayer, makeId } from "@/lib/layerFactory";
import { createDefaultStampGridZone } from "@/lib/loyalty/renderLayer";

export function createBlankCard(): CardDoc {
  return {
    id: makeId("card"),
    name: "Ma carte de fidélité",
    category: "autres",
    version: 2,
    // couche fonctionnelle par défaut : la grille suit la config de fidélité
    zones: [createDefaultStampGridZone(makeId("zone"), 10)],
    background: {
      kind: "gradient",
      color: "#0f0603",
      gradientFrom: "#3a1a10",
      gradientTo: "#0a0402",
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      image: null,
      imageDim: 30,
    },
    layers: [
      createTextLayer(1, {
        id: makeId("business-name"),
        name: "Nom du commerce",
        content: "MON ENTREPRISE",
        x: 8,
        y: 30,
        width: 60,
        height: 12,
        fontSize: 22,
        fontWeight: 800,
        color: "#ffffff",
      }),
      createTextLayer(2, {
        id: makeId("business-tagline"),
        name: "Slogan",
        content: "Fidélisez vos clients",
        x: 8,
        y: 46,
        width: 60,
        height: 8,
        fontSize: 11,
        fontWeight: 400,
        color: "#e5e5e5",
      }),
      createTextLayer(3, {
        id: makeId("reward-line"),
        name: "Récompense",
        content: "Une boisson offerte à la 10ᵉ visite",
        x: 8,
        y: 74,
        width: 62,
        height: 8,
        fontSize: 10,
        fontWeight: 500,
        color: "#f0c8b4",
      }),
    ],
    published: false,
    updatedAt: Date.now(),
  };
}
'@
Ecrire-Fichier "src/data/blankCard.ts" $src_data_blankCard_ts

$src_data_templateCatalog_ts = @'
import type { CardDoc, CardBackground, Layer, StampGridZone, Zone } from "@/types/layer";
import {
  createTextLayer,
  createShapeLayer,
  createIconLayer,
  makeId,
} from "@/lib/layerFactory";
import { cardTemplates } from "@/data/cardTemplates";
import { generatedSpecs, familySpecs } from "@/data/templateFactory";

/* -------------------------------------------------------------------------- */
/*  Declarative template catalog                                              */
/*                                                                            */
/*  Templates are plain data. Adding one = adding a TemplateSpec object below  */
/*  (or, later, loading more specs from JSON / a remote source) — no editor or */
/*  builder code changes required. buildFromSpec() turns a spec into a full    */
/*  editable CardDoc so every element stays movable once loaded.               */
/* -------------------------------------------------------------------------- */

export type LoyaltyKind = "tampons" | "points";
export type TemplateTag = "populaire" | "nouveau";
export type TemplateLayout = "classic" | "centered" | "split" | "banner";
// 8 familles stylistiques — chacune a sa propre logique de composition, pas
// juste une variation de couleur.
export type StyleFamily =
  | "bancaire" | "photo" | "minimal" | "premium"
  | "colore" | "vintage" | "motif" | "gradient";

export const STYLE_FAMILIES: { id: StyleFamily; label: string }[] = [
  { id: "minimal", label: "Minimaliste" },
  { id: "bancaire", label: "Bancaire" },
  { id: "photo", label: "Photo" },
  { id: "premium", label: "Premium sombre" },
  { id: "colore", label: "Coloré" },
  { id: "vintage", label: "Vintage" },
  { id: "motif", label: "Motif" },
  { id: "gradient", label: "Gradient" },
];

export interface TemplateSpec {
  id: string;
  name: string; // template display name
  business: string; // brand name printed on the card
  tagline: string;
  sector: string;
  loyalty: LoyaltyKind;
  goal: number; // stamps to fill, or points target
  filled: number; // stamps shown filled (preview), or current points
  reward: string;
  icon: string; // lucide name (header + stamps), see src/lib/icons.ts
  bg: [string, string] | string; // gradient pair or a solid colour
  fg: string; // title colour
  sub: string; // subtitle / reward colour
  accent: string; // stamp & progress colour
  layout?: TemplateLayout; // composition — defaults to "classic"
  family?: StyleFamily; // traitement visuel du fond
  tags?: TemplateTag[];
}

export interface TemplateEntry {
  id: string;
  name: string;
  sector: string;
  family?: StyleFamily;
  tags?: TemplateTag[];
  build: () => CardDoc;
  /** essentiel du programme de fidélité porté par le modèle (Designer IA) */
  loyalty?: { mode: LoyaltyKind; total: number; reward: string; icon: string };
}

/* ---- background helpers ---- */

function background(bg: [string, string] | string): CardBackground {
  if (Array.isArray(bg)) {
    return {
      kind: "gradient",
      color: "#0a0a0a",
      gradientFrom: bg[0],
      gradientTo: bg[1],
      gradientAngle: 135,
      pattern: "dots",
      patternColor: "#ffffff",
      image: null,
      imageDim: 30,
    };
  }
  return {
    kind: "color",
    color: bg,
    gradientFrom: bg,
    gradientTo: bg,
    gradientAngle: 135,
    pattern: "dots",
    patternColor: "#ffffff",
    image: null,
    imageDim: 30,
  };
}

/** Fond selon la famille stylistique — chaque famille a un traitement distinct. */
function familyBackground(spec: TemplateSpec): CardBackground {
  const base = background(spec.bg);
  const solid = Array.isArray(spec.bg) ? spec.bg[0] : spec.bg;
  switch (spec.family) {
    case "minimal":
      // fond uni clair/sombre, sans fioriture
      return { ...base, kind: "color", color: solid, gradientFrom: solid, gradientTo: solid };
    case "bancaire":
      // aplat profond façon carte de crédit (dégradé très resserré, vertical)
      return {
        ...base,
        kind: "gradient",
        gradientFrom: Array.isArray(spec.bg) ? spec.bg[0] : spec.bg,
        gradientTo: Array.isArray(spec.bg) ? spec.bg[1] : solid,
        gradientAngle: 100,
      };
    case "premium":
      return { ...base, kind: "gradient", gradientAngle: 150 };
    case "gradient":
      return { ...base, kind: "gradient", gradientAngle: 120 };
    case "colore":
      return { ...base, kind: "gradient", gradientAngle: 60 };
    case "vintage":
      // aplat crème + fine trame diagonale
      return { ...base, kind: "pattern", color: solid, pattern: "diagonal", patternColor: spec.sub };
    case "motif":
      // motif métier en très basse opacité
      return { ...base, kind: "pattern", color: solid, pattern: "dots", patternColor: spec.accent };
    case "photo":
      // pas de photo réelle livrable : dégradé profond + voile pour suggérer
      // une image plein cadre lisible (le commerçant importe sa vraie photo
      // via le menu Fond)
      return {
        ...base,
        kind: "gradient",
        gradientFrom: Array.isArray(spec.bg) ? spec.bg[0] : spec.bg,
        gradientTo: Array.isArray(spec.bg) ? spec.bg[1] : "#05070d",
        gradientAngle: 165,
        imageDim: 45,
      };
    default:
      return base;
  }
}

/* ---- stamp grid → ZONE (couche fonctionnelle, chantier 2) ----
   Le modèle ne matérialise plus la grille en calques : il déclare une
   StampGridZone. Sa géométrie reproduit exactement l'ancienne grille (pas 14,
   hauteur 14, 1 ou 2 rangées) pour que la vignette reste identique au pixel,
   et son `previewTotal` fait afficher à chaque modèle son propre compteur. */

interface StampArea {
  x: number;
  w: number;
  /** center rows horizontally inside the area (layouts ≠ classic) */
  center?: boolean;
  y?: number;
}

function stampZone(
  goal: number,
  filled: number,
  iconName: string,
  accent: string,
  area: StampArea = { x: 8, w: 84 },
): StampGridZone {
  const size = 9;
  const stampHeight = 14;
  const shown = Math.min(goal, 10);
  const perRow = shown <= 6 ? shown : Math.ceil(shown / 2);
  const rows = Math.ceil(shown / perRow);
  const gap = perRow > 1 ? Math.min(14, (area.w - size) / (perRow - 1)) : 0;
  const rowWidth = (perRow - 1) * gap + size;
  const startX = area.center ? area.x + (area.w - rowWidth) / 2 : area.x;
  const startY = area.y ?? (rows === 1 ? 52 : 46);
  const rowGap = 16;
  return {
    id: makeId("zone"),
    kind: "stampGrid",
    frame: { x: startX, y: startY, w: rowWidth, h: (rows - 1) * rowGap + stampHeight },
    size,
    stampHeight,
    shape: "cercle",
    perRow: "auto",
    showTierLabels: true,
    icon: iconName,
    iconColor: "rgba(255,255,255,0.4)",
    iconBox: { dx: 1.8, dy: 2.6, w: 5.4, h: 8.8 },
    previewFilled: filled,
    previewTotal: shown,
    styleOverride: { empty: "rgba(255,255,255,0.12)", border: "transparent", filled: accent },
  };
}

/* ---- generic builder (4 compositions) ---- */

function hexLum(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return 0;
  return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255;
}

export function buildFromSpec(spec: TemplateSpec): CardDoc {
  const layout = spec.layout ?? "classic";
  let zc = 0;
  const z = () => ++zc;
  const layers: Layer[] = [];

  // geometry of the content column, per composition
  const contentX = layout === "split" ? 31 : 8;
  const contentW = layout === "split" ? 61 : 84;
  const centered = layout === "centered";

  /* — structural decor first (below everything else) — */
  if (layout === "split") {
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("side-band"),
        name: "Bande latérale",
        x: 0,
        y: 0,
        width: 27,
        height: 100,
        fill: spec.accent,
        opacity: 16,
        radius: 0,
      }),
    );
  }
  if (layout === "banner") {
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("banner"),
        name: "Bandeau",
        x: 0,
        y: 0,
        width: 100,
        height: 26,
        fill: spec.accent,
        opacity: 96,
        radius: 0,
      }),
    );
  }

  /* — header: icon + business + tagline — */
  const longName = spec.business.length > 15;
  const bannerText = hexLum(spec.accent) > 0.55 ? "#221610" : "#ffffff";

  if (layout === "classic") {
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 7, y: 20, width: 9, height: 14, color: spec.accent }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 18, y: 21, width: 66, height: 10,
        fontSize: longName ? 15 : 18, fontWeight: 800, color: spec.fg,
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 18, y: longName ? 33 : 34, width: 66, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub,
      }),
    );
  } else if (layout === "centered") {
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 45.5, y: 6, width: 9, height: 14, color: spec.accent }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 10, y: 23, width: 80, height: 10,
        fontSize: longName ? 15 : 18, fontWeight: 800, color: spec.fg, align: "center",
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 10, y: longName ? 35 : 36, width: 80, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub, align: "center",
      }),
    );
  } else if (layout === "split") {
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 9, y: 36, width: 9, height: 14, color: spec.accent }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 31, y: 20, width: 60, height: 10,
        fontSize: longName ? 14 : 17, fontWeight: 800, color: spec.fg,
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 31, y: longName ? 32 : 33, width: 60, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub,
      }),
    );
  } else {
    // banner
    layers.push(
      createTextLayer(z(), {
        id: makeId("business"), name: "Nom du commerce", content: spec.business,
        x: 8, y: 6, width: 76, height: 10,
        fontSize: longName ? 14 : 17, fontWeight: 800, color: bannerText,
      }),
    );
    layers.push(
      createIconLayer(z(), spec.icon, { id: makeId("brand-ic"), name: "Icône", x: 86, y: 5, width: 8, height: 13, color: bannerText }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("tagline"), name: "Slogan", content: spec.tagline,
        x: 8, y: 30, width: 76, height: 6,
        fontSize: 9, fontWeight: 400, color: spec.sub,
      }),
    );
  }

  /* — loyalty visual — */
  let zones: Zone[] | undefined;
  if (spec.loyalty === "tampons") {
    // la grille devient une zone (couche fonctionnelle) — pas des calques
    zones = [
      stampZone(spec.goal, spec.filled, spec.icon, spec.accent, {
        x: contentX,
        w: contentW,
        center: centered || layout === "split" || layout === "banner",
        y: layout === "banner" ? (Math.min(spec.goal, 10) <= 6 ? 56 : 48) : undefined,
      }),
    ];
  } else {
    const barY = layout === "banner" ? 56 : 54;
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("bar-bg"), name: "Jauge",
        x: contentX, y: barY, width: contentW, height: 7,
        fill: spec.accent, opacity: 22, radius: 4,
      }),
    );
    const ratio = Math.max(0.08, Math.min(1, spec.filled / spec.goal));
    layers.push(
      createShapeLayer(z(), "rect", {
        id: makeId("bar-fill"), name: "Progression",
        x: contentX, y: barY, width: Math.round(contentW * ratio), height: 7,
        fill: spec.accent, radius: 4,
      }),
    );
    layers.push(
      createTextLayer(z(), {
        id: makeId("points"), name: "Points",
        content: `${spec.filled} / ${spec.goal} points`,
        x: centered ? 25 : contentX, y: barY + 10, width: 50, height: 6,
        fontSize: 9, fontWeight: 600, color: spec.sub,
        align: centered ? "center" : "left",
      }),
    );
  }

  /* — reward — */
  layers.push(
    createTextLayer(z(), {
      id: makeId("reward"), name: "Récompense", content: spec.reward,
      x: centered ? 9 : contentX, y: layout === "banner" ? 80 : 79,
      width: centered ? 82 : Math.min(82, contentW + 21), height: 7,
      fontSize: 9, fontWeight: 600, color: spec.sub,
      align: centered ? "center" : "left",
    }),
  );

  return {
    id: makeId("tpl"),
    name: spec.name,
    category: spec.sector,
    background: familyBackground(spec),
    layers,
    published: false,
    updatedAt: Date.now(),
    version: 2,
    zones,
  };
}

/* -------------------------------------------------------------------------- */
/*  The catalog data                                                          */
/* -------------------------------------------------------------------------- */

const specs: TemplateSpec[] = [
  // Café
  { id: "cafe-espresso", name: "Espresso Noir", business: "CAFÉ RISTRETTO", tagline: "L'art du café", sector: "Café", loyalty: "tampons", goal: 10, filled: 6, reward: "Le 10ᵉ café offert", icon: "Coffee", bg: ["#3a2417", "#150a05"], fg: "#f5e6d8", sub: "#c9a98f", accent: "#e08a3d", tags: ["populaire"] },
  { id: "cafe-latte", name: "Latte Doux", business: "MAISON LATTE", tagline: "Douceur à emporter", sector: "Café", loyalty: "tampons", goal: 8, filled: 3, reward: "Une pâtisserie offerte à 8 visites", icon: "Coffee", bg: ["#4a3524", "#241609"], fg: "#fbeede", sub: "#d8b892", accent: "#c98a4a" },
  { id: "cafe-vert", name: "Café Botanique", business: "GREEN BEANS", tagline: "Café & plantes", sector: "Café", loyalty: "points", goal: 300, filled: 180, reward: "Boisson offerte à 300 points", icon: "Leaf", bg: ["#12291b", "#06120b"], fg: "#eafff0", sub: "#9fd8b4", accent: "#34d17e", tags: ["nouveau"] },

  // Restaurant
  { id: "resto-or", name: "Maison Dorée", business: "LA MAISON DORÉE", tagline: "Gastronomie d'exception", sector: "Restaurant", loyalty: "points", goal: 200, filled: 120, reward: "Dessert offert à 200 points", icon: "UtensilsCrossed", bg: ["#1a0a06", "#0c0403"], fg: "#e6c15c", sub: "#c9a227", accent: "#d4af37", tags: ["populaire"] },
  { id: "resto-bistro", name: "Bistrot de Quartier", business: "LE BISTROT", tagline: "Cuisine maison", sector: "Restaurant", loyalty: "tampons", goal: 8, filled: 5, reward: "Un plat offert toutes les 8 visites", icon: "UtensilsCrossed", bg: ["#2a1408", "#120802"], fg: "#ffe9cf", sub: "#e0b483", accent: "#e2743b" },
  { id: "resto-vin", name: "Table & Vin", business: "TABLE & VIN", tagline: "Accords parfaits", sector: "Restaurant", loyalty: "points", goal: 500, filled: 220, reward: "Une bouteille offerte à 500 points", icon: "Wine", bg: ["#2a0713", "#12030a"], fg: "#f6d9e2", sub: "#d68fa5", accent: "#c2415f" },

  // Fast-food
  { id: "ff-burger", name: "Burger Club", business: "BURGER CLUB", tagline: "Le goût, le vrai", sector: "Fast-food", loyalty: "tampons", goal: 10, filled: 7, reward: "Un menu offert à 10 tampons", icon: "UtensilsCrossed", bg: ["#3a1204", "#170701"], fg: "#ffe7c4", sub: "#f0b27a", accent: "#f97316", tags: ["populaire"] },
  { id: "ff-tacos", name: "Street Tacos", business: "STREET TACOS", tagline: "Fait sur le pouce", sector: "Fast-food", loyalty: "tampons", goal: 8, filled: 4, reward: "Le 8ᵉ tacos offert", icon: "Flame", bg: ["#2a1a04", "#120b01"], fg: "#fff0cf", sub: "#e6c485", accent: "#eab308" },

  // Pizzeria
  { id: "pizza-napoli", name: "Napoli Vera", business: "PIZZA NAPOLI", tagline: "La vraie napolitaine", sector: "Pizzeria", loyalty: "tampons", goal: 8, filled: 5, reward: "Une pizza offerte toutes les 8", icon: "Pizza", bg: ["#8f2f22", "#3a0f0a"], fg: "#fff2e6", sub: "#f4b59a", accent: "#f4b942", tags: ["populaire"] },
  { id: "pizza-forno", name: "Al Forno", business: "AL FORNO", tagline: "Cuite au feu de bois", sector: "Pizzeria", loyalty: "points", goal: 250, filled: 90, reward: "Pizza offerte à 250 points", icon: "Flame", bg: ["#1e0a06", "#0d0402"], fg: "#ffe3d0", sub: "#e39a72", accent: "#e2542b" },

  // Boulangerie
  { id: "boul-tradition", name: "Tradition", business: "BOULANGERIE MARTIN", tagline: "Pain & tradition", sector: "Boulangerie", loyalty: "tampons", goal: 10, filled: 8, reward: "Une viennoiserie offerte à 10", icon: "Croissant", bg: "#c9a883", fg: "#3a2a18", sub: "#5c452a", accent: "#8a5a34", tags: ["populaire"] },
  { id: "boul-grains", name: "Aux Grains", business: "AUX BONS GRAINS", tagline: "Cuit ce matin", sector: "Boulangerie", loyalty: "tampons", goal: 8, filled: 3, reward: "Une baguette offerte à 8 achats", icon: "Croissant", bg: ["#4a3216", "#241708"], fg: "#f7e4c4", sub: "#d8b483", accent: "#d99a4a" },

  // Pâtisserie
  { id: "patis-sucre", name: "Sucré Fin", business: "SUCRÉ FIN", tagline: "L'art du dessert", sector: "Pâtisserie", loyalty: "tampons", goal: 6, filled: 2, reward: "Une pâtisserie offerte à 6", icon: "CakeSlice", bg: ["#2a0722", "#120410"], fg: "#ffe6f5", sub: "#f0aad4", accent: "#ec4899", tags: ["nouveau"] },
  { id: "patis-glace", name: "Douceur Glacée", business: "GLACIER AMORE", tagline: "Glaces artisanales", sector: "Pâtisserie", loyalty: "tampons", goal: 8, filled: 5, reward: "Une glace offerte toutes les 8", icon: "IceCream", bg: ["#0a1e2a", "#040c12"], fg: "#dff3ff", sub: "#96cbe6", accent: "#38bdf8" },

  // Bar
  { id: "bar-craft", name: "Craft & Co", business: "CRAFT & CO", tagline: "Bières de caractère", sector: "Bar", loyalty: "tampons", goal: 10, filled: 6, reward: "La 10ᵉ pinte offerte", icon: "Beer", bg: ["#2a1c04", "#120c01"], fg: "#ffeeb8", sub: "#e6c766", accent: "#eab308", tags: ["populaire"] },
  { id: "bar-cocktail", name: "Speakeasy", business: "LE SPEAKEASY", tagline: "Cocktails d'auteur", sector: "Bar", loyalty: "points", goal: 300, filled: 150, reward: "Un cocktail offert à 300 points", icon: "Wine", bg: ["#160a24", "#080310"], fg: "#e9ddff", sub: "#b69ce6", accent: "#8b5cf6" },

  // Salon de coiffure
  { id: "coif-prestige", name: "Prestige", business: "SALON PRESTIGE", tagline: "Sublimez votre style", sector: "Salon de coiffure", loyalty: "tampons", goal: 6, filled: 2, reward: "Une coupe offerte toutes les 6", icon: "Scissors", bg: ["#2a0715", "#12030a"], fg: "#ffffff", sub: "#fda4af", accent: "#fb7185", tags: ["populaire"] },
  { id: "coif-studio", name: "Studio Hair", business: "STUDIO HAIR", tagline: "Votre coiffeur créatif", sector: "Salon de coiffure", loyalty: "points", goal: 400, filled: 260, reward: "-20% à 400 points", icon: "Scissors", bg: ["#1a0a24", "#0a0410"], fg: "#f2e6ff", sub: "#c9a5e6", accent: "#a855f7" },
  { id: "coif-nature", name: "Éclat Naturel", business: "ÉCLAT NATUREL", tagline: "Beauté responsable", sector: "Salon de coiffure", loyalty: "tampons", goal: 8, filled: 4, reward: "Un soin offert à 8 visites", icon: "Flower2", bg: ["#12291f", "#06120b"], fg: "#eafff2", sub: "#9fd8bc", accent: "#34d17e" },

  // Barbier
  { id: "barbe-classic", name: "Barber Classic", business: "THE BARBER", tagline: "L'art du rasage", sector: "Barbier", loyalty: "tampons", goal: 8, filled: 6, reward: "Une coupe offerte à 8", icon: "Scissors", bg: ["#1a1410", "#0a0705"], fg: "#f0e6d8", sub: "#c2a888", accent: "#b8895a", tags: ["populaire"] },
  { id: "barbe-noir", name: "Gentleman", business: "GENTLEMAN'S", tagline: "Style & précision", sector: "Barbier", loyalty: "tampons", goal: 10, filled: 3, reward: "Barbe offerte toutes les 10", icon: "Scissors", bg: ["#12100e", "#050403"], fg: "#e8e2d8", sub: "#b0a48f", accent: "#d4af37" },

  // Institut de beauté
  { id: "inst-luxe", name: "Luxe Beauté", business: "LUXE BEAUTÉ", tagline: "Révélez votre éclat", sector: "Institut de beauté", loyalty: "tampons", goal: 8, filled: 4, reward: "Soin visage offert à 8 tampons", icon: "Flower", bg: ["#2a0722", "#0f0410"], fg: "#ffffff", sub: "#f5b8dd", accent: "#e879b9", tags: ["populaire"] },
  { id: "inst-zen", name: "Zen Institut", business: "ZEN INSTITUT", tagline: "Prenez soin de vous", sector: "Institut de beauté", loyalty: "points", goal: 500, filled: 300, reward: "Un modelage offert à 500 pts", icon: "Sparkles", bg: ["#0a2422", "#04100f"], fg: "#dffbf6", sub: "#8fd6cc", accent: "#2dd4bf" },

  // Onglerie
  { id: "ongle-glam", name: "Nail Glam", business: "NAIL GLAM", tagline: "Des ongles parfaits", sector: "Onglerie", loyalty: "tampons", goal: 6, filled: 3, reward: "Une pose offerte toutes les 6", icon: "Sparkles", bg: ["#2a0720", "#12030e"], fg: "#ffe6f7", sub: "#f0a8d8", accent: "#f472b6", tags: ["nouveau"] },

  // Spa
  { id: "spa-serenite", name: "Sérénité", business: "SPA SÉRÉNITÉ", tagline: "Évasion & détente", sector: "Spa", loyalty: "points", goal: 600, filled: 280, reward: "Accès spa offert à 600 pts", icon: "Droplet", bg: ["#0a1e2a", "#040c12"], fg: "#dff1ff", sub: "#93c5e0", accent: "#38bdf8" },
  { id: "spa-thermes", name: "Les Thermes", business: "LES THERMES", tagline: "Bien-être absolu", sector: "Spa", loyalty: "tampons", goal: 8, filled: 5, reward: "Un soin corps offert à 8", icon: "Droplet", bg: ["#0a2422", "#04100f"], fg: "#e0fbf6", sub: "#8fd6cc", accent: "#2dd4bf" },

  // Salle de sport
  { id: "gym-power", name: "Power Gym", business: "POWER GYM", tagline: "Dépasse tes limites", sector: "Sport & Fitness", loyalty: "points", goal: 500, filled: 240, reward: "1 séance coaching à 500 pts", icon: "Dumbbell", bg: ["#04140a", "#020a04"], fg: "#ffffff", sub: "#bbf7d0", accent: "#22c55e", tags: ["populaire"] },
  { id: "gym-cross", name: "Cross Box", business: "CROSS BOX", tagline: "Plus fort chaque jour", sector: "Sport & Fitness", loyalty: "tampons", goal: 10, filled: 7, reward: "Un mois offert à 10 passages", icon: "Flame", bg: ["#1a0604", "#0a0201"], fg: "#ffe0d8", sub: "#f0a08f", accent: "#ef4444" },
  { id: "gym-yoga", name: "Studio Yoga", business: "STUDIO YOGA", tagline: "Équilibre & énergie", sector: "Sport & Fitness", loyalty: "tampons", goal: 8, filled: 3, reward: "Un cours offert toutes les 8", icon: "Sun", bg: ["#241a04", "#100b01"], fg: "#fff2cf", sub: "#e6cd85", accent: "#f59e0b" },

  // Hôtel
  { id: "hotel-palace", name: "Le Palace", business: "HÔTEL LE PALACE", tagline: "Membre privilège", sector: "Hôtel", loyalty: "points", goal: 1000, filled: 420, reward: "Une nuit offerte à 1000 pts", icon: "BedDouble", bg: ["#0a0f24", "#040610"], fg: "#e6ecff", sub: "#a5b4e6", accent: "#6366f1", tags: ["populaire"] },
  { id: "hotel-riviera", name: "Riviera", business: "HÔTEL RIVIERA", tagline: "Votre escale d'exception", sector: "Hôtel", loyalty: "points", goal: 800, filled: 500, reward: "Surclassement à 800 points", icon: "Crown", bg: ["#0a1a24", "#040c10"], fg: "#dff0ff", sub: "#93c5e0", accent: "#0ea5e9" },

  // Garage
  { id: "garage-auto", name: "Auto Expert", business: "AUTO EXPERT", tagline: "Votre garage de confiance", sector: "Garage", loyalty: "points", goal: 500, filled: 300, reward: "Vidange offerte à 500 points", icon: "Wrench", bg: ["#0c1420", "#04080e"], fg: "#e2ecf5", sub: "#93aec2", accent: "#3b82f6", tags: ["populaire"] },
  { id: "garage-pneu", name: "Speed Pneus", business: "SPEED PNEUS", tagline: "Rapide & fiable", sector: "Garage", loyalty: "tampons", goal: 6, filled: 2, reward: "Contrôle offert toutes les 6 visites", icon: "Car", bg: ["#1a1204", "#0a0701"], fg: "#ffeec4", sub: "#e0c07a", accent: "#f59e0b" },

  // Fleuriste
  { id: "fleur-atelier", name: "Atelier Floral", business: "ATELIER FLORAL", tagline: "Fleurs de saison", sector: "Fleuriste", loyalty: "tampons", goal: 8, filled: 4, reward: "Un bouquet offert à 8 achats", icon: "Flower2", bg: ["#12291b", "#06120b"], fg: "#eafff0", sub: "#a5e0b8", accent: "#22c55e", tags: ["nouveau"] },
  { id: "fleur-rose", name: "Rose & Pivoine", business: "ROSE & PIVOINE", tagline: "L'élégance florale", sector: "Fleuriste", loyalty: "points", goal: 300, filled: 160, reward: "-15% à 300 points", icon: "Flower", bg: ["#2a0718", "#12030c"], fg: "#ffe6f0", sub: "#f0a8c8", accent: "#ec4899" },

  // Pharmacie
  { id: "pharma-sante", name: "Pharmacie Santé", business: "PHARMACIE CENTRALE", tagline: "Votre santé, notre priorité", sector: "Pharmacie", loyalty: "points", goal: 400, filled: 210, reward: "-10% parapharmacie à 400 pts", icon: "Pill", bg: ["#04241c", "#02100c"], fg: "#dffbf0", sub: "#8fd6bc", accent: "#10b981", tags: ["populaire"] },
  { id: "pharma-bien", name: "Bien-Être", business: "PHARMA BIEN-ÊTRE", tagline: "Conseils & soin", sector: "Pharmacie", loyalty: "tampons", goal: 10, filled: 5, reward: "Un cadeau offert à 10 visites", icon: "Stethoscope", bg: ["#041a24", "#020c10"], fg: "#dff0ff", sub: "#8fc5e0", accent: "#0ea5e9" },

  // Opticien
  { id: "optic-vision", name: "Vision Pro", business: "OPTIQUE VISION", tagline: "Voyez la différence", sector: "Opticien", loyalty: "points", goal: 500, filled: 180, reward: "2ᵉ paire offerte à 500 pts", icon: "Sparkles", bg: ["#0a1424", "#040810"], fg: "#e2ecff", sub: "#9fb4e6", accent: "#6366f1" },

  // Boutique
  { id: "shop-mode", name: "Dressing Chic", business: "DRESSING CHIC", tagline: "Votre style, notre passion", sector: "Boutique", loyalty: "points", goal: 500, filled: 320, reward: "-20% à 500 points", icon: "ShoppingBag", bg: ["#1a0a24", "#0a0410"], fg: "#f2e6ff", sub: "#c9a5e6", accent: "#a855f7", tags: ["populaire"] },
  { id: "shop-concept", name: "Concept Store", business: "CONCEPT STORE", tagline: "Objets d'exception", sector: "Boutique", loyalty: "tampons", goal: 8, filled: 3, reward: "Un cadeau offert à 8 achats", icon: "Gift", bg: ["#14141a", "#070709"], fg: "#eceaf0", sub: "#b0acc2", accent: "#f472b6" },

  // Animalerie
  { id: "animal-compagnon", name: "Mon Compagnon", business: "MON COMPAGNON", tagline: "Tout pour vos animaux", sector: "Animalerie", loyalty: "tampons", goal: 8, filled: 5, reward: "Un sachet offert à 8 achats", icon: "PawPrint", bg: ["#24160a", "#100a04"], fg: "#ffe9cf", sub: "#e0b488", accent: "#f59e0b", tags: ["nouveau"] },
  { id: "animal-aqua", name: "Aqua Zen", business: "AQUA ZEN", tagline: "L'univers aquatique", sector: "Animalerie", loyalty: "points", goal: 300, filled: 140, reward: "-10% à 300 points", icon: "Fish", bg: ["#0a1e2a", "#040c12"], fg: "#dff1ff", sub: "#8fc8e6", accent: "#38bdf8" },

  // Librairie
  { id: "livre-plume", name: "La Plume", business: "LIBRAIRIE LA PLUME", tagline: "Voyagez en lisant", sector: "Librairie", loyalty: "tampons", goal: 10, filled: 6, reward: "Un livre offert à 10 achats", icon: "Star", bg: ["#1a1206", "#0a0702"], fg: "#f7ead0", sub: "#d8bc88", accent: "#d4a24a" },

  // Tattoo
  { id: "tattoo-ink", name: "Ink Studio", business: "INK STUDIO", tagline: "L'art sur la peau", sector: "Tattoo", loyalty: "points", goal: 600, filled: 250, reward: "-15% à 600 points", icon: "Palette", bg: ["#0f0f12", "#050506"], fg: "#ececf0", sub: "#a8a8b8", accent: "#e11d48", tags: ["nouveau"] },
];

/* ---- canonical sector order ---- */
const SECTOR_ORDER = [
  "Café", "Restaurant", "Fast-food", "Pizzeria", "Boulangerie", "Pâtisserie", "Bar",
  "Salon de coiffure", "Barbier", "Institut de beauté", "Onglerie", "Spa",
  "Sport & Fitness", "Hôtel", "Garage", "Fleuriste", "Formations", "Pharmacie", "Opticien",
  "Boutique", "Animalerie", "Librairie", "Tattoo", "Autres",
];

function sectorRank(sector: string) {
  const i = SECTOR_ORDER.indexOf(sector);
  return i === -1 ? SECTOR_ORDER.length : i;
}

/* ---- unified catalog (curated specs + generated matrix + legacy) ---- */

const specEntries: TemplateEntry[] = [...specs, ...familySpecs, ...generatedSpecs].map((s) => ({
  id: s.id,
  name: s.name,
  sector: s.sector,
  family: s.family,
  tags: s.tags,
  build: () => buildFromSpec(s),
  loyalty: { mode: s.loyalty, total: s.goal, reward: s.reward, icon: s.icon },
}));

const legacyEntries: TemplateEntry[] = cardTemplates.map((t) => ({
  id: `legacy-${t.id}`,
  name: t.name,
  sector: t.category === "Autres" ? "Autres" : t.category,
  build: t.build,
}));

export const templateCatalog: TemplateEntry[] = [...specEntries, ...legacyEntries].sort(
  (a, b) => sectorRank(a.sector) - sectorRank(b.sector),
);

export const templateSectors: string[] = Array.from(
  new Set(templateCatalog.map((t) => t.sector)),
).sort((a, b) => sectorRank(a) - sectorRank(b));

export const templateCount = templateCatalog.length;

/** familles réellement présentes dans le catalogue, dans l'ordre canonique */
export const templateFamilies = STYLE_FAMILIES.filter((f) =>
  templateCatalog.some((t) => t.family === f.id),
);
'@
Ecrire-Fichier "src/data/templateCatalog.ts" $src_data_templateCatalog_ts

$src_components_layout_AppShell_tsx = @'
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Toaster from "@/components/ui/Toaster";
import PublishModal from "@/components/editor/PublishModal";
import WalletPreviewModal from "@/components/editor/WalletPreviewModal";
import { useUIStore } from "@/store/uiStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const pathname = usePathname();
  // seul l'éditeur avancé est plein écran ; le Designer IA garde la sidebar
  const fullBleed = pathname?.startsWith("/carte/editeur");
  const publicPage = pathname?.startsWith("/join");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setTheme(current);
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("fidicard-theme", theme);
    } catch {}
  }, [theme]);

  // Public, chrome-less pages (client QR signup) — no sidebar, no dashboard modals.
  if (publicPage) {
    return <>{children}</>;
  }

  if (fullBleed) {
    return (
      <div className="h-screen w-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        {children}
        <Toaster />
        <PublishModal />
        <WalletPreviewModal />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <div
        className="glow-blob left-[-10%] top-[-10%] h-[420px] w-[420px]"
        style={{ background: "var(--accent-2)" }}
      />
      <div
        className="glow-blob bottom-[-15%] right-[-5%] h-[520px] w-[520px]"
        style={{ background: "var(--accent-1)" }}
      />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto">{children}</main>
      <Toaster />
      <PublishModal />
      <WalletPreviewModal />
    </div>
  );
}
'@
Ecrire-Fichier "src/components/layout/AppShell.tsx" $src_components_layout_AppShell_tsx

$src_components_cardEditor_CardCanvas_tsx = @'
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { renderZones } from "@/lib/loyalty/renderLayer";
import type { Layer, TextLayer } from "@/types/layer";
import { CARD_RATIO } from "@/types/layer";
import { backgroundToCss } from "@/lib/backgroundStyle";
import LayerContent from "@/components/cardEditor/LayerContent";
import FidiLogo from "@/components/ui/FidiLogo";

const HANDLES = [
  { id: "nw", cx: 0, cy: 0 },
  { id: "n", cx: 0.5, cy: 0 },
  { id: "ne", cx: 1, cy: 0 },
  { id: "e", cx: 1, cy: 0.5 },
  { id: "se", cx: 1, cy: 1 },
  { id: "s", cx: 0.5, cy: 1 },
  { id: "sw", cx: 0, cy: 1 },
  { id: "w", cx: 0, cy: 0.5 },
] as const;

type DragMode =
  | { kind: "move" }
  | { kind: "resize"; handle: string }
  | { kind: "rotate" }
  | { kind: "marquee"; startX: number; startY: number }
  | null;

const SNAP = 1.2;

export default function CardCanvas() {
  const card = useCardStore((s) => s.card);
  const selectedIds = useCardStore((s) => s.selectedIds);
  const zoom = useCardStore((s) => s.zoom);
  const showGrid = useCardStore((s) => s.showGrid);
  const guides = useCardStore((s) => s.guides);
  const selectLayer = useCardStore((s) => s.selectLayer);
  const selectMany = useCardStore((s) => s.selectMany);
  const clearSelection = useCardStore((s) => s.clearSelection);
  const updateLayersLive = useCardStore((s) => s.updateLayersLive);
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const setGuides = useCardStore((s) => s.setGuides);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startClientX: number;
    startClientY: number;
    origin: Record<string, Layer>;
    rectW: number;
    rectH: number;
    centerClientX: number;
    centerClientY: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // v2 : calques éphémères des zones fonctionnelles, rendus depuis la config
  // de fidélité — affichés au-dessus du design, non interactifs (étape 5)
  const loyaltyConfig = useLoyaltyStore((s) => s.config);
  const zoneLayers = useMemo(() => {
    if (card.version !== 2 || !card.zones?.length) return [];
    const zBase = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    return renderZones(card.zones, loyaltyConfig, { zBase });
  }, [card.version, card.zones, card.layers, loyaltyConfig]);
  const zoneLayerIds = useMemo(() => new Set(zoneLayers.map((l) => l.id)), [zoneLayers]);

  const sortedLayers = [...card.layers, ...zoneLayers].sort((a, b) => a.zIndex - b.zIndex);
  const selectedLayers = card.layers.filter((l) => selectedIds.includes(l.id));
  const primary = selectedLayers.length === 1 ? selectedLayers[0] : null;

  const beginDrag = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const origin: Record<string, Layer> = {};
      selectedLayers.forEach((l) => (origin[l.id] = { ...l }));
      dragRef.current = {
        mode,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origin,
        rectW: rect.width,
        rectH: rect.height,
        centerClientX: rect.left,
        centerClientY: rect.top,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [selectedLayers]
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || !drag.mode) return;
      const dxPct = ((e.clientX - drag.startClientX) / drag.rectW) * 100;
      const dyPct = ((e.clientY - drag.startClientY) / drag.rectH) * 100;

      if (drag.mode.kind === "move") {
        let snapX: number | null = null;
        let snapY: number | null = null;
        const patches: Record<string, Partial<Layer>> = {};
        Object.values(drag.origin).forEach((l) => {
          let nx = l.x + dxPct;
          let ny = l.y + dyPct;
          const centerX = nx + l.width / 2;
          const centerY = ny + l.height / 2;
          if (Math.abs(centerX - 50) < SNAP) {
            nx = 50 - l.width / 2;
            snapX = 50;
          }
          if (Math.abs(centerY - 50) < SNAP) {
            ny = 50 - l.height / 2;
            snapY = 50;
          }
          patches[l.id] = { x: nx, y: ny };
        });
        setGuides({ x: snapX, y: snapY });
        updateLayersLive(patches);
      } else if (drag.mode.kind === "resize") {
        const l = Object.values(drag.origin)[0];
        if (!l) return;
        const h = drag.mode.handle;
        let { x, y, width, height } = l;
        if (h.includes("e")) width = Math.max(3, l.width + dxPct);
        if (h.includes("s")) height = Math.max(3, l.height + dyPct);
        if (h.includes("w")) {
          width = Math.max(3, l.width - dxPct);
          x = l.x + (l.width - width);
        }
        if (h.includes("n")) {
          height = Math.max(3, l.height - dyPct);
          y = l.y + (l.height - height);
        }
        updateLayerLive(l.id, { x, y, width, height });
      } else if (drag.mode.kind === "rotate") {
        const l = Object.values(drag.origin)[0];
        if (!l) return;
        const cx = drag.centerClientX + ((l.x + l.width / 2) / 100) * drag.rectW;
        const cy = drag.centerClientY + ((l.y + l.height / 2) / 100) * drag.rectH;
        const angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
        const snapped = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
        updateLayerLive(l.id, { rotation: snapped });
      } else if (drag.mode.kind === "marquee") {
        // marquee handled on up via bounds
        const curX = ((e.clientX - drag.centerClientX) / drag.rectW) * 100;
        const curY = ((e.clientY - drag.centerClientY) / drag.rectH) * 100;
        setGuides({ x: null, y: null });
        drag.mode = { kind: "marquee", startX: drag.mode.startX, startY: drag.mode.startY };
        marqueeSelect(drag.mode.startX, drag.mode.startY, curX, curY);
      }
    }

    function marqueeSelect(x1: number, y1: number, x2: number, y2: number) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const hits = card.layers
        .filter((l) => !l.locked && !l.hidden)
        .filter((l) => {
          const lcx = l.x + l.width / 2;
          const lcy = l.y + l.height / 2;
          return lcx >= minX && lcx <= maxX && lcy >= minY && lcy <= maxY;
        })
        .map((l) => l.id);
      selectMany(hits);
    }

    function onUp() {
      const drag = dragRef.current;
      if (drag && drag.mode && drag.mode.kind !== "marquee") {
        commit();
      }
      setGuides({ x: null, y: null });
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [card.layers, commit, selectMany, setGuides, updateLayerLive, updateLayersLive]);

  function handleCanvasPointerDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return;
    clearSelection();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = ((e.clientX - rect.left) / rect.width) * 100;
    const sy = ((e.clientY - rect.top) / rect.height) * 100;
    dragRef.current = {
      mode: { kind: "marquee", startX: sx, startY: sy },
      startClientX: e.clientX,
      startClientY: e.clientY,
      origin: {},
      rectW: rect.width,
      rectH: rect.height,
      centerClientX: rect.left,
      centerClientY: rect.top,
    };
  }

  function handleLayerPointerDown(e: React.PointerEvent, layer: Layer) {
    if (layer.locked) return;
    e.stopPropagation();
    if (!selectedIds.includes(layer.id)) {
      selectLayer(layer.id, e.shiftKey);
    } else if (e.shiftKey) {
      selectLayer(layer.id, true);
      return;
    }
    beginDrag(e, { kind: "move" });
  }

  const BASE_W = 520;
  const BASE_H = BASE_W / CARD_RATIO;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
      <div style={{ width: BASE_W * zoom, height: BASE_H * zoom, position: "relative" }}>
        <div
          ref={cardRef}
          onPointerDown={handleCanvasPointerDown}
          className="absolute left-0 top-0 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: BASE_W,
            height: BASE_H,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            ...backgroundToCss(card.background),
            touchAction: "none",
          }}
        >
          {showGrid && (
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                backgroundSize: "10% 10%",
              }}
            />
          )}

          {sortedLayers.map((layer) => {
            if (layer.hidden) return null;
            const isZone = zoneLayerIds.has(layer.id);
            const selected = !isZone && selectedIds.includes(layer.id);
            return (
              <div
                key={layer.id}
                onPointerDown={isZone ? undefined : (e) => handleLayerPointerDown(e, layer)}
                onDoubleClick={isZone ? undefined : () => layer.type === "text" && setEditingId(layer.id)}
                className="absolute"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  transform: `rotate(${layer.rotation}deg)`,
                  opacity: layer.opacity / 100,
                  zIndex: layer.zIndex,
                  cursor: layer.locked ? "default" : "move",
                  outline: selected ? "1.5px solid var(--accent-1)" : "none",
                  outlineOffset: 1,
                  pointerEvents: isZone ? "none" : undefined,
                }}
              >
                <LayerContent layer={layer} editing={editingId === layer.id} />
                {editingId === layer.id && layer.type === "text" && (
                  <InlineTextEditor
                    layer={layer as TextLayer}
                    onDone={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}

          {/* FidiCard fixed watermark (imposed, non-editable) */}
          <div
            className="pointer-events-none absolute left-[4%] top-[7%] z-[999] flex items-center gap-1"
            style={{ opacity: 0.92 }}
          >
            <FidiLogo size={16} glow={false} />
            <span className="font-semibold text-white" style={{ fontSize: 9, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
              FidiCard
            </span>
          </div>

          {/* center guides */}
          {guides.x !== null && (
            <div className="pointer-events-none absolute left-1/2 top-0 z-[1000] h-full w-px -translate-x-1/2" style={{ background: "var(--accent-1)" }} />
          )}
          {guides.y !== null && (
            <div className="pointer-events-none absolute left-0 top-1/2 z-[1000] h-px w-full -translate-y-1/2" style={{ background: "var(--accent-1)" }} />
          )}

          {/* selection handles for single layer */}
          {primary && !primary.locked && (
            <SelectionOverlay
              layer={primary}
              onResizeStart={(e, handle) => {
                e.stopPropagation();
                beginDrag(e, { kind: "resize", handle });
              }}
              onRotateStart={(e) => {
                e.stopPropagation();
                beginDrag(e, { kind: "rotate" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SelectionOverlay({
  layer,
  onResizeStart,
  onRotateStart,
}: {
  layer: Layer;
  onResizeStart: (e: React.PointerEvent, handle: string) => void;
  onRotateStart: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[1001]"
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.width}%`,
        height: `${layer.height}%`,
        transform: `rotate(${layer.rotation}deg)`,
      }}
    >
      <div className="absolute inset-0 border border-[var(--accent-1)]" />
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => onResizeStart(e, h.id)}
          className="pointer-events-auto absolute h-2.5 w-2.5 rounded-full border bg-white"
          style={{
            left: `${h.cx * 100}%`,
            top: `${h.cy * 100}%`,
            transform: "translate(-50%, -50%)",
            borderColor: "var(--accent-1)",
            cursor: "nwse-resize",
          }}
        />
      ))}
      <div
        onPointerDown={onRotateStart}
        className="pointer-events-auto absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-white"
        style={{ top: "-22px", borderColor: "var(--accent-1)", cursor: "grab" }}
      />
      <div className="absolute left-1/2 top-0 h-[22px] w-px -translate-x-1/2 -translate-y-full" style={{ background: "var(--accent-1)" }} />
    </div>
  );
}

function InlineTextEditor({ layer, onDone }: { layer: TextLayer; onDone: () => void }) {
  const updateLayerLive = useCardStore((s) => s.updateLayerLive);
  const commit = useCardStore((s) => s.commit);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={layer.content}
      onChange={(e) => updateLayerLive(layer.id, { content: e.target.value })}
      onBlur={() => {
        commit();
        onDone();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          commit();
          onDone();
        }
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 h-full w-full resize-none border-none bg-transparent outline-none"
      style={{
        fontFamily: "inherit",
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        fontStyle: layer.italic ? "italic" : "normal",
        color: layer.color,
        textAlign: layer.align,
        letterSpacing: layer.letterSpacing,
        lineHeight: layer.lineHeight,
      }}
    />
  );
}
'@
Ecrire-Fichier "src/components/cardEditor/CardCanvas.tsx" $src_components_cardEditor_CardCanvas_tsx

$src_components_cardEditor_CardEditor_tsx = @'
"use client";

import { useEffect } from "react";
import EditorTopBar from "@/components/cardEditor/EditorTopBar";
import LeftRail from "@/components/cardEditor/LeftRail";
import TopToolbar from "@/components/cardEditor/TopToolbar";
import CardCanvas from "@/components/cardEditor/CardCanvas";
import BottomBar from "@/components/cardEditor/BottomBar";
import RightPanel from "@/components/cardEditor/RightPanel";
import ImportCardModal from "@/components/cardEditor/importFlow/ImportCardModal";
import { useCardShortcuts } from "@/lib/useCardShortcuts";
import { useAutosaveCard } from "@/lib/useAutosaveCard";
import { useCardStore } from "@/store/cardStore";

export default function CardEditor() {
  useCardShortcuts();
  useAutosaveCard();
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);

  useEffect(() => {
    // respecte un tiroir déjà choisi (raccourcis du Designer IA) ; sinon défaut
    if (!useCardStore.getState().activeDrawer) setActiveDrawer("modeles");
  }, [setActiveDrawer]);

  return (
    <div className="flex h-screen w-full flex-col" style={{ background: "var(--bg)" }}>
      <EditorTopBar />
      <div className="flex min-h-0 flex-1">
        <LeftRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopToolbar />
          <div className="min-h-0 flex-1" style={{ background: "var(--bg-elevated)" }}>
            <CardCanvas />
          </div>
          <BottomBar />
        </div>
        <RightPanel />
      </div>
      <ImportCardModal />
    </div>
  );
}
'@
Ecrire-Fichier "src/components/cardEditor/CardEditor.tsx" $src_components_cardEditor_CardEditor_tsx

$src_components_cardEditor_MiniCard_tsx = @'
"use client";

import type { CardDoc } from "@/types/layer";
import { CARD_RATIO } from "@/types/layer";
import { backgroundToCss } from "@/lib/backgroundStyle";
import LayerContent from "@/components/cardEditor/LayerContent";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { renderZones, renderZonesPreview, type RenderClientState } from "@/lib/loyalty/renderLayer";

export default function MiniCard({
  doc,
  width = 240,
  client,
  preview = false,
}: {
  doc: CardDoc;
  width?: number;
  /** état de fidélité à afficher (tampons remplis) — carte vierge sinon */
  client?: RenderClientState;
  /** vignette de galerie : chaque modèle à son propre compteur, pas le live */
  preview?: boolean;
}) {
  // v2 : la grille sort de la config de fidélité au moment du rendu.
  // Sélecteur null stable pour les docs v1 et les vignettes → la galerie de
  // modèles ne se re-rend pas quand la config du commerçant change.
  const config = useLoyaltyStore((s) => (doc.version === 2 && !preview ? s.config : null));
  const zBase = doc.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
  const zoneLayers =
    doc.version !== 2
      ? []
      : preview
        ? renderZonesPreview(doc.zones, { zBase })
        : config
          ? renderZones(doc.zones, config, { client, zBase })
          : [];
  const sorted = [...doc.layers, ...zoneLayers].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ width, aspectRatio: `${CARD_RATIO}`, ...backgroundToCss(doc.background) }}
    >
      {sorted.map((layer) => {
        if (layer.hidden) return null;
        return (
          <div
            key={layer.id}
            className="absolute"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              transform: `rotate(${layer.rotation}deg)`,
              opacity: layer.opacity / 100,
              zIndex: layer.zIndex,
            }}
          >
            <LayerContent layer={scaleLayer(layer, width)} />
          </div>
        );
      })}
    </div>
  );
}

// text fontSize is in px at full canvas (520px). Scale down for the mini.
function scaleLayer(layer: CardDoc["layers"][number], width: number) {
  if (layer.type !== "text") return layer;
  const factor = width / 520;
  return { ...layer, fontSize: layer.fontSize * factor, letterSpacing: layer.letterSpacing * factor };
}
'@
Ecrire-Fichier "src/components/cardEditor/MiniCard.tsx" $src_components_cardEditor_MiniCard_tsx

$src_components_cardEditor_drawers_FideliteDrawer_tsx = @'
"use client";

import { useEffect } from "react";
import { Trophy, Plus, X, AlertTriangle, Check, Wand2, RefreshCw, Info } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { usePublishStore } from "@/store/publishStore";
import {
  PROGRAM_PRESETS,
  validerProgramme,
  describeProgram,
  pointsToEuros,
  type LoyaltyMode,
  type Palier,
  type TierType,
  type LoyaltyConfig,
} from "@/lib/loyalty";
import { applyTiersToLayers, getStampLayers, regenerateStampGrid } from "@/lib/stampLayers";

const TIER_TYPES: { id: TierType; label: string }[] = [
  { id: "montant", label: "Montant (€)" },
  { id: "pourcentage", label: "Pourcentage (%)" },
  { id: "produit_offert", label: "Produit offert" },
  { id: "autre", label: "Autre" },
];

const STAMP_COUNTS = [3, 5, 6, 8, 10, 12, 15, 20];

export default function FideliteDrawer() {
  const config = useLoyaltyStore((s) => s.config);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const setPaliers = useLoyaltyStore((s) => s.setPaliers);
  const setTotalStamps = useLoyaltyStore((s) => s.setTotalStamps);
  const setMode = useLoyaltyStore((s) => s.setMode);
  const applyPreset = useLoyaltyStore((s) => s.applyPreset);
  const lastCascade = useLoyaltyStore((s) => s.lastCascade);
  const clearCascade = useLoyaltyStore((s) => s.clearCascade);
  const replaceLayers = useCardStore((s) => s.replaceLayers);
  const cardStamps = useCardStore((s) => getStampLayers(s.card.layers).length);
  // v2 : la carte rend sa grille depuis la config — aucune synchro manuelle
  const isZoneCard = useCardStore((s) => s.card.version === 2);
  const pushToast = useUIStore((s) => s.pushToast);
  const published = usePublishStore((s) => s.published);

  const errors = validerProgramme(config);
  const isStamps = config.mode === "stamps";
  const summary = describeProgram(config);

  // les cascades (palier retiré, conversion) sont signalées en toast
  useEffect(() => {
    if (lastCascade) {
      pushToast(lastCascade);
      clearCascade();
    }
  }, [lastCascade, pushToast, clearCascade]);

  function patchPalier(i: number, patch: Partial<Palier>) {
    setPaliers(config.paliers.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function syncToCard(cfg: LoyaltyConfig = config) {
    if (isZoneCard) return;
    if (cardStamps === 0) {
      replaceLayers((layers) => regenerateStampGrid(layers, cfg));
      pushToast(`Grille de ${cfg.totalStamps} tampons ajoutée à la carte, paliers affichés.`);
    } else {
      replaceLayers((layers) => applyTiersToLayers(layers, cfg));
      pushToast("Paliers affichés dans les tampons de la carte.");
    }
  }

  return (
    <DrawerShell title="Fonctionnalités de la carte">
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Ici se définit le <strong>comportement</strong> de votre carte — séparé du design. C&rsquo;est ce
        moteur qui s&rsquo;exécute à chaque scan : ajout du tampon ou des points, déblocage des
        récompenses, mise à jour de la carte du client.
      </p>

      {/* type de programme */}
      <Section label="Type de programme">
        <div className="flex gap-2">
          {(
            [
              ["stamps", "Tampons"],
              ["points", "Points"],
            ] as [LoyaltyMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className="flex-1 cursor-pointer rounded-lg border py-2.5 text-xs font-semibold transition-colors"
              style={{
                borderColor: config.mode === mode ? "var(--accent-1)" : "var(--border)",
                background: config.mode === mode ? "var(--accent-glow)" : "var(--panel-soft)",
                color: config.mode === mode ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      {isStamps ? (
        <>
          <Section label="Nombre de tampons">
            <div className="flex flex-wrap gap-1.5">
              {STAMP_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalStamps(n)}
                  className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: config.totalStamps === n ? "var(--accent-1)" : "var(--border)",
                    background: config.totalStamps === n ? "var(--accent-glow)" : "transparent",
                    color: config.totalStamps === n ? "var(--accent-1)" : "var(--text-dim)",
                  }}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={24}
                value={config.totalStamps}
                onChange={(e) => setTotalStamps(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                className="w-16 rounded-lg border bg-transparent px-2 py-1.5 text-center text-xs outline-none focus:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              />
            </div>
            {cardStamps > 0 && cardStamps !== config.totalStamps && (
              <button
                onClick={() => {
                  replaceLayers((layers) => regenerateStampGrid(layers, config));
                  pushToast(`Grille régénérée : ${config.totalStamps} tampons.`);
                }}
                className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium hover:underline"
                style={{ color: "#F4B942" }}
              >
                <RefreshCw size={11} /> La carte affiche {cardStamps} tampons — mettre la carte à jour
              </button>
            )}
          </Section>

          <Section label="Règle d'attribution">
            <div className="space-y-1.5">
              <Radio
                on={config.regle.type === "passage"}
                onClick={() => setConfig({ regle: { type: "passage" } })}
                label="1 passage = 1 tampon"
              />
              <Radio
                on={config.regle.type === "montant_minimum"}
                onClick={() => setConfig({ regle: { type: "montant_minimum", seuil: 10 } })}
                label="1 tampon à partir d'un montant minimum"
              />
              {config.regle.type === "montant_minimum" && (
                <MoneyInput
                  label="Montant minimum"
                  value={config.regle.seuil}
                  onChange={(v) => setConfig({ regle: { type: "montant_minimum", seuil: v } })}
                />
              )}
              <Radio
                on={config.regle.type === "montant_palier"}
                onClick={() => setConfig({ regle: { type: "montant_palier", tranche: 15 } })}
                label="1 tampon par tranche de X €"
              />
              {config.regle.type === "montant_palier" && (
                <MoneyInput
                  label="Tranche"
                  value={config.regle.tranche}
                  onChange={(v) => setConfig({ regle: { type: "montant_palier", tranche: v } })}
                />
              )}
            </div>
          </Section>
        </>
      ) : (
        <Section label="Conversion">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
            1 € =
            <input
              type="number"
              min={1}
              value={config.tauxConversion}
              onChange={(e) => setConfig({ tauxConversion: Math.max(1, Number(e.target.value) || 1) })}
              className="w-20 rounded-lg border bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
            />
            points
          </div>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
            Ex. : un client paie 15 € → il gagne {15 * config.tauxConversion} points.
          </p>
        </Section>
      )}

      {/* paliers */}
      <Section
        label={`Paliers de récompense (${config.paliers.length})`}
        hint={
          isStamps
            ? "Position = numéro du tampon. Le libellé (max 8 car.) s'affiche DANS le tampon."
            : "Position = seuil de points à atteindre."
        }
      >
        <div className="space-y-2.5">
          {config.paliers
            .map((p, i) => ({ p, i }))
            .sort((a, b) => a.p.position - b.p.position)
            .map(({ p, i }) => (
              <div key={i} className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {isStamps ? "au" : "dès"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={isStamps ? config.totalStamps : undefined}
                    value={p.position}
                    onChange={(e) => patchPalier(i, { position: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 rounded-lg border bg-transparent px-1.5 py-1.5 text-center text-xs outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {isStamps ? "ᵉ tampon" : "points"}
                  </span>
                  <input
                    value={p.label}
                    maxLength={8}
                    placeholder="-5€"
                    onChange={(e) => patchPalier(i, { label: e.target.value })}
                    className="w-20 rounded-lg border bg-transparent px-2 py-1.5 text-xs font-semibold outline-none focus:border-[var(--accent-1)]"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <select
                    value={p.type}
                    onChange={(e) => patchPalier(i, { type: e.target.value as TierType })}
                    className="min-w-0 flex-1 cursor-pointer rounded-lg border bg-transparent px-1.5 py-1.5 text-[11px] outline-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-dim)", background: "var(--panel)" }}
                  >
                    {TIER_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPaliers(config.paliers.filter((_, idx) => idx !== i))}
                    className="shrink-0 cursor-pointer rounded-md p-1 hover:text-[#E8503D]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <input
                  value={p.description}
                  placeholder="Description montrée au client (ex. 5 € de réduction sur la prestation)"
                  onChange={(e) => patchPalier(i, { description: e.target.value })}
                  className="mt-2 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-[11px] outline-none focus:border-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                />
                {!isStamps && (
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {p.position} points ≈ {pointsToEuros(p.position, config.tauxConversion)} € dépensés
                  </p>
                )}
              </div>
            ))}
          <button
            onClick={() =>
              setPaliers([
                ...config.paliers,
                {
                  position: isStamps ? config.totalStamps : 250,
                  label: "",
                  description: "",
                  type: "montant",
                },
              ])
            }
            className="flex cursor-pointer items-center gap-1 text-[11px] font-medium hover:text-[var(--accent-1)]"
            style={{ color: "var(--text-dim)" }}
          >
            <Plus size={12} /> Ajouter un palier
          </button>
        </div>

        {errors.length > 0 && (
          <div
            className="mt-3 space-y-1 rounded-xl border px-3 py-2 text-[11px] leading-relaxed"
            style={{ borderColor: "rgba(244,185,66,0.35)", background: "rgba(244,185,66,0.07)", color: "#F4B942" }}
          >
            {errors.map((e) => (
              <p key={e} className="flex items-start gap-1.5">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}
        {errors.length === 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "#4CAF7D" }}>
            <Check size={12} /> Programme valide — publiable.
            {published && " Programme publié : les scans appliquent ces règles."}
          </p>
        )}

        {isStamps && !isZoneCard && (
          <button
            onClick={() => syncToCard()}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white transition-transform hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            <Trophy size={14} /> Afficher les paliers sur la carte
          </button>
        )}
      </Section>

      {/* résumé en langage naturel, régénéré à chaque modification */}
      <div
        className="mb-5 flex items-start gap-2 rounded-xl border px-3.5 py-3"
        style={{ borderColor: "var(--accent-1)", background: "var(--accent-glow)" }}
      >
        <Info size={14} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent-1)" }}>
            Votre programme, en clair
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
            {summary}
          </p>
        </div>
      </div>

      {/* presets */}
      <Section label="Programmes prêts à l'emploi" hint="Mécanismes éprouvés du commerce de proximité — un clic remplit tout et recalcule les paliers, modifiable ensuite.">
        <div className="space-y-2">
          {PROGRAM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                const hasCustom = config.paliers.length > 0;
                if (hasCustom && !window.confirm("Appliquer ce programme remplacera vos paliers actuels. Continuer ?")) return;
                applyPreset(preset);
                const cfg = { ...config, ...preset.config };
                syncToCard(cfg);
                pushToast(`Programme « ${preset.nom} » appliqué.`);
              }}
              className="block w-full cursor-pointer rounded-xl border p-2.5 text-left transition-colors hover:border-[var(--accent-1)]"
              style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text)" }}>
                <Wand2 size={12} className="text-[var(--accent-1)]" /> {preset.nom}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                {preset.description}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
                {preset.config.mode === "stamps"
                  ? `${preset.config.totalStamps} tampons · ${preset.config.paliers.map((p) => `${p.position}ᵉ → ${p.label}`).join(" · ")}`
                  : `1 € = ${preset.config.tauxConversion} pts · ${preset.config.paliers.map((p) => `${p.position} pts → ${p.label}`).join(" · ")}`}
              </p>
            </button>
          ))}
        </div>
      </Section>
    </DrawerShell>
  );
}

/* ------------------------------------------------------------- primitives */

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
      {hint && (
        <p className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Radio({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors"
      style={{
        borderColor: on ? "var(--accent-1)" : "var(--border)",
        background: on ? "var(--accent-glow)" : "transparent",
        color: on ? "var(--text)" : "var(--text-dim)",
      }}
    >
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: on ? "var(--accent-1)" : "var(--border-strong)" }}
      >
        {on && <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-1)" }} />}
      </span>
      {label}
    </button>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="ml-6 flex items-center gap-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
      {label}
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-16 rounded-lg border bg-transparent px-1.5 py-1 text-center text-xs outline-none focus:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
      />
      €
    </div>
  );
}
'@
Ecrire-Fichier "src/components/cardEditor/drawers/FideliteDrawer.tsx" $src_components_cardEditor_drawers_FideliteDrawer_tsx

$src_components_cardEditor_drawers_TamponsDrawer_tsx = @'
"use client";

import { useMemo, useState } from "react";
import { CircleDot, Grid3x3, Info, Search, UploadCloud, Trash2 } from "lucide-react";
import DrawerShell from "./DrawerShell";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useCustomStampsStore } from "@/store/customStampsStore";
import { createIconLayer, createImageLayer, makeId } from "@/lib/layerFactory";
import { createDefaultStampGridZone } from "@/lib/loyalty/renderLayer";
import {
  getStampLayers,
  regenerateStampGrid,
  restyleStamps,
  shapeOf,
  type StampShape,
} from "@/lib/stampLayers";
import {
  searchStamps,
  STAMP_CATEGORIES,
  CATEGORY_LABELS,
  getStampIcon,
  STAMP_COUNT,
  type StampCategory,
} from "@/lib/stampCatalog";

const COUNTS = [3, 5, 6, 8, 10, 12, 15, 20];
const SHAPES: { id: StampShape; label: string }[] = [
  { id: "cercle", label: "Cercle" },
  { id: "arrondi", label: "Arrondi" },
  { id: "carre", label: "Carré" },
];
const PAGE = 60;

export default function TamponsDrawer() {
  const card = useCardStore((s) => s.card);
  const addLayer = useCardStore((s) => s.addLayer);
  const replaceLayers = useCardStore((s) => s.replaceLayers);
  const pushToast = useUIStore((s) => s.pushToast);
  const config = useLoyaltyStore((s) => s.config);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const customStamps = useCustomStampsStore((s) => s.stamps);
  const addCustom = useCustomStampsStore((s) => s.add);
  const removeCustom = useCustomStampsStore((s) => s.remove);

  const updateZone = useCardStore((s) => s.updateZone);
  const addZone = useCardStore((s) => s.addZone);
  const setTotalStamps = useLoyaltyStore((s) => s.setTotalStamps);

  // v2 : la grille est une zone déclarative ; v1 : des calques « Tampon N »
  const zone = card.version === 2 ? card.zones?.find((z) => z.kind === "stampGrid") : undefined;
  const stamps = getStampLayers(card.layers);
  const currentShape: StampShape = zone ? zone.shape : stamps[0] ? shapeOf(stamps[0]) : "cercle";
  const [size, setSize] = useState(zone?.size ?? stamps[0]?.width ?? 9);
  const effectiveStyle = { ...config.stampStyle, ...zone?.styleOverride };

  // bibliothèque d'icônes-tampons
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<StampCategory | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => searchStamps(query, cat), [query, cat]);
  const shown = results.slice(0, limit);

  function regen(total: number, shape: StampShape = currentShape) {
    if (card.version === 2) {
      // la grille suit la config : changer le total suffit (cascade des paliers)
      setTotalStamps(total);
      if (!zone) addZone(createDefaultStampGridZone(makeId("zone"), total, size));
      pushToast(`Grille de ${total} tampons — la carte suit la configuration.`);
      return;
    }
    const cfg = { ...config, totalStamps: total };
    setConfig({ totalStamps: total });
    replaceLayers((layers) => regenerateStampGrid(layers, cfg, { shape, size }));
    pushToast(`Grille de ${total} tampons posée sur la carte.`);
  }
  function restyle(opts: { shape?: StampShape; size?: number }, style = config.stampStyle) {
    if (zone) {
      updateZone(zone.id, {
        ...(opts.shape ? { shape: opts.shape } : {}),
        ...(opts.size ? { size: opts.size, stampHeight: undefined } : {}),
      });
      return;
    }
    const cfg = { ...config, stampStyle: style };
    replaceLayers((layers) => restyleStamps(layers, cfg, opts));
  }
  function setStyleColor(key: keyof typeof config.stampStyle, value: string) {
    if (zone) {
      // fusionner l'héritage migré dans la config puis rendre depuis elle seule
      setConfig({ stampStyle: { ...config.stampStyle, ...zone.styleOverride, [key]: value } });
      if (zone.styleOverride) updateZone(zone.id, { styleOverride: undefined });
      return;
    }
    const style = { ...config.stampStyle, [key]: value };
    setConfig({ stampStyle: style });
    restyle({}, style);
  }
  function addIconAsLayer(lucide: string, name: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createIconLayer(z, lucide, { name, color: config.stampStyle.filled, width: 10, height: 10 * 1.55 }));
    pushToast(`Tampon « ${name} » ajouté.`);
  }
  function addCustomAsLayer(dataUrl: string, name: string) {
    const z = card.layers.reduce((m, l) => Math.max(m, l.zIndex), 0) + 1;
    addLayer(createImageLayer(z, dataUrl, { name, width: 12, height: 12, radius: 50 }));
    pushToast(`Tampon importé « ${name} » ajouté.`);
  }
  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      pushToast("Image trop lourde (2 Mo max pour un tampon).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const stamp = addCustom(file.name.replace(/\.[^.]+$/, ""), reader.result as string);
      addCustomAsLayer(stamp.dataUrl, stamp.name);
    };
    reader.readAsDataURL(file);
  }

  return (
    <DrawerShell title="Tampons">
      <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
        Un tampon est une icône. Choisissez-en parmi <strong>{STAMP_COUNT}</strong> classées par métier,
        ou <strong>importez la vôtre</strong>. La grille et son remplissage automatique se règlent plus
        bas ; le comportement (paliers, récompenses) est dans l&rsquo;onglet <strong>Fidélité</strong>.
      </p>

      {/* import */}
      <label
        className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors hover:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", background: "var(--accent-glow)" }}
      >
        <UploadCloud size={20} className="shrink-0 text-[var(--accent-1)]" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>Importer un tampon</span>
          <span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>PNG ou SVG · 2 Mo max</span>
        </span>
        <input type="file" accept="image/png,image/svg+xml,image/*" className="hidden" onChange={importFile} />
      </label>

      {/* mes tampons importés */}
      {customStamps.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Mes tampons ({customStamps.length})
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {customStamps.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => addCustomAsLayer(s.dataUrl, s.name)}
                  className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border p-1 transition-colors hover:border-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)" }}
                  title={s.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.dataUrl} alt={s.name} className="max-h-full max-w-full object-contain" />
                </button>
                <button
                  onClick={() => removeCustom(s.id)}
                  className="absolute -right-1 -top-1 hidden cursor-pointer rounded-full bg-[#E8503D] p-0.5 text-white group-hover:block"
                >
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* recherche */}
      <div className="mb-2.5 flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: "var(--border-strong)" }}>
        <Search size={14} style={{ color: "var(--text-faint)" }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          placeholder={`Rechercher un tampon (ciseaux, café, patte…)`}
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* pills catégories */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {(["all", ...STAMP_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => { setCat(c); setLimit(PAGE); }}
            className="shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              borderColor: cat === c ? "var(--accent-1)" : "var(--border)",
              background: cat === c ? "var(--accent-glow)" : "transparent",
              color: cat === c ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {c === "all" ? "Tous" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* grille d'icônes-tampons */}
      {shown.length === 0 ? (
        <p className="py-6 text-center text-xs" style={{ color: "var(--text-faint)" }}>
          Aucun tampon pour « {query} ».
        </p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {shown.map((s) => {
              const Icon = getStampIcon(s.lucide);
              return (
                <button
                  key={s.id}
                  onClick={() => addIconAsLayer(s.lucide, s.label)}
                  className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)", contentVisibility: "auto", containIntrinsicSize: "44px" }}
                  title={s.label}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
          {limit < results.length && (
            <button
              onClick={() => setLimit((l) => l + PAGE)}
              className="mt-2 w-full cursor-pointer rounded-lg border border-dashed py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
              style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
            >
              Voir plus ({results.length - limit} restants)
            </button>
          )}
        </>
      )}

      {/* ---------------- design de la grille ---------------- */}
      <div className="my-5 h-px" style={{ background: "var(--border)" }} />

      {zone ? (
        <p className="mb-4 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
          <CircleDot size={12} className="text-[var(--accent-1)]" />
          Grille dynamique de {config.totalStamps} tampons — le comportement se règle dans Fidélité.
        </p>
      ) : stamps.length === 0 ? (
        <button
          onClick={() => regen(config.totalStamps)}
          className="mb-5 flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed py-6 transition-colors hover:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        >
          <Grid3x3 size={24} className="text-[var(--accent-1)]" />
          <span className="text-sm font-semibold">Ajouter la grille de tampons ({config.totalStamps})</span>
        </button>
      ) : (
        <p className="mb-4 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
          <CircleDot size={12} className="text-[var(--accent-1)]" />
          {stamps.length} tampons sur la carte — chacun est sélectionnable.
        </p>
      )}

      <Section label="Nombre de tampons">
        <div className="flex flex-wrap gap-1.5">
          {COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => regen(n)}
              className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: config.totalStamps === n && (zone || stamps.length === n) ? "var(--accent-1)" : "var(--border)",
                background: config.totalStamps === n && (zone || stamps.length === n) ? "var(--accent-glow)" : "transparent",
                color: config.totalStamps === n && (zone || stamps.length === n) ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Forme">
        <div className="flex gap-2">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              onClick={() => restyle({ shape: s.id })}
              className="flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: currentShape === s.id ? "var(--accent-1)" : "var(--border)",
                background: currentShape === s.id ? "var(--accent-glow)" : "var(--panel-soft)",
                color: currentShape === s.id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label={`Taille (${Math.round(size * 10) / 10} %)`}>
        <input
          type="range"
          min={6}
          max={13}
          step={0.5}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          onPointerUp={() => restyle({ size })}
          className="w-full accent-[var(--accent-1)]"
        />
      </Section>

      <Section label="Couleurs">
        <div className="space-y-2">
          <ColorRow label="Tampon vide" value={effectiveStyle.empty} onChange={(v) => setStyleColor("empty", v)} />
          <ColorRow label="Contour" value={effectiveStyle.border} onChange={(v) => setStyleColor("border", v)} />
          <ColorRow label="Tampon validé / palier" value={effectiveStyle.filled} onChange={(v) => setStyleColor("filled", v)} />
        </div>
      </Section>

      <div
        className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed"
        style={{ borderColor: "var(--border-strong)", background: "var(--panel-soft)", color: "var(--text-dim)" }}
      >
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--accent-1)]" />
        <span>
          Sur la carte du client, les tampons se remplissent au fil des scans et les paliers atteints
          débloquent leurs récompenses — testez depuis la page <strong>Scanner</strong>.
        </span>
      </div>
    </DrawerShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#e8503d";
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-xs" style={{ color: "var(--text-dim)" }}>
      {label}
      <span className="relative h-8 w-12 overflow-hidden rounded-lg border" style={{ background: value, borderColor: "var(--border-strong)" }}>
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
    </label>
  );
}
'@
Ecrire-Fichier "src/components/cardEditor/drawers/TamponsDrawer.tsx" $src_components_cardEditor_drawers_TamponsDrawer_tsx

$src_components_cardEditor_drawers_TemplatesDrawer_tsx = @'
"use client";

import { useMemo, useState } from "react";
import { Search, ScanSearch } from "lucide-react";
import DrawerShell from "./DrawerShell";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import { useUIStore } from "@/store/uiStore";
import {
  templateCatalog,
  templateSectors,
  templateFamilies,
  templateCount,
  type TemplateEntry,
  type TemplateTag,
  type StyleFamily,
} from "@/data/templateCatalog";
import type { CardDoc } from "@/types/layer";

const TAG_STYLE: Record<TemplateTag, { label: string; bg: string; color: string }> = {
  populaire: { label: "Populaire", bg: "rgba(240,101,62,0.18)", color: "#ff8a5c" },
  nouveau: { label: "Nouveau", bg: "rgba(76,175,125,0.18)", color: "#4CAF7D" },
};

// Build each template's CardDoc once (memoized across the module) so scrolling
// the gallery stays smooth even with the full catalog.
const builtCache = new Map<string, CardDoc>();
function docFor(t: TemplateEntry): CardDoc {
  let doc = builtCache.get(t.id);
  if (!doc) {
    doc = t.build();
    builtCache.set(t.id, doc);
  }
  return doc;
}

export default function TemplatesDrawer() {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const pushToast = useUIStore((s) => s.pushToast);
  const setImportCardOpen = useUIStore((s) => s.setImportCardOpen);
  const [sector, setSector] = useState("Tous");
  const [family, setFamily] = useState<StyleFamily | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return templateCatalog.filter((t) => {
      if (sector !== "Tous" && t.sector !== sector) return false;
      if (family !== "all" && t.family !== family) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.sector.toLowerCase().includes(q);
    });
  }, [sector, family, q]);

  // group by sector, preserving catalog (sector-ordered) order
  const groups = useMemo(() => {
    const map = new Map<string, TemplateEntry[]>();
    for (const t of filtered) {
      const list = map.get(t.sector) ?? [];
      list.push(t);
      map.set(t.sector, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const chips = ["Tous", ...templateSectors];

  function apply(t: TemplateEntry) {
    applyTemplate(docFor(t));
    pushToast(`Modèle « ${t.name} » chargé`);
  }

  return (
    <DrawerShell title="Modèles de cartes">
      {/* main action: AI import of an existing card */}
      <button
        onClick={() => setImportCardOpen(true)}
        className="mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:border-[var(--accent-1)]"
        style={{ borderColor: "var(--border-strong)", background: "var(--accent-glow)" }}
      >
        <ScanSearch size={20} className="shrink-0 text-[var(--accent-1)]" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold" style={{ color: "var(--text)" }}>
            Importer ma carte existante
          </span>
          <span className="block text-[11px]" style={{ color: "var(--text-dim)" }}>
            Photo ou image — reconstruite par IA
          </span>
        </span>
      </button>

      <div className="mb-3 flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: "var(--border-strong)" }}>
        <Search size={14} style={{ color: "var(--text-faint)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher parmi ${templateCount} modèles...`}
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* familles de style */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Style
      </p>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {([["all", "Tous les styles"], ...templateFamilies.map((f) => [f.id, f.label] as const)] as const).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setFamily(id as StyleFamily | "all")}
              className="shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{
                borderColor: family === id ? "var(--accent-1)" : "var(--border)",
                background: family === id ? "var(--accent-glow)" : "transparent",
                color: family === id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* secteurs */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
        Secteur
      </p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setSector(c)}
            className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{
              borderColor: sector === c ? "var(--accent-1)" : "var(--border)",
              background: sector === c ? "var(--accent-glow)" : "transparent",
              color: sector === c ? "var(--accent-1)" : "var(--text-dim)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-xs" style={{ color: "var(--text-faint)" }}>
          Aucun modèle ne correspond à « {query} ».
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(([sectorName, items]) => {
            // en vue « Tous » sans recherche : 4 modèles par secteur, le reste à la demande
            const collapsed = sector === "Tous" && family === "all" && !q && !expanded.has(sectorName) && items.length > 4;
            const visible = collapsed ? items.slice(0, 4) : items;
            return (
              <div key={sectorName}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{sectorName}</p>
                  <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{items.length}</span>
                </div>
                <div className="space-y-3">
                  {visible.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => apply(t)}
                      className="relative block w-full cursor-pointer overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 hover:border-[var(--accent-1)]"
                      style={{
                        borderColor: "var(--border)",
                        // ne rendre le contenu que lorsqu'il approche du viewport
                        contentVisibility: "auto",
                        containIntrinsicSize: "auto 196px",
                      }}
                    >
                      {t.tags?.[0] && (
                        <span
                          className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                          style={{ background: TAG_STYLE[t.tags[0]].bg, color: TAG_STYLE[t.tags[0]].color }}
                        >
                          {TAG_STYLE[t.tags[0]].label}
                        </span>
                      )}
                      <MiniCard doc={docFor(t)} width={248} preview />
                      <div className="px-2.5 py-1.5 text-left" style={{ background: "var(--panel-soft)" }}>
                        <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{t.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{t.sector}</p>
                      </div>
                    </button>
                  ))}
                  {collapsed && (
                    <button
                      onClick={() => setExpanded((s) => new Set(s).add(sectorName))}
                      className="w-full cursor-pointer rounded-xl border border-dashed py-2 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      Voir les {items.length - 4} autres modèles {sectorName}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DrawerShell>
  );
}
'@
Ecrire-Fichier "src/components/cardEditor/drawers/TemplatesDrawer.tsx" $src_components_cardEditor_drawers_TemplatesDrawer_tsx

$src_components_aiDesigner_AiDesigner_tsx = @'
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Rocket, Check } from "lucide-react";
import AssistantChat from "@/components/aiDesigner/AssistantChat";
import CardStage from "@/components/aiDesigner/CardStage";
import ImportCardModal from "@/components/cardEditor/importFlow/ImportCardModal";
import { useAutosaveCard } from "@/lib/useAutosaveCard";
import { useUIStore } from "@/store/uiStore";

const STEPS = ["Décrire mon activité", "Création IA", "Personnalisation", "Aperçu & Publication"];

export default function AiDesigner() {
  useAutosaveCard();
  const setWalletPreviewOpen = useUIStore((s) => s.setWalletPreviewOpen);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const [step, setStep] = useState(1);

  return (
    <div className="flex h-full flex-col px-6 py-5">
      {/* barre supérieure */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Ma carte</h1>
          <div className="hidden items-center gap-1.5 lg:flex">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const active = n === step;
              const done = n < step;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: active || done ? "var(--accent-1)" : "var(--panel-soft)",
                      color: active || done ? "#fff" : "var(--text-faint)",
                    }}
                  >
                    {done ? <Check size={11} /> : n}
                  </span>
                  <span className="text-[11px]" style={{ color: active ? "var(--text)" : "var(--text-faint)" }}>{label}</span>
                  {i < STEPS.length - 1 && <span className="mx-1 h-px w-6" style={{ background: "var(--border)" }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWalletPreviewOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--accent-1)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
          >
            <Eye size={15} /> Aperçu Wallet
          </button>
          <button
            onClick={() => { setStep(4); setPublishModalOpen(true); }}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          >
            <Rocket size={15} /> Enregistrer & Publier
          </button>
        </div>
      </div>

      {/* corps : conversation | scène carte */}
      <div className="flex min-h-0 flex-1 gap-5">
        <AssistantChat onStep={setStep} />
        <CardStage />
      </div>

      <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-faint)" }}>
        Assistant propulsé par IA · FidiCard ·{" "}
        <Link href="/carte/editeur" className="underline hover:text-[var(--accent-1)]">éditeur avancé</Link>
      </p>

      <ImportCardModal />
    </div>
  );
}
'@
Ecrire-Fichier "src/components/aiDesigner/AiDesigner.tsx" $src_components_aiDesigner_AiDesigner_tsx

$src_components_aiDesigner_AssistantChat_tsx = @'
"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Mic, Paperclip, Wand2, RefreshCw } from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useUIStore } from "@/store/uiStore";
import { inferTierType } from "@/lib/loyalty";
import {
  detectSector,
  detectMode,
  proposalsFor,
  TONES,
  type Tone,
} from "@/lib/aiDesigner/conversation";
import type { TemplateEntry } from "@/data/templateCatalog";

type Chip = { label: string; kind: "sector" | "tone"; value: string };
interface Msg {
  id: string;
  role: "assistant" | "user";
  text?: string;
  chips?: Chip[];
  proposals?: TemplateEntry[];
}

let mid = 0;
const nextId = () => `m${++mid}`;

// libellé court à écrire DANS le tampon du dernier palier
function shortReward(reward: string): string {
  const m = reward.match(/-?\d+\s*[€%]/);
  if (m) return m[0].replace(/\s/g, "");
  if (/offert|gratuit|free/i.test(reward)) return "Offert";
  return reward.split(/\s+/)[0].slice(0, 8);
}

const SECTOR_CHIPS = [
  "Café", "Boulangerie", "Restaurant", "Salon de coiffure",
  "Institut de beauté", "Bar", "Fleuriste", "Garage",
];

export default function AssistantChat({ onStep }: { onStep: (n: number) => void }) {
  const applyTemplate = useCardStore((s) => s.applyTemplate);
  const setConfig = useLoyaltyStore((s) => s.setConfig);
  const pushToast = useUIStore((s) => s.pushToast);
  const setImportCardOpen = useUIStore((s) => s.setImportCardOpen);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nextId(),
      role: "assistant",
      text:
        "Bonjour ! Je suis votre assistant FidiCard. Décrivez-moi votre activité, et je créerai pour vous une carte de fidélité professionnelle et unique.",
    },
  ]);
  const [phase, setPhase] = useState<"activity" | "tone" | "proposals" | "done">("activity");
  const [sector, setSector] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [mode, setMode] = useState<"stamps" | "points">("stamps");
  const [input, setInput] = useState("");
  const shown = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const add = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { id: nextId(), ...m }]);

  function askTone(sec: string) {
    add({
      role: "assistant",
      text: `Parfait ! Une activité « ${sec} », j'adore. Je vais créer une carte adaptée. Quelle ambiance souhaitez-vous transmettre ?`,
      chips: TONES.map((t) => ({ label: t.label, kind: "tone", value: t.id })),
    });
    setPhase("tone");
    onStep(1);
  }

  function handleActivity(text: string) {
    const sec = detectSector(text);
    const m = detectMode(text);
    if (m) setMode(m);
    if (sec) {
      setSector(sec);
      askTone(sec);
    } else {
      add({
        role: "assistant",
        text: "Dites-m'en un peu plus — quel est votre métier ? Vous pouvez aussi choisir ci-dessous.",
        chips: SECTOR_CHIPS.map((s) => ({ label: s, kind: "sector", value: s })),
      });
    }
  }

  function generate(sec: string, toneId: string, intro: string) {
    const proposals = proposalsFor(sec, toneId, shown.current);
    proposals.forEach((p) => shown.current.add(p.id));
    add({ role: "assistant", text: intro, proposals });
    setPhase("proposals");
    onStep(2);
  }

  function chooseTone(t: Tone) {
    if (!sector) return;
    add({ role: "user", text: t.label });
    setTone(t.id);
    generate(sector, t.id, "Voici 3 propositions générées pour votre activité 👇 Cliquez-en une pour l'appliquer.");
  }

  function regenerate() {
    if (!sector || !tone) return;
    generate(sector, tone, "Voici d'autres versions 👇");
  }

  function modifyWithAi() {
    add({
      role: "assistant",
      text: "Bien sûr. Sur quelle ambiance voulez-vous partir ?",
      chips: TONES.map((t) => ({ label: t.label, kind: "tone", value: t.id })),
    });
    setPhase("tone");
  }

  function applyProposal(entry: TemplateEntry) {
    applyTemplate(entry.build());
    const L = entry.loyalty;
    if (L) {
      setConfig({
        mode: L.mode === "points" ? "points" : "stamps",
        totalStamps: L.total,
        paliers: [
          {
            position: L.total,
            label: shortReward(L.reward),
            description: L.reward,
            type: inferTierType(L.reward),
          },
        ],
      });
    }
    add({ role: "user", text: `J'aime « ${entry.name} »` });
    add({
      role: "assistant",
      text:
        `Votre carte « ${entry.name} » est prête ✨ Les tampons, la récompense et le QR code sont gérés automatiquement. ` +
        "Ajustez la à droite, ou dites-moi quoi changer (couleur, nombre de tampons, récompense).",
    });
    setPhase("done");
    onStep(3);
    pushToast(`Carte « ${entry.name} » appliquée.`);
  }

  function submit(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    add({ role: "user", text });
    if (phase === "activity") handleActivity(text);
    else if (phase === "tone") {
      const t = TONES.find((x) => text.toLowerCase().includes(x.label.split(" ")[0].toLowerCase()));
      if (t) chooseTone(t);
      else add({ role: "assistant", text: "Choisissez une ambiance parmi les propositions au-dessus 🙂" });
    } else if (phase === "proposals") {
      add({ role: "assistant", text: "Cliquez sur l'une des trois cartes proposées pour l'appliquer." });
    } else {
      // done : petites intentions d'édition reconnues
      handleEdit(text);
    }
  }

  function handleEdit(text: string) {
    const t = text.toLowerCase();
    const num = t.match(/\b(\d{1,2})\b/);
    if (/tampon|case/.test(t) && num) {
      const n = Math.max(1, Math.min(24, Number(num[1])));
      useLoyaltyStore.getState().setTotalStamps(n);
      add({ role: "assistant", text: `C'est fait : ${n} tampons. La grille s'est reconstruite automatiquement.` });
      return;
    }
    add({
      role: "assistant",
      text: "Pour un réglage précis, utilisez les onglets Tampons / Récompenses à droite, ou ouvrez l'éditeur avancé via « Personnalisation ».",
    });
  }

  function onChip(c: Chip) {
    if (c.kind === "sector") {
      setSector(c.value);
      add({ role: "user", text: c.value });
      askTone(c.value);
    } else {
      const t = TONES.find((x) => x.id === c.value);
      if (t) chooseTone(t);
    }
  }

  function startVoice() {
    type SR = { new (): { lang: string; onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void; start: () => void } };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      pushToast("La saisie vocale n'est pas disponible sur ce navigateur.");
      return;
    }
    const rec = new Rec();
    rec.lang = "fr-FR";
    rec.onresult = (e) => submit(e.results[0][0].transcript);
    rec.start();
    pushToast("Parlez…");
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
        >
          <Sparkles size={20} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            Assistant FidiCard
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent-1)" }}>IA</span>
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Votre expert fidélité</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-dim)" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: "#4CAF7D" }} /> connecté
        </span>
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%]">
              <div
                className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))", color: "#fff" }
                    : { background: "var(--panel-soft)", color: "var(--text)" }
                }
              >
                {m.text}
              </div>

              {m.chips && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.chips.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => onChip(c)}
                      className="cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {m.proposals && (
                <>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {m.proposals.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyProposal(p)}
                        className="group overflow-hidden rounded-xl border transition-transform hover:-translate-y-0.5 hover:border-[var(--accent-1)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <MiniCard doc={p.build()} width={130} preview />
                        <span className="block truncate px-1.5 py-1 text-left text-[10px]" style={{ background: "var(--panel-soft)", color: "var(--text-dim)" }}>
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={regenerate}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      <RefreshCw size={12} /> Générer d&apos;autres versions
                    </button>
                    <button
                      onClick={modifyWithAi}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
                    >
                      <Wand2 size={12} /> Modifier avec l&apos;IA
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* suggestions rapides */}
      <div className="flex flex-wrap gap-1.5 border-t px-5 pt-3" style={{ borderColor: "var(--border)" }}>
        {[
          { label: "Importer une carte", run: () => setImportCardOpen(true) },
          { label: "Café à tampons", run: () => submit("Je tiens un café, je veux une carte à tampons") },
          { label: "Salon premium", run: () => submit("Salon de coiffure haut de gamme") },
        ].map((s) => (
          <button
            key={s.label}
            onClick={s.run}
            className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
            style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* saisie */}
      <div className="flex items-center gap-2 px-5 py-4">
        <button onClick={() => setImportCardOpen(true)} className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]" title="Joindre / importer">
          <Paperclip size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Décrivez votre entreprise…"
          className="flex-1 rounded-xl border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-1)]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
        />
        <button onClick={startVoice} className="cursor-pointer text-[var(--text-faint)] hover:text-[var(--accent-1)]" title="Parler">
          <Mic size={18} />
        </button>
        <button
          onClick={() => submit()}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
          title="Envoyer"
        >
          {phase === "activity" ? <Wand2 size={17} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
'@
Ecrire-Fichier "src/components/aiDesigner/AssistantChat.tsx" $src_components_aiDesigner_AssistantChat_tsx

$src_components_aiDesigner_CardStage_tsx = @'
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock, Stamp, Gift, QrCode, Building2, Box, Apple, Smartphone,
  Wifi, BatteryFull, Signal, Trophy, ImageIcon, Type, Palette, Sparkles,
} from "lucide-react";
import MiniCard from "@/components/cardEditor/MiniCard";
import { useCardStore, type DrawerId } from "@/store/cardStore";
import { useLoyaltyStore } from "@/store/loyaltyStore";
import { useUIStore } from "@/store/uiStore";
import { PROGRAM_PRESETS } from "@/lib/loyalty";

type Tab = "carte" | "tampons" | "recompenses" | "parametres";
type View = "3d" | "apple" | "google";

const STAMP_COUNTS = [5, 6, 8, 10, 12, 15];

export default function CardStage() {
  const card = useCardStore((s) => s.card);
  const setCardName = useCardStore((s) => s.setCardName);
  const config = useLoyaltyStore((s) => s.config);
  const setTotalStamps = useLoyaltyStore((s) => s.setTotalStamps);
  const applyPreset = useLoyaltyStore((s) => s.applyPreset);
  const setActiveDrawer = useCardStore((s) => s.setActiveDrawer);
  const setPublishModalOpen = useUIStore((s) => s.setPublishModalOpen);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("carte");
  const [view, setView] = useState<View>("3d");

  // raccourcis « Mode édition » : ouvrent l'éditeur avancé sur le bon tiroir
  function openEditor(drawer: DrawerId) {
    setActiveDrawer(drawer);
    router.push("/carte/editeur");
  }
  const QUICK_TOOLS: { id: DrawerId; label: string; icon: typeof ImageIcon }[] = [
    { id: "upload", label: "Logo", icon: ImageIcon },
    { id: "images", label: "Image", icon: ImageIcon },
    { id: "texte", label: "Texte", icon: Type },
    { id: "tampons", label: "Tampons", icon: Stamp },
    { id: "couleurs", label: "Couleurs", icon: Palette },
  ];

  const nameLayer = card.layers.find((l) => l.type === "text" && l.name === "Nom du commerce");
  const business = nameLayer && nameLayer.type === "text" ? nameLayer.content : undefined;
  const lastTier = config.paliers.length ? config.paliers[config.paliers.length - 1] : null;

  return (
    <div
      className="flex w-[420px] shrink-0 flex-col overflow-hidden rounded-3xl border"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {/* tabs */}
      <div className="flex items-center gap-1 border-b px-3 pt-3" style={{ borderColor: "var(--border)" }}>
        {([
          ["carte", "Ma carte"],
          ["tampons", "Tampons"],
          ["recompenses", "Récompenses"],
          ["parametres", "Paramètres"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="relative cursor-pointer px-3 py-2 text-xs font-medium transition-colors"
            style={{ color: tab === id ? "var(--accent-1)" : "var(--text-dim)" }}
          >
            {label}
            {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent-1)" }} />}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* Mode édition + outils rapides */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/carte/editeur")}
            className="flex cursor-pointer items-center gap-2 text-xs font-medium"
            style={{ color: "var(--text-dim)" }}
            title="Ouvrir l'éditeur avancé"
          >
            <Sparkles size={13} className="text-[var(--accent-1)]" /> Mode édition
          </button>
          <div className="flex gap-1">
            {QUICK_TOOLS.map((t) => (
              <button
                key={t.label}
                onClick={() => openEditor(t.id)}
                title={t.label}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
              >
                <t.icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* --- aperçu carte : commun à tous les onglets --- */}
        <div
          className="relative mb-4 flex items-center justify-center overflow-hidden rounded-2xl py-6"
          style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(240,101,62,0.12), transparent 70%), var(--bg-elevated)" }}
        >
          {view === "3d" && (
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.5))" }}
            >
              <MiniCard doc={card} width={320} />
            </motion.div>
          )}
          {view === "apple" && (
            <div className="rounded-[2rem] border-4 p-2" style={{ borderColor: "#222", background: "#000", width: 300 }}>
              <div className="mb-2 flex items-center justify-between px-2 text-[10px] text-white/80">
                <span>9:41</span>
                <span className="flex items-center gap-1"><Signal size={10} /><Wifi size={10} /><BatteryFull size={12} /></span>
              </div>
              <MiniCard doc={card} width={272} />
            </div>
          )}
          {view === "google" && (
            <div className="rounded-[1.5rem] border-4 p-2.5" style={{ borderColor: "#222", background: "#1a1a1a", width: 300 }}>
              <p className="mb-2 px-1 text-[11px] font-medium text-white/70">Google Wallet</p>
              <MiniCard doc={card} width={268} />
            </div>
          )}
        </div>

        {/* bascule d'aperçu */}
        <div className="mb-4 flex gap-1.5">
          {([
            ["3d", "3D", Box],
            ["apple", "Apple Wallet", Apple],
            ["google", "Google Wallet", Smartphone],
          ] as [View, string, typeof Box][]).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-medium transition-colors"
              style={{
                borderColor: view === id ? "var(--accent-1)" : "var(--border)",
                background: view === id ? "var(--accent-glow)" : "transparent",
                color: view === id ? "var(--accent-1)" : "var(--text-dim)",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* --- contenu par onglet --- */}
        {tab === "carte" && (
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Éléments fonctionnels <span style={{ color: "var(--text-faint)" }}>(verrouillés)</span></p>
            <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
              Gérés automatiquement pour garantir le bon fonctionnement de votre carte.
            </p>
            <LockedRow icon={Stamp} label="Zone des tampons" value={config.mode === "points" ? "Points" : `${config.totalStamps} tampons`} />
            <LockedRow icon={Gift} label="Récompense" value={lastTier?.description ?? "À définir"} />
            <LockedRow icon={QrCode} label="QR Code" value="Position automatique" />
            <LockedRow icon={Building2} label="Informations de base" value={business ?? "Entreprise"} />
          </div>
        )}

        {tab === "tampons" && (
          <div>
            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>Nombre de tampons</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STAMP_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalStamps(n)}
                  className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: config.totalStamps === n ? "var(--accent-1)" : "var(--border)",
                    background: config.totalStamps === n ? "var(--accent-glow)" : "transparent",
                    color: config.totalStamps === n ? "var(--accent-1)" : "var(--text-dim)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              La grille se reconstruit automatiquement. Pour choisir l'icône du tampon,
              ouvrez l'éditeur avancé.
            </p>
            <EditorLink />
          </div>
        )}

        {tab === "recompenses" && (
          <div>
            <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>Programme de fidélité</p>
            <div className="mb-3 space-y-1.5">
              {config.paliers.length === 0 && (
                <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>Aucune récompense définie.</p>
              )}
              {config.paliers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
                  <Trophy size={13} className="text-[var(--accent-1)]" />
                  <span style={{ color: "var(--text)" }}>
                    Au {config.mode === "points" ? `${p.position} pts` : `${p.position}ᵉ tampon`}
                  </span>
                  <span className="ml-auto font-medium" style={{ color: "var(--text-dim)" }}>{p.description}</span>
                </div>
              ))}
            </div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Programmes prêts à l'emploi</p>
            <div className="flex flex-wrap gap-1.5">
              {PROGRAM_PRESETS.slice(0, 5).map((preset) => (
                <button
                  key={preset.nom}
                  onClick={() => applyPreset(preset)}
                  className="cursor-pointer rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                >
                  {preset.nom}
                </button>
              ))}
            </div>
            <EditorLink />
          </div>
        )}

        {tab === "parametres" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Nom de la carte</label>
              <input
                value={card.name}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent-1)]"
                style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
              />
            </div>
            <button
              onClick={() => setPublishModalOpen(true)}
              className="w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))" }}
            >
              Vérifier & publier
            </button>
            <EditorLink />
          </div>
        )}
      </div>
    </div>
  );
}

function LockedRow({ icon: Icon, label, value }: { icon: typeof Stamp; label: string; value: string }) {
  return (
    <div
      className="mb-2 flex items-center gap-3 rounded-xl border px-3.5 py-3"
      style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}
      title="Cet élément est géré automatiquement par FidiCard pour garantir le bon fonctionnement de votre carte."
    >
      <Icon size={16} className="text-[var(--accent-1)]" />
      <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
      <span className="ml-auto truncate text-xs" style={{ color: "var(--text-dim)", maxWidth: 150 }}>{value}</span>
      <Lock size={13} style={{ color: "var(--text-faint)" }} />
    </div>
  );
}

function EditorLink() {
  return (
    <Link
      href="/carte/editeur"
      className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[11px] font-medium transition-colors hover:border-[var(--accent-1)] hover:text-[var(--accent-1)]"
      style={{ borderColor: "var(--border-strong)", color: "var(--text-dim)" }}
    >
      Personnalisation avancée (éditeur)
    </Link>
  );
}
'@
Ecrire-Fichier "src/components/aiDesigner/CardStage.tsx" $src_components_aiDesigner_CardStage_tsx

$src_app_carte_page_tsx = @'
import AiDesigner from "@/components/aiDesigner/AiDesigner";

export default function CartePage() {
  return <AiDesigner />;
}
'@
Ecrire-Fichier "src/app/carte/page.tsx" $src_app_carte_page_tsx

$src_app_carte_editeur_page_tsx = @'
import CardEditor from "@/components/cardEditor/CardEditor";

export default function CarteEditeurPage() {
  return <CardEditor />;
}
'@
Ecrire-Fichier "src/app/carte/editeur/page.tsx" $src_app_carte_editeur_page_tsx

Write-Host ""
Write-Host "Termine. 24 fichier(s) en place." -ForegroundColor Green
Write-Host "Etapes suivantes :" -ForegroundColor Cyan
Write-Host "   npm install     (si besoin)"
Write-Host "   npm run build"
Write-Host "   npm run dev     puis ouvre /carte"
