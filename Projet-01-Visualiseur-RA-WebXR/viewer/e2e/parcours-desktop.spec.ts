import { expect, test } from '@playwright/test'

/**
 * Étape 9.6 — Parcours desktop de bout en bout.
 *
 * ⚠️ La réalité augmentée n'est PAS couverte ici : aucun pilote de navigateur
 * ne simule un sol réel ni un capteur de profondeur. Le Lot 5 se valide à la
 * main, avec la checklist de `docs/matrice-de-tests.md`.
 *
 * Prérequis : `npx playwright install chromium`, puis les deux serveurs de
 * développement démarrés.
 */

const LECON = '/lecon/pompe-centrifuge-01'

test.describe('Leçon LMS', () => {
  test('la page de cours embarque le viewer', async ({ page }) => {
    await page.goto(LECON)

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pompe centrifuge')
    await expect(page.locator('rarv-viewer')).toBeVisible()
    await expect(page.locator('#etat-progression')).toBeVisible()
  })

  test('le secret du LMS ne fuite jamais dans la page', async ({ page }) => {
    await page.goto(LECON)

    const html = await page.content()

    expect(html).toContain('jeton=')
    expect(html).not.toContain('RARV_LMS_SECRET')
  })

  test('la liste des annotations est présente sans 3D', async ({ page }) => {
    await page.goto(LECON)

    // Étape 9.4 — le contenu reste lisible même si le viewer ne charge pas.
    await expect(page.getByText('Pour aller plus loin')).toBeVisible()
  })
})

test.describe('Viewer', () => {
  test('le modèle se charge et les pastilles apparaissent', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('canvas')).toBeVisible()

    // La progression n'apparaît qu'une fois le modèle mesuré.
    await expect(page.getByText(/annotations consultées/)).toBeVisible({ timeout: 30_000 })
  })

  test('la version texte affiche tout le contenu et journalise', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Version texte/ }).click()

    const fiches = page.locator('.parcours__element')
    await expect(fiches).toHaveCount(5)

    await fiches.first().getByRole('group').click()
    await expect(page.getByText(/1 \/ 5 consultées/)).toBeVisible()
  })

  test('la version texte est utilisable au clavier seul', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Version texte/ }).click()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    await expect(page.locator('.parcours__corps').first()).toBeVisible()
  })

  test('le panneau de profilage s\'ouvre avec ?debug', async ({ page }) => {
    await page.goto('/?debug')

    await expect(page.getByLabel('Mesures de performance')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Draw calls')).toBeVisible()
  })
})

test.describe('Back-office', () => {
  test('est fermé aux visiteurs', async ({ page }) => {
    await page.goto('/admin/objets')

    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('le tableau de bord est protégé', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
