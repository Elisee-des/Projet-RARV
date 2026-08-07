<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Points d'annotation accrochés à une pièce de l'objet 3D.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_object_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);

            // ⚠️ Position en espace LOCAL du modèle, jamais en espace monde :
            // c'est ce qui fait suivre les pins quand l'objet tourne (étape 4.1).
            $table->float('position_x');
            $table->float('position_y');
            $table->float('position_z');

            // Normale à la surface — oriente le pin (relevée au raycast, étape 8.4)
            $table->float('normal_x')->nullable();
            $table->float('normal_y')->nullable();
            $table->float('normal_z')->nullable();

            $table->string('label');            // texte court affiché sur le pin
            $table->string('title');            // titre de la fiche
            $table->longText('body_html');      // corps — purifié à l'étape 9.8
            $table->string('media_url')->nullable();
            $table->string('doc_url')->nullable();

            $table->timestamps();

            $table->index(['learning_object_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annotations');
    }
};
