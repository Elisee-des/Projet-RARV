import { beforeEach, describe, expect, it } from 'vitest'
import { etatDuPoste, useInteraction } from './interaction'

/**
 * Étape 10.7 — Machine à états d'activité et logique de progression.
 *
 * Le plan demande de tester « la logique de progression, le calcul de
 * complétion, la machine à états d'activité ». Le **calcul de complétion**, lui,
 * n'est pas ici : il vit côté serveur (`LabCompletion`) et y est déjà couvert.
 * Le dupliquer côté client serait doublement faux — il ne ferait pas autorité,
 * et il finirait par diverger.
 */
describe('etatDuPoste', () => {
  it('distingue les trois états', () => {
    expect(etatDuPoste('POI_01', [], [])).toBe('neuf')
    expect(etatDuPoste('POI_01', ['POI_01'], [])).toBe('visite')
    expect(etatDuPoste('POI_01', ['POI_01'], ['POI_01'])).toBe('termine')
  })

  it('donne la priorité à « terminé » sur « visité »', () => {
    // Un poste terminé sans avoir été marqué visité — cas du parcours 2D, où
    // l'on n'« approche » jamais un poste.
    expect(etatDuPoste('POI_04', [], ['POI_04'])).toBe('termine')
  })
})

describe('machine à états d’interaction', () => {
  beforeEach(() => {
    useInteraction.setState({ vise: null, source: null, ouvert: null, visites: [], termines: [] })
  })

  it('viser un poste le marque visité, une seule fois', () => {
    const { viser } = useInteraction.getState()

    viser('POI_02', 'visee')
    viser(null, null)
    viser('POI_02', 'proximite')

    expect(useInteraction.getState().visites).toEqual(['POI_02'])
  })

  it('viser le même poste deux fois de suite ne change rien', () => {
    const avant = useInteraction.getState()

    avant.viser('POI_03', 'visee')
    const apres = useInteraction.getState()
    apres.viser('POI_03', 'proximite')

    // La source n'est pas réévaluée : viser est un no-op quand le code est
    // inchangé, ce qui évite un rendu React à chaque image.
    expect(useInteraction.getState().source).toBe('visee')
  })

  it('visiter n’est pas terminer', () => {
    const { viser } = useInteraction.getState()

    viser('POI_05', 'visee')

    expect(useInteraction.getState().visites).toContain('POI_05')
    expect(useInteraction.getState().termines).not.toContain('POI_05')
  })

  it('marquer terminé est idempotent', () => {
    const { marquerTermine } = useInteraction.getState()

    marquerTermine('POI_08')
    marquerTermine('POI_08')

    expect(useInteraction.getState().termines).toEqual(['POI_08'])
  })

  it('ouvrir puis fermer une activité laisse la progression intacte', () => {
    const etat = useInteraction.getState()

    etat.marquerTermine('POI_01')
    etat.ouvrir('POI_02')

    expect(useInteraction.getState().ouvert).toBe('POI_02')

    useInteraction.getState().fermer()

    expect(useInteraction.getState().ouvert).toBeNull()
    expect(useInteraction.getState().termines).toEqual(['POI_01'])
  })

  it('amorcer remplace la progression, sans fusionner', () => {
    const etat = useInteraction.getState()

    etat.marquerTermine('POI_01')
    etat.amorcer(['POI_03'], ['POI_03'])

    // Fusionner ferait ressurgir une progression effacée par « Recommencer ».
    expect(useInteraction.getState().termines).toEqual(['POI_03'])
    expect(useInteraction.getState().visites).toEqual(['POI_03'])
  })
})
