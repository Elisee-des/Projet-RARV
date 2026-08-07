import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useSearchParams } from 'react-router-dom'

import './index.css'
import Navbar, { HAUTEUR_NAVBAR } from './ui/Navbar'
import EcranChargement from './ui/EcranChargement'
import { definirRarvLab } from './lms/rarv-lab'

/**
 * Étape 10.3 — Découpage du bundle.
 *
 * ⚠️ **L'atelier 3D est le seul écran qui a besoin de Three.js.** Chargé avec
 * le reste, il imposait 1,4 Mo à quiconque ouvrait le tableau de bord, la page
 * de traçabilité ou la version accessible — cette dernière existant précisément
 * pour les machines qui ne peuvent pas faire de 3D. Lui livrer un moteur 3D
 * qu'elle n'utilisera jamais serait absurde.
 *
 * `lazy()` déporte chaque page dans son propre morceau. Le morceau lourd n'est
 * téléchargé que si l'on entre dans l'atelier.
 */
const Atelier = lazy(() => import('./App'))
const PagePresentation = lazy(() => import('./pages/PagePresentation'))
const PageLecon = lazy(() => import('./pages/PageLecon'))
const PageTableauBord = lazy(() => import('./pages/PageTableauBord'))
const PageTracabilite = lazy(() => import('./pages/PageTracabilite'))
const PageAccessible = lazy(() => import('./pages/PageAccessible'))

definirRarvLab()

/**
 * Coquille de l'application.
 *
 * ⚠️ **La barre disparaît quand la page est embarquée** (`?embed=1`). Une
 * iframe posée dans une leçon de LMS ne doit pas afficher sa propre navigation :
 * l'apprenant se retrouverait avec deux menus concurrents, et un lien
 * « Tableau de bord » à l'intérieur d'un cours n'a aucun sens.
 */
function Coquille() {
  const [parametres] = useSearchParams()
  const embarque = parametres.get('embed') === '1'

  return (
    <>
      {!embarque && <Navbar />}
      <main style={{ height: '100%', paddingTop: embarque ? 0 : HAUTEUR_NAVBAR }}>
        <Suspense fallback={<EcranChargement titre="Chargement" progression={30} etape="préparation de la page" />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  )
}

const racine = document.getElementById('root')
if (!racine) throw new Error('Élément #root introuvable dans index.html')

createRoot(racine).render(
  <StrictMode>
    {/*
      basename : sous-chemin de déploiement.

      Les routes sont déclarées en absolu (« /atelier », « /lecon »…). Sans
      basename, elles sont interprétées depuis la RACINE DU DOMAINE : servi
      sous /labo/, un clic sur « Leçon LMS » emmenait le navigateur vers
      rarv.kodemeet.com/lecon, hors de l'application. La page s'affichait
      encore — React restait chargé — mais un rechargement donnait un 404, et
      toutes les URL relatives partaient du mauvais dossier.

      import.meta.env.BASE_URL vaut « /labo/ » en production et « / » en
      développement : la même expression couvre les deux.
    */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Coquille />}>
          <Route path="/" element={<PagePresentation />} />
          {/* `App` est l'écran atelier : la formation elle-même. */}
          <Route path="/atelier" element={<Atelier />} />
          <Route path="/accessible" element={<PageAccessible />} />
          <Route path="/lecon" element={<PageLecon />} />
          <Route path="/formateur" element={<PageTableauBord />} />
          <Route path="/tracabilite" element={<PageTracabilite />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
