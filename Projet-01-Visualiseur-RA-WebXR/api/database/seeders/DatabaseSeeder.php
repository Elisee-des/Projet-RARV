<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->creerCompteFormateur();

        $this->call([
            // Module « viewer-ra » — Projet 01
            PompeCentrifugeSeeder::class,

            // Module « labo-formation » — Projet 02 (socle mutualisé, ADR-001)
            AtelierMaintenanceSeeder::class,
        ]);
    }

    /**
     * Compte formateur de secours.
     *
     * ⚠️ Sans `User::factory()` : les factories reposent sur `fake()`, fourni
     * par `fakerphp/faker` — une dépendance de DÉVELOPPEMENT. En production,
     * `composer install --no-dev` ne l'installe pas, et l'appel échouait sur
     * « Call to undefined function fake() ».
     *
     * Ce compte ne sert à rien tant que `RARV_AUTH_REQUIRED` vaut false : le
     * back-office et le tableau de bord sont alors en accès libre. Il existe
     * pour le jour où l'on referme la plateforme, sans avoir à réinstaller
     * les dépendances de développement pour créer un utilisateur.
     */
    private function creerCompteFormateur(): void
    {
        $motDePasse = (string) env('RARV_FORMATEUR_PASSWORD', 'password');

        User::updateOrCreate(
            ['email' => (string) env('RARV_FORMATEUR_EMAIL', 'formateur@example.com')],
            [
                'name' => 'Formateur',
                'password' => Hash::make($motDePasse),
                'email_verified_at' => now(),
            ]
        );
    }
}
