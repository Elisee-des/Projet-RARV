<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Propositions de réponse.
 *
 * 🔒 DÉCISION D5. `is_correct` ne quitte JAMAIS le serveur avant soumission.
 * La ressource API des questions (étape 2.4) l'exclut, et un test dédié
 * (étape 2.11) échoue si la chaîne apparaît dans une réponse HTTP.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('choices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->text('label');
            $table->boolean('is_correct')->default(false);

            $table->timestamps();

            $table->index(['question_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('choices');
    }
};
