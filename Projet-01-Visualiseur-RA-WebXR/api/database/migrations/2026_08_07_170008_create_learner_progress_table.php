<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Progression d'un apprenant dans un environnement.
 *
 * Une ligne par couple (apprenant, environnement) : la reprise de session
 * (étape 7.3) relit cette ligne et restitue la position exacte.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learner_progress', function (Blueprint $table) {
            $table->id();
            $table->string('user_ref');
            $table->foreignId('environment_id')->constrained()->cascadeOnDelete();

            // Codes des points (POI_01 …), pas des identifiants numériques :
            // la progression survit à un reseed complet de l'environnement.
            $table->json('visited_points')->nullable();
            $table->json('completed_points')->nullable();

            // {position: [x,y,z], rotation: y} — reprise à l'endroit exact
            $table->json('last_position')->nullable();

            $table->unsignedBigInteger('total_time_ms')->default(0);
            $table->unsignedTinyInteger('completion_pct')->default(0);
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->unique(['user_ref', 'environment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learner_progress');
    }
};
