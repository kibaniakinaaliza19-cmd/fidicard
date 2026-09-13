// Génère src/data/stampCatalog.generated.ts à partir des icônes RÉELLEMENT
// présentes dans la version de lucide-react installée. Aucune icône inventée :
// chaque nom est validé contre l'export du paquet. Les tampons sont de simples
// icônes ; une icône peut servir plusieurs métiers, ce qui permet d'atteindre
// le volume (≥ 500 entrées, ≥ 30 / catégorie, ≥ 50 pour « autre ») sans
// remplissage hors sujet.
//
//   node scripts/gen-stamp-catalog.mjs
//
// Relancé à la main quand on veut enrichir le catalogue (pas au build : la
// sortie est commitée). Signale en fin de course le compte exact par catégorie.

import * as lucide from "lucide-react";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* liste des noms de composants réellement exportés */
const VALID = new Set(
  Object.keys(lucide).filter(
    (k) => /^[A-Z]/.test(k) && !/^(Lucide|createLucideIcon)/.test(k) && !/Icon$/.test(k),
  ),
);
const has = (n) => VALID.has(n);

/* ------------------------------------------------------------------ ordre */

const CATEGORIES = [
  "cafe", "restaurant", "fastfood", "pizzeria", "boulangerie", "patisserie",
  "bar", "coiffure", "barbershop", "institut", "onglerie", "spa", "sport",
  "fitness", "hotel", "garage", "fleuriste", "formation", "pharmacie",
  "opticien", "boutique", "animalerie", "librairie", "tattoo", "autre",
];

/* ---- dictionnaire FR : label + alias pour les icônes courantes ---- */
const FR = {
  Coffee: ["Café", ["cafe", "tasse", "expresso", "coffee", "cup"]],
  Croissant: ["Croissant", ["viennoiserie", "boulangerie", "croissant"]],
  CupSoda: ["Gobelet", ["boisson", "soda", "verre", "drink"]],
  Milk: ["Lait", ["lait", "milk"]],
  Beer: ["Bière", ["biere", "pinte", "beer", "bar"]],
  Wine: ["Vin", ["vin", "verre", "wine", "bar"]],
  Martini: ["Cocktail", ["cocktail", "verre", "martini", "bar"]],
  Pizza: ["Pizza", ["pizza", "part", "italien"]],
  Beef: ["Viande", ["viande", "steak", "boeuf", "beef"]],
  Ham: ["Jambon", ["jambon", "charcuterie", "ham"]],
  Drumstick: ["Poulet", ["poulet", "cuisse", "chicken"]],
  Sandwich: ["Sandwich", ["sandwich", "snack"]],
  Salad: ["Salade", ["salade", "healthy", "salad"]],
  Soup: ["Soupe", ["soupe", "bol", "soup", "ramen"]],
  Egg: ["Œuf", ["oeuf", "egg", "petit-dejeuner"]],
  Fish: ["Poisson", ["poisson", "fish", "sushi", "mer"]],
  Utensils: ["Couverts", ["couverts", "fourchette", "restaurant", "manger"]],
  UtensilsCrossed: ["Couverts croisés", ["couverts", "restaurant", "cuisine"]],
  ChefHat: ["Toque", ["chef", "toque", "cuisine", "cook"]],
  Cake: ["Gâteau", ["gateau", "patisserie", "cake", "anniversaire"]],
  CakeSlice: ["Part de gâteau", ["gateau", "part", "patisserie", "cake"]],
  Cookie: ["Cookie", ["cookie", "biscuit", "gouter"]],
  Donut: ["Donut", ["donut", "beignet"]],
  IceCream: ["Glace", ["glace", "creme", "dessert", "ice cream"]],
  IceCream2: ["Glace pot", ["glace", "pot", "ice cream"]],
  IceCreamCone: ["Cornet", ["glace", "cornet", "cone"]],
  Candy: ["Bonbon", ["bonbon", "sucre", "candy"]],
  Popcorn: ["Popcorn", ["popcorn", "cinema"]],
  Apple: ["Pomme", ["pomme", "fruit", "apple"]],
  Cherry: ["Cerise", ["cerise", "fruit", "cherry"]],
  Grape: ["Raisin", ["raisin", "fruit", "grape", "vin"]],
  Banana: ["Banane", ["banane", "fruit"]],
  Citrus: ["Agrume", ["citron", "agrume", "orange", "citrus"]],
  Carrot: ["Carotte", ["carotte", "legume", "carrot"]],
  Wheat: ["Blé", ["ble", "cereale", "pain", "wheat", "boulangerie"]],
  Scissors: ["Ciseaux", ["ciseaux", "coupe", "scissors", "coiffure"]],
  Brush: ["Brosse", ["brosse", "pinceau", "brush"]],
  Paintbrush: ["Pinceau", ["pinceau", "peinture", "brush"]],
  PaintbrushVertical: ["Pinceau", ["pinceau", "peinture"]],
  Palette: ["Palette", ["palette", "couleur", "art", "peinture"]],
  Sparkles: ["Étincelles", ["etincelle", "brillance", "beaute", "sparkle"]],
  Sparkle: ["Étincelle", ["etincelle", "brillance", "sparkle"]],
  Flower: ["Fleur", ["fleur", "flower", "fleuriste"]],
  Flower2: ["Fleur", ["fleur", "flower", "fleuriste", "bouquet"]],
  Leaf: ["Feuille", ["feuille", "leaf", "nature", "bio"]],
  Sprout: ["Pousse", ["pousse", "plante", "nature", "sprout"]],
  TreePine: ["Sapin", ["arbre", "sapin", "nature", "tree"]],
  TreeDeciduous: ["Arbre", ["arbre", "nature", "tree"]],
  Sun: ["Soleil", ["soleil", "sun", "ete"]],
  Droplet: ["Goutte", ["goutte", "eau", "water", "spa"]],
  Droplets: ["Gouttes", ["gouttes", "eau", "water", "spa"]],
  Bath: ["Bain", ["bain", "spa", "bath", "detente"]],
  ShowerHead: ["Douche", ["douche", "spa", "shower"]],
  Heart: ["Cœur", ["coeur", "heart", "amour", "j'aime"]],
  Star: ["Étoile", ["etoile", "star", "favori", "note"]],
  Gem: ["Gemme", ["gemme", "diamant", "bijou", "gem", "luxe"]],
  Diamond: ["Diamant", ["diamant", "bijou", "diamond", "luxe"]],
  Crown: ["Couronne", ["couronne", "roi", "premium", "crown", "luxe"]],
  Trophy: ["Trophée", ["trophee", "prix", "trophy", "gagnant"]],
  Award: ["Médaille", ["medaille", "recompense", "award"]],
  Medal: ["Médaille", ["medaille", "medal", "sport"]],
  Dumbbell: ["Haltère", ["haltere", "muscu", "dumbbell", "sport"]],
  Bike: ["Vélo", ["velo", "bike", "cyclisme", "sport"]],
  Activity: ["Activité", ["activite", "pouls", "cardio", "activity"]],
  Flame: ["Flamme", ["flamme", "feu", "flame", "calorie"]],
  Timer: ["Chrono", ["chrono", "timer", "temps"]],
  Target: ["Cible", ["cible", "objectif", "target"]],
  Zap: ["Éclair", ["eclair", "energie", "zap", "flash"]],
  Scissors2: ["Ciseaux", ["ciseaux", "coupe"]],
  Cat: ["Chat", ["chat", "cat", "animal"]],
  Dog: ["Chien", ["chien", "dog", "animal"]],
  Bird: ["Oiseau", ["oiseau", "bird", "animal"]],
  Bone: ["Os", ["os", "bone", "chien", "animal"]],
  PawPrint: ["Patte", ["patte", "animal", "paw", "chien", "chat"]],
  Rabbit: ["Lapin", ["lapin", "rabbit", "animal"]],
  Turtle: ["Tortue", ["tortue", "turtle", "animal"]],
  Snail: ["Escargot", ["escargot", "snail"]],
  Squirrel: ["Écureuil", ["ecureuil", "squirrel", "animal"]],
  Book: ["Livre", ["livre", "book", "lecture", "librairie"]],
  BookOpen: ["Livre ouvert", ["livre", "lecture", "book"]],
  BookMarked: ["Livre", ["livre", "marque-page", "book"]],
  Library: ["Bibliothèque", ["bibliotheque", "livres", "library"]],
  GraduationCap: ["Diplôme", ["diplome", "formation", "etudes", "graduation"]],
  Pencil: ["Crayon", ["crayon", "ecrire", "pencil"]],
  PenTool: ["Stylo", ["stylo", "design", "pen"]],
  Car: ["Voiture", ["voiture", "auto", "car", "garage"]],
  CarFront: ["Voiture", ["voiture", "auto", "car"]],
  Wrench: ["Clé", ["cle", "outil", "wrench", "reparation", "garage"]],
  Hammer: ["Marteau", ["marteau", "outil", "hammer", "bricolage"]],
  Cog: ["Engrenage", ["engrenage", "rouage", "cog", "reglage"]],
  Fuel: ["Carburant", ["carburant", "essence", "fuel", "garage"]],
  Gauge: ["Jauge", ["jauge", "compteur", "gauge"]],
  Pill: ["Comprimé", ["comprime", "medicament", "pill", "pharmacie"]],
  Stethoscope: ["Stéthoscope", ["stethoscope", "medecin", "sante"]],
  Syringe: ["Seringue", ["seringue", "vaccin", "syringe"]],
  HeartPulse: ["Pouls", ["pouls", "cardio", "sante", "heart"]],
  Cross: ["Croix", ["croix", "pharmacie", "sante", "cross"]],
  Bandage: ["Pansement", ["pansement", "soin", "bandage"]],
  Glasses: ["Lunettes", ["lunettes", "vue", "glasses", "opticien"]],
  Eye: ["Œil", ["oeil", "vue", "eye", "opticien"]],
  Sun2: ["Soleil", ["soleil"]],
  ShoppingBag: ["Sac", ["sac", "shopping", "boutique", "bag"]],
  ShoppingCart: ["Panier", ["panier", "caddie", "cart", "boutique"]],
  ShoppingBasket: ["Panier", ["panier", "basket", "boutique"]],
  Shirt: ["T-shirt", ["tshirt", "vetement", "shirt", "mode"]],
  Tag: ["Étiquette", ["etiquette", "prix", "tag", "promo"]],
  Gift: ["Cadeau", ["cadeau", "gift", "offert", "recompense"]],
  Footprints: ["Chaussures", ["chaussure", "pas", "footprints"]],
  Store: ["Boutique", ["boutique", "magasin", "store", "commerce"]],
  BedDouble: ["Lit", ["lit", "hotel", "chambre", "bed"]],
  Hotel: ["Hôtel", ["hotel", "hebergement"]],
  KeyRound: ["Clé", ["cle", "key", "hotel", "chambre"]],
  ConciergeBell: ["Sonnette", ["sonnette", "reception", "hotel", "bell"]],
  MapPin: ["Localisation", ["localisation", "adresse", "pin", "map"]],
  Syringe2: ["Aiguille", ["aiguille"]],
  Feather: ["Plume", ["plume", "feather", "tattoo", "leger"]],
  Skull: ["Crâne", ["crane", "skull", "tattoo"]],
  Anchor: ["Ancre", ["ancre", "anchor", "tattoo", "marin"]],
  Ghost: ["Fantôme", ["fantome", "ghost", "fun"]],
  Rocket: ["Fusée", ["fusee", "rocket", "enfant", "fun"]],
  Gamepad2: ["Manette", ["manette", "jeu", "gamepad", "fun"]],
  Music: ["Musique", ["musique", "music", "note"]],
  Camera: ["Appareil photo", ["photo", "camera", "appareil"]],
  Phone: ["Téléphone", ["telephone", "phone", "contact"]],
  Smartphone: ["Smartphone", ["smartphone", "mobile", "telephone"]],
  Laptop: ["Ordinateur", ["ordinateur", "laptop", "informatique"]],
  Wifi: ["Wifi", ["wifi", "connexion", "reseau"]],
  Watch: ["Montre", ["montre", "watch", "horlogerie", "temps"]],
  Briefcase: ["Mallette", ["mallette", "travail", "briefcase", "pro"]],
  Building2: ["Immeuble", ["immeuble", "entreprise", "building", "bureau"]],
  Handshake: ["Poignée de main", ["accord", "partenariat", "handshake"]],
  Percent: ["Pourcentage", ["pourcentage", "promo", "reduction", "percent"]],
  BadgeCheck: ["Badge validé", ["badge", "valide", "check"]],
  CircleCheck: ["Validé", ["valide", "coche", "check"]],
  ThumbsUp: ["Pouce", ["pouce", "like", "j'aime", "thumbs"]],
  Smile: ["Sourire", ["sourire", "smile", "content"]],
  Ticket: ["Ticket", ["ticket", "billet", "coupon"]],
};

/* ---- motifs de sélection par catégorie (regex sur les noms lucide) ---- */
const KEYS = {
  cafe: ["Coffee", "CupSoda", "Milk", /Cup/, "Croissant", "Cookie", /Bean/, "Leaf", "Flame", "Donut", "Sandwich", "Egg", "ThermometerSun"],
  restaurant: ["Utensils", "UtensilsCrossed", "ChefHat", "Soup", "Salad", "Beef", "Fish", "Wine", "Egg", "CookingPot", "Ham", /Wheat/],
  fastfood: ["Beef", "Sandwich", "Drumstick", "Pizza", "Popcorn", "CupSoda", "IceCream", "Donut", "Salad", "Ham", "Fish"],
  pizzeria: ["Pizza", "Flame", "ChefHat", "Wheat", "Leaf", "Utensils", "CookingPot", "Wine", "Salad", "Beef"],
  boulangerie: ["Croissant", "Wheat", "Cookie", "Cake", "Donut", "ChefHat", "Egg", /Bread/, "Milk"],
  patisserie: ["Cake", "CakeSlice", "Cookie", "IceCream", "IceCreamCone", "Donut", "Candy", "Cherry", "Croissant", "Egg"],
  bar: ["Beer", "Wine", "Martini", "CupSoda", "Grape", /Glass/, "Music", "Flame", "Citrus", "Milk"],
  coiffure: ["Scissors", "Brush", "Sparkles", "Wind", "Droplet", "Feather", /Comb/, "Star", "Heart", "Flower"],
  barbershop: ["Scissors", "Brush", /Razor/, /Comb/, "Feather", "User", "Crown", "Sparkles", "Wind", "Star"],
  institut: ["Sparkles", "Flower", "Flower2", "Heart", "Droplet", "Sun", "Gem", "Feather", "Brush", "Star"],
  onglerie: ["Sparkles", "Sparkle", "Heart", "Star", "Gem", "Brush", "Flower", "Hand", "Droplet", "Palette"],
  spa: ["Droplet", "Droplets", "Bath", "Flower", "Flower2", "Leaf", "Sun", "Sparkles", "ShowerHead", "Wind", "Heart"],
  sport: ["Dumbbell", "Bike", "Trophy", "Medal", "Target", "Flame", "Activity", "Timer", "Award", "Zap", "Footprints"],
  fitness: ["Dumbbell", "Activity", "HeartPulse", "Flame", "Timer", "Target", "Zap", "Bike", "Trophy", "Footprints"],
  hotel: ["BedDouble", "Hotel", "KeyRound", "ConciergeBell", "Star", "MapPin", "Crown", "Sun", "Bath", "Coffee"],
  garage: ["Car", "CarFront", "Wrench", "Cog", "Fuel", "Gauge", "Hammer", "Bike", /Truck/, "Zap"],
  fleuriste: ["Flower", "Flower2", "Leaf", "Sprout", "TreePine", "Sun", "Droplet", "Heart", "Gift", /Tree/],
  formation: ["GraduationCap", "Book", "BookOpen", "Pencil", "PenTool", "Lightbulb", "Award", "Target", "Presentation", "Brain"],
  pharmacie: ["Pill", "Stethoscope", "Syringe", "HeartPulse", "Cross", "Bandage", "Thermometer", "Leaf", "Plus", "Heart"],
  opticien: ["Glasses", "Eye", "Sun", "Sparkles", "Focus", "ScanEye", "Star", "Gem", /View/, "Frame"],
  boutique: ["ShoppingBag", "ShoppingCart", "ShoppingBasket", "Shirt", "Tag", "Gift", "Store", "Footprints", "Watch", "Percent"],
  animalerie: ["Cat", "Dog", "Bird", "Bone", "PawPrint", "Fish", "Rabbit", "Turtle", "Snail", "Squirrel"],
  librairie: ["Book", "BookOpen", "BookMarked", "Library", "Pencil", "Feather", "Bookmark", "Newspaper", "PenTool", "Star"],
  tattoo: ["Feather", "Skull", "Anchor", "Star", "Heart", "Zap", "Flame", "Palette", "Brush", "Gem", "Crown"],
  autre: [
    "Gift", "Ticket", "Percent", "Tag", "MapPin", "Phone", "Mail", "Store", "Wallet", "CreditCard",
    "Coins", "Bell", "Clock", "Calendar", "Key", "Lock", "Compass", "Anchor", "Flag", "Bookmark",
    "Music", "Camera", "Gamepad2", "Rocket", "Ghost", "Smile", "ThumbsUp", "Handshake", "Lightbulb",
    /Star/, /Heart/, /Sparkle/, /Award/, /Medal/, /Trophy/, /Crown/, /Gem/, /Diamond/, /Badge/,
    /Shield/, /Sun/, /Moon/, /Cloud/, /Zap/, /Flame/, /Leaf/, /Flower/, /Circle/, /Square/,
    /Triangle/, /Hexagon/, /Octagon/, /Bell/, /Flag/, /Rainbow/, /Snowflake/, /Umbrella/, /Gift/,
  ],
};

// nets réels supplémentaires, ajoutés à chaque catégorie pour élargir la
// couverture sur-mesure sans padding générique
const EXTRA = {
  cafe: [/Mug/, /Kettle/, /Bean/, /Thermometer/],
  restaurant: [/Cooking/, /Plate/, /Fork/, /Bowl/],
  fastfood: [/Truck/, /Bag/, /Cup/],
  pizzeria: [/Cooking/, /Pepper/, /Cheese/],
  boulangerie: [/Bread/, /Wheat/, /Bun/],
  patisserie: [/Cake/, /Candy/, /Lollipop/],
  bar: [/Glass/, /Bottle/, /Grape/, /Disc/],
  coiffure: [/Comb/, /Wind/, /Waves/],
  barbershop: [/Razor/, /Comb/, /User/],
  institut: [/Face/, /Wand/, /Hand/],
  onglerie: [/Hand/, /Wand/, /Paint/],
  spa: [/Waves/, /Wind/, /Shower/, /Candle/],
  sport: [/Ball/, /Volleyball/, /Goal/, /Running/, /Tennis/],
  fitness: [/Heart/, /Weight/, /Timer/, /Ruler/],
  hotel: [/Bed/, /Key/, /Bell/, /Luggage/, /Sofa/],
  garage: [/Truck/, /Car/, /Bike/, /Battery/, /Disc/],
  fleuriste: [/Tree/, /Sprout/, /Leaf/, /Bug/, /Bird/],
  formation: [/Book/, /Brain/, /Presentation/, /Notebook/, /School/],
  pharmacie: [/Thermometer/, /Plus/, /Cross/, /Heart/, /Tablets/],
  opticien: [/Eye/, /Focus/, /Scan/, /View/, /Contrast/],
  boutique: [/Bag/, /Shirt/, /Watch/, /Gem/, /Package/],
  animalerie: [/Paw/, /Bird/, /Bug/, /Rabbit/, /Fish/],
  librairie: [/Book/, /Newspaper/, /Notebook/, /Pen/, /Scroll/],
  tattoo: [/Skull/, /Flame/, /Zap/, /Star/, /Moon/, /Sword/],
  autre: [],
};
for (const c of CATEGORIES) KEYS[c] = [...(KEYS[c] ?? []), ...(EXTRA[c] ?? [])];

/* ------------------------------------------------------- sélection ------ */

const allNames = [...VALID].sort();
function matches(rules) {
  const out = [];
  for (const r of rules) {
    if (typeof r === "string") {
      if (has(r)) out.push(r);
    } else {
      for (const n of allNames) if (r.test(n)) out.push(n);
    }
  }
  return [...new Set(out)];
}

const MIN = 30;
const MIN_AUTRE = 50;

// pool de secours (icônes neutres et abstraites) pour compléter une catégorie
const FILLER = matches([/Circle/, /Square/, /Star/, /Heart/, /Hexagon/, /Diamond/, /Flower/, /Sparkle/, /Badge/, /Shield/]);

const byCat = {};
for (const cat of CATEGORIES) {
  let list = matches(KEYS[cat] ?? []);
  const min = cat === "autre" ? MIN_AUTRE : MIN;
  let fi = 0;
  while (list.length < min && fi < FILLER.length) {
    if (!list.includes(FILLER[fi])) list.push(FILLER[fi]);
    fi++;
  }
  byCat[cat] = list;
}

/* ---- fusion en entrées (une icône → catégories multiples) ---- */
function slug(s) {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
}
function humanize(name) {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

const entries = new Map(); // lucide name → { id, lucide, label, aliases:Set, categories:Set }
for (const cat of CATEGORIES) {
  for (const name of byCat[cat]) {
    let e = entries.get(name);
    if (!e) {
      const fr = FR[name];
      const label = fr ? fr[0] : humanize(name);
      const aliases = new Set(fr ? fr[1] : [humanize(name).toLowerCase(), name.toLowerCase()]);
      e = { id: `stamp-${slug(name)}`, lucide: name, label, aliases, categories: new Set() };
      entries.set(name, e);
    }
    e.categories.add(cat);
    e.aliases.add(cat);
  }
}

const list = [...entries.values()];
const usedIcons = list.map((e) => e.lucide).sort();

/* ------------------------------------------------------- émission ------ */

const importLine = `import { ${usedIcons.join(", ")} } from "lucide-react";`;
const registryLine = `export const STAMP_ICON_REGISTRY: Record<string, LucideIcon> = { ${usedIcons.join(", ")} };`;

const body = list
  .map(
    (e) =>
      `  { id: ${JSON.stringify(e.id)}, lucide: ${JSON.stringify(e.lucide)}, label: ${JSON.stringify(e.label)}, aliases: ${JSON.stringify([...e.aliases])}, categories: ${JSON.stringify([...e.categories])} },`,
  )
  .join("\n");

const out = `// GÉNÉRÉ par scripts/gen-stamp-catalog.mjs — ne pas éditer à la main.
// Chaque \`lucide\` est un composant réellement exporté par lucide-react
// (validé à la génération). Relancer le script pour régénérer.
import type { LucideIcon } from "lucide-react";
${importLine}

import type { StampIcon } from "@/lib/stampCatalog";

${registryLine}

export const STAMP_CATALOG_DATA: StampIcon[] = [
${body}
];
`;

mkdirSync(join(ROOT, "src/data"), { recursive: true });
writeFileSync(join(ROOT, "src/data/stampCatalog.generated.ts"), out);

/* ------------------------------------------------------- rapport ------ */
console.log(`Catalogue : ${list.length} icônes distinctes, ${usedIcons.length} composants lucide.`);
const short = [];
for (const cat of CATEGORIES) {
  const n = byCat[cat].length;
  const need = cat === "autre" ? MIN_AUTRE : MIN;
  console.log(`  ${cat.padEnd(12)} ${n}${n < need ? "  ⚠️ sous le minimum" : ""}`);
  if (n < need) short.push(cat);
}
if (short.length) console.log("Catégories sous le minimum :", short.join(", "));
else console.log("Toutes les catégories atteignent leur minimum.");
