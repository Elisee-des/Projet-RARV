<?php

namespace App\Http\Resources;

use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 🔒 DÉCISION D5 — étape 2.4.
 *
 * Cette ressource est le seul point par lequel une question sort du serveur
 * AVANT soumission. Elle expose le libellé des propositions et rien d'autre :
 *
 *   - pas de `is_correct`, évidemment
 *   - pas d'`explanation` non plus : l'explication donne la réponse
 *
 * Ne jamais renvoyer un modèle Question ou Choice directement. La liste des
 * champs est écrite en dur, à dessein : un `$question->toArray()` embarquerait
 * automatiquement toute colonne ajoutée plus tard.
 *
 * @mixin Question
 */
class QuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order' => $this->sort_order,
            'type' => $this->type,
            'statement' => $this->statement,
            'points' => $this->points,

            // Combien de propositions cocher — l'information est déductible du
            // type, sauf pour `multiple` où elle évite à l'apprenant de deviner
            // s'il doit en cocher une ou plusieurs. Elle ne dit PAS lesquelles.
            'multiple' => $this->type === 'multiple',

            'choices' => $this->choices->map(fn ($choix) => [
                'id' => $choix->id,
                'label' => $choix->label,
            ])->values(),
        ];
    }
}
