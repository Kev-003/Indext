<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandAsset;
use App\Models\BrandGuideline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandFinalizationController extends Controller
{
    /**
     * Materialize and publish the complete brand guideline document.
     */
    public function finalize(Request $request, Brand $brand): JsonResponse
    {
        $user = $request->user();

        // Check ownership or team membership
        if ($brand->user_id !== $user->id && (! $brand->team_id || ! $user->belongsToTeam($brand->team))) {
            abort(403, 'Unauthorized access to brand.');
        }

        $discovery = $brand->discovery ?? [];
        $strategy = $brand->strategy ?? [];

        // Load latest approved logo mark
        $logoAsset = $brand->assets()
            ->where('type', 'logo_icon')
            ->where('is_approved', true)
            ->latest('version')
            ->first();

        $logoSvg = $logoAsset?->content['svg']
            ?? $discovery['geometric_constructor']['svgPath']
            ?? $discovery['geometric_constructor']['svg']
            ?? '';

        $logoPrimitives = $logoAsset?->content['primitives'] ?? [];

        $guideline = BrandGuideline::updateOrCreate(
            ['brand_id' => $brand->id],
            [
                'logo_guidelines' => [
                    'primary_mark' => [
                        'svg' => $logoSvg,
                        'primitives' => $logoPrimitives,
                    ],
                    'usage_rules' => [
                        'Do not stretch, distort, or rotate the primary mark.',
                        'Maintain minimum clear space equal to the height of the mark.',
                        'Ensure high contrast against light and dark background surfaces.',
                    ],
                ],
                'color_guidelines' => [
                    'palette' => $discovery['palette'] ?? $strategy['color_system'] ?? [],
                    'hierarchy' => $discovery['color_hierarchy'] ?? [],
                    'rules' => [
                        '60% dominant background and canvas surfaces.',
                        '30% structural ink and steel typography.',
                        '10% dynamic accent highlighting.',
                    ],
                ],
                'typography_guidelines' => [
                    'pairing' => $strategy['typography_pairing'] ?? [
                        'heading' => 'Space Grotesk',
                        'body' => 'JetBrains Mono',
                    ],
                    'hierarchy' => $discovery['typography_hierarchy'] ?? [],
                ],
                'asset_guidelines' => [
                    'assets' => $brand->assets()
                        ->where('is_approved', true)
                        ->get()
                        ->map(fn (BrandAsset $a) => [
                            'id' => $a->id,
                            'type' => $a->type,
                            'name' => $a->name,
                        ])
                        ->toArray(),
                ],
                'future_plans' => [
                    'roadmap' => [
                        'Export production SVG and PDF vector brand kit',
                        'Publish design system tokens for web and mobile',
                        'Apply print collateral and packaging guidelines',
                    ],
                ],
                'is_published' => true,
            ]
        );

        $brand->update(['status' => 'delivered']);

        return response()->json([
            'success' => true,
            'guideline' => $guideline,
            'brand' => [
                'id' => $brand->id,
                'slug' => $brand->slug,
                'name' => $brand->name,
                'status' => $brand->status,
                'guideline' => $guideline,
            ],
        ]);
    }
}
