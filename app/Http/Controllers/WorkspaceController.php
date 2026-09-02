<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function index(Request $request): Response
    {
        $brandId = $request->query('brand');
        $brand = null;
        $conversation = null;
        $messages = collect();
        $brands = collect();

        $teamSlug = $request->route('current_team');
        $team = \App\Models\Team::where('slug', $teamSlug)->firstOrFail();

        if ($brandId) {
            $brand = $this->resolveBrand($brandId, $team->id);

            if ($brand) {
                $conversation = $brand->conversations()
                    ->where('status', 'active')
                    ->latest('updated_at')
                    ->first();

                if ($conversation && $conversation->agent_conversation_id) {
                    $records = \Illuminate\Support\Facades\DB::connection()->table('agent_conversation_messages')
                        ->where('conversation_id', $conversation->agent_conversation_id)
                        ->orderBy('created_at')
                        ->orderBy('id')
                        ->get();

                    $messages = $records->map(function ($msg) {
                        $toolResults = json_decode($msg->tool_results, true) ?: [];
                        $toolResults = array_map(function ($tr) {
                            if (is_array($tr) && isset($tr['result_id']) && ! isset($tr['tool_call_id'])) {
                                $tr['tool_call_id'] = $tr['result_id'];
                            }
                            return $tr;
                        }, $toolResults);

                        return [
                            'id' => $msg->id,
                            'role' => $msg->role,
                            'content' => $msg->content,
                            'tool_calls' => json_decode($msg->tool_calls, true) ?: [],
                            'tool_results' => $toolResults,
                            'created_at' => $msg->created_at,
                        ];
                    });
                }
            }
        }

        $brands = Brand::where('team_id', $team->id)
            ->orderBy('sort_order')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'slug' => $b->slug,
                'name' => $b->name,
                'industry' => $b->industry,
                'status' => $b->status,
                'execution_mode' => $b->execution_mode,
                'updated_at' => $b->updated_at->diffForHumans(),
            ]);

        $autoTrigger = false;

        if ($conversation && $messages->isNotEmpty()) {
            $lastMessage = $messages->last();
            $hasAssistantReply = $messages->contains(function ($msg) {
                if ($msg['role'] !== 'assistant') {
                    return false;
                }

                $hasContent = trim($msg['content'] ?? '') !== '';
                $hasToolCalls = !empty($msg['tool_calls']);

                return $hasContent || $hasToolCalls;
            });

            if (! $hasAssistantReply
                && $lastMessage['role'] === 'user'
                && trim($lastMessage['content'] ?? '') !== ''
            ) {
                $autoTrigger = $conversation->created_at
                    ? $conversation->created_at->gt(now()->subMinutes(10))
                    : true;
            }
        }

        return Inertia::render('workspace/index', [
            'brand' => $brand ? [
                'id' => $brand->id,
                'slug' => $brand->slug,
                'name' => $brand->name,
                'industry' => $brand->industry,
                'execution_mode' => $brand->execution_mode,
                'status' => $brand->status,
                'discovery' => $brand->discovery ?? [],
                'strategy' => $brand->strategy ?? [],
                'guideline' => $brand->guideline,
            ] : null,
            'conversation' => $conversation ? [
                'id' => $conversation->id,
                'slug' => $conversation->slug,
                'title' => $conversation->title,
                'status' => $conversation->status,
            ] : null,
            'messages' => $messages,
            'brands' => $brands,
            'autoTrigger' => $autoTrigger,
            'availableTools' => [
                ['name' => 'MindMapCanvas', 'description' => 'Surfaces the mind-map canvas for ideation.'],
                ['name' => 'PalettePicker', 'description' => 'Surfaces the color palette generator.'],
                ['name' => 'GeometricConstructor', 'description' => 'Surfaces the geometric vector editor.'],
                ['name' => 'ReviewView', 'description' => 'Surfaces the review/comparison view.'],
                ['name' => 'GuidelinePreview', 'description' => 'Surfaces the brand guideline preview.'],
            ],
        ]);
    }

    private function resolveBrand(string|int $identifier, int $teamId): ?Brand
    {
        $query = Brand::where('team_id', $teamId);

        if (is_numeric($identifier)) {
            return $query->where('id', (int) $identifier)->first()
                ?? $query->where('slug', $identifier)->first();
        }

        return $query->where('slug', $identifier)->first();
    }
}
