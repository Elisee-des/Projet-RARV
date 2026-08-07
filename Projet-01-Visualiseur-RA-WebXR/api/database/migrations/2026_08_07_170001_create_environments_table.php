<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projet 02 — Environnement 3D navigable (une salle).
 *
 * Le socle est mutualisé avec le Projet 01 (ADR-001) : cette table s'ajoute,
 * elle ne modifie rien de l'existant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environments', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();

            // Assets produits au Lot 1
            $table->string('scene_glb_path')->nullable();
            $table->string('collision_glb_path')->nullable();
            $table->json('lightmap_paths')->nullable();

            // Point d'apparition. Provisoire tant que le .glb ne porte pas
            // l'Empty `SPAWN` (étape 1.10) : le chargeur de scène le remplace
            // par la valeur lue dans le fichier.
            $table->json('spawn_position')->nullable();
            $table->float('spawn_rotation')->default(0); // degrés autour de +Y

            // Volume de la salle, en mètres : {largeur, hauteur, profondeur}
            $table->json('bounds')->nullable();

            // Budget de performance relevé au Lot 1
            $table->unsignedInteger('triangles')->nullable();
            $table->unsignedInteger('file_size_kb')->nullable();

            $table->string('status', 10)->default('draft'); // draft|published
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environments');
    }
};
