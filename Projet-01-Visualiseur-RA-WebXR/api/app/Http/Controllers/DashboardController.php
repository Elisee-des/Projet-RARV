<?php

namespace App\Http\Controllers;

use App\Models\LearningObject;
use App\Models\ViewSession;
use App\Models\XapiStatement;
use App\Support\CompletionPolicy;
use App\Support\Xapi\LrsClient;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\DB;

/**
 * Étape 7.7 — Tableau de bord formateur.
 *
 * Il ne s'agit pas d'afficher des compteurs décoratifs : chaque chiffre doit
 * répondre à une question qu'un formateur se pose réellement. La plus utile
 * est la dernière du tableau — « quelle annotation personne ne consulte ? » —
 * parce qu'elle débouche sur une action concrète sur le contenu.
 */
class DashboardController extends Controller
{
    public function index(CompletionPolicy $completion, LrsClient $lrs): View
    {
        $objets = LearningObject::query()
            ->withCount('sessions')
            ->orderBy('title')
            ->get()
            ->map(fn (LearningObject $objet) => $this->statistiques($objet));

        return view('dashboard', [
            'objets' => $objets,
            'regleCompletion' => $completion->description(),
            'pilotelrs' => $lrs->nom(),
            'declarations' => XapiStatement::query()
                ->latest('created_at')
                ->limit(15)
                ->get(),
            'totalDeclarations' => XapiStatement::count(),
            'declarationsEchouees' => XapiStatement::where('etat_envoi', 'echec')->count(),
        ]);
    }

    /** @return array<string, mixed> */
    private function statistiques(LearningObject $objet): array
    {
        $sessions = ViewSession::query()->where('learning_object_id', $objet->id);

        $total = (clone $sessions)->count();
        $enRa = (clone $sessions)->where('entered_ar', true)->count();
        $closes = (clone $sessions)->whereNotNull('ended_at');

        $completions = XapiStatement::query()
            ->where('verb', 'like', '%/completed')
            ->where('object_iri', 'like', '%/objects/'.$objet->slug)
            ->count();

        // Nombre de sessions distinctes ayant ouvert chaque annotation.
        $vuesParAnnotation = DB::table('session_events')
            ->join('view_sessions', 'view_sessions.id', '=', 'session_events.view_session_id')
            ->where('session_events.type', 'annotation_opened')
            ->where('view_sessions.learning_object_id', $objet->id)
            ->selectRaw("json_extract(session_events.payload, '$.annotation_id') as annotation_id")
            ->selectRaw('count(distinct session_events.view_session_id) as vues')
            ->groupBy('annotation_id')
            ->pluck('vues', 'annotation_id');

        $annotations = $objet->annotations->map(function ($annotation) use ($vuesParAnnotation, $total) {
            $vues = (int) ($vuesParAnnotation[$annotation->id] ?? 0);

            return [
                'ordre' => $annotation->sort_order,
                'label' => $annotation->label,
                'vues' => $vues,
                'taux' => $total > 0 ? (int) round(($vues / $total) * 100) : 0,
            ];
        })->sortBy('taux')->values();

        return [
            'slug' => $objet->slug,
            'titre' => $objet->title,
            'sessions' => $total,
            'enRa' => $enRa,
            'tauxRa' => $total > 0 ? (int) round(($enRa / $total) * 100) : 0,
            'dureeMoyenne' => (int) round(((clone $closes)->avg('duration_ms') ?? 0) / 1000),
            'completions' => $completions,
            'tauxCompletion' => $total > 0 ? (int) round(($completions / $total) * 100) : 0,
            'annotations' => $annotations,
            'triangles' => $objet->triangles,
        ];
    }
}
