<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeDevHandoffPackage implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the dev handoff package with tokens, exports, and governance.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_dev_handoff_package';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'tokens' => $schema->object()->description('Design tokens.'),
            'assets' => $schema->array()->items($schema->object([]))->description('Asset list.'),
            'touchpoints' => $schema->array()->description('Delivery touchpoints.')->items($schema->string()),
        ];
    }
}