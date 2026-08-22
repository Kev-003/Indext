<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeDesignConceptExplorer implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the design concept explorer for comparing 2-3 directions.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_design_concept_explorer';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'concepts' => $schema->array()->items($schema->object([]))->description('Design concept objects.'),
        ];
    }
}