<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Quiz noté.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            $table->string('title');

            // Seuil de réussite, en POURCENTAGE du score maximum.
            $table->unsignedTinyInteger('pass_score')->default(70);

            $table->unsignedTinyInteger('max_attempts')->default(2);
            $table->boolean('shuffle_questions')->default(true);

            // Durée limite en secondes. NULL = pas de chronomètre.
            $table->unsignedInteger('time_limit_s')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quizzes');
    }
};
