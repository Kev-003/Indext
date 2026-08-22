<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeMindMap implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render an inline mind-map canvas with keywords and derived concepts.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_mind_map';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'title' => $schema->string()->description('Title for the mind map.')->required(),
            'nodes' => $schema->array()->description('Keyword nodes to display.')->items($schema->string())->required(),
        ];
    }
}