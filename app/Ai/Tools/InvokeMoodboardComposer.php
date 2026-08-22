<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeMoodboardComposer implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render an interactive moodboard composer for arranging brand assets, colors, and reference images.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_moodboard_composer';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'initialAssets' => $schema->array()->items($schema->object([]))->description('Pre-loaded asset references.'),
            'layout' => $schema->string()->description('Layout mode.')->enum(array (
  0 => 'grid',
  1 => 'freeform',
)),
            'suggestedPalette' => $schema->array()->items($schema->object([]))->description('AI-suggested color palette.'),
            'exportFormats' => $schema->array()->description('Supported export formats.')->items($schema->string()),
        ];
    }
}