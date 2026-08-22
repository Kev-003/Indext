<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeAssetPatternLibrary implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the asset and pattern library with usage rules.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_asset_pattern_library';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'patterns' => $schema->array()->items($schema->object([]))->description('Pattern objects.'),
            'contexts' => $schema->array()->description('Usage contexts.')->items($schema->string()),
        ];
    }
}