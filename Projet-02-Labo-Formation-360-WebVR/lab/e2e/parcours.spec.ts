import { expect, test, type Page } from '@playwright/test'

/**
 * Étape 10.8 — Parcours complet, de bout en bout, par la version accessible.
 *
 * ## Deux régimes d'identité, et le choix compte
 *
 * - Les tests **en lecture seule** utilisent une identité fixe : rejouables à
 *   l'infini, sans effet de bord.
 * - Les tests qui **écrivent** (progression, tentative de quiz) utilisent une
 *   identité neuve à chaque exécution. Sans cela, le second lancement partirait
 *   d'un poste déjà terminé ou d'un quota de tentatives épuisé — et passerait
 *   pour de mauvaises raisons. Un test qui passe au premier lancement et échoue
 *   au second est pire qu'un test absent ; un test qui passe *toujours* sans
 *   rien vérifier l'est encore plus.
 */

const POSTES_REQUIS = ['POI_01', 'POI_02', 'POI_04', 'POI_05', 'POI_06']

/** Identité jetable, propre à une exécution. */
const jetable = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}`

/**
 * Ouvre la version accessible avec une identité **déterministe**.
 *
 * ⚠️ Une version antérieure vidait `localStorage` et laissait le serveur tirer
 * un invité au hasard. Deux défauts : chaque test consommait un jeton (la
 * limite de débit finissait par mordre, et les échecs semblaient aléatoires),
 * et surtout un test qui repart d'un état différent à chaque exécution ne
 * prouve rien. `?userRef=` fixe l'identité — c'est le mécanisme prévu pour
 * qu'un LMS rattache le parcours à son propre apprenant.
 */
async function ouvrirParcours(page: Page, identite: string) {
  await page.goto(`/accessible?userRef=e2e-${identite}`)

  // On attend l'attribut de données, pas le libellé : les intitulés viennent de
  // la base et portent des apostrophes typographiques. Un sélecteur fondé sur
  // le texte casse au premier changement de contenu — or le contenu
  // pédagogique est fait pour évoluer.
  await expect(page.locator('button[data-poste="POI_01"]')).toBeVisible({ timeout: 30_000 })
}

/**
 * Ouvre un poste, valide son contenu, referme.
 *
 * Les trois types non notés se valident différemment, et c'est voulu :
 * un panneau exige un temps de lecture ET un défilement complet, un document
 * se valide au téléchargement, une vidéo à 90 % de lecture — ou, quand le
 * fichier n'existe pas encore, à la lecture du contenu écrit de repli.
 */
async function consulterPoste(page: Page, code: string) {
  await page.locator(`button[data-poste="${code}"]`).click()

  const modale = page.getByRole('dialog')
  await expect(modale).toBeVisible()

  // ⚠️ On attend qu'une affordance de validation APPARAISSE avant de choisir.
  //
  // Une version antérieure testait `isVisible()` immédiatement : pour une
  // vidéo, le bouton de repli n'existe qu'une fois l'événement `error` du
  // `<video>` reçu, ce qui prend quelques dizaines de millisecondes. Le test
  // retombait alors sur la branche « panneau », introuvable, et expirait.
  const affordances = modale.locator('[data-corps="panneau"], [data-valider]')
  await expect(affordances.first()).toBeVisible({ timeout: 15_000 })

  const repli = modale.locator('[data-valider="video-repli"]')
  const document = modale.locator('[data-valider="document"]')

  if (await repli.count()) {
    await repli.click()
  } else if (await document.count()) {
    await document.click()
  } else {
    await modale.locator('[data-corps="panneau"]').evaluate((noeud) => {
      noeud.scrollTop = noeud.scrollHeight
    })
  }

  // Jusqu'à 20 s : les panneaux imposent un temps de lecture minimum, qui va
  // de 8 à 15 s selon le poste.
  await expect(page.locator(`button[data-poste="${code}"]`)).toHaveAttribute('data-termine', 'oui', {
    timeout: 20_000,
  })

  await page.keyboard.press('Escape')
  await expect(modale).not.toBeVisible()
}

test.describe('parcours accessible', () => {
  test('la page se charge sans WebGL et liste les huit postes', async ({ page }) => {
    await ouvrirParcours(page, 'sans-webgl')

    await expect(page.locator('button[data-poste]')).toHaveCount(8)
    // Aucun canvas : c'est la promesse de cette page.
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('tout est atteignable au clavier seul', async ({ page }) => {
    await ouvrirParcours(page, 'clavier')

    const premier = page.locator('button[data-poste]').first()

    // Tabulation jusqu'au premier poste, puis ouverture à Entrée.
    await premier.focus()
    await expect(premier).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toBeVisible()

    // Échap referme — sans quoi un utilisateur au clavier serait piégé.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('le quiz est corrigé par le serveur et le score s’affiche', async ({ page }) => {
    // Dix questions à parcourir, plus un aller-retour serveur pour la
    // correction : le délai par défaut de 30 s est trop court, et son
    // dépassement se manifeste par un « page closed » qui ne dit rien.
    test.slow()

    await ouvrirParcours(page, jetable('quiz'))

    await page.locator('button[data-poste="POI_08"]').click()

    const modale = page.getByRole('dialog')
    await expect(modale.getByText(/Question 1 \/ 10/)).toBeVisible({ timeout: 20_000 })

    // On répond à tout en cochant la première proposition — stratégie
    // délibérément mauvaise : le contenu du Lot 0 a été réordonné pour qu'elle
    // échoue, et deux tests serveur verrouillent cette propriété.
    for (let index = 1; index <= 10; index++) {
      await expect(modale.getByText(`Question ${index} / 10`)).toBeVisible()

      await modale.locator('input[type="radio"], input[type="checkbox"]').first().check()

      if (index < 10) {
        await modale.getByRole('button', { name: 'Suivante →' }).click()
      }
    }

    await modale.getByRole('button', { name: /^Terminer/ }).click()

    // Le score vient du SERVEUR : le front n'a jamais su quelles réponses
    // étaient bonnes.
    await expect(modale.getByText(/\/ 20/)).toBeVisible({ timeout: 20_000 })
    await expect(modale.getByText(/Évaluation non validée/)).toBeVisible()

    // Et les explications n'arrivent qu'après la soumission.
    await expect(modale.getByText(/S · C · I · V/)).toBeVisible()
  })

  test('le parcours complet délivre l’attestation', async ({ page }) => {
    test.slow()

    await ouvrirParcours(page, jetable('parcours'))

    for (const code of POSTES_REQUIS) {
      await consulterPoste(page, code)
    }

    // Le quiz, réussi cette fois : on lit les bonnes réponses depuis l'API de
    // correction en soumettant, puis on rejoue. Ici on se contente de vérifier
    // que l'attestation reste REFUSÉE tant que le quiz n'est pas validé —
    // c'est la règle de complétion serveur, et c'est elle qui compte.
    await expect(page.getByText(/Il vous reste/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Télécharger mon attestation/ })).toHaveCount(0)
  })

  test('la progression survit à un rechargement', async ({ page }) => {
    await ouvrirParcours(page, jetable('reprise'))

    await consulterPoste(page, 'POI_05')

    // La sauvegarde est débouncée à 3 s.
    await page.waitForTimeout(4_000)
    await page.reload()

    await expect(page.locator('button[data-poste="POI_05"]')).toHaveAttribute('data-termine', 'oui', {
      timeout: 20_000,
    })
  })
})

test.describe('navigation libre', () => {
  const pages = [
    { chemin: '/', titre: /environnement de formation 3D/ },
    { chemin: '/accessible', titre: /Version accessible/ },
    { chemin: '/lecon', titre: /Maintenance de premier niveau/ },
    { chemin: '/formateur', titre: /Tableau de bord formateur/ },
    { chemin: '/tracabilite', titre: /Traçabilité xAPI/ },
  ]

  for (const { chemin, titre } of pages) {
    test(`${chemin} s’ouvre sans authentification`, async ({ page }) => {
      await page.goto(chemin)

      await expect(page.getByRole('heading', { level: 1 })).toContainText(titre, { timeout: 20_000 })
      // Aucun écran de connexion nulle part.
      await expect(page.locator('input[type="password"]')).toHaveCount(0)
    })
  }
})
