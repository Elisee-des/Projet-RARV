<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Formateur de test',
            'email' => 'formateur@example.com',
        ]);

        $this->call([
            // Module « viewer-ra » — Projet 01
            PompeCentrifugeSeeder::class,

            // Module « labo-formation » — Projet 02 (socle mutualisé, ADR-001)
            AtelierMaintenanceSeeder::class,
        ]);
    }
}
