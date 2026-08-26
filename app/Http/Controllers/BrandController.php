<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Conversation;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BrandController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);

        $teamSlug = $request->route('current_team');
        $team = Team::where('slug', $teamSlug)->firstOrFail();
        $prompt = trim($request->input('prompt'));

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

        $name = $this->extractBrandName($prompt);

        $brand = Cache::lock('brand_creation', 30)->block(30, function () use ($request, $team, $name, $prompt) {
            return DB::transaction(function () use ($request, $team, $name, $prompt) {
                $reusableBrand = Brand::withTrashed()
                    ->whereNotNull('deleted_at')
                    ->orderBy('id')
                    ->first();

                $brandCreated = false;
                if ($reusableBrand) {
                    try {
                        // Clean up any leftover agent_conversations for this brand
                        $oldConversationIds = DB::connection()->table('conversations')
                            ->where('brand_id', $reusableBrand->id)
                            ->whereNotNull('agent_conversation_id')
                            ->pluck('agent_conversation_id');

                        foreach ($oldConversationIds as $oldConvId) {
                            DB::connection()->table('agent_conversation_messages')
                                ->where('conversation_id', $oldConvId)
                                ->delete();
                            DB::connection()->table('agent_conversations')
                                ->where('id', $oldConvId)
                                ->delete();
                        }

                        $reusableBrand->forceDelete();

                        $brand = new Brand([
                            'team_id' => $team->id,
                            'user_id' => $request->user()->id,
                            'name' => $name,
                            'status' => 'consultation',
                        ]);
                        $brand->id = $reusableBrand->id;
                        $brand->save();
                        $brandCreated = true;
                    } catch (\Throwable $e) {
                        Log::warning('BrandController: forceDelete failed, falling through to create new brand', [
                            'reusable_brand_id' => $reusableBrand->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                if (!$brandCreated) {
                    $brand = Brand::create([
                        'team_id' => $team->id,
                        'user_id' => $request->user()->id,
                        'name' => $name,
                        'status' => 'consultation',
                    ]);
                }

                $agentConversationId = \Illuminate\Support\Str::uuid7()->toString();

                DB::connection()->table('agent_conversations')->insert([
                    'id' => $agentConversationId,
                    'participant_type' => 'user',
                    'participant_id' => $request->user()->id,
                    'title' => $name . ' Discovery',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Note: Do NOT insert into agent_conversation_messages here.
                // The RememberConversation middleware handles persisting user messages
                // when the first chat request fires. Inserting here causes duplicate
                // consecutive user messages which violates Gemini's role alternation.

                Conversation::create([
                    'team_id' => $team->id,
                    'brand_id' => $brand->id,
                    'user_id' => $request->user()->id,
                    'agent_conversation_id' => $agentConversationId,
                    'title' => $name . ' Discovery',
                    'status' => 'active',
                ]);

                return $brand;
            });
        });

        return redirect()->route('workspace', [
            'current_team' => $team->slug,
            'brand' => $brand->id,
        ]);
    }

    private function extractBrandName(string $prompt): string
    {
        $prompt = trim($prompt);

        // Patterns: "brand for X", "logo for X", "create a brand for X", "build a brand for X"
        $patterns = [
            '/(?:create|build|make|design|develop|start)?\s*(?:a|an|my|our)?\s*(?:brand|logo|identity)\s+for\s+([^.!?\n,]+)/i',
            '/(?:brand|logo)\s+(?:called|named)\s+([^.!?\n,]+)/i',
            '/([^.!?\n,]+)\s+(?:brand|logo|identity)/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $prompt, $matches)) {
                $name = trim($matches[1]);
                // Strip leading articles / filler words
                $name = preg_replace('/^(?:a|an|the|my|our)\s+/i', '', $name);
                if ($name && strlen($name) <= 80) {
                    return ucwords(strtolower($name));
                }
            }
        }

        // Fallback: truncate the prompt itself
        if (strlen($prompt) <= 40) {
            return $prompt;
        }

        return substr($prompt, 0, 37) . '...';
    }

    public function destroy(Request $request, Brand $brand)
    {
        $user = $request->user();

        if ($brand->team_id) {
            abort_if(!$user->belongsToTeam($brand->team), 403);
        } else {
            abort_if($brand->user_id !== $user->id, 403);
        }

        try {
            DB::transaction(function () use ($brand) {
                foreach ($brand->conversations as $conversation) {
                    if ($conversation->agent_conversation_id) {
                        DB::connection()->table('agent_conversation_messages')
                            ->where('conversation_id', $conversation->agent_conversation_id)
                            ->delete();

                        DB::connection()->table('agent_conversations')
                            ->where('id', $conversation->agent_conversation_id)
                            ->delete();
                    }
                }

                $brand->conversations()->delete();
                $brand->assets()->delete();
                $brand->guideline()->delete();
                $brand->delete();
            });

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            Log::error('Brand deletion failed', [
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
