<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeSemanticObjectMapper implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the semantic object mapper for keyword-to-object mapping.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_semantic_object_mapper';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'keyword' => $schema->string()->description('Keyword to map.'),
            'suggestions' => $schema->array()->description('Suggested objects.')->items($schema->string()),
            'mode' => $schema->string()->description('Mapping mode.')->enum(array (
  0 => 'tangible',
  1 => 'abstract',
)),
        ];
    }
}