<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeColorSystemDocument implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the color system document with hierarchy and accessibility matrix.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_color_system_document';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'palette' => $schema->array()->items($schema->object([]))->description('Color palette.'),
            'hierarchy' => $schema->object()->description('Color hierarchy roles.'),
        ];
    }
}