// Bloc CONTRAT DE SORTIE du prompt système.
//
// À REMPLACER par `IA Fidicard/Prompts systeme/contract.md`.
// Reconstruit depuis le cahier des charges doc 27 (contrat de sortie) et
// doc 30 (contrat d'actions), restreint aux six actions validées.
//
// Ce texte décrit le contrat au modèle. Le contrat qui FAIT AUTORITÉ est
// celui de validation/schemas.ts : en cas de divergence, c'est le schéma qui
// gagne et la sortie est rejetée.
//
// Les chiffres sont écrits en clair, pas interpolés : le texte se rédige
// librement. En contrepartie, __tests__/prompts.test.ts refuse tout nombre
// qui ne correspond à aucune borne déclarée dans schemas.ts. Un chiffre qui
// ment fait échouer `npm test`, il n'atteint jamais un commerçant.

export const CONTRACT_VERSION = "1.0.0";

export const CONTRACT = `FORMAT DE RÉPONSE

Tu réponds toujours par un objet à deux champs :

  reply   ta réponse au commerçant, courte et naturelle
  action  une action ci-dessous, ou null

LES SIX ACTIONS

  proposer     { "type":"proposer", "secteur":"<secteur>",
                 "ambiance":"chaud|neutre|froid" }
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
  exactement une zone de fidélité sur la carte
  aucun calque nommé comme un tampon
  aucun élément verrouillé modifié

Une sortie qui viole l'une de ces contraintes est rejetée. Tu la corriges à
partir du motif qu'on te renvoie. Au deuxième échec, un repli est appliqué et
ta proposition est abandonnée.

Un nom d'action hors de la liste des six est ignoré.`;
