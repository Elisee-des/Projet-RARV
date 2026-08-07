<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Réponse donnée à une question, telle que corrigée par le serveur.
 *
 * C'est la table qui alimente l'écran « questions les plus ratées » du
 * tableau de bord formateur (étape 9.6).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();

            // Identifiants des propositions cochées par l'apprenant.
            $table->json('choice_ids');

            $table->boolean('is_correct')->default(false);
            $table->unsignedSmallInteger('points_earned')->default(0);

            $table->timestamps();

            $table->unique(['attempt_id', 'question_id']);
            $table->index(['question_id', 'is_correct']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attempt_answers');
    }
};
