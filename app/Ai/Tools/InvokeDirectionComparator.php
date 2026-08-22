<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeDirectionComparator implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the direction comparator for side-by-side voting.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_direction_comparator';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'directions' => $schema->array()->items($schema->object([]))->description('Direction objects to compare.')->required(),
            'comparisonDimensions' => $schema->array()->description('Dimensions to compare.')->items($schema->string()),
        ];
    }
}