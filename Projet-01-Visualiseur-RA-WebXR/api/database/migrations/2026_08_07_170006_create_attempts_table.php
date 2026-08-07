<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Tentative de quiz.
 *
 * Clé UUID : l'identifiant circule côté client entre l'ouverture et la
 * soumission. Un identifiant séquentiel permettrait d'énumérer les tentatives
 * des autres apprenants.
 *
 * Anti-triche (étape 2.7) : `user_ref` provient du jeton signé, jamais du
 * corps de la requête. `submitted_at` verrouille définitivement la tentative.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('quiz_id')->constrained()->cascadeOnDelete();

            // Session de parcours associée, quand elle existe.
            $table->foreignUuid('view_session_id')->nullable()
                ->constrained('view_sessions')->nullOnDelete();

            $table->string('user_ref');
            $table->unsignedTinyInteger('attempt_number')->default(1);

            $table->timestamp('started_at');
            $table->timestamp('submitted_at')->nullable();

            $table->unsignedSmallInteger('score')->nullable();
            $table->unsignedSmallInteger('max_score')->nullable();
            $table->boolean('passed')->default(false);

            // Le temps imparti a-t-il été dépassé ? (contrôle serveur, 2.7)
            $table->boolean('timed_out')->default(false);

            $table->timestamps();

            $table->index(['quiz_id', 'user_ref']);
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attempts');
    }
};
