<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Objets pédagogiques 3D (plan : table « models », renommée pour éviter
 * la collision avec Illuminate\Database\Eloquent\Model).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_objects', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->nullable();

            // Assets — voir Lot 1
            $table->string('glb_path');                 // Android + desktop
            $table->string('usdz_path')->nullable();    // iOS AR Quick Look
            $table->string('poster_path')->nullable();  // écran de chargement

            // Calibrage RA : 1 unité glTF = 1 mètre réel (piège de l'étape 1.2)
            $table->float('default_scale')->default(1);
            $table->string('up_axis', 2)->default('Y');
            $table->string('recommended_placement', 10)->default('floor'); // floor|table|wall

            // Budget de performance relevé à l'étape 1.7
            $table->unsignedInteger('triangles')->nullable();
            $table->unsignedInteger('file_size_kb')->nullable();

            $table->string('status', 10)->default('draft'); // draft|published
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_objects');
    }
};
