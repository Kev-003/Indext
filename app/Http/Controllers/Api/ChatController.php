<?php
namespace App\Http\Controllers\Api;

use App\Ai\Agents\BrandingAgent;
use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Conversation;
use App\Services\LLM\PromptGuardrailService;
use App\Services\LLM\SemanticIntentFilter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Streaming\Events\Error;
use Laravel\Ai\Streaming\Events\StreamEnd;
use Laravel\Ai\Streaming\Events\TextDelta;
use Laravel\Ai\Streaming\Events\ToolCall as ToolCallEvent;
use Symfony\Component\HttpFoundation\Response;

class ChatController extends Controller
{
    public function __construct(
        protected SemanticIntentFilter $semanticFilter,
        protected PromptGuardrailService $guardrails,
    ) {}

    public function message(Request $request, Brand $brand): Response
    {
        $user = $request->user();

        $team = $brand->team;
        if ($team && !$user->belongsToTeam($team)) {
            abort(403);
        }
        if (!$team && $brand->user_id !== $user->id) {
            abort(403);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'prompt' => ['required', 'string', 'max:5000'],
            'conversation_id' => ['nullable', 'exists:conversations,id'],
        ]);

        $validator->validate();

        $prompt = $request->input('prompt');
        $conversationId = $request->input('conversation_id');

        $guardrailResult = $this->guardrails->validate($prompt);
        if (!$guardrailResult['valid']) {
            Log::channel('single')->debug('Chat guardrail rejected prompt', [
                'brand_id' => $brand->id,
                'user_id' => $user->id,
                'reason' => $guardrailResult['reason'],
            ]);

            return response()->json([
                'message' => $guardrailResult['reason'],
            ], 400);
        }

        $prompt = $guardrailResult['sanitized'];

        $conversation = DB::transaction(function () use ($user, $brand, $conversationId, $prompt) {
            if ($conversationId) {
                $conversation = Conversation::where('id', $conversationId)
                    ->where('user_id', $user->id)
                    ->where('brand_id', $brand->id)
                    ->firstOrFail();

                if (!$conversation->agent_conversation_id) {
                    Log::channel('single')->debug('Chat creating new agent conversation', [
                        'brand_id' => $brand->id,
                        'conversation_id' => $conversation->id,
                        'user_id' => $user->id,
                    ]);

                    $agentConversationId = \Illuminate\Support\Str::uuid7()->toString();

                    DB::connection()->table('agent_conversations')->insert([
                        'id' => $agentConversationId,
                        'participant_type' => 'user',
                        'participant_id' => $user->id,
                        'title' => $conversation->title,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::connection()->table('agent_conversation_messages')->insert([
                        'id' => \Illuminate\Support\Str::uuid7()->toString(),
                        'conversation_id' => $agentConversationId,
                        'participant_type' => 'user',
                        'participant_id' => $user->id,
                        'agent' => 'branding',
                        'role' => 'user',
                        'content' => $prompt,
                        'attachments' => '[]',
                        'tool_calls' => '[]',
                        'tool_results' => '[]',
                        'usage' => '[]',
                        'meta' => '[]',
                        'approval_state' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $conversation->update(['agent_conversation_id' => $agentConversationId]);
                } else {
                    Log::channel('single')->debug('Chat reusing existing agent conversation', [
                        'brand_id' => $brand->id,
                        'conversation_id' => $conversation->id,
                        'agent_conversation_id' => $conversation->agent_conversation_id,
                        'user_id' => $user->id,
                    ]);
                }
            } else {
                $agentConversationId = \Illuminate\Support\Str::uuid7()->toString();

                DB::connection()->table('agent_conversations')->insert([
                    'id' => $agentConversationId,
                    'participant_type' => 'user',
                    'participant_id' => $user->id,
                    'title' => $this->extractTitle($prompt),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::connection()->table('agent_conversation_messages')->insert([
                    'id' => \Illuminate\Support\Str::uuid7()->toString(),
                    'conversation_id' => $agentConversationId,
                    'participant_type' => 'user',
                    'participant_id' => $user->id,
                    'agent' => 'branding',
                    'role' => 'user',
                    'content' => $prompt,
                    'attachments' => '[]',
                    'tool_calls' => '[]',
                    'tool_results' => '[]',
                    'usage' => '[]',
                    'meta' => '[]',
                    'approval_state' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $conversation = Conversation::create([
                    'team_id' => $team?->id ?? $user->currentTeam?->id,
                    'brand_id' => $brand->id,
                    'user_id' => $user->id,
                    'agent_conversation_id' => $agentConversationId,
                    'title' => $this->extractTitle($prompt),
                    'status' => 'active',
                ]);
            }

            return $conversation;
        });

        Log::channel('single')->debug('Chat after transaction', [
            'brand_id' => $brand->id,
            'conversation_id' => $conversation->id,
            'agent_conversation_id' => $conversation->agent_conversation_id,
            'prompt' => $prompt,
        ]);

        $agent = BrandingAgent::make($brand);

        if ($conversationId && $conversation->agent_conversation_id) {
            $agent->continue($conversation->agent_conversation_id, $user);
        } else {
            $agent->forUser($user);
        }

        $messageCountSoFar = count($agent->messages());

        if ($messageCountSoFar < 4) {
            Log::channel('single')->debug('Chat semantic filter skipped (discovery phase)', [
                'brand_id' => $brand->id,
                'conversation_id' => $conversation->id,
                'message_count' => $messageCountSoFar,
                'prompt' => $prompt,
            ]);
        } elseif (!$this->semanticFilter->isRelevant($prompt, 30)) {
            Log::channel('single')->debug('Chat semantic filter rejected prompt', [
                'brand_id' => $brand->id,
                'conversation_id' => $conversation->id,
                'message_count' => $messageCountSoFar,
                'prompt' => $prompt,
            ]);

            return response()->json([
                'message' => 'Please keep queries related to brand discovery, design systems, typography, color theory, or visual identity.',
            ], 400);
        }

        $prompt = $this->sanitizeForJson($prompt);

        Log::channel('single')->debug('Chat streaming request', [
            'brand_id' => $brand->id,
            'conversation_id' => $conversation->id,
            'provider' => $agent->provider(),
            'model' => $agent->model(),
        ]);

        $streamable = $agent->stream($prompt);

        return response()->stream(
            function () use ($streamable, $conversation) {
                $fullContent = '';

                try {
                    foreach ($streamable as $event) {
                        if ($event instanceof TextDelta) {
                            $fullContent .= $event->delta;

                            echo "event: text\n";
                            echo "data: ".json_encode(['content' => $this->sanitizeForJson($event->delta)], JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";
                        } elseif ($event instanceof ToolCallEvent) {
                            echo "event: tool_call\n";
                            echo "data: ".json_encode([
                                'id' => $this->sanitizeForJson($event->toolCall->id),
                                'name' => $this->sanitizeForJson($event->toolCall->name),
                                'arguments' => $event->toolCall->arguments,
                            ], JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";
                        } elseif ($event instanceof Error) {
                            echo "event: error\n";
                            echo "data: ".json_encode(['message' => $this->sanitizeForJson((string) $event)], JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";
                        }

                        ob_flush();
                        flush();
                    }

                    if ($this->guardrails->isOutOfScope($fullContent)) {
                        echo "event: error\n";
                        echo "data: ".json_encode(['message' => 'Prompt violated platform rules. Please keep queries related to brand discovery, design systems, typography, color theory, or visual identity.'], JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";
                    } else {
                        echo "event: done\n";
                        echo "data: ".json_encode(['conversation_id' => $conversation->id], JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";
                    }
                } catch (\Throwable $e) {
                    Log::channel('single')->debug('Chat storing assistant error message', [
                        'brand_id' => $brand->id ?? null,
                        'conversation_id' => $conversation->id ?? null,
                        'agent_conversation_id' => $conversation->agent_conversation_id ?? null,
                        'error' => $e->getMessage(),
                        'previous' => $e->getPrevious()?->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);

                    echo "event: error\n";
                    echo "data: ".json_encode(['message' => $this->sanitizeForJson($e->getMessage())], JSON_INVALID_UTF8_SUBSTITUTE)."\n\n";
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

    private function sanitizeForJson(string $value): string
    {
        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
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
