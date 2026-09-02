<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('title');
        });

        DB::table('brands')->whereNull('slug')->orderBy('id')->each(function ($brand) {
            $slug = $this->makeUniqueSlug('brands', Str::slug($brand->name) ?: 'brand', $brand->id);
            DB::table('brands')->where('id', $brand->id)->update(['slug' => $slug]);
        });

        DB::table('conversations')->whereNull('slug')->orderBy('id')->each(function ($conversation) {
            $base = Str::slug($conversation->title ?? 'conversation') ?: 'conversation';
            $slug = $this->makeUniqueSlug('conversations', $base, $conversation->id);
            DB::table('conversations')->where('id', $conversation->id)->update(['slug' => $slug]);
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->unique()->change();
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }

    private function makeUniqueSlug(string $table, string $base, int $excludeId): string
    {
        $candidate = $base . '-' . Str::lower(Str::random(6));
        $exists = DB::table($table)
            ->where('slug', $candidate)
            ->where('id', '!=', $excludeId)
            ->exists();
        $attempts = 0;
        while ($exists && $attempts < 5) {
            $candidate = $base . '-' . Str::lower(Str::random(6));
            $exists = DB::table($table)
                ->where('slug', $candidate)
                ->where('id', '!=', $excludeId)
                ->exists();
            $attempts++;
        }
        return $candidate;
    }
};
