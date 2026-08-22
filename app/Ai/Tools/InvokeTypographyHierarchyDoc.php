<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeTypographyHierarchyDoc implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the typography hierarchy document with pairings and scale.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_typography_hierarchy_doc';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'pairings' => $schema->array()->items($schema->object([]))->description('Typography pairing objects.'),
        ];
    }
}