<?php

namespace Tests\Feature;

use App\Ai\Agents\BrandingAgent;
use App\Models\Brand;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use App\Services\LLM\PromptGuardrailService;
use App\Services\LLM\SemanticIntentFilter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Ai\Exceptions\RateLimitedException;
use Laravel\Ai\Responses\Data\ToolCall;
use Tests\TestCase;

class ChatStreamingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mock(SemanticIntentFilter::class, function ($mock) {
            $mock->shouldReceive('isRelevant')->andReturn(true);
        });

        $this->mock(PromptGuardrailService::class, function ($mock) {
            $mock->shouldReceive('validate')->andReturnUsing(function ($prompt) {
                return ['valid' => true, 'sanitized' => $prompt];
            });
            $mock->shouldReceive('isOutOfScope')->andReturn(false);
        });
    }

    private function createUserWithTeam(): array
    {
        $user = User::factory()->create();
        $team = Team::factory()->create();
        $user->teams()->attach($team, ['role' => 'owner']);

        return [$user, $team];
    }

    private function createBrand(User $user, Team $team): Brand
    {
        return Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
            'industry' => 'Coffee',
            'execution_mode' => 'beginner',
            'status' => 'discovery',
        ]);
    }

    private function consumeStream($response): string
    {
        $output = '';
        ob_start(function ($buffer) use (&$output) {
            $output .= $buffer;
            return '';
        });
        $response->baseResponse->sendContent();
        ob_end_clean();

        return $output;
    }

    private function parseSseEvents(string $output): array
    {
        $events = [];
        $lines = preg_split('/\r\n|\n/', $output);
        $event = 'message';
        $data = null;

        foreach ($lines as $line) {
            $line = rtrim($line, "\r");
            if ($line === '') {
                if ($data !== null) {
                    $events[] = ['event' => $event, 'data' => $data];
                    $event = 'message';
                    $data = null;
                }
                continue;
            }
            if (str_starts_with($line, 'event:')) {
                $event = trim(substr($line, 6));
            } elseif (str_starts_with($line, 'data:')) {
                $data = trim(substr($line, 5));
            }
        }
        if ($data !== null) {
            $events[] = ['event' => $event, 'data' => $data];
        }

        return $events;
    }

    private function extractConversationId(string $output): ?string
    {
        $events = $this->parseSseEvents($output);
        foreach ($events as $event) {
            if ($event['event'] === 'done') {
                $data = json_decode($event['data'], true);
                return $data['conversation_id'] ?? null;
            }
        }
        return null;
    }

    // ========================================================================
    // Test Group 1: STEP_COMPLETE Semantic Filter Bypass
    // ========================================================================

    public function test_step_complete_bypasses_semantic_filter(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $this->app->forgetInstance(SemanticIntentFilter::class);
        $this->mock(SemanticIntentFilter::class, function ($mock) {
            $mock->shouldReceive('isRelevant')->andReturn(false);
        });

        BrandingAgent::fake(['OK']);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'STEP_COMPLETE {"step":"color_hierarchy","palette":[{"name":"Midnight","color":"#0B1D33"}]}',
        ]);

        $response->assertOk();
        $this->consumeStream($response);
    }

    public function test_step_complete_with_off_topic_content_still_passes(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $this->app->forgetInstance(SemanticIntentFilter::class);
        $this->mock(SemanticIntentFilter::class, function ($mock) {
            $mock->shouldReceive('isRelevant')->andReturn(false);
        });

        BrandingAgent::fake(['OK']);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'STEP_COMPLETE {"step":"color_hierarchy","palette":"gardening tomatoes fertilizer"}',
        ]);

        $response->assertOk();
        $this->consumeStream($response);
    }

    public function test_interview_complete_bypasses_semantic_filter(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $this->app->forgetInstance(SemanticIntentFilter::class);
        $this->mock(SemanticIntentFilter::class, function ($mock) {
            $mock->shouldReceive('isRelevant')->andReturn(false);
        });

        BrandingAgent::fake(['OK']);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'INTERVIEW_COMPLETE {"mission":"Build a coffee brand","audience":"coffee lovers","tone":["premium","craft"]}',
        ]);

        $response->assertOk();
        $this->consumeStream($response);
    }

    public function test_regular_prompt_after_discovery_is_filtered(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $this->app->forgetInstance(SemanticIntentFilter::class);
        $this->mock(SemanticIntentFilter::class, function ($mock) {
            $mock->shouldReceive('isRelevant')->andReturnUsing(function ($prompt) {
                return ! str_contains(strtolower($prompt), 'garden');
            });
        });

        BrandingAgent::fake(['OK', 'resp', 'resp', 'resp', 'resp', 'resp']);

        $this->actingAs($user);

        $conversationId = null;
        for ($i = 0; $i < 5; $i++) {
            $payload = ['prompt' => 'Brand identity color palette typography ' . $i];
            if ($conversationId) {
                $payload['conversation_id'] = $conversationId;
            }
            $response = $this->postJson("/api/brands/{$brand->id}/chat/message", $payload);
            $response->assertOk();
            $output = $this->consumeStream($response);
            $conversationId = $this->extractConversationId($output) ?? $conversationId;
        }

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'I need help with my garden. The tomatoes are not growing well.',
            'conversation_id' => $conversationId,
        ]);

        $response->assertStatus(400);
        $response->assertJson(['message' => 'Please keep queries related to brand discovery, design systems, typography, color theory, or visual identity.']);
    }

    // ========================================================================
    // Test Group 2: SSE Stream Format Verification
    // ========================================================================

    public function test_sse_stream_emits_text_events(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        BrandingAgent::fake(['Hello! I am your AI brand director.']);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello',
        ]);

        $response->assertOk();
        $output = $this->consumeStream($response);

        $events = $this->parseSseEvents($output);

        $textEvents = array_filter($events, fn ($e) => $e['event'] === 'text');
        $this->assertNotEmpty($textEvents, 'Stream should emit text events');

        $doneEvents = array_filter($events, fn ($e) => $e['event'] === 'done');
        $this->assertNotEmpty($doneEvents, 'Stream should emit a done event');
    }

    public function test_sse_stream_emits_tool_call_events(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $toolCall = new ToolCall(
            id: Str::uuid7()->toString(),
            name: 'invoke_color_hierarchy_builder',
            arguments: [
                'brandId' => $brand->id,
                'suggestedPalette' => [
                    ['name' => 'Midnight Sky', 'color' => '#0B1D33', 'role' => 'Primary'],
                    ['name' => 'Alabaster Cream', 'color' => '#FDFBF7', 'role' => 'Secondary'],
                    ['name' => 'Warm Ochre', 'color' => '#D4A373', 'role' => 'Accent'],
                ],
                'mode' => 'digital',
            ]
        );

        BrandingAgent::fake([$toolCall]);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Create a color system',
        ]);

        $response->assertOk();
        $output = $this->consumeStream($response);

        $events = $this->parseSseEvents($output);

        $toolCallEvents = array_filter($events, fn ($e) => $e['event'] === 'tool_call');
        $this->assertNotEmpty($toolCallEvents, 'Stream should emit tool_call events');

        $firstToolCall = json_decode(reset($toolCallEvents)['data'], true);
        $this->assertEquals('invoke_color_hierarchy_builder', $firstToolCall['name']);
        $this->assertEquals($brand->id, $firstToolCall['arguments']['brandId']);
    }

    public function test_sse_stream_emits_error_event_on_rate_limit(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        BrandingAgent::fake([
            function () {
                throw RateLimitedException::forProvider('gemini', 429);
            },
        ]);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello',
        ]);

        $response->assertOk();
        $output = $this->consumeStream($response);

        $events = $this->parseSseEvents($output);

        $errorEvents = array_filter($events, fn ($e) => $e['event'] === 'error');
        $this->assertNotEmpty($errorEvents, 'Stream should emit error events on rate limit');

        $errorData = json_decode(reset($errorEvents)['data'], true);
        $this->assertStringContainsString('rate limited', $errorData['message']);
    }

    // ========================================================================
    // Test Group 3: Tool Call Argument Structure
    // ========================================================================

    public function test_color_hierarchy_builder_tool_call_contains_palette(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $palette = [
            ['name' => 'Midnight Sky', 'color' => '#0B1D33', 'role' => 'Primary (60%)'],
            ['name' => 'Alabaster Cream', 'color' => '#FDFBF7', 'role' => 'Secondary (30%)'],
            ['name' => 'Warm Ochre', 'color' => '#D4A373', 'role' => 'Accent (10%)'],
            ['name' => 'High-Altitude Pine', 'color' => '#1E3F20', 'role' => 'Supporting'],
            ['name' => 'Terracotta Earth', 'color' => '#C86B4B', 'role' => 'Supporting'],
        ];

        $toolCall = new ToolCall(
            id: Str::uuid7()->toString(),
            name: 'invoke_color_hierarchy_builder',
            arguments: [
                'brandId' => $brand->id,
                'suggestedPalette' => $palette,
                'mode' => 'print',
            ]
        );

        BrandingAgent::fake([$toolCall]);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Create a color system for Northline Coffee',
        ]);

        $response->assertOk();
        $output = $this->consumeStream($response);

        $events = $this->parseSseEvents($output);
        $toolCallEvents = array_filter($events, fn ($e) => $e['event'] === 'tool_call');

        $this->assertNotEmpty($toolCallEvents);

        $toolCallData = json_decode(reset($toolCallEvents)['data'], true);
        $this->assertCount(5, $toolCallData['arguments']['suggestedPalette']);
        $this->assertEquals('Midnight Sky', $toolCallData['arguments']['suggestedPalette'][0]['name']);
        $this->assertEquals('#0B1D33', $toolCallData['arguments']['suggestedPalette'][0]['color']);
    }

    public function test_tool_call_arguments_are_json_serializable(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $toolCall = new ToolCall(
            id: Str::uuid7()->toString(),
            name: 'invoke_design_concept_explorer',
            arguments: [
                'concepts' => [
                    ['id' => 'concept-1', 'title' => 'Geometric Precision', 'description' => 'Clean, precise lines'],
                    ['id' => 'concept-2', 'title' => 'Organic Craft', 'description' => 'Hand-drawn aesthetic'],
                ],
                'shortlisted' => ['concept-1'],
            ]
        );

        BrandingAgent::fake([$toolCall]);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Explore design concepts',
        ]);

        $response->assertOk();
        $output = $this->consumeStream($response);

        $events = $this->parseSseEvents($output);
        $toolCallEvents = array_filter($events, fn ($e) => $e['event'] === 'tool_call');

        $this->assertNotEmpty($toolCallEvents);

        $decoded = json_decode(reset($toolCallEvents)['data'], true);
        $this->assertNotNull($decoded, 'Tool call data should be valid JSON');
        $this->assertEquals(JSON_ERROR_NONE, json_last_error());
    }

    // ========================================================================
    // Test Group 4: Conversation Persistence Across STEP_COMPLETE
    // ========================================================================

    public function test_step_complete_reuses_existing_conversation(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        BrandingAgent::fake(['First response', 'Second response']);

        $this->actingAs($user);

        $response1 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello',
        ]);
        $response1->assertOk();
        $output1 = $this->consumeStream($response1);

        $conversationId = $this->extractConversationId($output1);

        $conversation = Conversation::where('brand_id', $brand->id)->first();
        $this->assertNotNull($conversation);

        $response2 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'STEP_COMPLETE {"step":"color_hierarchy","palette":[]}',
            'conversation_id' => $conversationId,
        ]);
        $response2->assertOk();
        $this->consumeStream($response2);

        $conversations = Conversation::where('brand_id', $brand->id)->get();
        $this->assertCount(1, $conversations, 'Should still have 1 conversation');

        $messages = DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversation->agent_conversation_id)
            ->where('role', 'user')
            ->get();

        $this->assertGreaterThanOrEqual(2, $messages->count(), 'Should have at least 2 user messages');
    }

    public function test_step_complete_message_count_incremented(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        BrandingAgent::fake(['response 1', 'response 2', 'response 3']);

        $this->actingAs($user);

        $response1 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello',
        ]);
        $response1->assertOk();
        $output1 = $this->consumeStream($response1);

        $conversationId = $this->extractConversationId($output1);
        $conversation = Conversation::where('id', $conversationId)->first();

        // Send second request
        $response2 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'STEP_COMPLETE {"step":"concept_explorer","action":"refine"}',
            'conversation_id' => $conversationId,
        ]);
        $response2->assertOk();
        $this->consumeStream($response2);

        // Send third request
        $response3 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'STEP_COMPLETE {"step":"direction_compare","action":"select_winner"}',
            'conversation_id' => $conversationId,
        ]);
        $response3->assertOk();
        $this->consumeStream($response3);

        $totalMessages = DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversation->agent_conversation_id)
            ->count();

        $this->assertGreaterThanOrEqual(4, $totalMessages, 'Should have at least 4 messages (3 user + at least 1 assistant)');
    }

    // ========================================================================
    // Test Group 5: Rate Limit Retry Behavior
    // ========================================================================

    public function test_retry_after_rate_limit_sends_new_request(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $attempt = 0;
        BrandingAgent::fake([
            function (string $prompt, $attachments, $provider, $model) use (&$attempt) {
                $attempt++;
                if ($attempt === 1) {
                    throw RateLimitedException::forProvider('gemini', 429);
                }
                return 'Retry succeeded';
            },
        ]);

        $this->actingAs($user);

        $response1 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello',
        ]);
        $response1->assertOk();
        $output1 = $this->consumeStream($response1);

        $events1 = $this->parseSseEvents($output1);
        $errorEvents1 = array_filter($events1, fn ($e) => $e['event'] === 'error');
        $this->assertNotEmpty($errorEvents1, 'First request should have rate limit error');

        $conversation = Conversation::where('brand_id', $brand->id)->first();
        $this->assertNotNull($conversation, 'Should have Conversation record after first request');

        $response2 = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello',
            'conversation_id' => $conversation->id,
        ]);
        $response2->assertOk();
        $output2 = $this->consumeStream($response2);

        $events2 = $this->parseSseEvents($output2);
        $textEvents2 = array_filter($events2, fn ($e) => $e['event'] === 'text');
        $this->assertNotEmpty($textEvents2, 'Retry should produce text events');
    }

    // ========================================================================
    // Test Group 6: Multi-step Tool Call Chain
    // ========================================================================

    public function test_step_complete_triggers_tool_call_response(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = $this->createBrand($user, $team);

        $nextToolCall = new ToolCall(
            id: Str::uuid7()->toString(),
            name: 'invoke_color_hierarchy_builder',
            arguments: [
                'brandId' => $brand->id,
                'suggestedPalette' => [
                    ['name' => 'Midnight Sky', 'color' => '#0B1D33', 'role' => 'Primary'],
                    ['name' => 'Alabaster Cream', 'color' => '#FDFBF7', 'role' => 'Secondary'],
                    ['name' => 'Warm Ochre', 'color' => '#D4A373', 'role' => 'Accent'],
                ],
                'mode' => 'digital',
            ]
        );

        BrandingAgent::fake([$nextToolCall]);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'STEP_COMPLETE {"step":"concept_explorer","action":"confirm","selected":"concept-geometric-precision"}',
        ]);

        $response->assertOk();
        $output = $this->consumeStream($response);

        $events = $this->parseSseEvents($output);

        $toolCallEvents = array_filter($events, fn ($e) => $e['event'] === 'tool_call');
        $this->assertNotEmpty($toolCallEvents, 'STEP_COMPLETE should trigger AI tool call response');

        $toolCallData = json_decode(reset($toolCallEvents)['data'], true);
        $this->assertEquals('invoke_color_hierarchy_builder', $toolCallData['name']);
    }
}
