<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\BrandAsset;
use App\Models\BrandGuideline;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BrandDeletionTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithTeam(): array
    {
        $user = User::factory()->create();
        $team = Team::factory()->create();
        $user->teams()->attach($team, ['role' => 'owner']);

        return [$user, $team];
    }

    public function test_user_can_delete_own_brand(): void
    {
        [$user, $team] = $this->createUserWithTeam();

        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
            'status' => 'consultation',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/brands/{$brand->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSoftDeleted('brands', [
            'id' => $brand->id,
        ]);
    }

    public function test_deleting_brand_cascades_to_conversations(): void
    {
        [$user, $team] = $this->createUserWithTeam();

        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
            'status' => 'consultation',
        ]);

        $conversation = Conversation::create([
            'team_id' => $team->id,
            'brand_id' => $brand->id,
            'user_id' => $user->id,
            'agent_conversation_id' => 'test-conversation-id',
            'title' => 'Test Conversation',
            'status' => 'active',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/brands/{$brand->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSoftDeleted('brands', ['id' => $brand->id]);
        $this->assertDatabaseMissing('conversations', ['id' => $conversation->id]);
    }

    public function test_deleting_brand_cascades_to_assets_and_guidelines(): void
    {
        [$user, $team] = $this->createUserWithTeam();

        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
            'status' => 'consultation',
        ]);

        $asset = BrandAsset::create([
            'brand_id' => $brand->id,
            'type' => 'logo_icon',
            'name' => 'Test Asset',
            'content' => ['svg' => '<svg></svg>'],
            'version' => 1,
        ]);

        $guideline = BrandGuideline::create([
            'brand_id' => $brand->id,
            'logo_guidelines' => ['composition' => 'Centered'],
            'color_guidelines' => ['primary' => '#FF0000'],
            'typography_guidelines' => ['font' => 'Arial'],
            'asset_guidelines' => ['patterns' => 'Grid'],
            'future_plans' => ['digital' => 'Launch'],
            'is_published' => false,
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/brands/{$brand->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSoftDeleted('brands', ['id' => $brand->id]);
        $this->assertDatabaseMissing('brand_assets', ['id' => $asset->id]);
        $this->assertDatabaseMissing('brand_guidelines', ['id' => $guideline->id]);
    }

    public function test_user_cannot_delete_brand_from_another_team(): void
    {
        [$user, $team] = $this->createUserWithTeam();
        $otherTeam = Team::factory()->create();

        $brand = Brand::create([
            'team_id' => $otherTeam->id,
            'user_id' => User::factory()->create()->id,
            'name' => 'Other Team Brand',
            'status' => 'consultation',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/brands/{$brand->id}");

        $response->assertStatus(403);

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'deleted_at' => null,
        ]);
    }

    public function test_deleting_nonexistent_brand_returns_404(): void
    {
        [$user, $team] = $this->createUserWithTeam();

        $this->actingAs($user);

        $response = $this->deleteJson('/api/brands/99999');

        $response->assertStatus(404);
    }

    public function test_unauthorized_user_cannot_delete_brand(): void
    {
        [$user, $team] = $this->createUserWithTeam();

        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
            'status' => 'consultation',
        ]);

        $response = $this->deleteJson("/api/brands/{$brand->id}");

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);

        $this->assertDatabaseHas('brands', [
            'id' => $brand->id,
            'deleted_at' => null,
        ]);
    }

    public function test_brand_deletion_handles_conversations_with_null_agent_id(): void
    {
        [$user, $team] = $this->createUserWithTeam();

        $brand = Brand::create([
            'team_id' => $team->id,
            'user_id' => $user->id,
            'name' => 'Test Brand',
            'status' => 'consultation',
        ]);

        Conversation::create([
            'team_id' => $team->id,
            'brand_id' => $brand->id,
            'user_id' => $user->id,
            'agent_conversation_id' => null,
            'title' => 'Legacy Conversation',
            'status' => 'active',
        ]);

        $this->actingAs($user);

        $response = $this->deleteJson("/api/brands/{$brand->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSoftDeleted('brands', ['id' => $brand->id]);
        $this->assertDatabaseMissing('conversations', [
            'brand_id' => $brand->id,
            'agent_conversation_id' => null,
        ]);
    }
}

