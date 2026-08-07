/**
 * Point d'entrée du bundle autonome `rarv-lab.js` (étape 9.1).
 *
 * Il se contente d'enregistrer l'élément personnalisé au chargement : un LMS
 * inclut le script, pose la balise, et c'est tout. Aucune API à appeler, aucun
 * ordre d'initialisation à respecter.
 */
import { definirRarvLab } from './rarv-lab'

definirRarvLab()

export { RarvLab, definirRarvLab } from './rarv-lab'
export { SOURCE, ecouter, type MessageRarv } from './protocole'
