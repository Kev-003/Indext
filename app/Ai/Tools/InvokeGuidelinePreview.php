<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class InvokeGuidelinePreview implements Tool
{
    public function description(): Stringable|string
    {
        return 'Render a brand guideline preview document.';
    }

    public function handle(Request $request): Stringable|string
    {
        return 'Rendered: invoke_guideline_preview';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'id' => $schema->string()->description('Unique component instance ID.')->required(),
            'sections' => $schema->array()->items($schema->object([]))->description('Guideline sections to preview.')->required(),
        ];
    }
}