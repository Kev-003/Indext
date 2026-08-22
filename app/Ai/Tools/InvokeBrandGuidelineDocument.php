<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeBrandGuidelineDocument implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render the interactive brand guideline document.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_brand_guideline_document';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'brandId' => $schema->integer()->description('Brand ID.'),
            'sections' => $schema->array()->description('Guideline sections to show.')->items($schema->string()),
            'readonly' => $schema->boolean()->description('Whether the document is read-only.'),
        ];
    }
}