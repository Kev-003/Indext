<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeBrandStrategyOverview implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the complete brand strategy overview for review.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_brand_strategy_overview';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'readonly' => $schema->boolean()->description('Whether the document is read-only.'),
        ];
    }
}