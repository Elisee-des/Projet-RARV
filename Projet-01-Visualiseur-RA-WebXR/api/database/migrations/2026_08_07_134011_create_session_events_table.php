<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'événements d'une session — matière première de la traçabilité
 * xAPI (étape 7.4) et du tableau de bord formateur (étape 7.7).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_events', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('view_session_id')->constrained('view_sessions')->cascadeOnDelete();

            // model_loaded | ar_entered | ar_exited | annotation_opened
            // annotation_closed | model_placed | completed
            $table->string('type', 40);
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at');

            $table->timestamps();

            $table->index(['view_session_id', 'type']);
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_events');
    }
};
