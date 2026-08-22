<?php

namespace App\Ai\Storage;

use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Messages\AssistantMessage;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Messages\ToolResultMessage;
use Laravel\Ai\Messages\UserMessage;
use Laravel\Ai\Prompts\AgentPrompt;
use Laravel\Ai\Responses\AgentResponse;
use Laravel\Ai\Responses\Data\ToolCall;
use Laravel\Ai\Responses\Data\ToolResult;
use Laravel\Ai\Storage\DatabaseConversationStore;

class SanitizedConversationStore extends DatabaseConversationStore
{
    private function sanitizeForJson(string $value): string
    {
        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }

    private function safeJsonEncode(mixed $value): string
    {
        return json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE);
    }

    private function sanitizeArrayForJson(mixed $value): mixed
    {
        if (is_string($value)) {
            return $this->sanitizeForJson($value);
        }

        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = $this->sanitizeArrayForJson($item);
            }
        }

        return $value;
    }

    public function storeUserMessage(string $conversationId, ?string $participantType, string|int|null $participantId, AgentPrompt $prompt): string
    {
        $messageId = (string) \Illuminate\Support\Str::uuid7();

        $now = now();

        $this->table($this->messagesTable())->insert($this->messageAttributes($messageId, $conversationId, $participantType, $participantId, $now, [
            'agent' => $prompt->agent::class,
            'role' => 'user',
            'content' => $this->sanitizeForJson($prompt->prompt),
            'attachments' => $this->safeJsonEncode($prompt->attachments->all()),
            'tool_calls' => '[]',
            'tool_results' => '[]',
            'usage' => '[]',
            'meta' => '[]',
            'approval_state' => null,
        ]));

        $this->touchConversation($conversationId, $now);

        return $messageId;
    }

    public function storeAssistantMessage(string $conversationId, ?string $participantType, string|int|null $participantId, AgentPrompt $prompt, AgentResponse $response): ?string
    {
        $messageId = (string) \Illuminate\Support\Str::uuid7();

        $now = now();

        $toolResults = $response->toolResults->values();

        if ($prompt->hasApprovalDecisions()) {
            $existing = $this->existingToolResultIds($conversationId);

            $toolResults = $toolResults->reject(fn (ToolResult $result) => in_array($result->id, $existing, true))->values();

            if (blank($response->text) && $response->toolCalls->isEmpty() && $toolResults->isEmpty()) {
                return null;
            }
        }

        $this->table($this->messagesTable())->insert($this->messageAttributes($messageId, $conversationId, $participantType, $participantId, $now, [
            'agent' => $prompt->agent::class,
            'role' => 'assistant',
            'content' => $this->sanitizeForJson($response->text),
            'attachments' => '[]',
            'tool_calls' => $this->safeJsonEncode($response->toolCalls->values()),
            'tool_results' => $this->safeJsonEncode($toolResults),
            'usage' => $this->safeJsonEncode($response->usage),
            'meta' => $this->safeJsonEncode($this->messageMeta($response)),
            'approval_state' => $this->approvalState($response),
        ]));

        $this->touchConversation($conversationId, $now);

        return $messageId;
    }

    protected function messageMeta(AgentResponse $response): array
    {
        $meta = (array) json_decode($this->safeJsonEncode($response->meta), true);

        if (filled($blocks = $response->pausedProviderContentBlocks())) {
            $meta['provider_content_blocks'] = $blocks;
        }

        return $meta;
    }

    protected function approvalState(AgentResponse $response): ?string
    {
        if (! $response->hasPendingApprovals()) {
            return null;
        }

        return $this->safeJsonEncode([
            'pending' => $response->pendingApprovals->mapWithKeys(fn ($approval) => [$approval->id => $approval->reason])->all(),
        ]);
    }

    public function storeApprovalResults(string $conversationId, ?string $participantType, string|int|null $participantId, array $toolResults): void
    {
        $resultIds = array_map(fn (ToolResult $result) => $result->id, $toolResults);

        DB::connection($this->connection)->transaction(function () use ($conversationId, $participantType, $participantId, $toolResults, $resultIds) {
            $row = $this->table($this->messagesTable())
                ->where('conversation_id', $conversationId)
                ->when($participantId === null,
                    fn ($query) => $query->whereNull('participant_type')->whereNull('participant_id'),
                    fn ($query) => $query->where('participant_type', $participantType)->where('participant_id', $participantId))
                ->where('role', 'assistant')
                ->whereNotNull('approval_state')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get()
                ->first(fn ($record) => array_intersect($this->pausedCallIds($record), $resultIds) !== []);

            if ($row === null) {
                throw new \Laravel\Ai\Exceptions\ApprovalMismatchException('The approval results do not match a paused conversation turn.', collect());
            }

            $existing = collect(json_decode((string) $row->tool_results, true) ?: []);

            $merged = $existing->merge(
                collect($toolResults)->reject(fn (ToolResult $result) => $existing->contains('id', $result->id))
            );

            $pending = collect(((array) json_decode((string) $row->approval_state ?? 'null', true))['pending'] ?? [])->except($resultIds);

            $this->table($this->messagesTable())
                ->where('id', $row->id)
                ->update([
                    'tool_results' => $merged->values()->toJson(),
                    'approval_state' => $this->safeJsonEncode(['pending' => $pending->all()]),
                    'updated_at' => now(),
                ]);
        });
    }

    public function getLatestConversationMessages(string $conversationId, int $limit): \Illuminate\Support\Collection
    {
        $records = $this->table($this->messagesTable())
            ->where('conversation_id', $conversationId)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        $resolvedCallIds = $records
            ->flatMap(fn ($record) => collect(json_decode((string) $record->tool_results, true))->pluck('id'))
            ->filter()
            ->all();

        return $records
            ->flatMap(function ($record) use ($resolvedCallIds): array {
                $toolCalls = collect(json_decode((string) $record->tool_calls, true))->values();
                $toolResults = collect(json_decode((string) $record->tool_results, true))->values();

                $toolCalls = $toolCalls->map(fn ($call) => $this->sanitizeArrayForJson($call));
                $toolResults = $toolResults->map(fn ($result) => $this->sanitizeArrayForJson($result));

                if ($record->role === 'user') {
                    $attachments = $this->rehydrateAttachments($record->attachments);

                    if ($attachments->isNotEmpty()) {
                        return [new UserMessage($this->sanitizeForJson($record->content), $attachments)];
                    }

                    return [new Message('user', $this->sanitizeForJson($record->content))];
                }

                if ($toolCalls->isNotEmpty()) {
                    return $this->reconstructToolTurn($record, $toolCalls, $toolResults, $resolvedCallIds);
                }

                if ($toolResults->isNotEmpty()) {
                    $messages = [new ToolResultMessage($toolResults->map(ToolResult::fromArray(...)))];

                    if (filled($record->content)) {
                        $messages[] = new AssistantMessage($this->sanitizeForJson($record->content));
                    }

                    return $messages;
                }

                return [new AssistantMessage($this->sanitizeForJson($record->content))];
            })
            ->skipWhile(fn (Message $message) => $message instanceof ToolResultMessage)
            ->values();
    }

    protected function reconstructToolTurn(object $record, \Illuminate\Support\Collection $toolCalls, \Illuminate\Support\Collection $toolResults, array $resolvedCallIds = []): array
    {
        $record->content = $this->sanitizeForJson($record->content);

        return parent::reconstructToolTurn($record, $toolCalls, $toolResults, $resolvedCallIds);
    }
}
