<?php

namespace App\Http\Resources;

use App\Models\Quiz;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Étape 2.4 — Quiz tel que le front le reçoit, sans aucune bonne réponse.
 *
 * @mixin Quiz
 */
class QuizResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'passScore' => $this->pass_score,
            'maxAttempts' => $this->max_attempts,
            'timeLimitS' => $this->time_limit_s,
            'shuffleQuestions' => $this->shuffle_questions,

            'maxScore' => $this->scoreMaximum(),
            'questionCount' => $this->questions->count(),

            'questions' => QuestionResource::collection($this->questions),
        ];
    }
}
