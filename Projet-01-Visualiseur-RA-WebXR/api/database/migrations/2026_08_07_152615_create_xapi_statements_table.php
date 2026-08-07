<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Déclarations xAPI émises (étape 7.4).
 *
 * Conservées même quand elles partent vers un LRS distant : c'est le journal
 * qui permet de rejouer un envoi échoué et d'auditer ce qui a été transmis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xapi_statements', function (Blueprint $table) {
            $table->uuid('id')->primary(); // sert d'identifiant de déclaration xAPI
            $table->foreignUuid('view_session_id')->nullable()
                ->constrained('view_sessions')->nullOnDelete();

            $table->string('actor_ref')->nullable();  // apprenant
            $table->string('verb');                   // IRI du verbe
            $table->string('object_iri');             // IRI de l'activité

            $table->json('statement');                // déclaration complète

            $table->string('etat_envoi', 12)->default('en_attente'); // en_attente|envoye|echec
            $table->unsignedTinyInteger('tentatives')->default(0);
            $table->text('derniere_erreur')->nullable();
            $table->timestamp('envoye_at')->nullable();

            $table->timestamps();

            $table->index(['view_session_id']);
            $table->index(['verb']);
            $table->index(['etat_envoi']);
            $table->index(['actor_ref', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xapi_statements');
    }
};
