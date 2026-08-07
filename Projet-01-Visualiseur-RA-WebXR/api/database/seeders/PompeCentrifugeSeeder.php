<?php

namespace Database\Seeders;

use App\Models\LearningObject;
use Illuminate\Database\Seeder;

/**
 * Étape 2.2 — Objet pédagogique de référence.
 *
 * Contenu issu de docs/contenu-pedagogique.md, rédigé au Lot 0.
 *
 * ⚠️ Les chemins d'assets et les coordonnées des annotations sont provisoires :
 * ils seront remplacés par les valeurs réelles à l'issue du Lot 1 (calibrage
 * du modèle) puis affinés dans l'éditeur visuel de l'étape 8.4.
 */
class PompeCentrifugeSeeder extends Seeder
{
    public function run(): void
    {
        $objet = LearningObject::updateOrCreate(
            ['slug' => 'pompe-centrifuge-01'],
            [
                'title' => 'Pompe centrifuge — organes principaux et points de contrôle',
                'description' => "Une pompe centrifuge transforme l'énergie mécanique d'un moteur en énergie "
                    ."hydraulique. C'est la machine tournante la plus répandue en industrie, et donc celle qui "
                    ."génère le plus d'interventions de maintenance. La grande majorité des pannes provient de "
                    .'cinq organes bien identifiés.',
                'category' => 'Maintenance industrielle',

                // Assets provisoires — Lot 1
                'glb_path' => 'objets/pompe-centrifuge-01/pompe.glb',
                'usdz_path' => 'objets/pompe-centrifuge-01/pompe.usdz',
                // Vignette SVG plutôt que WebP : générée à partir des mesures
                // réelles du modèle, 2 Ko au lieu de 60, nette à toute taille.
                'poster_path' => 'objets/pompe-centrifuge-01/poster.svg',

                'default_scale' => 1.0,
                'up_axis' => 'Y',
                'recommended_placement' => 'floor',

                // Relevés sur le modèle de substitution généré par
                // scripts/generer-pompe-substitution.mjs — à réactualiser au Lot 1.
                'triangles' => 1_056,
                'file_size_kb' => 42,
                'status' => 'published',
            ]
        );

        $objet->annotations()->delete();

        foreach ($this->annotations() as $donnees) {
            $objet->annotations()->create($donnees);
        }
    }

    /** @return list<array<string, mixed>> */
    private function annotations(): array
    {
        return [
            [
                'sort_order' => 1,
                // Posée au sommet de la pièce « corps-volute » (r = 0,30 · axe y = 0,62)
                'position_x' => 0.0, 'position_y' => 0.92, 'position_z' => 0.22,
                'normal_x' => 0.0, 'normal_y' => 1.0, 'normal_z' => 0.0,
                'label' => 'Corps de pompe',
                'title' => 'Corps de pompe (volute)',
                'body_html' => <<<'HTML'
                    <p><strong>Rôle.</strong> La volute est l'enveloppe en spirale qui entoure la roue.
                    Sa section s'élargit vers la sortie : cette géométrie ralentit le fluide et
                    <strong>convertit sa vitesse en pression</strong>. C'est là que se joue le rendement
                    hydraulique de la machine.</p>

                    <h4>Points de contrôle</h4>
                    <ul>
                      <li>Absence de fuite aux plans de joint et aux brides</li>
                      <li>État de la peinture, traces de corrosion externe</li>
                      <li>Absence de vibration anormale au contact</li>
                      <li>Serrage des boulons de brides au couple prescrit</li>
                    </ul>

                    <h4>Défaillances courantes</h4>
                    <ul>
                      <li><strong>Érosion interne</strong> par un fluide chargé de particules abrasives</li>
                      <li><strong>Corrosion</strong> si le fluide est incompatible avec le matériau</li>
                      <li><strong>Fissuration</strong> sur choc thermique ou coup de bélier répété</li>
                    </ul>

                    <p class="securite">⚠️ Ne jamais desserrer une bride sans avoir consigné l'installation
                    et vérifié la mise à pression atmosphérique du circuit.</p>
                    HTML,
            ],
            [
                'sort_order' => 2,
                // Sommet de « roue-a-aubes » (r = 0,22)
                'position_x' => 0.0, 'position_y' => 0.84, 'position_z' => 0.06,
                'normal_x' => 0.0, 'normal_y' => 1.0, 'normal_z' => 0.0,
                'label' => 'Roue à aubes',
                'title' => 'Roue à aubes (impulseur)',
                'body_html' => <<<'HTML'
                    <p><strong>Rôle.</strong> C'est la <strong>seule pièce qui apporte de l'énergie au
                    fluide</strong>. Entraînée par l'arbre, elle projette le liquide vers l'extérieur par
                    force centrifuge. Son diamètre et sa vitesse déterminent la hauteur manométrique.</p>

                    <h4>Points de contrôle</h4>
                    <ul>
                      <li>État et épaisseur des aubes (érosion, ébréchures)</li>
                      <li>Jeu à la bague d'usure — un jeu excessif fait chuter le débit</li>
                      <li>Équilibrage : un balourd vibre à la fréquence de rotation</li>
                      <li>Propreté, absence de corps étranger</li>
                    </ul>

                    <h4>Défaillances courantes</h4>
                    <p><strong>La cavitation</strong> est la plus caractéristique. Quand la pression à
                    l'aspiration descend sous la tension de vapeur du liquide, des bulles se forment puis
                    implosent sur les aubes : bruit typique de <em>gravier dans la pompe</em>, vibrations,
                    et piquage progressif du métal.</p>

                    <p class="cle">💡 La cavitation ne se répare pas sur la roue : elle se corrige
                    <strong>sur le circuit d'aspiration</strong> (hauteur de charge, pertes de charge,
                    température du fluide, ouverture de la vanne).</p>
                    HTML,
            ],
            [
                'sort_order' => 3,
                // Sommet de « garniture-mecanique » (r = 0,10)
                'position_x' => 0.0, 'position_y' => 0.72, 'position_z' => -0.10,
                'normal_x' => 0.0, 'normal_y' => 1.0, 'normal_z' => 0.0,
                'label' => 'Garniture mécanique',
                'title' => 'Garniture mécanique (étanchéité d\'arbre)',
                'body_html' => <<<'HTML'
                    <p><strong>Rôle.</strong> Assurer l'étanchéité au passage de l'arbre à travers le corps.
                    Deux faces parfaitement planes glissent l'une sur l'autre avec un film liquide de
                    quelques microns. C'est l'organe le plus sollicité et <strong>la première cause d'arrêt
                    d'une pompe centrifuge</strong>.</p>

                    <h4>Points de contrôle</h4>
                    <ul>
                      <li>Fuite : une garniture mécanique doit rester <strong>pratiquement sèche</strong></li>
                      <li>Température du boîtier au contact</li>
                      <li>Bruit de crissement à la mise en route</li>
                      <li>État du circuit de quench ou de refroidissement</li>
                    </ul>

                    <h4>Défaillances courantes</h4>
                    <ul>
                      <li><strong>Marche à sec</strong> — destruction en quelques secondes, cause n°1</li>
                      <li>Cristallisation du produit entre les faces</li>
                      <li>Défaut d'alignement transmis par l'accouplement</li>
                      <li>Vieillissement des élastomères</li>
                    </ul>

                    <p class="securite">⚠️ Une fuite sur produit dangereux impose l'arrêt immédiat.
                    Ne jamais tenter de resserrer une garniture mécanique en marche : contrairement à un
                    presse-étoupe, elle n'est pas réglable.</p>
                    HTML,
            ],
            [
                'sort_order' => 4,
                // Sommet de « palier-avant » (r = 0,13)
                'position_x' => 0.0, 'position_y' => 0.75, 'position_z' => -0.26,
                'normal_x' => 0.0, 'normal_y' => 1.0, 'normal_z' => 0.0,
                'label' => 'Paliers et roulements',
                'title' => 'Paliers et roulements',
                'body_html' => <<<'HTML'
                    <p><strong>Rôle.</strong> Guider l'arbre en rotation et reprendre les efforts radiaux
                    (poids, poussée hydraulique) et axiaux (poussée de la roue). Ils déterminent la durée
                    de vie mécanique de la pompe.</p>

                    <h4>Points de contrôle</h4>
                    <ul>
                      <li><strong>Température</strong> : alerte au-delà de 70 °C, arrêt au-delà de 80 °C</li>
                      <li><strong>Vibration</strong> : l'indicateur prédictif le plus fiable</li>
                      <li>Niveau et couleur de l'huile — une huile laiteuse signale une entrée d'eau</li>
                      <li>Respect du plan de graissage (quantité et périodicité)</li>
                    </ul>

                    <h4>Défaillances courantes</h4>
                    <ul>
                      <li><strong>Sur-graissage</strong> — aussi fréquent que le sous-graissage,
                          provoque un échauffement par barattage</li>
                      <li>Pollution du lubrifiant (eau, poussière)</li>
                      <li>Fatigue normale en fin de vie (écaillage des pistes)</li>
                      <li>Passage de courant électrique sur les moteurs à variateur</li>
                    </ul>

                    <p class="cle">💡 Un roulement prévient toujours avant de casser. Sa signature
                    vibratoire se dégrade <strong>plusieurs semaines</strong> avant la panne : c'est le
                    fondement de la maintenance prédictive.</p>
                    HTML,
            ],
            [
                'sort_order' => 5,
                // Sommet de « accouplement » (r = 0,11)
                'position_x' => 0.0, 'position_y' => 0.73, 'position_z' => -0.58,
                'normal_x' => 0.0, 'normal_y' => 1.0, 'normal_z' => 0.0,
                'label' => 'Accouplement',
                'title' => 'Accouplement moteur – pompe',
                'body_html' => <<<'HTML'
                    <p><strong>Rôle.</strong> Transmettre le couple du moteur à l'arbre de pompe tout en
                    tolérant un léger défaut d'alignement et en amortissant les à-coups.</p>

                    <h4>Points de contrôle</h4>
                    <ul>
                      <li><strong>Alignement</strong> parallèle et angulaire, au comparateur ou au laser</li>
                      <li>État de l'élément élastique : fissures, poussière noire au sol</li>
                      <li>Serrage des vis de moyeu</li>
                      <li><strong>Présence et fixation du protecteur</strong> — obligatoire</li>
                    </ul>

                    <h4>Défaillances courantes</h4>
                    <p>Le <strong>défaut d'alignement</strong> est la cause racine la plus fréquente.
                    Il ne détruit pas l'accouplement en premier : il <strong>tue les roulements et la
                    garniture mécanique</strong>. Un défaut d'alignement se paie toujours ailleurs.</p>

                    <p class="securite">⚠️ Ne jamais faire tourner une pompe sans protecteur d'accouplement.
                    Toute intervention impose la consignation électrique complète : séparation,
                    condamnation, identification, vérification d'absence de tension.</p>
                    HTML,
            ],
        ];
    }
}
