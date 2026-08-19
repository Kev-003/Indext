<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Services\BrandChatStore;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    /**
     * Display the generative workspace.
     */
    public function index(Request $request, BrandChatStore $chatStore): Response
    {
        $brandId = $request->query('brand');
        $brand = null;
        $conversation = null;
        $messages = [];
        $brands = [];

        $teamSlug = $request->route('current_team');
        $team = \App\Models\Team::where('slug', $teamSlug)->firstOrFail();

        if ($brandId) {
            $brand = Brand::where('id', $brandId)
                ->where('team_id', $team->id)  // Enforce team ownership
                ->first();

            if ($brand) {
                $conversation = $brand->conversations()->where('status', 'active')->first();

                if ($conversation && $conversation->agent_conversation_id) {
                    $messages = $chatStore->getLatestConversationMessages(
                        $conversation->agent_conversation_id,
                        50
                    )->map(fn ($msg) => [
                        'id' => $msg['id'],
                        'role' => $msg['role'],
                        'content' => $msg['content'],
                        'tool_calls' => $msg['tool_calls'] ?? [],
                        'created_at' => $msg['created_at'],
                    ])->toArray();
                }
            }
        }

        // Always load all team brands so the sidebar / brand list stays populated
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


        return Inertia::render('workspace/index', [
            'brand' => $brand ? [
                'id' => $brand->id,
                'name' => $brand->name,
                'industry' => $brand->industry,
                'execution_mode' => $brand->execution_mode,
                'status' => $brand->status,
            ] : null,
            'conversation' => $conversation ? [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'status' => $conversation->status,
            ] : null,
            'messages' => $messages,
            'brands' => $brands,
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

