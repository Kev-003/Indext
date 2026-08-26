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
            $brand = Brand::where('id', $brandId)
                ->where('team_id', $team->id)
                ->first();

            if ($brand) {
                $conversation = $brand->conversations()->where('status', 'active')->latest('updated_at')->first();

                if ($conversation && $conversation->agent_conversation_id) {
                    $records = \Illuminate\Support\Facades\DB::connection()->table('agent_conversation_messages')
                        ->where('conversation_id', $conversation->agent_conversation_id)
                        ->orderByDesc('created_at')
                        ->limit(50)
                        ->get()
                        ->reverse()
                        ->values();

                    $messages = $records->map(fn ($msg) => [
                        'id' => $msg->id,
                        'role' => $msg->role,
                        'content' => $msg->content,
                        'tool_calls' => json_decode($msg->tool_calls, true) ?: [],
                        'tool_results' => json_decode($msg->tool_results, true) ?: [],
                        'created_at' => $msg->created_at,
                    ]);
                }
            }
        }

        $brands = Brand::where('team_id', $team->id)
            ->orderBy('sort_order')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
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
                'name' => $brand->name,
                'industry' => $brand->industry,
                'execution_mode' => $brand->execution_mode,
                'status' => $brand->status,
                'discovery' => $brand->discovery ?? [],
            ] : null,
            'conversation' => $conversation ? [
                'id' => $conversation->id,
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
}
