<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeBrandFinalization implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the brand finalization and guidelines document for publishing the complete brand identity.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_brand_finalization';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('The brand ID.'),
            'sections' => $schema->array()->items($schema->string()->enum([
                'logo',
                'color',
                'typography',
                'assets',
                'future',
            ]))->description('Guideline sections to present.'),
        ];
    }
}
