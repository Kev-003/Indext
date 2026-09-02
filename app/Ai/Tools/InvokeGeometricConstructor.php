<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeGeometricConstructor implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the geometric constructor for building marks from primitives.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_geometric_constructor';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'mode' => $schema->string()->description('Execution mode.')->enum(array (
  0 => 'Beginner',
  1 => 'Experienced',
)),
            'primitives' => $schema->array()->items($schema->object([]))->description('Pre-loaded geometric primitives.'),
            'conceptOptions' => $schema->array()->items($schema->object([]))->description('Concept skeletons and suggestions based on brand pillars.'),
        ];
    }
}