<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jeton de bascule desktop → mobile (Lot 6).
 * Usage unique, expiration courte : c'est ce qui permet au QR code d'ouvrir
 * la RA sur le téléphone tout en rattachant les événements à la même session.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('handoff_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            $table->foreignId('learning_object_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('view_session_id')->nullable()
                ->constrained('view_sessions')->nullOnDelete();

            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable(); // non nul = déjà utilisé

            $table->timestamps();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('handoff_tokens');
    }
};
