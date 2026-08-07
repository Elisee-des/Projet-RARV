<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Points d'intérêt d'un environnement (les 8 « postes »).
 *
 * ⚠️ Deux écarts assumés par rapport au §5 du plan :
 *
 * 1. `order` devient `sort_order` — `order` est un mot réservé SQL. Même
 *    déviation qu'au Lot 2 du Projet 01.
 *
 * 2. Le plan prévoit `activity_id` pour relier le point à son activité, sans
 *    définir de table pour les panneaux, vidéos et documents. On ajoute donc
 *    `activity_payload` (JSON) : `activity_id` référence un quiz, le payload
 *    porte le contenu des trois autres types. Créer trois tables pour du
 *    contenu jamais requêté indépendamment serait de la normalisation gratuite ;
 *    le jour où un back-office les édite (hors périmètre v1), elles se
 *    dérivent du payload sans migration de données.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interaction_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('environment_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Code de l'Empty Blender correspondant (POI_01 … POI_08).
            // C'est la clé de jointure entre la base et la géométrie.
            $table->string('code', 20);

            // ⚠️ Coordonnées NULLABLES et volontairement vides au seed.
            // La source de vérité est l'Empty nommé dans le .glb (étape 1.10).
            // Les renseigner ici serait recréer le piège n°1 du projet :
            // repositionner 8 points à la main à chaque itération de la salle.
            $table->float('position_x')->nullable();
            $table->float('position_y')->nullable();
            $table->float('position_z')->nullable();
            $table->float('look_at_x')->nullable();
            $table->float('look_at_y')->nullable();
            $table->float('look_at_z')->nullable();

            $table->string('trigger_type', 10)->default('click'); // click|proximity
            $table->float('trigger_radius')->nullable();          // mètres, si proximity

            $table->string('activity_type', 10);                  // quiz|video|panel|document
            $table->foreignId('activity_id')->nullable();         // quizzes.id si activity_type = quiz
            $table->json('activity_payload')->nullable();         // contenu des panel|video|document

            $table->string('label');
            $table->string('icon', 40)->nullable();

            // Compte-t-il dans la condition de complétion ?
            $table->boolean('required')->default(true);

            $table->timestamps();

            $table->unique(['environment_id', 'code']);
            $table->index(['environment_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interaction_points');
    }
};
