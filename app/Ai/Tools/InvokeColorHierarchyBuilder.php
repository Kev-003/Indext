<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeColorHierarchyBuilder implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the color hierarchy builder with 60-30-10 and CMYK/RGB support.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_color_hierarchy_builder';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'suggestedPalette' => $schema->array()->items($schema->object([]))->description('AI-suggested palette.'),
            'mode' => $schema->string()->description('Output mode.')->enum(array (
  0 => 'digital',
  1 => 'print',
  2 => 'both',
)),
        ];
    }
}