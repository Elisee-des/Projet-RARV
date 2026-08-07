<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mutualisation (ADR-001) — la table `view_sessions` sert désormais les DEUX
 * modules de la plateforme :
 *
 *   - module « viewer-ra »      → la session porte un `learning_object_id`
 *   - module « labo-formation » → la session porte un `environment_id`
 *
 * C'est la seule modification structurelle apportée à l'existant. Elle permet
 * au Projet 02 de réutiliser tel quel le journal d'événements, la chaîne xAPI
 * et le tableau de bord, au lieu de dupliquer une table `lab_sessions`.
 *
 * `learning_object_id` devient donc NULLABLE : exactement l'une des deux
 * colonnes est renseignée, ce qu'un test vérifie.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('view_sessions', function (Blueprint $table) {
            $table->foreignId('environment_id')->nullable()
                ->constrained()->cascadeOnDelete();

            // Module d'origine, pour discriminer sans jointure dans les agrégats
            // du tableau de bord.
            $table->string('module', 20)->default('viewer-ra');
        });

        // Séparé du bloc précédent : sur SQLite, une modification de colonne
        // reconstruit la table. La faire seule évite de mélanger un ajout de
        // clé étrangère et une reconstruction dans la même opération.
        Schema::table('view_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('learning_object_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('view_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('environment_id');
            $table->dropColumn('module');
        });
    }
};
