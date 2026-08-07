<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Questions d'un quiz.
 *
 * `explanation` n'est renvoyée QU'APRÈS soumission : elle donne la réponse.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->string('type', 12); // single|multiple|truefalse
            $table->text('statement');
            $table->unsignedSmallInteger('points')->default(1);
            $table->text('explanation')->nullable();

            // Objectif pédagogique et poste porteur — alimentent le tableau de
            // bord formateur (étape 9.6) : « quel poste faut-il retravailler ? »
            $table->string('objective_code', 8)->nullable();  // O1 … O6
            $table->string('source_point_code', 20)->nullable(); // POI_03, POI_02 …

            $table->timestamps();

            $table->index(['quiz_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
