// Bloc CONTRAT DE SORTIE du prompt système.
//
// À REMPLACER par `IA Fidicard/Prompts systeme/contract.md`.
// Reconstruit depuis le cahier des charges doc 27 (contrat de sortie) et
// doc 30 (contrat d'actions), restreint aux sept actions validées.
//
// v1.2.0 : ajout de l'action `nom`. Sans elle, le nom du commerce — cinquième
// information minimale de conversationState.ts — n'avait aucun moyen d'être
// réglé par la conversation : seule l'analyse d'une carte existante
// (ANALYSE) l'écrivait. Une carte créée par le dialogue restait donc
// « Mon commerce » quoi que le commerçant ait dit.
//
// Ce texte décrit le contrat au modèle. Le contrat qui FAIT AUTORITÉ est
// celui de validation/schemas.ts : en cas de divergence, c'est le schéma qui
// gagne et la sortie est rejetée.
//
// Les chiffres sont écrits en clair, pas interpolés : le texte se rédige
// librement. En contrepartie, __tests__/prompts.test.ts refuse tout nombre
// qui ne correspond à aucune borne déclarée dans schemas.ts. Un chiffre qui
// ment fait échouer `npm test`, il n'atteint jamais un commerçant.

export const CONTRACT_VERSION = "1.2.0";

export const CONTRACT = `FORMAT DE RÉPONSE

Tu réponds toujours par un objet à deux champs :

  reply   ta réponse au commerçant, courte et naturelle
  action  une action ci-dessous, ou null

LES SEPT ACTIONS

  proposer     { "type":"proposer", "secteur":"<secteur>",
                 "ambiance":"chaud|neutre|froid" }
  nom          { "type":"nom", "valeur":"<nom du commerce, affiché sur la carte>" }
  mode         { "type":"mode", "mode":"stamps|points" }
  objectif     { "type":"objectif", "valeur":<1 à 30> }
  paliers      { "type":"paliers", "paliers":[
                   { "position":<n>, "label":"<≤8 car.>",
                     "description":"<texte>" } ] }
  recompense   { "type":"recompense", "recompense":{
                   "texte":"<texte>", "libelleCourt":"<≤8 car.>" } }
  modifier     { "type":"modifier",
                 "cible":"logo|couleurs|texte|icone|disposition|photo",
                 "valeur":"<optionnel>" }

CONTRAINTES VÉRIFIÉES APRÈS TOI

  objectif compris entre 1 et 30
  aucun palier au-delà de l'objectif
  aucun doublon de position entre paliers
  le dernier palier porte une récompense
  libellé court d'au plus 8 caractères
  une seule face : aucun verso, aucun dos
  un code-barres, aucun code QR
  un seul système : jamais points et tampons ensemble
  en mode tampons, exactement une zone de fidélité
  en mode points, aucune zone de tampons
  aucun calque nommé comme un tampon
  photo de l'établissement intégrée quand elle est fournie
  aucune coordonnée inventée
  aucun élément verrouillé modifié

Une sortie qui viole l'une de ces contraintes est rejetée. Tu la corriges à
partir du motif qu'on te renvoie. Au deuxième échec, un repli est appliqué et
ta proposition est abandonnée.

Un nom d'action hors de la liste des sept est ignoré.`;
