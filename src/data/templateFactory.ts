// Génération combinatoire de la bibliothèque de modèles.
//
// Principe : on n'écrit jamais 480 objets à la main. Chaque secteur définit
// 5 palettes crédibles pour son métier + noms/slogans/récompenses réalistes ;
// le produit 5 palettes × 4 dispositions donne 20 modèles réellement
// distincts par secteur (composition ET couleurs changent), en PLUS des
// modèles historiques qui ne sont jamais supprimés.
//
// Interdits volontaires sur toutes les cartes : puce bancaire, numéro à
// 16 chiffres, symbole sans-contact, « VALID UNTIL » — une carte de fidélité
// ne doit jamais ressembler à un moyen de paiement.

import type { TemplateSpec, TemplateLayout, LoyaltyKind, StyleFamily } from "@/data/templateCatalog";

/* ------------------------------------------------------- palette globale */

interface PaletteDef {
  id: string;
  label: string;
  bg: [string, string] | string;
  fg: string;
  sub: string;
  accent: string;
}

const P: Record<string, PaletteDef> = {
  noirOr:      { id: "noiror",    label: "Noir & Or",      bg: ["#141008", "#060402"], fg: "#e9c86a", sub: "#bfa14e", accent: "#d4af37" },
  graphite:    { id: "graphite",  label: "Graphite",       bg: ["#17171c", "#08080a"], fg: "#ececf0", sub: "#a0a0b0", accent: "#8a8f9c" },
  ivoire:      { id: "ivoire",    label: "Ivoire",         bg: "#f1eadd",              fg: "#2a2118", sub: "#6b5a44", accent: "#b0853f" },
  minimal:     { id: "minimal",   label: "Minimal",        bg: "#f7f7f5",              fg: "#191919", sub: "#6e6e6e", accent: "#e0492f" },
  nuitBleue:   { id: "nuit",      label: "Nuit Bleue",     bg: ["#0c1224", "#05070f"], fg: "#e8edfa", sub: "#93a2c9", accent: "#6478f0" },
  neonViolet:  { id: "neonviolet",label: "Néon Violet",    bg: ["#160724", "#08020f"], fg: "#f2e6ff", sub: "#b88fe0", accent: "#c026d3" },
  neonCyan:    { id: "neoncyan",  label: "Néon Cyan",      bg: ["#04191f", "#020a0d"], fg: "#dffaff", sub: "#7fc9d8", accent: "#22d3ee" },
  terracotta:  { id: "terra",     label: "Terracotta",     bg: ["#7a3520", "#33130a"], fg: "#ffeadf", sub: "#e8ac91", accent: "#f2a057" },
  foret:       { id: "foret",     label: "Forêt",          bg: ["#10251a", "#05110b"], fg: "#e8fbee", sub: "#94ceab", accent: "#2fbf71" },
  bordeaux:    { id: "bordeaux",  label: "Bordeaux",       bg: ["#33091a", "#14030a"], fg: "#fbdfe9", sub: "#d493ab", accent: "#d24a72" },
  oceanic:     { id: "ocean",     label: "Océan",          bg: ["#082031", "#030d15"], fg: "#ddf1ff", sub: "#8cc0dd", accent: "#2ea8e0" },
  pastelRose:  { id: "rose",      label: "Pastel Rose",    bg: "#f8e6ec",              fg: "#3d1f2c", sub: "#8a5b6d", accent: "#d4548a" },
  pastelMenthe:{ id: "menthe",    label: "Pastel Menthe",  bg: "#e2f2e8",              fg: "#1d3a2a", sub: "#527a63", accent: "#2c9e64" },
  vintage:     { id: "vintage",   label: "Vintage Crème",  bg: "#efe3cb",              fg: "#4a3a21", sub: "#7d6743", accent: "#a8552e" },
  chocolat:    { id: "choco",     label: "Chocolat",       bg: ["#3a2417", "#160b05"], fg: "#f5e6d8", sub: "#c9a98f", accent: "#c98a4a" },
  corail:      { id: "corail",    label: "Corail",         bg: ["#a83a2c", "#471410"], fg: "#fff0e6", sub: "#f4b59a", accent: "#f4b942" },
  soleil:      { id: "soleil",    label: "Soleil",         bg: "#f5c445",              fg: "#3a2a08", sub: "#6d5318", accent: "#c23a22" },
  lavande:     { id: "lavande",   label: "Lavande",        bg: "#e9e4f5",              fg: "#2e2544", sub: "#6d6191", accent: "#7c5cd6" },
};

/* --------------------------------------------------------- secteurs (24) */

interface SectorTheme {
  sector: string;
  icons: string[]; // icônes lucide qui tournent selon la palette
  businesses: string[];
  taglines: string[];
  rewardsT: string[]; // récompenses mode tampons
  rewardsP: string[]; // récompenses mode points
  palettes: PaletteDef[];
}

const THEMES: SectorTheme[] = [
  {
    sector: "Café",
    icons: ["Coffee", "Coffee", "Leaf", "Coffee", "Sun"],
    businesses: ["CAFÉ AURORE", "LE PERCOLATEUR", "BRÛLERIE MODERNE", "CAFÉ DU PARVIS", "TORRÉFACTION 21"],
    taglines: ["Torréfié sur place", "Votre pause mérite mieux", "Café de spécialité", "L'adresse des habitués", "Grains d'exception"],
    rewardsT: ["Le 10ᵉ café offert", "Une pâtisserie offerte à 8 visites", "Le 6ᵉ latte offert", "-50 % sur la 10ᵉ boisson", "Un filtre V60 offert à 12 visites"],
    rewardsP: ["Boisson offerte à 200 points", "-10 % dès 150 points", "Un paquet de grains à 400 pts", "Petit-déjeuner offert à 300 pts", "-5 € tous les 250 points"],
    palettes: [P.chocolat, P.ivoire, P.foret, P.noirOr, P.minimal],
  },
  {
    sector: "Restaurant",
    icons: ["UtensilsCrossed", "Wine", "UtensilsCrossed", "Flame", "UtensilsCrossed"],
    businesses: ["LA TABLE RONDE", "CHEZ AUGUSTIN", "L'ARDOISE", "MAISON BLANCHE", "LE COMPTOIR 9"],
    taglines: ["Cuisine de marché", "Depuis 1987", "Produits de saison", "Gastronomie décomplexée", "Fait maison, vraiment"],
    rewardsT: ["Un plat offert toutes les 8 visites", "Dessert offert à la 5ᵉ visite", "-5 € sur la 5ᵉ addition", "Apéritif offert à chaque 6ᵉ venue", "Menu offert à la 12ᵉ visite"],
    rewardsP: ["Dessert offert à 200 points", "Une bouteille à 500 points", "-10 % dès 300 points", "Menu dégustation à 800 pts", "-20 € tous les 600 points"],
    palettes: [P.noirOr, P.bordeaux, P.ivoire, P.graphite, P.terracotta],
  },
  {
    sector: "Fast-food",
    icons: ["Flame", "UtensilsCrossed", "Zap", "Flame", "Star"],
    businesses: ["SMASH BROTHERS", "CHICKEN SPOT", "URBAN TACOS", "LA FRITERIE", "BUN'S HOUSE"],
    taglines: ["Le goût, le vrai", "Street food maison", "Sauce secrète incluse", "Frites fraîches minute", "100 % fait sur place"],
    rewardsT: ["Un menu offert à 10 tampons", "Le 8ᵉ tacos offert", "-5 € à la 5ᵉ visite", "Boisson + frites offertes à 6", "Le 12ᵉ burger offert"],
    rewardsP: ["Menu offert à 250 points", "-10 % dès 150 points", "Dessert offert à 100 pts", "Menu XL à 400 points", "-2 € tous les 80 points"],
    palettes: [P.corail, P.soleil, P.graphite, P.neonCyan, P.minimal],
  },
  {
    sector: "Pizzeria",
    icons: ["Pizza", "Flame", "Pizza", "Pizza", "Leaf"],
    businesses: ["PIZZA FRATELLI", "LA NAPOLETANA", "FORNO ROSSO", "BELLA CIAO", "PIZZA DEL SOLE"],
    taglines: ["Cuite au feu de bois", "Comme à Naples", "Pâte 72 h de maturation", "La dolce vita", "Farine bio, amore vero"],
    rewardsT: ["Une pizza offerte toutes les 8", "La 10ᵉ pizza offerte", "-50 % sur la 5ᵉ pizza", "Tiramisu offert à 6 visites", "Calzone offerte à la 12ᵉ"],
    rewardsP: ["Pizza offerte à 250 points", "-10 % dès 200 points", "Antipasti offerts à 150 pts", "Menu famille à 500 points", "-5 € tous les 200 points"],
    palettes: [P.corail, P.foret, P.ivoire, P.bordeaux, P.graphite],
  },
  {
    sector: "Boulangerie",
    icons: ["Croissant", "Croissant", "Sun", "Croissant", "Star"],
    businesses: ["AU FOURNIL", "MAISON PAINDOR", "LA MICHE DORÉE", "L'ÉPI D'OR", "BOULANGERIE VICTOR"],
    taglines: ["Cuit ce matin", "Tradition française", "Levain naturel", "Artisan boulanger", "Depuis trois générations"],
    rewardsT: ["Une baguette offerte à 8 achats", "Viennoiserie offerte à 10", "Le 6ᵉ pain offert", "-2 € à la 5ᵉ visite", "Brioche offerte à 12 achats"],
    rewardsP: ["Pâtisserie offerte à 150 points", "-10 % dès 100 points", "Galette offerte à 300 pts", "Sandwich offert à 200 points", "-1 € tous les 50 points"],
    palettes: [P.ivoire, P.chocolat, P.soleil, P.vintage, P.minimal],
  },
  {
    sector: "Pâtisserie",
    icons: ["CakeSlice", "IceCream", "CakeSlice", "Sparkles", "Heart"],
    businesses: ["SUCRE & PLUME", "L'ÉCLAIR DE GÉNIE", "MAISON MACARON", "DOUCEURS D'ALICE", "LE FONDANT"],
    taglines: ["L'art du dessert", "Pâtisserie fine", "Macarons d'exception", "Gourmandise assumée", "Chocolat grand cru"],
    rewardsT: ["Une pâtisserie offerte à 6", "Le 8ᵉ éclair offert", "Boîte de macarons à 10 achats", "-3 € à la 5ᵉ visite", "Entremets offert à 12 achats"],
    rewardsP: ["Dessert offert à 150 points", "-10 % dès 120 points", "Number cake à 500 pts", "Boîte cadeau à 300 points", "-2 € tous les 100 points"],
    palettes: [P.pastelRose, P.bordeaux, P.ivoire, P.lavande, P.noirOr],
  },
  {
    sector: "Bar",
    icons: ["Beer", "Wine", "Beer", "Music", "Moon"],
    businesses: ["LE ZINC", "CRAFT SOCIETY", "LA DERNIÈRE TOURNÉE", "BAR À MOUSSE", "LE SPEAKEASY"],
    taglines: ["Bières de caractère", "Cocktails d'auteur", "Happy hour 18-20 h", "Brasserie indépendante", "Sur réservation seulement"],
    rewardsT: ["La 10ᵉ pinte offerte", "Un cocktail offert à 8", "Planche offerte à 6 visites", "-50 % sur le 5ᵉ verre", "Le 12ᵉ demi offert"],
    rewardsP: ["Cocktail offert à 300 points", "-10 % dès 200 points", "Bouteille à 600 pts", "Soirée privée à 1000 points", "-3 € tous les 150 points"],
    palettes: [P.noirOr, P.neonViolet, P.graphite, P.chocolat, P.neonCyan],
  },
  {
    sector: "Salon de coiffure",
    icons: ["Scissors", "Sparkles", "Scissors", "Flower2", "Scissors"],
    businesses: ["ATELIER CAPILLAIRE", "STUDIO NUANCE", "L'ÉCHOPPE", "HAIR LAB", "SALON ÉLISE"],
    taglines: ["Sublimez votre style", "Coloriste expert", "Coiffure sur mesure", "Balayage signature", "Votre tête entre de bonnes mains"],
    rewardsT: ["Une coupe offerte toutes les 6", "Soin offert à la 5ᵉ visite", "-20 % sur la 8ᵉ prestation", "Brushing offert à 6 venues", "La 10ᵉ coupe offerte"],
    rewardsP: ["-20 % à 400 points", "Soin profond offert à 250 pts", "Coloration à 600 points", "-10 € tous les 300 points", "Coupe offerte à 500 pts"],
    palettes: [P.bordeaux, P.neonViolet, P.minimal, P.pastelRose, P.graphite],
  },
  {
    sector: "Barbier",
    icons: ["Scissors", "Scissors", "Crown", "Scissors", "Flame"],
    businesses: ["THE BARBER CLUB", "MOUSTACHE & CO", "GENTLEMEN'S CUT", "BARBE NOIRE", "LE RASOIR"],
    taglines: ["L'art du rasage", "Style & précision", "Serviette chaude incluse", "Barbier depuis 2010", "Coupe, barbe, contraste"],
    rewardsT: ["Une coupe offerte à 8", "Barbe offerte toutes les 10", "-50 % sur la 6ᵉ prestation", "Rasage traditionnel offert à 5", "Le 12ᵉ passage offert"],
    rewardsP: ["Coupe offerte à 400 points", "-15 % dès 250 points", "Rituel complet à 600 pts", "Produit coiffant à 300 points", "-5 € tous les 200 points"],
    palettes: [P.graphite, P.noirOr, P.chocolat, P.vintage, P.nuitBleue],
  },
  {
    sector: "Institut de beauté",
    icons: ["Flower", "Sparkles", "Heart", "Flower2", "Gem"],
    businesses: ["INSTITUT OPALE", "BULLE DE SOI", "L'ÉCRIN BEAUTÉ", "SKIN STUDIO", "ÉCLAT NATUREL"],
    taglines: ["Révélez votre éclat", "Soins visage & corps", "Cosmétique clean", "Prenez rendez-vous avec vous", "Beauté holistique"],
    rewardsT: ["Soin visage offert à 8 tampons", "Épilation offerte à 6 venues", "-20 % sur le 5ᵉ soin", "Manucure offerte à 10", "Modelage offert à la 12ᵉ visite"],
    rewardsP: ["Soin signature à 500 pts", "-15 % dès 300 points", "Coffret offert à 600 points", "Diagnostic de peau à 200 pts", "-10 € tous les 250 points"],
    palettes: [P.pastelRose, P.lavande, P.ivoire, P.bordeaux, P.foret],
  },
  {
    sector: "Onglerie",
    icons: ["Sparkles", "Heart", "Gem", "Sparkles", "Star"],
    businesses: ["NAIL ATELIER", "POLISH & GO", "L'ONGLERIE CHIC", "GEL & VERNIS", "MANI PÉDI BAR"],
    taglines: ["Des ongles parfaits", "Nail art signature", "Semi-permanent expert", "Pose rapide, finition pro", "Vos mains, notre toile"],
    rewardsT: ["Une pose offerte toutes les 6", "Nail art offert à 5 venues", "-50 % sur la 8ᵉ pose", "Dépose offerte à 4 visites", "La 10ᵉ manucure offerte"],
    rewardsP: ["Pose gel à 300 points", "-10 % dès 150 points", "Kit soin à 400 pts", "Pédicure offerte à 350 points", "-5 € tous les 150 points"],
    palettes: [P.pastelRose, P.neonViolet, P.minimal, P.noirOr, P.corail],
  },
  {
    sector: "Spa",
    icons: ["Droplet", "Flower", "Moon", "Droplet", "Sparkles"],
    businesses: ["SPA SÉRÉNITA", "L'ONDE PURE", "BULLES & VAPEURS", "ZEN ALTITUDE", "LES THERMES"],
    taglines: ["Évasion & détente", "Rituels du monde", "Hammam · sauna · massage", "Parenthèse enchantée", "Bien-être absolu"],
    rewardsT: ["Un soin corps offert à 8", "Accès spa offert à 6 venues", "-30 % sur le 5ᵉ massage", "Gommage offert à 4 visites", "Rituel duo offert à 10"],
    rewardsP: ["Accès spa offert à 600 pts", "-20 % dès 400 points", "Massage 1 h à 800 points", "Kit détente à 300 pts", "-15 € tous les 350 points"],
    palettes: [P.oceanic, P.foret, P.lavande, P.ivoire, P.nuitBleue],
  },
  {
    sector: "Sport & Fitness",
    icons: ["Dumbbell", "Flame", "Zap", "Bike", "Trophy"],
    businesses: ["IRON TEMPLE", "PULSE CLUB", "LA SALLE", "CROSSFIT NOVA", "MOUV'STUDIO"],
    taglines: ["Dépasse tes limites", "Coaching inclus", "Open 6 h - 23 h", "Plus fort chaque jour", "Le sport qui te ressemble"],
    rewardsT: ["Un mois offert à 10 passages", "Séance coaching offerte à 8", "Shaker offert à 5 venues", "-50 % sur le 6ᵉ mois", "Invitation ami offerte à 4"],
    rewardsP: ["1 séance coaching à 500 pts", "-20 % dès 300 points", "T-shirt club à 200 points", "1 mois offert à 1000 pts", "-10 € tous les 400 points"],
    palettes: [P.graphite, P.neonCyan, P.corail, P.foret, P.nuitBleue],
  },
  {
    sector: "Hôtel",
    icons: ["BedDouble", "Crown", "Star", "BedDouble", "Sun"],
    businesses: ["HÔTEL MERIDIA", "LE GRAND QUAI", "VILLA AZUR", "AUBERGE DU LAC", "HÔTEL PARTICULIER"],
    taglines: ["Membre privilège", "Votre escale d'exception", "Vue mer garantie", "Charme & caractère", "L'adresse confidentielle"],
    rewardsT: ["Petit-déjeuner offert à 5 séjours", "Surclassement offert à 4", "Late checkout offert à 3 séjours", "Une nuit offerte à 10", "Spa offert au 6ᵉ séjour"],
    rewardsP: ["Une nuit offerte à 1000 pts", "Surclassement à 800 points", "Dîner pour deux à 600 pts", "-15 % dès 400 points", "Transfert offert à 300 pts"],
    palettes: [P.noirOr, P.nuitBleue, P.ivoire, P.oceanic, P.graphite],
  },
  {
    sector: "Garage",
    icons: ["Wrench", "Car", "Zap", "Wrench", "Car"],
    businesses: ["GARAGE CENTRAL", "AUTO MÉCA 24", "L'ATELIER DU PNEU", "TURBO SERVICES", "MÉCANIQUE MODERNE"],
    taglines: ["Votre garage de confiance", "Toutes marques", "Devis gratuit", "Rapide & fiable", "Entretien constructeur"],
    rewardsT: ["Contrôle offert toutes les 6 visites", "Vidange offerte à 5 passages", "-30 € sur la 8ᵉ facture", "Lavage offert à 3 venues", "Plaquettes -50 % à 10"],
    rewardsP: ["Vidange offerte à 500 points", "-10 % dès 300 points", "Révision à 800 pts", "Jeu de balais offert à 200 pts", "-20 € tous les 400 points"],
    palettes: [P.graphite, P.nuitBleue, P.corail, P.minimal, P.oceanic],
  },
  {
    sector: "Fleuriste",
    icons: ["Flower2", "Flower", "Leaf", "Sun", "Heart"],
    businesses: ["L'ATELIER FLORAL", "ROSE & PIVOINE", "GREEN HOUSE", "AU PÉTALE D'OR", "FLEURS D'ICI"],
    taglines: ["Fleurs de saison", "Bouquets sur mesure", "Production locale", "L'élégance florale", "Abonnement floral disponible"],
    rewardsT: ["Un bouquet offert à 8 achats", "Le 6ᵉ bouquet offert", "-20 % à la 5ᵉ visite", "Plante offerte à 10 achats", "Rose offerte à chaque 4ᵉ venue"],
    rewardsP: ["Bouquet offert à 300 points", "-15 % dès 200 points", "Composition à 500 pts", "Vase offert à 400 points", "-5 € tous les 150 points"],
    palettes: [P.foret, P.pastelRose, P.ivoire, P.pastelMenthe, P.bordeaux],
  },
  {
    sector: "Formations",
    icons: ["Star", "Trophy", "Zap", "BadgeCheck", "Sparkles"],
    businesses: ["ACADÉMIE PRO", "SKILL CAMPUS", "L'ÉCOLE 360", "FORMATION EXPRESS", "MASTERCLASS LAB"],
    taglines: ["Montez en compétences", "Certifiant & finançable", "Apprendre en faisant", "Formateurs experts", "Petits groupes, grands progrès"],
    rewardsT: ["Un module offert à 5 inscrits", "Coaching offert à la 4ᵉ session", "-20 % sur la 6ᵉ formation", "Support premium offert à 3", "Audit offert à 8 sessions"],
    rewardsP: ["Module offert à 500 points", "-15 % dès 300 points", "Certification à 800 pts", "Masterclass à 600 points", "-50 € tous les 400 points"],
    palettes: [P.nuitBleue, P.minimal, P.neonCyan, P.graphite, P.soleil],
  },
  {
    sector: "Opticien",
    icons: ["Sparkles", "Sun", "Gem", "BadgeCheck", "Star"],
    businesses: ["OPTIQUE LUMIÈRE", "VISION & STYLE", "L'ATELIER DU REGARD", "CLAIRVOYANT", "OPTIC MODERNE"],
    taglines: ["Voyez la différence", "Montures de créateurs", "Examens de vue sur place", "Verres haute précision", "Lunettes garanties 2 ans"],
    rewardsT: ["Nettoyage offert à chaque visite ×6", "Étui premium offert à 4 achats", "-50 % sur la 2ᵉ paire à 5", "Cordon offert à 3 venues", "Solaires -30 % à 8 achats"],
    rewardsP: ["2ᵉ paire offerte à 500 pts", "-15 % dès 300 points", "Solaires à 600 points", "Lentilles 1 mois à 200 pts", "-20 € tous les 350 points"],
    palettes: [P.minimal, P.nuitBleue, P.noirOr, P.graphite, P.oceanic],
  },
  {
    sector: "Boutique",
    icons: ["ShoppingBag", "Gift", "Tag", "Gem", "Star"],
    businesses: ["LE DRESSING", "CONCEPT 27", "MAISON TISSU", "LA PENDERIE", "SÉLECTION STORE"],
    taglines: ["Votre style, notre passion", "Objets d'exception", "Nouveautés chaque semaine", "Mode responsable", "Pièces uniques"],
    rewardsT: ["Un cadeau offert à 8 achats", "-20 % à la 5ᵉ visite", "Le 10ᵉ article offert", "Retouches offertes à 4 achats", "Tote bag offert à 3 venues"],
    rewardsP: ["-20 % à 500 points", "Article offert à 600 pts", "Vente privée dès 300 points", "Carte cadeau à 400 pts", "-10 € tous les 250 points"],
    palettes: [P.minimal, P.noirOr, P.pastelRose, P.graphite, P.terracotta],
  },
  {
    sector: "Animalerie",
    icons: ["PawPrint", "Fish", "Bird", "PawPrint", "Heart"],
    businesses: ["COMPAGNONS & CO", "LA PATTE DOUCE", "AQUA MONDO", "CROC'MARKET", "PLUME & POILS"],
    taglines: ["Tout pour vos animaux", "Nutrition premium", "L'univers aquatique", "Conseils d'éleveurs", "Le bonheur à quatre pattes"],
    rewardsT: ["Un sachet offert à 8 achats", "Jouet offert à 5 visites", "-10 % sur le 6ᵉ passage", "Friandises offertes à 4 achats", "Le 10ᵉ sac de croquettes offert"],
    rewardsP: ["-10 % à 300 points", "Panier offert à 500 pts", "Toilettage à 400 points", "Sac 12 kg offert à 800 pts", "-5 € tous les 200 points"],
    palettes: [P.terracotta, P.foret, P.oceanic, P.soleil, P.minimal],
  },
  {
    sector: "Librairie",
    icons: ["Star", "Moon", "Sun", "Sparkles", "Heart"],
    businesses: ["LA PLUME LIBRE", "PAGES & CIE", "LE MARQUE-PAGE", "L'ENCRE BLEUE", "LIVRES EN VILLE"],
    taglines: ["Voyagez en lisant", "Conseils de libraires", "Rencontres & dédicaces", "Neuf & occasion", "La lecture pour tous"],
    rewardsT: ["Un livre offert à 10 achats", "Marque-page collector à 5", "-5 € à la 6ᵉ visite", "Le 8ᵉ poche offert", "Tote bag offert à 4 achats"],
    rewardsP: ["Livre offert à 300 points", "-10 % dès 200 points", "Beau livre à 600 pts", "Carte cadeau à 400 points", "-5 € tous les 150 points"],
    palettes: [P.vintage, P.ivoire, P.foret, P.nuitBleue, P.bordeaux],
  },
  {
    sector: "Tattoo",
    icons: ["Palette", "Flame", "Star", "Gem", "Zap"],
    businesses: ["INK STUDIO", "BLACK NEEDLE", "L'ENCRIER", "SKIN STORIES", "ATELIER 13"],
    taglines: ["L'art sur la peau", "Flash & pièces custom", "Hygiène irréprochable", "Style old school", "Sur rendez-vous uniquement"],
    rewardsT: ["-15 % sur la 5ᵉ séance", "Retouche offerte à 3 séances", "Flash offert à 6 venues", "-50 € sur la 8ᵉ pièce", "Soin après-tatouage offert à 4"],
    rewardsP: ["-15 % à 600 points", "Flash offert à 400 pts", "Séance 1 h à 800 points", "Crème soin offerte à 200 pts", "-20 € tous les 300 points"],
    palettes: [P.graphite, P.bordeaux, P.neonViolet, P.vintage, P.noirOr],
  },
  {
    sector: "Pharmacie",
    icons: ["Pill", "Stethoscope", "Heart", "Leaf", "Droplet"],
    businesses: ["PHARMACIE CENTRALE", "PHARMA SANTÉ+", "LA CROIX VERTE", "PHARMACIE DU MARCHÉ", "PARA & BIEN-ÊTRE"],
    taglines: ["Votre santé, notre priorité", "Conseils & prévention", "Parapharmacie experte", "Ouvert 7 j/7", "Naturel & efficace"],
    rewardsT: ["Un cadeau offert à 10 visites", "-10 % parapharmacie à 6 achats", "Échantillons offerts à 4 venues", "Crème solaire -50 % à 8", "Trousse offerte à 5 achats"],
    rewardsP: ["-10 % parapharmacie à 400 pts", "Coffret offert à 500 points", "Diagnostic peau à 200 pts", "-5 € tous les 250 points", "Produit bébé offert à 300 pts"],
    palettes: [P.pastelMenthe, P.minimal, P.oceanic, P.foret, P.ivoire],
  },
  {
    sector: "Autres",
    icons: ["Gift", "Star", "Sparkles", "BadgeCheck", "Trophy"],
    businesses: ["MON COMMERCE", "L'ADRESSE", "LE COMPTOIR LOCAL", "SERVICE PLUS", "LA BOUTIQUE D'À CÔTÉ"],
    taglines: ["Fidélité récompensée", "Merci de votre confiance", "Votre commerce de proximité", "Le service en plus", "Chaque visite compte"],
    rewardsT: ["Une récompense à la 10ᵉ visite", "-10 % à la 5ᵉ venue", "Cadeau offert à 8 passages", "Le 6ᵉ achat récompensé", "Surprise à la 12ᵉ visite"],
    rewardsP: ["Récompense à 300 points", "-10 % dès 200 points", "Cadeau premium à 500 pts", "Bon d'achat à 400 points", "-5 € tous les 150 points"],
    palettes: [P.minimal, P.nuitBleue, P.terracotta, P.noirOr, P.pastelMenthe],
  },
];

/* ------------------------------------------------------------ génération */

const LAYOUTS: { id: TemplateLayout; label: string }[] = [
  { id: "classic", label: "Classique" },
  { id: "centered", label: "Centré" },
  { id: "split", label: "Latéral" },
  { id: "banner", label: "Bandeau" },
];

const GOALS_T = [10, 8, 6, 12, 5]; // objectifs mode tampons, par palette
const GOALS_P = [300, 200, 500, 400, 250]; // objectifs mode points, par palette

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
}

/* -------------------------------------------------------------------------- */
/*  8 familles stylistiques — chaque famille a ses palettes accordées à son    */
/*  traitement de fond (voir familyBackground dans templateCatalog), donc le   */
/*  texte reste lisible. Générées PAR-DESSUS les modèles existants.            */
/* -------------------------------------------------------------------------- */

interface FamilyPalette { bg: [string, string] | string; fg: string; sub: string; accent: string }

const FAMILY_DEFS: Record<
  StyleFamily,
  { label: string; layouts: TemplateLayout[]; palettes: FamilyPalette[] }
> = {
  minimal: {
    label: "Minimaliste",
    layouts: ["classic", "centered"],
    palettes: [
      { bg: "#f7f7f5", fg: "#1a1a1a", sub: "#6e6e6e", accent: "#e0492f" },
      { bg: "#ffffff", fg: "#141414", sub: "#7a7a7a", accent: "#111111" },
      { bg: "#111214", fg: "#f2f2f2", sub: "#9a9a9a", accent: "#e8503d" },
      { bg: "#f2efe9", fg: "#2a2620", sub: "#847c6e", accent: "#4a7c59" },
    ],
  },
  bancaire: {
    label: "Bancaire",
    layouts: ["banner", "classic"],
    palettes: [
      { bg: ["#1b1b1f", "#050506"], fg: "#e9c86a", sub: "#bfa14e", accent: "#d4af37" },
      { bg: ["#0c1120", "#04060c"], fg: "#dbe4ff", sub: "#93a0c4", accent: "#6478f0" },
      { bg: ["#232427", "#0d0e10"], fg: "#eef0f2", sub: "#a9adb4", accent: "#b8bcc4" },
      { bg: ["#1a0f22", "#08040d"], fg: "#efe3ff", sub: "#b79ada", accent: "#a855f7" },
    ],
  },
  photo: {
    label: "Photo",
    layouts: ["banner", "classic"],
    palettes: [
      { bg: ["#2a1a12", "#070403"], fg: "#fff2e6", sub: "#e3c3a8", accent: "#f2a057" },
      { bg: ["#0f2420", "#04100c"], fg: "#e8fbf2", sub: "#a7d8c6", accent: "#2fbf71" },
      { bg: ["#221019", "#0a040a"], fg: "#ffe6ee", sub: "#d8a5b8", accent: "#e8558a" },
      { bg: ["#0c1a2a", "#040a12"], fg: "#e3f0ff", sub: "#9fc0dd", accent: "#3aa0e0" },
    ],
  },
  premium: {
    label: "Premium sombre",
    layouts: ["classic", "centered"],
    palettes: [
      { bg: ["#12100a", "#040302"], fg: "#e9c86a", sub: "#c2a24e", accent: "#d4af37" },
      { bg: ["#141210", "#050403"], fg: "#e6ddce", sub: "#b09a7e", accent: "#c9862f" },
      { bg: ["#101012", "#050506"], fg: "#ececf0", sub: "#a8a8b4", accent: "#c0c4cc" },
      { bg: ["#0a0f14", "#030507"], fg: "#dfeaf0", sub: "#9ab0bd", accent: "#7fd3e0" },
    ],
  },
  colore: {
    label: "Coloré",
    layouts: ["centered", "classic"],
    palettes: [
      { bg: ["#ff5f6d", "#ffc371"], fg: "#3a0d12", sub: "#7a2b1f", accent: "#ffffff" },
      { bg: ["#c471f5", "#fa71cd"], fg: "#2c0a2e", sub: "#5e2360", accent: "#ffffff" },
      { bg: ["#43cea2", "#185a9d"], fg: "#04231d", sub: "#0d3f4a", accent: "#ffffff" },
      { bg: ["#f7971e", "#ffd200"], fg: "#3a2600", sub: "#6b4a00", accent: "#c23a22" },
    ],
  },
  vintage: {
    label: "Vintage",
    layouts: ["classic", "centered"],
    palettes: [
      { bg: "#efe3cb", fg: "#4a3a21", sub: "#7d6743", accent: "#a8552e" },
      { bg: "#e8d9c0", fg: "#3a2c1a", sub: "#6f5a3c", accent: "#8a5a34" },
      { bg: "#e3ddd0", fg: "#33322a", sub: "#6a6759", accent: "#5a6b4a" },
      { bg: "#f0dfd8", fg: "#442a28", sub: "#7d5751", accent: "#b0554a" },
    ],
  },
  motif: {
    label: "Motif",
    layouts: ["classic", "split"],
    palettes: [
      { bg: ["#3a2417", "#150a05"], fg: "#f5e6d8", sub: "#c9a98f", accent: "#e08a3d" },
      { bg: ["#12291b", "#06120b"], fg: "#eafff0", sub: "#9fd8b4", accent: "#34d17e" },
      { bg: ["#160a24", "#08020f"], fg: "#f2e6ff", sub: "#b88fe0", accent: "#c026d3" },
      { bg: ["#08202f", "#030c14"], fg: "#ddf1ff", sub: "#8cc0dd", accent: "#2ea8e0" },
    ],
  },
  gradient: {
    label: "Gradient",
    layouts: ["centered", "classic"],
    palettes: [
      { bg: ["#654ea3", "#eaafc8"], fg: "#ffffff", sub: "#f2e6f0", accent: "#ffffff" },
      { bg: ["#0f2027", "#2c5364"], fg: "#eafcff", sub: "#a8ccd6", accent: "#4fd1e0" },
      { bg: ["#232526", "#414345"], fg: "#f0f0f2", sub: "#b6b8bb", accent: "#e8503d" },
      { bg: ["#ee9ca7", "#ffdde1"], fg: "#4a1f28", sub: "#8a4f5a", accent: "#c2415f" },
    ],
  },
};

const FAMILY_ORDER = Object.keys(FAMILY_DEFS) as StyleFamily[];

export const familySpecs: TemplateSpec[] = THEMES.flatMap((theme, ti) =>
  FAMILY_ORDER.flatMap((family) => {
    const def = FAMILY_DEFS[family];
    return def.layouts.map((layout, li) => {
      const pal = def.palettes[(ti + li) % def.palettes.length];
      const bi = (ti + li) % theme.businesses.length;
      const loyalty: LoyaltyKind = (ti + li) % 3 === 2 ? "points" : "tampons";
      const goal = loyalty === "tampons" ? GOALS_T[(ti + li) % GOALS_T.length] : GOALS_P[(ti + li) % GOALS_P.length];
      const filled = Math.round(goal * (0.3 + 0.1 * ((ti + li) % 4)));
      return {
        id: `fam-${family}-${slug(theme.sector)}-${layout}-${li}`,
        name: `${def.label} · ${theme.businesses[bi].split(" ")[0]}`,
        business: theme.businesses[bi],
        tagline: theme.taglines[(ti + li) % theme.taglines.length],
        sector: theme.sector,
        loyalty,
        goal,
        filled,
        reward: loyalty === "tampons"
          ? theme.rewardsT[(ti + li) % theme.rewardsT.length]
          : theme.rewardsP[(ti + li) % theme.rewardsP.length],
        icon: theme.icons[bi % theme.icons.length],
        bg: pal.bg,
        fg: pal.fg,
        sub: pal.sub,
        accent: pal.accent,
        layout,
        family,
      } satisfies TemplateSpec;
    });
  }),
);

export const generatedSpecs: TemplateSpec[] = THEMES.flatMap((theme) =>
  theme.palettes.flatMap((palette, pi) =>
    LAYOUTS.map((layout, li) => {
      // alterner tampons/points pour couvrir les deux programmes
      const loyalty: LoyaltyKind = (pi + li) % 3 === 2 ? "points" : "tampons";
      const goal = loyalty === "tampons" ? GOALS_T[pi] : GOALS_P[pi];
      const filled = Math.round(goal * (0.3 + 0.1 * ((pi + li) % 4)));
      return {
        id: `gen-${slug(theme.sector)}-${palette.id}-${layout.id}`,
        name: `${palette.label} · ${layout.label}`,
        business: theme.businesses[pi],
        tagline: theme.taglines[(pi + li) % theme.taglines.length],
        sector: theme.sector,
        loyalty,
        goal,
        filled,
        reward:
          loyalty === "tampons"
            ? theme.rewardsT[(pi + li) % theme.rewardsT.length]
            : theme.rewardsP[(pi + li) % theme.rewardsP.length],
        icon: theme.icons[pi],
        bg: palette.bg,
        fg: palette.fg,
        sub: palette.sub,
        accent: palette.accent,
        layout: layout.id,
      } satisfies TemplateSpec;
    }),
  ),
);
