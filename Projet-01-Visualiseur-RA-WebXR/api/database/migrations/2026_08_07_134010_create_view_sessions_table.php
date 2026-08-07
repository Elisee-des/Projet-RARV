<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Une session de consultation. Clé UUID car l'identifiant circule côté client
 * et sert de cible à la bascule desktop → mobile (Lot 6).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('view_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('learning_object_id')->constrained()->cascadeOnDelete();

            $table->string('user_ref')->nullable();     // identifiant fourni par le LMS
            $table->string('lms_context')->nullable();  // cours / leçon d'origine
            $table->string('device_type', 20)->nullable(); // desktop|android|ios
            $table->boolean('xr_supported')->default(false);

            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->boolean('entered_ar')->default(false);

            $table->timestamps();

            $table->index('user_ref');
            $table->index(['learning_object_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('view_sessions');
    }
};
