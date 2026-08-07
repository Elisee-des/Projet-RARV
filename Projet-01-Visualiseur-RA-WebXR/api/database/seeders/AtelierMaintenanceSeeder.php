<?php

namespace Database\Seeders;

use App\Models\Environment;
use App\Models\Quiz;
use Illuminate\Database\Seeder;

/**
 * Projet 02, étape 2.2 — Environnement de référence.
 *
 * Contenu intégralement issu de `docs/contenu.md` (étape 0.2) et de
 * `docs/scenario-pedagogique.md` (étape 0.1), rédigés AVANT le code.
 *
 * ⚠️ Les coordonnées des 8 postes sont volontairement absentes : la source de
 * vérité au runtime est l'Empty nommé `POI_xx` du `.glb` (étape 1.10). Les
 * renseigner ici obligerait à les corriger à la main à chaque itération de la
 * salle — c'est le piège n°1 du projet.
 */
class AtelierMaintenanceSeeder extends Seeder
{
    public function run(): void
    {
        $quiz = $this->creerQuiz();
        $environnement = $this->creerEnvironnement();

        $environnement->points()->delete();

        foreach ($this->points($quiz->id) as $donnees) {
            $environnement->points()->create($donnees);
        }
    }

    private function creerEnvironnement(): Environment
    {
        return Environment::updateOrCreate(
            ['slug' => 'atelier-maintenance-01'],
            [
                'title' => 'Intervention de maintenance de premier niveau sur une pompe centrifuge',
                'description' => "Un atelier technique de 10 × 8 m, parcouru à la première personne. "
                    ."L'apprenant s'approche de huit postes de travail et y déclenche des panneaux "
                    ."d'information, des vidéos, des fiches techniques et un quiz noté. Le parcours "
                    .'dure 15 à 20 minutes et se valide à 70 % au quiz final.',

                // Assets provisoires — remplacés par les sorties du Lot 1.
                // Le blocking généré par script tient lieu de scène en attendant.
                'scene_glb_path' => 'environnements/atelier-maintenance-01/atelier.glb',
                'collision_glb_path' => 'environnements/atelier-maintenance-01/collision.glb',
                'lightmap_paths' => null,

                // Valeur de repli : le chargeur privilégie l'Empty `SPAWN` du .glb.
                //
                // Convention de lacet, celle de Three.js : l'avant neutre d'un
                // objet est −Z, donc 0° regarde vers −Z. Le point d'apparition
                // est à z = 6,5 et regarde vers le fond de la salle, dos au
                // panneau d'accueil → lacet 0.
                'spawn_position' => [5.0, 1.65, 6.5],
                'spawn_rotation' => 0.0,

                'bounds' => ['largeur' => 10.0, 'hauteur' => 3.2, 'profondeur' => 8.0],

                // Relevés sur le blocking généré par
                // Projet-02/scripts/generer-salle-blocking.mjs.
                // À réactualiser au Lot 1, avec la vraie salle.
                'triangles' => 192,
                'file_size_kb' => 22,

                'status' => 'published',
            ]
        );
    }

    private function creerQuiz(): Quiz
    {
        $quiz = Quiz::updateOrCreate(
            ['title' => 'Évaluation — maintenance de premier niveau'],
            [
                'pass_score' => 70,      // 14 / 20
                'max_attempts' => 2,
                'shuffle_questions' => true,
                'time_limit_s' => 600,   // 10 minutes
            ]
        );

        $quiz->questions()->delete();

        foreach ($this->questions() as $donnees) {
            $choix = $donnees['choices'];
            unset($donnees['choices']);

            $question = $quiz->questions()->create($donnees);

            foreach ($choix as $index => [$libelle, $correct]) {
                $question->choices()->create([
                    'sort_order' => $index + 1,
                    'label' => $libelle,
                    'is_correct' => $correct,
                ]);
            }
        }

        return $quiz;
    }

    /**
     * Les 8 postes, dans l'ordre du parcours conseillé.
     *
     * @return list<array<string, mixed>>
     */
    private function points(int $quizId): array
    {
        return [
            [
                'sort_order' => 1,
                'code' => 'POI_01',
                'label' => "Panneau d'accueil",
                'icon' => 'info',
                'activity_type' => 'panel',
                'trigger_type' => 'proximity',
                'trigger_radius' => 2.0,
                'required' => true,
                'activity_payload' => [
                    'title' => 'Intervention de maintenance de premier niveau sur une pompe centrifuge',
                    'minDurationS' => 8,
                    'bodyHtml' => <<<'HTML'
                        <p>Bienvenue dans l'atelier de maintenance. Ce parcours dure
                        <strong>15 à 20 minutes</strong>. Vous allez vous déplacer librement et consulter
                        <strong>8 postes de travail</strong>. Chaque poste vous apprend quelque chose qui
                        sera évalué au poste final.</p>

                        <h4>À l'issue de ce parcours, vous saurez</h4>
                        <ol>
                          <li>Identifier les EPI obligatoires en atelier de maintenance</li>
                          <li>Énoncer les 5 étapes de la consignation électrique dans l'ordre</li>
                          <li>Nommer les 5 organes principaux d'une pompe centrifuge et leur fonction</li>
                          <li>Appliquer un couple de serrage conforme à la fiche technique</li>
                          <li>Reconnaître les 3 signatures vibratoires de défaut les plus courantes</li>
                          <li>Appliquer les règles de stockage et de rétention des lubrifiants</li>
                        </ol>

                        <p><strong>Pour valider la formation</strong>, consultez les
                        <strong>6 postes obligatoires</strong> et obtenez au moins <strong>70 %</strong>
                        au quiz du poste d'évaluation. Deux postes sont facultatifs — mais deux questions
                        du quiz portent dessus.</p>

                        <h4>Comment se déplacer</h4>
                        <ul>
                          <li><strong>Avancer</strong> — <kbd>Z</kbd> <kbd>Q</kbd> <kbd>S</kbd> <kbd>D</kbd>
                              ou les flèches · joystick tactile sur téléphone</li>
                          <li><strong>Regarder</strong> — souris · glisser un doigt</li>
                          <li><strong>Interagir</strong> — clic ou <kbd>E</kbd> · toucher le poste</li>
                          <li><strong>Quitter une activité</strong> — <kbd>Échap</kbd> ou le bouton ✕</li>
                        </ul>

                        <p class="cle">💡 Perdu ? Le bouton <strong>« Aller au poste suivant »</strong> vous
                        y emmène automatiquement. Vous pouvez aussi suivre tout le parcours sans 3D via le
                        lien <em>Version accessible</em>.</p>
                        HTML,
                ],
            ],
            [
                'sort_order' => 2,
                'code' => 'POI_02',
                'label' => 'Tableau électrique — consignation',
                'icon' => 'bolt',
                'activity_type' => 'video',
                'trigger_type' => 'click',
                'trigger_radius' => null,
                'required' => true,
                'activity_payload' => [
                    'title' => 'La consignation électrique — les 4 étapes',
                    // ⏳ Assets à produire (point B6 du suivi) : le script minuté
                    // est rédigé dans docs/contenu.md, §2.
                    'src' => 'environnements/atelier-maintenance-01/p02-consignation.mp4',
                    'poster' => 'environnements/atelier-maintenance-01/p02-consignation.webp',
                    'captions' => 'environnements/atelier-maintenance-01/p02-consignation.vtt',
                    'durationS' => 150,
                    'completionRatio' => 0.9,
                    'summaryHtml' => <<<'HTML'
                        <p>Toute intervention commence par mettre l'installation hors d'état de démarrer.
                        Quatre étapes, dans un ordre qui n'est pas négociable :</p>
                        <ol>
                          <li><strong>Séparation</strong> — ouvrir le sectionneur, coupure visible</li>
                          <li><strong>Condamnation</strong> — cadenas personnel + pancarte nominative</li>
                          <li><strong>Identification</strong> — vérifier que c'est bien le bon ouvrage</li>
                          <li><strong>Vérification d'absence de tension</strong> — au plus près du point de
                              travail, VAT testé <em>avant et après</em></li>
                        </ol>
                        <p class="cle">💡 <strong>S · C · I · V</strong> — Séparer, Condamner, Identifier,
                        Vérifier.</p>
                        HTML,
                ],
            ],
            [
                'sort_order' => 3,
                'code' => 'POI_03',
                'label' => 'Armoire à EPI',
                'icon' => 'shield',
                'activity_type' => 'panel',
                'trigger_type' => 'proximity',
                'trigger_radius' => 1.5,
                // Facultatif — mais deux questions du quiz portent dessus.
                // C'est ce qui rend l'écran « postes les moins visités » du
                // tableau de bord réellement démonstratif (étape 9.6).
                'required' => false,
                'activity_payload' => [
                    'title' => "Les 5 EPI de l'atelier de maintenance",
                    'minDurationS' => 10,
                    'bodyHtml' => <<<'HTML'
                        <p>Un EPI ne se choisit pas par habitude : il se choisit <strong>contre un risque
                        identifié</strong>. Chaque norme couvre une famille de risques et une seule.</p>

                        <table>
                          <thead>
                            <tr><th>EPI</th><th>Norme</th><th>Protège contre</th><th>Quand</th></tr>
                          </thead>
                          <tbody>
                            <tr><td>Chaussures de sécurité S3</td><td>EN ISO 20345</td>
                                <td>Écrasement (coque 200 J), perforation, glissade</td>
                                <td><strong>En permanence</strong></td></tr>
                            <tr><td>Lunettes de protection</td><td>EN 166</td>
                                <td>Projection de particules, d'huile, de liquide sous pression</td>
                                <td><strong>En permanence</strong></td></tr>
                            <tr><td>Gants de manutention</td><td>EN 388</td>
                                <td>Risque <strong>mécanique</strong> : abrasion, coupure, perforation</td>
                                <td>Manipulation de pièces</td></tr>
                            <tr><td>Protection auditive</td><td>EN 352</td><td>Bruit</td>
                                <td>À partir de <strong>80 dB(A)</strong></td></tr>
                            <tr><td>Gants chimiques</td><td>EN ISO 374</td>
                                <td>Produits chimiques, huiles, solvants</td>
                                <td>Lubrifiants et solvants</td></tr>
                          </tbody>
                        </table>

                        <h4>Lire le marquage EN 388</h4>
                        <p>Un gant marqué <strong>EN 388 — 4X42C</strong> annonce ses performances dans
                        l'ordre : abrasion (4), coupure coupe-circulaire (X = non applicable), déchirure (4),
                        perforation (2), coupure ISO 13997 (C).</p>

                        <p class="securite">⚠️ <strong>Le piège.</strong> EN 388 ne protège que du risque
                        mécanique. Un gant de manutention n'arrête ni une projection d'huile chaude
                        (→ EN 407), ni un solvant (→ EN ISO 374), ni le courant (→ EN 60903). Prendre le
                        mauvais gant, c'est croire être protégé alors qu'on ne l'est pas.</p>

                        <p class="cle">💡 Un carter, un protecteur d'accouplement ou un capot sont des
                        <strong>protections collectives</strong>. Elles passent <em>avant</em> l'EPI :
                        on supprime le risque à la source avant de protéger la personne.</p>
                        HTML,
                ],
            ],
            [
                'sort_order' => 4,
                'code' => 'POI_04',
                'label' => 'Pompe centrifuge',
                'icon' => 'cog',
                'activity_type' => 'panel',
                'trigger_type' => 'click',
                'trigger_radius' => null,
                'required' => true,
                'activity_payload' => [
                    'title' => 'Pompe centrifuge — les 5 organes et leurs points de contrôle',
                    'minDurationS' => 15,
                    // 🔗 Le modèle 3D posé sur le socle est celui du Projet 01.
                    // Le contenu est repris de docs/contenu-pedagogique.md du
                    // module viewer-ra : rien à réécrire.
                    'relatedObjectSlug' => 'pompe-centrifuge-01',
                    'bodyHtml' => <<<'HTML'
                        <p>Une pompe centrifuge transforme l'énergie mécanique d'un moteur en énergie
                        hydraulique. C'est la machine tournante la plus répandue en industrie — et donc
                        celle qui génère le plus d'interventions. La grande majorité des pannes ne vient
                        pas du corps de la pompe, mais de <strong>cinq organes</strong> bien identifiés.</p>

                        <table>
                          <thead><tr><th>Organe</th><th>Rôle</th><th>Défaillance emblématique</th></tr></thead>
                          <tbody>
                            <tr><td>① Corps de pompe (volute)</td>
                                <td>Convertit la vitesse du fluide en pression</td>
                                <td>Érosion, corrosion</td></tr>
                            <tr><td>② Roue à aubes</td>
                                <td><strong>Seule pièce qui apporte de l'énergie au fluide</strong></td>
                                <td><strong>Cavitation</strong></td></tr>
                            <tr><td>③ Garniture mécanique</td>
                                <td>Étanchéité au passage de l'arbre</td>
                                <td><strong>Marche à sec</strong></td></tr>
                            <tr><td>④ Paliers et roulements</td>
                                <td>Guident l'arbre, reprennent les efforts</td>
                                <td>Sur-graissage, fatigue</td></tr>
                            <tr><td>⑤ Accouplement</td>
                                <td>Transmet le couple en tolérant un léger défaut d'alignement</td>
                                <td><strong>Défaut d'alignement</strong></td></tr>
                          </tbody>
                        </table>

                        <h4>Les 3 points clés à retenir</h4>
                        <ol>
                          <li><strong>La volute ne pompe pas.</strong> Elle ralentit le fluide et convertit
                              sa vitesse en pression. Seule la roue à aubes lui apporte de l'énergie.</li>
                          <li><strong>La cavitation ne se répare pas sur la roue.</strong> Un bruit de
                              gravier signale que des bulles de vapeur implosent sur les aubes. Remplacer
                              la roue ne change rien : la nouvelle sera piquée à son tour. La cause est
                              <strong>toujours au circuit d'aspiration</strong>.</li>
                          <li><strong>Un défaut d'alignement se paie ailleurs.</strong> Il ne détruit pas
                              l'accouplement en premier : il tue les roulements et la garniture mécanique.
                              C'est la cause racine la plus fréquente, et la plus souvent traitée par son
                              symptôme.</li>
                        </ol>

                        <p class="securite">⚠️ Ne jamais faire tourner une pompe sans protecteur
                        d'accouplement. Toute intervention impose la consignation électrique complète —
                        voir le poste <strong>Tableau électrique</strong>.</p>
                        HTML,
                ],
            ],
            [
                'sort_order' => 5,
                'code' => 'POI_05',
                'label' => 'Établi et outillage',
                'icon' => 'wrench',
                'activity_type' => 'document',
                'trigger_type' => 'click',
                'trigger_radius' => null,
                'required' => true,
                'activity_payload' => [
                    'title' => 'Couples de serrage et méthode de serrage des brides',
                    'file' => 'environnements/atelier-maintenance-01/fiche-couples-serrage.pdf',
                    'mime' => 'application/pdf',
                    // Marqué consulté au téléchargement (étape 6.12).
                    'completeOn' => 'download',
                    'summaryHtml' => <<<'HTML'
                        <p>Fiche technique : tableau des couples par diamètre et classe de qualité
                        (M6 → M20, classes 8.8 / 10.9 / 12.9), méthode de serrage en croix en trois passes,
                        et règles d'étalonnage de la clé dynamométrique.</p>
                        <p class="securite">⚠️ <strong>L'erreur qui fait fuir un joint</strong> : serrer un
                        boulon au couple final dès la première passe. La bride se déforme, le joint est
                        écrasé localement et laisse passer le fluide de l'autre côté.</p>
                        <p class="cle">💡 Un filetage lubrifié réduit le couple d'environ <strong>20 %</strong>
                        à précontrainte égale. Appliquer un couple « sec » sur un filetage huilé, c'est
                        risquer la rupture de la vis.</p>
                        HTML,
                ],
            ],
            [
                'sort_order' => 6,
                'code' => 'POI_06',
                'label' => "Banc d'analyse vibratoire",
                'icon' => 'activity',
                'activity_type' => 'video',
                'trigger_type' => 'click',
                'trigger_radius' => null,
                'required' => true,
                'activity_payload' => [
                    'title' => "L'analyse vibratoire — lire un spectre",
                    'src' => 'environnements/atelier-maintenance-01/p06-vibratoire.mp4',
                    'poster' => 'environnements/atelier-maintenance-01/p06-vibratoire.webp',
                    'captions' => 'environnements/atelier-maintenance-01/p06-vibratoire.vtt',
                    'durationS' => 120,
                    'completionRatio' => 0.9,
                    'summaryHtml' => <<<'HTML'
                        <p>Une machine tournante prévient toujours avant de casser : sa signature vibratoire
                        se dégrade plusieurs semaines avant la panne.</p>
                        <table>
                          <thead><tr><th>Signature</th><th>Défaut</th><th>Correction</th></tr></thead>
                          <tbody>
                            <tr><td>Pic à <strong>1×</strong></td><td>Balourd</td><td>Équilibrage</td></tr>
                            <tr><td>Pic à <strong>2×</strong></td><td>Désalignement</td><td>Réalignement</td></tr>
                            <tr><td><strong>Hautes fréquences</strong></td><td>Roulement</td>
                                <td>Remplacement</td></tr>
                            <tr><td>Bruit large bande, pas de pic net</td><td>Cavitation</td>
                                <td>Agir sur l'<strong>aspiration</strong></td></tr>
                          </tbody>
                        </table>
                        HTML,
                ],
            ],
            [
                'sort_order' => 7,
                'code' => 'POI_07',
                'label' => 'Stockage des lubrifiants',
                'icon' => 'droplet',
                'activity_type' => 'document',
                'trigger_type' => 'proximity',
                'trigger_radius' => 1.8,
                // Second poste facultatif, placé à l'écart du parcours naturel.
                'required' => false,
                'activity_payload' => [
                    'title' => 'Stockage et manipulation des huiles en atelier',
                    'file' => 'environnements/atelier-maintenance-01/fiche-stockage-lubrifiants.pdf',
                    'mime' => 'application/pdf',
                    'completeOn' => 'download',
                    'summaryHtml' => <<<'HTML'
                        <p>Fiche de sécurité simplifiée : rétention, compatibilité des huiles, étiquetage,
                        élimination des huiles usagées et conduite à tenir en cas de déversement.</p>
                        <ul>
                          <li>Le bac de rétention doit contenir <strong>le plus grand</strong> des deux
                              volumes : 100 % du plus grand contenant, ou 50 % du volume total stocké</li>
                          <li>Le bac est <strong>maintenu vide</strong> — plein d'eau de pluie, il n'a plus
                              aucune capacité</li>
                          <li>Un <strong>absorbant</strong> doit être disponible à proximité immédiate</li>
                        </ul>
                        <p class="securite">⚠️ <strong>Ne jamais mélanger deux huiles</strong>, même de
                        viscosité identique. Leurs additifs peuvent être incompatibles et former des boues
                        qui bouchent filtres et canaux de graissage.</p>
                        HTML,
                ],
            ],
            [
                'sort_order' => 8,
                'code' => 'POI_08',
                'label' => "Poste d'évaluation",
                'icon' => 'clipboard-check',
                'activity_type' => 'quiz',
                'activity_id' => $quizId,
                'trigger_type' => 'click',
                'trigger_radius' => null,
                'required' => true,
                'activity_payload' => null,
            ],
        ];
    }

    /**
     * Les 10 questions notées — contenu de `docs/contenu.md`, §8.
     *
     * Barème : 2 points par question, 20 points au total, seuil à 70 % (14/20).
     * Chacun des 6 objectifs pédagogiques est évalué par au moins une question.
     *
     * ⚠️ **La position des bonnes réponses est délibérément dispersée.** Rédigées
     * dans l'ordre naturel, elles se retrouvaient presque toutes en première
     * position : cocher systématiquement la première proposition donnait 14/20,
     * soit exactement le seuil de réussite. Un test le vérifie désormais
     * (`test_cocher_systematiquement_la_premiere_proposition_echoue`).
     *
     * @return list<array<string, mixed>>
     */
    private function questions(): array
    {
        return [
            [
                'sort_order' => 1,
                'type' => 'multiple',
                'points' => 2,
                'objective_code' => 'O1',
                'source_point_code' => 'POI_03',
                'statement' => 'Vous intervenez en atelier sur une pompe consignée. '
                    .'Quels EPI sont obligatoires ?',
                'explanation' => "La protection auditive n'est obligatoire qu'à partir d'un seuil "
                    ."d'exposition : 80 dB(A) déclenche la mise à disposition, 85 dB(A) le port "
                    ."obligatoire. Sur une machine consignée, donc à l'arrêt, ce seuil n'est pas atteint. "
                    ."Les trois autres EPI sont exigés dès l'entrée en zone, machine à l'arrêt ou non.",
                'choices' => [
                    ['Chaussures de sécurité S3', true],
                    ['Protection auditive, en toutes circonstances', false],
                    ['Lunettes de protection', true],
                    ['Gants de manutention adaptés au risque mécanique', true],
                ],
            ],
            [
                'sort_order' => 2,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O1',
                'source_point_code' => 'POI_03',
                'statement' => 'Vos gants portent le marquage EN 388 — 4X42C. '
                    .'Contre quelle famille de risques cette norme vous protège-t-elle ?',
                'explanation' => 'EN 388 couvre exclusivement le risque mécanique. Le chimique relève de '
                    ."l'EN ISO 374, le thermique de l'EN 407, l'électrique de l'EN 60903. Un gant de "
                    ."manutention n'arrête ni une projection d'huile chaude ni un solvant — et c'est "
                    ."précisément parce qu'on le porte qu'on se croit protégé.",
                'choices' => [
                    ['Risque chimique : solvants, huiles, acides', false],
                    ['Risque thermique : chaleur de contact, projections de métal fondu', false],
                    ['Risque mécanique : abrasion, coupure, déchirure, perforation', true],
                    ['Risque électrique : contact avec des pièces sous tension', false],
                ],
            ],
            [
                // 🎯 Question volontairement difficile : les trois distracteurs
                // sont des permutations plausibles, pas des réponses absurdes.
                // C'est elle qui doit remonter en tête de l'écran « questions
                // les plus ratées » du tableau de bord (étape 9.6).
                'sort_order' => 3,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O2',
                'source_point_code' => 'POI_02',
                'statement' => "Dans quel ordre s'enchaînent les étapes d'une consignation électrique ?",
                'explanation' => "S · C · I · V. On sépare d'abord — l'installation cesse d'être "
                    ."alimentée. On condamne ensuite, pour que personne ne puisse la réalimenter. On "
                    ."identifie alors l'ouvrage sur lequel on va travailler. Et on termine par la VAT, "
                    ."seule preuve matérielle de l'absence de tension. Identifier avant de séparer est "
                    ."l'erreur la plus courante : elle paraît logique, mais elle laisse l'installation "
                    .'sous tension pendant toute la phase de repérage.',
                'choices' => [
                    ['Identification → Séparation → Condamnation → Vérification d\'absence de tension', false],
                    ['Séparation → Condamnation → Identification → Vérification d\'absence de tension', true],
                    ['Séparation → Identification → Condamnation → Vérification d\'absence de tension', false],
                    ['Condamnation → Séparation → Identification → Vérification d\'absence de tension', false],
                ],
            ],
            [
                'sort_order' => 4,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O2',
                'source_point_code' => 'POI_02',
                'statement' => "Vous venez de réaliser la VAT et l'appareil indique une absence de "
                    .'tension. Que faites-vous immédiatement après ?',
                'explanation' => 'Le vérificateur se teste avant ET après chaque usage. Un appareil tombé '
                    ."en panne entre les deux mesures aurait affiché « absence de tension » sur une "
                    ."installation encore alimentée — et rien ne l'aurait signalé. Poser le cadenas est "
                    .'déjà fait : la condamnation précède la VAT dans l\'ordre S·C·I·V.',
                'choices' => [
                    ['Poser le cadenas de condamnation', false],
                    ["Commencer l'intervention", false],
                    ["Signer l'attestation de consignation", false],
                    ['Retester le vérificateur sur une source connue sous tension', true],
                ],
            ],
            [
                'sort_order' => 5,
                'type' => 'truefalse',
                'points' => 2,
                'objective_code' => 'O2',
                'source_point_code' => 'POI_02',
                'statement' => 'Un collègue peut retirer votre cadenas de condamnation s\'il doit remettre '
                    ."l'installation en service et que vous êtes absent.",
                'explanation' => "Le cadenas est personnel et nominatif. Seul celui qui l'a posé le retire "
                    ."— c'est la seule garantie que personne ne remet sous tension pendant qu'un "
                    ."intervenant a les mains dans la machine. La levée d'un cadenas en l'absence de son "
                    .'porteur existe, mais c\'est une procédure exceptionnelle, écrite, tracée, et validée '
                    .'par le chargé de consignation. Jamais une décision individuelle.',
                'choices' => [
                    ['Vrai', false],
                    ['Faux', true],
                ],
            ],
            [
                'sort_order' => 6,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O3',
                'source_point_code' => 'POI_04',
                'statement' => "Quel organe de la pompe centrifuge apporte l'énergie au fluide ?",
                'explanation' => 'Seule la roue à aubes transmet de l\'énergie au liquide, en le projetant '
                    .'vers l\'extérieur par force centrifuge. La volute ne « pompe » pas : sa section '
                    .'s\'élargit vers le refoulement, ce qui ralentit le fluide et convertit sa vitesse en '
                    ."pression. La garniture assure l'étanchéité, l'accouplement transmet le couple.",
                'choices' => [
                    ['Le corps de pompe (volute)', false],
                    ['La roue à aubes', true],
                    ['La garniture mécanique', false],
                    ["L'accouplement", false],
                ],
            ],
            [
                'sort_order' => 7,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O3',
                'source_point_code' => 'POI_04',
                'statement' => 'La pompe émet un bruit de gravier et vibre. De quoi s\'agit-il, '
                    .'et où corrige-t-on le problème ?',
                'explanation' => 'Le bruit de gravier est la signature de la cavitation : la pression à '
                    ."l'aspiration descend sous la tension de vapeur du liquide, des bulles se forment "
                    .'puis implosent sur les aubes. Remplacer la roue ne règle rien — la nouvelle sera '
                    ."piquée à son tour. La cause est toujours à l'aspiration : hauteur de charge "
                    ."insuffisante, pertes de charge, vanne partiellement fermée, ou fluide trop chaud.",
                'choices' => [
                    ['Cavitation — se corrige en remplaçant la roue à aubes', false],
                    ['Balourd — se corrige par équilibrage de la roue', false],
                    ["Cavitation — se corrige sur le circuit d'aspiration", true],
                    ["Défaut d'alignement — se corrige au comparateur", false],
                ],
            ],
            [
                'sort_order' => 8,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O4',
                'source_point_code' => 'POI_05',
                'statement' => 'Vous devez serrer les 8 boulons d\'une bride. Quelle méthode appliquez-vous ?',
                'explanation' => 'Le serrage en croix ET par passes progressives répartit uniformément la '
                    .'charge sur le joint. Serrer un boulon au couple final d\'emblée — même en croix — '
                    ."déforme la bride et écrase le joint localement : c'est la cause de fuite la plus "
                    ."fréquente après remontage, et elle est rarement identifiée. Le blocage à la clé "
                    ."plate puis un quart de tour ignore le couple prescrit et n'a aucune reproductibilité.",
                'choices' => [
                    ['En croix, en trois passes progressives (30 %, 60 %, 100 % du couple prescrit)', true],
                    ['En croix, au couple final dès la première passe', false],
                    ['Dans le sens horaire, au couple final dès la première passe', false],
                    ['À la clé plate jusqu\'au blocage, puis un quart de tour supplémentaire', false],
                ],
            ],
            [
                'sort_order' => 9,
                'type' => 'single',
                'points' => 2,
                'objective_code' => 'O5',
                'source_point_code' => 'POI_06',
                'statement' => "Le spectre vibratoire d'une pompe montre un pic dominant à 2 × la "
                    .'fréquence de rotation, avec une forte composante axiale. Quel défaut suspectez-vous ?',
                'explanation' => '1× = balourd. 2× = désalignement. La composante axiale marquée confirme '
                    .'le désalignement. Un défaut de roulement se lit en hautes fréquences, à des '
                    .'fréquences non entières liées à la géométrie du roulement. La cavitation, elle, '
                    .'produit un bruit large bande sans pic net.',
                'choices' => [
                    ['Un balourd de la roue à aubes', false],
                    ['Un défaut de roulement', false],
                    ['De la cavitation', false],
                    ["Un défaut d'alignement entre le moteur et la pompe", true],
                ],
            ],
            [
                'sort_order' => 10,
                'type' => 'multiple',
                'points' => 2,
                'objective_code' => 'O6',
                'source_point_code' => 'POI_07',
                'statement' => 'Concernant le stockage des huiles en atelier, quelles affirmations '
                    .'sont exactes ?',
                'explanation' => 'On ne mélange jamais deux huiles, même de viscosité identique : leurs '
                    .'additifs — anti-usure, antioxydants, détergents — peuvent être incompatibles et '
                    .'former des boues qui obstruent filtres et canaux de graissage. Sur la rétention, la '
                    .'règle retient la plus élevée des deux valeurs : 100 % du plus grand contenant, ou '
                    .'50 % du volume total stocké.',
                'choices' => [
                    ['Deux huiles de marques différentes peuvent être mélangées si leur viscosité est identique', false],
                    ['Le bac de rétention doit contenir au moins le volume du plus grand contenant stocké', true],
                    ["Tout bidon entamé doit être refermé et étiqueté (référence, date d'ouverture)", true],
                    ['Un absorbant doit être disponible à proximité immédiate du stockage', true],
                ],
            ],
        ];
    }
}
