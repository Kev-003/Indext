<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Conversation;
use App\Services\BrandChatStore;
use App\Services\LLM\LLMProvider;
use App\Services\LLM\SystemPromptBuilder;
use App\Services\LLM\ToolRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatController extends Controller
{
    public function __construct(
        protected LLMProvider $llm,
        protected ToolRegistry $toolRegistry,
        protected SystemPromptBuilder $systemPromptBuilder,
        protected BrandChatStore $chatStore,
    ) {}

    public function message(Request $request, Brand $brand): StreamedResponse
    {
        $user = $request->user();

        $team = $brand->team;
        if ($team && !$user->belongsToTeam($team)) {
            abort(403);
        }
        if (!$team && $brand->user_id !== $user->id) {
            abort(403);
        }

        $validator = Validator::make($request->all(), [
            'prompt' => ['required', 'string', 'max:5000'],
            'conversation_id' => ['nullable', 'exists:conversations,id'],
        ]);

        $validator->validate();

        $prompt = $request->input('prompt');
        $conversationId = $request->input('conversation_id');

        $conversation = DB::transaction(function () use ($user, $brand, $conversationId, $prompt) {
            if ($conversationId) {
                $conversation = Conversation::where('id', $conversationId)
                    ->where('user_id', $user->id)
                    ->where('brand_id', $brand->id)
                    ->firstOrFail();

                if (!$conversation->agent_conversation_id) {
                    $agentConversationId = $this->chatStore->storeConversation(
                        participantType: 'user',
                        participantId: $user->id,
                        title: $conversation->title,
                    );

                    $conversation->update(['agent_conversation_id' => $agentConversationId]);
                }
            } else {
                $agentConversationId = $this->chatStore->storeConversation(
                    participantType: 'user',
                    participantId: $user->id,
                    title: $this->extractTitle($prompt),
                );

                $conversation = Conversation::create([
                    'team_id' => $team?->id ?? $user->currentTeam?->id,
                    'brand_id' => $brand->id,
                    'user_id' => $user->id,
                    'agent_conversation_id' => $agentConversationId,
                    'title' => $this->extractTitle($prompt),
                    'status' => 'active',
                ]);
            }

            $this->chatStore->storeUserMessage(
                conversationId: $conversation->agent_conversation_id,
                participantType: 'user',
                participantId: $user->id,
                content: $prompt,
            );

            return $conversation;
        });

        $history = $this->chatStore->getLatestConversationMessages(
            $conversation->agent_conversation_id,
            50
        )->map(fn ($m) => ['role' => $m['role'], 'content' => $m['content']])
        ->toArray();

        $messages = $this->systemPromptBuilder->build($brand, $history, $user->llm_methodology);
        $tools = $this->toolRegistry->getToolDefinitions();

        return response()->stream(
            function () use ($brand, $conversation, $messages, $tools, $user) {
                $fullContent = '';
                $toolCalls = [];
                $currentToolCallIndex = null;

                try {
                    foreach ($this->llm->streamChat($messages, $tools) as $chunk) {
                        if ($chunk->type === 'text') {
                            $fullContent .= $chunk->delta['content'] ?? '';

                            echo "event: text\n";
                            echo "data: ".json_encode(['content' => $chunk->delta['content'] ?? ''])."\n\n";
                        } elseif ($chunk->type === 'tool_call') {
                            $index = $chunk->metadata['index'] ?? 0;

                            if ($currentToolCallIndex !== null && $currentToolCallIndex !== $index) {
                                $this->sendToolCallEvent($toolCalls[$currentToolCallIndex]);
                                $currentToolCallIndex = null;
                            }

                            if (!isset($toolCalls[$index])) {
                                $toolCalls[$index] = [
                                    'id' => 'call_'.uniqid(),
                                    'type' => 'function',
                                    'function' => [
                                        'name' => '',
                                        'arguments' => '',
                                    ],
                                ];
                                $currentToolCallIndex = $index;
                            }

                            if (isset($chunk->delta['id'])) {
                                $toolCalls[$index]['id'] = $chunk->delta['id'];
                            }
                            if (isset($chunk->delta['type'])) {
                                $toolCalls[$index]['type'] = $chunk->delta['type'];
                            }
                            if (isset($chunk->delta['function']['name'])) {
                                $toolCalls[$index]['function']['name'] = $chunk->delta['function']['name'];
                            }
                            if (isset($chunk->delta['function']['arguments'])) {
                                $toolCalls[$index]['function']['arguments'] .= $chunk->delta['function']['arguments'];
                            }

                            $this->sendToolCallEvent($toolCalls[$index]);
                        }

                        ob_flush();
                        flush();
                    }

                    if ($currentToolCallIndex !== null && isset($toolCalls[$currentToolCallIndex])) {
                        $this->sendToolCallEvent($toolCalls[$currentToolCallIndex]);
                    }

                    $this->chatStore->storeAssistantMessage(
                        conversationId: $conversation->agent_conversation_id,
                        participantType: 'user',
                        participantId: $user->id,
                        content: $fullContent ?: '',  // storeAssistantMessage expects string, not null
                        toolCalls: !empty($toolCalls) ? array_values($toolCalls) : [],
                    );

                    echo "event: done\n";
                    echo "data: ".json_encode(['conversation_id' => $conversation->id])."\n\n";
                } catch (\Throwable $e) {
                    echo "event: error\n";
                    echo "data: ".json_encode(['message' => $e->getMessage()])."\n\n";
                }

                ob_flush();
                flush();
            },
            200,
            [
                'Content-Type' => 'text/event-stream',
                'Cache-Control' => 'no-cache',
                'X-Accel-Buffering' => 'no',
            ]
        );
    }

    protected function sendToolCallEvent(array $toolCall): void
    {
        echo "event: tool_call\n";
        echo "data: ".json_encode([
            'id' => $toolCall['id'],
            'name' => $toolCall['function']['name'],
            'arguments' => json_decode($toolCall['function']['arguments'], true) ?: [],
        ])."\n\n";
    }

    protected function extractTitle(string $prompt): ?string
    {
        $prompt = trim($prompt);

        if (strlen($prompt) <= 60) {
            return $prompt;
        }

        return substr($prompt, 0, 57).'...';
    }
}


