<?php

namespace App\Services\LLM\Tools;

class BrandTools
{
    public function renderMindMap(array $args): array
    {
        return [
            'name' => 'invoke_mind_map',
            'arguments' => [
                'id' => $args['id'],
                'title' => $args['title'] ?? 'Brand Keywords',
                'nodes' => $args['nodes'] ?? [],
            ],
        ];
    }

    public function renderPalettePicker(array $args): array
    {
        return [
            'name' => 'invoke_palette_picker',
            'arguments' => [
                'id' => $args['id'],
                'initialColors' => $args['initialColors'] ?? [],
            ],
        ];
    }

    public function renderGeometricConstructor(array $args): array
    {
        return [
            'name' => 'invoke_geometric_constructor',
            'arguments' => [
                'id' => $args['id'],
                'mode' => $args['mode'] ?? 'Beginner',
                'primitives' => $args['primitives'] ?? [],
            ],
        ];
    }

    public function renderReviewView(array $args): array
    {
        return [
            'name' => 'invoke_review_view',
            'arguments' => [
                'id' => $args['id'],
                'title' => $args['title'] ?? 'Direction Review',
                'directions' => $args['directions'] ?? [],
            ],
        ];
    }

    public function renderGuidelinePreview(array $args): array
    {
        return [
            'name' => 'invoke_guideline_preview',
            'arguments' => [
                'id' => $args['id'],
                'sections' => $args['sections'] ?? [],
            ],
        ];
    }
}
