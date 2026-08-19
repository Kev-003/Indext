<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Conversation;
use App\Models\Team;
use App\Services\BrandChatStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BrandController extends Controller
{
    /**
     * Handle the smart prompt entry point.
     */
    public function store(Request $request, BrandChatStore $chatStore)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);

        $teamSlug = $request->route('current_team');
        $team = Team::where('slug', $teamSlug)->firstOrFail();
        $prompt = trim($request->input('prompt'));

        // Scan for keyword references to existing brands first (e.g. "open Northline" or "resume Acme")
        // We will perform a simple case-insensitive check against brand names
        $existingBrand = Brand::where('team_id', $team->id)
            ->get()
            ->first(function ($brand) use ($prompt) {
                return stripos($prompt, $brand->name) !== false;
            });

        if ($existingBrand) {
            return redirect()->route('workspace', [
                'current_team' => $team->slug,
                'brand' => $existingBrand->id,
            ]);
        }

        // Otherwise, initialize a new Brand context
        $name = 'New Brand';
        // Basic parser: check if user wrote e.g. "brand for [Northline Coffee]"
        if (preg_match('/(?:brand|logo)\s+for\s+(.+)/i', $prompt, $matches)) {
            $name = trim($matches[1]);
        }

        $brand = DB::transaction(function () use ($request, $team, $name, $prompt, $chatStore) {
            $brand = Brand::create([
                'team_id' => $team->id,
                'user_id' => $request->user()->id,
                'name' => $name,
                'status' => 'consultation',
            ]);

            $agentConversationId = $chatStore->storeConversation(
                participantType: 'user',
                participantId: $request->user()->id,
                title: $name . ' Discovery',
            );

            $conversation = Conversation::create([
                'team_id' => $team->id,
                'brand_id' => $brand->id,
                'user_id' => $request->user()->id,
                'agent_conversation_id' => $agentConversationId,
                'title' => $name . ' Discovery',
                'status' => 'active',
            ]);

            $chatStore->storeUserMessage(
                conversationId: $agentConversationId,
                participantType: 'user',
                participantId: $request->user()->id,
                content: $prompt,
            );

            return $brand;
        });

        return redirect()->route('workspace', [
            'current_team' => $team->slug,
            'brand' => $brand->id,
        ]);
    }

    /**
     * Delete the specified brand.
     */
    public function destroy(Request $request, Brand $brand, BrandChatStore $chatStore)
    {
        $user = $request->user();

        // Authorise: brand must belong to the user's team, or directly to the user
        if ($brand->team_id) {
            abort_if(!$user->belongsToTeam($brand->team), 403);
        } else {
            abort_if($brand->user_id !== $user->id, 403);
        }

        try {
            DB::transaction(function () use ($brand, $chatStore) {
                // Clean up agent conversation store for each conversation
                foreach ($brand->conversations as $conversation) {
                    if ($conversation->agent_conversation_id) {
                        $deleted = $chatStore->deleteConversation($conversation->agent_conversation_id);
                        if (!$deleted) {
                            \Illuminate\Support\Facades\Log::warning('Failed to delete agent conversation during brand deletion', [
                                'brand_id' => $brand->id,
                                'agent_conversation_id' => $conversation->agent_conversation_id,
                            ]);
                        }
                    }
                }
                $brand->conversations()->delete();
                $brand->assets()->delete();
                $brand->delete();
            });

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Brand deletion failed', [
                'brand_id' => $brand->id,
                'team_id' => $brand->team_id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Deletion failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the sort order for a brand.
     */
    public function updateSort(Request $request, Brand $brand): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $user = $request->user();

        abort_if(!$user->belongsToTeam($brand->team), 403);

        $brand->update(['sort_order' => $request->input('sort_order')]);

        return response()->json(['success' => true, 'sort_order' => $brand->sort_order]);
    }

    /**
     * Bulk update sort order for multiple brands.
     */
    public function bulkSort(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer', 'min:0'],
        ]);

        $user = $request->user();
        $order = $request->input('order', []);

        $brands = Brand::whereIn('id', $order)
            ->whereHas('team.members', fn ($q) => $q->where('users.id', $user->id))
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($order, $brands) {
            foreach ($order as $index => $brandId) {
                if (isset($brands[$brandId])) {
                    $brands[$brandId]->update(['sort_order' => $index]);
                }
            }
        });

        return response()->json(['success' => true]);
    }
}



