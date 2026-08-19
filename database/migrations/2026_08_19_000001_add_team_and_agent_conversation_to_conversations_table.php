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
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('agent_conversation_id', 36)->nullable()->after('user_id');
            $table->foreignId('team_id')->nullable()->after('brand_id')->constrained()->cascadeOnDelete();

            $table->unique(['team_id', 'agent_conversation_id'], 'conversations_team_agent_unique');
            $table->index(['team_id', 'brand_id', 'sort_order'], 'conversations_team_brand_sort_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex('conversations_team_brand_sort_index');
            $table->dropUnique('conversations_team_agent_unique');
            $table->dropForeign(['team_id']);
            $table->dropColumn(['team_id', 'agent_conversation_id']);
        });
    }
};
