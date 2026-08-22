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
use Tests\TestCase;

class ChatPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        BrandingAgent::fake(['Hello! I am your AI brand director.']);

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

    private function consumeStream($response): void
    {
        if (isset($response->baseResponse) && method_exists($response->baseResponse, 'sendContent')) {
            $response->baseResponse->sendContent();
        }
    }

    public function test_chat_message_creates_a_conversation_and_stores_user_message(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
        ]);

        $this->actingAs($user);

        $response = $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello AI',
        ]);

        $response->assertOk();
        $this->consumeStream($response);

        $conversations = Conversation::where('brand_id', $brand->id)->get();
        $this->assertCount(1, $conversations, 'Should create exactly 1 conversation');

        $conversation = $conversations->first();
        $this->assertNotNull($conversation->agent_conversation_id);

        $messages = DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversation->agent_conversation_id)
            ->get();

        $this->assertGreaterThanOrEqual(1, $messages->count(), 'Expected at least 1 message');
        $this->assertDatabaseHas('agent_conversation_messages', [
            'conversation_id' => $conversation->agent_conversation_id,
            'role' => 'user',
            'content' => 'Hello AI',
        ]);
    }

    public function test_multiple_messages_reuse_same_conversation_when_id_is_provided(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
        ]);

        $this->actingAs($user);

        $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'First message',
        ])->assertOk()->tap(function ($response) {
            $this->consumeStream($response);
        });

        $conversations = Conversation::where('brand_id', $brand->id)->get();
        $this->assertCount(1, $conversations);
        $conversation = $conversations->first();
        $firstAgentConversationId = $conversation->agent_conversation_id;

        $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Second message',
            'conversation_id' => $conversation->id,
        ])->assertOk()->tap(function ($response) {
            $this->consumeStream($response);
        });

        $conversationsAfter = Conversation::where('brand_id', $brand->id)->get();
        $this->assertCount(1, $conversationsAfter, 'Should still have exactly 1 conversation after second message');

        $conversation->refresh();
        $this->assertSame($firstAgentConversationId, $conversation->agent_conversation_id, 'agent_conversation_id should not change');

        $userMessages = DB::table('agent_conversation_messages')
            ->where('conversation_id', $firstAgentConversationId)
            ->where('role', 'user')
            ->orderBy('created_at')
            ->get();

        $this->assertGreaterThanOrEqual(2, $userMessages->count(), 'Should have at least 2 user messages after second request');
        $this->assertContains('First message', $userMessages->pluck('content')->toArray());
        $this->assertContains('Second message', $userMessages->pluck('content')->toArray());
    }

    public function test_workspace_loads_messages_from_active_conversation(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
        ]);

        $this->actingAs($user);

        $this->postJson("/api/brands/{$brand->id}/chat/message", [
            'prompt' => 'Hello AI',
        ])->assertOk()->tap(function ($response) {
            $this->consumeStream($response);
        });

        $conversation = Conversation::where('brand_id', $brand->id)->first();
        $this->assertNotNull($conversation);

        $messages = DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversation->agent_conversation_id)
            ->get();

        $this->assertGreaterThanOrEqual(1, $messages->count());

        $response = $this->get("/{$team->slug}/workspace?brand={$brand->id}");
        $response->assertOk();
        $response->assertSee('Test Brand');
    }
}
