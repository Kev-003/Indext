<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BrandChatStore
{
    public function __construct(protected ?string $connection = null) {}

    public function latestConversationId(string $participantType, string|int $participantId): ?string
    {
        return $this->table('agent_conversations')
            ->where('participant_type', $participantType)
            ->where('participant_id', $participantId)
            ->orderByDesc('updated_at')
            ->first()?->id;
    }

    public function storeConversation(?string $participantType, string|int|null $participantId, string $title): string
    {
        $conversationId = (string) Str::uuid7();

        $this->table('agent_conversations')->insert([
            'id' => $conversationId,
            'participant_type' => $participantType,
            'participant_id' => $participantId,
            'title' => $title,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $conversationId;
    }

    public function storeUserMessage(string $conversationId, ?string $participantType, string|int|null $participantId, string $content): string
    {
        $messageId = (string) Str::uuid7();

        $this->table('agent_conversation_messages')->insert([
            'id' => $messageId,
            'conversation_id' => $conversationId,
            'participant_type' => $participantType,
            'participant_id' => $participantId,
            'agent' => 'branding',
            'role' => 'user',
            'content' => $content,
            'attachments' => '[]',
            'tool_calls' => '[]',
            'tool_results' => '[]',
            'usage' => '[]',
            'meta' => '[]',
            'approval_state' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->touchConversation($conversationId);

        return $messageId;
    }

    public function storeAssistantMessage(string $conversationId, ?string $participantType, string|int|null $participantId, string $content, array $toolCalls = []): ?string
    {
        $messageId = (string) Str::uuid7();

        $this->table('agent_conversation_messages')->insert([
            'id' => $messageId,
            'conversation_id' => $conversationId,
            'participant_type' => $participantType,
            'participant_id' => $participantId,
            'agent' => 'branding',
            'role' => 'assistant',
            'content' => $content,
            'attachments' => '[]',
            'tool_calls' => json_encode($toolCalls),
            'tool_results' => '[]',
            'usage' => '[]',
            'meta' => '[]',
            'approval_state' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->touchConversation($conversationId);

        return $messageId;
    }

    public function getLatestConversationMessages(string $conversationId, int $limit): Collection
    {
        $records = $this->table('agent_conversation_messages')
            ->where('conversation_id', $conversationId)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        return $records->map(function ($record) {
            return [
                'id' => $record->id,
                'role' => $record->role,
                'content' => $record->content,
                'tool_calls' => json_decode($record->tool_calls, true) ?: [],
                'tool_results' => json_decode($record->tool_results, true) ?: [],
                'created_at' => $record->created_at,
            ];
        });
    }

    public function deleteConversation(string $conversationId): bool
    {
        try {
            $this->table('agent_conversation_messages')
                ->where('conversation_id', $conversationId)
                ->delete();

            $this->table('agent_conversations')
                ->where('id', $conversationId)
                ->delete();

            return true;
        } catch (\Throwable $e) {
            Log::warning('Agent conversation deletion failed', [
                'conversation_id' => $conversationId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    protected function touchConversation(string $conversationId): void
    {
        $this->table('agent_conversations')
            ->where('id', $conversationId)
            ->update(['updated_at' => now()]);
    }

    protected function table(string $table)
    {
        return DB::connection($this->connection)->table($table);
    }
}
