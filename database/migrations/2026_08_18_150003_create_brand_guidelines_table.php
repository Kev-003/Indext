<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('brand_guidelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('logo_guidelines')->nullable();
            $table->json('color_guidelines')->nullable();
            $table->json('typography_guidelines')->nullable();
            $table->json('asset_guidelines')->nullable();
            $table->json('future_plans')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_guidelines');
    }
};
