<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeVisualPillarExtractor implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the visual pillar extractor for confirming 2-4 brand pillars.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_visual_pillar_extractor';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'sessionId' => $schema->string()->description('Session ID.'),
            'suggestedPillars' => $schema->array()->description('AI-suggested pillars.')->items($schema->string()),
            'brandId' => $schema->integer()->description('Brand ID.'),
        ];
    }
}