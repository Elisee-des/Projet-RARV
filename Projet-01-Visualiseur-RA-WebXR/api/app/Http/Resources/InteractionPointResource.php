<?php

namespace App\Http\Resources;

use App\Models\InteractionPoint;
use App\Support\HtmlSur;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * Étape 2.3 — Un poste de l'atelier.
 *
 * @mixin InteractionPoint
 */
class InteractionPointResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'order' => $this->sort_order,
            'label' => $this->label,
            'icon' => $this->icon,
            'required' => $this->required,

            'trigger' => [
                'type' => $this->trigger_type,
                'radius' => $this->trigger_radius,
            ],

            // ⚠️ `null` dans le cas normal : la position fait autorité dans le
            // .glb, pas en base (étape 1.10). Le chargeur de scène lit l'Empty
            // nommé `code` et ne se rabat sur cette valeur que si elle existe.
            'position' => $this->position(),
            'lookAt' => $this->lookAt(),

            'activity' => $this->activite(),
        ];
    }

    /**
     * Contenu de l'activité, mis en forme selon son type.
     *
     * Le quiz ne renvoie qu'un identifiant : ses questions passent par
     * l'endpoint dédié (2.4), qui est le seul à savoir les expurger.
     *
     * @return array<string, mixed>
     */
    private function activite(): array
    {
        $base = ['type' => $this->activity_type];

        if ($this->activity_type === 'quiz') {
            return $base + ['quizId' => $this->activity_id];
        }

        $charge = $this->activity_payload ?? [];

        // Les chemins de fichiers deviennent des URL signées : le front ne
        // connaît jamais l'arborescence de stockage du serveur.
        foreach (['src', 'poster', 'captions', 'file'] as $champ) {
            if (isset($charge[$champ]) && is_string($charge[$champ])) {
                $charge[$champ] = $this->urlAsset($charge[$champ]);
            }
        }

        // Étape 10.9 — purification de RÉFÉRENCE, côté serveur.
        //
        // Le front en possède une seconde, mais un client se contourne : il
        // suffit d'appeler l'API directement. Seul le serveur peut garantir
        // qu'un contenu stocké ne ressort jamais avec du script dedans — et
        // c'est ici que ça compte, le jour où un back-office permettra
        // d'éditer ces panneaux.
        foreach (['bodyHtml', 'summaryHtml'] as $champ) {
            if (isset($charge[$champ]) && is_string($charge[$champ])) {
                $charge[$champ] = HtmlSur::purifier($charge[$champ]);
            }
        }

        return $base + $charge;
    }

    private function urlAsset(string $chemin): string
    {
        return URL::signedRoute('environments.assets.show', [
            'slug' => $this->environment->slug,
            'fichier' => basename($chemin),
        ]);
    }
}
