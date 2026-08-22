<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeTypographyPairingSelector implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the typography pairing selector with AI recommendations.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_typography_pairing_selector';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'recommendedPairs' => $schema->array()->items($schema->object([]))->description('Recommended heading/body pairs.'),
            'filters' => $schema->array()->description('Category filters.')->items($schema->string()),
        ];
    }
}