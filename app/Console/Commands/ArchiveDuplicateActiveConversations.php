<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Conversation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ArchiveDuplicateActiveConversations extends Command
{
    protected $signature = 'conversations:archive-duplicates';
    protected $description = 'Archive duplicate active conversations, keeping the one with the most messages';

    public function handle(): void
    {
        $brandsWithDuplicates = Brand::whereHas('conversations', function ($query) {
            $query->where('status', 'active');
        })->get();

        $summary = [];

        foreach ($brandsWithDuplicates as $brand) {
            $activeConversations = $brand->conversations()
                ->where('status', 'active')
                ->get();

            if ($activeConversations->count() <= 1) {
                continue;
            }

            $scored = $activeConversations->map(function ($conversation) {
                $messageCount = DB::table('agent_conversation_messages')
                    ->where('conversation_id', $conversation->agent_conversation_id)
                    ->count();

                return [
                    'conversation' => $conversation,
                    'message_count' => $messageCount,
                    'updated_at' => $conversation->updated_at,
                ];
            });

            $scored = $scored->sort(function ($a, $b) {
                if ($a['message_count'] !== $b['message_count']) {
                    return $b['message_count'] <=> $a['message_count'];
                }
                return $b['updated_at'] <=> $a['updated_at'];
            })->values()->all();

            $keep = $scored[0]['conversation'];
            $archive = $scored->slice(1);

            foreach ($archive as $item) {
                $item['conversation']->update(['status' => 'archived']);
            }

            $summary[] = [
                'brand_id' => $brand->id,
                'brand_name' => $brand->name,
                'kept_conversation_id' => $keep->id,
                'kept_message_count' => $scored[0]['message_count'],
                'archived_conversation_ids' => $archive->pluck('conversation.id')->toArray(),
            ];
        }

        if (empty($summary)) {
            $this->info('No duplicate active conversations found.');
            return;
        }

        $this->warn('Archived duplicate active conversations:');
        foreach ($summary as $entry) {
            $this->line("Brand: {$entry['brand_name']} (ID: {$entry['brand_id']})");
            $this->line("  Kept conversation ID: {$entry['kept_conversation_id']} ({$entry['kept_message_count']} messages)");
            $this->line("  Archived conversation IDs: " . implode(', ', $entry['archived_conversation_ids']));
        }

        $this->info('Done.');
    }
}